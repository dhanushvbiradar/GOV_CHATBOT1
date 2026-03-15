import { describe, it, expect } from "vitest";
import { NavigationService } from "./NavigationService.js";
import { KnowledgeBaseRepository } from "../kb/KnowledgeBaseRepository.js";
import type { GovernmentService } from "../types/index.js";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeService(overrides: Partial<GovernmentService> = {}): GovernmentService {
  return {
    id: "test-service",
    name: "Test Service",
    aliases: ["test"],
    description: "A test service",
    officialPortalUrl: "https://test.gov.in",
    relatedServiceIds: [],
    applicationSteps: [
      { order: 1, title: "Register Online", description: "Visit the portal and register." },
      { order: 2, title: "Fill Application Form", description: "Fill in the required details." },
      { order: 3, title: "Submit Documents", description: "Upload your documents." },
    ],
    ...overrides,
  };
}

// ─── Unit Tests ───────────────────────────────────────────────────────────────

describe("NavigationService", () => {
  describe("known action query", () => {
    it("returns steps type for a known service query", () => {
      const svc = new NavigationService();
      const result = svc.navigate("passport");
      expect(result.type).toBe("steps");
    });

    it("returns non-empty instruction strings for each step", () => {
      const svc = new NavigationService();
      const result = svc.navigate("passport");
      expect(result.steps.length).toBeGreaterThan(0);
      for (const step of result.steps) {
        expect(typeof step.instruction).toBe("string");
        expect(step.instruction.trim().length).toBeGreaterThan(0);
      }
    });

    it("each step has an elementType or elementLabel", () => {
      const svc = new NavigationService();
      const result = svc.navigate("driving license");
      for (const step of result.steps) {
        const hasElementType = step.elementType !== undefined;
        const hasElementLabel = step.elementLabel !== undefined && step.elementLabel.trim().length > 0;
        expect(hasElementType || hasElementLabel).toBe(true);
      }
    });

    it("includes officialPortalUrl in result for known service", () => {
      const svc = new NavigationService();
      const result = svc.navigate("aadhaar");
      expect(result.portalUrl).toBeDefined();
      expect(typeof result.portalUrl).toBe("string");
      expect((result.portalUrl as string).length).toBeGreaterThan(0);
    });

    it("portalUrl matches the service's known portal", () => {
      const svc = new NavigationService();
      const result = svc.navigate("passport");
      expect(result.portalUrl).toBe("https://www.passportindia.gov.in");
    });
  });

  describe("steps ordering", () => {
    it("steps are ordered sequentially starting from 1", () => {
      const svc = new NavigationService();
      const result = svc.navigate("passport");
      result.steps.forEach((step, idx) => {
        expect(step.order).toBe(idx + 1);
      });
    });

    it("steps order is sequential for driving license", () => {
      const svc = new NavigationService();
      const result = svc.navigate("driving licence");
      result.steps.forEach((step, idx) => {
        expect(step.order).toBe(idx + 1);
      });
    });
  });

  describe("fallback when action not found", () => {
    it("returns fallback type for unknown query", () => {
      const svc = new NavigationService();
      const result = svc.navigate("xyzzy-nonexistent-service-12345");
      expect(result.type).toBe("fallback");
    });

    it("fallback has a non-empty message", () => {
      const svc = new NavigationService();
      const result = svc.navigate("xyzzy-nonexistent-service-12345");
      if (result.type === "fallback") {
        expect(result.message.trim().length).toBeGreaterThan(0);
      }
    });

    it("fallback has at least one step", () => {
      const svc = new NavigationService();
      const result = svc.navigate("xyzzy-nonexistent-service-12345");
      expect(result.steps.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe("multiple matches", () => {
    it("returns fallback type when multiple services match", () => {
      // "license" matches both "driving-license" and potentially others;
      // use a custom KB with two services that share a keyword
      const svcA = makeService({
        id: "svc-a",
        name: "Alpha Service",
        aliases: ["common-keyword"],
      });
      const svcB = makeService({
        id: "svc-b",
        name: "Beta Service",
        aliases: ["common-keyword"],
      });
      const kb = new KnowledgeBaseRepository([svcA, svcB], []);
      const nav = new NavigationService(kb);
      const result = nav.navigate("common-keyword");
      expect(result.type).toBe("fallback");
    });

    it("fallback message lists all matched service names", () => {
      const svcA = makeService({ id: "svc-a", name: "Alpha Service", aliases: ["shared"] });
      const svcB = makeService({ id: "svc-b", name: "Beta Service", aliases: ["shared"] });
      const kb = new KnowledgeBaseRepository([svcA, svcB], []);
      const nav = new NavigationService(kb);
      const result = nav.navigate("shared");
      if (result.type === "fallback") {
        expect(result.message).toContain("Alpha Service");
        expect(result.message).toContain("Beta Service");
      }
    });

    it("multiple-match fallback still returns steps from the first match", () => {
      const svcA = makeService({ id: "svc-a", name: "Alpha Service", aliases: ["shared"] });
      const svcB = makeService({ id: "svc-b", name: "Beta Service", aliases: ["shared"] });
      const kb = new KnowledgeBaseRepository([svcA, svcB], []);
      const nav = new NavigationService(kb);
      const result = nav.navigate("shared");
      expect(result.steps.length).toBeGreaterThan(0);
    });
  });

  describe("pageContext integration", () => {
    it("includes page-specific hint when URL matches service portal domain", () => {
      const svc = new NavigationService();
      const result = svc.navigate("passport", {
        url: "https://www.passportindia.gov.in/apply",
        visibleText: "Apply for passport",
      });
      expect(result.steps.length).toBeGreaterThan(0);
      // At least one step should have the page-specific prefix
      const hasPageHint = result.steps.some((s) => s.instruction.startsWith("On this page:"));
      expect(hasPageHint).toBe(true);
    });

    it("does not add page hint when URL does not match service portal domain", () => {
      const svc = new NavigationService();
      const result = svc.navigate("passport", {
        url: "https://www.someothersite.com/page",
        visibleText: "Some other page",
      });
      const hasPageHint = result.steps.some((s) => s.instruction.startsWith("On this page:"));
      expect(hasPageHint).toBe(false);
    });
  });
});
