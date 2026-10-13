import { describe, it, expect } from "vitest"
import {
  VOICE_LANGUAGES,
  VALID_VOICE_LANGUAGE_CODES,
  DEFAULT_VOICE_LANGUAGE,
  getVoiceLanguageLabel,
  getWhisperLanguage,
} from "@/src/tracking/config"

describe("Voice Language Config", () => {
  describe("VALID_VOICE_LANGUAGE_CODES", () => {
    it("matches VOICE_LANGUAGES length", () => {
      expect(VALID_VOICE_LANGUAGE_CODES.size).toBe(VOICE_LANGUAGES.length)
    })
  })

  describe("DEFAULT_VOICE_LANGUAGE", () => {
    it("is a valid language code", () => {
      expect(VALID_VOICE_LANGUAGE_CODES.has(DEFAULT_VOICE_LANGUAGE)).toBe(true)
    })
  })

  describe("getVoiceLanguageLabel", () => {
    it("returns raw code for unknown language", () => {
      expect(getVoiceLanguageLabel("xx-XX")).toBe("xx-XX")
      expect(getVoiceLanguageLabel("")).toBe("")
    })
  })

  describe("getWhisperLanguage", () => {
    it("returns english for unknown code", () => {
      expect(getWhisperLanguage("xx-XX")).toBe("english")
      expect(getWhisperLanguage("")).toBe("english")
    })
  })
})
