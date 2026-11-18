import type { Milestone } from "../shared/logic"

/** Copy C organ rings. Example durations are made up. */
export const C_ORGANS: readonly Milestone[] = [
  { key: "lungs", exampleDays: 33 },
  { key: "heart", exampleDays: 51 },
  { key: "brain", exampleDays: 46 },
] as const

/** Achievement cards: reached once their example duration has passed. */
export const C_CARDS: readonly Milestone[] = [
  { key: "heartCard", exampleDays: 20 },
  { key: "medal", exampleDays: 20 },
] as const

export const C_RING_CLASS = {
  lungs: "stroke-orange-400",
  heart: "stroke-emerald-400",
  brain: "stroke-sky-400",
} as const
