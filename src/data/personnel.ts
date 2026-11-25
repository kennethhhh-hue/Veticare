export type RegistrationState = "active" | "expiring" | "expired" | "unregistered";
export type VaccinationState = "complete" | "due" | "overdue" | "unknown";
export type ScanResult = "verified" | "flagged" | "expired" | "unregistered";
export type ScanHistoryResult = ScanResult | "resolved";
export type ScanFollowUp = "vaccination" | "registration";

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
  lastVaccine?: string;
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

export type ScanHistoryEntry = ScanEntry & { displayResult: ScanHistoryResult };

export const registrationLabels: Record<RegistrationState, string> = {
  active: "Active",
  expiring: "Expiring soon",
  expired: "Expired",
  unregistered: "Unregistered",
};

export const vaccinationLabels: Record<VaccinationState, string> = {
  complete: "Vaccinated",
  due: "Booster due",
  overdue: "Overdue",
  unknown: "No vaccination recorded",
};

export const scanResultLabels: Record<ScanHistoryResult, string> = {
  verified: "Verified",
  resolved: "Resolved",
  flagged: "Needs review",
  expired: "Expired",
  unregistered: "Unregistered",
};

const vaccinationReviewNotes = new Set([
  vaccinationLabels.unknown.toLowerCase(),
  vaccinationLabels.due.toLowerCase(),
  vaccinationLabels.overdue.toLowerCase(),
  "no vaccination record linked",
]);

export function getScanHistoryResult(scan: ScanEntry, pet?: PersonnelPet): ScanHistoryResult {
  if (scan.result !== "flagged" || pet?.registration !== "active" || pet.vaccination !== "complete") {
    return scan.result;
  }
  const note = scan.note.trim().toLowerCase().replace(/\.$/, "");
  return vaccinationReviewNotes.has(note) || note.endsWith("; vaccination needs attention")
    ? "resolved"
    : scan.result;
}
