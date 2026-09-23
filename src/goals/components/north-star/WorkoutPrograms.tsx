"use client"

/**
 * WHICH TRAINING PROGRAM YOU ARE ON — and nothing else.
 *
 * WHAT WAS HERE. A 628-line second copy of the training feature, inside a step
 * that measured 12,661 px: the discipline chips, a grid of thirteen programs, a
 * second "Level" row under the one BuildBoard already has, a kg/lb switch, the
 * whole program editor, a "build your own" mode, and a "RUNNING NOW" band. Six
 * of its own disciplines were hard-coded, so Half Ironman — which the catalogue
 * has — could not be reached from here at all.
 *
 * None of that was wrong because it was ugly. It was wrong because it was a
 * SECOND PLACE to do everything: two catalogues to keep in step, two editors,
 * two ways to start a program, and the one on this page was the one nobody
 * maintained. Picking, changing, ending and building now happen on the Training
 * page, which is the door this plan is built around, and this step keeps the
 * one fact it actually needs: which program you are on.
 *
 * IT HOLDS NO HOOK AND NO `fetch(`. Everything comes down as props from the
 * flow, which owns `useActiveEnrollments` once — so the card is drawable in
 * every one of its states without a network, and the Systems step's card and
 * this one can never disagree about what is running.
 *
 * NO ORANGE. The violet step button is this page's primary and there is exactly
 * one of it; a card that shouts as loudly as the thing you are meant to press
 * next is a card competing with the page it sits on.
 */

import Link from "next/link"
import { AlertTriangle } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
/**
 * THROUGH THE ONE DOOR. `src/goals` reaches `src/programs` only through
 * `forLifeMastery.ts`, and `tests/unit/architecture.test.ts` fails on a direct
 * import — every direct one was a place the plan could quietly grow a second
 * copy of the program, which is the fault this whole phase is unpicking.
 */
import {
  ProgramRow,
  describeProgramWeek,
  enrollmentName,
  type ProgramEnrollment,
} from "@/src/programs/forLifeMastery"
import { DONE } from "@/src/programs/forLifeMastery"
import { withReturn } from "@/src/shared/returnTo"
import { LIFE_MASTERY } from "@/src/shared/lifeMasteryRoutes"
import type { NsRoutineProgram } from "@/src/goals/types"

/** Where "back" goes from anything this card links to. */
const HERE = `${LIFE_MASTERY}?step=templates`

const PROGRAMS = "/programs?view=programs"
const BUILD = "/programs?view=build"

export interface TrainingProgramCardProps {
  /** The shared read, whole — `loading` and `error` are states this draws. */
  read: {
    enrollments: ProgramEnrollment[]
    loading: boolean
    error: string | null
  }
  /** The ACCOUNT's zone. Every date on this card is in the lifter's calendar. */
  timezone: string
  /** A program adopted from another device on this load. Said once. */
  adopted?: NsRoutineProgram | null
  /** A reference dropped because the program is no longer running. */
  ended?: NsRoutineProgram | null
  onRetry: () => void
  /** Fixed in tests; `describeProgramWeek` reads no clock of its own. */
  now?: Date
}

export function TrainingProgramCard({
  read,
  timezone,
  adopted = null,
  ended = null,
  onRetry,
  now,
}: TrainingProgramCardProps) {
  const heading = (
    <p className="text-xs uppercase tracking-wide text-muted-foreground">Training program</p>
  )

  if (read.loading) {
    return (
      <div className="space-y-2">
        {heading}
        <div
          data-testid="lm-training-program-loading"
          className="h-[92px] animate-pulse rounded-xl bg-muted/40"
          aria-hidden
        />
      </div>
    )
  }

  /**
   * A RETIRED CATALOGUE ID IS A FAILED READ, NOT A CRASH.
   *
   * `describeProgramWeek` throws `Unknown program: <id>` rather than falling
   * back to a week that belongs to no program. Caught here, named here, and the
   * rest of the card still draws — an id this build no longer has must not take
   * the whole Life Mastery page down with it.
   */
  let described: ReturnType<typeof describeProgramWeek> | null = null
  let retired: string | null = null
  const one = read.enrollments.length === 1 ? read.enrollments[0] : null
  if (one && !read.error) {
    try {
      described = describeProgramWeek(one, { now: now ?? new Date(), timeZone: timezone })
    } catch {
      retired = one.program_id
    }
  }

  const change = (id: string) => withReturn(`${PROGRAMS}&program=${id}`, HERE)

  /**
   * THE LINKS STAY WHEN THE READ FAILS.
   *
   * A card that could not check must not say "No program yet" — that is a
   * statement about somebody's training made on no evidence — and it must not
   * become a dead end either. Pick and Change are the way out of both.
   */
  if (read.error !== null || retired !== null) {
    return (
      <div className="space-y-2">
        {heading}
        <Card className="gap-0 py-0" data-testid="lm-training-program">
          <div className="space-y-2 px-4 py-4" data-testid="lm-training-unavailable">
            <p className="flex items-start gap-1.5 text-sm text-amber-600 dark:text-amber-400">
              <AlertTriangle className="mt-0.5 size-4 shrink-0" />
              {retired
                ? `${retired} is no longer in the catalogue, so its week cannot be read.`
                : "Could not check which program you are on."}
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <Button variant="outline" size="sm" onClick={onRetry}>
                Try again
              </Button>
              <Button variant="outline" size="sm" asChild>
                <Link href={withReturn(PROGRAMS, HERE)}>Pick a program</Link>
              </Button>
            </div>
          </div>
        </Card>
      </div>
    )
  }

  if (read.enrollments.length === 0) {
    return (
      <div className="space-y-2">
        {heading}
        <Card className="gap-0 py-0" data-testid="lm-training-program">
          <div className="space-y-2 px-4 py-4">
            {ended ? (
              <>
                <p className="text-base font-semibold">That program is finished</p>
                {/* Green is "done" everywhere else in this app, and a program
                    you finished is the one thing on this card that IS done. */}
                {/* Green is "finished" and this is the one thing on this card
                    that IS finished — taken from `DONE` rather than typed, so
                    it is the same green as a ticked set. */}
                <p className={`text-xs ${DONE.text}`}>
                  Finished — everything you logged is kept.
                </p>
              </>
            ) : (
              <>
                <p className="text-base font-semibold">No program yet</p>
                <p className="text-sm text-muted-foreground">
                  A goal says where you are going. A program says what you do on Tuesday.
                </p>
              </>
            )}
            <div className="flex flex-wrap items-center gap-2">
              <Button variant="outline" size="sm" asChild>
                <Link href={withReturn(PROGRAMS, HERE)}>
                  {ended ? "Choose what is next" : "Pick a program"}
                </Link>
              </Button>
              <Link
                href={withReturn(BUILD, HERE)}
                className="inline-flex min-h-11 items-center text-sm text-muted-foreground underline underline-offset-4"
              >
                Build my own ›
              </Link>
            </div>
          </div>
        </Card>
      </div>
    )
  }

  if (one && described) {
    return (
      <div className="space-y-2">
        {heading}
        <Card className="gap-0 py-0" data-testid="lm-training-program">
          <div className="space-y-2 px-4 py-4">
            <div className="flex items-center gap-2">
              <p className="min-w-0 flex-1 truncate text-base font-semibold">{described.name}</p>
              <Badge variant="secondary" className="shrink-0">
                {described.level}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">{described.week}</p>
            {/* Amber for a program started a fortnight ago and never trained:
                that is a thing worth noticing, not an error. */}
            <p
              className={
                described.lastTrained === "forgotten"
                  ? "text-xs text-amber-600 dark:text-amber-400"
                  : "text-xs text-muted-foreground"
              }
            >
              {described.lastTrainedLine}
            </p>
            {adopted && (
              <p className="text-xs text-muted-foreground" data-testid="lm-training-adopted">
                Your training week below now follows {described.name}.
              </p>
            )}
            <div className="flex flex-wrap items-center gap-2">
              <Button variant="outline" size="sm" asChild>
                <Link href={change(one.id)}>Change program</Link>
              </Button>
              <Link
                href={`/programs?program=${one.id}`}
                className="inline-flex min-h-11 items-center text-sm text-muted-foreground underline underline-offset-4"
              >
                Today&apos;s session ›
              </Link>
            </div>
          </div>
        </Card>
      </div>
    )
  }

  // Two or more. Every one of them named, because "you have 3 programs" without
  // saying which three is a number you cannot act on.
  return (
    <div className="space-y-2">
      {heading}
      <Card className="gap-0 py-0" data-testid="lm-training-program">
        <div className="space-y-2 px-4 py-4">
          <p className="text-base font-semibold">{read.enrollments.length} programs running</p>
          <p className="text-xs text-amber-600 dark:text-amber-400">
            Training shows one session a day. End the ones you are not doing.
          </p>
        </div>
        <ul className="divide-y divide-border border-t border-border">
          {read.enrollments.map((e) => (
            <li key={e.id}>
              <ProgramRow
                name={enrollmentName(e)}
                href={change(e.id)}
                testId={`lm-program-${e.id}`}
              />
            </li>
          ))}
        </ul>
        <div className="px-4 py-4">
          <Button variant="outline" size="sm" asChild>
            <Link href={withReturn(PROGRAMS, HERE)}>Manage programs</Link>
          </Button>
        </div>
      </Card>
    </div>
  )
}
