"use client"

/**
 * CORRECTING A WORKOUT THAT IS ALREADY WRITTEN DOWN.
 *
 * You forgot to tick the fifth set, or you typed 150 for a 105 kg squat, or a
 * warm-up went in as a working set. Without this the only options are to leave
 * the record wrong or delete the whole session — and a program reads those sets
 * to decide next week's weights, so a wrong one is not just a wrong number on a
 * screen.
 *
 * IT LIVES ON THE WORKOUT'S OWN PAGE. It used to be an expander inside the
 * History list, which meant the list had to carry every set of every workout to
 * open one — the read that outgrew the database's response limit and left each
 * session quietly missing its later sets. A page about one workout asks for one
 * workout.
 *
 * SAVING REPLACES THE SET LIST WITH EXACTLY WHAT IS SHOWN. That is why the rows
 * are read fresh from the server when the editor opens and why a failed read
 * refuses to open it: a list that arrived short does not display wrong, it
 * DELETES.
 */

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Loader2, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { typedNumber } from "@/src/shared/typedNumber"
import { formatLoad, fromKg, toKg } from "../programsService"
import { saveCorrection } from "../workoutActions"
import { UNIT_CONFIG } from "../config"
import type { EditableSet, UnitSystem } from "../types"
import type { WorkoutSetRow } from "@/src/health/types"

/**
 * What to call one row out loud.
 *
 * A warm-up and the first working set are BOTH "set 1" — that is how a workout
 * is numbered — so naming a row by its number alone gives two rows one name. A
 * screen reader then reads the same thing twice and neither can be told from
 * the other. The kind is what separates them, so the kind is in the name.
 */
const setLabel = (set: { exercise: string; setNumber: number; kind: WorkoutSetRow["set_kind"] }): string =>
  set.kind === "working"
    ? `${set.exercise} set ${set.setNumber}`
    : `${set.exercise} ${set.kind} set ${set.setNumber}`

export function WorkoutCorrection({
  workoutId,
  sets,
  unit,
  onProgram,
  onClose,
}: {
  workoutId: string
  /** Read fresh from the server by the caller, never from a list. */
  sets: WorkoutSetRow[]
  unit: UnitSystem
  /** This session belongs to a program, so a change moves its weights. */
  onProgram: boolean
  onClose: () => void
}) {
  const router = useRouter()
  const label = UNIT_CONFIG[unit].label
  const [draft, setDraft] = useState<EditableSet[]>(() =>
    sets.map((set) => ({
      exercise: set.exercise,
      exerciseId: set.exercise_id,
      /**
       * Shown in the unit the account trains in, which is also the unit the
       * number typed back is read as — and converted by the ONE converter.
       * I wrote the division out by hand here first, which is the exact habit
       * `src/shared/weight.ts` exists to end: two constants for one pound that
       * disagreed in the sixth decimal.
       */
      weight: formatLoad(fromKg(set.weight_kg, unit)),
      reps: String(set.reps),
      setNumber: set.set_number,
      kind: set.set_kind,
      side: set.side,
      notes: set.notes,
      exerciseNotes: set.exercise_notes,
      rpe: set.rpe,
    }))
  )
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  /**
   * A BLANK BOX IS NOT A ZERO, and this editor used to make it one.
   *
   * `Number("") || 0` turned an emptied weight into 0 kg — indistinguishable
   * ever after from a pull-up done with nothing added, and on a program session
   * it is the number the engine reads to decide next week. So a blank box
   * refuses the save and says which row it is, the same rule the live screen's
   * ✓ follows.
   */
  const blank = draft.find(
    (set) => typedNumber(set.weight) === null || typedNumber(set.reps) === null
  )

  async function save() {
    if (blank) return
    setSaving(true)
    setError(null)
    const answer = await saveCorrection(
      workoutId,
      draft.map((set) => ({
        exercise: set.exercise,
        exerciseId: set.exerciseId,
        // Converted HERE, from the unit this screen displayed, so the server
        // never has to work out what the number meant.
        weightKg: Math.round(toKg(typedNumber(set.weight) ?? 0, unit) * 100) / 100,
        reps: typedNumber(set.reps) ?? 0,
        setNumber: set.setNumber,
        kind: set.kind,
        side: set.side,
        notes: set.notes,
        exerciseNotes: set.exerciseNotes,
        rpe: set.rpe,
      }))
    )
    setSaving(false)
    if (!answer.ok) {
      setError(answer.error)
      return
    }
    onClose()
    // The receipt is server-rendered, so the page re-reads what was just
    // written rather than this component guessing at the new totals.
    router.refresh()
  }

  return (
    <section className="space-y-2 border-t border-border/60 pt-4" data-testid="workout-correction">
      <h3 className="text-sm font-medium">Correcting this workout</h3>

      {onProgram && (
        <p className="rounded-md border border-amber-500/40 bg-amber-500/10 px-2.5 py-2 text-xs text-amber-600 dark:text-amber-400">
          This session belongs to a program. Saving a change here recalculates the weights it
          prescribed from here on.
        </p>
      )}

      {draft.map((set, i) => (
        <div key={`${set.exercise}-${set.kind}-${set.setNumber}-${i}`} className="flex items-center gap-2">
          <span className="w-24 shrink-0 truncate text-xs">{set.exercise}</span>
          <span className="w-4 shrink-0 text-xs tabular-nums text-muted-foreground">
            {set.setNumber}
          </span>
          <Input
            type="number"
            inputMode="decimal"
            aria-label={`Weight for ${setLabel(set)}`}
            value={set.weight}
            onChange={(e) =>
              setDraft((d) => d.map((x, j) => (j === i ? { ...x, weight: e.target.value } : x)))
            }
            className="h-11 w-16 px-1.5"
          />
          <span className="shrink-0 text-xs text-muted-foreground">{label} ×</span>
          <Input
            type="number"
            inputMode="numeric"
            aria-label={`Reps for ${setLabel(set)}`}
            value={set.reps}
            onChange={(e) =>
              setDraft((d) => d.map((x, j) => (j === i ? { ...x, reps: e.target.value } : x)))
            }
            className="h-11 w-14 px-1.5"
          />
          {set.kind !== "working" && (
            <span className="shrink-0 text-xs uppercase text-muted-foreground">{set.kind}</span>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="ml-auto shrink-0 text-muted-foreground"
            onClick={() => setDraft((d) => d.filter((_, j) => j !== i))}
            aria-label={`Remove ${setLabel(set)}`}
          >
            <X className="size-4" />
          </Button>
        </div>
      ))}

      {draft.length === 0 && (
        <p className="text-xs text-muted-foreground">
          Every set removed. Saving leaves the workout with nothing in it.
        </p>
      )}

      {/* Named, so it is a row you can go and fill in rather than a disabled
          button with no reason beside it. */}
      {blank && (
        <p className="text-xs text-amber-600 dark:text-amber-400" data-testid="correction-blank">
          {setLabel(blank)} has an empty box. A blank is not a zero, so nothing is saved until it
          has a number.
        </p>
      )}
      {error && <p className="text-xs text-destructive">{error}</p>}

      <div className="flex items-center gap-2 pt-1">
        <Button
          size="sm"
          disabled={saving || blank !== undefined}
          onClick={() => void save()}
          data-testid="correction-save"
        >
          {saving && <Loader2 className="mr-1 size-3 animate-spin" />}
          Save the correction
        </Button>
        <Button size="sm" variant="ghost" onClick={onClose} data-testid="correction-cancel">
          Leave it as it is
        </Button>
      </div>
    </section>
  )
}
