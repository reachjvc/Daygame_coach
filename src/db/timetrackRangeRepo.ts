/**
 * TIME ENTRIES BETWEEN TWO INSTANTS, FOR THE AUDIT TO PRE-FILL FROM.
 *
 * A separate file so `timetrackRepo.ts` stays untouched while the time tracker
 * is being worked on (Plans/energy-audit.md, B-PEER). READ-ONLY, and on the
 * signed-in person's own connection: row security fences it.
 *
 * Returns the entries that overlap [from, to): not deleted, started before
 * `to`, and either still running or stopped after `from`. Paged by id, so a
 * long range is never cut at 1,000 rows.
 */

import { readAllRows } from "./paging"
import { createServerSupabaseClient } from "./supabase"
import type { TimeEntryForAudit } from "@/src/audit/types"

type Row = {
  id: string
  description: string | null
  started_at: string
  stopped_at: string | null
  project: { name: string | null } | { name: string | null }[] | null
}

export async function readTimeEntriesBetween(userId: string, fromIso: string, toIso: string): Promise<TimeEntryForAudit[]> {
  const supabase = await createServerSupabaseClient()
  const rows = await readAllRows<Row>("your time entries", (from, to) =>
    supabase
      .from("timetrack_entries")
      .select("id, description, started_at, stopped_at, project:timetrack_projects(name)")
      .eq("user_id", userId)
      .is("deleted_at", null)
      .lt("started_at", toIso)
      .or(`stopped_at.is.null,stopped_at.gt.${fromIso}`)
      .order("id")
      .range(from, to)
  )
  return rows.map((r) => {
    const project = Array.isArray(r.project) ? (r.project[0] ?? null) : r.project
    return {
      id: r.id,
      description: r.description ?? "",
      projectName: project?.name ?? null,
      startedAt: r.started_at,
      stoppedAt: r.stopped_at,
    }
  })
}
