"use client"

import { X, Sprout } from "lucide-react"
import type { GoalWithProgress, CoreValueRoot } from "../../types"

interface SoilPanelProps {
  roots: CoreValueRoot[] | null
  aspirational: string[] | null
  soilDensity: number
  selectedValueId: string | null
  alignmentMap: Record<string, string[]>
  goals: GoalWithProgress[]
  onClose: () => void
}

export function SoilPanel({
  roots,
  aspirational,
  soilDensity,
  selectedValueId,
  alignmentMap,
  goals,
  onClose,
}: SoilPanelProps) {
  // Find goals connected to the selected value
  const connectedGoals = selectedValueId
    ? goals.filter((g) => alignmentMap[g.id]?.includes(selectedValueId))
    : []

  return (
    <div className="absolute left-0 right-0 bottom-0 h-64 bg-card/95 backdrop-blur border-t border-border shadow-2xl flex flex-col animate-in slide-in-from-bottom-full duration-200">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border/50">
        <div className="flex items-center gap-2">
          <Sprout className="h-4 w-4 text-amber-500" />
          <span className="text-sm font-semibold">
            {selectedValueId
              ? selectedValueId.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
              : "Your Soil & Roots"}
          </span>
        </div>
        <button onClick={onClose} className="p-1 rounded hover:bg-muted transition-colors">
          <X className="h-4 w-4 text-muted-foreground" />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-4 py-3">
        {!roots || roots.length === 0 ? (
          // No values discovered yet
          <div className="flex flex-col items-center justify-center h-full text-center">
            <Sprout className="h-8 w-8 text-muted-foreground/40 mb-3" />
            <p className="text-sm text-muted-foreground mb-1">Your soil is untilled</p>
            <p className="text-xs text-muted-foreground/60">
              Complete the Inner Game values journey to discover your roots.
              Your tree will grow stronger when grounded in what truly matters.
            </p>
          </div>
        ) : selectedValueId ? (
          // Focused on a specific value
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="text-xs text-muted-foreground">
                Rank #{roots.find((r) => r.id === selectedValueId)?.rank ?? "?"} core value
              </div>
              {aspirational?.includes(selectedValueId) && (
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-400 border border-blue-500/30">
                  Aspirational
                </span>
              )}
            </div>

            {connectedGoals.length > 0 ? (
              <div>
                <span className="text-xs text-muted-foreground uppercase tracking-wider block mb-2">
                  Feeds {connectedGoals.length} goal{connectedGoals.length !== 1 ? "s" : ""}
                </span>
                <div className="space-y-1.5">
                  {connectedGoals.map((goal) => (
                    <div key={goal.id} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/30">
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: getGoalColor(goal) }} />
                      <span className="text-sm truncate">{goal.title}</span>
                      <span className="text-xs text-muted-foreground ml-auto tabular-nums">
                        {goal.progress_percentage}%
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground italic">
                No goals are connected to this value yet. Edit a goal to add this as a root connection.
              </p>
            )}
          </div>
        ) : (
          // Overview of all roots
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {roots.map((root) => {
              const goalCount = Object.values(alignmentMap).filter((vals) => vals.includes(root.id)).length
              const isAspi = aspirational?.includes(root.id)
              return (
                <div
                  key={root.id}
                  className="p-3 rounded-lg bg-amber-900/20 border border-amber-700/20"
                >
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className="text-xs font-mono text-amber-500/60">#{root.rank}</span>
                    {isAspi && <span className="text-[9px] text-blue-400">aspire</span>}
                  </div>
                  <span className="text-xs font-medium text-amber-200 block truncate">
                    {root.id.replace(/-/g, " ")}
                  </span>
                  <span className="text-[10px] text-muted-foreground mt-1 block">
                    {goalCount > 0 ? `${goalCount} goal${goalCount !== 1 ? "s" : ""}` : "unconnected"}
                  </span>
                </div>
              )
            })}
            {/* Soil density indicator */}
            <div className="p-3 rounded-lg bg-muted/20 border border-border/30 col-span-2 sm:col-span-4">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Soil richness</span>
                <span className="text-xs font-mono text-muted-foreground">{Math.round(soilDensity * 100)}%</span>
              </div>
              <div className="h-1.5 bg-muted rounded-full mt-1.5 overflow-hidden">
                <div
                  className="h-full rounded-full bg-amber-700"
                  style={{ width: `${soilDensity * 100}%` }}
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function getGoalColor(goal: GoalWithProgress): string {
  const areaColors: Record<string, string> = {
    daygame: "#f97316",
    health_fitness: "#22c55e",
    career_business: "#a855f7",
    personal_growth: "#eab308",
    vices_elimination: "#f43f5e",
  }
  return areaColors[goal.life_area || ""] ?? "#6b7280"
}
