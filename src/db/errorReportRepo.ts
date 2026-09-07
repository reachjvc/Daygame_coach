/**
 * The only file that reads or writes crash reports.
 *
 * IT USES THE SERVICE KEY, not the signed-in user's connection. That is
 * deliberate and it is the opposite of every other repo here: the table has no
 * access policies at all, so nothing reachable from a browser can touch it. A
 * crash report has to be writable by someone who is not signed in — the crash
 * on the login page is the one nobody ever reports by hand — and readable only
 * by you.
 */

import { createAdminSupabaseClient } from "./server"

export interface IncomingReport {
  fingerprint: string
  message: string
  stack: string | null
  componentStack: string | null
  route: string
  userAgent: string
  release: string
  severity: "error" | "warning"
  userId: string | null
}

export interface StoredReport {
  id: string
  fingerprint: string
  message: string
  stack: string | null
  component_stack: string | null
  route: string
  user_agent: string
  release: string
  severity: string
  seen_count: number
  first_seen_at: string
  last_seen_at: string
  user_id: string | null
}

/**
 * Record a fault. The same fault reported again bumps a counter rather than
 * adding a row — one broken render loop must not write ten thousand of them.
 */
export async function recordErrorReports(reports: IncomingReport[]): Promise<number> {
  if (reports.length === 0) return 0
  const supabase = createAdminSupabaseClient()
  let stored = 0

  for (const report of reports) {
    const { data: existing, error: readError } = await supabase
      .from("error_reports")
      .select("id, seen_count")
      .eq("fingerprint", report.fingerprint)
      .eq("release", report.release)
      .maybeSingle()
    if (readError) throw new Error(`Could not check for an existing report: ${readError.message}`)

    if (existing) {
      const { error } = await supabase
        .from("error_reports")
        .update({ seen_count: existing.seen_count + 1, last_seen_at: new Date().toISOString() })
        .eq("id", existing.id)
      if (error) throw new Error(`Could not count a repeat: ${error.message}`)
    } else {
      const { error } = await supabase.from("error_reports").insert({
        fingerprint: report.fingerprint,
        message: report.message,
        stack: report.stack,
        component_stack: report.componentStack,
        route: report.route,
        user_agent: report.userAgent,
        release: report.release,
        severity: report.severity,
        user_id: report.userId,
      })
      if (error) throw new Error(`Could not record the report: ${error.message}`)
    }
    stored++
  }

  return stored
}

/** Newest first, for the admin page and the command-line listing. */
export async function listErrorReports(sinceIso: string | null, limit = 100): Promise<StoredReport[]> {
  const supabase = createAdminSupabaseClient()
  let query = supabase.from("error_reports").select("*").order("last_seen_at", { ascending: false }).limit(limit)
  if (sinceIso) query = query.gte("last_seen_at", sinceIso)
  const { data, error } = await query
  if (error) throw new Error(`Could not read the reports: ${error.message}`)
  return (data ?? []) as StoredReport[]
}
