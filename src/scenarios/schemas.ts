/**
 * Scenarios Schemas - Zod schemas for API validation
 */

import { z } from "zod"

export const ScenarioTypeSchema = z.enum([
  "practice-openers",
  "practice-career-response",
  "practice-shittests",
  "keep-it-going",
])

export const MessageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string(),
})

// Bilingual text schema (used by keep-it-going situations)
const BilingualText = z.object({ da: z.string(), en: z.string() })

// Keep-it-going context schema for state persistence
export const KeepItGoingContextSchema = z.object({
  situation: z.object({
    id: z.string(),
    location: BilingualText,
    setup: BilingualText,
    yourOpener: BilingualText,
    herFirstResponse: BilingualText,
  }),
  language: z.enum(["da", "en"]),
  turnCount: z.number(),
  conversationPhase: z.enum(["hook", "vibe", "invest", "close"]),
  consecutiveHighScores: z.number(),
  averageScore: z.number(),
  totalScore: z.number(),
})

export const ChatRequestSchema = z.object({
  message: z.string(),
  session_id: z.string().optional(),
  scenario_type: ScenarioTypeSchema,
  conversation_history: z.array(MessageSchema).optional(),
  situation_id: z.string().optional(),
  keepItGoingContext: KeepItGoingContextSchema.optional(),
})
