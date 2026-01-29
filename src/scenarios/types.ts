/**
 * Scenarios Types - Single source of truth for all scenario types
 *
 * This file centralizes all types used across the scenarios slice.
 * Sub-module specific types (openers) are in openers/types.ts.
 */

import type { ComponentType } from "react"

// ─────────────────────────────────────────────────────────────────────────────
// Scenario Types
// ─────────────────────────────────────────────────────────────────────────────

export type ScenarioType =
  | "practice-openers"
  | "topic-pivot"
  | "assumption-game"
  | "her-question"
  | "practice-career-response"
  | "hobby-response"
  | "compliment-delivery"
  | "flirting-escalation"
  | "practice-shittests"
  | "boyfriend-mention"
  | "time-pressure"
  | "number-ask"
  | "insta-close"
  | "instant-date"
  | "first-text"
  | "date-proposal"
  | "flake-recovery"
  | "app-opener"
  | "app-to-date"

export type ChatScenarioType =
  | "practice-openers"
  | "practice-career-response"
  | "practice-shittests"

// ─────────────────────────────────────────────────────────────────────────────
// Difficulty Types (shared across all scenarios)
// ─────────────────────────────────────────────────────────────────────────────

export type DifficultyLevel = "beginner" | "intermediate" | "advanced" | "expert" | "master"

export interface DifficultyConfig {
  level: DifficultyLevel
  name: string
  description: string
  receptiveness: number // 1-10, how likely she is to be receptive
  womanDescription: {
    outfitStyle: string // Easy to comment on at low levels
    vibe: string // Her energy/body language
    context: string // What she's doing (walking, on phone, etc.)
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Evaluation Types (shared across all evaluators)
// ─────────────────────────────────────────────────────────────────────────────

export type SmallEvaluation = {
  score: number
  feedback: string
}

export type MilestoneEvaluation = {
  score: number
  feedback: string
  strengths: string[]
  improvements: string[]
  suggestedNextLine?: string
}

export type EvaluationResult = {
  small: SmallEvaluation
  milestone: MilestoneEvaluation
}

// ─────────────────────────────────────────────────────────────────────────────
// Sandbox/Configuration Types
// ─────────────────────────────────────────────────────────────────────────────

export interface WeatherSettings {
  /** Allow rain, light rain, cold, windy weather */
  enableBadWeather: boolean
  /** Allow hot weather */
  enableHotWeather: boolean
  /** Show weather descriptions in scenario */
  showWeatherDescriptions: boolean
}

export interface EnergySettings {
  /** Allow icy, irritated, rushed, stressed, closed energies */
  enableNegativeEnergies: boolean
  /** Allow neutral, preoccupied, focused energies */
  enableNeutralEnergies: boolean
  /** Allow shy, melancholic, tired energies */
  enableShyEnergies: boolean
  /** Show energy/mood cues in scenario description */
  showEnergyDescriptions: boolean
}

export interface MovementSettings {
  /** Allow walking_brisk, walking_fast positions */
  enableFastMovement: boolean
  /** Allow women wearing headphones */
  enableHeadphones: boolean
}

export interface DisplaySettings {
  /** Show outfit details in scenario */
  showOutfitDescriptions: boolean
  /** Show conversation starter hints */
  showOpenerHooks: boolean
  /** Show crowd level information */
  showCrowdDescriptions: boolean
}

export interface EnvironmentSettings {
  /** Allow gym encounters */
  enableGymScenarios: boolean
  /** Allow transit/station encounters */
  enableTransitScenarios: boolean
  /** Allow campus encounters */
  enableCampusScenarios: boolean
  /** Allow high crowd density scenarios */
  enableHighCrowdScenarios: boolean
}

export interface SandboxSettings {
  weather: WeatherSettings
  energy: EnergySettings
  movement: MovementSettings
  display: DisplaySettings
  environments: EnvironmentSettings
}

// ─────────────────────────────────────────────────────────────────────────────
// API/Service Types
// ─────────────────────────────────────────────────────────────────────────────

export type EnvironmentChoice =
  | "any"
  | "high-street"
  | "mall"
  | "coffee-shop"
  | "transit"
  | "park"
  | "gym"
  | "campus"

export type ChatHistoryMessage = { role: "user" | "assistant"; content: string }

export type ChatRequest = {
  message: string
  session_id?: string
  scenario_type: ChatScenarioType
  conversation_history?: ChatHistoryMessage[]
}

export type ChatResponse = {
  text: string
  archetype?: string
  difficulty?: DifficultyLevel
  isIntroduction?: boolean
  evaluation?: { score: number; feedback: string }
  milestoneEvaluation?: {
    score: number
    feedback: string
    strengths: string[]
    improvements: string[]
    suggestedNextLine?: string
    turn: number
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Catalog Types (UI-aware)
// ─────────────────────────────────────────────────────────────────────────────

export type ScenarioId =
  | "practice-openers"
  | "topic-pivot"
  | "assumption-game"
  | "her-question"
  | "practice-career-response"
  | "hobby-response"
  | "compliment-delivery"
  | "flirting-escalation"
  | "practice-shittests"
  | "boyfriend-mention"
  | "time-pressure"
  | "number-ask"
  | "insta-close"
  | "instant-date"
  | "first-text"
  | "date-proposal"
  | "flake-recovery"
  | "app-opener"
  | "app-to-date"

export type ScenarioStatus = "available" | "placeholder"

export interface ScenarioDef {
  id: ScenarioId
  title: string
  description: string
  icon: ComponentType<{ className?: string }>
  status: ScenarioStatus
  /** If placeholder, show "Coming Soon" badge */
  comingSoon?: boolean
}

export type PhaseId = "opening" | "hooking" | "vibing" | "resistance" | "closing"

export interface PhaseDef {
  id: PhaseId
  title: string
  icon: ComponentType<{ className?: string }>
  description: string
  scenarioIds: ScenarioId[]
}

// ─────────────────────────────────────────────────────────────────────────────
// Archetype Types
// ─────────────────────────────────────────────────────────────────────────────

export interface Archetype {
  id: string
  name: string
  coreVibe: string
  screeningFor: string
  resonatesWith: string
  typicalResponses: {
    positive: string[]
    neutral: string[]
    negative: string[]
  }
  communicationStyle: {
    tone: "professional" | "casual" | "playful" | "intellectual" | "warm"
    usesEmoji: boolean
    sentenceLength: "short" | "medium" | "long"
  }
  commonShittests: string[]
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

/** Clamp score between 1 and 10 */
export function clampScore(value: number): number {
  return Math.max(1, Math.min(10, Math.round(value)))
}
