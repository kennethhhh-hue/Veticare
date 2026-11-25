import { useQuery } from "@tanstack/react-query";
import { AccountAvatar } from "@/components/veticare/account-avatar";
import { useAuth } from "@/integrations/supabase/auth-context";
import { supabase } from "@/integrations/supabase/client";

export function AdminOwnerAvatar({ ownerId, name, className }: { ownerId: string; name: string; className?: string }) {
  const { session, role } = useAuth();
  const adminId = session?.user.id;
  const { data: photoUrl } = useQuery({
    queryKey: ["admin-owner-photo", adminId, ownerId],
    enabled: Boolean(adminId && ownerId && role === "admin"),
    staleTime: 30_000,
    refetchOnWindowFocus: "always",
    retry: false,
    queryFn: async ({ signal }) => {
      const { data, error } = await supabase.functions.invoke<{ photoUrl: string | null }>("admin-users", {
        body: { action: "get-owner-photo", userId: ownerId },
        signal,
      });
      if (error) throw error;
      return data?.photoUrl ?? null;
    },
  });

  return <AccountAvatar name={name} photoUrl={photoUrl ?? undefined} className={className} />;
}
