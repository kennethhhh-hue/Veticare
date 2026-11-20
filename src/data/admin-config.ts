export type TeamRole = "Admin" | "Veterinarian" | "Field Officer" | "Encoder" | "Viewer";
export type TeamStatus = "active" | "inactive" | "invited";

export interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: TeamRole;
  status: TeamStatus;
  lastActive: string;
  joined: string;
}

export const teamMembers: TeamMember[] = [
  {
    id: "USR-01",
    name: "Mara Villanueva",
    email: "admin@veticare.gov.ph",
    role: "Admin",
    status: "active",
    lastActive: "Today, 7:42 AM",
    joined: "Jan 04, 2026",
  },
  {
    id: "USR-02",
    name: "Jose Dela Cruz",
    email: "jose.delacruz@veticare.gov.ph",
    role: "Veterinarian",
    status: "active",
    lastActive: "Today, 6:15 AM",
    joined: "Feb 11, 2026",
  },
  {
    id: "USR-03",
    name: "Ana Reyes",
    email: "ana.reyes@veticare.gov.ph",
    role: "Field Officer",
    status: "active",
    lastActive: "Yesterday",
    joined: "Mar 02, 2026",
  },
  {
    id: "USR-04",
    name: "Kevin Uy",
    email: "kevin.uy@veticare.gov.ph",
    role: "Encoder",
    status: "active",
    lastActive: "Yesterday",
    joined: "Mar 18, 2026",
  },
  {
    id: "USR-05",
    name: "Grace Tan",
    email: "grace.tan@veticare.gov.ph",
    role: "Veterinarian",
    status: "inactive",
    lastActive: "Apr 28, 2026",
    joined: "Feb 20, 2026",
  },
  {
    id: "USR-06",
    name: "Rico Santos",
    email: "rico.santos@veticare.gov.ph",
    role: "Field Officer",
    status: "invited",
    lastActive: "Invite sent May 12",
    joined: "—",
  },
  {
    id: "USR-07",
    name: "Dana Flores",
    email: "dana.flores@veticare.gov.ph",
    role: "Viewer",
    status: "invited",
    lastActive: "Invite sent May 10",
    joined: "—",
  },
];

export const teamRoles: TeamRole[] = [
  "Admin",
  "Veterinarian",
  "Field Officer",
  "Encoder",
  "Viewer",
];

export type ReportStatus = "ready" | "scheduled" | "failed";
export type ReportFormat = "PDF" | "CSV" | "XLSX";

export interface ReportRecord {
  id: string;
  name: string;
  category: string;
  period: string;
  format: ReportFormat;
  generated: string;
  size: string;
  records: number;
  status: ReportStatus;
  author: string;
}

export const reportCategories = [
  "Pet Registrations",
  "Owners",
  "Impounded Dogs",
  "Adoptions",
  "Pet ID",
  "Audit Logs",
] as const;

export const reportPeriods = [
  "Last 7 days",
  "Last 30 days",
  "This quarter",
  "This year",
] as const;

export const reportFormats: ReportFormat[] = ["CSV"];

export const reportRecords: ReportRecord[] = [
  {
    id: "RP-1042",
    name: "Monthly registration summary",
    category: "Pet Registrations",
    period: "May 2026",
    format: "PDF",
    generated: "May 14, 2026",
    size: "1.8 MB",
    records: 248,
    status: "ready",
    author: "Mara Villanueva",
  },
  {
    id: "RP-1041",
    name: "Owner directory export",
    category: "Owners",
    period: "May 2026",
    format: "XLSX",
    generated: "May 13, 2026",
    size: "640 KB",
    records: 186,
    status: "ready",
    author: "Ana Reyes",
  },
  {
    id: "RP-1040",
    name: "Shelter occupancy snapshot",
    category: "Impounded Dogs",
    period: "Week 20",
    format: "PDF",
    generated: "May 12, 2026",
    size: "920 KB",
    records: 18,
    status: "ready",
    author: "Jose Dela Cruz",
  },
  {
    id: "RP-1039",
    name: "Adoption conversion report",
    category: "Adoptions",
    period: "Last 30 days",
    format: "PDF",
    generated: "May 10, 2026",
    size: "1.1 MB",
    records: 34,
    status: "ready",
    author: "Mara Villanueva",
  },
  {
    id: "RP-1038",
    name: "Issued pet ID register",
    category: "Pet ID",
    period: "May 2026",
    format: "CSV",
    generated: "May 09, 2026",
    size: "310 KB",
    records: 12,
    status: "ready",
    author: "Kevin Uy",
  },
  {
    id: "RP-1037",
    name: "Q2 audit trail",
    category: "Audit Logs",
    period: "This quarter",
    format: "CSV",
    generated: "May 01, 2026",
    size: "2.4 MB",
    records: 1284,
    status: "ready",
    author: "Mara Villanueva",
  },
  {
    id: "RP-1036",
    name: "Weekly registration digest",
    category: "Pet Registrations",
    period: "Weekly",
    format: "PDF",
    generated: "May 18, 2026",
    size: "—",
    records: 0,
    status: "scheduled",
    author: "Automation",
  },
  {
    id: "RP-1035",
    name: "Barangay outreach summary",
    category: "Owners",
    period: "Apr 2026",
    format: "PDF",
    generated: "Apr 30, 2026",
    size: "—",
    records: 0,
    status: "failed",
    author: "Ana Reyes",
  },
];

export type LogModule =
  | "Authentication"
  | "Pet Registrations"
  | "Owners"
  | "Impounded Dogs"
  | "Adoptions"
  | "Pet ID"
  | "Reports"
  | "Settings"
  | "Notifications";

export type LogStatus = "success" | "warning" | "failed";

export interface ActivityLogEntry {
  id: string;
  timestamp: string;
  actor: string;
  event: string;
  module: LogModule;
  target: string;
  ip: string;
  status: LogStatus;
}

export const logModules: LogModule[] = [
  "Authentication",
  "Pet Registrations",
  "Owners",
  "Impounded Dogs",
  "Adoptions",
  "Pet ID",
  "Reports",
  "Settings",
  "Notifications",
];

export const activityLogs: ActivityLogEntry[] = [
  {
    id: "LOG-9042",
    timestamp: "May 14, 2026 • 7:42 AM",
    actor: "Mara Villanueva",
    event: "Signed in to the admin dashboard",
    module: "Authentication",
    target: "Chrome on macOS",
    ip: "112.198.14.22",
    status: "success",
  },
  {
    id: "LOG-9041",
    timestamp: "May 14, 2026 • 7:38 AM",
    actor: "unknown@veticare.gov.ph",
    event: "Failed sign-in attempt (3rd try)",
    module: "Authentication",
    target: "Chrome on Windows",
    ip: "112.198.14.109",
    status: "failed",
  },
  {
    id: "LOG-9040",
    timestamp: "May 14, 2026 • 7:12 AM",
    actor: "Jose Dela Cruz",
    event: "Approved pet registration",
    module: "Pet Registrations",
    target: "PR-1036 · Pepper",
    ip: "112.198.14.31",
    status: "success",
  },
  {
    id: "LOG-9039",
    timestamp: "May 14, 2026 • 6:55 AM",
    actor: "Automation",
    event: "Sent vaccination reminders",
    module: "Notifications",
    target: "3 owners in Poblacion",
    ip: "system",
    status: "success",
  },
  {
    id: "LOG-9038",
    timestamp: "May 13, 2026 • 5:20 PM",
    actor: "Ana Reyes",
    event: "Exported owner directory",
    module: "Reports",
    target: "RP-1041 · XLSX",
    ip: "112.198.14.48",
    status: "success",
  },
  {
    id: "LOG-9037",
    timestamp: "May 13, 2026 • 4:04 PM",
    actor: "Mara Villanueva",
    event: "Updated data retention policy",
    module: "Settings",
    target: "Retention: 5 years",
    ip: "112.198.14.22",
    status: "warning",
  },
  {
    id: "LOG-9036",
    timestamp: "May 13, 2026 • 2:47 PM",
    actor: "Kevin Uy",
    event: "Issued digital pet ID",
    module: "Pet ID",
    target: "VC-2026-0141",
    ip: "112.198.14.77",
    status: "success",
  },
  {
    id: "LOG-9035",
    timestamp: "May 13, 2026 • 1:22 PM",
    actor: "Ana Reyes",
    event: "Logged an impound",
    module: "Impounded Dogs",
    target: "IMP-310 · San Roque",
    ip: "112.198.14.48",
    status: "success",
  },
  {
    id: "LOG-9034",
    timestamp: "May 13, 2026 • 11:08 AM",
    actor: "Mara Villanueva",
    event: "Approved adoption application",
    module: "Adoptions",
    target: "AD-506 · Max",
    ip: "112.198.14.22",
    status: "success",
  },
  {
    id: "LOG-9033",
    timestamp: "May 13, 2026 • 9:31 AM",
    actor: "Grace Tan",
    event: "Updated owner contact details",
    module: "Owners",
    target: "OW-206 · Ana Reyes",
    ip: "112.198.14.90",
    status: "success",
  },
  {
    id: "LOG-9032",
    timestamp: "May 12, 2026 • 6:50 PM",
    actor: "Ana Reyes",
    event: "Scheduled report generation failed",
    module: "Reports",
    target: "RP-1035 · PDF",
    ip: "112.198.14.48",
    status: "failed",
  },
  {
    id: "LOG-9031",
    timestamp: "May 12, 2026 • 3:12 PM",
    actor: "Mara Villanueva",
    event: "Invited a new team member",
    module: "Settings",
    target: "rico.santos@veticare.gov.ph",
    ip: "112.198.14.22",
    status: "success",
  },
];
