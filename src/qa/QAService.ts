import type { ChatResponse, GovernmentService, Message, Step } from "../types/index.js";
import type { KnowledgeBaseRepository } from "../kb/KnowledgeBaseRepository.js";

// ─── LLM Client Interface ─────────────────────────────────────────────────────

export interface LLMClient {
  complete(prompt: string, timeoutMs?: number): Promise<string>;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function buildStepsPrompt(service: GovernmentService): string {
  const stepsText = service.applicationSteps
    .map((s) => `${s.order}. ${s.title}: ${s.description}`)
    .join("\n");
  return (
    `You are a helpful government services assistant. Explain the following steps for "${service.name}" ` +
    `in a clear, friendly, step-by-step format for a citizen:\n\n${stepsText}`
  );
}

function templateStepsResponse(service: GovernmentService): string {
  const lines = service.applicationSteps.map(
    (s) => `${s.order}. ${s.title} — ${s.description}`
  );
  return `Here are the steps for ${service.name}:\n\n${lines.join("\n")}`;
}

/**
 * Detect if the query is asking for more detail on a specific step.
 * Returns the matched Step or null.
 */
function detectStepDrillDown(query: string, service: GovernmentService): Step | null {
  const q = query.toLowerCase();

  // Check for "step N" or "step number N"
  const stepNumMatch = q.match(/\bstep\s+(\d+)\b/);
  if (stepNumMatch) {
    const num = parseInt(stepNumMatch[1], 10);
    const step = service.applicationSteps.find((s) => s.order === num);
    if (step) return step;
  }

  // Check for step title substring match
  for (const step of service.applicationSteps) {
    if (q.includes(step.title.toLowerCase())) {
      return step;
    }
  }

  return null;
}

// ─── QAService ────────────────────────────────────────────────────────────────

export class QAService {
  constructor(
    private readonly kb: KnowledgeBaseRepository,
    private readonly llm: LLMClient
  ) {}

  async query(userQuery: string, sessionHistory?: Message[]): Promise<ChatResponse> {
    let matches = this.kb.findServiceByQuery(userQuery);

    // If no direct match, try each word/token in the query to find a service
    if (matches.length === 0) {
      const tokens = userQuery.split(/\s+/).filter((t) => t.length > 2);
      for (const token of tokens) {
        const tokenMatches = this.kb.findServiceByQuery(token);
        if (tokenMatches.length === 1) {
          matches = tokenMatches;
          break;
        }
      }
    }

    // ── Multiple matches → clarification ──────────────────────────────────────
    if (matches.length > 1) {
      return {
        sessionId: "",
        reply: "Your query matches multiple services. Please clarify which one you mean:",
        replyType: "clarification",
        metadata: { matchedServices: matches.map((s) => s.name) },
      };
    }

    // ── No match → fallback with suggestions ──────────────────────────────────
    if (matches.length === 0) {
      const allServices = this.kb.findServiceByQuery("");
      const suggestions = allServices.slice(0, 3).map((s) => s.name);
      const suggestionText = suggestions.length > 0
        ? ` You might be looking for: ${suggestions.join(", ")}.`
        : " Please visit the official government portal for assistance.";
      return {
        sessionId: "",
        reply: `Sorry, I couldn't find a service matching your query.${suggestionText}`,
        replyType: "text",
      };
    }

    // ── Single match ──────────────────────────────────────────────────────────
    const service = matches[0];

    // Check for step drill-down request
    const drillStep = detectStepDrillDown(userQuery, service);
    if (drillStep) {
      const detail = drillStep.expandedDetail ?? drillStep.description;
      return {
        sessionId: "",
        reply: `Step ${drillStep.order} — ${drillStep.title}:\n\n${detail}`,
        replyType: "text",
      };
    }

    // Use LLM to format steps; fall back to template on failure/timeout
    let reply: string;
    try {
      const prompt = buildStepsPrompt(service);
      reply = await this.llm.complete(prompt, 4000);
    } catch {
      reply = templateStepsResponse(service);
    }

    return {
      sessionId: "",
      reply,
      replyType: "text",
    };
  }
}
