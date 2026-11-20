import { useEffect } from "react";
import { useLocation, Link } from "react-router-dom";
import { ArrowLeft, PawPrint } from "lucide-react";
import { Brand } from "@/components/veticare/brand";
import { Button } from "@/components/ui/button";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error(
      "404 Error: User attempted to access non-existent route:",
      location.pathname
    );
  }, [location.pathname]);

  return (
    <div className="page-backdrop flex min-h-screen items-center justify-center px-4 py-10">
      <div className="w-full max-w-[420px] text-center">
        <div className="mb-5 flex justify-center">
          <Brand />
        </div>
        <div className="surface-raised rounded-3xl border border-border bg-card p-6 sm:p-8">
          <span className="mx-auto grid size-12 place-items-center rounded-2xl bg-primary-soft text-primary">
            <PawPrint className="size-5" />
          </span>
          <p className="num mt-4 text-[44px] font-extrabold leading-none tracking-[-0.04em] text-foreground">
            404
          </p>
          <h1 className="mt-2 text-[17px] font-extrabold tracking-[-0.02em] text-foreground">
            This page isn&apos;t in the registry
          </h1>
          <p className="mx-auto mt-1.5 max-w-[280px] text-[12px] leading-relaxed text-muted-foreground">
            The link may be outdated. Head back to the dashboard to keep working on
            registrations and adoptions.
          </p>
          <Button asChild className="mt-4 h-10 w-full rounded-xl text-[12px] font-bold shadow-glow">
            <Link to="/">
              <ArrowLeft className="size-4" />
              Back to dashboard
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
};

export default NotFound;
