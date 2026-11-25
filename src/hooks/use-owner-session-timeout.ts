import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

const idleLimitMs = 15 * 60_000;
const activityEvents = ["pointerdown", "keydown", "wheel", "touchmove"] as const;
const expiredKey = "veticare-owner-session-expired";
export const ownerExpiredLoginPath = "/login/owner?expired=1";

export function ownerSessionExpired() {
  try { return sessionStorage.getItem(expiredKey) === "1"; } catch { return false; }
}

export function clearOwnerSessionExpired() {
  try { sessionStorage.removeItem(expiredKey); } catch { /* Storage may be unavailable. */ }
}

export function useOwnerSessionTimeout(userId?: string, signedInAt?: string) {
  const navigate = useNavigate();
  const [expired, setExpired] = useState(false);
  const [logoutError, setLogoutError] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  useEffect(() => {
    if (!userId) return;
    const key = `veticare-owner-activity:${userId}:${signedInAt ?? "session"}`;
    let lastActivity = Date.now();
    let timer: number | undefined;
    let ended = false;

    function readActivity() {
      try {
        const stored = Number(localStorage.getItem(key));
        return Number.isFinite(stored) && stored > 0 && stored <= Date.now() ? stored : null;
      } catch {
        return null;
      }
    }

    function saveActivity() {
      try { localStorage.setItem(key, String(lastActivity)); } catch { /* The timer also works in memory. */ }
    }

    function checkDeadline() {
      window.clearTimeout(timer);
      if (ended) return;
      lastActivity = Math.max(lastActivity, readActivity() ?? 0);
      const remaining = lastActivity + idleLimitMs - Date.now();
      if (remaining <= 0) {
        ended = true;
        try { sessionStorage.setItem(expiredKey, "1"); } catch { /* The sign-in route still carries the notice. */ }
        setExpired(true);
        return;
      }
      timer = window.setTimeout(checkDeadline, remaining);
    }

    function recordActivity() {
      checkDeadline();
      if (ended || Date.now() - lastActivity < 1000) return;
      lastActivity = Date.now();
      saveActivity();
      checkDeadline();
    }

    function syncActivity(event: StorageEvent) {
      if (event.key === key) checkDeadline();
    }

    const stored = readActivity();
    if (stored !== null) lastActivity = stored;
    else saveActivity();
    checkDeadline();
    activityEvents.forEach((event) => window.addEventListener(event, recordActivity, { passive: true }));
    document.addEventListener("visibilitychange", checkDeadline);
    window.addEventListener("pageshow", checkDeadline);
    window.addEventListener("storage", syncActivity);

    return () => {
      ended = true;
      window.clearTimeout(timer);
      activityEvents.forEach((event) => window.removeEventListener(event, recordActivity));
      document.removeEventListener("visibilitychange", checkDeadline);
      window.removeEventListener("pageshow", checkDeadline);
      window.removeEventListener("storage", syncActivity);
    };
  }, [userId, signedInAt]);

  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    if (!expired) return;
    setSigningOut(true);
    setLogoutError(false);
    void supabase.auth.signOut({ scope: "local" }).then(({ error }) => {
      if (error) {
        setSigningOut(false);
        setLogoutError(true);
        return;
      }
      navigate(ownerExpiredLoginPath, { replace: true });
    }).catch(() => { setSigningOut(false); setLogoutError(true); });
  }, [expired, attempt, navigate]);

  return { expired, signingOut, logoutError, retry: () => setAttempt((current) => current + 1) };
}
