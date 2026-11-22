import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { BadgeCheck, History, House, ScanLine, UserRound } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { signOut } from "@/integrations/supabase/auth-context";
import { HomeScreen } from "@/pages/personnel/home-screen";
import { ScannerScreen } from "@/pages/personnel/scanner-screen";
import { VerifyScreen } from "@/pages/personnel/verify-screen";
import { HistoryScreen } from "@/pages/personnel/history-screen";
import { ProfileScreen } from "@/pages/personnel/profile-screen";
import { supabase } from "@/integrations/supabase/client";
import type { OwnerNotification } from "@/pages/owner-app/notifications-screen";
import {
  type PersonnelPet,
  type ScanEntry,
  type ScanResult,
} from "@/data/personnel";
import { createImpoundNotice, readImpoundNotices, readReviewIds, readScans, readVerifiedIds, writeReviewIds, writeScans, writeVerifiedIds } from "@/lib/personnel-preview-store";

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
  const [scans, setScans] = useState<ScanEntry[]>(readScans);
  const [scanRegistry, setScanRegistry] = useState<PersonnelPet[]>([]);
  const nextScanId = useRef(Math.max(0, ...scans.map((scan) => Number(scan.id.replace("SC-", "")) + 1)));
  const [tab, setTabState] = useState<PersonnelTab>(() => {
    const initial = searchParams.get("tab");
    return isTab(initial) ? initial : "home";
  });
  const [verifiedIds, setVerifiedIds] = useState<string[]>(readVerifiedIds);
  const [reviewIds, setReviewIds] = useState<string[]>(readReviewIds);
  const [impoundNotices, setImpoundNotices] = useState(readImpoundNotices);
  const [personnelIdentity, setPersonnelIdentity] = useState({ name: "", email: "", phone: "", avatarUrl: "" });
  const [notifications, setNotifications] = useState<OwnerNotification[]>([]);

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
        .not("rfid_tag", "is", null)
        .not("qr_code", "is", null);
      if (!active) return;
      if (petsError) {
        console.error("Unable to load issued pet identifiers:", petsError.message);
        setScanRegistry([]);
        return;
      }

      const ownerIds = [...new Set((petRows ?? []).map((pet) => pet.owner_id))];
      const { data: profiles, error: profilesError } = ownerIds.length
        ? await supabase.from("profiles").select("id, full_name, phone, barangay").in("id", ownerIds)
        : { data: [], error: null };
      if (!active) return;
      if (profilesError) {
        console.error("Unable to load owner contact details:", profilesError.message);
        setScanRegistry([]);
        return;
      }

      const profilesById = new Map((profiles ?? []).map((profile) => [profile.id, profile]));
      const issuedPets: PersonnelPet[] = (petRows ?? []).map((pet) => {
        const ownerProfile = profilesById.get(pet.owner_id);
        return {
          id: pet.pet_id ?? pet.id,
          name: pet.name,
          species: pet.species as "Dog" | "Cat",
          breed: pet.breed,
          sex: pet.sex as "Male" | "Female",
          age: pet.age,
          color: pet.color,
          owner: ownerProfile?.full_name || "Pet owner",
          contact: ownerProfile?.phone || "—",
          barangay: ownerProfile?.barangay || "—",
          registration: "active",
          registeredOn: new Date(pet.created_at).toLocaleDateString(undefined, { month: "short", year: "numeric" }),
          validThrough: `Dec 31, ${new Date().getFullYear()}`,
          vaccination: "due",
          lastVaccine: "No vaccination record linked",
          microchip: null,
          rfidTag: pet.rfid_tag,
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

  const addScan = (pet: PersonnelPet, result: ScanResult, note: string) => {
    const entry: ScanEntry = {
      id: `SC-${String(++nextScanId.current).padStart(4, "0")}`,
      petId: pet.id,
      petName: pet.name,
      scannedAt: "Just now",
      result,
      officer: personnelIdentity.name || "OCVAS Personnel",
      note,
    };
    setScans((prev) => {
      const updated = [entry, ...prev];
      writeScans(updated);
      return updated;
    });
    return entry.id;
  };

  const flagScan = (scanId: string) => {
    const scan = scans.find((item) => item.id === scanId);
    setScans((prev) => {
      const updated = prev.map((scan) =>
        scan.id === scanId
          ? {
              ...scan,
              result: "flagged" as ScanResult,
              note: `${scan.note} Flagged for OCVAS review.`,
            }
          : scan,
      );
      writeScans(updated);
      return updated;
    });
    if (!scan) return;
    setReviewIds((current) => {
      const updated = current.includes(scan.petId) ? current : [...current, scan.petId];
      writeReviewIds(updated);
      return updated;
    });
  };

  const verifyPet = (petId: string) => {
    setVerifiedIds((current) => {
      const updated = current.includes(petId) ? current : [...current, petId];
      writeVerifiedIds(updated);
      return updated;
    });
  };

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
            <div className="page-wash scroll-slim min-h-0 flex-1 overflow-y-auto overscroll-contain">
              {tab === "home" ? (
                <HomeScreen
                  scans={scans}
                  impoundNotices={impoundNotices}
                  personnelName={personnelIdentity.name}
                  notifications={notifications}
                  onMarkNotificationRead={markPersonnelNotificationRead}
                  onOpenScan={() => setTab("scan")}
                  onOpenHistory={() => setTab("history")}
                />
              ) : null}
              {tab === "scan" ? (
                <ScannerScreen
                  pets={scanRegistry}
                  onRecord={addScan}
                  onFlagScan={flagScan}
                  onImpound={(pet, location, date, reason) => {
                    const notice = createImpoundNotice(pet, location, date, reason);
                    setImpoundNotices((current) => [notice, ...current]);
                  }}
                />
              ) : null}
              {tab === "verify" ? (
                <VerifyScreen pets={scanRegistry} verifiedIds={verifiedIds} reviewIds={reviewIds} onVerify={verifyPet} onFlag={(petId) => {
                  setReviewIds((current) => {
                    const updated = current.includes(petId) ? current : [...current, petId];
                    writeReviewIds(updated);
                    return updated;
                  });
                }} />
              ) : null}
              {tab === "history" ? <HistoryScreen scans={scans} pets={scanRegistry} /> : null}
              {tab === "profile" ? (
                <ProfileScreen
                  identity={personnelIdentity}
                  onPhotoUpdated={(avatarUrl) => setPersonnelIdentity((current) => ({ ...current, avatarUrl }))}
                />
              ) : null}
            </div>

            <nav className="relative shrink-0 border-t border-border bg-card/95 px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2 backdrop-blur-xl">
              <div className="flex items-end justify-around gap-1">
                {leftTabs.map((item) => {
                  const Icon = item.icon;
                  const active = tab === item.key;
                  return (
                    <button
                      key={item.key}
                      type="button"
                      onClick={() => setTab(item.key)}
                      aria-current={active ? "page" : undefined}
                      className={cn(
                        "flex flex-1 flex-col items-center gap-1 rounded-xl py-1 transition-colors",
                        active ? "text-primary" : "text-muted-foreground hover:text-foreground",
                      )}
                    >
                      <span
                        className={cn(
                          "grid h-7 w-9 place-items-center rounded-lg transition-colors",
                          active ? "bg-primary-soft" : "bg-transparent",
                        )}
                      >
                        <Icon className="size-[18px]" strokeWidth={active ? 2.3 : 1.9} />
                      </span>
                      <span className="text-[9px] font-semibold tracking-wide">{item.label}</span>
                    </button>
                  );
                })}

                <button
                  type="button"
                  onClick={() => setTab("scan")}
                  aria-current={tab === "scan" ? "page" : undefined}
                  className="flex w-[68px] shrink-0 flex-col items-center gap-1"
                >
                  <span
                    className={cn(
                      "grid size-12 -translate-y-3 place-items-center rounded-2xl brand-gradient text-primary-foreground shadow-glow ring-4 ring-card transition-transform",
                      tab === "scan" && "scale-105",
                    )}
                  >
                    <ScanLine className="size-5" strokeWidth={2.2} />
                  </span>
                  <span className="-mt-1.5 text-[9px] font-bold text-primary">Scan</span>
                </button>

                {rightTabs.map((item) => {
                  const Icon = item.icon;
                  const active = tab === item.key;
                  return (
                    <button
                      key={item.key}
                      type="button"
                      onClick={() => setTab(item.key)}
                      aria-current={active ? "page" : undefined}
                      className={cn(
                        "flex flex-1 flex-col items-center gap-1 rounded-xl py-1 transition-colors",
                        active ? "text-primary" : "text-muted-foreground hover:text-foreground",
                      )}
                    >
                      <span
                        className={cn(
                          "grid h-7 w-9 place-items-center rounded-lg transition-colors",
                          active ? "bg-primary-soft" : "bg-transparent",
                        )}
                      >
                        <Icon className="size-[18px]" strokeWidth={active ? 2.3 : 1.9} />
                      </span>
                      <span className="text-[9px] font-semibold tracking-wide">{item.label}</span>
                    </button>
                  );
                })}
              </div>
            </nav>
          </div>
        </div>

        <p className="mt-3 hidden items-center justify-center gap-2 text-center text-[10.5px] text-muted-foreground sm:flex">
          Veticare City Pound Personnel
          <span className="text-muted-foreground/40">|</span>
          <button
            type="button"
            onClick={async () => {
              const { error } = await signOut();
              if (error) {
                toast.error(error.message);
                return;
              }
              navigate("/login", { replace: true });
            }}
            className="font-semibold text-primary hover:underline"
          >
            Sign out
          </button>
        </p>
      </div>
    </div>
  );
};

export default PersonnelApp;
