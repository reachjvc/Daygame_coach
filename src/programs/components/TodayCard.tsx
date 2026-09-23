"use client"

/**
 * What you are doing today, and the one button that starts it.
 *
 * WHAT THIS REPLACES. The session card WAS the form: every lift pre-filled,
 * every set a pair of boxes, and one save at the end. Reading what today is
 * and doing it were the same screen, so the thing you look at for three
 * seconds was built for the thing you use for an hour.
 *
 * IT NO LONGER DECIDES ANYTHING ABOUT TIME. It used to work out whether the
 * open workout was stale by subtracting instants in the browser, and name its
 * day with `toLocaleDateString` — the PHONE's zone — so a workout started
 * 23:30 Monday in Copenhagen was offered as Tuesday's. Every one of those
 * facts now arrives in `state`, decided once on the server by the same
 * function the Tracking card uses, so the two doors into training cannot say
 * different things.
 */

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Loader2, MoreVertical, Play } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { describeSets } from "../programsService"
import { TRAINING_CARD, TRAINING_CARD_BODY, CHIP_ON } from "./trainingStyles"
import { UNIT_CONFIG, WEEKDAY_SHORT } from "../config"
import { startWorkoutRequest } from "../hooks/useLiveWorkout"
import { WeekStrip } from "./WeekStrip"
import { LIVE_WORKOUT, workoutReceipt, withFrom } from "@/src/shared/trainingRoutes"
import type {
  SessionPrescription,
  TrainingCardState,
  UnitSystem,
  WeekSoFar,
} from "../types"

interface Props {
  enrollmentId: string
  programName: string
  prescription: SessionPrescription
  unit: UnitSystem
  /**
   * Today, as the server sees it. Null only when the page could not read it —
   * which is NOT the same as "nothing is happening", so the card says so
   * rather than offering a Start it cannot honour.
   */
  state: TrainingCardState | null
  /** This week on the account's calendar, for the strip inside the card. */
  week?: WeekSoFar
  /** Every day in the program, so you can log the one you actually did. */
  days?: Array<{ id: string; label: string; weekday?: number }>
  /**
   * What the program asks for on each weekday, for the strip's screen-reader
   * text. Without it a day reads as "Mon: nothing planned" on a program that
   * prescribes Mon/Wed/Fri.
   */
  weekdayLabels?: Record<number, string | undefined>
  onPickDay?: (dayId: string) => void
  onPickWeekday?: (weekday: number) => void
  /** Opens the program menu. Absent until Phase 5's sheet exists. */
  onOpenMenu?: () => void
  /** Where Back should return to from the screens this card opens. */
  from?: string
  /** Extra notices — coming back after time off, a finished program. */
  children?: React.ReactNode
}

export function TodayCard({
  enrollmentId,
  programName,
  prescription,
  unit,
  state,
  week,
  days,
  weekdayLabels,
  onPickDay,
  onPickWeekday,
  onOpenMenu,
  from,
  children,
}: Props) {
  const router = useRouter()
  const [starting, setStarting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [changingDay, setChangingDay] = useState(false)

  const unitLabel = UNIT_CONFIG[unit].label
  const go = (href: string) => router.push(from ? withFrom(href, from) : href)

  /**
   * One helper, shared with every other Start button in the app.
   *
   * This used to post `/api/workouts` itself, as did the Tracking card and
   * "start a workout now" — three copies that disagreed about what to say when
   * it failed, and none of which forgot the retry key afterwards, so a workout
   * finished on another device blocked every later start from this one.
   */
  async function start(dayId: string) {
    setStarting(true)
    setError(null)
    const outcome = await startWorkoutRequest({ enrollmentId, dayId })
    setStarting(false)
    if (outcome.kind === "started" || outcome.kind === "already-open") {
      go(LIVE_WORKOUT)
      return
    }
    setError(outcome.message)
  }

  /** The one button, chosen by what the server says today is. */
  function TheButton() {
    if (starting) {
      return (
        <Button size="lg" className="w-full" disabled>
          <Loader2 className="mr-1 size-4 animate-spin" /> Starting…
        </Button>
      )
    }

    // A workout belonging to ANOTHER program. Two at once is not a state the
    // database allows, so say which one rather than failing on the way in.
    if ((state?.kind === "live" || state?.kind === "stale") && state.enrollmentId !== enrollmentId) {
      return (
        <Button size="lg" variant="outline" className="w-full" onClick={() => go(LIVE_WORKOUT)}>
          Finish the workout you have open first
        </Button>
      )
    }

    switch (state?.kind) {
      case "live":
        return (
          <Button
            size="lg"
            className="w-full"
            data-testid="resume-workout"
            onClick={() => go(LIVE_WORKOUT)}
          >
            Resume · {state.setsTicked} {state.setsTicked === 1 ? "set" : "sets"} in
          </Button>
        )
      case "stale":
        // The weekday comes from the state, in the account's zone. Computed
        // here it read the phone's, and named the wrong day for a traveller.
        return (
          <Button
            size="lg"
            variant="outline"
            className="w-full"
            data-testid="resume-workout"
            onClick={() => go(LIVE_WORKOUT)}
          >
            Finish or discard {state.startedOnWeekday}&apos;s workout
          </Button>
        )
      case "done":
        // NOT a Start button. Offering one on a day somebody has finished
        // invites a second workout for the same session.
        return (
          <Button
            size="lg"
            variant="outline"
            className="w-full"
            data-testid="see-todays-workout"
            onClick={() => go(workoutReceipt(state.workoutId))}
          >
            See today&apos;s workout
          </Button>
        )
      case "finished":
        // Every session is logged. The notices carry the two ways on.
        return null
      case "rest":
        return (
          <Button
            size="lg"
            className="w-full"
            data-testid="start-workout"
            onClick={() => void start(state.nextDayId)}
          >
            <Play className="mr-1 size-4" /> Start {state.nextLabel} early
          </Button>
        )
      case "today":
        return (
          <Button
            size="lg"
            className="w-full"
            data-testid="start-workout"
            onClick={() => void start(state.dayId)}
          >
            <Play className="mr-1 size-4" /> Start workout
          </Button>
        )
      default:
        /**
         * The read failed, or there is no program. Either way this card
         * cannot honour a Start, and a Start that fails on the way in is
         * worse than no Start — so it says what it knows instead.
         */
        return (
          <p className="text-sm text-muted-foreground" data-testid="today-unavailable">
            Today&apos;s session could not be loaded. Reload to try again.
          </p>
        )
    }
  }

  const multiDay = Boolean(days && days.length > 1 && onPickDay)

  return (
    <Card className={TRAINING_CARD} data-testid="today-card">
      <CardContent className={`${TRAINING_CARD_BODY} space-y-3`}>
        <div className="flex items-start justify-between gap-2">
          <span className="min-w-0 truncate text-xs uppercase tracking-wide text-muted-foreground">
            {programName}
          </span>
          {onOpenMenu && (
            <Button
              variant="ghost"
              size="icon"
              className="-mr-1 -mt-1 shrink-0 hover:bg-muted/50"
              aria-label="Program options"
              data-testid="program-menu"
              onClick={onOpenMenu}
            >
              <MoreVertical className="size-4" />
            </Button>
          )}
        </div>

        {week && <WeekStrip week={week} labels={weekdayLabels} onPickDay={onPickWeekday} />}

        <div className="flex items-baseline justify-between gap-2">
          <p className="min-w-0 truncate text-lg font-semibold">
            {prescription.restDay ? "Rest day" : prescription.dayLabel}
          </p>
          {multiDay && (
            <Button
              variant="ghost"
              size="sm"
              className="shrink-0"
              aria-expanded={changingDay}
              data-testid="change-day"
              onClick={() => setChangingDay((v) => !v)}
            >
              {changingDay ? "Done" : "Change day"}
            </Button>
          )}
        </div>

        {prescription.restDay && (
          <p className="text-xs text-muted-foreground">
            Nothing scheduled today. Next up is {prescription.dayLabel}
            {prescription.scheduledWeekday
              ? ` on ${WEEKDAY_SHORT[prescription.scheduledWeekday]}`
              : ""}
            .
          </p>
        )}

        {/* WHICH DAY YOU ACTUALLY DID. The app's guess is a good default and a
            bad rule — people swap Push and Pull, or come back on a rest day.
            Behind a tap now: seven chips permanently on screen were the widest
            thing on the card and the least used. */}
        {multiDay && (changingDay || prescription.restDay) && (
          <div className="flex flex-wrap gap-1.5">
            {days!.map((d) => (
              <Button
                key={d.id}
                type="button"
                size="sm"
                variant="outline"
                onClick={() => onPickDay!(d.id)}
                aria-pressed={d.id === prescription.dayId}
                className={`min-h-11 ${d.id === prescription.dayId ? CHIP_ON : ""}`}
              >
                {d.label}
                {d.weekday != null && (
                  <span className="ml-1 opacity-60">{WEEKDAY_SHORT[d.weekday]}</span>
                )}
              </Button>
            ))}
          </div>
        )}

        {children}

        <ul className="space-y-1.5 text-sm">
          {prescription.exercises.map((ex) => (
            <li key={ex.exerciseId} className="flex items-baseline justify-between gap-3">
              <span className="min-w-0 truncate">{ex.name}</span>
              <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                {describeSets(ex, unitLabel)}
              </span>
            </li>
          ))}
          {prescription.enduranceSets?.map((set, i) => (
            <li key={i} className="text-sm text-muted-foreground">
              {set.repeat > 1 ? `${set.repeat}× ` : ""}
              {set.blocks.map((b) => b.label).join(" → ")}
            </li>
          ))}
        </ul>

        {/* What happened the last time this same day came round. Only when
            there IS a last time — "never" is not worth a line. */}
        {state?.kind === "today" && state.lastTime && (
          <p className="text-xs text-muted-foreground">
            Last time: {state.lastTime.setsDone} sets
            {state.lastTime.complete ? "" : ", not finished"}
          </p>
        )}

        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}

        <TheButton />
      </CardContent>
    </Card>
  )
}
