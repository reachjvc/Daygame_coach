"use client"

import { useState, useEffect, useMemo } from "react"
import { ChevronRight, ChevronDown } from "lucide-react"

interface SnapshotRow {
  goal_id: string
  snapshot_date: string
  current_value: number
  target_value: number
  was_complete: boolean
}

interface DayData {
  date: string
  completedCount: number
  totalCount: number
  percent: number
}

function getCellColor(percent: number | null): string {
  if (percent === null) return "bg-muted/20"
  if (percent === 0) return "bg-muted/40"
  if (percent < 25) return "bg-emerald-900/40"
  if (percent < 50) return "bg-emerald-700/50"
  if (percent < 75) return "bg-emerald-500/60"
  if (percent < 100) return "bg-emerald-400/70"
  return "bg-emerald-400"
}

function formatDate(d: Date): string {
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

function formatDisplayDate(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00")
  return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })
}

export function HeatmapCalendar() {
  const [snapshots, setSnapshots] = useState<SnapshotRow[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [collapsed, setCollapsed] = useState(false)
  const [hoveredCell, setHoveredCell] = useState<{ week: number; day: number } | null>(null)

  // Compute date range: 12 weeks back from today
  const { startDate, endDate } = useMemo(() => {
    const today = new Date()
    const start = new Date(today)
    start.setDate(start.getDate() - 83) // 84 days total (today inclusive)
    return {
      startDate: formatDate(start),
      endDate: formatDate(today),
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    async function fetchSnapshots() {
      try {
        const res = await fetch(
          `/api/goals/snapshots?start_date=${startDate}&end_date=${endDate}`
        )
        if (!res.ok) throw new Error("Failed to fetch snapshots")
        const data = await res.json()
        if (!cancelled) {
          setSnapshots(Array.isArray(data) ? data : [])
          setLoading(false)
        }
      } catch {
        if (!cancelled) {
          setError(true)
          setLoading(false)
        }
      }
    }
    fetchSnapshots()
    return () => {
      cancelled = true
    }
  }, [startDate, endDate])

  // Aggregate snapshots by date
  const dayMap = useMemo(() => {
    if (!snapshots) return new Map<string, DayData>()
    const map = new Map<string, { goals: Set<string>; completed: Set<string> }>()

    for (const snap of snapshots) {
      const dateKey = snap.snapshot_date
      if (!map.has(dateKey)) {
        map.set(dateKey, { goals: new Set(), completed: new Set() })
      }
      const entry = map.get(dateKey)!
      entry.goals.add(snap.goal_id)
      if (snap.was_complete) {
        entry.completed.add(snap.goal_id)
      }
    }

    const result = new Map<string, DayData>()
    for (const [dateKey, entry] of map) {
      const totalCount = entry.goals.size
      const completedCount = entry.completed.size
      result.set(dateKey, {
        date: dateKey,
        completedCount,
        totalCount,
        percent: totalCount > 0 ? (completedCount / totalCount) * 100 : 0,
      })
    }
    return result
  }, [snapshots])

  // Build 12-week grid
  const { grid, monthLabels } = useMemo(() => {
    const today = new Date()
    const start = new Date(today)
    start.setDate(start.getDate() - 83)

    // Adjust start to Monday
    const startDow = start.getDay() // 0=Sun
    const mondayOffset = startDow === 0 ? -6 : 1 - startDow
    const gridStart = new Date(start)
    gridStart.setDate(gridStart.getDate() + mondayOffset)

    const weeks: (DayData | null)[][] = []
    const months: { label: string; weekIndex: number }[] = []
    let lastMonth = -1

    for (let w = 0; w < 12; w++) {
      const week: (DayData | null)[] = []
      for (let d = 0; d < 7; d++) {
        const cellDate = new Date(gridStart)
        cellDate.setDate(cellDate.getDate() + w * 7 + d)
        const dateStr = formatDate(cellDate)

        // Only show cells within our date range
        if (dateStr < startDate || dateStr > endDate) {
          week.push(null)
        } else {
          week.push(dayMap.get(dateStr) ?? { date: dateStr, completedCount: 0, totalCount: 0, percent: 0 })
        }

        // Track month boundaries for labels
        if (d === 0) {
          const m = cellDate.getMonth()
          if (m !== lastMonth) {
            months.push({
              label: cellDate.toLocaleDateString("en-US", { month: "short" }),
              weekIndex: w,
            })
            lastMonth = m
          }
        }
      }
      weeks.push(week)
    }

    return { grid: weeks, monthLabels: months }
  }, [startDate, endDate, dayMap])

  // Count active days (days with any snapshot data)
  const activeDays = useMemo(() => dayMap.size, [dayMap])

  if (error) return null

  const dayLabels = ["Mon", "", "Wed", "", "Fri", "", ""]

  return (
    <div>
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="flex items-center gap-2 mb-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider hover:text-foreground transition-colors cursor-pointer w-full"
      >
        {collapsed ? (
          <ChevronRight className="size-3.5" />
        ) : (
          <ChevronDown className="size-3.5" />
        )}
        <span>Activity</span>
        <span className="text-muted-foreground/50">{activeDays}d</span>
        <div className="flex-1 border-t border-border/50 ml-2" />
      </button>

      {!collapsed && (
        <div className="rounded-lg border border-border bg-card p-3">
          {loading ? (
            /* Skeleton grid */
            <div className="flex gap-[3px]">
              {Array.from({ length: 12 }).map((_, w) => (
                <div key={w} className="flex flex-col gap-[3px]">
                  {Array.from({ length: 7 }).map((_, d) => (
                    <div
                      key={d}
                      className="size-3 rounded-sm bg-muted/20 animate-pulse"
                    />
                  ))}
                </div>
              ))}
            </div>
          ) : snapshots && snapshots.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-2">
              No activity data yet
            </p>
          ) : (
            <div className="overflow-x-auto">
              {/* Month labels */}
              <div className="flex ml-8 mb-1 gap-[3px]">
                {Array.from({ length: 12 }).map((_, w) => {
                  const monthLabel = monthLabels.find((m) => m.weekIndex === w)
                  return (
                    <div key={w} className="size-3 flex items-center justify-center">
                      {monthLabel && (
                        <span className="text-[9px] text-muted-foreground whitespace-nowrap">
                          {monthLabel.label}
                        </span>
                      )}
                    </div>
                  )
                })}
              </div>

              {/* Grid with day labels */}
              <div className="flex gap-0">
                {/* Day labels column */}
                <div className="flex flex-col gap-[3px] mr-1 w-7 flex-shrink-0">
                  {dayLabels.map((label, i) => (
                    <div
                      key={i}
                      className="size-3 flex items-center justify-end"
                    >
                      {label && (
                        <span className="text-[9px] text-muted-foreground leading-none">
                          {label}
                        </span>
                      )}
                    </div>
                  ))}
                </div>

                {/* Heatmap cells */}
                <div className="flex gap-[3px]">
                  {grid.map((week, w) => (
                    <div key={w} className="flex flex-col gap-[3px]">
                      {week.map((dayData, d) => {
                        const isHovered =
                          hoveredCell?.week === w && hoveredCell?.day === d
                        const percent =
                          dayData && dayData.totalCount > 0
                            ? dayData.percent
                            : dayData
                              ? null
                              : null
                        const cellColor =
                          dayData === null
                            ? "bg-transparent"
                            : getCellColor(
                                dayData.totalCount > 0 ? dayData.percent : null
                              )

                        return (
                          <div
                            key={d}
                            className="relative"
                            onMouseEnter={() =>
                              dayData && setHoveredCell({ week: w, day: d })
                            }
                            onMouseLeave={() => setHoveredCell(null)}
                          >
                            <div
                              className={`size-3 rounded-sm ${cellColor} ${
                                dayData === null ? "" : "border border-border/20"
                              }`}
                            />
                            {isHovered && dayData && (
                              <div className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-1 px-2 py-1 rounded bg-popover border border-border shadow-md whitespace-nowrap pointer-events-none">
                                <p className="text-[10px] text-foreground font-medium">
                                  {formatDisplayDate(dayData.date)}
                                </p>
                                <p className="text-[10px] text-muted-foreground">
                                  {dayData.totalCount > 0
                                    ? `${dayData.completedCount} of ${dayData.totalCount} goals (${Math.round(dayData.percent)}%)`
                                    : "No goals tracked"}
                                </p>
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
