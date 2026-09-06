/**
 * The one place the app's workspace turns into database rows, and back.
 *
 * WHY IT IS ONE FILE: the tracker keeps everything — every entry, project,
 * webhook, timeline block — in a single nested state object, and every one of
 * its forty features reads and writes that object. Translating that object once
 * gives all forty features real storage. Editing forty screens to each save
 * themselves would give the same result, slowly, with forty chances to forget
 * one.
 *
 * WHAT IS DELIBERATELY NOT STORED:
 *  - imported calendar *events*. They are a copy of somebody else's calendar,
 *    re-fetched on sync. Keeping them means serving stale meeting titles.
 *  - the entry's `userId`. In this app that is the member who logged the time,
 *    and there is exactly one member. It is rebuilt from the self member on the
 *    way back, so it never has to be stored or kept in step.
 *  - `eventCount` on a calendar, which is a count of the events above.
 *
 * WHAT GOES IN A JSON COLUMN, AND WHY: the user's own formats, the pomodoro and
 * idle and reminder settings, the member list, and the workspace's rounding and
 * required-field rules. Every one of them is read and written whole and never
 * filtered or aggregated. Entries and projects are the opposite, which is why
 * they are real columns.
 */

import { emptyRows, type TimetrackRows } from "@/src/db/timetrackTypes"

import { createEmptyWorkspace } from "./data/emptyWorkspace"
import { newId } from "./idService"
import type {
  AlertEvent,
  AutotrackerRule,
  Client,
  ExternalCalendar,
  Favorite,
  Member,
  MemberGroup,
  Project,
  SavedReport,
  Tag,
  Task,
  TimeEntry,
  TimelineBlock,
  TimesheetApproval,
  TimetrackState,
  UserSettings,
  WebhookConfig,
  WebhookLogEntry,
  Workspace,
} from "./types"

/** Everything about the workspace that is preference rather than data */
interface WorkspaceConfig {
  defaultHourlyRate: number | null
  defaultLabourCost: number | null
  projectsBillableByDefault: boolean
  onlyAdminsSeeBillableRates: boolean
  rounding: Workspace["rounding"]
  requiredFields: Workspace["requiredFields"]
  lockEntriesBefore: string | null
  timesheetApprovalsEnabled: boolean
  at: string
}

interface Prefs {
  user: UserSettings
  members: Member[]
  groups: MemberGroup[]
  pomodoro: TimetrackState["pomodoro"]
  idle: TimetrackState["idle"]
  reminders: TimetrackState["reminders"]
}

const nowIso = (at?: string) => at ?? new Date().toISOString()

/** A stable name for this browser, so a running timer says where it came from */
function deviceId(): string {
  if (typeof window === "undefined") return "server"
  const key = "toggl-clone:device"
  let id = window.localStorage.getItem(key)
  if (!id) {
    id = newId()
    window.localStorage.setItem(key, id)
  }
  return id
}

// ---------------------------------------------------------------------------
// state -> rows
// ---------------------------------------------------------------------------

export function stateToRows(state: TimetrackState, userId: string): TimetrackRows {
  const rows = emptyRows()
  const ws = state.workspace.id
  const base = (id: string, at?: string) => ({ id, user_id: userId, updated_at: nowIso(at), deleted_at: null })

  const config: WorkspaceConfig = {
    defaultHourlyRate: state.workspace.defaultHourlyRate,
    defaultLabourCost: state.workspace.defaultLabourCost,
    projectsBillableByDefault: state.workspace.projectsBillableByDefault,
    onlyAdminsSeeBillableRates: state.workspace.onlyAdminsSeeBillableRates,
    rounding: state.workspace.rounding,
    requiredFields: state.workspace.requiredFields,
    lockEntriesBefore: state.workspace.lockEntriesBefore,
    timesheetApprovalsEnabled: state.workspace.timesheetApprovalsEnabled,
    at: state.workspace.at,
  }
  rows.timetrack_workspaces.push({
    ...base(ws, state.workspace.at),
    name: state.workspace.name,
    currency: state.workspace.defaultCurrency,
    config: config as unknown as Record<string, unknown>,
  })

  const prefs: Prefs = {
    user: state.user,
    members: state.members,
    groups: state.groups,
    pomodoro: state.pomodoro,
    idle: state.idle,
    reminders: state.reminders,
  }
  rows.timetrack_settings.push({
    user_id: userId,
    prefs: prefs as unknown as Record<string, unknown>,
    updated_at: nowIso(),
  })

  for (const c of state.clients) {
    rows.timetrack_clients.push({ ...base(c.id, c.at), workspace_id: ws, name: c.name, archived: c.archived })
  }

  for (const p of state.projects) {
    rows.timetrack_projects.push({
      ...base(p.id, p.at),
      workspace_id: ws,
      client_id: p.clientId,
      name: p.name,
      color: p.color,
      active: p.active,
      is_private: p.isPrivate,
      billable: p.billable,
      currency: p.currency,
      rate: p.rate,
      estimate_type: p.estimateType,
      estimated_seconds: p.estimatedSeconds,
      estimated_amount: p.estimatedAmount,
      auto_estimates: p.autoEstimates,
      fixed_fee: p.fixedFee,
      is_template: p.template,
      recurring: p.recurring,
      recurring_period: p.recurringPeriod ?? null,
      recurring_start: p.recurringStart ?? null,
      start_date: p.startDate ?? null,
      end_date: p.endDate ?? null,
      // derived, not invented: the app has no separate status field, it has a
      // boolean. Kept as a column so the database can filter on it.
      status: p.active ? "active" : "archived",
      member_ids: p.memberIds ?? [],
      created_at: p.createdAt,
    })
    for (const period of p.rateHistory) {
      rows.timetrack_project_rates.push({
        // a rate is identified by its project and the day it took effect, so the
        // same history uploaded twice cannot produce two rows
        ...base(`${p.id}:${period.validFrom}`, p.at),
        project_id: p.id,
        rate: period.rate,
        effective_from: period.validFrom,
      })
    }
    for (const alert of p.alerts) {
      rows.timetrack_project_alerts.push({
        ...base(alert.id, p.at),
        project_id: p.id,
        basis: alert.basis,
        threshold: alert.threshold,
        enabled: alert.enabled,
      })
    }
  }

  for (const t of state.tasks) {
    rows.timetrack_tasks.push({
      ...base(t.id, t.at),
      project_id: t.projectId,
      name: t.name,
      active: t.active,
      estimated_seconds: t.estimatedSeconds,
      rate: t.rate,
      assignee_id: t.assigneeId,
    })
  }

  for (const t of state.tags) {
    rows.timetrack_tags.push({ ...base(t.id, t.at), workspace_id: ws, name: t.name })
  }

  for (const e of state.entries) {
    const running = e.stop === null
    rows.timetrack_entries.push({
      ...base(e.id, e.at),
      deleted_at: e.serverDeletedAt,
      workspace_id: ws,
      project_id: e.projectId,
      task_id: e.taskId,
      description: e.description,
      billable: e.billable,
      started_at: e.start,
      stopped_at: e.stop,
      // a running entry has no duration yet: it is worked out from the start
      // time, so a stored number could never disagree with the clock
      duration_seconds: running ? null : Math.max(0, e.duration),
      duration_only: e.duronly,
      created_with: e.createdWith,
      source_event_id: e.sourceEventId,
      // which device is holding this timer. Recorded so two running entries can
      // be told apart when devices meet after being offline.
      running_device_id: running ? deviceId() : null,
      shared_with: e.sharedWith,
    })
    for (const tagId of e.tagIds) {
      rows.timetrack_entry_tags.push({ entry_id: e.id, tag_id: tagId, user_id: userId })
    }
  }

  for (const f of state.favorites) {
    rows.timetrack_favorites.push({
      ...base(f.id, f.at),
      workspace_id: ws,
      description: f.draft.description,
      project_id: f.draft.projectId,
      task_id: f.draft.taskId,
      billable: f.draft.billable,
      tag_ids: f.draft.tagIds,
    })
  }

  for (const r of state.savedReports) {
    rows.timetrack_saved_reports.push({
      ...base(r.id, r.at),
      workspace_id: ws,
      name: r.name,
      config: r.config as unknown as Record<string, unknown>,
    })
  }

  for (const a of state.alerts) {
    rows.timetrack_alert_events.push({
      ...base(a.id, a.at),
      project_id: a.projectId,
      basis: a.basis,
      threshold: a.threshold,
      period_start: a.periodStart,
      fired_at: a.at,
      read: a.read,
    })
  }

  for (const a of state.approvals) {
    rows.timetrack_approvals.push({
      ...base(a.id, a.submittedAt ?? undefined),
      workspace_id: ws,
      member_id: a.memberId,
      week_start: a.weekStart,
      status: a.status,
      note: a.note,
      submitted_at: a.submittedAt,
      decided_at: a.decidedAt,
    })
  }

  for (const w of state.webhooks) {
    rows.timetrack_webhooks.push({ ...base(w.id), workspace_id: ws, url: w.url, events: w.events, enabled: w.enabled })
  }

  for (const l of state.webhookLog) {
    rows.timetrack_webhook_log.push({
      id: l.id,
      user_id: userId,
      // the log keeps the address it posted to, not a link to a webhook that
      // may since have been deleted
      webhook_id: null,
      event: l.event,
      url: l.url,
      payload: l.payload,
      status: l.status,
      created_at: l.at,
    })
  }

  for (const r of state.autotrackers) {
    rows.timetrack_autotracker_rules.push({
      ...base(r.id),
      workspace_id: ws,
      match_text: r.keyword,
      project_id: r.projectId,
      task_id: r.taskId,
      description: null,
      tag_ids: r.tagIds,
      enabled: r.enabled,
    })
  }

  for (const b of state.timeline) {
    rows.timetrack_timeline.push({
      ...base(b.id),
      workspace_id: ws,
      title: b.label,
      label: b.label,
      converted: b.converted,
      started_at: b.start,
      ended_at: b.end,
    })
  }

  for (const c of state.calendars) {
    rows.timetrack_calendars.push({
      ...base(c.id),
      workspace_id: ws,
      name: c.name,
      source: c.source,
      ref: c.ref,
      color: c.color,
      enabled: c.enabled,
      last_synced_at: c.lastSyncedAt,
    })
  }

  return rows
}

// ---------------------------------------------------------------------------
// rows -> state
// ---------------------------------------------------------------------------

const live = <T extends { deleted_at: string | null }>(rows: T[]) => rows.filter((r) => r.deleted_at === null)

export function rowsToState(rows: TimetrackRows, fallbackNowIso: string): TimetrackState {
  const empty = createEmptyWorkspace(fallbackNowIso)
  const wsRow = live(rows.timetrack_workspaces)[0]

  /**
   * A missing workspace row must NEVER be read as "there is nothing here".
   *
   * It used to return a brand-new empty workspace at this point. The next thing
   * the sync does is compare that empty workspace with what the server holds
   * and send the difference — which was a deletion for every entry the user
   * had. One inconsistent row cost the whole history. Verified: it deleted a
   * real entry during testing.
   *
   * So: if anything else is here, the workspace is rebuilt around it and the
   * data is kept. Only a genuinely empty payload gives an empty workspace.
   */
  const hasOtherRows =
    live(rows.timetrack_entries).length > 0 ||
    live(rows.timetrack_projects).length > 0 ||
    live(rows.timetrack_clients).length > 0 ||
    live(rows.timetrack_tags).length > 0
  if (!wsRow && !hasOtherRows) return empty

  const config = (wsRow?.config ?? {}) as unknown as WorkspaceConfig
  const prefs = (rows.timetrack_settings[0]?.prefs ?? {}) as unknown as Partial<Prefs>

  const workspace: Workspace = {
    // an orphaned payload keeps the id its rows already point at
    id: wsRow?.id ?? live(rows.timetrack_entries)[0]?.workspace_id ?? empty.workspace.id,
    name: wsRow?.name ?? empty.workspace.name,
    defaultCurrency: wsRow?.currency ?? empty.workspace.defaultCurrency,
    defaultHourlyRate: config.defaultHourlyRate ?? null,
    defaultLabourCost: config.defaultLabourCost ?? null,
    projectsBillableByDefault: config.projectsBillableByDefault ?? false,
    onlyAdminsSeeBillableRates: config.onlyAdminsSeeBillableRates ?? false,
    rounding: config.rounding ?? empty.workspace.rounding,
    requiredFields: config.requiredFields ?? empty.workspace.requiredFields,
    lockEntriesBefore: config.lockEntriesBefore ?? null,
    timesheetApprovalsEnabled: config.timesheetApprovalsEnabled ?? false,
    at: config.at ?? wsRow?.updated_at ?? fallbackNowIso,
  }

  const members = prefs.members?.length ? prefs.members : empty.members
  const selfId = members.find((m) => m.isSelf)?.id ?? members[0]?.id ?? ""

  const tagsByEntry = new Map<string, string[]>()
  for (const link of rows.timetrack_entry_tags) {
    tagsByEntry.set(link.entry_id, [...(tagsByEntry.get(link.entry_id) ?? []), link.tag_id])
  }

  const ratesByProject = new Map<string, { validFrom: string; rate: number }[]>()
  for (const r of live(rows.timetrack_project_rates)) {
    ratesByProject.set(r.project_id, [
      ...(ratesByProject.get(r.project_id) ?? []),
      { validFrom: r.effective_from, rate: Number(r.rate) },
    ])
  }

  const alertsByProject = new Map<string, Project["alerts"]>()
  for (const a of live(rows.timetrack_project_alerts)) {
    alertsByProject.set(a.project_id, [
      ...(alertsByProject.get(a.project_id) ?? []),
      { id: a.id, basis: a.basis as Project["alerts"][number]["basis"], threshold: a.threshold as Project["alerts"][number]["threshold"], enabled: a.enabled },
    ])
  }

  const clients: Client[] = live(rows.timetrack_clients).map((c) => ({
    id: c.id,
    workspaceId: workspace.id,
    name: c.name,
    archived: c.archived,
    at: c.updated_at,
  }))

  const projects: Project[] = live(rows.timetrack_projects).map((p) => ({
    id: p.id,
    workspaceId: workspace.id,
    clientId: p.client_id,
    name: p.name,
    color: p.color,
    active: p.active,
    isPrivate: p.is_private,
    billable: p.billable,
    currency: p.currency,
    rate: p.rate === null ? null : Number(p.rate),
    rateHistory: (ratesByProject.get(p.id) ?? []).sort((a, b) => a.validFrom.localeCompare(b.validFrom)),
    estimateType: p.estimate_type as Project["estimateType"],
    estimatedSeconds: p.estimated_seconds,
    estimatedAmount: p.estimated_amount === null ? null : Number(p.estimated_amount),
    autoEstimates: p.auto_estimates,
    fixedFee: p.fixed_fee === null ? null : Number(p.fixed_fee),
    recurring: p.recurring,
    recurringPeriod: (p.recurring_period ?? null) as Project["recurringPeriod"],
    recurringStart: p.recurring_start,
    startDate: p.start_date,
    endDate: p.end_date,
    template: p.is_template,
    memberIds: p.member_ids,
    alerts: alertsByProject.get(p.id) ?? [],
    at: p.updated_at,
    createdAt: p.created_at,
  }))

  const tasks: Task[] = live(rows.timetrack_tasks).map((t) => ({
    id: t.id,
    workspaceId: workspace.id,
    projectId: t.project_id,
    name: t.name,
    estimatedSeconds: t.estimated_seconds,
    assigneeId: t.assignee_id,
    rate: t.rate === null ? null : Number(t.rate),
    active: t.active,
    at: t.updated_at,
  }))

  const tags: Tag[] = live(rows.timetrack_tags).map((t) => ({
    id: t.id,
    workspaceId: workspace.id,
    name: t.name,
    at: t.updated_at,
  }))

  const entries: TimeEntry[] = live(rows.timetrack_entries).map((e) => {
    const running = e.stopped_at === null
    return {
      id: e.id,
      workspaceId: workspace.id,
      userId: selfId,
      description: e.description,
      projectId: e.project_id,
      taskId: e.task_id,
      tagIds: tagsByEntry.get(e.id) ?? [],
      billable: e.billable,
      start: e.started_at,
      stop: e.stopped_at,
      // Toggl's own encoding: a running entry stores minus its start time, and
      // the live duration is worked out from the clock
      duration: running
        ? -Math.floor(new Date(e.started_at).getTime() / 1000)
        : (e.duration_seconds ?? 0),
      duronly: e.duration_only,
      sharedWith: e.shared_with,
      createdWith: e.created_with,
      sourceEventId: e.source_event_id,
      at: e.updated_at,
      serverDeletedAt: null,
    }
  })

  const favorites: Favorite[] = live(rows.timetrack_favorites).map((f) => ({
    id: f.id,
    draft: {
      description: f.description,
      projectId: f.project_id,
      taskId: f.task_id,
      tagIds: f.tag_ids,
      billable: f.billable,
    },
    at: f.updated_at,
  }))

  const savedReports: SavedReport[] = live(rows.timetrack_saved_reports).map((r) => ({
    id: r.id,
    name: r.name,
    config: r.config as unknown as SavedReport["config"],
    at: r.updated_at,
  }))

  const alerts: AlertEvent[] = live(rows.timetrack_alert_events).map((a) => ({
    id: a.id,
    projectId: a.project_id,
    basis: a.basis as AlertEvent["basis"],
    threshold: a.threshold as AlertEvent["threshold"],
    at: a.fired_at,
    periodStart: a.period_start,
    read: a.read,
  }))

  const approvals: TimesheetApproval[] = live(rows.timetrack_approvals).map((a) => ({
    id: a.id,
    memberId: a.member_id ?? selfId,
    weekStart: a.week_start ?? "",
    status: a.status as TimesheetApproval["status"],
    submittedAt: a.submitted_at,
    decidedAt: a.decided_at,
    note: a.note ?? "",
  }))

  const webhooks: WebhookConfig[] = live(rows.timetrack_webhooks).map((w) => ({
    id: w.id,
    url: w.url,
    events: w.events as WebhookConfig["events"],
    enabled: w.enabled,
  }))

  const webhookLog: WebhookLogEntry[] = rows.timetrack_webhook_log.map((l) => ({
    id: l.id,
    at: l.created_at,
    event: l.event as WebhookLogEntry["event"],
    url: l.url,
    payload: l.payload,
    status: l.status as WebhookLogEntry["status"],
  }))

  const autotrackers: AutotrackerRule[] = live(rows.timetrack_autotracker_rules).map((r) => ({
    id: r.id,
    keyword: r.match_text,
    projectId: r.project_id,
    taskId: r.task_id,
    tagIds: r.tag_ids,
    enabled: r.enabled,
  }))

  const timeline: TimelineBlock[] = live(rows.timetrack_timeline).map((b) => ({
    id: b.id,
    start: b.started_at,
    end: b.ended_at,
    label: b.label || (b.title ?? ""),
    converted: b.converted,
  }))

  const calendars: ExternalCalendar[] = live(rows.timetrack_calendars).map((c) => ({
    id: c.id,
    name: c.name,
    source: c.source as ExternalCalendar["source"],
    ref: c.ref,
    color: c.color,
    enabled: c.enabled,
    lastSyncedAt: c.last_synced_at,
    // the events themselves are not stored, so nothing is claimed about them
    eventCount: 0,
  }))

  return {
    version: empty.version,
    workspace,
    user: prefs.user ?? empty.user,
    members,
    groups: prefs.groups ?? [],
    clients,
    projects,
    tasks,
    tags,
    entries,
    favorites,
    calendars,
    events: [],
    savedReports,
    alerts,
    approvals,
    autotrackers,
    webhooks,
    webhookLog,
    timeline,
    pomodoro: prefs.pomodoro ?? empty.pomodoro,
    idle: prefs.idle ?? empty.idle,
    reminders: prefs.reminders ?? empty.reminders,
  }
}
