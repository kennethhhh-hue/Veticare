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

export function getShiftStats(scans: ScanEntry[]) {
  const registeredScanned = new Set(
    scans.filter((scan) => scan.result === "verified").map((scan) => scan.petId),
  );
  return {
    scans: scans.length,
    verified: scans.filter((scan) => scan.result === "verified").length,
    registered: registeredScanned.size,
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
