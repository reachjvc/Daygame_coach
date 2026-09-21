"use client"

/**
 * EVERYTHING YOU DO TO A PROGRAM, IN ONE PLACE.
 *
 * Four buttons sat in a wrapping row under today's session — Change, Skip,
 * Reset, End — on the screen you open to train, not to administer. End was a
 * destructive action one thumb-width from the others, and all four asked with
 * `confirm()`: the browser's own box, unstyled, ignorable by some mobile
 * browsers, and impossible to say anything useful in.
 *
 * They are behind the ⋮ now, and each dangerous one asks in the app's own
 * dialog with a sentence that says what will actually happen. Those sentences
 * come from the service, not from here — the reset box spent months promising
 * a weight reset the code never performed, because the words and the write
 * were two different files.
 *
 * A REFUSAL STAYS ON THIS SHEET. "End" used to navigate away whatever came
 * back, so a program the server had kept running looked ended until the next
 * screen showed it prescribing again.
 */

import { useState } from "react"
import { useRouter } from "next/navigation"
import { BottomSheet, SheetRow } from "@/components/BottomSheet"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { CalendarDays, ListOrdered, Pencil, RotateCcw, SkipForward, Trash2 } from "lucide-react"
import { endProgram, resetProgram, skipSession } from "../programActions"
import { resetConfirmText, skipConfirmText, skipRefusal } from "../programsService"
import { effectiveProgram } from "../customize"
import { getProgram, enrollmentName } from "../data/catalog"
import { PROGRAMS } from "@/src/shared/trainingRoutes"
import type { ProgramEnrollment } from "../types"

/** Which confirmation is open, if any. */
type Asking = "skip" | "reset" | "end" | null

interface Props {
  open: boolean
  onClose: () => void
  enrollment: ProgramEnrollment
  /** Re-read the program after something changed it. */
  onChanged: () => void
  /** Opens the day picker for a weekday, when the program has weekdays. */
  onChangeDays?: () => void
  /** Opens the editor. Absent while a program has nothing to edit. */
  onEdit?: () => void
}

export function ProgramSheet({
  open,
  onClose,
  enrollment,
  onChanged,
  onChangeDays,
  onEdit,
}: Props) {
  const router = useRouter()
  const [asking, setAsking] = useState<Asking>(null)
  const [busy, setBusy] = useState(false)
  const [failed, setFailed] = useState<string | null>(null)

  const program = getProgram(enrollment.program_id)
  const schedule = program
    ? effectiveProgram(program, enrollment.customSchedule).schedule
    : null

  /**
   * Skip is offered only where it does something.
   *
   * On a week pinned to weekdays the cursor it advances is not what decides
   * today's session, so the button changed nothing and wrote a phantom skip
   * every time it was pressed. `skipRefusal` is the same rule the server
   * refuses by, so the screen and the server agree about why.
   */
  const cannotSkip = schedule ? skipRefusal(schedule) : "This program has no sessions to skip."
  const hasWeekdays =
    schedule?.kind === "linear_rotation" || schedule?.kind === "weekly_waved"

  async function run(what: Asking) {
    if (!what) return
    setBusy(true)
    setFailed(null)
    const res =
      what === "end"
        ? await endProgram(enrollment.id)
        : what === "reset"
          ? await resetProgram(enrollment.id)
          : await skipSession(enrollment.id)
    setBusy(false)
    setAsking(null)

    if (!res.ok) {
      // The server's own sentence — Phase 0's "Finish or throw away the open
      // workout first" arrives here verbatim, which is more useful than
      // anything this file could invent.
      setFailed(res.error)
      return
    }

    if (what === "end") {
      // Ended programs are not on this screen any more, so staying here would
      // show a card for something that stopped existing.
      router.replace(`${PROGRAMS}?view=programs`)
      return
    }
    onChanged()
    onClose()
  }

  const name = enrollmentName(enrollment)
  const copy: Record<Exclude<Asking, null>, { title: string; body: string; confirm: string }> = {
    skip: {
      title: "Skip this session?",
      body: schedule ? skipConfirmText(schedule, enrollment.cursor.dayIndex) : "",
      confirm: "Skip it",
    },
    reset: {
      // From RESET_EFFECT, the same constant the repo writes. Change the flag
      // and this sentence, the write and the replay all change together.
      title: "Start again from week 1?",
      body: resetConfirmText(),
      confirm: "Start again",
    },
    end: {
      title: `End ${name}?`,
      body: "It stops prescribing sessions. Everything you logged is kept.",
      confirm: "End it",
    },
  }

  return (
    <>
      <BottomSheet open={open} onClose={onClose} title={name} testId="program-sheet">
        {onEdit && (
          <SheetRow icon={Pencil} onClick={onEdit} testId="sheet-edit">
            Change this program
          </SheetRow>
        )}
        {hasWeekdays && onChangeDays && (
          <SheetRow icon={CalendarDays} onClick={onChangeDays} testId="sheet-days">
            {/* Two different jobs, and the words say which: a program with no
                weekdays is being GIVEN a calendar, not having one edited. */}
            {schedule && schedule.days.some((d) => d.weekday != null)
              ? "Change the days"
              : "Put it on set days"}
          </SheetRow>
        )}
        {!cannotSkip && (
          <SheetRow icon={SkipForward} onClick={() => setAsking("skip")} testId="sheet-skip">
            Skip this session
          </SheetRow>
        )}
        <SheetRow icon={RotateCcw} onClick={() => setAsking("reset")} testId="sheet-reset">
          Reset to start
        </SheetRow>
        <SheetRow icon={ListOrdered} href={`${PROGRAMS}?view=programs`} testId="sheet-all">
          All programs
        </SheetRow>
        <SheetRow icon={Trash2} destructive onClick={() => setAsking("end")} testId="sheet-end">
          End program
        </SheetRow>

        {failed && (
          <p role="alert" className="px-3 pb-1 text-sm text-destructive" data-testid="sheet-failed">
            {failed}
          </p>
        )}
      </BottomSheet>

      <Dialog open={asking !== null} onOpenChange={(v) => !v && setAsking(null)}>
        <DialogContent>
          {asking && (
            <>
              <DialogHeader>
                <DialogTitle>{copy[asking].title}</DialogTitle>
                <DialogDescription>{copy[asking].body}</DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button
                  variant={asking === "end" ? "destructive" : "default"}
                  disabled={busy}
                  data-testid="sheet-confirm"
                  onClick={() => void run(asking)}
                >
                  {copy[asking].confirm}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
