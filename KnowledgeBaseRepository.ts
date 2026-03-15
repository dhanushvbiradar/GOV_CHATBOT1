import type { GovernmentService, Scheme } from "../types/index.js";
import { getServices, getSchemes } from "../services/govDataService.js";

// ─── Seed Data (fallback) ─────────────────────────────────────────────────────

const SERVICES: GovernmentService[] = [
  {
    id: "passport-application",
    name: "Passport Application",
    aliases: ["passport", "travel document", "international travel", "apply passport"],
    description: "Apply for a new Indian passport or renew an existing one through the Passport Seva portal.",
    officialPortalUrl: "https://www.passportindia.gov.in",
    relatedServiceIds: ["driving-license", "aadhaar-card"],
    applicationSteps: [
      { order: 1, title: "Register on Passport Seva Portal", description: "Create an account at passportindia.gov.in using your email address.", expandedDetail: "Visit https://www.passportindia.gov.in and click 'New User Registration'. Fill in your name, date of birth, email, and login ID. Verify your email to activate the account." },
      { order: 2, title: "Fill the Online Application Form", description: "Log in and complete the passport application form (Form-1).", expandedDetail: "Select 'Apply for Fresh Passport/Re-issue of Passport'. Choose the booklet type (36 or 60 pages) and validity. Fill in personal details, family details, emergency contact, and previous passport details if applicable." },
      { order: 3, title: "Schedule an Appointment", description: "Book an appointment at your nearest Passport Seva Kendra (PSK) or Post Office PSK.", expandedDetail: "After submitting the form, click 'Schedule Appointment'. Select your city, preferred PSK, and an available date/time slot. Note the Application Reference Number (ARN)." },
      { order: 4, title: "Pay the Application Fee", description: "Pay the applicable fee online via net banking, credit/debit card, or UPI.", expandedDetail: "Fee for a 36-page passport (normal) is ₹1,500; for 60 pages it is ₹2,000. Tatkaal (urgent) fees are higher. Payment confirmation is sent to your registered email." },
      { order: 5, title: "Visit PSK and Submit Documents", description: "Attend your appointment with original documents and photocopies for verification.", expandedDetail: "Carry the printed appointment letter, original Aadhaar/PAN/Voter ID, address proof, and date-of-birth proof. Biometrics (photo and fingerprints) are captured at the PSK." },
      { order: 6, title: "Track Application and Receive Passport", description: "Track your application status online; passport is dispatched by Speed Post.", expandedDetail: "Use the ARN on the Passport Seva portal or SMS 'STATUS <ARN>' to 9704100100. Normal processing takes 30–45 days; Tatkaal takes 1–3 working days after police verification." },
    ],
  },
  {
    id: "driving-license",
    name: "Driving License",
    aliases: ["driving licence", "DL", "driver license", "learner license", "LL", "motor vehicle license"],
    description: "Apply for a learner's licence or a permanent driving licence through the Parivahan Sewa portal.",
    officialPortalUrl: "https://parivahan.gov.in",
    relatedServiceIds: ["passport-application", "aadhaar-card"],
    applicationSteps: [
      { order: 1, title: "Apply for Learner's Licence", description: "Register on parivahan.gov.in and fill the learner's licence application (Form 1 & 2).", expandedDetail: "Visit https://parivahan.gov.in → 'Driving Licence Related Services' → select your state. Click 'Apply for Learner Licence'. Fill personal details, vehicle category, and upload documents." },
      { order: 2, title: "Pay Fee and Book LL Test Slot", description: "Pay the learner's licence fee and schedule the online/offline test at your RTO.", expandedDetail: "Fee is approximately ₹200 (varies by state). The test covers traffic rules and road signs. Online tests are available in most states; otherwise visit the RTO on the scheduled date." },
      { order: 3, title: "Pass the Learner's Licence Test", description: "Appear for the computer-based or written test at the RTO.", expandedDetail: "The test has 15–20 multiple-choice questions. A score of 60% or above is required to pass. The learner's licence is valid for 6 months." },
      { order: 4, title: "Practice Driving for 30 Days", description: "Drive under supervision with your learner's licence for at least 30 days.", expandedDetail: "You must be accompanied by a licensed driver. Display 'L' plates on the vehicle. This mandatory period ensures you gain practical experience before the driving test." },
      { order: 5, title: "Apply for Permanent Driving Licence", description: "After 30 days, apply for the permanent DL and schedule a driving test at the RTO.", expandedDetail: "Log in to parivahan.gov.in, select 'Apply for Driving Licence', upload the learner's licence, and book a driving test slot. Carry original documents on the test day." },
      { order: 6, title: "Appear for Driving Test and Collect DL", description: "Pass the driving test at the RTO; the DL is dispatched by post or collected in person.", expandedDetail: "The test evaluates vehicle control, road sense, and adherence to traffic rules. On passing, the DL is either mailed to your address or available for collection at the RTO within 7 working days." },
    ],
  },
  {
    id: "aadhaar-card",
    name: "Aadhaar Card",
    aliases: ["aadhaar", "aadhar", "UID", "unique identification", "biometric ID", "UIDAI"],
    description: "Enrol for a new Aadhaar card or update existing Aadhaar details through UIDAI-authorised enrolment centres.",
    officialPortalUrl: "https://uidai.gov.in",
    relatedServiceIds: ["passport-application", "driving-license"],
    applicationSteps: [
      { order: 1, title: "Locate an Enrolment Centre", description: "Find the nearest UIDAI-authorised Aadhaar enrolment centre.", expandedDetail: "Visit https://appointments.uidai.gov.in to locate enrolment centres near you. Centres are available at post offices, banks, and government offices. Book an appointment online to avoid long queues." },
      { order: 2, title: "Fill the Enrolment Form", description: "Obtain and fill the Aadhaar Enrolment/Correction Form at the centre.", expandedDetail: "The form requires your full name, date of birth, gender, address, and mobile number. Forms are available at the centre or can be downloaded from uidai.gov.in." },
      { order: 3, title: "Submit Documents", description: "Submit proof of identity (POI) and proof of address (POA) documents.", expandedDetail: "Acceptable POI documents include PAN card, passport, voter ID, and driving licence. Acceptable POA documents include utility bills, bank statements, and ration card. Originals are verified and returned." },
      { order: 4, title: "Biometric Capture", description: "Provide fingerprints, iris scan, and photograph at the enrolment centre.", expandedDetail: "All ten fingerprints and both iris scans are captured. A photograph is taken. This biometric data is used to ensure uniqueness and prevent duplicate enrolments." },
      { order: 5, title: "Receive Enrolment ID", description: "Collect the enrolment acknowledgement slip with a 14-digit Enrolment ID (EID).", expandedDetail: "The EID is used to track your Aadhaar application status at https://uidai.gov.in. Processing typically takes 90 days. An SMS is sent to your registered mobile number when the Aadhaar is generated." },
      { order: 6, title: "Download or Receive Aadhaar", description: "Download e-Aadhaar from the UIDAI portal or receive the physical card by post.", expandedDetail: "Visit https://eaadhaar.uidai.gov.in to download your e-Aadhaar using your EID or Aadhaar number. The physical Aadhaar letter is sent to your registered address by India Post." },
    ],
  },
];

const SCHEMES: Scheme[] = [
  {
    id: "pm-kisan", name: "PM Kisan Samman Nidhi",
    purpose: "Provide income support to small and marginal farmers to supplement their financial needs for procuring inputs related to agriculture.",
    benefitDescription: "₹6,000 per year paid in three equal instalments of ₹2,000 directly to the farmer's bank account.",
    officialPortalUrl: "https://pmkisan.gov.in", documentListId: "doclist-pm-kisan",
    eligibilityCriteria: [
      { field: "occupation", operator: "eq", value: "farmer" },
      { field: "landHoldingAcres", operator: "lte", value: 5 },
      { field: "annualIncome", operator: "lt", value: 200000 },
      { field: "residencyStatus", operator: "in", value: ["citizen", "resident"] },
    ],
  },
  {
    id: "ayushman-bharat", name: "Ayushman Bharat PM-JAY",
    purpose: "Provide health coverage to economically vulnerable families for secondary and tertiary hospitalisation.",
    benefitDescription: "Health cover of ₹5 lakh per family per year for hospitalisation expenses at empanelled public and private hospitals.",
    officialPortalUrl: "https://pmjay.gov.in", documentListId: "doclist-ayushman-bharat",
    eligibilityCriteria: [
      { field: "annualIncome", operator: "lte", value: 100000 },
      { field: "residencyStatus", operator: "in", value: ["citizen", "resident"] },
      { field: "age", operator: "gte", value: 0 },
    ],
  },
  {
    id: "national-scholarship", name: "National Scholarship Portal Scheme",
    purpose: "Support meritorious students from economically weaker sections to pursue higher education without financial burden.",
    benefitDescription: "Scholarship ranging from ₹10,000 to ₹50,000 per year depending on the course and institution level.",
    officialPortalUrl: "https://scholarships.gov.in", documentListId: "doclist-national-scholarship",
    eligibilityCriteria: [
      { field: "age", operator: "lte", value: 25 },
      { field: "annualIncome", operator: "lt", value: 250000 },
      { field: "residencyStatus", operator: "eq", value: "citizen" },
      { field: "gender", operator: "in", value: ["male", "female", "other"] },
    ],
  },
];

// ─── Repository ───────────────────────────────────────────────────────────────

export class KnowledgeBaseRepository {
  private readonly services: GovernmentService[];
  private readonly schemes: Scheme[];

  constructor(services: GovernmentService[] = SERVICES, schemes: Scheme[] = SCHEMES) {
    this.services = services;
    this.schemes = schemes;
  }

  /**
   * Factory: create a repository loaded from the Python backend.
   * Falls back to seed data if the backend is unreachable.
   */
  static async fromBackend(): Promise<KnowledgeBaseRepository> {
    try {
      const [services, schemes] = await Promise.all([getServices(), getSchemes()]);
      return new KnowledgeBaseRepository(
        Array.isArray(services) ? services : SERVICES,
        Array.isArray(schemes) ? schemes : SCHEMES
      );
    } catch {
      console.warn("[KnowledgeBaseRepository] Backend unavailable, using seed data.");
      return new KnowledgeBaseRepository();
    }
  }

  findServiceByQuery(query: string): GovernmentService[] {
    const q = query.toLowerCase();
    return this.services.filter((svc) => {
      const nameMatch = svc.name.toLowerCase().includes(q);
      const aliasMatch = svc.aliases.some((alias) => alias.toLowerCase().includes(q));
      return nameMatch || aliasMatch;
    });
  }

  findServiceById(id: string): GovernmentService | null {
    return this.services.find((svc) => svc.id === id) ?? null;
  }

  findSchemeById(id: string): Scheme | null {
    return this.schemes.find((s) => s.id === id) ?? null;
  }

  getAllSchemes(): Scheme[] {
    return [...this.schemes];
  }
}
