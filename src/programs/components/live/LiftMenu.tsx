"use client"

/**
 * EVERYTHING YOU CAN DO TO ONE LIFT, MID-WORKOUT.
 *
 * There was one 26px chip reading "Skip this one" and a read-only line saying
 * how long to rest. So the two things that actually happen in a gym — the
 * rack is taken and you do something else, or this lift needs longer today —
 * had no answer at all, and the one control there was was smaller than a
 * fingertip.
 *
 * The rest edit writes to the WORKOUT, not to component state, so it survives
 * the phone locking; see `withRest`. The `-15 / +15` taps move a local draft
 * and write once when the sheet closes, so two quick taps read 3:30 and not
 * 3:15 — the draft is the truth until the write lands.
 */

import { useState } from "react"
import { BottomSheet, SheetRow } from "@/components/BottomSheet"
import { Button } from "@/components/ui/button"
import { ArrowLeftRight, Minus, Plus, SkipForward, Trash2 } from "lucide-react"
import { AddLift } from "./AddLift"
import { addedLiftId, restTargetFor, withRest, MIN_REST_SEC, MAX_REST_SEC } from "../../programsService"
import type { PrescribedExercise, WorkoutAdjustments } from "../../types"

interface Props {
  open: boolean
  onClose: () => void
  exercise: PrescribedExercise
  adjustments: WorkoutAdjustments
  /** Names already on this screen, so a swap cannot offer one twice. */
  alreadyHere: string[]
  /** Whether this lift was added on the day rather than prescribed. */
  wasAdded: boolean
  skipped: boolean
  onAdjust: (patch: Partial<WorkoutAdjustments>) => void
}

const clock = (seconds: number) =>
  `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`

export function LiftMenu({
  open,
  onClose,
  exercise,
  adjustments,
  alreadyHere,
  wasAdded,
  skipped,
  onAdjust,
}: Props) {
  const [swapping, setSwapping] = useState(false)
  const target = restTargetFor(exercise, adjustments)
  /**
   * The rest being typed, before it is written.
   *
   * Null means "nothing typed yet, show what is saved". Two quick taps on +15
   * must read 3:30, so the draft is what the buttons move and what the label
   * shows; the write happens once, when the sheet closes.
   */
  const [draft, setDraft] = useState<number | null>(null)
  const shown = draft ?? target.seconds

  function close() {
    if (draft !== null && draft !== target.seconds) {
      onAdjust({ rest: withRest(adjustments, exercise.exerciseId, draft) })
    }
    setDraft(null)
    setSwapping(false)
    onClose()
  }

  function nudge(delta: number) {
    setDraft((d) => {
      const next = (d ?? target.seconds) + delta
      return Math.max(MIN_REST_SEC, Math.min(MAX_REST_SEC, next))
    })
  }

  return (
    <BottomSheet open={open} onClose={close} title={exercise.name} testId="lift-menu">
      {swapping ? (
        <div className="px-1 pb-2">
          {/* The same search as adding a lift: one list of what this app knows
              a lift is, rather than a second one that drifts from it. */}
          <AddLift
            alreadyHere={alreadyHere}
            onAdd={(entry) => {
              onAdjust({
                swapped: {
                  ...(adjustments.swapped ?? {}),
                  [exercise.exerciseId]: { name: entry.name, libraryId: entry.libraryId },
                },
              })
              setSwapping(false)
              close()
            }}
          />
        </div>
      ) : (
        <>
          <SheetRow icon={ArrowLeftRight} onClick={() => setSwapping(true)} testId="lift-swap">
            Swap this lift
          </SheetRow>

          {/* REST, EDITABLE. It was a read-only line. The rack being busy and
              a lift needing longer today are the two things that actually
              happen, and neither had an answer. */}
          <div className="flex min-h-11 items-center justify-between gap-3 px-3 py-2">
            <span className="min-w-0 text-sm">
              Rest after this lift
              <span className="block text-xs text-muted-foreground">
                {target.edited && draft === null
                  ? "your own"
                  : target.ours
                    ? "our suggestion"
                    : "the program's"}
              </span>
            </span>
            <span className="flex shrink-0 items-center gap-1">
              <Button
                variant="outline"
                size="icon"
                className="size-11"
                aria-label="Fifteen seconds less rest"
                data-testid="rest-less"
                onClick={() => nudge(-15)}
              >
                <Minus className="size-4" />
              </Button>
              <span className="w-12 text-center text-sm tabular-nums" data-testid="rest-target">
                {clock(shown)}
              </span>
              <Button
                variant="outline"
                size="icon"
                className="size-11"
                aria-label="Fifteen seconds more rest"
                data-testid="rest-more"
                onClick={() => nudge(15)}
              >
                <Plus className="size-4" />
              </Button>
            </span>
          </div>

          <SheetRow
            icon={SkipForward}
            testId="lift-skip"
            onClick={() => {
              const now = adjustments.skipped ?? []
              onAdjust({
                skipped: skipped
                  ? now.filter((id) => id !== exercise.exerciseId)
                  : [...now, exercise.exerciseId],
              })
              close()
            }}
          >
            {skipped ? "I did do this one" : "Skip this lift"}
          </SheetRow>

          {/* Only a lift YOU added can be removed. A prescribed one is
              skipped, which the program records; removing it would lose the
              fact that it was asked for. */}
          {wasAdded && (
            <SheetRow
              icon={Trash2}
              destructive
              testId="lift-remove"
              onClick={() => {
                onAdjust({
                  added: (adjustments.added ?? []).filter(
                    (a) => a.exerciseId !== exercise.exerciseId
                  ),
                })
                close()
              }}
            >
              Remove this lift
            </SheetRow>
          )}
        </>
      )}
    </BottomSheet>
  )
}

/** Exported for the screen, which needs the same id a swap target gets. */
export { addedLiftId }
