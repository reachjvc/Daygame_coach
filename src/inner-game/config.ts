import type { CategoryInfo } from "./types"

/**
 * Inner Game Configuration
 */

// ============================================================================
// Category Definitions with Descriptions
// ============================================================================

export const CATEGORIES: CategoryInfo[] = [
  {
    id: "disc",
    code: "DISC",
    label: "Discipline, Structure & Performance",
    color: "#9E9E9E",
    description: "Structure brings freedom through mastery. These values center on creating order in your life, following through on commitments, and achieving excellence through consistent effort.",
    daygameRelevance: "Consistent practice compounds over time. Following through on leads, maintaining routines, and showing up even when you don't feel like it separates those who improve from those who stay stuck.",
    values: [
      "Accomplishment", "Accuracy", "Achievement", "Alertness", "Careful", "Cleanliness", "Clarity",
      "Commitment", "Competence", "Concentration", "Consistency", "Dedication", "Discipline",
      "Effectiveness", "Efficiency", "Excellence", "Focus", "Hard work", "Order", "Organization",
      "Performance", "Productivity", "Professionalism", "Quality", "Results-oriented", "Rigor",
      "Simplicity", "Structure", "Thorough", "Timeliness"
    ]
  },
  {
    id: "drive",
    code: "DRIVE",
    label: "Courage, Drive & Intensity",
    color: "#E53935",
    description: "Ambition fuels growth and resilience. These values are about pushing through fear, taking bold action, and maintaining the fire that drives you forward despite obstacles.",
    daygameRelevance: "Approaching despite fear is the foundation of daygame. Every approach requires courage. Persistence through rejection, determination to keep going, and the intensity to stay present in challenging moments.",
    values: [
      "Ambition", "Boldness", "Bravery", "Challenge", "Courage", "Decisive", "Decisiveness",
      "Determination", "Drive", "Endurance", "Fearless", "Ferocious", "Fortitude", "Intensity",
      "Motivation", "Passion", "Persistence", "Strength", "Toughness", "Valor", "Vigor"
    ]
  },
  {
    id: "emo",
    code: "EMO",
    label: "Emotional Regulation & Inner State",
    color: "#26A69A",
    description: "Inner stability creates outer confidence. These values focus on maintaining emotional equilibrium, finding peace within yourself, and staying grounded regardless of external circumstances.",
    daygameRelevance: "Staying grounded during rejection is essential. Your emotional state is contagious—women sense your inner calm or chaos immediately. Peace within creates presence without.",
    values: [
      "Balance", "Calm", "Comfort", "Contentment", "Feelings", "Gratitude", "Happiness", "Harmony",
      "Health", "Moderation", "Optimism", "Patience", "Peace", "Present", "Restraint", "Satisfaction",
      "Security", "Sensitivity", "Serenity", "Silence", "Solitude", "Stability", "Temperance",
      "Thankful", "Tranquility"
    ]
  },
  {
    id: "eth",
    code: "ETH",
    label: "Ethics, Integrity & Moral Compass",
    color: "#1E88E5",
    description: "Integrity builds self-trust. These values are about being honest with yourself and others, maintaining your moral code, and building the kind of character you can be proud of.",
    daygameRelevance: "Being honest and avoiding manipulation creates authentic connections. When you're congruent—your words match your intentions—women trust you. Self-respect comes from living by your values.",
    values: [
      "Accountability", "Candor", "Credibility", "Dependability", "Equality", "Ethical", "Fairness",
      "Fidelity", "Goodness", "Honesty", "Honor", "Integrity", "Justice", "Lawful", "Respect",
      "Responsibility", "Sincerity", "Stewardship", "Sustainability", "Tolerance", "Transparency",
      "Trust", "Trustworthy", "Truth"
    ]
  },
  {
    id: "free",
    code: "FREE",
    label: "Freedom, Power & Independence",
    color: "#FB8C00",
    description: "Independence enables authentic choice. These values center on being self-directed, building your own path, and having the freedom to live life on your terms.",
    daygameRelevance: "Not needing validation from women is incredibly attractive. When you're not dependent on any particular outcome, you can be fully present and authentic. Freedom from outcome-dependence is freedom to connect.",
    values: [
      "Assertiveness", "Control", "Empower", "Famous", "Freedom", "Independence", "Leadership",
      "Liberty", "Power", "Prosperity", "Recognition", "Risk", "Status", "Success", "Victory",
      "Wealth", "Winning"
    ]
  },
  {
    id: "grow",
    code: "GROW",
    label: "Growth, Learning & Mastery",
    color: "#43A047",
    description: "Learning compounds over time. These values are about continuously improving, staying curious, and developing mastery through deliberate practice and reflection.",
    daygameRelevance: "Every interaction teaches you something. Improving with each approach, learning from mistakes, and developing genuine skill over time. The growth mindset transforms failure into feedback.",
    values: [
      "Adaptability", "Awareness", "Brilliance", "Clever", "Common sense", "Consciousness",
      "Curiosity", "Development", "Discovery", "Experience", "Exploration", "Genius", "Growth",
      "Improvement", "Innovation", "Inquisitive", "Insightful", "Intelligence", "Intuitive",
      "Knowledge", "Learning", "Logic", "Mastery", "Realistic", "Reason", "Reflective", "Skill",
      "Skillfulness", "Smart", "Talent", "Understanding", "Wisdom"
    ]
  },
  {
    id: "id",
    code: "ID",
    label: "Self-Worth & Identity",
    color: "#5C6BC0",
    description: "Self-worth is the foundation. These values are about knowing who you are, accepting yourself fully, and maintaining your sense of identity regardless of how others respond to you.",
    daygameRelevance: "Unshakeable confidence comes from within. When your self-worth isn't dependent on whether she's interested, you can be genuinely curious about her rather than performing for validation.",
    values: [
      "Acceptance", "Capable", "Certainty", "Confidence", "Conviction", "Dignity", "Grace",
      "Humility", "Individuality", "Maturity", "Poise", "Self-reliance", "Uniqueness"
    ]
  },
  {
    id: "play",
    code: "PLAY",
    label: "Play, Expression & Vitality",
    color: "#FDD835",
    description: "Joy makes you magnetic. These values focus on bringing energy, creativity, and lightness to life—not taking everything so seriously and allowing yourself to play.",
    daygameRelevance: "Playfulness is incredibly attractive. Not taking yourself or the interaction too seriously, being able to joke and tease, bringing energy and fun to the conversation. Women want to feel good around you.",
    values: [
      "Amusement", "Beauty", "Creation", "Creativity", "Energy", "Enjoyment", "Enthusiasm",
      "Expressive", "Fun", "Imagination", "Irreverent", "Joy", "Originality", "Playfulness",
      "Recreation", "Spontaneous", "Surprise", "Vitality", "Wonder"
    ]
  },
  {
    id: "purp",
    code: "PURP",
    label: "Purpose, Vision & Meaning",
    color: "#8E24AA",
    description: "Direction gives meaning. These values are about having something bigger than yourself to work toward, a vision for your life, and a sense of why you do what you do.",
    daygameRelevance: "Knowing what you want—in life and in dating—gives you direction. A man with purpose is attractive because he's going somewhere. You're not seeking completion from women; you're inviting them into an already full life.",
    values: [
      "Devotion", "Foresight", "Greatness", "Hope", "Inspiring", "Meaning", "Potential", "Purpose",
      "Reverence", "Significance", "Spirit", "Spirituality", "Traditional", "Vision"
    ]
  },
  {
    id: "soc",
    code: "SOC",
    label: "Connection, Love & Belonging",
    color: "#EC407A",
    description: "Connection enriches life. These values focus on building meaningful relationships, contributing to others, and creating bonds that matter.",
    daygameRelevance: "Genuine interest in women as people—not just targets—creates real connection. Empathy, kindness, and the ability to make others feel understood and valued. This is what transforms approaches into relationships.",
    values: [
      "Altruism", "Attentive", "Charity", "Communication", "Community", "Compassion", "Connection",
      "Contribution", "Cooperation", "Courtesy", "Empathy", "Family", "Friendship", "Generosity",
      "Giving", "Kindness", "Love", "Loyalty", "Openness", "Selfless", "Service", "Sharing",
      "Support", "Teamwork", "Thoughtful", "Unity", "Welcoming"
    ]
  }
]

// ============================================================================
// Category Lookup Maps
// ============================================================================

export const CATEGORY_BY_ID = Object.fromEntries(
  CATEGORIES.map(cat => [cat.id, cat])
) as Record<string, CategoryInfo>

export const CATEGORY_BY_CODE = Object.fromEntries(
  CATEGORIES.map(cat => [cat.code, cat])
) as Record<string, CategoryInfo>

export const CATEGORY_CODE_TO_LABEL = Object.fromEntries(
  CATEGORIES.map(cat => [cat.code, cat.label.split(",")[0].trim()])
) as Record<string, string>

// ============================================================================
// Time Estimates
// ============================================================================

export const TIME_ESTIMATES = {
  perCategory: 1,  // ~1 minute per category (10 categories = 10 min)
  hurdlesQuestion: 2,
  deathbedQuestion: 2,
  cuttingPhase: 4,
  totalMinutes: function() {
    return (CATEGORIES.length * this.perCategory) +
           this.hurdlesQuestion +
           this.deathbedQuestion +
           this.cuttingPhase
  }
}

// ============================================================================
// Step Labels
// ============================================================================

export const STEP_LABELS = {
  0: "Welcome",
  1: "Find Your Values",
  2: "Identify Your Hurdles",
  3: "Envision Your Legacy",
  4: "Prioritize Your Values",
  5: "Your Core Values"
} as const

// ============================================================================
// Ollama Configuration (for value inference)
// ============================================================================

export const INFERENCE_CONFIG = {
  baseUrl: process.env.OLLAMA_API_URL || "http://localhost:11434",
  model: process.env.OLLAMA_MODEL || "llama3.1",
  temperature: 0.7,
  maxTokens: 1024,
}

// ============================================================================
// Cutting Phase Configuration
// ============================================================================

export const CUTTING_CONFIG = {
  targetCoreValues: 7,
  maxValuesForPairwise: 20,
  minValuesForCutting: 8,
}
