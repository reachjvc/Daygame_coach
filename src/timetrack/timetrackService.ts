/**
 * Time-tracking slice — core business logic.
 *
 * Every exported function is pure: it takes state (+ an explicit `now` where
 * time matters) and returns new state. The store hook is a thin dispatcher.
 *
 * Toggl fidelity notes:
 * - A running entry stores `duration = -startEpochSeconds`; real duration is
 *   `nowEpochSeconds + duration`.
 * - Starting a new entry stops the running one at the same instant.
 * - Only entries longer than 10 minutes can be split.
 * - Billable rate resolution is task → project (historical) → member → workspace.
 */

import {
  CREATED_WITH,
  MIN_SPLIT_SECONDS,
  PROJECT_COLORS,
  RECURRING_PERIODS,
} from "./config"
import {
  addDays,
  dateKey,
  dateKeyToDate,
  daysBetween,
  epochSeconds,
  monthStartOf,
  weekStartOf,
} from "./timetrackFormatService"
import type {
  AlertEvent,
  AlertThreshold,
  AutotrackerRule,
  Client,
  DayGroup,
  EntryDraft,
  EntryRow,
  Favorite,
  Id,
  IsoDate,
  IsoDateTime,
  Member,
  MemberGroup,
  Project,
  SaveViolation,
  Tag,
  Task,
  TimeEntry,
  TimesheetApproval,
  TimetrackState,
  WebhookEventName,
} from "./types"

// ---------------------------------------------------------------------------
// Generic helpers
// ---------------------------------------------------------------------------

function takeId(state: TimetrackState): { state: TimetrackState; id: Id } {
  return { state: { ...state, nextId: state.nextId + 1 }, id: state.nextId }
}

function touch(iso?: IsoDateTime): IsoDateTime {
  return iso ?? new Date().toISOString()
}

function replaceById<T extends { id: Id }>(items: T[], id: Id, patch: Partial<T>): T[] {
  return items.map((item) => (item.id === id ? { ...item, ...patch } : item))
}

export function selfMember(state: TimetrackState): Member {
  return state.members.find((m) => m.isSelf) ?? state.members[0]
}

// ---------------------------------------------------------------------------
// Duration / running-entry maths
// ---------------------------------------------------------------------------

export function isRunning(entry: TimeEntry): boolean {
  return entry.duration < 0 || entry.stop === null
}

/** Real duration in seconds; running entries need `nowSec` */
export function entrySeconds(entry: TimeEntry, nowSec: number): number {
  if (entry.duration < 0) return Math.max(0, nowSec + entry.duration)
  return Math.max(0, entry.duration)
}

export function runningEntry(state: TimetrackState): TimeEntry | null {
  return state.entries.find((e) => isRunning(e) && !e.serverDeletedAt) ?? null
}

export function liveEntries(state: TimetrackState): TimeEntry[] {
  return state.entries.filter((e) => !e.serverDeletedAt)
}

export function sumSeconds(entries: TimeEntry[], nowSec: number): number {
  return entries.reduce((total, e) => total + entrySeconds(e, nowSec), 0)
}

/** The negative-duration encoding Toggl uses for a running entry */
export function runningDurationValue(startIso: IsoDateTime): number {
  return -epochSeconds(startIso)
}

// ---------------------------------------------------------------------------
// Lookups
// ---------------------------------------------------------------------------

export function projectById(state: TimetrackState, id: Id | null): Project | null {
  return id === null ? null : state.projects.find((p) => p.id === id) ?? null
}

export function taskById(state: TimetrackState, id: Id | null): Task | null {
  return id === null ? null : state.tasks.find((t) => t.id === id) ?? null
}

export function clientById(state: TimetrackState, id: Id | null): Client | null {
  return id === null ? null : state.clients.find((c) => c.id === id) ?? null
}

export function memberById(state: TimetrackState, id: Id | null): Member | null {
  return id === null ? null : state.members.find((m) => m.id === id) ?? null
}

export function tagNames(state: TimetrackState, tagIds: Id[]): string[] {
  return tagIds
    .map((id) => state.tags.find((t) => t.id === id)?.name)
    .filter((n): n is string => Boolean(n))
}

export function projectLabel(state: TimetrackState, entry: TimeEntry): string | null {
  const project = projectById(state, entry.projectId)
  if (!project) return null
  const task = taskById(state, entry.taskId)
  return task ? `${project.name} · ${task.name}` : project.name
}

export function draftOf(entry: TimeEntry): EntryDraft {
  return {
    description: entry.description,
    projectId: entry.projectId,
    taskId: entry.taskId,
    tagIds: [...entry.tagIds],
    billable: entry.billable,
  }
}

export const emptyDraft: EntryDraft = {
  description: "",
  projectId: null,
  taskId: null,
  tagIds: [],
  billable: false,
}

// ---------------------------------------------------------------------------
// Validation — required fields, locked entries, approved timesheets
// ---------------------------------------------------------------------------

export function validateEntry(
  state: TimetrackState,
  candidate: { description: string; projectId: Id | null; taskId: Id | null; tagIds: Id[]; start: IsoDateTime },
): SaveViolation[] {
  const violations: SaveViolation[] = []
  const required = state.workspace.requiredFields

  if (required.description && !candidate.description.trim()) {
    violations.push({ field: "description", message: "Description is required in this workspace" })
  }
  if (required.project && candidate.projectId === null) {
    violations.push({ field: "project", message: "Project is required in this workspace" })
  }
  if (required.task && candidate.taskId === null) {
    violations.push({ field: "task", message: "Task is required in this workspace" })
  }
  if (required.tag && candidate.tagIds.length === 0) {
    violations.push({ field: "tag", message: "At least one tag is required in this workspace" })
  }

  const lockBefore = state.workspace.lockEntriesBefore
  const day = dateKey(candidate.start)
  if (lockBefore && day <= lockBefore) {
    violations.push({ field: "date", message: `Time entries on or before ${lockBefore} are locked` })
  }

  if (state.workspace.timesheetApprovalsEnabled) {
    const self = selfMember(state)
    const week = weekStartOf(day, state.user.weekStart)
    const approval = approvalFor(state, self.id, week)
    if (approval && (approval.status === "submitted" || approval.status === "approved")) {
      violations.push({
        field: "approval",
        message: `Timesheet for the week of ${week} is ${approval.status} and cannot be changed`,
      })
    }
  }

  return violations
}

export function canEditEntry(state: TimetrackState, entry: TimeEntry): boolean {
  return (
    validateEntry(state, {
      description: entry.description || "x",
      projectId: entry.projectId ?? (state.workspace.requiredFields.project ? null : 1),
      taskId: entry.taskId ?? (state.workspace.requiredFields.task ? null : 1),
      tagIds: entry.tagIds.length ? entry.tagIds : state.workspace.requiredFields.tag ? [] : [1],
      start: entry.start,
    }).filter((v) => v.field === "date" || v.field === "approval").length === 0
  )
}

// ---------------------------------------------------------------------------
// Timer actions
// ---------------------------------------------------------------------------

export function startTimer(
  state: TimetrackState,
  draft: EntryDraft,
  nowIso: IsoDateTime,
): { state: TimetrackState; entry: TimeEntry; violations: SaveViolation[] } {
  const violations = validateEntry(state, { ...draft, start: nowIso })
  if (violations.length > 0) {
    return { state, entry: state.entries[0], violations }
  }

  let next = stopTimer(state, nowIso).state
  const withId = takeId(next)
  next = withId.state
  const self = selfMember(next)

  const entry: TimeEntry = {
    id: withId.id,
    workspaceId: next.workspace.id,
    userId: self.id,
    description: draft.description.trim(),
    projectId: draft.projectId,
    taskId: draft.taskId,
    tagIds: [...draft.tagIds],
    billable: draft.billable,
    start: nowIso,
    stop: null,
    duration: runningDurationValue(nowIso),
    duronly: false,
    sharedWith: [],
    createdWith: CREATED_WITH,
    sourceEventId: null,
    at: nowIso,
    serverDeletedAt: null,
  }

  next = { ...next, entries: [entry, ...next.entries] }
  next = queueWebhook(next, "time_entry.created", entry, nowIso)
  return { state: next, entry, violations: [] }
}

export function stopTimer(
  state: TimetrackState,
  nowIso: IsoDateTime,
): { state: TimetrackState; stopped: TimeEntry | null } {
  const running = runningEntry(state)
  if (!running) return { state, stopped: null }

  const stoppedEntry: TimeEntry = {
    ...running,
    stop: nowIso,
    duration: Math.max(0, epochSeconds(nowIso) - epochSeconds(running.start)),
    at: nowIso,
  }
  let next = { ...state, entries: replaceById(state.entries, running.id, stoppedEntry) }
  next = queueWebhook(next, "time_entry.updated", stoppedEntry, nowIso)
  return { state: next, stopped: stoppedEntry }
}

/** Toggl's "Continue": start a fresh entry with the same draft */
export function continueEntry(
  state: TimetrackState,
  entryId: Id,
  nowIso: IsoDateTime,
): { state: TimetrackState; violations: SaveViolation[] } {
  const source = state.entries.find((e) => e.id === entryId)
  if (!source) return { state, violations: [] }
  const result = startTimer(state, draftOf(source), nowIso)
  return { state: result.state, violations: result.violations }
}

export function createManualEntry(
  state: TimetrackState,
  input: { draft: EntryDraft; start: IsoDateTime; stop: IsoDateTime; sourceEventId?: string | null },
  nowIso: IsoDateTime,
): { state: TimetrackState; violations: SaveViolation[]; entry: TimeEntry | null } {
  const violations = validateEntry(state, { ...input.draft, start: input.start })
  if (violations.length > 0) return { state, violations, entry: null }

  const withId = takeId(state)
  const self = selfMember(state)
  const entry: TimeEntry = {
    id: withId.id,
    workspaceId: state.workspace.id,
    userId: self.id,
    description: input.draft.description.trim(),
    projectId: input.draft.projectId,
    taskId: input.draft.taskId,
    tagIds: [...input.draft.tagIds],
    billable: input.draft.billable,
    start: input.start,
    stop: input.stop,
    duration: Math.max(0, epochSeconds(input.stop) - epochSeconds(input.start)),
    duronly: false,
    sharedWith: [],
    createdWith: CREATED_WITH,
    sourceEventId: input.sourceEventId ?? null,
    at: nowIso,
    serverDeletedAt: null,
  }

  let next = { ...withId.state, entries: [entry, ...withId.state.entries] }
  next = queueWebhook(next, "time_entry.created", entry, nowIso)
  return { state: next, violations: [], entry }
}

export function updateEntry(
  state: TimetrackState,
  entryId: Id,
  patch: Partial<Pick<TimeEntry, "description" | "projectId" | "taskId" | "tagIds" | "billable" | "start" | "stop" | "duronly" | "sharedWith">>,
  nowIso: IsoDateTime,
): { state: TimetrackState; violations: SaveViolation[] } {
  const current = state.entries.find((e) => e.id === entryId)
  if (!current) return { state, violations: [] }

  const merged: TimeEntry = { ...current, ...patch, at: nowIso }
  merged.duration = merged.stop === null
    ? runningDurationValue(merged.start)
    : Math.max(0, epochSeconds(merged.stop) - epochSeconds(merged.start))

  const violations = validateEntry(state, {
    description: merged.description,
    projectId: merged.projectId,
    taskId: merged.taskId,
    tagIds: merged.tagIds,
    start: merged.start,
  })
  if (violations.length > 0) return { state, violations }

  let next = { ...state, entries: replaceById(state.entries, entryId, merged) }
  next = queueWebhook(next, "time_entry.updated", merged, nowIso)
  return { state: next, violations: [] }
}

/** Change a running entry's elapsed time by moving its start (what Toggl does) */
export function setRunningElapsed(
  state: TimetrackState,
  seconds: number,
  nowIso: IsoDateTime,
): TimetrackState {
  const running = runningEntry(state)
  if (!running) return state
  const newStartIso = new Date((epochSeconds(nowIso) - Math.max(0, seconds)) * 1000).toISOString()
  return updateEntry(state, running.id, { start: newStartIso, stop: null }, nowIso).state
}

/** Set an entry's duration by moving its stop time (stopped entries only) */
export function setEntryDuration(
  state: TimetrackState,
  entryId: Id,
  seconds: number,
  nowIso: IsoDateTime,
): TimetrackState {
  const entry = state.entries.find((e) => e.id === entryId)
  if (!entry || isRunning(entry)) return state
  const stop = new Date((epochSeconds(entry.start) + Math.max(0, seconds)) * 1000).toISOString()
  return updateEntry(state, entryId, { stop }, nowIso).state
}

export function duplicateEntry(state: TimetrackState, entryId: Id, nowIso: IsoDateTime): TimetrackState {
  const source = state.entries.find((e) => e.id === entryId)
  if (!source || isRunning(source) || !source.stop) return state
  return createManualEntry(
    state,
    { draft: draftOf(source), start: source.start, stop: source.stop },
    nowIso,
  ).state
}

export interface SplitOutcome {
  state: TimetrackState
  error: string | null
}

/** Split a stopped entry in two. Toggl only allows this above 10 minutes. */
export function splitEntry(
  state: TimetrackState,
  entryId: Id,
  atIso: IsoDateTime | null,
  nowIso: IsoDateTime,
): SplitOutcome {
  const entry = state.entries.find((e) => e.id === entryId)
  if (!entry) return { state, error: "Entry not found" }
  if (isRunning(entry) || !entry.stop) return { state, error: "Stop the entry before splitting it" }
  if (entry.duration <= MIN_SPLIT_SECONDS) {
    return { state, error: "Only time entries longer than 10 minutes can be split" }
  }

  const startSec = epochSeconds(entry.start)
  const stopSec = epochSeconds(entry.stop)
  const splitSec = atIso ? epochSeconds(atIso) : Math.floor((startSec + stopSec) / 2)
  if (splitSec <= startSec || splitSec >= stopSec) {
    return { state, error: "Split point must fall inside the entry" }
  }

  const splitIso = new Date(splitSec * 1000).toISOString()
  const first: TimeEntry = {
    ...entry,
    stop: splitIso,
    duration: splitSec - startSec,
    at: nowIso,
  }
  const withId = takeId(state)
  const second: TimeEntry = {
    ...entry,
    id: withId.id,
    start: splitIso,
    stop: entry.stop,
    duration: stopSec - splitSec,
    at: nowIso,
  }

  let next = {
    ...withId.state,
    entries: [second, ...replaceById(withId.state.entries, entry.id, first)],
  }
  next = queueWebhook(next, "time_entry.created", second, nowIso)
  return { state: next, error: null }
}

export function deleteEntries(
  state: TimetrackState,
  entryIds: Id[],
  nowIso: IsoDateTime,
): { state: TimetrackState; removed: TimeEntry[] } {
  const removed = state.entries.filter((e) => entryIds.includes(e.id))
  let next = { ...state, entries: state.entries.filter((e) => !entryIds.includes(e.id)) }
  for (const entry of removed) next = queueWebhook(next, "time_entry.deleted", entry, nowIso)
  return { state: next, removed }
}

/** Undo support for the delete toast */
export function restoreEntries(state: TimetrackState, entries: TimeEntry[]): TimetrackState {
  const ids = new Set(entries.map((e) => e.id))
  const kept = state.entries.filter((e) => !ids.has(e.id))
  return { ...state, entries: [...entries, ...kept] }
}

export interface BulkEditPatch {
  projectId?: Id | null
  taskId?: Id | null
  addTagIds?: Id[]
  removeTagIds?: Id[]
  billable?: boolean
  description?: string
}

export function bulkEditEntries(
  state: TimetrackState,
  entryIds: Id[],
  patch: BulkEditPatch,
  nowIso: IsoDateTime,
): TimetrackState {
  const idSet = new Set(entryIds)
  const entries = state.entries.map((entry) => {
    if (!idSet.has(entry.id)) return entry
    let tagIds = entry.tagIds
    if (patch.removeTagIds?.length) tagIds = tagIds.filter((id) => !patch.removeTagIds!.includes(id))
    if (patch.addTagIds?.length) tagIds = [...new Set([...tagIds, ...patch.addTagIds])]
    return {
      ...entry,
      projectId: patch.projectId !== undefined ? patch.projectId : entry.projectId,
      taskId: patch.projectId !== undefined && patch.projectId !== entry.projectId ? null : patch.taskId !== undefined ? patch.taskId : entry.taskId,
      billable: patch.billable !== undefined ? patch.billable : entry.billable,
      description: patch.description !== undefined ? patch.description : entry.description,
      tagIds,
      at: nowIso,
    }
  })
  return { ...state, entries }
}

// ---------------------------------------------------------------------------
// Timer list grouping
// ---------------------------------------------------------------------------

function rowKey(entry: TimeEntry): string {
  return [
    entry.description.trim().toLowerCase(),
    entry.projectId ?? "-",
    entry.taskId ?? "-",
    [...entry.tagIds].sort((a, b) => a - b).join("."),
    entry.billable ? "b" : "n",
  ].join("|")
}

/**
 * Build the timer list: newest day first, entries newest first, optionally
 * collapsing identical entries within a day (Toggl's "group similar entries").
 */
export function buildDayGroups(
  entries: TimeEntry[],
  options: { groupSimilar: boolean; nowSec: number },
): DayGroup[] {
  const byDay = new Map<IsoDate, TimeEntry[]>()
  for (const entry of entries) {
    const key = dateKey(entry.start)
    const bucket = byDay.get(key)
    if (bucket) bucket.push(entry)
    else byDay.set(key, [entry])
  }

  const days = [...byDay.keys()].sort((a, b) => (a < b ? 1 : -1))
  return days.map((day) => {
    const dayEntries = [...byDay.get(day)!].sort(
      (a, b) => epochSeconds(b.start) - epochSeconds(a.start),
    )

    let rows: EntryRow[]
    if (options.groupSimilar) {
      const grouped = new Map<string, TimeEntry[]>()
      for (const entry of dayEntries) {
        const key = rowKey(entry)
        const bucket = grouped.get(key)
        if (bucket) bucket.push(entry)
        else grouped.set(key, [entry])
      }
      rows = [...grouped.entries()].map(([key, groupEntries]) => ({
        key: `${day}:${key}`,
        entries: groupEntries,
        totalSeconds: sumSeconds(groupEntries, options.nowSec),
        grouped: groupEntries.length > 1,
      }))
      rows.sort((a, b) => epochSeconds(b.entries[0].start) - epochSeconds(a.entries[0].start))
    } else {
      rows = dayEntries.map((entry) => ({
        key: `${day}:${entry.id}`,
        entries: [entry],
        totalSeconds: entrySeconds(entry, options.nowSec),
        grouped: false,
      }))
    }

    return {
      date: day,
      totalSeconds: sumSeconds(dayEntries, options.nowSec),
      rows,
    }
  })
}

export function weekTotalSeconds(
  entries: TimeEntry[],
  refDay: IsoDate,
  weekStart: 0 | 1 | 6,
  nowSec: number,
): number {
  const start = weekStartOf(refDay, weekStart)
  const end = addDays(start, 6)
  return sumSeconds(
    entries.filter((e) => {
      const day = dateKey(e.start)
      return day >= start && day <= end
    }),
    nowSec,
  )
}

export function entriesInRange(entries: TimeEntry[], start: IsoDate, end: IsoDate): TimeEntry[] {
  return entries.filter((e) => {
    const day = dateKey(e.start)
    return day >= start && day <= end
  })
}

// ---------------------------------------------------------------------------
// Rates & money (task → project(historical) → member → workspace)
// ---------------------------------------------------------------------------

export function projectRateAt(project: Project, atIso: IsoDateTime): number | null {
  if (project.rateHistory.length === 0) return project.rate
  const day = dateKey(atIso)
  const applicable = project.rateHistory
    .filter((r) => r.validFrom <= day)
    .sort((a, b) => (a.validFrom < b.validFrom ? 1 : -1))[0]
  return applicable ? applicable.rate : project.rate
}

export function resolveBillableRate(state: TimetrackState, entry: TimeEntry): number {
  if (!entry.billable) return 0
  const task = taskById(state, entry.taskId)
  if (task?.rate != null) return task.rate
  const project = projectById(state, entry.projectId)
  if (project) {
    const rate = projectRateAt(project, entry.start)
    if (rate != null) return rate
  }
  const member = memberById(state, entry.userId)
  if (member?.hourlyRate != null) return member.hourlyRate
  return state.workspace.defaultHourlyRate ?? 0
}

export function resolveCostRate(state: TimetrackState, entry: TimeEntry): number {
  const member = memberById(state, entry.userId)
  if (member?.labourCost != null) return member.labourCost
  return state.workspace.defaultLabourCost ?? 0
}

export function entryRevenue(state: TimetrackState, entry: TimeEntry, seconds: number): number {
  return (resolveBillableRate(state, entry) * seconds) / 3600
}

export function entryCost(state: TimetrackState, entry: TimeEntry, seconds: number): number {
  return (resolveCostRate(state, entry) * seconds) / 3600
}

// ---------------------------------------------------------------------------
// Description tokens (@project, #tag)
// ---------------------------------------------------------------------------

export interface ActiveToken {
  kind: "project" | "tag"
  query: string
  start: number
  end: number
}

/** Detect an `@…` / `#…` token being typed at the caret */
export function activeToken(text: string, caret: number): ActiveToken | null {
  const upto = text.slice(0, caret)
  const match = /([@#])([^\s@#]*)$/.exec(upto)
  if (!match) return null
  return {
    kind: match[1] === "@" ? "project" : "tag",
    query: match[2],
    start: caret - match[0].length,
    end: caret,
  }
}

/** Remove the token from the description once its entity has been picked */
export function removeToken(text: string, token: ActiveToken): string {
  const merged = `${text.slice(0, token.start)}${text.slice(token.end)}`.replace(/\s{2,}/g, " ")
  // A token typed at the end leaves a dangling space behind
  return token.end >= text.length ? merged.trimEnd() : merged
}

// ---------------------------------------------------------------------------
// Favorites
// ---------------------------------------------------------------------------

function sameDraft(a: EntryDraft, b: EntryDraft): boolean {
  return (
    a.description.trim().toLowerCase() === b.description.trim().toLowerCase() &&
    a.projectId === b.projectId &&
    a.taskId === b.taskId &&
    a.billable === b.billable &&
    [...a.tagIds].sort().join() === [...b.tagIds].sort().join()
  )
}

export function findFavorite(state: TimetrackState, draft: EntryDraft): Favorite | null {
  return state.favorites.find((f) => sameDraft(f.draft, draft)) ?? null
}

export function toggleFavorite(state: TimetrackState, draft: EntryDraft, nowIso: IsoDateTime): TimetrackState {
  const existing = findFavorite(state, draft)
  if (existing) {
    return { ...state, favorites: state.favorites.filter((f) => f.id !== existing.id) }
  }
  const withId = takeId(state)
  return {
    ...withId.state,
    favorites: [...withId.state.favorites, { id: withId.id, draft: { ...draft, tagIds: [...draft.tagIds] }, at: touch(nowIso) }],
  }
}

// ---------------------------------------------------------------------------
// Autotracker
// ---------------------------------------------------------------------------

export function matchAutotracker(state: TimetrackState, description: string): AutotrackerRule | null {
  const text = description.toLowerCase()
  if (!text.trim()) return null
  return (
    state.autotrackers.find((rule) => rule.enabled && rule.keyword.trim() && text.includes(rule.keyword.toLowerCase())) ??
    null
  )
}

export function applyAutotracker(draft: EntryDraft, rule: AutotrackerRule): EntryDraft {
  return {
    ...draft,
    projectId: rule.projectId,
    taskId: rule.taskId,
    tagIds: [...new Set([...draft.tagIds, ...rule.tagIds])],
  }
}

// ---------------------------------------------------------------------------
// Project periods & alerts
// ---------------------------------------------------------------------------

function addMonths(key: IsoDate, months: number): IsoDate {
  const d = dateKeyToDate(key)
  d.setMonth(d.getMonth() + months)
  return dateKey(d)
}

/**
 * The period a project's estimate applies to.
 * Recurring projects roll forward from `recurringStart`; non-recurring ones use
 * their start/end dates, falling back to "everything up to today".
 */
export function projectPeriod(project: Project, todayKey: IsoDate): { start: IsoDate; end: IsoDate } {
  if (project.recurring && project.recurringPeriod && project.recurringStart) {
    const period = RECURRING_PERIODS.find((p) => p.id === project.recurringPeriod)!
    if (project.recurringPeriod === "monthly" || project.recurringPeriod === "quarterly" || project.recurringPeriod === "yearly") {
      const step = project.recurringPeriod === "monthly" ? 1 : project.recurringPeriod === "quarterly" ? 3 : 12
      let start = monthStartOf(project.recurringStart)
      let next = addMonths(start, step)
      let guard = 0
      while (next <= todayKey && guard < 500) {
        start = next
        next = addMonths(start, step)
        guard++
      }
      return { start, end: addDays(next, -1) }
    }
    const spanDays = period.days
    const elapsed = Math.max(0, daysBetween(project.recurringStart, todayKey))
    const periodsPassed = Math.floor(elapsed / spanDays)
    const start = addDays(project.recurringStart, periodsPassed * spanDays)
    return { start, end: addDays(start, spanDays - 1) }
  }

  return {
    start: project.startDate ?? dateKey(project.createdAt),
    end: project.endDate ?? todayKey,
  }
}

/** Estimate in seconds, honouring auto-estimates (sum of task estimates) */
export function projectEstimateSeconds(state: TimetrackState, project: Project): number | null {
  if (project.autoEstimates) {
    const tasks = state.tasks.filter((t) => t.projectId === project.id)
    const total = tasks.reduce((sum, t) => sum + (t.estimatedSeconds ?? 0), 0)
    return total > 0 ? total : null
  }
  return project.estimatedSeconds
}

export function alertProgressPct(
  state: TimetrackState,
  project: Project,
  basis: "estimate" | "fixed_fee",
  todayKey: IsoDate,
  nowSec: number,
): number {
  const period = projectPeriod(project, todayKey)
  const entries = entriesInRange(
    liveEntries(state).filter((e) => e.projectId === project.id),
    period.start,
    period.end,
  )

  if (basis === "fixed_fee") {
    if (!project.fixedFee) return 0
    const spend = entries.reduce((sum, e) => sum + entryCost(state, e, entrySeconds(e, nowSec)), 0)
    return (spend / project.fixedFee) * 100
  }

  if (project.estimateType === "monetary") {
    if (!project.estimatedAmount) return 0
    const revenue = entries.reduce((sum, e) => sum + entryRevenue(state, e, entrySeconds(e, nowSec)), 0)
    return (revenue / project.estimatedAmount) * 100
  }

  const estimate = projectEstimateSeconds(state, project)
  if (!estimate) return 0
  return (sumSeconds(entries, nowSec) / estimate) * 100
}

/** Fire any project alerts whose threshold has been crossed in the current period */
export function evaluateAlerts(
  state: TimetrackState,
  todayKey: IsoDate,
  nowIso: IsoDateTime,
): TimetrackState {
  const nowSec = epochSeconds(nowIso)
  let next = state
  const newAlerts: AlertEvent[] = []

  for (const project of state.projects.filter((p) => p.active)) {
    const period = projectPeriod(project, todayKey)
    for (const alert of project.alerts.filter((a) => a.enabled)) {
      const pct = alertProgressPct(next, project, alert.basis, todayKey, nowSec)
      if (pct < alert.threshold) continue
      const already = next.alerts.some(
        (a) =>
          a.projectId === project.id &&
          a.basis === alert.basis &&
          a.threshold === alert.threshold &&
          a.periodStart === period.start,
      )
      if (already) continue
      const withId = takeId(next)
      next = withId.state
      newAlerts.push({
        id: withId.id,
        projectId: project.id,
        basis: alert.basis,
        threshold: alert.threshold as AlertThreshold,
        at: nowIso,
        periodStart: period.start,
        read: false,
      })
    }
  }

  if (newAlerts.length === 0) return next
  next = { ...next, alerts: [...newAlerts, ...next.alerts] }
  for (const alert of newAlerts) next = queueWebhook(next, "alert.triggered", alert, nowIso)
  return next
}

export function markAlertsRead(state: TimetrackState): TimetrackState {
  return { ...state, alerts: state.alerts.map((a) => (a.read ? a : { ...a, read: true })) }
}

// ---------------------------------------------------------------------------
// Timesheet approvals
// ---------------------------------------------------------------------------

export function approvalFor(state: TimetrackState, memberId: Id, weekStart: IsoDate): TimesheetApproval | null {
  return state.approvals.find((a) => a.memberId === memberId && a.weekStart === weekStart) ?? null
}

export function setApprovalStatus(
  state: TimetrackState,
  memberId: Id,
  weekStart: IsoDate,
  status: TimesheetApproval["status"],
  nowIso: IsoDateTime,
  note = "",
): TimetrackState {
  const existing = approvalFor(state, memberId, weekStart)
  if (existing) {
    return {
      ...state,
      approvals: replaceById(state.approvals, existing.id, {
        status,
        note,
        submittedAt: status === "submitted" ? nowIso : existing.submittedAt,
        decidedAt: status === "approved" || status === "rejected" ? nowIso : null,
      }),
    }
  }
  const withId = takeId(state)
  return {
    ...withId.state,
    approvals: [
      ...withId.state.approvals,
      {
        id: withId.id,
        memberId,
        weekStart,
        status,
        note,
        submittedAt: status === "submitted" ? nowIso : null,
        decidedAt: status === "approved" || status === "rejected" ? nowIso : null,
      },
    ],
  }
}

// ---------------------------------------------------------------------------
// Webhooks (simulated — logged, never sent from the browser)
// ---------------------------------------------------------------------------

export function queueWebhook(
  state: TimetrackState,
  event: WebhookEventName,
  payload: unknown,
  nowIso: IsoDateTime,
): TimetrackState {
  const hooks = state.webhooks.filter((h) => h.enabled && h.events.includes(event))
  if (hooks.length === 0) return state
  let next = state
  const additions = hooks.map((hook) => {
    const withId = takeId(next)
    next = withId.state
    return {
      id: withId.id,
      at: nowIso,
      event,
      url: hook.url,
      payload: JSON.stringify(payload),
      status: "sent" as const,
    }
  })
  return { ...next, webhookLog: [...additions, ...next.webhookLog].slice(0, 200) }
}

// ---------------------------------------------------------------------------
// Entity CRUD
// ---------------------------------------------------------------------------

export function nextProjectColor(state: TimetrackState): string {
  return PROJECT_COLORS[state.projects.length % PROJECT_COLORS.length]
}

export function addClient(state: TimetrackState, name: string, nowIso: IsoDateTime): { state: TimetrackState; id: Id } {
  const withId = takeId(state)
  const client: Client = { id: withId.id, workspaceId: state.workspace.id, name: name.trim(), archived: false, at: nowIso }
  return { state: { ...withId.state, clients: [...withId.state.clients, client] }, id: withId.id }
}

export function updateClient(state: TimetrackState, id: Id, patch: Partial<Client>): TimetrackState {
  return { ...state, clients: replaceById(state.clients, id, patch) }
}

export function deleteClient(state: TimetrackState, id: Id): TimetrackState {
  return {
    ...state,
    clients: state.clients.filter((c) => c.id !== id),
    projects: state.projects.map((p) => (p.clientId === id ? { ...p, clientId: null } : p)),
  }
}

export type NewProjectInput = Partial<Omit<Project, "id" | "workspaceId" | "at" | "createdAt">> & { name: string }

export function createProject(
  state: TimetrackState,
  input: NewProjectInput,
  nowIso: IsoDateTime,
): { state: TimetrackState; id: Id } {
  const withId = takeId(state)
  const project: Project = {
    id: withId.id,
    workspaceId: state.workspace.id,
    clientId: input.clientId ?? null,
    name: input.name.trim(),
    color: input.color ?? nextProjectColor(state),
    active: input.active ?? true,
    isPrivate: input.isPrivate ?? true,
    billable: input.billable ?? state.workspace.projectsBillableByDefault,
    currency: input.currency ?? state.workspace.defaultCurrency,
    rate: input.rate ?? null,
    rateHistory: input.rateHistory ?? (input.rate != null ? [{ validFrom: dateKey(nowIso), rate: input.rate }] : []),
    estimateType: input.estimateType ?? "hours",
    estimatedSeconds: input.estimatedSeconds ?? null,
    estimatedAmount: input.estimatedAmount ?? null,
    autoEstimates: input.autoEstimates ?? false,
    fixedFee: input.fixedFee ?? null,
    recurring: input.recurring ?? false,
    recurringPeriod: input.recurringPeriod ?? null,
    recurringStart: input.recurringStart ?? null,
    startDate: input.startDate ?? null,
    endDate: input.endDate ?? null,
    template: input.template ?? false,
    alerts: input.alerts ?? [],
    memberIds: input.memberIds ?? [selfMember(state).id],
    at: nowIso,
    createdAt: nowIso,
  }
  let next = { ...withId.state, projects: [...withId.state.projects, project] }
  next = queueWebhook(next, "project.created", project, nowIso)
  return { state: next, id: withId.id }
}

export function updateProject(
  state: TimetrackState,
  id: Id,
  patch: Partial<Project>,
  nowIso: IsoDateTime,
): TimetrackState {
  const current = state.projects.find((p) => p.id === id)
  if (!current) return state
  let rateHistory = patch.rateHistory ?? current.rateHistory
  if (patch.rate !== undefined && patch.rate !== current.rate && patch.rate != null) {
    const day = dateKey(nowIso)
    rateHistory = [...rateHistory.filter((r) => r.validFrom !== day), { validFrom: day, rate: patch.rate }]
  }
  return { ...state, projects: replaceById(state.projects, id, { ...patch, rateHistory, at: nowIso }) }
}

export function deleteProject(state: TimetrackState, id: Id): TimetrackState {
  return {
    ...state,
    projects: state.projects.filter((p) => p.id !== id),
    tasks: state.tasks.filter((t) => t.projectId !== id),
    entries: state.entries.map((e) => (e.projectId === id ? { ...e, projectId: null, taskId: null } : e)),
    alerts: state.alerts.filter((a) => a.projectId !== id),
  }
}

/** Toggl's project templates: clone settings + tasks, not time entries */
export function createProjectFromTemplate(
  state: TimetrackState,
  templateId: Id,
  name: string,
  nowIso: IsoDateTime,
): { state: TimetrackState; id: Id } {
  const template = state.projects.find((p) => p.id === templateId)
  if (!template) return { state, id: -1 }
  const created = createProject(state, { ...template, name, template: false }, nowIso)
  let next = created.state
  for (const task of state.tasks.filter((t) => t.projectId === templateId)) {
    next = createTask(next, { projectId: created.id, name: task.name, estimatedSeconds: task.estimatedSeconds, assigneeId: task.assigneeId }, nowIso).state
  }
  return { state: next, id: created.id }
}

export function createTask(
  state: TimetrackState,
  input: { projectId: Id; name: string; estimatedSeconds?: number | null; assigneeId?: Id | null; rate?: number | null },
  nowIso: IsoDateTime,
): { state: TimetrackState; id: Id } {
  const withId = takeId(state)
  const task: Task = {
    id: withId.id,
    workspaceId: state.workspace.id,
    projectId: input.projectId,
    name: input.name.trim(),
    estimatedSeconds: input.estimatedSeconds ?? null,
    assigneeId: input.assigneeId ?? null,
    rate: input.rate ?? null,
    active: true,
    at: nowIso,
  }
  return { state: { ...withId.state, tasks: [...withId.state.tasks, task] }, id: withId.id }
}

export function updateTask(state: TimetrackState, id: Id, patch: Partial<Task>): TimetrackState {
  return { ...state, tasks: replaceById(state.tasks, id, patch) }
}

export function deleteTask(state: TimetrackState, id: Id): TimetrackState {
  return {
    ...state,
    tasks: state.tasks.filter((t) => t.id !== id),
    entries: state.entries.map((e) => (e.taskId === id ? { ...e, taskId: null } : e)),
  }
}

export function createTag(state: TimetrackState, name: string, nowIso: IsoDateTime): { state: TimetrackState; id: Id } {
  const trimmed = name.trim()
  const existing = state.tags.find((t) => t.name.toLowerCase() === trimmed.toLowerCase())
  if (existing) return { state, id: existing.id }
  const withId = takeId(state)
  const tag: Tag = { id: withId.id, workspaceId: state.workspace.id, name: trimmed, at: nowIso }
  return { state: { ...withId.state, tags: [...withId.state.tags, tag] }, id: withId.id }
}

export function updateTag(state: TimetrackState, id: Id, name: string): TimetrackState {
  return { ...state, tags: replaceById(state.tags, id, { name: name.trim() }) }
}

export function deleteTag(state: TimetrackState, id: Id): TimetrackState {
  return {
    ...state,
    tags: state.tags.filter((t) => t.id !== id),
    entries: state.entries.map((e) =>
      e.tagIds.includes(id) ? { ...e, tagIds: e.tagIds.filter((t) => t !== id) } : e,
    ),
    autotrackers: state.autotrackers.map((r) =>
      r.tagIds.includes(id) ? { ...r, tagIds: r.tagIds.filter((t) => t !== id) } : r,
    ),
  }
}

export function tagUsageCount(state: TimetrackState, tagId: Id): number {
  return liveEntries(state).filter((e) => e.tagIds.includes(tagId)).length
}

export function createMember(
  state: TimetrackState,
  input: { name: string; email: string; role?: Member["role"] },
  nowIso: IsoDateTime,
): { state: TimetrackState; id: Id } {
  const withId = takeId(state)
  const member: Member = {
    id: withId.id,
    workspaceId: state.workspace.id,
    name: input.name.trim(),
    email: input.email.trim(),
    role: input.role ?? "basic",
    hourlyRate: null,
    labourCost: null,
    groupIds: [],
    active: true,
    isSelf: false,
    at: nowIso,
  }
  return { state: { ...withId.state, members: [...withId.state.members, member] }, id: withId.id }
}

export function updateMember(state: TimetrackState, id: Id, patch: Partial<Member>): TimetrackState {
  return { ...state, members: replaceById(state.members, id, patch) }
}

export function deleteMember(state: TimetrackState, id: Id): TimetrackState {
  const member = state.members.find((m) => m.id === id)
  if (!member || member.isSelf) return state
  return { ...state, members: state.members.filter((m) => m.id !== id) }
}

export function createGroup(state: TimetrackState, name: string, nowIso: IsoDateTime): TimetrackState {
  const withId = takeId(state)
  const group: MemberGroup = { id: withId.id, workspaceId: state.workspace.id, name: name.trim(), at: nowIso }
  return { ...withId.state, groups: [...withId.state.groups, group] }
}

export function deleteGroup(state: TimetrackState, id: Id): TimetrackState {
  return {
    ...state,
    groups: state.groups.filter((g) => g.id !== id),
    members: state.members.map((m) =>
      m.groupIds.includes(id) ? { ...m, groupIds: m.groupIds.filter((g) => g !== id) } : m,
    ),
  }
}

/** Toggl's team-member audit: who tracked less than N hours in the range */
export function auditMembers(
  state: TimetrackState,
  range: { start: IsoDate; end: IsoDate },
  maxHours: number,
  nowSec: number,
): { member: Member; seconds: number }[] {
  const entries = entriesInRange(liveEntries(state), range.start, range.end)
  return state.members
    .filter((m) => m.active)
    .map((member) => ({
      member,
      seconds: sumSeconds(entries.filter((e) => e.userId === member.id), nowSec),
    }))
    .filter(({ seconds }) => (maxHours === 0 ? seconds === 0 : seconds < maxHours * 3600))
    .sort((a, b) => a.seconds - b.seconds)
}

// ---------------------------------------------------------------------------
// Generic id-array CRUD used by settings screens
// ---------------------------------------------------------------------------

export function addAutotracker(state: TimetrackState, rule: Omit<AutotrackerRule, "id">): TimetrackState {
  const withId = takeId(state)
  return { ...withId.state, autotrackers: [...withId.state.autotrackers, { ...rule, id: withId.id }] }
}

export function updateAutotracker(state: TimetrackState, id: Id, patch: Partial<AutotrackerRule>): TimetrackState {
  return { ...state, autotrackers: replaceById(state.autotrackers, id, patch) }
}

export function deleteAutotracker(state: TimetrackState, id: Id): TimetrackState {
  return { ...state, autotrackers: state.autotrackers.filter((r) => r.id !== id) }
}

export function addWebhook(state: TimetrackState, url: string, events: WebhookEventName[]): TimetrackState {
  const withId = takeId(state)
  return { ...withId.state, webhooks: [...withId.state.webhooks, { id: withId.id, url, events, enabled: true }] }
}

export function deleteWebhook(state: TimetrackState, id: Id): TimetrackState {
  return { ...state, webhooks: state.webhooks.filter((h) => h.id !== id) }
}

/** Deep link that starts a prefilled entry — Toggl's "Copy start link" */
export function startLinkFor(entry: TimeEntry, origin: string): string {
  const params = new URLSearchParams()
  if (entry.description) params.set("description", entry.description)
  if (entry.projectId !== null) params.set("project", String(entry.projectId))
  if (entry.taskId !== null) params.set("task", String(entry.taskId))
  if (entry.tagIds.length) params.set("tags", entry.tagIds.join(","))
  if (entry.billable) params.set("billable", "1")
  return `${origin}/test/toggl?start=1&${params.toString()}`
}

export function draftFromStartLink(state: TimetrackState, params: URLSearchParams): EntryDraft {
  const projectId = params.get("project") ? Number(params.get("project")) : null
  const taskId = params.get("task") ? Number(params.get("task")) : null
  return {
    description: params.get("description") ?? "",
    projectId: projectById(state, projectId) ? projectId : null,
    taskId: taskById(state, taskId) ? taskId : null,
    tagIds: (params.get("tags") ?? "")
      .split(",")
      .filter(Boolean)
      .map(Number)
      .filter((id) => state.tags.some((t) => t.id === id)),
    billable: params.get("billable") === "1",
  }
}
