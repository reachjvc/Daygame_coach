import type { CategoryInfo } from "./types"

/**
 * Inner Game Configuration
 *
 * 300 values across 11 categories (reduced from 355 after removing redundancies).
 * Based on comprehensive analysis against:
 * - Schwartz Theory of Basic Values
 * - VIA Character Strengths (24 strengths)
 * - Rokeach Value Survey (36 values)
 * - Threads Culture 500 Core Values
 * - Mark Manson's Models (daygame-specific)
 *
 * New PRES category added for Presence, Charisma & Social Magnetism
 */

// ============================================================================
// Category Definitions with Descriptions
// ============================================================================

export const CATEGORIES: CategoryInfo[] = [
  {
    id: "pres",
    code: "PRES",
    label: "Presence, Charisma & Social Magnetism",
    color: "#FF7043",
    description: "Magnetism draws people in. These values are about how you show up in the world—your ability to command attention, create attraction, and make others feel your energy.",
    daygameRelevance: "Charisma isn't about being loud or performing. It's about being fully present, genuinely warm, and unapologetically yourself. Women feel your presence before they hear your words.",
    values: [
      "Approachability", "Authenticity", "Charisma", "Charm", "Composure", "Directness",
      "Elegance", "Exuberance", "Flair", "Humor", "Intrigue", "Inviting", "Magnetism",
      "Mystery", "Pleasantness", "Polish", "Presence", "Self-expression", "Social intelligence",
      "Style", "Tact", "Vulnerability", "Warmth", "Wit"
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
      "Acceptance", "Assurance", "Backbone", "Capable", "Certainty", "Confidence",
      "Conviction", "Dignity", "Grace", "Groundedness", "Humility", "Individuality",
      "Inner strength", "Maturity", "Poise", "Pride", "Self-acceptance", "Self-assurance",
      "Self-awareness", "Self-esteem", "Self-possession", "Self-reliance", "Self-respect"
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
      "Action", "Adventure", "Ambition", "Boldness", "Challenge", "Courage",
      "Daring", "Decisive", "Determination", "Drive", "Endurance", "Excitement", "Fearless",
      "Ferocious", "Fierce", "Fortitude", "Grit", "Hustle", "Intensity",
      "Nerve", "Passion", "Persistence", "Proactive", "Relentless", "Resilience",
      "Strength", "Tenacity", "Toughness", "Vigor", "Willpower"
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
      "Balance", "Calm", "Cheerfulness", "Comfort", "Contentment", "Equanimity",
      "Feelings", "Gratitude", "Happiness", "Harmony", "Health",
      "Lightness", "Mellow", "Mindfulness", "Moderation", "Optimism", "Patience",
      "Peace", "Relaxation", "Restraint", "Satisfaction", "Security",
      "Self-control", "Sensitivity", "Silence", "Solitude", "Stability",
      "Stoicism", "Temperance"
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
      "Agency", "Assertiveness", "Autonomy", "Control", "Dominance", "Empower", "Famous",
      "Freedom", "Independence", "Influence", "Leadership", "Power",
      "Prosperity", "Recognition", "Risk", "Self-determination", "Self-direction",
      "Sovereignty", "Status", "Success", "Wealth", "Winning"
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
      "Acumen", "Adaptability", "Astuteness", "Awareness", "Calibration",
      "Clever", "Common sense", "Curiosity", "Discernment",
      "Discovery", "Experience", "Experimentation", "Exploration", "Genius", "Growth",
      "Innovation", "Insightful", "Intelligence", "Intuitive",
      "Knowledge", "Learning", "Logic", "Mastery", "Open-mindedness", "Perception",
      "Perspective", "Realistic", "Reflective", "Reinvention",
      "Resourcefulness", "Self-improvement", "Shrewdness", "Skill",
      "Smart", "Talent", "Understanding", "Versatility", "Wisdom"
    ]
  },
  {
    id: "disc",
    code: "DISC",
    label: "Discipline, Structure & Performance",
    color: "#607D8B",
    description: "Structure brings freedom through mastery. These values center on creating order in your life, following through on commitments, and achieving excellence through consistent effort.",
    daygameRelevance: "Consistent practice compounds over time. Following through on leads, maintaining routines, and showing up even when you don't feel like it separates those who improve from those who stay stuck.",
    values: [
      "Accomplishment", "Accuracy", "Alertness", "Careful", "Cleanliness",
      "Clarity", "Commitment", "Competence", "Consistency",
      "Diligence", "Discipline", "Effectiveness", "Efficiency", "Excellence", "Focus",
      "Hard work", "Methodical", "Meticulous", "Order", "Organization", "Performance",
      "Precision", "Prepared", "Productivity", "Professionalism", "Punctuality", "Quality",
      "Reliable", "Results-oriented", "Rigor", "Simplicity", "Structure", "Thorough"
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
      "Beauty", "Creation", "Creativity",
      "Energy", "Enthusiasm", "Exhilaration", "Festivity",
      "Fun", "Imagination", "Irreverent", "Joy",
      "Mischief", "Novelty", "Originality", "Playfulness", "Recreation", "Silliness",
      "Spontaneous", "Surprise", "Vitality", "Whimsy", "Wonder"
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
      "Affection", "Altruism", "Attentive", "Camaraderie",
      "Caring", "Charity", "Communication", "Community", "Compassion",
      "Connection", "Contribution", "Cooperation", "Cordiality", "Courtesy", "Empathy",
      "Family", "Friendship", "Generosity", "Hospitality", "Intimacy",
      "Kindness", "Love", "Loyalty", "Nurturing", "Openness",
      "Service", "Sharing", "Support", "Sympathy", "Teamwork", "Tenderness",
      "Thoughtful", "Unity"
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
      "Accountability", "Candor", "Credibility", "Decency", "Dependability", "Discretion",
      "Equality", "Fairness", "Forgiveness", "Goodwill",
      "Honesty", "Honor", "Integrity", "Justice", "Lawful", "Ownership",
      "Principled", "Prudence", "Respect", "Responsibility", "Self-honesty",
      "Sincerity", "Stewardship", "Sustainability", "Tolerance", "Transparency", "Trust",
      "Virtue"
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
      "Aspiration", "Calling", "Destiny", "Devotion", "Faith", "Foresight",
      "Fulfillment", "Greatness", "Hope", "Inspiring", "Legacy", "Meaning",
      "Potential", "Purpose", "Reverence",
      "Spirituality", "Traditional", "Transcendence", "Vision"
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
  perCategory: 1,  // ~1 minute per category (11 categories = 11 min)
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

// ============================================================================
// Value Source Configuration (for prioritization flow)
// ============================================================================

export const VALUE_SOURCE_CONFIG = {
  picked: {
    label: "Picked",
    color: "#10B981", // green-500
    description: "You selected this value",
  },
  shadow: {
    label: "Shadow",
    color: "#8B5CF6", // violet-500
    description: "Inferred from what frustrates you",
  },
  peak_experience: {
    label: "Peak",
    color: "#F59E0B", // amber-500
    description: "Present when you were at your best",
  },
  hurdles: {
    label: "Hurdles",
    color: "#EF4444", // red-500
    description: "Would help you overcome challenges",
  },
} as const
