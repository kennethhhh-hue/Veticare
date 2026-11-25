export type RegistrationState = "active" | "expiring" | "expired" | "unregistered";
export type VaccinationState = "complete" | "due" | "overdue" | "unknown";
export type ScanResult = "verified" | "flagged" | "expired" | "unregistered";
export type ScanFollowUpRequest =
  | { type: "vaccination"; vaccineName: string; lastVaccinationDate: string | null }
  | { type: "registration" };
export type ScanFollowUp = ScanFollowUpRequest["type"];

export const scanFollowUpLabels: Record<ScanFollowUp, string> = {
  vaccination: "For Vaccination",
  registration: "For Registration",
};

export interface PersonnelPet {
  id: string;
  recordId: string;
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
  impoundClaimed?: boolean;
  registeredOn: string;
  validThrough: string;
  vaccination: VaccinationState;
  lastVaccine: string;
  lastVaccinatedOn?: string;
  qrCode?: string | null;
  photoUrl?: string;
}

export interface ScanEntry {
  id: string;
  petRecordId: string;
  petId: string;
  petName: string;
  createdAt: string;
  scannedAt: string;
  result: ScanResult;
  officer: string;
  note: string;
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
  unknown: "No vaccination record linked",
};

export const scanResultLabels: Record<ScanResult, string> = {
  verified: "Verified",
  flagged: "Flagged",
  expired: "Expired",
  unregistered: "Unregistered",
};
