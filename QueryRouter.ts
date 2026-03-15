import type {
  IntentType,
  Message,
  PageContext,
  EligibilityInput,
  ChatResponse,
} from "../types/index.js";
import type { QAService } from "../qa/QAService.js";
import type { EligibilityEngine } from "../eligibility/EligibilityEngine.js";
import type { DocumentRegistryService } from "../documents/DocumentRegistryService.js";
import type { NavigationService } from "../navigation/NavigationService.js";
import type { PageSummarizer } from "../summarizer/PageSummarizer.js";

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Extract a service/scheme ID from a message using simple keyword matching.
 * Falls back to the raw message if no known ID is found.
 */
function extractServiceId(message: string): string {
  const lower = message.toLowerCase();
  // Common service/scheme IDs from the knowledge base
  const knownIds: [string, string][] = [
    ["passport", "passport-application"],
    ["driving license", "driving-license"],
    ["driving licence", "driving-license"],
    ["aadhaar", "aadhaar-enrollment"],
    ["voter id", "voter-id"],
    ["pan card", "pan-card"],
    ["ration card", "ration-card"],
    ["birth certificate", "birth-certificate"],
  ];

  for (const [keyword, id] of knownIds) {
    if (lower.includes(keyword)) return id;
  }

  // Return the message itself as a last-resort ID lookup
  return message.trim();
}

function formatEligibilityResponse(
  result: ReturnType<EligibilityEngine["evaluate"]>
): ChatResponse {
  if (result.type === "missing_fields") {
    return {
      sessionId: "",
      reply: `To check your eligibility, I need a few more details. Please provide: ${result.missingFields.join(", ")}.`,
      replyType: "clarification",
    };
  }

  if (result.type === "no_match") {
    return {
      sessionId: "",
      reply: result.message,
      replyType: "text",
    };
  }

  // match
  const schemeNames = result.schemes.map((s) => s.name).join(", ");
  return {
    sessionId: "",
    reply: `Based on your details, you may be eligible for the following schemes: ${schemeNames}.`,
    replyType: "list",
    metadata: { matchedSchemes: result.schemes },
  };
}

function formatNavigationResponse(
  result: ReturnType<NavigationService["navigate"]>
): ChatResponse {
  if (result.type === "fallback") {
    return {
      sessionId: "",
      reply: result.message,
      replyType: "navigation",
      metadata: { navigationSteps: result.steps },
    };
  }

  return {
    sessionId: "",
    reply: "Here are the navigation steps to help you:",
    replyType: "navigation",
    metadata: { navigationSteps: result.steps },
  };
}

function formatDocumentResponse(
  result: ReturnType<DocumentRegistryService["getDocuments"]>
): ChatResponse {
  if (result.type === "not_found") {
    return {
      sessionId: "",
      reply: result.message,
      replyType: "text",
    };
  }

  const mandatory = result.documentList.documents.filter((d) => d.isMandatory);
  const conditional = result.documentList.documents.filter((d) => !d.isMandatory);
  const lines: string[] = ["Here are the required documents:"];
  mandatory.forEach((d) => lines.push(`• ${d.name} (mandatory)`));
  conditional.forEach((d) => lines.push(`• ${d.name} (if applicable: ${d.condition ?? ""})`));

  return {
    sessionId: "",
    reply: lines.join("\n"),
    replyType: "list",
    metadata: { documentList: result.documentList },
  };
}

async function formatSummaryResponse(
  result: Awaited<ReturnType<PageSummarizer["summarize"]>>
): Promise<ChatResponse> {
  if (result.type === "low_confidence") {
    return {
      sessionId: "",
      reply: result.message,
      replyType: "text",
    };
  }

  return {
    sessionId: "",
    reply: result.content,
    replyType: "summary",
  };
}

// ─── QueryRouter ──────────────────────────────────────────────────────────────

export class QueryRouter {
  constructor(
    private readonly qaService: QAService,
    private readonly eligibilityEngine: EligibilityEngine,
    private readonly documentService: DocumentRegistryService,
    private readonly navigationService: NavigationService,
    private readonly pageSummarizer: PageSummarizer
  ) {}

  async route(
    intent: IntentType,
    message: string,
    sessionHistory?: Message[],
    pageContext?: PageContext,
    eligibilityInput?: Partial<EligibilityInput>
  ): Promise<ChatResponse> {
    switch (intent) {
      case "GOVT_SERVICE_QA":
        return this.qaService.query(message, sessionHistory);

      case "ELIGIBILITY_DISCOVERY": {
        const result = this.eligibilityEngine.evaluate(eligibilityInput ?? {});
        return formatEligibilityResponse(result);
      }

      case "DOCUMENT_REQUIREMENTS": {
        const serviceId = extractServiceId(message);
        const result = this.documentService.getDocuments(serviceId);
        return formatDocumentResponse(result);
      }

      case "NAVIGATION_GUIDANCE": {
        const result = this.navigationService.navigate(message, pageContext);
        return formatNavigationResponse(result);
      }

      case "PAGE_SUMMARIZATION": {
        if (!pageContext) {
          return {
            sessionId: "",
            reply: "I need the current page content to summarize it. Please make sure the page context is provided.",
            replyType: "text",
          };
        }
        const result = await this.pageSummarizer.summarize(pageContext);
        return formatSummaryResponse(result);
      }

      case "FOLLOW_UP":
        return this.qaService.query(message, sessionHistory);

      case "UNKNOWN":
      default:
        return {
          sessionId: "",
          reply:
            "I'm not sure I understood your question. Could you rephrase it? " +
            "For example, you can ask: \"How do I apply for a passport?\", " +
            "\"What schemes am I eligible for?\", or \"What documents do I need for a driving license?\"",
          replyType: "text",
        };
    }
  }
}
