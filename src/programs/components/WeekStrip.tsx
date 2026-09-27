"use client"

/**
 * THIS WEEK, AS SEVEN DOTS.
 *
 * It was seven 56px bordered tiles inside one more border, each carrying a day
 * label, and the word "done" under the ones you had trained — a grid of text
 * competing with the session card below it, which is the thing you opened the
 * app for. Seven dots answer the same question in a glance.
 *
 * PRESENTATIONAL, AND THAT IS THE POINT. It used to ask the phone what day it
 * was (`isoWeekday(new Date())`) while the card beside it used the account's
 * zone, so on a travelling phone the strip lit Wednesday and the card
 * prescribed Tuesday's session. It also owned a PUT and an error line. Both
 * are gone: every fact arrives as a prop, decided once on the server, and the
 * one write lives in `DayAssignment`.
 */

import { DONE } from "./trainingStyles"
import type { WeekSoFar } from "../types"

/** Monday-first, matching every other week in this app. */
const DAYS: { weekday: number; short: string }[] = [
  { weekday: 1, short: "Mon" },
  { weekday: 2, short: "Tue" },
  { weekday: 3, short: "Wed" },
  { weekday: 4, short: "Thu" },
  { weekday: 5, short: "Fri" },
  { weekday: 6, short: "Sat" },
  { weekday: 7, short: "Sun" },
]

interface Props {
  /** Computed on the server, in the account's zone. See `weekSoFar`. */
  week: WeekSoFar
  /** What the program asks for on each weekday, when it names weekdays. */
  labels?: Record<number, string | undefined>
  /** Tapping a cell opens the day picker. Absent = the strip is read-only. */
  onPickDay?: (weekday: number) => void
}

export function WeekStrip({ week, labels, onPickDay }: Props) {
  return (
    /*
      gap-0.5, NOT gap-1. Seven cells inside the card's own px-4 leaves 326px
      on a 390px phone; four-pixel gaps take 24 of it and each cell lands at
      43px — one pixel under the fingertip minimum, measured. Two-pixel gaps
      give 44.9.
    */
    <div data-testid="week-strip" className="grid grid-cols-7 gap-0.5">
      {DAYS.map(({ weekday, short }) => {
        const isToday = weekday === week.todayWeekday
        const trained = week.trainedWeekdays.includes(weekday)
        const label = labels?.[weekday]
        /**
         * "NOTHING PLANNED" IS A CLAIM, AND ON A ROTATION IT IS FALSE.
         *
         * `labels` is only given when the schedule PINS WEEKDAYS. A rotation
         * like StrongLifts does not, so every cell read
         * "Mon: nothing planned. Tap to change." … "Sun: nothing planned"
         * while the card directly below said "Workout A" and offered Start.
         * A screen reader was told the week was empty by the one control on
         * the page whose job is to describe it.
         *
         * And today was never said: `isToday` reached the eye through
         * `font-semibold` and `data-today`, and the accessible name not at
         * all.
         */
        const what = trained
          ? "trained"
          : label
            ? label
            : labels
              ? "nothing planned"
              : "no set day on this program"
        /**
         * A DAY WITH A SESSION ON IT LOOKS DIFFERENT FROM AN EMPTY ONE.
         *
         * The dot encoded only `trained` and `isToday`, and the day's label
         * went into `aria-label` alone — so assigning Workout B to Monday
         * changed the strip by exactly nothing: Monday's dot stayed
         * `bg-muted-foreground/30`, identical to "nothing planned". A sighted
         * person had no confirmation the write happened and no way to read
         * their own week off the strip, which is the strip's whole job.
         *
         * A ring for a day that has a session waiting, filled for one already
         * trained; today keeps its own ring on the label above.
         */
        const planned = Boolean(label) && !trained
        const body = (
          <>
            <span
              className={`text-xs uppercase ${
                isToday ? "font-semibold text-foreground" : "text-muted-foreground"
              }`}
            >
              {short}
            </span>
            <span
              aria-hidden
              className={`size-2 rounded-full ${
                trained
                  ? DONE.dot
                  : planned
                    ? "ring-1 ring-muted-foreground/70"
                    : "bg-muted-foreground/30"
              }`}
            />
          </>
        )
        const shared = "flex h-11 flex-col items-center justify-center gap-1 rounded-md text-xs"

        // Which day is today is the fact this strip got wrong for a year, so it
        // is worth asserting on directly rather than through a colour.
        if (!onPickDay) {
          return (
            <div
              key={weekday}
              data-testid={`week-day-${weekday}`}
              data-today={isToday ? "1" : undefined}
              data-trained={trained ? "1" : undefined}
              className={shared}
              aria-label={`${short}${isToday ? " (today)" : ""}: ${what}`}
            >
              {body}
            </div>
          )
        }
        return (
          <button
            key={weekday}
            type="button"
            onClick={() => onPickDay(weekday)}
            data-testid={`week-day-${weekday}`}
            data-today={isToday ? "1" : undefined}
            data-trained={trained ? "1" : undefined}
            // `bg-accent` in this app is the sunset red; a day you can tap
            // should not flash a warning colour under your thumb.
            className={`${shared} transition-colors hover:bg-muted/50`}
            aria-label={`${short}${isToday ? " (today)" : ""}: ${what}. Tap to change.`}
          >
            {body}
          </button>
        )
      })}
    </div>
  )
}
