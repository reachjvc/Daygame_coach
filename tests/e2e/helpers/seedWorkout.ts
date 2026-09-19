/**
 * SEEDING A FINISHED WORKOUT, THROUGH THE PATH THE APP ACTUALLY USES.
 *
 * Browser tests that need history used to conjure it with one POST to
 * `/api/health/workout` — a whole workout, its sets and its duration in a
 * single call. That endpoint is gone, because it was the second way to record
 * a session and it disagreed with the first about units, personal bests and
 * what happens when the sets are refused.
 *
 * WHY ONE HELPER AND NOT A REWRITE IN EACH SPEC. The fixtures are the part
 * most likely to drift away from the product: a spec that seeds its history
 * through a path no user can take will keep passing long after the real one
 * breaks. There is one seeding path here, it is start → tick → finish, and it
 * is the same three requests the live screen makes.
 *
 * Runs inside `page.evaluate`, so it is the signed-in browser making the
 * calls and the account's own rules apply.
 */

import type { Page } from "@playwright/test"

export interface SeedSet {
  exercise: string
  weightKg: number
  reps: number
  setNumber: number
  kind?: "warmup" | "working" | "amrap" | "backoff" | "drop"
}

export interface SeedWorkout {
  /** When it happened, as an instant. Defaults to now. */
  startedAt?: string
  /** Defaults to an hour after the start. */
  endedAt?: string
  sets: SeedSet[]
  sessionType?: "weights" | "cardio" | "mobility" | "yoga" | "running"
  intensity?: number
}

/** What went wrong, named — a seed that half-worked is worse than one that failed. */
export class SeedFailed extends Error {}

/**
 * Write one finished workout and return its id.
 *
 * Any open workout is discarded first: only one may be open at a time, and a
 * leftover from an earlier spec would refuse every start in this one.
 */
export async function seedFinishedWorkout(page: Page, spec: SeedWorkout): Promise<string> {
  const result = await page.evaluate(async (s: SeedWorkout) => {
    const open = await (await fetch("/api/workouts/live")).json()
    if (open) await fetch(`/api/workouts/${open.id}`, { method: "DELETE" })

    const startedAt = s.startedAt ?? new Date().toISOString()
    const endedAt = s.endedAt ?? new Date(new Date(startedAt).getTime() + 3600_000).toISOString()

    const started = await fetch("/api/workouts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ clientKey: `seed-${Date.now()}-${Math.random()}`, startedAt }),
    })
    if (!started.ok) {
      return { error: `start ${started.status}: ${JSON.stringify(await started.json().catch(() => null))}` }
    }
    const workout = (await started.json()) as { id: string }

    for (const set of s.sets) {
      const res = await fetch(`/api/workouts/${workout.id}/sets`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          exerciseId: null,
          exercise: set.exercise,
          // The API takes kilograms here; the live screen converts before
          // sending, which is the one place a unit is allowed to change.
          weight: set.weightKg,
          reps: set.reps,
          setNumber: set.setNumber,
          kind: set.kind ?? "working",
        }),
      })
      if (!res.ok) {
        return { error: `set ${set.setNumber}: ${JSON.stringify(await res.json().catch(() => null))}` }
      }
    }

    const finished = await fetch(`/api/workouts/${workout.id}/finish`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        startedAt,
        endedAt,
        intensity: s.intensity ?? 3,
        sessionType: s.sessionType ?? "weights",
      }),
    })
    if (!finished.ok) {
      return { error: `finish: ${JSON.stringify(await finished.json().catch(() => null))}` }
    }
    return { id: workout.id }
  }, spec)

  if ("error" in result && result.error) throw new SeedFailed(result.error)
  return (result as { id: string }).id
}

/** Delete every workout whose sets name a lift starting with `prefix`. */
export async function deleteWorkoutsNamed(page: Page, prefix: string): Promise<void> {
  await page.evaluate(async (p: string) => {
    const logs = (await (await fetch("/api/health/workout?days=3650&include=sets")).json()) as {
      id: string
      sets?: { exercise: string }[]
    }[]
    for (const l of logs) {
      if ((l.sets ?? []).some((s) => s.exercise.startsWith(p))) {
        await fetch(`/api/health/workout?id=${l.id}`, { method: "DELETE" })
      }
    }
  }, prefix)
}
