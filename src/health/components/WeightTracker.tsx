"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { TrendingUp, Plus, Scale } from "lucide-react"
import type { WeightLogRow, WeightUnit, TimeOfDay, WeightTrend } from "../types"
import { computeWeightTrend, convertWeight, formatWeight } from "../healthService"

export function WeightTracker() {
  const [logs, setLogs] = useState<WeightLogRow[]>([])
  const [trend, setTrend] = useState<WeightTrend | null>(null)
  const [unit, setUnit] = useState<WeightUnit>("kg")
  const [isAdding, setIsAdding] = useState(false)
  const [weight, setWeight] = useState("")
  const [timeOfDay, setTimeOfDay] = useState<TimeOfDay>("morning")
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)

  const fetchLogs = useCallback(async () => {
    try {
      const res = await fetch("/api/health/weight?days=90")
      if (!res.ok) throw new Error("Failed to fetch")
      const data: WeightLogRow[] = await res.json()
      setLogs(data)
      setTrend(computeWeightTrend(data))
    } catch (e) {
      console.error("Error fetching weight logs:", e)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => { fetchLogs() }, [fetchLogs])

  const handleSubmit = async () => {
    const numWeight = parseFloat(weight)
    if (isNaN(numWeight) || numWeight <= 0) return
    setIsSaving(true)
    try {
      const weightKg = unit === "lbs" ? convertWeight(numWeight, "lbs", "kg") : numWeight
      const res = await fetch("/api/health/weight", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ weight_kg: weightKg, time_of_day: timeOfDay }),
      })
      if (!res.ok) throw new Error("Failed to save")
      setWeight("")
      setIsAdding(false)
      await fetchLogs()
    } catch (e) {
      console.error("Error saving weight:", e)
    } finally {
      setIsSaving(false)
    }
  }

  const trendColor = trend?.trendDirection === "toward_goal"
    ? "text-green-500"
    : trend?.trendDirection === "reversing"
      ? "text-red-500"
      : "text-amber-500"

  if (isLoading) {
    return (
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><Scale className="h-5 w-5" /> Body Weight</CardTitle></CardHeader>
        <CardContent><p className="text-sm text-muted-foreground">Loading...</p></CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2"><Scale className="h-5 w-5" /> Body Weight</span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setUnit(unit === "kg" ? "lbs" : "kg")}
              className="text-xs px-2 py-1 rounded border border-border hover:bg-accent"
            >
              {unit}
            </button>
            <Button size="sm" variant="ghost" onClick={() => setIsAdding(!isAdding)}>
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Primary number: 7-day rolling average */}
        {trend?.rollingAvg7d !== null && trend && (
          <div className="text-center">
            <div className="text-3xl font-bold">{formatWeight(trend.rollingAvg7d!, unit)}</div>
            <div className="text-xs text-muted-foreground">7-day rolling average</div>
            {trend.velocityPerWeek !== null && (
              <div className={`text-sm font-medium mt-1 ${trendColor}`}>
                <TrendingUp className="h-3 w-3 inline mr-1" />
                {trend.velocityPerWeek > 0 ? "+" : ""}{formatWeight(Math.abs(trend.velocityPerWeek), unit)}/week
              </div>
            )}
            {trend.projectedTargetDate && (
              <div className="text-xs text-muted-foreground mt-1">
                Projected target: {trend.projectedTargetDate}
              </div>
            )}
            {trend.plateauDays >= 10 && (
              <div className="text-xs text-amber-500 mt-1">
                Plateau detected ({trend.plateauDays} days flat) — consider adjusting approach
              </div>
            )}
          </div>
        )}

        {logs.length === 0 && !isAdding && (
          <div className="text-center py-4">
            <p className="text-sm text-muted-foreground mb-2">No weight data yet</p>
            <Button size="sm" variant="outline" onClick={() => setIsAdding(true)}>
              <Plus className="h-4 w-4 mr-1" /> Log your weight
            </Button>
          </div>
        )}

        {/* Input form */}
        {isAdding && (
          <div className="space-y-3 border rounded-lg p-3">
            <div>
              <Label htmlFor="weight">Weight ({unit})</Label>
              <Input
                id="weight"
                type="number"
                step="0.1"
                placeholder={unit === "kg" ? "80.0" : "176.0"}
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
              />
            </div>
            <div>
              <Label>Time of day</Label>
              <div className="flex gap-2 mt-1">
                {(["morning", "post_workout", "evening"] as const).map((tod) => (
                  <button
                    key={tod}
                    onClick={() => setTimeOfDay(tod)}
                    className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                      timeOfDay === tod
                        ? "bg-green-500/20 border-green-500/40 text-green-500"
                        : "border-border hover:bg-accent"
                    }`}
                  >
                    {tod === "post_workout" ? "Post-workout" : tod.charAt(0).toUpperCase() + tod.slice(1)}
                  </button>
                ))}
              </div>
              <p className="text-xs text-muted-foreground mt-1">Morning weigh-ins are most consistent</p>
            </div>
            <div className="flex gap-2">
              <Button size="sm" onClick={handleSubmit} disabled={isSaving || !weight}>
                {isSaving ? "Saving..." : "Save"}
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setIsAdding(false)}>Cancel</Button>
            </div>
          </div>
        )}

        {/* Chart: raw scatter + trend line */}
        {logs.length > 0 && (
          <div className="space-y-2">
            <div className="text-xs font-medium text-muted-foreground uppercase">Last 30 days</div>
            <div className="h-32 flex items-end gap-0.5">
              {trend?.rawEntries.slice(-30).map((entry, i) => {
                const allWeights = trend.rawEntries.map((e) => e.weight_kg)
                const min = Math.min(...allWeights) - 1
                const max = Math.max(...allWeights) + 1
                const range = max - min || 1
                const height = ((entry.weight_kg - min) / range) * 100
                return (
                  <div
                    key={i}
                    className="flex-1 flex flex-col items-center justify-end"
                    title={`${entry.date}: ${formatWeight(entry.weight_kg, unit)}`}
                  >
                    <div
                      className="w-2 h-2 rounded-full bg-green-500/60"
                      style={{ marginBottom: `${height}%` }}
                    />
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Recent entries */}
        {logs.length > 0 && (
          <div className="space-y-1">
            <div className="text-xs font-medium text-muted-foreground uppercase">Recent</div>
            {logs.slice(-5).reverse().map((log) => (
              <div key={log.id} className="flex items-center justify-between text-sm py-1">
                <span className="text-muted-foreground">{new Date(log.logged_at).toLocaleDateString()}</span>
                <span className="font-medium">{formatWeight(log.weight_kg, unit)}</span>
                <span className="text-xs text-muted-foreground">{log.time_of_day}</span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
