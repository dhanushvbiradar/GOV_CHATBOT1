import { describe, it, expect, vi, beforeEach } from "vitest";
import { QueryRouter } from "./QueryRouter.js";
import type { QAService } from "../qa/QAService.js";
import type { EligibilityEngine } from "../eligibility/EligibilityEngine.js";
import type { DocumentRegistryService } from "../documents/DocumentRegistryService.js";
import type { NavigationService } from "../navigation/NavigationService.js";
import type { PageSummarizer } from "../summarizer/PageSummarizer.js";
import type { ChatResponse, Message, PageContext } from "../types/index.js";

// ─── Mock Factories ───────────────────────────────────────────────────────────

function makeQAService(reply = "QA reply"): QAService {
  return {
    query: vi.fn().mockResolvedValue({
      sessionId: "",
      reply,
      replyType: "text",
    } satisfies ChatResponse),
  } as unknown as QAService;
}

function makeEligibilityEngine(): EligibilityEngine {
  return {
    evaluate: vi.fn().mockReturnValue({
      type: "match",
      schemes: [
        {
          id: "scheme-1",
          name: "PM Kisan",
          purpose: "Farmer income support",
          benefitDescription: "₹6000/year",
          eligibilityCriteria: [],
          officialPortalUrl: "https://pmkisan.gov.in",
          documentListId: "doc-1",
        },
      ],
    }),
  } as unknown as EligibilityEngine;
}

function makeDocumentService(): DocumentRegistryService {
  return {
    getDocuments: vi.fn().mockReturnValue({
      type: "found",
      documentList: {
        id: "doc-1",
        serviceOrSchemeId: "passport-application",
        documents: [
          { name: "Aadhaar Card", description: "Identity proof", isMandatory: true, obtainFromUrl: "https://uidai.gov.in" },
        ],
      },
    }),
  } as unknown as DocumentRegistryService;
}

function makeNavigationService(): NavigationService {
  return {
    navigate: vi.fn().mockReturnValue({
      type: "steps",
      steps: [{ order: 1, instruction: "Click Apply", elementType: "button", elementLabel: "Apply" }],
      portalUrl: "https://example.gov.in",
    }),
  } as unknown as NavigationService;
}

function makePageSummarizer(): PageSummarizer {
  return {
    summarize: vi.fn().mockResolvedValue({
      type: "summary",
      content: "This page is for passport applications.",
      highlights: [],
    }),
  } as unknown as PageSummarizer;
}

function makeRouter(overrides: {
  qa?: QAService;
  eligibility?: EligibilityEngine;
  docs?: DocumentRegistryService;
  nav?: NavigationService;
  summarizer?: PageSummarizer;
} = {}): { router: QueryRouter; qa: QAService; eligibility: EligibilityEngine; docs: DocumentRegistryService; nav: NavigationService; summarizer: PageSummarizer } {
  const qa = overrides.qa ?? makeQAService();
  const eligibility = overrides.eligibility ?? makeEligibilityEngine();
  const docs = overrides.docs ?? makeDocumentService();
  const nav = overrides.nav ?? makeNavigationService();
  const summarizer = overrides.summarizer ?? makePageSummarizer();
  return { router: new QueryRouter(qa, eligibility, docs, nav, summarizer), qa, eligibility, docs, nav, summarizer };
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("QueryRouter", () => {
  it("routes GOVT_SERVICE_QA to QAService", async () => {
    const { router, qa } = makeRouter();

    const result = await router.route("GOVT_SERVICE_QA", "How do I apply for a passport?");

    expect(qa.query).toHaveBeenCalledWith("How do I apply for a passport?", undefined);
    expect(result.replyType).toBe("text");
  });

  it("routes ELIGIBILITY_DISCOVERY to EligibilityEngine", async () => {
    const { router, eligibility } = makeRouter();

    const result = await router.route("ELIGIBILITY_DISCOVERY", "What schemes am I eligible for?", undefined, undefined, { age: 30, annualIncome: 50000 });

    expect(eligibility.evaluate).toHaveBeenCalledWith({ age: 30, annualIncome: 50000 });
    expect(result.replyType).toBe("list");
    expect(result.metadata?.matchedSchemes).toBeDefined();
  });

  it("routes ELIGIBILITY_DISCOVERY with empty input when no eligibilityInput provided", async () => {
    const { router, eligibility } = makeRouter();

    await router.route("ELIGIBILITY_DISCOVERY", "Am I eligible for anything?");

    expect(eligibility.evaluate).toHaveBeenCalledWith({});
  });

  it("routes DOCUMENT_REQUIREMENTS to DocumentRegistryService", async () => {
    const { router, docs } = makeRouter();

    const result = await router.route("DOCUMENT_REQUIREMENTS", "What documents do I need for a passport?");

    expect(docs.getDocuments).toHaveBeenCalled();
    expect(result.replyType).toBe("list");
    expect(result.metadata?.documentList).toBeDefined();
  });

  it("routes NAVIGATION_GUIDANCE to NavigationService", async () => {
    const { router, nav } = makeRouter();
    const pageContext: PageContext = { url: "https://passportindia.gov.in", visibleText: "Apply here" };

    const result = await router.route("NAVIGATION_GUIDANCE", "How do I find the apply button?", undefined, pageContext);

    expect(nav.navigate).toHaveBeenCalledWith("How do I find the apply button?", pageContext);
    expect(result.replyType).toBe("navigation");
    expect(result.metadata?.navigationSteps).toBeDefined();
  });

  it("routes PAGE_SUMMARIZATION to PageSummarizer", async () => {
    const { router, summarizer } = makeRouter();
    const pageContext: PageContext = { url: "https://gov.in/passport", visibleText: "This page allows you to apply for a passport renewal online." };

    const result = await router.route("PAGE_SUMMARIZATION", "Summarize this page", undefined, pageContext);

    expect(summarizer.summarize).toHaveBeenCalledWith(pageContext);
    expect(result.replyType).toBe("summary");
  });

  it("returns text response asking to rephrase for UNKNOWN intent", async () => {
    const { router } = makeRouter();

    const result = await router.route("UNKNOWN", "asdfghjkl");

    expect(result.replyType).toBe("text");
    expect(result.reply.length).toBeGreaterThan(0);
    expect(result.reply.toLowerCase()).toMatch(/rephrase|understand|example/);
  });

  it("routes FOLLOW_UP to QAService with session history", async () => {
    const { router, qa } = makeRouter();
    const history: Message[] = [
      { role: "citizen", content: "How do I apply for a passport?", timestamp: Date.now() - 2000 },
      { role: "assistant", content: "Here are the steps...", timestamp: Date.now() - 1000 },
    ];

    const result = await router.route("FOLLOW_UP", "Tell me more about it", history);

    expect(qa.query).toHaveBeenCalledWith("Tell me more about it", history);
    expect(result.replyType).toBe("text");
  });

  it("returns text response for PAGE_SUMMARIZATION when no pageContext provided", async () => {
    const { router, summarizer } = makeRouter();

    const result = await router.route("PAGE_SUMMARIZATION", "Summarize this page");

    expect(summarizer.summarize).not.toHaveBeenCalled();
    expect(result.replyType).toBe("text");
  });

  it("formats eligibility missing_fields as clarification response", async () => {
    const eligibility = {
      evaluate: vi.fn().mockReturnValue({ type: "missing_fields", missingFields: ["age", "annualIncome"] }),
    } as unknown as EligibilityEngine;
    const { router } = makeRouter({ eligibility });

    const result = await router.route("ELIGIBILITY_DISCOVERY", "Am I eligible?");

    expect(result.replyType).toBe("clarification");
    expect(result.reply).toContain("age");
    expect(result.reply).toContain("annualIncome");
  });

  it("all responses have sessionId as empty string", async () => {
    const { router } = makeRouter();
    const pageContext: PageContext = { url: "https://gov.in", visibleText: "page content here" };

    const intents = ["GOVT_SERVICE_QA", "ELIGIBILITY_DISCOVERY", "DOCUMENT_REQUIREMENTS", "NAVIGATION_GUIDANCE", "UNKNOWN", "FOLLOW_UP"] as const;
    for (const intent of intents) {
      const result = await router.route(intent, "test message", [], pageContext, {});
      expect(result.sessionId).toBe("");
    }
  });
});
