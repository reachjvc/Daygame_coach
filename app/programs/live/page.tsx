/**
 * The workout you are in the middle of.
 *
 * Resolved on the server so the first paint already has the sets on it — the
 * same reason `/programs` is a server component. Somebody standing at a rack
 * should not watch a spinner decide what they are doing.
 */

import { redirect } from "next/navigation"
import { requireAuth } from "@/src/db/auth"
import { getLiveWorkout, lastSetsForLifts, prescriptionForDay } from "@/src/db/workoutRepo"
import { getEnrollmentById } from "@/src/db/programRepo"
import { getUserTimezone } from "@/src/db/settingsRepo"
import { enrollmentName, getProgram } from "@/src/programs/data/catalog"
import { effectiveProgram } from "@/src/programs/customize"
import { addedLiftId, missRulesFor } from "@/src/programs/programsService"
import type { MissRule } from "@/src/programs/types"
import { LiveWorkoutScreen } from "@/src/programs/components/live/LiveWorkoutScreen"
import type { PlateSetup, SessionPrescription, UnitSystem } from "@/src/programs/types"

export default async function LiveWorkoutPage() {
  const auth = await requireAuth()
  if (!auth.success) redirect("/auth/login")

  const live = await getLiveWorkout(auth.userId)
  if (!live) redirect("/programs")

  let prescription: SessionPrescription | null = null
  /**
   * THE WORKOUT ALREADY KNOWS ITS OWN UNIT, so it is not guessed here.
   *
   * This defaulted to "kg" and was only overwritten inside the branch for a
   * workout attached to a program. A workout started with no program — the
   * whole point of "Start a workout now" — therefore always showed kilograms,
   * while the server stored what was typed as the profile's unit. A pounds
   * lifter typed 225, the boxes said "kg", and the set was stored as 102 kg:
   * the screen and the database disagreed about what the number meant.
   */
  // ONE READ, for every workout — the loose ones too, which the program branch
  // below never reaches. Every time on the live screen and its finish sheet is
  // shown and read in this zone.
  const timezone = await getUserTimezone(auth.userId)

  let unit: UnitSystem = live.unit
  let plates: PlateSetup | undefined
  let programName: string | null = null
  let missRules: Record<string, MissRule> | undefined
  const lastTime: Record<string, { weight: number; reps: number }[]> = {}

  if (live.enrollmentId) {
    const resolved = await prescriptionForDay(auth.userId, live.enrollmentId, live.dayId ?? undefined)
    prescription = resolved.prescription
    unit = resolved.unit
    plates = resolved.plates
    /**
     * NAMED BY THE ENROLLMENT, not by the catalogue entry behind it.
     *
     * Every self-built week is `program_id: "custom"`, whose catalogue entry is
     * the shared shell called "Your own program" — so the header above a
     * session read "Your own program" for three different weeks at once, and
     * for the one you had carefully named.
     */
    const enrollment = await getEnrollmentById(auth.userId, live.enrollmentId)
    programName = enrollment ? enrollmentName(enrollment) : null
    /**
     * WHAT A MISS COSTS, per lift, read from the program and the misses
     * already on record.
     *
     * The finish sheet said "these count as misses and will bring the weight
     * down" over every short lift — false two times in three on StrongLifts,
     * whose rule is three consecutive misses before a deload. Computed here
     * so the sentence and the engine read the same two numbers.
     */
    if (enrollment) {
      const program = getProgram(enrollment.program_id)
      if (program) missRules = missRulesFor(effectiveProgram(program, enrollment.customSchedule), enrollment)
    }
  }

  /**
   * WHAT EVERY LIFT ON THIS SCREEN DID LAST TIME — including the ones the
   * program never asked for.
   *
   * This whole read used to sit inside `if (live.enrollmentId)` and go through
   * that one enrollment's session logs, so the PREVIOUS column was empty for a
   * workout started off a program (the entire point of "Start a workout now"),
   * for a lift added because the rack was taken, and for a lift swapped in —
   * which is exactly when a lifter has least idea what they did last time.
   *
   * The lifts asked for are the ones the screen will draw: prescribed, with a
   * swap replacing the lift it stands in for (same id derivation the screen
   * uses — `addedLiftId`), plus anything added on the day.
   */
  const swapped = live.adjustments.swapped ?? {}
  const lifts = [
    ...(prescription?.exercises ?? []).map((ex) => {
      const to = swapped[ex.exerciseId]
      return to
        ? { key: addedLiftId(to.name), name: to.name, libraryId: to.libraryId ?? null }
        : { key: ex.exerciseId, name: ex.name }
    }),
    ...(live.adjustments.added ?? []).map((a) => ({
      key: a.exerciseId,
      name: a.name,
      libraryId: a.libraryId ?? null,
    })),
  ]

  /**
   * A READ THAT FAILED IS SAID OUT LOUD, not shown as an empty column.
   *
   * The old read discarded its query error, so a broken read and a lift never
   * done looked identical — blank. Blank is a claim ("you have not done this"),
   * and it is the one claim this column must never make wrongly.
   */
  let previousUnavailable = false
  try {
    const sessions = await lastSetsForLifts(auth.userId, lifts, unit)
    for (const lift of lifts) {
      // Warm-ups are not what you did last time; they are what you did before
      // what you did last time.
      const sets = (sessions[lift.key]?.[0]?.sets ?? []).filter((s) => s.kind !== "warmup")
      if (sets.length > 0) lastTime[lift.key] = sets.map((s) => ({ weight: s.weight, reps: s.reps }))
    }
  } catch (e) {
    console.error("previous sets:", e)
    previousUnavailable = true
  }

  return (
    <LiveWorkoutScreen
      initial={live}
      prescription={prescription}
      programName={programName}
      unit={unit}
      plates={plates}
      lastTime={lastTime}
      previousUnavailable={previousUnavailable}
      missRules={missRules}
      timezone={timezone}
    />
  )
}
