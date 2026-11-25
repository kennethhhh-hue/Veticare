import { useRef, useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Brand } from "@/components/veticare/brand";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";

export function AcceptInvite() {
  const navigate = useNavigate();
  const [tokenHash] = useState(() => new URLSearchParams(window.location.hash.slice(1)).get("invite"));
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const lock = useRef(false);
  const verifiedUserId = useRef<string | null>(null);

  const accept = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!tokenHash || lock.current) return;
    if (password !== confirmation) { setError("The passwords do not match."); return; }

    lock.current = true;
    setSaving(true);
    setError(null);
    try {
      if (!verifiedUserId.current) {
        const { data, error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type: "invite" });
        if (error || !data.session) throw new Error(error?.message ?? "This invitation is invalid or expired.");
        verifiedUserId.current = data.session.user.id;
        window.history.replaceState(window.history.state, "", window.location.pathname + window.location.search);
      }
      const { data } = await supabase.auth.getUser();
      if (data.user?.id !== verifiedUserId.current) throw new Error("The invitation session changed. Ask an administrator for a new invitation.");
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      const { error: signOutError } = await supabase.auth.signOut({ scope: "local" });
      if (signOutError) toast.warning("Password saved. Your session is still signed in.");
      else toast.success("Invitation accepted. Sign in with your new password.");
      navigate("/login", { replace: true });
    } catch (error) {
      setError(error instanceof Error ? error.message : "Unable to accept the invitation.");
    } finally {
      lock.current = false;
      setSaving(false);
    }
  };

  return (
    <main className="page-backdrop grid min-h-screen place-items-center px-4 py-8">
      <section className="w-full max-w-[420px] space-y-5 rounded-2xl border border-border bg-card p-5 shadow-card sm:p-7">
        <Brand compact />
        <h1 className="text-xl font-extrabold text-foreground">Accept your Veticare invitation</h1>
        {tokenHash ? (
          <form onSubmit={accept} className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="invite-password">New password</Label>
              <Input id="invite-password" type="password" autoComplete="new-password" minLength={6} required value={password} onChange={(event) => setPassword(event.target.value)} disabled={saving} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="invite-password-confirmation">Confirm password</Label>
              <Input id="invite-password-confirmation" type="password" autoComplete="new-password" minLength={6} required value={confirmation} onChange={(event) => setConfirmation(event.target.value)} disabled={saving} />
            </div>
            {error ? <p role="alert" className="text-sm text-destructive">{error}</p> : null}
            <Button type="submit" className="w-full" disabled={saving}>{saving ? "Accepting…" : "Accept invitation"}</Button>
          </form>
        ) : (
          <p className="text-sm text-muted-foreground">Open the link from your invitation email to set up your account.</p>
        )}
        <Link to="/login" className="inline-block text-sm font-semibold text-primary hover:underline">Back to sign-in</Link>
      </section>
    </main>
  );
}
