/**
 * Workout split templates for the vision-plan lab (M11) — the standard ways
 * people structure a training week. Picking one names the habit's days and sets
 * a sensible frequency; everything stays editable (rename days, add/remove,
 * reorder, change days/week).
 */

import type { WorkoutSplit } from "../types"

export const WORKOUT_SPLITS: WorkoutSplit[] = [
  { id: "fullbody", label: "Full Body", days: ["Full Body A", "Full Body B", "Full Body C"], recommendedPerWeek: 3 },
  { id: "upper-lower", label: "Upper / Lower", days: ["Upper A", "Lower A", "Upper B", "Lower B"], recommendedPerWeek: 4 },
  { id: "ppl", label: "Push / Pull / Legs", days: ["Push", "Pull", "Legs"], recommendedPerWeek: 3 },
  { id: "ppl6", label: "PPL ×6", days: ["Push A", "Pull A", "Legs A", "Push B", "Pull B", "Legs B"], recommendedPerWeek: 6 },
  { id: "bodypart", label: "Body-part split", days: ["Chest", "Back", "Legs", "Shoulders", "Arms"], recommendedPerWeek: 5 },
  { id: "custom", label: "Custom", days: ["Day A", "Day B"], recommendedPerWeek: 2 },
]
