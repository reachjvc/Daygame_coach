/**
 * TAPS KEPT ON THIS DEVICE UNTIL THE SERVER HAS THEM.
 *
 * A tap counts on screen at once and is sent in the background; with no
 * signal it waits here, marked "saved on this phone", and goes when the signal
 * returns (Plans/thought.md, Phase 9). Every log already carries the id this
 * device minted, so sending one twice stores it once (R5): the queue may
 * resend freely and never has to know whether a send that timed out arrived.
 *
 * NEW THOUGHTS WAIT HERE TOO. A thought typed on a train needs a row before
 * its log can land, so the queue holds `{id, text}` and sends it first. The
 * server may answer that these words already exist under another id (typed
 * on another device meanwhile); the queued logs are then moved to that id.
 *
 * Storage is injected, so the rules are tested without a browser.
 */

import type { LogInput } from "./types"

export const QUEUE_KEY = "thoughts-queue-v1"

export interface QueuedThought {
  id: string
  text: string
}

export interface QueueState {
  thoughts: QueuedThought[]
  logs: LogInput[]
}

export interface KeyValueStore {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
  removeItem(key: string): void
}

const EMPTY: QueueState = { thoughts: [], logs: [] }

export function readQueue(store: KeyValueStore | null): QueueState {
  if (!store) return { thoughts: [], logs: [] }
  try {
    const raw = store.getItem(QUEUE_KEY)
    if (!raw) return { thoughts: [], logs: [] }
    const parsed = JSON.parse(raw) as Partial<QueueState>
    return {
      thoughts: Array.isArray(parsed.thoughts) ? parsed.thoughts : [],
      logs: Array.isArray(parsed.logs) ? parsed.logs : [],
    }
  } catch {
    return { ...EMPTY, thoughts: [], logs: [] }
  }
}

export function writeQueue(store: KeyValueStore | null, state: QueueState): void {
  if (!store) return
  try {
    if (state.thoughts.length === 0 && state.logs.length === 0) store.removeItem(QUEUE_KEY)
    else store.setItem(QUEUE_KEY, JSON.stringify(state))
  } catch {
    // Storage full or blocked: the tap still goes now if there is signal.
  }
}

export function enqueueLog(state: QueueState, log: LogInput): QueueState {
  if (state.logs.some((l) => l.id === log.id)) return state
  return { ...state, logs: [...state.logs, log] }
}

export function enqueueThought(state: QueueState, thought: QueuedThought): QueueState {
  if (state.thoughts.some((t) => t.id === thought.id)) return state
  return { ...state, thoughts: [...state.thoughts, thought] }
}

export function dropLog(state: QueueState, logId: string): QueueState {
  return { ...state, logs: state.logs.filter((l) => l.id !== logId) }
}

/** A queued thought was stored under `storedId` (its own id, or the one these words already had). */
export function thoughtStored(state: QueueState, queuedId: string, storedId: string): QueueState {
  return {
    thoughts: state.thoughts.filter((t) => t.id !== queuedId),
    logs: state.logs.map((l) => (l.thoughtId === queuedId ? { ...l, thoughtId: storedId } : l)),
  }
}

/** The server answered for these logs (stored, or refused for good): they leave the queue. */
export function logsAnswered(state: QueueState, ids: string[]): QueueState {
  const done = new Set(ids)
  return { ...state, logs: state.logs.filter((l) => !done.has(l.id)) }
}

/** How many taps of each thought are still only on this device. */
export function pendingByThought(state: QueueState): Map<string, number> {
  const out = new Map<string, number>()
  for (const l of state.logs) if (l.thoughtId) out.set(l.thoughtId, (out.get(l.thoughtId) ?? 0) + 1)
  return out
}

/** The browser's storage, or null where it is blocked (private windows, some embeds). */
export function browserStore(): KeyValueStore | null {
  try {
    return typeof window === "undefined" ? null : window.localStorage
  } catch {
    return null
  }
}

/** Signing out: whatever thought text is still waiting must not stay on a shared device. */
export function forgetQueue(): void {
  try {
    browserStore()?.removeItem(QUEUE_KEY)
  } catch {
    // Nothing kept, nothing to forget.
  }
}
