"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dumbbell, Minus, Plus, Trash2, X } from "lucide-react"
import {
  summarizeWorkoutSets,
  findLastExerciseSets,
  detectPersonalRecords,
  workoutsOnDate,
} from "../healthService"
import type {
  WorkoutLogWithSets,
  SessionType,
  WorkoutIntensity,
  WorkoutSetInsert,
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
  const [saveError, setSaveError] = useState<string | null>(null)
  const [newPRs, setNewPRs] = useState<PersonalRecord[]>([])

  /**
   * TWO LIES FROM ONE DROPPED REQUEST.
   *
   * This swallowed the failure and left `logs` at `[]`, which produced both of
   * these at once:
   *
   *   1. Somebody with 200 logged workouts was shown "No workouts logged yet"
   *      and the brand-new-account button.
   *   2. Worse — the personal-record check compares the workout you just saved
   *      against everything logged before it, and against an empty history
   *      EVERY lift is a record. So the next save congratulated them on six
   *      personal bests at weights they had been lifting for months.
   *
   * `historyFailed` separates "you have none" from "we could not find out", and
   * the record check is suppressed while it is true — a record announced from a
   * history the app could not read is not a record, it is a guess.
   */
  const [historyFailed, setHistoryFailed] = useState(false)

  const fetchLogs = useCallback(async () => {
    try {
      const res = await fetch("/api/health/workout?days=90&include=sets")
      if (!res.ok) throw new Error("Failed to fetch")
      const body = (await res.json()) as unknown
      if (!Array.isArray(body)) throw new Error("unexpected shape")
      setLogs(body as WorkoutLogWithSets[])
      setHistoryFailed(false)
    } catch (e) {
      console.error("Error fetching workout logs:", e)
      setHistoryFailed(true)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => { fetchLogs() }, [fetchLogs])

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
          set_kind: s.is_warmup ? ("warmup" as const) : ("working" as const),
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
      // Never claim a record against a history that could not be read.
      if (!historyFailed) {
        const priorSets = logs.flatMap((l) => (l.sets ?? []).map((s) => ({ ...s, logged_at: l.logged_at })))
        setNewPRs(detectPersonalRecords(priorSets, created.sets ?? []))
      }
      setDuration("")
      setIntensity(3)
      setDistanceKm("")
      setWorkoutDate("")
      setWorkoutTime("")
      setExercises([emptyExercise()])
      setIsAdding(false)
      await fetchLogs()
    } catch (e) {
      console.error("Error saving workout:", e)
      setSaveError(e instanceof Error ? e.message : "Failed to save workout")
    } finally {
      setIsSaving(false)
    }
  }



  const now = new Date()
  const todayKey = now.toLocaleDateString("sv-SE") // YYYY-MM-DD in local time
  /**
   * What is already on the day this entry will land on — see `workoutsOnDate`.
   * A session logged from a training program arrives in this same table, so
   * without this the same workout gets written up twice and counts twice.
   */
  const alreadyOnDay = workoutsOnDate(logs, workoutDate || todayKey)

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
          <span className="flex items-center gap-2">
            <Dumbbell className="h-5 w-5" /> Log a past workout
          </span>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => { setNewPRs([]); setIsAdding(!isAdding) }}
            title="Write up a workout you have already done"
          >
            <Plus className="h-4 w-4" />
          </Button>
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* THE STATS, THE GRID AND THE RECENT LIST ALL LEFT.
            They now live on the Progress and History tabs, which is where
            somebody goes to look at them. Keeping a second copy here meant two
            screens computing the same figures from different windows of data —
            this one only ever loaded 90 days, so its week streak could never
            exceed 13 and its "personal best" was judged against a quarter of a
            year. One place owns each number now. */}
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

        {historyFailed && !isAdding && (
          <div className="text-center py-4" data-testid="workout-history-failed">
            <p className="mb-2 text-sm text-amber-600 dark:text-amber-400">
              Your workout history could not be loaded, so this may be incomplete.
            </p>
            <Button size="sm" variant="outline" onClick={() => void fetchLogs()}>
              Try again
            </Button>
          </div>
        )}

        {logs.length === 0 && !historyFailed && !isAdding && (
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
            {alreadyOnDay.length > 0 && (
              <p
                role="status"
                data-testid="duplicate-day-warning"
                className="rounded-md border border-amber-500/30 bg-amber-500/10 px-2.5 py-2 text-xs text-amber-600 dark:text-amber-400"
              >
                {alreadyOnDay.length === 1 ? "A workout is" : `${alreadyOnDay.length} workouts are`}{" "}
                already logged {workoutDate ? `on ${workoutDate}` : "today"}. Saving this adds
                another one — a session you logged from a training program is already counted here.
              </p>
            )}
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

          </div>
        )}

      </CardContent>
    </Card>
  )
}
