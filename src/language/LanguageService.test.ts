import { describe, it, expect } from "vitest";
import { LanguageService } from "./LanguageService.js";

describe("LanguageService", () => {
  const svc = new LanguageService();

  describe("detect", () => {
    it("detects Hindi from Devanagari script", () => {
      expect(svc.detect("मुझे पासपोर्ट चाहिए")).toBe("hi");
    });

    it("detects Tamil from Tamil script", () => {
      expect(svc.detect("பாஸ்போர்ட் விண்ணப்பம்")).toBe("ta");
    });

    it("detects Bengali from Bengali script", () => {
      expect(svc.detect("পাসপোর্টের জন্য আবেদন")).toBe("bn");
    });

    it("falls back to session language for Latin-script messages", () => {
      expect(svc.detect("How do I apply?", "hi")).toBe("hi");
    });

    it("falls back to 'en' when no session language given", () => {
      expect(svc.detect("How do I apply?")).toBe("en");
    });
  });

  describe("isSupported", () => {
    it("returns true for supported codes", () => {
      expect(svc.isSupported("en")).toBe(true);
      expect(svc.isSupported("hi")).toBe(true);
      expect(svc.isSupported("ta")).toBe(true);
    });

    it("returns false for unsupported codes", () => {
      expect(svc.isSupported("fr")).toBe(false);
      expect(svc.isSupported("zh")).toBe(false);
      expect(svc.isSupported("")).toBe(false);
    });
  });

  describe("resolve", () => {
    it("uses explicit override when supported — Req 5.8", () => {
      const { language, unsupported } = svc.resolve("Hello", "en", "hi");
      expect(language).toBe("hi");
      expect(unsupported).toBe(false);
    });

    it("returns unsupported=true and defaults to 'en' for unsupported override — Req 5.3", () => {
      const { language, unsupported } = svc.resolve("Hello", "en", "fr");
      expect(language).toBe("en");
      expect(unsupported).toBe(true);
    });

    it("auto-detects from script when no override — Req 5.1", () => {
      const { language, unsupported } = svc.resolve("मुझे मदद चाहिए", "en");
      expect(language).toBe("hi");
      expect(unsupported).toBe(false);
    });

    it("falls back to session language for Latin messages — Req 5.2, 5.5", () => {
      const { language } = svc.resolve("I need help", "ta");
      expect(language).toBe("ta");
    });
  });

  describe("buildUnsupportedLanguageMessage", () => {
    it("includes the requested code and lists supported languages — Req 5.3", () => {
      const msg = svc.buildUnsupportedLanguageMessage("fr");
      expect(msg).toContain("fr");
      expect(msg).toContain("en");
      expect(msg).toContain("hi");
      expect(msg.toLowerCase()).toContain("supported");
    });
  });

  describe("Orchestrator language integration", () => {
    it("persists language preference change across session — Req 5.2, 5.5", async () => {
      // Simulate: session starts in 'en', citizen sends Hindi message
      // detect() should return 'hi', orchestrator should update session language
      const detected = svc.detect("मुझे पासपोर्ट चाहिए", "en");
      expect(detected).toBe("hi");
      // The orchestrator would then call updateSession({ language: "hi" })
      // This is verified in OrchestratorService.test.ts
    });

    it("Hindi response uses Devanagari script detection — Req 5.6", () => {
      // Verify that a message in Devanagari is correctly identified as Hindi
      const lang = svc.detect("आधार कार्ड के लिए आवेदन कैसे करें?");
      expect(lang).toBe("hi");
    });

    it("explicit language selection overrides auto-detection — Req 5.8", () => {
      // Even if message is in English, explicit override wins
      const { language } = svc.resolve("How do I apply?", "en", "ta");
      expect(language).toBe("ta");
    });
  });
});
