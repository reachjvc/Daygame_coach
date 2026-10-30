/**
 * THOUGHT FREQUENCIES' STORAGE, through the app's own repo functions, against
 * the real schema with real row security (tests/db/harness.ts).
 *
 * Plans/thought.md, Phase 2, step 4: a second account sees none of the
 * first's rows; the same device-made id stored twice is one log; merging moves
 * every log and reframe; counts are right past 1,000 logs; deleting a thought
 * removes its logs and reframes and nothing else; two clocks claiming at once
 * take each reminder once.
 */
import { describe, it, expect, vi } from "vitest"
import { randomUUID } from "node:crypto"
import { actAs, asOwner, asUser, newUser } from "@/tests/db/harness"
import {
  createThought,
  deleteLog,
  deleteThought,
  insertLogs,
  lastLogAt,
  mergeThoughts,
  readFrequencyStats,
  readSettings,
  readThoughts,
  readThoughtsAsServer,
  saveReframe,
  ThoughtWordingTaken,
  updateThought,
  writeSettings,
} from "@/src/db/thoughtsRepo"
import {
  closeSend,
  moveDevice,
  devicesForSending,
  openSend,
  recordDeviceOutcome,
  setDeviceEnabled,
  readNotificationSecret,
  readPromptSchedule,
  registerDevice,
  listDevices,
  removeDevice,
  writePromptSchedule,
} from "@/src/db/notificationsRepo"
import { DEFAULT_SETTINGS, type LogInput } from "@/src/thoughts/types"
import { reschedulePrompts } from "@/src/thoughts/promptService"
import { updateTimezone } from "@/src/db/settingsRepo"

vi.mock("@/src/db/supabase", async (importOriginal) =>
  (await import("@/tests/db/harness")).stackSupabaseModule(await importOriginal())
)

const TZ = "Europe/Copenhagen"

function tap(thoughtId: string | null, at: Date, over: Partial<LogInput> = {}): LogInput {
  return { id: randomUUID(), thoughtId, at: at.toISOString(), source: "tap", promptId: null, ...over }
}

describe("thoughts", () => {
  it("adds a thought once: the same words again return the first one", async () => {
    const user = await newUser("thoughts")
    actAs(user)

    const first = await createThought(user.id, randomUUID(), "I am bad")
    const again = await createThought(user.id, randomUUID(), "  i AM bad.")

    expect(first.created).toBe(true)
    expect(again).toEqual({ id: first.id, created: false })
    expect((await readThoughts(user.id, TZ)).map((t) => t.text)).toEqual(["I am bad"])
  })

  it("brings an archived thought back when its words are typed again", async () => {
    const user = await newUser("thoughts")
    actAs(user)
    const { id } = await createThought(user.id, randomUUID(), "Nobody likes me")
    await updateThought(user.id, id, { archived: true })
    expect((await readThoughts(user.id, TZ))[0].archived).toBe(true)

    await createThought(user.id, randomUUID(), "nobody likes me")

    expect((await readThoughts(user.id, TZ))[0].archived).toBe(false)
  })

  it("brings an archived thought back when it is logged again (a tap on its suggestion)", async () => {
    const user = await newUser("thoughts")
    actAs(user)
    const { id } = await createThought(user.id, randomUUID(), "I am bad")
    await updateThought(user.id, id, { archived: true })

    await insertLogs(user.id, [tap(id, new Date())])

    expect((await readThoughts(user.id, TZ))[0]).toMatchObject({ archived: false, counts: { total: 1 } })
  })

  it("refuses a rewording that another thought already has, naming it", async () => {
    const user = await newUser("thoughts")
    actAs(user)
    const a = await createThought(user.id, randomUUID(), "I am bad")
    const b = await createThought(user.id, randomUUID(), "I'm bad")

    const refusal = await updateThought(user.id, b.id, { text: "I am bad" }).catch((e) => e)

    expect(refusal).toBeInstanceOf(ThoughtWordingTaken)
    expect((refusal as ThoughtWordingTaken).existingId).toBe(a.id)
  })

  it("is invisible and untouchable to a second account", async () => {
    const owner = await newUser("thoughts-owner")
    const other = await newUser("thoughts-other")
    actAs(owner)
    const { id } = await createThought(owner.id, randomUUID(), "I am bad")
    await insertLogs(owner.id, [tap(id, new Date())])

    actAs(other)
    expect(await readThoughts(other.id, TZ)).toEqual([])
    // Even asking for the owner's id through the app's own code.
    expect(await readThoughts(owner.id, TZ)).toEqual([])
    await deleteThought(other.id, id).catch(() => undefined)
    await asUser(other.id, async (q) => {
      expect(await q("select count(*)::int as n from thought_logs")).toEqual([{ n: 0 }])
      expect(await q("select count(*)::int as n from thought_counts($1, now(), $2)", [TZ, owner.id])).toEqual([{ n: 0 }])
    })

    actAs(owner)
    expect((await readThoughts(owner.id, TZ))[0].counts.total).toBe(1)
  })
})

describe("logs", () => {
  it("counts a retried tap once", async () => {
    const user = await newUser("thoughts-logs")
    actAs(user)
    const { id } = await createThought(user.id, randomUUID(), "I am bad")
    const once = tap(id, new Date())

    expect((await insertLogs(user.id, [once])).inserted).toEqual([once.id])
    // The retry stores nothing new, and says so: the page relies on it.
    expect((await insertLogs(user.id, [once, once])).inserted).toEqual([])

    expect((await readThoughts(user.id, TZ))[0].counts.total).toBe(1)
  })

  it("undoes one log", async () => {
    const user = await newUser("thoughts-logs")
    actAs(user)
    const { id } = await createThought(user.id, randomUUID(), "I am bad")
    const logs = [tap(id, new Date()), tap(id, new Date()), tap(id, new Date())]
    await insertLogs(user.id, logs)

    await deleteLog(user.id, logs[1].id)

    expect((await readThoughts(user.id, TZ))[0].counts.total).toBe(2)
  })

  it("counts today in the person's own day, and past 1,000 logs", async () => {
    const user = await newUser("thoughts-logs")
    actAs(user)
    const { id } = await createThought(user.id, randomUUID(), "I am bad")
    // 1,500 logs: one a minute ending at 23:30 CET on 30 Oct (22:30Z), so
    // 1,410 fall on the 30th in Copenhagen and 90 on the 29th — while in UTC
    // the same logs would split differently.
    const end = new Date("2026-10-30T22:30:00.000Z")
    const rows = Array.from({ length: 1500 }, (_, i) => [randomUUID(), user.id, id, new Date(end.getTime() - i * 60_000).toISOString()])
    await asOwner(async (q) => {
      for (let i = 0; i < rows.length; i += 500) {
        const chunk = rows.slice(i, i + 500)
        const values = chunk.map((_, j) => `($${j * 4 + 1}, $${j * 4 + 2}, $${j * 4 + 3}, $${j * 4 + 4}, 'tap')`).join(",")
        await q(`insert into thought_logs (id, user_id, thought_id, at, source) values ${values}`, chunk.flat())
      }
    })

    const [t] = await readThoughts(user.id, TZ, new Date("2026-10-30T22:45:00.000Z"))

    expect(t.counts.total).toBe(1500)
    expect(t.counts.today).toBe(1411) // 00:00 CET through 23:30 CET inclusive
    expect(t.counts.lastAt).toBe(end.toISOString())
  })

  it("lands a tap for a merged thought on the survivor, and drops one for a deleted thought", async () => {
    const user = await newUser("thoughts-logs")
    actAs(user)
    const keep = await createThought(user.id, randomUUID(), "I am bad")
    const gone = await createThought(user.id, randomUUID(), "I'm bad")
    const deleted = await createThought(user.id, randomUUID(), "Nobody likes me")
    await mergeThoughts(gone.id, keep.id)
    await deleteThought(user.id, deleted.id)

    const result = await insertLogs(user.id, [tap(gone.id, new Date()), tap(deleted.id, new Date())])

    expect(result).toMatchObject({ stored: 1, dropped: 1 })
    expect(result.inserted).toHaveLength(1)
    expect((await readThoughts(user.id, TZ)).map((t) => [t.text, t.counts.total])).toEqual([["I am bad", 1]])
  })

  it("stores 'nothing notable' as an answer to a reminder, and clears a reminder id that is not theirs", async () => {
    const user = await newUser("thoughts-logs")
    const other = await newUser("thoughts-logs-other")
    const mine = await openSend(user.id, "thought-prompt", new Date())
    const theirs = await openSend(other.id, "thought-prompt", new Date())
    actAs(user)
    const { id } = await createThought(user.id, randomUUID(), "I am bad")

    await insertLogs(user.id, [
      tap(null, new Date(), { source: "prompt", promptId: mine }),
      tap(id, new Date(), { source: "prompt", promptId: theirs }),
    ])

    const rows = await asOwner((q) => q("select thought_id, prompt_id from thought_logs where user_id = $1 order by thought_id nulls first", [user.id]))
    expect(rows).toEqual([
      { thought_id: null, prompt_id: mine },
      { thought_id: id, prompt_id: null },
    ])
    expect(await lastLogAt(user.id)).not.toBeNull()
  })
})

describe("merging", () => {
  it("moves every log and reframe, and the old words then find the survivor", async () => {
    const user = await newUser("thoughts-merge")
    actAs(user)
    const keep = await createThought(user.id, randomUUID(), "I am bad")
    const from = await createThought(user.id, randomUUID(), "I'm bad")
    await insertLogs(user.id, [tap(keep.id, new Date()), tap(from.id, new Date()), tap(from.id, new Date())])
    await saveReframe(user.id, { id: randomUUID(), thoughtId: from.id, text: "I make mistakes", beliefBefore: 80, beliefAfter: 40, evidence: "", friend: "" })

    await mergeThoughts(from.id, keep.id)

    const thoughts = await readThoughts(user.id, TZ)
    expect(thoughts.map((t) => [t.text, t.counts.total, t.reframe?.text])).toEqual([["I am bad", 3, "I make mistakes"]])
    expect(await createThought(user.id, randomUUID(), "I'm bad")).toEqual({ id: keep.id, created: false })
  })

  it("cannot merge someone else's thought", async () => {
    const owner = await newUser("thoughts-merge")
    const other = await newUser("thoughts-merge")
    actAs(owner)
    const a = await createThought(owner.id, randomUUID(), "I am bad")
    actAs(other)
    const b = await createThought(other.id, randomUUID(), "I am bad")

    await expect(mergeThoughts(a.id, b.id)).rejects.toThrow("That thought no longer exists")
  })
})

describe("deleting", () => {
  it("removes the thought, its logs and its reframes, and nothing else", async () => {
    const user = await newUser("thoughts-delete")
    actAs(user)
    const doomed = await createThought(user.id, randomUUID(), "I am bad")
    const kept = await createThought(user.id, randomUUID(), "I am late")
    await insertLogs(user.id, [tap(doomed.id, new Date()), tap(kept.id, new Date())])
    await saveReframe(user.id, { id: randomUUID(), thoughtId: doomed.id, text: "x", beliefBefore: null, beliefAfter: null, evidence: "", friend: "" })
    await saveReframe(user.id, { id: randomUUID(), thoughtId: kept.id, text: "y", beliefBefore: null, beliefAfter: null, evidence: "", friend: "" })

    await deleteThought(user.id, doomed.id)

    const left = await asOwner((q) =>
      q(
        `select (select count(*)::int from thoughts where user_id = $1) as thoughts,
                (select count(*)::int from thought_logs where user_id = $1) as logs,
                (select count(*)::int from thought_reframes where user_id = $1) as reframes`,
        [user.id],
      ),
    )
    expect(left).toEqual([{ thoughts: 1, logs: 1, reframes: 1 }])
  })
})

describe("reframes", () => {
  it("keeps every reframe and shows the newest as current", async () => {
    const user = await newUser("thoughts-reframe")
    actAs(user)
    const { id } = await createThought(user.id, randomUUID(), "I am bad")
    const first = await saveReframe(user.id, { id: randomUUID(), thoughtId: id, text: "first", beliefBefore: 90, beliefAfter: 60, evidence: "e", friend: "f" })
    await saveReframe(user.id, { ...first, text: "first, edited", beliefBefore: 90, beliefAfter: 50, thoughtId: id })
    await new Promise((r) => setTimeout(r, 20))
    await saveReframe(user.id, { id: randomUUID(), thoughtId: id, text: "second", beliefBefore: null, beliefAfter: null, evidence: "", friend: "" })

    const [t] = await readThoughts(user.id, TZ)
    expect(t.reframe?.text).toBe("second")
    expect(t.reframeCount).toBe(2)
  })
})

describe("settings", () => {
  it("are the defaults until saved, then exactly what was saved", async () => {
    const user = await newUser("thoughts-settings")
    actAs(user)
    expect(await readSettings(user.id)).toEqual(DEFAULT_SETTINGS)

    const mine = { ...DEFAULT_SETTINGS, remindersOn: true, intervalMinutes: 30 as const, quietStart: null, quietEnd: null, pausedUntil: "2026-10-30T12:00:00.000Z" }
    await writeSettings(user.id, mine)

    expect(await readSettings(user.id)).toEqual(mine)
  })
})

describe("the reminder clock's storage", () => {
  it("keeps the schedule, the devices and the keys away from every signed-in person", async () => {
    const user = await newUser("clock-private")
    await writePromptSchedule(user.id, new Date())
    await registerDevice(user.id, { endpoint: `https://fcm.googleapis.com/fcm/send/${randomUUID()}`, p256dh: "k", auth: "a", label: "Test" })

    await asUser(user.id, async (q) => {
      expect(await q("select count(*)::int as n from thought_prompt_schedule")).toEqual([{ n: 0 }])
      expect(await q("select count(*)::int as n from push_devices")).toEqual([{ n: 0 }])
      await expect(q("select public.notification_secret('push_vapid_private')")).rejects.toMatchObject({ code: "42501" })
      await expect(q("select * from public.claim_due_thought_prompts(now(), '1 minute', 10)")).rejects.toMatchObject({ code: "42501" })
      await expect(
        q("insert into push_devices (user_id, endpoint, p256dh, auth) values ($1, 'https://evil.example/x', 'k', 'a')", [user.id]),
      ).rejects.toMatchObject({ code: "42501" })
    })
    // The server may read it; nothing has been stored in the test vault.
    expect(await readNotificationSecret("push_vapid_private")).toBeNull()
  })

  it("moves a browser's registration to whoever registered it last", async () => {
    const first = await newUser("devices")
    const second = await newUser("devices")
    const endpoint = `https://fcm.googleapis.com/fcm/send/${randomUUID()}`

    await registerDevice(first.id, { endpoint, p256dh: "k", auth: "a", label: "Shared laptop" })
    await registerDevice(second.id, { endpoint, p256dh: "k2", auth: "a2", label: "Shared laptop" })

    expect(await listDevices(first.id)).toEqual([])
    const [d] = await listDevices(second.id)
    expect(d.label).toBe("Shared laptop")
    expect(Object.keys(d)).not.toContain("endpoint")

    await removeDevice(second.id, { endpoint })
    expect(await listDevices(second.id)).toEqual([])
  })

  it("switches a device off after twenty failures in a row, and deletes one the service says is gone", async () => {
    const user = await newUser("devices")
    const flaky = await registerDevice(user.id, { endpoint: `https://fcm.googleapis.com/fcm/send/${randomUUID()}`, p256dh: "k", auth: "a", label: "Flaky" })
    const dead = await registerDevice(user.id, { endpoint: `https://web.push.apple.com/${randomUUID()}`, p256dh: "k", auth: "a", label: "Dead" })

    for (let i = 0; i < 19; i++) await recordDeviceOutcome(flaky, "failed")
    expect((await devicesForSending(user.id)).map((d) => d.id).sort()).toEqual([flaky, dead].sort())
    await recordDeviceOutcome(flaky, "failed")
    await recordDeviceOutcome(dead, "gone")

    expect(await devicesForSending(user.id)).toEqual([])
    expect((await listDevices(user.id)).map((d) => [d.label, d.enabled])).toEqual([["Flaky", false]])
    // Switched back on by hand, and one success clears the count.
    expect(await setDeviceEnabled(user.id, flaky, true)).toBe(true)
    await recordDeviceOutcome(flaky, "ok")
    const [row] = await asOwner((q) => q("select failures, enabled, last_success_at is not null as delivered from push_devices where id = $1", [flaky]))
    expect(row).toEqual({ failures: 0, enabled: true, delivered: true })
  })

  it("follows a browser to its new address, keeping whether it was on", async () => {
    const user = await newUser("devices")
    const before = `https://updates.push.services.mozilla.com/wpush/v2/${randomUUID()}`
    const after = `https://updates.push.services.mozilla.com/wpush/v2/${randomUUID()}`
    const id = await registerDevice(user.id, { endpoint: before, p256dh: "k", auth: "a", label: "Firefox" })
    await setDeviceEnabled(user.id, id, false)

    expect(await moveDevice(user.id, before, { endpoint: after, p256dh: "k2", auth: "a2" })).toBe(true)
    expect(await moveDevice(user.id, before, { endpoint: after, p256dh: "k2", auth: "a2" })).toBe(false)

    const [row] = await asOwner((q) => q("select id, endpoint, enabled, label from push_devices where user_id = $1", [user.id]))
    expect(row).toEqual({ id, endpoint: after, enabled: false, label: "Firefox" })
  })

  it("cannot switch someone else's device", async () => {
    const owner = await newUser("devices")
    const other = await newUser("devices")
    const id = await registerDevice(owner.id, { endpoint: `https://fcm.googleapis.com/fcm/send/${randomUUID()}`, p256dh: "k", auth: "a", label: "Mine" })

    expect(await setDeviceEnabled(other.id, id, false)).toBe(false)
    await removeDevice(other.id, { id })

    expect((await listDevices(owner.id)).map((d) => d.enabled)).toEqual([true])
  })

  it("records what a send reached", async () => {
    const user = await newUser("sends")
    const sendId = await openSend(user.id, "test", new Date())

    await closeSend(sendId, { devices: 2, delivered: 1, removed: 1 })

    const rows = await asUser(user.id, (q) => q("select kind, devices, delivered, removed from notification_sends"))
    expect(rows).toEqual([{ kind: "test", devices: 2, delivered: 1, removed: 1 }])
  })

  it("reads a person's counts as the server, for the clock", async () => {
    const user = await newUser("clock-counts")
    actAs(user)
    const { id } = await createThought(user.id, randomUUID(), "I am bad")
    await insertLogs(user.id, [tap(id, new Date()), tap(id, new Date())])

    expect((await readThoughtsAsServer(user.id, TZ)).map((t) => t.counts.total)).toEqual([2])
  })
})

describe("rescheduling the next reminder", () => {
  it("starts the wait when reminders are switched on, restarts it from a log, and clears it when off", async () => {
    const user = await newUser("reschedule")
    actAs(user)
    // No quiet hours, so the arithmetic does not depend on the hour the suite runs at.
    await updateTimezone(user.id, "Europe/Copenhagen")
    const on = { ...DEFAULT_SETTINGS, remindersOn: true, intervalMinutes: 30 as const, quietStart: null, quietEnd: null }
    await writeSettings(user.id, on)
    const switchedOn = new Date()

    const first = await reschedulePrompts(user.id, { switchedOn: true }, switchedOn)
    expect(first?.getTime()).toBe(switchedOn.getTime() + 30 * 60_000)
    expect((await readPromptSchedule(user.id)).nextDueAt).toBe(first?.toISOString())

    // A log ten minutes later restarts the wait from the log (Q17).
    const { id } = await createThought(user.id, randomUUID(), "I am bad")
    const loggedAt = new Date(switchedOn.getTime() + 10 * 60_000)
    await insertLogs(user.id, [tap(id, loggedAt)])
    const afterLog = await reschedulePrompts(user.id, {}, loggedAt)
    expect(afterLog?.getTime()).toBe(loggedAt.getTime() + 30 * 60_000)

    await writeSettings(user.id, { ...on, remindersOn: false })
    expect(await reschedulePrompts(user.id, {}, loggedAt)).toBeNull()
    expect((await readPromptSchedule(user.id)).nextDueAt).toBeNull()
  })
})

describe("the Frequencies numbers", () => {
  it("match a count made by hand, in the person's own hours and days", async () => {
    const user = await newUser("stats")
    actAs(user)
    const now = new Date("2026-10-30T12:00:00.000Z") // Friday 13:00 CET
    const bad = await createThought(user.id, randomUUID(), "I am bad")
    const late = await createThought(user.id, randomUUID(), "I am late")
    const at = (iso: string) => new Date(iso)
    await insertLogs(user.id, [
      // Thursday 29 Oct, 20:xx CET (19:xxZ): three of "I am bad".
      tap(bad.id, at("2026-10-29T19:05:00.000Z")),
      tap(bad.id, at("2026-10-29T19:30:00.000Z")),
      tap(bad.id, at("2026-10-29T19:55:00.000Z")),
      // Friday 30 Oct 09:10 CET: one of each.
      tap(bad.id, at("2026-10-30T08:10:00.000Z")),
      tap(late.id, at("2026-10-30T08:10:00.000Z")),
    ])
    // Twelve days ago: only in the month.
    await asOwner((q) =>
      q("insert into thought_logs (id, user_id, thought_id, at, source) values ($1, $2, $3, $4, 'tap')", [
        randomUUID(), user.id, late.id, "2026-10-18T10:00:00.000Z",
      ]),
    )

    const stats = await readFrequencyStats("Europe/Copenhagen", now)

    expect(stats.weekTop).toEqual([
      { thoughtId: bad.id, n: 4 },
      { thoughtId: late.id, n: 1 },
    ])
    expect(stats.monthTop.find((t) => t.thoughtId === late.id)?.n).toBe(2)
    expect(stats.heat).toContainEqual({ dow: 4, hour: 20, n: 3 })
    expect(stats.heat).toContainEqual({ dow: 5, hour: 9, n: 2 })
    expect(stats.days).toContainEqual({ thoughtId: bad.id, day: "2026-10-29", n: 3 })
    expect(stats.prompts).toEqual({ delivered: 0, answered: 0 })
  })

  it("counts before and after a reframe, and answered reminders", async () => {
    const user = await newUser("stats")
    actAs(user)
    const { id } = await createThought(user.id, randomUUID(), "I am bad")
    const now = new Date()
    const day = 24 * 60 * 60_000
    // Four logs in the 4 days before the reframe, one after.
    const reframedAt = new Date(now.getTime() - 2 * day)
    await asOwner(async (q) => {
      for (const ago of [6, 5.5, 4, 3]) {
        await q("insert into thought_logs (id, user_id, thought_id, at, source) values ($1, $2, $3, $4, 'tap')", [
          randomUUID(), user.id, id, new Date(now.getTime() - ago * day).toISOString(),
        ])
      }
      await q("insert into thought_logs (id, user_id, thought_id, at, source) values ($1, $2, $3, $4, 'tap')", [
        randomUUID(), user.id, id, new Date(now.getTime() - 1 * day).toISOString(),
      ])
      await q(
        "insert into thought_reframes (id, user_id, thought_id, text, created_at) values ($1, $2, $3, 'I am learning', $4)",
        [randomUUID(), user.id, id, reframedAt.toISOString()],
      )
    })
    const answeredId = await openSend(user.id, "thought-prompt", new Date(now.getTime() - 60_000))
    const ignoredId = await openSend(user.id, "thought-prompt", new Date(now.getTime() - 30 * 60_000))
    await closeSend(answeredId, { devices: 1, delivered: 1, removed: 0 })
    await closeSend(ignoredId, { devices: 1, delivered: 1, removed: 0 })
    await insertLogs(user.id, [tap(null, now, { source: "prompt", promptId: answeredId })])

    const stats = await readFrequencyStats("Europe/Copenhagen", now)

    const r = stats.reframes.find((x) => x.thoughtId === id)!
    expect(r.beforeN).toBe(4)
    expect(r.beforeDays).toBeCloseTo(4, 1)
    expect(r.afterN).toBe(1)
    expect(r.afterDays).toBeCloseTo(2, 1)
    expect(stats.prompts).toEqual({ delivered: 2, answered: 1 })
  })
})
