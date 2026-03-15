import { describe, it, expect, beforeEach } from "vitest";
import { EligibilityEngine } from "./EligibilityEngine.js";
import { KnowledgeBaseRepository } from "../kb/KnowledgeBaseRepository.js";
import type { Scheme } from "../types/index.js";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeScheme(id: string, criteria: Scheme["eligibilityCriteria"]): Scheme {
  return {
    id,
    name: `Scheme ${id}`,
    purpose: `Purpose of ${id}`,
    benefitDescription: `Benefit of ${id}`,
    eligibilityCriteria: criteria,
    officialPortalUrl: `https://example.gov.in/${id}`,
    documentListId: `doclist-${id}`,
  };
}

// ─── Operator Tests ───────────────────────────────────────────────────────────

describe("EligibilityEngine — operator: lt", () => {
  it("matches when input value is less than threshold", () => {
    const scheme = makeScheme("s1", [{ field: "age", operator: "lt", value: 30 }]);
    const engine = new EligibilityEngine(new KnowledgeBaseRepository([], [scheme]));
    const result = engine.evaluate({ age: 25 });
    expect(result.type).toBe("match");
    if (result.type === "match") expect(result.schemes[0].id).toBe("s1");
  });

  it("does not match when input value equals threshold", () => {
    const scheme = makeScheme("s1", [{ field: "age", operator: "lt", value: 30 }]);
    const engine = new EligibilityEngine(new KnowledgeBaseRepository([], [scheme]));
    const result = engine.evaluate({ age: 30 });
    expect(result.type).toBe("no_match");
  });

  it("does not match when input value is greater than threshold", () => {
    const scheme = makeScheme("s1", [{ field: "age", operator: "lt", value: 30 }]);
    const engine = new EligibilityEngine(new KnowledgeBaseRepository([], [scheme]));
    const result = engine.evaluate({ age: 35 });
    expect(result.type).toBe("no_match");
  });
});

describe("EligibilityEngine — operator: lte", () => {
  it("matches when input value is less than threshold", () => {
    const scheme = makeScheme("s1", [{ field: "age", operator: "lte", value: 30 }]);
    const engine = new EligibilityEngine(new KnowledgeBaseRepository([], [scheme]));
    const result = engine.evaluate({ age: 25 });
    expect(result.type).toBe("match");
  });

  it("matches when input value equals threshold", () => {
    const scheme = makeScheme("s1", [{ field: "age", operator: "lte", value: 30 }]);
    const engine = new EligibilityEngine(new KnowledgeBaseRepository([], [scheme]));
    const result = engine.evaluate({ age: 30 });
    expect(result.type).toBe("match");
  });

  it("does not match when input value is greater than threshold", () => {
    const scheme = makeScheme("s1", [{ field: "age", operator: "lte", value: 30 }]);
    const engine = new EligibilityEngine(new KnowledgeBaseRepository([], [scheme]));
    const result = engine.evaluate({ age: 31 });
    expect(result.type).toBe("no_match");
  });
});

describe("EligibilityEngine — operator: gt", () => {
  it("matches when input value is greater than threshold", () => {
    const scheme = makeScheme("s1", [{ field: "age", operator: "gt", value: 18 }]);
    const engine = new EligibilityEngine(new KnowledgeBaseRepository([], [scheme]));
    const result = engine.evaluate({ age: 25 });
    expect(result.type).toBe("match");
  });

  it("does not match when input value equals threshold", () => {
    const scheme = makeScheme("s1", [{ field: "age", operator: "gt", value: 18 }]);
    const engine = new EligibilityEngine(new KnowledgeBaseRepository([], [scheme]));
    const result = engine.evaluate({ age: 18 });
    expect(result.type).toBe("no_match");
  });

  it("does not match when input value is less than threshold", () => {
    const scheme = makeScheme("s1", [{ field: "age", operator: "gt", value: 18 }]);
    const engine = new EligibilityEngine(new KnowledgeBaseRepository([], [scheme]));
    const result = engine.evaluate({ age: 15 });
    expect(result.type).toBe("no_match");
  });
});

describe("EligibilityEngine — operator: gte", () => {
  it("matches when input value is greater than threshold", () => {
    const scheme = makeScheme("s1", [{ field: "age", operator: "gte", value: 18 }]);
    const engine = new EligibilityEngine(new KnowledgeBaseRepository([], [scheme]));
    const result = engine.evaluate({ age: 25 });
    expect(result.type).toBe("match");
  });

  it("matches when input value equals threshold", () => {
    const scheme = makeScheme("s1", [{ field: "age", operator: "gte", value: 18 }]);
    const engine = new EligibilityEngine(new KnowledgeBaseRepository([], [scheme]));
    const result = engine.evaluate({ age: 18 });
    expect(result.type).toBe("match");
  });

  it("does not match when input value is less than threshold", () => {
    const scheme = makeScheme("s1", [{ field: "age", operator: "gte", value: 18 }]);
    const engine = new EligibilityEngine(new KnowledgeBaseRepository([], [scheme]));
    const result = engine.evaluate({ age: 17 });
    expect(result.type).toBe("no_match");
  });
});

describe("EligibilityEngine — operator: eq", () => {
  it("matches when input value exactly equals threshold (string)", () => {
    const scheme = makeScheme("s1", [{ field: "occupation", operator: "eq", value: "farmer" }]);
    const engine = new EligibilityEngine(new KnowledgeBaseRepository([], [scheme]));
    const result = engine.evaluate({ occupation: "farmer" });
    expect(result.type).toBe("match");
  });

  it("does not match when input value differs", () => {
    const scheme = makeScheme("s1", [{ field: "occupation", operator: "eq", value: "farmer" }]);
    const engine = new EligibilityEngine(new KnowledgeBaseRepository([], [scheme]));
    const result = engine.evaluate({ occupation: "teacher" });
    expect(result.type).toBe("no_match");
  });
});

describe("EligibilityEngine — operator: in", () => {
  it("matches when input value is in the array", () => {
    const scheme = makeScheme("s1", [
      { field: "residencyStatus", operator: "in", value: ["citizen", "resident"] },
    ]);
    const engine = new EligibilityEngine(new KnowledgeBaseRepository([], [scheme]));
    const result = engine.evaluate({ residencyStatus: "citizen" });
    expect(result.type).toBe("match");
  });

  it("does not match when input value is not in the array", () => {
    const scheme = makeScheme("s1", [
      { field: "residencyStatus", operator: "in", value: ["citizen", "resident"] },
    ]);
    const engine = new EligibilityEngine(new KnowledgeBaseRepository([], [scheme]));
    const result = engine.evaluate({ residencyStatus: "tourist" });
    expect(result.type).toBe("no_match");
  });
});

// ─── No-match Scenario ────────────────────────────────────────────────────────

describe("EligibilityEngine — no-match scenario", () => {
  it("returns no_match when input satisfies no scheme criteria", () => {
    const scheme = makeScheme("s1", [{ field: "age", operator: "lt", value: 18 }]);
    const engine = new EligibilityEngine(new KnowledgeBaseRepository([], [scheme]));
    const result = engine.evaluate({ age: 40 });
    expect(result.type).toBe("no_match");
    if (result.type === "no_match") {
      expect(result.message).toBeTruthy();
    }
  });
});

// ─── Missing Fields ───────────────────────────────────────────────────────────

describe("EligibilityEngine — missing fields", () => {
  it("returns missing_fields when required fields are absent", () => {
    const scheme = makeScheme("s1", [
      { field: "age", operator: "lt", value: 30 },
      { field: "annualIncome", operator: "lt", value: 100000 },
    ]);
    const engine = new EligibilityEngine(new KnowledgeBaseRepository([], [scheme]));
    const result = engine.evaluate({ age: 25 }); // annualIncome missing
    expect(result.type).toBe("missing_fields");
    if (result.type === "missing_fields") {
      expect(result.missingFields).toContain("annualIncome");
    }
  });

  it("returns missing_fields listing all absent fields", () => {
    const scheme = makeScheme("s1", [
      { field: "age", operator: "lt", value: 30 },
      { field: "annualIncome", operator: "lt", value: 100000 },
      { field: "residencyStatus", operator: "eq", value: "citizen" },
    ]);
    const engine = new EligibilityEngine(new KnowledgeBaseRepository([], [scheme]));
    const result = engine.evaluate({});
    expect(result.type).toBe("missing_fields");
    if (result.type === "missing_fields") {
      expect(result.missingFields).toContain("age");
      expect(result.missingFields).toContain("annualIncome");
      expect(result.missingFields).toContain("residencyStatus");
    }
  });

  it("does not return scheme results when required fields are missing", () => {
    const scheme = makeScheme("s1", [{ field: "age", operator: "lt", value: 30 }]);
    const engine = new EligibilityEngine(new KnowledgeBaseRepository([], [scheme]));
    const result = engine.evaluate({});
    expect(result.type).toBe("missing_fields");
    expect(result).not.toHaveProperty("schemes");
  });
});

// ─── Minimum-data Principle ───────────────────────────────────────────────────

describe("EligibilityEngine — minimum-data principle", () => {
  it("only requests fields required by the schemes being evaluated", () => {
    // Scheme only needs "age" — providing only age should not trigger missing_fields
    const scheme = makeScheme("s1", [{ field: "age", operator: "lt", value: 30 }]);
    const engine = new EligibilityEngine(new KnowledgeBaseRepository([], [scheme]));
    const result = engine.evaluate({ age: 20 });
    // Should not ask for unrelated fields like annualIncome, gender, etc.
    expect(result.type).toBe("match");
  });
});

// ─── ALL criteria must be satisfied ──────────────────────────────────────────

describe("EligibilityEngine — all criteria must be satisfied", () => {
  it("does not return a scheme when only some criteria are met", () => {
    const scheme = makeScheme("s1", [
      { field: "age", operator: "lt", value: 30 },
      { field: "annualIncome", operator: "lt", value: 100000 },
    ]);
    const engine = new EligibilityEngine(new KnowledgeBaseRepository([], [scheme]));
    // age passes but annualIncome fails
    const result = engine.evaluate({ age: 25, annualIncome: 200000 });
    expect(result.type).toBe("no_match");
  });

  it("returns a scheme only when all criteria are satisfied", () => {
    const scheme = makeScheme("s1", [
      { field: "age", operator: "lt", value: 30 },
      { field: "annualIncome", operator: "lt", value: 100000 },
    ]);
    const engine = new EligibilityEngine(new KnowledgeBaseRepository([], [scheme]));
    const result = engine.evaluate({ age: 25, annualIncome: 50000 });
    expect(result.type).toBe("match");
    if (result.type === "match") expect(result.schemes).toHaveLength(1);
  });
});

// ─── getSchemeDetail ──────────────────────────────────────────────────────────

describe("EligibilityEngine — getSchemeDetail", () => {
  let engine: EligibilityEngine;

  beforeEach(() => {
    const scheme = makeScheme("pm-kisan", []);
    engine = new EligibilityEngine(new KnowledgeBaseRepository([], [scheme]));
  });

  it("returns correct fields for a known scheme ID", () => {
    const detail = engine.getSchemeDetail("pm-kisan");
    expect(detail).not.toBeNull();
    expect(detail?.purpose).toBe("Purpose of pm-kisan");
    expect(detail?.benefitDescription).toBe("Benefit of pm-kisan");
    expect(detail?.officialPortalUrl).toBe("https://example.gov.in/pm-kisan");
  });

  it("returns null for an unknown scheme ID", () => {
    const detail = engine.getSchemeDetail("nonexistent-scheme");
    expect(detail).toBeNull();
  });
});
