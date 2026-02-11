import { z } from "zod"
import { InnerGameStep } from "./types"

const inferredValueSchema = z.object({
  id: z.string(),
  reason: z.string(),
})

export const updateProgressSchema = z.object({
  currentStep: z.nativeEnum(InnerGameStep).optional(),
  currentSubstep: z.number().int().min(0).max(10).optional(),
  welcomeDismissed: z.boolean().optional(),
  // Step completion flags
  valuesCompleted: z.boolean().optional(),
  shadowCompleted: z.boolean().optional(),
  peakExperienceCompleted: z.boolean().optional(),
  hurdlesCompleted: z.boolean().optional(),
  cuttingCompleted: z.boolean().optional(),
  // Legacy step flags (deprecated)
  step1Completed: z.boolean().optional(),
  step2Completed: z.boolean().optional(),
  step3Completed: z.boolean().optional(),
  // Shadow step data
  shadowResponse: z.string().optional(),
  shadowInferredValues: z.array(inferredValueSchema).optional(),
  // Peak experience step data
  peakExperienceResponse: z.string().optional(),
  peakExperienceInferredValues: z.array(inferredValueSchema).optional(),
  // Hurdles step data
  hurdlesResponse: z.string().optional(),
  hurdlesInferredValues: z.array(inferredValueSchema).optional(),
  // Legacy deathbed fields (deprecated)
  deathbedResponse: z.string().optional(),
  deathbedInferredValues: z.array(inferredValueSchema).optional(),
  // Prioritization flow data
  essentialSelection: z.array(z.string()).optional(),
  // Final results
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

export const resetSectionSchema = z.object({
  section: z.enum(["values", "shadow", "peak_experience", "hurdles", "cutting"]),
})

export type UpdateProgressInput = z.infer<typeof updateProgressSchema>
export type InferValuesInput = z.infer<typeof inferValuesSchema>
export type ResetSectionInput = z.infer<typeof resetSectionSchema>
