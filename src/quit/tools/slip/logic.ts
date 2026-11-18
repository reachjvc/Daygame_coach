export const SLIP_WHEN = ["today", "yesterday", "week"] as const
export const MAX_OWN = 80
export const OTHER = "other"

export interface SlipState {
  done: number
  when: (typeof SLIP_WHEN)[number] | null
  ending: string | null
  /** A belief id, or "other". */
  told: string | null
  ownWords: string
  newDay1: "today" | "tomorrow" | null
  /** Black Box report id of the lapse filed from this run. */
  reportId: string | null
}

export const EMPTY_SLIP: SlipState = { done: 0, when: null, ending: null, told: null, ownWords: "", newDay1: null, reportId: null }

/** The sentence of the plan's third step that starts "Every day you keep", or null. */
export function keepLine(planSteps: { text: string }[] | "TODO" | null | undefined): string | null {
  if (!planSteps || planSteps === "TODO") return null
  const text = planSteps[2]?.text
  if (typeof text !== "string") return null
  const m = text.match(/Every day you keep[^.!?]*[.!?]?/)
  return m ? m[0].trim() : null
}

/** First screen without an answer (1 to 4; 4 is the result). */
export function firstUnanswered(s: SlipState): number {
  return Math.min(s.done, 3) + 1
}
