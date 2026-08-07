/**
 * The Life Mastery Blueprint areas — Stefan James' (Project Life Mastery) own
 * taxonomy. Sources: his canonical course slide (projectlifemastery.com
 * /life-course/screen-shot-2019-01-31-at-19-29-22/ — pyramid of nine bands,
 * Health+Fitness base → Contribution apex, SPIRITUALITY as the foundation band
 * plus a dotted circle around everything; corner labels Vision/What? ·
 * Purpose/Why? · Goals/How?) and his "Life Mastery Blueprint & Life Management
 * System" livestream (youtube Kz83kMosOWU), where he counts "10 really 12"
 * areas — Health/Fitness and Family/Friends are measured SEPARATELY.
 *
 * Practice (his articles + livestream): rate every area 0-10 against your
 * PERSONAL ideal ("my 10 is going to be different from your 10"), weekly
 * (recommended; he does it at least monthly), in a spreadsheet/journal so you
 * can compare weeks. "I define success as living at a level 7 or more in each
 * area" — below 7 = weak spot. Drucker: you can't manage what you don't measure.
 *
 * `band` is his pyramid hierarchy (0 = base = most foundational; spirituality
 * = -1, the foundation/circle). Wheel and pyramid render in this fixed order —
 * never re-sorted, never re-colored. Sub-labels are his, verbatim from the
 * slide (Fitness/Family/Friends splits are ours, from his livestream wording).
 * Palette validated (dataviz six checks: CVD 10.1 / normal 16.4 / contrast
 * pass on the dark surface; identity carried by direct labels + gaps).
 */

export interface LifeMasteryArea {
  id: string
  label: string
  /** Stefan's verbatim sub-label for the area (what it covers). */
  sublabel: string
  /** Pyramid band, 0 = base; -1 = spirituality (foundation + circle). */
  band: number
  color: string
  /** Weekly-evaluation question, phrased the way Stefan frames the area. */
  prompt: string
  /** Which of our framework pillars feed this area (blueprint coverage). */
  pillarIds: string[]
  /**
   * v24 — the fill colour, lightened until it passes WCAG AA as TEXT.
   *
   * The wheel palette was validated for FILLS (CVD + contrast on the dark
   * surface), but two of the twelve are also rendered as 10-12px labels, where
   * indigo-500 measures 4.19:1 and purple-500 4.30:1 against 4.5 required.
   * Fills keep the validated colour; text uses this. Absent ⇒ the fill colour
   * already passes and is used as-is.
   */
  textColor?: string
}

/** The colour to render an area's NAME in. Never use `color` for text. */
export function areaTextColor(a: { color: string; textColor?: string }): string {
  return a.textColor ?? a.color
}

/** "Success is living at a level 7 or more in each area" — Stefan James. */
export const LIFE_MASTERY_SUCCESS_LEVEL = 7

export const LIFE_MASTERY_AREAS: LifeMasteryArea[] = [
  { id: "lm_health", label: "Health", sublabel: "Energy, Vitality, Well-Being", band: 0, color: "#22c55e", prompt: "How much energy and vitality do you have day to day?", pillarIds: ["health"] },
  { id: "lm_fitness", label: "Fitness", sublabel: "Strength, Endurance, Muscle", band: 0, color: "#0ea5e9", prompt: "How strong and fit is your body right now?", pillarIds: ["health"] },
  { id: "lm_mindset", label: "Mind & Beliefs", sublabel: "Thoughts, Mindset, Mentality", band: 1, color: "#6366f1", textColor: "#818cf8", prompt: "How empowering are your thoughts and belief systems?", pillarIds: ["meaning", "vices"] },
  { id: "lm_emotions", label: "Emotions", sublabel: "Feelings, Emotional State", band: 2, color: "#f59e0b", prompt: "How happy, grateful and fulfilled do you feel most days?", pillarIds: ["meaning"] },
  { id: "lm_relationship", label: "Relationship", sublabel: "Intimacy, Love, Passion, Dating", band: 3, color: "#f43f5e", prompt: "How is your intimate relationship. Or your dating life?", pillarIds: ["relations"] },
  { id: "lm_mission", label: "Mission & Purpose", sublabel: "Work, Career, Business, School", band: 4, color: "#14b8a6", prompt: "How on-purpose is your work, business or studies?", pillarIds: ["wealth", "meaning"] },
  { id: "lm_money", label: "Money", sublabel: "Finances, Wealth, Passive Income", band: 5, color: "#84cc16", prompt: "How healthy are your finances. Income, savings, debt?", pillarIds: ["wealth"] },
  { id: "lm_family", label: "Family", sublabel: "Connection", band: 6, color: "#a855f7", textColor: "#c084fc", prompt: "How connected are you with your family?", pillarIds: ["relations"] },
  { id: "lm_friends", label: "Friends", sublabel: "Community, Environment", band: 6, color: "#f97316", prompt: "How rich are your friendships and social life?", pillarIds: ["relations"] },
  { id: "lm_fun", label: "Fun", sublabel: "Hobbies, Adventure, Travel", band: 7, color: "#ec4899", prompt: "How much pure fun are you having. Play for its own sake?", pillarIds: ["meaning"] },
  { id: "lm_contribution", label: "Contribution", sublabel: "Giving, Impact", band: 8, color: "#eab308", prompt: "How much are you giving without getting anything back?", pillarIds: ["meaning"] },
  { id: "lm_spirituality", label: "Spirituality", sublabel: "Higher Consciousness, Oneness", band: -1, color: "#c084fc", prompt: "How connected do you feel to something bigger than yourself?", pillarIds: ["meaning"] },
]

export const LIFE_MASTERY_AREA_MAP = new Map(LIFE_MASTERY_AREAS.map((a) => [a.id, a]))

/** Pyramid rows bottom→top exactly as on the slide (shared bands joined);
 * spirituality is NOT a row — it's the foundation band + the dotted circle. */
export const BLUEPRINT_ROWS: { label: string; areaIds: string[] }[] = (() => {
  const rows: { label: string; areaIds: string[] }[] = []
  for (const a of LIFE_MASTERY_AREAS) {
    if (a.band < 0) continue
    const row = rows[a.band]
    if (row) {
      row.label += ` + ${a.label}`
      row.areaIds.push(a.id)
    } else {
      rows[a.band] = { label: a.label, areaIds: [a.id] }
    }
  }
  return rows
})()

/**
 * v23 — the ONE area a legacy pillar-only goal counts toward.
 *
 * `pillarIds` is a many-to-many map (the "meaning" pillar touches six areas),
 * and `goalFeedsArea` used to return true for every one of them. So a single
 * goal lit six wedges, and every coverage number in the product — rooms mapped,
 * "6 of 12 life areas", pyramid brightness, "N areas have none" — counted it
 * that many times. A goal is work on one thing; it feeds one area.
 *
 * The pick is the area each pillar most directly names. Goals created since the
 * 12-area model carry an explicit `areaId` and never consult this.
 */
export const PILLAR_PRIMARY_AREA: Record<string, string> = {
  health: "lm_health",
  relations: "lm_relationship",
  wealth: "lm_money",
  meaning: "lm_mission",
  vices: "lm_mindset",
}

/** The single area a goal feeds: its explicit `areaId`, else its pillar's
 * primary area. Never more than one — see `PILLAR_PRIMARY_AREA`. */
export function goalAreaId(goal: { pillarId: string; areaId?: string | null }): string | null {
  if (goal.areaId) return goal.areaId
  return PILLAR_PRIMARY_AREA[goal.pillarId] ?? null
}

/** Does this goal feed this Blueprint area? Exactly-one-area, always. */
export function goalFeedsArea(goal: { pillarId: string; areaId?: string | null }, areaId: string): boolean {
  return goalAreaId(goal) === areaId
}

/** Areas the plan's goals already feed (explicit areaId or pillar mapping). */
export function blueprintCoverage(goals: Array<{ pillarId: string; areaId?: string | null }>): Set<string> {
  return new Set(LIFE_MASTERY_AREAS.filter((a) => goals.some((g) => goalFeedsArea(g, a.id))).map((a) => a.id))
}

/** M0 — value suggestions for the elicitation exercise ("what has been most
 * important in your life?"). Free-add always allowed; these just prime recall. */
export const VALUE_SUGGESTIONS = [
  "Freedom", "Growth", "Family", "Love", "Health", "Contribution", "Faith",
  "Adventure", "Security", "Creativity", "Connection", "Achievement",
  "Integrity", "Fun", "Peace", "Learning", "Legacy", "Discipline",
]

/** M5 — Stefan's 8 morning empowering questions, verbatim ("whatever you focus
 * on you feel; what controls your focus are questions"). Follow-up when stuck:
 * "well, what COULD I be happy about?" — then FEEL the answer, don't just say it. */
export const EMPOWERING_QUESTIONS = [
  "What am I happy about in my life right now?",
  "What am I excited about in my life right now?",
  "What am I proud of in my life?",
  "What am I grateful for in my life?",
  "What am I passionate about in my life?",
  "What am I enjoying most right now in my life?",
  "What am I committed to in my life?",
  "Who do I love — and who loves me?",
]

/** M4 — one small raise-the-score pick per Blueprint area (Life Mastery Circle
 * step: weak area → one concrete action that alone can lift it half a point).
 * References ROUTINE_CATEGORIES items in visionRoutineLibrary.ts. */
export const RAISE_ACTIONS: Record<string, { categoryId: string; itemId: string }> = {
  lm_health: { categoryId: "night", itemId: "bedtime" },
  lm_fitness: { categoryId: "workout", itemId: "strength" },
  lm_mindset: { categoryId: "mind", itemId: "reading" },
  lm_emotions: { categoryId: "mind", itemId: "gratitude" },
  lm_relationship: { categoryId: "social", itemId: "date-night" },
  lm_mission: { categoryId: "work", itemId: "mit" },
  lm_money: { categoryId: "work", itemId: "money-tuesday" },
  lm_family: { categoryId: "social", itemId: "family-call" },
  lm_friends: { categoryId: "social", itemId: "reach-out" },
  lm_fun: { categoryId: "social", itemId: "plan-social" },
  lm_contribution: { categoryId: "social", itemId: "compliment" },
  lm_spirituality: { categoryId: "mind", itemId: "breathwork" },
}
