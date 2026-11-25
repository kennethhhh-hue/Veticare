export type ImpoundStatus = "kennel" | "foster" | "reserved";
export type AnimalImpoundStatus = "impounded" | "claimed" | "released";
export type AnimalAdoptionStatus = "not_available" | "available" | "pending" | "adopted";

export interface ImpoundedDog {
  id: string;
  impoundId: string;
  petId: string;
  animalType: "Dog" | "Cat";
  name: string;
  breed: string;
  sex: "Male" | "Female";
  age: string;
  color: string;
  area: string;
  kennel: string;
  impounded: string;
  impoundedAt: string;
  dateImpounded: string;
  locationFound: string;
  impoundStatus: AnimalImpoundStatus;
  adoptionStatus: AnimalAdoptionStatus;
  days: number;
  status: ImpoundStatus;
  vaccinated: boolean;
  notes: string;
}

const impoundSamples = [
  { id: "IMP-318", name: "Bantay", breed: "Aspin", sex: "Male", age: "2 yrs", color: "Brown", area: "San Roque", kennel: "K-01", impounded: "Apr 03, 2026", impoundedAt: "2026-04-03", days: 41, status: "kennel", vaccinated: true, notes: "Friendly, walks well on a leash." },
  { id: "IMP-317", name: "Tiger", breed: "Aspin", sex: "Male", age: "3 yrs", color: "Brindle", area: "Bagong Silang", kennel: "K-02", impounded: "Apr 11, 2026", impoundedAt: "2026-04-11", days: 33, status: "kennel", vaccinated: true, notes: "Alert, needs slow introductions." },
  { id: "IMP-316", name: "Sandy", breed: "Aspin", sex: "Female", age: "5 yrs", color: "Cream", area: "Mabini", kennel: "K-03", impounded: "Apr 15, 2026", impoundedAt: "2026-04-15", days: 29, status: "kennel", vaccinated: true, notes: "Calm and good with children." },
  { id: "IMP-315", name: "Chase", breed: "Lab mix", sex: "Male", age: "1 yr", color: "Chocolate", area: "Poblacion", kennel: "K-04", impounded: "Apr 22, 2026", impoundedAt: "2026-04-22", days: 22, status: "kennel", vaccinated: true, notes: "High energy, loves fetch." },
  { id: "IMP-314", name: "Bruno", breed: "Rottweiler mix", sex: "Male", age: "5 yrs", color: "Black", area: "Sta. Cruz", kennel: "K-05", impounded: "Apr 26, 2026", impoundedAt: "2026-04-26", days: 18, status: "kennel", vaccinated: false, notes: "Strong; needs an experienced handler." },
  { id: "IMP-313", name: "Rocky", breed: "Aspin", sex: "Male", age: "4 yrs", color: "Gray", area: "Malinis", kennel: "K-06", impounded: "May 01, 2026", impoundedAt: "2026-05-01", days: 13, status: "kennel", vaccinated: true, notes: "Independent but affectionate." },
  { id: "IMP-312", name: "Nala", breed: "Aspin", sex: "Female", age: "2 yrs", color: "Tan", area: "San Isidro", kennel: "K-07", impounded: "May 04, 2026", impoundedAt: "2026-05-04", days: 10, status: "kennel", vaccinated: true, notes: "Shy at first, warms up quickly." },
  { id: "IMP-311", name: "Ghost", breed: "Husky mix", sex: "Male", age: "2 yrs", color: "White", area: "Poblacion", kennel: "K-08", impounded: "May 07, 2026", impoundedAt: "2026-05-07", days: 7, status: "kennel", vaccinated: true, notes: "Escaped twice; needs a secure fence." },
  { id: "IMP-310", name: "Pip", breed: "Aspin", sex: "Male", age: "6 mos", color: "Brown/white", area: "San Roque", kennel: "K-09", impounded: "May 10, 2026", impoundedAt: "2026-05-10", days: 4, status: "kennel", vaccinated: false, notes: "Puppy; vaccination scheduled." },
  { id: "IMP-309", name: "Cocoa", breed: "Mixed breed", sex: "Male", age: "3 yrs", color: "Brown", area: "Mabini", kennel: "F-01", impounded: "Apr 16, 2026", impoundedAt: "2026-04-16", days: 28, status: "foster", vaccinated: true, notes: "Gentle giant in foster care." },
  { id: "IMP-308", name: "Milo", breed: "Aspin", sex: "Male", age: "1 yr", color: "Black/tan", area: "Bagong Silang", kennel: "F-02", impounded: "Apr 24, 2026", impoundedAt: "2026-04-24", days: 20, status: "foster", vaccinated: true, notes: "Great with other dogs." },
  { id: "IMP-307", name: "Bella", breed: "Shih Tzu mix", sex: "Female", age: "4 yrs", color: "Gray", area: "Poblacion", kennel: "F-03", impounded: "May 02, 2026", impoundedAt: "2026-05-02", days: 12, status: "foster", vaccinated: true, notes: "Needs monthly grooming." },
  { id: "IMP-306", name: "Simba", breed: "Aspin", sex: "Male", age: "2 yrs", color: "Golden", area: "San Isidro", kennel: "F-04", impounded: "May 05, 2026", impoundedAt: "2026-05-05", days: 9, status: "foster", vaccinated: true, notes: "Confident and playful." },
  { id: "IMP-305", name: "Daisy", breed: "Beagle mix", sex: "Female", age: "3 yrs", color: "Tricolor", area: "Sta. Cruz", kennel: "F-05", impounded: "May 08, 2026", impoundedAt: "2026-05-08", days: 6, status: "foster", vaccinated: false, notes: "Needs a dental check." },
  { id: "IMP-304", name: "Pepper", breed: "Beagle mix", sex: "Male", age: "2 yrs", color: "Tricolor", area: "San Roque", kennel: "R-01", impounded: "Apr 20, 2026", impoundedAt: "2026-04-20", days: 24, status: "reserved", vaccinated: true, notes: "Adoption pending with the Reyes household." },
  { id: "IMP-303", name: "Luna", breed: "Aspin", sex: "Female", age: "4 yrs", color: "Cream", area: "Bagong Silang", kennel: "R-02", impounded: "Apr 28, 2026", impoundedAt: "2026-04-28", days: 16, status: "reserved", vaccinated: true, notes: "Adoption interview scheduled." },
  { id: "IMP-302", name: "Coco", breed: "Aspin", sex: "Female", age: "1 yr", color: "Brown", area: "Mabini", kennel: "R-03", impounded: "May 03, 2026", impoundedAt: "2026-05-03", days: 11, status: "reserved", vaccinated: true, notes: "Reserved by a barangay volunteer." },
  { id: "IMP-301", name: "Max", breed: "Golden mix", sex: "Male", age: "3 yrs", color: "Golden", area: "Poblacion", kennel: "R-04", impounded: "May 09, 2026", impoundedAt: "2026-05-09", days: 5, status: "reserved", vaccinated: true, notes: "Meet-and-greet booked for Saturday." },
] satisfies Omit<ImpoundedDog, "impoundId" | "petId" | "animalType" | "dateImpounded" | "locationFound" | "impoundStatus" | "adoptionStatus">[];

export const impoundedDogs: ImpoundedDog[] = impoundSamples.map((dog) => ({
  ...dog,
  impoundId: dog.id,
  petId: `PET-${dog.id.slice(-3)}`,
  animalType: "Dog",
  dateImpounded: dog.impoundedAt,
  locationFound: dog.area,
  impoundStatus: dog.status === "reserved" ? "claimed" : "impounded",
  adoptionStatus: dog.status === "reserved" ? "pending" : "available",
}));

export type AdoptionStatus = "pending" | "approved" | "completed" | "rejected";
export type HomeVisit = "passed" | "scheduled" | "pending";

export interface AdoptionApplication {
  id: string;
  applicationId: string;
  ownerId: string;
  impoundId: string;
  applicationDate: string;
  applicationStatus: AdoptionStatus;
  decisionDate: string | null;
  applicant: string;
  email: string;
  phone: string;
  pet: string;
  petBreed: string;
  species: "Dog" | "Cat";
  applied: string;
  appliedAt: string;
  area: string;
  homeVisit: HomeVisit;
  status: AdoptionStatus;
  note: string;
}

const adoptionSamples = [
  { id: "AD-512", applicant: "Ana Reyes", email: "ana.reyes@email.com", phone: "0918 555 0134", pet: "Pepper", petBreed: "Beagle mix", species: "Dog", applied: "May 13, 2026", appliedAt: "2026-05-13", area: "Poblacion", homeVisit: "scheduled", status: "pending", note: "Fenced yard, two adults at home." },
  { id: "AD-511", applicant: "Ella Mendoza", email: "ella.mendoza@email.com", phone: "0916 220 8890", pet: "Luna", petBreed: "Aspin", species: "Dog", applied: "May 12, 2026", appliedAt: "2026-05-12", area: "San Isidro", homeVisit: "pending", status: "pending", note: "First-time adopter, works from home." },
  { id: "AD-510", applicant: "Grace Tan", email: "grace.tan@email.com", phone: "0917 221 5566", pet: "Tofu", petBreed: "Domestic short hair", species: "Cat", applied: "May 11, 2026", appliedAt: "2026-05-11", area: "Bagong Silang", homeVisit: "scheduled", status: "pending", note: "Has one resident cat, indoor household." },
  { id: "AD-509", applicant: "Marvin Lim", email: "marvin.lim@email.com", phone: "0919 334 7781", pet: "Cocoa", petBreed: "Mixed breed", species: "Dog", applied: "May 10, 2026", appliedAt: "2026-05-10", area: "Sta. Cruz", homeVisit: "passed", status: "pending", note: "Previous dog owner, vet reference provided." },
  { id: "AD-508", applicant: "Rico Santos", email: "rico.santos@email.com", phone: "0908 442 1177", pet: "Nala", petBreed: "Aspin", species: "Dog", applied: "May 09, 2026", appliedAt: "2026-05-09", area: "Malinis", homeVisit: "pending", status: "pending", note: "Apartment with a shared courtyard." },
  { id: "AD-507", applicant: "Dana Flores", email: "dana.flores@email.com", phone: "0921 776 3344", pet: "Simba", petBreed: "Aspin", species: "Dog", applied: "May 08, 2026", appliedAt: "2026-05-08", area: "Mabini", homeVisit: "scheduled", status: "pending", note: "Three children, no other pets." },
  { id: "AD-506", applicant: "Juan Dela Cruz", email: "juan.delacruz@email.com", phone: "0912 345 6789", pet: "Max", petBreed: "Golden mix", species: "Dog", applied: "May 07, 2026", appliedAt: "2026-05-07", area: "Poblacion", homeVisit: "passed", status: "approved", note: "Approved; pickup scheduled this week." },
  { id: "AD-505", applicant: "Maria Santos", email: "maria.santos@email.com", phone: "0917 234 5678", pet: "Bella", petBreed: "Shih Tzu mix", species: "Dog", applied: "May 05, 2026", appliedAt: "2026-05-05", area: "Poblacion", homeVisit: "passed", status: "approved", note: "Approved; grooming plan confirmed." },
  { id: "AD-504", applicant: "Kevin Uy", email: "kevin.uy@email.com", phone: "0917 884 2299", pet: "Chase", petBreed: "Lab mix", species: "Dog", applied: "Apr 29, 2026", appliedAt: "2026-04-29", area: "San Roque", homeVisit: "passed", status: "completed", note: "Adoption completed and ID issued." },
  { id: "AD-503", applicant: "Paolo Cruz", email: "paolo.cruz@email.com", phone: "0920 118 4477", pet: "Ghost", petBreed: "Husky mix", species: "Dog", applied: "Apr 25, 2026", appliedAt: "2026-04-25", area: "San Roque", homeVisit: "pending", status: "rejected", note: "Unsecured gate; invited to reapply." },
] satisfies Omit<AdoptionApplication, "applicationId" | "ownerId" | "impoundId" | "applicationDate" | "applicationStatus" | "decisionDate">[];

const ownerIds: Record<string, string> = {
  "Ana Reyes": "OW-206",
  "Ella Mendoza": "OW-209",
  "Grace Tan": "OW-202",
  "Marvin Lim": "OW-203",
  "Rico Santos": "OW-201",
  "Dana Flores": "OW-204",
  "Juan Dela Cruz": "OW-208",
  "Maria Santos": "OW-207",
  "Kevin Uy": "OW-205",
  "Paolo Cruz": "OW-210",
};

const impoundIds: Record<string, string> = {
  Pepper: "IMP-304",
  Luna: "IMP-303",
  Tofu: "IMP-300",
  Cocoa: "IMP-309",
  Nala: "IMP-312",
  Simba: "IMP-306",
  Max: "IMP-301",
  Bella: "IMP-307",
  Chase: "IMP-315",
  Ghost: "IMP-311",
};

export const adoptionApplications: AdoptionApplication[] = adoptionSamples.map((application) => ({
  ...application,
  applicationId: application.id,
  ownerId: ownerIds[application.applicant] ?? "OW-000",
  impoundId: impoundIds[application.pet] ?? "IMP-000",
  applicationDate: application.appliedAt,
  applicationStatus: application.status,
  decisionDate: application.status === "pending" ? null : application.appliedAt,
}));

export type PetIdStatus = "active" | "pending" | "expired" | "replaced";

export interface PetIdRecord {
  id: string;
  pet: string;
  species: "Dog" | "Cat";
  breed: string;
  owner: string;
  barangay: string;
  issued: string;
  validThrough: string;
  status: PetIdStatus;
}

export const petIdRecords: PetIdRecord[] = [
  { id: "VC-2026-0148", pet: "Mochi", species: "Cat", breed: "Persian", owner: "Ana Reyes", barangay: "Poblacion", issued: "Feb 12, 2026", validThrough: "Dec 31, 2026", status: "active" },
  { id: "VC-2026-0122", pet: "Bantay", species: "Dog", breed: "Aspin", owner: "Ana Reyes", barangay: "Poblacion", issued: "Jan 18, 2026", validThrough: "Dec 31, 2026", status: "active" },
  { id: "VC-2026-0141", pet: "Buddy", species: "Dog", breed: "Golden Retriever", owner: "Juan Dela Cruz", barangay: "Poblacion", issued: "May 23, 2026", validThrough: "Dec 31, 2026", status: "active" },
  { id: "VC-2026-0140", pet: "Draft Pet", species: "Dog", breed: "Mixed Breed", owner: "New Owner Draft", barangay: "Poblacion", issued: "Not issued", validThrough: "—", status: "pending" },
  { id: "VC-2026-0139", pet: "Luna", species: "Cat", breed: "Persian", owner: "Maria Santos", barangay: "Poblacion", issued: "May 20, 2026", validThrough: "Dec 31, 2026", status: "active" },
  { id: "VC-2026-0138", pet: "Bruno", species: "Dog", breed: "Rottweiler", owner: "Kevin Uy", barangay: "San Roque", issued: "May 18, 2026", validThrough: "Dec 31, 2026", status: "replaced" },
  { id: "VC-2026-0137", pet: "Snow", species: "Cat", breed: "Persian", owner: "Dana Flores", barangay: "Mabini", issued: "May 17, 2026", validThrough: "Dec 31, 2026", status: "active" },
  { id: "VC-2025-0981", pet: "Tiger", species: "Dog", breed: "Aspin", owner: "Grace Tan", barangay: "Bagong Silang", issued: "Jun 02, 2025", validThrough: "May 31, 2026", status: "expired" },
  { id: "VC-2026-0136", pet: "Pepper", species: "Dog", breed: "Beagle mix", owner: "Ella Mendoza", barangay: "San Roque", issued: "May 16, 2026", validThrough: "Dec 31, 2026", status: "active" },
  { id: "VC-2026-0135", pet: "Choco", species: "Dog", breed: "Shih Tzu", owner: "Marvin Lim", barangay: "Sta. Cruz", issued: "Not issued", validThrough: "—", status: "pending" },
  { id: "VC-2025-0912", pet: "Cocoa", species: "Dog", breed: "Mixed breed", owner: "Rico Santos", barangay: "Malinis", issued: "Mar 04, 2025", validThrough: "Feb 28, 2026", status: "replaced" },
  { id: "VC-2026-0134", pet: "Tofu", species: "Cat", breed: "Domestic short hair", owner: "Paolo Cruz", barangay: "Poblacion", issued: "May 14, 2026", validThrough: "Dec 31, 2026", status: "active" },
];
