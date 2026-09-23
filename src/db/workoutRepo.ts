/**
 * A workout that is happening right now.
 *
 * WHAT THIS REPLACES. Logging was a form you filled in after the gym: the whole
 * session lived in the open browser tab and one button at the end wrote it
 * down. A dead phone, a dropped tab or a mistaken back-swipe lost every set,
 * and nothing on any screen had been saved. This makes a workout a row from the
 * moment it starts, and every set a write as you tick it off.
 *
 * SEPARATE FROM `healthRepo`, which owns reading and writing workouts that are
 * already over (and is 775 lines). The split is by tense, not by table: this
 * file is the only thing that writes a workout with no end on it.
 *
 * WHY THE ENGINE IS CALLED HERE. It is pure and takes the program plus the
 * enrollment, both of which this file has. Finishing therefore computes the new
 * weights in TypeScript and hands them to `finish_program_workout`, which
 * applies them and closes the workout in one transaction — because the two used
 * to be separate writes, and a failure between them left the weights advanced
 * with no workout to replay from.
 */

import { createServerSupabaseClient } from "./supabase"
import { readAllRows } from "./paging"
import { DEFAULT_BAR_KG, DEFAULT_PLATE_KG, type TrainingSettings } from "@/src/programs/trainingSettings"
import {
  getEnrollmentById,
  programFor,
  plateSetupFor,
  replayedState,
  getSessionLogs,
  todaysSessionFor,
} from "./programRepo"
import { ProgramRefused } from "@/src/programs/errors"
import { personalBestBaseline } from "./healthRepo"
import { getUserTimezone } from "./settingsRepo"
import { toDateISO, toZonedDate } from "@/src/shared/dateUtils"
import { detectPersonalRecords, firstTimeLifts } from "@/src/health/healthService"
import {
  applyLog,
  computePrescription,
  entriesFromSets,
  isSessionOf,
  loadStyleOf,
  pickLastSets,
  setSlot,
  sessionTypeFor,
  toKg,
  fromKg,
} from "@/src/programs/programsService"
import { scheduleDays } from "@/src/programs/customize"
import type {
  LiftSessions,
  LiveWorkout,
  LiveWorkoutSet,
  ProgressionChange,
  StoredSet,
  UnitSystem,
  WorkoutAdjustments,
  WorkoutSummary,
} from "@/src/programs/types"
import type { WorkoutSetRow } from "@/src/health/types"
import { libraryByName } from "@/src/programs/data/exerciseLibrary"

const round2 = (n: number) => Math.round(n * 100) / 100

/**
 * A workout with its sets, as PostgREST nests them. Named because the read for
 * it is written out twice and an inline cast in the middle of a `.map()` chain
 * is where a missing column goes unnoticed.
 */
type WorkoutLogSetsRow = {
  logged_at: string
  workout_sets:
    | {
        exercise: string
        library_id: string | null
        weight_kg: number
        reps: number
        set_number: number
        set_kind: string
      }[]
    | null
}

/** Every column a live workout screen needs, plus its sets. */
const LIVE_SELECT = "*, workout_sets(*)"

/**
 * The receipt, as it is stored on the workout row.
 *
 * Both halves together, because "what you beat" and "what you did for the first
 * time" are answered by one read of your history and would disagree if they
 * were worked out separately at different moments.
 */
interface StoredRecords {
  records: WorkoutSummary["personalRecords"]
  firstTimeLifts: string[]
}

interface LiveRow {
  id: string
  user_id: string
  session_type: string
  started_at: string | null
  ended_at: string | null
  enrollment_id: string | null
  program_day_id: string | null
  program_cycle: number | null
  program_week: number | null
  adjustments: WorkoutAdjustments | null
  notes: string | null
  rpe: number | null
  client_key: string | null
  logged_at: string
  workout_sets: WorkoutSetRow[] | null
}

/**
 * A stored workout as the live screen needs it.
 *
 * `unit` is passed in rather than assumed, because the screen renders and
 * re-submits these numbers: handing it kilograms under a "lb" label is how a
 * 135 lb bench became a 61 lb one on the second tap.
 */
function toLive(row: LiveRow, unit: UnitSystem): LiveWorkout {
  return {
    id: row.id,
    startedAt: row.started_at!,
    enrollmentId: row.enrollment_id,
    dayId: row.program_day_id,
    cycle: row.program_cycle,
    week: row.program_week,
    adjustments: row.adjustments ?? {},
    notes: row.notes,
    rpe: row.rpe,
    unit,
    sets: (row.workout_sets ?? [])
      .map(
        (s): LiveWorkoutSet => ({
          id: s.id,
          exerciseId: s.exercise_id,
          exercise: s.exercise,
          weight: round2(fromKg(s.weight_kg, unit)),
          weightKg: s.weight_kg,
          reps: s.reps,
          setNumber: s.set_number,
          kind: s.set_kind,
          prescribedIndex: s.prescribed_index,
          completedAt: s.completed_at,
          rpe: s.rpe,
          side: s.side,
        })
      )
      .sort((a, b) => a.setNumber - b.setNumber),
  }
}

/**
 * A start the server will not do, with a sentence a person can read.
 *
 * A CLASS, NOT A STRING. Every refusal used to arrive as a raw Postgres
 * message — "duplicate key value violates unique constraint
 * uq_workout_logs_client_key" — printed verbatim on the card. The code says
 * what happened so the caller can act on it; the message is what the person
 * sees; `workout` carries the workout that is already open, so the one sensible
 * response ("go to it") needs no second request.
 */
export class StartRefused extends Error {
  readonly code:
    | "already_open"
    | "start_key_spent"
    | "no_program"
    | "unknown_day"
    /** A session dated after now, or before the program it belongs to began. */
    | "in_future"
    | "before_program"
  readonly status: 400 | 404 | 409
  readonly workout?: LiveWorkout

  constructor(
    code:
      | "already_open"
      | "start_key_spent"
      | "no_program"
      | "unknown_day"
      | "in_future"
      | "before_program",
    message: string,
    status: 400 | 404 | 409,
    workout?: LiveWorkout
  ) {
    super(message)
    this.name = "StartRefused"
    this.code = code
    this.status = status
    this.workout = workout
  }
}

/**
 * Start a workout, or return the one this browser already started.
 *
 * `clientKey` is generated by the browser BEFORE the request goes out, so a
 * retry after a dropped connection returns the same workout instead of opening
 * a second one. Without it, a gym with bad signal produces a workout per tap.
 */
export async function startWorkout(
  userId: string,
  input: {
    enrollmentId?: string | null
    dayId?: string | null
    clientKey: string
    /** When it really started, for a session being written up afterwards. */
    startedAt?: string
  }
): Promise<LiveWorkout> {
  const supabase = await createServerSupabaseClient()

  const live = await getLiveWorkout(userId)
  /**
   * HAS THIS KEY BEEN USED AT ALL, not just "is it the workout that is open".
   *
   * The old check only compared the key against the LIVE workout. Finish
   * yesterday's session on the laptop and the phone still holds the key it
   * used; the next tap of Start inserted it again, the unique index refused it,
   * and the raw Postgres complaint went to the screen — and every later tap did
   * the same, for ever, because nothing ever cleared the key.
   *
   * A key can also sit on a workout that was NEVER live: the after-the-fact
   * writer stamps one on a row with no start time. So "a row with this key and
   * no end time" is not "the workout you have open", and handing such a row
   * back as a live workout would be handing back a workout that never started.
   */
  const { data: keyRow } = await supabase
    .from("workout_logs")
    .select("id, client_key")
    .eq("user_id", userId)
    .eq("client_key", input.clientKey)
    .maybeSingle()

  // The retry this key exists for: the reply was lost, the workout is open.
  if (keyRow && live && (keyRow as { id: string }).id === live.id) return live
  if (keyRow) {
    throw new StartRefused("start_key_spent", "That start was already used.", 409)
  }
  if (live) {
    throw new StartRefused(
      "already_open",
      "A workout is already open — opening it.",
      409,
      live
    )
  }

  let program: Awaited<ReturnType<typeof programFor>> | null = null
  let cycle: number | null = null
  let week: number | null = null
  let dayId: string | null = null
  /** Held outside the block so the start-time checks below can see it. */
  let enrollment: Awaited<ReturnType<typeof getEnrollmentById>> | null = null

  if (input.enrollmentId) {
    const enr = await getEnrollmentById(userId, input.enrollmentId)
    if (!enr) throw new StartRefused("no_program", "That program was not found.", 404)
    enrollment = enr
    program = programFor(enr)
    /**
     * THE DAY THE CARD NAMED, NOT THE DAY THE CURSOR POINTS AT.
     *
     * This used to fall back to `computePrescription(...).dayId` — the
     * program's own counter — while every card decided today by the account's
     * weekday. On a week pinned Mon/Wed/Fri, a missed Wednesday left the two
     * one session apart: the card said Legs and Start opened Pull. One rule
     * answers it now, `todaysSessionFor`, and the cursor only decides for a
     * program that is a sequence rather than a calendar.
     *
     * A weekday-pinned rest day resolves to the NEXT session, flagged as a
     * rest day upstream: starting it early is a thing people do, not an error.
     */
    if (input.dayId) {
      if (!isSessionOf(program, input.dayId)) {
        throw new StartRefused("unknown_day", "That day is not part of this program.", 409)
      }
      const prescription = computePrescription(program, enr)
      dayId = input.dayId
      cycle = prescription.cycle
      week = prescription.week
    } else {
      const today = await todaysSessionFor(userId, enr)
      dayId = today.dayId
      cycle = today.cycle
      week = today.week
    }
  }

  /**
   * WHEN IT STARTED — now, or when the person says it did.
   *
   * Both `started_at` and `logged_at` are written from this (they must be
   * equal, per `workout_logs_logged_is_start`), and that is what files the
   * session under the day it happened on the account's calendar rather than
   * the day it was typed.
   *
   * Two refusals, both instant-to-instant so the server's clock is the right
   * clock to compare with. A minute of slack, because a phone's clock and a
   * server's are never exactly the same and refusing on a two-second drift
   * would be indistinguishable from a bug.
   */
  const startedAt = input.startedAt ?? new Date().toISOString()
  if (new Date(startedAt).getTime() > Date.now() + 60_000) {
    throw new StartRefused(
      "in_future",
      "That is in the future — pick a time you have already trained.",
      400
    )
  }
  /**
   * THE SAME MINUTE OF SLACK, AND FOR A SECOND REASON HERE.
   *
   * Without it: enrol in a program, open "Log a past workout" and try to
   * record the session you just did. The time box has MINUTE resolution, so
   * "now" arrives as 19:30:00 while the enrollment began at 19:30:14, and the
   * only time the box can express is refused — on a screen whose entire job
   * is to accept it. Rounding down to the minute is not a person claiming to
   * have trained before they enrolled.
   */
  if (
    enrollment &&
    new Date(startedAt).getTime() < new Date(enrollment.started_at).getTime() - 60_000
  ) {
    throw new StartRefused("before_program", "That is before you started this program.", 400)
  }
  const { data, error } = await supabase
    .from("workout_logs")
    .insert({
      user_id: userId,
      /**
       * A RUN IS STORED AS A RUN. This was the literal "weights", so every live
       * run counted as a gym session and the running tiles never moved. It is
       * decided from the program here, at the one moment anything knows: the
       * finish used to have a second write for it whose error was discarded and
       * which no caller ever sent a value to.
       */
      session_type: sessionTypeFor(program),
      // A workout belongs to the day it STARTED — a session that runs past
      // midnight is still the day you went to the gym.
      logged_at: startedAt,
      started_at: startedAt,
      ...(input.enrollmentId
        ? {
            enrollment_id: input.enrollmentId,
            program_day_id: dayId,
            program_cycle: cycle,
            program_week: week,
          }
        : {}),
      client_key: input.clientKey,
    })
    .select(LIVE_SELECT)
    .single()
  if (error) {
    /**
     * TWO STARTS IN THE SAME INSTANT. Two tabs, or the Tracking card and the
     * Training page tapped within a second: the reads above both saw nothing
     * open, and the loser's insert hits a unique index. The answer is the SAME
     * as a second tap a second later — a workout is open, go to it — so the
     * client has one rule rather than two.
     */
    if ((error as { code?: string }).code === "23505") {
      const winner = await getLiveWorkout(userId)
      if (winner) {
        throw new StartRefused("already_open", "A workout is already open — opening it.", 409, winner)
      }
      throw new StartRefused("start_key_spent", "That start was already used.", 409)
    }
    // Anything else is ours to fix, not the person's to read. The database's
    // own words go to the log; the screen gets a sentence.
    console.error("start workout insert:", error)
    throw new Error("Could not start the workout.")
  }
  return toLive(data as LiveRow, await unitFor(userId, input.enrollmentId ?? null))
}

/** The workout in progress, or null. At most one per person, by index. */
export async function getLiveWorkout(userId: string): Promise<LiveWorkout | null> {
  const supabase = await createServerSupabaseClient()
  const { data, error } = await supabase
    .from("workout_logs")
    .select(LIVE_SELECT)
    .eq("user_id", userId)
    .is("ended_at", null)
    .not("started_at", "is", null)
    .maybeSingle()
  if (error) throw new Error(`Could not read the workout: ${error.message}`)
  if (!data) return null
  const row = data as LiveRow
  return toLive(row, await unitFor(userId, row.enrollment_id))
}

/** The workout must be this person's, and must still be running. */
async function requireLive(userId: string, workoutId: string): Promise<LiveWorkout> {
  const live = await getLiveWorkout(userId)
  if (!live || live.id !== workoutId) {
    throw new Error("That workout is not open any more — reload to see where it got to.")
  }
  return live
}

/**
 * Tick a set off. THE WRITE THAT MAKES THIS A TRACKER RATHER THAN A FORM.
 *
 * Upserted on its slot, so tapping the same set twice corrects it rather than
 * adding a second one — which is what a retry over bad signal looks like.
 */
export async function completeSet(
  userId: string,
  workoutId: string,
  set: {
    exerciseId: string | null
    exercise: string
    weight: number
    reps: number
    setNumber: number
    kind?: "warmup" | "working" | "amrap" | "backoff" | "drop"
    prescribedIndex?: number | null
    side?: "left" | "right" | null
    rpe?: number | null
  }
): Promise<LiveWorkout> {
  const live = await requireLive(userId, workoutId)
  const unit = await unitFor(userId, live.enrollmentId)
  const supabase = await createServerSupabaseClient()

  const kind = set.kind ?? "working"
  const side = set.side ?? null
  const row = {
    exercise: set.exercise,
    exercise_id: set.exerciseId,
    /**
     * THE LIFT'S IDENTITY ACROSS PROGRAMS. The column was added for exactly this
     * and then never written — every row said `null` — so anything asking "how
     * much do you squat" had only the free-text name to go on, and a self-built
     * week that says "Back Squat" never counted towards Squat. `exercise_id` is
     * program-private; this one is shared.
     */
    library_id: libraryByName(set.exercise)?.id ?? null,
    weight_kg: round2(toKg(set.weight, unit)),
    reps: set.reps,
    set_number: set.setNumber,
    set_kind: kind,
    prescribed_index: set.prescribedIndex ?? null,
    completed_at: new Date().toISOString(),
    side,
    rpe: set.rpe ?? null,
  }

  /**
   * CORRECT THE SLOT, DO NOT ADD TO IT.
   *
   * Tapping the same set again is how a person fixes a number, and it is also
   * what a retry over bad signal looks like — neither should produce a second
   * set 2. Matched against the workout already in hand rather than through a
   * database upsert, because the uniqueness rule is an EXPRESSION index
   * (`COALESCE(exercise_id, exercise)`, so a loose workout with no lift ids
   * still cannot write one slot twice) and PostgREST's `onConflict` can only
   * name plain columns.
   */
  const key = setSlot({ exerciseId: set.exerciseId, exercise: set.exercise, kind, setNumber: set.setNumber, side })
  const existing = live.sets.find((s) => setSlot(s) === key)

  const { error } = existing
    ? await supabase.from("workout_sets").update(row).eq("id", existing.id).eq("log_id", workoutId)
    : await supabase.from("workout_sets").insert({ ...row, log_id: workoutId })
  if (error) throw new Error(`Could not save that set: ${error.message}`)
  return (await getLiveWorkout(userId))!
}

/**
 * RE-TAG A SET THAT IS ALREADY WRITTEN, or say how hard it was.
 *
 * A set gets logged as "working" because that is what the row it was ticked in
 * was for, and then turns out to have been a warm-up, or a drop set taken off
 * the end. Until now the only way to correct that was to delete the set and
 * tick it again somewhere else — losing its time, and its place in the order.
 *
 * THE COLLISION IS CHECKED BEFORE THE WRITE, in a sentence.
 * `uq_workout_sets_slot` means a lift can hold only one warm-up set 1; tagging
 * a second one lands on Postgres's own complaint about a unique index, which
 * is not a sentence anybody can act on. The one it gets instead names both
 * sets and what to do about it.
 */
export async function updateSet(
  userId: string,
  workoutId: string,
  setId: string,
  patch: { kind?: LiveWorkoutSet["kind"]; rpe?: number | null }
): Promise<LiveWorkout> {
  const live = await requireLive(userId, workoutId)
  const set = live.sets.find((s) => s.id === setId)
  if (!set) throw new Error("That set is not part of this workout.")

  const row: Record<string, unknown> = {}
  if (patch.rpe !== undefined) row.rpe = patch.rpe
  if (patch.kind !== undefined && patch.kind !== set.kind) {
    const target = setSlot({ ...set, kind: patch.kind })
    const clash = live.sets.find((s) => s.id !== setId && setSlot(s) === target)
    if (clash) {
      throw new Error(
        `${set.exercise} already has a ${KIND_WORDS[patch.kind]} set ${set.setNumber} — delete one of them first.`
      )
    }
    row.set_kind = patch.kind
  }
  // Nothing to change is not an error and not a write: the schema refuses an
  // empty patch, and re-tagging a set as what it already is lands here.
  if (Object.keys(row).length === 0) return live

  const supabase = await createServerSupabaseClient()
  const { error } = await supabase
    .from("workout_sets")
    .update(row)
    .eq("id", setId)
    .eq("log_id", workoutId)
  if (error) throw new Error(`Could not change that set: ${error.message}`)
  return (await getLiveWorkout(userId))!
}

/** How a set kind reads in a sentence a person has to act on. */
const KIND_WORDS: Record<string, string> = {
  warmup: "warm-up",
  working: "working",
  amrap: "all-out",
  backoff: "back-off",
  drop: "drop",
}

/** Remove a set. Did three, not four. */
export async function deleteSet(
  userId: string,
  workoutId: string,
  setId: string
): Promise<LiveWorkout> {
  await requireLive(userId, workoutId)
  const supabase = await createServerSupabaseClient()
  const { error } = await supabase.from("workout_sets").delete().eq("id", setId).eq("log_id", workoutId)
  if (error) throw new Error(`Could not remove that set: ${error.message}`)
  return (await getLiveWorkout(userId))!
}

/**
 * What changed on the day: a lift skipped, swapped, cut short, reordered.
 *
 * On the workout rather than in its sets, because a lift you did NOT do has no
 * sets to carry the fact. Without it the engine cannot tell "the rack was
 * taken" from "I failed every rep", and it used to assume the second.
 */
export async function adjustWorkout(
  userId: string,
  workoutId: string,
  patch: Partial<WorkoutAdjustments> & { notes?: string | null; rpe?: number | null }
): Promise<LiveWorkout> {
  const live = await requireLive(userId, workoutId)
  const supabase = await createServerSupabaseClient()
  const { notes, rpe, ...adjustments } = patch
  const { error } = await supabase
    .from("workout_logs")
    .update({
      adjustments: { ...live.adjustments, ...adjustments },
      ...(notes !== undefined ? { notes } : {}),
      ...(rpe !== undefined ? { rpe } : {}),
    })
    .eq("id", workoutId)
    .eq("user_id", userId)
  if (error) throw new Error(`Could not save that change: ${error.message}`)
  return (await getLiveWorkout(userId))!
}

/**
 * What a finished workout was — read back from the workout itself.
 *
 * ONE OWNER OF "WHAT THIS WORKOUT WAS". Finishing used to compute the summary
 * on the way out and hand it to the reply, and nowhere else could ever produce
 * it again. So a Save whose reply was lost on gym wifi meant the summary was
 * gone: the screen said "Nothing was finished" for a workout that had in fact
 * been saved, and there was no second way to ask.
 *
 * The receipt — the bests and what the program will do next time — is READ, not
 * recomputed, because recomputing gives a different answer once the program has
 * been edited and no answer at all for a program started before June. Both are
 * written into the workout row in the same statement that closes it.
 *
 * `null` means the workout is unknown, or still running.
 */
export async function summaryFor(userId: string, workoutId: string): Promise<WorkoutSummary | null> {
  const supabase = await createServerSupabaseClient()
  const { data, error } = await supabase
    .from("workout_logs")
    .select("id, enrollment_id, started_at, ended_at, duration_min, progression_changes, personal_records")
    .eq("id", workoutId)
    .eq("user_id", userId)
    .not("ended_at", "is", null)
    .maybeSingle()
  if (error) throw new Error(`Could not read that workout: ${error.message}`)
  if (!data) return null
  const row = data as {
    id: string
    enrollment_id: string | null
    started_at: string | null
    ended_at: string
    duration_min: number | null
    progression_changes: ProgressionChange[] | null
    personal_records: StoredRecords | null
  }

  // Paged: a long session is a few dozen rows, but the cap is silent and a
  // short read here would under-report the volume of somebody's hardest day.
  const sets = await readAllRows<WorkoutSetRow>("the sets of a finished workout", (from, to) =>
    supabase.from("workout_sets").select("*").eq("log_id", workoutId).order("id").range(from, to)
  )

  const unit = await unitFor(userId, row.enrollment_id)
  const working = sets.filter((x) => x.set_kind !== "warmup" && x.set_kind !== "drop")
  const volumeKg = working.reduce((total, x) => total + x.weight_kg * x.reps, 0)
  const started = row.started_at ? new Date(row.started_at).getTime() : null
  const derived = started ? Math.round((new Date(row.ended_at).getTime() - started) / 60000) : 1
  const records = row.personal_records

  return {
    workoutId,
    startedAt: row.started_at ?? undefined,
    durationMin: Math.min(599, Math.max(1, row.duration_min ?? derived)),
    sets: working.length,
    volumeKg: round2(volumeKg),
    volume: round2(fromKg(volumeKg, unit)),
    unit,
    // NULL IS "NOT KEPT", NOT "NOTHING BEATEN". Every workout finished before
    // the 20260917100000 migration reads that way, and so does one whose
    // history could not be read at the time.
    ...(records ? {} : { recordsUnavailable: true as const }),
    /**
     * THE KILOGRAMS ARE THE FACT; THE DISPLAYED NUMBER IS WORKED OUT AGAIN.
     *
     * The receipt was stored with `weight` already converted into whatever unit
     * the person trained in that day, while `unit` above is read now. Switch
     * Settings from kilos to pounds and the old receipt then printed the
     * kilogram number under a "lb" label — a 105 kg best shown as "105 lb".
     * `weight_kg` is the one stored fact, so the label and the number are
     * always worked out from it together.
     */
    personalRecords: (records?.records ?? []).map((pr) => ({
      ...pr,
      weight: round2(fromKg(pr.weight_kg, unit)),
    })),
    firstTimeLifts: records?.firstTimeLifts ?? [],
    ...(row.progression_changes ? {} : { changesUnavailable: true as const }),
    changes: row.progression_changes ?? [],
  }
}

/**
 * Close the workout and move the program's weights — in one transaction.
 *
 * `endedAt` comes from the caller rather than from `now()`: a workout somebody
 * forgot to finish on Tuesday and closes on Thursday is not a two-day workout,
 * and the finish screen defaults it to the last set that was ticked.
 *
 * SAVING TWICE IS SAVING ONCE. The screen used to get "that workout is not open
 * any more — reload to see where it got to" on the second Save, which is what
 * happens every time a reply is lost on gym wifi: the workout WAS saved, and
 * the person was told it was gone and shown no summary. A second Save now
 * ignores its own input and hands back the summary of the workout that is
 * already closed.
 */
export async function finishWorkout(
  userId: string,
  workoutId: string,
  input: {
    endedAt?: string
    /** When it really started, for a session written up afterwards. */
    startedAt?: string
    intensity: number
    rpe?: number | null
    notes?: string | null
    /** Loose workouts only — a program decides its own kind. */
    sessionType?: "weights" | "cardio" | "mobility" | "yoga" | "running"
    distanceKm?: number | null
  }
): Promise<WorkoutSummary> {
  const supabase = await createServerSupabaseClient()

  const { data: row, error: rowError } = await supabase
    .from("workout_logs")
    .select("id, ended_at, started_at")
    .eq("id", workoutId)
    .eq("user_id", userId)
    .maybeSingle()
  if (rowError) throw new Error(`Could not read that workout: ${rowError.message}`)
  if (!row) throw new Error("That workout no longer exists.")
  if ((row as { ended_at: string | null }).ended_at) {
    return await requireSummary(userId, workoutId)
  }

  const live = await requireLive(userId, workoutId)

  /**
   * WHAT KIND OF SESSION — and who gets to say.
   *
   * A program knows: `sessionTypeFor` decided it when the workout started, and
   * a caller trying to override it here is a second opinion nobody asked for.
   * A LOOSE workout genuinely does not know, and if it has no ticked sets
   * there is nothing to infer from either — a run recorded that way was stored
   * as a gym session and appeared in no running total anywhere.
   */
  let sessionType: string | null = null
  if (live.enrollmentId) {
    if (input.sessionType) throw new Error("The program decides what kind of session this is.")
  } else if (input.sessionType) {
    sessionType = input.sessionType
  } else if (live.sets.every((set) => !set.completedAt)) {
    throw new Error("Say what kind of session it was.")
  } else {
    sessionType = "weights"
  }

  const lastSet = live.sets
    .map((s) => s.completedAt)
    .filter((t): t is string => Boolean(t))
    .sort()
    .pop()
  // Ended when the caller says, else when the last set was ticked, else now.
  const endedAtRaw = input.endedAt ?? lastSet ?? new Date().toISOString()
  const endedAt = endedAtRaw
  /**
   * THE START CAN MOVE, for a session being written up afterwards.
   *
   * Everything below — the minutes, the day it is filed under, and which sets
   * count as "before" for a personal best — is measured from this, not from
   * when Start happened to be pressed.
   */
  const startedAtIso = input.startedAt ?? live.startedAt
  const started = new Date(startedAtIso).getTime()
  let ended = new Date(endedAt).getTime()
  /**
   * A MINUTE-PRECISION INPUT CANNOT EXPRESS SECONDS.
   *
   * The finish screen offers "when did it end" as a `datetime-local`, which has
   * no seconds — so a workout started at 20:43:37 and finished a moment later
   * comes back as 20:43:00, thirty-seven seconds BEFORE it began, and was
   * refused outright. Inside a minute the two are the same moment and the start
   * is the honest answer; beyond that it is a real mistake and still refused.
   */
  if (ended < started) {
    if (started - ended > 60_000) throw new Error("A workout cannot end before it started.")
    ended = started
  }
  /**
   * DERIVED, AND NEVER CLAMPED.
   *
   * The minutes used to be a number the CALLER sent, clamped into range: a
   * mistyped end became a silent ten-hour workout rather than a refusal, and
   * the "45 minutes at effort 3" that every written-up session claimed came
   * from exactly this. The two instants already state the length; if they
   * state something impossible, that is worth saying out loud.
   */
  const durationMin = Math.max(1, Math.round((ended - started) / 60000))
  if (durationMin > 599) {
    throw new Error("A workout cannot be longer than ten hours — check when it really ended.")
  }

  /**
   * What the person actually beat — measured against EVERYTHING they have
   * logged, not a window.
   *
   * There used to be three windows: this one looked at the last 400 workouts,
   * Progress at 365 days and the past-workout form at 90, so one lift was a
   * record on one screen and not on the next. One function answers it now, and
   * it excludes this workout so its own sets are not its own previous best.
   */
  const priorSets = await personalBestBaseline(userId, {
    workoutId,
    // THE EDITED START. A session dated last Tuesday must be judged against
    // what was lifted before last Tuesday, not before today.
    loggedAt: startedAtIso,
  })
  // The day the lifter trained, on the lifter's own calendar — not the server's.
  // The EDITED start again: the day this is filed under on the account's
  // calendar, which is what a personal best is dated by.
  const workoutDay = toDateISO(toZonedDate(new Date(startedAtIso), await getUserTimezone(userId)))

  let changes: ProgressionChange[] = []
  let exerciseState: Record<string, unknown> | null = null
  let cursor: Record<string, unknown> | null = null
  let expectedSessionCount = 0

  if (live.enrollmentId) {
    const enr = await getEnrollmentById(userId, live.enrollmentId)
    if (!enr) throw new Error("That program was not found")
    const program = programFor(enr)
    const entries = entriesFromSets(live.sets.map(toStored), live.adjustments, enr.unitSystem)
    const session = {
      enrollment_id: enr.id,
      dayId: live.dayId ?? "",
      cycle: live.cycle ?? enr.cursor.cycle,
      week: live.week ?? enr.cursor.week,
      entries,
    }

    /**
     * A SESSION DATED BEFORE ONE YOU HAVE ALREADY RECORDED.
     *
     * You forgot Tuesday and write it up on Friday, after Thursday's session.
     * Moving the weights on from where they stand — which is what the deleted
     * form did — leaves the program disagreeing with what a correction would
     * compute from the same history: Tuesday's result would sit on top of
     * Thursday's rather than between Monday's and Thursday's.
     *
     * So the whole history is replayed in date order, by the same function the
     * correction screen already uses. One question, one answer.
     */
    const stored = await getSessionLogs(userId, enr.id)
    const newest = stored.reduce<string | null>(
      (latest: string | null, l: { logged_at: string }) =>
        latest === null || l.logged_at > latest ? l.logged_at : latest,
      null
    )
    const backdated = newest !== null && new Date(startedAtIso).getTime() < new Date(newest).getTime()

    if (backdated) {
      /**
       * A PROGRAM WITHOUT ITS STARTING WEIGHTS CANNOT BE REPLAYED, and
       * guessing is worse than refusing. Nothing has been written at this
       * point, so the refusal costs the session nothing but the retry.
       */
      if (!enr.initialExerciseState) {
        throw new Error(
          "This program was started before starting weights were kept, so a session cannot be dated before your last one. Date it after your last session, or end and restart the program."
        )
      }
      const replayed = await replayedState(userId, enr.id, {
        addLog: { ...session, logged_at: startedAtIso },
      })
      exerciseState = replayed.enrollment.exerciseState as unknown as Record<string, unknown>
      cursor = replayed.enrollment.cursor as unknown as Record<string, unknown>
      expectedSessionCount = replayed.expectedSessionCount
      // What THIS session moved — computed against the history up to it, not
      // against where the program stands today.
      changes = replayed.changesForAdded ?? []
    } else {
      const result = applyLog(program, enr, session)
      changes = result.changes
      exerciseState = result.enrollment.exerciseState as unknown as Record<string, unknown>
      cursor = result.enrollment.cursor as unknown as Record<string, unknown>
      expectedSessionCount = enr.cursor.sessionCount
    }
  }

  /**
   * THE RECEIPT GOES IN WITH THE FINISH, not into the reply only.
   *
   * What the screen is about to say — the bests and what the program will ask
   * for next time — is written in the same statement that closes the workout.
   * Recomputing it later gives a different answer once the program has been
   * edited, and no answer at all for a program started before June, so the only
   * honest record of what you were told is the one taken at the time.
   *
   * `null` when the history could not be read: that is "not checked", which is
   * a different thing from "nothing was beaten", and the receipt says so.
   */
  const setsAsRows = live.sets.map(toSetRow)
  const storedRecords: StoredRecords | null = priorSets.unavailable
    ? null
    : {
        records: detectPersonalRecords(priorSets.sets, setsAsRows, workoutDay).map((pr) => ({
          ...pr,
          weight: round2(fromKg(pr.weight_kg, live.unit)),
        })),
        firstTimeLifts: firstTimeLifts(priorSets.sets, setsAsRows),
      }

  const { error } = await supabase.rpc("finish_program_workout", {
    p_workout_id: workoutId,
    p_ended_at: endedAt,
    p_duration_min: durationMin,
    p_intensity: input.intensity,
    p_rpe: input.rpe ?? null,
    p_notes: input.notes ?? null,
    p_exercise_state: exerciseState,
    p_cursor: cursor,
    p_replay_events: null,
    p_expected_session_count: expectedSessionCount,
    p_changes: changes,
    p_records: storedRecords,
    // The three the finish transaction learned. Null leaves each as it was.
    p_started_at: input.startedAt ?? null,
    p_session_type: sessionType,
    p_distance_km: input.distanceKm ?? null,
  })
  if (error) {
    /**
     * A LOST RACE IS NOT A FAILURE. Two tabs, or a retry that overtakes its own
     * first request: the function raises "already been finished" for the second
     * caller, and the workout IS closed. Telling the person their workout could
     * not be saved, while it sits saved in the database, is the worst of the
     * three possible answers — so the row is re-read and the truth decides.
     */
    const closed = await summaryFor(userId, workoutId)
    if (closed) return closed
    throw new Error(error.message)
  }

  return await requireSummary(userId, workoutId)
}

/**
 * The summary of a workout that has just been closed.
 *
 * A separate step from `summaryFor` only so the impossible case has a sentence:
 * the row was closed a moment ago, so a null here means it was deleted between
 * the two statements, and "it worked but there is nothing to show" would be a
 * lie in either direction.
 */
async function requireSummary(userId: string, workoutId: string): Promise<WorkoutSummary> {
  const summary = await summaryFor(userId, workoutId)
  if (!summary) throw new Error("That workout no longer exists.")
  return summary
}

/** Throw the workout away. Nothing is recorded. */
export async function discardWorkout(userId: string, workoutId: string): Promise<void> {
  await requireLive(userId, workoutId)
  const supabase = await createServerSupabaseClient()
  const { error } = await supabase.from("workout_logs").delete().eq("id", workoutId).eq("user_id", userId)
  if (error) throw new Error(`Could not discard the workout: ${error.message}`)
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * A live set in the shape the history functions read.
 *
 * `library_id` is null because nothing downstream of here matches on it: both
 * the record check and the first-time check key on the lift's name, the same
 * way the stored history does.
 */
function toSetRow(s: LiveWorkoutSet): WorkoutSetRow {
  return {
    id: s.id,
    log_id: "",
    exercise: s.exercise,
    weight_kg: s.weightKg,
    reps: s.reps,
    set_number: s.setNumber,
    notes: null,
    exercise_notes: null,
    exercise_id: s.exerciseId,
    library_id: null,
    set_kind: s.kind,
    prescribed_index: s.prescribedIndex,
    completed_at: s.completedAt,
    rpe: s.rpe,
    side: s.side,
  }
}

function toStored(set: LiveWorkoutSet): StoredSet {
  return {
    exercise: set.exercise,
    exercise_id: set.exerciseId,
    weight_kg: set.weightKg,
    reps: set.reps,
    set_number: set.setNumber,
    set_kind: set.kind,
    side: set.side,
  }
}

/**
 * The unit this workout's weights are entered in.
 *
 * IT REFUSES RATHER THAN GUESSES. The error was discarded here, so a profile
 * read that failed came back as `null` and fell through to the "kg" default —
 * and a lifter working in pounds had their whole session silently reinterpreted
 * as kilograms. 225 becomes 225 kg going in and 496 lb coming out; the
 * progression engine then compares the two and stalls the weight. There is no
 * safe guess for this, so a failure stops the workout instead of corrupting it.
 */
export async function unitFor(userId: string, enrollmentId: string | null): Promise<"kg" | "lb"> {
  if (enrollmentId) {
    const enr = await getEnrollmentById(userId, enrollmentId)
    if (enr) return enr.unitSystem
  }
  const supabase = await createServerSupabaseClient()
  const { data, error } = await supabase
    .from("profiles")
    .select("weight_unit")
    .eq("id", userId)
    .maybeSingle()
  if (error) {
    throw new Error("Could not read whether you train in kilos or pounds, so nothing was changed.")
  }
  return data?.weight_unit === "lb" ? "lb" : "kg"
}

/**
 * WHAT THESE LIFTS DID LAST TIME — one read, one matching rule, two callers.
 *
 * This replaces `liftHistory`, which was wrong in four ways at once: it matched
 * on the exercise NAME only (so a self-built week calling it "Back Squat" never
 * counted towards Squat, which `library_id` exists to fix), it returned
 * KILOGRAMS to a screen labelled in pounds, it read 40 workouts with no
 * tie-break on the order, and — worst — it destructured `{ data }` and threw
 * the query error away, so a failed read rendered as "you have never done this
 * lift". A silent fallback in the one place whose whole job is to say what you
 * did.
 *
 * It also replaces `programsService.lastSetsPerLift`, which read
 * `program_session_logs` inside `if (live.enrollmentId)` — so the PREVIOUS
 * column was empty for every workout started off a program, and for every lift
 * added on the day, which is exactly when you have least idea what you did.
 *
 * ONE HUNDRED FINISHED WORKOUTS, newest first. Bounded because it is a read on
 * a screen somebody is standing still for; a lift not touched within a hundred
 * workouts is reported as never done, and the history sheet says so in words.
 */
export async function lastSetsForLifts(
  userId: string,
  /** `key` is the caller's own handle for the lift — an exercise id, or a name. */
  lifts: readonly { key: string; name: string; libraryId?: string | null }[],
  unit: UnitSystem,
  sessions = 1
): Promise<Record<string, LiftSessions[]>> {
  if (lifts.length === 0) return {}
  const supabase = await createServerSupabaseClient()
  const { data, error } = await supabase
    .from("workout_logs")
    .select("logged_at, workout_sets(exercise, library_id, weight_kg, reps, set_number, set_kind)")
    .eq("user_id", userId)
    .not("ended_at", "is", null)
    .order("logged_at", { ascending: false })
    // A TIE-BREAK, so two workouts logged on one day have a fixed order and
    // "last time" does not change between two reads of the same data.
    .order("id")
    .limit(100)
  if (error) throw new Error(`Your past sets could not be read: ${error.message}`)

  const workouts = ((data ?? []) as WorkoutLogSetsRow[]).map((log) => ({
    at: log.logged_at,
    sets: (log.workout_sets ?? []).map((set) => ({
      exercise: set.exercise,
      libraryId: set.library_id,
      // Shown in the unit the person reads, never the stored kilograms: this
      // number goes straight into a box labelled "lb".
      weight: round2(fromKg(set.weight_kg, unit)),
      reps: set.reps,
      setNumber: set.set_number,
      kind: set.set_kind,
    })),
  }))

  const out: Record<string, LiftSessions[]> = {}
  for (const lift of lifts) {
    out[lift.key] = pickLastSets(
      workouts,
      // The library id is derived HERE when the caller has none, so every
      // caller matches the same way — `completeSet` writes the column from the
      // same function.
      { name: lift.name, libraryId: lift.libraryId ?? libraryByName(lift.name)?.id ?? null },
      sessions
    )
  }
  return out
}

/** Today's prescription, with the plate setup and the person's own weekday. */
export async function prescriptionForDay(userId: string, enrollmentId: string, dayId?: string) {
  const enr = await getEnrollmentById(userId, enrollmentId)
  if (!enr) throw new Error("That program was not found")
  const program = programFor(enr)
  const account = await getTrainingSettings(userId)
  /**
   * A RUNNING PLAN HAS NO DAY LIST, and asking for one THREW — so the live
   * screen could not open at all for a workout started on Couch to 5K. Its
   * session comes from the cursor's week, and there are no load styles to
   * report because nothing in it is lifted.
   */
  if (program.schedule.kind === "endurance_weeks") {
    return {
      prescription: computePrescription(program, enr),
      unit: enr.unitSystem,
      plates: plateSetupFor(
        enr.barWeightKg ?? account.barWeightKg,
        enr.unitSystem,
        account.smallestPlateKg
      ),
      loadStyles: {} as Record<string, ReturnType<typeof loadStyleOf>>,
      timezone: await getUserTimezone(userId),
    }
  }
  const days = scheduleDays(program.schedule)
  const index = dayId ? days.findIndex((d) => d.id === dayId) : -1
  const prescription = computePrescription(
    program,
    index >= 0 ? { ...enr, cursor: { ...enr.cursor, dayIndex: index } } : enr
  )
  return {
    prescription,
    unit: enr.unitSystem,
    // The enrollment's bar overrides the account's; the plate comes from the
    // account, which is the only place it is set.
    plates: plateSetupFor(
      enr.barWeightKg ?? account.barWeightKg,
      enr.unitSystem,
      account.smallestPlateKg
    ),
    loadStyles: Object.fromEntries(
      days.flatMap((d) => d.exercises.map((ex) => [ex.id, loadStyleOf(ex)] as const))
    ),
    timezone: await getUserTimezone(userId),
  }
}

/**
 * Correct the sets of a workout that is already finished.
 *
 * WHY THIS EXISTS. You could delete a workout you did not recognise and you
 * could not look at it first, let alone fix it. Typing 100 where you meant 10
 * meant losing the session and writing it again.
 *
 * KILOGRAMS ON THE WIRE, and this is not a detail. The first version took the
 * number as typed and converted it with whatever unit the SERVER thought the
 * person used. The screen picks its unit from the running program; the server
 * picked it from the profile, or from the enrollment that owned that old
 * workout. Nothing made those agree, so a pounds lifter with no program running
 * saw "102.1 kg", saved, and had it stored as 46.31 kg — every set in the
 * workout shrinking by 2.2 times, on every correction, compounding. The caller
 * converts once, from the unit it actually displayed, and the ambiguity is
 * gone.
 *
 * EVERY COLUMN SURVIVES. The first version supplied seven columns out of
 * fifteen and routed program workouts through a writer that only understands
 * working sets — so correcting one rep deleted the warm-ups, turned an all-out
 * set into an ordinary one, dropped the notes and the effort scores, and wiped
 * the record of which lifts had been skipped or added. A correction changes what
 * it was asked to change.
 *
 * TWO KINDS OF WORKOUT, ONE DOOR. A session answering a program cannot just have
 * its rows swapped: the weights of every session after it were decided by what
 * this one said. Its sets are written the same way, and then the program is
 * recalculated from the stored sessions.
 */
export async function reviseWorkout(
  userId: string,
  workoutId: string,
  sets: Array<{
    exercise: string
    exerciseId: string | null
    /** ALREADY in kilograms. The caller converts; the server never guesses. */
    weightKg: number
    reps: number
    setNumber: number
    kind: LiveWorkoutSet["kind"]
    side?: "left" | "right" | null
    notes?: string | null
    /** The per-exercise note, which a correction used to delete. */
    exerciseNotes?: string | null
    rpe?: number | null
  }>
): Promise<{ recalculated: boolean }> {
  const supabase = await createServerSupabaseClient()
  const { data: log, error } = await supabase
    .from("workout_logs")
    // `adjustments` carries which lifts were marked "did not do", and the engine
    // needs it to read the corrected sets back as a session. It was not selected,
    // so a correction on a session with a skipped lift would have replayed it as
    // though the lift had been done.
    .select("id, enrollment_id, ended_at, started_at, adjustments")
    .eq("id", workoutId)
    .eq("user_id", userId)
    .maybeSingle()
  if (error) throw new Error(`Could not read that workout: ${error.message}`)
  if (!log) throw new Error("That workout no longer exists.")
  if (log.started_at && !log.ended_at) {
    throw new Error("That workout is still open — finish it before correcting it.")
  }

  const rows = sets.map((set) => ({
    log_id: workoutId,
    exercise: set.exercise,
    exercise_id: set.exerciseId,
    // Same identity as the live write above, so a corrected set is still the
    // same lift as the one it replaced.
    library_id: libraryByName(set.exercise)?.id ?? null,
    weight_kg: round2(set.weightKg),
    reps: set.reps,
    set_number: set.setNumber,
    set_kind: set.kind,
    side: set.side ?? null,
    notes: set.notes ?? null,
    // THE PER-EXERCISE NOTE. This line was missing, so correcting one rep count
    // deleted "left shoulder felt off, cut it short" from every set of that
    // lift — which the comment above this function says cannot happen.
    exercise_notes: set.exerciseNotes ?? null,
    rpe: set.rpe ?? null,
  }))

  /**
   * THE WEIGHTS ARE WORKED OUT BEFORE ANYTHING IS WRITTEN.
   *
   * This used to delete every set, insert the new ones, put the old ones back
   * BY HAND if the insert failed, and then recalculate the program in a fourth
   * write. Four writes and a rollback written in application code, for one
   * correction — and the recalculation could still fail after the sets had
   * committed, leaving the program prescribing from numbers nobody logged.
   *
   * `replace_sets_and_replay` takes the new sets and the recalculated weights
   * and commits them together. The hand-rolled restore is gone because the
   * database has a real one.
   */
  let exerciseState: Record<string, unknown> | null = null
  let cursor: Record<string, unknown> | null = null
  let replayEvents: unknown = null
  let expectedSessionCount = 0

  if (log.enrollment_id) {
    const enr = await getEnrollmentById(userId, log.enrollment_id)
    if (!enr) throw new Error("That program was not found")
    const replayed = await replayedState(userId, log.enrollment_id, {
      replaceLogId: workoutId,
      entries: entriesFromSets(rows as unknown as StoredSet[], log.adjustments, enr.unitSystem),
    })
    exerciseState = replayed.enrollment.exerciseState as unknown as Record<string, unknown>
    cursor = replayed.enrollment.cursor as unknown as Record<string, unknown>
    replayEvents = replayed.replayEvents ?? null
    expectedSessionCount = replayed.expectedSessionCount
  }

  const { error: written } = await supabase.rpc("replace_sets_and_replay", {
    p_log_id: workoutId,
    p_sets: rows,
    p_enrollment_id: log.enrollment_id ?? null,
    p_exercise_state: exerciseState,
    p_cursor: cursor,
    p_replay_events: replayEvents,
    p_expected_session_count: expectedSessionCount,
  })
  if (written) {
    // 55000 is how every program-write function says no on purpose — here, a
    // program that moved on while the correction was being computed. The person
    // can act on that, so it keeps its own sentence and its own status.
    throw written.code === "55000"
      ? new ProgramRefused(written.message)
      : new Error(`Those sets could not be saved, so the workout was left as it was: ${written.message}`)
  }

  return { recalculated: log.enrollment_id != null }
}

/**
 * WHAT THIS ACCOUNT TRAINS WITH — unit, bar, smallest plate.
 *
 * The three columns were added on 2026-09-07 with their CHECK constraints and a
 * column GRANT, and then nothing ever wrote them. `weight_unit` was read in one
 * place and always came back the column default, so a lifter who trains in
 * pounds and is not currently on a pounds program had no way to say so.
 * `bar_weight_kg` and `smallest_plate_kg` were read nowhere at all, which is why
 * the engine still snapped every prescription to a 20 kg bar and 1.25 kg plates
 * and then printed "use a lighter bar" — naming a fix the app did not offer.
 */
/**
 * The shape and defaults live in `src/programs/trainingSettings.ts`, which has
 * no server imports — a client component needs them, and importing this module
 * to get them drags a server Supabase client into the browser bundle.
 */
export type { TrainingSettings } from "@/src/programs/trainingSettings"

export async function getTrainingSettings(userId: string): Promise<TrainingSettings> {
  const supabase = await createServerSupabaseClient()
  const { data, error } = await supabase
    .from("profiles")
    .select("weight_unit, bar_weight_kg, smallest_plate_kg")
    .eq("id", userId)
    .maybeSingle()
  if (error) throw new Error("Could not read your training settings.")
  return {
    unit: data?.weight_unit === "lb" ? "lb" : "kg",
    barWeightKg: data?.bar_weight_kg ?? DEFAULT_BAR_KG,
    smallestPlateKg: data?.smallest_plate_kg ?? DEFAULT_PLATE_KG,
  }
}

export async function saveTrainingSettings(userId: string, settings: TrainingSettings): Promise<void> {
  const supabase = await createServerSupabaseClient()
  const { error } = await supabase
    .from("profiles")
    .update({
      weight_unit: settings.unit,
      bar_weight_kg: settings.barWeightKg,
      smallest_plate_kg: settings.smallestPlateKg,
    })
    .eq("id", userId)
  /**
   * The message a person can act on, not the database's. A CHECK violation here
   * means a number outside what a bar or a plate can be.
   */
  if (error) {
    throw new Error(
      "Those settings could not be saved. A bar must be between 0 and 50 kg, and a plate between 0.25 and 25 kg."
    )
  }
}
