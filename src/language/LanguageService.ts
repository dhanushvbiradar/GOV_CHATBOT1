/**
 * LanguageService — language detection, preference management, and validation.
 *
 * Requirements: 5.1, 5.2, 5.3, 5.5, 5.6, 5.7, 5.8
 */

// ─── Supported languages ──────────────────────────────────────────────────────

export interface SupportedLanguage {
  /** BCP-47 tag */
  code: string;
  /** Display name in English */
  name: string;
  /** Native script display name */
  nativeName: string;
  /** Whether the language uses a non-Latin script */
  nonLatinScript: boolean;
}

export const SUPPORTED_LANGUAGES: SupportedLanguage[] = [
  { code: "en", name: "English",    nativeName: "English",    nonLatinScript: false },
  { code: "hi", name: "Hindi",      nativeName: "हिन्दी",      nonLatinScript: true  },
  { code: "ta", name: "Tamil",      nativeName: "தமிழ்",       nonLatinScript: true  },
  { code: "te", name: "Telugu",     nativeName: "తెలుగు",      nonLatinScript: true  },
  { code: "bn", name: "Bengali",    nativeName: "বাংলা",       nonLatinScript: true  },
  { code: "mr", name: "Marathi",    nativeName: "मराठी",       nonLatinScript: true  },
  { code: "gu", name: "Gujarati",   nativeName: "ગુજરાતી",     nonLatinScript: true  },
  { code: "kn", name: "Kannada",    nativeName: "ಕನ್ನಡ",       nonLatinScript: true  },
  { code: "ml", name: "Malayalam",  nativeName: "മലയാളം",      nonLatinScript: true  },
  { code: "pa", name: "Punjabi",    nativeName: "ਪੰਜਾਬੀ",      nonLatinScript: true  },
];

const SUPPORTED_CODES = new Set(SUPPORTED_LANGUAGES.map((l) => l.code));
const DEFAULT_LANGUAGE = "en";

// ─── Script detection heuristics ─────────────────────────────────────────────

/** Unicode ranges for non-Latin scripts used by supported languages */
const SCRIPT_PATTERNS: Array<{ pattern: RegExp; code: string }> = [
  { pattern: /[\u0900-\u097F]/, code: "hi" }, // Devanagari → Hindi / Marathi
  { pattern: /[\u0B80-\u0BFF]/, code: "ta" }, // Tamil
  { pattern: /[\u0C00-\u0C7F]/, code: "te" }, // Telugu
  { pattern: /[\u0980-\u09FF]/, code: "bn" }, // Bengali
  { pattern: /[\u0A80-\u0AFF]/, code: "gu" }, // Gujarati
  { pattern: /[\u0C80-\u0CFF]/, code: "kn" }, // Kannada
  { pattern: /[\u0D00-\u0D7F]/, code: "ml" }, // Malayalam
  { pattern: /[\u0A00-\u0A7F]/, code: "pa" }, // Gurmukhi (Punjabi)
];

// ─── LanguageService ──────────────────────────────────────────────────────────

export class LanguageService {
  /**
   * Detect the language of a message using script heuristics.
   * Falls back to the session's stored preference, then to "en".
   *
   * Req 5.1: auto-detect language from citizen message.
   */
  detect(message: string, sessionLanguage = DEFAULT_LANGUAGE): string {
    for (const { pattern, code } of SCRIPT_PATTERNS) {
      if (pattern.test(message)) return code;
    }
    // No non-Latin script detected — keep session preference
    return sessionLanguage;
  }

  /**
   * Returns true if the given BCP-47 code is in the supported list.
   * Req 5.3: detect unsupported language.
   */
  isSupported(code: string): boolean {
    return SUPPORTED_CODES.has(code);
  }

  /**
   * Returns the default language code.
   */
  getDefault(): string {
    return DEFAULT_LANGUAGE;
  }

  /**
   * Returns a human-readable list of supported languages for the unsupported-language response.
   * Req 5.3: list supported languages when requested language is unsupported.
   */
  getSupportedList(): string {
    return SUPPORTED_LANGUAGES.map((l) => `${l.nativeName} (${l.code})`).join(", ");
  }

  /**
   * Build the unsupported-language response message.
   * Req 5.3: respond in default language and list supported languages.
   */
  buildUnsupportedLanguageMessage(requestedCode: string): string {
    return (
      `Sorry, "${requestedCode}" is not currently supported. ` +
      `Supported languages are: ${this.getSupportedList()}. ` +
      `Responding in English.`
    );
  }

  /**
   * Resolve the effective language for a request:
   * 1. Explicit override (from UI language selector) — Req 5.8
   * 2. Auto-detected from message script — Req 5.1
   * 3. Session preference — Req 5.2, 5.5
   * 4. Default ("en")
   *
   * Returns { language, unsupported } where unsupported is true when the
   * explicit override is not in the supported list.
   */
  resolve(
    message: string,
    sessionLanguage: string,
    explicitOverride?: string
  ): { language: string; unsupported: boolean } {
    if (explicitOverride) {
      if (!this.isSupported(explicitOverride)) {
        return { language: DEFAULT_LANGUAGE, unsupported: true };
      }
      return { language: explicitOverride, unsupported: false };
    }

    const detected = this.detect(message, sessionLanguage);
    return { language: detected, unsupported: false };
  }
}
