/**
 * How far this device's clock is from the server's. Pure functions; the one
 * place that holds the answer for the page is `serverClock.ts`.
 *
 * WHY (sync defect #6, design rule D5 in Plans/time-tracker-like-toggl.md).
 * Starts and stops were stamped with each device's own clock, so a phone four
 * minutes fast made every PC stop four minutes short, and every phone start
 * four minutes early.
 *
 * HOW. Every answer from the server carries its own time in the `Date` header,
 * to the whole second, written somewhere between the moment the request left
 * and the moment the answer arrived. So one answer says: the server's clock
 * minus this one lies between `date − arrived` and `date + 1 s − left`. Each
 * further answer narrows that window to the part both agree on; an answer that
 * does not overlap it at all means a clock was changed, and the window starts
 * over from that answer. An answer whose round trip took long says little and
 * is not used.
 *
 * WHAT IS USED. While the window still holds zero, the device's clock is not
 * shown to be wrong and is left exactly as it is — the usual case, both clocks
 * set by the network, costs nothing and adds no jitter. Otherwise the middle of
 * the window, which is within half its width of the truth.
 */

/** The server's clock minus this device's, known to lie in [low, high] milliseconds */
export interface ClockWindow {
  low: number
  high: number
}

export interface ClockSample {
  /** this device's clock when the request left */
  sentAt: number
  /** and when its answer arrived */
  receivedAt: number
  /** the answer's `Date` header, or null when it had none */
  serverDate: string | null
}

/** An answer slower than this tells too little to be worth using */
export const LONGEST_USEFUL_ROUND_TRIP_MS = 2_000

/** `Date` is written to the whole second, truncated */
const HEADER_RESOLUTION_MS = 1_000

export function learnClock(window: ClockWindow | null, sample: ClockSample): ClockWindow | null {
  if (!sample.serverDate) return window
  const stamped = Date.parse(sample.serverDate)
  if (Number.isNaN(stamped)) return window
  const roundTrip = sample.receivedAt - sample.sentAt
  if (!(roundTrip >= 0) || roundTrip > LONGEST_USEFUL_ROUND_TRIP_MS) return window

  const fresh: ClockWindow = {
    low: stamped - sample.receivedAt,
    high: stamped + HEADER_RESOLUTION_MS - sample.sentAt,
  }
  if (!window) return fresh
  const low = Math.max(window.low, fresh.low)
  const high = Math.min(window.high, fresh.high)
  // no overlap: one of the clocks was changed since the last answer
  return low <= high ? { low, high } : fresh
}

/** What to add to this device's clock to get the server's. Zero until shown otherwise. */
export function clockOffset(window: ClockWindow | null): number {
  if (!window) return 0
  if (window.low <= 0 && window.high >= 0) return 0
  return Math.round((window.low + window.high) / 2)
}
