import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/integrations/supabase/auth-context";
import { supabase } from "@/integrations/supabase/client";

export function usePetVaccinations(petId: string) {
  const { session } = useAuth();
  const userId = session?.user.id;
  const queryKey = ["pet-vaccinations", userId, petId] as const;
  const vaccinations = useQuery({
    queryKey,
    enabled: Boolean(userId),
    queryFn: async () => {
      const { data, error } = await supabase.from("pet_vaccinations")
        .select("id, vaccine_name, administered_on, next_due_on")
        .eq("pet_record_id", petId)
        .order("administered_on", { ascending: false })
        .order("created_at", { ascending: false });
      if (error) throw new Error(error.message);
      return data;
    },
  });

  return { vaccinations, queryKey };
}
