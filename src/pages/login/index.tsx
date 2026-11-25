import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, Eye, EyeOff, Lock, Mail } from "lucide-react";
import { toast } from "sonner";
import { Brand } from "@/components/veticare/brand";
import { OcvasContactInfo } from "@/components/veticare/ocvas-contact-info";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BarangaySelect } from "@/components/owner-app/barangay-select";
import { supabase } from "@/integrations/supabase/client";
import { signInAndGetRole } from "@/integrations/supabase/auth-context";

const Login = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [confirmPasswordError, setConfirmPasswordError] = useState<string | null>(null);
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [barangay, setBarangay] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [creatingAccount, setCreatingAccount] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [signupMessage, setSignupMessage] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setConfirmPasswordError(null);
    setSignupMessage(null);

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim())) {
      setError("Enter a valid email address.");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    if (creatingAccount && password !== confirmPassword) {
      setConfirmPasswordError(confirmPassword ? "Passwords do not match." : "Confirm your password.");
      return;
    }
    if (creatingAccount && (!fullName.trim() || !phone.trim() || !address.trim() || !barangay.trim())) {
      setError("Complete all owner information fields.");
      return;
    }

    setSubmitting(true);
    if (creatingAccount) {
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/app`,
          data: {
            full_name: fullName.trim(),
            phone: phone.trim(),
            address: address.trim(),
            barangay: barangay.trim(),
          },
        },
      });
      if (signUpError) {
        setSubmitting(false);
        setError(signUpError.message);
        return;
      }
      if (data.session) {
        const { error: signOutError } = await supabase.auth.signOut({ scope: "local" });
        if (signOutError) {
          setSubmitting(false);
          setError("Your account was created, but the session could not be closed. Please sign out before continuing.");
          return;
        }
      }
      setSubmitting(false);
      setCreatingAccount(false);
      setPassword("");
      setConfirmPassword("");
      setSignupMessage(data.session
        ? "Your account was created. Sign in to check its approval status."
        : "Check your email to confirm your account, then sign in. Admin approval is still required.");
      navigate("/login", { replace: true });
      return;
    }

    const result = await signInAndGetRole(email.trim(), password);
    setSubmitting(false);
    if (result.error || !result.role) {
      setError(result.error?.message ?? "Could not identify your account role.");
      return;
    }

    const destination =
      result.role === "admin" ? "/" : result.role === "personnel" ? "/personnel" : "/app";
    toast.success("Signed in successfully.");
    navigate(destination, { replace: true });
  };

  return (
    <div className="page-backdrop relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-4 py-8">
      <div
        className="pointer-events-none absolute -left-24 top-10 size-[320px] rounded-full bg-primary/10 blur-3xl"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -right-20 bottom-0 size-[280px] rounded-full bg-warning/10 blur-3xl"
        aria-hidden
      />

      <div className="relative w-full max-w-[1080px]">
        <div className="mx-auto w-full max-w-[428px]">
          <div className="mb-5 flex flex-col items-center text-center">
            <Brand />
          </div>

        <div className="surface-raised relative overflow-hidden rounded-3xl border border-border bg-card p-5 sm:p-6">
          <div className="text-center">
            <h1 className="text-[25px] font-extrabold leading-tight tracking-[-0.03em] text-foreground">
              {creatingAccount ? "Create your account" : "Sign in to Veticare"}
            </h1>
            <p className="mx-auto mt-1.5 max-w-[300px] text-[12.5px] leading-relaxed text-muted-foreground">
              {creatingAccount
                ? "Submit your contact information for City Veterinary Office review."
                : "Sign in with your account. We will open your workspace automatically."}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="mt-5 space-y-4" noValidate>
            {creatingAccount ? (
              <>
                <div className="space-y-1.5">
                  <Label htmlFor="owner-full-name">Full name</Label>
                  <Input id="owner-full-name" value={fullName} onChange={(event) => setFullName(event.target.value)} autoComplete="name" required className="h-11 bg-background" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="owner-phone">Mobile number</Label>
                  <Input id="owner-phone" value={phone} onChange={(event) => setPhone(event.target.value)} autoComplete="tel" required className="h-11 bg-background" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="owner-address">Street / house address</Label>
                  <Input id="owner-address" value={address} onChange={(event) => setAddress(event.target.value)} autoComplete="street-address" required className="h-11 bg-background" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="owner-barangay">Barangay</Label>
                  <BarangaySelect id="owner-barangay" value={barangay} onValueChange={setBarangay} required />
                </div>
              </>
            ) : null}
            <div className="space-y-1.5">
              <Label htmlFor="login-email">Email address</Label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground/70" />
                <Input
                  id="login-email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="you@example.com"
                  className="h-11 bg-background pl-9"
                  aria-invalid={Boolean(error)}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="login-password">Password</Label>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground/70" />
                <Input
                  id="login-password"
                  type={showPassword ? "text" : "password"}
                  autoComplete={creatingAccount ? "new-password" : "current-password"}
                  value={password}
                  onChange={(event) => {
                    setPassword(event.target.value);
                    setConfirmPasswordError(null);
                  }}
                  placeholder="Enter your password"
                  className="h-11 bg-background pl-9 pr-10"
                  aria-invalid={Boolean(error)}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((value) => !value)}
                  className="absolute right-2 top-1/2 grid size-7 -translate-y-1/2 place-items-center rounded-md text-muted-foreground hover:bg-secondary hover:text-foreground"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
            </div>

            {creatingAccount ? (
              <div className="space-y-1.5">
                <Label htmlFor="login-confirm-password">Confirm password</Label>
                <div className="relative">
                  <Lock className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground/70" />
                  <Input
                    id="login-confirm-password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="new-password"
                    value={confirmPassword}
                    onChange={(event) => {
                      setConfirmPassword(event.target.value);
                      setConfirmPasswordError(null);
                    }}
                    placeholder="Re-enter your password"
                    className="h-11 bg-background pl-9"
                    required
                    aria-invalid={Boolean(confirmPasswordError)}
                    aria-describedby={confirmPasswordError ? "login-confirm-password-error" : undefined}
                  />
                </div>
                {confirmPasswordError ? (
                  <p id="login-confirm-password-error" className="text-[12px] text-destructive" role="alert">{confirmPasswordError}</p>
                ) : null}
              </div>
            ) : null}

            {signupMessage ? <p className="rounded-lg bg-primary-soft p-3 text-[12px] text-foreground" role="status">{signupMessage}</p> : null}
            {error ? <p className="text-[12px] text-destructive" role="alert">{error}</p> : null}

            <Button type="submit" disabled={submitting} className="h-11 w-full font-bold">
              {submitting
                ? creatingAccount ? "Creating account…" : "Signing in…"
                : creatingAccount ? "Create pet owner account" : "Sign in"}
              {!submitting ? <ArrowRight className="size-4" /> : null}
            </Button>
          </form>

          <div className="mt-5 border-t border-border pt-4 text-center">
            <p className="text-[11px] text-muted-foreground">
              {creatingAccount ? "Already have an account?" : "New pet owner?"}
            </p>
            <button
              type="button"
              onClick={() => {
                setCreatingAccount((current) => !current);
                setConfirmPassword("");
                setConfirmPasswordError(null);
                setError(null);
                setSignupMessage(null);
              }}
              className="mt-1 text-[12px] font-bold text-primary hover:underline"
            >
              {creatingAccount ? "Sign in" : "Create a pet owner account"}
            </button>
          </div>
        </div>

        </div>
        <div className="mt-7 w-full">
          <OcvasContactInfo />
        </div>

      </div>
    </div>
  );
};

export default Login;
