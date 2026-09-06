"use client"

/**
 * Your training week, drawn — and editable.
 *
 * Nothing in the app showed this. "Upper Monday, Lower Tuesday, Upper Thursday,
 * Lower Friday" existed only as `DayTemplate.weekday` in the data, consumed by
 * the engine to pick today's session and rendered nowhere, so the one question
 * everybody asks about a program — *what am I doing this week?* — had no answer
 * on any screen.
 *
 * TWO SHAPES OF PROGRAM, and conflating them would be a lie about both:
 *
 *   - **Anchored.** Every day carries a weekday. Monday means Upper. This is
 *     what somebody writing their own week almost always wants.
 *   - **In order, whenever.** StrongLifts is A/B/A alternating three times a
 *     week and its author never said which days. Drawing Monday–Sunday for it
 *     would invent a rule its source does not have, so it is drawn as an ordered
 *     run with "next" marked instead.
 *
 * ALL OR NOTHING, because the engine says so. Per `DayTemplate.weekday`: when
 * every day carries one the next session is chosen by today's date; when none
 * do the cursor walks the list; "those are the only two states; a half-assigned
 * week is refused at the point of editing rather than resolved by guessing." So
 * a partly-assigned week is shown as unfinished, with the count still needed —
 * never as saved.
 *
 * The assignment itself is `setWeekday` from `builder.ts`, which already
 * validates the range and already takes the weekday off whichever other day held
 * it. This component is a surface over that function and owns no rule of its own.
 */

import { useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { setWeekday } from "../builder"
import { effectiveProgram } from "../customize"
import { requireProgram } from "../data/catalog"
import { isWeekdayAnchored } from "../builder"
// The one ISO-weekday conversion in this slice; the engine already uses it to
// pick today's session, so the strip must agree with it exactly.
import { isoWeekday } from "../config"
import type { ProgramEnrollment, ProgramSchedule } from "../types"

/** Monday-first, matching every other week in this app. */
const DAYS: { weekday: number; short: string }[] = [
  { weekday: 1, short: "Mon" },
  { weekday: 2, short: "Tue" },
  { weekday: 3, short: "Wed" },
  { weekday: 4, short: "Thu" },
  { weekday: 5, short: "Fri" },
  { weekday: 6, short: "Sat" },
  { weekday: 7, short: "Sun" },
]

interface Props {
  enrollment: ProgramEnrollment
  /** Days already trained, as ISO weekdays, so the week can show what is done. */
  trainedWeekdays?: number[]
  onSaved: () => void
}

export function WeekStrip({ enrollment, trainedWeekdays = [], onSaved }: Props) {
  const [saving, setSaving] = useState(false)
  const [picking, setPicking] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)

  const program = effectiveProgram(requireProgram(enrollment.program_id), enrollment.customSchedule)
  const schedule = program.schedule

  /**
   * Only a days-and-lifts program has weekdays.
   *
   * An endurance plan is a fixed sequence of weeks with no week to arrange, and
   * skill/hold routines are day lists without a `weekday` field at all. This is
   * the same narrowing `setWeekday` itself performs — matching it here means the
   * component can never call it with something it would throw on.
   */
  if (schedule.kind !== "linear_rotation" && schedule.kind !== "weekly_waved") return null

  const days = schedule.days
  const anchored = isWeekdayAnchored(schedule)
  const assignedCount = days.filter((d) => d.weekday != null).length
  const today = isoWeekday(new Date())

  async function assign(dayId: string, weekday: number | null) {
    setSaving(true)
    setError(null)
    try {
      const next: ProgramSchedule = setWeekday(schedule, dayId, weekday)
      const res = await fetch(`/api/programs/enrollments/${enrollment.id}/schedule`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customSchedule: next }),
      })
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: string } | null
        setError(body?.error ?? "Could not save the week.")
        return
      }
      setPicking(null)
      onSaved()
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setSaving(false)
    }
  }

  /**
   * An unanchored program has no calendar to draw — so this is ONE LINE, not a card.
   *
   * It used to list the day names as chips, directly above a session card whose
   * own day picker lists exactly the same names. Two rows of identical chips
   * saying nothing the other did not, taking 150px of a phone screen to say
   * "there is no week here".
   */
  if (!anchored && assignedCount === 0) {
    return (
      <Card data-testid="week-strip">
        <CardContent className="space-y-1.5 p-3">
          <p className="text-xs text-muted-foreground">
            Runs in order rather than on set days — do the next one whenever you train.
          </p>
          <button
            type="button"
            onClick={() => setPicking(picking === null ? today : null)}
            className="text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground"
          >
            {picking === null ? "Put it on set days instead" : "Never mind"}
          </button>
          {picking !== null && (
            <div className="flex flex-wrap gap-1.5 pt-1">
              {days.map((d) => (
                <button
                  key={d.id}
                  type="button"
                  disabled={saving}
                  onClick={() => assign(d.id, picking)}
                  className="rounded-md border border-border px-2 py-1 text-xs transition-colors hover:bg-accent disabled:opacity-40"
                >
                  {d.label} → {DAYS.find((x) => x.weekday === picking)?.short}
                </button>
              ))}
            </div>
          )}
          {error && <p className="text-xs text-destructive">{error}</p>}
        </CardContent>
      </Card>
    )
  }

  return (
    <Card data-testid="week-strip">
      <CardContent className="space-y-2 p-3">
        <div className="grid grid-cols-7 gap-1">
          {DAYS.map(({ weekday, short }) => {
            const day = days.find((d) => d.weekday === weekday)
            const isToday = weekday === today
            const trained = trainedWeekdays.includes(weekday)
            return (
              <button
                key={weekday}
                type="button"
                onClick={() => setPicking(picking === weekday ? null : weekday)}
                aria-label={`${short}: ${day ? day.label : "rest"}. Tap to change.`}
                data-testid={`week-day-${weekday}`}
                className={`min-h-[56px] rounded-md border px-1 py-1.5 text-center transition-colors ${
                  isToday ? "border-primary/60 bg-primary/10" : "border-border hover:bg-accent"
                } ${picking === weekday ? "ring-1 ring-primary" : ""}`}
              >
                <span className="block text-[10px] uppercase tracking-wide text-muted-foreground">{short}</span>
                <span className={`block truncate text-[11px] ${day ? "font-medium" : "text-muted-foreground"}`}>
                  {day ? day.label : "—"}
                </span>
                {trained && <span className="block text-[10px] text-emerald-600">done</span>}
              </button>
            )
          })}
        </div>

        {/* Half-assigned is a real state and has to be named: the engine falls
            back to walking the list until every day has a weekday. */}
        {assignedCount > 0 && assignedCount < days.length && (
          <p className="text-xs text-amber-600 dark:text-amber-400">
            {days.length - assignedCount} of {days.length} days still need a weekday. Until they all
            have one, sessions run in order rather than by the calendar.
          </p>
        )}

        {picking !== null && (
          <div className="space-y-1.5 border-t pt-2">
            <p className="text-xs text-muted-foreground">
              What happens on {DAYS.find((d) => d.weekday === picking)?.short}?
            </p>
            <div className="flex flex-wrap gap-1.5">
              {days.map((d) => (
                <button
                  key={d.id}
                  type="button"
                  disabled={saving}
                  onClick={() => assign(d.id, picking)}
                  className="rounded-md border border-border px-2 py-1 text-xs transition-colors hover:bg-accent disabled:opacity-40"
                >
                  {d.label}
                </button>
              ))}
              <button
                type="button"
                disabled={saving}
                onClick={() => {
                  const held = days.find((d) => d.weekday === picking)
                  if (held) void assign(held.id, null)
                  else setPicking(null)
                }}
                className="rounded-md border border-border px-2 py-1 text-xs text-muted-foreground transition-colors hover:bg-accent disabled:opacity-40"
              >
                Rest day
              </button>
            </div>
          </div>
        )}
        {error && <p className="text-xs text-destructive">{error}</p>}
      </CardContent>
    </Card>
  )
}
