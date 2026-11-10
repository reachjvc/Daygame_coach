/**
 * VALUE OF THE WEEK AND THE COUNCIL'S DAILY REMINDER, against the real schema
 * (Plans/role-models.md, Phase 12): the two tables' row security and checks,
 * and `council_reminders_due`.
 */
import { describe, it, expect, vi, beforeEach } from "vitest"
import { randomUUID } from "node:crypto"
import { actAs, asOwner, newUser } from "@/tests/db/harness"
import { registerDevice } from "@/src/db/notificationsRepo"
import { updateTimezone } from "@/src/db/settingsRepo"
import {
  councilRemindersDueAsServer,
  readCouncilSettings,
  readWeekMarks,
  saveCouncilMember,
  writeCouncilSettings,
  writeWeekMark,
} from "@/src/db/roleModelsRepo"

import { runCouncilReminderClock } from "@/src/role-models/councilReminderService"

vi.mock("@/src/db/supabase", async (importOriginal) =>
  (await import("@/tests/db/harness")).stackSupabaseModule(await importOriginal())
)
vi.mock("@/src/db/notificationsRepo", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/src/db/notificationsRepo")>()),
  readNotificationSecret: async (name: string) => (name === "notifications_clock_secret" ? null : `test-${name}`),
}))

const sent: { endpoint: string; payload: Record<string, unknown> }[] = []
vi.mock("web-push", () => ({
  default: {
    sendNotification: async (sub: { endpoint: string }, payload: string) => {
      sent.push({ endpoint: sub.endpoint, payload: JSON.parse(payload) })
      return { statusCode: 201, body: "", headers: {} }
    },
  },
}))
beforeEach(() => {
  sent.length = 0
})

// Tuesday 10 Nov 2026, 08:05 in Copenhagen (UTC+1).
const TUESDAY_0805 = new Date("2026-11-10T07:05:00Z")

describe("council settings and week marks", () => {
  it("save and read back, and a mark can be taken back", async () => {
    const a = await newUser("week-owner")
    actAs(a)
    expect(await readCouncilSettings(a.id)).toEqual({ weekValue: null, weekOf: null, remindOn: false, remindHour: 8 })
    await writeCouncilSettings(a.id, { weekValue: "Discipline", weekOf: "2026-11-09" })
    await writeCouncilSettings(a.id, { remindOn: true })
    expect(await readCouncilSettings(a.id)).toEqual({ weekValue: "Discipline", weekOf: "2026-11-09", remindOn: true, remindHour: 8 })
    await writeWeekMark(a.id, "2026-11-09", "Discipline", true)
    await writeWeekMark(a.id, "2026-11-10", "Discipline", false)
    await writeWeekMark(a.id, "2026-11-10", "Discipline", true)
    await writeWeekMark(a.id, "2026-11-09", "Discipline", null)
    expect(await readWeekMarks(a.id, "2026-11-09", "2026-11-15")).toEqual([{ day: "2026-11-10", value: "Discipline", lived: true }])
  })

  it("refuses an hour in the night", async () => {
    const a = await newUser("week-night")
    const res = await a.client.from("user_role_model_settings").insert({ user_id: a.id, remind_hour: 23 })
    expect(res.error).not.toBeNull()
  })

  it("are their owner's only", async () => {
    const a = await newUser("week-a")
    const b = await newUser("week-b")
    actAs(a)
    await writeCouncilSettings(a.id, { remindOn: true })
    await writeWeekMark(a.id, "2026-11-10", "Discipline", true)
    expect((await b.client.from("user_role_model_settings").select("user_id").eq("user_id", a.id)).data ?? []).toEqual([])
    expect((await b.client.from("user_role_model_week_marks").select("day").eq("user_id", a.id)).data ?? []).toEqual([])
    const write = await b.client.from("user_role_model_week_marks").insert({ user_id: a.id, day: "2026-11-11", value: "X", lived: false })
    expect(write.error).not.toBeNull()
    await b.client.from("user_role_model_settings").update({ remind_on: false }).eq("user_id", a.id)
    const [row] = await asOwner((q) => q(`select remind_on from user_role_model_settings where user_id = $1`, [a.id]))
    expect(row.remind_on).toBe(true)
  })
})

describe("council_reminders_due", () => {
  const endpoints = new Map<string, string>()
  async function person(label: string, opts: { council?: boolean; device?: boolean; on?: boolean; hour?: number } = {}) {
    const u = await newUser(label)
    actAs(u)
    await updateTimezone(u.id, "Europe/Copenhagen")
    const endpoint = `https://fcm.googleapis.com/fcm/send/${randomUUID()}`
    endpoints.set(u.id, endpoint)
    if (opts.device !== false) await registerDevice(u.id, { endpoint, p256dh: "BNcR", auth: "tBHI", label: "Phone" })
    if (opts.council !== false) await saveCouncilMember(u.id, { roleModelId: "marcus-aurelius", takenValues: ["Discipline"], position: 0 }, true)
    await writeCouncilSettings(u.id, { remindOn: opts.on ?? true, remindHour: opts.hour ?? 8 })
    return u
  }

  it("holds a person at his hour, with a phone and a council, and nobody else", async () => {
    const yes = await person("due-yes")
    const off = await person("due-off", { on: false })
    const noPhone = await person("due-nophone", { device: false })
    const noCouncil = await person("due-nocouncil", { council: false })
    const otherHour = await person("due-9", { hour: 9 })
    const ids = [yes, off, noPhone, noCouncil, otherHour].map((u) => u.id)
    const due = (await councilRemindersDueAsServer(500, TUESDAY_0805)).filter((r) => ids.includes(r.user_id))
    expect(due.map((r) => r.user_id)).toEqual([yes.id])
    expect(due[0]).toMatchObject({ local_day: "2026-11-10", tz: "Europe/Copenhagen" })
  })

  it("is not for an authenticated user to call", async () => {
    const a = await newUser("due-caller")
    const res = await a.client.rpc("council_reminders_due", { p_limit: 5, p_now: TUESDAY_0805.toISOString() })
    expect(res.error).not.toBeNull()
  })

  it("the clock sends that day's member once, and then the person is no longer due", async () => {
    const u = await person("clock-yes")
    await runCouncilReminderClock(TUESDAY_0805)
    const mine = sent.filter((x) => x.endpoint === endpoints.get(u.id))
    expect(mine).toHaveLength(1)
    expect(mine[0].payload.tag).toBe("council-daily")
    expect(String(mine[0].payload.body)).toContain("You take: Discipline.")
    await runCouncilReminderClock(new Date(TUESDAY_0805.getTime() + 5 * 60_000))
    expect(sent.filter((x) => x.endpoint === endpoints.get(u.id))).toHaveLength(1)
    expect((await councilRemindersDueAsServer(500, TUESDAY_0805)).some((r) => r.user_id === u.id)).toBe(false)
  })
})
