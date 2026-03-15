import { describe, it, expect } from "vitest";
import { DocumentRegistryRepository } from "./DocumentRegistryRepository.js";

const repo = new DocumentRegistryRepository();

// All service/scheme IDs that should have document lists in the seed data
const KNOWN_IDS = [
  "passport-application",
  "driving-license",
  "aadhaar-card",
  "pm-kisan",
  "ayushman-bharat",
  "national-scholarship",
];

describe("DocumentRegistryRepository", () => {
  describe("getDocumentList", () => {
    it("returns a document list for a known service ID", () => {
      const list = repo.getDocumentList("passport-application");
      expect(list).not.toBeNull();
      expect(list?.serviceOrSchemeId).toBe("passport-application");
    });

    it("returns a document list for a known scheme ID", () => {
      const list = repo.getDocumentList("pm-kisan");
      expect(list).not.toBeNull();
      expect(list?.serviceOrSchemeId).toBe("pm-kisan");
    });

    it("returns null for an unknown ID", () => {
      const list = repo.getDocumentList("does-not-exist-xyz");
      expect(list).toBeNull();
    });
  });

  describe("mandatory documents", () => {
    it("all mandatory documents have isMandatory set to true", () => {
      for (const id of KNOWN_IDS) {
        const list = repo.getDocumentList(id)!;
        const mandatory = list.documents.filter((d) => d.isMandatory);
        for (const doc of mandatory) {
          expect(doc.isMandatory).toBe(true);
        }
      }
    });

    it("each document list has at least one mandatory document", () => {
      for (const id of KNOWN_IDS) {
        const list = repo.getDocumentList(id)!;
        const mandatory = list.documents.filter((d) => d.isMandatory);
        expect(mandatory.length).toBeGreaterThan(0);
      }
    });
  });

  describe("conditional documents", () => {
    it("all conditional (non-mandatory) documents have a non-empty condition field", () => {
      for (const id of KNOWN_IDS) {
        const list = repo.getDocumentList(id)!;
        const conditional = list.documents.filter((d) => !d.isMandatory);
        for (const doc of conditional) {
          expect(doc.condition).toBeTruthy();
          expect(typeof doc.condition).toBe("string");
          expect((doc.condition as string).trim().length).toBeGreaterThan(0);
        }
      }
    });

    it("each document list has at least one conditional document", () => {
      for (const id of KNOWN_IDS) {
        const list = repo.getDocumentList(id)!;
        const conditional = list.documents.filter((d) => !d.isMandatory);
        expect(conditional.length).toBeGreaterThan(0);
      }
    });
  });

  describe("portal URLs", () => {
    it("all document entries have at least one portal URL (obtainFromUrl or submitToUrl)", () => {
      for (const id of KNOWN_IDS) {
        const list = repo.getDocumentList(id)!;
        for (const doc of list.documents) {
          const hasUrl = Boolean(doc.obtainFromUrl) || Boolean(doc.submitToUrl);
          expect(hasUrl).toBe(true);
        }
      }
    });
  });

  describe("document entry structure", () => {
    it("all document entries have a non-empty name and description", () => {
      for (const id of KNOWN_IDS) {
        const list = repo.getDocumentList(id)!;
        for (const doc of list.documents) {
          expect(doc.name.trim().length).toBeGreaterThan(0);
          expect(doc.description.trim().length).toBeGreaterThan(0);
        }
      }
    });
  });
});
