/**
 * WHAT A FINISHED WORKOUT DOES TO THE NUMBERS — Plans/program-builder.md,
 * Phase 2.4.
 *
 * The four rules the app already had (hold, add weight on success, double
 * progression, the 5/3/1 cycle bump) and the calisthenics ladder are ported
 * from `programsService.ts` LINE FOR LINE, sentences included: a converted
 * built-in must announce exactly what it announced before (golden
 * equivalence). The rules the format adds — an AMRAP table, a bump per extra
 * rep, stages, by effort, a set per week — are new and say so in their own
 * words.
 *
 * Every rule judges the lift against what was ASKED, which is the slot's own
 * prescription for that week, worked out again here rather than trusted from
 * the caller.
 */

import { judgeLoadEntry, formatLoad } from "../programsService"
import type {
  ApplyLogResult,
  ExerciseState,
  LoggedExercise,
  PrescribedSet,
  ProgramSessionLogInput,
  ProgressionChange,
} from "../types"
import type { Increment, ProgramSpec, ProgressionRule, SlotSpec, UnitSystem } from "../spec/types"
import { stateKeyOf } from "../spec/schema"
import { advance } from "./calendar"
import { roundLoad, roundingContext, type RoundingContext } from "./rounding"
import { groupsForWeek, ladderRung, liftLoadStyle, liftName, maxValue, prescribeSlot, type EngineEnrollment } from "./prescribe"
import { e1rm } from "./e1rm"

const round2 = (n: number) => Math.round(n * 100) / 100
const incIn = (inc: Increment, unit: UnitSystem) => (unit === "kg" ? inc.kg : inc.lb)

/** The rows a rule judges: its group's, or every working row (warm-ups never count). */
function judgedRows(rows: PrescribedSet[], group: string | undefined): PrescribedSet[] {
  return rows.filter((r) => (group ? r.groupId === group : r.kind !== "warmup"))
}

interface RuleInput {
  spec: ProgramSpec
  slot: SlotSpec
  key: string
  name: string
  prev: ExerciseState
  entry: LoggedExercise
  rows: PrescribedSet[]
  week: number
  unit: UnitSystem
  ctx: RoundingContext
  nextState: Record<string, ExerciseState>
  /** The day the log is for. */
  dayIndex: number
}

/**
 * The week a log is judged in: the cursor's, as before, unless weeks run by
 * the calendar. A repeating program's week wraps back to 1; a finishing one
 * stays on its last week.
 */
function judgedWeek(spec: ProgramSpec, enr: EngineEnrollment, log: ProgramSessionLogInput): number {
  const raw = Math.max(1, spec.calendar.weekCounting === "calendar" ? log.week : enr.cursor.week)
  const length = spec.calendar.lengthWeeks
  if (length == null) return raw
  return spec.calendar.atEnd === "repeat" ? ((raw - 1) % length) + 1 : Math.min(raw, length)
}

export function applySession<E extends EngineEnrollment>(
  spec: ProgramSpec,
  enr: E,
  log: ProgramSessionLogInput,
  opts: { programId: string; fallbackWorking?: Record<string, number> }
): ApplyLogResult<E> {
  /**
   * THE DAY THAT WAS ACTUALLY DONE, not the one the cursor points at; an
   * unknown or absent day (the skip path sends "") falls back to the cursor.
   */
  const logged = spec.days.findIndex((d) => d.id === log.dayId)
  const dayIndex = logged >= 0 ? logged : enr.cursor.dayIndex
  const day = spec.days[dayIndex]
  if (!day) throw new Error(`Program ${opts.programId} has no day at index ${dayIndex}`)
  const unit = enr.unitSystem
  const ctx = roundingContext(spec, unit, enr.plates)
  const week = judgedWeek(spec, enr, log)
  const nextState: Record<string, ExerciseState> = { ...enr.exerciseState }
  const changes: ProgressionChange[] = []

  for (const slot of day.slots) {
    const key = stateKeyOf(slot)
    const entry = log.entries.find((e) => (e.slotId != null ? e.slotId === slot.id : e.exerciseId === key))
    const name = liftName(slot.lift)

    if (slot.progression.kind === "ladder") {
      // The calisthenics engine's own rules: only an explicit skip is passed over.
      if (entry?.skipped) continue
      changes.push(progressLadder(slot, key, name, enr.exerciseState[key], entry, nextState))
      continue
    }

    const prev = enr.exerciseState[key]
    if (!prev) throw new Error(`Enrollment ${enr.id} missing state for ${key}`)

    /**
     * A LIFT YOU DID NOT DO IS NOT A LIFT YOU FAILED. Skipping holds and does
     * not touch the fail counter.
     */
    if (!entry || entry.skipped) {
      nextState[key] = prev
      changes.push({
        exerciseId: key,
        name,
        kind: "hold",
        ...(prev.workingWeight != null ? { fromWeight: prev.workingWeight, toWeight: prev.workingWeight } : {}),
        reason:
          entry && entry.sets.length > 0
            ? "You said not to count this one — the weight is waiting where you left it."
            : "Skipped — nothing changed, it is waiting where you left it.",
      })
      continue
    }

    const rows = prescribeSlot(spec, slot, week, { ...enr, exerciseState: { ...enr.exerciseState } }, opts.fallbackWorking).sets
    const ruleGroup = "group" in slot.progression ? slot.progression.group : undefined
    /**
     * A RULE WHOSE SETS ARE NOT DONE THIS WEEK JUDGES NOTHING. A week change
     * can drop the group a rule follows (a run-up week, a deload without the
     * top set); reading an empty group as "every set made" would add weight for
     * work nobody was asked to do.
     */
    if (judgedRows(rows, ruleGroup).length === 0 && slot.progression.kind !== "hold") {
      nextState[key] = prev
      changes.push({
        exerciseId: key,
        name,
        kind: "hold",
        ...(prev.workingWeight != null ? { fromWeight: prev.workingWeight, toWeight: prev.workingWeight } : {}),
        reason: "This week's sets do not count toward the next step — nothing changes.",
      })
      continue
    }
    const input: RuleInput = { spec, slot, key, name, prev, entry, rows, week, unit, ctx, nextState, dayIndex }
    const change = applyRule(slot.progression, input)
    if (change) changes.push(change)
  }

  return {
    enrollment: { ...enr, exerciseState: nextState, cursor: advance(spec, { ...enr.cursor, dayIndex }, dayIndex) },
    changes,
  }
}

function applyRule(rule: ProgressionRule, x: RuleInput): ProgressionChange | null {
  switch (rule.kind) {
    case "hold":
      // Held on purpose, and reported as no change rather than omitted.
      x.nextState[x.key] = x.prev
      return {
        exerciseId: x.key,
        name: x.name,
        kind: "hold",
        fromWeight: x.prev.workingWeight ?? 0,
        toWeight: x.prev.workingWeight ?? 0,
        reason: "You set this one to hold — change the weight yourself when you are ready.",
      }
    case "add-on-success":
      return addOnSuccess(rule, x)
    case "double":
      return doubleProgression(rule, x)
    case "cycle-bump":
      return cycleBump(rule, x)
    case "amrap-table":
      return amrapTable(rule, x)
    case "per-extra-rep":
      return perExtraRep(rule, x)
    case "stages":
      return stages(rule, x)
    case "by-effort":
      return byEffort(rule, x)
    case "add-set-per-week":
      x.nextState[x.key] = x.prev
      return {
        exerciseId: x.key,
        name: x.name,
        kind: "hold",
        reason: `One more set each week, up to ${rule.maxSets}.`,
      }
    case "ladder":
      return null
  }
}

/** The weight the rows asked for, as a working weight would be floored to it. */
const askedOf = (x: RuleInput, working: number) => roundLoad(working, liftLoadStyle(x.slot.lift), x.ctx)

// ---------------------------------------------------------------------------
// Ported rules — `progressLinear`, `progressDouble`, `progressPercentage`,
// `applySkillLog` in programsService.ts. Sentences unchanged.
// ---------------------------------------------------------------------------

function addOnSuccess(rule: Extract<ProgressionRule, { kind: "add-on-success" }>, x: RuleInput): ProgressionChange {
  const judged = judgedRows(x.rows, rule.group)
  const fromWeight = x.prev.workingWeight!
  const down = rule.direction === "down"
  const unitLabel = x.unit
  const style = liftLoadStyle(x.slot.lift)

  const stalled = x.prev.stalled === true
  const baseIncrement = incIn(rule.inc, x.unit)
  const stallIncrement = rule.afterStallInc ? incIn(rule.afterStallInc, x.unit) : undefined
  const increment = stalled && stallIncrement != null ? stallIncrement : baseIncrement

  const asked = askedOf(x, fromWeight)
  const reps = Math.min(...judged.map((r) => r.reps))
  const verdict = judgeLoadEntry({ sets: judged.length, reps, weight: asked }, x.entry, { direction: rule.direction })

  if (verdict.verdict === "advance") {
    const base = down ? Math.min(fromWeight, verdict.achieved) : Math.max(fromWeight, verdict.achieved)
    const toWeight = round2(down ? Math.max(0, base - increment) : base + increment)
    const nextAsked = askedOf(x, toWeight)
    const note =
      nextAsked === asked
        ? ` — your plates cannot make that step yet, so it is the same weight again and moves next session`
        : ""
    x.nextState[x.key] = { ...x.prev, workingWeight: toWeight, consecutiveFails: 0 }
    return {
      exerciseId: x.key,
      name: x.name,
      kind: nextAsked === asked ? "hold" : "advance",
      fromWeight: asked,
      toWeight: nextAsked,
      reason: down ? `Hit all reps → ${increment}${unitLabel} less help${note}` : `Hit all reps → +${increment}${unitLabel}${note}`,
    }
  }

  if (verdict.verdict === "hold_lighter") {
    x.nextState[x.key] = { ...x.prev, workingWeight: fromWeight, consecutiveFails: 0 }
    return {
      exerciseId: x.key,
      name: x.name,
      kind: "hold",
      fromWeight,
      toWeight: fromWeight,
      reason: `You did every rep at ${formatLoad(verdict.achieved)} ${unitLabel} rather than ${formatLoad(asked)} — kept at ${formatLoad(asked)}.`,
    }
  }

  const fails = (x.prev.consecutiveFails ?? 0) + 1
  if (fails >= rule.failsBeforeDrop) {
    const dropped = down ? fromWeight * (1 + rule.dropPct) : fromWeight * (1 - rule.dropPct)
    const toWeight = roundLoad(dropped, style, x.ctx, "nearest")
    const atFloor = !down && toWeight >= fromWeight
    x.nextState[x.key] = { ...x.prev, workingWeight: toWeight, consecutiveFails: 0, stalled: true }
    return {
      exerciseId: x.key,
      name: x.name,
      kind: atFloor ? "hold" : "deload",
      fromWeight,
      toWeight,
      reason: atFloor
        ? `${fails} misses, but this is already the lightest your bar can be — use a lighter bar, or change the weight yourself.`
        : `${fails} misses → back off ${Math.round(rule.dropPct * 100)}%${stallIncrement != null ? `, then ${stallIncrement}${unitLabel} a session` : ""}`,
    }
  }

  x.nextState[x.key] = { ...x.prev, workingWeight: fromWeight, consecutiveFails: fails }
  const askedSets = judged.length
  const short =
    verdict.shortfall === "sets"
      ? `Only ${verdict.setsDone} of ${askedSets} ${askedSets === 1 ? "set" : "sets"}`
      : verdict.shortfall === "both"
        ? `Only ${verdict.setsDone} of ${askedSets} sets, and short on reps`
        : `Short on reps`
  const left = rule.failsBeforeDrop - fails
  const warning =
    left <= 0 ? "" : left === 1 ? " One more like this and the weight comes down." : ` ${left} more like this and the weight comes down.`
  return {
    exerciseId: x.key,
    name: x.name,
    kind: "hold",
    fromWeight,
    toWeight: fromWeight,
    reason: `${short} → same weight next time.${warning}`,
  }
}

function doubleProgression(rule: Extract<ProgressionRule, { kind: "double" }>, x: RuleInput): ProgressionChange {
  const judged = judgedRows(x.rows, rule.group)
  const nSets = judged.length
  const repMin = Math.min(...judged.map((r) => r.reps))
  const repMax = Math.min(...judged.map((r) => r.repRangeMax ?? r.reps))
  const fromWeight = x.prev.workingWeight!
  const increment = incIn(rule.inc, x.unit)
  const style = liftLoadStyle(x.slot.lift)

  const asked = askedOf(x, fromWeight)
  const top = judgeLoadEntry({ sets: nSets, reps: repMax, weight: asked }, x.entry)
  const floor = judgeLoadEntry({ sets: nSets, reps: repMin, weight: asked }, x.entry)

  if (top.verdict === "advance") {
    const base = Math.max(fromWeight, top.achieved)
    const toWeight = round2(base + increment)
    const nextAsked = askedOf(x, toWeight)
    const note =
      nextAsked === asked
        ? " — your plates cannot make that step yet, so it is the same weight again and moves next session"
        : ""
    x.nextState[x.key] = { ...x.prev, workingWeight: toWeight, consecutiveFails: 0 }
    return {
      exerciseId: x.key,
      name: x.name,
      kind: nextAsked === asked ? "hold" : "advance",
      fromWeight: asked,
      toWeight: nextAsked,
      reason: `Hit ${repMax} on all sets → +${increment}${x.unit}${note}`,
    }
  }

  if (top.verdict === "hold_lighter") {
    x.nextState[x.key] = { ...x.prev, workingWeight: fromWeight, consecutiveFails: 0 }
    return {
      exerciseId: x.key,
      name: x.name,
      kind: "hold",
      fromWeight,
      toWeight: fromWeight,
      reason: `You did every rep at ${formatLoad(top.achieved)} ${x.unit} rather than ${formatLoad(asked)} — kept at ${formatLoad(asked)}.`,
    }
  }

  if (floor.verdict !== "fail" || !rule.dropAfterFails) {
    x.nextState[x.key] = { ...x.prev, workingWeight: fromWeight, consecutiveFails: 0 }
    return {
      exerciseId: x.key,
      name: x.name,
      kind: "hold",
      fromWeight,
      toWeight: fromWeight,
      reason: `In range → hold ${formatLoad(fromWeight)}${x.unit}, chase ${repMax}`,
    }
  }

  const fails = (x.prev.consecutiveFails ?? 0) + 1
  if (fails >= rule.dropAfterFails) {
    const toWeight = roundLoad(fromWeight * (1 - (rule.dropPct ?? 0.1)), style, x.ctx, "nearest")
    const atFloor = toWeight >= fromWeight
    x.nextState[x.key] = { ...x.prev, workingWeight: toWeight, consecutiveFails: 0, stalled: true }
    return {
      exerciseId: x.key,
      name: x.name,
      kind: atFloor ? "hold" : "deload",
      fromWeight,
      toWeight,
      reason: atFloor
        ? `${fails} sessions under ${repMin}, and this is already as light as your bar goes.`
        : `${fails} sessions under ${repMin} → back off`,
    }
  }
  x.nextState[x.key] = { ...x.prev, workingWeight: fromWeight, consecutiveFails: fails }
  return {
    exerciseId: x.key,
    name: x.name,
    kind: "hold",
    fromWeight,
    toWeight: fromWeight,
    reason: `Below ${repMin} (${fails}/${rule.dropAfterFails})`,
  }
}

/** Which max a cycle bump moves: the kind the lift's loads read, a training max by default. */
function maxKindOf(spec: ProgramSpec, key: string): "1rm" | "tm" | "rm" {
  return spec.maxes?.find((m) => m.lift === key)?.kind ?? "tm"
}
const maxField = { tm: "trainingMax", "1rm": "oneRepMax", rm: "repMax" } as const

function cycleBump(rule: Extract<ProgressionRule, { kind: "cycle-bump" }>, x: RuleInput): ProgressionChange | null {
  const kind = maxKindOf(x.spec, x.key)
  const field = maxField[kind]
  const fromTM = maxValue(x.prev, kind)!
  const increment = incIn(rule.inc, x.unit)
  const style = liftLoadStyle(x.slot.lift)

  /**
   * THE TOP SET IS JUDGED EVERY WEEK, AND BY ITS FLAG: the row the
   * prescription marks all-out is the one that counts.
   */
  const judged = judgedRows(x.rows, rule.group)
  const top = judged.find((r) => r.amrap)
  const logged = top ? x.entry.sets.find((s) => s.setNumber === top.setNumber) : undefined
  const missedThisWeek = top && logged ? logged.reps < top.reps : false
  const missedTopSet = x.prev.missedTopSet === true || missedThisWeek

  /**
   * THE MAX MOVES WHEN THE CYCLE IS OVER, NOT BEFORE THE DELOAD — and ONCE:
   * after the lift's last session of the last week. A lift trained twice a
   * week used to be bumped twice.
   */
  // The lift's last day in this week: a day where it has sets THIS week, so a
  // lift skipped on Friday in alternate weeks is bumped on its Wednesday.
  const order = x.spec.days.map((d, i) => ({ i, at: x.spec.calendar.days === "weekdays" ? (d.weekday ?? i) : i }))
  const lastDayOfLift = order
    .filter(({ i }) => x.spec.days[i].slots.some((s) => stateKeyOf(s) === x.key && groupsForWeek(s, x.week, x.prev).length > 0))
    .sort((a, b) => a.at - b.at)
    .at(-1)?.i
  if (x.week !== x.spec.calendar.lengthWeeks || x.dayIndex !== lastDayOfLift) {
    if (missedTopSet !== (x.prev.missedTopSet === true)) x.nextState[x.key] = { ...x.prev, missedTopSet }
    return null
  }

  const settle = (n: number) => (rule.roundMax ? roundLoad(n, style, x.ctx, "nearest") : round2(n))
  if (missedTopSet && rule.missDropPct != null) {
    const toTM = settle(fromTM * (1 - rule.missDropPct))
    x.nextState[x.key] = { [field]: toTM, missedTopSet: false }
    return {
      exerciseId: x.key,
      name: x.name,
      kind: "tm_reset",
      fromWeight: fromTM,
      toWeight: toTM,
      reason: `Missed a top set this cycle → training max −${Math.round(rule.missDropPct * 100)}%`,
    }
  }
  if (rule.onlyIfAllDone && !everyRowMade(x.rows, x.entry)) {
    x.nextState[x.key] = { ...x.prev, missedTopSet: false }
    return { exerciseId: x.key, name: x.name, kind: "hold", fromWeight: fromTM, toWeight: fromTM, reason: "Not every set was done this cycle → the max stays where it is." }
  }

  const toTM = settle(fromTM + increment)
  x.nextState[x.key] = { [field]: toTM, missedTopSet: false }
  return {
    exerciseId: x.key,
    name: x.name,
    kind: "tm_increase",
    fromWeight: fromTM,
    toWeight: toTM,
    reason: `Cycle complete → training max +${increment}${x.unit}`,
  }
}

function everyRowMade(rows: PrescribedSet[], entry: LoggedExercise): boolean {
  return rows.every((r) => entry.sets.some((s) => s.setNumber === r.setNumber && s.reps >= r.reps))
}

function progressLadder(
  slot: SlotSpec,
  key: string,
  name: string,
  state: ExerciseState | undefined,
  entry: LoggedExercise | undefined,
  nextState: Record<string, ExerciseState>
): ProgressionChange {
  const rule = slot.progression as Extract<ProgressionRule, { kind: "ladder" }>
  const idx = ladderRung(slot, state)
  const rungName = liftName(rule.lifts[idx])
  const unlock = rule.advanceAt.reps ?? rule.advanceAt.seconds ?? Number.POSITIVE_INFINITY
  const sets = groupsForWeek(slot, 1, state).reduce((n, g) => n + (typeof g.count === "number" ? g.count : g.count.min), 0)
  const hit = (entry?.sets.filter((s) => s.reps >= unlock).length ?? 0) >= sets
  if (hit && idx < rule.lifts.length - 1) {
    nextState[key] = { tierIndex: idx + 1 }
    return { exerciseId: key, name, kind: "tier_up", reason: `Unlocked: ${liftName(rule.lifts[idx + 1])}` }
  }
  nextState[key] = { tierIndex: idx }
  return { exerciseId: key, name, kind: "hold", reason: hit ? `Top tier — keep adding reps` : `Keep working ${rungName}` }
}

// ---------------------------------------------------------------------------
// The format's new rules
// ---------------------------------------------------------------------------

/** The reps of the all-out set in a group, as logged, or null if it was not logged. */
function allOutReps(x: RuleInput, group: string): { reps: number; floor: number } | null {
  const row = x.rows.find((r) => r.groupId === group && r.amrap) ?? x.rows.find((r) => r.groupId === group)
  if (!row) return null
  const set = x.entry.sets.find((s) => (s.groupId != null ? s.groupId === group : s.setNumber === row.setNumber))
  return set ? { reps: set.reps, floor: row.reps } : null
}

/** Add to the working weight or the max. Neither is rounded here: the prescription rounds. */
function addTo(x: RuleInput, target: "working" | "max", delta: number): { from: number; to: number; state: ExerciseState } {
  if (target === "working") {
    const from = x.prev.workingWeight!
    const to = round2(from + delta)
    return { from, to, state: { ...x.prev, workingWeight: to } }
  }
  const kind = maxKindOf(x.spec, x.key)
  const from = maxValue(x.prev, kind)!
  // A max is a number to work from, not a weight on a bar: it is not rounded.
  const to = round2(from + delta)
  return { from, to, state: { ...x.prev, [maxField[kind]]: to } }
}

function amrapTable(rule: Extract<ProgressionRule, { kind: "amrap-table" }>, x: RuleInput): ProgressionChange {
  const got = allOutReps(x, rule.group)
  const rows = [...rule.table].sort((a, b) => b.minReps - a.minReps)
  const row = got ? rows.find((r) => got.reps >= r.minReps) : undefined
  const unit = x.unit
  if (row) {
    const inc = incIn(row.inc, unit)
    const { from, to, state } = addTo(x, rule.target, inc)
    x.nextState[x.key] = { ...state, consecutiveFails: 0 }
    return {
      exerciseId: x.key,
      name: x.name,
      kind: inc === 0 ? "hold" : rule.target === "max" ? "tm_increase" : "advance",
      fromWeight: from,
      toWeight: to,
      reason:
        inc === 0
          ? `${got!.reps} reps on the all-out set → same ${rule.target === "max" ? "max" : "weight"} next time`
          : `${got!.reps} reps on the all-out set → +${inc}${unit}`,
    }
  }
  const fails = (x.prev.consecutiveFails ?? 0) + 1
  if (rule.failsBeforeDrop != null && rule.dropPct != null && fails >= rule.failsBeforeDrop) {
    const style = liftLoadStyle(x.slot.lift)
    const kind = maxKindOf(x.spec, x.key)
    const from = rule.target === "working" ? x.prev.workingWeight! : maxValue(x.prev, kind)!
    const to = roundLoad(from * (1 - rule.dropPct), style, x.ctx, "nearest")
    x.nextState[x.key] =
      rule.target === "working"
        ? { ...x.prev, workingWeight: to, consecutiveFails: 0, stalled: true }
        : { ...x.prev, [maxField[kind]]: to, consecutiveFails: 0 }
    return {
      exerciseId: x.key,
      name: x.name,
      kind: rule.target === "max" ? "tm_reset" : "deload",
      fromWeight: from,
      toWeight: to,
      reason: `${fails} ${fails === 1 ? "miss" : "misses"} on the all-out set → back off ${Math.round(rule.dropPct * 100)}%`,
    }
  }
  x.nextState[x.key] = { ...x.prev, consecutiveFails: fails }
  const at = rule.target === "working" ? x.prev.workingWeight : maxValue(x.prev, maxKindOf(x.spec, x.key))
  return {
    exerciseId: x.key,
    name: x.name,
    kind: "hold",
    ...(at != null ? { fromWeight: at, toWeight: at } : {}),
    reason: got ? `${got.reps} reps on the all-out set → same weight next time` : "The all-out set was not logged → same weight next time",
  }
}

function perExtraRep(rule: Extract<ProgressionRule, { kind: "per-extra-rep" }>, x: RuleInput): ProgressionChange {
  const got = allOutReps(x, rule.group)
  const extra = got ? Math.max(0, Math.min(got.reps - rule.standard, rule.capReps ?? Number.POSITIVE_INFINITY)) : 0
  // A percentage per extra rep is a percentage of the MAX (Bullmastiff: +1% of
  // the 1RM a rep), whichever number it is added to; a lift with no max uses
  // the number it moves.
  const kind = maxKindOf(x.spec, x.key)
  const max = maxValue(x.prev, kind)
  const base = max ?? (rule.target === "working" ? x.prev.workingWeight! : 0)
  const delta = rule.perRep ? extra * incIn(rule.perRep, x.unit) : extra * (rule.pct ?? 0) * base
  const { from, to, state } = addTo(x, rule.target, delta)
  x.nextState[x.key] = state
  return {
    exerciseId: x.key,
    name: x.name,
    kind: to === from ? "hold" : rule.target === "max" ? "tm_increase" : "advance",
    fromWeight: from,
    toWeight: to,
    reason:
      extra > 0
        ? `${extra} ${extra === 1 ? "rep" : "reps"} past ${rule.standard} on the all-out set → +${formatLoad(round2(to - from))}${x.unit}`
        : `No reps past ${rule.standard} on the all-out set → same ${rule.target === "max" ? "max" : "weight"}`,
  }
}

function stages(rule: Extract<ProgressionRule, { kind: "stages" }>, x: RuleInput): ProgressionChange {
  const style = liftLoadStyle(x.slot.lift)
  const stage = Math.min(x.prev.stage ?? 0, rule.stages.length - 1)
  const fromWeight = x.prev.workingWeight!

  if (x.prev.needsRetest) {
    const best = Math.max(0, ...x.entry.sets.filter((s) => s.reps > 0).map((s) => s.weight))
    if (best <= 0) {
      x.nextState[x.key] = x.prev
      return { exerciseId: x.key, name: x.name, kind: "hold", reason: "No retest set was logged → the retest waits for next time." }
    }
    const to = roundLoad(best * (rule.onFailLast.resetPct ?? 1), style, x.ctx, "nearest")
    x.nextState[x.key] = { ...x.prev, workingWeight: to, stage: 0, stageOneWeight: to, needsRetest: false, consecutiveFails: 0 }
    return {
      exerciseId: x.key,
      name: x.name,
      kind: "deload",
      fromWeight,
      toWeight: to,
      reason: `Retested at ${formatLoad(best)}${x.unit} → back to stage 1 at ${formatLoad(to)}${x.unit}`,
    }
  }

  const judged = judgedRows(x.rows, undefined)
  const asked = askedOf(x, fromWeight)
  const verdict = judgeLoadEntry({ sets: judged.length, reps: Math.min(...judged.map((r) => r.reps)), weight: asked }, x.entry)

  if (verdict.verdict !== "fail") {
    const to = round2(fromWeight + (verdict.verdict === "advance" ? incIn(rule.inc, x.unit) : 0))
    x.nextState[x.key] = { ...x.prev, workingWeight: to, consecutiveFails: 0, ...(stage === 0 ? { stageOneWeight: fromWeight } : {}) }
    return {
      exerciseId: x.key,
      name: x.name,
      kind: to === fromWeight ? "hold" : "advance",
      fromWeight: asked,
      toWeight: askedOf(x, to),
      reason: to === fromWeight ? "Every rep, lighter than asked → same weight next time" : `Hit all reps → +${incIn(rule.inc, x.unit)}${x.unit}`,
    }
  }

  if (stage < rule.stages.length - 1) {
    x.nextState[x.key] = { ...x.prev, stage: stage + 1 }
    const next = rule.stages[stage + 1].map((g) => `${typeof g.count === "number" ? g.count : g.count.min}×${typeof g.reps === "number" ? g.reps : "atLeast" in g.reps ? `${g.reps.atLeast}+` : "?"}`).join(", ")
    return { exerciseId: x.key, name: x.name, kind: "hold", fromWeight, toWeight: fromWeight, reason: `Missed → same weight, next stage: ${next}` }
  }

  const reset = rule.onFailLast
  if (reset.retest) {
    x.nextState[x.key] = { ...x.prev, needsRetest: true }
    return { exerciseId: x.key, name: x.name, kind: "hold", fromWeight, toWeight: fromWeight, reason: "Missed the last stage → retest your max next time, and start again from it" }
  }
  const to = reset.resetInc
    ? round2((x.prev.stageOneWeight ?? fromWeight) + incIn(reset.resetInc, x.unit))
    : roundLoad(fromWeight * (reset.resetPct ?? 0.9), style, x.ctx, "nearest")
  x.nextState[x.key] = { ...x.prev, workingWeight: to, stage: 0, consecutiveFails: 0 }
  return { exerciseId: x.key, name: x.name, kind: "deload", fromWeight, toWeight: to, reason: `Missed the last stage → back to stage 1 at ${formatLoad(to)}${x.unit}` }
}

function byEffort(rule: Extract<ProgressionRule, { kind: "by-effort" }>, x: RuleInput): ProgressionChange {
  const rowsOf = new Map(x.rows.map((r) => [r.setNumber, r]))
  const sets = x.entry.sets.filter((s) => {
    const group = s.groupId ?? rowsOf.get(s.setNumber)?.groupId
    return rule.group ? group === rule.group : true
  })
  const best = Math.max(0, ...sets.map((s) => e1rm(s.weight, s.reps, s.rpe)))
  if (best <= 0) {
    x.nextState[x.key] = x.prev
    return { exerciseId: x.key, name: x.name, kind: "hold", reason: "Picked by feel — nothing to estimate from today." }
  }
  x.nextState[x.key] = { ...x.prev, e1rm: best }
  return {
    exerciseId: x.key,
    name: x.name,
    kind: "hold",
    reason: `Picked by feel — your estimated max is about ${formatLoad(Math.round(best))} ${x.unit}.`,
  }
}
