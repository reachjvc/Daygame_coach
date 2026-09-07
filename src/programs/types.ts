/**
 * Types for the Programs slice — trackable, hand-encoded fitness programs.
 *
 * One generic "exercise unit" carries a metric type + progression rule; one
 * engine (programsService) dispatches on metric type. M1 implements the LOAD
 * metric type (strength / bodybuilding). Endurance / skill_tier / hold_range
 * are declared here for the union but not yet implemented by the engine —
 * the engine fails explicitly on them (no silent fallback, CLAUDE.md §3/§15).
 */

// ============================================================================
// Core enums
// ============================================================================

export type MetricType = "load" | "endurance" | "skill_tier" | "hold_range"

export type Discipline =
  | "strength"
  | "bodybuilding"
  | "calisthenics"
  | "cardio"
  | "flexibility"
  | "triathlon"
  | "ironman"

export type LevelId = "beginner" | "intermediate" | "advanced"

export type UnitSystem = "kg" | "lb"

// ============================================================================
// LOAD metric type — prescription & progression (M1)
// ============================================================================

/** One prescribed set within a percentage-of-training-max week. */
export interface LoadSetSpec {
  pctTM: number // fraction of training max, 0–1 (e.g. 0.85)
  reps: number
  amrap?: boolean // last-set "as many reps as possible" (5/3/1 top set)
  /**
   * Rest after THIS set, in seconds, when the author's own scheme varies it.
   *
   * A 5/3/1 wave does not want one number: the 65% opener needs a minute and a
   * half, the 95% top single needs three to five. Absent falls back to the
   * lift's `restSec`, then to our compound/accessory default.
   */
  restSec?: number
}

/**
 * How a load exercise's working weight is scheduled.
 * - linear: fixed sets×reps at an absolute working weight that ratchets up.
 * - straight_amrap: linear, but the LAST set is "as many as you can" with a
 *   floor. The r/Fitness PPL's "4×5 then 1×5+" and StrongLifts-style "5+"
 *   sets are this shape, and it cannot be expressed as `linear` (which has no
 *   AMRAP set) or as `percentage_tm` (which is a weekly table, not one lift's
 *   setting).
 * - percentage_tm: weekly-waved % of a training max (5/3/1).
 */
export type LoadScheme =
  | { kind: "linear"; sets: number; reps: number }
  | { kind: "straight_amrap"; sets: number; reps: number }
  | { kind: "percentage_tm"; setsByWeek: Record<number, LoadSetSpec[]> }
  | { kind: "rep_range"; sets: number; repMin: number; repMax: number }

/** How a load exercise progresses after a logged session / cycle. */
export type LoadProgressionRule =
  /**
   * Hold the weight; the lifter decides when it moves.
   *
   * For a program somebody wrote themselves, where "add 2.5 kg whenever you hit
   * your reps" is an opinion they did not ask for. The engine leaves the
   * working weight exactly where it is and reports no change, so the lift still
   * gets prescribed and logged — it simply does not ratchet.
   */
  | { kind: "none" }
  | {
      kind: "linear_load"
      incrementKg: number
      incrementLb: number
      deloadAfterFails: number // consecutive failed sessions → deload
      deloadPct: number // fraction to drop on deload (e.g. 0.10)
      /**
       * The smaller jump used AFTER the first deload, where the source says so.
       *
       * StrongLifts moves the deadlift 5 kg a workout "until 5 kg stops
       * working", then 2.5; Starting Strength halves the press and bench jump
       * at the first stall. Absent means one increment forever, which is what
       * every other lift here does.
       */
      stallIncrementKg?: number
      stallIncrementLb?: number
      /**
       * Which way progress goes.
       *
       * "up" (absent) is every barbell lift: more weight is harder. "down" is
       * assistance — a band or a machine taking weight OFF you — where getting
       * stronger means needing LESS of it. Without this an assisted pull-up
       * ratchets its assistance upward forever, which is the opposite of
       * training.
       */
      direction?: "up" | "down"
    }
  | {
      kind: "percentage_tm"
      tmIncrementKg: number // training-max bump per completed cycle
      tmIncrementLb: number
      missTmReductionPct?: number // if top-set AMRAP missed prescribed reps, cut TM next cycle
    }
  | {
      kind: "double_progression"
      // Hit the top of the rep range on ALL sets → add weight (reps reset to bottom).
      // Otherwise hold the weight and chase more reps next session.
      incrementKg: number
      incrementLb: number
      deloadAfterFails?: number // sessions below repMin before a deload (optional)
      deloadPct?: number
    }

export interface LoadExercise {
  id: string
  name: string // canonical name; matches workout_sets.exercise for the bridge
  metricType: "load"
  scheme: LoadScheme
  progression: LoadProgressionRule
  /**
   * Lifts sharing a group id are a superset — done alternating, one after the
   * other, rather than straight through.
   *
   * A FLAT TAG, NOT NESTING. Nesting supersets inside the day would change the
   * shape every consumer walks (the engine, the prescription, the log, the
   * workout_sets bridge) to express something that is really just "these belong
   * together". As a tag it is invisible to all of them: each lift is still
   * prescribed, logged and progressed on its own rule, which is what a superset
   * actually is — two exercises interleaved, not one merged exercise.
   */
  supersetGroup?: string
  /**
   * Drops taken off the LAST set: strip weight, go again, without racking.
   *
   * A MODIFIER, NOT A SCHEME, for the same reason a superset is a tag. "3×8
   * with two drops" is still three sets of eight as far as prescription,
   * logging and progression are concerned — the drops are extra work done at
   * the end of the last one, at whatever weight is left, to failure. Encoding
   * them as sets would make the engine think the working weight fell and deload
   * a lift that is going fine.
   *
   * So nothing in `applyLog` reads this. It rides through to the session so the
   * person doing it on Tuesday is told, and no further.
   */
  dropSets?: number
  /** Free text under the lift — tempo, cues, "left side first". */
  note?: string
  /**
   * Rest after a set of this lift, in seconds — the AUTHOR'S number when the
   * source gives one, or the user's when they set it on the live screen.
   *
   * Absent means we choose (compound vs accessory), and the screen says the
   * number is ours rather than the program's.
   */
  restSec?: number
  /** What the logged number means. Absent = reps. */
  repUnit?: "reps" | "sec"
  /**
   * Done one limb at a time, so the prescription is per side.
   *
   * A lunge written "3×8" is ambiguous: eight each leg, or four each? The flag
   * makes the session say "each side" and stops volume being double-counted.
   */
  perSide?: boolean
  /**
   * How the weight is loaded, which decides what a *loadable* weight is.
   *
   * A barbell cannot go below the bar, so a barbell lift rounds up to it. A
   * dumbbell lateral raise, a cable pushdown and a bodyweight push-up have no
   * such floor, and forcing them to 20 kg turns a 6 kg raise into a 20 kg one.
   *
   * ABSENT MEANS BARBELL, so every catalog program keeps the exact rounding it
   * had before this field existed — it is the lifts a user adds themselves,
   * which are far more often accessories, that need the other answer.
   */
  loadStyle?: "barbell" | "free" | "bodyweight"
}

// ============================================================================
// ENDURANCE metric type — block/interval sessions, week-indexed (cardio)
// ============================================================================

export type EnduranceBlockKind = "warmup" | "jog" | "walk" | "run" | "steady" | "cooldown" | "recover" | "swim" | "bike"

export interface EnduranceBlock {
  kind: EnduranceBlockKind
  label: string
  durationSec?: number
  distanceKm?: number
  note?: string
}

export interface EnduranceSet {
  repeat: number // 1 = no repeat; N = repeat the block sequence N times (intervals)
  blocks: EnduranceBlock[]
}

export interface EnduranceSession {
  id: string
  label: string
  sets: EnduranceSet[]
}

export interface EnduranceWeek {
  label?: string
  sessions: EnduranceSession[]
}

// ============================================================================
// SKILL-TIER metric type — progression ladders (calisthenics)
// ============================================================================

export interface SkillTier {
  id: string
  name: string // the variation, e.g. "Full push-up", "Diamond push-up"
  sets: number
  unlockReps: number // hit this on all sets → unlock the next tier
  /**
   * What the session actually ASKS FOR, which is not the unlock threshold.
   *
   * The prescription used to be seeded with `unlockReps`, so pressing "I did
   * this" always cleared the bar and promoted you to the next variation on
   * every single session. The routine this cites works in a 5–8 range and
   * moves on at 8; the ask is the bottom of that range and the unlock is the
   * top. Absent falls back to `unlockReps` for any tier not yet given one.
   */
  workReps?: number
}

export interface SkillExercise {
  id: string
  name: string // the movement pattern, e.g. "Push-up progression"
  metricType: "skill_tier"
  tiers: SkillTier[] // ordered easy → hard
  /**
   * Lifts sharing a group id are done alternating. Same flat tag, same reason
   * as `LoadExercise.supersetGroup` — the routine this catalogue cites is built
   * out of push/pull pairs, and drawing them as six separate blocks loses the
   * one structural idea it has.
   */
  supersetGroup?: string
  /** Rest after a set, in seconds, where the routine specifies one. */
  restSec?: number
}

export interface SkillDay {
  id: string
  label: string
  exercises: SkillExercise[]
}

// ============================================================================
// HOLD/RANGE metric type — timed holds / ROM (flexibility, mobility)
// ============================================================================

export interface HoldExercise {
  id: string
  name: string
  metricType: "hold_range"
  sets: number
  startSec: number // starting hold duration
  targetSec: number // goal hold duration
  incrementSec: number // added each time you meet the current hold on all sets
  perSide?: boolean // hold note ("each side")
}

export interface HoldDay {
  id: string
  label: string
  exercises: HoldExercise[]
}

/**
 * What your gym can actually load.
 *
 * The engine used to assume one bar (20 kg / 45 lb) and one smallest plate
 * (1.25 kg / 2.5 lb) for everybody. Two people it was wrong for: anyone whose
 * gym has no plate under 2.5 kg, who could never be prescribed 62.5 and so
 * could never progress a 2.5 kg program; and anyone who presses less than the
 * empty bar, who was silently rounded up to it and then "deloaded" back to it
 * forever. Both are ordinary, and both were unrepresentable.
 *
 * Numbers are in the DISPLAY unit, converted once at the database boundary.
 */
export interface PlateSetup {
  /** The empty bar. */
  barWeight: number
  /** The smallest plate you own; two of them make one step on the bar. */
  smallestPlate: number
}

// ============================================================================
// Program structure
// ============================================================================

export interface DayTemplate {
  id: string // "A" / "B" / "ohp-day"
  label: string
  exercises: LoadExercise[] // M1: load only
  /**
   * The day of the week this session is done on. 1 = Monday … 7 = Sunday.
   *
   * ABSENT MEANS "IN ORDER, WHENEVER" — which is how every cited program in the
   * catalog works and must keep working: StrongLifts is three sessions a week
   * alternating A/B/A, and pinning those to weekdays would be inventing a rule
   * its source does not have. A program somebody writes themselves usually DOES
   * have weekdays ("Push is Monday"), so the field is theirs to set.
   *
   * When every day carries one, the next session is chosen by today's date
   * rather than by the cursor. When none do, the cursor walks the list as
   * before. Those are the only two states; a half-assigned week is refused at
   * the point of editing rather than resolved by guessing.
   */
  weekday?: number
}


/**
 * Scheduling shape (hybrid model — load is log-driven sequential).
 * - linear_rotation: alternate through `days` one session at a time.
 * - weekly_waved: `days` (the split) repeat each week; the week index selects
 *   the percentage row for percentage_tm exercises.
 */
export type ProgramSchedule =
  | { kind: "linear_rotation"; days: DayTemplate[] }
  | { kind: "weekly_waved"; weeks: number; days: DayTemplate[] }
  | { kind: "endurance_weeks"; weeks: EnduranceWeek[] }
  | { kind: "skill_routine"; days: SkillDay[] }
  | { kind: "hold_routine"; days: HoldDay[] }

export interface LevelSeed {
  id: LevelId
  label: string
  /** linear programs: starting working weight per exercise id, in kg. */
  seedWorkingWeightKg?: Record<string, number>
  /** percentage programs: TM is derived from a user 1RM (asked at enroll). */
  requires1RM?: boolean
  /** level routes to a different program entirely (Layer-1 calibration). */
  structuralVariantOf?: string
}

export interface ProgramDefinition {
  id: string
  discipline: Discipline
  metricType: MetricType
  name: string
  blurb: string
  sourceCitation: string // authoritative origin, cited at encode time
  popularityRank: number // lower = more popular
  levels: LevelSeed[]
  schedule: ProgramSchedule
}

// ============================================================================
// Enrollment + progression state
// ============================================================================

/** What a logged lift did, measured against what it asked for. */
export type LoadVerdict =
  /** Every prescribed set, at the prescribed weight or better. */
  | "advance"
  /** Every rep, but not at the weight asked for. Hold; do not count a fail. */
  | "hold_lighter"
  /** Reps missed at the prescribed weight. This is the only thing that fails. */
  | "fail"

export interface LoadJudgement {
  verdict: LoadVerdict
  /**
   * The heaviest weight at which ALL prescribed sets were completed.
   *
   * Not the heaviest single set: four sets at 80 and one at 85 is a session at
   * 80 with one heavy single on the end, and the program's answer is 82.5, not
   * 87.5. Reversed for assistance lifts, where less is more.
   */
  achieved: number
}

export interface ExerciseState {
  // linear_load / double_progression:
  workingWeight?: number // in enrollment unitSystem
  consecutiveFails?: number
  /**
   * Whether this lift has ever stalled hard enough to be deloaded.
   *
   * StrongLifts moves the deadlift 5 kg a workout "until 5 kg stops working",
   * then 2.5; Starting Strength halves the press and bench jump at the first
   * stall. Both need to know that the first stall has happened, and nothing
   * else in the state records it — `consecutiveFails` resets on every deload.
   */
  stalled?: boolean
  // percentage_tm:
  trainingMax?: number // in enrollment unitSystem
  /**
   * The AMRAP top set was missed somewhere in this cycle.
   *
   * Wendler checks the "+" set every week and cuts the training max if it is
   * missed; the engine only ever looked in week 3, so a blown week-1 or week-2
   * top set raised the max as if it had gone fine. And the max used to move at
   * the end of week 3, which meant week 4 — the DELOAD — was computed off the
   * already-bumped number. Remembering the miss lets the judgement happen every
   * week and the change happen once, when the cycle is actually over.
   */
  missedTopSet?: boolean
  // skill_tier:
  tierIndex?: number // current variation (0-based)
  // hold_range:
  currentHoldSec?: number
}

/**
 * One dated weight in a series — the shape every progress line is drawn from.
 *
 * Declared once because two things produce it: `summariseProgression` (one
 * program's session logs) and `liftHistory` (one lift across every program).
 * Two shapes would mean two adapters inside `Sparkline`, which is how a second
 * chart component gets written by accident.
 */
export interface LoadPoint {
  /** ISO instant of the session. */
  at: string
  /** The working weight — the heaviest set of that session. */
  weight: number
}

export interface EnrollmentCursor {
  cycle: number // 1-based count of completed cycles
  week: number // 1-based (linear programs: always 1)
  dayIndex: number // index into schedule.days for the UPCOMING session
  sessionCount: number // total completed sessions
}

/**
 * Something that changed an enrollment's state and was NOT a logged workout.
 *
 * THE REPLAY USED TO FORGET THESE. Rebuilding the weights means folding history
 * over the seed, and only sessions were in that history — so deleting one
 * session re-prescribed every session you had skipped and undid a reset you had
 * asked for. A skip advances the plan without logging anything; a reset rewinds
 * the cursor and deliberately keeps the weights; a manual weight change is the
 * lifter overruling the engine. All three are facts about the past and all
 * three have to survive a correction.
 */
export type ReplayEvent =
  | { at: string; kind: "skip" }
  | { at: string; kind: "reset"; cursor: true; weights: false }
  | { at: string; kind: "weight"; exerciseId: string; to: number }

export interface ProgramEnrollment {
  id: string
  user_id: string
  program_id: string
  level: LevelId
  unitSystem: UnitSystem
  exerciseState: Record<string, ExerciseState> // keyed by exercise id
  cursor: EnrollmentCursor
  is_active: boolean
  started_at: string
  /**
   * The user's own version of the schedule, or null to follow the catalog.
   *
   * COPY-ON-WRITE, not a diff. Null until the first edit, so an untouched
   * enrollment keeps picking up catalog corrections; the first edit snapshots
   * the whole resolved schedule and the user owns it from then on. A diff
   * against catalog ids would have to guess what a renamed or retired
   * exercise id meant on the next catalog change, and guessing quietly is
   * the failure mode this codebase does not allow.
   */
  customSchedule: ProgramSchedule | null
  /**
   * When a session was last logged against this enrollment, or null for never.
   *
   * THE FIELD THAT TELLS A PROGRAM FROM A GHOST. Enrollments only ever
   * deactivate within a discipline, and three separate flows create them, so a
   * pick from months ago keeps prescribing sessions forever. "Started in April"
   * does not distinguish a program somebody trains every week from one they
   * abandoned on the day they started it. "Never logged" does.
   *
   * Read-only, derived from `program_session_logs` — not a column, and never
   * written. A cached copy of a fact that lives elsewhere is the bug this whole
   * area already had once.
   */
  lastLoggedAt?: string | null
  /** How many sessions were logged on it. Read-only, derived, never stored. */
  sessionsLogged?: number
  /**
   * The state this enrollment STARTED from — what the person typed.
   *
   * THE REPLAY USED TO RE-SEED FROM THE CATALOGUE. Somebody who entered their
   * real 100 kg squat, trained to 125, and then deleted one mistyped session
   * had their next squat computed from the catalogue's beginner 60 — silently.
   * On a self-built program, or any program with no level seeds, there was
   * nothing to re-seed from at all and the delete errored after it had already
   * gone through. The seed is the enrollment's own history; it is stored once,
   * at enrolment, and never recomputed.
   */
  initialExerciseState?: Record<string, ExerciseState>
  /** Skips, resets and manual weight changes, in order. See `ReplayEvent`. */
  replayEvents?: ReplayEvent[]
  /**
   * The bar this program is trained on, when it is not the account default.
   *
   * Per enrollment rather than per account because one person legitimately
   * squats on a 20 kg bar and presses on a 15.
   */
  barWeightKg?: number | null
  /**
   * What this person's gym can load, in the enrollment's display unit.
   *
   * RESOLVED, NOT STORED: the repo builds it from the account's settings and
   * this enrollment's bar override on the way out of the database, so the
   * engine stays pure and every prescription it makes is a weight that can
   * actually be put on a bar. Absent falls back to the standard Olympic set,
   * which is what every enrollment had before the setting existed.
   */
  plates?: PlateSetup
  /** What the person calls it — the draft's name for a self-built week. */
  label?: string | null
}

// ============================================================================
// Engine output — today's prescription
// ============================================================================

export interface PrescribedSet {
  setNumber: number
  reps: number // target reps (bottom of range for rep_range)
  repRangeMax?: number // top of range for double-progression (display "min–max")
  amrap: boolean
  weight: number // display unit
  weightKg: number // for the workout_sets bridge
}

export interface PrescribedExercise {
  exerciseId: string
  name: string
  sets: PrescribedSet[]
  note?: string
  /** Set when this lift is part of a superset — same id = done alternating. */
  supersetGroup?: string
  /** Drops off the last set, if the author asked for them. Display only. */
  dropSets?: number
  bodyweight?: boolean // skill/hold: no external weight to show
  /** Done one limb at a time — the reps are per side, and so is the volume. */
  perSide?: boolean
  repUnit?: "reps" | "sec" // what the logged number means (default reps)
}

export interface SessionPrescription {
  programId: string
  dayId: string
  dayLabel: string
  cycle: number
  week: number
  /**
   * How many sessions have been completed on this enrollment.
   *
   * The header read "Cycle 76 · Week 1" after a year on StrongLifts, which is
   * engine bookkeeping leaking onto the screen: a linear program has no cycles
   * and its week never moves, so one number climbed to 76 while meaning nothing
   * beside another that never moved. This is the count a person recognises.
   */
  sessionCount: number
  /**
   * Whether this program is actually organised into cycles and weeks.
   *
   * A 5/3/1 wave and a couch-to-5k schedule are; StrongLifts is not — it is two
   * days alternating forever. The decision has to come from the SHAPE of the
   * program, not from whether the counter happens to have passed one.
   */
  periodised: boolean
  /**
   * The program is finished — every session in it has been logged.
   *
   * Distinct from `isFinalSession`, which means "this is the last one" and stays
   * true forever afterwards, because `advanceCursor` holds the cursor at the end
   * rather than running off it. So the app congratulated you on reaching the
   * last session and then offered you that same session for the rest of time,
   * with no way to say you were done. This is the flag that can tell the
   * difference between about-to-finish and finished.
   */
  isComplete?: boolean
  exercises: PrescribedExercise[] // load / strength / bodybuilding
  enduranceSets?: EnduranceSet[] // cardio: interval/steady blocks
  summary?: string // one-line human summary (e.g. "8×(jog 60s / walk 90s)")
  isFinalSession?: boolean // program graduated — no further sessions
  /**
   * True when the week says today is a rest day.
   *
   * The prescription still carries the NEXT session so the screen can show what
   * is coming, but it must not be presented as today's work — a 3-day week
   * whose rest days quietly prescribe the next session is a 7-day week.
   */
  restDay?: boolean
  /** The ISO weekday this session is pinned to, when the week is on a calendar. */
  scheduledWeekday?: number
  /**
   * What day it is where the PERSON is, 1 = Monday.
   *
   * Handed down so every surface agrees. The week strip used to work it out
   * from the phone's clock while the session was decided on the server's, so
   * the two could name different days on one screen.
   */
  todayWeekday?: number
}

// ============================================================================
// Session log — input to applyLog
// ============================================================================

export interface LoggedSet {
  setNumber: number
  reps: number // actual reps performed
  weight: number // actual weight, display unit
  /** Which limb, for a lift done one side at a time. */
  side?: "left" | "right"
}

export interface LoggedExercise {
  exerciseId: string
  sets: LoggedSet[]
  /**
   * You were there, and you deliberately did not do this one.
   *
   * Distinct from an absent entry only in intent, and both hold the weight —
   * but the session screen needs to be able to SAY "skipped" rather than
   * silently omitting a lift, so the history can show what happened instead of
   * a gap. A skipped lift never counts as a failure and never moves a weight.
   */
  skipped?: boolean
}

export interface ProgramSessionLogInput {
  enrollment_id: string
  dayId: string
  cycle: number
  week: number
  entries: LoggedExercise[] // load sessions; empty for endurance
  durationMin?: number // how long it actually took, in minutes
  intensity?: number // 1-5, how hard it actually was
  distanceKm?: number // endurance: distance covered, if tracked
  rpe?: number
  notes?: string
}

/** Per-exercise outcome of applying a log (UI feedback + audit). */
export interface ProgressionChange {
  exerciseId: string
  name: string
  kind: "advance" | "hold" | "deload" | "tm_increase" | "tm_reset" | "tier_up" | "hold_up"
  fromWeight?: number
  toWeight?: number
  reason: string
}

export interface ApplyLogResult {
  enrollment: ProgramEnrollment
  changes: ProgressionChange[]
}

// ============================================================================
// DB row shapes (src/db/programRepo.ts)
// ============================================================================

export interface ProgramEnrollmentRow {
  id: string
  user_id: string
  program_id: string
  level: LevelId
  unit_system: UnitSystem
  exercise_state: Record<string, ExerciseState>
  cursor: EnrollmentCursor
  is_active: boolean
  started_at: string
  created_at: string
  custom_schedule: ProgramSchedule | null
  initial_exercise_state: Record<string, ExerciseState> | null
  replay_events: ReplayEvent[] | null
  bar_weight_kg: number | null
  label: string | null
}

export interface ProgramSessionLogRow {
  id: string
  enrollment_id: string
  user_id: string
  day_id: string
  cycle: number
  week: number
  entries: LoggedExercise[]
  rpe: number | null
  notes: string | null
  logged_at: string
  created_at: string
}

/** Bundle returned by GET /api/programs/enrollments/[id]. */
export interface EnrollmentDetail {
  enrollment: ProgramEnrollment
  prescription: SessionPrescription
  logs: ProgramSessionLogRow[]
}

/**
 * A program choice made inside the goals plan builder. Carried in the plan
 * flow state and turned into an enrollment on save (idempotently). Matches the
 * enrollInProgram input shape.
 */
export interface ProgramSelection {
  programId: string
  level: LevelId
  unitSystem: UnitSystem
  oneRepMaxes?: Record<string, number>
  workingWeights?: Record<string, number>
  /** The user's edited schedule, if they changed anything. Null/absent = catalog. */
  customSchedule?: ProgramSchedule | null
}

/**
 * One movement in the swap/add pool.
 *
 * Editing a program means being able to put a different lift in a slot, and a
 * lift the engine has never seen needs the same three things every catalog
 * exercise has: how it is prescribed, how it progresses, and where somebody at
 * this level starts. `suggestedKg` is a starting point the editor shows and the
 * user confirms — it is never silently enrolled, because `seedEnrollment`
 * requires a working weight for every exercise and throws without one.
 */
export interface LibraryExercise {
  id: string
  name: string
  /** What it trains — the index for FINDING it. */
  group: BodyGroup
  /** What job it does — the index for SWAPPING it. */
  pattern: MovementPattern
  /** Compound lifts default to linear loading, accessories to double progression. */
  compound: boolean
  /**
   * Barbell-loaded, and therefore floored at the bar. Distinct from `compound`:
   * a dip is a compound movement with no bar under it.
   */
  barbell: boolean
  defaultSets: number
  defaultRepMin: number
  defaultRepMax: number
  suggestedKg: Record<LevelId, number>
  /**
   * Measured in seconds held, not reps done — a plank, a side plank, a carry.
   *
   * These were "3 × 1 rep" lifts on double progression, so hitting "one rep" on
   * all three sets added 2.5 kg to a plank, every session, for ever.
   */
  timed?: boolean
  /**
   * The weight is ASSISTANCE, so less of it is progress.
   *
   * An assisted pull-up machine takes weight off you. It was seeded heavier at
   * every level — beginner 25 kg, advanced 55 — which says an advanced lifter
   * needs more help, and then ratcheted the assistance upward every session.
   */
  assisted?: boolean
}

/**
 * How lifts are GROUPED FOR BROWSING, which is a different question from how
 * they are grouped for swapping.
 *
 * `MovementPattern` answers "what else could go in this slot" — it is why
 * swapping a Bench Press offers the other horizontal pushes. It is the wrong
 * index for finding a lift, and using it for both is why the Shoulders tab held
 * lateral raises but not the shoulder press (filed under Vertical push), and
 * why the Squat tab held the Leg Press.
 *
 * Nobody walks into a gym thinking "vertical push". They think "shoulders".
 */
export type BodyGroup =
  | "chest"
  | "back"
  | "shoulders"
  | "arms"
  | "quads"
  | "hamstrings_glutes"
  | "calves"
  | "core"

export type MovementPattern =
  | "squat"
  | "hinge"
  | "horizontal_push"
  | "vertical_push"
  | "horizontal_pull"
  | "vertical_pull"
  | "lunge"
  | "arms"
  | "shoulders"
  | "core"
  | "calves"
