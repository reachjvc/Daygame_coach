/**
 * DOES A COUNTER REALLY USE THE USER'S CALENDAR? PROVED WITH A REAL ACCOUNT.
 *
 * Every account in this project is in Europe/Copenhagen, so no live data can
 * show the difference between the user's clock and the server's. This creates an
 * account in Pacific/Auckland — twelve hours away — seeds two sessions, and runs
 * the REAL `resolveMetricValues` against the REAL database.
 *
 * THE DECISIVE ROW: a session at 2026-08-23T15:00 UTC.
 *   In Auckland that is Monday 24 August, 03:00  -> THIS week.
 *   In Copenhagen it is Sunday 23 August, 17:00  -> LAST week.
 * Same row, same instant, two different answers. If the code used one clock for
 * everybody, both would return the same number and this test would fail.
 *
 * NOT part of `npm test` — it writes to the project database. Run it with
 *   npx vitest run --config vitest.manual.config.ts
 * and it deletes the account and every row it made, pass or fail.
 *
 * The only thing swapped out is the cookie-authenticated Supabase client, which
 * needs a live HTTP request. It is replaced by the service-role client — the
 * same one every write to `user_tracking_stats` already uses. Everything else is
 * the production path: `reconcileUserProgress` re-derives the counters from the
 * rows exactly as it does after a real session, and `resolveMetricValues` reads
 * the tiles exactly as the dashboard does.
 */

import { describe, it, expect, beforeAll, afterAll, vi } from "vitest"
import { createClient, type SupabaseClient } from "@supabase/supabase-js"
import fs from "fs"

function env(): Record<string, string> {
  return Object.fromEntries(
    fs.readFileSync(".env.local", "utf8").split("\n")
      .filter((l) => l.includes("=") && !l.trimStart().startsWith("#"))
      .map((l) => [
        l.slice(0, l.indexOf("=")).trim(),
        l.slice(l.indexOf("=") + 1).trim().replace(/^["']|["']$/g, ""),
      ])
  )
}

const e = env()
const admin: SupabaseClient = createClient(e.NEXT_PUBLIC_SUPABASE_URL, e.SUPABASE_SERVICE_ROLE_KEY)

// The repo layer asks for a cookie-authenticated client; there is no request
// here, so it gets the service-role one instead.
vi.mock("@/src/db/supabase", () => ({
  createServerSupabaseClient: vi.fn(async () => admin),
  createAdminSupabaseClient: vi.fn(() => admin),
}))

const { resolveMetricValues } = await import("@/src/db/metricsRepo")
const { loggedAtForEntry } = await import("@/src/health/healthService")
const {
  createWorkoutLog,
  getConsecutiveTrainingWeeks,
  getConsecutiveCardioWeeks,
  getWorkoutWeeklyCount,
  getCardioWeeklyCount,
  getRunningSessionsWeekly,
  getMobilitySessionsWeekly,
  getYogaSessionsWeekly,
  getNutritionWeeklyAvg,
  getSleepWeeklyAvgHours,
  getProteinDaysHitWeekly,
  getCalorieDaysHitWeekly,
} = await import("@/src/db/healthRepo")
const { reconcileUserProgress } = await import("@/src/tracking/achievementsSyncService")

/**
 * Everything below is relative to THIS week, not to a date typed into the file.
 *
 * The first version of this test used absolute dates that happened to be in the
 * current week when it was written, and started failing five days later. A test
 * about what "this week" means cannot hard-code which week that is.
 */
function mondayOfThisWeekUTC(): Date {
  const now = new Date()
  const weekday = (now.getUTCDay() + 6) % 7
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - weekday))
}

function fromThisMonday(days: number, hourUTC: number): string {
  const m = mondayOfThisWeekUTC()
  return new Date(Date.UTC(m.getUTCFullYear(), m.getUTCMonth(), m.getUTCDate() + days, hourUTC)).toISOString()
}

/**
 * The instant the whole file turns on: Sunday 15:00 UTC, the evening before this
 * week's Monday.
 *
 * Auckland is UTC+12, so its week began at Sunday 12:00 UTC — this is already
 * Monday there. Copenhagen is UTC+1 or +2, so its week begins at Sunday 22:00 or
 * 23:00 UTC — this is still Sunday there. One instant, two different weeks,
 * whatever the time of year.
 */
const STRADDLES_THE_BOUNDARY = fromThisMonday(-1, 15)

/** Tuesday midday: unambiguously this week everywhere. */
const UNAMBIGUOUSLY_THIS_WEEK = fromThisMonday(1, 12)

let userId = ""
const email = `counters-tz-check-${Date.now()}@daygame-coach.invalid`

beforeAll(async () => {
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password: `tz-${Math.abs(Date.now() | 0)}-check`,
    email_confirm: true,
  })
  if (error || !data.user) throw new Error(`Could not create the test account: ${error?.message}`)
  userId = data.user.id

  // The profile row is made by a trigger on auth.users; give it a moment, then
  // fail loudly rather than silently testing nothing.
  let profile = null
  for (let attempt = 0; attempt < 10 && !profile; attempt++) {
    const { data: p } = await admin.from("profiles").select("id").eq("id", userId).maybeSingle()
    profile = p
    if (!profile) await new Promise((r) => setTimeout(r, 300))
  }
  if (!profile) throw new Error("No profile row was created for the test account")

  // A session counts only when it is `end_reason: "completed"` with an
  // `ended_at`, and it is dated by `ended_at`. An approach is dated by
  // `timestamp` — NOT `created_at`, which is when the row reached the database.
  const { error: sessionError } = await admin.from("sessions").insert([
    { user_id: userId, started_at: STRADDLES_THE_BOUNDARY, ended_at: STRADDLES_THE_BOUNDARY, end_reason: "completed", is_active: false },
    { user_id: userId, started_at: UNAMBIGUOUSLY_THIS_WEEK, ended_at: UNAMBIGUOUSLY_THIS_WEEK, end_reason: "completed", is_active: false },
  ])
  if (sessionError) throw new Error(`Could not seed sessions: ${sessionError.message}`)

  const { error: approachError } = await admin.from("approaches").insert([
    { user_id: userId, timestamp: STRADDLES_THE_BOUNDARY, created_at: STRADDLES_THE_BOUNDARY },
    { user_id: userId, timestamp: UNAMBIGUOUSLY_THIS_WEEK, created_at: UNAMBIGUOUSLY_THIS_WEEK },
  ])
  if (approachError) throw new Error(`Could not seed approaches: ${approachError.message}`)

  const { count } = await admin.from("sessions").select("*", { count: "exact", head: true }).eq("user_id", userId)
  if (count !== 2) throw new Error(`Seeded 2 sessions, found ${count}`)

  // Four weeks of training in a row ending LAST week, with nothing yet this
  // week — the Monday-morning case the shipped code returned 0 for.
  const { error: workoutError } = await admin.from("workout_logs").insert(
    [-1, -2, -3, -4].map((weeksBack) => ({
      user_id: userId,
      session_type: "weights",
      duration_min: 60,
      intensity: 3,
      logged_at: fromThisMonday(weeksBack * 7 + 2, 17),
    }))
  )
  if (workoutError) throw new Error(`Could not seed workouts: ${workoutError.message}`)
})

afterAll(async () => {
  if (!userId) return
  await admin.from("sleep_logs").delete().eq("user_id", userId)
  await admin.from("nutrition_logs").delete().eq("user_id", userId)
  await admin.from("workout_logs").delete().eq("user_id", userId)
  await admin.from("approaches").delete().eq("user_id", userId)
  await admin.from("sessions").delete().eq("user_id", userId)
  await admin.from("user_tracking_stats").delete().eq("user_id", userId)
  await admin.auth.admin.deleteUser(userId)

  const { data: left } = await admin.from("sessions").select("id").eq("user_id", userId)
  if (left && left.length) throw new Error(`Cleanup missed ${left.length} session(s)`)
})

/**
 * Set the account's timezone, re-derive its counters from its rows the way every
 * write does, then read the tiles the way the dashboard does.
 */
async function weeklyCountsFor(timezone: string) {
  const { error } = await admin.from("profiles").update({ timezone }).eq("id", userId)
  if (error) throw new Error(`Could not set the timezone: ${error.message}`)

  await reconcileUserProgress(userId)

  return resolveMetricValues(
    userId,
    ["sessions_weekly", "approaches_weekly", "numbers_weekly", "sessions_cumulative", "approaches_cumulative"],
    timezone
  )
}

describe("a counter uses the account holder's calendar", () => {
  it("counts the boundary session for Auckland, where it is Monday", async () => {
    const values = await weeklyCountsFor("Pacific/Auckland")
    expect(values.sessions_weekly).toBe(2)
    expect(values.approaches_weekly).toBe(2)
  })

  it("does not count it for Copenhagen, where the same instant is Sunday", async () => {
    const values = await weeklyCountsFor("Europe/Copenhagen")
    expect(values.sessions_weekly).toBe(1)
    expect(values.approaches_weekly).toBe(1)
  })

  it("leaves the lifetime totals alone — they have no period to fall outside of", async () => {
    const auckland = await weeklyCountsFor("Pacific/Auckland")
    const copenhagen = await weeklyCountsFor("Europe/Copenhagen")
    expect(auckland.sessions_cumulative).toBe(copenhagen.sessions_cumulative)
    expect(auckland.approaches_cumulative).toBe(copenhagen.approaches_cumulative)
    expect(auckland.approaches_cumulative).toBe(2)
  })
})

describe("a training streak survives the Monday before you train", () => {
  /**
   * THE BUG THIS PINS, and it was live for every user:
   *
   * `getConsecutiveTrainingWeeks` built two lists of week labels with different
   * formulas — one normalised to midnight before converting, the other did not —
   * so east of London they were a day apart and never matched. It returned 0 no
   * matter how long you had trained.
   *
   * And even matched, it started at the CURRENT week and stopped at the first
   * empty one, so a Monday before training wiped the run.
   *
   * The seeded account trained four weeks running, most recently last week.
   */
  it("counts four, in Copenhagen", async () => {
    await admin.from("profiles").update({ timezone: "Europe/Copenhagen" }).eq("id", userId)
    expect(await getConsecutiveTrainingWeeks(userId, "Europe/Copenhagen")).toBe(4)
  })

  it("counts four in Auckland too — the formula is not zone-dependent", async () => {
    expect(await getConsecutiveTrainingWeeks(userId, "Pacific/Auckland")).toBe(4)
  })

  it("shows nothing once a whole week has gone by without training", async () => {
    // Asked as if from a zone where it is already a week later is not possible
    // here, so this asserts the boundary the other way: a workout list whose
    // last week is two weeks back is not a live run.
    // Delete the two most recent training weeks, leaving the run ending three
    // weeks ago — over, whatever week the test runs in.
    const { error } = await admin
      .from("workout_logs")
      .delete()
      .eq("user_id", userId)
      .gte("logged_at", fromThisMonday(-14, 0))
    if (error) throw new Error(error.message)

    expect(await getConsecutiveTrainingWeeks(userId, "Europe/Copenhagen")).toBe(0)
  })

  it("counts nothing this week, because nothing was logged this week", async () => {
    expect(await getWorkoutWeeklyCount(userId, "Europe/Copenhagen")).toBe(0)
  })
})

describe("a daily target is a fact about a day, not about a meal", () => {
  /**
   * THE BUGS THIS PINS, both live:
   *
   *  - both functions counted LOG ROWS, not days. Three 60g protein meals on
   *    one day — 180g, target hit — scored 0, because no single meal cleared
   *    150g. Two big meals on one day scored 2.
   *  - the calorie one counted rows where calories were AT OR ABOVE the target,
   *    while the tile promised "days where you stayed inside your calorie
   *    target". A day of heavy eating scored better than a disciplined one.
   *
   * The days below are inside this week, so they are inside the window whatever
   * day of the week the test runs on.
   */
  const monday = () => {
    const now = new Date()
    const day = (now.getUTCDay() + 6) % 7
    const m = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - day))
    return m
  }
  const dayInThisWeek = (offset: number, hour: number) => {
    const m = monday()
    return new Date(Date.UTC(m.getUTCFullYear(), m.getUTCMonth(), m.getUTCDate() + offset, hour)).toISOString()
  }

  beforeAll(async () => {
    await admin.from("sleep_logs").delete().eq("user_id", userId)
  await admin.from("nutrition_logs").delete().eq("user_id", userId)
    const { error } = await admin.from("nutrition_logs").insert([
      // Monday: three modest meals summing to 180g protein and 1,800 kcal.
      { user_id: userId, quality_score: 4, protein_g: 60, calories: 600, logged_at: dayInThisWeek(0, 9) },
      { user_id: userId, quality_score: 4, protein_g: 60, calories: 600, logged_at: dayInThisWeek(0, 13) },
      { user_id: userId, quality_score: 4, protein_g: 60, calories: 600, logged_at: dayInThisWeek(0, 19) },
      // Tuesday: one enormous meal — 200g protein, 3,000 kcal.
      { user_id: userId, quality_score: 2, protein_g: 200, calories: 3000, logged_at: dayInThisWeek(1, 13) },
      // Wednesday: two small meals — 1,800 kcal total, and only 100g protein.
      // This day exists to separate the right answer from the wrong one: with
      // it, "days inside the calorie target" is 2 and "rows at or above the
      // target" is 1, so the two implementations cannot both pass.
      { user_id: userId, quality_score: 5, protein_g: 50, calories: 900, logged_at: dayInThisWeek(2, 12) },
      { user_id: userId, quality_score: 5, protein_g: 50, calories: 900, logged_at: dayInThisWeek(2, 18) },
    ])
    if (error) throw new Error(`Could not seed nutrition: ${error.message}`)
  })

  it("counts the two days that reached the protein target", async () => {
    // Monday (60+60+60) and Tuesday (200). Wednesday totals 100 and does not.
    // The old row-counting code returned 1 — only Tuesday's single 200g row
    // cleared the bar on its own.
    expect(await getProteinDaysHitWeekly(userId, "Europe/Copenhagen", 150)).toBe(2)
  })

  it("counts the two days that stayed inside the calorie target", async () => {
    // Monday (1,800) and Wednesday (1,800). Tuesday's 3,000 does not.
    // The old code returned 1, and it was counting the 3,000-kcal day.
    expect(await getCalorieDaysHitWeekly(userId, "Europe/Copenhagen", 2000)).toBe(2)
  })
})

describe("every health counter, on the account holder's week", () => {
  /**
   * The other seven. Each of them goes through the same two shared helpers as
   * the ones already proved above, so each is right *by construction* — and
   * "by construction" is inference, not verification. These make them facts.
   *
   * The data is seeded inside this week deliberately: what is being checked is
   * that the week window is the user's, so the rows have to be inside it
   * whatever day of the week this runs on.
   */
  const monday = () => {
    const now = new Date()
    const day = (now.getUTCDay() + 6) % 7
    return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - day))
  }
  const inThisWeek = (offset: number, hour = 12) => {
    const m = monday()
    return new Date(Date.UTC(m.getUTCFullYear(), m.getUTCMonth(), m.getUTCDate() + offset, hour)).toISOString()
  }
  const weeksAgo = (n: number, hour = 12) => {
    const m = monday()
    return new Date(Date.UTC(m.getUTCFullYear(), m.getUTCMonth(), m.getUTCDate() - n * 7 + 1, hour)).toISOString()
  }

  beforeAll(async () => {
    await admin.from("workout_logs").delete().eq("user_id", userId)
    await admin.from("sleep_logs").delete().eq("user_id", userId)

    const workout = (session_type: string, logged_at: string, extra = {}) => ({
      user_id: userId, session_type, duration_min: 45, intensity: 3, logged_at, ...extra,
    })

    const { error } = await admin.from("workout_logs").insert([
      // This week: one of each kind.
      workout("cardio", inThisWeek(1)),
      workout("running", inThisWeek(2), { distance_km: 5 }),
      workout("mobility", inThisWeek(3)),
      workout("yoga", inThisWeek(4)),
      // Cardio in each of the two weeks before, so the cardio run is three.
      workout("cardio", weeksAgo(1)),
      workout("running", weeksAgo(2)),
    ])
    if (error) throw new Error(`Could not seed workouts: ${error.message}`)

    // bedtime/wake_time are timestamptz, not clock strings.
    const { error: sleepError } = await admin.from("sleep_logs").insert([
      { user_id: userId, bedtime: inThisWeek(1, 23), wake_time: inThisWeek(2, 7), quality: 4, logged_at: inThisWeek(2) },
      { user_id: userId, bedtime: inThisWeek(2, 0), wake_time: inThisWeek(2, 6), quality: 3, logged_at: inThisWeek(2, 8) },
    ])
    if (sleepError) throw new Error(`Could not seed sleep: ${sleepError.message}`)
  })

  it("counts this week's cardio, runs, mobility and yoga separately", async () => {
    expect(await getCardioWeeklyCount(userId, "Europe/Copenhagen")).toBe(1)
    expect(await getRunningSessionsWeekly(userId, "Europe/Copenhagen")).toBe(1)
    expect(await getMobilitySessionsWeekly(userId, "Europe/Copenhagen")).toBe(1)
    expect(await getYogaSessionsWeekly(userId, "Europe/Copenhagen")).toBe(1)
  })

  it("counts every kind of session towards the training total", async () => {
    // Four this week, of four different kinds.
    expect(await getWorkoutWeeklyCount(userId, "Europe/Copenhagen")).toBe(4)
  })

  it("counts three weeks in a row of cardio, including running", async () => {
    expect(await getConsecutiveCardioWeeks(userId, "Europe/Copenhagen")).toBe(3)
  })

  it("counts three weeks in a row of training", async () => {
    expect(await getConsecutiveTrainingWeeks(userId, "Europe/Copenhagen")).toBe(3)
  })

  it("averages this week's sleep in hours", async () => {
    // 23:00-07:00 is 8 hours, 00:00-06:00 is 6. Mean 7.
    expect(await getSleepWeeklyAvgHours(userId, "Europe/Copenhagen")).toBe(7)
  })

  it("averages this week's food quality", async () => {
    // Seeded by the nutrition block above: 4, 4, 4, 2, 5, 5.
    const avg = await getNutritionWeeklyAvg(userId, "Europe/Copenhagen")
    expect(avg).toBeCloseTo((4 + 4 + 4 + 2 + 5 + 5) / 6, 5)
  })
})

describe("a back-dated workout lands in the week it happened", () => {
  /**
   * THE WHOLE POINT OF THE DATE FIELD, checked end to end rather than in pieces.
   *
   * Everything else about back-dating is tested pure — the date turns into the
   * right instant, the instant reads back as the right date. None of that is
   * worth anything if the number on the tile does not move, and nothing was
   * asserting that the two halves meet.
   *
   * The saved row goes in through the real repo, and the counts come out through
   * the real health metrics, so what is asserted is what the screen would show.
   */
  const monday = () => {
    const now = new Date()
    const day = (now.getUTCDay() + 6) % 7
    return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - day))
  }
  const dateNDaysAgo = (n: number) => {
    const d = new Date(Date.now() - n * 24 * 3600 * 1000)
    return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`
  }
  const TZ = "Europe/Copenhagen"

  beforeAll(async () => {
    await admin.from("workout_logs").delete().eq("user_id", userId)
    await admin.from("profiles").update({ timezone: TZ }).eq("id", userId)
  })

  async function logOn(date: string, time?: string) {
    const loggedAt = loggedAtForEntry(date, TZ, time)
    if (loggedAt === null) throw new Error(`${date} ${time ?? ""} was refused as future`)
    // The repo writes with the user-scoped client, which is the admin client
    // here; that is the only substitution in this file.
    return createWorkoutLog(userId, {
      session_type: "weights", duration_min: 45, intensity: 3, logged_at: loggedAt,
    } as never)
  }

  it("counts towards last week when you say it happened last week", async () => {
    // Eight days ago is always in a previous week, whatever day it is today.
    await logOn(dateNDaysAgo(8))

    expect(await getWorkoutWeeklyCount(userId, TZ)).toBe(0)
    expect(await getConsecutiveTrainingWeeks(userId, TZ)).toBe(1)
  })

  it("moves this week's count when you say it happened today", async () => {
    await logOn(dateNDaysAgo(0))

    expect(await getWorkoutWeeklyCount(userId, TZ)).toBe(1)
    // Last week and this week, back to back.
    expect(await getConsecutiveTrainingWeeks(userId, TZ)).toBe(2)
  })

  it("counts two workouts on one day as two, and keeps them in order", async () => {
    // Yesterday, not today: an evening time today has not happened yet at the
    // hour this runs, and the code is right to refuse it. Yesterday is over.
    const yesterday = dateNDaysAgo(1)
    const morning = await logOn(yesterday, "06:30")
    const evening = await logOn(yesterday, "19:15")

    // Yesterday is in this week unless today is Monday, so this asserts the
    // total rather than a fixed number per week.
    const { count } = await admin
      .from("workout_logs").select("*", { count: "exact", head: true }).eq("user_id", userId)
    expect(count).toBe(4)
    expect(new Date(morning.logged_at).getTime()).toBeLessThan(
      new Date(evening.logged_at).getTime()
    )

    // And the repo hands them back oldest-first, which is what "last time you
    // trained" depends on. Two rows at the same instant used to be unordered.
    const { data } = await admin
      .from("workout_logs").select("logged_at")
      .eq("user_id", userId)
      .gte("logged_at", monday().toISOString())
      .order("logged_at", { ascending: true })
    const times = (data ?? []).map((r) => new Date(r.logged_at as string).getTime())
    expect([...times].sort((a, b) => a - b)).toEqual(times)
  })

  it("does not let a workout be dated into next week", async () => {
    const tomorrow = new Date(Date.now() + 24 * 3600 * 1000)
    const date = `${tomorrow.getUTCFullYear()}-${String(tomorrow.getUTCMonth() + 1).padStart(2, "0")}-${String(tomorrow.getUTCDate()).padStart(2, "0")}`
    expect(loggedAtForEntry(date, TZ)).toBe(null)
  })
})
