"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Plus } from "lucide-react"
import type { SleepLogRow, SleepStats, SleepQuality } from "../types"
import { computeSleepStats } from "../healthService"

export function SleepTracker() {
  const [logs, setLogs] = useState<SleepLogRow[]>([])
  const [stats, setStats] = useState<SleepStats | null>(null)
  const [isAdding, setIsAdding] = useState(false)
  const [bedtime, setBedtime] = useState("23:00")
  const [wakeTime, setWakeTime] = useState("07:00")
  const [quality, setQuality] = useState<SleepQuality>(3)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)

  const fetchLogs = useCallback(async () => {
    try {
      const res = await fetch("/api/health/sleep?days=30")
      if (!res.ok) throw new Error("Failed to fetch")
      const data: SleepLogRow[] = await res.json()
      setLogs(data)
      setStats(computeSleepStats(data))
    } catch (e) {
      console.error("Error fetching sleep logs:", e)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => { fetchLogs() }, [fetchLogs])

  const handleSubmit = async () => {
    setIsSaving(true)
    try {
      const res = await fetch("/api/health/sleep", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bedtime, wake_time: wakeTime, quality }),
      })
      if (!res.ok) throw new Error("Failed to save")
      setBedtime("23:00")
      setWakeTime("07:00")
      setQuality(3)
      setIsAdding(false)
      await fetchLogs()
    } catch (e) {
      console.error("Error saving sleep:", e)
    } finally {
      setIsSaving(false)
    }
  }

  const qualityLabels: Record<SleepQuality, string> = {
    1: "Terrible", 2: "Poor", 3: "OK", 4: "Good", 5: "Great",
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader><CardTitle>Sleep</CardTitle></CardHeader>
        <CardContent><p className="text-sm text-muted-foreground">Loading...</p></CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Sleep</span>
          <Button size="sm" variant="ghost" onClick={() => setIsAdding(!isAdding)}>
            <Plus className="h-4 w-4" />
          </Button>
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Primary stats */}
        {stats?.avgHoursWeekly !== null && stats && (
          <div className="text-center">
            <div className="text-3xl font-bold">{stats.avgHoursWeekly!.toFixed(1)}h</div>
            <div className="text-xs text-muted-foreground">Weekly average</div>
            {stats.sleepDebt > 0 && (
              <div className="text-sm text-amber-500 mt-1">
                Sleep debt: {stats.sleepDebt.toFixed(1)}h this week
              </div>
            )}
          </div>
        )}

        {logs.length === 0 && !isAdding && (
          <div className="text-center py-4">
            <p className="text-sm text-muted-foreground mb-2">No sleep data yet</p>
            <Button size="sm" variant="outline" onClick={() => setIsAdding(true)}>
              <Plus className="h-4 w-4 mr-1" /> Log your sleep
            </Button>
          </div>
        )}

        {/* Input form */}
        {isAdding && (
          <div className="space-y-3 border rounded-lg p-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="bedtime">Bedtime</Label>
                <Input
                  id="bedtime"
                  type="time"
                  value={bedtime}
                  onChange={(e) => setBedtime(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="waketime">Wake time</Label>
                <Input
                  id="waketime"
                  type="time"
                  value={wakeTime}
                  onChange={(e) => setWakeTime(e.target.value)}
                />
              </div>
            </div>
            <div>
              <Label>Quality</Label>
              <div className="flex gap-1 mt-1">
                {([1, 2, 3, 4, 5] as SleepQuality[]).map((q) => (
                  <button
                    key={q}
                    onClick={() => setQuality(q)}
                    className={`flex-1 text-xs py-1.5 rounded border transition-colors ${
                      quality === q
                        ? "bg-blue-500/20 border-blue-500/40 text-blue-400"
                        : "border-border hover:bg-accent"
                    }`}
                  >
                    {q}
                  </button>
                ))}
              </div>
              <p className="text-xs text-muted-foreground text-center mt-1">{qualityLabels[quality]}</p>
            </div>
            <div className="flex gap-2">
              <Button size="sm" onClick={handleSubmit} disabled={isSaving}>
                {isSaving ? "Saving..." : "Save"}
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setIsAdding(false)}>Cancel</Button>
            </div>
          </div>
        )}

        {/* Sleep hours bar chart */}
        {stats && stats.entries.length > 0 && (
          <div className="space-y-2">
            <div className="text-xs font-medium text-muted-foreground uppercase">Sleep hours (30 days)</div>
            <div className="h-24 flex items-end gap-0.5">
              {stats.entries.slice(-30).map((entry, i) => {
                const height = Math.min(100, (entry.hours / 10) * 100)
                const color = entry.hours >= 7 ? "bg-blue-500" : entry.hours >= 6 ? "bg-amber-500" : "bg-red-500"
                return (
                  <div
                    key={i}
                    className="flex-1 flex flex-col items-center justify-end"
                    title={`${entry.date}: ${entry.hours.toFixed(1)}h (quality: ${entry.quality})`}
                  >
                    <div
                      className={`w-full rounded-t ${color} opacity-70`}
                      style={{ height: `${height}%` }}
                    />
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Bedtime consistency */}
        {stats && stats.bedtimeConsistency.length > 7 && (
          <div className="space-y-2">
            <div className="text-xs font-medium text-muted-foreground uppercase">Bedtime consistency</div>
            <div className="h-16 flex items-center gap-0.5">
              {stats.bedtimeConsistency.slice(-30).map((entry, i) => {
                // Normalize bedtime to position (22:00=top, 02:00=bottom)
                const minutes = entry.bedtimeMinutes
                const adjustedMin = minutes >= 720 ? minutes : minutes + 1440 // handle post-midnight
                const normalMin = Math.max(1200, Math.min(1560, adjustedMin)) // 20:00-02:00 range
                const pct = ((normalMin - 1200) / 360) * 100
                return (
                  <div
                    key={i}
                    className="flex-1 flex items-center justify-center relative h-full"
                    title={`${entry.date}: ${Math.floor(minutes / 60)}:${String(minutes % 60).padStart(2, "0")}`}
                  >
                    <div
                      className="w-1.5 h-1.5 rounded-full bg-indigo-400"
                      style={{ position: "absolute", top: `${pct}%` }}
                    />
                  </div>
                )
              })}
            </div>
            <div className="flex justify-between text-[10px] text-muted-foreground">
              <span>20:00</span>
              <span>23:00</span>
              <span>02:00</span>
            </div>
          </div>
        )}

        {/* Recent entries */}
        {logs.length > 0 && (
          <div className="space-y-1">
            <div className="text-xs font-medium text-muted-foreground uppercase">Recent</div>
            {logs.slice(-5).reverse().map((log) => {
              const hours = ((new Date(log.wake_time).getTime() - new Date(log.bedtime).getTime()) / (1000 * 60 * 60))
              const displayHours = hours < 0 ? hours + 24 : hours
              return (
                <div key={log.id} className="flex items-center justify-between text-sm py-1">
                  <span className="text-muted-foreground">{new Date(log.logged_at).toLocaleDateString()}</span>
                  <span className="font-medium">{displayHours.toFixed(1)}h</span>
                  <span className="text-xs">Q{log.quality}</span>
                </div>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
