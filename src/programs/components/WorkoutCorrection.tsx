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
      id: set.id ?? null,
      completedAt: set.completed_at ?? null,
      prescribedIndex: set.prescribed_index ?? null,
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

  /**
   * TWO ROWS IN ONE SLOT, NAMED BEFORE THE SAVE.
   *
   * `uq_workout_sets_slot` is (lift, kind, set number, side), so re-tagging a
   * set into a slot another already holds lands on Postgres's complaint about
   * a unique index and a 500 — which is neither actionable nor true about what
   * the person did. `updateSet` refuses the same collision on the live screen
   * with a sentence naming both sets; this is that rule, on this screen.
   */
  const slotOf = (set: EditableSet) =>
    `${set.exerciseId ?? set.exercise}|${set.kind}|${set.setNumber}|${set.side ?? ""}`
  const collision = draft.find(
    (set, i) => draft.findIndex((other) => slotOf(other) === slotOf(set)) !== i
  )

  async function save() {
    if (blank || collision) return
    setSaving(true)
    setError(null)
    const answer = await saveCorrection(
      workoutId,
      draft.map((set) => ({
        id: set.id,
        completedAt: set.completedAt,
        prescribedIndex: set.prescribedIndex,
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
      })),
      /**
       * WHAT THIS EDITOR LOADED, so the server can refuse a save built on a
       * read another device has since overtaken. Taken from the `sets` prop,
       * not from `draft` — `draft` is missing exactly the rows just deleted,
       * which is what made the first version of this guard reject every
       * deletion.
       */
      sets.map((set) => set.id).filter((id): id is string => Boolean(id))
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
          {/*
            THE KIND IS EDITABLE, because the header promises it: "a warm-up
            went in as a working set". It was a static tag, so the only way to
            correct one was to delete the set and tick it again on the live
            screen — which loses the time it happened at, and is impossible
            once the workout is finished. A working set that is really a
            warm-up drags the lift's average down and counts towards whether
            the program's session was completed.
          */}
          <select
            aria-label={`Kind of ${setLabel(set)}`}
            value={set.kind}
            onChange={(e) =>
              setDraft((d) =>
                d.map((x, j) =>
                  j === i ? { ...x, kind: e.target.value as EditableSet["kind"] } : x
                )
              )
            }
            /**
             * 16px, NOT 12. Anything under 16 makes iOS Safari zoom the whole
             * page when the box is tapped — `tests/unit/architecture.test.ts`
             * holds the line and caught this one before it shipped. A select
             * counts: it is a typed box as far as Safari is concerned.
             */
            className="h-11 shrink-0 rounded-md border border-border bg-background px-1 text-base"
          >
            <option value="working">working</option>
            <option value="warmup">warm-up</option>
            <option value="amrap">all-out</option>
            <option value="backoff">back-off</option>
            <option value="drop">drop</option>
          </select>
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

      {/*
        THE SET YOU FORGOT TO TICK. The header's first example — "you forgot to
        tick the fifth set" — had no control at all: the editor could change a
        number and delete a row, and that was the whole of it. One button per
        lift already in the workout, because a lift that is not there is a
        different job (the live screen's Add a lift) and this screen is about
        correcting what was recorded.
      */}
      {[...new Map(draft.map((set) => [set.exerciseId ?? set.exercise, set])).values()].map(
        (lift) => (
          <Button
            key={lift.exerciseId ?? lift.exercise}
            variant="outline"
            size="sm"
            className="min-h-11"
            data-testid={`correction-add-set-${lift.exerciseId ?? lift.exercise}`}
            onClick={() =>
              setDraft((d) => {
                const same = d.filter(
                  (x) => (x.exerciseId ?? x.exercise) === (lift.exerciseId ?? lift.exercise)
                )
                const working = same.filter((x) => x.kind === "working")
                /**
                 * THE NEXT FREE SLOT, not a count.
                 *
                 * `uq_workout_sets_slot` is (lift, kind, number), and counting
                 * gives the wrong number the moment anything has been removed
                 * or re-tagged: re-tag set 1 as a warm-up and the count of
                 * working sets is 1, so the new set is numbered 2 — which set
                 * 2 already is. The save then dies on a unique index and the
                 * screen gets a 500. Found by doing exactly that.
                 */
                const nextNumber =
                  working.reduce((highest, x) => Math.max(highest, x.setNumber), 0) + 1
                return [
                  ...d,
                  {
                    id: null,
                    // A set nobody ticked has no instant, and inventing one
                    // would put it in the wrong place in the order.
                    completedAt: null,
                    prescribedIndex: null,
                    exercise: lift.exercise,
                    exerciseId: lift.exerciseId,
                    // Seeded from the last working set of the same lift, which
                    // is what a forgotten set almost always was.
                    weight: working[working.length - 1]?.weight ?? "",
                    reps: working[working.length - 1]?.reps ?? "",
                    setNumber: nextNumber,
                    kind: "working" as const,
                    side: null,
                    notes: null,
                    exerciseNotes: null,
                    rpe: null,
                  },
                ]
              })
            }
          >
            + Add a {lift.exercise} set
          </Button>
        )
      )}

      {draft.length === 0 && (
        <p className="text-xs text-muted-foreground">
          Every set removed. Saving leaves the workout with nothing in it.
        </p>
      )}

      {/* Named, so it is a row you can go and fill in rather than a disabled
          button with no reason beside it. */}
      {collision && (
        <p className="text-xs text-amber-600 dark:text-amber-400" data-testid="correction-collision">
          Two rows are both {setLabel(collision)}. Renumber or re-tag one of them before saving.
        </p>
      )}

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
          disabled={saving || blank !== undefined || collision !== undefined}
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
