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
import { DEFAULT_SESSION_TYPE } from "@/src/programs/config"
import {
  getEnrollmentById,
  programFor,
  plateSetupFor,
  replayedState,
  getSessionLogs,
  todaysSessionFor,
  updateEnrollmentSchedule,
} from "./programRepo"
import { CouldNotTell, databaseRefusal, ProgramRefused, WorkoutGone } from "@/src/programs/errors"
import { isOpenWorkout } from "./workoutLifecycle"
import { inWorkoutOrder, personalBestBaseline } from "./healthRepo"
import { getUserTimezone } from "./settingsRepo"
import { DISPLAY_LOCALE, toDateISO, toZonedDate } from "@/src/shared/dateUtils"
import { detectPersonalRecords, firstTimeLifts, workingVolumeKg } from "@/src/health/healthService"
import {
  applyLog,
  computePrescription,
  entriesFromSets,
  isSessionOf,
  keepableChanges,
  loadStyleOf,
  pickLastSets,
  setSlot,
  sessionTypeFor,
  toKg,
  fromKg,
} from "@/src/programs/programsService"
import {
  applyAdjustmentsToSchedule,
  isCustomizable,
  materializeSchedule,
  scheduleDays,
} from "@/src/programs/customize"
import { requireProgram } from "@/src/programs/data/catalog"
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
import { libraryByName, libraryExercise } from "@/src/programs/data/exerciseLibrary"

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
  if (error) throw readRefused("the workout you have open", error)
  if (!data) return null
  const row = data as LiveRow
  return toLive(row, await unitFor(userId, row.enrollment_id))
}

/**
 * The workout must be this person's, and must still be running.
 *
 * AND WHEN IT IS NOT, THIS IS THE COMMON CASE, not the race below it. The check
 * happens before every write, so a workout discarded or finished on another
 * device is usually noticed HERE — the write-time refusal only fires in the
 * fraction of a second between this read and that write.
 *
 * It therefore has to answer with the same class, or the screen clears itself
 * for the rare case and keeps drawing a dead workout for the ordinary one. It
 * threw a bare `Error` until 2026-09-26, so it did exactly that: the phone
 * printed "That set could not be removed" and stayed, set after set.
 */
async function requireLive(userId: string, workoutId: string): Promise<LiveWorkout> {
  const live = await getLiveWorkout(userId)
  if (live && live.id === workoutId) return live
  // Which of the two, asked rather than assumed — "finished on the laptop" and
  // "thrown away on the laptop" are not the same news.
  const fate = await fateOf(userId, workoutId)
  if (fate === "gone") throw new WorkoutGone("discarded")
  if (fate === "finished") throw new WorkoutGone("finished")
  // `unknown` gets its OWN sentence. Falling through to "not open any more"
  // would be a statement about a row nobody managed to read — which is the
  // definite branch, not the uncomputable one.
  if (fate === "unknown") throw new CouldNotTell()
  throw new Error("That workout is not open any more — reload to see where it got to.")
}

/**
 * "THAT IS NOT A UUID" IS A NOT-FOUND, NOT A FAULT.
 *
 * Postgres answers 22P02 — invalid input syntax for type uuid — when an id
 * cannot name a row at all. `/programs/workout/not-a-uuid` turned that into a
 * `CouldNotTell`, which the page had no catch for, so a truncated shared link
 * reached the global error screen: "This page could not load. The fault has
 * been reported." A well-formed id that is simply missing correctly gets the
 * 404 page one line later.
 *
 * Nothing is wrong on this side and no retry will help, which is exactly what
 * separates it from every other read failure this file wraps.
 */
const idCannotExist = (error: { code?: string }): boolean => error.code === "22P02"

/**
 * WHICH OF FOUR A WORKOUT IS IN — asked, never inferred from an error code.
 *
 * "Zero rows came back" is not a fact about the workout; it is the shape of
 * four different facts, and every one of them used to be reported as whichever
 * one the caller happened to have guessed. The finish function in the database
 * still says it in its own comment — "Zero rows means somebody (or some retry)
 * already finished it" — and that is how a workout DELETED on another device
 * came back to the screen as "That workout has already been finished".
 *
 * `unknown` is the fourth and it is the point of the type: a question that
 * could not be asked is not a "no". It sends the caller to its own sentence
 * rather than to a claim about a row nobody managed to read.
 */
type WorkoutFate = "open" | "finished" | "gone" | "unknown"

async function fateOf(userId: string, workoutId: string): Promise<WorkoutFate> {
  const supabase = await createServerSupabaseClient()
  const { data, error } = await supabase
    .from("workout_logs")
    .select("started_at, ended_at")
    .eq("id", workoutId)
    .eq("user_id", userId)
    .maybeSingle()
  if (error) {
    // A malformed id is not a question that failed — it is a workout that
    // cannot exist, which is "gone".
    if (idCannotExist(error)) return "gone"
    // SAY SO. Every sibling logs the real message; this one returned the
    // fourth state silently, so an operator saw a 503 with no cause anywhere.
    console.error(`could not tell the fate of workout ${workoutId}: ${error.message}`)
    return "unknown"
  }
  if (!data) return "gone"
  /**
   * THE SAME PREDICATE EVERYTHING ELSE USES. This read `ended_at === null`,
   * which calls a session written up afterwards — no start, no end — "open".
   * It is not open and never was, so a failed write against one answered "Tap
   * it again", which is retry advice for a workout nobody can tick into.
   */
  return isOpenWorkout(data as { started_at: string | null; ended_at: string | null })
    ? "open"
    : "finished"
}

/**
 * THE WORKOUT AS IT NOW STANDS — and it may not stand at all.
 *
 * Every write in this file ended `return await liveAfterWriting(userId, workoutId)`, and
 * the `!` is a lie at runtime. Discard the workout on the laptop in the moment
 * between the INSERT and this re-read and the function returns `null`, the
 * route answers 200 with a body of `null`, and the browser sets its workout to
 * null with nothing to say why — so the live screen falls through to "This
 * workout is finished." for a workout that was thrown away.
 *
 * That is the exact sentence this whole change exists to stop it saying, and it
 * survived the change on the SUCCESS path of all five writes. Found by a
 * review, not by a test: every one of them returns 200, so nothing was red.
 */
async function liveAfterWriting(userId: string, workoutId: string): Promise<LiveWorkout> {
  const live = await getLiveWorkout(userId)
  // AND IT MUST BE THE SAME ONE. Finish this workout on the laptop and start
  // another in the window after this write, and returning "whatever is open"
  // hands the browser a different workout's sets under a 200.
  if (live && live.id === workoutId) return live
  /**
   * WHICH OF THE TWO, ASKED — and the write already went through.
   *
   * This had one branch and called every case "discarded". The branch above it
   * fires precisely when this workout was FINISHED and another was started, so
   * the commonest way to reach it produced the one sentence `errors.ts` calls
   * the thing the screen must never get backwards: not thrown away, and the set
   * was in fact saved. `changeSaved` is true here by construction — the INSERT
   * committed before this read.
   */
  const fate = await fateOf(userId, workoutId)
  if (fate === "unknown") throw new CouldNotTell("this workout")
  throw new WorkoutGone(fate === "finished" ? "finished" : "discarded", fate === "finished")
}

/**
 * A READ THAT FAILED, IN WORDS A PERSON CAN ACT ON.
 *
 * No `fateOf` here, unlike `refuseWrite` below: a read that failed could not
 * ask the database anything, so asking it a second question would be answering
 * "is it gone?" over the same broken connection. It says what could not be read
 * and logs the rest.
 */
function readRefused(what: string, error: { code?: string; message: string }): Error {
  console.error(`could not read ${what} (code ${error.code ?? "none"}): ${error.message}`)
  /**
   * `CouldNotTell`, NOT a bare Error, and the difference is a lost set.
   *
   * A bare Error gets the sets route's fallback of 400, and the offline queue
   * reads any 4xx as "this can never succeed": it drops the set out of
   * `localStorage`, takes the ✓ off the screen and says it "has been removed".
   * So a momentary blip on any of these reads threw a set away — including
   * after the INSERT had already committed, where the set is in the database
   * and the screen says it is not.
   *
   * `CouldNotTell` answers 503, so the queue keeps the set and retries. This
   * class was added one round earlier for exactly this disaster and was wired
   * to `fateOf` alone; the other three reads on the write path kept the old
   * status, so only the wording had been fixed.
   */
  return new CouldNotTell(what)
}

/**
 * A FAILED WRITE, IN WORDS A PERSON CAN ACT ON. The database's own sentence
 * goes to the server log, which is the only place it helps anyone.
 *
 * Every write in this file used to end `throw new Error(\`… ${error.message}\`)`
 * and every workout route hands a thrown message straight to the browser, so
 * Postgres was talking to a person standing at a squat rack. See `WorkoutGone`
 * for the sentence the owner actually saw.
 *
 * It ASKS rather than reading the error code, because the code cannot tell the
 * cases apart: a missing parent row surfaces as a foreign-key violation on the
 * first attempt and as a row-level-security refusal on the ones after it —
 * same cause, two codes, and a third if the policy is ever rewritten.
 */
async function refuseWrite(
  userId: string,
  workoutId: string,
  error: { code?: string; message: string },
  /** What to say when the workout is fine and the write itself failed. */
  fallback: string
): Promise<never> {
  console.error(
    `workout write refused (workout ${workoutId}, code ${error.code ?? "none"}): ${error.message}`
  )
  const fate = await fateOf(userId, workoutId)
  if (fate === "gone") throw new WorkoutGone("discarded")
  if (fate === "finished") throw new WorkoutGone("finished")
  /**
   * AND THE FOURTH STATE KEEPS ITS OWN ANSWER.
   *
   * The caller's fallback is retry advice — "Tap it again" — and offering that
   * when the second question could not be asked is advice about a workout that
   * may not exist. It was collapsed into the `open` branch, which made the
   * fourth state decorative; a review pointed out that "unknown" and "open"
   * were indistinguishable at every call site, and it was right.
   */
  if (fate === "unknown") throw new CouldNotTell()
  /**
   * THE WORKOUT IS FINE AND THE WRITE FAILED — and whether that set survives
   * depends entirely on the status this produces.
   *
   * A bare `Error` becomes 400, and the offline queue reads any 4xx as "this
   * can never succeed": it drops the set out of `localStorage`, takes the ✓ off
   * the screen and says it "has been removed". Three rounds of this change
   * fixed the READS on this path for exactly that reason and left the write's
   * own failure answering 400 — the fourth instance of one class.
   *
   * So the error is classified rather than assumed, and the DEFAULT IS RETRY:
   * keeping a set that cannot be written is recoverable, deleting one is not.
   * Only Postgres's integrity-violation class (23xxx — a check, a unique index,
   * a foreign key) is permanent, and a retry of those genuinely cannot succeed.
   */
  const code = error.code ?? ""
  if (code.startsWith("23")) throw new Error(fallback)
  throw new CouldNotTell()
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

  /**
   * A CORRECTION KEEPS THE TIME THE SET WAS DONE.
   *
   * `row` carries `completed_at: now`, and the update path sent the whole of
   * it — so re-tapping a set to fix its weight, which this function's own
   * comment calls "how a person fixes a number", rewrote WHEN it happened.
   * Harmless while `inWorkoutOrder` sorted on `set_number`; the moment it
   * started sorting on `completed_at` (2026-09-27) the corrected set jumped
   * to the end of the workout on the receipt, in History and in the
   * correction editor:
   *
   *   Squat 1 | Squat 3 | Bench 1 | Bench 2 | Bench 3 | Squat 2
   *
   * The same applies to a set queued offline and flushed after a later one
   * landed. `completed_at` is when the set was performed; only an INSERT
   * knows that, and only an insert sets it.
   */
  const { error } = existing
    ? await supabase.from("workout_sets").update(row).eq("id", existing.id).eq("log_id", workoutId)
    : await supabase
        .from("workout_sets")
        .insert({ ...row, log_id: workoutId, completed_at: new Date().toISOString() })
  if (error) await refuseWrite(userId, workoutId, error, "That set could not be saved. Tap it again.")
  return await liveAfterWriting(userId, workoutId)
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
  if (error) await refuseWrite(userId, workoutId, error, "That set could not be changed.")
  return await liveAfterWriting(userId, workoutId)
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
  if (error) await refuseWrite(userId, workoutId, error, "That set could not be removed.")
  return await liveAfterWriting(userId, workoutId)
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
  if (error) await refuseWrite(userId, workoutId, error, "That change could not be saved.")
  return await liveAfterWriting(userId, workoutId)
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
    .select(
      "id, enrollment_id, started_at, ended_at, duration_min, session_type, distance_km, notes, progression_changes, personal_records"
    )
    .eq("id", workoutId)
    .eq("user_id", userId)
    .not("ended_at", "is", null)
    .maybeSingle()
  // A malformed id names no workout, which is the same answer as a missing
  // one — and a 404 rather than "the fault has been reported".
  if (error && idCannotExist(error)) return null
  if (error) throw readRefused("that workout", error)
  if (!data) return null
  const row = data as {
    id: string
    enrollment_id: string | null
    started_at: string | null
    ended_at: string
    duration_min: number | null
    /**
     * WHAT THE SESSION WAS. A run, a class and a mobility session all have
     * nothing in `workout_sets`, and the receipt described a workout entirely
     * by its sets — so a finished 5 km read "Sets 0 · Volume 0" and never said
     * the word "run" anywhere. Two zeroes are a claim about somebody's session.
     */
    session_type: string | null
    distance_km: number | null
    /** "Anything worth remembering?", which nothing has ever read back. */
    notes: string | null
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
  /**
   * ONE RULE FOR WEIGHT MOVED, and this is the call site the comment above it
   * used to lie about. It multiplied `weight_kg × reps` over every working set,
   * timed lifts included — and seconds live in the `reps` column, so a
   * 3 × 30 s farmer's carry at 40 kg was 3,600 kg on this screen and nothing
   * on the weekly chart, for the same session.
   */
  const volumeKg = workingVolumeKg(sets)
  const started = row.started_at ? new Date(row.started_at).getTime() : null
  const derived = started ? Math.round((new Date(row.ended_at).getTime() - started) / 60000) : 1
  const records = row.personal_records

  return {
    workoutId,
    // What a correction or a delete would cost: a program session recalculates
    // the weights it prescribed, and the receipt says so before asking.
    enrollmentId: row.enrollment_id,
    startedAt: row.started_at ?? undefined,
    /**
     * Passed through rather than flattened into a sentence here: the repo's job
     * is the fact, and `describeSessionRow` already owns the wording — History
     * and the receipt would otherwise be two places describing one run.
     */
    sessionType: row.session_type ?? DEFAULT_SESSION_TYPE,
    distanceKm: row.distance_km,
    durationMin: Math.min(599, Math.max(1, row.duration_min ?? derived)),
    sets: working.length,
    /**
     * WHAT YOU WROTE, given back to you. "Anything worth remembering?" was
     * asked at the end of every session, stored on the row, and shown on no
     * screen in the app — not the receipt you land on, not the receipt you
     * come back to, not History, not the correction editor, not the CSV. The
     * app asked an open question at the most loaded moment of the session and
     * swallowed the answer.
     */
    notes: row.notes ?? null,
    /**
     * Every set, in the order they were done, so the receipt can show what the
     * session WAS. Warm-ups included and marked as such: a session of five
     * sets where one was a warm-up reads wrong if the warm-up is simply
     * missing.
     */
    loggedSets: [...sets].sort(inWorkoutOrder).map((set) => ({
      exercise: set.exercise,
      weightKg: set.weight_kg,
      reps: set.reps,
      setNumber: set.set_number,
      kind: set.set_kind ?? "working",
    })),
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
    /**
     * Write today's swaps, additions, order and rest into the program.
     *
     * Only the person's yes: WHAT can be kept is `keepableChanges`, on the
     * server, so this cannot smuggle a lift into a schedule.
     */
    keepChanges?: boolean
  }
): Promise<WorkoutSummary> {
  const supabase = await createServerSupabaseClient()

  const { data: row, error: rowError } = await supabase
    .from("workout_logs")
    .select("id, ended_at, started_at")
    .eq("id", workoutId)
    .eq("user_id", userId)
    .maybeSingle()
  if (rowError) throw readRefused("that workout", rowError)
  /**
   * THE COMMONEST TWO-DEVICE SEQUENCE OF ALL, and it used to miss every one of
   * the answers built for it.
   *
   * Discard on the laptop, press Save on the phone. This read runs BEFORE
   * `requireLive`, so it was the first thing to notice — and it threw a bare
   * `Error`, which carries no `code`, so the screen kept the finish sheet open
   * over a workout that no longer exists and invited a Save that can only fail
   * again. Every `workout_gone` branch added on 2026-09-26 sat downstream of
   * this line and was never reached.
   */
  if (!row) throw new WorkoutGone("discarded")
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
   * AND THE START CANNOT BE AFTER THE FIRST SET YOU TICKED.
   *
   * The start moves for a session written up afterwards, and nothing stopped it
   * moving PAST the sets already in the workout — leaving rows timed before the
   * workout they belong to had begun. Every later reading of those sets (the
   * day they are filed under, which workout they count towards, whether they
   * were a personal best "before" something) is then measured from a start
   * they precede.
   *
   * Named with the time, in the account's zone, because "that is too late" is
   * not actionable and the person is looking at a field they can correct.
   */
  const firstSet = live.sets
    .map((set) => set.completedAt)
    .filter((at): at is string => Boolean(at))
    .sort()[0]
  if (input.startedAt && firstSet && new Date(input.startedAt).getTime() > new Date(firstSet).getTime()) {
    const at = new Date(firstSet).toLocaleTimeString(DISPLAY_LOCALE, {
      hour: "2-digit",
      minute: "2-digit",
      timeZone: await getUserTimezone(userId),
    })
    throw new Error(`Started cannot be after your first set at ${at}.`)
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
    /**
     * A REFUSAL THE PERSON CAN ACT ON KEEPS ITS OWN WORDS.
     *
     * 55000 is how every program-write function in the database says no on
     * purpose — here, "Your program moved on while this was being recalculated
     * — reload and try again". That sentence was written to be read, and the
     * first version of the block below swallowed it into a generic one. Caught
     * by `workoutRepoFinish.test.ts`, which exists for exactly this.
     */
    const deliberate = databaseRefusal(error)
    if (deliberate) throw deliberate
    /**
     * AND WHEN THERE IS NO SUMMARY, ASK WHY — because the database's guess is
     * wrong in exactly the case that matters.
     *
     * `finish_program_workout` locks the row with
     * `WHERE id = … AND started_at IS NOT NULL AND ended_at IS NULL` and, on
     * zero rows, raises "That workout has already been finished". Its own
     * comment says "Zero rows means somebody (or some retry) already finished
     * it" — which is an assumption, and a workout DELETED on another device
     * satisfies that WHERE clause just as emptily. The training suite hit it on
     * 2026-09-26: a seeded workout vanished mid-flight and the run reported a
     * finish that had never happened as one that had happened twice.
     */
    await refuseWrite(userId, workoutId, error, "That workout could not be finished.")
  }

  /**
   * AND THEN, SEPARATELY, KEEP THE CHANGES — after the transaction, never
   * inside it.
   *
   * `updateEnrollmentSchedule` re-reads the enrollment, so it has to run once
   * the RPC has committed: the cursor and the exercise state it reads must be
   * the advanced ones, or it would write yesterday's program back over today's
   * result.
   *
   * IF THIS FAILS, THE FINISH STILL STANDS. An hour of training is saved and
   * the program is not changed, which are two different facts — so the summary
   * carries the second one rather than the whole finish reporting failure.
   */
  let scheduleNotKept: true | undefined
  if (input.keepChanges && live.enrollmentId) {
    try {
      await keepTodaysChanges(userId, live)
    } catch (e) {
      console.error("keep changes:", e)
      scheduleNotKept = true
    }
  }

  const summary = await requireSummary(userId, workoutId)
  return scheduleNotKept ? { ...summary, scheduleNotKept } : summary
}

/**
 * Write the day's swaps, additions, order and rest into the enrollment.
 *
 * Split out because the finish is long enough already, and because this is the
 * one place that turns "what happened today" into "what the program asks for
 * next time" — a reader looking for that should find it in one piece.
 */
async function keepTodaysChanges(userId: string, live: LiveWorkout): Promise<void> {
  if (!live.enrollmentId || !live.dayId) return
  const enr = await getEnrollmentById(userId, live.enrollmentId)
  if (!enr) throw new Error("That program was not found")
  const catalogProgram = requireProgram(enr.program_id)
  /**
   * A week-by-week plan cannot be edited — `updateEnrollmentSchedule` refuses
   * it, and the sheet says so instead of offering the switch. Checked here as
   * well because this is the caller that would otherwise turn a refusal into
   * an amber warning nobody can act on.
   */
  if (!isCustomizable(catalogProgram)) return

  const prescription = computePrescription(programFor(enr), enr)
  const keepable = keepableChanges(prescription, live.adjustments, live.sets, libraryExercise)
  if (!keepable.any) return

  const { schedule, workingWeights } = applyAdjustmentsToSchedule(
    // The schedule as it stands, materialised if the program has never been
    // edited: a catalogue program has no `custom_schedule` row to edit.
    enr.customSchedule ?? materializeSchedule(catalogProgram),
    live.dayId,
    keepable,
    libraryExercise
  )
  await updateEnrollmentSchedule(userId, live.enrollmentId, schedule, workingWeights)
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
  // Closed a moment ago and unreadable now means deleted between the two
  // statements — which is the same news, and the screen acts on the code.
  if (!summary) throw new WorkoutGone("discarded")
  return summary
}

/** Throw the workout away. Nothing is recorded. */
export async function discardWorkout(userId: string, workoutId: string): Promise<void> {
  await requireLive(userId, workoutId)
  const supabase = await createServerSupabaseClient()
  const { error } = await supabase.from("workout_logs").delete().eq("id", workoutId).eq("user_id", userId)
  if (error) await refuseWrite(userId, workoutId, error, "That workout could not be thrown away.")
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * A live set in the shape the history functions read — INCLUDING its library
 * id, because they key on it.
 *
 * This said the opposite, and was right when it was written: "`library_id` is
 * null because nothing downstream of here matches on it: both the record check
 * and the first-time check key on the lift's name." On 2026-09-27 both were
 * converted to `liftKey` — `library_id ?? name` — to stop the app announcing a
 * new best below the real one, and THIS adapter was not. So the stored history
 * keyed on `lib_bench_press` and today's sets keyed on `"bench press"`, and
 * they never matched:
 *
 *   WHAT YOU DID       Bench Press  61 kg × 5
 *   First time logged: Bench Press          <- on the fifth bench session
 *
 * `detectPersonalRecords` hit `if (!prev) continue` for every library lift and
 * `firstTimeLifts` announced every one, on every workout, frozen into the row
 * at finish. A lift the library has never heard of kept working, which is what
 * made it look fine in passing.
 *
 * Derived the same way `completeSet` derives the column it writes, so the
 * adapter produces the shape the database actually holds.
 *
 * EXPORTED FOR ITS TEST, deliberately. The regression was in this function and
 * nowhere else, and a test that re-derives the key the way this does would
 * pass with the bug back in — which the first attempt at one did.
 */
export function toSetRow(s: LiveWorkoutSet): WorkoutSetRow {
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
    library_id: libraryByName(s.exercise)?.id ?? null,
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
    // Retryable, for the same reason as `readRefused`: a 4xx here makes the
    // offline queue delete the set rather than send it again.
    console.error(`could not read the training unit for ${userId}: ${error.message}`)
    throw new CouldNotTell("whether you train in kilos or pounds")
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
  if (error) throw readRefused("your past sets", error)

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
    /**
     * THE ENROLLMENT'S BAR OVERRIDES THE ACCOUNT'S; the plate comes from the
     * account, which is the only place it is set.
     *
     * A VALUE STILL AT THE COLUMN DEFAULT IS ONE NOBODY CHOSE. `profiles`
     * stores both in KILOGRAMS and both columns are NOT NULL with kg
     * defaults, so an account that has never touched them arrives here as
     * 20 / 1.25 — and passing those through converts them. On a pounds
     * enrolment that is a 44.09 lb bar and a 2.76 lb smallest plate, which
     * also filters the real 2.5 lb plate out of the set:
     *
     *   Overhead Press  75 lb × 5 …
     *   Bar: 10 + 5 per side (makes 74.09 lb)
     *
     * 75 lb is exactly loadable, and the hint flagged it approximate with a
     * two-decimal number nobody can load. Meanwhile `enrollment.plates`,
     * built from the same unit through the same function, correctly said 45
     * and 2.5 — two paths, two bars, on one row. It never showed in kg
     * because there the account defaults and the unit defaults are the same
     * numbers.
     *
     * A number somebody TYPED is theirs and is converted as before.
     */
    plates: plateSetupFor(
      enr.barWeightKg ?? (account.barWeightKg === DEFAULT_BAR_KG ? null : account.barWeightKg),
      enr.unitSystem,
      account.smallestPlateKg === DEFAULT_PLATE_KG ? null : account.smallestPlateKg
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
    /** The row this replaces, or null for one the editor added. */
    id?: string | null
    /** When it was ticked, carried so the workout keeps its true order. */
    completedAt?: string | null
    /** Which prescribed slot it answered. */
    prescribedIndex?: number | null
    rpe?: number | null
  }>,
  /**
   * The ids the editor LOADED — not the ones it is submitting.
   *
   * Optional, so a client that does not send it saves exactly as before: this
   * cannot start refusing on information it was never given.
   */
  basedOn?: string[]
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
  if (error) throw readRefused("that workout", error)
  /**
   * DELETED WHILE THE EDITOR WAS OPEN — a refusal, not a crash.
   *
   * A bare `Error` is a 500 through `statusFor`, so the one race this whole
   * area exists for answered "something went wrong" on the correction screen
   * while the identical race on a set write answered 409 `workout_gone` and
   * the live screen acted on it. One cause, two answers, and only this one
   * read as a bug in the app.
   */
  if (!log) throw new WorkoutGone("discarded")
  if (isOpenWorkout(log as { started_at: string | null; ended_at: string | null })) {
    throw new ProgramRefused("That workout is still open — finish it before correcting it.")
  }

  /**
   * THE SAVE IS CHECKED AGAINST WHAT THE SCREEN READ.
   *
   * `replace_sets_and_replay` deletes every set and inserts the payload, with
   * no version and no comparison — so two devices correcting one workout each
   * replace the whole list and the later save wins whole. Measured: B removed
   * two squat sets and saved (2 sets, 650 kg); A, holding a read from before
   * that, changed a bench weight and saved — and the two sets B deleted CAME
   * BACK (4 sets, 1675 kg), with no warning on either screen.
   *
   * `basedOn` IS THE IDS THE EDITOR LOADED, not the ids it is submitting, and
   * the difference is the whole guard. The first version derived the list from
   * the payload — which is missing exactly the rows the person just deleted, so
   * every deletion looked like a workout that had changed underneath and was
   * refused. The training matrix caught it; the unit test did not, because it
   * modelled a payload rather than the flow.
   *
   * Compared as a SET, because swapping one set for another keeps the count.
   */
  /**
   * `!== undefined`, NOT `length > 0`. An editor that loaded a workout with no
   * sets in it sends `[]` — a read like any other — so testing for a non-empty
   * list skipped the guard for precisely the workout where sets appearing from
   * another device are invisible. Only a client that sends nothing at all is
   * exempt, and `basedOn` is optional in the schema for exactly that.
   */
  if (basedOn !== undefined) {
    // Paged, like every other read of this table: a workout with more than a
    // thousand sets would otherwise come back short and every save would be
    // refused as "changed on another device".
    const current = await readAllRows<{ id: string }>("that workout's sets", (from, to) =>
      supabase.from("workout_sets").select("id").eq("log_id", workoutId).order("id").range(from, to)
    )
    const live = new Set(current.map((row) => row.id))
    const changed =
      live.size !== basedOn.length || basedOn.some((id) => !live.has(id))
    if (changed) {
      throw new ProgramRefused(
        "This workout changed on another device while you were editing it. Reload to see what it says now, then correct it again."
      )
    }
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
    /**
     * WHEN THE SET WAS TICKED, AND WHICH SLOT IT ANSWERED — carried back.
     *
     * These two were the other half of the parked migration, and without them
     * that migration fixes nothing: `replace_sets_and_replay` now KEEPS both
     * columns, but this payload never sent them, so every corrected row still
     * arrived with `completed_at` null. The migration's own header claimed
     * "the repo already sends both fields"; `CorrectedSet` declares them and
     * this mapping dropped them one line later.
     *
     * `inWorkoutOrder` sorts on `completed_at` first and puts rows without one
     * LAST, so a null here is not a cosmetic loss: the workout stops reading in
     * the order it was performed and reverts to slot order, permanently,
     * because the instants are gone. `prescribed_index` going null turns every
     * corrected program set into one the app reads as "added on the day".
     *
     * `?? null` rather than omitting the key: `jsonb_populate_recordset` reads
     * a missing key as null anyway, and an explicit null says the editor meant
     * it — a set somebody ADDED in the editor genuinely has neither.
     */
    completed_at: set.completedAt ?? null,
    prescribed_index: set.prescribedIndex ?? null,
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
    const deliberate = databaseRefusal(written)
    if (deliberate) throw deliberate
    console.error(`revise workout ${workoutId} failed (code ${written.code}): ${written.message}`)
    throw new Error("Those sets could not be saved, so the workout was left as it was.")
  }

  /**
   * THE RECEIPT'S STORED HALF IS NOW WRONG, so it stops claiming to be right.
   *
   * `progression_changes` and `personal_records` are written at the finish and
   * read back verbatim — deliberately, so the record of what somebody was told
   * cannot drift. A correction recomputes the program's weights and left both
   * columns alone, so the two halves of one screen disagreed. Measured:
   * removing a squat set rolled the state back to 40 kg and set the next
   * prescription to 40, while the same screen still read "Squat: Hit all reps
   * → +2.5kg". The totals above it DID update, so the page was half
   * recomputed and half frozen with nothing saying which.
   *
   * Nulled rather than recomputed, because null already means "not kept for
   * this workout" and `summaryFor` renders it as a sentence
   * (`changesUnavailable`). Recomputing would be worse: what somebody was told
   * at the time is not a thing this screen may invent afterwards.
   */
  const { error: cleared } = await supabase
    .from("workout_logs")
    .update({ progression_changes: null, personal_records: null })
    .eq("id", workoutId)
    .eq("user_id", userId)
  if (cleared) {
    console.error(`could not clear the superseded receipt on ${workoutId}: ${cleared.message}`)
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
