/**
 * Time-tracking slice (Toggl Track clone) — all types.
 *
 * Field names mirror Toggl Track API v9 semantics (camelCased for this codebase).
 * The one non-obvious inherited rule: `TimeEntry.duration` is negative while an
 * entry is running, and equals -startEpochSeconds. Real duration of a running
 * entry = nowEpochSeconds + duration. See docs/research/toggl/01-data-model-and-parity.md
 */

/**
 * Ids are made by whichever device creates the thing, not by a counter.
 *
 * A counter works right up until two devices are offline at once: both hand out
 * 101, and on reconnect one of the two entries has to lose. A uuid made on the
 * device cannot collide, so an offline edit is always safe to keep.
 */
export type Id = string
/** ISO 8601 date-time, e.g. 2026-08-10T09:30:00.000Z */
export type IsoDateTime = string
/** Calendar date, YYYY-MM-DD */
export type IsoDate = string

// ---------------------------------------------------------------------------
// Formatting / preferences
// ---------------------------------------------------------------------------

/** classic = 1:30:00, improved = 1:30, decimal = 1.50 */
export type DurationFormat = "classic" | "improved" | "decimal"
export type TimeFormat = "h12" | "h24"
export type DateFormatId =
  | "YYYY-MM-DD"
  | "DD.MM.YYYY"
  | "DD-MM-YYYY"
  | "MM/DD/YYYY"
  | "DD/MM/YYYY"
/** 0 = Sunday … 6 = Saturday */
export type WeekStart = 0 | 1 | 6

export interface UserSettings {
  name: string
  email: string
  durationFormat: DurationFormat
  timeFormat: TimeFormat
  dateFormat: DateFormatId
  weekStart: WeekStart
  timezone: string
  /** Toggl groups identical entries when this is on */
  groupSimilarEntries: boolean
  showTimelineRecorder: boolean
  /** Hides the "this workspace ships with sample data" notice once dismissed */
  demoNoticeDismissed?: boolean
}

// ---------------------------------------------------------------------------
// Workspace / org
// ---------------------------------------------------------------------------

export type RoundingMode = "nearest" | "up" | "down"

export interface RoundingConfig {
  enabled: boolean
  mode: RoundingMode
  /** 1 | 5 | 6 | 10 | 15 | 30 | 60 */
  minutes: number
}

export interface Workspace {
  id: Id
  name: string
  defaultCurrency: string
  defaultHourlyRate: number | null
  defaultLabourCost: number | null
  projectsBillableByDefault: boolean
  onlyAdminsSeeBillableRates: boolean
  rounding: RoundingConfig
  /** Required fields block saving an entry until filled (Toggl: "Required fields") */
  requiredFields: { project: boolean; task: boolean; tag: boolean; description: boolean }
  /** Entries that start on/before this date cannot be edited */
  lockEntriesBefore: IsoDate | null
  timesheetApprovalsEnabled: boolean
  at: IsoDateTime
}

export type MemberRole = "basic" | "manager" | "admin"

export interface Member {
  id: Id
  workspaceId: Id
  name: string
  email: string
  role: MemberRole
  /** Billable rate used when no project/task rate applies */
  hourlyRate: number | null
  /** Internal cost per hour — drives Cost/Profit metrics */
  labourCost: number | null
  groupIds: Id[]
  active: boolean
  /** Local-only flag: exactly one member represents the signed-in user */
  isSelf: boolean
  at: IsoDateTime
}

export interface MemberGroup {
  id: Id
  workspaceId: Id
  name: string
  at: IsoDateTime
}

// ---------------------------------------------------------------------------
// Clients / projects / tasks / tags
// ---------------------------------------------------------------------------

export interface Client {
  id: Id
  workspaceId: Id
  name: string
  archived: boolean
  at: IsoDateTime
}

export type RecurringPeriod = "weekly" | "biweekly" | "monthly" | "quarterly" | "yearly"
export type EstimateType = "hours" | "monetary"
export type AlertBasis = "estimate" | "fixed_fee"
export type AlertThreshold = 50 | 75 | 80 | 90 | 100 | 150

export interface ProjectAlert {
  id: Id
  basis: AlertBasis
  threshold: AlertThreshold
  enabled: boolean
}

/** Historical billable rate: applies to entries starting on/after `validFrom` */
export interface RatePeriod {
  validFrom: IsoDate
  rate: number
}

export interface Project {
  id: Id
  workspaceId: Id
  clientId: Id | null
  name: string
  color: string
  active: boolean
  isPrivate: boolean
  billable: boolean
  currency: string
  /** Current rate (latest of rateHistory, kept denormalized like Toggl's `rate`) */
  rate: number | null
  rateHistory: RatePeriod[]
  estimateType: EstimateType
  /** Time estimate in seconds (estimateType = hours) */
  estimatedSeconds: number | null
  /** Monetary budget (estimateType = monetary) */
  estimatedAmount: number | null
  /** Sum task estimates instead of using a project estimate */
  autoEstimates: boolean
  fixedFee: number | null
  recurring: boolean
  recurringPeriod: RecurringPeriod | null
  /** Anchor date of the first recurrence period */
  recurringStart: IsoDate | null
  startDate: IsoDate | null
  endDate: IsoDate | null
  template: boolean
  alerts: ProjectAlert[]
  memberIds: Id[]
  at: IsoDateTime
  createdAt: IsoDateTime
}

export interface Task {
  id: Id
  workspaceId: Id
  projectId: Id
  name: string
  estimatedSeconds: number | null
  assigneeId: Id | null
  rate: number | null
  active: boolean
  at: IsoDateTime
}

export interface Tag {
  id: Id
  workspaceId: Id
  name: string
  at: IsoDateTime
}

// ---------------------------------------------------------------------------
// Time entries
// ---------------------------------------------------------------------------

export interface TimeEntry {
  id: Id
  workspaceId: Id
  userId: Id
  description: string
  projectId: Id | null
  taskId: Id | null
  tagIds: Id[]
  billable: boolean
  start: IsoDateTime
  stop: IsoDateTime | null
  /** Seconds; negative (= -startEpoch) while running */
  duration: number
  /** Show duration only, hide start/stop */
  duronly: boolean
  /** Extra members the entry is shared with */
  sharedWith: Id[]
  createdWith: string
  /** Set when the entry came from an external calendar event */
  sourceEventId: string | null
  at: IsoDateTime
  serverDeletedAt: IsoDateTime | null
}

/** Everything needed to start/pre-fill an entry */
export interface EntryDraft {
  description: string
  projectId: Id | null
  taskId: Id | null
  tagIds: Id[]
  billable: boolean
}

export interface Favorite {
  id: Id
  draft: EntryDraft
  at: IsoDateTime
}

/** A day bucket in the timer list */
export interface DayGroup {
  date: IsoDate
  totalSeconds: number
  rows: EntryRow[]
}

/** One row of the timer list — either a single entry or a collapsed group */
export interface EntryRow {
  key: string
  entries: TimeEntry[]
  totalSeconds: number
  /** true when several identical entries were collapsed into this row */
  grouped: boolean
}

// ---------------------------------------------------------------------------
// External calendars
// ---------------------------------------------------------------------------

export type CalendarSource = "ics_url" | "ics_file" | "google_api"

export interface ExternalCalendar {
  id: Id
  name: string
  source: CalendarSource
  /** ICS URL or Google calendar id — never a token */
  ref: string
  color: string
  enabled: boolean
  lastSyncedAt: IsoDateTime | null
  eventCount: number
}

export interface CalendarEvent {
  /** Stable id: `${calendarId}:${uid}` */
  id: string
  calendarId: Id
  uid: string
  title: string
  description: string
  location: string
  start: IsoDateTime
  end: IsoDateTime
  allDay: boolean
  htmlLink: string | null
}

// ---------------------------------------------------------------------------
// Automation (pomodoro, idle, autotracker, reminders, webhooks, timeline)
// ---------------------------------------------------------------------------

export interface PomodoroSettings {
  enabled: boolean
  workMinutes: number
  breakMinutes: number
  /** Auto-continue the entry when a break ends */
  autoContinue: boolean
  notify: boolean
}

export interface IdleSettings {
  enabled: boolean
  /** Prompt after this many minutes without interaction while tracking */
  minutes: number
}

export interface ReminderSettings {
  enabled: boolean
  /** 0 = Sunday … 6 = Saturday */
  days: number[]
  fromHour: number
  toHour: number
  /** Nag every N minutes while nothing is running */
  everyMinutes: number
}

export interface AutotrackerRule {
  id: Id
  /** Case-insensitive substring matched against the description */
  keyword: string
  projectId: Id | null
  taskId: Id | null
  tagIds: Id[]
  enabled: boolean
}

export interface WebhookConfig {
  id: Id
  url: string
  events: WebhookEventName[]
  enabled: boolean
}

export type WebhookEventName =
  | "time_entry.created"
  | "time_entry.updated"
  | "time_entry.deleted"
  | "project.created"
  | "alert.triggered"

export interface WebhookLogEntry {
  id: Id
  at: IsoDateTime
  event: WebhookEventName
  url: string
  payload: string
  status: "queued" | "sent" | "skipped"
}

/** Browser-only analog of Toggl's desktop Timeline */
export interface TimelineBlock {
  id: Id
  start: IsoDateTime
  end: IsoDateTime
  /** Route/tab title observed while the page was visible */
  label: string
  converted: boolean
}

export interface AlertEvent {
  id: Id
  projectId: Id
  basis: AlertBasis
  threshold: AlertThreshold
  at: IsoDateTime
  /** Period the alert fired for (recurring projects reset per period) */
  periodStart: IsoDate
  read: boolean
}

export interface TimesheetApproval {
  id: Id
  memberId: Id
  weekStart: IsoDate
  status: "open" | "submitted" | "approved" | "rejected"
  submittedAt: IsoDateTime | null
  decidedAt: IsoDateTime | null
  note: string
}

// ---------------------------------------------------------------------------
// Reports
// ---------------------------------------------------------------------------

export type ReportTab = "summary" | "detailed" | "workload" | "profitability" | "saved"

export type GroupingDimension =
  | "project"
  | "client"
  | "task"
  | "tag"
  | "member"
  | "description"
  | "billable"
  | "date"

export type SummaryMetric =
  | "total"
  | "billable"
  | "revenue"
  | "avg_daily"
  | "cost"
  | "profit"
  | "fixed_fee"

export type ChartMetric = "time" | "billable_pct" | "revenue" | "cost" | "profit"
export type ChartInterval = "day" | "week" | "month"
export type BillableFilter = "all" | "yes" | "no"
export type WorkloadValueMode = "duration" | "earnings"

export interface DateRange {
  start: IsoDate
  /** Inclusive */
  end: IsoDate
}

export interface ReportFilters {
  range: DateRange
  clientIds: Id[]
  projectIds: Id[]
  taskIds: Id[]
  tagIds: Id[]
  memberIds: Id[]
  billable: BillableFilter
  description: string
}

export interface ReportConfig {
  tab: ReportTab
  filters: ReportFilters
  grouping: GroupingDimension
  subGrouping: GroupingDimension | null
  rounding: RoundingConfig
  summaryMetrics: SummaryMetric[]
  chartMetric: ChartMetric
  chartInterval: ChartInterval
  /** null = no stacking */
  chartStackBy: GroupingDimension | null
  pieGroupBy: GroupingDimension
  workloadValueMode: WorkloadValueMode
  sort: { column: string; direction: "asc" | "desc" }
}

export interface SavedReport {
  id: Id
  name: string
  config: ReportConfig
  at: IsoDateTime
}

export interface SummaryRow {
  key: string
  label: string
  color: string | null
  seconds: number
  billableSeconds: number
  revenue: number
  cost: number
  entryCount: number
  children: SummaryRow[]
}

export interface SummaryBucket {
  key: IsoDate
  label: string
  seconds: number
  billableSeconds: number
  revenue: number
  cost: number
  /** Stack segments when chartStackBy is set */
  segments: { key: string; label: string; color: string | null; value: number }[]
}

export interface SummaryTotals {
  seconds: number
  billableSeconds: number
  revenue: number
  cost: number
  fixedFee: number
  activeDays: number
  entryCount: number
}

export interface SummaryReport {
  rows: SummaryRow[]
  buckets: SummaryBucket[]
  pie: { key: string; label: string; color: string | null; seconds: number }[]
  totals: SummaryTotals
}

export interface DetailedRow {
  entryId: Id
  description: string
  projectName: string | null
  projectColor: string | null
  clientName: string | null
  taskName: string | null
  tagNames: string[]
  memberName: string
  billable: boolean
  start: IsoDateTime
  stop: IsoDateTime | null
  seconds: number
  amount: number
}

export interface WorkloadReport {
  /** Column headers, one per day in range */
  days: IsoDate[]
  rows: {
    key: string
    label: string
    color: string | null
    values: number[]
    total: number
  }[]
  dayTotals: number[]
  grandTotal: number
  mode: WorkloadValueMode
}

export interface ProfitabilityRow {
  key: string
  label: string
  color: string | null
  seconds: number
  billableSeconds: number
  revenue: number
  fixedFee: number
  cost: number
  profit: number
  /** profit / (revenue + fixedFee), 0 when no income */
  margin: number
}

export interface ProjectDashboard {
  projectId: Id
  periodStart: IsoDate
  periodEnd: IsoDate
  trackedSeconds: number
  billableSeconds: number
  estimatedSeconds: number | null
  estimatedAmount: number | null
  fixedFee: number | null
  revenue: number
  cost: number
  profit: number
  /** Percentage of estimate (or fee) consumed, 0–∞ */
  completionPct: number
  /** Cumulative tracked seconds per day in the period */
  burnUp: { date: IsoDate; seconds: number }[]
  /** Straight-line forecast beyond today, same shape as burnUp */
  forecast: { date: IsoDate; seconds: number }[]
  projectedEndDate: IsoDate | null
  triggeredThresholds: AlertThreshold[]
  taskBreakdown: { taskId: Id | null; label: string; seconds: number }[]
  memberBreakdown: { memberId: Id; label: string; seconds: number }[]
}

// ---------------------------------------------------------------------------
// Persisted state
// ---------------------------------------------------------------------------

export interface TimetrackState {
  version: number
  workspace: Workspace
  user: UserSettings
  members: Member[]
  groups: MemberGroup[]
  clients: Client[]
  projects: Project[]
  tasks: Task[]
  tags: Tag[]
  entries: TimeEntry[]
  favorites: Favorite[]
  calendars: ExternalCalendar[]
  events: CalendarEvent[]
  savedReports: SavedReport[]
  alerts: AlertEvent[]
  approvals: TimesheetApproval[]
  autotrackers: AutotrackerRule[]
  webhooks: WebhookConfig[]
  webhookLog: WebhookLogEntry[]
  timeline: TimelineBlock[]
  pomodoro: PomodoroSettings
  idle: IdleSettings
  reminders: ReminderSettings
}

/** Validation failure raised by required-fields / locked-entries / approval rules */
export interface SaveViolation {
  field: "description" | "project" | "task" | "tag" | "date" | "approval"
  message: string
}
