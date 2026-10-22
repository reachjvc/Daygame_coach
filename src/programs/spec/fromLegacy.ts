/**
 * TODAY'S PROGRAMS, WRITTEN IN THE NEW FORMAT — without changing what they do.
 *
 * Plans/program-builder.md, Phase 1.3. Every lifting program the app has —
 * the built-ins and every week somebody edited or wrote — converts to a
 * `ProgramSpec` that the rebuilt engine runs to exactly the same numbers
 * (`tests/fixtures/programs/golden-v1`). So the mapping is literal, not tidy:
 *
 *   · a lift's id stays its id, because every logged set and every stored
 *     state is keyed by it; the same lift on a second day becomes its own
 *     slot that SHARES the first one's numbers (`stateKey`), which is what
 *     the old format meant by reusing an id;
 *   · "4×5, then 1×5+" is two set groups, four working sets and one all-out
 *     set, numbered 1–5 straight through as before;
 *   · a 5/3/1 wave is one set group listed set by set, with weeks 2–4 as
 *     week changes, and a training max per lift taken at 90% of the 1RM;
 *   · a calisthenics ladder is a ladder of named variations.
 *
 * Running plans and the splits program are NOT converted: Q3 keeps them on
 * their own engine. Asking for one answers `{ kept }`, never a half-made spec.
 */

import type {
  DayTemplate,
  LoadExercise,
  LoadProgressionRule,
  LoadSetSpec,
  ProgramDefinition,
  ProgramSchedule,
  SkillDay,
  SkillExercise,
} from "../types"
import { checkSpec } from "./schema"
import {
  SPEC_VERSION,
  type CalendarSpec,
  type DaySpec,
  type MaxSpec,
  type PerSet,
  type ProgressionRule,
  type ProgramSpec,
  type SetGroup,
  type SlotSpec,
  type UnitSystem,
  type WeekOverride,
} from "./types"

/** 5/3/1's training max: 90% of the 1RM, the number the old engine hard-coded. */
export const LEGACY_TM_PCT = 0.9

/** The old schedule kinds this format runs. */
type LiftingSchedule = Extract<ProgramSchedule, { kind: "linear_rotation" | "weekly_waved" | "skill_routine" }>

export type LegacyConversion =
  | { spec: ProgramSpec }
  | { kept: "endurance" | "hold"; reason: string }

/** Is this a lifting program the new format runs, or one Q3 leaves on its own engine? */
export function isLiftingSchedule(schedule: ProgramSchedule): boolean {
  return schedule.kind === "linear_rotation" || schedule.kind === "weekly_waved" || schedule.kind === "skill_routine"
}

/**
 * Convert a program as an enrollment runs it: the catalogue entry, with the
 * person's own week in place of the catalogue's when they have one.
 */
export function convertLegacy(
  program: ProgramDefinition,
  opts: { unit?: UnitSystem; customSchedule?: ProgramSchedule | null; name?: string | null; draft?: boolean } = {}
): LegacyConversion {
  const schedule = opts.customSchedule ?? program.schedule
  if (schedule.kind === "endurance_weeks") {
    return { kept: "endurance", reason: "Running and triathlon plans keep their own engine (Q3)." }
  }
  if (schedule.kind === "hold_routine") {
    return { kept: "hold", reason: "Mobility hold routines keep their own engine (Q3)." }
  }
  const spec: ProgramSpec = {
    specVersion: SPEC_VERSION,
    name: (opts.name?.trim() || program.name).slice(0, 80),
    blurb: program.blurb.slice(0, 600) || undefined,
    credit: program.sourceCitation.slice(0, 160) || undefined,
    unit: opts.unit ?? "kg",
    calendar: calendarOf(schedule),
    ...maxesOf(schedule),
    days: daysOf(schedule),
  }
  const clean = JSON.parse(JSON.stringify(spec)) as ProgramSpec
  const checked = checkSpec(clean, { draft: opts.draft })
  if (!checked.ok) {
    throw new Error(`${program.id} did not convert to a valid program: ${checked.problems.join(" ")}`)
  }
  return { spec: checked.spec }
}

/** The same, for callers that already know it is a lifting program. */
export function specFromLegacy(
  program: ProgramDefinition,
  opts: { unit?: UnitSystem; customSchedule?: ProgramSchedule | null; name?: string | null } = {}
): ProgramSpec {
  const converted = convertLegacy(program, opts)
  if ("kept" in converted) throw new Error(`${program.id}: ${converted.reason}`)
  return converted.spec
}

// ---------------------------------------------------------------------------

function calendarOf(schedule: LiftingSchedule): CalendarSpec {
  // All or nothing, exactly as `isWeekdayAnchored` decided it: a week with some
  // days pinned and some not runs in order.
  const anchored =
    schedule.kind !== "skill_routine" && schedule.days.length > 0 && schedule.days.every((d) => d.weekday != null)
  return {
    days: anchored ? "weekdays" : "in-order",
    // The old engine counted weeks by sessions completed, on every program.
    weekCounting: "completed",
    lengthWeeks: schedule.kind === "weekly_waved" ? schedule.weeks : null,
    atEnd: "repeat",
  }
}

function maxesOf(schedule: LiftingSchedule): { maxes?: MaxSpec[] } {
  if (schedule.kind === "skill_routine") return {}
  const seen = new Set<string>()
  const maxes: MaxSpec[] = []
  for (const d of schedule.days) {
    for (const ex of d.exercises) {
      if (ex.progression.kind !== "percentage_tm" || seen.has(ex.id)) continue
      seen.add(ex.id)
      maxes.push({ lift: ex.id, kind: "tm", tmPct: LEGACY_TM_PCT })
    }
  }
  return maxes.length ? { maxes } : {}
}

function daysOf(schedule: LiftingSchedule): DaySpec[] {
  const used = new Map<string, number>()
  /** The first appearance keeps the id; a later one is its own slot sharing the numbers. */
  const slotIdentity = (id: string): { id: string; stateKey?: string } => {
    const n = (used.get(id) ?? 0) + 1
    used.set(id, n)
    return n === 1 ? { id } : { id: `${id}~${n}`, stateKey: id }
  }

  if (schedule.kind === "skill_routine") {
    return schedule.days.map((d: SkillDay) => ({
      id: d.id,
      label: d.label,
      slots: d.exercises.map((ex) => skillSlot(ex, slotIdentity(ex.id))),
    }))
  }
  return schedule.days.map((d: DayTemplate) => ({
    id: d.id,
    label: d.label,
    ...(d.weekday != null ? { weekday: d.weekday } : {}),
    slots: d.exercises.map((ex) => loadSlot(ex, slotIdentity(ex.id), schedule)),
  }))
}

function loadSlot(ex: LoadExercise, identity: { id: string; stateKey?: string }, schedule: ProgramSchedule): SlotSpec {
  const timed = ex.repUnit === "sec"
  const reps = (n: number) => (timed ? { seconds: n } : n)
  const working = { from: "working" as const }

  let sets: SetGroup[]
  let weeks: WeekOverride[] | undefined
  const scheme = ex.scheme
  if (scheme.kind === "linear") {
    sets = [{ id: "work", kind: "working", count: scheme.sets, reps: reps(scheme.reps), load: working }]
  } else if (scheme.kind === "straight_amrap") {
    const last: SetGroup = { id: "last", kind: "amrap", count: 1, reps: { atLeast: scheme.reps }, load: working }
    sets =
      scheme.sets > 1
        ? [{ id: "work", kind: "working", count: scheme.sets - 1, reps: reps(scheme.reps), load: working }, last]
        : [last]
  } else if (scheme.kind === "rep_range") {
    sets = [
      {
        id: "work",
        kind: "working",
        count: scheme.sets,
        reps: timed ? { seconds: { min: scheme.repMin, max: scheme.repMax } } : { min: scheme.repMin, max: scheme.repMax },
        load: working,
      },
    ]
  } else {
    if (schedule.kind !== "weekly_waved") {
      throw new Error(`${ex.id} is a percentage wave in a program with no weeks`)
    }
    const perSet = (list: LoadSetSpec[]): PerSet[] =>
      list.map((s) => ({
        reps: s.amrap ? { atLeast: s.reps } : s.reps,
        pct: s.pctTM,
        ...(s.restSec != null ? { restSec: s.restSec } : {}),
      }))
    const listFor = (week: number) => {
      const list = scheme.setsByWeek[week]
      if (!list || list.length === 0) throw new Error(`${ex.id} has no sets for week ${week}`)
      return list
    }
    const base = listFor(1)
    sets = [
      {
        id: "main",
        kind: "working",
        count: base.length,
        reps: base[0].amrap ? { atLeast: base[0].reps } : base[0].reps,
        load: { from: "max", max: "tm", pct: base[0].pctTM },
        perSet: perSet(base),
      },
    ]
    weeks = []
    for (let w = 2; w <= schedule.weeks; w++) {
      const list = listFor(w)
      weeks.push({ weeks: String(w), set: "main", count: list.length, perSet: perSet(list) })
    }
  }

  return {
    ...identity,
    lift: { name: ex.name, ...(ex.loadStyle ? { loadStyle: ex.loadStyle } : {}) },
    ...(ex.supersetGroup ? { group: ex.supersetGroup } : {}),
    ...(ex.note ? { note: ex.note } : {}),
    ...(ex.restSec != null ? { restSec: ex.restSec } : {}),
    ...(ex.perSide ? { perSide: true } : {}),
    ...(ex.dropSets ? { dropSets: ex.dropSets } : {}),
    sets,
    ...(weeks && weeks.length ? { weeks } : {}),
    progression: progressionOf(ex.progression),
  }
}

function progressionOf(rule: LoadProgressionRule): ProgressionRule {
  switch (rule.kind) {
    case "none":
      return { kind: "hold" }
    case "linear_load": {
      const stalled = rule.stallIncrementKg != null || rule.stallIncrementLb != null
      return {
        kind: "add-on-success",
        inc: { kg: rule.incrementKg, lb: rule.incrementLb },
        failsBeforeDrop: rule.deloadAfterFails,
        dropPct: rule.deloadPct,
        // The old engine fell back to the full jump for a unit with no stall
        // jump of its own; spelling that out keeps both units identical.
        ...(stalled
          ? { afterStallInc: { kg: rule.stallIncrementKg ?? rule.incrementKg, lb: rule.stallIncrementLb ?? rule.incrementLb } }
          : {}),
        ...(rule.direction ? { direction: rule.direction } : {}),
      }
    }
    case "double_progression":
      return {
        kind: "double",
        inc: { kg: rule.incrementKg, lb: rule.incrementLb },
        ...(rule.deloadAfterFails != null ? { dropAfterFails: rule.deloadAfterFails } : {}),
        ...(rule.deloadPct != null ? { dropPct: rule.deloadPct } : {}),
      }
    case "percentage_tm":
      return {
        kind: "cycle-bump",
        inc: { kg: rule.tmIncrementKg, lb: rule.tmIncrementLb },
        // The old engine rounded the training max to a loadable weight at every bump.
        roundMax: true,
        ...(rule.missTmReductionPct != null ? { missDropPct: rule.missTmReductionPct } : {}),
      }
  }
}

function skillSlot(ex: SkillExercise, identity: { id: string; stateKey?: string }): SlotSpec {
  const first = ex.tiers[0]
  // The format gives a ladder one set scheme for every rung. Every ladder the
  // app has ever shipped is built that way; one that is not is refused rather
  // than flattened onto its first rung.
  const uniform = ex.tiers.every(
    (t) => t.sets === first.sets && t.workReps === first.workReps && t.unlockReps === first.unlockReps
  )
  if (!uniform) throw new Error(`${ex.id}: its variations ask for different sets or reps, which a ladder cannot hold`)
  return {
    ...identity,
    lift: { name: ex.name },
    ...(ex.supersetGroup ? { group: ex.supersetGroup } : {}),
    ...(ex.restSec != null ? { restSec: ex.restSec } : {}),
    sets: [
      {
        id: "work",
        kind: "working",
        count: first.sets,
        reps: first.workReps != null ? { min: first.workReps, max: first.unlockReps } : first.unlockReps,
        load: { from: "bodyweight" },
      },
    ],
    progression: { kind: "ladder", lifts: ex.tiers.map((t) => ({ name: t.name })), advanceAt: { reps: first.unlockReps } },
  }
}
