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
        const what = trained ? "trained" : label ? label : "nothing planned"
        const body = (
          <>
            <span className="text-xs uppercase text-muted-foreground">{short}</span>
            <span
              aria-hidden
              className={`size-2 rounded-full ${
                trained
                  ? DONE.dot
                  : isToday
                    ? "ring-1 ring-primary"
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
              aria-label={`${short}: ${what}`}
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
            aria-label={`${short}: ${what}. Tap to change.`}
          >
            {body}
          </button>
        )
      })}
    </div>
  )
}
