/**
 * HOW LONG EACH TEXT THE PLAN SAVES MAY BE.
 *
 * These are the database's own CHECK limits (`char_length(col) <= n`, read
 * from supabase/migrations/20260922100000_life_plan_tables.sql and
 * 20260923140000_day_journal_keeps_its_words.sql). The database stays the last
 * guard. They are copied here so that three things say the same number:
 *
 *   - the inputs (`maxLength`, and a counter near the limit),
 *   - the server routes, which look first and answer 422 naming the field,
 *   - the page, which shows that answer and waits for an edit instead of
 *     retrying a save that can never succeed.
 *
 * Without this, one over-long goal title made every later save of the whole
 * plan fail with "Could not save your plan", and the page retried forever.
 *
 * A test (tests/unit/goals/planLimits.test.ts) reads the migrations and fails
 * if a number here drifts from the database.
 */

import type { PlanChanges, RowTable } from "@/src/db/lifePlanTypes"

/** One limited text: the column's name, what the person calls it, and its cap. */
interface Limit {
  label: string
  max: number
  /** The database checks the length after `btrim` (spaces only), so the count here does too. */
  trimmed?: true
}

/** Per plan table, per column. Only columns the database caps. */
export const PLAN_TEXT_LIMITS: Partial<Record<RowTable, Record<string, Limit>>> = {
  north_stars: {
    text: { label: "North star", max: 20000 },
    purpose: { label: "North star purpose", max: 100000 },
    identity: { label: "North star identity", max: 100000 },
    conduct: { label: "North star conduct", max: 100000 },
    become: { label: "North star become", max: 100000 },
    affirmations: { label: "North star affirmations", max: 100000 },
    commitment: { label: "North star commitment", max: 100000 },
  },
  areas: {
    label: { label: "Area name", max: 200 },
    sublabel: { label: "Area subtitle", max: 400 },
    color: { label: "Area colour", max: 40 },
    review_ten: { label: "Area review: what a 10 looks like", max: 20000 },
    review_purpose: { label: "Area review: purpose", max: 20000 },
    review_snapshot: { label: "Area review: where you are", max: 20000 },
    review_blockers: { label: "Area review: what blocks you", max: 20000 },
    review_identity: { label: "Area review: identity", max: 20000 },
  },
  goals: {
    title: { label: "Goal title", max: 500 },
    why: { label: "Goal: why", max: 20000 },
    pain_why: { label: "Goal: pain", max: 20000 },
    sentence: { label: "Goal sentence", max: 20000 },
    feeling: { label: "Goal: feeling", max: 20000 },
    reward: { label: "Goal: reward", max: 20000 },
    stake: { label: "Goal: stake", max: 20000 },
    unit: { label: "Goal unit", max: 100 },
  },
  checkpoints: {
    title: { label: "Checkpoint title", max: 500 },
    celebration: { label: "Checkpoint celebration", max: 2000 },
  },
  obstacles: {
    what: { label: "Obstacle", max: 5000 },
    counter: { label: "Obstacle: what you will do", max: 5000 },
  },
  beliefs: {
    old: { label: "Old belief", max: 5000 },
    evidence: { label: "Belief evidence", max: 20000 },
    replacement: { label: "New belief", max: 5000 },
  },
  routines: {
    label: { label: "Routine name", max: 200 },
    blueprint_id: { label: "Routine blueprint", max: 120 },
  },
  split_days: {
    name: { label: "Split day name", max: 200 },
  },
  steps: {
    title: { label: "Step title", max: 500 },
    asks: { label: "Step question", max: 2000 },
    goes_to: { label: "Step link", max: 200 },
    library_step_id: { label: "Step template", max: 120 },
  },
  experiences: {
    title: { label: "Experience", max: 500 },
  },
  fields: {
    label: { label: "Field name", max: 500 },
    read_source_id: { label: "Field source", max: 200 },
  },
  sub_steps: {
    title: { label: "Sub-step title", max: 500 },
  },
  seasons: {
    sentence: { label: "Season sentence", max: 2000 },
    why: { label: "Season: why", max: 100000 },
    cost: { label: "Season: cost", max: 100000 },
    identity: { label: "Season: identity", max: 100000 },
    values_note: { label: "Season: values note", max: 100000 },
    areas_note: { label: "Season: areas note", max: 100000 },
  },
  reviews: {
    magic_moments: { label: "Review: magic moments", max: 100000 },
    lessons: { label: "Review: lessons", max: 100000 },
    next_outcomes: { label: "Review: next outcomes", max: 100000 },
  },
  values: {
    value: { label: "Value", max: 200, trimmed: true },
  },
  answers: {
    body: { label: "Answer", max: 100000 },
    prompt_id: { label: "Answer question", max: 200 },
  },
}

/** The day half's caps (`life_plan_days.note`, `life_plan_day_journal.body` and `.asked`). */
export const DAY_TEXT_LIMITS = {
  note: { label: "Day note", max: 100000 },
  journal: { label: "Journal line", max: 100000 },
  asked: { label: "Journal question", max: 500 },
} as const

/** The cap for one plan column, for an input's `maxLength`. Undefined when the database sets none. */
export function planLimit(table: RowTable, column: string): number | undefined {
  return PLAN_TEXT_LIMITS[table]?.[column]?.max
}

/** What a refused save names, and what the page shows. */
export interface LimitBreach {
  field: string
  count: number
  max: number
}

/** The sentence for a breach: "Goal title: 612 of 500 characters". */
export function limitMessage(b: LimitBreach): string {
  return `${b.field}: ${b.count} of ${b.max} characters`
}

/** Characters as the database counts them (code points, not UTF-16 units). */
export function charCount(text: string): number {
  return Array.from(text).length
}

/**
 * The first text in a plan save that is over its cap, or null.
 *
 * Looks at the rows being written only (`upsert`); a removal carries keys, not
 * text. The cheap `.length` test comes first so a normal save never counts
 * code points.
 */
export function findPlanBreach(changes: Pick<PlanChanges, "upsert">): LimitBreach | null {
  for (const [table, rows] of Object.entries(changes.upsert ?? {})) {
    const limits = PLAN_TEXT_LIMITS[table as RowTable]
    if (!limits || !Array.isArray(rows)) continue
    for (const row of rows) {
      for (const [column, limit] of Object.entries(limits)) {
        const v = (row as Record<string, unknown>)[column]
        if (typeof v !== "string" || v.length <= limit.max) continue
        const count = charCount(limit.trimmed ? v.replace(/^ +| +$/g, "") : v)
        if (count > limit.max) return { field: limit.label, count, max: limit.max }
      }
    }
  }
  return null
}

/** The first text in a day patch that is over its cap, or null. `asked` is fitted by the route, not refused. */
export function findDayBreach(patch: { note?: string | null; journal?: Record<string, string> }): LimitBreach | null {
  const note = patch.note
  if (typeof note === "string" && note.length > DAY_TEXT_LIMITS.note.max) {
    const count = charCount(note)
    if (count > DAY_TEXT_LIMITS.note.max) return { field: DAY_TEXT_LIMITS.note.label, count, max: DAY_TEXT_LIMITS.note.max }
  }
  for (const body of Object.values(patch.journal ?? {})) {
    if (typeof body !== "string" || body.length <= DAY_TEXT_LIMITS.journal.max) continue
    const count = charCount(body)
    if (count > DAY_TEXT_LIMITS.journal.max) return { field: DAY_TEXT_LIMITS.journal.label, count, max: DAY_TEXT_LIMITS.journal.max }
  }
  return null
}
