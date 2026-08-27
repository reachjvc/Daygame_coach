"use client"

import { lazy, Suspense, useState } from "react"
import { Card } from "@/components/ui/card"
import { Settings2 } from "lucide-react"
import { useDashboardLayout } from "../../hooks/useDashboardLayout"
import { metricDefFor } from "../../metricsService"
import { StatTile } from "./StatTile"
import type { DashboardLayoutResponse } from "../../types"

const DashboardTilesDialog = lazy(() =>
  import("./DashboardTilesDialog").then((m) => ({ default: m.DashboardTilesDialog }))
)

/**
 * The configurable stat row at the top of the tracking dashboard.
 *
 * Replaces the four hardcoded boxes. A user who has never touched it gets those
 * same four, in the same order, from dashboardService.defaultWidgets — the
 * default layout is the old behaviour written down.
 *
 * `initial` is the layout resolved on the server by the page. With it the tiles
 * are in the first HTML and there is no loading state at all; without it the
 * component still works on its own and fetches, which is what the manage dialog
 * relies on after a save.
 */
export function StatTileGrid({ initial }: { initial?: DashboardLayoutResponse }) {
  const { state, save, loadGoals } = useDashboardLayout(initial)
  const [dialogOpen, setDialogOpen] = useState(false)

  if (state.isLoading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {[0, 1, 2, 3].map((i) => (
          <Card key={i} className="p-4 h-[76px] animate-pulse bg-muted/40" />
        ))}
      </div>
    )
  }

  const cols = state.widgets.length <= 2 ? "md:grid-cols-2"
    : state.widgets.length === 3 ? "md:grid-cols-3"
    : "md:grid-cols-4"

  return (
    <div className="mb-8">
      <div className="flex items-center justify-end mb-2">
        <button
          type="button"
          onClick={() => { loadGoals(); setDialogOpen(true) }}
          data-testid="edit-tiles"
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          <Settings2 className="size-3.5" />
          Edit tiles
        </button>
      </div>

      <div className={`grid grid-cols-2 ${cols} gap-4`}>
        {state.widgets.map((w) => {
          const id = w.metric_id ?? ""
          return (
            <StatTile
              key={w.id}
              metricId={id}
              def={metricDefFor(id, state.goals)}
              value={state.values.find((v) => v.id === id)}
            />
          )
        })}
      </div>

      {state.error && !dialogOpen && (
        <p className="mt-2 text-sm text-destructive" role="alert">{state.error}</p>
      )}

      {dialogOpen && (
        <Suspense fallback={null}>
          <DashboardTilesDialog
            open={dialogOpen}
            onClose={() => setDialogOpen(false)}
            widgets={state.widgets}
            goals={state.goals}
            onOpenPicker={loadGoals}
            onSave={save}
            error={state.error}
          />
        </Suspense>
      )}
    </div>
  )
}
