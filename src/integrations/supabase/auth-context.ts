import { createContext, useContext } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "./client";

export type UserRole = "admin" | "owner" | "personnel";
export type ApprovalStatus = "pending" | "approved" | "rejected";

interface AuthContextValue {
  session: Session | null;
  role: UserRole | null;
  approvalStatus: ApprovalStatus | null;
  isActive: boolean | null;
  loading: boolean;
}

export const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider.");
  return context;
}

export function signOut() {
  return supabase.auth.signOut();
}

export async function signInAndGetRole(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { role: null, error };

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", data.user.id)
    .maybeSingle();

  if (profileError || !profile) {
    await supabase.auth.signOut();
    return {
      role: null,
      error: profileError ?? new Error("This account has no assigned Veticare role."),
    };
  }

  return { role: profile.role, error: null };
}

export async function signInWithRole(email: string, password: string, requiredRole: UserRole) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return error;

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", data.user.id)
    .maybeSingle();

  if (profileError) return profileError;
  if (!profile) return new Error("This account has no assigned Veticare role.");
  if (profile.role !== requiredRole) {
    return new Error("This account is not assigned to the selected workspace.");
  }
  return null;
}