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
  updateContext,
  getCloseOutcome,
  generateAIResponse,
  generateCloseResponse,
  evaluateWithAI,
  generateExitResponse,
  updateInterestFromRubric,
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
  // For keep-it-going: if context is passed, it's a continuation (not first message)
  const hasKeepItGoingContext = scenario_type === "keep-it-going" && request.keepItGoingContext
  const isFirstMessage = conversation_history.length === 0 && !hasKeepItGoingContext

  const scenarioSeed = request.session_id || `${userId}-${scenario_type}`
  const careerScenario =
    scenario_type === "practice-career-response"
      ? generateCareerScenario(archetype, difficulty, scenarioSeed)
      : null

  // Get language from profile or default to Danish
  const language: Language = (profile?.preferred_language as Language) || "da"

  // For keep-it-going: use passed context (state persistence) or generate fresh
  let keepItGoingContext =
    scenario_type === "keep-it-going"
      ? request.keepItGoingContext ?? generateKeepItGoingScenario(scenarioSeed, language, request.situation_id)
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
        keepItGoingContext, // Return initial context for client to store
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
    // Sticky end: once she's ended the conversation, don't keep spending tokens evaluating/generating.
    if (keepItGoingContext.isEnded) {
      const reason = keepItGoingContext.endReason ? ` (${keepItGoingContext.endReason})` : ""
      const endedText =
        keepItGoingContext.language === "da"
          ? `*Hun er allerede gået${reason}.*`
          : `*She's already gone${reason}.*`
      return {
        text: endedText,
        archetype: archetype.name,
        evaluation: {
          score: 0,
          feedback: keepItGoingContext.language === "da" ? "Samtalen er allerede slut." : "Conversation already ended.",
        },
        keepItGoingContext,
      }
    }

    // Build conversation history for AI response generation (with sliding window)
    const MAX_HISTORY_MESSAGES = 8 // 4 pairs - reduces token usage significantly
    const aiConversationHistory = (conversation_history || [])
      .filter((msg) => msg.role === "user" || msg.role === "assistant")
      .slice(-MAX_HISTORY_MESSAGES)
      .map((msg) => ({
        role: msg.role as "user" | "assistant",
        content: msg.content,
      }))

    // Use AI to evaluate user's response (contextual; sees recent conversation window)
    const aiEval = await evaluateWithAI(
      request.message,
      aiConversationHistory,
      keepItGoingContext.language,
      keepItGoingContext,
      userId
    )

    // Apply rubric-based interest/exitRisk updates
    const interestUpdate = updateInterestFromRubric(keepItGoingContext, {
      score: aiEval.score,
      quality: aiEval.quality,
      tags: aiEval.tags,
    })

    // Generate response based on quality and phase
    let responseText: string

    // Check if conversation should end early
    if (interestUpdate.isEnded) {
      // Generate exit response - she's leaving
      responseText = await generateExitResponse(keepItGoingContext, interestUpdate.endReason, userId)
    } else if (keepItGoingContext.conversationPhase === "close") {
      // Use accumulated average score for close outcome
      const outcome = getCloseOutcome(keepItGoingContext.averageScore)
      responseText = await generateCloseResponse(keepItGoingContext, outcome, request.message, userId)
    } else {
      // Use AI to generate response based on quality (with new interest level in context)
      const contextWithUpdatedInterest = {
        ...keepItGoingContext,
        interestLevel: interestUpdate.interestLevel,
        exitRisk: interestUpdate.exitRisk,
      }
      responseText = await generateAIResponse({
        context: contextWithUpdatedInterest,
        userMessage: request.message,
        quality: aiEval.quality,
        conversationHistory: aiConversationHistory,
        userId,
      })
    }

    // Update context with new score and interest/exitRisk
    const baseUpdatedContext = updateContext(
      keepItGoingContext,
      request.message,
      aiEval.score,
      undefined
    )

    // Merge interest/exitRisk updates into context
    const updatedContext = {
      ...baseUpdatedContext,
      interestLevel: interestUpdate.interestLevel,
      exitRisk: interestUpdate.exitRisk,
      neutralStreak: interestUpdate.neutralStreak,
      isEnded: interestUpdate.isEnded,
      endReason: interestUpdate.endReason,
    }

    const milestoneEvaluation =
      updatedContext.turnCount % 5 === 0
        ? { score: aiEval.score, feedback: aiEval.feedback, strengths: [], improvements: [], turn: updatedContext.turnCount }
        : undefined

    return {
      text: responseText,
      archetype: archetype.name,
      evaluation: { score: aiEval.score, feedback: aiEval.feedback },
      milestoneEvaluation,
      keepItGoingContext: updatedContext,
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
