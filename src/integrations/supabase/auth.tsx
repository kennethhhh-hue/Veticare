import {
  useEffect,
  useState,
  type ReactNode,
} from "react";
import type { Session } from "@supabase/supabase-js";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ownerExpiredLoginPath, ownerSessionExpired } from "@/hooks/use-owner-session-timeout";
import { supabase } from "./client";
import { AuthContext, useAuth, type ApprovalStatus, type UserRole } from "./auth-context";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [role, setRole] = useState<UserRole | null>(null);
  const [approvalStatus, setApprovalStatus] = useState<ApprovalStatus | null>(null);
  const [isActive, setIsActive] = useState<boolean | null>(null);
  const [sessionReady, setSessionReady] = useState(false);
  const [loadedProfileId, setLoadedProfileId] = useState<string | null>(null);

  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((event, nextSession) => {
      setSession(nextSession);
      if (event === "SIGNED_OUT") {
        setRole(null);
        setApprovalStatus(null);
        setIsActive(null);
        setLoadedProfileId(null);
      }
      setSessionReady(true);
    });

    return () => {
      data.subscription.unsubscribe();
    };
  }, []);

  const userId = session?.user.id;

  useEffect(() => {
    if (!userId) {
      setRole(null);
      setApprovalStatus(null);
      setIsActive(null);
      setLoadedProfileId(null);
      return;
    }

    let active = true;
    setLoadedProfileId(null);
    supabase
      .from("profiles")
      .select("role, approval_status, is_active")
      .eq("id", userId)
      .maybeSingle()
      .then(async (result) => {
        if (!active) return;
        let { data, error } = result;
        if (error?.code === "42703" && error.message.includes("is_active")) {
          const fallback = await supabase
            .from("profiles")
            .select("role, approval_status")
            .eq("id", userId)
            .maybeSingle();
          data = fallback.data ? { ...fallback.data, is_active: true } : null;
          error = fallback.error;
        }
        if (!active) return;
        if (error) console.error("Unable to load account role:", error.message);
        setRole(data?.role ?? null);
        setApprovalStatus(data?.approval_status ?? null);
        setIsActive(data?.is_active ?? true);
        setLoadedProfileId(userId);
      });

    return () => {
      active = false;
    };
  }, [userId]);

  const loading = !sessionReady || (session !== null && loadedProfileId !== session.user.id);

  return (
    <AuthContext.Provider value={{ session, role, approvalStatus, isActive, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function RequireAuth({
  children,
  role: requiredRole,
}: {
  children: ReactNode;
  role: UserRole;
}) {
  const { session, role, approvalStatus, isActive, loading } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [signingOut, setSigningOut] = useState(false);
  const [signOutError, setSignOutError] = useState<string | null>(null);

  const backToLogin = async () => {
    setSigningOut(true);
    setSignOutError(null);
    const { error } = await supabase.auth.signOut({ scope: "local" });
    if (error) {
      setSignOutError(error.message);
      setSigningOut(false);
      return;
    }
    navigate("/login", { replace: true });
  };

  if (loading) {
    return (
      <div className="grid min-h-screen place-items-center text-sm text-muted-foreground">
        Checking your session...
      </div>
    );
  }

  if (!session) {
    return <Navigate to={requiredRole === "owner" && ownerSessionExpired() ? ownerExpiredLoginPath : "/login"} replace state={{ from: location }} />;
  }

  if (!role) {
    return (
      <div className="grid min-h-screen place-items-center px-6 text-center text-sm text-muted-foreground">
        Your account role is not set. Contact a Veticare administrator.
      </div>
    );
  }

  if (role !== requiredRole) {
    const home = role === "admin" ? "/" : role === "personnel" ? "/personnel" : "/app";
    return <Navigate to={home} replace />;
  }

  if (isActive === false) {
    return (
      <div className="grid min-h-screen place-items-center px-6 text-center text-sm text-muted-foreground">
        This account is inactive. Contact a Veticare administrator for access.
      </div>
    );
  }

  if (requiredRole === "owner" && approvalStatus !== "approved") {
    return (
      <div className="grid min-h-screen place-items-center px-6 text-center">
        <div className="max-w-md rounded-xl border border-border bg-card p-6">
          <h1 className="text-lg font-bold text-foreground">
            {approvalStatus === "rejected" ? "Account needs updates" : "Account awaiting review"}
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            {approvalStatus === "rejected"
              ? "Your owner details need correction. Contact the City Veterinary Office for help."
              : "The City Veterinary Office is reviewing your owner details. You can use the pet-owner app after your account is approved."}
          </p>
          {signOutError ? <p className="mt-3 text-sm text-destructive" role="alert">{signOutError}</p> : null}
          <Button type="button" className="mt-5 w-full" onClick={() => void backToLogin()} disabled={signingOut}>
            {signingOut ? "Signing out..." : "Back to login"}
          </Button>
        </div>
      </div>
    );
  }

  return children;
}

