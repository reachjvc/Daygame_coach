/**
 * Scenario Catalog - Single source of truth for all available scenarios.
 *
 * This module defines the scenario registry that drives the UI.
 * Placeholder scenarios have status "placeholder" and will be implemented later.
 */

import type { ComponentType } from "react"
import {
  MessageSquare,
  TrendingUp,
  Shield,
  Phone,
  HelpCircle,
  Heart,
  Sparkles,
  MessageCircle,
  Calendar,
} from "lucide-react"

// ─────────────────────────────────────────────────────────────────────────────
// Types
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
// Scenario Definitions
// ─────────────────────────────────────────────────────────────────────────────

export const SCENARIO_CATALOG: Record<ScenarioId, ScenarioDef> = {
  // Opening
  "practice-openers": {
    id: "practice-openers",
    title: "Practice Openers",
    description: "First 5 seconds - what do you say to get her attention?",
    icon: MessageSquare,
    status: "available",
  },

  // Hooking & Interest
  "topic-pivot": {
    id: "topic-pivot",
    title: "Topic Pivot",
    description: "She gave a bland response. Keep the conversation going.",
    icon: MessageSquare,
    status: "placeholder",
    comingSoon: true,
  },
  "assumption-game": {
    id: "assumption-game",
    title: "Assumption Game",
    description: "Make playful assumptions about her to create intrigue.",
    icon: Sparkles,
    status: "placeholder",
    comingSoon: true,
  },
  "her-question": {
    id: "her-question",
    title: "Her Question to You",
    description: '"So what do you do?" - she\'s qualifying you now.',
    icon: HelpCircle,
    status: "placeholder",
    comingSoon: true,
  },

  // Vibing & Connection
  "practice-career-response": {
    id: "practice-career-response",
    title: "Career Response",
    description: "She reveals her job. Practice push/pull dynamics.",
    icon: TrendingUp,
    status: "available",
  },
  "hobby-response": {
    id: "hobby-response",
    title: "Hobby Response",
    description: '"I do yoga" - respond without interview mode.',
    icon: Heart,
    status: "placeholder",
    comingSoon: true,
  },
  "compliment-delivery": {
    id: "compliment-delivery",
    title: "Compliment Delivery",
    description: "Give a genuine compliment without being needy.",
    icon: Heart,
    status: "placeholder",
    comingSoon: true,
  },
  "flirting-escalation": {
    id: "flirting-escalation",
    title: "Flirting Escalation",
    description: "Add tension and romantic intent to the conversation.",
    icon: Sparkles,
    status: "placeholder",
    comingSoon: true,
  },

  // Handling Resistance
  "practice-shittests": {
    id: "practice-shittests",
    title: "Shit-Tests",
    description: "Handle challenges and boundary checks with humor.",
    icon: Shield,
    status: "available",
  },
  "boyfriend-mention": {
    id: "boyfriend-mention",
    title: "Boyfriend Mention",
    description: '"I have a boyfriend" - real or test? How do you respond?',
    icon: Shield,
    status: "placeholder",
    comingSoon: true,
  },
  "time-pressure": {
    id: "time-pressure",
    title: "Time Pressure",
    description: '"I really need to go" - respect or persist?',
    icon: Shield,
    status: "placeholder",
    comingSoon: true,
  },

  // Closing & Texting
  "number-ask": {
    id: "number-ask",
    title: "Number Ask",
    description: "Conversation is going well. Ask for her number.",
    icon: Phone,
    status: "placeholder",
    comingSoon: true,
  },
  "insta-close": {
    id: "insta-close",
    title: "Instagram Close",
    description: "She's hesitant on number. Pivot to social media.",
    icon: Phone,
    status: "placeholder",
    comingSoon: true,
  },
  "instant-date": {
    id: "instant-date",
    title: "Instant Date Pitch",
    description: "High momentum - propose grabbing coffee right now.",
    icon: Calendar,
    status: "placeholder",
    comingSoon: true,
  },
  "first-text": {
    id: "first-text",
    title: "First Text",
    description: "You got her number. What do you send?",
    icon: MessageCircle,
    status: "placeholder",
    comingSoon: true,
  },
  "date-proposal": {
    id: "date-proposal",
    title: "Date Proposal",
    description: "She's responding positively. Set up a date.",
    icon: Calendar,
    status: "placeholder",
    comingSoon: true,
  },
  "flake-recovery": {
    id: "flake-recovery",
    title: "Flake Recovery",
    description: "She went cold or cancelled. Re-engage without neediness.",
    icon: MessageCircle,
    status: "placeholder",
    comingSoon: true,
  },
  "app-opener": {
    id: "app-opener",
    title: "Dating App Opener",
    description: "Her profile is interesting. Send a standout first message.",
    icon: MessageCircle,
    status: "placeholder",
    comingSoon: true,
  },
  "app-to-date": {
    id: "app-to-date",
    title: "App to Date",
    description: "Match is going well. Move from app chat to real date.",
    icon: Calendar,
    status: "placeholder",
    comingSoon: true,
  },
}

// ─────────────────────────────────────────────────────────────────────────────
// Phase Definitions
// ─────────────────────────────────────────────────────────────────────────────

export const PHASE_CATALOG: PhaseDef[] = [
  {
    id: "opening",
    title: "Opening",
    icon: MessageSquare,
    description: "Start the conversation",
    scenarioIds: ["practice-openers"],
  },
  {
    id: "hooking",
    title: "Hooking & Interest",
    icon: Sparkles,
    description: "Build curiosity and investment",
    scenarioIds: ["topic-pivot", "assumption-game", "her-question"],
  },
  {
    id: "vibing",
    title: "Vibing & Connection",
    icon: Heart,
    description: "Build rapport and attraction",
    scenarioIds: [
      "practice-career-response",
      "hobby-response",
      "compliment-delivery",
      "flirting-escalation",
    ],
  },
  {
    id: "resistance",
    title: "Handling Resistance",
    icon: Shield,
    description: "Stay confident under pressure",
    scenarioIds: ["practice-shittests", "boyfriend-mention", "time-pressure"],
  },
  {
    id: "closing",
    title: "Closing & Texting",
    icon: Phone,
    description: "Seal the deal and follow up",
    scenarioIds: [
      "number-ask",
      "insta-close",
      "instant-date",
      "first-text",
      "date-proposal",
      "flake-recovery",
      "app-opener",
      "app-to-date",
    ],
  },
]

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

/** Get a scenario by ID */
export function getScenario(id: ScenarioId): ScenarioDef {
  return SCENARIO_CATALOG[id]
}

/** Get all scenarios */
export function getAllScenarios(): ScenarioDef[] {
  return Object.values(SCENARIO_CATALOG)
}

/** Get all available (non-placeholder) scenarios */
export function getAvailableScenarios(): ScenarioDef[] {
  return getAllScenarios().filter((s) => s.status === "available")
}

/** Get scenarios for a specific phase */
export function getScenariosForPhase(phaseId: PhaseId): ScenarioDef[] {
  const phase = PHASE_CATALOG.find((p) => p.id === phaseId)
  if (!phase) return []
  return phase.scenarioIds.map((id) => SCENARIO_CATALOG[id])
}

/** Check if a scenario is available */
export function isScenarioAvailable(id: ScenarioId): boolean {
  return SCENARIO_CATALOG[id]?.status === "available"
}

/** Get the IDs of all available scenarios */
export function getAvailableScenarioIds(): ScenarioId[] {
  return getAllScenarios()
    .filter((s) => s.status === "available")
    .map((s) => s.id)
}
