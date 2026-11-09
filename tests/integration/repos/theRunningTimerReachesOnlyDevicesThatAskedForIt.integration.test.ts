/**
 * THE RUNNING-TIMER NOTIFICATION GOES ONLY WHERE IT WAS ASKED FOR, against the
 * real schema (Plans/time-tracker-like-toggl.md, Phase 7, items 1, 3 and 4).
 *
 * "Show the running timer on this device" is a setting of its own on each
 * device row (`push_devices.timer_running`), apart from the Thought
 * Frequencies switch (`enabled`). The push services are faked (`web-push`), and
 * so are the vault keys, the way thoughtsClock.integration.test.ts fakes them.
 * Everything else is real: the device rows, the send log, the entries.
 *
 * What is proved:
 *   - a timer push reaches the devices with the setting on, and no other — so a
 *     device with it off is never handed the entry's description;
 *   - Thought Frequencies reminders still reach only their own devices;
 *   - a failed timer send never switches reminders on, and twenty switch both off;
 *   - an installed app registers with the setting on, a desktop browser off;
 *   - each start or stop leaves a 'timetrack-running' row in the send log;
 *   - the 6 h alert is recorded once per entry, so it rings once.
 *
 * THE ALERT CLOCK READS EVERY PERSON'S RUNNING ENTRIES, so its tests assert only
 * about this file's own users, like the reminder clock's.
 */
import { describe, it, expect, vi, beforeEach } from "vitest"
import { randomUUID } from "node:crypto"
import { actAs, asOwner, asUser, newUser } from "@/tests/db/harness"
import { call } from "@/tests/integration/routes/call"
import { listDevices, openSend, recordDeviceOutcome, registerDevice, setDeviceTimer } from "@/src/db/notificationsRepo"
import { readTimerState } from "@/src/db/timetrackRepo"
import { updateTimezone } from "@/src/db/settingsRepo"
import { sendToPerson } from "@/src/notifications/pushService"
import { announce, announceCurrentTimer, announceTimerChange, runTimerAlertClock, type TimerRow } from "@/src/timetrack/runningTimerService"
import * as devicesRoute from "@/app/api/notifications/devices/route"
import * as deviceRoute from "@/app/api/notifications/devices/[id]/route"

vi.mock("@/src/db/supabase", async (importOriginal) =>
  (await import("@/tests/db/harness")).stackSupabaseModule(await importOriginal())
)
vi.mock("@/src/db/notificationsRepo", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/src/db/notificationsRepo")>()),
  readNotificationSecret: async (name: string) => (name === "notifications_clock_secret" ? null : `test-${name}`),
}))
vi.mock("@/src/shared/afterResponse", () => ({ afterResponse: () => undefined }))

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

const endpoint = () => `https://fcm.googleapis.com/fcm/send/${randomUUID()}`

/** A phone (reminders and timer), a PC (reminders only) and a tablet (timer only). */
async function personWithDevices(label: string) {
  const user = await newUser(label)
  actAs(user)
  await updateTimezone(user.id, "Europe/Copenhagen")
  const phone = endpoint()
  const pc = endpoint()
  const tablet = endpoint()
  const ids = {
    phone: await registerDevice(user.id, { endpoint: phone, p256dh: "BNcR", auth: "tBHI", label: "Android phone · installed app" }, true, true),
    pc: await registerDevice(user.id, { endpoint: pc, p256dh: "BNcR", auth: "tBHI", label: "Windows PC · Chrome" }, true, false),
    tablet: await registerDevice(user.id, { endpoint: tablet, p256dh: "BNcR", auth: "tBHI", label: "Tablet · installed app" }, false, true),
  }
  return { user, endpoints: { phone, pc, tablet }, ids }
}

function timer(over: Partial<TimerRow> = {}): TimerRow {
  return {
    id: randomUUID(),
    description: "Private: therapist appointment",
    projectName: null,
    startedAt: "2026-11-04T16:05:00.000Z",
    stoppedAt: null,
    deletedAt: null,
    updatedAt: "2026-11-04T16:05:00.000Z",
    ...over,
  }
}

const sendsOf = (userId: string) =>
  asOwner((q) => q("select kind, entry_id, devices, delivered from notification_sends where user_id = $1 order by sent_at, kind", [userId]))

describe("who the running timer reaches", () => {
  it("reaches the devices with the timer on and no other, so the description goes nowhere else", async () => {
    const { user, endpoints } = await personWithDevices("timer-reach")
    const entry = timer()

    await announce(user.id, { kind: "running", entry }, new Date("2026-11-04T16:30:00Z"))

    expect(sent.map((s) => s.endpoint).sort()).toEqual([endpoints.phone, endpoints.tablet].sort())
    for (const s of sent) {
      expect(s.payload.title).toBe("● Private: therapist appointment · since 17:05")
      expect(s.options).toMatchObject({ topic: "timer-running" })
    }
    expect(JSON.stringify(sent.filter((s) => s.endpoint === endpoints.pc))).not.toContain("therapist")
    expect(await sendsOf(user.id)).toEqual([{ kind: "timetrack-running", entry_id: entry.id, devices: 2, delivered: 2 }])
  })

  it("a stop is recorded and sent the same way", async () => {
    const { user, endpoints } = await personWithDevices("timer-stop-send")
    const entry = timer({ stoppedAt: "2026-11-04T17:17:00.000Z" })

    await announce(user.id, { kind: "stopped", entry }, new Date("2026-11-04T17:17:00Z"))

    expect(sent.map((s) => s.endpoint).sort()).toEqual([endpoints.phone, endpoints.tablet].sort())
    expect(sent[0].payload.title).toBe("Stopped · Private: therapist appointment 1:12")
    expect((await sendsOf(user.id)).map((s) => s.kind)).toEqual(["timetrack-running"])
  })

  it("a person with no device that asked for it gets nothing, and nothing is recorded", async () => {
    const user = await newUser("timer-none")
    actAs(user)
    await registerDevice(user.id, { endpoint: endpoint(), p256dh: "BNcR", auth: "tBHI", label: "Windows PC · Chrome" }, true, false)

    await announce(user.id, { kind: "running", entry: timer() }, new Date())

    expect(sent).toEqual([])
    expect(await sendsOf(user.id)).toEqual([])
  })

  it("ping-switch notifications still reach only their own devices", async () => {
    const { user, endpoints } = await personWithDevices("timer-thoughts-apart")

    await sendToPerson(user.id, "test", () => ({ title: "Test notification", body: "x", url: "/settings", tag: "test" }))

    expect(sent.map((s) => s.endpoint).sort()).toEqual([endpoints.phone, endpoints.pc].sort())
  })

  it("a failed timer send never switches reminders on, and twenty in a row switch both off", async () => {
    const { user, ids } = await personWithDevices("timer-failures")

    await recordDeviceOutcome(ids.tablet, "failed")
    let tablet = (await listDevices(user.id)).find((d) => d.id === ids.tablet)!
    expect([tablet.enabled, tablet.timerRunning]).toEqual([false, true])

    for (let i = 0; i < 20; i++) await recordDeviceOutcome(ids.phone, "failed")
    const phone = (await listDevices(user.id)).find((d) => d.id === ids.phone)!
    expect([phone.enabled, phone.timerRunning]).toEqual([false, false])
    tablet = (await listDevices(user.id)).find((d) => d.id === ids.tablet)!
    expect(tablet.timerRunning).toBe(true)
  })
})

describe("the setting, per device", () => {
  const sub = (e: string) => ({ endpoint: e, keys: { p256dh: "BNcR_x", auth: "tBHI_x" } })

  it("the installed phone app turning reminders on gets the timer too; a desktop browser or desktop app does not", async () => {
    const user = await newUser("timer-defaults")
    actAs(user)
    const phone = endpoint()
    const pc = endpoint()
    const pcApp = endpoint()

    await call(devicesRoute.POST, "/api/notifications/devices", { method: "POST", body: { intent: "enable", label: "Android phone · installed app", subscription: sub(phone) } })
    await call(devicesRoute.POST, "/api/notifications/devices", { method: "POST", body: { intent: "enable", label: "Windows PC · Chrome", subscription: sub(pc) } })
    await call(devicesRoute.POST, "/api/notifications/devices", { method: "POST", body: { intent: "enable", label: "Windows PC · installed app", subscription: sub(pcApp) } })

    const rows = await asOwner((q) => q("select endpoint, enabled, timer_running from push_devices where user_id = $1", [user.id]))
    expect(rows.find((r) => r.endpoint === phone)).toMatchObject({ enabled: true, timer_running: true })
    expect(rows.find((r) => r.endpoint === pc)).toMatchObject({ enabled: true, timer_running: false })
    expect(rows.find((r) => r.endpoint === pcApp)).toMatchObject({ enabled: true, timer_running: false })
  })

  it("switching the timer on in the tracker registers the device for the timer only, and refreshing keeps it", async () => {
    const user = await newUser("timer-only")
    actAs(user)
    const pc = endpoint()

    const on = await call<{ id: string; enabled: boolean; timerRunning: boolean }>(devicesRoute.POST, "/api/notifications/devices", {
      method: "POST",
      body: { intent: "timer", label: "Windows PC · Chrome", subscription: sub(pc) },
    })
    expect(on.status, JSON.stringify(on.body)).toBe(200)
    expect(on.body).toMatchObject({ enabled: false, timerRunning: true })

    const refreshed = await call<{ id: string; enabled: boolean; timerRunning: boolean }>(devicesRoute.POST, "/api/notifications/devices", {
      method: "POST",
      body: { intent: "refresh", label: "Windows PC · Chrome", subscription: sub(pc) },
    })
    expect(refreshed.body).toMatchObject({ id: on.body.id, enabled: false, timerRunning: true })

    const off = await call(deviceRoute.PATCH, `/api/notifications/devices/${on.body.id}`, { method: "PATCH", body: { timerRunning: false }, params: { id: on.body.id } })
    expect(off.status).toBe(200)
    expect((await listDevices(user.id)).map((d) => [d.enabled, d.timerRunning])).toEqual([[false, false]])
  })

  it("turning reminders on for a device keeps its timer setting as it was", async () => {
    const user = await newUser("timer-kept")
    actAs(user)
    const pc = endpoint()
    await call(devicesRoute.POST, "/api/notifications/devices", { method: "POST", body: { intent: "timer", label: "Windows PC · Chrome", subscription: sub(pc) } })
    await call(devicesRoute.POST, "/api/notifications/devices", { method: "POST", body: { intent: "enable", label: "Windows PC · Chrome", subscription: sub(pc) } })
    expect((await listDevices(user.id)).map((d) => [d.enabled, d.timerRunning])).toEqual([[true, true]])
  })

  it("nobody can switch the timer on someone else's device", async () => {
    const owner = await newUser("timer-owner")
    actAs(owner)
    const id = await registerDevice(owner.id, { endpoint: endpoint(), p256dh: "k", auth: "a", label: "Mine" }, true, false)
    actAs(await newUser("timer-stranger"))

    const answer = await call(deviceRoute.PATCH, `/api/notifications/devices/${id}`, { method: "PATCH", body: { timerRunning: true }, params: { id } })

    expect(answer.status).toBe(404)
    expect(await setDeviceTimer(randomUUID(), id, true), "the repo filters by the caller's id too").toBe(false)
    actAs(owner)
    expect((await listDevices(owner.id)).map((d) => d.timerRunning)).toEqual([false])
    expect(await setDeviceTimer(owner.id, id, true)).toBe(true)
    expect((await listDevices(owner.id)).map((d) => [d.enabled, d.timerRunning])).toEqual([[true, true]])
  })
})

describe("a browser A left without Log Out, then B signed in on it", () => {
  const sub = (e: string) => ({ endpoint: e, keys: { p256dh: "BNcR_x", auth: "tBHI_x" } })

  /**
   * What every signed-in page now asks when it loads (`claimThisDevice`, the (app)
   * layout): before, only Time › Settings and Thoughts asked, so A's running timer,
   * by name, went on reaching B's screen (account-switching audit, Phase 8).
   */
  it("is B's once B's page asks: A's running timer no longer reaches it, and B is sent nothing they did not ask for", async () => {
    const a = await newUser("left-a")
    actAs(a)
    const phone = endpoint()
    await call(devicesRoute.POST, "/api/notifications/devices", {
      method: "POST",
      body: { intent: "enable", label: "Android phone · installed app", subscription: sub(phone) },
    })
    expect((await listDevices(a.id)).map((d) => [d.enabled, d.timerRunning])).toEqual([[true, true]])

    const b = await newUser("left-b")
    actAs(b)
    const asked = await call<{ id: string; enabled: boolean; timerRunning: boolean }>(devicesRoute.POST, "/api/notifications/devices", {
      method: "POST",
      body: { intent: "refresh", label: "Android phone · installed app", subscription: sub(phone) },
    })

    expect(asked.status, JSON.stringify(asked.body)).toBe(200)
    expect(asked.body).toMatchObject({ enabled: false, timerRunning: false })
    expect(await listDevices(a.id), "the browser is still A's device").toEqual([])
    expect((await listDevices(b.id)).map((d) => [d.enabled, d.timerRunning])).toEqual([[false, false]])

    actAs(a)
    await announce(a.id, { kind: "running", entry: timer() }, new Date("2026-11-04T16:30:00Z"))
    expect(JSON.stringify(sent), "A's running timer still reached the browser B is signed in on").not.toContain(phone)
  })
})

/** One running entry for `userId`, in their one workspace (made if missing), arranged as the owner. */
async function entryOf(userId: string, over: { description?: string; startedAt?: string } = {}): Promise<string> {
  const id = randomUUID()
  await asOwner(async (q) => {
    const existing = await q("select id from timetrack_workspaces where user_id = $1 and deleted_at is null", [userId])
    const ws = (existing[0]?.id as string | undefined) ?? randomUUID()
    if (existing.length === 0) await q("insert into timetrack_workspaces (id, user_id, name) values ($1, $2, 'W')", [ws, userId])
    await q("insert into timetrack_entries (id, user_id, workspace_id, description, started_at) values ($1, $2, $3, $4, $5)", [
      id,
      userId,
      ws,
      over.description ?? "Gym",
      over.startedAt ?? "2026-11-04T16:05:00.000Z",
    ])
  })
  return id
}

describe("the sync route's two reads, against the real rows", () => {
  it("a timer stopped between the two reads is pushed as stopped, with its stored length", async () => {
    const { user, endpoints } = await personWithDevices("timer-change-stop")
    const entry = await entryOf(user.id)
    const before = await readTimerState(user.id, [])

    await asOwner((q) =>
      q("update timetrack_entries set stopped_at = '2026-11-04T17:17:00Z', duration_seconds = 4320 where id = $1", [entry]),
    )
    await announceTimerChange(user.id, before, new Date("2026-11-04T17:17:05Z"))

    expect(sent.map((s) => s.endpoint).sort()).toEqual([endpoints.phone, endpoints.tablet].sort())
    expect(sent[0].payload).toMatchObject({ title: "Stopped · Gym 1:12", silent: true })
  })

  it("an edit of only the description between the two reads pushes nothing", async () => {
    const { user } = await personWithDevices("timer-change-rename")
    const entry = await entryOf(user.id)
    const before = await readTimerState(user.id, [])

    await asOwner((q) => q("update timetrack_entries set description = 'Gym, legs' where id = $1", [entry]))
    await announceTimerChange(user.id, before, new Date())

    expect(sent).toEqual([])
    expect(await sendsOf(user.id)).toEqual([])
  })

  it("switching the timer on shows whatever runs now, at once", async () => {
    const { user, endpoints } = await personWithDevices("timer-current")
    const entry = await entryOf(user.id, { description: "Deep work" })

    await announceCurrentTimer(user.id, new Date("2026-11-04T16:30:00Z"))

    expect(sent.map((s) => s.endpoint).sort()).toEqual([endpoints.phone, endpoints.tablet].sort())
    expect(sent[0].payload).toMatchObject({ title: "● Deep work · since 17:05", entryId: entry, actions: [{ id: "stop", title: "Stop" }] })
  })
})

describe("the running entries, through row security", () => {
  it("reads only the signed-in person's running timers, and the ones it was asked about by id", async () => {
    const mine = await newUser("timer-state-mine")
    const theirs = await newUser("timer-state-theirs")
    const ws = [randomUUID(), randomUUID()]
    const running = randomUUID()
    const stopped = randomUUID()
    const strangers = randomUUID()
    await asOwner(async (q) => {
      await q("insert into timetrack_workspaces (id, user_id, name) values ($1, $2, 'A'), ($3, $4, 'B')", [ws[0], mine.id, ws[1], theirs.id])
      await q("insert into timetrack_projects (id, user_id, workspace_id, name) values ($1, $2, $3, 'Health')", [`p-${running}`, mine.id, ws[0]])
      await q(
        `insert into timetrack_entries (id, user_id, workspace_id, project_id, description, started_at, stopped_at, duration_seconds) values
          ($1, $2, $3, $4, '', now() - interval '1 hour', null, null),
          ($5, $2, $3, null, 'Done', now() - interval '3 hours', now() - interval '2 hours', 3600),
          ($6, $7, $8, null, 'Not yours', now() - interval '1 hour', null, null)`,
        [running, mine.id, ws[0], `p-${running}`, stopped, strangers, theirs.id, ws[1]],
      )
    })
    actAs(mine)

    const state = await readTimerState(mine.id, [stopped, strangers])

    expect(state.map((r) => r.id).sort()).toEqual([running, stopped].sort())
    expect(state.find((r) => r.id === running)).toMatchObject({ description: "", projectName: "Health", stoppedAt: null })
    expect(state.find((r) => r.id === stopped)?.stoppedAt).not.toBeNull()
  })
})

/** A fixed-offset zone where the local hour is `hour` at `now`. */
function zoneAt(now: Date, hour: number): string {
  const offset = (hour - now.getUTCHours() + 24) % 24
  const signed = offset > 12 ? offset - 24 : offset
  return signed === 0 ? "UTC" : `Etc/GMT${signed > 0 ? "-" : "+"}${Math.abs(signed)}`
}

/** A zone where it is midday now, so the 23:00–07:00 hold cannot interfere. */
const middayZone = (now: Date) => zoneAt(now, 12)

describe("the database's minute clock calls the site when an alert is due", () => {
  const dueFor = (userId: string) =>
    asOwner(async (q) => (await q("select public.timetrack_alert_due($1) as due", [userId]))[0]!.due as boolean)

  async function forgotten(label: string, hour: number, startedHoursAgo = 7) {
    const now = new Date()
    const { user } = await personWithDevices(label)
    await updateTimezone(user.id, zoneAt(now, hour))
    const entry = await entryOf(user.id, { startedAt: new Date(now.getTime() - startedHoursAgo * 3_600_000).toISOString() })
    return { user, entry }
  }

  it("is due for a timer past 6 h of a person with the timer on, by day where they are", async () => {
    const { user } = await forgotten("clock-due", 12)
    expect(await dueFor(user.id)).toBe(true)
  })

  it("is not due once the alert was sent, before 6 h, at night, or with no device showing the timer", async () => {
    const sent = await forgotten("clock-sent", 12)
    await openSend(sent.user.id, "timetrack-alert", new Date(), sent.entry)
    expect(await dueFor(sent.user.id), "already alerted").toBe(false)

    expect(await dueFor((await forgotten("clock-young", 12, 5)).user.id), "5 h in").toBe(false)
    expect(await dueFor((await forgotten("clock-night", 3)).user.id), "03:00 where they are").toBe(false)

    const off = await forgotten("clock-no-device", 12)
    await asOwner((q) => q("update push_devices set timer_running = false where user_id = $1", [off.user.id]))
    expect(await dueFor(off.user.id), "no device shows the timer").toBe(false)
  })

  it("reads a zone Postgres does not know as UTC instead of failing the reminders' tick", async () => {
    const { user } = await forgotten("clock-odd-zone", 12)
    await asOwner((q) => q("update profiles set timezone = 'Mars/Olympus_Mons' where id = $1", [user.id]))
    await expect(dueFor(user.id)).resolves.toEqual(expect.any(Boolean))
    await expect(asOwner((q) => q("select public.notifications_clock_tick()"))).resolves.toBeDefined()
  })

  it("no signed-in person can ask it", async () => {
    const user = await newUser("clock-private")
    await expect(
      asUser(user.id, (q) => q("select public.timetrack_alert_due()")),
    ).rejects.toMatchObject({ code: "42501" })
  })
})

describe("the 6 h alert rings once", () => {
  it("the send log takes one alert per entry, and refuses a second", async () => {
    const user = await newUser("alert-once-log")
    const entry = randomUUID()
    expect(await openSend(user.id, "timetrack-alert", new Date(), entry)).toEqual(expect.any(String))
    expect(await openSend(user.id, "timetrack-alert", new Date(), entry)).toBeNull()
    expect((await sendsOf(user.id)).map((s) => s.kind)).toEqual(["timetrack-alert"])
  })

  it("the clock rings for a timer past 6 h, with sound, and not again on the next tick", async () => {
    const now = new Date()
    const { user, endpoints } = await personWithDevices("alert-once-clock")
    await updateTimezone(user.id, middayZone(now))
    const ws = randomUUID()
    const entry = randomUUID()
    await asOwner(async (q) => {
      await q("insert into timetrack_workspaces (id, user_id, name) values ($1, $2, 'W')", [ws, user.id])
      await q("insert into timetrack_entries (id, user_id, workspace_id, description, started_at) values ($1, $2, $3, 'Forgotten', $4)", [
        entry,
        user.id,
        ws,
        new Date(now.getTime() - 7 * 3_600_000).toISOString(),
      ])
    })

    await runTimerAlertClock(now)
    const mine = (): typeof sent => sent.filter((s) => s.payload.entryId === entry)
    expect(mine().map((s) => s.endpoint).sort()).toEqual([endpoints.phone, endpoints.tablet].sort())
    expect(mine()[0].payload).toMatchObject({ silent: false, renotify: true, tag: "timer-running" })

    await runTimerAlertClock(new Date(now.getTime() + 60_000))
    expect(mine()).toHaveLength(2)
    expect((await sendsOf(user.id)).filter((s) => s.kind === "timetrack-alert")).toEqual([
      { kind: "timetrack-alert", entry_id: entry, devices: 2, delivered: 2 },
    ])
  })

  /**
   * NO ACCOUNT CAN CROWD ANOTHER'S ALERT OUT (security review, 2026-11-04).
   * Start times are the device's to set and one sync takes 1,600 rows, so an
   * account can hold hundreds of running entries just past 6 h. The clock took
   * the 200 newest of everyone's and only then dropped the ones it could not
   * alert: those of an account with no device showing the timer are never
   * marked alerted, so they stayed in front for ever and an older, real timer
   * was never reached.
   */
  it("an older timer still rings when another account holds 201 newer running entries past 6 h", async () => {
    const now = new Date()
    const crowd = await newUser("alert-crowd")
    const ws = randomUUID()
    await updateTimezone(crowd.id, middayZone(now))
    await asOwner(async (q) => {
      await q("insert into timetrack_workspaces (id, user_id, name) values ($1, $2, 'W')", [ws, crowd.id])
      await q(
        `insert into timetrack_entries (id, user_id, workspace_id, description, started_at)
         select gen_random_uuid()::text, $1, $2, 'Crowd', $3::timestamptz + make_interval(secs => n)
           from generate_series(1, 201) as n`,
        [crowd.id, ws, new Date(now.getTime() - 6 * 3_600_000 - 10 * 60_000).toISOString()],
      )
    })

    const { user, endpoints } = await personWithDevices("alert-crowded-out")
    await updateTimezone(user.id, middayZone(now))
    const entry = await entryOf(user.id, { description: "Forgotten", startedAt: new Date(now.getTime() - 8 * 3_600_000).toISOString() })

    await runTimerAlertClock(now)

    expect(sent.filter((s) => s.payload.entryId === entry).map((s) => s.endpoint).sort()).toEqual([endpoints.phone, endpoints.tablet].sort())
  })

  it("offers each person one timer at a time, their oldest, so one account cannot take every place", async () => {
    const now = new Date()
    const { user } = await personWithDevices("alert-one-each")
    await updateTimezone(user.id, middayZone(now))
    const oldest = await entryOf(user.id, { startedAt: new Date(now.getTime() - 9 * 3_600_000).toISOString() })
    const newer = await entryOf(user.id, { startedAt: new Date(now.getTime() - 7 * 3_600_000).toISOString() })

    await runTimerAlertClock(now)
    const alerted = async () => (await sendsOf(user.id)).filter((s) => s.kind === "timetrack-alert").map((s) => s.entry_id)
    expect(await alerted()).toEqual([oldest])

    await runTimerAlertClock(new Date(now.getTime() + 60_000))
    expect(await alerted()).toEqual([oldest, newer])
  })
})

