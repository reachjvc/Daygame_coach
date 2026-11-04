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
