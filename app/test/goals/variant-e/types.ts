/**
 * Types for Variant E — "Journey Architect" goal setting flow
 */

export type JourneyPhase = "intro" | "identity" | "situation" | "vision" | "crystallize" | "refine" | "complete"

export interface IdentityAnswer {
  /** Where the user is on the daygame journey */
  experience: "newcomer" | "beginner" | "intermediate" | "advanced" | null
  /** What brought them to daygame */
  motivation: "lonely" | "breakup" | "self-improvement" | "abundance" | "dream-girl" | null
}

export interface SituationAnswer {
  /** Current biggest challenge */
  challenge: "approach-anxiety" | "conversation" | "getting-numbers" | "dates" | "escalation" | "texting" | "consistency" | null
  /** How often they go out now */
  currentFrequency: "never" | "rarely" | "weekly" | "multiple-weekly" | null
}

export interface VisionAnswer {
  /** What does success look like? */
  successVision: "one-person" | "abundance" | "both" | null
  /** What life areas matter beyond daygame? */
  otherAreas: string[]
  /** Timeframe: how urgent? */
  timeframe: "3-months" | "6-months" | "1-year" | "2-plus-years" | null
}

export interface JourneyState {
  phase: JourneyPhase
  identity: IdentityAnswer
  situation: SituationAnswer
  vision: VisionAnswer
  /** Template IDs selected during crystallize phase */
  selectedTemplateIds: Set<string>
  /** Which non-daygame life areas were picked */
  selectedLifeAreas: string[]
}

export interface QuestionOption<T extends string> {
  value: T
  label: string
  description: string
  icon?: string
}
