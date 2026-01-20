/**
 * ENERGY DIMENSION
 *
 * Energy is the dominant personality/vibe layer that colors the entire scenario.
 * It affects both what the user sees and how the AI roleplays.
 *
 * Energy is weighted by difficulty:
 * - Lower difficulty = more approachable energies (bubbly, cheerful, relaxed)
 * - Higher difficulty = more closed energies (focused, rushed, closed, icy)
 */

export type EnergyState =
  // Positive/Open energies
  | "bubbly"
  | "cheerful"
  | "relaxed"
  | "curious"
  | "playful"
  | "flirty"
  | "excited"
  | "amused"
  | "content"
  // Neutral energies
  | "neutral"
  | "daydreaming"
  | "shy"
  | "bored"
  // Negative/Closed energies
  | "preoccupied"
  | "focused"
  | "rushed"
  | "closed"
  | "icy"
  | "tired"
  | "stressed"
  | "distracted"
  | "confident"
  | "irritated"
  | "impatient"
  | "skeptical"
  | "melancholic";

export type DifficultyLevel = "beginner" | "intermediate" | "advanced" | "expert" | "master";

interface EnergyConfig {
  id: EnergyState;
  name: string;
  /** How obvious this energy is to observe (0-1). Affects text visibility. */
  visibility: number;
  /** Base approachability (0-1). Higher = easier to approach. */
  approachability: number;
  /** User-facing texts when this energy IS shown (pick randomly) */
  visibleTexts: string[];
  /** For AI handoff - how to roleplay this energy */
  aiDescription: string;
}

export const ENERGY_STATES: Record<EnergyState, EnergyConfig> = {
  bubbly: {
    id: "bubbly",
    name: "Bubbly",
    visibility: 0.9,
    approachability: 0.95,
    visibleTexts: [
      "She's smiling to herself.",
      "There's a lightness in her step.",
      "She looks like she's in a great mood.",
      "She has an easy smile on her face.",
      "She seems cheerful.",
      "There's a brightness about her.",
      "She looks happy.",
    ],
    aiDescription: "Warm, open, likely to respond positively to a friendly approach. Smiles easily.",
  },

  cheerful: {
    id: "cheerful",
    name: "Cheerful",
    visibility: 0.8,
    approachability: 0.85,
    visibleTexts: [
      "She seems in good spirits.",
      "There's a pleasant look about her.",
      "She looks content.",
      "She has a relaxed smile.",
      "She seems at ease.",
      "She looks friendly.",
    ],
    aiDescription: "Positive mood, open to conversation if approached well. Friendly but not overly eager.",
  },

  relaxed: {
    id: "relaxed",
    name: "Relaxed",
    visibility: 0.6,
    approachability: 0.75,
    visibleTexts: [
      "She looks unhurried.",
      "She seems relaxed.",
      "There's no rush in her movement.",
      "She appears at ease.",
      "She has a calm presence.",
    ],
    aiDescription: "Calm and unhurried. Open to interaction but not actively seeking it. Neutral-positive baseline.",
  },

  neutral: {
    id: "neutral",
    name: "Neutral",
    visibility: 0.2,
    approachability: 0.5,
    visibleTexts: [
      // Neutral often means nothing extra is said
      "Her expression is unreadable.",
      "She has a neutral expression.",
    ],
    aiDescription: "Default state. Neither inviting nor discouraging. Response depends entirely on the approach quality.",
  },

  daydreaming: {
    id: "daydreaming",
    name: "Daydreaming",
    visibility: 0.5,
    approachability: 0.55,
    visibleTexts: [
      "She seems lost in thought.",
      "Her gaze is distant.",
      "She looks like she's daydreaming.",
      "Her mind seems elsewhere.",
      "She has a faraway look.",
    ],
    aiDescription: "Mentally elsewhere but in a soft way. May take a moment to 'come back' when approached. Not hostile.",
  },

  preoccupied: {
    id: "preoccupied",
    name: "Preoccupied",
    visibility: 0.4,
    approachability: 0.4,
    visibleTexts: [
      "She seems to have something on her mind.",
      "She looks preoccupied.",
      "There's a slight furrow to her brow.",
    ],
    aiDescription: "Thinking about something. Slightly harder to engage. Needs a reason to break from her thoughts.",
  },

  focused: {
    id: "focused",
    name: "Focused",
    visibility: 0.5,
    approachability: 0.3,
    visibleTexts: [
      "She looks focused.",
      "She seems intent on something.",
      "Her attention is elsewhere.",
      "She looks like she knows where she's going.",
    ],
    aiDescription: "Concentrated on a task or destination. Will need a strong opener to break through. May be curt initially.",
  },

  rushed: {
    id: "rushed",
    name: "Rushed",
    visibility: 0.8,
    approachability: 0.2,
    visibleTexts: [
      "She's walking quickly.",
      "She looks like she's in a hurry.",
      "She seems pressed for time.",
      "There's urgency in her movement.",
      "She's moving quickly.",
      "She looks like she has somewhere to be.",
    ],
    aiDescription: "Time pressure. Will likely mention being in a hurry. Hard to stop. Needs a very compelling reason to engage.",
  },

  closed: {
    id: "closed",
    name: "Closed",
    visibility: 0.6,
    approachability: 0.15,
    visibleTexts: [
      "Her body language is closed off.",
      "She doesn't look particularly approachable.",
      "She looks guarded.",
      "She seems reserved.",
    ],
    aiDescription: "Actively not inviting interaction. Guarded. Will likely give short responses or polite rejection unless approach is exceptional.",
  },

  icy: {
    id: "icy",
    name: "Icy",
    visibility: 0.85,
    approachability: 0.05,
    visibleTexts: [
      "Her expression is cold.",
      "She looks unapproachable.",
      "She looks uninviting.",
      "There's something cold about her.",
      "She looks like she doesn't want to be bothered.",
    ],
    aiDescription: "Cold, dismissive. Will likely reject or ignore unless approach is truly exceptional and calibrated. May give harsh shittests.",
  },

  // ============================================================================
  // NEW ENERGY STATES
  // ============================================================================

  curious: {
    id: "curious",
    name: "Curious",
    visibility: 0.7,
    approachability: 0.8,
    visibleTexts: [
      "She's looking around with interest.",
      "She seems curious about her surroundings.",
      "She looks like she's taking things in.",
      "There's an interested look in her eyes.",
      "She seems engaged with what's around her.",
    ],
    aiDescription: "Open and interested in her environment. Likely to be receptive to conversation starters about the surroundings.",
  },

  playful: {
    id: "playful",
    name: "Playful",
    visibility: 0.8,
    approachability: 0.9,
    visibleTexts: [
      "She's smiling at something on her phone.",
      "There's a playful look about her.",
      "She has a playful smile.",
      "She keeps smiling to herself.",
      "There's a mischievous smile on her face.",
    ],
    aiDescription: "Light, fun energy. Will likely respond well to playful banter. May tease back if approached with humor.",
  },

  tired: {
    id: "tired",
    name: "Tired",
    visibility: 0.6,
    approachability: 0.35,
    visibleTexts: [
      "She looks a bit tired.",
      "She seems low on energy.",
      "There's a tiredness about her.",
      "She looks like she could use a break.",
      "Her energy seems low.",
    ],
    aiDescription: "Low energy but not hostile. May need more effort to engage. Will appreciate a considerate approach.",
  },

  stressed: {
    id: "stressed",
    name: "Stressed",
    visibility: 0.65,
    approachability: 0.25,
    visibleTexts: [
      "She looks a bit stressed.",
      "There's tension in her posture.",
      "She seems like she has a lot on her mind.",
      "She looks tense.",
      "She seems under pressure.",
    ],
    aiDescription: "Tense and under pressure. Harder to engage. May be curt or distracted. A calming, low-pressure approach works best.",
  },

  distracted: {
    id: "distracted",
    name: "Distracted",
    visibility: 0.5,
    approachability: 0.3,
    visibleTexts: [
      "She's absorbed in her phone.",
      "She seems distracted by something.",
      "Her attention is on her phone.",
      "She's not really paying attention to what's around her.",
      "She seems lost in her phone.",
    ],
    aiDescription: "Not aware of surroundings. Hard to get attention. Will need something to break through the distraction.",
  },

  confident: {
    id: "confident",
    name: "Confident",
    visibility: 0.75,
    approachability: 0.6,
    visibleTexts: [
      "She has confident body language.",
      "She walks with confidence.",
      "There's a self-assured quality about her.",
      "She seems to know where she's going.",
      "She has a confident presence.",
    ],
    aiDescription: "Strong, self-assured presence. Not easily impressed. Requires a confident, direct approach. May test early.",
  },

  shy: {
    id: "shy",
    name: "Shy",
    visibility: 0.5,
    approachability: 0.45,
    visibleTexts: [
      "She seems a bit shy.",
      "She's keeping to herself.",
      "She has a quiet presence.",
      "She seems reserved but not unfriendly.",
      "There's a shyness about her.",
    ],
    aiDescription: "Reserved but not closed off. Will warm up with a gentle, non-threatening approach. Needs space to open up.",
  },

  bored: {
    id: "bored",
    name: "Bored",
    visibility: 0.6,
    approachability: 0.65,
    visibleTexts: [
      "She looks a bit bored.",
      "She seems like she's waiting for something.",
      "There's a bored expression on her face.",
      "She looks like she has nothing to do.",
      "She seems like she could use some entertainment.",
    ],
    aiDescription: "Understimulated and looking for something interesting. May welcome an engaging conversation. Good opportunity if you're interesting.",
  },

  // ============================================================================
  // ADDITIONAL ENERGY STATES (v2)
  // ============================================================================

  flirty: {
    id: "flirty",
    name: "Flirty",
    visibility: 0.75,
    approachability: 0.92,
    visibleTexts: [
      "She glances around with a slight smile.",
      "She seems to be making eye contact with people.",
      "There's a flirtatious energy about her.",
      "She looks like she's in a social mood.",
      "She has a coy smile.",
      "She seems open to attention.",
    ],
    aiDescription: "Actively receptive to social interaction, especially from men. Will likely respond well to direct interest. May initiate light teasing.",
  },

  excited: {
    id: "excited",
    name: "Excited",
    visibility: 0.85,
    approachability: 0.88,
    visibleTexts: [
      "She looks excited about something.",
      "There's an energetic bounce in her step.",
      "She seems happy and animated.",
      "She looks like something good just happened.",
      "There's excitement in her expression.",
      "She has a lot of energy.",
    ],
    aiDescription: "High positive energy, enthusiastic. Will likely share what she's excited about if given the chance. Easy to engage.",
  },

  amused: {
    id: "amused",
    name: "Amused",
    visibility: 0.7,
    approachability: 0.82,
    visibleTexts: [
      "She looks amused by something.",
      "There's a slight smirk on her face.",
      "She seems entertained.",
      "She has an amused expression.",
      "She looks like she just heard something funny.",
    ],
    aiDescription: "Light, entertained mood. Will appreciate humor and wit. Good candidate for playful banter.",
  },

  content: {
    id: "content",
    name: "Content",
    visibility: 0.5,
    approachability: 0.7,
    visibleTexts: [
      "She looks content.",
      "She seems at peace.",
      "There's a serene quality about her.",
      "She looks comfortable where she is.",
      "She seems satisfied.",
    ],
    aiDescription: "Quietly content, not seeking but open to interaction. Appreciates a respectful, unhurried approach.",
  },

  irritated: {
    id: "irritated",
    name: "Irritated",
    visibility: 0.7,
    approachability: 0.12,
    visibleTexts: [
      "She looks slightly annoyed.",
      "There's irritation in her expression.",
      "She seems bothered by something.",
      "She has a frustrated look.",
      "She doesn't look happy.",
    ],
    aiDescription: "Something has annoyed her. Will be quick to dismiss unless approach is genuinely charming. May vent frustration.",
  },

  impatient: {
    id: "impatient",
    name: "Impatient",
    visibility: 0.75,
    approachability: 0.18,
    visibleTexts: [
      "She keeps checking her phone.",
      "She looks impatient.",
      "She seems to be waiting for something.",
      "She looks restless.",
      "She's tapping her foot.",
      "She keeps looking around impatiently.",
    ],
    aiDescription: "Waiting for something and not happy about it. Low tolerance for interruption unless it's genuinely engaging.",
  },

  skeptical: {
    id: "skeptical",
    name: "Skeptical",
    visibility: 0.6,
    approachability: 0.25,
    visibleTexts: [
      "She has a skeptical expression.",
      "She looks like she's sizing things up.",
      "There's a guarded look in her eyes.",
      "She seems to be observing carefully.",
      "She has a questioning look.",
    ],
    aiDescription: "Naturally skeptical and not easily impressed. Will test authenticity early. Requires genuine confidence, not just charm.",
  },

  melancholic: {
    id: "melancholic",
    name: "Melancholic",
    visibility: 0.55,
    approachability: 0.35,
    visibleTexts: [
      "She looks a bit sad.",
      "There's a melancholy about her.",
      "She seems lost in her thoughts.",
      "She has a wistful expression.",
      "She looks like she has something on her mind.",
    ],
    aiDescription: "Reflective, possibly sad. May welcome genuine human connection but not superficial chat. Approach with sensitivity.",
  },
};

/**
 * Energy weights by difficulty level.
 * Higher weight = more likely to be selected at that difficulty.
 */
const ENERGY_WEIGHTS: Record<DifficultyLevel, Record<EnergyState, number>> = {
  beginner: {
    // Very approachable energies dominate
    bubbly: 0.12,
    cheerful: 0.14,
    relaxed: 0.12,
    neutral: 0.06,
    daydreaming: 0.03,
    preoccupied: 0.01,
    focused: 0.01,
    rushed: 0.00,
    closed: 0.00,
    icy: 0.00,
    curious: 0.10,
    playful: 0.12,
    tired: 0.01,
    stressed: 0.00,
    distracted: 0.01,
    confident: 0.03,
    shy: 0.03,
    bored: 0.06,
    // v2 energies
    flirty: 0.06,
    excited: 0.05,
    amused: 0.04,
    content: 0.04,
    irritated: 0.00,
    impatient: 0.00,
    skeptical: 0.00,
    melancholic: 0.01,
  },
  intermediate: {
    bubbly: 0.06,
    cheerful: 0.10,
    relaxed: 0.10,
    neutral: 0.10,
    daydreaming: 0.05,
    preoccupied: 0.04,
    focused: 0.03,
    rushed: 0.02,
    closed: 0.00,
    icy: 0.00,
    curious: 0.08,
    playful: 0.08,
    tired: 0.03,
    stressed: 0.02,
    distracted: 0.03,
    confident: 0.05,
    shy: 0.04,
    bored: 0.05,
    // v2 energies
    flirty: 0.04,
    excited: 0.04,
    amused: 0.04,
    content: 0.04,
    irritated: 0.01,
    impatient: 0.01,
    skeptical: 0.02,
    melancholic: 0.02,
  },
  advanced: {
    bubbly: 0.02,
    cheerful: 0.04,
    relaxed: 0.06,
    neutral: 0.10,
    daydreaming: 0.04,
    preoccupied: 0.06,
    focused: 0.06,
    rushed: 0.05,
    closed: 0.03,
    icy: 0.00,
    curious: 0.05,
    playful: 0.05,
    tired: 0.05,
    stressed: 0.04,
    distracted: 0.05,
    confident: 0.07,
    shy: 0.03,
    bored: 0.04,
    // v2 energies
    flirty: 0.03,
    excited: 0.03,
    amused: 0.03,
    content: 0.03,
    irritated: 0.03,
    impatient: 0.03,
    skeptical: 0.04,
    melancholic: 0.04,
  },
  expert: {
    bubbly: 0.00,
    cheerful: 0.02,
    relaxed: 0.03,
    neutral: 0.08,
    daydreaming: 0.04,
    preoccupied: 0.06,
    focused: 0.08,
    rushed: 0.07,
    closed: 0.06,
    icy: 0.04,
    curious: 0.03,
    playful: 0.03,
    tired: 0.05,
    stressed: 0.05,
    distracted: 0.05,
    confident: 0.08,
    shy: 0.02,
    bored: 0.03,
    // v2 energies
    flirty: 0.02,
    excited: 0.02,
    amused: 0.02,
    content: 0.02,
    irritated: 0.04,
    impatient: 0.04,
    skeptical: 0.05,
    melancholic: 0.05,
  },
  master: {
    bubbly: 0.00,
    cheerful: 0.00,
    relaxed: 0.01,
    neutral: 0.05,
    daydreaming: 0.02,
    preoccupied: 0.05,
    focused: 0.08,
    rushed: 0.10,
    closed: 0.10,
    icy: 0.08,
    curious: 0.01,
    playful: 0.01,
    tired: 0.06,
    stressed: 0.08,
    distracted: 0.06,
    confident: 0.10,
    shy: 0.01,
    bored: 0.02,
    // v2 energies - harder energies dominate at master
    flirty: 0.01,
    excited: 0.01,
    amused: 0.01,
    content: 0.01,
    irritated: 0.06,
    impatient: 0.06,
    skeptical: 0.06,
    melancholic: 0.05,
  },
};

/**
 * Sample an energy state based on difficulty level
 */
export function sampleEnergy(difficulty: DifficultyLevel): EnergyState {
  const weights = ENERGY_WEIGHTS[difficulty];
  const entries = Object.entries(weights) as [EnergyState, number][];

  const totalWeight = entries.reduce((sum, [, w]) => sum + w, 0);
  let random = Math.random() * totalWeight;

  for (const [energy, weight] of entries) {
    random -= weight;
    if (random <= 0) {
      return energy;
    }
  }

  return "neutral"; // Fallback
}

/**
 * Get visible text for an energy state.
 * Returns empty string if energy shouldn't be shown (based on visibility + difficulty).
 */
export function getEnergyText(energy: EnergyState, difficulty: DifficultyLevel): string {
  const config = ENERGY_STATES[energy];

  // Difficulty reduces visibility
  // beginner: full visibility, master: heavily reduced
  const difficultyModifier: Record<DifficultyLevel, number> = {
    beginner: 1.0,
    intermediate: 0.85,
    advanced: 0.6,
    expert: 0.4,
    master: 0.2,
  };

  const effectiveVisibility = config.visibility * difficultyModifier[difficulty];

  // Random check if this energy is visible
  if (Math.random() > effectiveVisibility) {
    return ""; // Not visible at this difficulty
  }

  // Pick random text
  const texts = config.visibleTexts;
  return texts[Math.floor(Math.random() * texts.length)];
}

/**
 * Get AI handoff description for energy
 */
export function getEnergyAiDescription(energy: EnergyState): string {
  return ENERGY_STATES[energy].aiDescription;
}

/**
 * Get approachability score (0-1) for energy
 */
export function getEnergyApproachability(energy: EnergyState): number {
  return ENERGY_STATES[energy].approachability;
}

// Energy categories for sandbox filtering
const NEGATIVE_ENERGIES: EnergyState[] = [
  "icy",
  "irritated",
  "rushed",
  "stressed",
  "closed",
  "impatient",
];

const NEUTRAL_ENERGIES: EnergyState[] = [
  "neutral",
  "preoccupied",
  "focused",
  "distracted",
  "skeptical",
];

const SHY_ENERGIES: EnergyState[] = ["shy", "melancholic", "tired"];

export interface EnergySandboxFilters {
  enableNegativeEnergies?: boolean;
  enableNeutralEnergies?: boolean;
  enableShyEnergies?: boolean;
}

/**
 * Sample an energy state with sandbox filters applied
 */
export function sampleEnergyWithFilters(
  difficulty: DifficultyLevel,
  filters?: EnergySandboxFilters
): EnergyState {
  const weights = { ...ENERGY_WEIGHTS[difficulty] };

  // Apply filters - set weight to 0 for disabled categories
  if (filters) {
    if (filters.enableNegativeEnergies === false) {
      for (const energy of NEGATIVE_ENERGIES) {
        weights[energy] = 0;
      }
    }
    if (filters.enableNeutralEnergies === false) {
      for (const energy of NEUTRAL_ENERGIES) {
        weights[energy] = 0;
      }
    }
    if (filters.enableShyEnergies === false) {
      for (const energy of SHY_ENERGIES) {
        weights[energy] = 0;
      }
    }
  }

  const entries = Object.entries(weights) as [EnergyState, number][];
  const totalWeight = entries.reduce((sum, [, w]) => sum + w, 0);

  // Fallback: if all weights are 0, return a positive energy
  if (totalWeight === 0) {
    const positiveEnergies: EnergyState[] = [
      "bubbly",
      "cheerful",
      "relaxed",
      "curious",
      "playful",
      "content",
    ];
    return positiveEnergies[Math.floor(Math.random() * positiveEnergies.length)];
  }

  let random = Math.random() * totalWeight;

  for (const [energy, weight] of entries) {
    random -= weight;
    if (random <= 0) {
      return energy;
    }
  }

  return "neutral";
}
