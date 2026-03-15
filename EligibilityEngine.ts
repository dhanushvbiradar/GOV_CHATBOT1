import type { EligibilityInput, EligibilityCriterion, Scheme } from "../types/index.js";
import { KnowledgeBaseRepository } from "../kb/KnowledgeBaseRepository.js";

// ─── Result Types ─────────────────────────────────────────────────────────────

export type EligibilityResult =
  | { type: "missing_fields"; missingFields: string[] }
  | { type: "no_match"; message: string }
  | { type: "match"; schemes: Scheme[] };

export interface SchemeDetail {
  purpose: string;
  benefitDescription: string;
  officialPortalUrl: string;
}

// ─── Engine ───────────────────────────────────────────────────────────────────

export class EligibilityEngine {
  private readonly kb: KnowledgeBaseRepository;

  constructor(kb: KnowledgeBaseRepository = new KnowledgeBaseRepository()) {
    this.kb = kb;
  }

  /**
   * Evaluates a partial eligibility input against all schemes in the KB.
   * Returns missing_fields if any required fields are absent,
   * match with qualifying schemes, or no_match if none qualify.
   *
   * Never writes eligibility inputs to persistent storage.
   */
  evaluate(input: Partial<EligibilityInput>): EligibilityResult {
    const schemes = this.kb.getAllSchemes();

    // Collect all unique fields required across all schemes
    const requiredFields = new Set<string>();
    for (const scheme of schemes) {
      for (const criterion of scheme.eligibilityCriteria) {
        requiredFields.add(criterion.field);
      }
    }

    // Detect missing fields before evaluating
    const missingFields = [...requiredFields].filter(
      (field) => input[field] === undefined || input[field] === null
    );

    if (missingFields.length > 0) {
      return { type: "missing_fields", missingFields };
    }

    // Evaluate each scheme — only return schemes where ALL criteria are satisfied
    const matchingSchemes = schemes.filter((scheme) =>
      scheme.eligibilityCriteria.every((criterion) =>
        this.evaluateCriterion(input, criterion)
      )
    );

    if (matchingSchemes.length === 0) {
      return {
        type: "no_match",
        message:
          "No matching schemes were found for the provided details. Please verify your details or contact a government helpline.",
      };
    }

    return { type: "match", schemes: matchingSchemes };
  }

  /**
   * Returns scheme detail (purpose, benefitDescription, officialPortalUrl)
   * for a given scheme ID, or null if not found.
   */
  getSchemeDetail(schemeId: string): SchemeDetail | null {
    const scheme = this.kb.findSchemeById(schemeId);
    if (!scheme) return null;

    return {
      purpose: scheme.purpose,
      benefitDescription: scheme.benefitDescription,
      officialPortalUrl: scheme.officialPortalUrl,
    };
  }

  // ─── Private Helpers ───────────────────────────────────────────────────────

  private evaluateCriterion(
    input: Partial<EligibilityInput>,
    criterion: EligibilityCriterion
  ): boolean {
    const inputValue = input[criterion.field];
    const threshold = criterion.value;

    switch (criterion.operator) {
      case "lt":
        return typeof inputValue === "number" && typeof threshold === "number"
          ? inputValue < threshold
          : false;

      case "lte":
        return typeof inputValue === "number" && typeof threshold === "number"
          ? inputValue <= threshold
          : false;

      case "gt":
        return typeof inputValue === "number" && typeof threshold === "number"
          ? inputValue > threshold
          : false;

      case "gte":
        return typeof inputValue === "number" && typeof threshold === "number"
          ? inputValue >= threshold
          : false;

      case "eq":
        return inputValue === threshold;

      case "in":
        return Array.isArray(threshold) && threshold.includes(inputValue as string);

      default:
        return false;
    }
  }
}
