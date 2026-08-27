"use client"

import { useCallback, useEffect, useState } from "react"
import { isGoalMetricId } from "../metricsService"
import type { DashboardLayoutResponse, DashboardWidget, DashboardWidgetInput, MetricValue } from "../types"
import type { UserGoalRow } from "@/src/db/goalTypes"

interface DashboardLayoutState {
  widgets: DashboardWidget[]
  values: MetricValue[]
  /** Only fetched when the layout or the picker actually needs goal titles. */
  goals: UserGoalRow[]
  isLoading: boolean
  error: string | null
}

interface UseDashboardLayoutReturn {
  state: DashboardLayoutState
  save: (widgets: DashboardWidgetInput[]) => Promise<boolean>
  /** Pull the user's goals in, for the picker's "Tracks your goal" section. */
  loadGoals: () => Promise<void>
}

/**
 * The tracking dashboard's tile layout and the numbers in it.
 *
 * Goals are loaded separately and only on demand: the four default tiles are
 * catalogue metrics and need no goal data, so a user who never opens the picker
 * never pays for that request.
 */
export function useDashboardLayout(initial?: DashboardLayoutResponse): UseDashboardLayoutReturn {
  // With server-rendered data there is nothing to wait for: the tiles paint with
  // the HTML and never show a skeleton.
  const [state, setState] = useState<DashboardLayoutState>({
    widgets: initial?.widgets ?? [],
    values: initial?.values ?? [],
    goals: [],
    isLoading: !initial,
    error: null,
  })

  // Derived once, so an object prop identity cannot re-run the effect below.
  const hasInitial = !!initial
  const initialGoalTiles = !!initial?.widgets?.some((w) => w.metric_id && isGoalMetricId(w.metric_id))

  const loadGoals = useCallback(async () => {
    try {
      const res = await fetch("/api/goals")
      if (!res.ok) return
      const data = await res.json()
      // /api/goals returns a plain array.
      const goals: UserGoalRow[] = Array.isArray(data) ? data : (data.goals ?? [])
      setState((prev) => ({ ...prev, goals }))
    } catch {
      // The picker still works without goal titles; it just shows no goal section.
    }
  }, [])

  useEffect(() => {
    let cancelled = false

    // Already rendered on the server. Re-fetching here would spend a second of
    // network to redraw the same numbers; the layout only changes when the user
    // changes it, and save() returns fresh values when they do.
    if (hasInitial) {
      if (initialGoalTiles) loadGoals()
      return
    }

    ;(async () => {
      try {
        const res = await fetch("/api/tracking/dashboard")
        if (!res.ok) throw new Error("Failed to load dashboard")
        const data = await res.json()
        if (cancelled) return

        setState((prev) => ({
          ...prev,
          widgets: data.widgets ?? [],
          values: data.values ?? [],
          isLoading: false,
          error: null,
        }))

        // Goal-derived tiles need the goal's title and icon to render properly.
        if ((data.widgets ?? []).some((w: DashboardWidget) => w.metric_id && isGoalMetricId(w.metric_id))) {
          loadGoals()
        }
      } catch {
        if (!cancelled) {
          setState((prev) => ({ ...prev, isLoading: false, error: "Failed to load dashboard" }))
        }
      }
    })()

    return () => { cancelled = true }
  }, [loadGoals, hasInitial, initialGoalTiles])

  const save = useCallback(async (widgets: DashboardWidgetInput[]): Promise<boolean> => {
    try {
      const res = await fetch("/api/tracking/dashboard", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ widgets }),
      })
      const data = await res.json()

      if (!res.ok) {
        setState((prev) => ({ ...prev, error: data.error ?? "Failed to save layout" }))
        return false
      }

      setState((prev) => ({
        ...prev,
        widgets: data.widgets ?? [],
        values: data.values ?? [],
        error: null,
      }))
      return true
    } catch {
      setState((prev) => ({ ...prev, error: "Failed to save layout" }))
      return false
    }
  }, [])

  return { state, save, loadGoals }
}
