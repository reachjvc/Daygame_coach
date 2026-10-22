/**
 * THE PROGRAM FORMAT — one way to write down any lifting program.
 *
 * Plans/program-builder.md, "THE PROGRAM FORMAT". Every lifting program — the
 * built-ins, the ones people build, Starscream — is one of these: plain data,
 * checked on every read and write by `schema.ts`, with a version number so a
 * stored copy that this build does not understand is refused out loud
 * (`read.ts`) instead of half-read.
 *
 * It is DATA, NEVER CODE. There is no expression language anywhere in it: a
 * rule is one of a fixed list of presets with numbers filled in. A program
 * written by a stranger can therefore be checked completely and cannot run
 * anything.
 *
 * Running plans and the splits program keep their own engine (Q3); they are not
 * written in this format. `fromLegacy.ts` says so when asked to convert one.
 *
 * Where this file goes further than the plan's sketch, it says why at the
 * field. The additions are the ones today's 13 built-ins need to convert
 * without changing a single prescription (golden equivalence, Phase 2), or that
 * a program in the research corpus needs.
 */

export const SPEC_VERSION = 2 as const

export type UnitSystem = "kg" | "lb"

/** Inclusive. `{ min: 3, max: 5 }` is "3–5". */
export interface Range {
  min: number
  max: number
}

export type NumberOrRange = number | Range

/**
 * Which weeks, written the way a person writes them: "12", "1-11", "1,3,5-7".
 *
 * A string rather than a list of numbers because that is what the week table
 * shows and what the text notation (Phase 7) writes; `weeksIn` in `weeks.ts`
 * turns it into numbers.
 */
export type WeekSet = string

/** A weight step that means the same thing in either unit. Never converted. */
export interface Increment {
  kg: number
  lb: number
}

/**
 * How a lift is loaded, which decides what a loadable weight is.
 * Barbell lifts round from the bar and never go below it; the others do not.
 */
export type LoadStyle = "barbell" | "free" | "bodyweight"

/**
 * WHICH EXERCISE — a library lift, or one somebody named themselves.
 *
 * The NAME is what is stored on every logged set and what History, Progress
 * and the personal records join on, so a converted built-in keeps its exact
 * name ("Squat", not the library's "Back Squat"). `loadStyle` is only written
 * when the author decided it; otherwise the library is asked, by name, the
 * same way the engine has always asked.
 */
export type LiftRef =
  | { lib: string; name?: string }
  | { name: string; loadStyle?: LoadStyle }

/** What one set asks for in reps. */
export type SetReps =
  | number
  | Range
  /** "5+": at least five, then as many as you can. */
  | { atLeast: number }
  /** A timed hold, in seconds. */
  | { seconds: NumberOrRange }
  /** A total spread over however many sets it takes ("100 chin-ups"). */
  | { total: number }

/** The job a set does. The first five are what `workout_sets.set_kind` stores today. */
export type SetKind = "warmup" | "working" | "amrap" | "backoff" | "drop" | "top" | "restpause"

/**
 * WHERE A SET'S WEIGHT COMES FROM.
 *
 * `plus` (on `working` and `max`) is a fixed amount on top, for programs that
 * say "week 2: add 5–10 lb" (Smolov Jr). `of` names ANOTHER lift's weight or
 * max — nSuns' close-grip bench is a percentage of the bench's training max,
 * the Texas Method's Monday is 90% of Friday's weight.
 */
export type LoadSpec =
  /** The lift's working weight — what the progression rule moves. */
  | { from: "working"; pct?: NumberOrRange; of?: string; plus?: Increment }
  /** A percentage of a max from the maxes panel. */
  | { from: "max"; max: "1rm" | "tm" | "rm"; pct: NumberOrRange; of?: string; plus?: Increment }
  /**
   * A percentage of a set done EARLIER TODAY — Starscream's back-offs at 70–80%
   * of the top set you just did. The reference is the heaviest completed set in
   * that group; `slot` names another lift's group, otherwise it is this lift's.
   */
  | { from: "set"; group: string; slot?: string; pct: NumberOrRange }
  /** Picked by feel against the effort target; the app suggests from your e1RM. */
  | { from: "effort" }
  | { from: "bodyweight"; plusKg?: number }
  /** Whatever you choose on the day. */
  | { from: "choose" }

export interface EffortTarget {
  /** 1–10 in half steps. */
  rpe?: NumberOrRange
  /** Reps in reserve, 0–10 in half steps. Shown as written; stored as 10 − RIR. */
  rir?: NumberOrRange
  /** The target applies to the last set only ("last set no harder than RPE 9"). */
  lastSetOnly?: boolean
  /** The target is a ceiling, not an aim: stop before it, never past it. */
  cap?: boolean
}

/** One set in a pyramid, a ramp or a wave, overriding its group's reps or percentage. */
export interface PerSet {
  reps?: SetReps
  pct?: number
  restSec?: number
}

/** A run of sets that share a job, a rep target and a weight source. */
export interface SetGroup {
  /** Stable within the lift: week changes, back-off loads and logs point at it. */
  id: string
  kind: SetKind
  count: NumberOrRange
  reps: SetReps
  /** Alternatives the lifter picks between on the day: 3×10 … 10×3. */
  options?: { count: number; reps: number }[]
  load: LoadSpec
  effort?: EffortTarget
  /** One entry per set, in order, when the sets differ. Needs a fixed `count`. */
  perSet?: PerSet[]
  restSec?: number
  note?: string
}

/**
 * "IN THESE WEEKS, THIS SET GROUP IS DIFFERENT."
 *
 * Only what changes is written — the week table shows exactly these fields.
 * `skip` drops the group for those weeks (a deload week without back-offs).
 */
export interface WeekOverride {
  weeks: WeekSet
  set: string
  count?: NumberOrRange
  reps?: SetReps
  options?: { count: number; reps: number }[]
  load?: LoadSpec
  effort?: EffortTarget
  perSet?: PerSet[]
  restSec?: number
  note?: string
  skip?: boolean
}

/**
 * WHAT HAPPENS TO THE NUMBERS AFTER A WORKOUT.
 *
 * Every rule is a preset with numbers in it — nothing here is evaluated as an
 * expression. `group`, where a rule has it, names the set group whose result
 * decides; absent means every working set of the lift, which is how the old
 * engine judged.
 */
export type ProgressionRule =
  /** Nothing moves; the lifter changes the weight themselves. */
  | { kind: "hold" }
  /**
   * Add weight when every rep is made; after `failsBeforeDrop` misses in a row,
   * drop `dropPct`. `afterStallInc` is the smaller jump once a lift has stalled
   * once (StrongLifts' deadlift, Starting Strength's press). `direction: "down"`
   * is assistance, where less weight is progress.
   */
  | {
      kind: "add-on-success"
      inc: Increment
      failsBeforeDrop: number
      dropPct: number
      afterStallInc?: Increment
      direction?: "up" | "down"
      group?: string
    }
  /** Reps climb to the top of the range on every set, then the weight goes up. */
  | { kind: "double"; inc: Increment; dropAfterFails?: number; dropPct?: number; group?: string }
  /**
   * The all-out set's reps pick the jump from a table (nSuns, Greyskull's double
   * jump). Rows are read highest `minReps` first; below every row is a miss.
   */
  | {
      kind: "amrap-table"
      group: string
      table: { minReps: number; inc: Increment }[]
      target: "working" | "max"
      failsBeforeDrop?: number
      dropPct?: number
    }
  /** Every rep past `standard` adds `perRep` (Juggernaut); or `pct` of the max (Bullmastiff). */
  | {
      kind: "per-extra-rep"
      group: string
      standard: number
      perRep?: Increment
      pct?: number
      capReps?: number
      target: "working" | "max"
    }
  /**
   * Hold the weight and change the scheme on a miss (GZCLP): stage 1 → 2 → 3.
   * After the last stage fails, either retest and restart at `resetPct` of the
   * new max, or go back to stage 1 at the last stage-1 weight plus `resetInc`.
   */
  | {
      kind: "stages"
      stages: SetGroup[][]
      inc: Increment
      onFailLast: { retest?: boolean; resetPct?: number; resetInc?: Increment }
    }
  /**
   * The max moves once a cycle (5/3/1), after the lift's last session of the
   * last week; down by `missDropPct` if a top set was missed. The max itself
   * is not rounded — only bar weights are, as Wendler writes it — unless
   * `roundMax`, which is what the app's own 5/3/1 always did.
   */
  | { kind: "cycle-bump"; inc: Increment; onlyIfAllDone?: boolean; missDropPct?: number; group?: string; roundMax?: boolean }
  /** Effort picks the weight; nothing is moved, the e1RM is kept to suggest the next one. */
  | { kind: "by-effort"; group?: string }
  /** One more set each week up to `maxSets` (RP-style). */
  | { kind: "add-set-per-week"; maxSets: number; group?: string }
  /** A harder exercise once every set reaches `advanceAt` (bodyweight progressions). */
  | { kind: "ladder"; lifts: LiftRef[]; advanceAt: { reps?: number; seconds?: number } }

/** One exercise on one day. */
export interface SlotSpec {
  /** Unique in the program: keys "last time" and every logged set. */
  id: string
  lift: LiftRef
  /** Picked on the day: "back OR front squat", "[delt work]". */
  choices?: LiftRef[]
  /** Same tag = superset; three or more = giant set. */
  group?: string
  note?: string
  restSec?: number
  perSide?: boolean
  /**
   * Drops off the last set, as a display modifier. Carried from the old format
   * (a written week's "+2 drops"), where progression ignores them; a program
   * that prescribes drop sets as real sets uses a `drop` set group instead.
   */
  dropSets?: number
  sets: SetGroup[]
  /** "Week 12: top = 1×1–5 @ RPE 9." */
  weeks?: WeekOverride[]
  progression: ProgressionRule
  /**
   * Whose numbers this lift uses. Absent: its own (`id`). Two slots with one
   * key share one working weight — the same bench on two days of a split.
   */
  stateKey?: string
}

export interface DaySpec {
  id: string
  label: string
  /** 1 = Monday … 7 = Sunday. Required on every day when the calendar runs on weekdays. */
  weekday?: number
  slots: SlotSpec[]
}

/**
 * A max the program calculates from. `lift` is the key a slot's numbers are
 * kept under (its `stateKey`, or its `id`). A training max is entered as a
 * 1RM and taken at `tmPct`; a rep max names its reps.
 */
export interface MaxSpec {
  lift: string
  kind: "1rm" | "tm" | "rm"
  reps?: number
  tmPct?: number
  /** "Front squat = 70% of back squat." */
  derivedFrom?: { lift: string; pct: number }
}

export interface CalendarSpec {
  /** Pinned to weekdays, or worked through in order whenever you train. */
  days: "weekdays" | "in-order"
  /** Q8: weeks by the calendar from the start date, or by workouts completed. */
  weekCounting: "calendar" | "completed"
  /** Null: open-ended — every pass through the days is a cycle and there are no weeks. */
  lengthWeeks: number | null
  /** Q9. */
  atEnd: "finish" | "repeat"
  /** Labels only ("Base", "Peak"); nothing is computed from them. */
  phases?: { label: string; weeks: WeekSet }[]
  deloadWeeks?: WeekSet
  testWeeks?: WeekSet
}

export interface ProgramSpec {
  specVersion: typeof SPEC_VERSION
  name: string
  blurb?: string
  credit?: string
  unit: UnitSystem
  calendar: CalendarSpec
  maxes?: MaxSpec[]
  /**
   * The weight step, when the program says ("rounding 2.5" in a sheet).
   * `nearest` rounds like a spreadsheet's MROUND; `down` never asks for more
   * than was meant. Absent: the account's plates, rounding down — what every
   * program got before this field.
   */
  rounding?: { stepKg?: number; stepLb?: number; mode?: "nearest" | "down" }
  days: DaySpec[]
}
