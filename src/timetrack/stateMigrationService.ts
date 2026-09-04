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
