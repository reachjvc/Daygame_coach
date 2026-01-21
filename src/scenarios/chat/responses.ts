/**
 * Placeholder Response Generators
 *
 * Generates AI-like responses for chat scenarios when LLM is not used.
 * These are rule-based responses that simulate conversation flow.
 */

import type { DifficultyLevel } from "@/src/scenarios/shared/difficulty"
import { getRandomShittest } from "@/src/scenarios/shittests/data/shit-tests"

// ─────────────────────────────────────────────────────────────────────────────
// Opener Placeholder Response
// ─────────────────────────────────────────────────────────────────────────────

export function generatePlaceholderResponse(
  userMessage: string,
  archetypeName: string,
  difficulty: DifficultyLevel
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

// ─────────────────────────────────────────────────────────────────────────────
// Shit-Test Placeholder Response
// ─────────────────────────────────────────────────────────────────────────────

export function generatePlaceholderShittestResponse(
  userMessage: string,
  archetypeName: string,
  difficulty: DifficultyLevel,
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

// ─────────────────────────────────────────────────────────────────────────────
// Career Placeholder Response
// ─────────────────────────────────────────────────────────────────────────────

export function generateCareerPlaceholderResponse(
  userMessage: string,
  archetypeName: string,
  difficulty: DifficultyLevel,
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
