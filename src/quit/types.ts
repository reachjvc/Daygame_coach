import type { ViceEndingId } from "@/src/vice/types"

/** Every Black Box ending family a belief may point to. */
export const BLACKBOX_ENDING_IDS = ["fine", "justone", "drink", "stress", "faded", "other"] as const satisfies readonly ViceEndingId[]

export const QUIT_ADDICTION_IDS = ["nicotine", "weed", "porn", "alcohol", "scrolling", "gambling"] as const
export type QuitAddictionId = (typeof QUIT_ADDICTION_IDS)[number]

/** The tool ids of the menu (Plans/quit-tool.md, Part 1 table). */
export const QUIT_TOOL_IDS = [
  "beliefs",
  "gives",
  "past",
  "cost",
  "how",
  "curve",
  "ifthen",
  "clear",
  "stake",
  "tell",
  "sos",
  "symptoms",
  "checkin",
  "lesson",
  "record",
  "slip",
  "identity",
  "besides",
  "coach",
] as const
export type QuitToolId = (typeof QUIT_TOOL_IDS)[number]

/** RULEBOOK rule 3 tags. */
export const SEVERITIES = [
  "dependent",
  "disorder",
  "treatment",
  "resolved",
  "self-hooked",
  "heavy",
  "users",
  "screened",
] as const
export type Severity = (typeof SEVERITIES)[number]
export type Evidence = "strong" | "moderate" | "weak" | "none"

export const NEED_IDS = ["relief", "reward", "boredom", "connection", "sleep", "focus", "confidence", "substance"] as const
export type QuitNeedId = (typeof NEED_IDS)[number]

export const TODO = "TODO" as const
export type Todo = typeof TODO
export type Draftable<T> = T | Todo
export const isTodo = (x: unknown): x is Todo => x === TODO

export interface QuitRef {
  cite: string
  url: string
  pmid?: string
  quote?: string
  fetched?: boolean
  fetchedOn?: string
  /** True when the quote was cut to its first 30 words. */
  quoteTrimmed?: boolean
}

export interface Check {
  by: string
  on: string
  verdict: "ok" | "fix" | "drop"
  notes?: string
}

export interface QuitNumber {
  kind: string
  big: string
  headline: string
  mirror: string
  severity: Severity
  counted: string
  basis: { design: string; who: string; n: string; where: string; when: string; measured: string }
  caveat: string
  projection?: boolean
  pooled?: boolean
  checked?: "hooked" | "not"
  timeIsResult?: boolean
  weak?: string | null
  ref: QuitRef
  alsoRef?: QuitRef[]
  check?: Check
}

export interface QuitBelief {
  id: string
  kind: "stuck" | "hard" | "need" | "harmless" | "moderation" | "identity"
  scene: Draftable<string>
  short: Draftable<string>
  /** A QuitNeed id. */
  need: Draftable<string>
  limiting: string
  counterpart: string
  whenThought: string
  test: Draftable<string>
  proof: string
  severity: Severity
  counted: string | null
  refs: QuitRef[]
  weak?: string | null
  ownWords?: boolean
  /** The Black Box ending family a thought of this belief belongs to; absent means "other". */
  blackBoxEnding?: ViceEndingId
  /** Set when the planner changed an imported belief; says what and why. */
  editNote?: string
  check?: Check
}

export interface QuitFact {
  id: string
  statement: string
  answer: boolean
  explain: string
  severity: Severity
  counted: string | null
  refs: QuitRef[]
  check?: Check
}

export interface QuitSwap {
  id: string
  text: string
  evidence: Evidence
  refs: QuitRef[]
}

export interface QuitNeed {
  id: QuitNeedId
  name: string
  swaps: QuitSwap[]
}

export interface QuitEnding {
  id: string
  label: string
  blackBoxEnding: ViceEndingId
}

export interface QuitOption {
  id: string
  label: string
}

export interface QuitResponse {
  id: string
  text: string
}

export interface QuitClearItem {
  id: string
  text: string
  removes: string
  link?: string
}

export interface QuitSymptomCourse {
  symptom: string
  peak: string | null
  lasts: string
  text: string
  evidence: Evidence
  refs: QuitRef[]
  check?: Check
}

export interface QuitSymptomHelp {
  symptom: string
  text: string
  evidence: Evidence
  refs: QuitRef[]
  /** Set when the planner changed the row; says what and why. */
  editNote?: string
}

export interface QuitCostSwap {
  usd: number
  text: string
}

export interface QuitBesides {
  id: string
  text: string
  link?: string
  refs?: QuitRef[]
}

export interface QuitFeltBin {
  label: string
  from: number
  to: number
  n: number
  symptoms: Record<string, number>
  positives: Record<string, number>
}

export interface QuitFelt {
  forums: string[]
  years: string
  postsUsed: number
  postsSampled: number
  bias: string[]
  bins: QuitFeltBin[]
}

export interface QuitLesson {
  /** -3..-1 prep, 1..90 */
  day: number
  beliefId: string
  title: string
  body: string
  exercise: string
  refs: QuitRef[]
}

export interface QuitBand {
  id: "free" | "some" | "hooked"
  /** Count of beliefs rated 4 or 5. */
  min: number
  max: number
  label: string
  text: string
  link?: string
}

export interface QuitPlanStep {
  title: string
  text: string
  do: Draftable<string[]>
  proof?: {
    text: string
    refs: Draftable<QuitRef>[]
    severity: Draftable<Severity>
    counted?: string
    weak?: string
    ownWords?: boolean
  }
}

export interface QuitDanger {
  level: "none" | "danger"
  line: Draftable<string> | null
  refs: QuitRef[]
}

export interface QuitUnit {
  id: string
  one: string
  many: string
  defaultPriceUsd: number | null
  defaultMinutesPerUnit: number | null
  priceRefs: QuitRef[]
}

export interface QuitAddictionFull {
  id: QuitAddictionId
  name: string
  units: QuitUnit[]
  costKind: "money" | "money+time" | "time" | "money+hours"
  danger: QuitDanger
  footerNote: { text: string; refs: Draftable<QuitRef>[] } | null
  hope: QuitNumber | null
  numbers: QuitNumber[]
  keyFacts: string[]
  beliefs: QuitBelief[]
  facts: QuitFact[]
  needs: QuitNeed[]
  endings: QuitEnding[]
  helped: QuitOption[]
  riskyMoments: QuitOption[]
  responses: QuitResponse[]
  clearOut: QuitClearItem[]
  symptomWords: Record<string, string>
  symptomHelp: QuitSymptomHelp[]
  symptomCourse: QuitSymptomCourse[]
  symptomCourseNote: string
  tapeForward: string[]
  costSwaps: QuitCostSwap[]
  besides: QuitBesides[]
  felt: QuitFelt | null
  lessons: QuitLesson[]
  bands: QuitBand[]
  catch: string
  planSteps: QuitPlanStep[]
}

/** Any top-level field may be "TODO" in a draft (non-live) file. */
export type QuitAddiction = {
  [K in keyof QuitAddictionFull]: K extends "id" | "name" ? QuitAddictionFull[K] : Draftable<QuitAddictionFull[K]>
}

export interface QuitOffer {
  coachingPriceUsd: number
  days: number
  guaranteeLine: string
  paymentLinkUrl: string | null
  donationLine: string | null
}

/** Reader text of the menu screen (`src/quit/data/menu.json`). */
export interface QuitMenuTool {
  id: QuitToolId
  /** `{lies}` is replaced by the addiction's `lies` line. */
  name: string
  line: string
  /** A number means minutes; a string is shown as is; null shows nothing. */
  minutes: number | string | null
  account: "none" | "free" | "paid"
  wave: 1 | 2 | 3
  href?: string
}

export interface QuitMenu {
  addictions: Record<QuitAddictionId, { title: string; lies: string; switcher: string }>
  sosBar: string
  accountPills: { free: string; paid: string }
  coming: Record<"2" | "3", string>
  groups: { id: string; name: string; tools: QuitMenuTool[] }[]
  newHere: { text: string; tool: QuitToolId }
}

/** Reader text of the shared frame (`src/quit/data/frame.json`). */
export interface QuitFrameText {
  siteName: string
  back: string
  cravingNow: string
  freeTools: string
  coaching: string
  privacy: string
  sources: string
  comingSoon: string
  backToMenu: string
  notFoundTitle: string
  notFoundText: string
  notFoundLink: string
  pickTitle: string
  pickLine: string
  comingLater: string
  preview: string
  switcherLabel: string
  minutes: string
  progress: string
}

/** What a tool component receives. */
export interface ToolProps {
  addiction: QuitAddictionId
  data: QuitAddiction
  present: boolean
}
