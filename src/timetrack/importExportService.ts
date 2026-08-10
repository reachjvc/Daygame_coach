/**
 * Time-tracking slice — import & export.
 *
 * - Full workspace JSON backup/restore (everything localStorage holds).
 * - Time-entry CSV import shaped after Toggl's own export columns
 *   (Description, Project, Client, Task, Tags, Billable, Start date, Start time,
 *   End date, End time, Duration) — missing clients/projects/tags are created.
 */

import { STATE_VERSION } from "./config"
import { dateKey, epochSeconds, parseDurationInput, parseTimeInput } from "./timetrackFormatService"
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
  const normalised = header.map((h) => h.trim().toLowerCase())
  for (const name of names) {
    const index = normalised.indexOf(name.toLowerCase())
    if (index !== -1) return index
  }
  return -1
}

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
      const day = normaliseDate(cell(idx.startDate))
      if (day) startIso = cell(idx.startTime) ? parseTimeInput(cell(idx.startTime), day) : `${day}T00:00:00.000Z`
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
      const day = normaliseDate(cell(idx.endDate))
      if (day) stopIso = cell(idx.endTime) ? parseTimeInput(cell(idx.endTime), day) : null
    }
    if (!stopIso && cell(idx.duration)) {
      const seconds = parseDurationInput(cell(idx.duration))
      if (seconds !== null) stopIso = new Date((epochSeconds(startIso) + seconds) * 1000).toISOString()
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

    const tagIds: Id[] = []
    for (const name of cell(idx.tags).split(/[,;]/).map((t) => t.trim()).filter(Boolean)) {
      const created = createTag(next, name, nowIso)
      next = created.state
      tagIds.push(created.id)
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
function normaliseDate(raw: string): string | null {
  const text = raw.trim()
  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return text
  const dotted = /^(\d{1,2})[.\-/](\d{1,2})[.\-/](\d{4})$/.exec(text)
  if (dotted) {
    const [, a, b, y] = dotted
    // A value above 12 in the first slot can only be a day
    const day = Number(a) > 12 ? a : text.includes("/") && Number(b) > 12 ? b : a
    const month = day === a ? b : a
    return `${y}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`
  }
  const parsed = new Date(text)
  return Number.isNaN(parsed.getTime()) ? null : dateKey(parsed)
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
