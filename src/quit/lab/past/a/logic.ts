export type StepId =
  | "howlong"
  | "review1"
  | "freq"
  | "mirror"
  | "last"
  | "longest"
  | "review2"
  | "pain"
  | "therapist"
  | "told"
  | "who"
  | "consider"
  | "open"
  | "acct"
  | "reflect"
  | "group"
  | "time"
  | "zoom"
  | "status"
  | "age"
  | "name"
  | "gate"

export interface Answers {
  choice: Record<string, number>
  freq: string
  longest: string
  last: string | null
  name: string
}

export const EMPTY_ANSWERS: Answers = { choice: {}, freq: "", longest: "", last: null, name: "" }

/** Index of "Yes" in the told question. */
export const TOLD_YES = 0

/** The screens in order; the follow-up after "told anyone" depends on the answer. */
export function sequence(a: Answers): StepId[] {
  const told = a.choice.told
  const follow: StepId = told === undefined || told === TOLD_YES ? "who" : "consider"
  return [
    "howlong",
    "review1",
    "freq",
    "mirror",
    "last",
    "longest",
    "review2",
    "pain",
    "therapist",
    "told",
    follow,
    "open",
    "acct",
    "reflect",
    "group",
    "time",
    "zoom",
    "status",
    "age",
    "name",
    "gate",
  ]
}

const CHOICE: StepId[] = ["howlong", "therapist", "told", "who", "open", "acct", "group", "time", "zoom", "status", "age"]

/** A typed count: digits, whole or decimal, not negative. */
export function validCount(raw: string): boolean {
  return /^\d+(\.\d+)?$/.test(raw.trim())
}

/** Whether Continue is active on this screen. */
export function canContinue(step: StepId, a: Answers): boolean {
  if (CHOICE.includes(step)) return a.choice[step] !== undefined
  if (step === "freq") return validCount(a.freq)
  if (step === "longest") return validCount(a.longest)
  if (step === "name") return a.name.trim().length > 0
  return true
}

/** Fill of the progress bar, 0 to 100. */
export function barPercent(index: number, total: number): number {
  if (total <= 1) return 100
  return Math.round(((index + 1) / total) * 100)
}

/** Local date as yyyy-mm-dd. */
export function dateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
}
