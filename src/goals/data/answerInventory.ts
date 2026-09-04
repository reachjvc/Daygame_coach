/**
 * EVERY WRITTEN ANSWER IN `plan.answers`, AND WHICH CLASS IT IS IN.
 *
 * ## Why this file exists
 *
 * Asked whether the list of written answers was complete, the honest answer was
 * "I counted them, and nothing stops the count going stale." The keys come from
 * three places — constants, a generator over a question list, and four bare
 * strings typed into components — so "have we got them all" was a question you
 * had to take somebody's word for. `tests/unit/goals/answerInventory.test.ts`
 * reads the source, rebuilds the list, and fails if it disagrees with this file.
 * That turns a claim into something the codebase enforces.
 *
 * ## What a class means
 *
 * **statement** — a fixed question whose answer changes rarely, and whose
 * previous answers are worth reading back. Your north star, your one thing, why
 * it matters. These are what versioning is for.
 *
 * **structured** — not prose. A date, a list of ids. Versioning them is
 * meaningless on its own; they ride along with the statement they belong to.
 *
 * ## What this file does NOT cover, and why that is written down
 *
 * `plan.answers` is one of four places the plan keeps written answers. The other
 * three are listed in `WRITTEN_ELSEWHERE` at the bottom, with counts, because a
 * boundary nobody wrote down is a boundary somebody will mistake for the whole
 * picture — which is exactly how "five answers" was said out loud about a flow
 * holding eighty-seven. They are the same CLASS as the entries here; they are
 * simply not keyed in the same map, so the mechanical check in
 * `answerInventory.test.ts` cannot reach them.
 *
 * A third class exists and is deliberately NOT in this file: **dated entries**,
 * the things that belong to a day rather than superseding each other — your
 * daily ratings, your ticks, the line about the day, and the journal. They live
 * in `plan.daily`, `plan.logged`, `plan.notes` and `plan.journal`, never in
 * `plan.answers`, which is why they are not keys here.
 *
 * ## `belongsTo`
 *
 * Some answers are not independent: the why, the cost, the identity and the
 * values are all *about the current one thing*. Starting a new one thing starts
 * new ones of those too — they are chapters of the same book, not four separate
 * books. `belongsTo` records that, so a future migration groups them correctly
 * instead of giving each its own unrelated history.
 */

import { ONE_ANSWERS, STARTER_QUESTIONS, STARTER_KEY, COMMIT_KEY, COMMIT_DATE_KEY, IDEAL_DAY_KEY, NEXT_SEASON_KEY } from "./northStarStart"
import { STAR_WHY_ID, REVIEW_PROMPTS } from "./northStar"

export type AnswerClass = "statement" | "structured"

export interface AnswerEntry {
  /** The key it is stored under in `plan.answers`. */
  key: string
  /** What it asks, in the words a person would use. */
  label: string
  class: AnswerClass
  /**
   * The key this one is a chapter of, if any. An answer with a `belongsTo`
   * starts a new version when its parent does, not on its own schedule.
   */
  belongsTo?: string
}

export const ANSWER_INVENTORY: AnswerEntry[] = [
  // ---------------------------------------------------------- the one thing
  { key: ONE_ANSWERS.oneThing, label: "The one thing", class: "statement" },
  { key: ONE_ANSWERS.why, label: "Why it matters", class: "statement", belongsTo: ONE_ANSWERS.oneThing },
  { key: ONE_ANSWERS.cost, label: "What it costs you if it does not happen", class: "statement", belongsTo: ONE_ANSWERS.oneThing },
  { key: ONE_ANSWERS.identity, label: "Who you would have to be", class: "statement", belongsTo: ONE_ANSWERS.oneThing },
  { key: ONE_ANSWERS.values, label: "What it is in service of", class: "statement", belongsTo: ONE_ANSWERS.oneThing },
  { key: ONE_ANSWERS.areas, label: "Which areas it touches", class: "structured", belongsTo: ONE_ANSWERS.oneThing },
  { key: NEXT_SEASON_KEY, label: "What the next season is for", class: "statement" },

  // ------------------------------------------------------- the commitment
  { key: COMMIT_KEY, label: "The commitment, in your own words", class: "statement" },
  { key: COMMIT_DATE_KEY, label: "The day you made it", class: "structured", belongsTo: COMMIT_KEY },

  // ------------------------------------------------- the north star and why
  { key: STAR_WHY_ID, label: "Why the north star", class: "statement" },
  { key: "vision", label: "The life you are aiming at", class: "statement" },
  { key: "why", label: "Why that life", class: "statement" },
  { key: "become", label: "Who you would become", class: "statement" },
  { key: "cost", label: "What staying as you are costs", class: "statement" },
  { key: IDEAL_DAY_KEY, label: "Your ideal day", class: "statement" },

  // --------------------------------------------------- the starter questions
  ...STARTER_QUESTIONS.map((q): AnswerEntry => ({
    key: STARTER_KEY(q.id),
    label: q.ask,
    class: "statement",
  })),

  // -------------------------------------------------------- review prompts
  ...REVIEW_PROMPTS.map((p): AnswerEntry => ({
    key: p.id,
    label: p.question,
    class: "statement",
  })),
]

/** Look one up. Undefined means it is not in the inventory, which is a bug. */
export function answerEntry(key: string): AnswerEntry | undefined {
  return ANSWER_INVENTORY.find((e) => e.key === key)
}

/** The statements that stand on their own — the ones a "start a new one" acts on. */
export function rootStatements(): AnswerEntry[] {
  return ANSWER_INVENTORY.filter((e) => e.class === "statement" && !e.belongsTo)
}

/** Everything that starts a new version when `key` does. */
export function chapterOf(key: string): AnswerEntry[] {
  return ANSWER_INVENTORY.filter((e) => e.key === key || e.belongsTo === key)
}

/**
 * THE WRITTEN ANSWERS THAT ARE NOT IN `plan.answers`.
 *
 * Same class, different shelf. Recorded here so the boundary of the inventory
 * above is a stated fact rather than something a reader has to infer — and so
 * the migration that moves statements onto the account knows the real size of
 * the job rather than the size of the easy part.
 *
 * These are counted, not enumerated, because two of them are per-area: their
 * keys are area ids, and areas are editable, so the list is a fact about a
 * person's plan rather than about the code.
 */
export const WRITTEN_ELSEWHERE = [
  {
    where: "plan.northStar",
    what: "The north star itself — one paragraph, the thing the whole flow is for.",
    count: 1,
    class: "statement" as const,
  },
  {
    where: "plan.rungs",
    what: "The vision ladder: why the north star matters, one rung at a time.",
    count: 7,
    class: "statement" as const,
  },
  {
    where: "plan.review[areaId]",
    what:
      "Per area, per person: what a 10 looks like, why the area matters, where you are now, " +
      "what could stop you, who you are when it is handled. Twelve areas by default.",
    count: 5 * 12,
    class: "statement" as const,
  },
] as const

/** How many written statements exist in total, wherever they are kept. */
export function totalStatements(): number {
  const here = ANSWER_INVENTORY.filter((e) => e.class === "statement").length
  return here + WRITTEN_ELSEWHERE.reduce((n, s) => n + s.count, 0)
}
