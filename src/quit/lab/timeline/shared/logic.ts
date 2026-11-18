const HOUR = 3_600_000
export const DAY_MS = 24 * HOUR

/** A milestone row. `exampleDays` only drives the bar in example-data mode; it is never a health figure. */
export interface Milestone {
  key: string
  /** Days the example bar takes to fill. Made up for the example data. */
  exampleDays: number
}

export interface TimelineSetup {
  startMs: number
  /** 1 when the example data is on. */
  seeded: number
}

/** Elapsed over duration, kept between 0 and 1. */
export function fraction(elapsedMs: number, durationMs: number): number {
  if (!(durationMs > 0) || !(elapsedMs > 0)) return 0
  return Math.min(1, elapsedMs / durationMs)
}

/** Bar fill of one milestone. Without example data nothing is known, so the bar stays empty. */
export function fill(setup: TimelineSetup, m: Milestone, now: number): number {
  if (!setup.seeded) return 0
  return fraction(now - setup.startMs, m.exampleDays * DAY_MS)
}

export type State = "locked" | "progress" | "done"

export function stateOf(f: number): State {
  return f >= 1 ? "done" : f > 0 ? "progress" : "locked"
}

/** Milliseconds left on the example duration (0 when done or no example data). */
export function remainingMs(setup: TimelineSetup, m: Milestone, now: number): number {
  if (!setup.seeded) return 0
  return Math.max(0, m.exampleDays * DAY_MS - Math.max(0, now - setup.startMs))
}

/** "16d 2h 4m 24s". */
export function countdown(ms: number): string {
  const t = Math.floor(Math.max(0, ms) / 1000)
  const d = Math.floor(t / 86400)
  const h = Math.floor((t % 86400) / 3600)
  const m = Math.floor((t % 3600) / 60)
  const s = t % 60
  return `${d}d ${h}h ${m}m ${s}s`
}

export function doneCount(setup: TimelineSetup, items: readonly Milestone[], now: number): number {
  return items.filter((m) => fill(setup, m, now) >= 1).length
}

/** True while the start date lies ahead. */
export const beforeStart = (setup: TimelineSetup, now: number) => setup.startMs > now

/** Start 23 days and a few hours ago, as the other copies' example data. */
export const seedStart = (now: number) => now - 23 * DAY_MS - 4 * HOUR - 23 * 60_000
