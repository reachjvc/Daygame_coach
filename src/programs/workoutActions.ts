/**
 * EVERYTHING YOU CAN DO TO A WORKOUT THAT IS ALREADY WRITTEN DOWN.
 *
 * Read its sets to correct them, save the correction, throw it away. Three
 * calls, in one module, for the same reason `programActions.ts` exists: a
 * component that does its own `fetch` decides for itself what to show when the
 * request fails, and the cheap answer — an empty list, a silent success — is a
 * claim about somebody's training that is not true.
 *
 * The reading one matters most. Saving a correction REPLACES this workout's
 * sets with exactly the rows it is given, so a list that arrived short does not
 * display wrong, it deletes. That is not hypothetical: the History version of
 * this editor read from a year-long list that had outgrown the database's
 * response limit, so every workout in it was missing its later sets. A failed
 * read here returns a refusal and the editor does not open.
 *
 * Nothing here navigates or refreshes. The screens do that differently and the
 * decision is theirs.
 */

import type { ActionResult } from "./programActions"
import { UNREACHABLE } from "./programActions"
import type { CorrectedSet } from "./types"
import type { WorkoutSetRow } from "@/src/health/types"

async function call<T>(url: string, init: RequestInit, whenSilent: string): Promise<ActionResult<T>> {
  let res: Response
  try {
    res = await fetch(url, init)
  } catch {
    return { ok: false, error: UNREACHABLE }
  }
  const body = (await res.json().catch(() => null)) as ({ error?: string } & T) | null
  if (!res.ok) return { ok: false, error: body?.error ?? whenSilent }
  return { ok: true, data: (body ?? null) as T }
}

/**
 * The sets of one workout, read fresh.
 *
 * One workout's sets cannot outgrow a single response, which is the whole
 * reason this is asked for per workout rather than taken from a list.
 */
export async function readWorkoutSets(workoutId: string): Promise<ActionResult<WorkoutSetRow[]>> {
  const answer = await call<WorkoutSetRow[]>(
    `/api/workouts/${workoutId}`,
    {},
    "This workout could not be loaded, so it cannot be corrected right now."
  )
  if (!answer.ok) return answer
  if (!Array.isArray(answer.data)) {
    // A body in a shape this cannot read is not data to edit against.
    return { ok: false, error: "This workout came back in a shape I could not read." }
  }
  return answer
}

/** Replaces the workout's sets with exactly these. */
export function saveCorrection(workoutId: string, sets: CorrectedSet[]): Promise<ActionResult> {
  return call(
    `/api/workouts/${workoutId}/revise`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sets }),
    },
    "That correction could not be saved."
  )
}

/** Deletes it, and with it every set it holds. */
export function deleteWorkout(workoutId: string): Promise<ActionResult> {
  return call(
    `/api/health/workout?id=${workoutId}`,
    { method: "DELETE" },
    "That workout could not be deleted."
  )
}
