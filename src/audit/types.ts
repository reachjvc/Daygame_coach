/**
 * THE TIME & ENERGY AUDIT'S TYPES (Plans/energy-audit.md).
 *
 * A RUN is one audit of up to 14 days. A QUARTER is 15 minutes on the clock
 * (:00, :15, :30, :45); the database calls an answered quarter a "slot", and
 * so does the code that talks to it. Words shown to a person say "quarter".
 */

/** 1-7: energy (1 takes my energy, 4 neutral, 7 gives me energy) or growth (1 ruins my life, 4 neither, 7 builds my life). */
export type ScaleValue = 1 | 2 | 3 | 4 | 5 | 6 | 7

export const SCALE_VALUES: readonly ScaleValue[] = [1, 2, 3, 4, 5, 6, 7]

/** Where an answer came from: typed in the app, filled in later from the Day list, or "Same as before". */
export type AnswerSource = "app" | "later" | "same"

export const ANSWER_SOURCES: readonly AnswerSource[] = ["app", "later", "same"]

/** What the person decides for each activity in the review. */
export type ReviewChoice = "more" | "keep" | "handoff" | "cut" | "change"

export const REVIEW_CHOICES: readonly ReviewChoice[] = ["more", "keep", "handoff", "cut", "change"]

/** What a perfect-week block is for (Plans/perfect-week.md; names in weekService). */
export type WeekKind = "deep" | "workout" | "people" | "batch" | "admin" | "rest"

/** One block of the perfect week: a template, not a date. Day 0 is Monday; start and end are minutes after midnight on the quarter. */
export interface WeekBlock {
  id: string
  day: number
  start: number
  end: number
  what: string
  kind: WeekKind
}

/** Stored on the run: the choice and the note per activity key (`normalizePhrase` of the activity), and the perfect week planned from it. */
export interface Review {
  choices: Record<string, ReviewChoice>
  notes: Record<string, string>
  week: WeekBlock[]
}

export interface AuditRun {
  id: string
  /** ISO instants. */
  startedAt: string
  endsAt: string
  endedAt: string | null
  /** Minutes after midnight in the person's zone, multiples of 15. A start equal to the end means no quiet hours. */
  quietStart: number
  quietEnd: number
  mutedUntil: string | null
  review: Review
  endSentAt: string | null
  /**
   * The zone an audit was lived in, stored beside its review (`review.zone`)
   * when it starts and again at End now, so a later change of the account's
   * zone never rewrites a finished review (alpha p9-review-01). An open audit
   * still follows the account's zone (`runZone`). Null or left out: none
   * stored (audits from before); `runZone` then uses the account's zone.
   */
  zone?: string | null
}

/** One answered quarter. */
export interface AuditSlot {
  id: string
  runId: string
  /** The quarter's start, an ISO instant on :00/:15/:30/:45. */
  slotAt: string
  activity: string
  energy: ScaleValue
  growth: ScaleValue
  avoiding: boolean
  why: string | null
  source: AnswerSource
  timeEntryId: string | null
}

/** What a phone sends for one quarter. The id is made on the phone, so a resend saves once. */
export interface AuditAnswer {
  id: string
  runId: string
  slotAt: string
  activity: string
  energy: ScaleValue
  growth: ScaleValue
  avoiding: boolean
  why: string | null
  source: AnswerSource
  timeEntryId: string | null
  /**
   * When it was answered, by the phone's clock (the server corrects it by the
   * phone's offset). An answer older than what is stored for its quarter is
   * refused, so an offline phone never overwrites a newer answer from another
   * device. Stored as the row's `updated_at`.
   */
  answeredAt?: string
  /**
   * What the card saw for this quarter when it opened: the stored answer, or
   * null for none (alpha slow-pass-06). The server refuses the write when the
   * quarter holds something else now (another device answered or changed it),
   * and returns what it holds, so the person chooses. Left out only by
   * answers queued before this rule: those keep the older-by-the-clock rule.
   */
  was?: AnswerMark | null
}

/** An answer as one device saw it: enough to tell whether it changed since. */
export interface AnswerMark {
  id: string
  activity: string
  energy: number
  growth: number
  why: string | null
}

/** A Time entry as the audit reads it (never written by the audit). */
export interface TimeEntryForAudit {
  id: string
  description: string
  projectName: string | null
  startedAt: string
  stoppedAt: string | null
}
