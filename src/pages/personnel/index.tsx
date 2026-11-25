import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { BadgeCheck, History, House, ScanLine, UserRound } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { HomeScreen } from "@/pages/personnel/home-screen";
import { ScannerScreen } from "@/pages/personnel/scanner-screen";
import { VerifyScreen } from "@/pages/personnel/verify-screen";
import { HistoryScreen } from "@/pages/personnel/history-screen";
import { ProfileScreen } from "@/pages/personnel/profile-screen";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { formatCalendarDate, getPhilippineDateKey } from "@/lib/philippine-date";
import type { OwnerNotification } from "@/pages/owner-app/notifications-screen";
import {
  scanFollowUpLabels,
  type PersonnelPet,
  type ScanFollowUp,
  type ScanFollowUpRequest,
  type ScanEntry,
  type ScanResult,
} from "@/data/personnel";
import { PullToRefresh } from "@/components/veticare/pull-to-refresh";

export type PersonnelImpoundReport = Tables<"personnel_impound_reports"> & {
  pets: { id: string; name: string; pet_id: string | null } | null;
};

type ReviewFlag = Pick<Tables<"personnel_review_flags">, "pet_record_id" | "request_type">;

const activityErrorMessage = (error: { message: string; code?: string }) => {
  if (error.code === "PGRST204" && error.message.includes("last_vaccination_date")) {
    return "Vaccination dates are unavailable. Apply the personnel last vaccination date migration and refresh the page.";
  }
  if (error.code === "PGRST204" && error.message.includes("vaccine_name")) {
    return "Vaccine names are unavailable. Apply the personnel scan form fields migration and refresh the page.";
  }
  if (error.code === "PGRST204" && error.message.includes("request_type")) {
    return "Follow-up requests are unavailable. Apply the personnel scan follow-ups migration and refresh the page.";
  }
  if (error.code === "42P01" || error.code === "PGRST205" || /personnel_(scans|verifications|review_flags).*schema cache/i.test(error.message)) {
    return "Personnel activity tables are unavailable. Apply the personnel activity migration and refresh the page.";
  }
  return `Personnel activity failed: ${error.message}`;
};

const formatScanTime = (timestamp: string) => new Date(timestamp).toLocaleString("en-PH", {
  dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Manila",
});

const mapScan = (row: Tables<"personnel_scans">, pet: { pet_id: string | null; name: string } | null, officer: string): ScanEntry => ({
  id: row.id,
  petRecordId: row.pet_record_id,
  petId: pet?.pet_id ?? row.pet_record_id,
  petName: pet?.name ?? "Pet unavailable",
  createdAt: row.created_at,
  scannedAt: formatScanTime(row.created_at),
  result: row.result as ScanResult,
  officer,
  note: row.note,
});

type PersonnelTab = "home" | "history" | "scan" | "verify" | "profile";

const leftTabs = [
  { key: "home" as const, label: "Home", icon: House },
  { key: "history" as const, label: "History", icon: History },
];

const rightTabs = [
  { key: "verify" as const, label: "Verify", icon: BadgeCheck },
  { key: "profile" as const, label: "Profile", icon: UserRound },
];

const isTab = (value: string | null): value is PersonnelTab =>
  value === "home" || value === "history" || value === "scan" || value === "verify" || value === "profile";

const PersonnelApp = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [scans, setScans] = useState<ScanEntry[]>([]);
  const [scanRegistry, setScanRegistry] = useState<PersonnelPet[]>([]);
  const [verifications, setVerifications] = useState<Tables<"personnel_verifications">[]>([]);
  const [reviewFlags, setReviewFlags] = useState<ReviewFlag[]>([]);
  const [activityError, setActivityError] = useState<string | null>(null);
  const [activityReady, setActivityReady] = useState(false);
  const activityUserId = useRef<string | null>(null);
  const activityOfficer = useRef("");
  const activityVersion = useRef(0);
  const pendingActivity = useRef(new Set<string>());
  const [today, setToday] = useState(getPhilippineDateKey);
  const [tab, setTabState] = useState<PersonnelTab>(() => {
    const initial = searchParams.get("tab");
    return isTab(initial) ? initial : "home";
  });
  const [impoundReports, setImpoundReports] = useState<PersonnelImpoundReport[]>([]);
  const [impoundReportsLoading, setImpoundReportsLoading] = useState(true);
  const [impoundReportsError, setImpoundReportsError] = useState<string | null>(null);
  const impoundReportsVersion = useRef(0);
  const impoundReportsMounted = useRef(false);
  const [personnelIdentity, setPersonnelIdentity] = useState({ name: "", email: "", phone: "", avatarUrl: "" });
  const [notifications, setNotifications] = useState<OwnerNotification[]>([]);

  const loadImpoundReports = useCallback(async () => {
    const version = ++impoundReportsVersion.current;
    setImpoundReportsLoading(true);
    try {
      const { data: authData, error: authError } = await supabase.auth.getUser();
      if (authError) throw authError;
      if (!authData.user) throw new Error("Sign in to view your impound reports.");
      const { data, error } = await supabase.from("personnel_impound_reports")
        .select("*, pets(id, name, pet_id)")
        .eq("reported_by", authData.user.id)
        .order("created_at", { ascending: false })
        .limit(3);
      if (error) throw error;
      if (!impoundReportsMounted.current || version !== impoundReportsVersion.current) return;
      setImpoundReports(data ?? []);
      setImpoundReportsError(null);
    } catch (error) {
      if (!impoundReportsMounted.current || version !== impoundReportsVersion.current) return;
      setImpoundReportsError(error && typeof error === "object" && "message" in error && typeof error.message === "string" ? error.message : "Unable to load impound reports.");
    } finally {
      if (impoundReportsMounted.current && version === impoundReportsVersion.current) setImpoundReportsLoading(false);
    }
  }, []);

  useEffect(() => {
    impoundReportsMounted.current = true;
    void loadImpoundReports();
    window.addEventListener("focus", loadImpoundReports);
    return () => {
      impoundReportsMounted.current = false;
      impoundReportsVersion.current++;
      window.removeEventListener("focus", loadImpoundReports);
    };
  }, [loadImpoundReports]);

  useEffect(() => {
    let active = true;
    const loadActivity = async () => {
      const version = ++activityVersion.current;
      const { data: authData, error: authError } = await supabase.auth.getUser();
      if (!active || version !== activityVersion.current) return;
      if (authError || !authData.user) {
        setActivityReady(false);
        setActivityError(authError?.message ?? "Sign in to access personnel activity.");
        return;
      }
      const user = authData.user;
      activityUserId.current = user.id;
      const [scanResponse, verificationResponse, flagResponse, profileResponse] = await Promise.all([
        supabase.from("personnel_scans").select("*, pets(pet_id, name)").eq("scanned_by", user.id).order("created_at", { ascending: false }),
        supabase.from("personnel_verifications").select("*").eq("verified_by", user.id).order("created_at", { ascending: false }),
        supabase.from("personnel_review_flags").select("*").eq("status", "open"),
        supabase.from("profiles").select("full_name, email").eq("id", user.id).maybeSingle(),
      ]);
      if (!active || version !== activityVersion.current) return;
      const error = scanResponse.error || verificationResponse.error || flagResponse.error || profileResponse.error;
      if (error) {
        setActivityReady(false);
        setActivityError(activityErrorMessage(error));
        return;
      }
      const officer = profileResponse.data?.full_name || profileResponse.data?.email || user.email || user.id;
      activityOfficer.current = officer;
      setScans((scanResponse.data ?? []).map((row) => mapScan(row, row.pets, officer)));
      setVerifications(verificationResponse.data ?? []);
      setReviewFlags((flagResponse.data ?? []).map(({ pet_record_id, request_type }) => ({
        pet_record_id, request_type: request_type ?? "general",
      })));
      setActivityError(null);
      setActivityReady(true);
    };
    void loadActivity();
    window.addEventListener("focus", loadActivity);
    return () => {
      active = false;
      window.removeEventListener("focus", loadActivity);
    };
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => setToday(getPhilippineDateKey()), 60_000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    let active = true;
    let channel: ReturnType<typeof supabase.channel> | undefined;
    const loadPersonnelHeader = async () => {
      const { data: authData } = await supabase.auth.getUser();
      const user = authData.user;
      if (!user || !active) return;
      const [{ data: profile, error: profileError }, { data: rows, error: notificationsError }] = await Promise.all([
        supabase.from("profiles").select("full_name, email, phone").eq("id", user.id).maybeSingle(),
        supabase.from("notifications").select("*").eq("recipient_id", user.id).order("created_at", { ascending: false }).limit(10),
      ]);
      if (!active) return;
      if (profileError) console.error("Unable to load personnel profile:", profileError.message);
      if (notificationsError) console.error("Unable to load personnel notifications:", notificationsError.message);
      setPersonnelIdentity({
        name: profile?.full_name || String(user.user_metadata.full_name ?? user.email ?? "OCVAS Personnel"),
        email: profile?.email || user.email || "",
        phone: profile?.phone || String(user.user_metadata.phone ?? ""),
        avatarUrl: String(user.user_metadata.avatar_url ?? ""),
      });
      if (!notificationsError) setNotifications(rows ?? []);
      channel = supabase.channel(`personnel-header-notifications-${user.id}`)
        .on("postgres_changes", { event: "INSERT", schema: "public", table: "notifications", filter: `recipient_id=eq.${user.id}` }, (payload) => {
          const row = payload.new as OwnerNotification;
          setNotifications((current) => current.some((item) => item.id === row.id) ? current : [row, ...current].slice(0, 10));
          toast.success(row.title, { description: row.message });
        })
        .subscribe();
    };
    void loadPersonnelHeader();
    return () => {
      active = false;
      if (channel) void supabase.removeChannel(channel);
    };
  }, []);

  const markPersonnelNotificationRead = async (notification: OwnerNotification) => {
    const readAt = new Date().toISOString();
    const { error } = await supabase.from("notifications").update({ read_at: readAt }).eq("id", notification.id);
    if (error) {
      toast.error(error.message);
      return;
    }
    setNotifications((current) => current.map((item) => item.id === notification.id ? { ...item, read_at: readAt } : item));
  };

  useEffect(() => {
    let active = true;
    const loadIssuedPets = async () => {
      const { data: petRows, error: petsError } = await supabase
        .from("pets")
        .select("*")
        .eq("status", "approved")
        .not("pet_id", "is", null)
        .not("qr_code", "is", null);
      if (!active) return;
      if (petsError) {
        console.error("Unable to load issued pet identifiers:", petsError.message);
        setScanRegistry([]);
        return;
      }

      const ownerIds = [...new Set((petRows ?? []).map((pet) => pet.owner_id))];
      const [{ data: profiles, error: profilesError }, vaccinationResult] = await Promise.all([
        ownerIds.length
          ? supabase.from("profiles").select("id, full_name, phone, barangay").in("id", ownerIds)
          : { data: [], error: null },
        supabase.from("pet_vaccinations").select("pet_record_id, vaccine_name, administered_on")
          .order("administered_on", { ascending: false }).order("created_at", { ascending: false }),
      ]);
      if (!active) return;
      if (profilesError) {
        console.error("Unable to load owner contact details:", profilesError.message);
        setScanRegistry([]);
        return;
      }

      const profilesById = new Map((profiles ?? []).map((profile) => [profile.id, profile]));
      const latestVaccinationByPet = new Map<string, { vaccine_name: string; administered_on: string }>();
      for (const vaccination of vaccinationResult.data ?? []) {
        if (!latestVaccinationByPet.has(vaccination.pet_record_id)) {
          latestVaccinationByPet.set(vaccination.pet_record_id, vaccination);
        }
      }
      const currentDate = getPhilippineDateKey();
      const issuedPets: PersonnelPet[] = (petRows ?? []).map((pet) => {
        const ownerProfile = profilesById.get(pet.owner_id);
        const vaccination = latestVaccinationByPet.get(pet.id);
        const expired = pet.pet_id_status === "expired" ||
          (pet.pet_id_valid_through != null && pet.pet_id_valid_through < currentDate);
        return {
          id: pet.pet_id ?? pet.id,
          recordId: pet.id,
          name: pet.name,
          species: pet.species as "Dog" | "Cat",
          breed: pet.breed,
          sex: pet.sex as "Male" | "Female",
          age: pet.age,
          color: pet.color,
          owner: ownerProfile?.full_name || "Pet owner",
          contact: ownerProfile?.phone || "—",
          barangay: ownerProfile?.barangay || "—",
          registration: expired ? "expired" : "active",
          registeredOn: new Date(pet.created_at).toLocaleDateString(undefined, { month: "short", year: "numeric" }),
          validThrough: pet.pet_id_valid_through
            ? new Date(`${pet.pet_id_valid_through}T12:00:00+08:00`).toLocaleDateString("en-PH", { dateStyle: "medium", timeZone: "Asia/Manila" })
            : "Not available",
          vaccination: "unknown",
          lastVaccine: vaccination
            ? `${vaccination.vaccine_name} · ${formatCalendarDate(vaccination.administered_on)}`
            : vaccinationResult.error ? "Vaccination records unavailable" : "No vaccination record linked",
          lastVaccinatedOn: vaccination?.administered_on,
          photoUrl: pet.photo_url ?? undefined,
          qrCode: pet.qr_code,
        };
      });
      setScanRegistry(issuedPets);
    };

    void loadIssuedPets();
    window.addEventListener("focus", loadIssuedPets);
    return () => {
      active = false;
      window.removeEventListener("focus", loadIssuedPets);
    };
  }, []);

  const setTab = (next: PersonnelTab) => {
    setTabState(next);
    setSearchParams(next === "home" ? {} : { tab: next }, { replace: true });
  };

  const reportActivityError = (error: { message: string; code?: string }) => {
    const message = activityErrorMessage(error);
    setActivityError(message);
    toast.error(message);
  };

  async function withActivityLock<T>(key: string, fallback: T, operation: () => Promise<T>): Promise<T> {
    if (pendingActivity.current.has(key)) {
      toast.info("This action is already being saved.");
      return fallback;
    }
    pendingActivity.current.add(key);
    try {
      return await operation();
    } finally {
      pendingActivity.current.delete(key);
    }
  }

  const addScan = async (pet: PersonnelPet, result: ScanResult, note: string): Promise<string | null> => {
    if (!activityReady || !activityUserId.current) {
      toast.error(activityError || "Personnel activity is still loading.");
      return null;
    }
    const { data, error } = await supabase.from("personnel_scans")
      .insert({ pet_record_id: pet.recordId, result, note }).select("*").single();
    if (error) { reportActivityError(error); return null; }
    activityVersion.current++;
    setActivityError(null);
    setScans((current) => [mapScan(data, { pet_id: pet.id, name: pet.name }, activityOfficer.current || data.scanned_by), ...current]);
    return data.id;
  };

  const flagPet = async (
    petId: string,
    scanId?: string,
    request: ScanFollowUpRequest | { type: "general" } = { type: "general" },
  ): Promise<boolean> => {
    const requestType = request.type;
    const pet = scanRegistry.find((item) => item.id === petId);
    if (!activityReady || !pet) {
      toast.error(activityError || "Personnel activity or pet record is unavailable.");
      return false;
    }
    const scan = scanId ? scans.find((item) => item.id === scanId && item.petRecordId === pet.recordId) : undefined;
    if (scanId && !scan) { toast.error("The scan does not match this pet."); return false; }
    const recordOpenFlag = () => {
      activityVersion.current++;
      setActivityError(null);
      setReviewFlags((current) => current.some((flag) => flag.pet_record_id === pet.recordId && flag.request_type === requestType)
        ? current
        : [...current, { pet_record_id: pet.recordId, request_type: requestType }]);
    };
    const { error } = await supabase.from("personnel_review_flags")
      .insert({
        pet_record_id: pet.recordId,
        scan_id: scan?.id,
        request_type: requestType === "general" ? undefined : requestType,
        vaccine_name: request.type === "vaccination" ? request.vaccineName : undefined,
        last_vaccination_date: request.type === "vaccination" ? request.lastVaccinationDate ?? undefined : undefined,
      });
    if (error) {
      if (error.code === "23505") {
        const { data: existing, error: lookupError } = await supabase.from("personnel_review_flags")
          .select("*").eq("pet_record_id", pet.recordId).eq("status", "open");
        if (existing?.some((flag) => (flag.request_type ?? "general") === requestType)) {
          recordOpenFlag();
          toast.info(requestType === "general"
            ? "This pet already has an open review flag."
            : `${scanFollowUpLabels[requestType]} request already recorded.`);
          return false;
        }
        if (lookupError) { reportActivityError(lookupError); return false; }
      }
      reportActivityError(error);
      return false;
    }
    recordOpenFlag();
    return true;
  };

  const verifyPet = async (petId: string): Promise<boolean> => {
    const pet = scanRegistry.find((item) => item.id === petId);
    if (!activityReady || !pet) {
      toast.error(activityError || "Personnel activity or pet record is unavailable.");
      return false;
    }
    const { data, error } = await supabase.from("personnel_verifications")
      .insert({ pet_record_id: pet.recordId }).select("*").single();
    if (error) { reportActivityError(error); return false; }
    activityVersion.current++;
    setActivityError(null);
    setVerifications((current) => [data, ...current]);
    return true;
  };

  const verifiedIds = scanRegistry.filter((pet) => verifications.some((verification) =>
    verification.pet_record_id === pet.recordId && getPhilippineDateKey(new Date(verification.created_at)) === today,
  )).map((pet) => pet.id);
  const reviewIds = scanRegistry.filter((pet) => reviewFlags.some((flag) => flag.pet_record_id === pet.recordId)).map((pet) => pet.id);

  return (
    <div className="mobile-app-viewport relative flex flex-col items-center justify-center bg-background sm:px-6 sm:py-6">
      <div
        className="pointer-events-none absolute -left-24 top-10 hidden size-[320px] rounded-full bg-primary/10 blur-3xl sm:block"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -right-20 bottom-0 hidden size-[280px] rounded-full bg-warning/10 blur-3xl sm:block"
        aria-hidden
      />

      <div className="relative h-full min-h-0 w-full sm:h-auto sm:max-w-[420px]">
        <div className="relative h-full min-h-0 overflow-hidden bg-background sm:h-[calc(100dvh-88px)] sm:max-h-[840px] sm:rounded-[2.6rem] sm:border-[10px] sm:border-foreground/85 sm:shadow-raised">
          <div className="flex h-full min-h-0 flex-col">
            <PullToRefresh disabled={tab === "scan"}>
              {activityError ? <p role="alert" className="mx-5 mt-3 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive">{activityError}</p> : null}
              {tab === "home" ? (
                <HomeScreen
                  scans={scans}
                  verifiedCount={verifiedIds.length}
                  reviewCount={reviewFlags.length}
                  activityReady={activityReady}
                  today={today}
                  impoundReports={impoundReports}
                  impoundReportsLoading={impoundReportsLoading}
                  impoundReportsError={impoundReportsError}
                  onRefreshImpoundReports={loadImpoundReports}
                  personnelName={personnelIdentity.name}
                  personnelPhotoUrl={personnelIdentity.avatarUrl}
                  notifications={notifications}
                  onMarkNotificationRead={markPersonnelNotificationRead}
                  onOpenScan={() => setTab("scan")}
                  onOpenHistory={() => setTab("history")}
                />
              ) : null}
              {tab === "scan" ? (
                <ScannerScreen
                  pets={scanRegistry}
                  onRecord={(pet, result, note) => withActivityLock<string | null>("scan", null, () => addScan(pet, result, note))}
                  openFollowUps={reviewFlags.filter((flag): flag is { pet_record_id: string; request_type: ScanFollowUp } => flag.request_type !== "general")}
                  onRequestFollowUp={(scanId, petId, request) => withActivityLock(`flag:${petId}:${request.type}`, false, () => flagPet(petId, scanId, request))}
                  onImpound={(pet, location, date) => withActivityLock("impound", false, async () => {
                    const { error } = await supabase.from("personnel_impound_reports").insert({
                      pet_record_id: pet.recordId,
                      location_found: location,
                      date_impounded: date,
                    });
                    if (error?.code === "23502" && error.message.includes('"reason"')) {
                      throw new Error("Apply the personnel scan form fields migration to submit an impound report without notes.");
                    }
                    if (error) throw error;
                    void loadImpoundReports();
                    return true;
                  })}
                />
              ) : null}
              {tab === "verify" ? (
                <VerifyScreen
                  pets={scanRegistry}
                  verifiedIds={verifiedIds}
                  reviewIds={reviewIds}
                  onVerify={(petId) => withActivityLock(`verify:${petId}`, false, () => verifyPet(petId))}
                  onFlag={(petId) => withActivityLock(`flag:${petId}`, false, () => flagPet(petId))}
                />
              ) : null}
              {tab === "history" ? <HistoryScreen scans={scans} pets={scanRegistry} /> : null}
              {tab === "profile" ? (
                <ProfileScreen
                  identity={personnelIdentity}
                  onPhotoUpdated={(avatarUrl) => setPersonnelIdentity((current) => ({ ...current, avatarUrl }))}
                />
              ) : null}
            </PullToRefresh>
            <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-card/95 px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2 backdrop-blur-xl sm:relative sm:inset-auto sm:z-auto sm:shrink-0">
              <div className="flex items-end justify-around gap-1">
                {leftTabs.map((item) => {
                  const Icon = item.icon;
                  const active = tab === item.key;
                  return (
                    <button key={item.key} type="button" onClick={() => setTab(item.key)} aria-current={active ? "page" : undefined} className={cn("flex flex-1 flex-col items-center gap-1 rounded-xl py-1 transition-colors", active ? "text-primary" : "text-muted-foreground hover:text-foreground")}>
                      <span className={cn("grid h-7 w-9 place-items-center rounded-lg transition-colors", active ? "bg-primary-soft" : "bg-transparent")}><Icon className="size-[18px]" strokeWidth={active ? 2.3 : 1.9} /></span>
                      <span className="text-[9px] font-semibold tracking-wide">{item.label}</span>
                    </button>
                  );
                })}
                <button type="button" onClick={() => setTab("scan")} aria-current={tab === "scan" ? "page" : undefined} className="flex flex-1 flex-col items-center gap-1 py-1 text-primary">
                  <span className="grid size-10 place-items-center rounded-xl bg-primary text-primary-foreground"><ScanLine className="size-5" /></span>
                  <span className="text-[9px] font-semibold tracking-wide">Scan</span>
                </button>
                {rightTabs.map((item) => {
                  const Icon = item.icon;
                  const active = tab === item.key;
                  return (
                    <button key={item.key} type="button" onClick={() => setTab(item.key)} aria-current={active ? "page" : undefined} className={cn("flex flex-1 flex-col items-center gap-1 rounded-xl py-1 transition-colors", active ? "text-primary" : "text-muted-foreground hover:text-foreground")}>
                      <span className={cn("grid h-7 w-9 place-items-center rounded-lg transition-colors", active ? "bg-primary-soft" : "bg-transparent")}><Icon className="size-[18px]" strokeWidth={active ? 2.3 : 1.9} /></span>
                      <span className="text-[9px] font-semibold tracking-wide">{item.label}</span>
                    </button>
                  );
                })}
              </div>
            </nav>
          </div>
        </div>
        <p className="mt-3 hidden items-center justify-center gap-2 text-center text-[10.5px] text-muted-foreground sm:flex">
          Veticare personnel app
          <span className="text-muted-foreground/40">|</span>
          <button type="button" onClick={() => navigate("/")} className="font-semibold text-primary hover:underline">Staff dashboard</button>
        </p>
      </div>
    </div>
  );
};

export default PersonnelApp;
