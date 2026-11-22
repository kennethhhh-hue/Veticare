import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { BarChart3, Bell, CalendarDays, CheckCheck, ChevronDown, Dog, FileText, Heart, IdCard, LayoutDashboard, ListChecks, LogOut, Menu, PawPrint, Settings, ShieldCheck, UserCog, Users, Settings2 } from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Brand } from "@/components/veticare/brand";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BarangaySelect } from "@/components/owner-app/barangay-select";
import { navSections } from "@/data/veticare";
import { signOut, useAuth } from "@/integrations/supabase/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { PHILIPPINE_TIME_ZONE } from "@/lib/philippine-date";
const icons = {
  home: LayoutDashboard,
  file: FileText,
  users: Users,
  dog: Dog,
  heart: Heart,
  id: IdCard,
  chart: BarChart3,
  list: ListChecks,
  "shield-user": UserCog,
  settings: Settings
} as const;
type HeaderNotification = {
  id: string;
  title: string;
  message: string;
  notification_type: string;
  created_at: string;
  read_at: string | null;
};
function NavList({
  onNavigate
}: {
  onNavigate?: () => void;
}) {
  const {
    pathname
  } = useLocation();
  return <nav className="flex flex-col gap-5 px-3">
      {navSections.map(section => <div key={section.label}>
          <p className="px-3 pb-2 text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground/80">
            {section.label}
          </p>
          <ul className="space-y-1">
            {section.items.map(item => {
          const Icon = icons[item.icon as keyof typeof icons];
          const isActive = "to" in item && item.to === pathname;
          const badge = "badge" in item ? item.badge : undefined;
          if (!("to" in item) || !item.to) {
            return <li key={item.id}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button type="button" aria-disabled="true" className="group flex w-full cursor-not-allowed items-center gap-3 rounded-xl px-3 py-2 text-left text-[13.5px] font-medium text-muted-foreground/75 transition-colors hover:bg-secondary/60">
                          <Icon className="size-[18px] shrink-0" strokeWidth={1.9} />
                          <span className="flex-1 truncate">{item.label}</span>
                          {badge ? <span className="num rounded-md bg-secondary px-1.5 py-0.5 text-[10.5px] font-bold text-muted-foreground">
                              {badge}
                            </span> : null}
                        </button>
                      </TooltipTrigger>
                      <TooltipContent side="right">
                        {item.label} module is coming next
                      </TooltipContent>
                    </Tooltip>
                  </li>;
          }
          return <li key={item.id}>
                  <Link to={item.to} onClick={onNavigate} aria-current={isActive ? "page" : undefined} className={cn("group flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-[13.5px] font-semibold transition-all", isActive ? "bg-primary text-primary-foreground shadow-glow" : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground")}>
                    <Icon className={cn("size-[18px] shrink-0", isActive && "text-primary-foreground")} strokeWidth={isActive ? 2.2 : 1.9} />
                    <span className="flex-1 truncate">{item.label}</span>
                    {badge ? <span className={cn("num rounded-md px-1.5 py-0.5 text-[10px] font-bold", isActive ? "bg-primary-foreground/15 text-primary-foreground" : "bg-secondary text-muted-foreground")}>
                        {badge}
                      </span> : null}
                  </Link>
                </li>;
        })}
          </ul>
        </div>)}
    </nav>;
}
function SidebarFooter({ name, role }: { name: string; role: string }) {
  const initials = name.split(/\s+/).map((part) => part[0]).slice(0, 2).join("").toUpperCase() || "VC";
  return <div className="mt-auto px-3 pb-4">
      <div className="flex items-center gap-2.5 border-t border-sidebar-border px-2 pb-1 pt-4">
        <div className="grid size-8 place-items-center rounded-lg bg-secondary text-[11px] font-bold text-secondary-foreground">
          {initials}
        </div>
        <div className="min-w-0 flex-1 leading-tight">
          <p className="truncate text-[12.5px] font-semibold text-foreground">{name}</p>
          <p className="truncate text-[10.5px] text-muted-foreground">{role}</p>
        </div>
        <span className="size-2 rounded-full bg-success animate-pulse-ring" />
      </div>
    </div>;
}
function SidebarBody({
  onNavigate,
  name,
  role,
}: {
  onNavigate?: () => void;
  name: string;
  role: string;
}) {
  return <div className="flex h-full flex-col bg-sidebar">
      <div className="px-5 pb-5 pt-6">
        <Brand compact />
        
      </div>
      <div className="scroll-slim min-h-0 flex-1 overflow-y-auto pb-4">
        <NavList onNavigate={onNavigate} />
      </div>
      <SidebarFooter name={name} role={role} />
    </div>;
}
const pageCrumbs: Record<string, {
  section: string;
  title: string;
}> = {
  "/": {
    section: "Overview",
    title: "Dashboard"
  },
  "/registrations": {
    section: "Operations",
    title: "Pet Registrations"
  },
  "/owners": {
    section: "Operations",
    title: "Owners"
  },
  "/impounded-dogs": {
    section: "Shelter",
    title: "Impounded Animals"
  },
  "/adoptions": {
    section: "Shelter",
    title: "Adoptions"
  },
  "/pet-id": {
    section: "Registry",
    title: "Pet ID"
  },
  "/reports": {
    section: "Insights",
    title: "Reports"
  },
  "/users": {
    section: "Administration",
    title: "Users & Roles"
  },
  "/activity-logs": {
    section: "Administration",
    title: "Activity Logs"
  },
  "/settings": {
    section: "Administration",
    title: "System Settings"
  }
};
export function AppShell({
  children
}: {
  children: ReactNode;
}) {
  const navigate = useNavigate();
  const { session, role } = useAuth();
  const {
    pathname
  } = useLocation();
  const crumb = pageCrumbs[pathname] ?? {
    section: "Veticare",
    title: "Dashboard"
  };
  const [profile, setProfile] = useState({ name: "", email: "", phone: "", address: "", barangay: "" });
  const [accountDraft, setAccountDraft] = useState({ name: "", phone: "", address: "", barangay: "" });
  const [accountSettingsOpen, setAccountSettingsOpen] = useState(false);
  const [savingAccount, setSavingAccount] = useState(false);
  const [notifications, setNotifications] = useState<HeaderNotification[]>([]);
  const [notificationError, setNotificationError] = useState<string | null>(null);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [now, setNow] = useState(() => new Date());
  const unreadCount = notifications.filter((notification) => !notification.read_at).length;
  const displayName = profile.name || String(session?.user.user_metadata.full_name ?? session?.user.email ?? "Veticare user");
  const displayEmail = profile.email || session?.user.email || "";
  const roleLabel = role === "admin" ? "Administrator" : role === "personnel" ? "City Pound Personnel" : "Pet Owner";
  const initials = displayName.split(/\s+/).map((part) => part[0]).slice(0, 2).join("").toUpperCase() || "VC";
  const currentDate = now.toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric", timeZone: PHILIPPINE_TIME_ZONE });

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 60_000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!session?.user.id) {
      setProfile({ name: "", email: "", phone: "", address: "", barangay: "" });
      setNotifications([]);
      return;
    }
    let active = true;
    let channel: ReturnType<typeof supabase.channel> | undefined;
    const loadHeaderData = async () => {
      const [{ data: profileRow, error: profileError }, { data: notificationRows, error: notificationsQueryError }] = await Promise.all([
        supabase.from("profiles").select("full_name, email, phone, address, barangay").eq("id", session.user.id).maybeSingle(),
        supabase.from("notifications").select("id, title, message, notification_type, created_at, read_at").eq("recipient_id", session.user.id).order("created_at", { ascending: false }).limit(10),
      ]);
      if (!active) return;
      if (profileError) console.error("Unable to load current account name:", profileError.message);
      setProfile({
        name: profileRow?.full_name || String(session.user.user_metadata.full_name ?? session.user.email ?? "Veticare user"),
        email: profileRow?.email || session.user.email || "",
        phone: profileRow?.phone || String(session.user.user_metadata.phone ?? ""),
        address: profileRow?.address || String(session.user.user_metadata.address ?? ""),
        barangay: profileRow?.barangay || String(session.user.user_metadata.barangay ?? ""),
      });
      if (notificationsQueryError) setNotificationError(notificationsQueryError.message);
      else {
        setNotificationError(null);
        setNotifications(notificationRows ?? []);
      }
    };
    void loadHeaderData();
    channel = supabase.channel(`header-notifications-${session.user.id}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "notifications", filter: `recipient_id=eq.${session.user.id}` }, (payload) => {
        const row = payload.new as HeaderNotification;
        setNotifications((current) => current.some((item) => item.id === row.id) ? current : [row, ...current].slice(0, 10));
      })
      .subscribe();
    return () => {
      active = false;
      if (channel) void supabase.removeChannel(channel);
    };
  }, [session?.user.id]);

  const markNotificationRead = async (notification: HeaderNotification) => {
    const readAt = new Date().toISOString();
    const { error } = await supabase.from("notifications").update({ read_at: readAt }).eq("id", notification.id);
    if (error) {
      toast.error(error.message);
      return;
    }
    setNotifications((current) => current.map((item) => item.id === notification.id ? { ...item, read_at: readAt } : item));
  };

  const markAllRead = async () => {
    if (!session?.user.id || !unreadCount) return;
    const readAt = new Date().toISOString();
    const { error } = await supabase.from("notifications").update({ read_at: readAt }).eq("recipient_id", session.user.id).is("read_at", null);
    if (error) {
      toast.error(error.message);
      return;
    }
    setNotifications((current) => current.map((item) => ({ ...item, read_at: item.read_at ?? readAt })));
  };

  const saveAccountSettings = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!session?.user.id) return;
    const name = accountDraft.name.trim();
    if (!name) {
      toast.error("Enter your name.");
      return;
    }
    if (!accountDraft.barangay.trim()) {
      toast.error("Select your barangay in Batangas City.");
      return;
    }
    setSavingAccount(true);
    const { error } = await supabase.from("profiles").update({
      full_name: name,
      phone: accountDraft.phone.trim(),
      address: accountDraft.address.trim(),
      barangay: accountDraft.barangay.trim(),
    }).eq("id", session.user.id);
    setSavingAccount(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    setProfile((current) => ({
      ...current,
      name,
      phone: accountDraft.phone.trim(),
      address: accountDraft.address.trim(),
      barangay: accountDraft.barangay.trim(),
    }));
    setAccountSettingsOpen(false);
    toast.success("Account settings saved.");
  };

  const handleSignOut = async () => {
    const { error } = await signOut();
    if (error) {
      toast.error(error.message);
      return;
    }
    navigate("/login", { replace: true });
  };
  return <div className="min-h-screen bg-background">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-[296px] border-r border-sidebar-border bg-sidebar lg:block">
        <SidebarBody name={displayName} role={roleLabel} />
      </aside>

      <div className="lg:pl-[296px]">
        <header className="sticky top-0 z-30 border-b border-border/70 bg-background/80 backdrop-blur-xl">
          <div className="flex h-[72px] items-center gap-3 px-4 sm:px-6 lg:px-8">
            <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="rounded-xl text-foreground lg:hidden" aria-label="Open navigation">
                  <Menu className="size-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-[286px] border-sidebar-border p-0">
                <SheetHeader className="sr-only">
                  <SheetTitle>Veticare navigation</SheetTitle>
                  <SheetDescription>Admin dashboard sections</SheetDescription>
                </SheetHeader>
                <SidebarBody onNavigate={() => setMobileOpen(false)} name={displayName} role={roleLabel} />
              </SheetContent>
            </Sheet>

            <div className="min-w-0">
              <div className="flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground">
                <span>Veticare</span>
                <span className="text-muted-foreground/50">/</span>
                <span className="text-foreground/80">{crumb.section}</span>
              </div>
              <p className="truncate text-[14px] font-bold tracking-[-0.01em] text-foreground">
                {crumb.title}
              </p>
            </div>

            <div className="ml-auto flex items-center gap-2 sm:gap-3">
              <div className="hidden items-center gap-2 rounded-xl border border-border bg-card px-3 py-2 text-[12px] font-semibold text-foreground sm:flex">
                <CalendarDays className="size-4 text-primary" />
                {currentDate}
              </div>

              <Popover open={notificationsOpen} onOpenChange={setNotificationsOpen}>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="icon" className="relative rounded-xl border-border bg-card text-foreground hover:bg-secondary" aria-label="Notifications">
                    <Bell className="size-[18px]" />
                    {unreadCount ? <span className="absolute -right-1 -top-1 grid min-h-4 min-w-4 place-items-center rounded-full bg-destructive px-1 text-[8px] font-bold text-destructive-foreground ring-2 ring-card">{unreadCount > 9 ? "9+" : unreadCount}</span> : null}
                  </Button>
                </PopoverTrigger>
                <PopoverContent align="end" className="w-[340px] rounded-2xl border-border p-0 shadow-raised">
                  <div className="flex items-center justify-between border-b border-border px-4 py-3">
                    <p className="text-[13px] font-bold text-foreground">Notifications</p>
                    <button type="button" onClick={() => void markAllRead()} disabled={!unreadCount} className="flex items-center gap-1.5 text-[11px] font-semibold text-primary hover:underline disabled:opacity-50">
                      <CheckCheck className="size-3.5" />
                      Mark all read
                    </button>
                  </div>
                  <ul className="divide-y divide-border">
                    {notifications.map(item => {
                    const Icon = item.notification_type.startsWith("adoption_") ? Heart : item.notification_type === "impound_logged" ? PawPrint : ShieldCheck;
                    return <li key={item.id}>
                          <button type="button" onClick={() => void markNotificationRead(item)} className="flex w-full gap-3 px-4 py-3 text-left hover:bg-secondary/40">
                            <span className="relative mt-0.5 grid size-8 shrink-0 place-items-center rounded-lg bg-secondary">
                              <Icon className="size-4 text-foreground/70" />
                              {!item.read_at ? <span className="absolute -right-0.5 -top-0.5 size-2 rounded-full bg-primary ring-2 ring-card" /> : null}
                            </span>
                            <span className="min-w-0 flex-1">
                              <span className="block text-[12.5px] font-semibold leading-snug text-foreground">{item.title}</span>
                              <span className="mt-0.5 block text-[11px] text-muted-foreground">{item.message}</span>
                              <time dateTime={item.created_at} className="mt-1 block text-[10.5px] text-muted-foreground/80">
                                {new Date(item.created_at).toLocaleString("en-PH", { dateStyle: "medium", timeStyle: "short", timeZone: PHILIPPINE_TIME_ZONE })}
                              </time>
                            </span>
                          </button>
                        </li>;
                  })}
                    {!notifications.length ? <li className="px-4 py-6 text-center text-[11px] text-muted-foreground">{notificationError ? `Notifications unavailable: ${notificationError}` : "No notifications yet."}</li> : null}
                  </ul>
                  <div className="border-t border-border px-4 py-2.5">
                    <p className="text-[10.5px] text-muted-foreground">
                      Showing the latest {notifications.length} notifications for this account.
                    </p>
                  </div>
                </PopoverContent>
              </Popover>

              <div className="hidden h-8 w-px bg-border sm:block" />

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button type="button" className="flex items-center gap-2.5 rounded-xl px-1.5 py-1.5 text-left transition-colors hover:bg-secondary sm:px-2">
                    <span className="relative grid size-9 place-items-center rounded-full bg-primary-soft text-[12px] font-bold text-primary">
                      {initials}
                      <span className="absolute -bottom-0.5 -right-0.5 size-2.5 rounded-full border-2 border-card bg-success" />
                    </span>
                    <span className="hidden leading-tight sm:block">
                      <span className="block max-w-[130px] truncate text-[12.5px] font-bold text-foreground">{displayName}</span>
                      <span className="block text-[10.5px] text-muted-foreground">{roleLabel}</span>
                    </span>
                    <ChevronDown className="hidden size-4 text-muted-foreground sm:block" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-[248px] rounded-2xl border-border p-1.5 shadow-raised">
                  <DropdownMenuLabel className="px-2 py-2">
                    <span className="block text-[12.5px] font-bold text-foreground">{displayName}</span>
                    <span className="block text-[10.5px] font-normal text-muted-foreground">{displayEmail}</span>
                    <span className="block text-[10px] font-medium text-muted-foreground">{roleLabel}</span>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator className="my-1" />
                  <DropdownMenuItem onSelect={() => { setAccountDraft({ name: profile.name || displayName, phone: profile.phone, address: profile.address, barangay: profile.barangay }); setAccountSettingsOpen(true); }} className="gap-2 rounded-lg text-[12px] font-medium">
                    <Settings2 className="size-3.5 text-muted-foreground" />
                    Account settings
                  </DropdownMenuItem>
                  <DropdownMenuItem onSelect={handleSignOut} className="gap-2 rounded-lg text-[12px] font-medium text-destructive focus:bg-destructive/10 focus:text-destructive">
                    <LogOut className="size-3.5" />
                    Sign out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </header>

        <main className="page-backdrop min-h-[calc(100vh-72px)] px-4 pb-12 pt-6 sm:px-6 lg:px-8">
          <div className="mx-auto w-full max-w-[1360px]">{children}</div>
        </main>
      </div>

      <Dialog open={accountSettingsOpen} onOpenChange={setAccountSettingsOpen}>
        <DialogContent className="rounded-xl border-border bg-card sm:max-w-[460px]">
          <DialogHeader>
            <DialogTitle>Account settings</DialogTitle>
            <DialogDescription>Update the profile details shown for your signed-in account.</DialogDescription>
          </DialogHeader>
          <form onSubmit={saveAccountSettings} className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="account-name">Full name</Label>
              <Input id="account-name" required maxLength={120} value={accountDraft.name} onChange={(event) => setAccountDraft((current) => ({ ...current, name: event.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="account-email">Email</Label>
              <Input id="account-email" type="email" value={displayEmail} readOnly aria-readonly="true" />
              <p className="text-[9.5px] text-muted-foreground">Email changes require a separate Supabase verification flow.</p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="account-phone">Phone</Label>
              <Input id="account-phone" type="tel" maxLength={40} value={accountDraft.phone} onChange={(event) => setAccountDraft((current) => ({ ...current, phone: event.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="account-address">Address</Label>
              <Input id="account-address" maxLength={180} value={accountDraft.address} onChange={(event) => setAccountDraft((current) => ({ ...current, address: event.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="account-barangay">Barangay</Label>
              <BarangaySelect
                id="account-barangay"
                value={accountDraft.barangay}
                onValueChange={(barangay) => setAccountDraft((current) => ({ ...current, barangay }))}
                required
              />
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <Button type="button" variant="outline" onClick={() => setAccountSettingsOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={savingAccount}>{savingAccount ? "Saving…" : "Save changes"}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>;
}
export function AvailabilityBadge() {
  return <Badge variant="outline" className="gap-1.5 rounded-full border-primary/20 bg-primary-soft px-2.5 py-1 text-[10.5px] font-bold text-primary">
      <span className="size-1.5 rounded-full bg-primary" />
      Live
    </Badge>;
}