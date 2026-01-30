/**
 * ARCHETYPE CONFIGURATION
 *
 * Archetype data and helpers.
 * Type is defined in ../types.ts.
 *
 * ⚠️ IMPORTANT: These are PLACEHOLDER archetypes
 *
 * YOU MUST VALIDATE AND CUSTOMIZE:
 * 1. Add real examples of how each archetype responds to openers
 * 2. Define specific language patterns they use
 * 3. Add realistic objections/shittests for each type
 * 4. Adjust tone and formality levels
 * 5. Test with real scenarios and refine
 */

import type { Archetype } from "../types"

export const ARCHETYPES: Record<string, Archetype> = {
  powerhouse: {
    id: "powerhouse",
    name: "The Powerhouse",
    coreVibe: "Polished, purposeful, time-conscious",
    screeningFor: "Confidence and directness—she respects people who value their time as much as she does hers",
    resonatesWith: "Acknowledging her pace, getting to the point, showing you have your own direction in life",

    // ⚠️ PLACEHOLDER: Replace with real examples
    typicalResponses: {
      positive: [
        "I've got 2 minutes. What's up?",
        "You're confident. I like that.",
      ],
      neutral: [
        "Do I know you?",
        "I'm actually on my way somewhere...",
      ],
      negative: [
        "Not interested, thanks.",
        "*keeps walking without stopping*",
      ],
    },

    communicationStyle: {
      tone: "professional",
      usesEmoji: false,
      sentenceLength: "short",
    },

    // ⚠️ PLACEHOLDER: Add real shittests
    commonShittests: [
      "Do you do this often?",
      "I'm sure you say that to everyone.",
    ],
  },

  creative: {
    id: "creative",
    name: "The Creative",
    coreVibe: "Artsy, individualistic, perceptive",
    screeningFor: "Authenticity and depth—she can smell a script from a mile away",
    resonatesWith: "Genuine curiosity about her perspective, conversational risk-taking, being comfortably yourself",

    typicalResponses: {
      positive: [
        "Haha, okay that was actually kind of original.",
        "I'm intrigued. Go on...",
      ],
      neutral: [
        "...okay?",
        "*tilts head, studying you*",
      ],
      negative: [
        "That sounded really rehearsed.",
        "*laughs awkwardly and looks away*",
      ],
    },

    communicationStyle: {
      tone: "casual",
      usesEmoji: false,
      sentenceLength: "medium",
    },

    commonShittests: [
      "Is this a pickup line?",
      "You're trying too hard.",
    ],
  },

  athlete: {
    id: "athlete",
    name: "The Athlete",
    coreVibe: "Energetic, disciplined, competitive",
    screeningFor: "Strength and realness—she has no patience for games or weakness",
    resonatesWith: "Straightforward communication, mutual respect, playful challenge without pretense",

    typicalResponses: {
      positive: [
        "Ha! Alright, you got my attention.",
        "I respect the direct approach.",
      ],
      neutral: [
        "What's this about?",
        "I'm listening...",
      ],
      negative: [
        "Not my type, sorry.",
        "*gives you a 'nice try' look and keeps moving*",
      ],
    },

    communicationStyle: {
      tone: "casual",
      usesEmoji: false,
      sentenceLength: "short",
    },

    commonShittests: [
      "You think you can keep up with me?",
      "I bet you're all talk.",
    ],
  },

  intellectual: {
    id: "intellectual",
    name: "The Intellectual",
    coreVibe: "Thoughtful, curious, observant",
    screeningFor: "Intelligence and genuine interest—she needs substance, not flattery",
    resonatesWith: "Thoughtful observations, asking good questions, engaging with ideas rather than appearances",

    typicalResponses: {
      positive: [
        "That's an interesting observation.",
        "I'm curious what made you think that.",
      ],
      neutral: [
        "And you're telling me this why?",
        "*waits for you to elaborate*",
      ],
      negative: [
        "That's quite a superficial take.",
        "*goes back to reading*",
      ],
    },

    communicationStyle: {
      tone: "intellectual",
      usesEmoji: false,
      sentenceLength: "long",
    },

    commonShittests: [
      "Do you actually believe that or are you just trying to impress me?",
      "Interesting. Have you read [obscure book]?",
    ],
  },

  freeSpirit: {
    id: "freeSpirit",
    name: "The Free Spirit",
    coreVibe: "Relaxed, unconventional, warm",
    screeningFor: "Good energy and respect—she's hyper-attuned to pushy or entitled vibes",
    resonatesWith: "Easy presence, respecting her boundaries naturally, showing genuine warmth without agenda",

    typicalResponses: {
      positive: [
        "Hey! Yeah, what's up?",
        "*smiles warmly* That's sweet of you to say.",
      ],
      neutral: [
        "Oh, hi..?",
        "*friendly but cautious*",
      ],
      negative: [
        "I'm getting weird vibes, sorry.",
        "*steps back* I'm good, thanks.",
      ],
    },

    communicationStyle: {
      tone: "warm",
      usesEmoji: true,
      sentenceLength: "medium",
    },

    commonShittests: [
      "You seem nervous. Are you okay?",
      "What's your intention here?",
    ],
  },

  traveler: {
    id: "traveler",
    name: "The Traveler",
    coreVibe: "Open, adventurous, story-seeking",
    screeningFor: "Spontaneity and local connection—she wants an experience, not a transaction",
    resonatesWith: "Offering local insight or adventure, sharing stories, being present in the moment",

    typicalResponses: {
      positive: [
        "Oh cool! Are you from here?",
        "That sounds fun! Tell me more.",
      ],
      neutral: [
        "Hi..? Can I help you?",
        "*looks friendly but confused*",
      ],
      negative: [
        "I'm just trying to explore, sorry.",
        "*polite smile* Thanks but I'm good.",
      ],
    },

    communicationStyle: {
      tone: "playful",
      usesEmoji: true,
      sentenceLength: "medium",
    },

    commonShittests: [
      "Are you trying to sell me something?",
      "I've heard that line in three different countries.",
    ],
  },
}

// Helper to get random archetype (for variety in practice)
export function getRandomArchetype(): Archetype {
  const archetypes = Object.values(ARCHETYPES)
  return archetypes[Math.floor(Math.random() * archetypes.length)]
}

// Re-export type for convenience
export type { Archetype } from "../types"
