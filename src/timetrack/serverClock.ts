/**
 * The server's time, as this page knows it: this device's clock plus the
 * offset learned from the server's answers (see `serverClockService`).
 *
 * Every start, stop and "now" the tracker stamps comes from here, and so does
 * the running clock on screen, so what is shown and what is stored agree. One
 * value for the whole page, because there is one device clock and one server;
 * the sync hook feeds it from every answer it gets. Until the first answer the
 * offset is zero, which is this device's own clock — what it used before.
 */

import { clockOffset, learnClock, type ClockWindow } from "./serverClockService"

let known: ClockWindow | null = null

/** Learn from one answer: when the request left, when it came back, and its `Date` header */
export function noteServerDate(sentAt: number, receivedAt: number, serverDate: string | null): void {
  known = learnClock(known, { sentAt, receivedAt, serverDate })
}

/**
 * What to add to this device's clock to get the server's, in milliseconds.
 * For turning a moment measured on the device clock into a stamp. Durations
 * are measured on the device clock alone: the offset moves when it is learned,
 * and a duration measured across that move would jump by it.
 */
export function serverOffset(): number {
  return clockOffset(known)
}

/** The server's time now, in milliseconds */
export function serverNow(): number {
  return Date.now() + clockOffset(known)
}

export function serverNowIso(): string {
  return new Date(serverNow()).toISOString()
}

/** Forget what was learned. For tests, which share one module between cases. */
export function forgetServerClock(): void {
  known = null
}

/**
 * A moment measured on this device's clock, as the server's time.
 *
 * For a tap held until the check lands (D2): the moment is taken when the
 * finger comes down and stamped when the tap is replayed, with the offset as
 * it is known THEN — the check that held the tap is often the answer that
 * teaches the offset. Reading the clock at the replay instead stamped every
 * stop on a phone that had just woken up to three seconds late (bug audit A6).
 */
export function serverIsoAt(deviceMs: number): string {
  return new Date(deviceMs + clockOffset(known)).toISOString()
}
