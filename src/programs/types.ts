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
  /**
   * WHAT ACTUALLY FELL SHORT, so the app can say it rather than guess.
   *
   * The summary used to answer every shortfall with "Missed reps", including a
   * session where somebody did one perfect set of five and then had to leave —
   * they missed no reps at all, they did fewer sets. `undefined` when nothing
   * fell short.
   */
  shortfall?: "sets" | "reps" | "both"
  /** Sets actually logged, against `prescribed.sets`. */
  setsDone: number
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
 *
 * AND SO IS THE SHAPE OF THE WEEK. A program you edit after starting it — a day
 * added, a lift dropped, a whole self-built week — used to leave no record of
 * what it looked like before, so replaying an old session ran it against
 * TODAY's week. A session logged on a day that has since been removed then fell
 * through to whatever the cursor happened to say and the replay threw, taking
 * the delete down with it. A `schedule` event says "from this moment the week
 * was this", and `seeded` carries the starting weights of the lifts that edit
 * introduced, which were previously written into the live state and nowhere
 * else. `schedule: null` means "back to the catalogue's own week".
 */
export type ReplayEvent =
  | { at: string; kind: "skip" }
  | { at: string; kind: "reset"; cursor: true; weights: false }
  | { at: string; kind: "weight"; exerciseId: string; to: number }
  | {
      at: string
      kind: "schedule"
      schedule: ProgramSchedule | null
      seeded: Record<string, ExerciseState>
    }

/**
 * WHICH SCREEN YOU ARE ON — read from the address bar, not from React state.
 *
 * The tab and the view were `useState`, so nothing could link to a tab, to a
 * program or to the catalogue, and Back always landed on the inventory
 * whatever you had been looking at. Everything here comes from the URL, which
 * means the server can resolve it for the first paint and a link can carry it.
 */
export interface ProgramsLocation {
  tab: "today" | "history" | "progress"
  view: "today" | "programs" | "detail" | "edit"
  /** A RUNNING enrollment's id, or null — see `notice`. */
  programId: string | null
  /** A catalogue program, for `view=detail`. */
  catalogId: string | null
  /** An enrollment being edited, for `view=edit`. */
  enrollmentId: string | null
  /** Where Back goes, already checked for open-redirect tricks. */
  from: string | null
  /** Something the URL asked for that is no longer true, said in one line. */
  notice: string | null
}

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
   * The same two facts as dates on the ACCOUNT's calendar, `YYYY-MM-DD`.
   *
   * Beside the instants rather than instead of them: an instant is the truth,
   * but every screen that PRINTS one was doing `new Date(x).toLocaleDateString()`
   * — the browser's zone — so "started 3 Feb" could read as 2 Feb for somebody
   * travelling. A date-only string has no zone left to get wrong.
   */
  startedOn?: string
  lastLoggedOn?: string | null
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
  /**
   * An empty weight box is honest on this lift — a pull-up, a dip, a plank.
   * Distinct from `bodyweight`, which HIDES the box: a weighted pull-up is a
   * real thing, so the box stays and blank means "nothing added".
   */
  unweightedOk?: boolean
  /** Done one limb at a time — the reps are per side, and so is the volume. */
  perSide?: boolean
  repUnit?: "reps" | "sec" // what the logged number means (default reps)
  /**
   * The rest the PROGRAM'S AUTHOR asked for, in seconds.
   *
   * It exists on the catalogue's exercise and was dropped on the way to the
   * screen, so a program that specifies three minutes had its instruction
   * thrown away and our own guess shown in its place — labelled "our
   * suggestion", which was at least honest about being the wrong number.
   */
  restSec?: number
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
  /**
   * Whether anybody has ever told the app what timezone this account is in.
   *
   * False means `timezone` is still the signup default of UTC — which is not
   * a zone somebody chose, it is the app never having asked. Screens that file
   * something by date say so rather than presenting a guess as a fact.
   *
   * One owner: `settingsRepo.getUserClock`. It rides on the prescription
   * because every screen that shows a day already has one, and a screen
   * deciding for itself whether UTC is a real answer is how the fact drifts.
   */
  clockKnown?: boolean
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
// A workout that is happening right now
// ============================================================================

/**
 * One set, as it stands during the workout.
 *
 * It exists in the database the moment it is ticked. Every set used to live in
 * the open browser tab until one final save, so a dead phone lost the lot.
 */
export interface LiveWorkoutSet {
  id: string
  /** The program's own id for the lift; null for a workout off any program. */
  exerciseId: string | null
  exercise: string
  /**
   * THE NUMBER THE LIFTER SEES AND TYPES, in `LiveWorkout.unit`.
   *
   * The database stores kilograms and this used to be handed to the screen raw,
   * beside a label reading "lb" — so a 135 lb bench came back as "61.23 lb", and
   * re-ticking that set wrote 61 lb to the database. Everything the live screen
   * renders or sends uses this; `weightKg` is for the engine and the totals.
   */
  weight: number
  /** The same set in kilograms, which is what is stored and what totals use. */
  weightKg: number
  reps: number
  setNumber: number
  kind: "warmup" | "working" | "amrap" | "backoff" | "drop"
  /** Which prescribed set this answers; null if it was added on the day. */
  prescribedIndex: number | null
  completedAt: string | null
  rpe: number | null
  side: "left" | "right" | null
}

export interface LiveWorkout {
  id: string
  startedAt: string
  enrollmentId: string | null
  dayId: string | null
  cycle: number | null
  week: number | null
  adjustments: WorkoutAdjustments
  notes: string | null
  rpe: number | null
  /** The unit this workout is entered and shown in. Never guessed by a screen. */
  unit: UnitSystem
  sets: LiveWorkoutSet[]
}

/** What changed during a workout that the sets alone cannot say. */
/**
 * WHAT A MISS COSTS ON ONE LIFT.
 *
 * The finish sheet said "these count as misses and will bring the weight
 * down" over every short lift — false two times in three on StrongLifts,
 * whose rule is three consecutive misses before a deload. Both numbers come
 * from the program and the enrollment so the sentence and the engine cannot
 * disagree.
 */
export interface MissRule {
  /** Misses already on this lift, before today. */
  failsSoFar: number
  /** How many in a row the program allows before it drops the weight. */
  deloadAfter: number | null
  /** How much it drops, as a fraction. Null when the program has no rule. */
  deloadPct: number | null
}

/** `unknown` when the program has no linear rule; `held` when it is not a miss. */
export type MissOutcome = "hold" | "deload" | "unknown" | "held"

export interface WorkoutAdjustments {
  skipped?: string[]
  incomplete?: string[]
  swapped?: Record<string, { name: string; libraryId?: string }>
  added?: Array<{ exerciseId: string; name: string; libraryId?: string }>
  order?: string[]
  /**
   * Rest you changed, per lift, in seconds.
   *
   * ON THE WORKOUT, not in component state, because the rest clock's whole job
   * is to be right after you have put the phone down — and a phone that locks
   * and reloads the page would otherwise hand back the number you had just
   * rejected.
   */
  rest?: Record<string, number>
}

/** A stored set, as the one workouts table holds it. */
export interface StoredSet {
  exercise: string
  exercise_id: string | null
  weight_kg: number
  reps: number
  set_number: number
  set_kind: string
  side?: string | null
}

/** What the finish screen says you just did. */
export interface WorkoutSummary {
  workoutId: string
  /**
   * When it started, as an instant.
   *
   * The finish sheet never needed it — you had just done the workout. A
   * receipt opened days later has no other way to say which day it is
   * describing, and "today's workout" stops being today tomorrow.
   */
  startedAt?: string
  durationMin: number
  sets: number
  volumeKg: number
  /** The same total in the lifter's own unit, so the summary is not half in kg. */
  volume: number
  unit: UnitSystem
  /**
   * The history could not be read, so no claim is made either way. Without this
   * a failed read looked exactly like "you beat nothing today".
   */
  recordsUnavailable?: boolean
  personalRecords: Array<{
    exercise: string
    weight_kg: number
    /** The record in the lifter's unit — what the summary actually prints. */
    weight: number
    reps: number
    date: string
    isNew: boolean
  }>
  /**
   * Lifts with no history at all, so there was nothing to beat.
   *
   * A FIRST IS NOT A RECORD. With no history every set was announced as a
   * personal best — the very first set an account ever logged came back as
   * "New best", which is meaningless. These are named as firsts instead, which
   * is both true and still worth seeing.
   */
  firstTimeLifts: string[]
  changes: ProgressionChange[]
  /**
   * What the program will do next time was not KEPT for this workout — not
   * "nothing changed". True for every workout finished before the receipt was
   * stored on the row (2026-09-17).
   */
  changesUnavailable?: true
  /**
   * The workout was saved, but its totals could not be read back — the one case
   * where a lost reply is confirmed as having landed and nothing more is known.
   * Every number on the sheet then shows "—" rather than 0.
   */
  unavailable?: true
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
  /**
   * This week as the ACCOUNT's calendar sees it — computed on the server, in
   * the account's zone, and handed down so the strip and the session card
   * cannot name different days. See `weekSoFar`.
   */
  week: WeekSoFar
}

/**
 * THIS WEEK, ON THE ACCOUNT'S CALENDAR.
 *
 * Four things on the training screens used to answer "what day is it" and
 * three of them asked the phone. A 23:45 Monday session in Copenhagen is
 * Tuesday in UTC, so the strip lit the wrong dot, the card offered the wrong
 * session, and "trained today" was false on the day you trained.
 *
 * Every field here is decided on the server, in one place, and carried down.
 * `weekStartedOn` and the weekday numbers are ISO: Monday is 1.
 */
export interface WeekSoFar {
  /** The zone every field below was computed in, so a reader can say which. */
  timezone: string
  /** Monday of this week, `YYYY-MM-DD` — a string with no zone to get wrong. */
  weekStartedOn: string
  todayWeekday: number
  trainedWeekdays: number[]
  /** Whether one of those is today. Derived here so nobody derives it twice. */
  trainedToday: boolean
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
   * Can be done with nothing added — a pull-up, a dip, a push-up, a plank.
   *
   * DERIVED FROM `suggestedKg.beginner === 0` in `make()`, never typed out, so
   * the flag and the seed cannot disagree. It decides what an empty weight box
   * means: on these it means "just me", and saves as 0; on everything else it
   * means the number was not typed, and the set is refused rather than stored
   * as a 0 kg bench press.
   */
  unweightedOk?: true
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

// ============================================================================
// What the screens read
//
// These three lived in `programsService.ts` — the engine — for months, and
// nothing noticed, because the architecture rule that keeps types in types.ts
// walked a list of slices that did not include `programs`. That list now does.
// ============================================================================

/** What one lift did over every session logged on a program. */
export interface LiftProgress {
  exerciseId: string
  name: string
  /** Heaviest working weight the first time it was logged. */
  first: number
  /** Heaviest working weight the last time it was logged. */
  latest: number
  /** Heaviest ever, which is not always the latest — a deload moves it down. */
  best: number
  sessions: number
  firstAt: string
  latestAt: string
  /**
   * The working weight at each session, oldest first — the SHAPE of the year.
   *
   * First and latest say where it started and where it is; they cannot say
   * whether it climbed steadily, stalled for four months, or came back from a
   * deload. That is the part somebody actually recognises as their training.
   *
   * Downsampled to at most `SPARK_POINTS`, evenly across the run and always
   * keeping the true first and last, so a three-year log renders the same size
   * as a three-week one and the endpoints still match the numbers beside it.
   */
  points: LoadPoint[]
}

/** What to hang on each side of the bar, heaviest first. */
export interface PlateLoad {
  /** Plates for ONE side, heaviest first. */
  perSide: number[]
  /** The weight this actually makes — equal to the target when exact. */
  achievable: number
  /** True when the plates cannot make the target exactly. */
  approximate: boolean
  /** True when the target is at or below the empty bar. */
  barOnly: boolean
}

/**
 * What the dashboard should say about training right now.
 *
 * FOUR STATES, AND THE ORDER MATTERS. A workout you are in the middle of beats
 * everything: somebody standing in a gym does not need to be told what today's
 * session is, they need the way back into it. A workout left open for hours is
 * a different thing again — it is almost certainly forgotten rather than
 * running, and offering "Resume · 431 min" is the app pretending not to notice.
 *
 * Pure, and formats nothing. Minutes and ids come out; how they are worded is
 * the card's business, and a pure function that returns a sentence cannot be
 * reused by anything that words it differently.
 */
/**
 * A second program, running alongside the one the card is about.
 *
 * Running two at once is a real state — a lifting program and a running plan —
 * and the card used to show the first in the list and say nothing about the
 * other, so half of somebody's training was invisible on the page that is
 * meant to be the door to it. `todayLabel` is null when that program rests
 * today.
 */
export interface AlsoRunning {
  enrollmentId: string
  name: string
  todayLabel: string | null
}

export type TrainingCardState =
  /** A workout happening right now. Beats everything: the way back in. */
  | {
      kind: "live"
      workoutId: string
      enrollmentId: string | null
      dayLabel: string | null
      startedAt: string
      setsTicked: number
      /** Null for a loose workout, which asked for nothing. */
      setsAsked: number | null
      also: AlsoRunning[]
    }
  /** Open for hours: almost certainly forgotten rather than running. */
  | {
      kind: "stale"
      workoutId: string
      enrollmentId: string | null
      dayLabel: string | null
      startedAt: string
      /**
       * The weekday it began, named where the PERSON is — "Mon", not a date.
       *
       * Carried rather than derived, because both cards print it and both used
       * to derive it from the browser: a workout started 23:30 Monday in
       * Copenhagen was offered as Tuesday's to a phone still on UTC.
       */
      startedOnWeekday: string
      setsTicked: number
      setsAsked: number | null
      also: AlsoRunning[]
    }
  /**
   * Today's session, not yet started.
   *
   * `dayId` travels with the label so the card cannot name one session and
   * start another: whoever renders this hands the id straight to Start.
   */
  | {
      kind: "today"
      enrollmentId: string
      dayId: string
      dayLabel: string
      /** The lifts BY NAME. "3 lifts" tells nobody whether to bring their belt. */
      lifts: string[]
      /** A run or a ride, described in words — it has no lifts to list. */
      endurance?: { blocks: string; minutes: number }
      /** What happened the last time this same day came round. */
      lastTime?: { loggedAt: string; setsDone: number; complete: boolean }
      also: AlsoRunning[]
    }
  /**
   * Nothing prescribed today — and what IS next, because "rest day" with no
   * way forward was a dead end on the one screen meant to be a door.
   */
  | {
      kind: "rest"
      enrollmentId: string
      nextDayId: string
      nextLabel: string
      nextWeekday?: number
      also: AlsoRunning[]
    }
  /**
   * Already trained today. The card used to say Start, which invites a second
   * workout on a day somebody has finished.
   */
  | {
      kind: "done"
      workoutId: string
      enrollmentId: string | null
      dayLabel: string | null
      durationMin: number | null
      sets: number | null
      next: { label: string; weekday?: number } | null
      also: AlsoRunning[]
    }
  /** Every session in the program has been logged. */
  | {
      kind: "finished"
      enrollmentId: string
      name: string
      sessions: number
      startedAt: string
      also: AlsoRunning[]
    }
  /** No program, nothing open. Still a card, because the door must be there. */
  | { kind: "none" }

/**
 * EVERYTHING THE TRACKING CARD NEEDS, READ ONCE, ON THE SERVER.
 *
 * The card used to chain three requests in the browser — the enrollment list,
 * then that enrollment's detail, then the live workout — so it arrived in
 * three instalments: it popped in late, and it flipped from Start to Resume in
 * front of you when the third answer landed.
 *
 * NOTHING HERE IS A FORMATTED STRING, and `recentlyFinished` is deliberately
 * the last 48 hours rather than "today": one pure function decides what today
 * contains, on the account's calendar, and it cannot do that if the server has
 * already decided for it.
 */
export interface TrainingDoorFacts {
  timezone: string
  /** `YYYY-MM-DD` on the ACCOUNT's calendar, never the server's or the phone's. */
  todayDate: string
  todayWeekday: number
  live: {
    id: string
    enrollmentId: string | null
    dayId: string | null
    dayLabel: string | null
    startedAt: string
    setsTicked: number
    setsAsked: number | null
  } | null
  programs: Array<{
    enrollment: ProgramEnrollment
    prescription: SessionPrescription
    next: { dayId: string; label: string; weekday?: number } | null
    lastTimeThisDay: { loggedAt: string; setsDone: number; complete: boolean } | null
  }>
  recentlyFinished: Array<{
    workoutId: string
    enrollmentId: string | null
    dayLabel: string | null
    loggedAt: string
    durationMin: number | null
    sets: number | null
  }>
}

/**
 * WHY A SET CANNOT BE TICKED YET — the field, and whether it is empty or
 * impossible.
 *
 * Two different refusals, and the row treats them differently: an empty box is
 * its own message (the placeholder already says "weight"), while a number the
 * database cannot hold needs the sentence, because 5000 looks like a perfectly
 * good answer until something names the ceiling.
 */
export interface SetEntryProblem {
  field: "weight" | "reps"
  reason: "missing" | "out-of-range"
}

/**
 * A set entry, read once: what is wrong with it, and the two numbers it sends.
 *
 * The conversion is part of the rule and not a separate step at the call site,
 * because the call site is where `Number("")` turned an empty weight box into a
 * set saved as 0 kg — indistinguishable, ever after, from a pull-up genuinely
 * done with nothing added.
 */
export interface SetEntry {
  problem: SetEntryProblem | null
  weight: number
  reps: number
}

/**
 * ONE LIFT, ONE SESSION, ITS SETS — in the unit the reader reads.
 *
 * The weights here have already been converted out of the stored kilograms,
 * because the last thing that happened to the old shape was a screen labelled
 * "lb" printing kilograms into a box. `kind` travels with the set: a warm-up
 * is not what you did last time, and only the caller knows whether it is
 * drawing a history list (which shows them) or the PREVIOUS column (which does
 * not).
 */
export interface LiftSessions {
  /** When the workout was logged, as stored — formatted in the account's zone. */
  at: string
  sets: Array<{
    weight: number
    reps: number
    setNumber: number
    kind: string
  }>
}

/**
 * ONE ROW OF ONE LIFT, on the screen you are standing in front of.
 *
 * A row is a SLOT — a kind, a number and a side — because that is what the
 * database's uniqueness rule is. The screen used to treat a row as a position
 * in a list and find its set by number alone, so a warm-up set 1 and a working
 * set 1 shared one row and fought over it.
 */
export interface LiftRow {
  /** The row's own identity: the slot it would write to if untouched. */
  slot: string
  kind: LiveWorkoutSet["kind"]
  setNumber: number
  side: "left" | "right" | null
  /** What the program asks for here. Null for a set nobody prescribed. */
  prescribed: PrescribedSet | null
  /** Which working set this is, for the PREVIOUS column. Null for warm-ups. */
  workingIndex: number | null
  /** The set already ticked into this slot. */
  done: LiveWorkoutSet | null
}
