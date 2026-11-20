import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  Eye,
  EyeOff,
  Info,
  Lock,
  Mail,
  ShieldCheck,
} from "lucide-react";
import { toast } from "sonner";
import { Brand } from "@/components/veticare/brand";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { signInWithRole } from "@/integrations/supabase/auth-context";

interface FieldErrors {
  email?: string;
  password?: string;
}

const AdminLogin = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [submitting, setSubmitting] = useState(false);

  const validate = () => {
    const next: FieldErrors = {};
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim())) {
      next.email = "Enter a valid staff email address.";
    }
    if (password.trim().length < 6) {
      next.password = "Password must be at least 6 characters.";
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!validate()) return;

    setSubmitting(true);
    const error = await signInWithRole(email.trim(), password, "admin");
    setSubmitting(false);
    if (error) {
      setErrors({ password: error.message });
      return;
    }
    toast.success("Signed in successfully.");
    navigate("/", { replace: true });
  };

  return (
    <div className="page-backdrop relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-4 py-6">
      <div
        className="pointer-events-none absolute -left-24 top-10 size-[320px] rounded-full bg-primary/10 blur-3xl"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -right-20 bottom-0 size-[280px] rounded-full bg-warning/10 blur-3xl"
        aria-hidden
      />

      <div className="relative w-full max-w-[428px]">
        <div className="mb-4 flex flex-col items-center text-center">
          <Brand />
        </div>

        <div className="surface-raised relative overflow-hidden rounded-3xl border border-border bg-card p-5 sm:p-6">
          <button
            type="button"
            onClick={() => navigate("/login")}
            className="flex items-center gap-1.5 text-[10.5px] font-semibold text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="size-3.5" />
            Change role
          </button>

          <div className="mt-3 text-center">
            <span className="mx-auto grid size-10 place-items-center rounded-xl bg-primary-soft text-primary">
              <ShieldCheck className="size-[18px]" strokeWidth={2.1} />
            </span>
            <h1 className="mt-2.5 text-[25px] font-extrabold leading-tight tracking-[-0.03em] text-foreground">
              Admin sign in
            </h1>
            <p className="mx-auto mt-1.5 max-w-[290px] text-[12.5px] leading-relaxed text-muted-foreground">
              Full access to registrations, owners, reports and system settings.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="mt-4 space-y-3" noValidate>
            <div className="space-y-1.5">
              <Label
                htmlFor="admin-email"
                className="text-[11px] font-bold uppercase tracking-[0.1em] text-muted-foreground"
              >
                Staff email
              </Label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground/70" />
                <Input
                  id="admin-email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  aria-invalid={Boolean(errors.email)}
                  placeholder="you@veticare.gov.ph"
                  className={cn(
                    "h-11 rounded-xl border-input bg-background pl-9 pr-3 text-[13px] focus-visible:ring-2 focus-visible:ring-primary/25 focus-visible:ring-offset-0",
                    errors.email && "border-destructive/60 focus-visible:ring-destructive/20",
                  )}
                />
              </div>
              {errors.email ? (
                <p className="text-[11px] font-medium text-destructive">{errors.email}</p>
              ) : null}
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label
                  htmlFor="admin-password"
                  className="text-[11px] font-bold uppercase tracking-[0.1em] text-muted-foreground"
                >
                  Password
                </Label>
                <button
                  type="button"
                  onClick={() =>
                    toast.info("Password reset is not connected yet", {
                      description: "An administrator will handle resets until email delivery is set up.",
                    })
                  }
                  className="text-[11px] font-semibold text-primary hover:underline"
                >
                  Forgot password?
                </button>
              </div>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground/70" />
                <Input
                  id="admin-password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  aria-invalid={Boolean(errors.password)}
                  placeholder="Enter your admin password"
                  className={cn(
                    "h-11 rounded-xl border-input bg-background pl-9 pr-10 text-[13px] focus-visible:ring-2 focus-visible:ring-primary/25 focus-visible:ring-offset-0",
                    errors.password && "border-destructive/60 focus-visible:ring-destructive/20",
                  )}
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
              {errors.password ? (
                <p className="text-[11px] font-medium text-destructive">{errors.password}</p>
              ) : null}
            </div>

            <div className="flex items-center gap-2">
              <Checkbox
                id="admin-remember"
                checked={remember}
                onCheckedChange={(value) => setRemember(value === true)}
                className="size-4 rounded-[5px] border-border data-[state=checked]:border-primary"
              />
              <Label htmlFor="admin-remember" className="text-[12px] font-medium text-muted-foreground">
                Keep me signed in on this device
              </Label>
            </div>

            <div className="flex items-start gap-2 rounded-xl border border-info/20 bg-info/5 px-2.5 py-2">
              <Info className="mt-0.5 size-3.5 shrink-0 text-info" />
              <p className="text-[10.5px] leading-relaxed text-muted-foreground">
                Sign in with an account created or invited in Supabase Authentication.
              </p>
            </div>

            <Button
              type="submit"
              disabled={submitting}
              className="group h-11 w-full rounded-xl text-[13px] font-bold shadow-glow"
            >
              {submitting ? "Signing in…" : "Sign in as Admin"}
              {!submitting ? (
                <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
              ) : null}
            </Button>
          </form>
        </div>

        <p className="mt-4 text-center text-[11px] leading-relaxed text-muted-foreground">
          Veticare • City Veterinary Office
          <br />
          <span className="text-[10px] text-muted-foreground/80">
            Authorized personnel only • activity is logged
          </span>
        </p>
      </div>
    </div>
  );
};

export default AdminLogin;
