import { describe, it, expect } from "vitest"
import {
  VOICE_LANGUAGES,
  VALID_VOICE_LANGUAGE_CODES,
  DEFAULT_VOICE_LANGUAGE,
  getVoiceLanguageLabel,
  getWhisperLanguage,
} from "@/src/tracking/config"

describe("Voice Language Config", () => {
  describe("VOICE_LANGUAGES", () => {
    it("has at least 5 languages", () => {
      expect(VOICE_LANGUAGES.length).toBeGreaterThanOrEqual(5)
    })

    it("every entry has code, label, and whisperLang", () => {
      for (const lang of VOICE_LANGUAGES) {
        expect(lang.code).toBeTruthy()
        expect(lang.label).toBeTruthy()
        expect(lang.whisperLang).toBeTruthy()
      }
    })

    it("includes English (US) as a language", () => {
      const enUS = VOICE_LANGUAGES.find(l => l.code === "en-US")
      expect(enUS).toBeDefined()
      expect(enUS!.label).toBe("English (US)")
    })

    it("includes Danish", () => {
      const da = VOICE_LANGUAGES.find(l => l.code === "da-DK")
      expect(da).toBeDefined()
      expect(da!.label).toBe("Danish")
    })
  })

  describe("VALID_VOICE_LANGUAGE_CODES", () => {
    it("matches VOICE_LANGUAGES length", () => {
      expect(VALID_VOICE_LANGUAGE_CODES.size).toBe(VOICE_LANGUAGES.length)
    })

    it("contains all codes from VOICE_LANGUAGES", () => {
      for (const lang of VOICE_LANGUAGES) {
        expect(VALID_VOICE_LANGUAGE_CODES.has(lang.code)).toBe(true)
      }
    })
  })

  describe("DEFAULT_VOICE_LANGUAGE", () => {
    it("is en-US", () => {
      expect(DEFAULT_VOICE_LANGUAGE).toBe("en-US")
    })

    it("is a valid language code", () => {
      expect(VALID_VOICE_LANGUAGE_CODES.has(DEFAULT_VOICE_LANGUAGE)).toBe(true)
    })
  })

  describe("getVoiceLanguageLabel", () => {
    it("returns label for valid code", () => {
      expect(getVoiceLanguageLabel("en-US")).toBe("English (US)")
      expect(getVoiceLanguageLabel("da-DK")).toBe("Danish")
      expect(getVoiceLanguageLabel("de-DE")).toBe("German")
    })

    it("returns raw code for unknown language", () => {
      expect(getVoiceLanguageLabel("xx-XX")).toBe("xx-XX")
      expect(getVoiceLanguageLabel("")).toBe("")
    })
  })

  describe("getWhisperLanguage", () => {
    it("returns whisper language for valid code", () => {
      expect(getWhisperLanguage("en-US")).toBe("english")
      expect(getWhisperLanguage("da-DK")).toBe("danish")
      expect(getWhisperLanguage("fr-FR")).toBe("french")
    })

    it("returns english for unknown code", () => {
      expect(getWhisperLanguage("xx-XX")).toBe("english")
      expect(getWhisperLanguage("")).toBe("english")
    })
  })
})
