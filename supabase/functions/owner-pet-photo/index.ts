import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const maxPhotoBytes = 5 * 1024 * 1024;
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { ...corsHeaders, "Content-Type": "application/json" },
});

async function photoExtension(photo: File) {
  const header = new Uint8Array(await photo.slice(0, 12).arrayBuffer());
  if (photo.type === "image/jpeg" && header[0] === 255 && header[1] === 216 && header[2] === 255) return "jpg";
  if (photo.type === "image/png" && [137, 80, 78, 71, 13, 10, 26, 10].every((byte, index) => header[index] === byte)) return "png";
  if (photo.type === "image/webp" && String.fromCharCode(...header.slice(0, 4)) === "RIFF" && String.fromCharCode(...header.slice(8, 12)) === "WEBP") return "webp";
  return null;
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (request.method !== "POST") return json({ error: "Method not allowed." }, 405);

  const token = request.headers.get("Authorization")?.match(/^Bearer ([^ ]+)$/i)?.[1];
  if (!token) return json({ error: "Sign in again to change your pet's photo." }, 401);
  const url = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !serviceRoleKey) return json({ error: "Pet photo uploads are unavailable." }, 500);

  const admin = createClient(url, serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data, error: authError } = await admin.auth.getUser(token);
  if (authError || !data.user) return json({ error: "Sign in again to change your pet's photo." }, 401);
  const ownerId = data.user.id;
  const { data: profile, error: profileError } = await admin.from("profiles")
    .select("role, is_active, approval_status").eq("id", ownerId).maybeSingle();
  if (profileError) return json({ error: "Unable to check your account." }, 500);
  if (profile?.role !== "owner" || !profile.is_active || profile.approval_status !== "approved") {
    return json({ error: "An active owner account is required." }, 403);
  }

  if (Number(request.headers.get("Content-Length")) > maxPhotoBytes + 16 * 1024) {
    return json({ error: "The pet photo must be 5 MB or smaller." }, 413);
  }
  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return json({ error: "Invalid photo upload." }, 400);
  }
  const petId = form.get("petId");
  if (typeof petId !== "string" || !uuidPattern.test(petId)) return json({ error: "Invalid pet record." }, 400);
  const photo = form.get("photo");
  if (!(photo instanceof File) || !photo.size) return json({ error: "Choose a pet photo." }, 400);
  if (photo.size > maxPhotoBytes) return json({ error: "The pet photo must be 5 MB or smaller." }, 413);
  const extension = await photoExtension(photo);
  if (!extension) return json({ error: "Choose a valid JPG, PNG, or WebP image." }, 400);

  const { data: pet, error: petError } = await admin.from("pets").select("id")
    .eq("id", petId).eq("owner_id", ownerId).maybeSingle();
  if (petError) return json({ error: "Unable to check this pet record." }, 500);
  if (!pet) return json({ error: "Pet record not found." }, 404);

  const storage = admin.storage.from("veticare-pet-photos");
  const path = `${ownerId}/${crypto.randomUUID()}.${extension}`;
  const { error: uploadError } = await storage.upload(path, photo, { contentType: photo.type });
  if (uploadError) return json({ error: uploadError.message }, 500);

  const photoUrl = storage.getPublicUrl(path).data.publicUrl;
  const { data: updated, error: updateError } = await admin.from("pets").update({ photo_url: photoUrl })
    .eq("id", petId).eq("owner_id", ownerId).select("photo_url").maybeSingle();
  if (updated?.photo_url === photoUrl) return json({ photoUrl });
  if (updateError) {
    const { data: current, error } = await admin.from("pets").select("photo_url")
      .eq("id", petId).eq("owner_id", ownerId).maybeSingle();
    if (current?.photo_url === photoUrl) return json({ photoUrl });
    if (error) return json({ error: "Unable to confirm the pet photo update." }, 500);
  }
  await storage.remove([path]);
  return json({ error: "Unable to save the pet photo." }, updateError ? 500 : 404);
});
