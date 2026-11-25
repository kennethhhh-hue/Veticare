import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Bell, Heart, Home, PawPrint, User } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { HomeScreen } from "@/pages/owner-app/home-screen";
import { PetsScreen } from "@/pages/owner-app/pets-screen";
import { AdoptScreen } from "@/pages/owner-app/adopt-screen";
import { ProfileScreen } from "@/pages/owner-app/profile-screen";
import { PetDetail } from "@/pages/owner-app/pet-detail";
import { PetIdScreen } from "@/pages/owner-app/pet-id-screen";
import { PetRegistrationScreen } from "@/pages/owner-app/pet-registration-screen";
import { NotificationsScreen, type OwnerNotification } from "@/pages/owner-app/notifications-screen";
import type { AppTab } from "@/pages/owner-app/app-tab";
import type { AdoptablePet, OwnerPet, OwnerRequestInput } from "@/data/owner-app";
import { useAuth } from "@/integrations/supabase/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { formatCalendarDate, getPhilippineDateKey } from "@/lib/philippine-date";
import type { Tables } from "@/integrations/supabase/types";
import {
  readOwnerRequests,
  writeOwnerProfile,
  type AdoptionRequest,
  type OwnerProfile,
  type OwnerRequest,
} from "@/lib/owner-preview-store";
import { PullToRefresh } from "@/components/veticare/pull-to-refresh";

const tabs = [
  { key: "home", label: "Home", icon: Home },
  { key: "pets", label: "My pets", icon: PawPrint },
  { key: "adopt", label: "Adopt", icon: Heart },
  { key: "notifications", label: "Alerts", icon: Bell },
  { key: "profile", label: "Profile", icon: User },
] as const;

const isTab = (value: string | null): value is AppTab =>
  value === "home" || value === "pets" || value === "adopt" || value === "notifications" || value === "profile";

function mapServiceRequest(row: Tables<"owner_service_requests">, petName: string): OwnerRequest {
  return {
    id: row.id,
    type: row.request_type,
    petId: row.pet_record_id,
    petName,
    submittedAt: row.created_at,
    details: [row.preferred_date ? `Preferred date ${formatCalendarDate(row.preferred_date)}` : "", row.details]
      .filter(Boolean).join(" · "),
    status: row.status,
  };
}

const OwnerApp = () => {
  const navigate = useNavigate();
  const { session } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [tab, setTab] = useState<AppTab>(() => {
    const initial = searchParams.get("tab");
    return isTab(initial) ? initial : "home";
  });
  const [openPet, setOpenPet] = useState<OwnerPet | null>(null);
  const [idPet, setIdPet] = useState<OwnerPet | null>(null);
  const [pets, setPets] = useState<OwnerPet[]>([]);
  const [petsLoading, setPetsLoading] = useState(true);
  const [notifications, setNotifications] = useState<OwnerNotification[]>([]);
  const [adoptablePets, setAdoptablePets] = useState<AdoptablePet[]>([]);
  const [adoptablesLoading, setAdoptablesLoading] = useState(true);
  const [adoptionsLoadError, setAdoptionsLoadError] = useState<string | null>(null);
  const [profile, setProfile] = useState<OwnerProfile>(() => ({
    fullName: String(session?.user.user_metadata.full_name ?? session?.user.email ?? "Pet Owner"),
    email: session?.user.email ?? "",
    phone: String(session?.user.user_metadata.phone ?? ""),
    address: String(session?.user.user_metadata.address ?? ""),
    barangay: String(session?.user.user_metadata.barangay ?? ""),
    avatarUrl: String(session?.user.user_metadata.avatar_url ?? ""),
  }));
  const [adoptionRequests, setAdoptionRequests] = useState<AdoptionRequest[]>([]);
  const [ownerRequests, setOwnerRequests] = useState<OwnerRequest[]>([]);
  const [ownerRequestsUnavailable, setOwnerRequestsUnavailable] = useState(false);
  const [legacyRequests] = useState(readOwnerRequests);
  const requestsVersion = useRef(0);
  const [registeringPet, setRegisteringPet] = useState(false);

  const loadOwnerRecords = useCallback(async () => {
    const version = ++requestsVersion.current;
    setPetsLoading(true);
    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData.user) {
      toast.error("Please sign in again to load your pet records.");
      setPetsLoading(false);
      return;
    }

    const [{ data: petRows, error: petsError }, { data: profileRow, error: profileError }, { data: notificationRows, error: notificationsError }, vaccinationResult, requestResult] = await Promise.all([
      supabase.from("pets").select("*").eq("owner_id", userData.user.id).order("created_at", { ascending: false }),
      supabase.from("profiles").select("full_name, email, phone, address, barangay").eq("id", userData.user.id).maybeSingle(),
      supabase.from("notifications").select("*").eq("recipient_id", userData.user.id).order("created_at", { ascending: false }),
      supabase.from("pet_vaccinations").select("pet_record_id, vaccine_name, administered_on").order("administered_on", { ascending: false }),
      supabase.from("owner_service_requests").select("*, pets(name)").eq("owner_id", userData.user.id).order("created_at", { ascending: false }),
    ]);
    if (version === requestsVersion.current) {
      setOwnerRequestsUnavailable(Boolean(requestResult.error));
      if (!requestResult.error) {
        setOwnerRequests((requestResult.data ?? []).map((request) => mapServiceRequest(request, request.pets?.name ?? "Pet")));
      }
    }

    if (profileError) toast.error(profileError.message);
    if (notificationsError) toast.error(notificationsError.message);
    else setNotifications(notificationRows ?? []);
    const nextProfile = {
      fullName: profileRow?.full_name || String(userData.user.user_metadata.full_name ?? userData.user.email ?? "Pet Owner"),
      email: profileRow?.email || userData.user.email || "",
      phone: profileRow?.phone || String(userData.user.user_metadata.phone ?? ""),
      address: profileRow?.address || String(userData.user.user_metadata.address ?? ""),
      barangay: profileRow?.barangay || String(userData.user.user_metadata.barangay ?? ""),
      avatarUrl: String(userData.user.user_metadata.avatar_url ?? ""),
    };
    setProfile(nextProfile);
    writeOwnerProfile(nextProfile);
    if (petsError) {
      toast.error(petsError.message);
      setPetsLoading(false);
      return;
    }

    const vaccinesByPet = new Map<string, OwnerPet["vaccines"]>();
    for (const vaccination of vaccinationResult.data ?? []) {
      const vaccines = vaccinesByPet.get(vaccination.pet_record_id) ?? [];
      vaccines.push({ name: vaccination.vaccine_name, date: formatCalendarDate(vaccination.administered_on), status: "done" });
      vaccinesByPet.set(vaccination.pet_record_id, vaccines);
    }
    setPets((petRows ?? []).map((pet) => ({
      id: pet.id,
      name: pet.name,
      species: pet.species as "Dog" | "Cat",
      breed: pet.breed,
      age: pet.age,
      sex: pet.sex as "Male" | "Female",
      weight: pet.weight || "Not provided",
      color: pet.color || "Not provided",
      photoUrl: pet.photo_url ?? undefined,
      petId: pet.pet_id || "Pending review",
      qrCode: pet.qr_code,
      registered: pet.status === "approved" ? new Date(pet.created_at).toLocaleDateString(undefined, { month: "short", year: "numeric" }) : "Pending review",
      registrationStatus: pet.status as "pending" | "approved" | "rejected",
      tags: [pet.status === "approved" ? "Registered" : pet.status === "rejected" ? "Needs update" : "Pending review"],
      nextDue: { title: "No reminders yet", date: "Available after registration", days: 0 },
      vaccines: vaccinesByPet.get(pet.id) ?? [],
      vaccinationsUnavailable: Boolean(vaccinationResult.error),
    })));
    setPetsLoading(false);
  }, []);

  const submitOwnerRequest = async (request: OwnerRequestInput) => {
    const { data, error } = await supabase.from("owner_service_requests")
      .insert({
        pet_record_id: request.petId,
        request_type: request.type,
        preferred_date: request.preferredDate || null,
        details: request.details ?? "",
      })
      .select("*").single();
    if (error) {
      const message = error.code === "23505" ? "An identical request is already waiting for review."
        : error.code === "PGRST205" ? "The owner request service is not available yet."
        : error.message;
      toast.error(message);
      return false;
    }
    requestsVersion.current++;
    setOwnerRequestsUnavailable(false);
    const petName = pets.find((pet) => pet.id === request.petId)?.name ?? "Pet";
    setOwnerRequests((current) => [mapServiceRequest(data, petName), ...current.filter((item) => item.id !== data.id)]);
    return true;
  };

  useEffect(() => {
    void loadOwnerRecords();
    window.addEventListener("focus", loadOwnerRecords);
    return () => window.removeEventListener("focus", loadOwnerRecords);
  }, [loadOwnerRecords]);

  const loadOwnerAdoptions = useCallback(async () => {
    setAdoptablesLoading(true);
    setAdoptionsLoadError(null);
    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData.user) {
      setAdoptionsLoadError("Please sign in again to view adoption listings.");
      setAdoptablesLoading(false);
      return;
    }

    const [animalsResult, applicationsResult] = await Promise.all([
      supabase.from("adoptable_animals").select("id, impound_id, animal_type, name, breed, sex, age, color, area").order("name"),
      supabase.from("adoption_applications").select("id, application_id, impound_record_id, application_date, created_at, status, pet_name").eq("applicant_id", userData.user.id).order("created_at", { ascending: false }),
    ]);
    const error = animalsResult.error ?? applicationsResult.error;
    if (error) {
      setAdoptionsLoadError(error.message);
      setAdoptablesLoading(false);
      return;
    }

    setAdoptablePets((animalsResult.data ?? []).map((animal) => ({
      id: animal.id,
      name: animal.name,
      species: animal.animal_type as "Dog" | "Cat",
      breed: animal.breed,
      age: animal.age,
      sex: animal.sex as "Male" | "Female",
      shelter: `OCVAS • ${animal.area}`,
      distance: "Available for adoption",
      tags: [animal.color].filter(Boolean),
    })));
    setAdoptionRequests((applicationsResult.data ?? []).map((application) => ({
      id: application.application_id,
      petId: application.impound_record_id,
      petName: application.pet_name || "Animal",
      submittedAt: application.created_at || application.application_date,
      status: application.status as AdoptionRequest["status"],
    })));
    setAdoptablesLoading(false);
  }, []);

  useEffect(() => {
    void loadOwnerAdoptions();
    window.addEventListener("focus", loadOwnerAdoptions);
    return () => window.removeEventListener("focus", loadOwnerAdoptions);
  }, [loadOwnerAdoptions]);

  const submitOwnerAdoption = async (pet: AdoptablePet): Promise<boolean> => {
    const { data, error: userError } = await supabase.auth.getUser();
    if (userError || !data.user) {
      toast.error("Please sign in again before applying to adopt.");
      return false;
    }

    const { error } = await supabase.from("adoption_applications").insert({
      application_id: `AD-${Date.now().toString().slice(-8)}`,
      applicant_id: data.user.id,
      impound_record_id: pet.id,
      application_date: getPhilippineDateKey(),
      home_visit_status: "pending",
      note: "",
    });
    if (error) {
      toast.error(error.message);
      return false;
    }
    await loadOwnerAdoptions();
    return true;
  };

  useEffect(() => {
    let active = true;
    let channel: ReturnType<typeof supabase.channel> | undefined;
    void supabase.auth.getUser().then(({ data }) => {
      if (!active || !data.user) return;
      channel = supabase
        .channel(`owner-notifications-${data.user.id}`)
        .on("postgres_changes", {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `recipient_id=eq.${data.user.id}`,
        }, (payload) => {
          const notification = payload.new as OwnerNotification;
          setNotifications((current) => current.some((item) => item.id === notification.id) ? current : [notification, ...current]);
          toast.success(notification.title, { description: notification.message });
        })
        .subscribe();
    });
    return () => {
      active = false;
      if (channel) void supabase.removeChannel(channel);
    };
  }, []);

  const markNotificationRead = async (notification: OwnerNotification) => {
    const readAt = new Date().toISOString();
    const { error } = await supabase.from("notifications").update({ read_at: readAt }).eq("id", notification.id);
    if (error) {
      toast.error(error.message);
      return;
    }
    setNotifications((current) => current.map((item) => item.id === notification.id ? { ...item, read_at: readAt } : item));
  };

  const showTabs = !openPet && !idPet && !registeringPet;
  const unreadNotifications = notifications.filter((notification) => !notification.read_at).length;

  const selectTab = (next: AppTab) => {
    setTab(next);
    setOpenPet(null);
    setIdPet(null);
    setSearchParams(next === "home" ? {} : { tab: next }, { replace: true });
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
            <PullToRefresh disabled={registeringPet}>
              {registeringPet ? (
                <PetRegistrationScreen
                  onBack={() => setRegisteringPet(false)}
                  onCreated={(pet) => {
                    setPets((current) => [pet, ...current]);
                    setRegisteringPet(false);
                    setTab("pets");
                    toast.success("Pet registration submitted for review.");
                  }}
                />
              ) : idPet ? (
                <PetIdScreen pet={idPet} ownerName={profile.fullName} onBack={() => setIdPet(null)} />
              ) : openPet ? (
                <PetDetail
                  pet={pets.find((pet) => pet.id === openPet.id) ?? openPet}
                  onBack={() => setOpenPet(null)}
                  onShowId={(pet) => setIdPet(pet)}
                  onPhotoUpdated={(petId, photoUrl) => {
                    setPets((current) => current.map((pet) => pet.id === petId ? { ...pet, photoUrl } : pet));
                    setOpenPet((current) => current?.id === petId ? { ...current, photoUrl } : current);
                    setIdPet((current) => current?.id === petId ? { ...current, photoUrl } : current);
                  }}
                  onRequest={submitOwnerRequest}
                />
              ) : (
                <>
                  {tab === "home" ? (
                    <HomeScreen
                      onOpenTab={selectTab}
                      pets={pets}
                      ownerName={profile.fullName}
                      ownerPhotoUrl={profile.avatarUrl}
                      onAddPet={() => setRegisteringPet(true)}
                      onOpenPet={(pet) => setOpenPet(pet)}
                      onOpenId={(pet) => setIdPet(pet)}
                      onOpenAdoptable={() => selectTab("adopt")}
                      adoptablePets={adoptablePets}
                      adoptablesLoading={adoptablesLoading}
                      adoptablesError={adoptionsLoadError}
                      unreadNotifications={unreadNotifications}
                    />
                  ) : null}
                  {tab === "pets" ? (
                    <PetsScreen
                      pets={pets}
                      loading={petsLoading}
                      onAddPet={() => setRegisteringPet(true)}
                      onOpenPet={(pet) => setOpenPet(pet)}
                    />
                  ) : null}
                  {tab === "adopt" ? (
                    <AdoptScreen
                      owner={profile}
                      pets={adoptablePets}
                      loading={adoptablesLoading}
                      loadError={adoptionsLoadError}
                      requests={adoptionRequests}
                      onRequest={submitOwnerAdoption}
                    />
                  ) : null}
                  {tab === "notifications" ? (
                    <NotificationsScreen
                      notifications={notifications}
                      onMarkRead={markNotificationRead}
                      onOpenPet={(petId) => {
                        const pet = pets.find((item) => item.id === petId);
                        if (!pet) {
                          toast.error(petsLoading ? "Pet records are still loading." : "This pet record is not available.");
                          return false;
                        }
                        setOpenPet(pet);
                        return true;
                      }}
                    />
                  ) : null}
                  {tab === "profile" ? (
                    <ProfileScreen
                      profile={profile}
                      petCount={pets.length}
                      adoptionCount={adoptionRequests.length}
                      requests={[
                        ...ownerRequests,
                        ...(Array.isArray(legacyRequests) ? legacyRequests : [])
                          .filter((request) => pets.some((pet) => pet.id === request?.petId))
                          .map((request) => ({ ...request, localOnly: true })),
                      ]}
                      requestsUnavailable={ownerRequestsUnavailable}
                      onPhotoUpdated={(avatarUrl) => setProfile((current) => ({ ...current, avatarUrl }))}
                      onSave={async (nextProfile) => {
                        const { data: userData, error: userError } = await supabase.auth.getUser();
                        if (userError || !userData.user) {
                          toast.error(userError?.message ?? "Your session expired. Sign in again.");
                          return false;
                        }
                        const { error } = await supabase.from("profiles").update({
                          full_name: nextProfile.fullName.trim(),
                          phone: nextProfile.phone.trim(),
                          address: nextProfile.address.trim(),
                          barangay: nextProfile.barangay.trim(),
                        }).eq("id", userData.user.id);
                        if (error) {
                          toast.error(error.message);
                          return false;
                        }
                        setProfile(nextProfile);
                        writeOwnerProfile(nextProfile);
                        return true;
                      }}
                    />
                  ) : null}
                </>
              )}
            </PullToRefresh>

            {showTabs ? (
              <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-card/95 px-2 pt-1.5 pb-[max(0.5rem,env(safe-area-inset-bottom))] backdrop-blur-xl sm:relative sm:inset-auto sm:z-auto sm:shrink-0">
                <div className="flex items-center justify-around gap-1">
                  {tabs.map((item) => {
                    const Icon = item.icon;
                    const active = tab === item.key;
                    return (
                      <button
                        key={item.key}
                        type="button"
                        onClick={() => selectTab(item.key)}
                        aria-current={active ? "page" : undefined}
                        className={cn(
                          "flex flex-1 flex-col items-center gap-1 rounded-xl py-1.5 transition-colors",
                          active ? "text-primary" : "text-muted-foreground hover:text-foreground",
                        )}
                      >
                        <span
                          className={cn(
                            "relative grid h-7 w-9 place-items-center rounded-lg transition-colors",
                            active ? "bg-primary-soft" : "bg-transparent",
                          )}
                        >
                          <Icon className="size-[18px]" strokeWidth={active ? 2.3 : 1.9} />
                          {item.key === "notifications" && unreadNotifications > 0 ? (
                            <span className="absolute -right-1 -top-1 grid min-h-3.5 min-w-3.5 place-items-center rounded-full bg-destructive px-1 text-[8px] font-bold leading-none text-destructive-foreground">
                              {unreadNotifications > 9 ? "9+" : unreadNotifications}
                            </span>
                          ) : null}
                        </span>
                        <span className="text-[9px] font-semibold tracking-wide">
                          {item.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </nav>
            ) : null}
          </div>
        </div>

        <p className="mt-3 hidden items-center justify-center gap-2 text-center text-[10.5px] text-muted-foreground sm:flex">
          <button
            type="button"
            onClick={() => navigate("/")}
            className="font-semibold text-primary hover:underline"
          >
            Staff dashboard
          </button>
        </p>
      </div>
    </div>
  );
};

export default OwnerApp;
