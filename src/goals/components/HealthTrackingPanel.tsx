"use client"

import { useState, useEffect, lazy, Suspense } from "react"
import { Activity, ChevronDown, ChevronRight } from "lucide-react"

const WeightTracker = lazy(() =>
  import("@/src/health/components/WeightTracker").then((m) => ({ default: m.WeightTracker }))
)
const SleepTracker = lazy(() =>
  import("@/src/health/components/SleepTracker").then((m) => ({ default: m.SleepTracker }))
)
const WorkoutLogger = lazy(() =>
  import("@/src/health/components/WorkoutLogger").then((m) => ({ default: m.WorkoutLogger }))
)
const NutritionTracker = lazy(() =>
  import("@/src/health/components/NutritionTracker").then((m) => ({ default: m.NutritionTracker }))
)

const STORAGE_KEY = "health-tracking-collapsed"

export function HealthTrackingPanel() {
  const [collapsed, setCollapsed] = useState(false)

  // Hydrate from localStorage after mount
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored === "true") setCollapsed(true)
  }, [])

  function toggle() {
    setCollapsed((prev) => {
      const next = !prev
      localStorage.setItem(STORAGE_KEY, String(next))
      return next
    })
  }

  return (
    <div>
      <button
        onClick={toggle}
        className="flex items-center gap-2 mb-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider hover:text-foreground transition-colors cursor-pointer w-full"
      >
        {collapsed ? (
          <ChevronRight className="size-3.5" />
        ) : (
          <ChevronDown className="size-3.5" />
        )}
        <Activity className="size-3.5" />
        <span>Health Tracking</span>
        <div className="flex-1 border-t border-border/50 ml-2" />
      </button>

      {!collapsed && (
        <Suspense
          fallback={
            <div className="text-xs text-muted-foreground py-4 text-center">
              Loading health widgets…
            </div>
          }
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <WeightTracker />
            <SleepTracker />
            <WorkoutLogger />
            <NutritionTracker />
          </div>
        </Suspense>
      )}
    </div>
  )
}
