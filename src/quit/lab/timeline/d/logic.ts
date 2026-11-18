import type { Milestone } from "../shared/logic"

/** Copy D cards (the three seen). Example durations are made up. */
export const D_ITEMS: readonly Milestone[] = [
  { key: "lung", exampleDays: 14 },
  { key: "blood", exampleDays: 33 },
  { key: "skin", exampleDays: 49 },
] as const
