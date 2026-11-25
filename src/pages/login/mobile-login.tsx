import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  ClipboardList,
  Eye,
  EyeOff,
  Info,
  Lock,
  Mail,
  PawPrint,
  ShieldCheck,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { signInWithRole } from "@/integrations/supabase/auth-context";

type Variant = "owner" | "personnel";

const content = {
  owner: {
    appName: "Pet Owner app",
    icon: PawPrint,
    title: "Welcome back",
    subtitle: "Sign in to your pets, digital IDs and adoption requests.",
    emailLabel: "Email address",
    email: "",
    passwordHint: "Enter your password",
    cta: "Sign in to my pets",
    footerNote: "New to Veticare?",
    footerAction: "Register your pet",
    footerMessage: "Pet registration opens from your dashboard once you're signed in.",
  },
  personnel: {
    appName: "Personnel app",
    icon: ClipboardList,
    title: "Duty sign-in",
    subtitle: "Sign in to log impounds and update shelter records in the field.",
    emailLabel: "Personnel email",
    email: "",
    passwordHint: "Enter your personnel password",
    cta: "Start field shift",
    footerNote: "New assignment?",
    footerAction: "Ask your administrator",
    footerMessage: "Only the city vet admin can assign impound personnel to a barangay.",
  },
} as const;

interface MobileLoginProps {
  variant: Variant;
}

export function MobileLogin({ variant }: MobileLoginProps) {
  const navigate = useNavigate();
  const config = content[variant];
  const Icon = config.icon;

  const [email, setEmail] = useState<string>(config.email);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [remember, setRemember] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [creatingAccount, setCreatingAccount] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim())) {
      setError("Enter a valid email address.");
      return;
    }
    if (password.trim().length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    if (creatingAccount && password !== confirmPassword) {
      setError(confirmPassword ? "Passwords do not match." : "Confirm your password.");
      return;
    }

    setError(null);
    setSubmitting(true);
    if (creatingAccount) {
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: { emailRedirectTo: `${window.location.origin}/login/owner` },
      });
      setSubmitting(false);
      if (signUpError) {
        setError(signUpError.message);
        return;
      }
      setConfirmPassword("");
      if (data.session) {
        toast.success("Owner account created.");
        navigate("/app", { replace: true });
      } else {
        toast.success("Check your email to confirm your account.");
      }
      return;
    }

    const signInError = await signInWithRole(
      email.trim(),
      password,
      variant === "owner" ? "owner" : "personnel",
    );
    setSubmitting(false);
    if (signInError) {
      setError(signInError.message);
      return;
    }

    toast.success("Signed in successfully.");
    navigate(variant === "owner" ? "/app" : "/personnel");
  };

  return (
    <div className="page-backdrop relative flex min-h-screen flex-col items-center justify-center overflow-hidden sm:px-6 sm:py-6">
      <div
        className="pointer-events-none absolute -left-24 top-10 hidden size-[320px] rounded-full bg-primary/10 blur-3xl sm:block"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -right-20 bottom-0 hidden size-[280px] rounded-full bg-warning/10 blur-3xl sm:block"
        aria-hidden
      />

      <div className="relative w-full sm:max-w-[420px]">
        <div className="relative overflow-hidden bg-background sm:max-h-[860px] sm:rounded-[2.6rem] sm:border-[10px] sm:border-foreground/85 sm:shadow-raised">
          <div className="flex h-[100dvh] flex-col sm:h-[calc(100dvh-88px)] sm:max-h-[840px]">
            <div className="page-wash scroll-slim flex-1 overflow-y-auto px-5 pb-6 pt-5">
              <header className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => navigate("/login")}
                  className="flex items-center gap-1.5 rounded-lg py-1 text-[10.5px] font-semibold text-muted-foreground transition-colors hover:text-foreground"
                >
                  <ArrowLeft className="size-3.5" />
                  Change role
                </button>
                <span className="flex items-center gap-1 rounded-full border border-border bg-card px-2 py-1 text-[8.5px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
                  <Icon className="size-3 text-primary" />
                  {config.appName}
                </span>
              </header>


                  <div className="mt-7 text-center">
                    <span className="mx-auto grid size-12 place-items-center rounded-2xl brand-gradient text-primary-foreground shadow-glow">
                      <Icon className="size-5" strokeWidth={2.2} />
                    </span>
                    <p className="mt-3 text-[22px] font-extrabold leading-none tracking-[-0.04em] text-foreground">
                      Veti<span className="text-primary">care</span>
                    </p>
                    <p className="mt-1.5 text-[8.5px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                      care, protect, unite
                    </p>
                  </div>

                  <div className="mt-6">
                    <h1 className="text-[24px] font-extrabold leading-tight tracking-[-0.03em] text-foreground">
                      {creatingAccount ? "Create your owner account" : config.title}
                    </h1>
                    <p className="mt-1 max-w-[280px] text-[11.5px] leading-relaxed text-muted-foreground">
                      {config.subtitle}
                    </p>
                  </div>

                  <form onSubmit={handleSubmit} className="mt-4 space-y-3" noValidate>
                    <div className="space-y-1.5">
                      <Label
                        htmlFor={`${variant}-email`}
                        className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground"
                      >
                        {config.emailLabel}
                      </Label>
                      <div className="relative">
                        <Mail className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground/70" />
                        <Input
                          id={`${variant}-email`}
                          type="email"
                          autoComplete="email"
                          value={email}
                          onChange={(event) => setEmail(event.target.value)}
                          placeholder="you@veticare.gov.ph"
                          className={cn(
                            "h-11 rounded-xl border-input bg-card pl-9 pr-3 text-[12.5px] focus-visible:ring-2 focus-visible:ring-primary/25 focus-visible:ring-offset-0",
                            error && "border-destructive/50",
                          )}
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <Label
                          htmlFor={`${variant}-password`}
                          className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground"
                        >
                          Password
                        </Label>
                        <button
                          type="button"
                          onClick={() =>
                            toast.info("Password reset is not connected yet", {
                              description: "Contact the city vet admin to reset your password.",
                            })
                          }
                          className="text-[10.5px] font-semibold text-primary hover:underline"
                        >
                          Forgot?
                        </button>
                      </div>
                      <div className="relative">
                        <Lock className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground/70" />
                        <Input
                          id={`${variant}-password`}
                          type={showPassword ? "text" : "password"}
                          autoComplete={creatingAccount ? "new-password" : "current-password"}
                          value={password}
                          onChange={(event) => setPassword(event.target.value)}
                          placeholder={config.passwordHint}
                          className="h-11 rounded-xl border-input bg-card pl-9 pr-10 text-[12.5px] focus-visible:ring-2 focus-visible:ring-primary/25 focus-visible:ring-offset-0"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword((value) => !value)}
                          className="absolute right-2 top-1/2 grid size-7 -translate-y-1/2 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                          aria-label={showPassword ? "Hide password" : "Show password"}
                        >
                          {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                        </button>
                      </div>
                    </div>

                    {creatingAccount ? (
                      <div className="space-y-1.5">
                        <Label htmlFor="owner-confirm-password" className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
                          Confirm password
                        </Label>
                        <div className="relative">
                          <Lock className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground/70" />
                          <Input
                            id="owner-confirm-password"
                            type={showPassword ? "text" : "password"}
                            autoComplete="new-password"
                            value={confirmPassword}
                            onChange={(event) => setConfirmPassword(event.target.value)}
                            placeholder="Re-enter your password"
                            className="h-11 rounded-xl border-input bg-card pl-9 pr-3 text-[12.5px] focus-visible:ring-2 focus-visible:ring-primary/25 focus-visible:ring-offset-0"
                            required
                          />
                        </div>
                      </div>
                    ) : null}
                    {error ? <p className="text-[10.5px] font-medium text-destructive" role="alert">{error}</p> : null}

                    <div className="flex items-center gap-2">
                      <Checkbox
                        id={`${variant}-remember`}
                        checked={remember}
                        onCheckedChange={(value) => setRemember(value === true)}
                        className="size-4 rounded-[5px] border-border data-[state=checked]:border-primary"
                      />
                      <Label
                        htmlFor={`${variant}-remember`}
                        className="text-[11px] font-medium text-muted-foreground"
                      >
                        Keep me signed in
                      </Label>
                    </div>

                    <Button
                      type="submit"
                      disabled={submitting}
                      className="group h-11 w-full rounded-xl text-[12.5px] font-bold shadow-glow"
                    >
                      {submitting
                        ? creatingAccount ? "Creating account…" : "Signing in…"
                        : creatingAccount ? "Create account" : config.cta}
                      {!submitting ? (
                        <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
                      ) : null}
                    </Button>
                  </form>

                  <div className="mt-4 flex items-start gap-2 rounded-xl border border-info/20 bg-info/5 px-2.5 py-2">
                    <Info className="mt-0.5 size-3.5 shrink-0 text-info" />
                    <p className="text-[9.5px] leading-relaxed text-muted-foreground">
                      Sign in with your Veticare account.
                    </p>
                  </div>

                  <div className="mt-5 border-t border-border pt-4 text-center">
                    <p className="text-[10px] text-muted-foreground">
                      {variant === "owner" && creatingAccount
                        ? "Already have an account?"
                        : config.footerNote}
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        if (variant === "owner") {
                          setCreatingAccount((current) => !current);
                          setConfirmPassword("");
                          setError(null);
                          return;
                        }
                        toast.info(config.footerMessage);
                      }}
                      className="mt-1 text-[11px] font-bold text-primary hover:underline"
                    >
                      {variant === "owner" && creatingAccount
                        ? "Sign in"
                        : variant === "owner" ? "Create an account" : config.footerAction}
                    </button>
                  </div>

                  <p className="mt-5 flex items-center justify-center gap-1.5 text-[9px] text-muted-foreground/80">
                    <ShieldCheck className="size-3 text-primary" />
                    Authorized access • activity is audited
                  </p>
            </div>
          </div>
        </div>

        <p className="mt-3 hidden items-center justify-center gap-2 text-center text-[10.5px] text-muted-foreground sm:flex">
          Veticare • {config.appName} preview
          <span className="text-muted-foreground/40">|</span>
          <button
            type="button"
            onClick={() => navigate("/login")}
            className="font-semibold text-primary hover:underline"
          >
            Switch role
          </button>
        </p>
      </div>
    </div>
  );
}
