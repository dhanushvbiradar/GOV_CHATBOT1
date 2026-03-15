import { describe, it, expect, vi, beforeEach } from "vitest";
import { KnowledgeBaseRepository } from "../kb/KnowledgeBaseRepository.js";
import { QAService, type LLMClient } from "./QAService.js";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeLLM(response = "LLM formatted steps"): LLMClient {
  return { complete: vi.fn().mockResolvedValue(response) };
}

function makeTimingOutLLM(): LLMClient {
  return {
    complete: vi.fn().mockRejectedValue(new Error("LLM timeout")),
  };
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("QAService", () => {
  let kb: KnowledgeBaseRepository;

  beforeEach(() => {
    kb = new KnowledgeBaseRepository();
  });

  it("returns replyType 'text' with steps for a known service query", async () => {
    const llm = makeLLM("Here are the passport steps...");
    const svc = new QAService(kb, llm);

    const result = await svc.query("passport application");

    expect(result.replyType).toBe("text");
    expect(result.reply.length).toBeGreaterThan(0);
    expect(llm.complete).toHaveBeenCalledOnce();
  });

  it("returns replyType 'clarification' with matchedServices for an ambiguous query", async () => {
    // "license" matches both "Driving License" and potentially others — use a term
    // that matches multiple services. "card" matches Aadhaar Card; let's use a
    // custom KB with two overlapping services to guarantee ambiguity.
    const ambiguousKb = new KnowledgeBaseRepository(
      [
        {
          id: "svc-a",
          name: "Service Alpha",
          aliases: ["common keyword"],
          description: "Service A",
          applicationSteps: [{ order: 1, title: "Step 1", description: "Do step 1" }],
          officialPortalUrl: "https://example.com/a",
          relatedServiceIds: [],
        },
        {
          id: "svc-b",
          name: "Service Beta",
          aliases: ["common keyword"],
          description: "Service B",
          applicationSteps: [{ order: 1, title: "Step 1", description: "Do step 1" }],
          officialPortalUrl: "https://example.com/b",
          relatedServiceIds: [],
        },
      ],
      []
    );

    const llm = makeLLM();
    const svc = new QAService(ambiguousKb, llm);

    const result = await svc.query("common keyword");

    expect(result.replyType).toBe("clarification");
    expect(result.metadata?.matchedServices).toContain("Service Alpha");
    expect(result.metadata?.matchedServices).toContain("Service Beta");
    expect(llm.complete).not.toHaveBeenCalled();
  });

  it("returns replyType 'text' with a non-empty fallback for an unrecognized query", async () => {
    const llm = makeLLM();
    const svc = new QAService(kb, llm);

    const result = await svc.query("xyzzy unrecognized service 12345");

    expect(result.replyType).toBe("text");
    expect(result.reply.length).toBeGreaterThan(0);
    expect(llm.complete).not.toHaveBeenCalled();
  });

  it("falls back to template-based response when LLM times out", async () => {
    const llm = makeTimingOutLLM();
    const svc = new QAService(kb, llm);

    const result = await svc.query("passport");

    expect(result.replyType).toBe("text");
    // Template response includes the service name and step titles
    expect(result.reply).toContain("Passport Application");
    expect(result.reply).toContain("Register on Passport Seva Portal");
  });

  it("returns expandedDetail when citizen drills down on a step by number", async () => {
    const llm = makeLLM();
    const svc = new QAService(kb, llm);

    // "passport step 1" — KB matches "passport" and drill-down detects "step 1"
    const result = await svc.query("passport step 1");

    expect(result.replyType).toBe("text");
    expect(result.reply).toContain("passportindia.gov.in");
    // expandedDetail for step 1 mentions the registration URL
    expect(result.reply).toContain("New User Registration");
    expect(llm.complete).not.toHaveBeenCalled();
  });

  it("returns regular description when step has no expandedDetail", async () => {
    // Build a KB with a step that has no expandedDetail
    const simpleKb = new KnowledgeBaseRepository(
      [
        {
          id: "simple-svc",
          name: "Simple Service",
          aliases: ["simple"],
          description: "A simple service",
          applicationSteps: [
            {
              order: 1,
              title: "Fill the form",
              description: "Complete the application form online.",
              // no expandedDetail
            },
          ],
          officialPortalUrl: "https://example.com",
          relatedServiceIds: [],
        },
      ],
      []
    );

    const llm = makeLLM();
    const svc = new QAService(simpleKb, llm);

    // "simple step 1" — KB matches "simple" and drill-down detects "step 1"
    const result = await svc.query("simple step 1");

    expect(result.replyType).toBe("text");
    expect(result.reply).toContain("Complete the application form online.");
    expect(llm.complete).not.toHaveBeenCalled();
  });
});
