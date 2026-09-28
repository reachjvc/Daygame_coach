/**
 * Time-tracking slice — import & export.
 *
 * - Full workspace JSON backup/restore (everything localStorage holds).
 * - Time-entry CSV import shaped after Toggl's own export columns
 *   (Description, Project, Client, Task, Tags, Billable, Start date, Start time,
 *   End date, End time, Duration) — missing clients/projects/tags are created.
 */

import { STATE_VERSION } from "./config"
import { dateKey, epochSeconds, parseDurationInput, parseTimeInput, startOfDayIso } from "./timetrackFormatService"
import { addClient, createManualEntry, createProject, createTag, createTask } from "./timetrackService"
import type { Id, IsoDateTime, TimetrackState } from "./types"

// ---------------------------------------------------------------------------
// JSON backup
// ---------------------------------------------------------------------------

export function exportStateJson(state: TimetrackState): string {
  return JSON.stringify(state, null, 2)
}

export function importStateJson(text: string): { state: TimetrackState | null; error: string | null } {
  let parsed: unknown
  try {
    parsed = JSON.parse(text)
  } catch {
    return { state: null, error: "File is not valid JSON" }
  }
  const candidate = parsed as Partial<TimetrackState>
  if (!candidate || typeof candidate !== "object") return { state: null, error: "Backup is not an object" }
  if (candidate.version !== STATE_VERSION) {
    return { state: null, error: `Backup version ${String(candidate.version)} does not match ${STATE_VERSION}` }
  }
  if (!Array.isArray(candidate.entries) || !candidate.workspace) {
    return { state: null, error: "Backup is missing entries or workspace" }
  }
  return { state: candidate as TimetrackState, error: null }
}

// ---------------------------------------------------------------------------
// CSV parsing
// ---------------------------------------------------------------------------

/** RFC 4180-ish CSV row splitter (handles quoted fields and escaped quotes) */
/**
 * A RESTORE PUTS A BACKUP'S CONTENTS INTO **YOUR** WORKSPACE.
 *
 * It used to install the backup's own workspace record, id and all. The Backup
 * card offers exactly that journey — "Export a copy to keep outside this app, or
 * to move it to another browser" — and on 2026-09-27 the mass-deletion guard
 * started refusing it, because a live workspace row the server has never seen
 * beside deletions for everything it does have is also the signature of the
 * bad-read incident the guard exists to stop. Measured: restoring a 20-entry
 * backup into a 3-entry account was refused as "a change that would delete 13 of
 * your saved items" — a restore that GREW the account.
 *
 * And the refusal's advice made it worse. The toast says to reload; a reload runs
 * first contact, finds the server's copy differs, and installs it — so following
 * the only instruction on screen is what destroys the restore.
 *
 * Keeping this account's workspace id is also the truthful reading of the act: the
 * person is restoring their time into the workspace they are signed into, not
 * adopting a second workspace. Everything the backup's workspace record actually
 * carries — its name, currency, rounding, required fields, the lock date — is
 * kept. Only the identity is this account's.
 */
export function restoreIntoWorkspace(backup: TimetrackState, workspaceId: Id): TimetrackState {
  if (backup.workspace.id === workspaceId) return backup
  const reattach = <T extends { workspaceId: Id }>(rows: T[]): T[] => rows.map((row) => ({ ...row, workspaceId }))
  return {
    ...backup,
    workspace: { ...backup.workspace, id: workspaceId },
    members: reattach(backup.members),
    groups: reattach(backup.groups),
    clients: reattach(backup.clients),
    projects: reattach(backup.projects),
    tasks: reattach(backup.tasks),
    tags: reattach(backup.tags),
    entries: reattach(backup.entries),
  }
}

export function parseCsvRows(text: string): string[][] {
  const rows: string[][] = []
  let row: string[] = []
  let field = ""
  let inQuotes = false

  for (let i = 0; i < text.length; i++) {
    const char = text[i]
    if (inQuotes) {
      if (char === '"') {
        if (text[i + 1] === '"') {
          field += '"'
          i++
        } else {
          inQuotes = false
        }
      } else {
        field += char
      }
      continue
    }
    if (char === '"') {
      inQuotes = true
    } else if (char === ",") {
      row.push(field)
      field = ""
    } else if (char === "\n" || char === "\r") {
      if (char === "\r" && text[i + 1] === "\n") i++
      row.push(field)
      field = ""
      if (row.some((cell) => cell.trim() !== "")) rows.push(row)
      row = []
    } else {
      field += char
    }
  }
  row.push(field)
  if (row.some((cell) => cell.trim() !== "")) rows.push(row)
  return rows
}

export interface CsvImportResult {
  state: TimetrackState
  imported: number
  skipped: { line: number; reason: string }[]
}

function headerIndex(header: string[], ...names: string[]): number {
  const normalized = header.map((h) => h.trim().toLowerCase())
  for (const name of names) {
    const index = normalized.indexOf(name.toLowerCase())
    if (index !== -1) return index
  }
  return -1
}

/** The largest time value a `Date` can hold; past it `toISOString()` throws. */
const MAX_DATE_MS = 8.64e15

export function importEntriesCsv(
  state: TimetrackState,
  text: string,
  nowIso: IsoDateTime,
): CsvImportResult {
  const rows = parseCsvRows(text)
  if (rows.length < 2) return { state, imported: 0, skipped: [{ line: 1, reason: "No data rows found" }] }

  const header = rows[0]
  const idx = {
    description: headerIndex(header, "description"),
    project: headerIndex(header, "project"),
    client: headerIndex(header, "client"),
    task: headerIndex(header, "task"),
    tags: headerIndex(header, "tags"),
    billable: headerIndex(header, "billable"),
    startDate: headerIndex(header, "start date", "start_date"),
    startTime: headerIndex(header, "start time", "start_time"),
    endDate: headerIndex(header, "end date", "end_date"),
    endTime: headerIndex(header, "end time", "end_time"),
    duration: headerIndex(header, "duration"),
    start: headerIndex(header, "start"),
    stop: headerIndex(header, "stop", "end"),
  }

  let next = state
  let imported = 0
  const skipped: { line: number; reason: string }[] = []

  for (let r = 1; r < rows.length; r++) {
    const row = rows[r]
    const cell = (index: number) => (index >= 0 ? (row[index] ?? "").trim() : "")

    // Resolve start / stop from either ISO columns or Toggl's split date+time columns
    let startIso: IsoDateTime | null = null
    let stopIso: IsoDateTime | null = null

    if (cell(idx.start)) {
      const parsed = new Date(cell(idx.start))
      if (!Number.isNaN(parsed.getTime())) startIso = parsed.toISOString()
    }
    if (!startIso && cell(idx.startDate)) {
      const day = normalizeDate(cell(idx.startDate))
      /**
       * MIDNIGHT IS A LOCAL TIME. `T00:00:00.000Z` IS SOMEBODY ELSE'S MIDNIGHT.
       *
       * A row with a start date and no start time used to become UTC midnight.
       * Anywhere west of Greenwich that is the evening BEFORE — so in New York
       * every date-only row in an import landed on the previous day, in the entry
       * list, in the calendar and in every report. East of Greenwich it happened
       * to look right, which is why it survived.
       *
       * Every other date in this slice is a local wall-clock day, including
       * `parseTimeInput` on the line above. `startOfDayIso` is the same rule.
       */
      if (day) startIso = cell(idx.startTime) ? parseTimeInput(cell(idx.startTime), day) : startOfDayIso(day)
    }
    if (!startIso) {
      skipped.push({ line: r + 1, reason: "Missing or unreadable start" })
      continue
    }

    if (cell(idx.stop)) {
      const parsed = new Date(cell(idx.stop))
      if (!Number.isNaN(parsed.getTime())) stopIso = parsed.toISOString()
    }
    if (!stopIso && cell(idx.endDate)) {
      const day = normalizeDate(cell(idx.endDate))
      if (day) stopIso = cell(idx.endTime) ? parseTimeInput(cell(idx.endTime), day) : null
    }
    if (!stopIso && cell(idx.duration)) {
      const seconds = parseDurationInput(cell(idx.duration))
      /**
       * A DURATION TOO BIG FOR A DATE IS A SKIPPED ROW, NOT A THROWN IMPORT.
       *
       * `parseDurationInput` caps the `h:mm:ss` form at three digits of hours but puts
       * no ceiling on the unit form, so one cell reading `999999999999999h` pushed the
       * stop past the ±8.64e15 ms a `Date` can hold and `toISOString()` raised
       * `RangeError: Invalid time value`. That escaped `importEntriesCsv` entirely:
       * every row in the file was lost, including the good ones, and the caller's
       * promise rejected with nothing catching it — so the button appeared to do
       * nothing at all, which is the same silence the JSON import above was fixed for.
       *
       * Verified by importing that cell: `RangeError` before, `skipped` after.
       */
      if (seconds !== null) {
        const stopMs = (epochSeconds(startIso) + seconds) * 1000
        if (Number.isFinite(stopMs) && Math.abs(stopMs) <= MAX_DATE_MS) stopIso = new Date(stopMs).toISOString()
        else {
          skipped.push({ line: r + 1, reason: "Duration is too long to be a date" })
          continue
        }
      }
    }
    if (!stopIso) {
      skipped.push({ line: r + 1, reason: "Missing duration and end time" })
      continue
    }

    // Resolve/create client → project → task → tags
    let clientId: Id | null = null
    const clientName = cell(idx.client)
    if (clientName) {
      const existing = next.clients.find((c) => c.name.toLowerCase() === clientName.toLowerCase())
      if (existing) clientId = existing.id
      else {
        const created = addClient(next, clientName, nowIso)
        next = created.state
        clientId = created.id
      }
    }

    let projectId: Id | null = null
    const projectName = cell(idx.project)
    if (projectName) {
      const existing = next.projects.find((p) => p.name.toLowerCase() === projectName.toLowerCase())
      if (existing) projectId = existing.id
      else {
        const created = createProject(next, { name: projectName, clientId }, nowIso)
        next = created.state
        projectId = created.id
      }
    }

    let taskId: Id | null = null
    const taskName = cell(idx.task)
    if (taskName && projectId !== null) {
      const existing = next.tasks.find((t) => t.projectId === projectId && t.name.toLowerCase() === taskName.toLowerCase())
      if (existing) taskId = existing.id
      else {
        const created = createTask(next, { projectId, name: taskName }, nowIso)
        next = created.state
        taskId = created.id
      }
    }

    /**
     * A tags cell reading `admin, admin` is one tag. `createTag` returns the
     * existing tag for a name it already has, so pushing both produced the same
     * id twice — and two identical `(entry_id, tag_id)` rows in one upsert is a
     * payload the database refuses every time it is offered, with nothing named
     * for the browser to drop. An import is exactly where a repeated name
     * arrives, because nothing on the way in was checking.
     */
    const tagIds: Id[] = []
    for (const name of cell(idx.tags).split(/[,;]/).map((t) => t.trim()).filter(Boolean)) {
      const created = createTag(next, name, nowIso)
      next = created.state
      if (!tagIds.includes(created.id)) tagIds.push(created.id)
    }

    const billableRaw = cell(idx.billable).toLowerCase()
    const result = createManualEntry(
      next,
      {
        draft: {
          description: cell(idx.description),
          projectId,
          taskId,
          tagIds,
          billable: billableRaw === "yes" || billableRaw === "true" || billableRaw === "1",
        },
        start: startIso,
        stop: stopIso,
      },
      nowIso,
    )

    if (result.violations.length > 0) {
      skipped.push({ line: r + 1, reason: result.violations.map((v) => v.message).join("; ") })
      continue
    }
    next = result.state
    imported++
  }

  return { state: next, imported, skipped }
}

/** Accept YYYY-MM-DD, DD.MM.YYYY, DD/MM/YYYY and MM/DD/YYYY (unambiguous cases) */
/**
 * A DATE THAT IS NOT A DATE IS `null`, NOT A DATE THAT ROLLS OVER.
 *
 * This checked the SHAPE `\d{4}-\d{2}-\d{2}` and returned the string, so `Date` was
 * left to interpret month 99 and day 99 the way it does — by carrying:
 *
 *   End date  9999-99-99 → an entry stopping in the year 10007
 *   Start date 2026-01-99 → silently 2026-04-09, three months out
 *   Month      2026-00-15 → silently 2025-12-15, the year before
 *
 * All three imported with no skip and no message, and one 8,000-year entry makes every
 * report, week total and invoice in the workspace meaningless. `MAX_DATE_MS` in the
 * duration guard cannot catch them, because year 10007 is a perfectly legal `Date` —
 * that guard was aimed at the throw, not at the class, which is why this exists.
 *
 * The test: build the date and check the components come back. A `Date` that carried
 * does not round-trip, and that is true for every rollover without enumerating them.
 */
function normalizeDate(raw: string): string | null {
  const text = raw.trim()
  const iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(text)
  if (iso) return isRealCalendarDate(Number(iso[1]), Number(iso[2]), Number(iso[3])) ? text : null
  const dotted = /^(\d{1,2})[.\-/](\d{1,2})[.\-/](\d{4})$/.exec(text)
  if (dotted) {
    const [, a, b, y] = dotted
    // A value above 12 in the first slot can only be a day
    const day = Number(a) > 12 ? a : text.includes("/") && Number(b) > 12 ? b : a
    const month = day === a ? b : a
    if (!isRealCalendarDate(Number(y), Number(month), Number(day))) return null
    return `${y}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`
  }
  const parsed = new Date(text)
  return Number.isNaN(parsed.getTime()) ? null : dateKey(parsed)
}

/** Does this year/month/day survive being built as a `Date` without carrying? */
function isRealCalendarDate(year: number, month: number, day: number): boolean {
  if (month < 1 || month > 12 || day < 1 || day > 31) return false
  const built = new Date(year, month - 1, day)
  return (
    built.getFullYear() === year && built.getMonth() === month - 1 && built.getDate() === day
  )
}

export function downloadFile(filename: string, contents: string, mime: string): void {
  const blob = new Blob([contents], { type: mime })
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}
