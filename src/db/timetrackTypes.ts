/**
 * The shape of a timetrack row as the database stores it.
 *
 * These are not the app's types. The app thinks in one nested workspace object;
 * the database thinks in flat rows with foreign keys. `timetrackMapperService`
 * is the single place that translates between the two, so the app never has to
 * know about columns and the database never has to know about nesting.
 */

export interface SyncRow {
  id: string
  user_id: string
  updated_at: string
  deleted_at: string | null
}

export interface WorkspaceRow extends SyncRow {
  name: string
  currency: string
  config: Record<string, unknown>
}

export interface ClientRow extends SyncRow {
  workspace_id: string
  name: string
  archived: boolean
}

export interface ProjectRow extends SyncRow {
  workspace_id: string
  client_id: string | null
  name: string
  color: string
  active: boolean
  is_private: boolean
  billable: boolean
  currency: string
  rate: number | null
  estimate_type: string
  estimated_seconds: number | null
  estimated_amount: number | null
  auto_estimates: boolean
  fixed_fee: number | null
  is_template: boolean
  recurring: boolean
  recurring_period: string | null
  recurring_start: string | null
  start_date: string | null
  end_date: string | null
  status: string
  member_ids: string[]
  created_at: string
}

export interface ProjectRateRow extends SyncRow {
  project_id: string
  rate: number
  effective_from: string
}

export interface ProjectAlertRow extends SyncRow {
  project_id: string
  basis: string
  threshold: number
  enabled: boolean
}

export interface AlertEventRow extends SyncRow {
  project_id: string
  basis: string
  threshold: number
  period_start: string
  fired_at: string
  read: boolean
}

export interface TaskRow extends SyncRow {
  project_id: string
  name: string
  active: boolean
  estimated_seconds: number | null
  rate: number | null
  assignee_id: string | null
}

export interface TagRow extends SyncRow {
  workspace_id: string
  name: string
}

export interface EntryRow extends SyncRow {
  workspace_id: string
  project_id: string | null
  task_id: string | null
  description: string
  billable: boolean
  started_at: string
  stopped_at: string | null
  duration_seconds: number | null
  duration_only: boolean
  created_with: string
  source_event_id: string | null
  running_device_id: string | null
  shared_with: string[]
}

export interface EntryTagRow {
  entry_id: string
  tag_id: string
  user_id: string
}

export interface FavoriteRow extends SyncRow {
  workspace_id: string
  description: string
  project_id: string | null
  task_id: string | null
  billable: boolean
  tag_ids: string[]
}

export interface SavedReportRow extends SyncRow {
  workspace_id: string
  name: string
  config: Record<string, unknown>
}

export interface ApprovalRow extends SyncRow {
  workspace_id: string
  member_id: string | null
  week_start: string | null
  status: string
  note: string | null
  submitted_at: string | null
  decided_at: string | null
}

export interface WebhookRow extends SyncRow {
  workspace_id: string
  url: string
  events: string[]
  enabled: boolean
}

export interface WebhookLogRow {
  id: string
  user_id: string
  webhook_id: string | null
  event: string
  url: string
  payload: string
  status: string
  created_at: string
}

export interface AutotrackerRuleRow extends SyncRow {
  workspace_id: string
  match_text: string
  project_id: string | null
  task_id: string | null
  description: string | null
  tag_ids: string[]
  enabled: boolean
}

export interface TimelineRow extends SyncRow {
  workspace_id: string
  title: string | null
  label: string
  converted: boolean
  started_at: string
  ended_at: string
}

export interface CalendarRow extends SyncRow {
  workspace_id: string
  name: string
  source: string
  ref: string
  color: string
  enabled: boolean
  last_synced_at: string | null
}

export interface SettingsRow {
  user_id: string
  prefs: Record<string, unknown>
  updated_at: string
}

/** Every table, keyed by its name, as one payload the sync endpoint moves around */
export interface TimetrackRows {
  timetrack_workspaces: WorkspaceRow[]
  timetrack_clients: ClientRow[]
  timetrack_projects: ProjectRow[]
  timetrack_project_rates: ProjectRateRow[]
  timetrack_project_alerts: ProjectAlertRow[]
  timetrack_alert_events: AlertEventRow[]
  timetrack_tasks: TaskRow[]
  timetrack_tags: TagRow[]
  timetrack_entries: EntryRow[]
  timetrack_entry_tags: EntryTagRow[]
  timetrack_favorites: FavoriteRow[]
  timetrack_saved_reports: SavedReportRow[]
  timetrack_approvals: ApprovalRow[]
  timetrack_webhooks: WebhookRow[]
  timetrack_webhook_log: WebhookLogRow[]
  timetrack_autotracker_rules: AutotrackerRuleRow[]
  timetrack_timeline: TimelineRow[]
  timetrack_calendars: CalendarRow[]
  timetrack_settings: SettingsRow[]
}

export const TIMETRACK_TABLES = [
  "timetrack_workspaces",
  "timetrack_clients",
  "timetrack_projects",
  "timetrack_project_rates",
  "timetrack_project_alerts",
  "timetrack_alert_events",
  "timetrack_tasks",
  "timetrack_tags",
  "timetrack_entries",
  "timetrack_entry_tags",
  "timetrack_favorites",
  "timetrack_saved_reports",
  "timetrack_approvals",
  "timetrack_webhooks",
  "timetrack_webhook_log",
  "timetrack_autotracker_rules",
  "timetrack_timeline",
  "timetrack_calendars",
  "timetrack_settings",
] as const satisfies readonly (keyof TimetrackRows)[]

export function emptyRows(): TimetrackRows {
  return {
    timetrack_workspaces: [],
    timetrack_clients: [],
    timetrack_projects: [],
    timetrack_project_rates: [],
    timetrack_project_alerts: [],
    timetrack_alert_events: [],
    timetrack_tasks: [],
    timetrack_tags: [],
    timetrack_entries: [],
    timetrack_entry_tags: [],
    timetrack_favorites: [],
    timetrack_saved_reports: [],
    timetrack_approvals: [],
    timetrack_webhooks: [],
    timetrack_webhook_log: [],
    timetrack_autotracker_rules: [],
    timetrack_timeline: [],
    timetrack_calendars: [],
    timetrack_settings: [],
  }
}

/**
 * HOW A ROW IS IDENTIFIED, IN ONE PLACE, BECAUSE BOTH SIDES HAVE TO AGREE.
 *
 * Three tables are not keyed by `id`: the tag links by the pair they join, and
 * settings by the person. That fact used to be written down three times — the
 * client's `rowKey`, the repo's `COMPOSITE_KEYS`, and the repo's `ORDER_KEY` —
 * and the two sides disagreed in exactly the way that matters.
 *
 * WHAT IT COST. A refused row is reported so the browser can take it out of the
 * queue; the repo reported `String(row.id ?? "")`, which is EMPTY for those three
 * tables. So:
 *
 *   - a refusal in one of them named nothing, the browser's drop branch was
 *     skipped entirely, and the row stayed queued while the status went to error
 *     with no retry armed. Every later edit went into the same all-or-nothing
 *     batch and was refused with it. One mistyped end time on a TAGGED entry
 *     therefore stopped the account saving for good: the entry itself was
 *     isolated and dropped, and the orphan `(entry_id, tag_id)` link behind it
 *     then failed its foreign key for ever. A reload does not help — the queue is
 *     read back from `localStorage` — and "Reload to resync" is the only thing the
 *     person is told.
 *   - when a name WAS reported but in a shape the browser could not match, the
 *     drop removed nothing and the immediate re-flush fired anyway: measured at
 *     4,201 POSTs in five simulated seconds, the third occurrence of that flood
 *     in this file.
 *
 * So the key is defined once, here, next to the tables themselves, and both the
 * client and the repo ask this function.
 */
const ROW_KEY_COLUMNS: Partial<Record<keyof TimetrackRows, readonly string[]>> = {
  timetrack_entry_tags: ["entry_id", "tag_id"],
  timetrack_settings: ["user_id"],
}

/** The columns that identify a row in this table. `["id"]` unless stated above. */
export function rowKeyColumns(table: keyof TimetrackRows): readonly string[] {
  return ROW_KEY_COLUMNS[table] ?? ["id"]
}

/**
 * The identity of one row, as a string both sides produce identically.
 *
 * A missing column yields an empty part rather than "undefined", so a malformed
 * row cannot collide with a real one whose value happens to be that word.
 */
export function rowKeyOf(table: keyof TimetrackRows, row: Record<string, unknown>): string {
  return rowKeyColumns(table)
    .map((column) => {
      const value = row[column]
      return value === undefined || value === null ? "" : String(value)
    })
    .join(":")
}
