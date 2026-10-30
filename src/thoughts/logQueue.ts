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
 * UNDO IS QUEUED TOO. A send can time out after the server stored it, so an
 * Undo cannot know whether the tap is only here; its id waits in `undos`
 * until the server has answered a DELETE for it (idempotent either way).
 *
 * EVERYTHING HERE IS ONE PERSON'S. `owner` is the account that wrote it; a
 * queue or page copy belonging to anyone else is thrown away unread, so a
 * shared phone never sends one person's taps into the next person's account
 * (the security review, 2026-10-30: a session that ended without Log Out
 * left them behind).
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
  owner: string | null
  thoughts: QueuedThought[]
  logs: LogInput[]
  /** Logs undone whose removal the server has not yet confirmed. */
  undos: string[]
}

export interface KeyValueStore {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
  removeItem(key: string): void
}

export function emptyQueue(owner: string | null): QueueState {
  return { owner, thoughts: [], logs: [], undos: [] }
}

export function isEmpty(q: QueueState): boolean {
  return q.thoughts.length === 0 && q.logs.length === 0 && q.undos.length === 0
}

/** This person's queue; anyone else's (or an unowned one) is empty, and removed. */
export function readQueue(store: KeyValueStore | null, owner: string): QueueState {
  if (!store) return emptyQueue(owner)
  try {
    const raw = store.getItem(QUEUE_KEY)
    if (!raw) return emptyQueue(owner)
    const parsed = JSON.parse(raw) as Partial<QueueState>
    if (parsed.owner !== owner) {
      store.removeItem(QUEUE_KEY)
      return emptyQueue(owner)
    }
    return {
      owner,
      thoughts: Array.isArray(parsed.thoughts) ? parsed.thoughts : [],
      logs: Array.isArray(parsed.logs) ? parsed.logs : [],
      undos: Array.isArray(parsed.undos) ? parsed.undos.filter((x): x is string => typeof x === "string") : [],
    }
  } catch {
    return emptyQueue(owner)
  }
}

export function writeQueue(store: KeyValueStore | null, state: QueueState): void {
  if (!store) return
  try {
    if (isEmpty(state) || state.owner === null) store.removeItem(QUEUE_KEY)
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

/** Undo: out of the queue, and a removal queued in case an earlier send already landed. */
export function undoLog(state: QueueState, logId: string): QueueState {
  return {
    ...state,
    logs: state.logs.filter((l) => l.id !== logId),
    undos: state.undos.includes(logId) ? state.undos : [...state.undos, logId],
  }
}

/** The server answered these removals. */
export function undosAnswered(state: QueueState, ids: string[]): QueueState {
  const done = new Set(ids)
  return { ...state, undos: state.undos.filter((id) => !done.has(id)) }
}

/** A queued thought was stored under `storedId` (its own id, or the one these words already had). */
export function thoughtStored(state: QueueState, queuedId: string, storedId: string): QueueState {
  return {
    ...state,
    thoughts: state.thoughts.filter((t) => t.id !== queuedId),
    logs: state.logs.map((l) => (l.thoughtId === queuedId ? { ...l, thoughtId: storedId } : l)),
  }
}

/** A queued thought the server refused for good: it and its taps go. */
export function thoughtRefused(state: QueueState, queuedId: string): QueueState {
  return {
    ...state,
    thoughts: state.thoughts.filter((t) => t.id !== queuedId),
    logs: state.logs.filter((l) => l.thoughtId !== queuedId),
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

/**
 * THE LAST COPY OF THE PAGE, so it opens with no signal (Q13): your thoughts
 * and their counts as of the last read. Only ever drawn when a read fails for
 * want of a connection, and marked as such on screen; taps still go to the
 * queue. Holds thought text, so it goes at sign-out with the queue.
 */
export const VIEW_KEY = "thoughts-view-v1"

export function saveViewCopy(store: KeyValueStore | null, view: unknown, at: Date, owner: string): void {
  if (!store) return
  try {
    store.setItem(VIEW_KEY, JSON.stringify({ at: at.toISOString(), owner, view }))
  } catch {
    // Storage full or blocked: the page still works online.
  }
}

/** This person's page copy, or null; anyone else's is removed unread. */
export function readViewCopy<T>(store: KeyValueStore | null, owner: string): { at: string; view: T } | null {
  if (!store) return null
  try {
    const raw = store.getItem(VIEW_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as { at?: unknown; owner?: unknown; view?: unknown }
    if (parsed.owner !== owner) {
      store.removeItem(VIEW_KEY)
      return null
    }
    return typeof parsed.at === "string" && parsed.view && typeof parsed.view === "object" ? { at: parsed.at, view: parsed.view as T } : null
  } catch {
    return null
  }
}

/** Signing out: no thought text — waiting taps or the page's copy — stays on a shared device. */
export function forgetThoughtsOnThisDevice(): void {
  try {
    browserStore()?.removeItem(QUEUE_KEY)
    browserStore()?.removeItem(VIEW_KEY)
  } catch {
    // Nothing kept, nothing to forget.
  }
}
