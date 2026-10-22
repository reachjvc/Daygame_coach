/**
 * WHAT THE LIVE SCREEN SAYS ABOUT A PROGRAM IN THE NEW FORMAT — Plans/program-builder.md,
 * Phase 5. Pure, so every sentence here is tested without a browser.
 *
 * A converted built-in has no ranges of sets, no effort targets and no
 * options, so every function here answers the way the screen always did for
 * it; the extra words appear only where the program asks for something the
 * old format could not say.
 */

import { describeSets, formatLoad } from "./programsService"
import type { PrescribedExercise, PrescribedGroup, PrescribedSet, SessionPrescription } from "./types"

const n = (v: number) => formatLoad(v)

/** "RPE 8.5", "RPE 8–9", "RIR 2", "≤ RPE 9" — or null when the set has no target. */
export function effortText(set: Pick<PrescribedSet, "rpe" | "rpeMax" | "rir" | "rirMax" | "cap">): string | null {
  const cap = set.cap ? "≤ " : ""
  if (set.rpe != null) return `${cap}RPE ${n(set.rpe)}${set.rpeMax != null ? `–${n(set.rpeMax)}` : ""}`
  if (set.rir != null) return `${cap}RIR ${n(set.rir)}${set.rirMax != null ? `–${n(set.rirMax)}` : ""}`
  return null
}

/** "Week 3 of 12 · Base · deload week" — null for a program with no weeks. */
export function weekLine(p: Pick<SessionPrescription, "week" | "weeksTotal" | "periodised" | "phase" | "deloadWeek" | "testWeek" | "isComplete">): string | null {
  if (!p.periodised) return null
  const parts = [p.weeksTotal ? `Week ${Math.min(p.week, p.weeksTotal)} of ${p.weeksTotal}` : `Week ${p.week}`]
  if (p.phase) parts.push(p.phase)
  if (p.deloadWeek) parts.push("deload week")
  if (p.testWeek) parts.push("test week")
  return parts.join(" · ")
}

function repsText(s: PrescribedSet, unit: "reps" | "sec"): string {
  if (s.total) return `${s.reps} total`
  const r = s.repRangeMax != null ? `${s.reps}–${s.repRangeMax}` : `${s.reps}`
  return `${r}${s.amrap ? "+" : ""}${unit === "sec" ? " s" : ""}`
}

function loadText(s: PrescribedSet, unitLabel: string, bodyweight: boolean | undefined): string {
  if (bodyweight) return ""
  if (s.derive) {
    const pct = `${Math.round(s.derive.pct.min * 100)}${s.derive.pct.max !== s.derive.pct.min ? `–${Math.round(s.derive.pct.max * 100)}` : ""}%`
    // Once the set it comes from is done, the range is known.
    return s.weight > 0 ? ` @ ${n(s.weight)}${s.weightMax != null ? `–${n(s.weightMax)}` : ""} ${unitLabel}` : ` at ${pct} of the ${s.derive.group === "top" ? "top set" : s.derive.group}`
  }
  if (s.pick === "effort") return " by feel"
  if (s.pick === "choose") return ""
  return ` @ ${n(s.weight)}${s.weightMax != null ? `–${n(s.weightMax)}` : ""} ${unitLabel}`
}

/**
 * ONE LINE FOR WHAT A LIFT ASKS TODAY, set group by set group:
 * "1 × 2–5 by feel, RPE 8.5 · 3–5 × 5–10 at 70–80% of the top set".
 *
 * A lift with no set groups worth naming — every converted built-in — is
 * described exactly as before (`describeSets`).
 */
export function describeLift(ex: PrescribedExercise, unitLabel: string): string {
  const groups = ex.groups ?? []
  // Fixed counts, no options, no effort targets, no weight picked or worked
  // out on the day: the old one-line form says it all, as it always has.
  const plain = groups.every((g) => g.countMin === g.countMax && !g.options && !g.effort)
  if (plain && !ex.sets.some((s) => s.derive || s.pick)) return describeSets(ex, unitLabel)
  const unit = ex.repUnit === "sec" ? "sec" : "reps"
  return groups
    .map((g) => {
      const rows = ex.sets.filter((s) => s.groupId === g.id)
      const first = rows[0]
      if (!first) return null
      const count = g.options
        ? `${g.options[0].count} × ${g.options[0].reps} … ${g.options[g.options.length - 1].count} × ${g.options[g.options.length - 1].reps}`
        : `${g.countMin === g.countMax ? g.countMin : `${g.countMin}–${g.countMax}`} × ${repsText(first, unit)}`
      const effortSet = g.effort ?? {}
      const effort = effortText(effortSet as Pick<PrescribedSet, "rpe" | "rpeMax" | "rir" | "rirMax" | "cap">)
      const last = g.effort?.lastSetOnly ? " on the last set" : ""
      return `${count}${loadText(first, unitLabel, ex.bodyweight)}${effort ? `, ${effort}${last}` : ""}`
    })
    .filter((x): x is string => x != null)
    .join(" · ")
}

/**
 * The lift with one of a group's options picked: "10 × 3" instead of "3 × 10".
 * The group's rows are replaced by that many rows at those reps, keeping
 * every other field of the group's first row (its weight source, its effort).
 */
export function withOption(ex: PrescribedExercise, groupId: string, option: { count: number; reps: number }): PrescribedExercise {
  const rows = ex.sets.filter((s) => s.groupId === groupId)
  if (rows.length === 0) return ex
  const template = rows[0]
  const before = ex.sets.filter((s) => s.setNumber < template.setNumber)
  const after = ex.sets.filter((s) => s.groupId !== groupId && s.setNumber > template.setNumber)
  const picked: PrescribedSet[] = Array.from({ length: option.count }, (_, i) => ({
    ...template,
    setNumber: template.setNumber + i,
    reps: option.reps,
    repRangeMax: undefined,
  }))
  const shifted = after.map((s, i) => ({ ...s, setNumber: template.setNumber + option.count + i }))
  return {
    ...ex,
    sets: [...before, ...picked, ...shifted],
    groups: (ex.groups ?? []).map((g): PrescribedGroup => (g.id === groupId ? { ...g, countMin: option.count, countMax: option.count } : g)),
  }
}

/**
 * HOW MANY MORE SETS "+ Add a set" MAY ADD for a program that names a range
 * ("3–5 sets"): up to the top of the last group's range. Null when the program
 * set no limit — every converted built-in, where the button has always added
 * as many as you like.
 */
export function addSetLimit(ex: PrescribedExercise): { group: PrescribedGroup; upTo: number } | null {
  const last = ex.groups?.[ex.groups.length - 1]
  if (!last || last.countMax === last.countMin || last.options) return null
  return { group: last, upTo: last.countMax - last.countMin }
}
