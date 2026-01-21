import type { z } from "zod"

import { getProfile } from "@/src/db/profilesRepo"

import type { ActivityId } from "@/src/scenarios/openers/data/base-texts"
import type { DifficultyLevel as OpenersDifficultyLevel } from "@/src/scenarios/openers/data/energy"
import {
  generateScenarioV2,
  getAvailableActivities,
  REGION_IDS,
  type RegionId,
  type GeneratedScenarioV2,
} from "@/src/scenarios/openers/generator"
import { evaluateOpener } from "@/src/scenarios/openers/evaluator"

import { ARCHETYPES, type Archetype } from "@/src/scenarios/shared/archetypes"
import {
  DIFFICULTY_LEVELS,
  generateWomanDescription,
  getDifficultyForLevel,
  getDifficultyPromptModifier,
  type DifficultyLevel as ChatDifficultyLevel,
} from "@/src/scenarios/shared/difficulty"
import {
  generateCareerScenario,
  generateCareerScenarioIntro,
} from "@/src/scenarios/career/career-scenario"
import {
  getPracticeCareerResponsePrompt,
  getPracticeOpenersPrompt,
  getPracticeShittestsPrompt,
} from "@/src/scenarios/shared/prompts"
import {
  getRandomShittest,
} from "@/src/scenarios/shittests/data/shit-tests"

export type EnvironmentChoice =
  | "any"
  | "high-street"
  | "mall"
  | "coffee-shop"
  | "transit"
  | "park"
  | "gym"
  | "campus"

export type GenerateEncounterRequest = {
  difficulty: OpenersDifficultyLevel
  environment: EnvironmentChoice
  includeHint?: boolean
  includeWeather?: boolean
}

export type EvaluateOpenerRequest = {
  opener: string
  encounter?: unknown
}

export type OpenerEvaluation = Awaited<ReturnType<typeof evaluateOpener>>

export type ChatHistoryMessage = { role: "user" | "assistant"; content: string }

export type ChatRequest = {
  message: string
  session_id?: string
  scenario_type: "practice-openers" | "practice-career-response" | "practice-shittests"
  conversation_history?: ChatHistoryMessage[]
}

export type ChatResponse = {
  text: string
  archetype?: string
  difficulty?: ChatDifficultyLevel
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

function defaultHintForDifficulty(difficulty: OpenersDifficultyLevel): boolean {
  return difficulty === "beginner" || difficulty === "intermediate"
}

export class ScenariosService {
  async generateOpenerEncounter(
    request: GenerateEncounterRequest,
    userId: string
  ): Promise<GeneratedScenarioV2> {
    const profile = (await getProfile(userId)) as any

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

  async evaluateOpenerResponse(
    request: EvaluateOpenerRequest,
    _userId: string
  ): Promise<OpenerEvaluation> {
    if (typeof request.encounter === "undefined") {
      throw new Error("Encounter is required")
    }

    return evaluateOpener(request.opener, request.encounter)
  }

  async handleChatMessage(request: ChatRequest, userId: string): Promise<ChatResponse> {
    const profile = (await getProfile(userId)) as any

    const userArchetypeKey =
      profile?.archetype?.toLowerCase().replace(/\s+/g, "") || "powerhouse"
    const archetype: Archetype = ARCHETYPES[userArchetypeKey] || ARCHETYPES.powerhouse

    const userLevel = profile?.level || 1
    const difficulty: ChatDifficultyLevel = getDifficultyForLevel(userLevel)

    const scenario_type = request.scenario_type
    const conversation_history = request.conversation_history || []
    const isFirstMessage = conversation_history.length === 0

    const scenarioSeed = request.session_id || `${userId}-${scenario_type}`
    const careerScenario =
      scenario_type === "practice-career-response"
        ? generateCareerScenario(archetype, difficulty, scenarioSeed)
        : null

    const location = "street"

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

      return {
        text: generateWomanDescription(archetype, difficulty),
        archetype: archetype.name,
        difficulty,
        isIntroduction: true,
      }
    }

    const { systemPrompt } =
      scenario_type === "practice-career-response" && careerScenario
        ? getPracticeCareerResponsePrompt(archetype, careerScenario)
        : scenario_type === "practice-shittests"
          ? getPracticeShittestsPrompt(archetype, location)
          : getPracticeOpenersPrompt(archetype, location)

    const difficultyModifier = getDifficultyPromptModifier(difficulty)
    const _fullSystemPrompt = `${systemPrompt}\n\n${difficultyModifier}`

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

    const currentTurn = conversation_history.filter((entry) => entry.role === "user").length + 1

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
}

export const scenariosService = new ScenariosService()

function generateShittestScenarioIntro(
  archetype: Archetype,
  difficulty: ChatDifficultyLevel,
  location: string
): string {
  const config = DIFFICULTY_LEVELS[difficulty]
  const shittest = getRandomShittest(difficulty, archetype.commonShittests)
  const locationPhrase = location === "street" ? "on the street" : `at the ${location}`

  return `*You're mid-approach ${locationPhrase}.*

**Her archetype:** ${archetype.name}
**Difficulty:** ${config.name}

She's ${config.womanDescription.outfitStyle}. Her vibe is ${config.womanDescription.vibe}. She's ${config.womanDescription.context}.

She looks at you and says: "${shittest}"

How do you respond?`
}

function generatePlaceholderResponse(
  userMessage: string,
  archetypeName: string,
  difficulty: ChatDifficultyLevel
): string {
  const lowerMessage = userMessage.toLowerCase()
  const receptiveness = difficulty === "beginner" ? 8 : difficulty === "intermediate" ? 6 : 4

  if (lowerMessage.includes("beautiful") || lowerMessage.includes("gorgeous")) {
    if (receptiveness >= 7) {
      return "*smiles* Thanks, that's sweet. What's your name?"
    }
    return "*rolls eyes* That's... pretty generic. Do you say that to everyone?"
  }

  if (lowerMessage.includes("excuse me") || lowerMessage.includes("sorry")) {
    if (receptiveness >= 7) {
      return "*stops, friendly* Yeah, what's up?"
    } else if (receptiveness >= 5) {
      return "*stops walking* Yeah? What's up?"
    }
    return "*barely stops* I'm kinda in a hurry..."
  }

  if (
    lowerMessage.includes("coffee") ||
    lowerMessage.includes("book") ||
    lowerMessage.includes("style") ||
    lowerMessage.includes("jacket")
  ) {
    if (receptiveness >= 7) {
      return "*lights up* Oh thanks! Yeah, I love this jacket. What about it?"
    } else if (receptiveness >= 5) {
      return "*half-smile* Oh, thanks I guess. Why do you ask?"
    }
    return "*glances at you briefly* Thanks. *keeps walking*"
  }

  if (lowerMessage.length < 20) {
    if (receptiveness >= 7) {
      return "*stops, curious* Hi! Do I know you?"
    }
    return "*looks confused* Uh... hi?"
  }

  if (receptiveness >= 7) {
    return `*stops, smiles* That's a unique way to start a conversation. I'm listening. (${archetypeName})`
  } else if (receptiveness >= 5) {
    return `*stops, looks at you* That's an interesting way to start a conversation. What's this about? (${archetypeName})`
  }
  return `*slows down but doesn't stop* What? (${archetypeName})`
}

function generatePlaceholderShittestResponse(
  userMessage: string,
  archetypeName: string,
  difficulty: ChatDifficultyLevel,
  archetypeShittests: string[]
): string {
  const lowerMessage = userMessage.toLowerCase()

  const exitSignals = ["no worries", "take care", "have a good", "sorry", "my bad", "all good", "bye"]
  if (exitSignals.some((phrase) => lowerMessage.includes(phrase))) {
    return "*nods* Okay, take care."
  }

  const defensiveSignals = ["what's your problem", "relax", "chill", "whatever", "why would", "you're rude"]
  if (defensiveSignals.some((phrase) => lowerMessage.includes(phrase))) {
    return "*frowns* Yeah, no. I'm good."
  }

  const playfulSignals = ["haha", "lol", "fair", "just teasing", "just messing", "smile", "laugh"]
  if (playfulSignals.some((phrase) => lowerMessage.includes(phrase))) {
    return `*half-smile* Alright, what's your name? (${archetypeName})`
  }

  const nextTest = getRandomShittest(difficulty, archetypeShittests)
  return `*skeptical* ${nextTest} (${archetypeName})`
}

function generateCareerPlaceholderResponse(
  userMessage: string,
  archetypeName: string,
  difficulty: ChatDifficultyLevel,
  jobTitle: string
): string {
  const lowerMessage = userMessage.toLowerCase()
  const receptiveness = difficulty === "beginner" ? 8 : difficulty === "intermediate" ? 6 : 4

  const hasTease = /(so you|so you're|so you are|bet you|do you ever|never|always)/.test(lowerMessage)
  const hasPull = /(cool|impressive|respect|like|love|interesting|attractive)/.test(lowerMessage)
  const hasQuestion = /\?/.test(userMessage) || /(what|why|how|got you into)/.test(lowerMessage)

  if (hasTease && hasPull) {
    if (receptiveness >= 6) {
      return `*smiles* Maybe. Being a ${jobTitle} is a lot sometimes, but I like it. What about you? (${archetypeName})`
    }
    return `*half-smile* You are not wrong. It is a lot. (${archetypeName})`
  }

  if (hasTease) {
    if (receptiveness >= 6) {
      return `*raises an eyebrow* Maybe. ${jobTitle} has its moments. (${archetypeName})`
    }
    return `*shrugs* It is just a job. (${archetypeName})`
  }

  if (hasQuestion) {
    if (receptiveness >= 6) {
      return `I like the people side of it. It keeps me on my toes. (${archetypeName})`
    }
    return `It pays the bills. (${archetypeName})`
  }

  if (hasPull) {
    if (receptiveness >= 6) {
      return `*smiles* Thanks. It can be fun. (${archetypeName})`
    }
    return `Yeah, it is fine. (${archetypeName})`
  }

  if (receptiveness >= 6) {
    return `*smiles politely* So yeah, ${jobTitle}. What do you do? (${archetypeName})`
  }
  return `*neutral* That's it. (${archetypeName})`
}

type SmallEvaluation = { score: number; feedback: string }

type MilestoneEvaluation = {
  score: number
  feedback: string
  strengths: string[]
  improvements: string[]
  suggestedNextLine?: string
}

function clampScore(value: number): number {
  return Math.max(1, Math.min(10, Math.round(value)))
}

function evaluateOpenerResponse(userMessage: string): {
  small: SmallEvaluation
  milestone: MilestoneEvaluation
} {
  const normalized = userMessage.trim()
  const lowerMessage = normalized.toLowerCase()
  const wordCount = normalized.split(/\s+/).filter(Boolean).length

  const hasAttentionGetter = /\bexcuse me\b/.test(lowerMessage)
  const hasApologeticFraming =
    /\b(sorry|apologize|apologies)\b/.test(lowerMessage) ||
    /\bsorry to bother\b/.test(lowerMessage) ||
    /\bhope (i'm|i am) not (bothering|interrupting)\b/.test(lowerMessage) ||
    /\bi know you're (probably )?(busy|in a hurry)\b/.test(lowerMessage)
  const hasCompliment = /\b(beautiful|gorgeous|hot|sexy|stunning|cute|pretty)\b/.test(lowerMessage)
  const hasQuestion = normalized.includes("?")
  const isTooShort = wordCount < 4
  const isTooLong = wordCount > 28

  let score = 6
  if (!hasApologeticFraming) score += 1
  if (!hasCompliment) score += 1
  if (hasQuestion) score += 1
  if (isTooShort) score -= 1
  if (isTooLong) score -= 1
  if (hasCompliment) score -= 1
  score = clampScore(score)

  const parts: string[] = []
  if (hasApologeticFraming) parts.push("Drop the apology and lead calmly.")
  if (hasCompliment) parts.push("Avoid generic compliments; go situational instead.")
  if (!hasQuestion) parts.push("Add a simple question to create a hook.")
  if (parts.length === 0) parts.push("Solid opener. Keep it simple and grounded.")
  const feedback = parts.slice(0, 2).join(" ")

  const strengths: string[] = []
  if (hasQuestion) strengths.push("You gave her a clear reason to respond.")
  if (!hasCompliment) strengths.push("You avoided appearance-based flattery.")
  if (!isTooLong) strengths.push("You kept it concise.")
  if (hasAttentionGetter) strengths.push("You used a clean attention-getter.")
  if (strengths.length === 0) strengths.push("You took the initiative to open.")

  const improvements: string[] = []
  if (hasApologeticFraming) improvements.push("Lead without asking permission.")
  if (hasCompliment) improvements.push("Swap the compliment for a situational hook.")
  if (!hasQuestion) improvements.push("End with a question to make replying easy.")
  if (isTooLong) improvements.push("Shorten it to one clean sentence.")
  if (improvements.length === 0) improvements.push("Add a sharper hook to spark curiosity.")

  const suggestedNextLine =
    "Hey, quick question — you look like you know this area. What's the best coffee spot nearby?"

  return {
    small: { score, feedback },
    milestone: {
      score,
      feedback,
      strengths: strengths.slice(0, 2),
      improvements: improvements.slice(0, 2),
      suggestedNextLine,
    },
  }
}

function evaluateCareerResponse(
  userMessage: string,
  jobTitle: string
): { small: SmallEvaluation; milestone: MilestoneEvaluation } {
  const normalized = userMessage.trim()
  const lowerMessage = normalized.toLowerCase()

  const hasTease = /(so you|so you're|so you are|bet you|do you ever|never|always)/.test(lowerMessage)
  const hasPull = /(cool|impressive|respect|like|love|interesting|attractive)/.test(lowerMessage)
  const hasQuestion = /\?/.test(userMessage) || /(what|why|how|got you into)/.test(lowerMessage)

  let score = 6
  if (hasTease) score += 2
  if (hasPull) score += 1
  if (hasQuestion) score += 1
  if (!hasTease && !hasPull) score -= 1
  score = clampScore(score)

  let feedback = ""
  if (hasTease && hasPull) {
    feedback = "Good push/pull. Keep teasing but add warmth so it doesn't feel arrogant."
  } else if (hasTease) {
    feedback = "Nice tease. Add a bit of warmth or curiosity after to keep rapport."
  } else if (hasPull) {
    feedback = "Good warmth, but add a playful tease to create tension."
  } else if (hasQuestion) {
    feedback = "Fine, but don't interview. Add a playful frame before the question."
  } else {
    feedback = "Add a playful tease or a curious hook — don't just acknowledge her job."
  }

  const strengths: string[] = []
  if (hasTease) strengths.push("You teased instead of interviewing.")
  if (hasPull) strengths.push("You added warmth/validation.")
  if (hasQuestion) strengths.push("You kept the conversation moving.")
  if (strengths.length === 0) strengths.push("You responded rather than freezing.")

  const improvements: string[] = []
  if (!hasTease) improvements.push("Add a playful tease (push) to create tension.")
  if (!hasPull) improvements.push("Add a touch of warmth (pull) after the tease.")
  if (!hasQuestion) improvements.push("End with a simple question to keep momentum.")
  if (improvements.length === 0) improvements.push("Tighten the tease and make it more specific.")

  const suggestedNextLine = `So you're a ${jobTitle}... do you ever turn that off, or are you always in work mode?`

  return {
    small: { score, feedback },
    milestone: {
      score,
      feedback,
      strengths: strengths.slice(0, 2),
      improvements: improvements.slice(0, 2),
      suggestedNextLine,
    },
  }
}

function evaluateShittestResponse(userMessage: string): {
  small: SmallEvaluation
  milestone: MilestoneEvaluation
} {
  const normalized = userMessage.trim()
  const lowerMessage = normalized.toLowerCase()
  const wordCount = normalized.split(/\s+/).filter(Boolean).length

  const exitSignals = ["no worries", "take care", "have a good", "sorry", "my bad", "all good", "bye"]
  const defensiveSignals = ["what's your problem", "relax", "chill", "whatever", "why would", "you're rude"]
  const playfulSignals = ["haha", "lol", "fair", "just teasing", "just messing", "smile", "laugh"]
  const hasQuestion = normalized.includes("?")

  const exited = exitSignals.some((phrase) => lowerMessage.includes(phrase))
  const defensive = defensiveSignals.some((phrase) => lowerMessage.includes(phrase))
  const playful = playfulSignals.some((phrase) => lowerMessage.includes(phrase))

  let score = 6
  if (playful) score += 2
  if (hasQuestion) score += 1
  if (defensive) score -= 3
  if (exited) score -= 1
  if (wordCount > 35) score -= 1
  score = clampScore(score)

  let feedback = ""
  if (defensive) {
    feedback = "You got defensive. Stay light and playful instead of explaining."
  } else if (exited) {
    feedback = "Polite exit, but you can often stay playful and reframe."
  } else if (playful) {
    feedback = "Good playfulness. Keep it light and keep the frame."
  } else {
    feedback = "Stay relaxed and add a playful reframe to pass the test."
  }

  const strengths: string[] = []
  if (playful) strengths.push("You kept it playful.")
  if (!defensive) strengths.push("You avoided over-explaining.")
  if (hasQuestion) strengths.push("You kept the interaction moving.")
  if (strengths.length === 0) strengths.push("You responded calmly.")

  const improvements: string[] = []
  if (defensive) improvements.push("Drop the defensiveness and tease it off.")
  if (!playful) improvements.push("Add a light joke or tease to disarm the test.")
  if (!hasQuestion) improvements.push("End with a simple question or redirect.")
  if (improvements.length === 0) improvements.push("Hold the frame and keep it light.")

  const suggestedNextLine = "Fair enough. I had to see if you were as serious as you look. What are you up to?"

  return {
    small: { score, feedback },
    milestone: {
      score,
      feedback,
      strengths: strengths.slice(0, 2),
      improvements: improvements.slice(0, 2),
      suggestedNextLine,
    },
  }
}
