// ─── Intent ──────────────────────────────────────────────────────────────────

export type IntentType =
  | "GOVT_SERVICE_QA"
  | "ELIGIBILITY_DISCOVERY"
  | "DOCUMENT_REQUIREMENTS"
  | "NAVIGATION_GUIDANCE"
  | "PAGE_SUMMARIZATION"
  | "FOLLOW_UP"
  | "UNKNOWN";

// ─── Government Service ───────────────────────────────────────────────────────

export interface Step {
  order: number;
  title: string;
  description: string;
  /** For Req 1.5 drill-down */
  expandedDetail?: string;
}

export interface GovernmentService {
  id: string;
  /** e.g. "Passport Application" */
  name: string;
  /** Alternate names / keywords */
  aliases: string[];
  description: string;
  applicationSteps: Step[];
  officialPortalUrl: string;
  relatedServiceIds: string[];
}

// ─── Scheme & Eligibility ─────────────────────────────────────────────────────

export type EligibilityField =
  | "age"
  | "annualIncome"
  | "residencyStatus"
  | "gender"
  | "occupation"
  | string;

export interface EligibilityCriterion {
  field: EligibilityField;
  operator: "lt" | "lte" | "gt" | "gte" | "eq" | "in";
  value: number | string | string[];
}

export interface Scheme {
  id: string;
  name: string;
  purpose: string;
  /** Amount or type of benefit */
  benefitDescription: string;
  eligibilityCriteria: EligibilityCriterion[];
  officialPortalUrl: string;
  documentListId: string;
}

// ─── Document Registry ────────────────────────────────────────────────────────

export interface DocumentEntry {
  name: string;
  description: string;
  isMandatory: boolean;
  /** e.g. "Required if applicant is a minor" */
  condition?: string;
  obtainFromUrl?: string;
  submitToUrl?: string;
}

export interface DocumentList {
  id: string;
  serviceOrSchemeId: string;
  documents: DocumentEntry[];
}

// ─── Session & Conversation ───────────────────────────────────────────────────

export interface EligibilityInput {
  age?: number;
  annualIncome?: number;
  residencyStatus?: string;
  gender?: string;
  occupation?: string;
  [key: string]: unknown;
}

export interface Message {
  role: "citizen" | "assistant";
  content: string;
  /** Unix ms */
  timestamp: number;
  intent?: IntentType;
}

export interface Session {
  sessionId: string;
  /** BCP-47 tag e.g. "en", "hi", "ta" */
  language: string;
  conversationHistory: Message[];
  pendingEligibilityInput: Partial<EligibilityInput> | null;
  /** Unix ms */
  createdAt: number;
  lastActiveAt: number;
}

// ─── API Request / Response ───────────────────────────────────────────────────

export interface PageContext {
  url: string;
  visibleText: string;
  formFields?: string[];
}

export interface ChatRequest {
  /** null for new sessions */
  sessionId: string | null;
  message: string;
  pageContext?: PageContext;
}

export interface NavigationStep {
  order: number;
  /** e.g. "Click 'Apply Online'" */
  instruction: string;
  elementType?: "button" | "link" | "field" | "menu";
  elementLabel?: string;
}

export interface ChatResponse {
  sessionId: string;
  reply: string;
  replyType: "text" | "list" | "clarification" | "summary" | "navigation" | "error";
  metadata?: {
    matchedServices?: string[];
    matchedSchemes?: Scheme[];
    documentList?: DocumentList;
    navigationSteps?: NavigationStep[];
    /** CSS selectors or element descriptions */
    highlightTargets?: string[];
  };
}
