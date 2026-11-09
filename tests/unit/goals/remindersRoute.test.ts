/**
 * PUT /api/life-plan/reminders refuses everything but its three keys, another
 * site, and a body that is not JSON (Plans/life-plan-after-setup.md, Phase 5).
 */
import { describe, it, expect, vi, beforeEach } from "vitest"

const { writeReminder } = vi.hoisted(() => ({ writeReminder: vi.fn(async () => undefined) }))

vi.mock("@/src/db/auth", () => ({
  requireAuth: vi.fn(async () => ({ success: true, userId: "u1", supabase: {} })),
}))
vi.mock("@/src/db/lifePlanRemindersRepo", () => ({
  writeReminder,
  readReminder: vi.fn(async () => ({ pushOn: true, reviewDay: 1, reviewHour: 8 })),
}))
vi.mock("@/src/db/notificationsRepo", () => ({ listDevices: vi.fn(async () => []) }))

import { PUT } from "@/app/api/life-plan/reminders/route"

const put = (body: unknown, headers: Record<string, string> = {}) =>
  PUT(new Request("https://app.test/api/life-plan/reminders", {
    method: "PUT",
    headers: { "content-type": "application/json", ...headers },
    body: typeof body === "string" ? body : JSON.stringify(body),
  }))

beforeEach(() => writeReminder.mockClear())

describe("PUT /api/life-plan/reminders", () => {
  it.each([
    ["an unknown key", { userId: "someone-else" }],
    ["no key at all", {}],
    ["an hour before 06:00", { reviewHour: 5 }],
    ["an hour after 22:00", { reviewHour: 23 }],
    ["a day 0", { reviewDay: 0 }],
    ["a switch that is not true or false", { pushOn: "yes" }],
  ])("refuses %s with 400, and writes nothing", async (_name, body) => {
    expect((await put(body)).status).toBe(400)
    expect(writeReminder).not.toHaveBeenCalled()
  })

  it("refuses a request from another site with 403", async () => {
    expect((await put({ pushOn: true }, { "sec-fetch-site": "cross-site" })).status).toBe(403)
  })

  it("refuses a body that is not JSON with 415", async () => {
    expect((await put("pushOn=true", { "content-type": "application/x-www-form-urlencoded" })).status).toBe(415)
  })

  it("writes only the key it was given, for the signed-in user, and answers no-store", async () => {
    const res = await put({ reviewHour: 8 })
    expect(res.status).toBe(200)
    expect(writeReminder).toHaveBeenCalledWith("u1", { reviewHour: 8 })
    expect(res.headers.get("cache-control")).toBe("no-store")
    expect(await res.json()).toEqual({ pushOn: true, reviewDay: 1, reviewHour: 8 })
  })
})
