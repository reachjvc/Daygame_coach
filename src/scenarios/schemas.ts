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
  usedResponses: z.record(z.array(z.number())),

  // Realistic response state fields
  interestLevel: z.number().min(1).max(10),
  exitRisk: z.number().min(0).max(3),
  realismNotch: z.union([z.literal(-1), z.literal(0), z.literal(1)]),
  neutralStreak: z.number().min(0),
  isEnded: z.boolean(),
  endReason: z.string().optional(),
})

export const ChatRequestSchema = z.object({
  message: z.string(),
  session_id: z.string().optional(),
  scenario_type: ScenarioTypeSchema,
  conversation_history: z.array(MessageSchema).optional(),
  situation_id: z.string().optional(),
  keepItGoingContext: KeepItGoingContextSchema.optional(),
})

// ─────────────────────────────────────────────────────────────────────────────
// Scenario Lab (/api/scenarios/lab)
// ─────────────────────────────────────────────────────────────────────────────

const LabKindSchema = z.enum(["coldread", "career"])

const LabChatMessageSchema = z.object({
  role: z.enum(["user", "girl"]),
  text: z.string().max(2000),
})

export const LabRequestSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("start"),
    kind: LabKindSchema,
    seed: z.string().max(200),
  }),
  z.object({
    action: z.literal("respond"),
    kind: LabKindSchema,
    momentId: z.string().max(200),
    history: z.array(LabChatMessageSchema).max(20),
    message: z.string().min(1).max(2000),
  }),
  z.object({
    action: z.literal("debrief"),
    kind: LabKindSchema,
    momentId: z.string().max(200),
    history: z.array(LabChatMessageSchema).max(24),
  }),
])
