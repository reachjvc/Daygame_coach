"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ChevronDown, ChevronRight, Dumbbell, FileText, Minus, Plus, RotateCcw, Save, Trash2, X } from "lucide-react"
import {
  buildWorkoutHeatmapWeeks,
  computeWeekStreak,
  summarizeWorkoutSets,
  findLastExerciseSets,
  detectPersonalRecords,
} from "../healthService"
import type {
  WorkoutLogWithSets,
  WorkoutTemplateRow,
  WorkoutTemplateSet,
  SessionType,
  WorkoutIntensity,
  WorkoutSetInsert,
  WorkoutSetRow,
  PersonalRecord,
} from "../types"

interface SetRowInput {
  weight_kg: string
  reps: string
  is_warmup: boolean
  notes: string
  // UI-only: whether the note input is open (notes are cleared when closed)
  showNotes: boolean
}

// Sets are entered grouped by exercise (name typed once, N sets under it);
// flattened back to WorkoutSetInsert[] on submit.
interface ExerciseInput {
  exercise: string
  notes: string
  showNotes: boolean
  sets: SetRowInput[]
}

const MAX_SETS_PER_EXERCISE = 10

function emptySet(): SetRowInput {
  return { weight_kg: "", reps: "", is_warmup: false, notes: "", showNotes: false }
}

function emptyExercise(): ExerciseInput {
  return { exercise: "", notes: "", showNotes: false, sets: [emptySet()] }
}

// Surface the API's error + field details instead of swallowing them
async function readApiError(res: Response): Promise<string> {
  try {
    const data = await res.json()
    const details = data.details
      ? ` — ${Object.entries(data.details)
          .map(([field, msgs]) => `${field}: ${Array.isArray(msgs) ? msgs.join(", ") : String(msgs)}`)
          .join("; ")}`
      : ""
    return `${data.error ?? `Request failed (${res.status})`}${details}`
  } catch {
    return `Request failed (${res.status})`
  }
}

export function WorkoutLogger() {
  const [logs, setLogs] = useState<WorkoutLogWithSets[]>([])
  const [isAdding, setIsAdding] = useState(false)
  const [sessionType, setSessionType] = useState<SessionType>("weights")
  const [duration, setDuration] = useState("")
  const [intensity, setIntensity] = useState<WorkoutIntensity>(3)
  const [distanceKm, setDistanceKm] = useState("")
  /**
   * The day you trained. Empty means "now" — the log is stamped with the moment
   * it is saved, which is what logging as you go means. Set it and that day is
   * what counts, so a Saturday session written up on Monday lands in Saturday's
   * week rather than Monday's.
   */
  const [workoutDate, setWorkoutDate] = useState("")
  /**
   * The time of day, on that date. Optional — without it the workout is filed at
   * midday. It matters when there are two in a day: a lift in the morning and a
   * run in the evening otherwise land on the same instant and nothing can put
   * them in order.
   */
  const [workoutTime, setWorkoutTime] = useState("")
  const [exercises, setExercises] = useState<ExerciseInput[]>([emptyExercise()])
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [templates, setTemplates] = useState<WorkoutTemplateRow[]>([])
  const [showTemplates, setShowTemplates] = useState(false)
  const [templateName, setTemplateName] = useState("")
  const [isSavingTemplate, setIsSavingTemplate] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [templateError, setTemplateError] = useState<string | null>(null)
  const [templateSaved, setTemplateSaved] = useState(false)
  const [expandedLogs, setExpandedLogs] = useState<Set<string>>(new Set())
  const [showAllLogs, setShowAllLogs] = useState(false)
  const [newPRs, setNewPRs] = useState<PersonalRecord[]>([])

  const fetchLogs = useCallback(async () => {
    try {
      const res = await fetch("/api/health/workout?days=90&include=sets")
      if (!res.ok) throw new Error("Failed to fetch")
      setLogs(await res.json())
    } catch (e) {
      console.error("Error fetching workout logs:", e)
    } finally {
      setIsLoading(false)
    }
  }, [])

  const fetchTemplates = useCallback(async () => {
    try {
      const res = await fetch("/api/health/workout/templates")
      if (!res.ok) throw new Error("Failed to fetch")
      const data: WorkoutTemplateRow[] = await res.json()
      setTemplates(data)
      // Saved templates should be discoverable without hunting for the toggle
      if (data.length > 0) setShowTemplates(true)
    } catch (e) {
      console.error("Error fetching workout templates:", e)
    }
  }, [])

  useEffect(() => { fetchLogs(); fetchTemplates() }, [fetchLogs, fetchTemplates])

  const addExercise = () => setExercises([...exercises, emptyExercise()])
  const removeExercise = (ei: number) => setExercises(exercises.filter((_, i) => i !== ei))
  const updateExerciseName = (ei: number, name: string) =>
    setExercises(exercises.map((ex, i) => (i === ei ? { ...ex, exercise: name } : ex)))
  const updateExercise = (ei: number, patch: Partial<ExerciseInput>) =>
    setExercises(exercises.map((ex, i) => (i === ei ? { ...ex, ...patch } : ex)))
  const updateSet = (ei: number, si: number, patch: Partial<SetRowInput>) =>
    setExercises(
      exercises.map((ex, i) =>
        i === ei ? { ...ex, sets: ex.sets.map((s, j) => (j === si ? { ...s, ...patch } : s)) } : ex
      )
    )
  // Set 1 leads: edits to it flow down to sets that are empty or still matching
  // its previous value; individually customized sets are left alone.
  const updateSetRow = (ei: number, si: number, field: "weight_kg" | "reps", value: string) =>
    setExercises(
      exercises.map((ex, i) => {
        if (i !== ei) return ex
        const prevLeadValue = ex.sets[si][field]
        return {
          ...ex,
          sets: ex.sets.map((s, j) => {
            if (j === si) return { ...s, [field]: value }
            if (si === 0 && j > 0 && (s[field] === "" || s[field] === prevLeadValue)) {
              return { ...s, [field]: value }
            }
            return s
          }),
        }
      })
    )
  // Stepper: growing copies the last set's weight/reps (same-across-sets is the norm);
  // warm-up flag and note are individual per set, so the new set starts clean.
  const changeSetCount = (ei: number, delta: number) =>
    setExercises(
      exercises.map((ex, i) => {
        if (i !== ei) return ex
        if (delta > 0 && ex.sets.length < MAX_SETS_PER_EXERCISE) {
          const last = ex.sets[ex.sets.length - 1]
          return { ...ex, sets: [...ex.sets, { ...emptySet(), weight_kg: last.weight_kg, reps: last.reps }] }
        }
        if (delta < 0 && ex.sets.length > 1) return { ...ex, sets: ex.sets.slice(0, -1) }
        return ex
      })
    )

  const flattenSets = (): Omit<WorkoutSetInsert, "set_number">[] =>
    exercises.flatMap((ex) => {
      const name = ex.exercise.trim()
      if (!name) return []
      const exerciseNotes = ex.notes.trim() || null
      return ex.sets
        .filter((s) => s.weight_kg && s.reps)
        .map((s) => ({
          exercise: name,
          weight_kg: parseFloat(s.weight_kg),
          reps: parseInt(s.reps),
          is_warmup: s.is_warmup,
          notes: s.notes.trim() || null,
          exercise_notes: exerciseNotes,
        }))
    })

  const handleSubmit = async () => {
    const dur = parseInt(duration)
    if (isNaN(dur) || dur <= 0) return
    setIsSaving(true)
    setSaveError(null)

    const validSets: WorkoutSetInsert[] = flattenSets().map((s, i) => ({ ...s, set_number: i + 1 }))

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
          // Sent only when the user picked a day. The server turns it into an
          // instant in their timezone; the browser does not, because the browser
          // does not know which timezone the account is set to.
          entry_date: workoutDate || undefined,
          entry_time: workoutDate && workoutTime ? workoutTime : undefined,
        }),
      })
      if (!res.ok) throw new Error(await readApiError(res))
      // PR check: compare the saved sets against everything logged before them
      const created: WorkoutLogWithSets = await res.json()
      const priorSets = logs.flatMap((l) => (l.sets ?? []).map((s) => ({ ...s, logged_at: l.logged_at })))
      setNewPRs(detectPersonalRecords(priorSets, created.sets ?? []))
      setDuration("")
      setIntensity(3)
      setDistanceKm("")
      setWorkoutDate("")
      setWorkoutTime("")
      setExercises([emptyExercise()])
      setTemplateName("")
      setIsAdding(false)
      await fetchLogs()
    } catch (e) {
      console.error("Error saving workout:", e)
      setSaveError(e instanceof Error ? e.message : "Failed to save workout")
    } finally {
      setIsSaving(false)
    }
  }

  // Regroup flat sets into per-exercise input blocks (consecutive same name)
  const regroupSets = (sets: (WorkoutTemplateSet | WorkoutSetRow)[]): ExerciseInput[] => {
    const groups: ExerciseInput[] = []
    for (const s of sets) {
      const row: SetRowInput = {
        weight_kg: String(s.weight_kg),
        reps: String(s.reps),
        is_warmup: !!s.is_warmup,
        notes: s.notes ?? "",
        showNotes: !!s.notes,
      }
      const last = groups[groups.length - 1]
      if (last && last.exercise === s.exercise) last.sets.push(row)
      else groups.push({
        exercise: s.exercise,
        notes: s.exercise_notes ?? "",
        showNotes: !!s.exercise_notes,
        sets: [row],
      })
    }
    return groups.length > 0 ? groups : [emptyExercise()]
  }

  const applyTemplate = (t: WorkoutTemplateRow) => {
    setSessionType(t.session_type)
    setDuration(t.duration_min != null ? String(t.duration_min) : "")
    setIntensity(t.intensity)
    setDistanceKm(t.distance_km != null ? String(t.distance_km) : "")
    setExercises(regroupSets(t.sets))
    // Prefill the name so re-saving updates this template instead of creating a copy
    setTemplateName(t.name)
    setNewPRs([])
    setIsAdding(true)
    setShowTemplates(false)
  }

  // One-tap repeat: prefill the form from the most recent workout
  const repeatLastWorkout = () => {
    const last = logs[logs.length - 1]
    if (!last) return
    setSessionType(last.session_type)
    setDuration(String(last.duration_min))
    setIntensity(last.intensity)
    setDistanceKm(last.distance_km != null ? String(last.distance_km) : "")
    setExercises(regroupSets(last.sets ?? []))
    setTemplateName("")
    setNewPRs([])
    setIsAdding(true)
  }

  const saveTemplate = async () => {
    const name = templateName.trim()
    if (!name) return
    setIsSavingTemplate(true)
    setTemplateError(null)
    setTemplateSaved(false)
    try {
      const res = await fetch("/api/health/workout/templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          session_type: sessionType,
          duration_min: duration ? parseInt(duration) : null,
          intensity,
          distance_km: distanceKm ? parseFloat(distanceKm) : null,
          sets: flattenSets(),
        }),
      })
      if (!res.ok) throw new Error(await readApiError(res))
      await fetchTemplates()
      // Open the panel so the saved template is visibly in the list
      setShowTemplates(true)
      setTemplateSaved(true)
    } catch (e) {
      console.error("Error saving workout template:", e)
      setTemplateError(e instanceof Error ? e.message : "Failed to save template")
    } finally {
      setIsSavingTemplate(false)
    }
  }

  const deleteLog = async (log: WorkoutLogWithSets) => {
    if (!window.confirm(`Delete this ${log.session_type} workout from ${new Date(log.logged_at).toLocaleDateString()}?`)) return
    try {
      const res = await fetch(`/api/health/workout?id=${log.id}`, { method: "DELETE" })
      if (!res.ok) throw new Error("Failed to delete")
      await fetchLogs()
    } catch (e) {
      console.error("Error deleting workout log:", e)
    }
  }

  const toggleLogExpanded = (id: string) =>
    setExpandedLogs((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })

  const deleteTemplate = async (t: WorkoutTemplateRow) => {
    if (!window.confirm(`Delete template "${t.name}"?`)) return
    try {
      const res = await fetch(`/api/health/workout/templates?id=${t.id}`, { method: "DELETE" })
      if (!res.ok) throw new Error("Failed to delete")
      await fetchTemplates()
    } catch (e) {
      console.error("Error deleting workout template:", e)
    }
  }

  const now = new Date()
  const todayKey = now.toLocaleDateString("sv-SE") // YYYY-MM-DD in local time
  const heatmapWeeks = buildWorkoutHeatmapWeeks(logs, now)
  const weekStreak = computeWeekStreak(logs, now)
  const thisWeekCount = heatmapWeeks[heatmapWeeks.length - 1].reduce((sum, d) => sum + d.count, 0)

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
          <span className="flex items-center">
            {logs.length > 0 && !isAdding && (
              <Button size="sm" variant="ghost" onClick={repeatLastWorkout} title="Repeat last workout">
                <RotateCcw className="h-4 w-4" />
              </Button>
            )}
            <Button size="sm" variant="ghost" onClick={() => setShowTemplates(!showTemplates)} title="Workout templates">
              <FileText className="h-4 w-4" />
            </Button>
            <Button size="sm" variant="ghost" onClick={() => { setNewPRs([]); setIsAdding(!isAdding) }} title="Log a workout">
              <Plus className="h-4 w-4" />
            </Button>
          </span>
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 text-center">
          <div>
            <div className="text-2xl font-bold">{thisWeekCount}</div>
            <div className="text-xs text-muted-foreground">This week</div>
          </div>
          <div>
            <div className="text-2xl font-bold">
              {weekStreak}
              <span className="text-sm font-medium text-muted-foreground">w</span>
            </div>
            <div className="text-xs text-muted-foreground">Week streak</div>
          </div>
          <div>
            <div className="text-2xl font-bold">{logs.length}</div>
            <div className="text-xs text-muted-foreground">Last 90 days</div>
          </div>
        </div>

        {/* New PR banner (after a save that beat previous bests) */}
        {newPRs.length > 0 && (
          <div className="flex items-start justify-between gap-2 rounded-lg border border-green-500/40 bg-green-500/10 px-3 py-2">
            <div className="space-y-0.5">
              {newPRs.map((pr) => (
                <p key={`${pr.exercise}-${pr.weight_kg}-${pr.reps}`} className="text-sm text-green-500">
                  <span className="font-semibold">New PR</span> — {pr.exercise} {pr.weight_kg}kg × {pr.reps}
                </p>
              ))}
            </div>
            <button onClick={() => setNewPRs([])} title="Dismiss" className="text-muted-foreground hover:text-foreground transition-colors">
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )}

        {/* Templates panel */}
        {showTemplates && (
          <div className="space-y-2 border rounded-lg p-3">
            <div className="text-xs font-medium text-muted-foreground uppercase">Templates</div>
            {templates.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No templates yet. Fill in a workout below and save it as a template.
              </p>
            ) : (
              templates.map((t) => (
                <div key={t.id} className="flex items-center gap-2">
                  <button
                    onClick={() => applyTemplate(t)}
                    className="flex-1 flex items-center justify-between text-sm py-1.5 px-2 rounded border border-border hover:bg-accent transition-colors text-left"
                    title={`Load "${t.name}" into the form`}
                  >
                    <span className="font-medium truncate">{t.name}</span>
                    <span className="text-xs text-muted-foreground capitalize shrink-0 ml-2">
                      {t.session_type}
                      {t.sets.length > 0 && ` · ${t.sets.length} set${t.sets.length !== 1 ? "s" : ""}`}
                      {t.duration_min != null && ` · ${t.duration_min}min`}
                    </span>
                  </button>
                  <Button size="sm" variant="ghost" onClick={() => deleteTemplate(t)} title="Delete template">
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              ))
            )}
          </div>
        )}

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

            <div>
              <Label htmlFor="workout-date">When</Label>
              <div className="grid grid-cols-[1fr_auto] gap-2">
                <Input
                  id="workout-date"
                  type="date"
                  max={todayKey}
                  value={workoutDate}
                  onChange={(e) => setWorkoutDate(e.target.value)}
                />
                <Input
                  id="workout-time"
                  type="time"
                  aria-label="Time of day"
                  className="w-32"
                  disabled={!workoutDate}
                  value={workoutTime}
                  onChange={(e) => setWorkoutTime(e.target.value)}
                />
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {workoutDate
                  ? workoutTime
                    ? "Counts towards the week that day falls in."
                    : "Counts towards the week that day falls in. Add a time if you trained twice that day."
                  : "Leave empty for right now. Set a date to log a workout you did earlier."}
              </p>
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

            {/* Exercises (for weights sessions) — name once, sets stepper per exercise */}
            {sessionType === "weights" && (
              <div className="space-y-2">
                <Label>Exercises</Label>
                {exercises.map((ex, ei) => {
                  const lastTime = findLastExerciseSets(logs, ex.exercise)
                  const lastSummary = lastTime ? summarizeWorkoutSets(lastTime.sets)[0] : null
                  return (
                  <div key={ei} className="space-y-2 border rounded-lg p-2">
                    <div className="flex gap-2 items-center">
                      <Input
                        placeholder="Exercise name"
                        className="flex-1"
                        value={ex.exercise}
                        onChange={(e) => updateExerciseName(ei, e.target.value)}
                      />
                      <div className="flex items-center gap-1 shrink-0">
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 w-8 p-0"
                          onClick={() => changeSetCount(ei, -1)}
                          disabled={ex.sets.length <= 1}
                          title="One set fewer"
                        >
                          <Minus className="h-3 w-3" />
                        </Button>
                        <span className="text-xs text-muted-foreground w-12 text-center">
                          {ex.sets.length} set{ex.sets.length !== 1 ? "s" : ""}
                        </span>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 w-8 p-0"
                          onClick={() => changeSetCount(ei, 1)}
                          disabled={ex.sets.length >= MAX_SETS_PER_EXERCISE}
                          title="One set more (copies the last set)"
                        >
                          <Plus className="h-3 w-3" />
                        </Button>
                      </div>
                      {exercises.length > 1 && (
                        <Button size="sm" variant="ghost" onClick={() => removeExercise(ei)} title="Remove exercise">
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                    {/* Last-time hint: what this exercise looked like in its most recent log */}
                    {lastSummary && (
                      <p className="text-[11px] text-muted-foreground">
                        Last time: {lastSummary.detail} · {new Date(lastTime!.date).toLocaleDateString()}
                      </p>
                    )}
                    {/* Exercise-level note */}
                    {ex.showNotes ? (
                      <div className="flex gap-2 items-center">
                        <Input
                          placeholder="Exercise note (e.g. tweak grip, felt strong)"
                          className="flex-1"
                          value={ex.notes}
                          onChange={(e) => updateExercise(ei, { notes: e.target.value })}
                        />
                        <button
                          className="text-xs text-muted-foreground hover:text-foreground shrink-0 transition-colors"
                          onClick={() => updateExercise(ei, { showNotes: false, notes: "" })}
                          title="Remove exercise note"
                        >
                          remove
                        </button>
                      </div>
                    ) : (
                      <button
                        className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                        onClick={() => updateExercise(ei, { showNotes: true })}
                      >
                        + Exercise note
                      </button>
                    )}
                    {ex.sets.map((s, si) => (
                      <div key={si} className="space-y-1">
                        <div className="flex gap-2 items-center">
                          <span className="text-xs text-muted-foreground w-10 shrink-0">Set {si + 1}</span>
                          <Input
                            type="number"
                            placeholder="kg"
                            className="flex-1"
                            value={s.weight_kg}
                            onChange={(e) => updateSetRow(ei, si, "weight_kg", e.target.value)}
                          />
                          <Input
                            type="number"
                            placeholder="reps"
                            className="flex-1"
                            value={s.reps}
                            onChange={(e) => updateSetRow(ei, si, "reps", e.target.value)}
                          />
                          <button
                            onClick={() => updateSet(ei, si, { is_warmup: !s.is_warmup })}
                            title="Warm-up set — excluded from PRs and volume stats"
                            className={`text-xs px-2 py-1.5 rounded border shrink-0 transition-colors ${
                              s.is_warmup
                                ? "bg-green-500/20 border-green-500/40 text-green-500"
                                : "border-border text-muted-foreground hover:bg-accent"
                            }`}
                          >
                            W
                          </button>
                          <button
                            onClick={() =>
                              updateSet(ei, si, s.showNotes ? { showNotes: false, notes: "" } : { showNotes: true })
                            }
                            title={s.showNotes ? "Remove set note" : "Add a note to this set"}
                            className={`text-xs px-2 py-1.5 rounded border shrink-0 transition-colors ${
                              s.showNotes
                                ? "bg-green-500/20 border-green-500/40 text-green-500"
                                : "border-border text-muted-foreground hover:bg-accent"
                            }`}
                          >
                            note
                          </button>
                        </div>
                        {s.showNotes && (
                          <div className="flex gap-2">
                            <span className="w-10 shrink-0" />
                            <Input
                              placeholder="Set note (e.g. paused reps, grinder)"
                              className="flex-1"
                              value={s.notes}
                              onChange={(e) => updateSet(ei, si, { notes: e.target.value })}
                            />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                  )
                })}
                <Button size="sm" variant="outline" onClick={addExercise}>
                  <Plus className="h-3 w-3 mr-1" /> Add exercise
                </Button>
              </div>
            )}

            <div className="flex gap-2">
              <Button size="sm" onClick={handleSubmit} disabled={isSaving || !duration}>
                {isSaving ? "Saving..." : "Save"}
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setIsAdding(false)}>Cancel</Button>
            </div>
            {saveError && <p className="text-xs text-red-500">Workout not saved: {saveError}</p>}

            {/* Save current form as a reusable template */}
            <div className="space-y-1 border-t border-border/50 pt-3">
              <div className="flex gap-2 items-center">
                <Input
                  placeholder="Template name"
                  className="flex-1"
                  value={templateName}
                  onChange={(e) => { setTemplateName(e.target.value); setTemplateSaved(false) }}
                />
                <Button
                  size="sm"
                  variant="outline"
                  onClick={saveTemplate}
                  disabled={isSavingTemplate || !templateName.trim()}
                  title="Save these inputs as a template (same name overwrites)"
                >
                  <Save className="h-3 w-3 mr-1" />
                  {isSavingTemplate ? "Saving..." : "Save as template"}
                </Button>
              </div>
              {templateError && <p className="text-xs text-red-500">Template not saved: {templateError}</p>}
              {templateSaved && <p className="text-xs text-green-500">Template saved ✓</p>}
            </div>
          </div>
        )}

        {/* 13-week activity grid (columns = weeks, rows = Mon–Sun) */}
        {logs.length > 0 && (
          <div className="space-y-2">
            <div className="text-xs font-medium text-muted-foreground uppercase">Activity</div>
            <div className="flex gap-1.5">
              <div className="flex flex-col gap-0.5 text-[9px] leading-none text-muted-foreground justify-between py-px">
                <span>Mon</span>
                <span>Thu</span>
                <span>Sun</span>
              </div>
              <div className="flex gap-0.5">
                {heatmapWeeks.map((week, wi) => (
                  <div key={wi} className="flex flex-col gap-0.5">
                    {week.map((day) => (
                      <div
                        key={day.date}
                        className={`w-2.5 h-2.5 rounded-sm ${
                          day.future
                            ? "bg-muted-foreground/5"
                            : day.count === 0
                              ? "bg-muted-foreground/15"
                              : day.count === 1
                                ? "bg-green-500/40"
                                : "bg-green-500/80"
                        } ${day.date === todayKey ? "ring-1 ring-green-400" : ""}`}
                        title={`${day.date}: ${day.count} session${day.count !== 1 ? "s" : ""}`}
                      />
                    ))}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* History — expandable entries with per-exercise details */}
        {logs.length > 0 && (
          <div className="space-y-1">
            <div className="text-xs font-medium text-muted-foreground uppercase">Recent</div>
            {(showAllLogs ? [...logs] : logs.slice(-5)).reverse().map((log) => {
              const expanded = expandedLogs.has(log.id)
              const summaries = summarizeWorkoutSets(log.sets ?? [])
              return (
                <div key={log.id} className="rounded-md -mx-1">
                  <button
                    onClick={() => toggleLogExpanded(log.id)}
                    className="w-full flex items-center gap-2 text-sm py-1 px-1 rounded-md hover:bg-muted transition-colors"
                    title={expanded ? "Hide details" : "Show details"}
                  >
                    {expanded ? (
                      <ChevronDown className="h-3 w-3 shrink-0 text-muted-foreground" />
                    ) : (
                      <ChevronRight className="h-3 w-3 shrink-0 text-muted-foreground" />
                    )}
                    <span className="text-muted-foreground">{new Date(log.logged_at).toLocaleDateString()}</span>
                    <span className="font-medium capitalize flex-1 text-left">{log.session_type}</span>
                    {summaries.length > 0 && (
                      <span className="text-xs text-muted-foreground">
                        {summaries.length} exercise{summaries.length !== 1 ? "s" : ""}
                      </span>
                    )}
                    <span className="text-xs text-muted-foreground">{log.duration_min}min</span>
                  </button>
                  {expanded && (
                    <div className="ml-6 mr-1 mb-2 space-y-1 border-l border-border/50 pl-3">
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>
                          Intensity {log.intensity}/5
                          {log.distance_km != null && ` · ${log.distance_km} km`}
                        </span>
                        <button
                          onClick={() => deleteLog(log)}
                          title="Delete this workout"
                          className="text-muted-foreground hover:text-red-500 transition-colors"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                      {summaries.map((s) => (
                        <div key={s.exercise} className="flex items-baseline justify-between gap-2 text-xs">
                          <span className="font-medium">{s.exercise}</span>
                          <span className="text-muted-foreground">{s.detail}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
            {logs.length > 5 && (
              <div className="flex justify-center pt-1">
                <button
                  onClick={() => setShowAllLogs(!showAllLogs)}
                  className="flex items-center gap-1 px-3 py-1 rounded-full border border-border text-xs text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
                >
                  {showAllLogs ? "Show less" : `${logs.length - 5} more`}
                  {showAllLogs ? <ChevronDown className="h-3 w-3 rotate-180" /> : <ChevronDown className="h-3 w-3" />}
                </button>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
