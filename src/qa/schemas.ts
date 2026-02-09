import { z } from "zod"
import { VALIDATION_LIMITS } from "./config"

export const qaRequestSchema = z.object({
  question: z
    .string()
    .min(1, "Question is required")
    .max(
      VALIDATION_LIMITS.maxQuestionChars,
      `Question must be ${VALIDATION_LIMITS.maxQuestionChars} characters or less`
    ),
  retrieval: z
    .object({
      topK: z.number().int().min(1).max(VALIDATION_LIMITS.maxTopK).optional(),
      minScore: z.number().min(0).max(1).optional(),
      maxChunkChars: z.number().int().min(100).max(10000).optional(),
    })
    .optional(),
  generation: z
    .object({
      provider: z.enum(["ollama"]).optional(), // Claude disabled to save API costs
      model: z.string().optional(),
      maxOutputTokens: z
        .number()
        .int()
        .min(100)
        .max(VALIDATION_LIMITS.maxOutputTokens)
        .optional(),
      temperature: z.number().min(0).max(1).optional(),
    })
    .optional(),
})

export type QARequestInput = z.infer<typeof qaRequestSchema>
