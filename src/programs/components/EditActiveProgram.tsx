"use client"

/**
 * Changing a program that is already running.
 *
 * The editor on the Templates tab shapes a program BEFORE it starts. This is
 * the same editor afterwards, which is when most of the real edits happen — you
 * find out in week three that the gym has no leg press, or that four days a
 * week was one too many.
 *
 * THE THING THAT MUST NOT HAPPEN IS LOSING PROGRESS. Every lift that survives
 * the edit keeps its working weight, its training max and its fail count; the
 * repo only seeds state that is missing. So this asks for a starting weight for
 * lifts being ADDED, and for nothing else — a squat you have ratcheted to 105 kg
 * is still at 105 kg after you rename the day it lives on.
 *
 * Edits are staged locally and saved on a button rather than applied as you
 * type. Mid-edit a schedule is routinely invalid — a day with nothing in it yet,
 * a lift added but not yet given a weight — and saving each keystroke would
 * either reject half of them or persist a program that cannot prescribe.
 */

import { useState } from "react"
import { Check, Loader2 } from "lucide-react"
import { ProgramEditor } from "./ProgramEditor"
import {
  editableSchedule,
  isCustomizable,
  isModified,
  missingWorkingWeights,
  scheduleProblems,
} from "../customize"
import { hasWeight, numericWeights } from "../builder"
import { requireProgram } from "../data/catalog"
import type { ProgramEnrollment, ProgramSchedule } from "../types"

export function EditActiveProgram({
  enrollment,
  onSaved,
}: {
  enrollment: ProgramEnrollment
  onSaved: () => void
}) {
  const program = requireProgram(enrollment.program_id)
  const [open, setOpen] = useState(false)
  const [schedule, setSchedule] = useState<ProgramSchedule | null>(null)
  const [weights, setWeights] = useState<Record<string, string>>({})
  const [state, setState] = useState<"idle" | "saving" | "done">("idle")
  const [error, setError] = useState<string | null>(null)

  if (!isCustomizable(program)) return null

  function begin() {
    setSchedule(editableSchedule(program, enrollment.customSchedule))
    setWeights({})
    setState("idle")
    setError(null)
    setOpen(true)
  }

  const modified = schedule ? isModified(program, schedule) : false
  const missing = schedule ? missingWorkingWeights(program, schedule, enrollment.level, enrollment.unitSystem) : []
  // Only the lifts that are NEW to this enrollment need a number; anything the
  // enrollment already has state for keeps the weight it has ratcheted to.
  const needing = missing.filter((m) => !enrollment.exerciseState[m.exerciseId])
  const problems = schedule ? scheduleProblems(schedule) : []
  const ready = problems.length === 0 && needing.every((m) => hasWeight(weights, m.exerciseId))

  async function save(next: ProgramSchedule | null) {
    setState("saving")
    setError(null)
    try {
      const res = await fetch(`/api/programs/enrollments/${enrollment.id}/schedule`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customSchedule: next,
          workingWeights: numericWeights(weights),
        }),
      })
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: string } | null
        setError(body?.error ?? "Could not save your changes.")
        setState("idle")
        return
      }
      setState("done")
      setOpen(false)
      onSaved()
    } catch {
      setError("Could not reach the server. Nothing was changed.")
      setState("idle")
    }
  }

  if (!open) {
    return (
      <div className="flex items-center gap-2">
        <button
          onClick={begin}
          className="text-[12.5px] px-2.5 py-1 rounded-md border border-white/15 text-zinc-300 hover:bg-white/5 transition-colors"
        >
          Change this program
        </button>
        {enrollment.customSchedule && (
          <span className="inline-flex items-center gap-1 text-[11px] text-emerald-300/80">
            <Check className="size-3" /> running your version
          </span>
        )}
        {state === "done" && <span className="text-[11px] text-emerald-300/80">Saved.</span>}
      </div>
    )
  }

  return (
    <div className="rounded-lg border border-white/10 bg-black/20 p-3 space-y-2.5">
      {schedule && (
        <ProgramEditor
          program={program}
          schedule={schedule}
          level={enrollment.level}
          unit={enrollment.unitSystem}
          onChange={setSchedule}
          workingWeights={weights}
          onWorkingWeight={(id, raw) => setWeights((w) => ({ ...w, [id]: raw }))}
          onReset={() => {
            setSchedule(editableSchedule(program, null))
            setWeights({})
          }}
        />
      )}

      <p className="text-[11px] text-zinc-500 leading-relaxed">
        Your weights carry over. Anything you keep stays exactly where it has got to — only lifts you
        add need a starting number.
      </p>

      {error && (
        <p className="text-[11px] text-rose-300/90 bg-rose-500/[0.07] border border-rose-400/20 rounded-md px-2.5 py-1.5">
          {error}
        </p>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={() => save(modified ? schedule : null)}
          disabled={!ready || state === "saving"}
          className="flex items-center gap-1.5 text-[12.5px] px-3 py-1.5 rounded-md border border-emerald-400/40 bg-emerald-500/10 text-emerald-200 hover:bg-emerald-500/20 disabled:opacity-30 transition-colors"
        >
          {state === "saving" && <Loader2 className="size-3 animate-spin" />}
          Save changes
        </button>
        <button
          onClick={() => setOpen(false)}
          className="text-[12.5px] px-2.5 py-1.5 rounded-md border border-white/10 text-zinc-400 hover:bg-white/5 transition-colors"
        >
          Cancel
        </button>
        {problems.length > 0 ? (
          <span className="text-[11px] text-amber-300/80">{problems[0]}</span>
        ) : (
          !ready && (
            <span className="text-[11px] text-amber-300/80">
              Give the lifts you added a starting weight first.
            </span>
          )
        )}
      </div>
    </div>
  )
}
