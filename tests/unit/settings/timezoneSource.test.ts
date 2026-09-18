/**
 * WHO IS ALLOWED TO SAY "NOBODY CHOSE THIS".
 *
 * `timezone_source` is the difference between a zone somebody typed into
 * Settings and one the browser volunteered. It only works if the two are told
 * apart at the point of writing, and there is exactly one caller entitled to
 * write 'detected': the one-time sync, which is also the only one that wrote a
 * zone nobody asked for.
 *
 * Get this wrong in the generous direction and a zone somebody chose is
 * labelled as never-set — and then the sync overwrites their choice on the
 * next device they open the app on, silently, which is worse than the bug this
 * whole thing exists to fix.
 */

import { describe, it, expect, vi, beforeEach } from "vitest"

// Static imports, not `await import`: vitest hoists `vi.mock` above every
// import in the file, so both already see the mocks — and a top-level await
// would be a new type error the ratchet counts.
import { handleUpdateTimezone } from "@/src/settings/settingsService"
import { PUT } from "@/app/api/settings/time-preferences/route"

// `vi.hoisted`, because `vi.mock`'s factory is lifted above every import in
// the file and so cannot see an ordinary `const` declared beside it.
const { updateTimezone } = vi.hoisted(() => ({ updateTimezone: vi.fn(async () => {}) }))

vi.mock("@/src/db/auth", () => ({
  requireAuth: vi.fn(async () => ({ success: true, userId: "u1", supabase: {} })),
}))

// Partial: settingsService imports a dozen other things from this repo, and
// replacing the module wholesale would make this test about the mock.
vi.mock("@/src/db/settingsRepo", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/src/db/settingsRepo")>()),
  updateTimezone,
  getTimePreferences: vi.fn(async () => ({
    timezone: "UTC",
    timezone_source: "signup_default" as const,
    week_start_day: 0,
  })),
}))


beforeEach(() => {
  updateTimezone.mockClear()
})

describe("what the service records", () => {
  it("records a chosen zone when nobody says otherwise", async () => {
    // Both callers that omit it are a person acting: the Settings page's save
    // and the goals dialog's time picker.
    await handleUpdateTimezone("u1", "Europe/Copenhagen")
    expect(updateTimezone).toHaveBeenCalledWith("u1", "Europe/Copenhagen", "chosen")
  })

  it("records a detected zone only when told to", async () => {
    await handleUpdateTimezone("u1", "Europe/Copenhagen", "detected")
    expect(updateTimezone).toHaveBeenCalledWith("u1", "Europe/Copenhagen", "detected")
  })

  it("refuses a zone that is not a zone, before writing anything", async () => {
    await expect(handleUpdateTimezone("u1", "Middle/Earth")).rejects.toThrow()
    expect(updateTimezone).not.toHaveBeenCalled()
  })
})

/**
 * The route, driven for real. Only the exact string 'detected' is taken as the
 * weaker claim; anything else — a missing value, a typo, somebody sending
 * "chosen" by hand — records the stronger one, which is the safe direction to
 * be wrong in.
 */
describe("what the route accepts as a source", () => {
  const put = (body: Record<string, unknown>) =>
    PUT(new Request("http://x/api/settings/time-preferences", { method: "PUT", body: JSON.stringify(body) }))

  it("takes only the exact word detected as a detection", async () => {
    for (const [sent, recorded] of [
      ["detected", "detected"],
      ["chosen", "chosen"],
      ["Detected", "chosen"],
      ["signup_default", "chosen"],
      [null, "chosen"],
    ] as const) {
      updateTimezone.mockClear()
      await put({ timezone: "Europe/Copenhagen", source: sent })
      expect(updateTimezone, `source ${String(sent)}`).toHaveBeenCalledWith(
        "u1",
        "Europe/Copenhagen",
        recorded
      )
    }
  })

  it("records a choice when no source is sent at all — the Settings page's own save", async () => {
    await put({ timezone: "Europe/Copenhagen" })
    expect(updateTimezone).toHaveBeenCalledWith("u1", "Europe/Copenhagen", "chosen")
  })

  it("writes nothing when no timezone is sent", async () => {
    await put({ source: "detected" })
    expect(updateTimezone).not.toHaveBeenCalled()
  })
})
