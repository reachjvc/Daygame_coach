"use client"

/**
 * TRAINING, ON THE TRACKING PAGE, IN ONE CARD — the door.
 *
 * THE COMPLAINT THIS ANSWERS, in the owner's words: on the tracking page, when
 * I want to use it, it is just not functional at all.
 *
 * It was literally not there. With no program running and no workout open the
 * card returned `null` — so the one screen meant to be the way into training
 * showed nothing about training, and there was no way in. While loading it
 * returned `null` too, so on every visit it appeared late, and then flipped
 * from Start to Resume when the third of its three requests landed.
 *
 * SEVEN STATES NOW, and there is always a card:
 *
 *   live     a workout is running      → the way back in
 *   stale    one was left open         → say so; finish it or throw it away
 *   today    a session is due          → its lifts BY NAME, and Start
 *   rest     nothing today             → what IS next, and start it early
 *   done     you already trained       → what you did; never "Start" again
 *   finished the program is complete   → pick what is next
 *   none     no program at all         → start a workout anyway
 *
 * plus `loading`, which holds the card's height rather than collapsing, and
 * `failed`, which says so instead of looking like "no program".
 *
 * WHAT IT DOES NOT DECIDE. Which state it is in, which program it is about,
 * and what "today" means are all `trainingCardState` — pure, tested, and
 * reused by the Training page so the two cannot drift. This file words things
 * and nothing else.
 */

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { AlertTriangle, Dumbbell, Loader2, Play } from "lucide-react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { enrollmentName } from "../data/catalog"
import { trainingCardState, weekdayNameIn } from "../programsService"
import { startWorkoutRequest } from "../hooks/useLiveWorkout"
import { useTrainingDoor } from "../hooks/useTrainingDoor"
import { LIVE_WORKOUT, PROGRAMS, programSession, withFrom, workoutReceipt } from "@/src/shared/trainingRoutes"
import { WEEKDAY_SHORT } from "../config"
import { toZonedDate } from "@/src/shared/dateUtils"
import type { AlsoRunning, TrainingCardState, TrainingDoorFacts } from "../types"

/**
 * Every date and time on this card is read in the ACCOUNT's zone.
 *
 * `toLocaleDateString(undefined, …)` reads the browser's, so a workout started
 * Tuesday 02:02 in Auckland showed as Monday to a phone still set to London —
 * the card naming a different day from the one the session was filed under.
 */
/** One owner, shared with the session card. See `weekdayNameIn`. */
const weekdayIn = weekdayNameIn

function clockIn(iso: string, timezone: string): string {
  const at = toZonedDate(new Date(iso), timezone)
  return `${String(at.getHours()).padStart(2, "0")}:${String(at.getMinutes()).padStart(2, "0")}`
}

const minutesSince = (iso: string): number =>
  Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 60000))

/** "Also today: Run 3 · Sprint Triathlon" — a second program is not invisible. */
function AlsoLine({ also }: { also: AlsoRunning[] }) {
  if (also.length === 0) return null
  const due = also.filter((a) => a.todayLabel)
  if (due.length > 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Also today:{" "}
        {due.map((a, i) => (
          <span key={a.enrollmentId}>
            {i > 0 && ", "}
            {/* And the OTHER program's own session, for the same reason. */}
            <Link
              href={programSession(a.enrollmentId)}
              data-testid={`also-running-${a.enrollmentId}`}
              className="hover:underline"
            >
              {a.todayLabel} · {a.name}
            </Link>
          </span>
        ))}
      </p>
    )
  }
  return (
    <p className="text-sm text-muted-foreground">
      Also running:{" "}
      {also.map((a, i) => (
        <span key={a.enrollmentId}>
          {i > 0 && ", "}
          <Link
            href={programSession(a.enrollmentId)}
            data-testid={`also-running-${a.enrollmentId}`}
            className="hover:underline"
          >
            {a.name}
          </Link>
        </span>
      ))}
    </p>
  )
}

/** The words for each state. Nothing here decides anything. */
function wordsFor(state: TrainingCardState, timezone: string): { headline: string; context: string | null; second: string | null } {
  switch (state.kind) {
    case "none":
      return {
        headline: "No program running",
        context: "Start a workout and add lifts as you go, or pick a program.",
        second: null,
      }
    case "today": {
      const what = state.endurance
        ? `${state.endurance.blocks} · about ${state.endurance.minutes} min`
        : state.lifts.join(" · ")
      const last = state.lastTime
        ? `Last time ${weekdayIn(state.lastTime.loggedAt, timezone)} · ${
            state.lastTime.complete ? `all ${state.lastTime.setsDone} sets` : `${state.lastTime.setsDone} sets`
          }`
        : null
      return { headline: state.dayLabel, context: what || null, second: last }
    }
    case "rest":
      return {
        headline: "Rest day",
        context: `Next is ${state.nextLabel}${
          state.nextWeekday != null ? ` on ${WEEKDAY_SHORT[state.nextWeekday]}` : ""
        }`,
        second: null,
      }
    case "done": {
      const parts = [
        state.dayLabel ?? "Workout",
        state.durationMin != null ? `${state.durationMin} min` : null,
        state.sets != null ? `${state.sets} sets` : null,
      ].filter(Boolean)
      return {
        headline: "Trained today",
        context: parts.join(" · "),
        second: state.next
          ? `Next is ${state.next.label}${state.next.weekday != null ? ` on ${WEEKDAY_SHORT[state.next.weekday]}` : ""}`
          : null,
      }
    }
    case "live":
      return {
        headline: `${state.dayLabel ?? "Workout"} in progress · ${minutesSince(state.startedAt)} min`,
        context:
          state.setsAsked != null
            ? `${state.setsTicked} of ${state.setsAsked} sets ticked`
            : `${state.setsTicked} sets ticked`,
        second: null,
      }
    case "stale":
      return {
        headline: `${weekdayIn(state.startedAt, timezone)}'s ${state.dayLabel ?? "workout"} is still open`,
        context: `Started ${weekdayIn(state.startedAt, timezone)} ${clockIn(state.startedAt, timezone)}${
          state.setsAsked != null
            ? ` · ${state.setsTicked} of ${state.setsAsked} sets ticked`
            : ` · ${state.setsTicked} sets ticked`
        }`,
        second: null,
      }
    case "finished":
      return {
        headline: `${state.name} is finished`,
        context: `${state.sessions} sessions · started ${weekdayIn(state.startedAt, timezone)}`,
        second: null,
      }
  }
}

export function TrainingCard({ from, className }: { from: string; className?: string }) {
  const router = useRouter()
  const load = useTrainingDoor()
  const [starting, setStarting] = useState(false)
  const [problem, setProblem] = useState<string | null>(null)

  /**
   * HOLDS ITS HEIGHT. Returning null while loading is why the card appeared
   * late and shoved the page down under somebody's thumb.
   */
  if (load.state === "loading") {
    return (
      <div
        data-testid="training-card-loading"
        className={cn("h-[92px] rounded-xl bg-muted/40 animate-pulse", className)}
      />
    )
  }

  if (load.state === "failed") {
    return (
      <Card className={cn("gap-0 py-0 border-amber-500/40", className)} data-testid="training-card">
        <div className="px-4 py-4 space-y-2">
          <LabelRow name={null} enrollmentId={null} />
          <p
            className="flex items-center gap-2 text-sm text-amber-600 dark:text-amber-400"
            data-testid="training-card-unavailable"
          >
            <AlertTriangle className="size-4 shrink-0" />
            Could not load your training.
          </p>
          {/* NEVER a Start here: it could collide with a workout that is open
              and that this card cannot currently see. */}
          <TheButton onClick={() => router.push(PROGRAMS)}>Open training</TheButton>
        </div>
      </Card>
    )
  }

  const facts: TrainingDoorFacts = load.data
  const state = trainingCardState(facts)
  const words = wordsFor(state, facts.timezone)
  const also = state.kind === "none" ? [] : state.also
  const programName =
    state.kind === "none"
      ? null
      : facts.programs.find((p) => p.enrollment.id === ("enrollmentId" in state ? state.enrollmentId : null))
          ?.enrollment
      ? enrollmentName(
          facts.programs.find((p) => p.enrollment.id === ("enrollmentId" in state ? state.enrollmentId : null))!
            .enrollment
        )
      : null

  async function start(enrollmentId: string | null, dayId: string | null) {
    setStarting(true)
    setProblem(null)
    const outcome = await startWorkoutRequest({ enrollmentId, dayId })

    // A workout that was ALREADY open is not a failure: it is the thing the
    // person was reaching for. Both land on the live screen.
    if (outcome.kind === "started" || outcome.kind === "already-open") {
      router.push(withFrom(LIVE_WORKOUT, from))
      return
    }

    setStarting(false)
    setProblem(outcome.message)
    /**
     * AND LET THE FACTS SAY WHAT HAPPENED.
     *
     * A refusal usually means the door is out of date — most often a workout
     * open that this card could not see. Re-reading means the card corrects
     * itself to Resume rather than leaving somebody with a sentence and a
     * button that will refuse again.
     *
     * Not on `unreachable`: nothing changed, and a second failing request
     * would replace an honest message with a generic one.
     */
    if (outcome.kind === "refused") load.reload()
  }

  const border =
    state.kind === "live" ? "border-primary/50" : state.kind === "stale" ? "border-amber-500/40" : ""

  return (
    <Card className={cn("gap-0 py-0", border, className)} data-testid="training-card">
      <div className="px-4 py-4 space-y-2 sm:flex sm:items-center sm:justify-between sm:gap-6 sm:space-y-0">
        <div className="min-w-0 space-y-1">
          <LabelRow
            name={programName}
            enrollmentId={state.kind !== "none" && "enrollmentId" in state ? state.enrollmentId : null}
          />
          <p className="text-lg font-semibold leading-snug">{words.headline}</p>
          {words.context && <p className="text-sm text-muted-foreground truncate">{words.context}</p>}
          {words.second && <p className="text-sm text-muted-foreground">{words.second}</p>}
          <AlsoLine also={also} />
          {problem && (
            <p className="text-sm text-destructive" role="alert">
              {problem}
            </p>
          )}
          <SecondaryLink state={state} />
        </div>

        <div className="sm:w-auto sm:min-w-[200px] sm:shrink-0">
          <Action state={state} starting={starting} onStart={start} router={router} from={from} />
        </div>
      </div>
    </Card>
  )
}

function LabelRow({ name, enrollmentId }: { name: string | null; enrollmentId: string | null }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="flex items-center gap-1.5 text-xs uppercase tracking-wide text-muted-foreground">
        <Dumbbell className="size-3.5" /> Training
      </span>
      {name && (
        /* THE PROGRAM IT NAMES, not the inventory. This went to `/programs`,
           which with two running is a list asking you to pick the one the card
           had just told you about. */
        <Link
          href={enrollmentId ? programSession(enrollmentId) : PROGRAMS}
          data-testid="training-card-program"
          className="truncate text-xs text-muted-foreground hover:underline"
        >
          {name} ›
        </Link>
      )}
    </div>
  )
}

/** Exactly one on the card, and always a real button. */
function TheButton({
  children,
  onClick,
  disabled,
  testId,
}: {
  children: React.ReactNode
  onClick: () => void
  disabled?: boolean
  testId?: string
}) {
  return (
    <Button
      variant="outline"
      onClick={onClick}
      disabled={disabled}
      data-testid={testId}
      className="w-full border-primary/50 bg-primary/10 text-primary hover:bg-primary/15 hover:text-primary"
    >
      {children}
    </Button>
  )
}

function Action({
  state,
  starting,
  onStart,
  router,
  from,
}: {
  state: TrainingCardState
  starting: boolean
  onStart: (enrollmentId: string | null, dayId: string | null) => void
  router: ReturnType<typeof useRouter>
  from: string
}) {
  const live = () => router.push(withFrom(LIVE_WORKOUT, from))
  const spinner = starting ? <Loader2 className="size-4 animate-spin" /> : <Play className="size-4" />

  switch (state.kind) {
    case "none":
      return (
        <TheButton onClick={() => onStart(null, null)} disabled={starting} testId="training-card-start">
          {spinner} Start a workout
        </TheButton>
      )
    case "today":
      return (
        <TheButton
          onClick={() => onStart(state.enrollmentId, state.dayId)}
          disabled={starting}
          testId="training-card-start"
        >
          {spinner} Start workout
        </TheButton>
      )
    case "rest":
      return (
        <TheButton
          onClick={() => onStart(state.enrollmentId, state.nextDayId)}
          disabled={starting}
          testId="training-card-start"
        >
          {spinner} Start {state.nextLabel} early
        </TheButton>
      )
    case "done":
      return (
        <TheButton onClick={() => router.push(workoutReceipt(state.workoutId))} testId="training-card-see">
          See today&apos;s workout
        </TheButton>
      )
    case "live":
      return (
        <TheButton onClick={live} testId="training-card-resume">
          Resume
        </TheButton>
      )
    case "stale":
      return (
        <TheButton onClick={live} testId="training-card-resume">
          Finish or discard it
        </TheButton>
      )
    case "finished":
      return (
        <TheButton onClick={() => router.push(PROGRAMS)} testId="training-card-next">
          Pick what&apos;s next
        </TheButton>
      )
  }
}

/**
 * A LINK, never a second button.
 *
 * The browser test counts `<button>` elements on the card to prove there is
 * exactly one thing to press. A second control has to be a link, and these all
 * genuinely are: they go somewhere rather than doing something.
 */
function SecondaryLink({ state }: { state: TrainingCardState }) {
  const label =
    state.kind === "none"
      ? "Pick a program ›"
      : state.kind === "done"
        ? "Start another workout ›"
        : state.kind === "finished"
          ? "Start a workout ›"
          : null
  if (!label) return null
  return (
    <Link
      href={PROGRAMS}
      className="inline-flex min-h-11 items-center text-sm text-primary hover:underline"
    >
      {label}
    </Link>
  )
}
