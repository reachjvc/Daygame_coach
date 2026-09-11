"use client"

/**
 * One set, during the workout.
 *
 * A FIXED GRID, not a flex row. The old session card put an input, the unit,
 * an "×", another input and a label in a wrapping flex line, so on a phone
 * "kg ×" broke onto its own line under the box it belonged to. A grid cannot
 * do that.
 *
 * The ✓ is the whole feature: tapping it writes the set. Everything else on
 * this row exists to make the number right before you do.
 */

import { useEffect, useState } from "react"
import { Check } from "lucide-react"
import { Input } from "@/components/ui/input"
import type { LiveWorkoutSet } from "../../types"

export interface SetRowProps {
  setNumber: number
  /** What the program asks for. Pre-filled, and yours to change. */
  prescribed: { weight: number; reps: number; repRangeMax?: number; amrap?: boolean }
  /** What you did the last time this lift came round, if ever. */
  previous?: { weight: number; reps: number } | null
  done?: LiveWorkoutSet
  unitLabel: string
  repUnit: "reps" | "sec"
  bodyweight?: boolean
  kind?: LiveWorkoutSet["kind"]
  /** Not yet reached the server. Shown, never hidden. */
  unsaved?: boolean
  onTick: (weight: number, reps: number) => void
  onUndo?: () => void
}

export function SetRow({
  setNumber,
  prescribed,
  previous,
  done,
  unitLabel,
  repUnit,
  bodyweight,
  kind = "working",
  unsaved,
  onTick,
  onUndo,
}: SetRowProps) {
  /**
   * REPS PRE-FILL FROM LAST TIME, NOT FROM THE FLOOR OF THE RANGE.
   *
   * A 6–8 lift was seeded as 6, and the rule for adding weight is 8 on every
   * set — so the one-tap save recorded the bottom of every range and the three
   * programs built out of ranges could never progress. What you did last time
   * is the number you are actually deciding against.
   */
  /**
   * A lift added on the day has no prescription, so it suggests nothing. `0`
   * means "nobody asked for a number here" — the box starts empty and says
   * "reps", rather than pre-filling a zero that somebody has to delete.
   */
  const defaultReps = previous?.reps ?? (prescribed.reps || "")
  // `done.weight` and not `done.weightKg`: the box is labelled in the lifter's
  // own unit, and the kilogram number under a "lb" label is how a 135 lb bench
  // redisplayed as 61.23 and re-saved as 61.
  /**
   * Empty, not zero, when nothing was prescribed. A lift added on the day
   * showed "0" in every box, which somebody has to delete before they can type
   * — and a zero that is not a fact is the same lie as any other.
   */
  const [weight, setWeight] = useState(
    String(done?.weight ?? (prescribed.weight || ""))
  )
  const [reps, setReps] = useState(String(done?.reps ?? (prescribed.amrap ? "" : defaultReps)))

  useEffect(() => {
    if (done) {
      setWeight(String(done.weight))
      setReps(String(done.reps))
    }
  }, [done])

  const ticked = Boolean(done)
  const label = kind === "warmup" ? `W${setNumber}` : String(setNumber)
  const range = prescribed.repRangeMax ? `${prescribed.reps}–${prescribed.repRangeMax}` : null

  return (
    <div
      data-testid={`set-row-${setNumber}`}
      className={`grid grid-cols-[1.75rem_4.5rem_1fr_1fr_2.75rem] items-center gap-2 rounded-md px-1 py-1 ${
        ticked ? "bg-emerald-500/10" : ""
      }`}
    >
      <span className="text-xs tabular-nums text-muted-foreground">{label}</span>

      {/*
        PREVIOUS IS A COLUMN, and it is tappable.
        It was a line UNDER the row, so it only existed when there was room for
        it and it read as an afterthought. Every tracker lifters use puts it
        second in the row — SET, PREVIOUS, WEIGHT, REPS, ✓ — because "what did I
        do last time" is the decision you are making while you stand there.
        Blank when there is no last time: blank is the honest answer and must
        never be a zero.
      */}
      {previous ? (
        <button
          type="button"
          onClick={() => {
            setWeight(String(previous.weight))
            setReps(String(previous.reps))
          }}
          aria-label={`Use last time: ${previous.weight} ${unitLabel} by ${previous.reps}`}
          className="min-w-0 truncate text-left text-[11px] tabular-nums text-muted-foreground transition-colors hover:text-foreground"
        >
          {previous.weight}×{previous.reps}
        </button>
      ) : (
        <span aria-hidden />
      )}

      {bodyweight ? (
        <span className="text-xs text-muted-foreground">bodyweight</span>
      ) : (
        <Input
          type="number"
          inputMode="decimal"
          aria-label={`Weight for set ${setNumber} in ${unitLabel}`}
          placeholder={prescribed.weight ? undefined : "weight"}
          className="h-11 w-full sm:h-9"
          value={weight}
          onChange={(e) => setWeight(e.target.value)}
        />
      )}

      <Input
        type="number"
        inputMode="numeric"
        aria-label={`${repUnit === "sec" ? "Seconds" : "Reps"} for set ${setNumber}`}
        placeholder={prescribed.amrap ? "max" : (range ?? (prescribed.reps ? String(prescribed.reps) : "reps"))}
        className="h-11 w-full sm:h-9"
        value={reps}
        onChange={(e) => setReps(e.target.value)}
      />

      <button
        type="button"
        data-testid={`tick-${setNumber}`}
        aria-label={ticked ? `Undo set ${setNumber}` : `Save set ${setNumber}`}
        aria-pressed={ticked}
        disabled={reps.trim() === ""}
        onClick={() => (ticked && onUndo ? onUndo() : onTick(Number(weight), Number(reps)))}
        className={`flex h-11 w-11 items-center justify-center rounded-md border transition-colors disabled:opacity-30 ${
          ticked
            ? "border-emerald-500/50 bg-emerald-500/20 text-emerald-500"
            : "border-border hover:bg-accent"
        }`}
      >
        <Check className="size-5" />
      </button>

      {unsaved && (
        <span className="col-span-5 text-[11px] text-amber-500">not saved yet — waiting for signal</span>
      )}
    </div>
  )
}
