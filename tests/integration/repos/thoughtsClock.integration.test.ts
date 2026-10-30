/**
 * THE REMINDER CLOCK, ONE TICK AT A TIME, against the real schema
 * (Plans/thought.md, Phase 6 step 5).
 *
 * The push services are faked (`web-push`), and so are the vault keys: the
 * test stack's vault is empty on purpose (thoughtsRepo.integration.test.ts
 * checks that the server reads nothing there). Everything else is real: the
 * claim, the settings, the schedule, the send log and the device rows.
 *
 * EVERY CLAIM LIVES IN THIS ONE FILE. A claim takes every due row in the
 * database, and test files run in parallel against one stack, so a claim in a
 * second file could take this file's reminders mid-test. Within a file tests
 * run one after another; assertions read this test's own users only.
 */
import { describe, it, expect, vi, beforeEach } from "vitest"
import { randomUUID } from "node:crypto"
import { actAs, asOwner, newUser, type TestUser } from "@/tests/db/harness"
import { claimDuePrompts, readPromptSchedule, registerDevice, writePromptSchedule } from "@/src/db/notificationsRepo"
import { createThought, insertLogs, writeSettings } from "@/src/db/thoughtsRepo"
import { updateTimezone } from "@/src/db/settingsRepo"
import { runPromptClock } from "@/src/thoughts/promptService"
import { pushKeys, sendToPerson } from "@/src/notifications/pushService"
import { DEFAULT_SETTINGS, type ThoughtSettings } from "@/src/thoughts/types"

vi.mock("@/src/db/supabase", async (importOriginal) =>
  (await import("@/tests/db/harness")).stackSupabaseModule(await importOriginal())
)

vi.mock("@/src/db/notificationsRepo", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/src/db/notificationsRepo")>()),
  readNotificationSecret: async (name: string) => (name === "notifications_clock_secret" ? null : `test-${name}`),
}))

/** What the fake push service was handed, and what it answers per endpoint. */
const sent: { endpoint: string; payload: Record<string, unknown>; options: Record<string, unknown> }[] = []
const answers = new Map<string, number>()

vi.mock("web-push", () => ({
  default: {
    sendNotification: async (sub: { endpoint: string }, payload: string, options: Record<string, unknown>) => {
      sent.push({ endpoint: sub.endpoint, payload: JSON.parse(payload), options })
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

const ALWAYS: ThoughtSettings = { ...DEFAULT_SETTINGS, remindersOn: true, quietStart: null, quietEnd: null }

async function personDue(label: string, settings = ALWAYS, devices = 1): Promise<{ user: TestUser; endpoints: string[] }> {
  const user = await newUser(label)
  actAs(user)
  await updateTimezone(user.id, "Europe/Copenhagen")
  await writeSettings(user.id, settings)
  const endpoints: string[] = []
  for (let i = 0; i < devices; i++) {
    const endpoint = `https://fcm.googleapis.com/fcm/send/${randomUUID()}`
    await registerDevice(user.id, { endpoint, p256dh: "BNcR", auth: "tBHI", label: `Device ${i}` })
    endpoints.push(endpoint)
  }
  await writePromptSchedule(user.id, new Date(Date.now() - 60_000))
  return { user, endpoints }
}

const sendsOf = (userId: string) =>
  asOwner((q) => q("select kind, devices, delivered, removed from notification_sends where user_id = $1", [userId]))

describe("one tick of the clock", () => {
  it("sends a due reminder once, to the person's devices, and schedules the next one interval later", async () => {
    const { user, endpoints } = await personDue("clock-send")
    const now = new Date()

    await runPromptClock(now)

    const mine = sent.filter((s) => endpoints.includes(s.endpoint))
    expect(mine).toHaveLength(1)
    expect(mine[0].payload).toMatchObject({ title: "What's on your mind?", tag: "thought-prompt", actions: [] })
    expect(mine[0].payload.url).toBe(`/thoughts?log=1&prompt=${mine[0].payload.promptId}`)
    expect(mine[0].options).toMatchObject({ TTL: 600, urgency: "high", topic: "thought-prompt" })
    expect(await sendsOf(user.id)).toEqual([{ kind: "thought-prompt", devices: 1, delivered: 1, removed: 0 }])
    const schedule = await readPromptSchedule(user.id)
    expect(Date.parse(schedule.nextDueAt!)).toBe(now.getTime() + 15 * 60_000)
    expect(schedule.lastSentAt).toBe(now.toISOString())
  })

  it("sends once when two clocks tick at the same moment", async () => {
    const { user, endpoints } = await personDue("clock-twice")
    const now = new Date()

    await Promise.all([runPromptClock(now), runPromptClock(now)])

    expect(sent.filter((s) => endpoints.includes(s.endpoint))).toHaveLength(1)
    expect(await sendsOf(user.id)).toHaveLength(1)
  })

  it("leaves a reminder it took alone until its lease runs out", async () => {
    const { user } = await personDue("clock-lease")
    const now = new Date()
    const taken = (await claimDuePrompts(now, 300, 1000)).filter((c) => c.userId === user.id)
    expect(taken).toHaveLength(1)
    expect((await claimDuePrompts(now, 300, 1000)).filter((c) => c.userId === user.id)).toEqual([])
    expect(Date.parse((await readPromptSchedule(user.id)).nextDueAt!)).toBe(now.getTime() + 300_000)
  })

  it("sends nothing to someone who switched reminders off, and clears their schedule", async () => {
    const { user, endpoints } = await personDue("clock-off", { ...ALWAYS, remindersOn: false })

    await runPromptClock(new Date())

    expect(sent.filter((s) => endpoints.includes(s.endpoint))).toEqual([])
    expect(await sendsOf(user.id)).toEqual([])
    expect((await readPromptSchedule(user.id)).nextDueAt).toBeNull()
  })

  it("sends nothing during a pause, and moves the next one to the pause's end", async () => {
    const pausedUntil = new Date(Date.now() + 2 * 60 * 60_000).toISOString()
    const { user, endpoints } = await personDue("clock-paused", { ...ALWAYS, pausedUntil })

    await runPromptClock(new Date())

    expect(sent.filter((s) => endpoints.includes(s.endpoint))).toEqual([])
    expect((await readPromptSchedule(user.id)).nextDueAt).toBe(pausedUntil)
  })

  it("sends nothing in quiet hours (in the person's zone)", async () => {
    // Quiet hours covering every minute but the one twelve hours from now, so
    // "now" is quiet whatever time the suite runs.
    const now = new Date()
    const local = new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Copenhagen", hour: "2-digit", minute: "2-digit", hourCycle: "h23" })
      .format(new Date(now.getTime() + 12 * 60 * 60_000))
      .split(":")
      .map(Number)
    const openMinute = local[0] * 60 + local[1]
    const quiet = { ...ALWAYS, quietStart: (openMinute + 1) % 1440, quietEnd: openMinute }
    const { user, endpoints } = await personDue("clock-quiet", quiet)

    await runPromptClock(now)

    expect(sent.filter((s) => endpoints.includes(s.endpoint))).toEqual([])
    const next = Date.parse((await readPromptSchedule(user.id)).nextDueAt!)
    expect(next).toBeGreaterThan(now.getTime() + 11 * 60 * 60_000)
  })

  it("restarts the wait from a log made since (Q17)", async () => {
    const { user, endpoints } = await personDue("clock-logged")
    const { id } = await createThought(user.id, randomUUID(), "I am bad")
    const loggedAt = new Date(Date.now() - 5 * 60_000)
    await insertLogs(user.id, [{ id: randomUUID(), thoughtId: id, at: loggedAt.toISOString(), source: "tap", promptId: null }])

    await runPromptClock(new Date())

    expect(sent.filter((s) => endpoints.includes(s.endpoint))).toEqual([])
    expect(Date.parse((await readPromptSchedule(user.id)).nextDueAt!)).toBe(loggedAt.getTime() + 15 * 60_000)
  })

  it("removes a device the push service says is gone, and still reaches the others", async () => {
    const { user, endpoints } = await personDue("clock-gone", ALWAYS, 2)
    answers.set(endpoints[0], 410)

    await runPromptClock(new Date())

    expect(await sendsOf(user.id)).toEqual([{ kind: "thought-prompt", devices: 2, delivered: 1, removed: 1 }])
    const left = await asOwner((q) => q("select endpoint from push_devices where user_id = $1", [user.id]))
    expect(left).toEqual([{ endpoint: endpoints[1] }])
  })

  it("records no reminder for someone with no switched-on device", async () => {
    const { user } = await personDue("clock-nodevice", ALWAYS, 0)

    await runPromptClock(new Date())

    expect(await sendsOf(user.id)).toEqual([])
    expect((await readPromptSchedule(user.id)).nextDueAt).not.toBeNull()
  })

  it("puts the two most frequent thoughts on the reminder only when asked to", async () => {
    const { user, endpoints } = await personDue("clock-buttons", { ...ALWAYS, showThoughts: true })
    const a = await createThought(user.id, randomUUID(), "I am bad")
    const b = await createThought(user.id, randomUUID(), "Nobody likes me")
    await createThought(user.id, randomUUID(), "Rarely")
    const at = new Date(Date.now() - 30 * 60_000).toISOString()
    await insertLogs(user.id, [
      ...[1, 2, 3].map(() => ({ id: randomUUID(), thoughtId: a.id, at, source: "tap" as const, promptId: null })),
      ...[1, 2].map(() => ({ id: randomUUID(), thoughtId: b.id, at, source: "tap" as const, promptId: null })),
    ])

    await runPromptClock(new Date())

    const mine = sent.filter((s) => endpoints.includes(s.endpoint))
    expect(mine[0].payload.actions).toEqual([
      { id: a.id, title: "I am bad" },
      { id: b.id, title: "Nobody likes me" },
    ])
  })
})

describe("a test reminder", () => {
  it("reaches every switched-on device and is recorded as a test, never as a reminder", async () => {
    const { user, endpoints } = await personDue("clock-test", ALWAYS, 2)
    expect(await pushKeys()).toEqual({ publicKey: "test-push_vapid_public", privateKey: "test-push_vapid_private" })

    const result = await sendToPerson(user.id, "test", () => ({ title: "Reminders are on", body: "x", url: "/thoughts?log=1", tag: "thought-prompt" }))

    expect(result).toMatchObject({ devices: 2, delivered: 2, removed: 0 })
    expect(sent.filter((s) => endpoints.includes(s.endpoint)).map((s) => s.options.topic)).toEqual(["test", "test"])
    expect(await sendsOf(user.id)).toEqual([{ kind: "test", devices: 2, delivered: 2, removed: 0 }])
  })
})
