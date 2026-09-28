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
  FORGOTTEN_TIMER_HOURS,
  MIN_SPLIT_SECONDS,
  PROJECT_COLORS,
  RECURRING_PERIODS,
} from "./config"
import {
  addDays,
  dateKey,
  dateKeyToDate,
  daysBetween,
  eachDay,
  epochSeconds,
  monthStartOf,
  startOfDayIso,
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

import { newId } from "./idService"

// ---------------------------------------------------------------------------
// Generic helpers
// ---------------------------------------------------------------------------

/** Not a real row: only ever used to answer "would this field be filled in?" */
const PLACEHOLDER_ID: Id = "placeholder"

function takeId(state: TimetrackState): { state: TimetrackState; id: Id } {
  return { state, id: newId() }
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

/**
 * At most one timer may be running. Put that right if two ever arrive.
 *
 * You cannot work on two things at once, and the app only ever shows one:
 * `runningEntry` returns the first it finds. So a second running entry is not a
 * feature, it is an invisible one — still counting, on a clock nobody can see,
 * for as long as it takes somebody to notice their week has too many hours in it.
 *
 * It happens for a real reason. Two devices with no signal each start a timer;
 * when they meet, both are running. The reconciliation is the one that would
 * have happened had they been online: starting a timer stops the one before it,
 * so the newer start wins and the older is stopped at that moment.
 *
 * Returns what it did, so the app can say so rather than fixing it behind the
 * user's back.
 */
export function reconcileRunningEntries(
  state: TimetrackState,
): { state: TimetrackState; stopped: TimeEntry[] } {
  const running = state.entries.filter((e) => isRunning(e) && !e.serverDeletedAt)
  if (running.length < 2) return { state, stopped: [] }

  const newest = running.reduce((latest, entry) => (entry.start > latest.start ? entry : latest))
  const stopped: TimeEntry[] = []

  const entries = state.entries.map((entry) => {
    if (entry.id === newest.id || !isRunning(entry) || entry.serverDeletedAt) return entry
    // stopped where the newer one began: the moment attention moved
    const stop = newest.start
    const seconds = Math.max(0, Math.round((new Date(stop).getTime() - new Date(entry.start).getTime()) / 1000))
    const closed = { ...entry, stop, duration: seconds }
    stopped.push(closed)
    return closed
  })

  return { state: { ...state, entries }, stopped }
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

/**
 * When each project was last tracked against.
 *
 * A picker ordered by the alphabet asks you to know where your own project
 * sits in a list. Ordered by when you last used it, the one you want is
 * usually the first one — which is the whole job on a phone, where the list is
 * behind a tap and under a keyboard.
 */
export function projectLastUsed(state: TimetrackState): Map<Id, IsoDateTime> {
  const last = new Map<Id, IsoDateTime>()
  for (const entry of state.entries) {
    if (entry.serverDeletedAt || entry.projectId === null) continue
    const seen = last.get(entry.projectId)
    if (!seen || entry.start > seen) last.set(entry.projectId, entry.start)
  }
  return last
}

/**
 * Does this project answer to what was typed?
 *
 * Its own name, the name of any live task under it, or the client it belongs
 * to — because "the Acme one" and "the one with the review task" are both how
 * a person looks for a project, and neither used to find anything.
 */
export function projectMatches(state: TimetrackState, project: Project, query: string): boolean {
  const text = query.trim().toLowerCase()
  if (!text) return true
  if (project.name.toLowerCase().includes(text)) return true
  const client = clientById(state, project.clientId)
  if (client && client.name.toLowerCase().includes(text)) return true
  return state.tasks.some(
    (task) => task.projectId === project.id && task.active && task.name.toLowerCase().includes(text),
  )
}

/**
 * THE ONE ANSWER to "which projects does this text mean, and in what order".
 *
 * Both places that offer projects read it — the picker and the description
 * field's autocomplete — so the two can never disagree about what `wri` finds.
 * Never-used projects keep their alphabetical order behind the used ones,
 * rather than being ranked by an id or a creation date nobody can see.
 */
export function searchProjects(state: TimetrackState, query: string, limit?: number): Project[] {
  const lastUsed = projectLastUsed(state)
  const found = state.projects
    .filter((project) => project.active && !project.template && projectMatches(state, project, query))
    .sort((a, b) => {
      const usedA = lastUsed.get(a.id)
      const usedB = lastUsed.get(b.id)
      if (usedA && usedB) return usedA === usedB ? a.name.localeCompare(b.name) : usedA < usedB ? 1 : -1
      if (usedA) return -1
      if (usedB) return 1
      return a.name.localeCompare(b.name)
    })
  return limit === undefined ? found : found.slice(0, limit)
}

/** So a project called "C++ (v2)" is looked for, not compiled */
function escapeForRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

/**
 * Which projects a plain description could mean — the list offered while you
 * type in "What are you working on?", with no `@` involved.
 *
 * Two ways a description points at a project, and both are things people
 * actually type:
 *
 *   "wri"              you are reaching for the name   → the name contains it
 *   "writing the plan" you already said the name       → the text contains it
 *
 * The second is matched on whole words only. A substring test would offer the
 * project "Art" to somebody typing "start", and a suggestion panel over the
 * entry list has to earn its place every time it appears. Short names are held
 * to the first rule alone for the same reason.
 */
export function projectsForDescription(state: TimetrackState, text: string, limit = 4): Project[] {
  const typed = text.trim().toLowerCase()
  if (typed.length < 2) return []
  return searchProjects(state, "")
    .filter((project) => {
      const name = project.name.toLowerCase()
      if (name.includes(typed)) return true
      if (name.length < 3) return false
      const whole = new RegExp(`(?:^|[^\\p{L}\\p{N}])${escapeForRegExp(name)}(?:[^\\p{L}\\p{N}]|$)`, "u")
      return whole.test(typed)
    })
    .slice(0, limit)
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
  candidate: {
    description: string
    projectId: Id | null
    taskId: Id | null
    tagIds: Id[]
    start: IsoDateTime
    /**
     * Required, not optional, on purpose: every caller has to say what the end
     * is, so nobody can skip the rule below by forgetting a field. `null` means
     * the entry is running, which is a real answer.
     */
    stop: IsoDateTime | null
  },
): SaveViolation[] {
  const violations: SaveViolation[] = []
  const required = state.workspace.requiredFields

  /**
   * AN ENTRY CANNOT END BEFORE IT STARTS.
   *
   * This lived nowhere until 2026-09-26. The detail sheet had its own copy, the
   * database had a check constraint, and the inline row — the main editing
   * surface on a desktop — had neither: typing an end before the start turned a
   * 24-minute entry into a zero-length one, and the row the database then
   * refused blocked the upload queue for everything after it.
   *
   * Equal is allowed, because that is the database's rule
   * (`timetrack_entries_stop_after_start`) and because the app makes zero-length
   * entries on its own — press `N` then `S`, or mis-tap Continue.
   */
  if (candidate.stop !== null && epochSeconds(candidate.stop) < epochSeconds(candidate.start)) {
    violations.push({ field: "time", message: "An entry cannot end before it starts" })
  }

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

  violations.push(...lockViolations(state, candidate.start))

  return violations
}

/**
 * THE TWO RULES THAT SAY "THIS DAY IS CLOSED", AND EVERY PATH THAT MUTATES USES THEM.
 *
 * Both locks lived inside `validateEntry`, so only the paths that validated a whole
 * candidate entry were covered. `splitEntry` and `deleteEntries` did not, and a browser
 * round found both going straight through an APPROVED week — Split silently turned one
 * approved entry into two, Delete destroyed one and cheerfully toasted "1 time entry
 * deleted". The same two were unstoppable with `lockEntriesBefore` set.
 *
 * Four other paths did hold, each with a clear refusal — the inline fields are
 * disabled, and Start, Continue and Duplicate all say "Timesheet for the week of … is
 * approved and cannot be changed". So the promise on screen was kept everywhere except
 * the two paths that mutate or destroy the entry, and the destructive one SYNCS: a
 * delete becomes a tombstone on every device.
 *
 * Split out so the rule has one home. `validateEntry` adds the workspace's required
 * fields on top; a delete has no fields to require, only a day that may be closed.
 */
export function lockViolations(state: TimetrackState, startIso: IsoDateTime): SaveViolation[] {
  const violations: SaveViolation[] = []
  const lockBefore = state.workspace.lockEntriesBefore
  const day = dateKey(startIso)
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
      // a stand-in id, only ever compared against "is something set here"
      projectId: entry.projectId ?? (state.workspace.requiredFields.project ? null : PLACEHOLDER_ID),
      taskId: entry.taskId ?? (state.workspace.requiredFields.task ? null : PLACEHOLDER_ID),
      tagIds: entry.tagIds.length ? entry.tagIds : state.workspace.requiredFields.tag ? [] : [PLACEHOLDER_ID],
      start: entry.start,
      stop: entry.stop,
    }).filter((v) => v.field === "date" || v.field === "approval").length === 0
  )
}

// ---------------------------------------------------------------------------
// Timer actions
// ---------------------------------------------------------------------------

/**
 * `displaced` is the timer this one ended, and it is returned because it used to
 * be thrown away right here.
 *
 * Starting a timer stops the running one — Toggl's rule, and the right one. But
 * on a phone the row's "Continue" button sits 8px from the row's own tap area
 * and 4px from the entry menu, so the tap that ends the afternoon you are timing
 * is one a thumb makes by accident. It happened to me while testing something
 * else. Nothing was shown, nothing could be undone, and the loss surfaces as a
 * wrong total days later.
 *
 * So the fact is reported, and the callers that can speak say so.
 */
export function startTimer(
  state: TimetrackState,
  draft: EntryDraft,
  nowIso: IsoDateTime,
): { state: TimetrackState; entry: TimeEntry; violations: SaveViolation[]; displaced: TimeEntry | null } {
  const violations = validateEntry(state, { ...draft, start: nowIso, stop: null })
  if (violations.length > 0) {
    return { state, entry: state.entries[0], violations, displaced: null }
  }

  const ended = stopTimer(state, nowIso)
  let next = ended.state
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
  return { state: next, entry, violations: [], displaced: ended.stopped }
}

export function stopTimer(
  state: TimetrackState,
  nowIso: IsoDateTime,
): { state: TimetrackState; stopped: TimeEntry | null } {
  /**
   * TWO TIMERS ARE AN INCONSISTENCY, NOT TWO PIECES OF WORK.
   *
   * Stopping them both at `now` counted the overlap twice: timers started at
   * 09:00 and 09:30 and stopped at 12:00 totalled five and a half hours for
   * three hours of clock. `reconcileRunningEntries` already states the rule for
   * this exact situation — the older one ends where the newer one began, the
   * moment attention moved — so apply it first and then stop the one that is
   * left.
   */
  const reconciled = reconcileRunningEntries(state)
  const running = runningEntry(reconciled.state)
  if (!running) return { state, stopped: null }
  state = reconciled.state

  /**
   * STOPPING MEANS NOTHING IS RUNNING AFTERWARDS.
   *
   * This used to stop exactly one — `runningEntry` returns the first match in
   * array order — so when two were running, one press stopped one of them and
   * the button still said Stop. Two can appear whenever two devices each start
   * one; `reconcileRunningEntries` only tidies that up on a pull, and in
   * between, the button lied about what it would do.
   *
   * The one the caller is told about is still the one the screen was showing,
   * because that is the entry a toast or an undo is about.
   */
  /**
   * Never before it started. `stopTimer` writes a time without going through
   * `validateEntry`, and a running entry's start stays editable — a future
   * start is not a violation while there is no stop — so pressing Stop used to
   * store `start 15:00 / stop 12:00`, the exact row the database refuses and
   * the upload queue jams on. Clamping gives a zero-length entry, which the
   * rule allows on purpose.
   */
  const stopOne = (entry: TimeEntry): TimeEntry => {
    const stop = epochSeconds(nowIso) < epochSeconds(entry.start) ? entry.start : nowIso
    return {
      ...entry,
      stop,
      duration: Math.max(0, epochSeconds(stop) - epochSeconds(entry.start)),
      at: nowIso,
    }
  }

  const stoppedEntry = stopOne(running)
  let next = {
    ...state,
    entries: state.entries.map((entry) =>
      isRunning(entry) && !entry.serverDeletedAt ? (entry.id === running.id ? stoppedEntry : stopOne(entry)) : entry,
    ),
  }
  next = queueWebhook(next, "time_entry.updated", stoppedEntry, nowIso)
  return { state: next, stopped: stoppedEntry }
}

/** Toggl's "Continue": start a fresh entry with the same draft */
export function continueEntry(
  state: TimetrackState,
  entryId: Id,
  nowIso: IsoDateTime,
): { state: TimetrackState; violations: SaveViolation[]; started: TimeEntry | null; displaced: TimeEntry | null } {
  const source = state.entries.find((e) => e.id === entryId)
  if (!source) return { state, violations: [], started: null, displaced: null }
  const result = startTimer(state, draftOf(source), nowIso)
  return {
    state: result.state,
    violations: result.violations,
    started: result.violations.length > 0 ? null : result.entry,
    displaced: result.displaced,
  }
}

export function createManualEntry(
  state: TimetrackState,
  input: { draft: EntryDraft; start: IsoDateTime; stop: IsoDateTime; sourceEventId?: string | null },
  nowIso: IsoDateTime,
): { state: TimetrackState; violations: SaveViolation[]; entry: TimeEntry | null } {
  const violations = validateEntry(state, { ...input.draft, start: input.start, stop: input.stop })

  /**
   * THE SAME MEETING CANNOT BECOME TWO ENTRIES.
   *
   * `timetrack_entries_source_event_uniq` is
   * `unique (user_id, source_event_id) where source_event_id is not null and
   * deleted_at is null`, and the migration's own comment says it exists "so
   * re-importing the same meeting twice cannot create two entries". Nothing on this
   * side enforced it: the calendar's "Copy as a time entry" button is rendered
   * whether or not the event has already been copied, and event ids are deterministic
   * (`${calendarId}:${uid}:${start}`), so a re-sync offers the same button again.
   *
   * Two clicks therefore doubled the day's tracked time locally, and the second row
   * was refused by the server, dropped from the queue and recorded as sent — so it
   * existed on that browser only and vanished on the next device, with an error toast
   * naming the meeting.
   *
   * Said here rather than in the calendar view because the rule is the data's, not
   * the screen's, and the same function is what an import would call.
   */
  if (input.sourceEventId) {
    const already = state.entries.find((e) => e.sourceEventId === input.sourceEventId && !e.serverDeletedAt)
    if (already) {
      violations.push({
        field: "date",
        message: `That calendar event is already a time entry${already.description.trim() ? ` — “${already.description.trim()}”` : ""}. Edit that one instead of copying it again.`,
      })
    }
  }
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
  /**
   * `resuming` is the one sanctioned way to put a stopped entry back into
   * running — the Undo on the "stopped X and started Y" toast. It is named at
   * the call site so the rule below reads as a rule rather than a guess.
   */
  options: { resuming?: boolean } = {},
): { state: TimetrackState; violations: SaveViolation[] } {
  const current = state.entries.find((e) => e.id === entryId)
  if (!current) return { state, violations: [] }

  /**
   * CLEARING THE END OF A STOPPED ENTRY IS NOT AN EDIT, IT IS A RESTART.
   *
   * A null stop means "running" to every reader of this state. So clearing the
   * end field in the detail sheet set a finished 24-minute entry counting
   * again — and that field is `disabled` while an entry runs, so the control
   * that broke it could not mend it. Reproduced twice, 2026-09-26.
   */
  if (!options.resuming && current.stop !== null && patch.stop === null) {
    return {
      state,
      violations: [
        { field: "time", message: "Clearing the end would start this entry running again — use Continue instead" },
      ],
    }
  }

  const merged: TimeEntry = { ...current, ...patch, at: nowIso }
  /**
   * The clamp stays, and it is not the rule — `validateEntry` refuses a
   * reversed pair before this line. It stays because a NEGATIVE duration is how
   * this state encodes "running" (`isRunning`), so arithmetic that could go
   * below zero here would not produce a wrong number, it would produce a
   * running timer.
   */
  merged.duration = merged.stop === null
    ? runningDurationValue(merged.start)
    : Math.max(0, epochSeconds(merged.stop) - epochSeconds(merged.start))

  const violations = validateEntry(state, {
    description: merged.description,
    projectId: merged.projectId,
    taskId: merged.taskId,
    tagIds: merged.tagIds,
    start: merged.start,
    stop: merged.stop,
  })
  if (violations.length > 0) return { state, violations }

  let next = { ...state, entries: replaceById(state.entries, entryId, merged) }
  next = queueWebhook(next, "time_entry.updated", merged, nowIso)
  return { state: next, violations: [] }
}

/**
 * ONE PLACE DECIDES WHAT AN EDIT IN THE TIMER BAR DOES.
 *
 * The bar is one form with two possible targets: the draft for the entry you
 * are about to start, and the entry that is already running. Before this
 * existed, every control wrote to the draft and NOTHING ever wrote the draft
 * back onto a running entry — so a description typed, a project picked, a tag
 * added or billable flipped AFTER pressing Start was shown back to you in the
 * bar and then discarded. Verified in a browser, all four fields, all four
 * lost; the draft was read exactly once, at Start, and the saved entry read
 * "(no description) · No project". The duration box was the only control in
 * the bar that reached the entry, because it was the only one that had been
 * given its own commit path.
 *
 * On a pointer device the entry list has an inline-editable row that repairs
 * the damage afterwards. That row is `hidden sm:grid`, so on a phone there was
 * no repair and no signal anything had been lost.
 *
 * Which target a control writes to is not a decision each control gets to
 * make. Every one of them comes through here, so the next field added to the
 * bar cannot reintroduce this by forgetting.
 */
export function applyDraftPatch(
  state: TimetrackState,
  draft: EntryDraft,
  patch: Partial<EntryDraft>,
  nowIso: IsoDateTime,
): { state: TimetrackState; draft: EntryDraft; violations: SaveViolation[] } {
  const running = runningEntry(state)
  if (!running) return { state, draft: { ...draft, ...patch }, violations: [] }

  const result = updateEntry(state, running.id, patch, nowIso)
  // A refused edit must not leave the bar showing something the entry does not
  // have. Showing an edit that was not kept is the exact failure this function
  // exists to end, so the draft only moves when the entry did.
  if (result.violations.length > 0) return { state, draft, violations: result.violations }
  return { state: result.state, draft: { ...draft, ...patch }, violations: [] }
}

/** Change a running entry's elapsed time by moving its start (what Toggl does) */
export function setRunningElapsed(
  state: TimetrackState,
  seconds: number,
  nowIso: IsoDateTime,
): { state: TimetrackState; violations: SaveViolation[] } {
  const running = runningEntry(state)
  if (!running) return { state, violations: [] }
  const newStartIso = new Date((epochSeconds(nowIso) - Math.max(0, seconds)) * 1000).toISOString()
  return updateEntry(state, running.id, { start: newStartIso, stop: null }, nowIso)
}

/** Set an entry's duration by moving its stop time (stopped entries only) */
export function setEntryDuration(
  state: TimetrackState,
  entryId: Id,
  seconds: number,
  nowIso: IsoDateTime,
): { state: TimetrackState; violations: SaveViolation[] } {
  const entry = state.entries.find((e) => e.id === entryId)
  if (!entry || isRunning(entry)) return { state, violations: [] }
  const stop = new Date((epochSeconds(entry.start) + Math.max(0, seconds)) * 1000).toISOString()
  return updateEntry(state, entryId, { stop }, nowIso)
}

/**
 * These three used to answer with a bare state, which meant their callers could
 * not report a refusal even if they wanted to: duplicate, the inline duration
 * box and the timer bar's elapsed field all did nothing and said nothing when a
 * workspace requirement or a locked date refused the write. They carry the
 * violations now, like everything else that validates.
 */
export function duplicateEntry(
  state: TimetrackState,
  entryId: Id,
  nowIso: IsoDateTime,
): { state: TimetrackState; violations: SaveViolation[] } {
  const source = state.entries.find((e) => e.id === entryId)
  if (!source || isRunning(source) || !source.stop) return { state, violations: [] }
  const made = createManualEntry(state, { draft: draftOf(source), start: source.start, stop: source.stop }, nowIso)
  return { state: made.state, violations: made.violations }
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
  /**
   * A closed day refuses a split. This checked running, length and split point and
   * never the locks, so Split silently turned one approved entry into two.
   */
  const locked = lockViolations(state, entry.start)
  if (locked.length > 0) return { state, error: locked[0].message }

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

/**
 * A DELETE OBEYS THE LOCKS, AND SAYS SO WHEN IT DOES NOT HAPPEN.
 *
 * This had no validation at all and returned no violations, so a browser round deleted
 * an entry out of an APPROVED week and got "1 time entry deleted · Undo" for it. The
 * delete syncs, so it becomes a tombstone on every device — the most destructive path
 * in the slice was the least guarded one.
 *
 * Refused entries are reported rather than dropped: a bulk delete of ten rows where two
 * sit in a closed week removes the eight it may and names the reason for the rest,
 * because silently removing eight of ten is how somebody discovers this a week later.
 */
export function deleteEntries(
  state: TimetrackState,
  entryIds: Id[],
  nowIso: IsoDateTime,
): { state: TimetrackState; removed: TimeEntry[]; violations: SaveViolation[] } {
  const targets = state.entries.filter((e) => entryIds.includes(e.id))
  const violations: SaveViolation[] = []
  const removable: Id[] = []
  for (const entry of targets) {
    const locked = lockViolations(state, entry.start)
    if (locked.length > 0) violations.push(locked[0])
    else removable.push(entry.id)
  }

  const removed = targets.filter((e) => removable.includes(e.id))
  let next = { ...state, entries: state.entries.filter((e) => !removable.includes(e.id)) }
  for (const entry of removed) next = queueWebhook(next, "time_entry.deleted", entry, nowIso)
  return { state: next, removed, violations }
}

/**
 * Put back the timer a new one displaced: throw away the entry that was just
 * started, and re-open the one it stopped.
 *
 * Deliberately NOT a snapshot-and-restore of the whole workspace. Something else
 * can land inside the seconds a toast is on screen — a pull from another device
 * most of all — and this slice has already had a bug where replacing the whole
 * state with an older copy sent deletions for rows that were never gone. This
 * touches the two entries it is about and nothing else.
 */
export function undoDisplacement(
  state: TimetrackState,
  startedId: Id,
  displacedId: Id,
  nowIso: IsoDateTime,
): TimetrackState {
  const withoutStarted = deleteEntries(state, [startedId], nowIso).state
  // `updateEntry` recomputes duration from a null stop, which is what makes it
  // running again rather than a zero-length entry. `resuming` says so out loud:
  // every other caller is refused this, because for them it is a restart nobody
  // asked for.
  return updateEntry(withoutStarted, displacedId, { stop: null }, nowIso, { resuming: true }).state
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
  /** Replace the tag list outright (used when editing a collapsed group) */
  tagIds?: Id[]
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
    let tagIds = patch.tagIds ? [...patch.tagIds] : entry.tagIds
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
    [...entry.tagIds].sort((a, b) => a.localeCompare(b)).join("."),
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

  /**
   * THE HOURS THAT FALL INSIDE THE WEEK, NOT THE WHOLE LENGTH OF EVERY ENTRY THAT
   * STARTED IN IT.
   *
   * This filtered on the start day and then summed each entry's full duration, so a
   * Sunday-night shift ending Monday morning read "This week 0:00" while the calendar
   * beside it read 7:00 for the Monday. `entryDaySeconds` splits an entry at local
   * midnight and is the one function with a written argument for why that is what a
   * day's hours means; every other place that bucketed by day had invented its own
   * answer.
   */
  return eachDay(start, end).reduce((total, day) => total + daySeconds(entries, day, nowSec), 0)
}

/**
 * The real tracked seconds of `entry` that fall inside `day`.
 *
 * The bounds are local midnights — this day's, and the next one's — rather than
 * `endOfDayIso`, which is 23:59:59.999 and, with `epochSeconds` flooring, would
 * lose a second at every midnight and look exactly like the bug this replaces.
 * Local midnights also mean the 23- and 25-hour days at a clock change total
 * correctly; `start + 86400` would not.
 */
/**
 * The tracked seconds of `entry` that fall inside the days `from`..`to` INCLUSIVE.
 *
 * O(1). The first version of the cross-midnight fix had no such thing: it asked
 * `entryDaySeconds` once per day of the RANGE, per entry, so the four report builders
 * became O(entries x days). Measured on a plain year of tracking — 300 entries, the
 * "This year" preset — that is 1508 ms, against 5 ms before; 1500 entries is 7480 ms.
 * `ReportsView` rebuilds all four in a `useMemo` keyed on `nowSec`, which ticks every
 * second while a timer runs, so the Reports screen simply stopped finishing frames.
 *
 * Clipping the interval is the same arithmetic done once instead of once per day, and
 * `entryDaySeconds` is now this with `from === to`.
 */
export function entrySecondsInRange(entry: TimeEntry, from: IsoDate, to: IsoDate, nowSec: number): number {
  const end = entry.stop ? epochSeconds(entry.stop) : epochSeconds(entry.start) + entrySeconds(entry, nowSec)
  const windowStart = Math.max(epochSeconds(startOfDayIso(from)), epochSeconds(entry.start))
  const windowEnd = Math.min(epochSeconds(startOfDayIso(addDays(to, 1))), end)
  return Math.max(0, windowEnd - windowStart)
}

/**
 * The days between `from` and `to` that this entry ACTUALLY touches — never more than
 * the two a cross-midnight shift spans, where walking the range would walk 365.
 */
export function entryDaysInRange(entry: TimeEntry, from: IsoDate, to: IsoDate, nowSec: number): IsoDate[] {
  if (entrySecondsInRange(entry, from, to, nowSec) <= 0) return []
  const end = entry.stop ? entry.stop : new Date((epochSeconds(entry.start) + entrySeconds(entry, nowSec)) * 1000).toISOString()
  let day = dateKey(entry.start)
  if (day < from) day = from
  const lastDay = dateKey(end) < to ? dateKey(end) : to
  const days: IsoDate[] = []
  while (day <= lastDay) {
    days.push(day)
    day = addDays(day, 1)
  }
  return days
}

export function entryDaySeconds(entry: TimeEntry, day: IsoDate, nowSec: number): number {
  /**
   * The entry's effective end, worked out ONCE rather than clamped per day.
   *
   * The clamp used to sit inside the per-day slice: `Math.min(visible,
   * entrySeconds(...))`, which is the entry's WHOLE length, so a row spanning
   * two days could have each day clamped to the total and be counted twice.
   * Deriving the end from the elapsed time instead is correct for every shape,
   * including the one the old clamp existed for — no stop, but a stored
   * duration, which `isRunning` still calls running.
   */
  return entrySecondsInRange(entry, day, day, nowSec)
}

/** The seconds of these entries that fall on one local day. */
export function daySeconds(entries: TimeEntry[], day: IsoDate, nowSec: number): number {
  return entries.reduce((sum, e) => sum + (e.serverDeletedAt ? 0 : entryDaySeconds(e, day, nowSec)), 0)
}

/**
 * Entries with any time inside the range — OVERLAP, not "started in it".
 *
 * This selected on `dateKey(e.start)`, so a shift from Sunday 23:00 to Monday 07:00 was
 * excluded from a report for Monday to Sunday entirely: seven of its eight hours were in
 * the range and the report said "0 entries · 0 active days", while the calendar showed
 * 7:00 for that Monday. Absent, not misattributed — a defect under any model of what a
 * day is.
 */
/**
 * The seconds of `entries` that fall INSIDE `start`..`end` — the number every screen
 * that shows "tracked in this period" wants.
 *
 * `entriesInRange` selects by OVERLAP, so a Sunday-night shift is returned for both the
 * week it starts in and the week it ends in. That is right for selection and wrong for
 * summing: the first version of the cross-midnight fix converted only the report
 * builders, and left eight callers doing `sumSeconds(entriesInRange(...))` — so an
 * eight-hour night shift read 8h in the previous week AND 8h in the next, sixteen hours
 * for eight worked, while `weekTotalSeconds` on the Timer beside it correctly said 7.
 * Manage → Team's "Tracked (week)" and the timesheet-approval row — the number a
 * manager signs off — were two of the eight.
 *
 * Before that change those callers were wrong by attribution but counted once. After
 * it they double-counted, which is worse, so this exists and all eight use it.
 */
export function secondsInRangeOf(entries: TimeEntry[], start: IsoDate, end: IsoDate, nowSec: number): number {
  return entriesInRange(entries, start, end, nowSec).reduce(
    (total, e) => total + entrySecondsInRange(e, start, end, nowSec),
    0,
  )
}

/**
 * `nowSec` RATHER THAN THE WALL CLOCK. A running entry's last day is "today", and the
 * first version of this read `new Date()` for it — so a pure selector became impure and
 * ignored the frozen clock every other function in the slice is handed. `buildSummary`
 * then judged an entry's SECONDS against `nowSec` and its MEMBERSHIP against real now,
 * which is two clocks in one report, and made the tests' own results depend on when
 * they ran.
 */
export function entriesInRange(entries: TimeEntry[], start: IsoDate, end: IsoDate, nowSec: number): TimeEntry[] {
  return entries.filter((e) => {
    const firstDay = dateKey(e.start)
    // the entry's effective end, by the same rule `entrySecondsInRange` uses
    const lastDay = dateKey(e.stop ?? new Date(nowSec * 1000).toISOString())
    // touches the range if it starts before the end of it and ends after the start
    return firstDay <= end && lastDay >= start
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
    nowSec,
  )

  /**
   * THE SECONDS INSIDE THE PERIOD, not the whole length of every entry that touched it.
   * `entriesInRange` selects by overlap, so a shift starting the evening before a period
   * used to contribute its WHOLE duration to that period's progress — 80% against a ten
   * hour estimate where seven hours were worked, which is enough to fire a 75% alert
   * that should not fire, and to fire it in two consecutive periods for one shift.
   */
  const inPeriod = (e: TimeEntry) => entrySecondsInRange(e, period.start, period.end, nowSec)

  if (basis === "fixed_fee") {
    if (!project.fixedFee) return 0
    const spend = entries.reduce((sum, e) => sum + entryCost(state, e, inPeriod(e)), 0)
    return (spend / project.fixedFee) * 100
  }

  if (project.estimateType === "monetary") {
    if (!project.estimatedAmount) return 0
    const revenue = entries.reduce((sum, e) => sum + entryRevenue(state, e, inPeriod(e)), 0)
    return (revenue / project.estimatedAmount) * 100
  }

  const estimate = projectEstimateSeconds(state, project)
  if (!estimate) return 0
  return (entries.reduce((sum, e) => sum + inPeriod(e), 0) / estimate) * 100
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
      // the column is `not null`; a log row without this cannot be stored at all
      webhookId: hook.id,
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

/**
 * A SAVED REPORT LETS GO OF SOMETHING THAT HAS BEEN DELETED.
 *
 * `savedReports[].config.filters` is the fourth place an id list lives, after the
 * entries, the autotracker rules and the favourites — and none of the five delete
 * functions touched it. `applyFilters` then matches nothing, so the person opens
 * "Billable, October" and it is empty, while the filter count still says one and the
 * dropdown shows nothing selected because the id is not in the workspace any more.
 *
 * Rounds 5 and 6 closed this class for the other three holders one at a time. This is
 * the one function all five deletes call, so the next id list added to a saved report
 * has one place to be swept rather than five.
 */
function forgetInSavedReports(
  state: TimetrackState,
  gone: Partial<Record<"clientIds" | "projectIds" | "taskIds" | "tagIds" | "memberIds", Id[]>>,
): TimetrackState["savedReports"] {
  return state.savedReports.map((report) => {
    let filters = report.config.filters
    let changed = false
    for (const [field, ids] of Object.entries(gone) as [keyof typeof gone, Id[]][]) {
      const current = filters[field]
      const kept = current.filter((x) => !ids.includes(x))
      if (kept.length !== current.length) {
        filters = { ...filters, [field]: kept }
        changed = true
      }
    }
    // the same object back when nothing matched, so a report nobody touched is not
    // re-created on every delete
    return changed ? { ...report, config: { ...report.config, filters } } : report
  })
}

export function deleteClient(state: TimetrackState, id: Id): TimetrackState {
  return {
    ...state,
    clients: state.clients.filter((c) => c.id !== id),
    projects: state.projects.map((p) => (p.clientId === id ? { ...p, clientId: null } : p)),
    savedReports: forgetInSavedReports(state, { clientIds: [id] }),
  }
}

export type NewProjectInput = Partial<Omit<Project, "id" | "workspaceId" | "at" | "createdAt">> & { name: string }

/**
 * THE RULES THE DATABASE WILL ENFORCE ANYWAY, CHECKED WHERE THEY ARE TYPED.
 *
 * The project editor's whole validator was `if (!draft.name.trim())`. Everything
 * else went straight to a row the database refuses:
 *
 *   - a Start date after an End date (two free `type="date"` inputs) —
 *     `timetrack_projects_dates_ordered`;
 *   - a negative Hourly rate, Fixed fee or Monetary budget (no `min` on any of the
 *     three) — `rate >= 0`, `fixed_fee >= 0`, `estimated_amount >= 0`;
 *   - a recurring project with no period or no first-period date —
 *     `timetrack_projects_recurring_complete`, and an empty date string is not a
 *     date at all;
 *   - a name cleared to nothing in the rename inputs — `*_name_not_blank`.
 *
 * WHY IT IS NOT COSMETIC. `timetrack_projects` is table 3 of 19, so a refusal there
 * stops tasks, tags and entries in the same batch. And the browser drops a refused
 * row from the queue while recording it as sent — which self-heals for an existing
 * project on its next edit, but for a NEW one the project is marked synced while the
 * server has no such row, and every entry pointing at it then fails its own foreign
 * key at table 9 and is dropped the same way.
 *
 * The list is taken from the CHECK constraints in `20260903120000_timetrack.sql`, so
 * it says what the database says rather than what seemed sensible here.
 */
export function validateProject(input: {
  name?: string
  startDate?: IsoDate | null
  endDate?: IsoDate | null
  rate?: number | null
  fixedFee?: number | null
  estimatedAmount?: number | null
  estimatedSeconds?: number | null
  recurring?: boolean
  recurringPeriod?: string | null
  recurringStart?: IsoDate | null
}): SaveViolation[] {
  const violations: SaveViolation[] = []

  if (!(input.name ?? "").trim()) {
    violations.push({ field: "description", message: "A project needs a name." })
  }
  if (input.startDate && input.endDate && input.endDate < input.startDate) {
    violations.push({
      field: "date",
      message: `This project would end before it starts — ${input.endDate} is before ${input.startDate}.`,
    })
  }
  for (const [label, value] of [
    ["hourly rate", input.rate],
    ["fixed fee", input.fixedFee],
    ["monetary budget", input.estimatedAmount],
    ["time estimate", input.estimatedSeconds],
  ] as const) {
    if (value != null && value < 0) {
      violations.push({ field: "project", message: `A ${label} cannot be negative.` })
    }
  }
  if (input.recurring) {
    if (!input.recurringPeriod) {
      violations.push({ field: "project", message: "A recurring project needs a period — pick how often it repeats." })
    }
    if (!input.recurringStart) {
      violations.push({ field: "date", message: "A recurring project needs a date for its first period." })
    }
  }

  return violations
}

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
    // `|| null`, not `?? null`: an empty string is what a cleared `type="date"`
    // sends, and `""` in a Postgres `date` column is "invalid input syntax for
    // type date", which refuses the whole batch
    recurringStart: input.recurringStart || null,
    startDate: input.startDate ?? null,
    endDate: input.endDate ?? null,
    template: input.template ?? false,
    /**
     * A NEW PROJECT'S ALERTS ARE NEW ROWS, SO THEY GET NEW IDS.
     *
     * This took the caller's alerts verbatim, and `createProjectFromTemplate` passes
     * `{ ...template }` — so a project created from a template carried the
     * TEMPLATE'S alert ids. `stateToRows` then emitted two `timetrack_project_alerts`
     * rows sharing one primary key, `diffRows` indexes by key and keeps the last, and
     * the one that survived was the clone's. Upserted `on conflict (id)`, that
     * rewrote the server's row to point at the clone: the template's budget alarm was
     * gone server-side, and because the local duplicate collapses to the same single
     * row every time, the diff saw nothing to put back. Clone twice and two projects
     * lose their alerts. What the person loses is "tell me at 80% of the estimate" —
     * silently, at the next reload.
     *
     * The tasks in that same function already get fresh ids through `createTask`.
     * The alerts were the one collection copied straight across.
     */
    alerts: (input.alerts ?? []).map((alert) => ({ ...alert, id: newId() })),
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
  /**
   * THE SAME EMPTY-STRING GUARD `createProject` GOT, BECAUSE THIS IS THE PATH AN
   * EXISTING PROJECT TAKES.
   *
   * Round 5 fixed `createProject` and left this one passing the patch through
   * untouched, which is the incomplete class fix this project's rule 3 is about.
   * Reachable on an existing project: tick "Recurring estimate", clear "First period
   * starts", untick "Recurring estimate", Save. `validateProject` returns nothing
   * because `recurring` is false by then, and `""` reaches
   * `timetrack_projects.recurring_start` — "invalid input syntax for type date",
   * refusing table 3 of 19 and taking the tasks, tags and entries of that push with
   * it. `??` does not catch `""`, which is why the mapper did not save it either.
   */
  const dates: Partial<Project> = {}
  if (patch.recurringStart !== undefined) dates.recurringStart = patch.recurringStart || null
  if (patch.startDate !== undefined) dates.startDate = patch.startDate || null
  if (patch.endDate !== undefined) dates.endDate = patch.endDate || null

  return {
    ...state,
    projects: replaceById(state.projects, id, { ...patch, ...dates, rateHistory, at: nowIso }),
  }
}

/**
 * EVERYTHING THAT POINTED AT IT STOPS POINTING AT IT — INCLUDING THE THINGS THAT
 * CREATE FUTURE ENTRIES.
 *
 * This unhooked the entries and left the autotracker rules and the favourites
 * holding the dead id. Because deletes here are SOFT on the server (`deleted_at`),
 * the `on delete cascade` on `timetrack_autotracker_rules.project_id` never fires,
 * so the foreign key is satisfied and the row is accepted — the reference just does
 * not resolve.
 *
 * What that costs: a rule matching "invoice" kept `projectId: "30"`, `applyAutotracker`
 * handed it to the timer bar, `startTimer` accepted it with no violations, and every
 * entry the rule created afterwards carried a project id nothing resolves. The entry
 * list shows "No project", which is indistinguishable from a rule that deliberately
 * has none, so there is no way to see it is broken — and the entry's money falls
 * through to the member or workspace rate instead of the project rate. The whole
 * point of setting `projectId` to null on the existing entries was bypassed for
 * everything created after the delete.
 *
 * The tasks of a deleted project go too, so their ids are stripped as well.
 * `deleteTag` has always done this for its own references; these two had not.
 */
export function deleteProject(state: TimetrackState, id: Id): TimetrackState {
  const orphanedTaskIds = new Set(state.tasks.filter((t) => t.projectId === id).map((t) => t.id))
  const forgetProject = <T extends { projectId: Id | null; taskId: Id | null }>(ref: T): T => ({
    ...ref,
    projectId: ref.projectId === id ? null : ref.projectId,
    taskId: ref.taskId !== null && (ref.projectId === id || orphanedTaskIds.has(ref.taskId)) ? null : ref.taskId,
  })

  return {
    ...state,
    projects: state.projects.filter((p) => p.id !== id),
    tasks: state.tasks.filter((t) => t.projectId !== id),
    entries: state.entries.map((e) => (e.projectId === id ? { ...e, projectId: null, taskId: null } : e)),
    alerts: state.alerts.filter((a) => a.projectId !== id),
    autotrackers: state.autotrackers.map(forgetProject),
    favorites: state.favorites.map((f) => ({ ...f, draft: forgetProject(f.draft) })),
    /**
     * THE PROJECT'S TASKS GO TOO, SO THEIR IDS GO FROM THE FILTERS AS WELL.
     *
     * The first version of this swept `projectIds` only, while the same function
     * deletes every task belonging to the project three lines above and strips those
     * task ids from the autotracker rules and the favourites. A saved report therefore
     * kept a task id that no longer resolves — verbatim the symptom this helper was
     * written to end: the report opens empty while the filter count still reads one
     * and the dropdown shows nothing selected.
     */
    savedReports: forgetInSavedReports(state, { projectIds: [id], taskIds: [...orphanedTaskIds] }),
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
  if (!template) return { state, id: "" }
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

/** As `deleteProject`: the rules and favourites that create future entries let go too. */
export function deleteTask(state: TimetrackState, id: Id): TimetrackState {
  const forgetTask = <T extends { taskId: Id | null }>(ref: T): T => ({
    ...ref,
    taskId: ref.taskId === id ? null : ref.taskId,
  })
  return {
    ...state,
    tasks: state.tasks.filter((t) => t.id !== id),
    entries: state.entries.map((e) => (e.taskId === id ? { ...e, taskId: null } : e)),
    autotrackers: state.autotrackers.map(forgetTask),
    favorites: state.favorites.map((f) => ({ ...f, draft: forgetTask(f.draft) })),
    savedReports: forgetInSavedReports(state, { taskIds: [id] }),
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
    /**
     * AND THE FAVOURITES, WHICH THIS HAD ALWAYS MISSED.
     *
     * Round 5 added favourites to `deleteProject` and `deleteTask` and cited this
     * function as the model — true for the entries and the autotracker rules, and not
     * for `favorites[].draft.tagIds`. A starred draft went on creating entries with a
     * tag id that resolves to nothing; with "tag required" switched on it satisfies
     * the requirement while showing no tag, and because tag deletes are soft on the
     * server the link's foreign key is satisfied so nothing refuses it.
     */
    favorites: state.favorites.map((f) =>
      f.draft.tagIds.includes(id) ? { ...f, draft: { ...f.draft, tagIds: f.draft.tagIds.filter((t) => t !== id) } } : f,
    ),
    savedReports: forgetInSavedReports(state, { tagIds: [id] }),
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
  return {
    ...state,
    members: state.members.filter((m) => m.id !== id),
    savedReports: forgetInSavedReports(state, { memberIds: [id] }),
  }
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
  // the hours INSIDE the range: a night shift used to be counted in full in both of the
  // weeks it touched, so "tracked less than N hours" could clear a member twice over
  const entries = entriesInRange(liveEntries(state), range.start, range.end, nowSec)
  return state.members
    .filter((m) => m.active)
    .map((member) => ({
      member,
      seconds: entries
        .filter((e) => e.userId === member.id)
        .reduce((total, e) => total + entrySecondsInRange(e, range.start, range.end, nowSec), 0),
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

/**
 * AN ADDRESS THE DATABASE WILL REFUSE IS REFUSED HERE, NOT IN SIX HOURS.
 *
 * `timetrack_webhooks` carries `check (url ~* '^https://')`, and nothing checked
 * before this: a typed `http://` or a bare `example.com/hook` was accepted, and
 * then refused by the database every time it was offered. That is not confined to
 * the webhook either — `timetrack_webhooks` is written before
 * `timetrack_webhook_log`, `timetrack_autotracker_rules`, `timetrack_timeline`,
 * `timetrack_calendars` and `timetrack_settings`, and a throw stops the rest. One
 * missing "s" and the person's preferences stop syncing.
 *
 * The rule is the database's, stated once here in the language the person typed
 * in. Other checks in this schema still have no client-side half — the recurring
 * project shape, the timeline ordering, the alert threshold range and the
 * not-blank names — and each is the same kind of permanent block.
 */
export function addWebhook(
  state: TimetrackState,
  url: string,
  events: WebhookEventName[],
): { state: TimetrackState; violations: SaveViolation[] } {
  const trimmed = url.trim()
  if (!/^https:\/\/\S+$/i.test(trimmed)) {
    return {
      state,
      violations: [
        {
          field: "description",
          message: trimmed.toLowerCase().startsWith("http://")
            ? "A webhook address has to start with https:// — an http:// one is refused by your account and would stop your settings saving."
            : "That is not a webhook address. It has to start with https://, like https://example.com/hook.",
        },
      ],
    }
  }
  const withId = takeId(state)
  return {
    state: { ...withId.state, webhooks: [...withId.state.webhooks, { id: withId.id, url: trimmed, events, enabled: true }] },
    violations: [],
  }
}

export function deleteWebhook(state: TimetrackState, id: Id): TimetrackState {
  return { ...state, webhooks: state.webhooks.filter((h) => h.id !== id) }
}

/**
 * Deep link that starts a prefilled entry — Toggl's "Copy start link".
 *
 * `path` is where the tracker is being used from, because these components are
 * mounted twice: at `/dashboard/time`, which is the product, and at
 * `/test/toggl`, which is the lab. It was hard-coded to the lab, so every link
 * this ever produced pointed at a page that 404s in production
 * (`app/test/layout.tsx` calls `notFound()` there) — a "copy link" that hands
 * somebody a dead address.
 */
export function startLinkFor(entry: TimeEntry, origin: string, path = "/dashboard/time"): string {
  const params = new URLSearchParams()
  if (entry.description) params.set("description", entry.description)
  if (entry.projectId !== null) params.set("project", String(entry.projectId))
  if (entry.taskId !== null) params.set("task", String(entry.taskId))
  if (entry.tagIds.length) params.set("tags", entry.tagIds.join(","))
  if (entry.billable) params.set("billable", "1")
  return `${origin}${path}?start=1&${params.toString()}`
}

export function draftFromStartLink(state: TimetrackState, params: URLSearchParams): EntryDraft {
  const projectId = params.get("project") || null
  const taskId = params.get("task") || null
  return {
    description: params.get("description") ?? "",
    projectId: projectById(state, projectId) ? projectId : null,
    taskId: taskById(state, taskId) ? taskId : null,
    tagIds: (params.get("tags") ?? "")
      .split(",")
      .filter(Boolean)
      .filter((id) => state.tags.some((t) => t.id === id)),
    billable: params.get("billable") === "1",
  }
}

/**
 * A timer running for an implausible length of time is almost always one that
 * was forgotten. Toggl nags rather than editing it, so this only reports.
 */
export function forgottenTimer(state: TimetrackState, nowSec: number): { entry: TimeEntry; hours: number } | null {
  const running = runningEntry(state)
  if (!running) return null
  const hours = entrySeconds(running, nowSec) / 3600
  if (hours < FORGOTTEN_TIMER_HOURS) return null
  return { entry: running, hours }
}
