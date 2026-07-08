/**
 * Splits & Mobility — static-stretch flexibility progression.
 *
 * Source: standard static-stretching guidance for splits/mobility (hold a deep
 * stretch, progress the hold over time) — durations re-implemented as data.
 * Done ~4×/week. Each stretch starts at a 30s hold and builds toward a 90–120s
 * hold; when you can hold the current duration for all sets, it bumps up. Static
 * holds, no equipment.
 */

import type { HoldExercise, ProgramDefinition } from "../../types"

const hold = (id: string, name: string, startSec: number, targetSec: number, incrementSec: number, sets: number, perSide = false): HoldExercise => ({
  id, name, metricType: "hold_range", sets, startSec, targetSec, incrementSec, perSide,
})

const stretches: HoldExercise[] = [
  hold("flx_front_split", "Front split", 30, 120, 5, 2, true),
  hold("flx_side_split", "Side split (middle)", 30, 120, 5, 2),
  hold("flx_pancake", "Seated pancake fold", 30, 90, 5, 2),
  hold("flx_squat", "Deep squat hold", 30, 120, 10, 2),
  hold("flx_bridge", "Bridge / backbend", 20, 60, 5, 2),
  hold("flx_shoulder", "Shoulder dislocate hold", 20, 60, 5, 2),
]

export const splitsMobility: ProgramDefinition = {
  id: "splits-mobility",
  discipline: "flexibility",
  metricType: "hold_range",
  name: "Splits & Mobility",
  blurb: "Static-stretch routine, ~4×/week, no equipment. Build toward front/side splits, a flat deep squat and a clean bridge — holds deepen as you progress.",
  sourceCitation: "Standard static-stretching splits & mobility routine (hold durations re-implemented as data)",
  popularityRank: 1,
  levels: [{ id: "beginner", label: "Beginner" }],
  schedule: {
    kind: "hold_routine",
    days: [{ id: "mobility", label: "Mobility", exercises: stretches }],
  },
}
