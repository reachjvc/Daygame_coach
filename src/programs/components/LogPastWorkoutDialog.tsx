"use client"

/**
 * WRITING UP A SESSION YOU ALREADY DID.
 *
 * There used to be two ways to do this, and neither was the live screen. One
 * was "I did all of this — save it", which saved every prescribed row at its
 * prescribed numbers in a single tap. The other was a form with its own
 * kg-only weight boxes, its own 90-day "New PR" rule and its own save path, so
 * a pounds lifter's 135 was stored as 135 kilograms and a session could be
 * saved twice on a slow connection.
 *
 * Both are gone. This opens THE SAME live screen at the time you choose, so
 * there is one way to record a workout and one set of rules about what it may
 * contain — the screen just knows it is describing the past.
 *
 * It goes through `startWorkoutRequest` rather than posting itself. That is
 * enforced by an architecture test, and it is the reason a lost reply cannot
 * open two workouts: the helper keeps the start key exactly as long as nobody
 * knows whether the first request landed.
 */

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Loader2 } from "lucide-react"
import { startWorkoutRequest } from "../hooks/useLiveWorkout"
import { effectiveProgram, scheduleDaysOrNone } from "../customize"
import { getProgram } from "../data/catalog"
import { wallClockNow, wallClockToInstant } from "@/src/shared/dateUtils"
import { LIVE_WORKOUT } from "@/src/shared/trainingRoutes"
import { CHIP_ON } from "./trainingStyles"
import type { ProgramEnrollment } from "../types"

/** One thing you can say you did. */
interface Choice {
  key: string
  label: string
  enrollmentId: string | null
  dayId: string | null
}

/**
 * The sessions worth offering, and the programs that cannot offer one.
 *
 * A running plan has weeks, not days — `scheduleDays` THROWS on it, which
 * would have taken the whole dialog down for anybody on Couch to 5K. It gets
 * one "Next run" chip with no day, and the server picks the session. A program
 * the catalogue no longer knows is named but not offered, because guessing a
 * day for it would attach the workout to the wrong session.
 */
export function choicesFor(enrollments: readonly ProgramEnrollment[]): {
  choices: Choice[]
  unknown: string[]
} {
  const choices: Choice[] = []
  const unknown: string[] = []
  const many = enrollments.length > 1

  for (const e of enrollments) {
    const program = getProgram(e.program_id)
    if (!program) {
      unknown.push(e.program_id)
      continue
    }
    const effective = effectiveProgram(program, e.customSchedule)
    const days = scheduleDaysOrNone(effective.schedule)
    if (days.length === 0) {
      choices.push({
        key: `${e.id}:next`,
        label: many ? `Next run · ${program.name}` : "Next run",
        enrollmentId: e.id,
        dayId: null,
      })
      continue
    }
    for (const day of days) {
      choices.push({
        key: `${e.id}:${day.id}`,
        label: many ? `${day.label} · ${program.name}` : day.label,
        enrollmentId: e.id,
        dayId: day.id,
      })
    }
  }

  choices.push({ key: "empty", label: "Empty workout", enrollmentId: null, dayId: null })
  return { choices, unknown }
}

interface Props {
  enrollments: readonly ProgramEnrollment[]
  /** A workout already open. Only one may be, so this blocks the dialog. */
  liveOpen: boolean
  timezone: string
}

export function LogPastWorkoutDialog({ enrollments, liveOpen, timezone }: Props) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [when, setWhen] = useState("")
  const [chosen, setChosen] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const { choices, unknown } = choicesFor(enrollments)
  const choice = choices.find((c) => c.key === chosen) ?? null

  async function openIt() {
    if (!choice || !when) return
    setBusy(true)
    setError(null)
    const outcome = await startWorkoutRequest({
      enrollmentId: choice.enrollmentId,
      dayId: choice.dayId,
      // Read in the ACCOUNT's zone. A `datetime-local` has no zone of its own,
      // and reading it in the browser's put a session on the wrong DAY for
      // anybody not sitting where their account says they are.
      startedAt: wallClockToInstant(when, timezone),
    })
    if (outcome.kind === "started" || outcome.kind === "already-open") {
      router.push(LIVE_WORKOUT)
      return
    }
    // `refused` and `unreachable` each carry their own sentence, and they mean
    // different things: one is the server saying no, the other is nobody
    // knowing. Neither is worth replacing with a house style.
    setError(outcome.message)
    setBusy(false)
  }

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        className="min-h-11"
        data-testid="log-past-workout"
        onClick={() => setOpen(true)}
      >
        Log a past workout
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Log a past workout</DialogTitle>
            <DialogDescription>
              This opens the normal workout screen, dated when you say. You tick the sets you
              actually did.
            </DialogDescription>
          </DialogHeader>

          {liveOpen ? (
            <p className="text-sm" data-testid="past-blocked-by-live">
              Finish the workout you have open first.{" "}
              <a href={LIVE_WORKOUT} className="underline underline-offset-2">
                Open it
              </a>
              .
            </p>
          ) : (
            <>
              <div className="flex flex-col gap-1">
                <label htmlFor="past-when" className="text-xs text-muted-foreground">
                  When
                </label>
                <Input
                  id="past-when"
                  type="datetime-local"
                  className="h-11"
                  value={when}
                  // Now, in the account's zone — a session cannot have happened
                  // later than this.
                  max={wallClockNow(timezone)}
                  onChange={(e) => setWhen(e.target.value)}
                  aria-label="When the workout was"
                />
              </div>

              <div className="flex flex-col gap-1">
                <span className="text-xs text-muted-foreground">Which session</span>
                <div className="flex flex-wrap gap-1.5">
                  {choices.map((c) => (
                    <Button
                      key={c.key}
                      type="button"
                      variant="outline"
                      size="sm"
                      aria-pressed={chosen === c.key}
                      onClick={() => setChosen(c.key)}
                      className={`min-h-11 ${chosen === c.key ? CHIP_ON : ""}`}
                    >
                      {c.label}
                    </Button>
                  ))}
                </div>
                {unknown.length > 0 && (
                  <p className="text-xs text-muted-foreground">
                    Not offered: {unknown.join(", ")} — this program is no longer in the app.
                  </p>
                )}
              </div>

              {error && (
                <p className="text-xs text-destructive" role="alert">
                  {error}
                </p>
              )}

              <DialogFooter>
                <Button
                  onClick={() => void openIt()}
                  disabled={busy || !when || !choice}
                  data-testid="open-past-workout"
                >
                  {busy && <Loader2 className="mr-1 size-4 animate-spin" />}
                  Open it
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
