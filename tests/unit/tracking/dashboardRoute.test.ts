/**
 * A HAND-MADE LAYOUT NAMING A METRIC THAT DOES NOT EXIST IS REFUSED, IN WORDS.
 *
 * Moved here from `tests/e2e/tracking-tiles.spec.ts`, which opened a browser to
 * send one PUT. The rule lives in `validateWidgets` and the status in the
 * route, so the real PUT handler is called here with the real service behind
 * it; only the rows are stood in for, to see whether a write was attempted.
 */

import { describe, it, expect, vi, beforeEach } from "vitest"

const { replaceWidgets } = vi.hoisted(() => ({
  replaceWidgets: vi.fn(async (_userId: string, _key: string, widgets: { metric_id: string | null }[]) =>
    widgets.map((w, position) => ({ ...w, position, dashboard_key: "tracking" })),
  ),
}))

vi.mock("@/src/db/auth", () => ({
  requireAuth: vi.fn(async () => ({ success: true, userId: "u1", supabase: {} })),
}))
vi.mock("@/src/db/dashboardRepo", () => ({ replaceWidgets, getWidgets: vi.fn(async () => []) }))
vi.mock("@/src/db/settingsRepo", () => ({ getUserTimezone: vi.fn(async () => "Europe/Copenhagen") }))
vi.mock("@/src/db/goalRepo", () => ({
  getGoalsByIds: vi.fn(async () => []),
  getGoalAccumulatedTotal: vi.fn(async () => 0),
}))
vi.mock("@/src/db/metricsRepo", () => ({
  resolveMetricValues: vi.fn(async () => ({ values: {}, failed: {} })),
}))

import { PUT } from "@/app/api/tracking/dashboard/route"

async function put(widgets: unknown[]) {
  const res = await PUT(
    new Request("http://x/api/tracking/dashboard", { method: "PUT", body: JSON.stringify({ widgets }) }),
  )
  return { status: res.status, body: (await res.json()) as { error?: string } }
}

beforeEach(() => {
  replaceWidgets.mockClear()
})

describe("saving the tracking page's tiles", () => {
  it("refuses a metric that does not exist, names it, and writes nothing", async () => {
    const res = await put([
      { widget_type: "metric_tile", metric_id: "deep_work_hours_daily" },
      { widget_type: "metric_tile", metric_id: "week_streak" },
    ])

    expect(res.status).toBe(400)
    expect(res.body.error).toContain("Unknown metric")
    expect(res.body.error).toContain("deep_work_hours_daily")
    expect(replaceWidgets).not.toHaveBeenCalled()
  })

  it("saves the same layout once the unknown metric is a real one", async () => {
    // The control: the refusal above is about the metric, not about this
    // harness refusing everything.
    const res = await put([
      { widget_type: "metric_tile", metric_id: "approaches_weekly" },
      { widget_type: "metric_tile", metric_id: "week_streak" },
    ])

    expect(res.status).toBe(200)
    expect(replaceWidgets).toHaveBeenCalledTimes(1)
  })
})
