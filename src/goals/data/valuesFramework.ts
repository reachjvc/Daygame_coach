/**
 * The values exercise framework — Stefan James' actual procedure (NLP /
 * Robbins Date With Destiny / Demartini lineage, per the research canon):
 * elicit current values from YOUR life (no menu) → convert means to ends
 * (a value IS an emotion) → rank pairwise → elicit ranked AWAY-FROM values →
 * audit the hierarchy for conflicts → re-design from the vision.
 */

/** Common "vehicle" answers and the end-emotions usually behind them —
 * used for the means→ends step: "What does [X] actually give you?" */
export const VEHICLE_CONVERSIONS: Array<{ match: RegExp; label: string; ends: string[] }> = [
  { match: /famil|kids|children|parent/i, label: "Family", ends: ["Love", "Connection", "Belonging", "Security"] },
  { match: /money|wealth|rich|income|finan/i, label: "Money", ends: ["Freedom", "Security", "Abundance", "Significance"] },
  { match: /career|work|job|business|success/i, label: "Career/success", ends: ["Growth", "Significance", "Contribution", "Freedom"] },
  { match: /fitness|gym|body|training|sport/i, label: "Fitness", ends: ["Health", "Vitality", "Confidence", "Discipline"] },
  { match: /travel|adventure|explor/i, label: "Travel", ends: ["Adventure", "Freedom", "Growth"] },
  { match: /friend|social|community/i, label: "Friends", ends: ["Connection", "Belonging", "Fun"] },
  { match: /relationship|partner|marriage|love life/i, label: "Relationship", ends: ["Love", "Intimacy", "Connection"] },
  { match: /god|faith|church|religio|spiritual/i, label: "Faith", ends: ["Faith", "Peace", "Purpose"] },
  { match: /learn|knowledge|read|study|education/i, label: "Learning", ends: ["Growth", "Wisdom", "Curiosity"] },
  { match: /helping|giving|volunteer|charity/i, label: "Helping others", ends: ["Contribution", "Love", "Purpose"] },
]

/** Away-from states he names in the exercise — prompts, never a required list. */
export const AWAY_SUGGESTIONS = [
  "Rejection", "Failure", "Loneliness", "Shame", "Anger", "Fear",
  "Scarcity", "Humiliation", "Guilt", "Boredom", "Being controlled", "Being ordinary",
]

/** One detected hierarchy conflict, with his reasoning. */
export interface ValueConflict {
  /** Short headline ("Security above growth"). */
  title: string
  /** The consequence, in his voice. */
  message: string
}

interface ConflictRule {
  above: RegExp
  below: RegExp
  title: string
  message: string
}

/** Towards-hierarchy rules: fires when a value matching `above` is ranked
 * higher than one matching `below`. Straight from his worked examples. */
const TOWARDS_RULES: ConflictRule[] = [
  {
    above: /security|comfort|safety|stability/i,
    below: /success|growth|adventure|freedom|achievement/i,
    title: "Security ranked above growth",
    message: "With security above growth, you'll avoid exactly the risks your vision needs — never quite starting, never quite leaping. His words: \"security is an illusion; if you want security, go to prison.\" Consider what belongs on top.",
  },
  {
    above: /success|achievement|wealth|money|significance/i,
    below: /happiness|peace|joy|love|gratitude/i,
    title: "Success ranked above happiness",
    message: "Success above happiness means you can't enjoy anything until you've achieved it — and the target keeps moving. This was his own conflict (the 48-hour no-sleep Bogotá story). The fix he chose: happily achieve, instead of achieving to be happy.",
  },
  {
    above: /fitness|looks|appearance|body/i,
    below: /health|vitality|energy/i,
    title: "Fitness ranked above health",
    message: "He lived this one: two fitness competitions, \"most ripped, most unhealthy — adrenals shot.\" Fitness is what you can do; health is whether the machine lasts. Health always outranks it.",
  },
  {
    above: /comfort|fun|pleasure|entertainment/i,
    below: /success|growth|discipline|achievement/i,
    title: "Comfort ranked above growth",
    message: "With comfort above growth, weekends go to the couch and the sacrifice growth requires never feels worth it. Nothing wrong with fun — but if it outranks growth, growth loses every negotiation.",
  },
  {
    above: /success|achievement|money|wealth/i,
    below: /honesty|integrity|authenticity/i,
    title: "Success ranked above integrity",
    message: "When these two collide — a resume, a tax return, a shortcut — the higher one wins. If success sits above honesty, you already know which way that goes. And every small lie taxes your self-esteem.",
  },
]

/** Cross-rules: a towards-value undermined by an away-from value. */
const CROSS_RULES: Array<{ towards: RegExp; away: RegExp; title: string; message: string }> = [
  {
    towards: /success|growth|achievement|wealth/i,
    away: /failure|rejection/i,
    title: "Chasing success while fleeing failure",
    message: "Valuing success while your #1 avoidance is failure or rejection creates the approach-avoid loop: a few steps forward, a few back, then you stop trying. His fix: rewrite the rule — \"I only feel failure if I don't learn or don't try.\"",
  },
  {
    towards: /love|connection|intimacy|relationship/i,
    away: /rejection|vulnerab|humiliation/i,
    title: "Wanting love while fleeing rejection",
    message: "Love requires exposure; rejection-avoidance forbids it. People stuck here settle for connection because love feels too dangerous. The rule to rewrite: \"to feel rejected, I'd have to value their opinion of me above my own.\"",
  },
  {
    towards: /freedom|adventure/i,
    away: /uncertainty|insecurity|fear|being lost/i,
    title: "Wanting freedom while fleeing uncertainty",
    message: "Freedom IS uncertainty with the fear reframed. If uncertainty tops your away-from list, every real freedom will feel like a threat until that rule changes.",
  },
]

/** Detect hierarchy conflicts. Pure and order-sensitive: `towards` is ranked
 * best-first; a rule fires only when the `above` value outranks the `below`. */
export function detectValueConflicts(towards: string[], away: string[]): ValueConflict[] {
  const out: ValueConflict[] = []
  for (const rule of TOWARDS_RULES) {
    const hi = towards.findIndex((v) => rule.above.test(v))
    const lo = towards.findIndex((v) => rule.below.test(v))
    if (hi !== -1 && lo !== -1 && hi < lo) out.push({ title: rule.title, message: rule.message })
  }
  for (const rule of CROSS_RULES) {
    if (towards.some((v) => rule.towards.test(v)) && away.slice(0, 3).some((v) => rule.away.test(v))) {
      out.push({ title: rule.title, message: rule.message })
    }
  }
  return out
}

/** Pairwise ranking: binary-insertion state machine. Feed it comparisons;
 * it asks the minimum questions to place each item ("Which has been more
 * important — this one, or this one?"). */
export interface PairwiseState {
  /** Ranked so far, best first. */
  ranked: string[]
  /** Items still to place. */
  pending: string[]
  /** Current binary-search window for the head of `pending`. */
  lo: number
  hi: number
}

export function startPairwise(items: string[]): PairwiseState {
  const [first, ...rest] = items
  return { ranked: first ? [first] : [], pending: rest, lo: 0, hi: first ? 1 : 0 }
}

/** The current question, or null when ranking is complete. */
export function pairwiseQuestion(s: PairwiseState): { a: string; b: string } | null {
  if (s.pending.length === 0) return null
  const mid = Math.floor((s.lo + s.hi) / 2)
  return { a: s.pending[0], b: s.ranked[mid] }
}

/** Apply an answer: `aWins` = the pending item mattered more than the compared one. */
export function pairwiseAnswer(s: PairwiseState, aWins: boolean): PairwiseState {
  const mid = Math.floor((s.lo + s.hi) / 2)
  let { lo, hi } = s
  if (aWins) hi = mid
  else lo = mid + 1
  if (lo >= hi) {
    const ranked = [...s.ranked.slice(0, lo), s.pending[0], ...s.ranked.slice(lo)]
    const pending = s.pending.slice(1)
    return { ranked, pending, lo: 0, hi: ranked.length }
  }
  return { ...s, lo, hi }
}
