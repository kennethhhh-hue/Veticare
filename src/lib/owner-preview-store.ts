import { owner, ownerPets, type OwnerPet, type OwnerRequestInput } from "@/data/owner-app";

const PETS_KEY = "veticare-owner-preview-pets";
const PROFILE_KEY = "veticare-owner-preview-profile";
const REQUESTS_KEY = "veticare-owner-preview-adoption-requests";
const EVENTS_KEY = "veticare-owner-preview-event-reservations";
const OWNER_REQUESTS_KEY = "veticare-owner-preview-requests";

export interface OwnerProfile {
  fullName: string;
  email: string;
  phone: string;
  address: string;
  barangay: string;
  avatarUrl?: string;
}

export interface AdoptionRequest {
  id: string;
  petId: string;
  petName: string;
  submittedAt: string;
  status: "pending" | "approved" | "rejected" | "completed";
}

export interface OwnerRequest {
  id: string;
  type: OwnerRequestInput["type"];
  petId: string;
  petName: string;
  submittedAt: string;
  details: string;
  status: "submitted" | "completed" | "declined";
  localOnly?: boolean;
}

function readJson<T>(key: string, fallback: T): T {
  try {
    const stored = localStorage.getItem(key);
    return stored ? JSON.parse(stored) as T : fallback;
  } catch {
    return fallback;
  }
}

export const readOwnerPets = () => readJson<OwnerPet[]>(PETS_KEY, ownerPets);
export const writeOwnerPets = (pets: OwnerPet[]) => localStorage.setItem(PETS_KEY, JSON.stringify(pets));
export const readOwnerProfile = () => readJson<OwnerProfile>(PROFILE_KEY, {
  fullName: owner.fullName,
  email: owner.email,
  phone: owner.phone,
  address: owner.address,
  barangay: owner.address.split(",").pop()?.trim() ?? "",
});
export const writeOwnerProfile = (profile: OwnerProfile) => localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
export const readAdoptionRequests = () => readJson<AdoptionRequest[]>(REQUESTS_KEY, []);
export const writeAdoptionRequests = (requests: AdoptionRequest[]) => localStorage.setItem(REQUESTS_KEY, JSON.stringify(requests));
export const readEventReservations = () => readJson<string[]>(EVENTS_KEY, []);
export const writeEventReservations = (reservations: string[]) => localStorage.setItem(EVENTS_KEY, JSON.stringify(reservations));
export const readOwnerRequests = () => readJson<OwnerRequest[]>(OWNER_REQUESTS_KEY, []);
