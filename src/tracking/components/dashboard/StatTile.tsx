"use client"

import { Card } from "@/components/ui/card"
import { AlertTriangle, CircleDot } from "lucide-react"
import { LEGACY_TILE_TESTIDS } from "../../data/metricCatalog"
import { formatMetricValue, metricSubLabel } from "../../metricsService"
import type { MetricDef, MetricValue } from "../../types"

interface StatTileProps {
  /** Null when the layout names a metric this build no longer has. */
  def: MetricDef | null
  value: MetricValue | undefined
  metricId: string
}

/**
 * One box in the stat row.
 *
 * A tile with no reading shows an em dash and says why. It never shows 0 —
 * "you have logged none of these" and "nothing here produces data yet" look
 * identical as a zero, and only one of them is the user's fault.
 *
 * AND A FAULT LOOKS LIKE A FAULT. There is a third state under that em dash: the
 * number could not be worked out at all. That used to be rendered with the same
 * grey sentence as an empty week — "Nothing logged for this yet" — which is a
 * claim about what the person did, and a false one. It is now marked, so nobody
 * reads a broken source as a week off.
 */
export function StatTile({ def, value, metricId }: StatTileProps) {
  const Icon = def?.icon ?? CircleDot
  const accent = def?.accent ?? "text-primary"
  const label = value?.label ?? def?.tileLabel ?? "Unknown metric"
  const sub = def && value ? metricSubLabel(def, value) : "This metric is no longer available"

  return (
    <Card
      className="p-4"
      data-testid={LEGACY_TILE_TESTIDS[metricId] ?? `stat-tile-${metricId}`}
      data-metric-id={metricId}
    >
      <div className="flex items-center gap-3">
        <div className={`p-2 rounded-lg ${iconBg(accent)}`}>
          <Icon className={`size-5 ${accent}`} />
        </div>
        <div className="min-w-0">
          <div className="text-2xl font-bold">
            {formatMetricValue(value?.value ?? null, value?.format ?? def?.format)}
          </div>
          <div className="text-sm text-muted-foreground truncate" title={label}>{label}</div>
          {sub &&
            (value?.unavailable ? (
              <div
                data-testid="stat-tile-unavailable"
                className="flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400"
                title={sub}
              >
                <AlertTriangle className="size-3 shrink-0" />
                <span className="truncate">{sub}</span>
              </div>
            ) : (
              <div className="text-xs text-muted-foreground/70 truncate">{sub}</div>
            ))}
        </div>
      </div>
    </Card>
  )
}

/**
 * The icon's tinted backdrop, derived from its text colour so a metric only
 * declares one colour. Tailwind needs whole class names, hence the map.
 */
function iconBg(accent: string): string {
  const map: Record<string, string> = {
    "text-primary": "bg-primary/10",
    "text-green-500": "bg-green-500/10",
    "text-orange-500": "bg-orange-500/10",
    "text-purple-500": "bg-purple-500/10",
    "text-rose-500": "bg-rose-500/10",
    "text-yellow-500": "bg-yellow-500/10",
  }
  return map[accent] ?? "bg-primary/10"
}
