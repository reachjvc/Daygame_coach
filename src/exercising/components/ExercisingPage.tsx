"use client"

import { useState, useEffect, useCallback } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Dumbbell,
  Play,
  Check,
  AlertTriangle,
  ArrowUp,
  ArrowDown,
  Minus,
  Loader2,
  RotateCcw,
} from "lucide-react"
import type {
  ExerciseEntry,
  NextSessionExercise,
  ProgressionResult,
  DayLabel,
} from "../types"

// ============================================================================
// Types
// ============================================================================

interface ExercisingData {
  programme: ExerciseEntry[]
  nextDay: DayLabel
  weekNumber: number
  nextSession: NextSessionExercise[]
  recentLog: {
    date: string
    day: string
    exercise: string
    setNumber: number
    targetWeightKg: number
    actualReps: number
    hitTarget: boolean
  }[]
}

type View = "next" | "log" | "programme" | "history"

// ============================================================================
// Component
// ============================================================================

export default function ExercisingPage() {
  const [data, setData] = useState<ExercisingData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [view, setView] = useState<View>("next")
  const [initializing, setInitializing] = useState(false)

  // Logging state
  const [logReps, setLogReps] = useState<Record<string, number[]>>({})
  const [submitting, setSubmitting] = useState(false)
  const [results, setResults] = useState<ProgressionResult[] | null>(null)

  const fetchData = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const res = await fetch("/api/exercising")
      if (!res.ok) {
        const body = await res.json()
        throw new Error(body.error || `HTTP ${res.status}`)
      }
      const d = await res.json()
      setData(d)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Initialize default reps when switching to log view
  useEffect(() => {
    if (view === "log" && data) {
      const defaults: Record<string, number[]> = {}
      for (const ex of data.nextSession) {
        defaults[ex.exercise] = Array(ex.sets).fill(0)
      }
      setLogReps(defaults)
      setResults(null)
    }
  }, [view, data])

  const handleInit = async () => {
    setInitializing(true)
    try {
      const res = await fetch("/api/exercising/init", { method: "POST" })
      if (!res.ok) {
        const body = await res.json()
        throw new Error(body.error || `HTTP ${res.status}`)
      }
      await fetchData()
    } catch (e) {
      setError(e instanceof Error ? e.message : "Init failed")
    } finally {
      setInitializing(false)
    }
  }

  const handleSubmitLog = async () => {
    if (!data) return
    setSubmitting(true)
    try {
      const exercises = data.nextSession.map((ex) => ({
        exercise: ex.exercise,
        sets: (logReps[ex.exercise] || []).map((reps) => ({ reps })),
      }))

      const res = await fetch("/api/exercising/log", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ day: data.nextDay, exercises }),
      })

      if (!res.ok) {
        const body = await res.json()
        throw new Error(body.error || `HTTP ${res.status}`)
      }

      const result = await res.json()
      setResults(result.progressionResults)
      await fetchData()
    } catch (e) {
      setError(e instanceof Error ? e.message : "Log failed")
    } finally {
      setSubmitting(false)
    }
  }

  const updateRep = (exercise: string, setIdx: number, value: number) => {
    setLogReps((prev) => {
      const arr = [...(prev[exercise] || [])]
      arr[setIdx] = Math.max(0, value)
      return { ...prev, [exercise]: arr }
    })
  }

  // ---- Render ----

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-muted-foreground">
        <Loader2 className="w-5 h-5 animate-spin mr-2" />
        Loading programme...
      </div>
    )
  }

  if (error && !data) {
    return (
      <div className="max-w-4xl mx-auto p-6 space-y-4">
        <Card className="p-6 text-center space-y-4">
          <AlertTriangle className="w-8 h-8 text-yellow-500 mx-auto" />
          <h2 className="text-lg font-semibold">Setup Required</h2>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            {error.includes("env var")
              ? "Set GOOGLE_SERVICE_ACCOUNT_JSON and GOOGLE_EXERCISE_SHEET_ID in .env.local, then share the sheet with the service account email."
              : error}
          </p>
          <Button onClick={handleInit} disabled={initializing}>
            {initializing ? (
              <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Initializing...</>
            ) : (
              "Initialize Programme"
            )}
          </Button>
        </Card>
      </div>
    )
  }

  if (!data || data.programme.length === 0) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <Card className="p-6 text-center space-y-4">
          <Dumbbell className="w-8 h-8 text-muted-foreground mx-auto" />
          <h2 className="text-lg font-semibold">No Programme Found</h2>
          <p className="text-sm text-muted-foreground">
            Initialize the Google Sheet with the default Upper/Lower programme.
          </p>
          <Button onClick={handleInit} disabled={initializing}>
            {initializing ? (
              <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Initializing...</>
            ) : (
              "Initialize Programme"
            )}
          </Button>
        </Card>
      </div>
    )
  }

  const DAY_NAMES: Record<DayLabel, string> = {
    A: "Upper 1",
    B: "Lower 1",
    C: "Upper 2",
    D: "Lower 2",
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Dumbbell className="w-6 h-6" />
            Exercising
          </h1>
          <p className="text-sm text-muted-foreground">
            Week {data.weekNumber} · Next: Day {data.nextDay} ({DAY_NAMES[data.nextDay]})
          </p>
        </div>
        <Button variant="ghost" size="sm" onClick={fetchData}>
          <RotateCcw className="w-4 h-4" />
        </Button>
      </div>

      {/* Navigation */}
      <div className="flex gap-2 flex-wrap">
        {(["next", "log", "programme", "history"] as View[]).map((v) => (
          <Button
            key={v}
            variant={view === v ? "default" : "outline"}
            size="sm"
            onClick={() => setView(v)}
          >
            {v === "next" ? "Next Session" : v === "log" ? "Log Workout" : v === "programme" ? "Programme" : "History"}
          </Button>
        ))}
      </div>

      {error && (
        <div className="text-sm text-red-500 bg-red-50 dark:bg-red-950 p-3 rounded">
          {error}
        </div>
      )}

      {/* Views */}
      {view === "next" && <NextSessionView data={data} onStartLog={() => setView("log")} />}
      {view === "log" && (
        <LogView
          data={data}
          logReps={logReps}
          updateRep={updateRep}
          onSubmit={handleSubmitLog}
          submitting={submitting}
          results={results}
        />
      )}
      {view === "programme" && <ProgrammeView programme={data.programme} />}
      {view === "history" && <HistoryView log={data.recentLog} />}
    </div>
  )
}

// ============================================================================
// Sub-views
// ============================================================================

function NextSessionView({
  data,
  onStartLog,
}: {
  data: ExercisingData
  onStartLog: () => void
}) {
  return (
    <div className="space-y-4">
      <Card className="p-4">
        <h2 className="font-semibold mb-3 text-lg">
          Day {data.nextDay} — {data.nextDay === "A" || data.nextDay === "C" ? "Upper" : "Lower"} Session
        </h2>
        <div className="space-y-3">
          {data.nextSession.map((ex) => (
            <div
              key={ex.exercise}
              className="flex items-center justify-between py-2 border-b last:border-0"
            >
              <div>
                <span className="font-medium">{ex.exercise}</span>
                {ex.notes && (
                  <span className="text-xs text-yellow-600 ml-2">{ex.notes}</span>
                )}
              </div>
              <div className="text-sm text-muted-foreground">
                {ex.sets} × {ex.targetReps} @ {ex.weightKg} kg
              </div>
            </div>
          ))}
        </div>
        <Button className="mt-4 w-full" onClick={onStartLog}>
          <Play className="w-4 h-4 mr-2" /> Start Workout
        </Button>
      </Card>
    </div>
  )
}

function LogView({
  data,
  logReps,
  updateRep,
  onSubmit,
  submitting,
  results,
}: {
  data: ExercisingData
  logReps: Record<string, number[]>
  updateRep: (exercise: string, setIdx: number, value: number) => void
  onSubmit: () => void
  submitting: boolean
  results: ProgressionResult[] | null
}) {
  return (
    <div className="space-y-4">
      {results && (
        <Card className="p-4 bg-green-50 dark:bg-green-950 space-y-2">
          <h3 className="font-semibold text-green-700 dark:text-green-300 flex items-center gap-2">
            <Check className="w-4 h-4" /> Workout Logged — Progression Applied
          </h3>
          {results.map((r) => (
            <div key={r.exercise} className="flex items-center gap-2 text-sm">
              <StatusIcon status={r.newStatus} />
              <span className="font-medium">{r.exercise}</span>
              <span className="text-muted-foreground">
                {r.previousWeight}kg → {r.newWeight}kg
              </span>
              <span className="text-xs text-muted-foreground">({r.reason})</span>
            </div>
          ))}
        </Card>
      )}

      {data.nextSession.map((ex) => (
        <Card key={ex.exercise} className="p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold">{ex.exercise}</h3>
            <span className="text-sm text-muted-foreground">
              {ex.weightKg} kg · {ex.targetReps} reps
            </span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {(logReps[ex.exercise] || []).map((reps, i) => (
              <div key={i} className="space-y-1">
                <label className="text-xs text-muted-foreground">Set {i + 1}</label>
                <input
                  type="number"
                  inputMode="numeric"
                  min={0}
                  max={30}
                  value={reps || ""}
                  onChange={(e) =>
                    updateRep(ex.exercise, i, parseInt(e.target.value) || 0)
                  }
                  className="w-full rounded border px-3 py-2 text-center text-lg bg-background"
                />
              </div>
            ))}
          </div>
        </Card>
      ))}

      <Button
        className="w-full"
        onClick={onSubmit}
        disabled={submitting}
      >
        {submitting ? (
          <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Submitting...</>
        ) : (
          <><Check className="w-4 h-4 mr-2" /> Log Workout & Apply Progression</>
        )}
      </Button>
    </div>
  )
}

function ProgrammeView({ programme }: { programme: ExerciseEntry[] }) {
  const days: DayLabel[] = ["A", "B", "C", "D"]
  const dayNames: Record<DayLabel, string> = {
    A: "Upper 1",
    B: "Lower 1",
    C: "Upper 2",
    D: "Lower 2",
  }

  return (
    <div className="space-y-6">
      {days.map((day) => {
        const exercises = programme.filter((e) => e.day === day)
        if (exercises.length === 0) return null
        return (
          <Card key={day} className="p-4">
            <h3 className="font-semibold mb-3">
              Day {day} — {dayNames[day]}
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-muted-foreground border-b">
                    <th className="pb-2">Exercise</th>
                    <th className="pb-2">Tier</th>
                    <th className="pb-2">Sets × Reps</th>
                    <th className="pb-2">Weight</th>
                    <th className="pb-2">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {exercises.map((ex) => (
                    <tr key={ex.exercise} className="border-b last:border-0">
                      <td className="py-2 font-medium">{ex.exercise}</td>
                      <td className="py-2">
                        <Badge variant="outline">{ex.tier}</Badge>
                      </td>
                      <td className="py-2">
                        {ex.sets} × {ex.repMin}-{ex.repMax}
                      </td>
                      <td className="py-2">{ex.currentWeightKg} kg</td>
                      <td className="py-2">
                        <StatusBadge status={ex.status} fails={ex.consecutiveFails} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )
      })}
    </div>
  )
}

function HistoryView({
  log,
}: {
  log: ExercisingData["recentLog"]
}) {
  if (log.length === 0) {
    return (
      <Card className="p-6 text-center text-muted-foreground">
        No workout history yet. Log your first session!
      </Card>
    )
  }

  // Group by date
  const grouped: Record<string, typeof log> = {}
  for (const entry of log) {
    if (!grouped[entry.date]) grouped[entry.date] = []
    grouped[entry.date].push(entry)
  }

  return (
    <div className="space-y-4">
      {Object.entries(grouped).map(([date, entries]) => (
        <Card key={date} className="p-4">
          <h3 className="font-semibold mb-2">
            {date} — Day {entries[0].day}
          </h3>
          <div className="space-y-1 text-sm">
            {entries.map((e, i) => (
              <div
                key={i}
                className={`flex items-center justify-between py-1 ${
                  e.hitTarget ? "" : "text-red-500"
                }`}
              >
                <span>
                  {e.exercise} · Set {e.setNumber}
                </span>
                <span>
                  {e.actualReps} reps @ {e.targetWeightKg} kg
                  {e.hitTarget ? (
                    <Check className="w-3 h-3 inline ml-1 text-green-500" />
                  ) : (
                    <Minus className="w-3 h-3 inline ml-1" />
                  )}
                </span>
              </div>
            ))}
          </div>
        </Card>
      ))}
    </div>
  )
}

// ============================================================================
// Helpers
// ============================================================================

function StatusIcon({ status }: { status: string }) {
  switch (status) {
    case "ADVANCE":
      return <ArrowUp className="w-4 h-4 text-green-500" />
    case "DELOAD":
      return <ArrowDown className="w-4 h-4 text-red-500" />
    default:
      return <Minus className="w-4 h-4 text-muted-foreground" />
  }
}

function StatusBadge({ status, fails }: { status: string; fails: number }) {
  switch (status) {
    case "ADVANCE":
      return <Badge className="bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300">Advanced</Badge>
    case "DELOAD":
      return <Badge className="bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300">Deloaded</Badge>
    case "HOLD":
      return (
        <Badge className="bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300">
          Hold{fails > 0 ? ` (${fails}×)` : ""}
        </Badge>
      )
    default:
      return <Badge variant="outline">Ready</Badge>
  }
}
