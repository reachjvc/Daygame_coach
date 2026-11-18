import type { Milestone } from "../shared/logic"

/** Copy B items (the three rows seen). Example durations are made up. */
export const B_ITEMS: readonly Milestone[] = [
  { key: "heart", exampleDays: 2 },
  { key: "co", exampleDays: 4 },
  { key: "cancer", exampleDays: 60 },
] as const
