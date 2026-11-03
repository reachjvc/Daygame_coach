/**
 * Bringing an older saved workspace forward, rather than throwing it away.
 *
 * The tracker used to number things 100, 101, 102 — a counter. It now uses ids
 * made on the device, because a counter breaks the moment two devices are
 * offline at once and both hand out 101.
 *
 * Everything already saved in a browser still has the old numbers in it. The
 * loader used to react to a version change by starting fresh with an apology,
 * which is acceptable for a sandbox and not acceptable for something holding
 * hours you worked. So this converts instead: every id becomes the text of the
 * number it was, and every reference to it converts the same way, so the links
 * between entries, projects, tasks and tags survive intact.
 */

import { DEFAULT_IDLE, LEGACY_IDLE_DEFAULT } from "./config"
import type { TimetrackState } from "./types"

/** Any key that holds one id: `id`, `projectId`, `workspaceId`, `assigneeId`… */
const SINGLE_ID_KEY = /^(id|[a-z][A-Za-z]*Id)$/
/** Any key that holds a list of ids: `tagIds`, `groupIds`, `sharedWith`… */
const LIST_ID_KEY = /^([a-z][A-Za-z]*Ids|sharedWith|memberIds|groupIds)$/
/** The counter itself, which has no meaning once ids are made on the device */
const DROPPED_KEYS = new Set(["nextId"])

function convert(value: unknown, key?: string): unknown {
  if (Array.isArray(value)) {
    if (key && LIST_ID_KEY.test(key)) {
      return value.map((item) => (typeof item === "number" ? String(item) : convert(item)))
    }
    return value.map((item) => convert(item))
  }

  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (DROPPED_KEYS.has(k)) continue
      out[k] = SINGLE_ID_KEY.test(k) && typeof v === "number" ? String(v) : convert(v, k)
    }
    return out
  }

  return value
}

/**
 * Convert a workspace saved by version 2 (numeric ids) to version 3 (text ids).
 * Anything already at 3 is returned untouched.
 */
export function migrateStateToV3(parsed: { version?: number } & Record<string, unknown>): Record<string, unknown> {
  if (parsed.version === 3) return parsed
  const converted = convert(parsed) as Record<string, unknown>
  converted.version = 3
  return converted
}

/**
 * THE OLD IDLE DEFAULT IS MOVED OFF ONCE, AND THE MOVE IS WRITTEN DOWN.
 *
 * An older build switched idle detection on at 5 minutes for everybody, which
 * fired at anyone running a timer while working in another app. Settings that
 * still read exactly that are moved to `DEFAULT_IDLE`.
 *
 * This used to run on every load with nothing recorded, and the move was made
 * in this browser only, before the sync took its first look — so it was never
 * sent. On first contact the account's copy wins every row it knows, the
 * account still said "on, 5 minutes", that was saved here, and the next load
 * moved it again: the same toast on every visit, and idle detection quietly on
 * for the rest of each one. A person who chose 5 minutes on purpose was
 * switched off on every visit too.
 *
 * Now `legacyDefaultMoved` is set whatever the settings were, and once it is
 * set nothing here runs again. It lives inside the idle settings, which the
 * account stores whole, so it makes the round trip. The hook runs this on what
 * it loads AND on every workspace the sync hands over: the account's old copy
 * comes back moved, which is a change, which is sent — and from then on the
 * account says so too.
 *
 * Returns the same object when there is nothing to do, so a workspace that
 * needs nothing is never mistaken for a change.
 */
export function moveLegacyIdleDefault(state: TimetrackState): { state: TimetrackState; moved: boolean } {
  if (state.idle?.legacyDefaultMoved) return { state, moved: false }
  const onLegacyDefault =
    state.idle?.enabled === LEGACY_IDLE_DEFAULT.enabled && state.idle?.minutes === LEGACY_IDLE_DEFAULT.minutes
  const idle = onLegacyDefault ? { ...state.idle, ...DEFAULT_IDLE } : { ...state.idle, legacyDefaultMoved: true }
  return { state: { ...state, idle }, moved: onLegacyDefault }
}
