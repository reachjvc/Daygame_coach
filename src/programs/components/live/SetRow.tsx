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
  const defaultReps = previous?.reps ?? prescribed.reps
  // `done.weight` and not `done.weightKg`: the box is labelled in the lifter's
  // own unit, and the kilogram number under a "lb" label is how a 135 lb bench
  // redisplayed as 61.23 and re-saved as 61.
  const [weight, setWeight] = useState(String(done?.weight ?? prescribed.weight))
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
      className={`grid grid-cols-[2rem_1fr_1fr_2.75rem] items-center gap-2 rounded-md px-1 py-1 ${
        ticked ? "bg-emerald-500/10" : ""
      }`}
    >
      <span className="text-xs tabular-nums text-muted-foreground">{label}</span>

      {bodyweight ? (
        <span className="text-xs text-muted-foreground">bodyweight</span>
      ) : (
        <label className="flex items-center gap-1">
          <Input
            type="number"
            inputMode="decimal"
            aria-label={`Weight for set ${setNumber} in ${unitLabel}`}
            className="h-11 w-full sm:h-9"
            value={weight}
            onChange={(e) => setWeight(e.target.value)}
          />
          <span className="shrink-0 text-xs text-muted-foreground">{unitLabel}</span>
        </label>
      )}

      <label className="flex items-center gap-1">
        {/* The × that makes the row a sentence. Without it the row read "20 kg
            5" and nothing on it said the 5 was reps — the only clue was the
            plan line above the whole lift. */}
        <span aria-hidden className="shrink-0 text-xs text-muted-foreground">×</span>
        <Input
          type="number"
          inputMode="numeric"
          aria-label={`${repUnit === "sec" ? "Seconds" : "Reps"} for set ${setNumber}`}
          placeholder={prescribed.amrap ? "max" : range ?? String(prescribed.reps)}
          className="h-11 w-full sm:h-9"
          value={reps}
          onChange={(e) => setReps(e.target.value)}
        />
        <span className="shrink-0 text-xs text-muted-foreground">{repUnit === "sec" ? "s" : ""}</span>
      </label>

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

      {previous && !ticked && (
        <button
          type="button"
          onClick={() => {
            // Tapping "last time" copies it in — the gesture every tracker has,
            // because matching or beating it is the decision being made.
            setWeight(String(previous.weight))
            setReps(String(previous.reps))
          }}
          className="col-span-4 -mt-0.5 text-left text-[11px] text-muted-foreground hover:text-foreground"
        >
          last time {previous.weight} {unitLabel} × {previous.reps}
        </button>
      )}
      {unsaved && (
        <span className="col-span-4 text-[11px] text-amber-500">not saved yet — waiting for signal</span>
      )}
    </div>
  )
}
