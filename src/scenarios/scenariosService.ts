/**
 * Scenarios Service
 *
 * Main orchestration service for scenario-related operations.
 * Delegates to specialized modules for specific functionality.
 *
 * Uses function exports per CLAUDE.md pattern (not class singleton).
 */

import { getProfile } from "@/src/db/profilesRepo"

import type {
  DifficultyLevel,
  EnvironmentChoice,
  ChatRequest,
  ChatResponse,
  Archetype,
} from "./types"
import type {
  ActivityId,
  RegionId,
  GeneratedScenarioV2,
} from "./openers/types"

import {
  generateScenarioV2,
  getAvailableActivities,
  REGION_IDS,
} from "@/src/scenarios/openers/generator"
import { evaluateOpener } from "@/src/scenarios/openers/evaluator"

import { ARCHETYPES } from "@/src/scenarios/shared/archetypes"
import {
  generateWomanDescription,
  getDifficultyForLevel,
  getDifficultyPromptModifier,
} from "@/src/scenarios/shared/difficulty"
import {
  generateCareerScenario,
  generateCareerScenarioIntro,
} from "@/src/scenarios/career/generator"
import {
  getPracticeCareerResponsePrompt,
  getPracticeOpenersPrompt,
  getPracticeShittestsPrompt,
} from "@/src/scenarios/shared/prompts"

import { generateShittestScenarioIntro } from "@/src/scenarios/shittests/generator"
import {
  generatePlaceholderResponse,
  generatePlaceholderShittestResponse,
  generateCareerPlaceholderResponse,
} from "@/src/scenarios/chat/responses"
import { evaluateOpenerResponse } from "@/src/scenarios/chat/evaluator"
import { evaluateCareerResponse } from "@/src/scenarios/career/evaluator"
import { evaluateShittestResponse } from "@/src/scenarios/shittests/evaluator"
import {
  generateKeepItGoingScenario,
  generateKeepItGoingIntro,
  evaluateKeepItGoingResponse,
  getResponseQuality,
  pickResponse,
  pickHerQuestion,
  pickCloseResponse,
  getCloseOutcome,
  getPhase,
  type Language,
} from "@/src/scenarios/keepitgoing"

// ─────────────────────────────────────────────────────────────────────────────
// Service-specific Types (not exported to other modules)
// ─────────────────────────────────────────────────────────────────────────────

export type GenerateEncounterRequest = {
  difficulty: DifficultyLevel
  environment: EnvironmentChoice
  includeHint?: boolean
  includeWeather?: boolean
}

export type EvaluateOpenerRequest = {
  opener: string
  encounter?: unknown
}

export type OpenerEvaluation = Awaited<ReturnType<typeof evaluateOpener>>

// ─────────────────────────────────────────────────────────────────────────────
// Helpers (private)
// ─────────────────────────────────────────────────────────────────────────────

function isRegionId(value: unknown): value is RegionId {
  return typeof value === "string" && (REGION_IDS as readonly string[]).includes(value)
}

function pickActivityIdForEnvironment(environment: EnvironmentChoice): ActivityId | undefined {
  const prefix =
    environment === "high-street"
      ? "1."
      : environment === "mall"
        ? "2."
        : environment === "coffee-shop"
          ? "3."
          : environment === "transit"
            ? "4."
            : environment === "park"
              ? "5."
              : environment === "gym"
                ? "6."
                : environment === "campus"
                  ? "7."
                  : null

  if (!prefix) return undefined

  const activities = getAvailableActivities().map((a) => a.id)
  const filtered = activities.filter((id) => id.startsWith(prefix))
  if (filtered.length === 0) return undefined

  return filtered[Math.floor(Math.random() * filtered.length)]
}

function defaultHintForDifficulty(difficulty: DifficultyLevel): boolean {
  return difficulty === "beginner" || difficulty === "intermediate"
}

// ─────────────────────────────────────────────────────────────────────────────
// Public API (function exports)
// ─────────────────────────────────────────────────────────────────────────────

export async function generateOpenerEncounter(
  request: GenerateEncounterRequest,
  userId: string
): Promise<GeneratedScenarioV2> {
  const profile = await getProfile(userId)

  const regionId = isRegionId(profile?.preferred_region) ? profile?.preferred_region : undefined
  const secondaryRegionId = isRegionId(profile?.secondary_region) ? profile?.secondary_region : undefined

  const activityId = pickActivityIdForEnvironment(request.environment)

  const includeHint = request.includeHint ?? defaultHintForDifficulty(request.difficulty)

  return generateScenarioV2({
    difficulty: request.difficulty,
    activityId,
    regionId,
    secondaryRegionId,
    datingForeigners: profile?.dating_foreigners ?? false,
    userIsForeign: profile?.user_is_foreign ?? false,
    includeHooks: includeHint,
    includeWeather: request.includeWeather ?? false,
  })
}

export async function evaluateOpenerAttempt(
  request: EvaluateOpenerRequest,
  userId: string
): Promise<OpenerEvaluation> {
  void userId
  if (typeof request.encounter === "undefined") {
    throw new Error("Encounter is required")
  }

  return evaluateOpener(request.opener, request.encounter)
}

export async function handleChatMessage(request: ChatRequest, userId: string): Promise<ChatResponse> {
  const profile = await getProfile(userId)

  const userArchetypeKey =
    profile?.archetype?.toLowerCase().replace(/\s+/g, "") || "powerhouse"
  const archetype: Archetype = ARCHETYPES[userArchetypeKey] || ARCHETYPES.powerhouse

  const userLevel = profile?.level || 1
  const difficulty: DifficultyLevel = getDifficultyForLevel(userLevel)

  const scenario_type = request.scenario_type
  const conversation_history = request.conversation_history || []
  const isFirstMessage = conversation_history.length === 0

  const scenarioSeed = request.session_id || `${userId}-${scenario_type}`
  const careerScenario =
    scenario_type === "practice-career-response"
      ? generateCareerScenario(archetype, difficulty, scenarioSeed)
      : null

  // Get language from profile or default to Danish
  const language: Language = (profile?.voice_language as Language) || "da"
  const keepItGoingContext =
    scenario_type === "keep-it-going"
      ? generateKeepItGoingScenario(scenarioSeed, language)
      : null

  const location = "street"

  // Handle first message (intro)
  if (isFirstMessage) {
    if (scenario_type === "practice-career-response" && careerScenario) {
      return {
        text: generateCareerScenarioIntro(careerScenario),
        archetype: archetype.name,
        difficulty,
        isIntroduction: true,
      }
    }

    if (scenario_type === "practice-shittests") {
      return {
        text: generateShittestScenarioIntro(archetype, difficulty, location),
        archetype: archetype.name,
        difficulty,
        isIntroduction: true,
      }
    }

    if (scenario_type === "keep-it-going" && keepItGoingContext) {
      return {
        text: generateKeepItGoingIntro(keepItGoingContext),
        archetype: archetype.name,
        difficulty,
        isIntroduction: true,
      }
    }

    return {
      text: generateWomanDescription(archetype, difficulty),
      archetype: archetype.name,
      difficulty,
      isIntroduction: true,
    }
  }

  // Build system prompt (for future LLM integration)
  const { systemPrompt } =
    scenario_type === "practice-career-response" && careerScenario
      ? getPracticeCareerResponsePrompt(archetype, careerScenario)
      : scenario_type === "practice-shittests"
        ? getPracticeShittestsPrompt(archetype, location)
        : getPracticeOpenersPrompt(archetype, location)

  const difficultyModifier = getDifficultyPromptModifier(difficulty)
  void systemPrompt
  void difficultyModifier

  // Evaluate user's response
  const currentTurn = conversation_history.filter((entry) => entry.role === "user").length + 1

  // Handle keep-it-going scenario
  if (scenario_type === "keep-it-going" && keepItGoingContext) {
    const evaluation = evaluateKeepItGoingResponse(request.message, language)
    const quality = getResponseQuality(evaluation.small.score)
    const phase = getPhase(currentTurn, request.message, language)

    // Generate response based on quality and phase
    let responseText: string
    if (phase === "close") {
      // Calculate average score from conversation history
      const avgScore = evaluation.small.score // For now, use current score
      const outcome = getCloseOutcome(avgScore)
      responseText = pickCloseResponse(outcome, language)
    } else if (quality === "positive" && currentTurn >= 3) {
      // She asks a question back after consecutive high scores
      responseText = pickHerQuestion(language)
    } else {
      responseText = pickResponse(quality, language)
    }

    const milestoneEvaluation =
      currentTurn % 5 === 0 ? { ...evaluation.milestone, turn: currentTurn } : undefined

    return {
      text: responseText,
      archetype: archetype.name,
      evaluation: evaluation.small,
      milestoneEvaluation,
    }
  }

  // Generate placeholder response for other scenarios
  const placeholderResponse =
    scenario_type === "practice-career-response" && careerScenario
      ? generateCareerPlaceholderResponse(request.message, archetype.name, difficulty, careerScenario.jobTitle)
      : scenario_type === "practice-shittests"
        ? generatePlaceholderShittestResponse(
            request.message,
            archetype.name,
            difficulty,
            archetype.commonShittests
          )
        : generatePlaceholderResponse(request.message, archetype.name, difficulty)

  const evaluationResult =
    scenario_type === "practice-career-response" && careerScenario
      ? evaluateCareerResponse(request.message, careerScenario.jobTitle)
      : scenario_type === "practice-shittests"
        ? evaluateShittestResponse(request.message)
        : evaluateOpenerResponse(request.message)

  const milestoneEvaluation =
    currentTurn % 5 === 0 ? { ...evaluationResult.milestone, turn: currentTurn } : undefined

  return {
    text: placeholderResponse,
    archetype: archetype.name,
    evaluation: evaluationResult.small,
    milestoneEvaluation,
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Re-export types for API routes
// ─────────────────────────────────────────────────────────────────────────────

export type {
  EnvironmentChoice,
  ChatHistoryMessage,
  ChatRequest,
  ChatResponse,
  DifficultyLevel,
} from "./types"
