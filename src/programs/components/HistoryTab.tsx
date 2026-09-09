"use client"

/**
 * Everything you have done, newest first, and what was in it.
 *
 * WHAT WAS MISSING. Every set has been recorded for months and there was no
 * screen that would show them back to you. The nearest thing was a list of
 * dates with a delete button — you could remove a workout you did not recognise
 * but you could not look at it first.
 *
 * Each row says the day, the lifts, and the top working set of each, because
 * "Squat 100×5 · Bench 80×5" is what tells you which session it was. Tapping
 * one opens every set, with warm-ups marked and skips named.
 */

import { useCallback, useEffect, useState } from "react"
import { ChevronDown, ChevronRight, Loader2, Pencil, Trash2, X } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { collapseSets, isWorkingSet } from "@/src/health/healthService"
import { fromKg, toKg } from "../programsService"
import { UNIT_CONFIG } from "../config"
import type { UnitSystem } from "../types"
import type { WorkoutLogWithSets, WorkoutSetRow } from "@/src/health/types"

const DAY = { weekday: "short", day: "numeric", month: "short" } as const

/** How many workouts are on screen before you ask for more. */
const PAGE = 20

/**
 * What to call one row of the editor out loud.
 *
 * A warm-up and the first working set are BOTH "set 1" — that is how a workout
 * is numbered — so naming a row by its number alone gives two rows the same
 * name. A screen reader then reads the same thing twice and neither can be told
 * from the other, and anything looking for a field by name gets whichever came
 * first. The kind is what separates them, so the kind is in the name.
 */
const setLabel = (set: { exercise: string; setNumber: number; kind: WorkoutSetRow["set_kind"] }): string =>
  set.kind === "working"
    ? `${set.exercise} set ${set.setNumber}`
    : `${set.exercise} ${set.kind} set ${set.setNumber}`

/** A set while it is being corrected. Weight and reps are text until saved. */
interface EditableSet {
  exercise: string
  exerciseId: string | null
  weight: string
  reps: string
  setNumber: number
  kind: WorkoutSetRow["set_kind"]
  /** Carried untouched so a correction does not silently delete them. */
  side: "left" | "right" | null
  notes: string | null
  /** The per-exercise note, carried so a correction does not delete it. */
  exerciseNotes: string | null
  rpe: number | null
}

export function HistoryTab({ unit }: { unit: UnitSystem }) {
  const [logs, setLogs] = useState<WorkoutLogWithSets[] | null>(null)
  const [state, setState] = useState<"loading" | "ready" | "failed">("loading")
  const [open, setOpen] = useState<Set<string>>(new Set())
  const [error, setError] = useState<string | null>(null)
  /** The workout being corrected, and the rows as they are being edited. */
  const [editing, setEditing] = useState<string | null>(null)
  const [draft, setDraft] = useState<EditableSet[]>([])
  const [saving, setSaving] = useState(false)
  /** The workout whose sets are being read, so the button is not a dead tap. */
  const [opening, setOpening] = useState<string | null>(null)
  /**
   * HOW MUCH OF A YEAR IS ON THE SCREEN AT ONCE.
   *
   * Measured before this: 141 workouts rendered as 141 identical cards in a
   * single 17,291-pixel page. Reaching June was twenty screens of thumb, with no
   * months, no filter and nothing to aim at. Every tracker lifters use shows the
   * newest and loads more as you reach the end.
   */
  const [shown, setShown] = useState(PAGE)
  /** One lift, across the whole history — the filter these apps actually ship. */
  const [lift, setLift] = useState<string>("")

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/health/workout?days=365&include=sets")
      if (!res.ok) throw new Error(String(res.status))
      const body = (await res.json()) as unknown
      if (!Array.isArray(body)) throw new Error("unexpected shape")
      // Newest first is the order somebody looks for a workout in.
      setLogs(
        (body as WorkoutLogWithSets[])
          .slice()
          .sort((a, b) => b.logged_at.localeCompare(a.logged_at))
      )
      setState("ready")
    } catch {
      // An empty list would say "you have never trained", which a dropped
      // request is no grounds for.
      setState("failed")
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const label = UNIT_CONFIG[unit].label
  const show = (kg: number) => Math.round(fromKg(kg, unit) * 10) / 10

  async function remove(log: WorkoutLogWithSets) {
    const when = new Date(log.logged_at).toLocaleDateString(undefined, DAY)
    if (!window.confirm(`Delete the workout from ${when}? Everything in it goes with it.`)) return
    setError(null)
    try {
      const res = await fetch(`/api/health/workout?id=${log.id}`, { method: "DELETE" })
      if (!res.ok) {
        setError("That workout could not be deleted.")
        return
      }
      await load()
    } catch {
      setError("Could not reach the server, so nothing was deleted.")
    }
  }

  /**
   * Open the editor on this workout's sets, read fresh from the server.
   *
   * NOT `log.sets`. Saving replaces the workout with exactly the rows shown
   * here, so a list that arrived short does not display wrong — it DELETES.
   * That is not hypothetical: the list this screen loads is a year of training
   * at a time, it outgrew what the database returns in one response, and every
   * workout was quietly missing its later sets. Asking for one workout cannot
   * outgrow anything, and a failed request refuses to open the editor instead
   * of offering a shorter list that looks complete.
   */
  async function startEditing(log: WorkoutLogWithSets, toShown: (kg: number) => number) {
    setError(null)
    setOpening(log.id)
    let sets: WorkoutSetRow[]
    try {
      const res = await fetch(`/api/workouts/${log.id}`)
      if (!res.ok) throw new Error(String(res.status))
      const body = (await res.json()) as unknown
      if (!Array.isArray(body)) throw new Error("unexpected shape")
      sets = body as WorkoutSetRow[]
    } catch {
      setError("That workout could not be loaded, so it cannot be corrected right now.")
      return
    } finally {
      setOpening(null)
    }
    setEditing(log.id)
    setDraft(
      sets.map((set) => ({
        exercise: set.exercise,
        exerciseId: set.exercise_id,
        weight: String(toShown(set.weight_kg)),
        reps: String(set.reps),
        setNumber: set.set_number,
        kind: set.set_kind,
        side: set.side,
        notes: set.notes,
        exerciseNotes: set.exercise_notes,
        rpe: set.rpe,
      }))
    )
  }

  async function save(log: WorkoutLogWithSets) {
    setSaving(true)
    setError(null)
    try {
      const res = await fetch(`/api/workouts/${log.id}/revise`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sets: draft.map((set) => ({
            exercise: set.exercise,
            exerciseId: set.exerciseId,
            // Converted HERE, from the unit this screen actually displayed, so
            // the server never has to work out what the number meant.
            weightKg: Math.round(toKg(Number(set.weight) || 0, unit) * 100) / 100,
            reps: Number(set.reps) || 0,
            setNumber: set.setNumber,
            kind: set.kind,
            side: set.side,
            notes: set.notes,
            exerciseNotes: set.exerciseNotes,
            rpe: set.rpe,
          })),
        }),
      })
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: string } | null
        setError(body?.error ?? "That correction could not be saved.")
        return
      }
      setEditing(null)
      await load()
    } catch {
      setError("Could not reach the server, so nothing was changed.")
    } finally {
      setSaving(false)
    }
  }

  if (state === "failed") {
    return (
      <Card>
        <CardContent className="flex items-center justify-between gap-3 p-4">
          <p className="text-sm text-amber-600 dark:text-amber-400">
            Your workouts could not be loaded. This does not mean there are none.
          </p>
          <button
            type="button"
            onClick={() => void load()}
            className="shrink-0 rounded-md border border-amber-500/40 px-2.5 py-1 text-xs text-amber-600 transition-colors hover:bg-amber-500/10 dark:text-amber-400"
          >
            Try again
          </button>
        </CardContent>
      </Card>
    )
  }

  if (state === "loading" || !logs) return <p className="text-sm text-muted-foreground">Loading…</p>

  if (logs.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Nothing logged in the last year. Finish a workout and it will be here.
      </p>
    )
  }

  /** Every lift that appears anywhere in the history, for the filter. */
  const lifts = [...new Set(logs.flatMap((l) => (l.sets ?? []).map((x) => x.exercise)))].sort()
  const matching = lift ? logs.filter((l) => (l.sets ?? []).some((x) => x.exercise === lift)) : logs
  const visible = matching.slice(0, shown)

  /** Which month a row belongs to, and the month's own totals. */
  const monthKey = (at: string) => new Date(at).toLocaleDateString(undefined, { month: "long", year: "numeric" })
  const monthTotals = new Map<string, { sessions: number; volumeKg: number }>()
  for (const l of matching) {
    const k = monthKey(l.logged_at)
    const t = monthTotals.get(k) ?? { sessions: 0, volumeKg: 0 }
    t.sessions += 1
    t.volumeKg += (l.sets ?? []).filter(isWorkingSet).reduce((sum, x) => sum + x.weight_kg * x.reps, 0)
    monthTotals.set(k, t)
  }

  return (
    <div className="space-y-2" data-testid="workout-history">
      {error && <p className="text-xs text-destructive">{error}</p>}

      {lifts.length > 1 && (
        <div className="flex items-center gap-2">
          <label htmlFor="history-lift" className="text-[11px] text-muted-foreground">
            Lift
          </label>
          <select
            id="history-lift"
            data-testid="history-lift-filter"
            value={lift}
            onChange={(e) => {
              setLift(e.target.value)
              setShown(PAGE)
            }}
            className="min-h-11 flex-1 rounded-md border border-border bg-background px-2 text-[12px] sm:min-h-0 sm:py-1"
          >
            <option value="">All lifts</option>
            {lifts.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
        </div>
      )}

      {visible.map((log, i) => {
        const month = monthKey(log.logged_at)
        const newMonth = i === 0 || monthKey(visible[i - 1].logged_at) !== month
        const totals = monthTotals.get(month)
        const isOpen = open.has(log.id)
        /**
         * The top working set of each lift, in the LIFTER'S unit.
         *
         * `summarizeWorkoutSets` already builds a line like this, but it bakes
         * kilograms into the string, so a pounds lifter would read their own
         * history in the wrong numbers.
         */
        const summary = Object.values(
          (log.sets ?? [])
            .filter(isWorkingSet)
            .reduce<Record<string, { exercise: string; weightKg: number; reps: number }>>(
              (top, set) => {
                const cur = top[set.exercise]
                if (
                  !cur ||
                  set.weight_kg > cur.weightKg ||
                  (set.weight_kg === cur.weightKg && set.reps > cur.reps)
                ) {
                  top[set.exercise] = { exercise: set.exercise, weightKg: set.weight_kg, reps: set.reps }
                }
                return top
              },
              {}
            )
        )
        const working = (log.sets ?? []).filter(isWorkingSet)
        const volume = working.reduce((t, s) => t + s.weight_kg * s.reps, 0)

        return (
          <div key={log.id} className="space-y-2">
            {/* THE MONTH, once, with what it came to. A sticky header is what
                makes a long scroll navigable instead of endless — you can see
                where you are without counting cards. */}
            {newMonth && (
              <div className="sticky top-0 z-10 -mx-1 flex items-baseline justify-between gap-2 bg-background/95 px-1 py-1.5 backdrop-blur">
                <h3 className="text-[12.5px] font-semibold">{month}</h3>
                {totals && (
                  <span className="text-[11px] tabular-nums text-muted-foreground">
                    {totals.sessions} {totals.sessions === 1 ? "session" : "sessions"} ·{" "}
                    {show(totals.volumeKg).toLocaleString()} {label}
                  </span>
                )}
              </div>
            )}
          <Card>
            <CardContent className="p-3">
              <div className="flex items-start gap-2">
                <button
                  type="button"
                  onClick={() =>
                    setOpen((cur) => {
                      const next = new Set(cur)
                      if (next.has(log.id)) next.delete(log.id)
                      else next.add(log.id)
                      return next
                    })
                  }
                  aria-expanded={isOpen}
                  data-testid={`history-row-${log.id}`}
                  className="flex min-w-0 flex-1 items-start gap-2 text-left"
                >
                  {isOpen ? (
                    <ChevronDown className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                  ) : (
                    <ChevronRight className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                  )}
                  <span className="min-w-0">
                    <span className="block text-sm font-medium">
                      {new Date(log.logged_at).toLocaleDateString(undefined, DAY)}
                    </span>
                    {/* The lifts and their top set: what tells you which
                        session this was, rather than just when it happened. */}
                    <span className="block truncate text-xs text-muted-foreground">
                      {summary.length > 0
                        ? summary
                            .map((e) => `${e.exercise} ${show(e.weightKg)}×${e.reps}`)
                            .join(" · ")
                        : `${log.session_type}${log.distance_km ? ` · ${log.distance_km} km` : ""}`}
                    </span>
                    <span className="block text-[11px] text-muted-foreground/70">
                      {log.duration_min} min
                      {working.length > 0
                        ? ` · ${working.length} ${working.length === 1 ? "set" : "sets"} · ${Math.round(fromKg(volume, unit))} ${label}`
                        : ""}
                    </span>
                  </span>
                </button>
                {/* NO BIN ON THE ROW. It sat one thumb-width from the control you
                    tap to open a workout, on all 141 of them. Every tracker
                    lifters use puts the destructive action inside the workout,
                    where you can see what you are about to destroy. */}
              </div>

              {isOpen && editing === log.id ? (
                <div className="mt-2 space-y-2 border-t pt-2" data-testid={`history-edit-${log.id}`}>
                  {/* SAY WHAT CORRECTING THIS COSTS, BEFORE IT IS SAVED. The
                      weights of every session after this one were decided by
                      what this one said, so changing it changes them. */}
                  {log.enrollment_id && (
                    <p className="rounded-md border border-amber-500/40 bg-amber-500/10 px-2 py-1.5 text-[11px] text-amber-600 dark:text-amber-400">
                      This session belongs to a program. Saving a change here recalculates the
                      weights it prescribed from here on.
                    </p>
                  )}
                  {draft.map((set, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <span className="w-24 shrink-0 truncate text-xs">{set.exercise}</span>
                      <span className="w-4 shrink-0 text-xs tabular-nums text-muted-foreground">
                        {set.setNumber}
                      </span>
                      <input
                        type="number"
                        inputMode="decimal"
                        aria-label={`Weight for ${setLabel(set)}`}
                        value={set.weight}
                        onChange={(e) =>
                          setDraft((d) => d.map((x, j) => (j === i ? { ...x, weight: e.target.value } : x)))
                        }
                        className="h-9 w-16 rounded-md border border-input bg-background px-1.5 text-sm"
                      />
                      <span className="shrink-0 text-xs text-muted-foreground">{label} ×</span>
                      <input
                        type="number"
                        inputMode="numeric"
                        aria-label={`Reps for ${setLabel(set)}`}
                        value={set.reps}
                        onChange={(e) =>
                          setDraft((d) => d.map((x, j) => (j === i ? { ...x, reps: e.target.value } : x)))
                        }
                        className="h-9 w-14 rounded-md border border-input bg-background px-1.5 text-sm"
                      />
                      {set.kind !== "working" && (
                        <span className="shrink-0 text-[11px] uppercase text-muted-foreground">
                          {set.kind}
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={() => setDraft((d) => d.filter((_, j) => j !== i))}
                        aria-label={`Remove ${setLabel(set)}`}
                        className="ml-auto flex size-8 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-destructive"
                      >
                        <X className="size-3.5" />
                      </button>
                    </div>
                  ))}
                  {draft.length === 0 && (
                    <p className="text-xs text-muted-foreground">
                      Every set removed. Saving leaves the workout with nothing in it.
                    </p>
                  )}
                  <div className="flex items-center gap-2 pt-1">
                    <button
                      type="button"
                      data-testid={`history-save-${log.id}`}
                      disabled={saving}
                      onClick={() => void save(log)}
                      className="inline-flex min-h-9 items-center gap-1.5 rounded-md border border-primary/50 bg-primary/10 px-2.5 text-xs text-primary transition-colors hover:bg-primary/20 disabled:opacity-50"
                    >
                      {saving && <Loader2 className="size-3 animate-spin" />}
                      Save the correction
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditing(null)}
                      className="min-h-9 rounded-md px-2.5 text-xs text-muted-foreground transition-colors hover:bg-accent"
                    >
                      Leave it as it was
                    </button>
                  </div>
                </div>
              ) : isOpen ? (
                <div className="mt-2 space-y-2 border-t pt-2" data-testid={`history-detail-${log.id}`}>
                  {(log.sets ?? []).length === 0 ? (
                    <p className="text-xs text-muted-foreground">
                      No sets were recorded for this one.
                    </p>
                  ) : (
                    Object.entries(
                      (log.sets ?? []).reduce<Record<string, typeof log.sets>>((byLift, s) => {
                        ;(byLift[s.exercise] ??= []).push(s)
                        return byLift
                      }, {})
                    ).map(([exercise, sets]) => (
                      <div key={exercise}>
                        <p className="text-xs font-medium">{exercise}</p>
                        {/* IDENTICAL SETS, SAID ONCE. Five rows reading
                            "1  20 kg × 5" one under another is a spreadsheet:
                            five lines to say one thing, and the set you MISSED
                            looked exactly like its neighbours. Collapsed, the
                            exception is the only thing that stands out. */}
                        <ul className="mt-0.5 space-y-0.5">
                          {collapseSets(sets ?? []).map((run, ri) => (
                            <li
                              key={`${run.exercise}-${run.setNumbers[0]}-${ri}`}
                              className="flex items-baseline gap-2 text-xs text-muted-foreground"
                            >
                              <span className="w-8 shrink-0 tabular-nums">
                                {run.count > 1 ? `${run.count} ×` : run.setNumbers[0]}
                              </span>
                              <span className="tabular-nums">
                                {show(run.weightKg)} {label} × {run.reps}
                              </span>
                              {/* A warm-up is not a working set, and a screen
                                  that hides the difference makes the volume
                                  totals look wrong to whoever did them. */}
                              {run.kind !== "working" && (
                                <span className="text-[11px] uppercase tracking-wide opacity-70">
                                  {run.kind}
                                </span>
                              )}
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))
                  )}
                  {log.notes && <p className="text-xs italic text-muted-foreground">{log.notes}</p>}
                  {(log.sets ?? []).length > 0 && (
                    <button
                      type="button"
                      data-testid={`history-edit-open-${log.id}`}
                      onClick={() => void startEditing(log, show)}
                      disabled={opening === log.id}
                      className="inline-flex min-h-9 items-center gap-1.5 rounded-md border border-border px-2.5 text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:opacity-50"
                    >
                      {opening === log.id ? (
                        <Loader2 className="size-3 animate-spin" />
                      ) : (
                        <Pencil className="size-3" />
                      )}{" "}
                      Correct this
                    </button>
                  )}
                  {/* The destructive one, inside the workout you can see, rather
                      than on the row you tap to open it. */}
                  <button
                    type="button"
                    onClick={() => void remove(log)}
                    aria-label={`Delete the workout from ${new Date(log.logged_at).toLocaleDateString(undefined, DAY)}`}
                    data-testid={`history-delete-${log.id}`}
                    className="ml-2 inline-flex min-h-9 items-center gap-1.5 rounded-md px-2.5 text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-destructive"
                  >
                    <Trash2 className="size-3" /> Delete
                  </button>
                </div>
              ) : null}
            </CardContent>
          </Card>
          </div>
        )
      })}

      {/* More as you reach the end, rather than all of it at once. */}
      {matching.length > visible.length && (
        <button
          type="button"
          data-testid="history-load-more"
          onClick={() => setShown((n) => n + PAGE)}
          className="min-h-11 w-full rounded-md border border-border text-[12px] text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        >
          Show more — {matching.length - visible.length} older
        </button>
      )}
    </div>
  )
}
