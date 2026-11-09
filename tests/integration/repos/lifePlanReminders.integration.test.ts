/**
 * THE PLAN'S WEEKLY REVIEW REMINDER, against the real schema
 * (Plans/life-plan-after-setup.md, Phase 5 step 5.4).
 *
 * The push services and the vault keys are faked, as in auditPings; everything
 * else is real: the reminder table and its row security, `plan_reviews_due`,
 * `plan_week_review_written`, the send log and its one-row-per-week index
 * (one per week since Phase 6; it was one per day).
 *
 * The clock reads every person's reminders, so each assertion looks only at
 * this file's own devices (by endpoint) and users.
 */
import { describe, it, expect, vi, beforeEach } from "vitest"
import { randomUUID } from "node:crypto"
import { createClient } from "@supabase/supabase-js"
import { actAs, asOwner, newUser, stackEnv } from "@/tests/db/harness"
import { openSend, registerDevice } from "@/src/db/notificationsRepo"
import { updateTimezone } from "@/src/db/settingsRepo"
import { readReminder, remindersDueAsServer, weekReviewWrittenAsServer, writeReminder } from "@/src/db/lifePlanRemindersRepo"
import { runPlanReviewClock } from "@/src/goals/reviewReminderService"
import { applyLifePlanChanges, ensureLifePlan } from "@/src/db/lifePlanRepo"
import { planToRows } from "@/src/goals/lifePlanMapper"
import { diffPlanRows } from "@/src/goals/lifePlanDiff"
import { addGoal, emptyNsPlan } from "@/src/goals/northStarService"
import { periodOf, writeReview } from "@/src/goals/reviewService"

vi.mock("@/src/db/supabase", async (importOriginal) =>
  (await import("@/tests/db/harness")).stackSupabaseModule(await importOriginal())
)
vi.mock("@/src/db/notificationsRepo", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/src/db/notificationsRepo")>()),
  readNotificationSecret: async (name: string) => (name === "notifications_clock_secret" ? null : `test-${name}`),
}))

const sent: { endpoint: string; payload: Record<string, unknown>; ttl?: number }[] = []
vi.mock("web-push", () => ({
  default: {
    sendNotification: async (sub: { endpoint: string }, payload: string, options?: { TTL?: number }) => {
      sent.push({ endpoint: sub.endpoint, payload: JSON.parse(payload), ttl: options?.TTL })
      return { statusCode: 201, body: "", headers: {} }
    },
  },
}))

beforeEach(() => {
  sent.length = 0
})

const CPH = "Europe/Copenhagen"
// Sunday 15 Nov 2026, 19:05 in Copenhagen (UTC+1).
const SUNDAY_1905 = new Date("2026-11-15T18:05:00Z")
const to = (endpoint: string) => sent.filter((s) => s.endpoint === endpoint)

/** A person in Copenhagen with one phone (reminders on) and the reminder switched on for Sunday 19:00. */
async function person(label: string, opts: { device?: boolean; pushOn?: boolean } = {}) {
  const user = await newUser(label)
  actAs(user)
  await updateTimezone(user.id, CPH)
  const endpoint = `https://fcm.googleapis.com/fcm/send/${randomUUID()}`
  if (opts.device !== false) await registerDevice(user.id, { endpoint, p256dh: "BNcR", auth: "tBHI", label: "Phone" })
  await writeReminder(user.id, { pushOn: opts.pushOn ?? true, reviewDay: 7, reviewHour: 19 })
  return { user, endpoint }
}

const dueIds = async (at: Date, ids: string[]) => (await remindersDueAsServer(200, at)).filter((r) => ids.includes(r.user_id))
const sends = (userId: string) =>
  asOwner((q) => q(`select entry_id, devices from notification_sends where kind = 'plan-review' and user_id = $1`, [userId]))

/** Saves a plan through the app's own write path. */
async function savePlan(userId: string, plan: ReturnType<typeof emptyNsPlan>) {
  const { id: planId } = await ensureLifePlan(userId)
  const minted = new Map<string, string>()
  const rows = planToRows(plan, { planId, userId, idFor: (l) => minted.get(l) ?? minted.set(l, randomUUID()).get(l)! })
  await applyLifePlanChanges(diffPlanRows(null, rows), 0, userId)
}

describe("the reminder row", () => {
  it("is its owner's only: another account cannot read or write it, and anon cannot read", async () => {
    const a = await person("reminder-owner")
    const b = await newUser("reminder-other")
    const read = await b.client.from("life_plan_reminders").select("user_id").eq("user_id", a.user.id)
    expect(read.data ?? []).toEqual([])
    const write = await b.client.from("life_plan_reminders").upsert({ user_id: a.user.id, push_on: false }, { onConflict: "user_id" })
    expect(write.error).not.toBeNull()
    const env = stackEnv()
    const anon = createClient(env.API_URL, env.ANON_KEY, { auth: { persistSession: false, autoRefreshToken: false } })
    const anonRead = await anon.from("life_plan_reminders").select("user_id").eq("user_id", a.user.id)
    expect(anonRead.data ?? []).toEqual([])
    const [row] = await asOwner((q) => q(`select push_on from life_plan_reminders where user_id = $1`, [a.user.id]))
    expect(row.push_on).toBe(true)
  })

  it("writeReminder writes only the keys given: a new hour keeps the switch on", async () => {
    const { user } = await person("reminder-patch")
    actAs(user)
    await writeReminder(user.id, { reviewHour: 8 })
    expect(await readReminder(user.id)).toEqual({ pushOn: true, reviewDay: 7, reviewHour: 8 })
    const [row] = await asOwner((q) => q(`select push_on, review_day, review_hour from life_plan_reminders where user_id = $1`, [user.id]))
    expect(row).toEqual({ push_on: true, review_day: 7, review_hour: 8 })
  })
})

describe("who is due (remindersDueAsServer)", () => {
  it("is the person at their weekday and hour, in their zone, and nobody otherwise", async () => {
    const on = await person("reminder-due")
    const off = await person("reminder-off", { pushOn: false })
    const noDevice = await person("reminder-nodevice", { device: false })
    const ids = [on.user.id, off.user.id, noDevice.user.id]
    expect(await dueIds(SUNDAY_1905, ids)).toEqual([{ user_id: on.user.id, local_day: "2026-11-15", review_day: 7 }])
    expect(await dueIds(new Date("2026-11-15T19:05:00Z"), ids)).toEqual([]) // an hour later
    expect(await dueIds(new Date("2026-11-15T18:20:00Z"), ids)).toEqual([]) // minute 20
  })
})

describe("the clock (runPlanReviewClock)", () => {
  it("two ticks at the same instant send once, and leave one record", async () => {
    const p = await person("reminder-race")
    await Promise.all([runPlanReviewClock(SUNDAY_1905), runPlanReviewClock(SUNDAY_1905)])
    expect(to(p.endpoint)).toHaveLength(1)
    expect(to(p.endpoint)[0].payload).toMatchObject({
      title: "Weekly review",
      tag: "plan-review",
      url: "/plan?step=review&period=week-2026-11-09",
    })
    // Sent once a week and never again, so the push service keeps it for an evening, not 10 minutes.
    expect(to(p.endpoint)[0].ttl).toBe(6 * 3600)
    expect(await sends(p.user.id)).toEqual([{ entry_id: `plan-review:${p.user.id}:2026-11-09`, devices: 1 }])
    // and the next minute does not send it again
    await runPlanReviewClock(new Date("2026-11-15T18:06:00Z"))
    expect(to(p.endpoint)).toHaveLength(1)
  })

  it("sends nothing for a written week, and records that with no devices", async () => {
    const p = await person("reminder-written")
    actAs(p.user)
    await savePlan(p.user.id, writeReview(emptyNsPlan(), periodOf("week", "2026-11-09"), { magicMoments: "The long walk." }, "2026-11-15"))
    await runPlanReviewClock(SUNDAY_1905)
    expect(to(p.endpoint)).toEqual([])
    expect(await sends(p.user.id)).toEqual([{ entry_id: `plan-review:${p.user.id}:2026-11-09`, devices: 0 }])
  })
})

describe("one reminder per week (Phase 6)", () => {
  it("moving the day later in the same week does not send a second one; the next week sends again", async () => {
    const p = await person("reminder-moved")
    actAs(p.user)
    await writeReminder(p.user.id, { reviewDay: 3 })
    // Wednesday 11 Nov, 19:05 in Copenhagen: sent.
    await runPlanReviewClock(new Date("2026-11-11T18:05:00Z"))
    expect(to(p.endpoint)).toHaveLength(1)
    // Moved to Friday the same week: Friday 13 Nov at 19:05 is not due, and nothing goes out.
    await writeReminder(p.user.id, { reviewDay: 5 })
    const friday = new Date("2026-11-13T18:05:00Z")
    expect(await dueIds(friday, [p.user.id])).toEqual([])
    await runPlanReviewClock(friday)
    expect(to(p.endpoint)).toHaveLength(1)
    expect(await sends(p.user.id)).toEqual([{ entry_id: `plan-review:${p.user.id}:2026-11-09`, devices: 1 }])
    // Friday of the next week is due again.
    expect(await dueIds(new Date("2026-11-20T18:05:00Z"), [p.user.id])).toEqual([{ user_id: p.user.id, local_day: "2026-11-20", review_day: 5 }])
  })

  it("a record keyed by a day (Phase 5) still counts for its whole week", async () => {
    const p = await person("reminder-oldkey")
    // As Phase 5 wrote it, on Wednesday of the same week.
    await openSend(p.user.id, "plan-review", new Date("2026-11-11T18:05:00Z"), `plan-review:${p.user.id}:2026-11-11`)
    expect(await dueIds(SUNDAY_1905, [p.user.id])).toEqual([])
    // A day key from the week before does not.
    const q = await person("reminder-oldkey-prev")
    await openSend(q.user.id, "plan-review", new Date("2026-11-08T18:05:00Z"), `plan-review:${q.user.id}:2026-11-08`)
    expect(await dueIds(SUNDAY_1905, [q.user.id])).toEqual([{ user_id: q.user.id, local_day: "2026-11-15", review_day: 7 }])
  })
})

describe("whether a week is written (weekReviewWrittenAsServer)", () => {
  it("is false for scores alone and true with one verdict", async () => {
    const user = await newUser("reminder-verdict")
    actAs(user)
    const week = periodOf("week", "2026-11-09")
    let plan = addGoal(emptyNsPlan(), "lm_health", "Run a 10k", "achievement")
    plan = writeReview(plan, week, { score: { areaId: "lm_health", value: 6 } }, "2026-11-15")
    await savePlan(user.id, plan)
    expect(await weekReviewWrittenAsServer(user.id, week.start)).toBe(false)

    const other = await newUser("reminder-verdict-2")
    actAs(other)
    plan = writeReview(plan, week, { verdict: { goalId: plan.goals[0].id, value: "behind" } }, "2026-11-15")
    await savePlan(other.id, plan)
    expect(await weekReviewWrittenAsServer(other.id, week.start)).toBe(true)
  })
})
