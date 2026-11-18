import type { Milestone } from "../shared/logic"

/** Copy E symptom cards (the two seen). Example durations are made up. */
export const E_ITEMS: readonly Milestone[] = [
  { key: "dreams", exampleDays: 31 },
  { key: "chills", exampleDays: 26 },
] as const
