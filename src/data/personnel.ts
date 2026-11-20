export type RegistrationState = "active" | "expiring" | "expired" | "unregistered";
export type VaccinationState = "complete" | "due" | "overdue";
export type ScanResult = "verified" | "flagged" | "expired" | "unregistered";

export interface PersonnelPet {
  id: string;
  name: string;
  species: "Dog" | "Cat";
  breed: string;
  sex: "Male" | "Female";
  age: string;
  color: string;
  owner: string;
  contact: string;
  barangay: string;
  registration: RegistrationState;
  registeredOn: string;
  validThrough: string;
  vaccination: VaccinationState;
  lastVaccine: string;
  microchip: string | null;
  rfidTag?: string | null;
  qrCode?: string | null;
  photoUrl?: string;
}

export interface ScanEntry {
  id: string;
  petId: string;
  petName: string;
  scannedAt: string;
  result: ScanResult;
  officer: string;
  note: string;
}

export const personnelProfile = {
  name: "Marco Dizon",
  initials: "MD",
  employeeId: "CP-0142",
  role: "City Pound Field Officer",
  assignment: "District 2 • Bacoor City Pound",
  shift: "6:00 AM – 2:00 PM",
  email: "marco.dizon@veticare.gov.ph",
  phone: "0917 884 2299",
  since: "May 2024",
};

const photos = {
  mochi:
    "https://cdn.enter.pro/resources/uid_100710852/veticare-owner-mochi_0fa8d885.png",
  bantay:
    "https://cdn.enter.pro/resources/uid_100710852/veticare-owner-bantay_47d4d0d5.png",
  pepper:
    "https://cdn.enter.pro/resources/uid_100710852/veticare-adopt-pepper_fbfb9fe3.png",
  luna:
    "https://cdn.enter.pro/resources/uid_100710852/veticare-adopt-luna_041cb3ac.png",
};

export const registryPets: PersonnelPet[] = [
  {
    id: "VC-2026-0148",
    name: "Mochi",
    species: "Cat",
    breed: "Persian",
    sex: "Female",
    age: "1 yr 2 mo",
    color: "Cream",
    owner: "Ana Reyes",
    contact: "0918 555 0134",
    barangay: "Poblacion",
    registration: "active",
    registeredOn: "Feb 12, 2026",
    validThrough: "Dec 31, 2026",
    vaccination: "complete",
    lastVaccine: "Rabies booster • Apr 02, 2026",
    microchip: "900215000123458",
    rfidTag: "985141000123458",
    photoUrl: photos.mochi,
  },
  {
    id: "VC-2026-0122",
    name: "Bantay",
    species: "Dog",
    breed: "Aspin",
    sex: "Male",
    age: "2 yr 6 mo",
    color: "Brown",
    owner: "Ana Reyes",
    contact: "0918 555 0134",
    barangay: "Poblacion",
    registration: "active",
    registeredOn: "Jan 18, 2026",
    validThrough: "Dec 31, 2026",
    vaccination: "due",
    lastVaccine: "5-in-1 booster • Feb 20, 2026",
    microchip: "900215000123457",
    rfidTag: "985141000123457",
    photoUrl: photos.bantay,
  },
  {
    id: "VC-2026-0141",
    name: "Buddy",
    species: "Dog",
    breed: "Golden Retriever",
    sex: "Male",
    age: "3 yrs",
    color: "Golden",
    owner: "Juan Dela Cruz",
    contact: "0912 345 6789",
    barangay: "Poblacion",
    registration: "active",
    registeredOn: "May 23, 2026",
    validThrough: "Dec 31, 2026",
    vaccination: "complete",
    lastVaccine: "Anti-rabies • Apr 18, 2026",
    microchip: "900215000123456",
    rfidTag: "985141000123456",
  },
  {
    id: "VC-2026-0136",
    name: "Pepper",
    species: "Dog",
    breed: "Beagle mix",
    sex: "Male",
    age: "2 yrs",
    color: "Tricolor",
    owner: "Ella Mendoza",
    contact: "0916 220 8890",
    barangay: "San Roque",
    registration: "expiring",
    registeredOn: "May 16, 2026",
    validThrough: "Jun 30, 2026",
    vaccination: "complete",
    lastVaccine: "Anti-rabies • Mar 22, 2026",
    microchip: "900215000123462",
    rfidTag: "985141000123462",
    photoUrl: photos.pepper,
  },
  {
    id: "VC-2026-0139",
    name: "Luna",
    species: "Cat",
    breed: "Persian",
    sex: "Female",
    age: "3 yrs",
    color: "White",
    owner: "Maria Santos",
    contact: "0917 234 5678",
    barangay: "Poblacion",
    registration: "active",
    registeredOn: "May 20, 2026",
    validThrough: "Dec 31, 2026",
    vaccination: "overdue",
    lastVaccine: "FVRCP • Jan 12, 2026",
    microchip: "900215000123458",
    rfidTag: "985141000123459",
    photoUrl: photos.luna,
  },
  {
    id: "VC-2026-0137",
    name: "Snow",
    species: "Cat",
    breed: "Persian",
    sex: "Female",
    age: "2 yrs",
    color: "White",
    owner: "Dana Flores",
    contact: "0921 776 3344",
    barangay: "Mabini",
    registration: "expired",
    registeredOn: "May 17, 2025",
    validThrough: "Apr 30, 2026",
    vaccination: "overdue",
    lastVaccine: "FVRCP • Dec 03, 2025",
    microchip: "900215000123461",
  },
  {
    id: "VC-2026-0145",
    name: "Bruno",
    species: "Dog",
    breed: "Rottweiler",
    sex: "Male",
    age: "5 yrs",
    color: "Black",
    owner: "Kevin Uy",
    contact: "0917 884 2299",
    barangay: "San Roque",
    registration: "expired",
    registeredOn: "May 18, 2025",
    validThrough: "Mar 31, 2026",
    vaccination: "due",
    lastVaccine: "Anti-rabies • Feb 14, 2026",
    microchip: null,
  },
  {
    id: "VC-2026-0150",
    name: "Draft Pet",
    species: "Dog",
    breed: "Mixed Breed",
    sex: "Female",
    age: "1 yr",
    color: "Brown",
    owner: "New Owner Draft",
    contact: "—",
    barangay: "Poblacion",
    registration: "unregistered",
    registeredOn: "Not issued",
    validThrough: "—",
    vaccination: "overdue",
    lastVaccine: "No record",
    microchip: null,
  },
  {
    id: "VC-2026-0152",
    name: "Tofu",
    species: "Cat",
    breed: "Domestic short hair",
    sex: "Female",
    age: "8 mo",
    color: "Gray tabby",
    owner: "Paolo Cruz",
    contact: "0920 118 4477",
    barangay: "Bagong Silang",
    registration: "active",
    registeredOn: "May 14, 2026",
    validThrough: "Dec 31, 2026",
    vaccination: "due",
    lastVaccine: "FVRCP • Apr 20, 2026",
    microchip: "900215000123465",
  },
];

export const initialScans: ScanEntry[] = [
  {
    id: "SC-3021",
    petId: "VC-2026-0148",
    petName: "Mochi",
    scannedAt: "Today • 9:42 AM",
    result: "verified",
    officer: "Marco Dizon",
    note: "Registration and vaccination complete.",
  },
  {
    id: "SC-3020",
    petId: "VC-2026-0122",
    petName: "Bantay",
    scannedAt: "Today • 9:18 AM",
    result: "verified",
    officer: "Marco Dizon",
    note: "Rabies booster due May 19 — owner reminded on site.",
  },
  {
    id: "SC-3019",
    petId: "VC-2026-0141",
    petName: "Buddy",
    scannedAt: "Today • 8:55 AM",
    result: "verified",
    officer: "Marco Dizon",
    note: "Registration valid through Dec 31, 2026.",
  },
  {
    id: "SC-3018",
    petId: "VC-2026-0137",
    petName: "Snow",
    scannedAt: "Today • 8:31 AM",
    result: "expired",
    officer: "Marco Dizon",
    note: "Annual registration expired Apr 30 — advised to renew.",
  },
  {
    id: "SC-3017",
    petId: "VC-2026-0136",
    petName: "Pepper",
    scannedAt: "Today • 8:12 AM",
    result: "verified",
    officer: "Liza Bautista",
    note: "Expiring Jun 30 — renewal reminder issued.",
  },
  {
    id: "SC-3016",
    petId: "VC-2026-0139",
    petName: "Luna",
    scannedAt: "Yesterday • 4:05 PM",
    result: "flagged",
    officer: "Marco Dizon",
    note: "Vaccination overdue; flagged for OCVAS review.",
  },
  {
    id: "SC-3015",
    petId: "VC-2026-0145",
    petName: "Bruno",
    scannedAt: "Yesterday • 3:40 PM",
    result: "expired",
    officer: "Marco Dizon",
    note: "Registration expired Mar 31 and no microchip on file.",
  },
  {
    id: "SC-3014",
    petId: "VC-2026-0150",
    petName: "Draft Pet",
    scannedAt: "Yesterday • 3:12 PM",
    result: "unregistered",
    officer: "Marco Dizon",
    note: "QR resolved to an unissued registration.",
  },
  {
    id: "SC-3013",
    petId: "VC-2026-0148",
    petName: "Mochi",
    scannedAt: "Yesterday • 1:25 PM",
    result: "verified",
    officer: "Marco Dizon",
    note: "Household check during barangay visit.",
  },
  {
    id: "SC-3012",
    petId: "VC-2026-0136",
    petName: "Pepper",
    scannedAt: "May 12 • 4:48 PM",
    result: "verified",
    officer: "Liza Bautista",
    note: "Registration confirmed at the shelter.",
  },
];

const registeredPets = new Set(
  registryPets.filter((pet) => pet.registration === "active" || pet.registration === "expiring").map((pet) => pet.id),
);

export function getShiftStats(scans: ScanEntry[]) {
  const scannedRegistered = new Set(
    scans.map((scan) => scan.petId).filter((id) => registeredPets.has(id)),
  );
  return {
    scans: scans.length,
    verified: scans.filter((scan) => scan.result === "verified").length,
    registered: scannedRegistered.size,
    review: scans.filter((scan) => scan.result !== "verified").length,
  };
}

export const registrationLabels: Record<RegistrationState, string> = {
  active: "Active",
  expiring: "Expiring soon",
  expired: "Expired",
  unregistered: "Unregistered",
};

export const vaccinationLabels: Record<VaccinationState, string> = {
  complete: "Vaccination complete",
  due: "Booster due",
  overdue: "Overdue",
};

export const scanResultLabels: Record<ScanResult, string> = {
  verified: "Verified",
  flagged: "Flagged",
  expired: "Expired",
  unregistered: "Unregistered",
};
