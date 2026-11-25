import { useEffect, useMemo, useState, type FormEvent } from "react";
import { FunctionsHttpError } from "@supabase/supabase-js";
import {
  MailPlus,
  RefreshCw,
  Search,
  ShieldCheck,
  UserCheck,
  UserPlus,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/veticare/app-shell";
import { PageHeader } from "@/components/admin/page-header";
import { MetricStrip } from "@/components/admin/metric-strip";
import { FilterSelect } from "@/components/admin/filter-select";
import { StatusPill } from "@/components/admin/status-pill";
import { Pagination } from "@/components/admin/pagination";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";

const PAGE_SIZE = 5;
type TeamRole = "Admin" | "Personnel" | "Owner";
type TeamStatus = "active" | "inactive" | "invited";
interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: TeamRole;
  status: TeamStatus;
  lastActive: string;
  joined: string;
  approvalStatus: "approved" | "pending" | "rejected";
}
const teamRoles: TeamRole[] = ["Admin", "Personnel", "Owner"];
const roleToDatabase: Record<TeamRole, "admin" | "personnel" | "owner"> = {
  Admin: "admin",
  Personnel: "personnel",
  Owner: "owner",
};
const dateLabel = (value: string | null | undefined) =>
  value ? new Date(value).toLocaleDateString() : "Never";

const roleTone: Record<TeamRole, string> = {
  Admin: "bg-primary-soft text-primary",
  Personnel: "bg-info/12 text-info",
  Owner: "bg-success/10 text-success",
};

const initials = (name: string) =>
  name
    .split(" ")
    .map((part) => part[0])
    .slice(0, 2)
    .join("");

const UsersRoles = () => {
  const [rows, setRows] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [query, setQuery] = useState("");
  const [role, setRole] = useState("all");
  const [status, setStatus] = useState("all");
  const [page, setPage] = useState(1);

  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteName, setInviteName] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<TeamRole>("Personnel");
  const [inviteError, setInviteError] = useState<string | null>(null);


  const loadUsers = async () => {
    setLoading(true);
    setLoadError(null);
    const { data, error } = await supabase.functions.invoke("admin-users", { body: { action: "list" } });
    if (error) {
      const message = error.message.includes("not found")
        ? "The admin-users backend is not deployed. Deploy the Edge Function and apply the user-management migration."
        : error.message;
      setLoadError(message);
      toast.error("Unable to load users", { description: message });
      setLoading(false);
      return;
    }
    if (data?.error) {
      setLoadError(String(data.error));
      toast.error("Unable to load users", { description: String(data.error) });
      setLoading(false);
      return;
    }
    const users = (data?.users ?? []) as Array<{
      id: string;
      email: string;
      full_name: string | null;
      role: "admin" | "personnel" | "owner";
      approval_status: "approved" | "pending" | "rejected";
      is_active: boolean;
      auth_created_at: string;
      last_sign_in_at: string | null;
      email_confirmed_at: string | null;
    }>;
    setRows(users.map((user) => ({
      id: user.id,
      name: user.full_name || user.email || "Unnamed user",
      email: user.email,
      role: user.role === "admin" ? "Admin" : user.role === "owner" ? "Owner" : "Personnel",
      status: !user.is_active ? "inactive" : !user.email_confirmed_at ? "invited" : "active",
      lastActive: dateLabel(user.last_sign_in_at),
      joined: dateLabel(user.auth_created_at),
      approvalStatus: user.approval_status,
    })));
    setLoading(false);
  };

  useEffect(() => {
    void loadUsers();
  }, []);

  const filtered = useMemo(() => {
    const search = query.trim().toLowerCase();
    return rows.filter((member) => {
      const matchesQuery =
        search.length === 0 ||
        `${member.name} ${member.email} ${member.role}`.toLowerCase().includes(search);
      const matchesRole = role === "all" || member.role === role;
      const matchesStatus = status === "all" || member.status === status;
      return matchesQuery && matchesRole && matchesStatus;
    });
  }, [rows, query, role, status]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount);
  const start = (safePage - 1) * PAGE_SIZE;
  const visible = filtered.slice(start, start + PAGE_SIZE);

  const refresh = () => {
    setQuery("");
    setRole("all");
    setStatus("all");
    setPage(1);
    void loadUsers();
  };

  const sendInvite = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (busy) return;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(inviteEmail.trim())) {
      setInviteError("Enter a valid staff email address.");
      return;
    }
    const normalizedEmail = inviteEmail.trim().toLowerCase();
    setBusy(true);
    const { data, error } = await supabase.functions.invoke("admin-users", {
      body: { action: "invite-via-gmail", email: normalizedEmail, fullName: inviteName.trim(), role: roleToDatabase[inviteRole] },
    });
    setBusy(false);
    if (error || data?.error) {
      const details = error instanceof FunctionsHttpError ? await error.context.json().catch(() => null) : null;
      setInviteError(typeof details?.error === "string" ? details.error : error?.message || String(data?.error));
      return;
    }
    setInviteError(null);
    setInviteOpen(false);
    toast.success("Invitation sent", { description: `${normalizedEmail} was invited as ${inviteRole}.` });
    setInviteEmail("");
    setInviteName("");
    setInviteRole("Personnel");
    await loadUsers();
  };

  const metrics = [
    {
      label: "Team members",
      value: rows.length,
      hint: "With dashboard access",
      icon: Users,
      tone: "primary" as const,
    },
    {
      label: "Active",
      value: rows.filter((member) => member.status === "active").length,
      hint: "Accounts enabled for access",
      icon: UserCheck,
      tone: "info" as const,
    },
    {
      label: "Admins",
      value: rows.filter((member) => member.role === "Admin").length,
      hint: "Full permissions",
      icon: ShieldCheck,
      tone: "warning" as const,
    },
    {
      label: "Pending invites",
      value: rows.filter((member) => member.status === "invited").length,
      hint: "Awaiting acceptance",
      icon: MailPlus,
      tone: "neutral" as const,
    },
  ];

  return (
    <AppShell>
      <PageHeader
        eyebrow="Administration"
        title="Users & Roles"
        description="Control who can access the Veticare console, what they can change and how each team member is verified."
        actions={
          <Button
            onClick={() => setInviteOpen(true)}
            className="h-9 rounded-xl px-3.5 text-[12px] font-bold shadow-glow"
          >
            <UserPlus className="size-4" />
            Invite member
          </Button>
        }
      />

      <MetricStrip metrics={metrics} />

      <section className="surface-card fade-up mt-4 overflow-hidden rounded-2xl border border-border bg-card sm:mt-5">
        <div className="flex flex-col gap-2.5 p-3.5 sm:p-4 lg:flex-row lg:flex-wrap lg:items-center">
          <div className="relative min-w-[240px] flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground/70" />
            <Input
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setPage(1);
              }}
              placeholder="Search name, email, or role…"
              aria-label="Search team members"
              className="h-9 rounded-xl border-border bg-background pl-9 text-[12px] focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:ring-offset-0"
            />
          </div>

          <div className="grid grid-cols-2 items-center gap-2 sm:flex sm:flex-wrap sm:gap-2.5">
            <FilterSelect
              label="Role"
              value={role}
              onChange={(value) => {
                setRole(value);
                setPage(1);
              }}
              options={[
                { value: "all", label: "All" },
                ...teamRoles.map((item) => ({ value: item, label: item })),
              ]}
            />
            <FilterSelect
              label="Status"
              value={status}
              onChange={(value) => {
                setStatus(value);
                setPage(1);
              }}
              options={[
                { value: "all", label: "All" },
                { value: "active", label: "Active" },
                { value: "inactive", label: "Inactive" },
                { value: "invited", label: "Invited" },
              ]}
            />
            <div className="col-span-2 flex items-center justify-end gap-1.5 sm:ml-auto">
              <Button
                variant="ghost"
                onClick={refresh}
                className="h-9 rounded-xl px-2.5 text-[11.5px] font-semibold text-muted-foreground hover:text-foreground"
              >
                <RefreshCw className="size-3.5" />
                Refresh
              </Button>
            </div>
          </div>
        </div>

        <div className="hidden border-y border-border bg-secondary/40 px-5 py-2 xl:grid xl:grid-cols-[minmax(0,1.5fr)_120px_92px_minmax(0,1fr)_96px] xl:gap-4">
          {["Team member", "Role", "Status", "Last active", "Joined"].map((label) => (
            <p
              key={label}
              className="text-[9px] font-bold uppercase tracking-[0.12em] text-muted-foreground"
            >
              {label}
            </p>
          ))}
        </div>

        {loading ? (
          <div className="px-5 py-14 text-center text-sm text-muted-foreground">Loading users...</div>
        ) : loadError ? (
          <div className="flex flex-col items-center gap-2 px-5 py-14 text-center">
            <p className="text-[13px] font-bold text-foreground">Unable to load accounts</p>
            <p className="max-w-[360px] text-[11.5px] text-muted-foreground">{loadError}</p>
            <Button variant="outline" size="sm" onClick={refresh} className="mt-1 h-8 rounded-lg text-[11px] font-semibold">
              Try again
            </Button>
          </div>
        ) : visible.length === 0 ? (
          <div className="flex flex-col items-center gap-2 px-5 py-14 text-center">
            <span className="grid size-11 place-items-center rounded-2xl bg-primary-soft text-primary">
              <Users className="size-5" />
            </span>
            <p className="text-[13px] font-bold text-foreground">No team members match</p>
            <p className="max-w-[260px] text-[11.5px] text-muted-foreground">
              Try another role or clear the filters to see the whole team.
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={refresh}
              className="mt-1 h-8 rounded-lg text-[11px] font-semibold"
            >
              Clear filters
            </Button>
          </div>
        ) : (
          <ul className="divide-y divide-border border-b border-border">
            {visible.map((member) => (
              <li
                key={member.id}
                className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-2.5 px-3.5 py-3.5 transition-colors hover:bg-secondary/30 sm:px-4 xl:grid-cols-[minmax(0,1.5fr)_120px_92px_minmax(0,1fr)_96px] xl:gap-4 xl:px-5"
              >
                <div className="order-1 flex min-w-0 items-center gap-2.5 xl:order-none">
                  <span className="grid size-9 shrink-0 place-items-center rounded-full bg-primary-soft text-[11px] font-bold text-primary">
                    {initials(member.name)}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-[12.5px] font-bold text-foreground">
                      {member.name}
                    </p>
                    <p className="truncate text-[10px] text-muted-foreground">{member.email}</p>
                    {member.role === "Owner" && member.approvalStatus !== "approved" ? (
                      <StatusPill status={member.approvalStatus} className="mt-1" />
                    ) : null}
                  </div>
                </div>

                <div className="order-3 col-span-2 xl:order-none xl:col-span-1">
                  <p className="text-[9px] font-bold uppercase tracking-[0.1em] text-muted-foreground xl:hidden">
                    Role
                  </p>
                  <span
                    className={cn(
                      "inline-block rounded-md px-1.5 py-1 text-[10px] font-bold",
                      roleTone[member.role],
                    )}
                  >
                    {member.role}
                  </span>
                </div>

                <div className="order-2 xl:order-none">
                  <StatusPill status={member.status} />
                </div>

                <div className="order-3 col-span-2 min-w-0 xl:order-none xl:col-span-1">
                  <p className="text-[9px] font-bold uppercase tracking-[0.1em] text-muted-foreground xl:hidden">
                    Last active
                  </p>
                  <p className="truncate text-[10.5px] text-foreground/85">{member.lastActive}</p>
                </div>

                <div className="order-3 xl:order-none">
                  <p className="text-[9px] font-bold uppercase tracking-[0.1em] text-muted-foreground xl:hidden">
                    Joined
                  </p>
                  <p className="text-[10.5px] text-foreground/85">{member.joined}</p>
                </div>

              </li>
            ))}
          </ul>
        )}

        <Pagination
          page={safePage}
          pageCount={pageCount}
          from={filtered.length === 0 ? 0 : start + 1}
          to={Math.min(start + PAGE_SIZE, filtered.length)}
          total={filtered.length}
          onPageChange={setPage}
        />
      </section>

      <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
        <DialogContent className="rounded-2xl border-border sm:max-w-[440px]">
          <DialogHeader>
            <DialogTitle className="text-[17px] font-extrabold tracking-[-0.02em]">
              Invite a team member
            </DialogTitle>
            <DialogDescription className="text-[11.5px]">
              Invite an account and assign its Veticare role.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={sendInvite} className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="invite-name" className="text-[10px] font-bold uppercase tracking-[0.1em] text-muted-foreground">
                Full name
              </Label>
              <Input
                id="invite-name"
                value={inviteName}
                onChange={(event) => setInviteName(event.target.value)}
                placeholder="Team member name"
                className="h-10 rounded-xl border-border text-[12.5px]"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="invite-email" className="text-[10px] font-bold uppercase tracking-[0.1em] text-muted-foreground">
                Work email
              </Label>
              <Input
                id="invite-email"
                type="email"
                value={inviteEmail}
                onChange={(event) => setInviteEmail(event.target.value)}
                placeholder="name@veticare.gov.ph"
                className="h-10 rounded-xl border-border text-[12.5px]"
              />
              {inviteError ? (
                <p className="text-[10.5px] font-medium text-destructive">{inviteError}</p>
              ) : null}
            </div>
            <div className="space-y-1.5">
              <Label className="text-[10px] font-bold uppercase tracking-[0.1em] text-muted-foreground">
                Role
              </Label>
              <Select value={inviteRole} onValueChange={(value) => setInviteRole(value as TeamRole)}>
                <SelectTrigger className="h-10 rounded-xl border-border text-[12px] font-semibold">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-xl border-border">
                  {teamRoles.map((item) => (
                    <SelectItem key={item} value={item} className="text-[12px]">
                      {item}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="rounded-xl border border-info/20 bg-info/5 p-2.5">
              <p className="text-[10px] leading-relaxed text-muted-foreground">
                The invitee will receive a Gmail invitation with a link to set their password.
              </p>
            </div>
            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                type="button"
                variant="outline"
                onClick={() => setInviteOpen(false)}
                className="h-9 rounded-xl text-[12px] font-semibold"
              >
                Cancel
              </Button>
              <Button type="submit" disabled={busy} className="h-9 rounded-xl text-[12px] font-bold shadow-glow">
                <UserPlus className="size-4" />
                {busy ? "Sending..." : "Send invite"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

    </AppShell>
  );
};

export default UsersRoles;
