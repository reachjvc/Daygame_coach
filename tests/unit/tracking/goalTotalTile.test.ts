/**
 * "127 DAYS WITHOUT WEED" — the offering, not the arithmetic.
 *
 * The number always worked: `getGoalAccumulatedTotal` sums every rolled period
 * plus the one in progress, and a `goal:<id>:total` tile renders it. It was
 * reachable only by opening the dashboard's tile editor and knowing a goal
 * could be a metric, which nobody does. These tests pin the switch.
 */

import { describe, it, expect, vi, beforeEach } from "vitest"

const getWidgets = vi.fn()
const replaceWidgets = vi.fn()

vi.mock("@/src/db/dashboardRepo", () => ({ getWidgets, replaceWidgets }))
vi.mock("@/src/db/settingsRepo", () => ({ getUserTimezone: vi.fn() }))
vi.mock("@/src/db/goalRepo", () => ({ getGoalsByIds: vi.fn(), getGoalAccumulatedTotal: vi.fn() }))
vi.mock("@/src/db/metricsRepo", () => ({ resolveMetricValues: vi.fn() }))

const { setGoalTotalTile } = await import("@/src/tracking/dashboardService")
const { MAX_TILES } = await import("@/src/tracking/metricsService")

const GOAL = "11111111-2222-3333-4444-555555555555"
const TOTAL_ID = `goal:${GOAL}:total`

const widget = (metric_id: string | null, i = 0) => ({
  id: `w${i}`, dashboard_key: "tracking", position: i,
  widget_type: "metric_tile" as const, metric_id, config: {},
})

beforeEach(() => {
  getWidgets.mockReset()
  replaceWidgets.mockReset()
  replaceWidgets.mockImplementation(async (_u: string, _k: string, w: unknown[]) => w)
})

describe("turning the total on", () => {
  it("adds the goal's total tile", async () => {
    getWidgets.mockResolvedValue([widget("approaches_weekly")])
    await setGoalTotalTile("u1", GOAL, true)

    const sent = replaceWidgets.mock.calls[0][2]
    expect(sent.map((w: { metric_id: string }) => w.metric_id)).toEqual([
      "approaches_weekly",
      TOTAL_ID,
    ])
  })

  it("is idempotent — twice on leaves one tile and writes nothing the second time", async () => {
    getWidgets.mockResolvedValue([widget(TOTAL_ID)])
    await setGoalTotalTile("u1", GOAL, true)
    expect(replaceWidgets).not.toHaveBeenCalled()
  })

  it("refuses loudly when the page is full rather than dropping somebody's tile", async () => {
    getWidgets.mockResolvedValue(
      Array.from({ length: MAX_TILES }, (_, i) => widget(`m_${i}`, i)),
    )
    await expect(setGoalTotalTile("u1", GOAL, true)).rejects.toThrow(/full/i)
    expect(replaceWidgets).not.toHaveBeenCalled()
  })
})

describe("turning it off", () => {
  it("removes only that tile and renumbers the rest by position", async () => {
    getWidgets.mockResolvedValue([
      widget("approaches_weekly", 0),
      widget(TOTAL_ID, 1),
      widget("sessions_weekly", 2),
    ])
    await setGoalTotalTile("u1", GOAL, false)

    const sent = replaceWidgets.mock.calls[0][2]
    // Position is the array index, so the hole closes by construction.
    expect(sent.map((w: { metric_id: string }) => w.metric_id)).toEqual([
      "approaches_weekly",
      "sessions_weekly",
    ])
  })

  it("off when it was never on writes nothing", async () => {
    getWidgets.mockResolvedValue([widget("approaches_weekly")])
    await setGoalTotalTile("u1", GOAL, false)
    expect(replaceWidgets).not.toHaveBeenCalled()
  })

  it("never touches the goal itself — removing a view is not deleting progress", async () => {
    const goalRepo = await import("@/src/db/goalRepo")
    getWidgets.mockResolvedValue([widget(TOTAL_ID)])
    await setGoalTotalTile("u1", GOAL, false)
    expect(goalRepo.getGoalsByIds).not.toHaveBeenCalled()
  })
})

