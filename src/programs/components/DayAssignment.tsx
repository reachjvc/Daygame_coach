"use client"

/**
 * PUTTING A SESSION ON A WEEKDAY.
 *
 * Lifted out of `WeekStrip`, which had become two things: a report of the week
 * (seven dots, read-only, and the thing anybody actually looks at) and an
 * editor for the schedule (a fetch, a saving flag, an error line and two
 * different chip rows). The report is on screen every time you open Training;
 * the editor is used about once per program.
 *
 * Splitting them is what lets the strip be presentational — no fetch, no
 * clock, nothing to get wrong — and it puts the one write in a file whose
 * whole subject is that write.
 */

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { requireProgram } from "../data/catalog"
import { effectiveProgram } from "../customize"
import { setWeekday } from "../builder"
import type { ProgramEnrollment, ProgramSchedule } from "../types"

const SHORT = ["", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]

interface Props {
  enrollment: ProgramEnrollment
  /** The weekday being assigned, 1 = Monday. */
  weekday: number
  onSaved: () => void
  onCancel: () => void
}

export function DayAssignment({ enrollment, weekday, onSaved, onCancel }: Props) {
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const program = effectiveProgram(requireProgram(enrollment.program_id), enrollment.customSchedule)
  const schedule = program.schedule
  // The same narrowing `setWeekday` performs: an endurance plan has weeks, not
  // weekdays, and calling it with one would throw.
  if (schedule.kind !== "linear_rotation" && schedule.kind !== "weekly_waved") return null
  const days = schedule.days

  async function assign(dayId: string, to: number | null) {
    setSaving(true)
    setError(null)
    try {
      const next: ProgramSchedule = setWeekday(schedule as ProgramSchedule, dayId, to)
      const res = await fetch(`/api/programs/enrollments/${enrollment.id}/schedule`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customSchedule: next }),
      })
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: string } | null
        // The server's own sentence, not a house one: it knows why.
        setError(body?.error ?? "Could not save the week.")
        return
      }
      onSaved()
    } catch {
      setError("Could not reach the server, so the week was not changed.")
    } finally {
      setSaving(false)
    }
  }

  const held = days.find((d) => d.weekday === weekday)

  return (
    <div className="space-y-1.5 border-t pt-2" data-testid="day-assignment">
      <p className="text-xs text-muted-foreground">What happens on {SHORT[weekday]}?</p>
      <div className="flex flex-wrap gap-1.5">
        {days.map((d) => (
          <Button
            key={d.id}
            type="button"
            size="sm"
            variant="outline"
            disabled={saving}
            aria-pressed={d.weekday === weekday}
            onClick={() => void assign(d.id, weekday)}
            className="min-h-11"
          >
            {d.label}
          </Button>
        ))}
        <Button
          type="button"
          size="sm"
          variant="ghost"
          disabled={saving}
          onClick={() => (held ? void assign(held.id, null) : onCancel())}
          className="min-h-11"
        >
          {held ? "Rest day" : "Never mind"}
        </Button>
      </div>
      {error && (
        <p role="alert" className="text-xs text-destructive">
          {error}
        </p>
      )}
    </div>
  )
}
