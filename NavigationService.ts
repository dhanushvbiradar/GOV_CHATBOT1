import type { NavigationStep, PageContext } from "../types/index.js";
import { KnowledgeBaseRepository } from "../kb/KnowledgeBaseRepository.js";

// ─── Result Types ─────────────────────────────────────────────────────────────

export type NavigationResult =
  | { type: "steps"; steps: NavigationStep[]; portalUrl?: string }
  | { type: "fallback"; steps: NavigationStep[]; portalUrl?: string; message: string };

// ─── Helpers ──────────────────────────────────────────────────────────────────

const GENERIC_HELP_STEPS: NavigationStep[] = [
  {
    order: 1,
    instruction: "Visit the official government services portal",
    elementType: "link",
    elementLabel: "Government Services Portal",
  },
  {
    order: 2,
    instruction: "Use the search bar to find the service you need",
    elementType: "field",
    elementLabel: "Search",
  },
  {
    order: 3,
    instruction: "Select the relevant service from the results",
    elementType: "link",
    elementLabel: "Service Result",
  },
];

const GENERAL_PORTAL_URL = "https://www.india.gov.in";

/**
 * Infer an elementType from a step title/description heuristic.
 */
function inferElementType(
  title: string,
  description: string
): "button" | "link" | "field" | "menu" {
  const text = `${title} ${description}`.toLowerCase();
  if (
    text.includes("click") ||
    text.includes("submit") ||
    text.includes("pay") ||
    text.includes("schedule") ||
    text.includes("book") ||
    text.includes("download")
  ) {
    return "button";
  }
  if (
    text.includes("visit") ||
    text.includes("portal") ||
    text.includes("website") ||
    text.includes("track") ||
    text.includes("log in") ||
    text.includes("register")
  ) {
    return "link";
  }
  if (
    text.includes("fill") ||
    text.includes("form") ||
    text.includes("enter") ||
    text.includes("upload") ||
    text.includes("provide")
  ) {
    return "field";
  }
  return "menu";
}

/**
 * Build a short actionable instruction from a step title.
 */
function buildInstruction(title: string): string {
  return `Click '${title}'`;
}

// ─── Service ──────────────────────────────────────────────────────────────────

export class NavigationService {
  private readonly kb: KnowledgeBaseRepository;

  constructor(kb: KnowledgeBaseRepository = new KnowledgeBaseRepository()) {
    this.kb = kb;
  }

  navigate(query: string, pageContext?: PageContext): NavigationResult {
    const matches = this.kb.findServiceByQuery(query);

    // No match — generic fallback
    if (matches.length === 0) {
      return {
        type: "fallback",
        steps: GENERIC_HELP_STEPS,
        portalUrl: GENERAL_PORTAL_URL,
        message:
          "We could not find a specific service matching your request. " +
          `Please visit the general portal at ${GENERAL_PORTAL_URL} for assistance.`,
      };
    }

    const service = matches[0];

    // Build NavigationStep[] from applicationSteps
    const steps: NavigationStep[] = service.applicationSteps.map((appStep) => {
      const elementType = inferElementType(appStep.title, appStep.description);
      const step: NavigationStep = {
        order: appStep.order,
        instruction: buildInstruction(appStep.title),
        elementType,
        elementLabel: appStep.title,
      };

      // If pageContext URL matches the service portal domain, add page-specific hint
      if (pageContext) {
        try {
          const pageHost = new URL(pageContext.url).hostname.replace(/^www\./, "");
          const portalHost = new URL(service.officialPortalUrl).hostname.replace(/^www\./, "");
          if (pageHost === portalHost) {
            step.instruction = `On this page: ${step.instruction}`;
          }
        } catch {
          // ignore invalid URLs
        }
      }

      return step;
    });

    // Multiple matches — return first service steps with fallback message
    if (matches.length > 1) {
      const matchedNames = matches.map((s) => s.name).join(", ");
      return {
        type: "fallback",
        steps,
        portalUrl: service.officialPortalUrl,
        message: `Multiple services matched your query: ${matchedNames}. Showing steps for "${service.name}".`,
      };
    }

    // Single match
    return {
      type: "steps",
      steps,
      portalUrl: service.officialPortalUrl,
    };
  }
}
