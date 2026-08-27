/**
 * Dashboard layouts: what widgets a user has, and what number each one shows.
 *
 * Server-side — it talks to repos. The pure half (metric identity, goal-derived
 * metrics, formatting) is in metricsService, which client components import.
 */

import { getWidgets, replaceWidgets } from "@/src/db/dashboardRepo"
import { getUserTimezone } from "@/src/db/settingsRepo"
import { getGoalsByIds, getGoalAccumulatedTotal } from "@/src/db/goalRepo"
import { resolveMetricValues } from "@/src/db/metricsRepo"
import { METRIC_BY_ID, DEFAULT_TILE_METRIC_IDS } from "./data/metricCatalog"
import {
  MAX_TILES,
  MIN_TILES,
  parseGoalMetricId,
  readGoalMetric,
} from "./metricsService"
import type {
  DashboardLayoutResponse,
  DashboardWidget,
  DashboardWidgetInput,
  MetricValue,
} from "./types"

export const TRACKING_DASHBOARD_KEY = "tracking"

/**
 * The layout a user gets before they have saved one: the four tiles the
 * dashboard has always shown, in the order it always showed them. A first-time
 * visit therefore looks identical to how the page looked before it was
 * configurable.
 */
export function defaultWidgets(): DashboardWidget[] {
  return DEFAULT_TILE_METRIC_IDS.map((metricId, position) => ({
    id: `default-${metricId}`,
    dashboard_key: TRACKING_DASHBOARD_KEY,
    position,
    widget_type: "metric_tile" as const,
    metric_id: metricId,
    config: {},
  }))
}

/**
 * Reject a layout before it reaches the database.
 *
 * Throws rather than trimming: a request to save nine tiles is a bug in the
 * caller or a hand-made request, and silently keeping the first eight would
 * hide it. Returns the widgets unchanged when they are fine.
 */
export function validateWidgets(widgets: DashboardWidgetInput[]): DashboardWidgetInput[] {
  if (widgets.length < MIN_TILES) {
    throw new Error(`A dashboard needs at least ${MIN_TILES} tiles`)
  }
  if (widgets.length > MAX_TILES) {
    throw new Error(`A dashboard holds at most ${MAX_TILES} tiles`)
  }

  for (const w of widgets) {
    if (w.widget_type !== "metric_tile") {
      throw new Error(`Unknown widget type: ${w.widget_type}`)
    }
    if (!w.metric_id) {
      throw new Error("A metric tile needs a metric")
    }
    const known = !!METRIC_BY_ID[w.metric_id] || !!parseGoalMetricId(w.metric_id)
    if (!known) {
      throw new Error(`Unknown metric: ${w.metric_id}`)
    }
  }

  return widgets
}

/**
 * Resolve every metric id to a reading.
 *
 * Catalogue metrics go through metricsRepo — the same path that advances goal
 * progress, so a tile and a goal card cannot disagree. Goal-derived ids are read
 * off the goal row, and `getGoalsByIds` scopes to the owner: an id naming
 * somebody else's goal resolves to nothing rather than to their data.
 *
 * An id that resolves to nothing comes back with `value: null` and a reason. It
 * never comes back as 0.
 */
export async function resolveMetrics(
  userId: string,
  metricIds: string[],
  timezone: string | null = null
): Promise<MetricValue[]> {
  const goalRefs = metricIds
    .map((id) => ({ id, parsed: parseGoalMetricId(id) }))
    .filter((r): r is { id: string; parsed: NonNullable<ReturnType<typeof parseGoalMetricId>> } => r.parsed !== null)

  const catalogIds = metricIds.filter((id) => METRIC_BY_ID[id])

  const [catalogValues, goals] = await Promise.all([
    resolveMetricValues(userId, catalogIds, timezone),
    getGoalsByIds(userId, [...new Set(goalRefs.map((r) => r.parsed.goalId))]),
  ])

  // Only the "total" view needs history, and it costs a query per goal.
  const totalsNeeded = [...new Set(
    goalRefs.filter((r) => r.parsed.view === "total").map((r) => r.parsed.goalId)
  )].filter((goalId) => goals.some((g) => g.id === goalId))

  const totals = new Map<string, number>()
  await Promise.all(
    totalsNeeded.map(async (goalId) => {
      totals.set(goalId, await getGoalAccumulatedTotal(userId, goalId))
    })
  )

  return metricIds.map((id): MetricValue => {
    const def = METRIC_BY_ID[id]
    if (def) {
      const value = catalogValues[id]
      return value === undefined || value === null
        ? { id, value: null, reason: "Nothing logged for this yet", format: def.format }
        : { id, value, format: def.format }
    }

    const ref = goalRefs.find((r) => r.id === id)
    if (!ref) return { id, value: null, reason: "Unknown metric" }

    const goal = goals.find((g) => g.id === ref.parsed.goalId)
    if (!goal) return { id, value: null, reason: "That goal no longer exists" }

    return readGoalMetric(goal, ref.parsed.view, totals.get(goal.id) ?? 0)
  })
}

/**
 * A dashboard's widgets plus a reading for each, ready to render.
 *
 * The layout and the timezone are independent lookups, so they go together —
 * the readings are the only part that has to wait for the layout, because the
 * layout is what says which metrics to read.
 */
export async function getDashboardLayout(
  userId: string,
  dashboardKey: string = TRACKING_DASHBOARD_KEY
): Promise<DashboardLayoutResponse> {
  const [saved, timezone] = await Promise.all([
    getWidgets(userId, dashboardKey),
    getUserTimezone(userId),
  ])

  const widgets = saved.length > 0 ? saved : defaultWidgets()
  const values = await resolveMetrics(
    userId,
    widgets.map((w) => w.metric_id).filter((id): id is string => !!id),
    timezone
  )
  return { widgets, values }
}

/** Replace a dashboard's layout, then hand back the layout with fresh readings. */
export async function saveDashboardLayout(
  userId: string,
  widgets: DashboardWidgetInput[],
  dashboardKey: string = TRACKING_DASHBOARD_KEY
): Promise<DashboardLayoutResponse> {
  const [saved, timezone] = await Promise.all([
    replaceWidgets(userId, dashboardKey, validateWidgets(widgets)),
    getUserTimezone(userId),
  ])
  const values = await resolveMetrics(
    userId,
    saved.map((w) => w.metric_id).filter((id): id is string => !!id),
    timezone
  )
  return { widgets: saved, values }
}
