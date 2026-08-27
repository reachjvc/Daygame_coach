/**
 * Database repository for dashboard layouts.
 *
 * All access to `dashboard_widgets`. A layout is written as a whole, never
 * patched slot by slot: the client sends the array it wants and this replaces
 * what is there. Reordering by index is then a single call and cannot leave the
 * table in a half-reordered state.
 */

import { createServerSupabaseClient } from "./supabase"
import type { DashboardWidget, DashboardWidgetInput } from "@/src/tracking/types"

interface DashboardWidgetRow {
  id: string
  dashboard_key: string
  position: number
  widget_type: string
  metric_id: string | null
  config: Record<string, unknown> | null
}

function toWidget(row: DashboardWidgetRow): DashboardWidget {
  return {
    id: row.id,
    dashboard_key: row.dashboard_key,
    position: row.position,
    widget_type: row.widget_type as DashboardWidget["widget_type"],
    metric_id: row.metric_id,
    config: row.config ?? {},
  }
}

/**
 * One user's widgets for one dashboard, in slot order.
 *
 * An empty array means the user has never saved a layout — NOT that they chose
 * an empty dashboard. The caller substitutes the default layout; see
 * dashboardService.getDashboardLayout.
 */
export async function getWidgets(userId: string, dashboardKey: string): Promise<DashboardWidget[]> {
  const supabase = await createServerSupabaseClient()

  const { data, error } = await supabase
    .from("dashboard_widgets")
    .select("id, dashboard_key, position, widget_type, metric_id, config")
    .eq("user_id", userId)
    .eq("dashboard_key", dashboardKey)
    .order("position", { ascending: true })

  if (error) throw new Error(`Failed to fetch dashboard widgets: ${error.message}`)
  return (data ?? []).map((row) => toWidget(row as DashboardWidgetRow))
}

/**
 * Replace a dashboard's layout with exactly `widgets`, in array order.
 *
 * Delete-then-insert rather than diffing: the layout is small, and the diff
 * would have to reconcile positions, which is where reorder bugs live. The two
 * statements are not in one transaction — Supabase's REST client has no
 * transaction — so a failed insert after a successful delete leaves the user
 * with no saved layout, which reads as "never configured" and falls back to the
 * defaults rather than to a broken page. The insert error is thrown so the
 * caller can tell the user their change did not save.
 */
export async function replaceWidgets(
  userId: string,
  dashboardKey: string,
  widgets: DashboardWidgetInput[]
): Promise<DashboardWidget[]> {
  const supabase = await createServerSupabaseClient()

  const { error: deleteError } = await supabase
    .from("dashboard_widgets")
    .delete()
    .eq("user_id", userId)
    .eq("dashboard_key", dashboardKey)

  if (deleteError) throw new Error(`Failed to clear dashboard layout: ${deleteError.message}`)

  if (widgets.length === 0) return []

  const rows = widgets.map((w, index) => ({
    user_id: userId,
    dashboard_key: dashboardKey,
    position: index,
    widget_type: w.widget_type,
    metric_id: w.metric_id,
    config: w.config ?? {},
  }))

  const { data, error: insertError } = await supabase
    .from("dashboard_widgets")
    .insert(rows)
    .select("id, dashboard_key, position, widget_type, metric_id, config")

  if (insertError) throw new Error(`Failed to save dashboard layout: ${insertError.message}`)

  return (data ?? [])
    .map((row) => toWidget(row as DashboardWidgetRow))
    .sort((a, b) => a.position - b.position)
}
