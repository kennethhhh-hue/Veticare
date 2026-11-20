import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type ManagedRole = "admin" | "personnel" | "owner";
type Action = "list" | "invite" | "update" | "remove";

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
  try {
    payload = await request.json();
  } catch {
    return json({ error: "Request body must be valid JSON." }, 400);
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
      .select("id, email, full_name, role, approval_status, is_active, created_at");
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

  if (action === "invite") {
    const email = String(payload.email ?? "").trim().toLowerCase();
    const fullName = String(payload.fullName ?? "").trim();
    const role = payload.role as ManagedRole;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) return json({ error: "Enter a valid email address." }, 400);
    if (!["admin", "personnel", "owner"].includes(role)) return json({ error: "Invalid role." }, 400);

    const { data, error } = await admin.auth.admin.inviteUserByEmail(email, {
      data: { full_name: fullName, role },
      ...(Deno.env.get("APP_SITE_URL") ? { redirectTo: `${Deno.env.get("APP_SITE_URL")}/login` } : {}),
    });
    if (error) return json({ error: error.message }, 400);

    const { error: updateError } = await admin.from("profiles").upsert({
      id: data.user.id,
      email,
      full_name: fullName,
      role,
      approval_status: role === "owner" ? "pending" : "approved",
      is_active: true,
    });
    if (updateError) {
      await admin.auth.admin.deleteUser(data.user.id);
      return json({ error: updateError.message }, 500);
    }
    return json({ success: true });
  }

  const userId = String(payload.userId ?? "");
  if (!userId) return json({ error: "User ID is required." }, 400);
  if (userId === callerData.user.id) return json({ error: "You cannot change or remove your own account here." }, 400);

  const { data: target, error: targetError } = await admin
    .from("profiles")
    .select("id, role, is_active")
    .eq("id", userId)
    .maybeSingle();
  if (targetError) return json({ error: targetError.message }, 500);
  if (!target) return json({ error: "User not found." }, 404);

  if (action === "update") {
    const role = payload.role as ManagedRole;
    const isActive = payload.isActive;
    if (!["admin", "personnel", "owner"].includes(role)) return json({ error: "Invalid role." }, 400);
    if (typeof isActive !== "boolean") return json({ error: "An access status is required." }, 400);
    if (target.role === "admin" && (role !== "admin" || !isActive)) {
      const { count, error } = await admin.from("profiles").select("id", { count: "exact", head: true }).eq("role", "admin").eq("is_active", true);
      if (error) return json({ error: error.message }, 500);
      if ((count ?? 0) <= 1) return json({ error: "The last active admin cannot be demoted or deactivated." }, 400);
    }

    const { error } = await admin.from("profiles").update({
      role,
      is_active: isActive,
      ...(role === "owner"
        ? target.role === "owner" ? {} : { approval_status: "pending" }
        : { approval_status: "approved" }),
    }).eq("id", userId);
    if (error) return json({ error: error.message }, 500);
    const { error: authError } = await admin.auth.admin.updateUserById(userId, {
      ban_duration: isActive ? "none" : "876000h",
    });
    if (authError) return json({ error: authError.message }, 500);
    return json({ success: true });
  }

  if (action === "remove") {
    if (target.role === "admin") {
      const { count, error } = await admin.from("profiles").select("id", { count: "exact", head: true }).eq("role", "admin").eq("is_active", true);
      if (error) return json({ error: error.message }, 500);
      if ((count ?? 0) <= 1) return json({ error: "The last active admin cannot be removed." }, 400);
    }
    const { error: profileUpdateError } = await admin.from("profiles").update({ is_active: false }).eq("id", userId);
    if (profileUpdateError) return json({ error: profileUpdateError.message }, 500);
    const { error } = await admin.auth.admin.updateUserById(userId, { ban_duration: "876000h" });
    if (error) return json({ error: error.message }, 500);
    return json({ success: true });
  }

  return json({ error: "Unknown action." }, 400);
});