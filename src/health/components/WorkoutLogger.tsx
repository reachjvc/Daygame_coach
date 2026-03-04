"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dumbbell, Plus, Trash2 } from "lucide-react"
import type { WorkoutLogRow, SessionType, WorkoutIntensity, WorkoutSetInsert } from "../types"

interface SetInput {
  exercise: string
  weight_kg: string
  reps: string
}

export function WorkoutLogger() {
  const [logs, setLogs] = useState<WorkoutLogRow[]>([])
  const [isAdding, setIsAdding] = useState(false)
  const [sessionType, setSessionType] = useState<SessionType>("weights")
  const [duration, setDuration] = useState("")
  const [intensity, setIntensity] = useState<WorkoutIntensity>(3)
  const [distanceKm, setDistanceKm] = useState("")
  const [sets, setSets] = useState<SetInput[]>([{ exercise: "", weight_kg: "", reps: "" }])
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)

  const fetchLogs = useCallback(async () => {
    try {
      const res = await fetch("/api/health/workout?days=90")
      if (!res.ok) throw new Error("Failed to fetch")
      setLogs(await res.json())
    } catch (e) {
      console.error("Error fetching workout logs:", e)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => { fetchLogs() }, [fetchLogs])

  const addSet = () => setSets([...sets, { exercise: sets[sets.length - 1]?.exercise || "", weight_kg: "", reps: "" }])
  const removeSet = (i: number) => setSets(sets.filter((_, idx) => idx !== i))
  const updateSet = (i: number, field: keyof SetInput, value: string) => {
    const updated = [...sets]
    updated[i] = { ...updated[i], [field]: value }
    setSets(updated)
  }

  const handleSubmit = async () => {
    const dur = parseInt(duration)
    if (isNaN(dur) || dur <= 0) return
    setIsSaving(true)

    const validSets: WorkoutSetInsert[] = sets
      .filter((s) => s.exercise && s.weight_kg && s.reps)
      .map((s, i) => ({
        exercise: s.exercise,
        weight_kg: parseFloat(s.weight_kg),
        reps: parseInt(s.reps),
        set_number: i + 1,
      }))

    try {
      const res = await fetch("/api/health/workout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          session_type: sessionType,
          duration_min: dur,
          intensity,
          distance_km: distanceKm ? parseFloat(distanceKm) : null,
          sets: validSets.length > 0 ? validSets : undefined,
        }),
      })
      if (!res.ok) throw new Error("Failed to save")
      setDuration("")
      setIntensity(3)
      setDistanceKm("")
      setSets([{ exercise: "", weight_kg: "", reps: "" }])
      setIsAdding(false)
      await fetchLogs()
    } catch (e) {
      console.error("Error saving workout:", e)
    } finally {
      setIsSaving(false)
    }
  }

  // Heatmap data (last 90 days)
  const heatmap = buildHeatmap(logs)
  const thisWeekCount = logs.filter((l) => {
    const now = new Date()
    const dayOfWeek = now.getDay() || 7
    const monday = new Date(now)
    monday.setDate(now.getDate() - dayOfWeek + 1)
    monday.setHours(0, 0, 0, 0)
    return new Date(l.logged_at) >= monday
  }).length

  if (isLoading) {
    return (
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><Dumbbell className="h-5 w-5" /> Workouts</CardTitle></CardHeader>
        <CardContent><p className="text-sm text-muted-foreground">Loading...</p></CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2"><Dumbbell className="h-5 w-5" /> Workouts</span>
          <Button size="sm" variant="ghost" onClick={() => setIsAdding(!isAdding)}>
            <Plus className="h-4 w-4" />
          </Button>
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Stats */}
        <div className="grid grid-cols-2 gap-3 text-center">
          <div>
            <div className="text-2xl font-bold">{thisWeekCount}</div>
            <div className="text-xs text-muted-foreground">This week</div>
          </div>
          <div>
            <div className="text-2xl font-bold">{logs.length}</div>
            <div className="text-xs text-muted-foreground">Last 90 days</div>
          </div>
        </div>

        {logs.length === 0 && !isAdding && (
          <div className="text-center py-4">
            <p className="text-sm text-muted-foreground mb-2">No workouts logged yet</p>
            <Button size="sm" variant="outline" onClick={() => setIsAdding(true)}>
              <Plus className="h-4 w-4 mr-1" /> Log a workout
            </Button>
          </div>
        )}

        {/* Input form */}
        {isAdding && (
          <div className="space-y-3 border rounded-lg p-3">
            <div>
              <Label>Session type</Label>
              <div className="flex gap-2 mt-1">
                {(["weights", "cardio", "mobility", "yoga", "running"] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => setSessionType(t)}
                    className={`flex-1 text-xs py-1.5 rounded border transition-colors capitalize ${
                      sessionType === t
                        ? "bg-green-500/20 border-green-500/40 text-green-500"
                        : "border-border hover:bg-accent"
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="duration">Duration (min)</Label>
                <Input id="duration" type="number" placeholder="60" value={duration} onChange={(e) => setDuration(e.target.value)} />
              </div>
              <div>
                <Label>Intensity</Label>
                <div className="flex gap-1 mt-1">
                  {([1, 2, 3, 4, 5] as WorkoutIntensity[]).map((i) => (
                    <button
                      key={i}
                      onClick={() => setIntensity(i)}
                      className={`flex-1 text-xs py-1.5 rounded border transition-colors ${
                        intensity === i
                          ? "bg-green-500/20 border-green-500/40 text-green-400"
                          : "border-border hover:bg-accent"
                      }`}
                    >
                      {i}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Distance (for running/cardio) */}
            {(sessionType === "running" || sessionType === "cardio") && (
              <div>
                <Label htmlFor="distance">Distance (km) — optional</Label>
                <Input id="distance" type="number" placeholder="5.0" value={distanceKm} onChange={(e) => setDistanceKm(e.target.value)} />
              </div>
            )}

            {/* Sets (for weights sessions) */}
            {sessionType === "weights" && (
              <div className="space-y-2">
                <Label>Sets</Label>
                {sets.map((s, i) => (
                  <div key={i} className="flex gap-2 items-center">
                    <Input
                      placeholder="Exercise"
                      className="flex-[2]"
                      value={s.exercise}
                      onChange={(e) => updateSet(i, "exercise", e.target.value)}
                    />
                    <Input
                      type="number"
                      placeholder="kg"
                      className="flex-1"
                      value={s.weight_kg}
                      onChange={(e) => updateSet(i, "weight_kg", e.target.value)}
                    />
                    <Input
                      type="number"
                      placeholder="reps"
                      className="flex-1"
                      value={s.reps}
                      onChange={(e) => updateSet(i, "reps", e.target.value)}
                    />
                    {sets.length > 1 && (
                      <Button size="sm" variant="ghost" onClick={() => removeSet(i)}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                ))}
                <Button size="sm" variant="outline" onClick={addSet}>
                  <Plus className="h-3 w-3 mr-1" /> Add set
                </Button>
              </div>
            )}

            <div className="flex gap-2">
              <Button size="sm" onClick={handleSubmit} disabled={isSaving || !duration}>
                {isSaving ? "Saving..." : "Save"}
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setIsAdding(false)}>Cancel</Button>
            </div>
          </div>
        )}

        {/* 90-day heatmap */}
        {heatmap.length > 0 && (
          <div className="space-y-2">
            <div className="text-xs font-medium text-muted-foreground uppercase">90-day activity</div>
            <div className="flex gap-0.5 flex-wrap">
              {heatmap.map((day, i) => (
                <div
                  key={i}
                  className={`w-3 h-3 rounded-sm ${
                    day.count === 0
                      ? "bg-muted"
                      : day.count === 1
                        ? "bg-green-500/40"
                        : "bg-green-500/80"
                  }`}
                  title={`${day.date}: ${day.count} session${day.count !== 1 ? "s" : ""}`}
                />
              ))}
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
                <span className="font-medium capitalize">{log.session_type}</span>
                <span className="text-xs text-muted-foreground">{log.duration_min}min</span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function buildHeatmap(logs: WorkoutLogRow[]): { date: string; count: number }[] {
  const today = new Date()
  const map = new Map<string, number>()
  for (const log of logs) {
    const date = new Date(log.logged_at).toISOString().split("T")[0]
    map.set(date, (map.get(date) ?? 0) + 1)
  }

  const result: { date: string; count: number }[] = []
  for (let i = 89; i >= 0; i--) {
    const d = new Date(today)
    d.setDate(today.getDate() - i)
    const dateStr = d.toISOString().split("T")[0]
    result.push({ date: dateStr, count: map.get(dateStr) ?? 0 })
  }
  return result
}
