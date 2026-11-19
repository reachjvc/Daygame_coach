// @vitest-environment node
/**
 * The copy space never pings a phone: a `remindOn` sent to the settings route on the copy space is dropped
 * before the write, so `remind_on` stays false there (Plans/plan-new-from-real.md, Phase 3.4).
 */
import { describe, it, expect, vi, beforeEach } from "vitest"

const OWNER = "00000000-0000-4000-8000-0000000000a1"
const HIDDEN = "00000000-0000-4000-8000-0000000000c3"

let target: "self" | "sandbox" = "sandbox"
vi.mock("@/src/db/planSandbox", () => ({
  requirePlanTarget: vi.fn(async () => ({
    success: true,
    userId: target === "sandbox" ? HIDDEN : OWNER,
    ownerId: OWNER,
    supabase: { tag: target },
    target,
  })),
}))
const repo = vi.hoisted(() => ({
  readCouncil: vi.fn(async () => []),
  readCouncilSettings: vi.fn(async () => ({ weekValue: null, weekOf: null, remindOn: false, remindHour: 8 })),
  writeCouncilSettings: vi.fn(async () => undefined),
}))
vi.mock("@/src/db/roleModelsRepo", () => repo)
vi.mock("@/src/db/notificationsRepo", () => ({ listDevices: vi.fn(async () => []) }))
vi.mock("@/src/db/settingsRepo", () => ({ getUserTimezone: vi.fn(async () => "UTC") }))

import { PUT } from "@/app/api/role-models/settings/route"

const put = (body: unknown) =>
  new Request("http://localhost/api/role-models/settings", { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify(body) })

beforeEach(() => vi.clearAllMocks())

describe("settings PUT on the copy space", () => {
  it("drops remindOn and still writes the rest", async () => {
    target = "sandbox"
    const res = await PUT(put({ remindOn: true, remindHour: 9 }))
    expect(res.status).toBe(200)
    expect(repo.writeCouncilSettings).toHaveBeenCalledTimes(1)
    const [userId, written, client] = repo.writeCouncilSettings.mock.calls[0] as unknown as [string, Record<string, unknown>, { tag: string }]
    expect(userId).toBe(HIDDEN)
    expect(client.tag).toBe("sandbox")
    expect(written).not.toHaveProperty("remindOn")
    expect(written.remindHour).toBe(9)
  })

  it("on the real account remindOn goes through", async () => {
    target = "self"
    await PUT(put({ remindOn: true }))
    const [userId, written] = repo.writeCouncilSettings.mock.calls[0] as unknown as [string, Record<string, unknown>]
    expect(userId).toBe(OWNER)
    expect(written.remindOn).toBe(true)
  })
})
