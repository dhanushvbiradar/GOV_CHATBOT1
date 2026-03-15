import { describe, it, expect, vi } from "vitest";
import { IntentClassifier, type LLMClient } from "./IntentClassifier.js";
import type { Message } from "../types/index.js";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeLLM(response: string): LLMClient {
  return { complete: vi.fn().mockResolvedValue(response) };
}

function makeFailingLLM(): LLMClient {
  return { complete: vi.fn().mockRejectedValue(new Error("LLM error")) };
}

function makeHistory(...contents: string[]): Message[] {
  return contents.map((content, i) => ({
    role: i % 2 === 0 ? "citizen" : "assistant",
    content,
    timestamp: Date.now() - (contents.length - i) * 1000,
  }));
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("IntentClassifier", () => {
  it("returns GOVT_SERVICE_QA with high confidence when LLM responds accordingly", async () => {
    const llm = makeLLM('{"intent": "GOVT_SERVICE_QA", "confidence": 0.95}');
    const classifier = new IntentClassifier(llm);

    const result = await classifier.classify("How do I apply for a passport?");

    expect(result.intent).toBe("GOVT_SERVICE_QA");
    expect(result.confidence).toBe(0.95);
  });

  it("returns UNKNOWN when LLM confidence is below 0.5", async () => {
    const llm = makeLLM('{"intent": "ELIGIBILITY_DISCOVERY", "confidence": 0.3}');
    const classifier = new IntentClassifier(llm);

    const result = await classifier.classify("something vague");

    expect(result.intent).toBe("UNKNOWN");
    expect(result.confidence).toBe(0.3);
  });

  it("returns FOLLOW_UP with confidence 0.8 for short message referencing 'it' with session history", async () => {
    const llm = makeLLM('{"intent": "GOVT_SERVICE_QA", "confidence": 0.9}');
    const classifier = new IntentClassifier(llm);
    const history = makeHistory("How do I apply for a passport?", "Here are the steps...");

    const result = await classifier.classify("Tell me more about it", history);

    expect(result.intent).toBe("FOLLOW_UP");
    expect(result.confidence).toBe(0.8);
    // LLM should not be called for follow-up detection
    expect(llm.complete).not.toHaveBeenCalled();
  });

  it("returns FOLLOW_UP for short message referencing 'that' with session history", async () => {
    const llm = makeLLM('{"intent": "GOVT_SERVICE_QA", "confidence": 0.9}');
    const classifier = new IntentClassifier(llm);
    const history = makeHistory("What documents do I need?", "You need these documents...");

    const result = await classifier.classify("Can you explain that?", history);

    expect(result.intent).toBe("FOLLOW_UP");
    expect(result.confidence).toBe(0.8);
  });

  it("does NOT return FOLLOW_UP for short message with 'it' when no session history", async () => {
    const llm = makeLLM('{"intent": "GOVT_SERVICE_QA", "confidence": 0.85}');
    const classifier = new IntentClassifier(llm);

    const result = await classifier.classify("Tell me more about it");

    expect(result.intent).toBe("GOVT_SERVICE_QA");
    expect(llm.complete).toHaveBeenCalledOnce();
  });

  it("returns UNKNOWN with confidence 0 when LLM throws an error", async () => {
    const classifier = new IntentClassifier(makeFailingLLM());

    const result = await classifier.classify("How do I apply for a passport?");

    expect(result.intent).toBe("UNKNOWN");
    expect(result.confidence).toBe(0);
  });

  it("returns UNKNOWN with confidence 0 when LLM response cannot be parsed", async () => {
    const llm = makeLLM("I cannot classify this message.");
    const classifier = new IntentClassifier(llm);

    const result = await classifier.classify("some message");

    expect(result.intent).toBe("UNKNOWN");
    expect(result.confidence).toBe(0);
  });

  it("returns UNKNOWN with confidence 0 for malformed JSON response", async () => {
    const llm = makeLLM("{intent: GOVT_SERVICE_QA, confidence: 0.9}");
    const classifier = new IntentClassifier(llm);

    const result = await classifier.classify("some message");

    expect(result.intent).toBe("UNKNOWN");
    expect(result.confidence).toBe(0);
  });

  it("correctly classifies DOCUMENT_REQUIREMENTS intent", async () => {
    const llm = makeLLM('{"intent": "DOCUMENT_REQUIREMENTS", "confidence": 0.88}');
    const classifier = new IntentClassifier(llm);

    const result = await classifier.classify("What documents do I need for a driving license?");

    expect(result.intent).toBe("DOCUMENT_REQUIREMENTS");
    expect(result.confidence).toBe(0.88);
  });
});
