import type { DocumentList } from "../types/index.js";
import { getDocuments } from "../services/govDataService.js";

// ─── Seed Data (fallback) ─────────────────────────────────────────────────────

const DOCUMENT_LISTS: DocumentList[] = [
  {
    id: "doclist-passport-application", serviceOrSchemeId: "passport-application",
    documents: [
      { name: "Proof of Identity", description: "A government-issued photo ID to verify the applicant's identity.", isMandatory: true, obtainFromUrl: "https://uidai.gov.in", submitToUrl: "https://www.passportindia.gov.in" },
      { name: "Proof of Address", description: "A document confirming the applicant's current residential address.", isMandatory: true, obtainFromUrl: "https://uidai.gov.in", submitToUrl: "https://www.passportindia.gov.in" },
      { name: "Proof of Date of Birth", description: "A document confirming the applicant's date of birth.", isMandatory: true, obtainFromUrl: "https://crsorgi.gov.in", submitToUrl: "https://www.passportindia.gov.in" },
      { name: "Old Passport", description: "The applicant's previous passport for re-issue applications.", isMandatory: false, condition: "Required if applying for re-issue of an existing passport.", submitToUrl: "https://www.passportindia.gov.in" },
      { name: "Birth Certificate of Minor", description: "Birth certificate issued by the municipal authority for applicants under 18.", isMandatory: false, condition: "Required if the applicant is a minor (under 18 years of age).", obtainFromUrl: "https://crsorgi.gov.in", submitToUrl: "https://www.passportindia.gov.in" },
    ],
  },
  {
    id: "doclist-driving-license", serviceOrSchemeId: "driving-license",
    documents: [
      { name: "Proof of Age", description: "A document confirming the applicant meets the minimum age requirement.", isMandatory: true, obtainFromUrl: "https://uidai.gov.in", submitToUrl: "https://parivahan.gov.in" },
      { name: "Proof of Address", description: "A document confirming the applicant's current residential address.", isMandatory: true, obtainFromUrl: "https://uidai.gov.in", submitToUrl: "https://parivahan.gov.in" },
      { name: "Medical Certificate (Form 1A)", description: "A medical fitness certificate issued by a registered medical practitioner.", isMandatory: true, obtainFromUrl: "https://parivahan.gov.in", submitToUrl: "https://parivahan.gov.in" },
      { name: "Learner's Licence", description: "A valid learner's licence held for at least 30 days before applying for a permanent DL.", isMandatory: false, condition: "Required when applying for a permanent driving licence.", obtainFromUrl: "https://parivahan.gov.in", submitToUrl: "https://parivahan.gov.in" },
      { name: "Driving School Certificate", description: "Certificate from a government-recognised driving training school.", isMandatory: false, condition: "Required for transport vehicle (commercial) driving licence applicants.", obtainFromUrl: "https://parivahan.gov.in", submitToUrl: "https://parivahan.gov.in" },
    ],
  },
  {
    id: "doclist-aadhaar-card", serviceOrSchemeId: "aadhaar-card",
    documents: [
      { name: "Proof of Identity (POI)", description: "A government-issued photo ID.", isMandatory: true, obtainFromUrl: "https://uidai.gov.in", submitToUrl: "https://appointments.uidai.gov.in" },
      { name: "Proof of Address (POA)", description: "A document confirming the applicant's current residential address.", isMandatory: true, obtainFromUrl: "https://uidai.gov.in", submitToUrl: "https://appointments.uidai.gov.in" },
      { name: "Proof of Date of Birth", description: "A document confirming the applicant's date of birth.", isMandatory: false, condition: "Required if the applicant wishes to have their verified date of birth printed on the Aadhaar card.", obtainFromUrl: "https://crsorgi.gov.in", submitToUrl: "https://appointments.uidai.gov.in" },
      { name: "Head of Family's Aadhaar", description: "Aadhaar card of the head of the family to establish address proof.", isMandatory: false, condition: "Required when the applicant does not have independent address proof.", obtainFromUrl: "https://uidai.gov.in", submitToUrl: "https://appointments.uidai.gov.in" },
    ],
  },
  {
    id: "doclist-pm-kisan", serviceOrSchemeId: "pm-kisan",
    documents: [
      { name: "Aadhaar Card", description: "Mandatory for identity verification and direct benefit transfer.", isMandatory: true, obtainFromUrl: "https://uidai.gov.in", submitToUrl: "https://pmkisan.gov.in" },
      { name: "Land Ownership Records (Khasra/Khatauni)", description: "Revenue records confirming the farmer's ownership or cultivation rights.", isMandatory: true, obtainFromUrl: "https://bhulekh.gov.in", submitToUrl: "https://pmkisan.gov.in" },
      { name: "Bank Account Details", description: "Bank passbook or cancelled cheque for direct benefit transfer.", isMandatory: true, obtainFromUrl: "https://www.india.gov.in", submitToUrl: "https://pmkisan.gov.in" },
      { name: "Tenant Farming Agreement", description: "A registered agreement confirming the applicant's rights to cultivate the land as a tenant farmer.", isMandatory: false, condition: "Required if the applicant is a tenant farmer and does not own the land.", obtainFromUrl: "https://igrs.gov.in", submitToUrl: "https://pmkisan.gov.in" },
    ],
  },
  {
    id: "doclist-ayushman-bharat", serviceOrSchemeId: "ayushman-bharat",
    documents: [
      { name: "Aadhaar Card", description: "Identity proof for beneficiary verification and Ayushman card generation.", isMandatory: true, obtainFromUrl: "https://uidai.gov.in", submitToUrl: "https://pmjay.gov.in" },
      { name: "Ration Card", description: "Proof of inclusion in the SECC database or BPL category.", isMandatory: true, obtainFromUrl: "https://nfsa.gov.in", submitToUrl: "https://pmjay.gov.in" },
      { name: "Income Certificate", description: "Certificate issued by a competent authority confirming annual household income.", isMandatory: false, condition: "Required if the applicant's name is not in the SECC database.", obtainFromUrl: "https://serviceonline.gov.in", submitToUrl: "https://pmjay.gov.in" },
      { name: "Disability Certificate", description: "Certificate confirming the nature and percentage of disability.", isMandatory: false, condition: "Required if the applicant is claiming additional benefits available to persons with disabilities.", obtainFromUrl: "https://swavlambancard.gov.in", submitToUrl: "https://pmjay.gov.in" },
    ],
  },
  {
    id: "doclist-national-scholarship", serviceOrSchemeId: "national-scholarship",
    documents: [
      { name: "Aadhaar Card", description: "Mandatory identity proof for scholarship disbursement.", isMandatory: true, obtainFromUrl: "https://uidai.gov.in", submitToUrl: "https://scholarships.gov.in" },
      { name: "Previous Year Mark Sheet", description: "Mark sheet of the last qualifying examination.", isMandatory: true, obtainFromUrl: "https://www.india.gov.in", submitToUrl: "https://scholarships.gov.in" },
      { name: "Income Certificate", description: "Certificate from a competent authority confirming the family's annual income.", isMandatory: true, obtainFromUrl: "https://serviceonline.gov.in", submitToUrl: "https://scholarships.gov.in" },
      { name: "Bank Account Details", description: "Bank passbook or cancelled cheque for scholarship disbursement.", isMandatory: true, obtainFromUrl: "https://www.india.gov.in", submitToUrl: "https://scholarships.gov.in" },
      { name: "Caste Certificate", description: "Certificate confirming the applicant's caste category (SC/ST/OBC).", isMandatory: false, condition: "Required if applying under a caste-specific scholarship category.", obtainFromUrl: "https://serviceonline.gov.in", submitToUrl: "https://scholarships.gov.in" },
      { name: "Disability Certificate", description: "Certificate confirming the nature and percentage of disability.", isMandatory: false, condition: "Required if applying under the scholarship category for persons with disabilities.", obtainFromUrl: "https://swavlambancard.gov.in", submitToUrl: "https://scholarships.gov.in" },
    ],
  },
];

// ─── Repository ───────────────────────────────────────────────────────────────

export class DocumentRegistryRepository {
  private readonly documentLists: DocumentList[];

  constructor(documentLists: DocumentList[] = DOCUMENT_LISTS) {
    this.documentLists = documentLists;
  }

  /**
   * Factory: create a repository loaded from the Python backend.
   * Falls back to seed data if the backend is unreachable.
   */
  static async fromBackend(): Promise<DocumentRegistryRepository> {
    try {
      const docs = await getDocuments();
      return new DocumentRegistryRepository(Array.isArray(docs) ? docs : DOCUMENT_LISTS);
    } catch {
      console.warn("[DocumentRegistryRepository] Backend unavailable, using seed data.");
      return new DocumentRegistryRepository();
    }
  }

  getDocumentList(serviceOrSchemeId: string): DocumentList | null {
    return this.documentLists.find((dl) => dl.serviceOrSchemeId === serviceOrSchemeId) ?? null;
  }
}
