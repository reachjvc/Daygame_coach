/**
 * THE OFFLINE QUEUE'S GENERIC PARTS: storage that belongs to one person, and
 * the loop that sends what is waiting.
 *
 * Moved out of the Thoughts log queue and `useThoughts` (Plans/energy-audit.md,
 * Phase 1). A feature keeps its own item types and its own endpoint; this
 * keeps the rules that must not differ between features:
 *
 *  - EVERYTHING IS ONE PERSON'S. The stored copy names its `owner`; a copy
 *    belonging to anyone else is thrown away unread, so a shared phone never
 *    sends one person's text into the next person's account.
 *  - A SEND THAT CAN NEVER SUCCEED IS DROPPED, ONE THAT MIGHT IS KEPT. No
 *    connection or a 5xx: it stays. Signed out (401): it stays too, because
 *    it is still this person's phone until they sign out here. Any other 4xx
 *    can never succeed, so only what it was about is dropped.
 *  - Storage is injected, so the rules are tested without a browser.
 */

export interface KeyValueStore {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
  removeItem(key: string): void
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
 * This person's stored object, or null. Anything stored for another person (or
 * for nobody) is removed unread; so is text that is not an object.
 */
export function readOwnedJson(store: KeyValueStore | null, key: string, owner: string): Record<string, unknown> | null {
  if (!store) return null
  try {
    const raw = store.getItem(key)
    if (!raw) return null
    const parsed = JSON.parse(raw) as Record<string, unknown> | null
    if (!parsed || typeof parsed !== "object" || parsed.owner !== owner) {
      store.removeItem(key)
      return null
    }
    const { owner: _owner, ...rest } = parsed
    void _owner
    return rest
  } catch {
    return null
  }
}

/** Store `value` under `owner`; null (or an owner of null) removes the key. */
export function writeOwnedJson(store: KeyValueStore | null, key: string, owner: string | null, value: object | null): void {
  if (!store) return
  try {
    if (value === null || owner === null) store.removeItem(key)
    else store.setItem(key, JSON.stringify({ ...value, owner }))
  } catch {
    // Storage full or blocked: the send still goes now if there is signal.
  }
}

export interface SendFailure {
  status: number
  retryable: boolean
}

/** What a thrown error says about retrying. No `status` means no connection. */
export function failureOf(error: unknown): SendFailure {
  const e = error as { status?: unknown; retryable?: unknown } | null
  if (e && typeof e.status === "number" && typeof e.retryable === "boolean") return { status: e.status, retryable: e.retryable }
  return { status: 0, retryable: true }
}

/** True when the refusal is for good: not retryable, and not merely "signed out". */
export function refusedForGood(failure: SendFailure): boolean {
  return !failure.retryable && failure.status !== 401
}

/** The routes take at most 500; smaller sends finish sooner on a weak signal. */
export const SEND_AT_MOST = 200

/**
 * Send `items` in batches of `chunk`. A batch that is stored calls `onSent`; one
 * refused for good calls `onDropped` and the loop goes on; the first failure
 * that might pass stops the loop and is returned (null when everything went).
 */
export async function sendInChunks<T>(
  items: readonly T[],
  send: (batch: T[]) => Promise<void>,
  hooks: { onSent: (batch: T[]) => void; onDropped: (batch: T[]) => void; chunk?: number },
): Promise<SendFailure | null> {
  const size = hooks.chunk ?? SEND_AT_MOST
  for (let i = 0; i < items.length; i += size) {
    const batch = items.slice(i, i + size)
    try {
      await send(batch)
      hooks.onSent(batch)
    } catch (error) {
      const failure = failureOf(error)
      if (refusedForGood(failure)) hooks.onDropped(batch)
      else return failure
    }
  }
  return null
}
