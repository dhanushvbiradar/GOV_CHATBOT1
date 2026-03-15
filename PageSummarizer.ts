import type { PageContext } from "../types/index.js";

// ─── LLM Client Interface ─────────────────────────────────────────────────────

export interface LLMClient {
  complete(prompt: string, timeoutMs?: number): Promise<string>;
}

// ─── Types ────────────────────────────────────────────────────────────────────

export interface PageHighlight {
  category: "required_field" | "document_upload" | "payment" | "submit_button";
  label: string;
}

export type SummaryResult =
  | { type: "summary"; content: string; highlights: PageHighlight[] }
  | { type: "low_confidence"; message: string };

// ─── Helpers ──────────────────────────────────────────────────────────────────

const MIN_VISIBLE_TEXT_LENGTH = 50;

function buildPrompt(ctx: PageContext): string {
  const fieldsSection =
    ctx.formFields && ctx.formFields.length > 0
      ? `\nForm fields present: ${ctx.formFields.join(", ")}`
      : "";

  return (
    `You are a helpful government services assistant. Summarize the following web page for a citizen.\n` +
    `URL: ${ctx.url}\n` +
    `Page content:\n${ctx.visibleText}` +
    fieldsSection +
    `\n\nProvide a concise summary covering:\n` +
    `1. The page's purpose\n` +
    `2. Main actions available\n` +
    `3. Key inputs required from the citizen\n` +
    `4. Form steps if present`
  );
}

function categorizeField(fieldName: string): PageHighlight["category"] {
  const lower = fieldName.toLowerCase();
  if (/upload|file|document/.test(lower)) return "document_upload";
  if (/pay|amount|fee/.test(lower)) return "payment";
  if (/submit|confirm/.test(lower)) return "submit_button";
  return "required_field";
}

function extractHighlights(formFields?: string[]): PageHighlight[] {
  if (!formFields || formFields.length === 0) return [];
  return formFields.map((field) => ({
    category: categorizeField(field),
    label: field,
  }));
}

function timeout(ms: number): Promise<never> {
  return new Promise((_, reject) =>
    setTimeout(() => reject(new Error(`Timed out after ${ms}ms`)), ms)
  );
}

// ─── PageSummarizer ───────────────────────────────────────────────────────────

export class PageSummarizer {
  constructor(private readonly llm: LLMClient) {}

  async summarize(pageContext: PageContext, timeoutMs = 5000): Promise<SummaryResult> {
    if (pageContext.visibleText.length < MIN_VISIBLE_TEXT_LENGTH) {
      return {
        type: "low_confidence",
        message: "Page content is too short to generate a reliable summary.",
      };
    }

    try {
      const prompt = buildPrompt(pageContext);
      const content = await Promise.race([
        this.llm.complete(prompt, timeoutMs),
        timeout(timeoutMs),
      ]);

      const highlights = extractHighlights(pageContext.formFields);

      return { type: "summary", content, highlights };
    } catch {
      return {
        type: "low_confidence",
        message: "Unable to summarize the page at this time. Please try asking a specific question.",
      };
    }
  }
}
