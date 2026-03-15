import { describe, it, expect } from "vitest";
import { DocumentRegistryService } from "./DocumentRegistryService.js";
import { DocumentRegistryRepository } from "../kb/DocumentRegistryRepository.js";
import { KnowledgeBaseRepository } from "../kb/KnowledgeBaseRepository.js";
import type { DocumentList } from "../types/index.js";

describe("DocumentRegistryService", () => {
  const service = new DocumentRegistryService();

  // ── Found cases ─────────────────────────────────────────────────────────────

  it("returns found with documentList for a known service ID (passport-application)", () => {
    const result = service.getDocuments("passport-application");
    expect(result.type).toBe("found");
    if (result.type === "found") {
      expect(result.documentList.serviceOrSchemeId).toBe("passport-application");
    }
  });

  it("returns found with documentList for a known scheme ID (pm-kisan)", () => {
    const result = service.getDocuments("pm-kisan");
    expect(result.type).toBe("found");
    if (result.type === "found") {
      expect(result.documentList.serviceOrSchemeId).toBe("pm-kisan");
    }
  });

  it("returned documentList has at least one mandatory document", () => {
    const result = service.getDocuments("passport-application");
    expect(result.type).toBe("found");
    if (result.type === "found") {
      const hasMandatory = result.documentList.documents.some((d) => d.isMandatory === true);
      expect(hasMandatory).toBe(true);
    }
  });

  it("returned documentList has at least one conditional document with a non-empty condition", () => {
    const result = service.getDocuments("passport-application");
    expect(result.type).toBe("found");
    if (result.type === "found") {
      const conditional = result.documentList.documents.find(
        (d) => d.isMandatory === false && d.condition && d.condition.trim().length > 0,
      );
      expect(conditional).toBeDefined();
    }
  });

  // ── Not found cases ──────────────────────────────────────────────────────────

  it("returns not_found for an unknown ID", () => {
    const result = service.getDocuments("unknown-service-xyz");
    expect(result.type).toBe("not_found");
  });

  it("not_found response includes a portalUrl when the service exists in the KB", () => {
    // "driving-license" exists in KB but we'll use a custom repo where it has no doc list
    const emptyDocRepo = new DocumentRegistryRepository([]);
    const svc = new DocumentRegistryService(emptyDocRepo, new KnowledgeBaseRepository());

    const result = svc.getDocuments("driving-license");
    expect(result.type).toBe("not_found");
    if (result.type === "not_found") {
      expect(result.portalUrl).toBeDefined();
      expect(result.portalUrl).toBeTruthy();
    }
  });

  it("not_found response has a non-empty message", () => {
    const result = service.getDocuments("unknown-service-xyz");
    expect(result.type).toBe("not_found");
    if (result.type === "not_found") {
      expect(result.message.trim().length).toBeGreaterThan(0);
    }
  });

  it("not_found response includes portalUrl when the scheme exists in the KB but has no doc list", () => {
    const emptyDocRepo = new DocumentRegistryRepository([]);
    const svc = new DocumentRegistryService(emptyDocRepo, new KnowledgeBaseRepository());

    const result = svc.getDocuments("ayushman-bharat");
    expect(result.type).toBe("not_found");
    if (result.type === "not_found") {
      expect(result.portalUrl).toBeDefined();
      expect(result.portalUrl).toBeTruthy();
    }
  });
});
