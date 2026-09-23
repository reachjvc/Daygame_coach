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
 *
 * ── WHAT CHANGED, 2026-09-23: ONLY THE CHROME ────────────────────────────────
 *
 * The staged-save logic is untouched, because it is the part that protects
 * somebody's progress and it works. What changed is that this panel was drawn
 * in a language no other screen in the app speaks: its own black-and-zinc box,
 * 12.5-px inputs that make iPhone Safari zoom the page and never zoom back, and
 * an EMERALD "Save changes" — green, which in this app means one thing and one
 * thing only: a set you have ticked, a rest that is over, a program finished.
 * A save button wearing it takes that meaning away from the ticks that need it.
 *
 * Now: a `Card` from the app's own kit, `Input` (16 px on phones by default),
 * and "Save changes" is the plain `Button` — this view's one loud control.
 * Cancel is an outline beside it, and a refusal is `text-destructive` rather
 * than a hand-rolled rose panel.
 */

import { useState } from "react"
import { Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { TRAINING_CARD, TRAINING_CARD_BODY } from "./trainingStyles"
import { ProgramEditor } from "./ProgramEditor"
import {
  scheduleDaysOrNone,
  editableSchedule,
  isCustomizable,
  isModified,
  missingWorkingWeights,
  scheduleProblems,
} from "../customize"
import { saveRunningSchedule } from "../hooks/useEnrollment"
import { hasWeight, numericWeights } from "../builder"
import { requireProgram } from "../data/catalog"
import type { ProgramEnrollment, ProgramSchedule } from "../types"

export function EditActiveProgram({
  enrollment,
  onSaved,
  onCancel,
}: {
  enrollment: ProgramEnrollment
  onSaved: () => void
  /** Leaves the editor. The screen behind decides where that goes. */
  onCancel: () => void
}) {
  const program = requireProgram(enrollment.program_id)
  const [schedule, setSchedule] = useState<ProgramSchedule | null>(null)
  const [weights, setWeights] = useState<Record<string, string>>({})
  const [state, setState] = useState<"idle" | "saving" | "done">("idle")
  const [error, setError] = useState<string | null>(null)
  const [started, setStarted] = useState(false)
  if (!started) {
    // During the first render, so the editor has its schedule on the first
    // paint rather than flashing empty and filling in.
    begin()
    setStarted(true)
  }

  if (!isCustomizable(program)) return null

  /**
   * ALREADY EDITING. This component used to render its own second "Change
   * this program" button and open on the click — so reaching the editor took
   * two taps on two buttons with the same words, one in the menu and one on
   * the page it opened.
   */
  function begin() {
    setSchedule(editableSchedule(program, enrollment.customSchedule))
    setWeights({})
    setState("idle")
    setError(null)
  }

  const modified = schedule ? isModified(program, schedule) : false
  const missing = schedule ? missingWorkingWeights(program, schedule, enrollment.level, enrollment.unitSystem) : []
  // Only the lifts that are NEW to this enrollment need a number; anything the
  // enrollment already has state for keeps the weight it has ratcheted to.
  const needing = missing.filter((m) => !enrollment.exerciseState[m.exerciseId])

  /**
   * EVERY LIFT'S CURRENT WEIGHT, EDITABLE.
   *
   * There was no way to lower one. This screen asked for a weight on lifts
   * being ADDED and on nothing else, the schedule save skipped any lift that
   * already had state, and removing a lift and putting it back deliberately
   * restores what it had. So somebody who attached a program without typing
   * their numbers — which the goals planner lets you do, the boxes are optional
   * — met a 60 kg squat at session one and could not move it.
   */
  type CurrentWeight = { exerciseId: string; name: string; weight: number; isMax: boolean }
  const current: CurrentWeight[] = schedule
    ? // OR NONE, for the same reason as ProgressionView: an endurance
      // enrollment has no lifts to list, and asking for its days threw.
      scheduleDaysOrNone(schedule).flatMap((d) =>
        (d.exercises as { id: string; name: string }[]).flatMap((ex): CurrentWeight[] => {
          const state = enrollment.exerciseState[ex.id]
          if (!state) return []
          if (state.workingWeight != null)
            return [{ exerciseId: ex.id, name: ex.name, weight: state.workingWeight, isMax: false }]
          if (state.trainingMax != null)
            return [{ exerciseId: ex.id, name: ex.name, weight: state.trainingMax, isMax: true }]
          return []
        })
      )
    : []
  // One row per lift even when it appears on two days.
  const currentUnique = [...new Map(current.map((c) => [c.exerciseId, c])).values()]
  const problems = schedule ? scheduleProblems(schedule) : []
  const ready = problems.length === 0 && needing.every((m) => hasWeight(weights, m.exerciseId))

  async function save(next: ProgramSchedule | null) {
    setState("saving")
    setError(null)
    // One save path, shared with the Templates step — which had none at all,
    // and accepted edits on screen that it never sent.
    const res = await saveRunningSchedule(enrollment.id, next, numericWeights(weights))
    if (!res.ok) {
      setError(res.error)
      setState("idle")
      return
    }
    setState("done")
    onSaved()
  }

  /**
   * NO CLOSED STATE. There was one, holding a second "Change this program"
   * button — the same words as the menu row that mounts this — so the editor
   * took two taps on two identical labels. Mounting it IS opening it now, and
   * `begin()` runs on mount.
   */

  return (
    <Card className={TRAINING_CARD}>
      <CardContent className={`${TRAINING_CARD_BODY} space-y-3`}>
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

      {currentUnique.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-sm font-semibold">Your weights</p>
          <p className="text-sm text-muted-foreground">
            Change any that are wrong. Leave the rest alone and they carry on exactly where they
            have got to.
          </p>
          <div className="grid gap-2 sm:grid-cols-2">
            {currentUnique.map((lift) => (
              <div key={lift.exerciseId} className="flex items-center gap-2">
                <Label
                  htmlFor={`weight-${lift.exerciseId}`}
                  className="min-w-0 flex-1 truncate text-sm text-muted-foreground"
                >
                  {lift.name}
                  {lift.isMax && <span className="text-muted-foreground"> (training max)</span>}
                </Label>
                <Input
                  id={`weight-${lift.exerciseId}`}
                  className="w-24"
                  type="number"
                  inputMode="decimal"
                  value={weights[lift.exerciseId] ?? ""}
                  placeholder={String(lift.weight)}
                  onChange={(e) => setWeights((w) => ({ ...w, [lift.exerciseId]: e.target.value }))}
                  aria-label={`${lift.isMax ? "Training max" : "Working weight"} for ${lift.name} in ${enrollment.unitSystem}`}
                />
              </div>
            ))}
          </div>
        </div>
      )}

      <p className="text-sm text-muted-foreground">
        Changing a weight here sets it from your next session on, and clears any misses against that
        lift. Lifts you add need a starting number.
      </p>

      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}

      <div className="flex flex-wrap items-center gap-2">
        {/* THE ONE LOUD BUTTON on this view, and not green: green is a set you
            ticked and a program you finished, nothing else. */}
        <Button
          onClick={() => save(modified ? schedule : null)}
          disabled={!ready || state === "saving"}
          data-testid="save-program-changes"
        >
          {state === "saving" && <Loader2 className="mr-1.5 size-4 animate-spin" />}
          Save changes
        </Button>
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        {/* AMBER, NOT RED. A program that cannot be saved yet because a lift
            needs a number is not something anybody did wrong. */}
        {problems.length > 0 ? (
          <span className="text-sm text-amber-600 dark:text-amber-400">{problems[0]}</span>
        ) : (
          !ready && (
            <span className="text-sm text-amber-600 dark:text-amber-400">
              Give the lifts you added a starting weight first.
            </span>
          )
        )}
      </div>
      </CardContent>
    </Card>
  )
}
