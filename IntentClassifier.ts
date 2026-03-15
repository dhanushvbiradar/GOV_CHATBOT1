import type { IntentType, Message } from "../types/index.js";

// ─── LLM Client Interface ─────────────────────────────────────────────────────

export interface LLMClient {
  complete(prompt: string, timeoutMs?: number): Promise<string>;
}

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ClassificationResult {
  intent: IntentType;
  confidence: number; // 0.0 to 1.0
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const FOLLOW_UP_PATTERNS = /\b(it|that|this|the same|more|also)\b/i;

const CLASSIFICATION_PROMPT = `You are an intent classifier for a government services chatbot.
Classify the citizen's message into exactly one of these intents:

- GOVT_SERVICE_QA: Questions about how to apply for or use a government service (e.g. passport, driving license, aadhaar)
- ELIGIBILITY_DISCOVERY: Questions about which government schemes or benefits the citizen qualifies for
- DOCUMENT_REQUIREMENTS: Questions about what documents are needed for a service or scheme
- NAVIGATION_GUIDANCE: Requests for help navigating a government website or portal (e.g. "how do I find the apply button")
- PAGE_SUMMARIZATION: Requests to summarize or explain the current page content
- FOLLOW_UP: A follow-up question referencing a previous topic in the conversation
- UNKNOWN: The message does not fit any of the above categories

Respond with ONLY a JSON object in this exact format:
{"intent": "<INTENT_TYPE>", "confidence": <0.0 to 1.0>}`;

function isFollowUp(message: string, sessionHistory: Message[]): boolean {
  if (sessionHistory.length === 0) return false;
  const isShort = message.trim().split(/\s+/).length <= 8;
  return isShort && FOLLOW_UP_PATTERNS.test(message);
}

function parseClassificationResponse(raw: string): ClassificationResult | null {
  try {
    // Extract JSON from the response (handle markdown code blocks or extra text)
    const jsonMatch = raw.match(/\{[^}]+\}/);
    if (!jsonMatch) return null;

    const parsed = JSON.parse(jsonMatch[0]) as { intent?: unknown; confidence?: unknown };
    const intent = parsed.intent as IntentType;
    const confidence = typeof parsed.confidence === "number" ? parsed.confidence : null;

    const validIntents: IntentType[] = [
      "GOVT_SERVICE_QA",
      "ELIGIBILITY_DISCOVERY",
      "DOCUMENT_REQUIREMENTS",
      "NAVIGATION_GUIDANCE",
      "PAGE_SUMMARIZATION",
      "FOLLOW_UP",
      "UNKNOWN",
    ];

    if (!validIntents.includes(intent) || confidence === null) return null;

    return { intent, confidence };
  } catch {
    return null;
  }
}

// ─── IntentClassifier ─────────────────────────────────────────────────────────

export class IntentClassifier {
  constructor(private readonly llm: LLMClient) {}

  async classify(message: string, sessionHistory: Message[] = []): Promise<ClassificationResult> {
    // Check for follow-up pattern before calling LLM
    if (isFollowUp(message, sessionHistory)) {
      return { intent: "FOLLOW_UP", confidence: 0.8 };
    }

    try {
      const prompt = `${CLASSIFICATION_PROMPT}\n\nCitizen message: "${message}"`;
      const raw = await this.llm.complete(prompt, 3000);
      const result = parseClassificationResponse(raw);

      if (!result) {
        return { intent: "UNKNOWN", confidence: 0 };
      }

      if (result.confidence < 0.5) {
        return { intent: "UNKNOWN", confidence: result.confidence };
      }

      return result;
    } catch {
      return { intent: "UNKNOWN", confidence: 0 };
    }
  }
}
