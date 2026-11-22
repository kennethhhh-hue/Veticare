import { useRef, useState, type ChangeEvent } from "react";
import { Camera, LoaderCircle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

interface ProfilePhotoProps {
  name: string;
  photoUrl?: string;
  onPhotoUpdated: (photoUrl: string) => void;
}

export function ProfilePhoto({ name, photoUrl, onPhotoUpdated }: ProfilePhotoProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const initials = name.trim().split(/\s+/).map((part) => part[0]).slice(0, 2).join("").toUpperCase() || "VC";

  const uploadPhoto = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      toast.error("Choose a JPG, PNG, or WebP profile photo.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Profile photos must be 5 MB or smaller.");
      return;
    }

    setUploading(true);
    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData.user) {
      setUploading(false);
      toast.error("Your session expired. Sign in again to update your photo.");
      return;
    }

    const extension = file.type === "image/jpeg" ? "jpg" : file.type.split("/")[1];
    const path = `${userData.user.id}/${crypto.randomUUID()}.${extension}`;
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    if (sessionError || !sessionData.session) {
      setUploading(false);
      toast.error(sessionError?.message ?? "Your session expired. Sign in again to update your photo.");
      return;
    }

    const encodedPath = path.split("/").map(encodeURIComponent).join("/");
    const uploadError = await new Promise<string | null>((resolve) => {
      const request = new XMLHttpRequest();
      request.open("POST", `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/veticare-profile-photos/${encodedPath}`);
      request.setRequestHeader("Authorization", `Bearer ${sessionData.session.access_token}`);
      request.setRequestHeader("apikey", import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY);
      request.setRequestHeader("Content-Type", file.type);
      request.setRequestHeader("Cache-Control", "3600");
      request.setRequestHeader("x-upsert", "false");
      request.upload.onprogress = (progressEvent) => {
        if (progressEvent.lengthComputable) {
          setUploadProgress(Math.min(99, Math.round((progressEvent.loaded / progressEvent.total) * 100)));
        }
      };
      request.onload = () => {
        if (request.status >= 200 && request.status < 300) {
          setUploadProgress(100);
          resolve(null);
          return;
        }
        try {
          const response = JSON.parse(request.responseText) as { message?: string; error?: string };
          resolve(response.message ?? response.error ?? `Photo upload failed (${request.status}).`);
        } catch {
          resolve(`Photo upload failed (${request.status}).`);
        }
      };
      request.onerror = () => resolve("Network error while uploading the profile photo.");
      request.onabort = () => resolve("Profile photo upload was canceled.");
      request.send(file);
    });
    if (uploadError) {
      setUploading(false);
      setUploadProgress(0);
      toast.error(uploadError);
      return;
    }

    const url = supabase.storage.from("veticare-profile-photos").getPublicUrl(path).data.publicUrl;
    const { error: updateError } = await supabase.auth.updateUser({ data: { avatar_url: url } });
    if (updateError) {
      await supabase.storage.from("veticare-profile-photos").remove([path]);
      setUploading(false);
      setUploadProgress(0);
      toast.error(updateError.message);
      return;
    }

    onPhotoUpdated(url);
    setUploading(false);
    setUploadProgress(0);
    toast.success("Profile photo updated.");
  };

  return (
    <div className="flex items-center gap-3 rounded-xl border border-border bg-secondary/30 p-3">
      <span className="relative grid size-16 shrink-0 place-items-center overflow-hidden rounded-full bg-primary text-base font-bold text-primary-foreground ring-2 ring-background">
        {photoUrl ? <img src={photoUrl} alt={`${name} profile`} className="absolute inset-0 size-full object-cover" /> : initials}
      </span>
      <div className="min-w-0 flex-1 space-y-2">
        <div>
          <p className="text-[11px] font-bold text-foreground">Profile photo</p>
          <p className="text-[9px] text-muted-foreground">JPG, PNG, or WebP · up to 5 MB</p>
        </div>
        {uploading ? (
          <div className="space-y-1" role="status" aria-live="polite">
            <div className="flex justify-between text-[9px] font-semibold text-muted-foreground">
              <span className="flex items-center gap-1"><LoaderCircle className="size-3 animate-spin" />Uploading photo</span>
              <span>{uploadProgress}%</span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-secondary" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={uploadProgress}>
              <div className="h-full rounded-full bg-primary transition-[width] duration-150" style={{ width: `${uploadProgress}%` }} />
            </div>
          </div>
        ) : null}
        <Button type="button" size="sm" variant="outline" disabled={uploading} onClick={() => inputRef.current?.click()} className="h-8 text-[10px]">
          <Camera className="size-3.5" />{uploading ? "Uploading…" : "Change photo"}
        </Button>
        <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => void uploadPhoto(event)} className="sr-only" aria-label="Upload profile photo" />
      </div>
    </div>
  );
}
