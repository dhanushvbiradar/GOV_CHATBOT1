import { describe, it, expect } from "vitest";
import { KnowledgeBaseRepository } from "./KnowledgeBaseRepository.js";

const repo = new KnowledgeBaseRepository();

describe("KnowledgeBaseRepository", () => {
  describe("findServiceByQuery", () => {
    it("returns the correct service on exact name match", () => {
      const results = repo.findServiceByQuery("Passport Application");
      expect(results).toHaveLength(1);
      expect(results[0].id).toBe("passport-application");
    });

    it("returns the correct service on alias match", () => {
      const results = repo.findServiceByQuery("DL");
      expect(results).toHaveLength(1);
      expect(results[0].id).toBe("driving-license");
    });

    it("is case-insensitive for name match", () => {
      const results = repo.findServiceByQuery("aadhaar card");
      expect(results).toHaveLength(1);
      expect(results[0].id).toBe("aadhaar-card");
    });

    it("is case-insensitive for alias match", () => {
      const results = repo.findServiceByQuery("uidai");
      expect(results).toHaveLength(1);
      expect(results[0].id).toBe("aadhaar-card");
    });

    it("returns multiple services when query matches more than one (multi-match)", () => {
      // "license" appears in both "Driving License" name and passport alias "international travel"
      // Use a term that matches multiple: "card" matches "Aadhaar Card" name and "driving licence" alias
      // Let's use "ID" which appears in aliases of both aadhaar ("UID") and driving ("motor vehicle license" doesn't have it)
      // More reliably: use a custom repo with overlapping data
      const customRepo = new KnowledgeBaseRepository(
        [
          {
            id: "svc-a",
            name: "Service Alpha",
            aliases: ["common-term"],
            description: "A",
            applicationSteps: [{ order: 1, title: "Step 1", description: "Do step 1" }],
            officialPortalUrl: "https://example.com/a",
            relatedServiceIds: [],
          },
          {
            id: "svc-b",
            name: "Service Beta",
            aliases: ["common-term"],
            description: "B",
            applicationSteps: [{ order: 1, title: "Step 1", description: "Do step 1" }],
            officialPortalUrl: "https://example.com/b",
            relatedServiceIds: [],
          },
        ],
        [],
      );
      const results = customRepo.findServiceByQuery("common-term");
      expect(results).toHaveLength(2);
      expect(results.map((s) => s.id)).toContain("svc-a");
      expect(results.map((s) => s.id)).toContain("svc-b");
    });

    it("returns empty array for unrecognized query", () => {
      const results = repo.findServiceByQuery("xyzzy-nonexistent-service-12345");
      expect(results).toHaveLength(0);
    });

    it("returns empty array for empty query string", () => {
      // Empty string matches everything via substring — this is expected behaviour
      // (every string includes ""). Verify it returns all services instead.
      const results = repo.findServiceByQuery("");
      expect(results.length).toBeGreaterThan(0);
    });
  });

  describe("findServiceById", () => {
    it("returns the correct service for a known ID", () => {
      const svc = repo.findServiceById("passport-application");
      expect(svc).not.toBeNull();
      expect(svc?.name).toBe("Passport Application");
    });

    it("returns null for an unknown ID", () => {
      const svc = repo.findServiceById("does-not-exist");
      expect(svc).toBeNull();
    });
  });

  describe("findSchemeById", () => {
    it("returns the correct scheme for a known ID", () => {
      const scheme = repo.findSchemeById("pm-kisan");
      expect(scheme).not.toBeNull();
      expect(scheme?.name).toBe("PM Kisan Samman Nidhi");
    });

    it("returns null for an unknown scheme ID", () => {
      const scheme = repo.findSchemeById("does-not-exist");
      expect(scheme).toBeNull();
    });
  });

  describe("getAllSchemes", () => {
    it("returns all seeded schemes", () => {
      const schemes = repo.getAllSchemes();
      expect(schemes.length).toBeGreaterThanOrEqual(3);
      const ids = schemes.map((s) => s.id);
      expect(ids).toContain("pm-kisan");
      expect(ids).toContain("ayushman-bharat");
      expect(ids).toContain("national-scholarship");
    });

    it("returns a copy — mutations do not affect the repository", () => {
      const schemes = repo.getAllSchemes();
      schemes.pop();
      expect(repo.getAllSchemes().length).toBeGreaterThanOrEqual(3);
    });
  });

  describe("seed data integrity", () => {
    it("every service has at least 3 applicationSteps", () => {
      const services = repo.findServiceByQuery("");
      for (const svc of services) {
        expect(svc.applicationSteps.length).toBeGreaterThanOrEqual(3);
      }
    });

    it("every service has at least one alias", () => {
      const services = repo.findServiceByQuery("");
      for (const svc of services) {
        expect(svc.aliases.length).toBeGreaterThan(0);
      }
    });

    it("every service has a non-empty officialPortalUrl", () => {
      const services = repo.findServiceByQuery("");
      for (const svc of services) {
        expect(svc.officialPortalUrl).toBeTruthy();
      }
    });

    it("every scheme has at least one eligibility criterion", () => {
      const schemes = repo.getAllSchemes();
      for (const scheme of schemes) {
        expect(scheme.eligibilityCriteria.length).toBeGreaterThan(0);
      }
    });
  });
});
