"use client"

/**
 * THE TRACKING CARD'S ONE REQUEST.
 *
 * The card fetched three times in sequence from inside the component, with no
 * "settled" flag — so its state was computed with `live = null` until the
 * third answer landed, and the button FLIPPED from Start to Resume in front of
 * whoever was reaching for it.
 *
 * Built on `src/shared/useLoad.ts`, the loader the architecture rule names,
 * rather than a second one of its own: three states, and nothing
 * decision-bearing exists until `ready`.
 */

import { useLoad } from "@/src/shared/useLoad"
import { TRAINING_DOOR_API } from "@/src/shared/trainingRoutes"
import type { TrainingDoorFacts } from "../types"

/**
 * A body this cannot read is not data.
 *
 * Throwing here is what puts a non-JSON reply, a 500's error object and a
 * shape from some future version all into `failed` — where the card says it
 * could not load your training, rather than into `ready` where it would say
 * you have no program.
 */
export function parseTrainingDoorFacts(body: unknown): TrainingDoorFacts {
  const facts = body as Partial<TrainingDoorFacts> | null
  if (
    !facts ||
    typeof facts !== "object" ||
    typeof facts.timezone !== "string" ||
    typeof facts.todayDate !== "string" ||
    typeof facts.todayWeekday !== "number" ||
    !Array.isArray(facts.programs) ||
    !Array.isArray(facts.recentlyFinished)
  ) {
    throw new Error("The training door answered with something unreadable")
  }
  return facts as TrainingDoorFacts
}

export function useTrainingDoor() {
  return useLoad<TrainingDoorFacts>(TRAINING_DOOR_API, parseTrainingDoorFacts)
}
