"use client"

/**
 * WHAT ONE SET CAN BE — behind its own number.
 *
 * The set number was a plain `span`, so the three facts a set carries beyond
 * its weight and reps had nowhere to live: whether it was a warm-up, how hard
 * it was, and whether it should be there at all. A warm-up logged as a working
 * set drags a lift's average down and counts towards the program's "did you
 * finish it"; before this the only fix was deleting the set and ticking it
 * again in another row, which loses the time it happened at.
 *
 * NO "FAILURE" ROW. `workout_sets.set_kind`'s CHECK constraint has no such
 * value, and a set you failed is a set with the reps you got — which is
 * already what the row records. Offering it would write a value the database
 * refuses.
 */

import { BottomSheet, SheetRow } from "@/components/BottomSheet"
import { Slider } from "@/components/ui/slider"
import { Trash2 } from "lucide-react"
import type { LiveWorkoutSet } from "../../types"

/**
 * The three a person actually chooses between. `amrap` and `backoff` are set
 * by the PROGRAM (an all-out last set, a back-off after a top single), so they
 * are not offered here — but a set already carrying one keeps it unless this
 * sheet is used to change it.
 */
const KINDS: { kind: LiveWorkoutSet["kind"]; label: string }[] = [
  { kind: "warmup", label: "Warm-up" },
  { kind: "working", label: "Working" },
  { kind: "drop", label: "Drop set" },
]

/**
 * Whole numbers 6 to 10. `rpe` is a SMALLINT with a 1–10 check, so halves
 * would need a column change; and below 6, on a set somebody bothered to log,
 * the distinction is not one anybody makes.
 */
const RPE_MIN = 6
const RPE_MAX = 10

interface Props {
  open: boolean
  onClose: () => void
  /** For the heading and the aria-label: "Set 1", "W1". */
  label: string
  kind: LiveWorkoutSet["kind"]
  /** What you said it cost, if you have said. */
  rpe: number | null
  /** Whether this set is already written down; an empty row has no server row. */
  ticked: boolean
  onKind: (kind: LiveWorkoutSet["kind"]) => void
  onRpe: (rpe: number) => void
  onDelete: () => void
}

export function SetMenu({
  open,
  onClose,
  label,
  kind,
  rpe,
  ticked,
  onKind,
  onRpe,
  onDelete,
}: Props) {
  return (
    <BottomSheet open={open} onClose={onClose} title={label} testId="set-menu">
      {KINDS.map((option) => (
        <SheetRow
          key={option.kind}
          testId={`set-kind-${option.kind}`}
          onClick={() => {
            onKind(option.kind)
            onClose()
          }}
        >
          {/* The one it already is is marked, rather than the sheet looking
              like three things you have not chosen. */}
          {option.kind === kind ? `${option.label} ✓` : option.label}
        </SheetRow>
      ))}

      <div className="flex min-h-11 items-center gap-3 px-3 py-2">
        <span className="min-w-0 shrink-0 text-sm">
          Effort
          <span className="block text-xs text-muted-foreground">
            {rpe === null ? "not said" : `RPE ${rpe}`}
          </span>
        </span>
        <Slider
          className="min-w-0 flex-1"
          aria-label={`Effort for ${label}`}
          min={RPE_MIN}
          max={RPE_MAX}
          step={1}
          value={[rpe ?? RPE_MIN]}
          onValueChange={([next]) => onRpe(next)}
        />
      </div>

      <SheetRow icon={Trash2} destructive testId="set-delete" onClick={onDelete}>
        {/* An untouched row has nothing to delete on the server — it just
            stops being drawn on this phone. Saying which is which matters:
            one is undone by a reload and the other is not. */}
        {ticked ? "Delete this set" : "Remove this row"}
      </SheetRow>
    </BottomSheet>
  )
}
