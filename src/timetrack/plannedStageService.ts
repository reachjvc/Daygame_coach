/**
 * Time-tracking slice — the seconds at which a planned entry turns into worked time.
 *
 * A planned entry (start after now, `isPlanned`) is left out of every total until its
 * start passes, so a finished entry's numbers depend on the clock in exactly one way:
 * whether its start has come yet. Between two consecutive starts nothing about any
 * finished entry changes. So the work done once for the finished entries — the Timer
 * list's days and week, a report's tally — is valid for one STAGE: the number of
 * finished entries whose start has passed. A cache keyed on the stage is redone the
 * second a planned entry starts (or, should the clock step back, unstarts), and at no
 * other second.
 */

import { epochSeconds } from "./timetrackFormatService"
import type { TimeEntry } from "./types"

/** The finished entries' starts, ascending, as `isPlanned` compares them */
export function startsInOrder(finished: TimeEntry[]): number[] {
  return finished.map((e) => epochSeconds(e.start)).sort((a, b) => a - b)
}

/** How many of those starts have passed at `nowSec`: same number, same planned entries */
export function stageAt(starts: number[], nowSec: number): number {
  let low = 0
  let high = starts.length
  while (low < high) {
    const mid = (low + high) >> 1
    if (starts[mid] <= nowSec) low = mid + 1
    else high = mid
  }
  return low
}
