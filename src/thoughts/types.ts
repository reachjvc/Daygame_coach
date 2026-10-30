/**
 * THOUGHT FREQUENCIES, AS THE APP SEES IT.
 *
 * Plans/thought.md. A thought is one wording, stored once; a log is one "it
 * happened"; a reframe is a rewritten version written after a few days. Counts
 * are never stored: the database computes them from the logs (`thought_counts`),
 * because a read is capped at 1,000 rows and one thought can pass that in two
 * weeks of reminders.
 */

/** How a log was made. `prompt` = from the reminder's sheet; `prompt-action` = a button on the notification itself. */
export const LOG_SOURCES = ["tap", "typed", "prompt", "prompt-action"] as const
export type LogSource = (typeof LOG_SOURCES)[number]

export interface ThoughtCounts {
  today: number
  week: number
  month: number
  total: number
  /** ISO instant of the first and last log, or null when it has none yet. */
  firstAt: string | null
  lastAt: string | null
}

export interface Reframe {
  id: string
  thoughtId: string
  text: string
  /** "How true does the old thought feel", 0-100. Null = not answered. */
  beliefBefore: number | null
  beliefAfter: number | null
  evidence: string
  friend: string
  createdAt: string
  updatedAt: string
}

export interface Thought {
  id: string
  text: string
  pinned: boolean
  archived: boolean
  createdAt: string
  counts: ThoughtCounts
  /** The newest reframe, which is the current one; null when never reframed. */
  reframe: Reframe | null
  /** How many reframes it has had, the current one included. */
  reframeCount: number
}

/** Interval choices (Q4). The database refuses any other value. */
export const INTERVAL_CHOICES = [5, 10, 15, 20, 30, 45, 60, 90, 120] as const
export type IntervalMinutes = (typeof INTERVAL_CHOICES)[number]

/**
 * The person's choices. Times are minutes after midnight in their own wall
 * clock; the zone is `profiles.timezone`. `activeDays` is a bit set, bit 0 =
 * Monday ... bit 6 = Sunday.
 */
export interface ThoughtSettings {
  remindersOn: boolean
  intervalMinutes: IntervalMinutes
  /** Both null = no quiet hours. May span midnight (1320 -> 480 is 22:00-08:00). */
  quietStart: number | null
  quietEnd: number | null
  activeDays: number
  pausedUntil: string | null
  showThoughts: boolean
  reframeAfterDays: number
}

export const DEFAULT_SETTINGS: ThoughtSettings = {
  remindersOn: false,
  intervalMinutes: 15,
  quietStart: 22 * 60,
  quietEnd: 8 * 60,
  activeDays: 127,
  pausedUntil: null,
  showThoughts: false,
  reframeAfterDays: 3,
}

/** One log as the client sends it. `id` is minted on the device (R5). */
export interface LogInput {
  id: string
  /** Null for a "nothing notable" answer. */
  thoughtId: string | null
  at: string
  source: LogSource
  promptId: string | null
}

/** What the page reads on load. */
export interface ThoughtsView {
  thoughts: Thought[]
  settings: ThoughtSettings
  timezone: string
  /** "Last reminder delivered at": the newest send the push service accepted. */
  lastDeliveredAt: string | null
}
