/**
 * THE AUDIT'S PINGS AND THEIR BUTTONS, against the real schema
 * (Plans/energy-audit.md, Phase 5 step 5).
 *
 * The push services and the vault keys are faked, as in
 * theRunningTimerReachesOnlyDevicesThatAskedForIt; never a secret in the test
 * vault. Everything else is real: the runs, the answers, the send log and its
 * one-row-per-quarter index, the clock's functions.
 *
 * The clock reads every person's runs, so each assertion looks only at this
 * file's own devices (by endpoint) and users.
 */
import { describe, it, expect, vi, beforeEach } from "vitest"
import { randomUUID } from "node:crypto"
import { actAs, newUser, type TestUser } from "@/tests/db/harness"
import { call } from "@/tests/integration/routes/call"
import { openSend, registerDevice } from "@/src/db/notificationsRepo"
import { readRuns, readSlots, startAuditRun, updateRun, upsertSlots } from "@/src/db/auditRepo"
import { updateTimezone } from "@/src/db/settingsRepo"
import { pingEntryId, runAuditPingClock } from "@/src/audit/pingService"
import { quarterStart, QUARTER_MS } from "@/src/audit/quarterService"
import type { AuditAnswer } from "@/src/audit/types"
import * as pingRoute from "@/app/api/audit/ping/route"

vi.mock("@/src/db/supabase", async (importOriginal) =>
  (await import("@/tests/db/harness")).stackSupabaseModule(await importOriginal())
)
vi.mock("@/src/db/notificationsRepo", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/src/db/notificationsRepo")>()),
  readNotificationSecret: async (name: string) => (name === "notifications_clock_secret" ? null : `test-${name}`),
}))

const sent: { endpoint: string; payload: Record<string, unknown> }[] = []
const answers = new Map<string, number>()
vi.mock("web-push", () => ({
  default: {
    sendNotification: async (sub: { endpoint: string }, payload: string) => {
      sent.push({ endpoint: sub.endpoint, payload: JSON.parse(payload) })
      const status = answers.get(sub.endpoint) ?? 201
      if (status >= 400) throw Object.assign(new Error("push service said no"), { statusCode: status })
      return { statusCode: status, body: "", headers: {} }
    },
  },
}))

beforeEach(() => {
  sent.length = 0
  answers.clear()
})

const CPH = "Europe/Copenhagen"

/** A person in Copenhagen with one phone and a run begun at `startedAt`. */
async function person(label: string, startedAt: Date) {
  const user = await newUser(label)
  actAs(user)
  await updateTimezone(user.id, CPH)
  const endpoint = `https://fcm.googleapis.com/fcm/send/${randomUUID()}`
  await registerDevice(user.id, { endpoint, p256dh: "BNcR", auth: "tBHI", label: "Phone" })
  const run = await startAuditRun(user.id, { id: randomUUID(), startedAt })
  return { user, endpoint, run }
}

const to = (endpoint: string) => sent.filter((s) => s.endpoint === endpoint)

function answer(runId: string, slotAt: Date, over: Partial<AuditAnswer> = {}): AuditAnswer {
  return {
    id: randomUUID(),
    runId,
    slotAt: slotAt.toISOString(),
    activity: "Deep work on the thesis",
    energy: 6,
    growth: 7,
    avoiding: true,
    why: "Finally clicked",
    source: "app",
    timeEntryId: null,
    ...over,
  }
}

describe("the ping clock", () => {
  // 08:00 UTC on 2 Nov is 09:00 in Copenhagen.
  const STARTED = new Date("2026-11-02T08:00:00Z")
  const TICK = new Date("2026-11-02T09:15:30Z")

  it("two ticks at once send exactly one push for a quarter", async () => {
    const p = await person("ping-race", STARTED)
    await Promise.all([runAuditPingClock(TICK), runAuditPingClock(TICK)])
    expect(to(p.endpoint)).toHaveLength(1)
    expect(to(p.endpoint)[0].payload).toMatchObject({ kind: "audit-ping", body: "What did you do from 10:00 to 10:15?", slotAt: "2026-11-02T09:00:00.000Z" })
    // and a later tick in the same 5 minutes does not send it again
    await runAuditPingClock(new Date("2026-11-02T09:17:00Z"))
    expect(to(p.endpoint)).toHaveLength(1)
  })

  it("a failed send leaves no second send for the same quarter", async () => {
    const p = await person("ping-fail", STARTED)
    answers.set(p.endpoint, 500)
    await runAuditPingClock(TICK)
    expect(to(p.endpoint)).toHaveLength(1)
    answers.delete(p.endpoint)
    await runAuditPingClock(new Date("2026-11-02T09:16:30Z"))
    expect(to(p.endpoint)).toHaveLength(1)
  })

  it("never puts what the person wrote in a ping", async () => {
    const p = await person("ping-private", STARTED)
    actAs(p.user)
    await upsertSlots(p.user.id, [answer(p.run.id, new Date("2026-11-02T08:45:00Z"))])
    await runAuditPingClock(TICK)
    const text = JSON.stringify(to(p.endpoint))
    expect(text).not.toContain("thesis")
    expect(text).not.toContain("clicked")
  })

  it("sends the end notice once, and records it", async () => {
    const p = await person("ping-end", new Date("2026-10-01T08:00:00Z"))
    const after = new Date("2026-10-15T08:00:30Z")
    await runAuditPingClock(after)
    await runAuditPingClock(new Date("2026-10-15T08:01:30Z"))
    const ends = to(p.endpoint).filter((s) => s.payload.kind === "audit-end")
    expect(ends).toHaveLength(1)
    expect(ends[0].payload.url).toBe("/audit?view=review")
    actAs(p.user)
    expect((await readRuns(p.user.id))[0].endSentAt).not.toBeNull()
  })

  it("sends no end notice after End now", async () => {
    const p = await person("ping-ended", new Date("2026-10-01T08:00:00Z"))
    actAs(p.user)
    await updateRun(p.user.id, p.run.id, { endedAt: new Date("2026-10-05T08:00:00Z") })
    await runAuditPingClock(new Date("2026-10-15T08:00:30Z"))
    expect(to(p.endpoint)).toEqual([])
  })
})

describe("the ping's buttons (POST /api/audit/ping)", () => {
  /** A run begun two hours ago; the quarter that just ended, and the one before it. */
  async function live(label: string) {
    const now = Date.now()
    const p = await person(label, new Date(now - 2 * 60 * 60_000))
    const slot = new Date(quarterStart(now) - QUARTER_MS)
    const previous = new Date(slot.getTime() - QUARTER_MS)
    actAs(p.user)
    const sendId = (await openSend(p.user.id, "audit-ping", new Date(), pingEntryId(p.run.id, slot.toISOString())))!
    expect(sendId).toBeTruthy()
    return { ...p, slot, previous, sendId }
  }
  const press = (action: string, slotAt: Date, sendId: string, headers: Record<string, string> = {}) =>
    call<{ title: string; body: string }>(pingRoute.POST, "/api/audit/ping", { method: "POST", body: { action, slotAt: slotAt.toISOString(), sendId }, headers })

  it("'same' copies activity, energy, growth and avoiding, but not why", async () => {
    const p = await live("same-copies")
    await upsertSlots(p.user.id, [answer(p.run.id, p.previous)])
    const res = await press("same", p.slot, p.sendId)
    expect(res.status).toBe(200)
    expect(res.body.title).toBe("Time & energy audit")
    expect(res.body.body).toMatch(/^Saved for \d\d:\d\d–\d\d:\d\d \(same as before\)$/)
    expect(JSON.stringify(res.body)).not.toContain("thesis")
    const copied = (await readSlots(p.user.id, p.run.id)).find((s) => s.slotAt === p.slot.toISOString())
    expect(copied).toMatchObject({ activity: "Deep work on the thesis", energy: 6, growth: 7, avoiding: true, why: null, source: "same" })
  })

  it("'same' answers 409 when the previous quarter is unanswered", async () => {
    const p = await live("same-no-previous")
    const res = await press("same", p.slot, p.sendId)
    expect(res.status).toBe(409)
    expect(res.body.body).toBe("Not saved. Tap to answer.")
    expect(await readSlots(p.user.id, p.run.id)).toEqual([])
  })

  it("'same' answers 409 when this quarter is already answered, and changes nothing", async () => {
    const p = await live("same-already")
    await upsertSlots(p.user.id, [answer(p.run.id, p.previous), answer(p.run.id, p.slot, { activity: "Lunch", why: null })])
    const res = await press("same", p.slot, p.sendId)
    expect(res.status).toBe(409)
    expect((await readSlots(p.user.id, p.run.id)).find((s) => s.slotAt === p.slot.toISOString())?.activity).toBe("Lunch")
  })

  it("'mute' mutes for one hour and says until when", async () => {
    const p = await live("mute")
    const before = Date.now()
    const res = await press("mute", p.slot, p.sendId)
    expect(res.status).toBe(200)
    expect(res.body.body).toMatch(/^Muted until \d\d:\d\d$/)
    const muted = Date.parse((await readRuns(p.user.id))[0].mutedUntil!)
    expect(muted - before).toBeGreaterThanOrEqual(59 * 60_000)
    expect(muted - before).toBeLessThanOrEqual(61 * 60_000)
  })

  it("refuses another person's send", async () => {
    const a = await live("same-a")
    const b: { user: TestUser } = await live("same-b")
    actAs(b.user)
    // b has an open run of their own, but a's ping is not b's to answer
    const res = await press("mute", a.slot, a.sendId)
    expect(res.status).toBe(404)
    expect((await readRuns(b.user.id))[0].mutedUntil).toBeNull()
    actAs(a.user)
    expect((await readRuns(a.user.id))[0].mutedUntil).toBeNull()
  })

  it("refuses a send for another quarter", async () => {
    const p = await live("same-other-quarter")
    await upsertSlots(p.user.id, [answer(p.run.id, new Date(p.previous.getTime() - QUARTER_MS))])
    const res = await press("same", p.previous, p.sendId)
    expect(res.status).toBe(404)
  })

  it("refuses a cross-site request and a body that is not JSON", async () => {
    const p = await live("same-guard")
    expect((await press("mute", p.slot, p.sendId, { "Sec-Fetch-Site": "cross-site" })).status).toBe(403)
    const form = await call(pingRoute.POST, "/api/audit/ping", {
      method: "POST",
      body: `action=mute&slotAt=${p.slot.toISOString()}&sendId=${p.sendId}`,
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
    })
    expect(form.status).toBe(415)
    expect((await readRuns(p.user.id))[0].mutedUntil).toBeNull()
  })
})
