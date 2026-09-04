/**
 * Time-tracking slice — constants.
 * Values that mirror Toggl Track exactly are marked (toggl).
 */

export const STORAGE_KEY = "toggl-clone:v1"
/** Bumped whenever stored state is no longer readable; a mismatch starts a fresh workspace */
/**
 * 3: ids are text made on the device, not numbers from a counter, so two
 *    offline devices cannot mint the same id. v2 workspaces are converted by
 *    `stateMigrationService`, never discarded.
 */
export const STATE_VERSION = 3

/** Changes written locally but not yet accepted by the server */
export const PENDING_KEY = "toggl-clone:pending"
/** How far through the server's history this device has read */
export const SYNC_CURSOR_KEY = "toggl-clone:cursor"
/** Toggl requires a `created_with` on every entry (toggl) */
export const CREATED_WITH = "daygame-coach /test/toggl"
/**
 * This page used to seed sample entries carrying this tag. Nothing generates
 * them any more; the constant remains so a browser that still has them stored
 * gets them cleaned out on load. See demoDataService.
 */
export const SEED_CREATED_WITH = "daygame-coach /test/toggl (demo data)"
/** Warn about a timer left running longer than this (hours) */
export const FORGOTTEN_TIMER_HOURS = 12

/** Toggl's 15 project colors (toggl) */
export const PROJECT_COLORS = [
  "#0b83d9",
  "#9e5bd9",
  "#d94182",
  "#e36a00",
  "#bf7000",
  "#2da608",
  "#06a893",
  "#c9806b",
  "#465bb3",
  "#990099",
  "#c7af14",
  "#566614",
  "#d92b2b",
  "#525266",
  "#991102",
] as const

export const NO_PROJECT_COLOR = "#6b7280"
export const CALENDAR_COLORS = ["#4285f4", "#0f9d58", "#db4437", "#f4b400", "#ab47bc"] as const

/** Entries shorter than this cannot be split (toggl: 10 minutes) */
export const MIN_SPLIT_SECONDS = 10 * 60

/** External-calendar import window (toggl: 60 days back, 30 days forward) */
export const CALENDAR_WINDOW_DAYS_BACK = 60
export const CALENDAR_WINDOW_DAYS_FORWARD = 30

export const DURATION_FORMATS = [
  { id: "improved", label: "Improved (1:30)" },
  { id: "classic", label: "Classic (1:30:00)" },
  { id: "decimal", label: "Decimal (1.50)" },
] as const

export const TIME_FORMATS = [
  { id: "h24", label: "24-hour (13:30)" },
  { id: "h12", label: "12-hour (1:30 PM)" },
] as const

export const DATE_FORMATS = [
  "YYYY-MM-DD",
  "DD.MM.YYYY",
  "DD-MM-YYYY",
  "MM/DD/YYYY",
  "DD/MM/YYYY",
] as const

export const WEEK_STARTS = [
  { id: 1, label: "Monday" },
  { id: 0, label: "Sunday" },
  { id: 6, label: "Saturday" },
] as const

/** Rounding intervals offered by Toggl (toggl) */
export const ROUNDING_MINUTES = [1, 5, 6, 10, 15, 30, 60] as const

export const ROUNDING_MODES = [
  { id: "nearest", label: "Round to nearest" },
  { id: "up", label: "Round up" },
  { id: "down", label: "Round down" },
] as const

/** Alert thresholds offered by Toggl (toggl) */
export const ALERT_THRESHOLDS = [50, 75, 80, 90, 100, 150] as const

export const RECURRING_PERIODS = [
  { id: "weekly", label: "Weekly", days: 7 },
  { id: "biweekly", label: "Biweekly (2 weeks)", days: 14 },
  { id: "monthly", label: "Monthly", days: 30 },
  { id: "quarterly", label: "Quarterly (3 months)", days: 91 },
  { id: "yearly", label: "Yearly", days: 365 },
] as const

/** Summary-bar metrics; Toggl lets you display up to 4 (toggl) */
export const SUMMARY_METRICS = [
  { id: "total", label: "Total hours", kind: "duration" },
  { id: "billable", label: "Billable hours", kind: "duration" },
  { id: "revenue", label: "Revenue", kind: "money" },
  { id: "avg_daily", label: "Avg. daily hours", kind: "duration" },
  { id: "cost", label: "Cost", kind: "money" },
  { id: "profit", label: "Profit", kind: "money" },
  { id: "fixed_fee", label: "Fixed fee", kind: "money" },
] as const

export const MAX_SUMMARY_METRICS = 4

export const GROUPING_DIMENSIONS = [
  { id: "project", label: "Project" },
  { id: "client", label: "Client" },
  { id: "task", label: "Task" },
  { id: "tag", label: "Tag" },
  { id: "member", label: "Member" },
  { id: "description", label: "Description" },
  { id: "billable", label: "Billable status" },
  { id: "date", label: "Date" },
] as const

export const CHART_METRICS = [
  { id: "time", label: "Time" },
  { id: "billable_pct", label: "Billable %" },
  { id: "revenue", label: "Revenue" },
  { id: "cost", label: "Cost" },
  { id: "profit", label: "Profit" },
] as const

export const DATE_PRESETS = [
  "today",
  "yesterday",
  "this_week",
  "last_week",
  "this_month",
  "last_month",
  "this_year",
  "last_year",
] as const

export const CURRENCIES = ["USD", "EUR", "GBP", "NOK", "SEK", "DKK", "CHF", "AUD", "CAD"] as const

/** Webapp shortcuts, Timer page only, inactive while a field is focused (toggl) */
export const SHORTCUTS = [
  { keys: "S", action: "Stop the running time entry" },
  { keys: "N", action: "Start a new entry in timer mode" },
  { keys: "M", action: "New entry in manual mode" },
  { keys: "C", action: "Continue the last time entry" },
  { keys: "1 … 9", action: "Start the matching favorite" },
  { keys: "@", action: "Open the project dropdown (in description)" },
  { keys: "#", action: "Open the tag dropdown (in description)" },
  { keys: "Shift + ?", action: "Show this shortcut list" },
] as const

/** Calendar grid geometry */
export const CALENDAR_ZOOMS = [
  { id: "compact", label: "Compact", hourHeight: 32 },
  { id: "normal", label: "Normal", hourHeight: 56 },
  { id: "comfortable", label: "Comfortable", hourHeight: 88 },
] as const

/** Snap dragged/resized calendar blocks to this many minutes */
export const CALENDAR_SNAP_MINUTES = 5

export const DEFAULT_POMODORO = {
  enabled: false,
  workMinutes: 25,
  breakMinutes: 5,
  autoContinue: true,
  notify: true,
} as const

/**
 * Off by default: a web page can only see activity on its own tab, so it cannot
 * tell "away from the desk" from "working in another app".
 */
export const DEFAULT_IDLE = { enabled: false, minutes: 10 } as const

/** The settings an older build shipped, migrated away from on load */
export const LEGACY_IDLE_DEFAULT = { enabled: true, minutes: 5 } as const

export const DEFAULT_REMINDERS = {
  enabled: false,
  days: [1, 2, 3, 4, 5],
  fromHour: 9,
  toHour: 17,
  everyMinutes: 30,
} as const

export const WEBHOOK_EVENTS = [
  "time_entry.created",
  "time_entry.updated",
  "time_entry.deleted",
  "project.created",
  "alert.triggered",
] as const

/** Member audit buckets (toggl: filter members by how much they tracked) */
export const AUDIT_BUCKETS = [
  { id: "none", label: "Tracked nothing at all", maxHours: 0 },
  { id: "under_10", label: "Under 10 hours", maxHours: 10 },
  { id: "under_20", label: "Under 20 hours", maxHours: 20 },
  { id: "under_40", label: "Under 40 hours", maxHours: 40 },
] as const
