"use client"

/**
 * THE TWO THINGS YOU CAN DO TO A WORKOUT THAT IS OVER — on its own page.
 *
 * Both lived in the History list: "Correct this" behind a row expander, and
 * Delete beside the row you tap to open it. Two problems with that, and the
 * second one cost data.
 *
 * A destructive control does not belong next to the one you tap a hundred and
 * forty times. And the editor needed every set of every workout in the list to
 * open one — the read that outgrew the database's response limit, so each
 * session was quietly missing its later sets, and saving the list you were
 * shown would have deleted the rest for real.
 *
 * On the receipt you are looking at the workout, and the page asks for that one
 * workout.
 */

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Loader2, Pencil, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { PROGRAMS } from "@/src/shared/trainingRoutes"
import { deleteWorkout, readWorkoutSets } from "../workoutActions"
import { WorkoutCorrection } from "./WorkoutCorrection"
import type { UnitSystem } from "../types"
import type { WorkoutSetRow } from "@/src/health/types"

export function WorkoutActions({
  workoutId,
  unit,
  onProgram,
  setCount,
  day,
}: {
  workoutId: string
  unit: UnitSystem
  /** Belongs to a program, so a change or a delete moves its weights. */
  onProgram: boolean
  /** How many sets go with it, so the question names what it costs. */
  setCount: number
  /** The day it happened, in the account's zone, for the dialog's sentence. */
  day: string
}) {
  const router = useRouter()
  const [confirming, setConfirming] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  /** The sets to correct, read fresh when the editor opens. Never from a list. */
  const [editing, setEditing] = useState<WorkoutSetRow[] | null>(null)

  /**
   * ASKED FOR ON OPENING, AND A FAILED READ REFUSES TO OPEN.
   *
   * Saving replaces this workout's sets with exactly the rows shown, so a list
   * that arrived short does not display wrong — it deletes. That is not
   * hypothetical: it is what the History version did. The call lives in
   * `workoutActions.ts`, which looks at the answer; a component doing its own
   * fetch decides for itself what to show when one fails, and the cheap answer
   * is a claim about somebody's training.
   */
  async function openEditor() {
    setBusy(true)
    setError(null)
    const answer = await readWorkoutSets(workoutId)
    setBusy(false)
    if (!answer.ok) {
      setError(answer.error)
      return
    }
    setEditing(answer.data)
  }

  async function remove() {
    setConfirming(false)
    setBusy(true)
    setError(null)
    const answer = await deleteWorkout(workoutId)
    setBusy(false)
    if (!answer.ok) {
      setError(answer.error)
      return
    }
    /**
     * Away from this page, because it is a page about a workout that no longer
     * exists — staying would leave a receipt for nothing, and a refresh would
     * 404.
     */
    router.push(`${PROGRAMS}?tab=history`)
  }

  if (editing) {
    return (
      <WorkoutCorrection
        workoutId={workoutId}
        sets={editing}
        unit={unit}
        onProgram={onProgram}
        onClose={() => setEditing(null)}
      />
    )
  }

  return (
    <section className="space-y-2 border-t border-border/60 pt-4">
      <div className="flex items-center gap-2">
        <Button size="sm" variant="outline" disabled={busy} onClick={() => void openEditor()} data-testid="workout-correct">
          {busy ? <Loader2 className="mr-1 size-3 animate-spin" /> : <Pencil className="mr-1 size-3" />}
          Correct this
        </Button>
        {/* The destructive one, and it asks in the app's own words. */}
        <Button
          size="sm"
          variant="ghost"
          className="text-destructive"
          disabled={busy}
          onClick={() => setConfirming(true)}
          data-testid="workout-delete"
        >
          <Trash2 className="mr-1 size-3" />
          Delete
        </Button>
      </div>

      {error && <p className="text-xs text-destructive">{error}</p>}

      <Dialog open={confirming} onOpenChange={(open) => !open && setConfirming(false)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete the workout from {day}?</DialogTitle>
            {/*
              SAYS WHAT GOES. "This cannot be undone" is true and useless; the
              question is how much of somebody's training it is about to take,
              and whether their program's weights move with it.
            */}
            <DialogDescription>
              {setCount > 0
                ? `Its ${setCount} ${setCount === 1 ? "set goes" : "sets go"} with it. `
                : "It has no sets in it. "}
              {onProgram
                ? "The weights this program prescribes will be recalculated without it."
                : "This cannot be undone."}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="destructive" onClick={() => void remove()} data-testid="confirm-delete-workout">
              Delete it
            </Button>
            <Button variant="outline" onClick={() => setConfirming(false)}>
              Keep it
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  )
}
