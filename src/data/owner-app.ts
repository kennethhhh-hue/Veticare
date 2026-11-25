export const ownerRequestLabels = {
  visit: "Vet visit",
  "pet-detail-change": "Pet detail change",
  "annual-registration": "Annual registration",
  "free-vaccination": "Free vaccination",
} as const;

export interface OwnerRequestInput {
  type: keyof typeof ownerRequestLabels;
  petId: string;
  details?: string;
  preferredDate?: string;
}

export interface OwnerPet {
  id: string;
  name: string;
  species: "Dog" | "Cat";
  breed: string;
  age: string;
  sex: "Male" | "Female";
  weight: string;
  color: string;
  petId: string;
  qrCode?: string | null;
  validThrough?: string | null;
  ownerName?: string;
  ownerEmail?: string;
  ownerPhone?: string;
  ownerBarangay?: string;
  registered: string;
  registrationStatus?: "pending" | "approved" | "rejected";
  photoUrl?: string;
  tags: string[];
  nextDue: { title: string; date: string; days: number };
  vaccines: { name: string; date: string; status: "done" | "due" }[];
  vaccinationsUnavailable?: boolean;
}

export interface AdoptablePet {
  id: string;
  name: string;
  species: "Dog" | "Cat";
  breed: string;
  age: string;
  sex: "Male" | "Female";
  shelter: string;
  distance: string;
  tags: string[];
  story?: string;
  photoUrl?: string;
  vaccineName?: string;
}

export const owner = {
  firstName: "Ana",
  fullName: "Ana Reyes",
  initials: "AR",
  email: "ana.reyes@email.com",
  phone: "+63 917 482 1130",
  address: "Barangay Poblacion, Bacoor",
  memberSince: "March 2023",
};

export const ownerPets: OwnerPet[] = [
  {
    id: "p1",
    name: "Mochi",
    species: "Cat",
    breed: "Persian",
    age: "1 yr 2 mo",
    sex: "Female",
    weight: "3.4 kg",
    color: "Cream",
    petId: "VC-2026-0148",
    registered: "Feb 2026",
    photoUrl:
      "https://cdn.enter.pro/resources/uid_100710852/veticare-owner-mochi_0fa8d885.png",
    tags: ["Vaccinated", "Registered", "Indoor"],
    nextDue: { title: "Rabies booster", date: "May 19, 2026", days: 5 },
    vaccines: [
      { name: "FVRCP (1st dose)", date: "Mar 04, 2026", status: "done" },
      { name: "FVRCP (2nd dose)", date: "Apr 02, 2026", status: "done" },
      { name: "Rabies booster", date: "May 19, 2026", status: "due" },
    ],
  },
  {
    id: "p2",
    name: "Bantay",
    species: "Dog",
    breed: "Aspin",
    age: "2 yr 6 mo",
    sex: "Male",
    weight: "12.1 kg",
    color: "Brown",
    petId: "VC-2026-0122",
    registered: "Jan 2026",
    photoUrl:
      "https://cdn.enter.pro/resources/uid_100710852/veticare-owner-bantay_47d4d0d5.png",
    tags: ["Vaccinated", "Registered", "Neutered"],
    nextDue: { title: "Deworming", date: "May 28, 2026", days: 14 },
    vaccines: [
      { name: "Anti-rabies", date: "Jan 18, 2026", status: "done" },
      { name: "5-in-1 booster", date: "Feb 20, 2026", status: "done" },
      { name: "Deworming", date: "May 28, 2026", status: "due" },
    ],
  },
];

export const adoptablePets: AdoptablePet[] = [
  {
    id: "a1",
    name: "Pepper",
    species: "Dog",
    breed: "Beagle mix",
    age: "2 yrs",
    sex: "Male",
    shelter: "San Roque shelter",
    distance: "1.2 km away",
    tags: ["Good with kids", "Vaccinated"],
    photoUrl:
      "https://cdn.enter.pro/resources/uid_100710852/veticare-adopt-pepper_fbfb9fe3.png",
    story:
      "Pepper was rescued near the market and quickly became the shelter's friendliest walker. He knows basic commands and loves long afternoon walks.",
  },
  {
    id: "a2",
    name: "Luna",
    species: "Dog",
    breed: "Aspin",
    age: "4 yrs",
    sex: "Female",
    shelter: "Bagong Silang foster",
    distance: "2.4 km away",
    tags: ["Calm", "House-trained"],
    photoUrl:
      "https://cdn.enter.pro/resources/uid_100710852/veticare-adopt-luna_041cb3ac.png",
    story:
      "Luna is a quiet, affectionate girl who prefers a calm household. She is house-trained and gets along with other dogs.",
  },
  {
    id: "a3",
    name: "Tofu",
    species: "Cat",
    breed: "Domestic short hair",
    age: "8 mos",
    sex: "Female",
    shelter: "Poblacion foster",
    distance: "3.0 km away",
    tags: ["Playful", "Litter-trained"],
    story:
      "Tofu is all curiosity. She loves crinkle toys and sunny windowsills, and is already litter-trained.",
  },
  {
    id: "a4",
    name: "Cocoa",
    species: "Dog",
    breed: "Mixed breed",
    age: "3 yrs",
    sex: "Male",
    shelter: "Mabini shelter",
    distance: "4.1 km away",
    tags: ["Gentle", "Neutered"],
    story:
      "Cocoa is a gentle giant who walks well on a leash and is looking for a family who enjoys slow evenings.",
  },
];

export const upcomingEvents = [
  {
    id: "e1",
    date: "May 18",
    title: "Free anti-rabies clinic",
    place: "San Roque covered court • 8:00 AM",
  },
  {
    id: "e2",
    date: "May 24",
    title: "Adoption day",
    place: "City Veterinary Office • 9:00 AM",
  },
];

export const petSpeciesLabel = (pet: { species: "Dog" | "Cat" }) =>
  pet.species === "Dog" ? "Dog" : "Cat";
