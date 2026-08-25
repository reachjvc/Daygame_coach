/**
 * The lifts you invented, remembered.
 *
 * WHY THIS EXISTS. `customLibraryEntry` shapes a lift the pool has never heard
 * of, and until now it existed only inside the program you were editing. Add
 * "One Arm Tricep" on Monday, come back on Thursday, and you had to type it
 * again — and because you were typing it into a fresh entry each time, there
 * was no reason to believe the app thought it was the same movement. It is
 * exactly the lift somebody most wants tracked, because nothing else in the app
 * knows about it.
 *
 * WHAT MAKES IT THE SAME LIFT. `customLibraryEntry` derives the id from the
 * name (`custom_one arm tricep`), so the same words always produce the same id,
 * and `exerciseState` — which is keyed by exercise id — accumulates against it
 * across days and across programs. Remembering the lift is therefore not what
 * makes progress work; it is what stops you having to retype it, and what lets
 * the palette offer it back. The identity was already deterministic.
 *
 * NOT THE SHARED LIBRARY. These live in this browser, for this person.
 * `EXERCISE_LIBRARY` is the pool every editor offers and every catalog program
 * is checked against; growing it from user input would make one person's
 * "Cable Thing" everybody's and make `patternForName` answer differently
 * depending on who asked.
 */

import type { BodyGroup, LibraryExercise } from "./types"

export const CUSTOM_LIFTS_STORAGE_KEY = "custom-lifts-v1"

/** Most lifts anybody needs to invent. A cap so a stuck loop cannot fill storage. */
const MAX_CUSTOM_LIFTS = 200

const VALID_GROUPS: BodyGroup[] = [
  "chest",
  "back",
  "shoulders",
  "arms",
  "quads",
  "hamstrings_glutes",
  "calves",
  "core",
]

/**
 * Read what was stored, discarding anything that is not a lift.
 *
 * Hand-edited or stale storage is dropped rather than fed to the editor, which
 * would throw on the first render and take the whole tab down with it. A bad
 * entry loses one remembered lift; a bad parse loses the list, and neither
 * loses the program you are working on.
 */
export function parseCustomLifts(raw: string | null): LibraryExercise[] {
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.filter(isLift).slice(0, MAX_CUSTOM_LIFTS)
  } catch {
    return []
  }
}

function isLift(value: unknown): value is LibraryExercise {
  if (!value || typeof value !== "object") return false
  const v = value as Record<string, unknown>
  return (
    typeof v.id === "string" &&
    v.id.length > 0 &&
    typeof v.name === "string" &&
    v.name.trim().length > 0 &&
    typeof v.group === "string" &&
    VALID_GROUPS.includes(v.group as BodyGroup) &&
    typeof v.pattern === "string" &&
    typeof v.defaultSets === "number" &&
    typeof v.defaultRepMin === "number" &&
    typeof v.defaultRepMax === "number" &&
    typeof v.suggestedKg === "object" &&
    v.suggestedKg !== null
  )
}

export function serializeCustomLifts(lifts: LibraryExercise[]): string {
  return JSON.stringify(lifts.slice(0, MAX_CUSTOM_LIFTS))
}

/**
 * Remember a lift, newest first, without ever storing it twice.
 *
 * Deduped on ID rather than on name, because the id already IS the normalised
 * name — so "one arm tricep", "One Arm Tricep" and "  One  Arm  Tricep  " are
 * one remembered lift and, more importantly, one tracked lift. Re-adding
 * updates the stored entry (the body part may have been corrected) and moves it
 * to the front, where the thing you just used belongs.
 */
export function rememberCustomLift(
  lifts: LibraryExercise[],
  entry: LibraryExercise
): LibraryExercise[] {
  return [entry, ...lifts.filter((l) => l.id !== entry.id)].slice(0, MAX_CUSTOM_LIFTS)
}

export function forgetCustomLift(lifts: LibraryExercise[], id: string): LibraryExercise[] {
  return lifts.filter((l) => l.id !== id)
}

/** True for an exercise id that came from a lift somebody wrote themselves. */
export function isCustomLiftId(id: string): boolean {
  return id.startsWith("custom_")
}

/**
 * The remembered lifts matching what somebody typed.
 *
 * Deliberately simpler than `searchLibrary`: this list is small and personal,
 * so a plain contains-match ranked by position is enough, and ranking rules
 * would only make your own five lifts behave differently from each other for
 * no reason you could observe.
 */
export function searchCustomLifts(lifts: LibraryExercise[], query: string): LibraryExercise[] {
  const q = query.trim().toLowerCase()
  if (!q) return []
  return lifts.filter((l) => l.name.toLowerCase().includes(q))
}
