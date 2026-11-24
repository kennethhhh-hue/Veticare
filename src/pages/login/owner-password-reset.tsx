import { useRef, useState, useSyncExternalStore, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Brand } from "@/components/veticare/brand";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/integrations/supabase/auth-context";
import { supabase } from "@/integrations/supabase/client";

export const ownerPasswordResetPath = "/login/owner/reset-password";

let recoveryUserId: string | null = null;
const recoveryListeners = new Set<() => void>();

function setRecoveryUserId(userId: string | null) {
  if (userId === recoveryUserId) return;
  recoveryUserId = userId;
  recoveryListeners.forEach((listener) => listener());
}

if (window.location.pathname === ownerPasswordResetPath) {
  // The client may finish reading the email link before React mounts the form.
  supabase.auth.onAuthStateChange((event, session) => {
    const userId = session?.user.id ?? null;
    const nextRecoveryUserId = event === "PASSWORD_RECOVERY" ? userId
      : userId === recoveryUserId ? recoveryUserId : null;
    setRecoveryUserId(nextRecoveryUserId);
  });
}

function subscribeToRecovery(listener: () => void) {
  recoveryListeners.add(listener);
  return () => { recoveryListeners.delete(listener); };
}

export function OwnerPasswordReset() {
  const navigate = useNavigate();
  const { session, role, isActive, loading } = useAuth();
  const recoveryAccount = useSyncExternalStore(subscribeToRecovery, () => recoveryUserId);
  const canReset = Boolean(recoveryAccount && session?.user.id === recoveryAccount && role === "owner" && isActive);
  const submissionLock = useRef(false);
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const savePassword = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canReset || submissionLock.current) return;
    if (password.length < 6) {
      setError("Enter a password with at least 6 characters.");
      return;
    }
    if (password !== confirmation) {
      setError("The passwords do not match.");
      return;
    }

    submissionLock.current = true;
    setSaving(true);
    setError(null);
    try {
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) throw updateError;
      setRecoveryUserId(null);
      const { error: signOutError } = await supabase.auth.signOut({ scope: "local" });
      if (signOutError) toast.error("Password changed, but the recovery session could not be closed.");
      else toast.success("Password changed. Sign in with your new password.");
      navigate("/login/owner", { replace: true });
    } catch (error) {
      setError(error instanceof Error ? error.message : "Unable to change your password.");
    } finally {
      submissionLock.current = false;
      setSaving(false);
    }
  };

  return (
    <main className="page-backdrop grid min-h-screen place-items-center px-4 py-8">
      <section className="w-full max-w-[420px] space-y-5 rounded-2xl border border-border bg-card p-5 shadow-card sm:p-7">
        <Brand compact />
        <h1 className="text-xl font-extrabold text-foreground">Reset your password</h1>
        {loading ? (
          <p role="status" className="text-sm text-muted-foreground">Checking your reset link...</p>
        ) : canReset ? (
          <form onSubmit={savePassword} className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="owner-new-password">New password</Label>
              <Input id="owner-new-password" type="password" autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} minLength={6} required disabled={saving} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="owner-confirm-password">Confirm new password</Label>
              <Input id="owner-confirm-password" type="password" autoComplete="new-password" value={confirmation} onChange={(event) => setConfirmation(event.target.value)} minLength={6} required disabled={saving} />
            </div>
            {error ? <p role="alert" className="text-sm text-destructive">{error}</p> : null}
            <Button type="submit" disabled={saving} className="w-full">
              {saving ? "Saving..." : "Save new password"}
            </Button>
          </form>
        ) : (
          <div className="space-y-3 text-sm">
            <p className="text-muted-foreground">This reset link is invalid or expired. Ask an administrator to send a new link.</p>
            <Link to="/login/owner" className="font-semibold text-primary hover:underline">Back to owner sign-in</Link>
          </div>
        )}
      </section>
    </main>
  );
}
