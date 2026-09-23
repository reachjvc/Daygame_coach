/**
 * The three numbers a progress view is built on.
 *
 * Each is a pure function so it can be argued with. The rules they encode are
 * not obvious and every one of them is a decision:
 *
 * - a day still to come is not a missed day
 * - warm-ups are not work, and a set counted in seconds is not volume
 * - the heaviest single and the best estimated max are DIFFERENT achievements
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest"
import * as fs from "fs"
import * as path from "path"
import { adherenceThisWeek, weeklyVolume, liftBests, progressSnapshot } from "@/src/health/healthService"
import type { WorkoutLogRow, WorkoutLogWithSets, WorkoutSetRow } from "@/src/health/types"

/**
 * Wednesday 2026-08-19, noon in Copenhagen — an INSTANT, and the zone beside
 * it decides which day and which week that is.
 *
 * It used to be `new Date(2026, 7, 19, 12)`, a machine-local Date, which meant
 * these tests agreed with the code by sharing its bug: both read the process's
 * clock. A machine in Kiritimati (UTC+14) filed the same session two days
 * later and no test noticed.
 */
const TZ = "Europe/Copenhagen"
const WEDNESDAY = new Date("2026-08-19T12:00:00+02:00")

const log = (date: string, sets: Partial<WorkoutSetRow>[] = []): WorkoutLogWithSets =>
  ({
    id: date,
    user_id: "u1",
    session_type: "weights",
    duration_min: 60,
    intensity: 3,
    logged_at: new Date(`${date}T12:00:00+02:00`).toISOString(),
    sets: sets.map((s, i) => ({
      id: `${date}-${i}`,
      log_id: date,
      exercise: "Squat",
      weight_kg: 100,
      reps: 5,
      set_number: i + 1,
      set_kind: "working",
      notes: null,
      exercise_notes: null,
      exercise_id: null,
      library_id: null,
      prescribed_index: null,
      completed_at: null,
      rpe: null,
      side: null,
      ...s,
    })) as WorkoutSetRow[],
  }) as unknown as WorkoutLogWithSets

describe("adherenceThisWeek", () => {
  it("counts the workouts done since Monday", () => {
    const a = adherenceThisWeek(
      [log("2026-08-17"), log("2026-08-19")] as unknown as WorkoutLogRow[],
      4,
      WEDNESDAY,
      TZ
    )
    expect(a.done).toBe(2)
    expect(a.planned).toBe(4)
  })

  it("does not count a day that has not happened yet as a miss", () => {
    const a = adherenceThisWeek([], 4, WEDNESDAY, TZ)
    const future = a.days.filter((d) => d.future).map((d) => d.date)
    expect(future, "Thursday to Sunday are still to come").toEqual([
      "2026-08-20",
      "2026-08-21",
      "2026-08-22",
      "2026-08-23",
    ])
  })

  it("runs Monday to Sunday", () => {
    const a = adherenceThisWeek([], 3, WEDNESDAY, TZ)
    expect(a.days).toHaveLength(7)
    expect(a.days[0].date).toBe("2026-08-17")
    expect(a.days[6].date).toBe("2026-08-23")
  })

  it("ignores last week's workouts", () => {
    const a = adherenceThisWeek([log("2026-08-14")] as unknown as WorkoutLogRow[], 3, WEDNESDAY, TZ)
    expect(a.done).toBe(0)
  })
})

describe("weeklyVolume", () => {
  it("adds up weight times reps for working sets", () => {
    const weeks = weeklyVolume([log("2026-08-19", [{}, {}])], WEDNESDAY, 2, TZ)
    expect(weeks.at(-1)).toMatchObject({ weekStart: "2026-08-17", volumeKg: 1000, sets: 2 })
  })

  it("leaves warm-ups and drop sets out, because they are not the work", () => {
    const weeks = weeklyVolume(
      [log("2026-08-19", [{ set_kind: "warmup" }, { set_kind: "drop" }, {}])],
      WEDNESDAY,
      2,
      TZ
    )
    expect(weeks.at(-1)!.sets, "only the working set counts").toBe(1)
    expect(weeks.at(-1)!.volumeKg).toBe(500)
  })

  it("reports an empty week as zero rather than leaving a gap in the chart", () => {
    const weeks = weeklyVolume([log("2026-08-19", [{}])], WEDNESDAY, 3, TZ)
    expect(weeks).toHaveLength(3)
    expect(weeks[0]).toMatchObject({ volumeKg: 0, sets: 0 })
  })
})

/**
 * THE ACCOUNT'S CALENDAR, PASSED IN.
 *
 * `liftBests` used to read the day off whatever clock the code was running on —
 * the browser's, and then the server's (UTC) the moment this moved server-side.
 * A 23:30 Copenhagen set would have been filed on the previous day. The
 * timezone is now a required argument, so the class of bug is unrepresentable.
 */
describe("liftBests", () => {
  it("reports the heaviest single set with the day it happened", () => {
    const bests = liftBests([
      log("2026-08-10", [{ weight_kg: 100, reps: 5 }]),
      log("2026-08-17", [{ weight_kg: 110, reps: 3 }]),
    ], TZ)
    expect(bests[0]).toMatchObject({ bestWeightKg: 110, bestWeightReps: 3, bestWeightDate: "2026-08-17" })
  })

  it("treats more reps at the same weight as a better best", () => {
    const bests = liftBests([
      log("2026-08-10", [{ weight_kg: 100, reps: 5 }]),
      log("2026-08-17", [{ weight_kg: 100, reps: 8 }]),
    ], TZ)
    expect(bests[0].bestWeightReps).toBe(8)
  })

  /**
   * The point of the second number: 100×8 is a harder set than 110×1, and the
   * heaviest-single figure cannot see that.
   */
  it("keeps a separate best for the estimated max", () => {
    const bests = liftBests([
      log("2026-08-10", [{ weight_kg: 110, reps: 1 }]),
      log("2026-08-17", [{ weight_kg: 100, reps: 8 }]),
    ], TZ)
    expect(bests[0].bestWeightKg, "the heaviest single is still the heaviest single").toBe(110)
    expect(bests[0].bestEstimatedMaxKg).toBeCloseTo(126.7, 0)
    expect(bests[0].bestEstimatedDate).toBe("2026-08-17")
  })

  it("does not let a twenty-rep set be announced as a max nobody has lifted", () => {
    const bests = liftBests([log("2026-08-17", [{ weight_kg: 60, reps: 20 }])], TZ)
    expect(bests[0].bestEstimatedMaxKg, "capped at the weight itself above ten reps").toBe(60)
  })

  it("ignores warm-ups", () => {
    const bests = liftBests([
      log("2026-08-17", [{ weight_kg: 200, reps: 1, set_kind: "warmup" }, { weight_kg: 100, reps: 5 }]),
    ], TZ)
    expect(bests[0].bestWeightKg).toBe(100)
  })

  it("keeps each lift separate and puts the strongest first", () => {
    const bests = liftBests([
      log("2026-08-17", [
        { exercise: "Squat", weight_kg: 140, reps: 5 },
        { exercise: "Bench Press", weight_kg: 100, reps: 5 },
      ]),
    ], TZ)
    expect(bests.map((b) => b.exercise)).toEqual(["Squat", "Bench Press"])
  })
})

/**
 * THE TWO THINGS THE FIRST VERSION OF THESE TESTS ONLY CLAIMED.
 *
 * The docstring said a set counted in seconds was left out of the volume total.
 * It was not, and no test checked — so a 3 × 30 s carry at 40 kg contributed
 * 3,600 kg and outranked a 5 × 5 squat at 100 kg on the chart the whole feature
 * exists for. And a pull-up came out as "0 kg × 12 · est. max 0", which is not
 * a fact about anything.
 */
describe("work that is not weight times reps", () => {
  it("leaves a timed lift out of the weekly total", () => {
    // "Plank" is in the library and marked as timed; the 30 is seconds.
    const weeks = weeklyVolume(
      [log("2026-08-19", [{ exercise: "Plank", weight_kg: 40, reps: 30 }, { weight_kg: 100, reps: 5 }])],
      WEDNESDAY,
      2,
      TZ
    )
    expect(weeks.at(-1)!.volumeKg, "only the squat counts").toBe(500)
    /**
     * BUT THE PLANK IS STILL A SET. It used to be skipped entirely, so a
     * session of carries and holds counted as no work at all on the chart —
     * while the finish screen counted every working set including those. Two
     * numbers for one fact. It moves no WEIGHT, which is what the bar
     * measures, and it counts as the set it was.
     */
    expect(weeks.at(-1)!.sets, "the plank happened").toBe(2)
  })

  it("does not put a timed hold in your bests as a one-rep max", () => {
    const bests = liftBests([log("2026-08-19", [{ exercise: "Plank", weight_kg: 40, reps: 45 }])], TZ)
    expect(bests.find((b) => b.exercise === "Plank")).toBeUndefined()
  })

  it("marks a lift with nothing loaded on it as bodyweight", () => {
    const bests = liftBests([log("2026-08-19", [{ exercise: "Pull-up", weight_kg: 0, reps: 12 }])], TZ)
    expect(bests[0]).toMatchObject({ exercise: "Pull-up", bodyweight: true, bestWeightReps: 12 })
  })

  it("stops calling it bodyweight once weight is added to it", () => {
    const bests = liftBests([
      log("2026-08-10", [{ exercise: "Pull-up", weight_kg: 0, reps: 12 }]),
      log("2026-08-19", [{ exercise: "Pull-up", weight_kg: 20, reps: 5 }]),
    ], TZ)
    expect(bests[0]).toMatchObject({ bodyweight: false, bestWeightKg: 20 })
  })
})

/**
 * WHOSE CLOCK — the question this whole file used to answer wrongly.
 *
 * Every "which day / which week was this" bucketed on a machine-local `Date`.
 * In the browser that was the lifter's own phone, which is usually right by
 * accident; on the server it is UTC, and these functions moved server-side.
 *
 * THE FIXTURE HAS TO CROSS A WEEK BOUNDARY, not just a day one, or the test
 * agrees with the bug. My first version used a late MONDAY session, and
 * reverting the fix did not fail it: Monday 23:30 in New York is Tuesday
 * afternoon in Kiritimati, which is the same week either way. A late SUNDAY
 * session is the case that separates them — Sunday 23:30 in New York is Monday
 * in Kiritimati, and Monday is a different WEEK.
 *
 * The process runs in Kiritimati (UTC+14), fourteen hours from the account's
 * zone, so a function that still reads the machine cannot pass by coincidence.
 */
describe("the account's calendar, not the machine's", () => {
  const NY = "America/New_York"
  /**
   * Sunday 2026-08-16, 23:30 in New York.
   *   New York:   Sunday the 16th — the last day of the week beginning Mon 10th.
   *   Kiritimati: Monday the 17th — the FIRST day of the next week.
   */
  const LATE_SUNDAY = "2026-08-17T03:30:00Z"
  /** Wednesday the 12th in New York: inside the week that contains the session. */
  const MIDWEEK = new Date("2026-08-12T16:00:00Z")

  let realTZ: string | undefined
  beforeEach(() => {
    realTZ = process.env.TZ
    process.env.TZ = "Pacific/Kiritimati"
  })
  afterEach(() => {
    process.env.TZ = realTZ
  })

  const lateSunday = (sets: Partial<WorkoutSetRow>[] = [{}]): WorkoutLogWithSets =>
    ({
      id: "late",
      user_id: "u1",
      session_type: "weights",
      duration_min: 60,
      intensity: 3,
      logged_at: LATE_SUNDAY,
      sets: sets.map((over, i) => ({
        id: `late-${i}`,
        log_id: "late",
        exercise: "Squat",
        weight_kg: 100,
        reps: 5,
        set_number: i + 1,
        set_kind: "working",
        notes: null,
        exercise_notes: null,
        exercise_id: null,
        library_id: null,
        prescribed_index: null,
        completed_at: null,
        rpe: null,
        side: null,
        ...over,
      })) as WorkoutSetRow[],
    }) as unknown as WorkoutLogWithSets

  it("counts a Sunday-night workout on Sunday, in that week", () => {
    const week = adherenceThisWeek([lateSunday()] as unknown as WorkoutLogRow[], 4, MIDWEEK, NY)
    expect(week.days[0].date, "the week begins on Monday the 10th").toBe("2026-08-10")
    const sunday = week.days.find((d) => d.date === "2026-08-16")
    expect(sunday!.done, "the session was Sunday night").toBe(true)
    expect(week.done).toBe(1)
  })

  it("files its volume in the week that Sunday belongs to", () => {
    const weeks = weeklyVolume([lateSunday()], MIDWEEK, 2, NY)
    expect(weeks.at(-1)).toMatchObject({ weekStart: "2026-08-10", volumeKg: 500 })
  })

  it("dates the best it set on Sunday", () => {
    const bests = liftBests([lateSunday()], NY)
    expect(bests[0].bestWeightDate).toBe("2026-08-16")
  })

  it("is the same answer whatever the machine is set to", () => {
    const inKiritimati = weeklyVolume([lateSunday()], MIDWEEK, 2, NY)
    process.env.TZ = "Europe/London"
    const inLondon = weeklyVolume([lateSunday()], MIDWEEK, 2, NY)
    expect(inLondon).toEqual(inKiritimati)
  })
})

/**
 * AND THE DEBT IS NAMED, so it cannot quietly grow back.
 *
 * Three ways this file can still derive a calendar fact from the machine's
 * clock: `localDateKey`, `mondayOf`, and `periodStartFor` given a `Date` that
 * has not been through `toZonedDate`. Two functions still do it — the activity
 * heatmap and the week streak — and neither is one of this phase's screens.
 * Every other function in the file takes the account's zone as an argument.
 *
 * The counts may only fall. A new call site is a new screen filing somebody's
 * Sunday-night session on Monday.
 */
describe("what is still on the machine's clock", () => {
  /**
   * Comments blanked first: a sentence ABOUT the rule is not a call to it.
   * Without this the guard reported the very comment explaining that
   * `periodStartFor` is given the account's zone.
   */
  const SOURCE = fs
    .readFileSync(path.resolve(__dirname, "../../../src/health/healthService.ts"), "utf-8")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\/\/[^\n]*/g, "")

  const ALLOWED: Record<string, number> = {
    buildWorkoutHeatmapWeeks: 4,
    computeWeekStreak: 2,
  }

  /** The source split into top-level function bodies, by their declarations. */
  function bodies(): Record<string, string> {
    const out: Record<string, string> = {}
    const declarations = [...SOURCE.matchAll(/^(?:export )?function (\w+)/gm)]
    for (let i = 0; i < declarations.length; i++) {
      const from = declarations[i].index!
      const to = i + 1 < declarations.length ? declarations[i + 1].index! : SOURCE.length
      out[declarations[i][1]] = SOURCE.slice(from, to)
    }
    return out
  }

  /** Calendar arithmetic on a Date nobody has told the zone to. */
  function machineClockUses(body: string): number {
    const helpers = (body.match(/\b(localDateKey|mondayOf)\(/g) ?? []).length
    /**
     * `periodStartFor(period, toZonedDate(...))` is the honest form; anything
     * else hands it whatever zone the process happens to run in. Checked per
     * call rather than with one regex, because the honest form nests a `)`
     * inside the argument list and a single pattern reads that as the end of
     * the call — which is how my first version of this guard reported the two
     * functions I had just fixed.
     */
    const bare = (body.match(/periodStartFor\([^\n]*/g) ?? []).filter(
      (call) => !call.includes("toZonedDate")
    ).length
    return helpers + bare
  }

  it("is used only inside the two functions that are still owed the fix", () => {
    const offenders: string[] = []
    for (const [name, body] of Object.entries(bodies())) {
      // The two helpers themselves are where the machine-local arithmetic
      // lives; that is what they are.
      if (name === "localDateKey" || name === "mondayOf") continue
      const hits = machineClockUses(body)
      if (hits === 0) continue
      const allowed = ALLOWED[name] ?? 0
      if (hits > allowed) offenders.push(`${name}: ${hits}, allowed ${allowed}`)
    }
    expect(
      offenders,
      "These decide a calendar fact from the machine's clock. Take the\n" +
        "account's timezone as an argument, the way every other function in\n" +
        "this file now does:\n" +
        offenders.join("\n")
    ).toEqual([])
  })

  it("the allowance only shrinks", () => {
    const found = bodies()
    const stale = Object.entries(ALLOWED)
      .filter(([name, n]) => machineClockUses(found[name] ?? "") < n)
      .map(([name, n]) => `${name}: allowance ${n}, actual ${machineClockUses(found[name] ?? "")}`)
    expect(stale, `Fixed — lower these in ALLOWED:\n${stale.join("\n")}`).toEqual([])
  })
})

/**
 * ONE SNAPSHOT, AND "EMPTY" IS A FACT ABOUT THE ACCOUNT.
 *
 * The Progress tab used to download a year of workouts with every set attached
 * and do this arithmetic in the browser, while the lift panel inside it
 * downloaded three years of the same rows again. Two reads of one table for
 * one screen, on a phone, after the screen had already painted — and the
 * browser's clock deciding which week "this week" was.
 *
 * The distinction that matters here is the one a screen gets wrong: an account
 * with a workout in it is NOT empty, even when every number it produces is
 * zero. Telling somebody "nothing logged yet" the day after they trained is
 * how a screen loses them.
 */
describe("progressSnapshot", () => {
  const TZ = "Europe/Copenhagen"
  const NOW = new Date("2026-08-19T12:00:00+02:00")

  it("is empty only when there are no finished workouts", () => {
    expect(progressSnapshot([], { timezone: TZ, now: NOW }).empty).toBe(true)

    // One workout of warm-ups: every figure is zero and the account is not
    // empty.
    const warmupsOnly = progressSnapshot(
      [log("2026-08-19", [{ set_kind: "warmup" }])],
      { timezone: TZ, now: NOW }
    )
    expect(warmupsOnly.empty).toBe(false)
    expect(warmupsOnly.weeks.at(-1)!.volumeKg).toBe(0)
  })

  it("carries the week, the bars, the bests and the lines in one object", () => {
    const snapshot = progressSnapshot(
      [log("2026-08-17", [{}, {}]), log("2026-08-19", [{}])],
      { timezone: TZ, now: NOW }
    )
    expect(snapshot.timezone).toBe(TZ)
    expect(snapshot.thisWeek.done).toBe(2)
    expect(snapshot.thisWeek.days).toHaveLength(7)
    expect(snapshot.weeks).toHaveLength(8)
    expect(snapshot.bests[0]).toMatchObject({ exercise: "Squat", bestWeightKg: 100 })
  })

  it("does not decide how many sessions a week was supposed to be", () => {
    // `planned` belongs to the running program, which this read knows nothing
    // about. The tab has it as a prop; a second source for it is a second
    // answer.
    const snapshot = progressSnapshot([log("2026-08-19", [{}])], { timezone: TZ, now: NOW })
    expect("planned" in snapshot.thisWeek).toBe(false)
  })

  it("reads the week in the account's zone, not the machine's", () => {
    const realTZ = process.env.TZ
    process.env.TZ = "Pacific/Kiritimati"
    try {
      // Sunday 23:30 in New York, which is Monday in Kiritimati.
      const sundayNight = {
        ...log("2026-08-19"),
        logged_at: "2026-08-17T03:30:00Z",
      } as WorkoutLogWithSets
      const snapshot = progressSnapshot([sundayNight], {
        timezone: "America/New_York",
        now: new Date("2026-08-12T16:00:00Z"),
      })
      expect(snapshot.thisWeek.days[0].date).toBe("2026-08-10")
      expect(snapshot.thisWeek.done).toBe(1)
    } finally {
      process.env.TZ = realTZ
    }
  })
})
