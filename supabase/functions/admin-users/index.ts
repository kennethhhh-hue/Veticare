import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { gmailInviteSender, mailboxPattern } from "./gmail-invite.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type ManagedRole = "admin" | "personnel" | "owner";
type Action = "list" | "invite" | "invite-via-gmail" | "reset-owner-password" | "delete-owner-account" | "get-owner-photo" | "change-owner-photo";

const photoBucket = "veticare-profile-photos";
const maxPhotoBytes = 5 * 1024 * 1024;

async function photoExtension(photo: File) {
  const head = new Uint8Array(await photo.slice(0, 12).arrayBuffer());
  if (photo.type === "image/jpeg" && head[0] === 255 && head[1] === 216 && head[2] === 255) return "jpg";
  if (photo.type === "image/png" && [137, 80, 78, 71, 13, 10, 26, 10].every((byte, index) => head[index] === byte)) return "png";
  if (photo.type === "image/webp" && String.fromCharCode(...head.slice(0, 4)) === "RIFF" && String.fromCharCode(...head.slice(8, 12)) === "WEBP") return "webp";
  return null;
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (request.method !== "POST") return json({ error: "Method not allowed." }, 405);

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !anonKey || !serviceRoleKey) {
    return json({ error: "User management is not configured on the server." }, 500);
  }

  const authorization = request.headers.get("Authorization");
  if (!authorization) return json({ error: "Authentication required." }, 401);

  const callerClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: callerData, error: callerError } = await callerClient.auth.getUser();
  if (callerError || !callerData.user) return json({ error: "Invalid session." }, 401);

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: callerProfile, error: profileError } = await admin
    .from("profiles")
    .select("role, is_active")
    .eq("id", callerData.user.id)
    .maybeSingle();
  if (profileError) return json({ error: profileError.message }, 500);
  if (callerProfile?.role !== "admin" || !callerProfile.is_active) {
    return json({ error: "Administrator access required." }, 403);
  }

  let payload: Record<string, unknown>;
  let photo: FormDataEntryValue | null = null;
  const multipart = request.headers.get("Content-Type")?.toLowerCase().startsWith("multipart/form-data");
  try {
    if (multipart) {
      if (Number(request.headers.get("Content-Length")) > maxPhotoBytes + 16 * 1024) {
        return json({ error: "Profile photos must be 5 MB or smaller." }, 413);
      }
      const form = await request.formData();
      payload = { action: "change-owner-photo", userId: form.get("userId") };
      photo = form.get("photo");
    } else {
      const body = await request.json();
      if (!body || typeof body !== "object" || Array.isArray(body)) {
        return json({ error: "Request body must be a JSON object." }, 400);
      }
      payload = body;
    }
  } catch {
    return json({ error: multipart ? "Invalid photo upload." : "Request body must be valid JSON." }, 400);
  }

  const action = payload.action as Action;
  if (action === "list") {
    const users: Array<{ id: string; email?: string; created_at?: string; last_sign_in_at?: string; email_confirmed_at?: string; banned_until?: string; user_metadata?: Record<string, unknown> }> = [];
    for (let page = 1; ; page += 1) {
      const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 });
      if (error) return json({ error: error.message }, 500);
      users.push(...data.users);
      if (data.users.length < 1000) break;
    }

    const { data: profiles, error } = await admin
      .from("profiles")
      .select("id, email, full_name, role, approval_status, is_active, created_at")
      .is("account_deleted_at", null);
    if (error) return json({ error: error.message }, 500);

    const authById = new Map(users.map((user) => [user.id, user]));
    return json({ users: (profiles ?? []).map((profile) => {
      const authUser = authById.get(profile.id);
      return {
        ...profile,
        email: profile.email ?? authUser?.email ?? "",
        full_name: profile.full_name || String(authUser?.user_metadata?.full_name ?? ""),
        auth_created_at: authUser?.created_at ?? profile.created_at,
        last_sign_in_at: authUser?.last_sign_in_at ?? null,
        email_confirmed_at: authUser?.email_confirmed_at ?? null,
        banned_until: authUser?.banned_until ?? null,
      };
    }) });
  }

  if (action === "invite" || action === "invite-via-gmail") {
    const email = String(payload.email ?? "").trim().toLowerCase();
    const fullName = String(payload.fullName ?? "").trim();
    const role = payload.role as ManagedRole;
    if (!mailboxPattern.test(email)) return json({ error: "Enter a valid email address." }, 400);
    if (!["admin", "personnel", "owner"].includes(role)) return json({ error: "Invalid role." }, 400);

    if (action === "invite") {
      const siteUrl = Deno.env.get("APP_SITE_URL");
      const { data, error } = await admin.auth.admin.inviteUserByEmail(email, {
        data: { full_name: fullName, role },
        ...(siteUrl ? { redirectTo: `${siteUrl}/login` } : {}),
      });
      if (error) return json({ error: error.message }, 400);
      const { error: profileError } = await admin.from("profiles").upsert({
        id: data.user.id, email, full_name: fullName, role, approval_status: "approved", is_active: true,
      });
      if (profileError) return json({ error: profileError.message }, 500);
      return json({ success: true });
    }

    let sendInvitation: Awaited<ReturnType<typeof gmailInviteSender>>;
    try {
      sendInvitation = await gmailInviteSender();
    } catch (error) {
      return json({ error: error instanceof Error ? error.message : "Gmail is unavailable." }, 503);
    }

    const nonce = crypto.randomUUID();
    const { data, error } = await admin.auth.admin.generateLink({
      type: "invite", email, options: { data: { full_name: fullName, veticare_invite_nonce: nonce } },
    });
    if (error) return json({ error: error.message }, 400);
    const tokenHash = data.properties?.hashed_token;
    if (!tokenHash) return json({ error: "Unable to create the invitation link." }, 500);
    let inviteUrl: URL;
    try {
      inviteUrl = new URL("/login/accept-invite", Deno.env.get("APP_SITE_URL")?.trim() || data.properties.redirect_to);
      if (inviteUrl.protocol !== "https:") throw new Error();
    } catch {
      return json({ error: "The site address for invitation links is not configured." }, 503);
    }
    if (data.user.user_metadata.veticare_invite_nonce !== nonce && data.user.app_metadata.veticare_invite_role !== role) {
      return json({ error: "This email already has an account or a different pending invitation." }, 409);
    }
    const { error: inviteMetadataError } = await admin.auth.admin.updateUserById(data.user.id, {
      app_metadata: { veticare_invite_role: role },
      user_metadata: { veticare_invite_nonce: null },
    });
    if (inviteMetadataError) return json({ error: inviteMetadataError.message }, 500);

    const { error: updateError } = await admin.from("profiles").upsert({
      id: data.user.id,
      email,
      full_name: fullName,
      role,
      approval_status: "approved",
      is_active: true,
    });
    if (updateError) return json({ error: updateError.message }, 500);
    inviteUrl.hash = new URLSearchParams({ invite: tokenHash }).toString();
    try {
      await sendInvitation(email, role, inviteUrl.href);
    } catch (error) {
      return json({ error: error instanceof Error ? error.message : "Gmail delivery could not be confirmed." }, 502);
    }
    return json({ success: true });
  }

  const userId = typeof payload.userId === "string" ? payload.userId.trim().toLowerCase() : "";
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(userId)) {
    return json({ error: "A valid user ID is required." }, 400);
  }
  if (userId === callerData.user.id) return json({ error: "You cannot change or remove your own account here." }, 400);

  const { data: target, error: targetError } = await admin
    .from("profiles")
    .select("id, role, is_active, account_deleted_at")
    .eq("id", userId)
    .maybeSingle();
  if (targetError) return json({ error: targetError.message }, 500);
  if (!target) return json({ error: "User not found." }, 404);

  if (action === "get-owner-photo" || action === "change-owner-photo") {
    if (target.role !== "owner") return json({ error: "This action is only available for owner accounts." }, 403);
    if (target.account_deleted_at) return json({ error: "This owner account was deleted." }, 409);

    if (action === "get-owner-photo") {
      const { data, error } = await admin.auth.admin.getUserById(userId);
      if (error) return json({ error: error.message }, 400);
      const avatar = data.user?.user_metadata.avatar_url;
      const publicFolder = admin.storage.from(photoBucket).getPublicUrl(`${userId}/`).data.publicUrl;
      return json({ photoUrl: typeof avatar === "string" && avatar.startsWith(publicFolder) ? avatar : null });
    }

    if (!(photo instanceof File) || !photo.size) return json({ error: "Choose a profile photo." }, 400);
    if (photo.size > maxPhotoBytes) return json({ error: "Profile photos must be 5 MB or smaller." }, 413);
    const extension = await photoExtension(photo);
    if (!extension) return json({ error: "Choose a valid JPG, PNG, or WebP profile photo." }, 400);

    const storage = admin.storage.from(photoBucket);
    const path = `${userId}/${crypto.randomUUID()}.${extension}`;
    const { error: uploadError } = await storage.upload(path, photo, { contentType: photo.type });
    if (uploadError) return json({ error: uploadError.message }, 500);

    const photoUrl = storage.getPublicUrl(path).data.publicUrl;
    const { error: updateError } = await admin.auth.admin.updateUserById(userId, { user_metadata: { avatar_url: photoUrl } });
    if (updateError) {
      const { data, error } = await admin.auth.admin.getUserById(userId);
      if (data.user?.user_metadata.avatar_url === photoUrl) return json({ photoUrl });
      if (!error || error.status === 404) await storage.remove([path]);
      return json({ error: updateError.message }, 500);
    }
    return json({ photoUrl });
  }

  if (action === "reset-owner-password" || action === "delete-owner-account") {
    if (target.role !== "owner") return json({ error: "This action is only available for owner accounts." }, 403);
    if (target.account_deleted_at) {
      return action === "delete-owner-account"
        ? json({ success: true })
        : json({ error: "This owner account was deleted." }, 409);
    }

    if (action === "delete-owner-account") {
      const { error } = await admin.auth.admin.deleteUser(userId, true);
      if (error) return json({ error: error.message }, 400);
      return json({ success: true });
    }

    if (!target.is_active) return json({ error: "This owner account is inactive." }, 409);
    let redirectTo: string;
    try {
      const siteUrl = new URL(Deno.env.get("APP_SITE_URL") ?? "");
      const local = ["localhost", "127.0.0.1", "[::1]"].includes(siteUrl.hostname);
      if (siteUrl.protocol !== "https:" && !(local && siteUrl.protocol === "http:")) throw new Error();
      redirectTo = new URL("/login/owner/reset-password", siteUrl).href;
    } catch {
      return json({ error: "Set a valid APP_SITE_URL on the server before sending reset emails." }, 500);
    }

    const { data, error: lookupError } = await admin.auth.admin.getUserById(userId);
    if (lookupError) return json({ error: lookupError.message }, 400);
    const email = data.user?.email;
    if (!email || !data.user.email_confirmed_at) {
      return json({ error: "The owner must have a confirmed email address to receive a password reset link." }, 409);
    }
    const { error } = await admin.auth.resetPasswordForEmail(email, { redirectTo });
    if (error) return json({ error: error.message }, error.status === 429 ? 429 : 400);
    return json({ success: true, email });
  }

  if (target.account_deleted_at) return json({ error: "This account was deleted." }, 409);

  return json({ error: "Unknown action." }, 400);
});
