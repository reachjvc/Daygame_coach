/**
 * ONE LIFT'S PRESCRIPTION AS A LINE — "1x2-5@? rpe8.5, 3-5x5-10@70-80".
 *
 * The coverage fixtures write their expected numbers this way
 * (tests/fixtures/programs/fixture.ts has the grammar), and the builder's
 * preview can show it to a person who wants the short form. Consecutive
 * identical sets merge; a range of sets is one run; a weight that is picked
 * on the day, or worked out from a set not done yet, is "?".
 */

import type { PrescribedExercise, PrescribedGroup, PrescribedSet } from "../types"
import { formatLoad } from "../programsService"

const num = (n: number) => formatLoad(Math.round(n * 100) / 100)

function repsText(s: PrescribedSet): string {
  if (s.total) return `t${s.reps}`
  const range = s.repRangeMax != null ? `${s.reps}-${s.repRangeMax}` : `${s.reps}`
  if (s.seconds) return `${range}s`
  return `${range}${s.amrap ? "+" : ""}`
}

function loadText(ex: PrescribedExercise, s: PrescribedSet): string {
  if (ex.bodyweight) return "@bw"
  if (s.pick || (s.derive && s.weight === 0)) return "@?"
  if (ex.loadStyle === "bodyweight" && s.weight === 0) return "@bw"
  return `@${num(s.weight)}${s.weightMax != null ? `-${num(s.weightMax)}` : ""}`
}

function effortText(e: { rpe?: number; rpeMax?: number; rir?: number; rirMax?: number; cap?: boolean } | undefined, last: boolean): string {
  if (!e || (e.rpe == null && e.rir == null)) return ""
  const which = e.rpe != null ? `rpe${e.cap ? "<=" : ""}${num(e.rpe)}${e.rpeMax != null ? `-${num(e.rpeMax)}` : ""}` : `rir${e.cap ? "<=" : ""}${num(e.rir!)}${e.rirMax != null ? `-${num(e.rirMax)}` : ""}`
  return ` ${which}${last ? "(last)" : ""}`
}

/** One row without its count: reps, load and effort. */
function rowText(ex: PrescribedExercise, s: PrescribedSet): string {
  return `${repsText(s)}${loadText(ex, s)}${effortText(s, false)}`
}

export function describeResolved(ex: PrescribedExercise): string {
  const runs: string[] = []
  const groups = new Map<string, PrescribedGroup>((ex.groups ?? []).map((g) => [g.id, g]))
  let i = 0
  while (i < ex.sets.length) {
    const s = ex.sets[i]
    const g = s.groupId ? groups.get(s.groupId) : undefined
    if (g && (g.countMin !== g.countMax || g.options || g.effort?.lastSetOnly)) {
      // A group that is one idea — a range of sets, a choice of schemes, a cap on the last set — is one run.
      const rows = ex.sets.filter((r) => r.groupId === g.id)
      const first = rows[0]
      const count = g.options
        ? `${g.options[0].count}x${g.options[0].reps}|${g.options[g.options.length - 1].count}x${g.options[g.options.length - 1].reps}`
        : `${g.countMin === g.countMax ? g.countMin : `${g.countMin}-${g.countMax}`}x${repsText(first)}`
      const effort = g.effort?.lastSetOnly ? effortText(g.effort, true) : effortText(first, false)
      runs.push(`${count}${loadText(ex, first)}${effort}`)
      i += rows.length
      continue
    }
    const text = rowText(ex, s)
    let n = 1
    while (i + n < ex.sets.length && ex.sets[i + n].groupId === s.groupId && rowText(ex, ex.sets[i + n]) === text) n++
    runs.push(`${n}x${text}`)
    i += n
  }
  return runs.join(", ")
}
