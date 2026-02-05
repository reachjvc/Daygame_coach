"use client"

import { createContext, useContext, type ReactNode } from "react"
import { DEFAULT_VOICE_LANGUAGE } from "../config"

const VoiceLanguageContext = createContext<string>(DEFAULT_VOICE_LANGUAGE)

interface VoiceLanguageProviderProps {
  language: string
  children: ReactNode
}

export function VoiceLanguageProvider({ language, children }: VoiceLanguageProviderProps) {
  return (
    <VoiceLanguageContext.Provider value={language}>
      {children}
    </VoiceLanguageContext.Provider>
  )
}

/** Get the current voice language code (e.g. "en-US", "da-DK") */
export function useVoiceLanguage(): string {
  return useContext(VoiceLanguageContext)
}
