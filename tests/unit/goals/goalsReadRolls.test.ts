/**
 * THE READ PATH ROLLS BEFORE IT READS.
 *
 * `/api/goals` is what the Today screen fetches its counts from. It used to
 * hand back whatever `current_value` happened to be on the row, so a weekly
 * count from a week that was over came back as this week's — only
 * `/api/goals/tree` ever rolled a period, and Today does not call it.
 *
 * Order matters as much as the call: rolling after the read would return the
 * stale numbers and fix them for next time.
 */

import { describe, it, expect, beforeEach, vi } from "vitest"

const calls: string[] = []

vi.mock("@/src/db/auth", () => ({
  requireAuth: vi.fn(async () => ({ success: true, userId: "user-1", supabase: {} })),
}))
vi.mock("@/src/db/settingsRepo", () => ({
  getUserTimezone: vi.fn(async () => "Europe/Berlin"),
}))
vi.mock("@/src/db/goalRepo", () => ({
  rollGoalPeriods: vi.fn(async () => {
    calls.push("roll")
    return 1
  }),
  getUserGoals: vi.fn(async () => {
    calls.push("read")
    return []
  }),
  getGoalsByCategory: vi.fn(async () => {
    calls.push("read")
    return []
  }),
  getGoalsByLifeArea: vi.fn(async () => {
    calls.push("read")
    return []
  }),
  createGoal: vi.fn(),
  deleteAllGoals: vi.fn(),
  DuplicateGoalError: class extends Error {},
}))

const { GET } = await import("@/app/api/goals/route")
const { rollGoalPeriods } = await import("@/src/db/goalRepo")
const { getUserTimezone } = await import("@/src/db/settingsRepo")

beforeEach(() => {
  calls.length = 0
  vi.clearAllMocks()
})

describe("GET /api/goals", () => {
  it("rolls expired periods before reading the goals", async () => {
    const res = await GET(new Request("http://localhost/api/goals"))

    expect(res.status).toBe(200)
    expect(calls).toEqual(["roll", "read"])
  })

  it("rolls in the user's own timezone", async () => {
    await GET(new Request("http://localhost/api/goals"))

    expect(getUserTimezone).toHaveBeenCalledWith("user-1")
    expect(rollGoalPeriods).toHaveBeenCalledWith("user-1", "Europe/Berlin")
  })

  it("rolls on the filtered reads too", async () => {
    await GET(new Request("http://localhost/api/goals?life_area=fitness"))
    expect(calls).toEqual(["roll", "read"])

    calls.length = 0
    await GET(new Request("http://localhost/api/goals?category=daygame"))
    expect(calls).toEqual(["roll", "read"])
  })

  it("fails loudly rather than answering with counts it could not roll", async () => {
    vi.mocked(rollGoalPeriods).mockRejectedValueOnce(new Error("db down"))

    const res = await GET(new Request("http://localhost/api/goals"))

    expect(res.status).toBe(500)
    expect(calls).not.toContain("read")
  })
})
