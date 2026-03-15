import { describe, it, expect, vi } from "vitest";
import { PageSummarizer } from "./PageSummarizer.js";
import type { LLMClient } from "./PageSummarizer.js";
import type { PageContext } from "../types/index.js";

const SUFFICIENT_TEXT =
  "This page allows citizens to apply for a passport renewal. " +
  "You must provide your current passport number, personal details, and upload a photo. " +
  "The fee is $110 and payment can be made online.";

function makeLLM(response: string): LLMClient {
  return { complete: vi.fn().mockResolvedValue(response) };
}

function makeSlowLLM(): LLMClient {
  return { complete: vi.fn().mockReturnValue(new Promise(() => {})) };
}

describe("PageSummarizer", () => {
  it("returns summary type for page with sufficient content", async () => {
    const llm = makeLLM("This page is for passport renewal. Fill in your details and pay the fee.");
    const summarizer = new PageSummarizer(llm);
    const ctx: PageContext = { url: "https://gov.example.com/passport", visibleText: SUFFICIENT_TEXT };

    const result = await summarizer.summarize(ctx);

    expect(result.type).toBe("summary");
    if (result.type === "summary") {
      expect(result.content.length).toBeGreaterThan(0);
    }
  });

  it("returns highlights for form fields", async () => {
    const llm = makeLLM("Apply for a passport by filling in the form.");
    const summarizer = new PageSummarizer(llm);
    const ctx: PageContext = {
      url: "https://gov.example.com/passport",
      visibleText: SUFFICIENT_TEXT,
      formFields: ["firstName", "lastName", "uploadPhoto", "paymentAmount", "submitForm"],
    };

    const result = await summarizer.summarize(ctx);

    expect(result.type).toBe("summary");
    if (result.type === "summary") {
      expect(result.highlights.length).toBe(5);
      const categories = result.highlights.map((h) => h.category);
      expect(categories).toContain("required_field");
      expect(categories).toContain("document_upload");
      expect(categories).toContain("payment");
      expect(categories).toContain("submit_button");
    }
  });

  it("maps document upload field to document_upload category", async () => {
    const llm = makeLLM("Upload your documents here.");
    const summarizer = new PageSummarizer(llm);
    const ctx: PageContext = {
      url: "https://gov.example.com/docs",
      visibleText: SUFFICIENT_TEXT,
      formFields: ["uploadBirthCertificate"],
    };

    const result = await summarizer.summarize(ctx);

    expect(result.type).toBe("summary");
    if (result.type === "summary") {
      expect(result.highlights[0].category).toBe("document_upload");
      expect(result.highlights[0].label).toBe("uploadBirthCertificate");
    }
  });

  it("maps payment field to payment category", async () => {
    const llm = makeLLM("Pay the application fee.");
    const summarizer = new PageSummarizer(llm);
    const ctx: PageContext = {
      url: "https://gov.example.com/pay",
      visibleText: SUFFICIENT_TEXT,
      formFields: ["feeAmount"],
    };

    const result = await summarizer.summarize(ctx);

    expect(result.type).toBe("summary");
    if (result.type === "summary") {
      expect(result.highlights[0].category).toBe("payment");
    }
  });

  it("returns low_confidence when visibleText is shorter than 50 chars", async () => {
    const llm = makeLLM("Some summary");
    const summarizer = new PageSummarizer(llm);
    const ctx: PageContext = { url: "https://gov.example.com", visibleText: "Too short" };

    const result = await summarizer.summarize(ctx);

    expect(result.type).toBe("low_confidence");
  });

  it("returns low_confidence when LLM throws an error", async () => {
    const llm: LLMClient = { complete: vi.fn().mockRejectedValue(new Error("LLM error")) };
    const summarizer = new PageSummarizer(llm);
    const ctx: PageContext = { url: "https://gov.example.com/passport", visibleText: SUFFICIENT_TEXT };

    const result = await summarizer.summarize(ctx);

    expect(result.type).toBe("low_confidence");
  });

  it("returns low_confidence when LLM never resolves (timeout enforced)", async () => {
    const summarizer = new PageSummarizer(makeSlowLLM());
    const ctx: PageContext = { url: "https://gov.example.com/passport", visibleText: SUFFICIENT_TEXT };

    const result = await summarizer.summarize(ctx, 50); // short timeout for test speed

    expect(result.type).toBe("low_confidence");
  }, 1000);
});
