/**
 * WHAT THE SCREEN SHOWS = WHAT THE SERVER HAS + WHAT IS STILL ON THIS PHONE.
 *
 * A fresh read from the server knows nothing of taps still in the queue, so
 * drawing it as-is would make a count drop back by one the moment a refresh
 * lands before the queue has been sent. These functions put the queue back on
 * top: queued logs bump their thought's counts, queued new thoughts appear as
 * thoughts. Pure, so the arithmetic is tested.
 */

import { getTodayInTimezone } from "@/src/shared/dateUtils"
import type { QueueState } from "./logQueue"
import { cleanThoughtText } from "./thoughtsService"
import type { Thought, ThoughtCounts } from "./types"

const DAY = 24 * 60 * 60 * 1000

/** Counts after one more log at `at` (or one fewer, with `delta` -1). */
export function bumpCounts(c: ThoughtCounts, at: string, now: Date, timezone: string, delta: 1 | -1 = 1): ThoughtCounts {
  const t = Date.parse(at)
  const sameDay = getTodayInTimezone(timezone, new Date(t)) === getTodayInTimezone(timezone, now)
  const clamp = (n: number) => Math.max(0, n)
  return {
    today: clamp(c.today + (sameDay ? delta : 0)),
    week: clamp(c.week + (now.getTime() - t < 7 * DAY ? delta : 0)),
    month: clamp(c.month + (now.getTime() - t < 30 * DAY ? delta : 0)),
    total: clamp(c.total + delta),
    firstAt: delta === 1 ? (c.firstAt === null || at < c.firstAt ? at : c.firstAt) : c.firstAt,
    lastAt: delta === 1 ? (c.lastAt === null || at > c.lastAt ? at : c.lastAt) : c.lastAt,
  }
}

/** A thought that exists only on this phone so far. */
export function localThought(id: string, text: string, createdAt: string): Thought {
  return {
    id,
    text: cleanThoughtText(text),
    pinned: false,
    archived: false,
    createdAt,
    counts: { today: 0, week: 0, month: 0, total: 0, firstAt: null, lastAt: null },
    reframe: null,
    reframeCount: 0,
  }
}

/** The server's thoughts with this phone's queue laid on top. */
export function withPending(server: Thought[], queue: QueueState, now: Date, timezone: string): Thought[] {
  const byId = new Map(server.map((t) => [t.id, t]))
  for (const q of queue.thoughts) {
    if (!byId.has(q.id)) byId.set(q.id, localThought(q.id, q.text, now.toISOString()))
  }
  for (const log of queue.logs) {
    if (log.thoughtId === null) continue
    const t = byId.get(log.thoughtId)
    if (t) byId.set(t.id, { ...t, archived: false, counts: bumpCounts(t.counts, log.at, now, timezone) })
  }
  return [...byId.values()]
}
