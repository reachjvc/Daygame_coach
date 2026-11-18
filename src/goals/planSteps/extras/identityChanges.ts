/** Who you are (E3): identity text, lines, and where the lines are shown. Pure. */

import { addCustomStep, updateStep, addDailyField, setDailyFieldKind, setDailyFieldSource } from "@/src/goals/northStarService"
import type { NsPlan } from "@/src/goals/types"
import { routinesCopy } from "../copy/routines"
import type { EarlierNote } from "../earlierNotes"

export const LINES_SOURCE = "answer:affirmations"
export const STAR_SOURCE = "star"
const STEP_TAG = "new:lines"
const STAR_STEP_TAG = "new:star"

const withAnswer = (plan: NsPlan, key: string, text: string): NsPlan =>
  (plan.answers[key] ?? "") === text ? plan : { ...plan, answers: { ...plan.answers, [key]: text }, updatedAt: new Date().toISOString() }

export const setIdentity = (plan: NsPlan, text: string): NsPlan => withAnswer(plan, "identity_total", text)

export const linesOf = (plan: NsPlan): string[] => (plan.answers["affirmations"] ?? "").split("\n").map((l) => l.trim()).filter(Boolean)
export const setLines = (plan: NsPlan, lines: string[]): NsPlan => withAnswer(plan, "affirmations", lines.map((l) => l.trim()).filter(Boolean).join("\n"))

export type LinesWhere = "morning" | "today" | "none"

export const morningRoutine = (plan: NsPlan) => plan.routines.find((r) => r.blueprintId === "morning")

const stepWords = (needle: string, fallback: string) => routinesCopy.library.morning.find((s) => s.toLowerCase().includes(needle)) ?? fallback

export function linesWhere(plan: NsPlan): LinesWhere {
  if (plan.routines.some((r) => r.steps.some((s) => s.goesTo === LINES_SOURCE))) return "morning"
  if (plan.fields.some((f) => f.kind === "read" && f.readSourceId === LINES_SOURCE)) return "today"
  return "none"
}

export const showsStar = (plan: NsPlan): boolean =>
  plan.routines.some((r) => r.steps.some((s) => s.goesTo === STAR_SOURCE)) || plan.fields.some((f) => f.kind === "read" && f.readSourceId === STAR_SOURCE)

/** Remove what this screen put there (its own tagged steps, and read fields of these two sources). */
function clearPlacements(plan: NsPlan): NsPlan {
  return {
    ...plan,
    routines: plan.routines.map((r) => ({ ...r, steps: r.steps.filter((s) => s.libraryStepId !== STEP_TAG && s.libraryStepId !== STAR_STEP_TAG) })),
    fields: plan.fields.filter((f) => !(f.kind === "read" && f.targetId === null && (f.readSourceId === LINES_SOURCE || f.readSourceId === STAR_SOURCE))),
  }
}

function place(plan: NsPlan, where: Exclude<LinesWhere, "none">, source: string, tag: string, needle: string, fallback: string): NsPlan {
  if (where === "today") {
    const added = addDailyField(plan, null, "", "read")
    const id = added.fields.at(-1)!.id
    return setDailyFieldSource(setDailyFieldKind(added, id, "read"), id, source)
  }
  const routine = morningRoutine(plan)
  if (!routine) return plan
  const withStep = addCustomStep(plan, routine.id, stepWords(needle, fallback), 0, 7)
  const step = withStep.routines.find((r) => r.id === routine.id)!.steps.at(-1)!
  return updateStep(withStep, routine.id, step.id, { goesTo: source, asks: null, libraryStepId: tag })
}

/** Where the lines (and optionally the north star) are shown. A morning choice with no morning routine changes nothing. */
export function setLinesWhere(plan: NsPlan, where: LinesWhere, includeStar: boolean): NsPlan {
  if (where === "morning" && !morningRoutine(plan)) return plan
  let next = clearPlacements(plan)
  if (where === "none") return next
  next = place(next, where, LINES_SOURCE, STEP_TAG, "lines", "Read your lines")
  if (includeStar) next = place(next, where, STAR_SOURCE, STAR_STEP_TAG, "north star", "Read your north star")
  return next
}

export function identityNotes(plan: NsPlan): EarlierNote[] {
  const t = (s: string | undefined) => (s ?? "").trim()
  const out: EarlierNote[] = []
  if (t(plan.answers.become)) out.push({ topic: "become", text: t(plan.answers.become) })
  if (t(plan.answers.conduct)) out.push({ topic: "conduct", text: t(plan.answers.conduct) })
  for (const a of plan.areas) if (t(plan.review[a.id]?.identity)) out.push({ topic: `review_identity:${a.id}`, text: t(plan.review[a.id].identity) })
  return out
}
