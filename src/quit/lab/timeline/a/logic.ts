import type { Milestone } from "../shared/logic"

/** Copy A items, in page order. Example durations are made up (never health figures). */
export const A_ITEMS: readonly Milestone[] = [
  { key: "pulse", exampleDays: 5 },
  { key: "oxygen", exampleDays: 9 },
  { key: "co", exampleDays: 14 },
  { key: "lung", exampleDays: 90 },
  { key: "attack", exampleDays: 60 },
  { key: "disease", exampleDays: 40 },
] as const

/** The three risk items shown on the dashboard card. */
export const A_CARD_KEYS = ["lung", "attack", "disease"] as const
