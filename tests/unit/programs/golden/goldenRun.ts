/**
 * THE GOLDEN RUNS — what today's engine prescribes, written down before it is
 * rebuilt.
 *
 * Plans/program-builder.md, Phase 0.2. Each of the 13 built-in programs is run
 * through 30 sessions under a handful of scripted lifters (every rep, one miss,
 * three misses in a row, an all-out set that goes well and one that does not,
 * a session taken lighter, a lift skipped, and the same "every rep" in pounds).
 * Every prescription, every change the engine announces and the state it
 * leaves behind are kept as JSON under `tests/fixtures/programs/golden-v1/`.
 *
 * Those files are the equivalence target for the rebuilt engine (Phase 2). A
 * prescription that differs from them is a bug until the plan's Phase 2
 * evidence lists it and says why.
 *
 * THE ENGINE IS A PARAMETER. `runGolden` never imports an engine itself: it is
 * handed one through `GoldenEngine`, so the same scripted lifters can be run
 * against the old engine today and the new one later, and the two outputs are
 * compared field by field.
 */

import type {
  ExerciseState,
  EnrollmentCursor,
  LevelId,
  LoggedExercise,
  PrescribedSet,
  ProgramDefinition,
  ProgressionChange,
  SessionPrescription,
  UnitSystem,
} from "@/src/programs/types"

/** What a run needs from an engine. Opaque `E` is the engine's own enrollment. */
export interface GoldenEngine<E> {
  start(program: ProgramDefinition, level: LevelId, unit: UnitSystem, oneRepMaxes?: Record<string, number>): E
  prescribe(program: ProgramDefinition, enrollment: E): SessionPrescription
  log(
    program: ProgramDefinition,
    enrollment: E,
    log: { dayId: string; cycle: number; week: number; entries: LoggedExercise[] }
  ): { enrollment: E; changes: ProgressionChange[] }
  state(enrollment: E): { exerciseState: Record<string, ExerciseState>; cursor: EnrollmentCursor }
  /** Rebuild the enrollment from its seed and every logged session, in order. */
  replay(
    program: ProgramDefinition,
    seed: E,
    logs: { entries: LoggedExercise[]; logged_at: string; dayId: string; cycle: number; week: number }[]
  ): E
}

/** One scripted lifter. `appearance` counts how many times this lift has come up before, from 0. */
export interface Lifter {
  id: string
  unit: UnitSystem
  /** Reps and weight for one prescribed set, or null to leave the whole lift out. */
  set(input: {
    set: PrescribedSet
    isLast: boolean
    appearance: number
    bodyweight: boolean
  }): { reps: number; weight: number } | "skip-lift"
}

const target = (s: PrescribedSet) => s.repRangeMax ?? s.reps

/** Every rep, at the weight asked for — the top of a range, the floor of a "+". */
const hitSet = (s: PrescribedSet) => ({ reps: target(s), weight: s.weight })

/** The last set of a lift one rep short of the bottom of what was asked. */
const missLast = (s: PrescribedSet, isLast: boolean) =>
  isLast ? { reps: Math.max(0, s.reps - 1), weight: s.weight } : hitSet(s)

export const LIFTERS: Lifter[] = [
  { id: "hit", unit: "kg", set: ({ set }) => hitSet(set) },
  {
    id: "miss-once",
    unit: "kg",
    set: ({ set, isLast, appearance }) => (appearance === 2 ? missLast(set, isLast) : hitSet(set)),
  },
  {
    id: "miss-thrice",
    unit: "kg",
    set: ({ set, isLast, appearance }) =>
      appearance >= 2 && appearance <= 4 ? missLast(set, isLast) : hitSet(set),
  },
  {
    id: "amrap-high",
    unit: "kg",
    set: ({ set }) => (set.amrap ? { reps: set.reps + 5, weight: set.weight } : hitSet(set)),
  },
  {
    id: "amrap-low",
    unit: "kg",
    set: ({ set }) => (set.amrap ? { reps: Math.max(0, set.reps - 2), weight: set.weight } : hitSet(set)),
  },
  {
    id: "lighter-once",
    unit: "kg",
    // Every rep, 10% under the weight asked for: a choice, not a miss.
    set: ({ set, appearance, bodyweight }) =>
      appearance === 3 && !bodyweight
        ? { reps: target(set), weight: Math.round(set.weight * 0.9 * 100) / 100 }
        : hitSet(set),
  },
  {
    id: "skip-once",
    unit: "kg",
    set: ({ set, appearance }) => (appearance === 1 ? "skip-lift" : hitSet(set)),
  },
  { id: "hit-lb", unit: "lb", set: ({ set }) => hitSet(set) },
]

/** Endurance plans have nothing to vary: one lifter is the whole story. */
export function liftersFor(program: ProgramDefinition): Lifter[] {
  return program.metricType === "endurance" ? LIFTERS.filter((l) => l.id === "hit") : LIFTERS
}

/** The level a run starts at: the first one that is not a route to another program. */
export function goldenLevel(program: ProgramDefinition): LevelId {
  const level = program.levels.find((l) => !l.structuralVariantOf)
  if (!level) throw new Error(`${program.id} has no level of its own`)
  return level.id
}

/** 5/3/1 asks for maxes; these are an ordinary intermediate's, in the run's unit. */
export function goldenMaxes(program: ProgramDefinition, unit: UnitSystem): Record<string, number> | undefined {
  if (program.id !== "wendler-531") return undefined
  return unit === "kg"
    ? { ohp: 60, deadlift: 180, bench: 100, squat: 140 }
    : { ohp: 135, deadlift: 405, bench: 225, squat: 315 }
}

export const SESSIONS = 30

/** A set as the golden file keeps it: reps, top of range, all-out, weight, kg. */
type GoldenSet = [number, number | null, 0 | 1, number, number]

export interface GoldenSession {
  n: number
  day: string
  label: string
  cycle: number
  week: number
  count: number
  periodised: boolean
  complete?: boolean
  final?: boolean
  summary?: string
  ex: Array<{
    id: string
    name: string
    note?: string
    group?: string
    rest?: number
    perSide?: true
    repUnit?: string
    bodyweight?: true
    drops?: number
    sets: GoldenSet[]
  }>
  changes: Array<{ id: string; kind: string; from?: number; to?: number; reason: string }>
  /** Only the lifts whose state this session changed, to keep the files readable. */
  state: Record<string, ExerciseState>
  cursor: EnrollmentCursor
}

export interface GoldenRun {
  lifter: string
  level: LevelId
  unit: UnitSystem
  maxes?: Record<string, number>
  /** The state the run started from. */
  seed: Record<string, ExerciseState>
  /** Set when every session matched another lifter's run exactly; `sessions` is then empty. */
  sameAs?: string
  sessions: GoldenSession[]
  /** The state a full replay of the run's history rebuilds — must equal `final`. */
  replayed: { state: Record<string, ExerciseState>; cursor: EnrollmentCursor }
  /** The state after the last session, whole. */
  final: { state: Record<string, ExerciseState>; cursor: EnrollmentCursor }
}

export interface GoldenFile {
  program: string
  sessions: number
  runs: GoldenRun[]
}

/** A day per session, from a fixed Monday, so a replay orders them the same way every time. */
const loggedAt = (n: number) => new Date(Date.UTC(2026, 0, 5 + n, 17, 0, 0)).toISOString()

/** Drops keys whose value is undefined, so the JSON is the same however a field was left out. */
function clean<T extends object>(o: T): T {
  return JSON.parse(JSON.stringify(o)) as T
}

export function runGolden<E>(engine: GoldenEngine<E>, program: ProgramDefinition): GoldenFile {
  const runs: GoldenRun[] = []
  for (const lifter of liftersFor(program)) {
    const level = goldenLevel(program)
    const maxes = goldenMaxes(program, lifter.unit)
    const seed = engine.start(program, level, lifter.unit, maxes)
    let enrollment = seed
    let before = engine.state(seed).exerciseState
    const seen = new Map<string, number>()
    const history: { entries: LoggedExercise[]; logged_at: string; dayId: string; cycle: number; week: number }[] = []
    const sessions: GoldenSession[] = []

    for (let n = 0; n < SESSIONS; n++) {
      const p = engine.prescribe(program, enrollment)
      const entries: LoggedExercise[] = []
      for (const ex of p.exercises) {
        const appearance = seen.get(ex.exerciseId) ?? 0
        seen.set(ex.exerciseId, appearance + 1)
        const sets: LoggedExercise["sets"] = []
        let skipped = false
        ex.sets.forEach((set, i) => {
          const done = lifter.set({ set, isLast: i === ex.sets.length - 1, appearance, bodyweight: Boolean(ex.bodyweight) })
          if (done === "skip-lift") skipped = true
          else sets.push({ setNumber: set.setNumber, reps: done.reps, weight: done.weight })
        })
        entries.push(skipped ? { exerciseId: ex.exerciseId, sets: [], skipped: true } : { exerciseId: ex.exerciseId, sets })
      }
      const logInput = { dayId: p.dayId, cycle: p.cycle, week: p.week, entries }
      const { enrollment: next, changes } = engine.log(program, enrollment, logInput)
      enrollment = next
      history.push({ ...logInput, logged_at: loggedAt(n) })
      const { exerciseState, cursor } = engine.state(enrollment)
      const changed = Object.fromEntries(
        Object.entries(exerciseState).filter(([id, st]) => JSON.stringify(st) !== JSON.stringify(before[id]))
      )
      before = exerciseState

      sessions.push(
        clean({
          n,
          day: p.dayId,
          label: p.dayLabel,
          cycle: p.cycle,
          week: p.week,
          count: p.sessionCount,
          periodised: p.periodised,
          complete: p.isComplete || undefined,
          final: p.isFinalSession || undefined,
          summary: p.summary,
          ex: p.exercises.map((ex) => ({
            id: ex.exerciseId,
            name: ex.name,
            note: ex.note,
            group: ex.supersetGroup,
            rest: ex.restSec,
            perSide: ex.perSide || undefined,
            repUnit: ex.repUnit,
            bodyweight: ex.bodyweight || undefined,
            drops: ex.dropSets,
            sets: ex.sets.map(
              (s): GoldenSet => [s.reps, s.repRangeMax ?? null, s.amrap ? 1 : 0, s.weight, s.weightKg]
            ),
          })),
          changes: changes.map((c) => ({
            id: c.exerciseId,
            kind: c.kind,
            from: c.fromWeight,
            to: c.toWeight,
            reason: c.reason,
          })),
          state: changed,
          cursor,
        })
      )
    }

    const replayed = engine.state(engine.replay(program, seed, history))
    const twin = runs.find(
      (r) => !r.sameAs && r.unit === lifter.unit && JSON.stringify(r.sessions) === JSON.stringify(clean(sessions))
    )
    runs.push(
      clean({
        lifter: lifter.id,
        level,
        unit: lifter.unit,
        maxes,
        seed: engine.state(seed).exerciseState,
        sameAs: twin?.lifter,
        sessions: twin ? [] : sessions,
        replayed: { state: replayed.exerciseState, cursor: replayed.cursor },
        final: { state: before, cursor: engine.state(enrollment).cursor },
      })
    )
  }
  return { program: program.id, sessions: SESSIONS, runs }
}
