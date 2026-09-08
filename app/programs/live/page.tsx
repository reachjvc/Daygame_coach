/**
 * The workout you are in the middle of.
 *
 * Resolved on the server so the first paint already has the sets on it — the
 * same reason `/programs` is a server component. Somebody standing at a rack
 * should not watch a spinner decide what they are doing.
 */

import { redirect } from "next/navigation"
import { requireAuth } from "@/src/db/auth"
import { getLiveWorkout, prescriptionForDay } from "@/src/db/workoutRepo"
import { getSessionLogs } from "@/src/db/programRepo"
import { getProgram } from "@/src/programs/data/catalog"
import { LiveWorkoutScreen } from "@/src/programs/components/live/LiveWorkoutScreen"
import { lastSetsPerLift } from "@/src/programs/programsService"
import type { PlateSetup, SessionPrescription, UnitSystem } from "@/src/programs/types"

export default async function LiveWorkoutPage() {
  const auth = await requireAuth()
  if (!auth.success) redirect("/auth/login")

  const live = await getLiveWorkout(auth.userId)
  if (!live) redirect("/programs")

  let prescription: SessionPrescription | null = null
  let unit: UnitSystem = "kg"
  let plates: PlateSetup | undefined
  let programName: string | null = null
  let lastTime: Record<string, { weight: number; reps: number }[]> = {}

  if (live.enrollmentId) {
    const resolved = await prescriptionForDay(auth.userId, live.enrollmentId, live.dayId ?? undefined)
    prescription = resolved.prescription
    unit = resolved.unit
    plates = resolved.plates
    programName = getProgram(prescription.programId)?.name ?? null
    // What each lift did last time, so the number you are deciding against sits
    // beside the box you are typing in.
    lastTime = lastSetsPerLift(await getSessionLogs(auth.userId, live.enrollmentId))
  }

  return (
    <LiveWorkoutScreen
      initial={live}
      prescription={prescription}
      programName={programName}
      unit={unit}
      plates={plates}
      lastTime={lastTime}
    />
  )
}
