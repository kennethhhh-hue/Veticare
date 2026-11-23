import { type ScanEntry, type PersonnelPet } from "@/data/personnel";

const SCANS_KEY = "veticare-personnel-preview-scans";
const VERIFIED_KEY = "veticare-personnel-preview-verified";
const REVIEW_KEY = "veticare-personnel-preview-review";
const REQUESTS_KEY = "veticare-personnel-preview-requests";
const NOTIFICATIONS_KEY = "veticare-personnel-preview-notifications";
const IMPOUNDS_KEY = "veticare-personnel-preview-impounds";

function readJson<T>(key: string, fallback: T): T {
  try {
    const stored = localStorage.getItem(key);
    if (!stored) return fallback;
    const parsed: unknown = JSON.parse(stored);
    return parsed as T;
  } catch {
    return fallback;
  }
}

export const readScans = () => readJson<ScanEntry[]>(SCANS_KEY, []);
export const writeScans = (scans: ScanEntry[]) => localStorage.setItem(SCANS_KEY, JSON.stringify(scans));
export const readVerifiedIds = () => readJson<string[]>(VERIFIED_KEY, []);
export const writeVerifiedIds = (ids: string[]) => localStorage.setItem(VERIFIED_KEY, JSON.stringify(ids));
export const readReviewIds = () => readJson<string[]>(REVIEW_KEY, []);
export const writeReviewIds = (ids: string[]) => localStorage.setItem(REVIEW_KEY, JSON.stringify(ids));
export const readPersonnelRequests = () => readJson<string[]>(REQUESTS_KEY, []);
export const writePersonnelRequests = (requests: string[]) => localStorage.setItem(REQUESTS_KEY, JSON.stringify(requests));
export const readPersonnelNotifications = () => localStorage.getItem(NOTIFICATIONS_KEY) !== "off";
export const writePersonnelNotifications = (enabled: boolean) => localStorage.setItem(NOTIFICATIONS_KEY, enabled ? "on" : "off");

export interface PersonnelImpoundNotice {
  id: string;
  petId: string;
  rfidTag: string | null;
  petName: string;
  ownerName: string;
  ownerPhone: string;
  barangay: string;
  locationFound: string;
  dateImpounded: string;
  reason: string;
  ownerNoticeStatus: "preview_only";
  barangayNoticeStatus: "preview_only";
  createdAt: string;
}

export const readImpoundNotices = () => readJson<PersonnelImpoundNotice[]>(IMPOUNDS_KEY, []);
export const writeImpoundNotices = (notices: PersonnelImpoundNotice[]) => localStorage.setItem(IMPOUNDS_KEY, JSON.stringify(notices));

export function createImpoundNotice(pet: PersonnelPet, locationFound: string, dateImpounded: string, reason: string) {
  const notice: PersonnelImpoundNotice = {
    id: `PO-${Date.now()}`,
    petId: pet.id,
    rfidTag: pet.rfidTag ?? null,
    petName: pet.name,
    ownerName: pet.owner,
    ownerPhone: pet.contact,
    barangay: pet.barangay,
    locationFound,
    dateImpounded,
    reason,
    ownerNoticeStatus: "preview_only",
    barangayNoticeStatus: "preview_only",
    createdAt: new Date().toISOString(),
  };
  const updated = [notice, ...readImpoundNotices()];
  writeImpoundNotices(updated);
  return notice;
}
