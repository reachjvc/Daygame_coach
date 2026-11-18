import { addDays, daysBetween } from "../shared/logic"

export type Kind = "oneshot" | "ongoing"
export type Recipient = "anti" | "charity" | "friend" | "platform"
export type Verdict = "awaiting" | "confirmed" | "overturned"

export interface Report {
  /** 1-based reporting period this report covers. */
  period: number
  count: number
  note: string
  verdict: Verdict
  /** Day key the report was sent. */
  day: string
}

export interface JournalMsg {
  id: string
  who: "me" | "supporter"
  text: string
  photo?: boolean
}

export interface Commitment {
  id: string
  goal: string
  category: string
  start: string
  end: string
  kind: Kind
  /** Required count for each reporting period, typed by the member. Empty until set. */
  required: string
  referee: { contact: string; status: "none" | "invited" }
  supporters: string[]
  openToCommunity: boolean
  /** Money per period the member chose. 0 means no stake. Inert: the site never holds money. */
  stake: number
  recipient: Recipient | null
  recipientContact: string
  reports: Report[]
  journal: JournalMsg[]
  privacy: { who: string; media: string }
}

/** Number of reporting periods: one for a one-shot, otherwise one per started week. */
export function periodCount(c: Pick<Commitment, "kind" | "start" | "end">): number {
  if (c.kind === "oneshot") return 1
  return Math.max(1, Math.ceil(daysBetween(c.start, c.end) / 7))
}

/** Total money put on the line (inert preview). */
export const totalStake = (c: Pick<Commitment, "kind" | "start" | "end" | "stake">) => c.stake * periodCount(c)

/** A period is a success when the count met the requirement and the referee did not overturn it. */
export function isSuccess(r: Report, required: string): boolean {
  const need = Number(required)
  return r.verdict !== "overturned" && required.trim() !== "" && Number.isFinite(need) && r.count >= need
}

/** Incentive tiles: saved, forfeited, remaining, total. */
export function incentives(c: Commitment) {
  const total = totalStake(c)
  const ok = c.reports.filter((r) => isSuccess(r, c.required)).length
  const bad = c.reports.length - ok
  const saved = ok * c.stake
  const forfeited = Math.max(0, bad) * c.stake
  return { saved, forfeited, remaining: Math.max(0, total - saved - forfeited), total }
}

/** Day of the commitment, 1-based, clamped to its length. */
export function dayOf(c: Pick<Commitment, "start" | "end">, today: string): number {
  const len = Math.max(1, daysBetween(c.start, c.end))
  return Math.min(len, daysBetween(c.start, today) + 1)
}

export const lengthDays = (c: Pick<Commitment, "start" | "end">) => Math.max(1, daysBetween(c.start, c.end))

/** Progress of the commitment in whole percent. */
export const progressPct = (c: Pick<Commitment, "start" | "end">, today: string) => Math.round((dayOf(c, today) / lengthDays(c)) * 100)

/** Day key the next report is due: weekly for ongoing, the last day for one-shot. */
export function nextReportDue(c: Commitment): string {
  if (c.kind === "oneshot") return c.end
  const due = addDays(c.start, 7 * (c.reports.length + 1))
  return due > c.end ? c.end : due
}

/** True once every report is in. */
export const allReported = (c: Commitment) => c.reports.length >= periodCount(c)

export const isReportDue = (c: Commitment, today: string) => !allReported(c) && nextReportDue(c) <= today

export interface Pie {
  success: number
  failed: number
}
export const pie = (c: Commitment): Pie => {
  const ok = c.reports.filter((r) => isSuccess(r, c.required)).length
  return { success: ok, failed: c.reports.length - ok }
}

/** Example commitment: started two days ago, one stake step, a referee and two supporters. */
export function exampleCommitment(today: string): Commitment {
  return {
    id: "ex1",
    goal: "Example goal",
    category: "Health and lifestyle",
    start: addDays(today, -2),
    end: addDays(today, 40),
    kind: "ongoing",
    required: "5",
    referee: { contact: "referee@example.test", status: "invited" },
    supporters: ["supporter-one@example.test", "supporter-two@example.test"],
    openToCommunity: false,
    stake: 4,
    recipient: "charity",
    recipientContact: "",
    reports: [],
    journal: [{ id: "j1", who: "supporter", text: "Example cheer from a supporter." }],
    privacy: { who: "Everyone", media: "Everyone" },
  }
}
