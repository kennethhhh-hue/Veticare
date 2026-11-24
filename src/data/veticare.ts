export type RangeKey = "7d" | "30d" | "90d";

export type StatusKey = "pending" | "approved" | "rejected";

export type Tone = "primary" | "warning" | "info" | "danger" | "neutral";

export interface Kpi {
  id: string;
  label: string;
  value: number;
  caption: string;
  delta: number;
  series: number[];
  tone: Tone;
  icon: "paw" | "shield" | "users" | "heart";
}

export interface ActivityPoint {
  label: string;
  registrations: number;
  adoptions: number;
}

export interface VerificationItem {
  id: string;
  pet: string;
  species: string;
  breed: string;
  owner: string;
  location: string;
  submitted: string;
  createdAt?: string;
  status: StatusKey;
  missing: string[];
}

export interface FeedItem {
  id: string;
  actor: string;
  action: string;
  target: string;
  time: string;
  type: "approve" | "reject" | "register" | "adopt" | "impound";
  destination?: string;
}

export const admin = {
  name: "Admin",
  fullName: "Dr. Mara Villanueva",
  role: "System Administrator",
  initials: "MV",
  email: "admin@veticare.gov.ph",
};

export const today = {
  long: "Tuesday, May 14, 2026",
  short: "May 14, 2026",
  greeting: "Good morning",
};

export const kpis: Kpi[] = [
  {
    id: "pets",
    label: "Registered Pets",
    value: 248,
    caption: "+27 added this month",
    delta: 12.4,
    tone: "primary",
    icon: "paw",
    series: [18, 22, 20, 26, 24, 31, 29, 35, 33, 40, 38, 45],
  },
  {
    id: "pending",
    label: "Pending Verification",
    value: 12,
    caption: "4 waiting over 48 hours",
    delta: -8.3,
    tone: "warning",
    icon: "shield",
    series: [22, 19, 21, 17, 18, 15, 16, 14, 15, 13, 14, 12],
  },
  {
    id: "owners",
    label: "Pet Owners",
    value: 186,
    caption: "94% with complete records",
    delta: 6.1,
    tone: "info",
    icon: "users",
    series: [120, 128, 134, 131, 142, 148, 152, 158, 163, 169, 178, 186],
  },
  {
    id: "adoptions",
    label: "Adoptions",
    value: 34,
    caption: "6 applications in review",
    delta: 18.9,
    tone: "primary",
    icon: "heart",
    series: [8, 11, 9, 13, 12, 15, 14, 18, 17, 22, 26, 34],
  },
];

export const activityByRange: Record<RangeKey, ActivityPoint[]> = {
  "7d": [
    { label: "Wed", registrations: 9, adoptions: 2 },
    { label: "Thu", registrations: 12, adoptions: 3 },
    { label: "Fri", registrations: 15, adoptions: 4 },
    { label: "Sat", registrations: 22, adoptions: 6 },
    { label: "Sun", registrations: 18, adoptions: 5 },
    { label: "Mon", registrations: 26, adoptions: 7 },
    { label: "Tue", registrations: 31, adoptions: 9 },
  ],
  "30d": [
    { label: "Apr 15", registrations: 14, adoptions: 3 },
    { label: "Apr 18", registrations: 19, adoptions: 5 },
    { label: "Apr 21", registrations: 16, adoptions: 4 },
    { label: "Apr 24", registrations: 24, adoptions: 6 },
    { label: "Apr 27", registrations: 21, adoptions: 5 },
    { label: "Apr 30", registrations: 28, adoptions: 8 },
    { label: "May 03", registrations: 26, adoptions: 6 },
    { label: "May 06", registrations: 33, adoptions: 11 },
    { label: "May 09", registrations: 29, adoptions: 9 },
    { label: "May 11", registrations: 36, adoptions: 12 },
    { label: "May 13", registrations: 34, adoptions: 10 },
    { label: "May 14", registrations: 41, adoptions: 14 },
  ],
  "90d": [
    { label: "Feb", registrations: 62, adoptions: 14 },
    { label: "Mar", registrations: 108, adoptions: 26 },
    { label: "Apr", registrations: 148, adoptions: 39 },
    { label: "May", registrations: 96, adoptions: 31 },
  ],
};

export const rangeMeta: Record<RangeKey, { label: string; deltas: string }> = {
  "7d": { label: "Last 7 days", deltas: "+18% vs previous week" },
  "30d": { label: "Last 30 days", deltas: "+24% vs previous month" },
  "90d": { label: "Last 90 days", deltas: "+31% vs previous quarter" },
};

export const verifications: VerificationItem[] = [
  {
    id: "VR-2481",
    pet: "Bantay",
    species: "Dog",
    breed: "Aspin • 2 yrs",
    owner: "Jose Dela Cruz",
    location: "Barangay San Roque",
    submitted: "12 min ago",
    status: "pending",
    missing: ["Vaccination card"],
  },
  {
    id: "VR-2480",
    pet: "Mochi",
    species: "Cat",
    breed: "Persian • 1 yr",
    owner: "Ana Reyes",
    location: "Barangay Poblacion",
    submitted: "1 hr ago",
    status: "pending",
    missing: [],
  },
  {
    id: "VR-2479",
    pet: "Choco",
    species: "Dog",
    breed: "Shih Tzu • 3 yrs",
    owner: "Marvin Lim",
    location: "Barangay Sta. Cruz",
    submitted: "3 hrs ago",
    status: "pending",
    missing: ["Owner ID"],
  },
  {
    id: "VR-2478",
    pet: "Luna",
    species: "Dog",
    breed: "Aspin • 4 yrs",
    owner: "Grace Tan",
    location: "Barangay Bagong Silang",
    submitted: "Yesterday",
    status: "pending",
    missing: ["Barangay clearance"],
  },
  {
    id: "VR-2477",
    pet: "Tofu",
    species: "Cat",
    breed: "Domestic short hair • 8 mo",
    owner: "Rico Santos",
    location: "Barangay Malinis",
    submitted: "2 days ago",
    status: "pending",
    missing: [],
  },
  {
    id: "VR-2476",
    pet: "Pepper",
    species: "Dog",
    breed: "Beagle • 2 yrs",
    owner: "Ella Mendoza",
    location: "Barangay San Isidro",
    submitted: "May 13",
    status: "approved",
    missing: [],
  },
  {
    id: "VR-2475",
    pet: "Nala",
    species: "Cat",
    breed: "Siamese • 1 yr",
    owner: "Paolo Cruz",
    location: "Barangay Poblacion",
    submitted: "May 12",
    status: "approved",
    missing: [],
  },
  {
    id: "VR-2474",
    pet: "Bruno",
    species: "Dog",
    breed: "Rottweiler • 5 yrs",
    owner: "Kevin Uy",
    location: "Barangay San Roque",
    submitted: "May 12",
    status: "rejected",
    missing: ["Expired rabies record"],
  },
  {
    id: "VR-2473",
    pet: "Snow",
    species: "Cat",
    breed: "Persian • 2 yrs",
    owner: "Dana Flores",
    location: "Barangay Mabini",
    submitted: "May 11",
    status: "rejected",
    missing: ["Duplicate registration"],
  },
];

export const impounded = {
  total: 18,
  capacity: 24,
  kennel: 9,
  foster: 5,
  reserved: 4,
  longest: [
    { name: "Bantay", breed: "Aspin", days: 41 },
    { name: "Tiger", breed: "Aspin", days: 33 },
    { name: "Cocoa", breed: "Mixed", days: 28 },
  ],
};

export const adoptions = {
  thisMonth: 34,
  thisWeek: 12,
  pendingApplications: 6,
  avgDaysInCare: 19,
  weekly: [
    { label: "W1", value: 5 },
    { label: "W2", value: 7 },
    { label: "W3", value: 9 },
    { label: "W4", value: 13 },
  ],
};

export const feed: FeedItem[] = [
  {
    id: "a1",
    actor: "You",
    action: "approved registration for",
    target: "Pepper",
    time: "8 min ago",
    type: "approve",
  },
  {
    id: "a2",
    actor: "Ana Reyes",
    action: "submitted a new pet registration for",
    target: "Mochi",
    time: "1 hr ago",
    type: "register",
  },
  {
    id: "a3",
    actor: "Field team",
    action: "impounded a stray dog at",
    target: "Barangay San Roque",
    time: "2 hrs ago",
    type: "impound",
  },
  {
    id: "a4",
    actor: "Reception",
    action: "finalized the adoption of",
    target: "Pepper",
    time: "5 hrs ago",
    type: "adopt",
  },
  {
    id: "a5",
    actor: "You",
    action: "rejected registration for",
    target: "Bruno",
    time: "Yesterday",
    type: "reject",
  },
  {
    id: "a6",
    actor: "Grace Tan",
    action: "requested a replacement pet ID for",
    target: "Luna",
    time: "Yesterday",
    type: "register",
  },
];

export const quickActions = [
  { id: "add-pet", label: "Register Pet", icon: "plus" },
  { id: "review", label: "Review Queue", icon: "shield" },
  { id: "owners", label: "Owners", icon: "user-plus" },
  { id: "impound", label: "Log Impound", icon: "paw" },
  { id: "adoptions", label: "Adoptions", icon: "heart" },
  { id: "pet-id", label: "Generate Pet ID", icon: "id" },
] as const;

export const sidebarCountKeys = {
  registrations: ["admin-sidebar-count", "registrations"],
  impounded: ["admin-sidebar-count", "impounded"],
} as const;

export const navSections = [
  {
    label: "Overview",
    items: [
      { id: "dashboard", label: "Dashboard", icon: "home", to: "/" },
      { id: "reports", label: "Reports", icon: "chart", to: "/reports" },
      { id: "activity", label: "Activity Logs", icon: "list", to: "/activity-logs" },
    ],
  },
  {
    label: "Operations",
    items: [
      { id: "registrations", label: "Pet Registrations", icon: "file", to: "/registrations" },
      { id: "owners", label: "Owners", icon: "users", to: "/owners" },
      { id: "impounded", label: "Impounded Animals", icon: "dog", to: "/impounded-dogs" },
      { id: "adoptions", label: "Adoptions", icon: "heart", to: "/adoptions" },
      { id: "pet-id", label: "Pet ID", icon: "id", to: "/pet-id" },
    ],
  },
  {
    label: "Administration",
    items: [
      { id: "users", label: "Users & Roles", icon: "shield-user", to: "/users" },
      { id: "settings", label: "System Settings", icon: "settings", to: "/settings" },
    ],
  },
] as const;
