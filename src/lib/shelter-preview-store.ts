import { adoptionApplications, impoundedDogs, petIdRecords, type AdoptionApplication, type ImpoundedDog, type PetIdRecord } from "@/data/shelter-records";

const IMPOUNDS_KEY = "veticare-preview-impounds";
const ADOPTIONS_KEY = "veticare-preview-adoptions";
const PET_IDS_KEY = "veticare-preview-pet-ids";

function readRows<T>(key: string, fallback: T[]): T[] {
  try {
    const stored = localStorage.getItem(key);
    if (!stored) return fallback;
    const parsed: unknown = JSON.parse(stored);
    return Array.isArray(parsed) ? parsed as T[] : fallback;
  } catch {
    return fallback;
  }
}

export const readImpounds = () => readRows<ImpoundedDog>(IMPOUNDS_KEY, impoundedDogs);
export const readAdoptions = () => readRows<AdoptionApplication>(ADOPTIONS_KEY, adoptionApplications);
export const readPetIds = () => readRows<PetIdRecord>(PET_IDS_KEY, petIdRecords);

export function writeImpounds(rows: ImpoundedDog[]) {
  localStorage.setItem(IMPOUNDS_KEY, JSON.stringify(rows));
}

export function writeAdoptions(rows: AdoptionApplication[]) {
  localStorage.setItem(ADOPTIONS_KEY, JSON.stringify(rows));
}

export function writePetIds(rows: PetIdRecord[]) {
  localStorage.setItem(PET_IDS_KEY, JSON.stringify(rows));
}
