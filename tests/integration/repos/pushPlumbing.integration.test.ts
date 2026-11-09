/**
 * THE NOTIFICATION PLUMBING'S STORAGE, through the app's own repo functions,
 * against the real schema with real row security (tests/db/harness.ts).
 *
 * Moved out of the Thoughts integration tests (Plans/energy-audit.md, Phase 1):
 * devices, send records and the vault keys are shared by Time and the audit.
 * The push services are faked (`web-push`), and so are the vault keys: the
 * test stack's vault is empty on purpose.
 */
import { describe, it, expect, vi, beforeEach } from "vitest"
import { randomUUID } from "node:crypto"
import { actAs, asOwner, asUser, newUser } from "@/tests/db/harness"
import {
  closeSend,
  devicesForSending,
  listDevices,
  moveDevice,
  openSend,
  recordDeviceOutcome,
  registerDevice,
  removeDevice,
  setDeviceEnabled,
} from "@/src/db/notificationsRepo"
import { updateTimezone } from "@/src/db/settingsRepo"
import { pushKeys, sendToPerson } from "@/src/notifications/pushService"

vi.mock("@/src/db/supabase", async (importOriginal) =>
  (await import("@/tests/db/harness")).stackSupabaseModule(await importOriginal())
)

vi.mock("@/src/db/notificationsRepo", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/src/db/notificationsRepo")>()),
  readNotificationSecret: async (name: string) => (name === "notifications_clock_secret" ? null : `test-${name}`),
}))

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

describe("the notification plumbing's storage", () => {
  it("keeps the devices and the keys away from every signed-in person", async () => {
    const user = await newUser("clock-private")
    await registerDevice(user.id, { endpoint: `https://fcm.googleapis.com/fcm/send/${randomUUID()}`, p256dh: "k", auth: "a", label: "Test" })

    await asUser(user.id, async (q) => {
      expect(await q("select count(*)::int as n from push_devices")).toEqual([{ n: 0 }])
      await expect(q("select public.notification_secret('push_vapid_private')")).rejects.toMatchObject({ code: "42501" })
      await expect(
        q("insert into push_devices (user_id, endpoint, p256dh, auth) values ($1, 'https://evil.example/x', 'k', 'a')", [user.id]),
      ).rejects.toMatchObject({ code: "42501" })
    })
    // The server may read it; nothing has been stored in the test vault.
    const real = await vi.importActual<typeof import("@/src/db/notificationsRepo")>("@/src/db/notificationsRepo")
    expect(await real.readNotificationSecret("push_vapid_private")).toBeNull()
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

})

async function personWithDevices(label: string, count: number) {
  const user = await newUser(label)
  actAs(user)
  await updateTimezone(user.id, "Europe/Copenhagen")
  const endpoints: string[] = []
  for (let i = 0; i < count; i++) {
    const endpoint = `https://fcm.googleapis.com/fcm/send/${randomUUID()}`
    await registerDevice(user.id, { endpoint, p256dh: "BNcR", auth: "tBHI", label: `Device ${i}` })
    endpoints.push(endpoint)
  }
  return { user, endpoints }
}

const sendsOf = (userId: string) =>
  asOwner((q) => q("select kind, devices, delivered, removed from notification_sends where user_id = $1", [userId]))

describe("sending to a person", () => {
  it("removes a device the push service says is gone, and still reaches the others", async () => {
    const { user, endpoints } = await personWithDevices("plumbing-gone", 2)
    answers.set(endpoints[0], 410)

    await sendToPerson(user.id, "test", () => ({ title: "Test notification", body: "x", url: "/settings", tag: "test" }))

    expect(await sendsOf(user.id)).toEqual([{ kind: "test", devices: 2, delivered: 1, removed: 1 }])
    const left = await asOwner((q) => q("select endpoint from push_devices where user_id = $1", [user.id]))
    expect(left).toEqual([{ endpoint: endpoints[1] }])
  })

  it("reaches every switched-on device and records a test, never a ping", async () => {
    const { user, endpoints } = await personWithDevices("plumbing-test", 2)
    expect(await pushKeys()).toEqual({ publicKey: "test-push_vapid_public", privateKey: "test-push_vapid_private" })

    const result = await sendToPerson(user.id, "test", () => ({ title: "Test notification", body: "x", url: "/settings", tag: "test" }))

    expect(result).toMatchObject({ devices: 2, delivered: 2, removed: 0 })
    expect(sent.filter((s) => endpoints.includes(s.endpoint)).map((s) => s.options.topic)).toEqual(["test", "test"])
    expect(await sendsOf(user.id)).toEqual([{ kind: "test", devices: 2, delivered: 2, removed: 0 }])
  })
})
