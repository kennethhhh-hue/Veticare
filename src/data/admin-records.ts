export type RegistrationStatus = "approved" | "pending" | "rejected";
export type OwnerStatus = "active" | "inactive" | "pending" | "rejected";

export interface PetRegistration {
  id: string;
  name: string;
  species: "Dog" | "Cat";
  breed: string;
  gender: "Male" | "Female";
  age?: string;
  weight?: string;
  color?: string;
  photoUrl?: string | null;
  impoundClaimed?: boolean;
  owner: string;
  phone: string;
  ownerId?: string;
  petId?: string | null;
  qrCode?: string | null;
  ownerPetKey?: string;
  registered: string;
  registeredAt: string;
  status: RegistrationStatus;
  isDraft?: boolean;
}

export interface OwnerRecord {
  id: string;
  name: string;
  phone: string;
  email: string;
  address: string;
  barangay: string;
  pets: number;
  registered: string;
  registeredAt: string;
  status: OwnerStatus;
}

export const registrations: PetRegistration[] = [
  {
    id: "PR-1042",
    name: "Buddy",
    species: "Dog",
    breed: "Golden Retriever",
    gender: "Male",
    owner: "Juan Dela Cruz",
    phone: "0905 123 4567",
    registered: "May 23, 2026",
    registeredAt: "2026-05-23",
    status: "approved",
  },
  {
    id: "PR-1041",
    name: "Mochi",
    species: "Dog",
    breed: "Shih Tzu",
    gender: "Female",
    owner: "Maria Santos",
    phone: "0917 234 5678",
    registered: "May 22, 2026",
    registeredAt: "2026-05-22",
    status: "approved",
  },
  {
    id: "PR-1040",
    name: "Draft Pet",
    species: "Dog",
    breed: "Mixed Breed",
    gender: "Female",
    owner: "New Owner Draft",
    phone: "—",
    registered: "Draft",
    registeredAt: "2026-05-24",
    status: "pending",
    isDraft: true,
  },
  {
    id: "PR-1039",
    name: "Luna",
    species: "Cat",
    breed: "Persian",
    gender: "Female",
    owner: "Ana Reyes",
    phone: "0918 555 0134",
    registered: "May 20, 2026",
    registeredAt: "2026-05-20",
    status: "pending",
  },
  {
    id: "PR-1038",
    name: "Bruno",
    species: "Dog",
    breed: "Rottweiler",
    gender: "Male",
    owner: "Kevin Uy",
    phone: "0917 884 2299",
    registered: "May 18, 2026",
    registeredAt: "2026-05-18",
    status: "rejected",
  },
  {
    id: "PR-1037",
    name: "Snow",
    species: "Cat",
    breed: "Persian",
    gender: "Female",
    owner: "Dana Flores",
    phone: "0921 776 3344",
    registered: "May 17, 2026",
    registeredAt: "2026-05-17",
    status: "pending",
  },
  {
    id: "PR-1036",
    name: "Pepper",
    species: "Dog",
    breed: "Beagle mix",
    gender: "Male",
    owner: "Ella Mendoza",
    phone: "0916 220 8890",
    registered: "May 16, 2026",
    registeredAt: "2026-05-16",
    status: "approved",
  },
  {
    id: "PR-1035",
    name: "Choco",
    species: "Dog",
    breed: "Shih Tzu",
    gender: "Male",
    owner: "Marvin Lim",
    phone: "0919 334 7781",
    registered: "May 15, 2026",
    registeredAt: "2026-05-15",
    status: "pending",
  },
];

export const owners: OwnerRecord[] = [
  {
    id: "OW-209",
    name: "Sample Pending Owner",
    phone: "0912 000 0000",
    email: "pending.owner@example.com",
    address: "Barangay San Roque",
    barangay: "San Roque",
    pets: 0,
    registered: "Nov 11, 2026",
    registeredAt: "2026-11-11",
    status: "pending",
  },
  {
    id: "OW-209",
    name: "Sample Pending Owner",
    phone: "0912 000 0000",
    email: "pending.owner@example.com",
    address: "Barangay San Roque",
    barangay: "San Roque",
    pets: 0,
    registered: "Nov 11, 2026",
    registeredAt: "2026-11-11",
    status: "pending",
  },
  {
    id: "OW-208",
    name: "Juan Dela Cruz",
    phone: "0912 345 6789",
    email: "juan.delacruz@email.com",
    address: "Batangas City, Poblacion",
    barangay: "Poblacion",
    pets: 2,
    registered: "May 23, 2026",
    registeredAt: "2026-05-23",
    status: "active",
  },
  {
    id: "OW-207",
    name: "Maria Santos",
    phone: "0917 234 5678",
    email: "maria.santos@email.com",
    address: "Barangay Poblacion",
    barangay: "Poblacion",
    pets: 1,
    registered: "May 22, 2026",
    registeredAt: "2026-05-22",
    status: "active",
  },
  {
    id: "OW-206",
    name: "Ana Reyes",
    phone: "0918 555 0134",
    email: "ana.reyes@email.com",
    address: "Barangay Poblacion",
    barangay: "Poblacion",
    pets: 2,
    registered: "May 20, 2026",
    registeredAt: "2026-05-20",
    status: "active",
  },
  {
    id: "OW-205",
    name: "Kevin Uy",
    phone: "0917 884 2299",
    email: "kevin.uy@email.com",
    address: "Barangay San Roque",
    barangay: "San Roque",
    pets: 1,
    registered: "May 18, 2026",
    registeredAt: "2026-05-18",
    status: "active",
  },
  {
    id: "OW-204",
    name: "Dana Flores",
    phone: "0921 776 3344",
    email: "dana.flores@email.com",
    address: "Barangay Mabini",
    barangay: "Mabini",
    pets: 1,
    registered: "May 17, 2026",
    registeredAt: "2026-05-17",
    status: "inactive",
  },
  {
    id: "OW-203",
    name: "Marvin Lim",
    phone: "0919 334 7781",
    email: "marvin.lim@email.com",
    address: "Barangay Sta. Cruz",
    barangay: "Sta. Cruz",
    pets: 1,
    registered: "May 15, 2026",
    registeredAt: "2026-05-15",
    status: "active",
  },
  {
    id: "OW-202",
    name: "Grace Tan",
    phone: "0917 221 5566",
    email: "grace.tan@email.com",
    address: "Barangay Bagong Silang",
    barangay: "Bagong Silang",
    pets: 1,
    registered: "May 12, 2026",
    registeredAt: "2026-05-12",
    status: "active",
  },
  {
    id: "OW-201",
    name: "Rico Santos",
    phone: "0908 442 1177",
    email: "rico.santos@email.com",
    address: "Barangay Malinis",
    barangay: "Malinis",
    pets: 1,
    registered: "May 10, 2026",
    registeredAt: "2026-05-10",
    status: "inactive",
  },
];

export const barangays = Array.from(new Set(owners.map((o) => o.barangay))).sort();
