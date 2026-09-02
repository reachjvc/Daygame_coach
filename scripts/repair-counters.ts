/**
 * Recompute every counter and streak on `user_tracking_stats` from the rows
 * they are supposed to count.
 *
 * WHY THIS EXISTS: the values in that table were written by code that reset a
 * different subset of the weekly counters in each of three write paths. The
 * result on one live account was `current_week_streak = 4` for two active weeks
 * and two dead ones — a week with a single session counted as active because the
 * approach counter still held the previous week's 15.
 *
 * DRY RUN BY DEFAULT. `--apply` writes. Nothing is inferred: every number below
 * is counted from `sessions` and `approaches`, grouped into weeks in the USER's
 * own timezone. Where the source rows cannot answer a question — which week a
 * weekly review was filed for was never recorded — the field is left alone and
 * said so, rather than reconstructed.
 *
 *   npx tsx scripts/repair-counters.ts            # print the diff, write nothing
 *   npx tsx scripts/repair-counters.ts --apply    # write it
 *
 * Idempotent: a second --apply changes nothing.
 */

import { createClient } from "@supabase/supabase-js"
import fs from "fs"
import { periodStartFor, toDateISO, getNowInTimezone } from "../src/shared/dateUtils"
import { isWeekActive, streakOnQualify } from "../src/tracking/counterRules"
import { metricFitsPeriod } from "../src/tracking/metricsService"
import { previousPeriodStart } from "../src/shared/dateUtils"

const APPLY = process.argv.includes("--apply")

function env(): Record<string, string> {
  const text = fs.readFileSync(".env.local", "utf8")
  return Object.fromEntries(
    text
      .split("\n")
      .filter((l) => l.includes("=") && !l.trimStart().startsWith("#"))
      .map((l) => [
        l.slice(0, l.indexOf("=")).trim(),
        l.slice(l.indexOf("=") + 1).trim().replace(/^["']|["']$/g, ""),
      ])
  )
}

/** The Monday an instant falls in, in a given zone. */
function weekOf(instant: string, timezone: string): string {
  const local = new Date(
    new Date(instant).toLocaleString("en-US", { timeZone: timezone })
  )
  return periodStartFor("weekly", local)
}

/** The calendar date an instant falls on, in a given zone. */
function dayOf(instant: string, timezone: string): string {
  const local = new Date(
    new Date(instant).toLocaleString("en-US", { timeZone: timezone })
  )
  return toDateISO(local)
}

async function main() {
  const e = env()
  const sb = createClient(e.NEXT_PUBLIC_SUPABASE_URL, e.SUPABASE_SERVICE_ROLE_KEY)

  const { data: stats, error } = await sb.from("user_tracking_stats").select("*")
  if (error) throw new Error(`Cannot read stats: ${error.message}`)

  const lines: string[] = []
  const say = (s: string) => {
    lines.push(s)
    console.log(s)
  }

  say(`# Counter repair — ${APPLY ? "APPLIED" : "DRY RUN"}`)
  say("")

  for (const row of stats ?? []) {
    const userId = row.user_id as string
    const { data: profile } = await sb
      .from("profiles")
      .select("timezone")
      .eq("id", userId)
      .single()
    const timezone = (profile?.timezone as string) || "UTC"

    const { data: sessions } = await sb
      .from("sessions")
      .select("started_at")
      .eq("user_id", userId)
      .order("started_at")
    const { data: approaches } = await sb
      .from("approaches")
      .select("created_at, outcome")
      .eq("user_id", userId)
      .order("created_at")
    const { data: reports } = await sb
      .from("field_reports")
      .select("created_at, is_draft")
      .eq("user_id", userId)
      .order("created_at")

    // ---- weeks, in the user's calendar -------------------------------------
    const weeks = new Map<string, { sessions: number; approaches: number }>()
    const bump = (week: string, key: "sessions" | "approaches") => {
      const w = weeks.get(week) ?? { sessions: 0, approaches: 0 }
      w[key]++
      weeks.set(week, w)
    }
    for (const s of sessions ?? []) bump(weekOf(s.started_at as string, timezone), "sessions")
    for (const a of approaches ?? []) bump(weekOf(a.created_at as string, timezone), "approaches")

    // ---- the streak, replayed by the production rule ------------------------
    let streak = 0
    let best = 0
    let lastActive: string | null = null
    for (const week of [...weeks.keys()].sort()) {
      const w = weeks.get(week)!
      if (!isWeekActive(w.sessions, w.approaches)) continue
      const next = streakOnQualify({
        currentWeekStart: week,
        previousWeekStart: previousPeriodStart("weekly", week),
        lastActiveStart: lastActive,
        currentStreak: streak,
      })
      streak = next.streak
      lastActive = next.lastActiveStart
      best = Math.max(best, streak)
    }

    // ---- the day streak ----------------------------------------------------
    const days = [...new Set((approaches ?? []).map((a) => dayOf(a.created_at as string, timezone)))].sort()
    let dayStreak = 0
    let bestDay = 0
    let previousDay: string | null = null
    for (const day of days) {
      const yesterday = previousPeriodStart("daily", day)
      dayStreak = previousDay === yesterday ? dayStreak + 1 : 1
      bestDay = Math.max(bestDay, dayStreak)
      previousDay = day
    }
    const lastApproachDay = days.length ? days[days.length - 1] : null

    // ---- this week's counters ----------------------------------------------
    const thisWeek = periodStartFor("weekly", getNowInTimezone(timezone))
    const inThisWeek = weeks.get(thisWeek) ?? { sessions: 0, approaches: 0 }
    const numbers = (approaches ?? []).filter(
      (a) => a.outcome === "number" && weekOf(a.created_at as string, timezone) === thisWeek
    ).length
    const instadates = (approaches ?? []).filter(
      (a) => a.outcome === "instadate" && weekOf(a.created_at as string, timezone) === thisWeek
    ).length
    const weekReports = (reports ?? []).filter(
      (r) => !r.is_draft && weekOf(r.created_at as string, timezone) === thisWeek
    ).length

    const repaired: Record<string, unknown> = {
      current_week_streak: streak,
      longest_week_streak: best,
      last_active_week_start: lastActive,
      current_streak: dayStreak,
      longest_streak: bestDay,
      last_approach_date: lastApproachDay,
      week_start_date: thisWeek,
      current_week_sessions: inThisWeek.sessions,
      current_week_approaches: inThisWeek.approaches,
      current_week_numbers: numbers,
      current_week_instadates: instadates,
      current_week_field_reports: weekReports,
    }

    say(`## ${userId}  (${timezone})`)
    say("")
    say(`Active weeks: ${[...weeks.entries()].filter(([, w]) => isWeekActive(w.sessions, w.approaches)).map(([k]) => k).join(", ") || "none"}`)
    say("")

    const changed = Object.entries(repaired).filter(([k, v]) => row[k] !== v)
    if (changed.length === 0) {
      say("Nothing to repair.")
      say("")
      continue
    }
    for (const [k, v] of changed) say(`- \`${k}\`  ${JSON.stringify(row[k])} -> ${JSON.stringify(v)}`)
    say("")
    say(
      "`current_weekly_streak` (weekly reviews) is NOT touched: nothing ever " +
        "recorded which week a review was filed for, so there is nothing to " +
        "recompute from. It reads as 0 until the next review sets its key."
    )
    say("")

    if (APPLY) {
      const { error: writeError } = await sb
        .from("user_tracking_stats")
        .update(repaired)
        .eq("user_id", userId)
      if (writeError) throw new Error(`Write failed for ${userId}: ${writeError.message}`)
      say("Applied.")
      say("")
    }
  }

  // ------------------------------------------------------------------------
  // Goals whose linked metric measures a different span than their period.
  //
  // `syncLinkedGoals` overwrites `current_value` with the metric's number, so a
  // weekly goal fed a lifetime total is permanently complete. The repair nulls
  // the metric and KEEPS the value: the goal becomes a manual one the user owns
  // rather than an automatic one that lies. Deleting it would destroy a stated
  // intention, and leaving it keeps a finished goal on the hub forever.
  // ------------------------------------------------------------------------
  say("## Goals with a metric that does not measure their period")
  say("")

  const { data: linked } = await sb
    .from("user_goals")
    .select("id, title, period, linked_metric, current_value, target_value, user_id")
    .not("linked_metric", "is", null)
    .eq("is_active", true)
    .eq("is_archived", false)

  const mismatched = (linked ?? []).filter(
    (g) => !metricFitsPeriod(g.linked_metric as string, g.period as string)
  )

  if (mismatched.length === 0) {
    say("None.")
    say("")
  } else {
    for (const g of mismatched) {
      say(
        `- **${g.title}** — ${g.period} goal linked to \`${g.linked_metric}\`, ` +
          `showing ${g.current_value}/${g.target_value}. Metric removed; the count stays.`
      )
    }
    say("")
    if (APPLY) {
      for (const g of mismatched) {
        const { error: writeError } = await sb
          .from("user_goals")
          .update({ linked_metric: null })
          .eq("id", g.id)
        if (writeError) throw new Error(`Write failed for goal ${g.id}: ${writeError.message}`)
      }
      say(`Applied to ${mismatched.length} goal(s).`)
      say("")
    }
  }

  fs.writeFileSync("docs/plans/counters-repair-log.md", lines.join("\n") + "\n")
  console.log(
    APPLY
      ? "\nWritten. Log: docs/plans/counters-repair-log.md"
      : "\nDry run. Nothing written to the database. Log: docs/plans/counters-repair-log.md"
  )
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
