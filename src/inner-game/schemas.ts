import { z } from "zod"
import { InnerGameStep } from "./types"

export const updateProgressSchema = z.object({
  currentStep: z.nativeEnum(InnerGameStep).optional(),
  currentSubstep: z.number().int().min(0).max(9).optional(),
  welcomeDismissed: z.boolean().optional(),
  step1Completed: z.boolean().optional(),
  step2Completed: z.boolean().optional(),
  step3Completed: z.boolean().optional(),
  cuttingCompleted: z.boolean().optional(),
  hurdlesResponse: z.string().optional(),
  hurdlesInferredValues: z
    .array(
      z.object({
        id: z.string(),
        reason: z.string(),
      })
    )
    .optional(),
  deathbedResponse: z.string().optional(),
  deathbedInferredValues: z
    .array(
      z.object({
        id: z.string(),
        reason: z.string(),
      })
    )
    .optional(),
  finalCoreValues: z
    .array(
      z.object({
        id: z.string(),
        rank: z.number(),
      })
    )
    .optional(),
  aspirationalValues: z
    .array(
      z.object({
        id: z.string(),
      })
    )
    .optional(),
})

export const inferValuesSchema = z.object({
  context: z.enum(["shadow", "peak_experience", "hurdles"]),
  response: z.string().min(10, "Please provide a more detailed response").max(5000),
})

export type UpdateProgressInput = z.infer<typeof updateProgressSchema>
export type InferValuesInput = z.infer<typeof inferValuesSchema>
