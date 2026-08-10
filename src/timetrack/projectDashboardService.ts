/**
 * Time-tracking slice — project dashboard.
 *
 * Reproduces Toggl's project dashboard: tracked vs estimate for the current
 * (possibly recurring) period, a cumulative burn-up, a straight-line forecast
 * from the observed pace, the dynamic projected end date, and which alert
 * thresholds have been crossed.
 */

import { addDays, dateKey, daysBetween, eachDay } from "./timetrackFormatService"
import {
  entriesInRange,
  entryCost,
  entryRevenue,
  entrySeconds,
  liveEntries,
  memberById,
  projectEstimateSeconds,
  projectPeriod,
  sumSeconds,
  taskById,
} from "./timetrackService"
import type { AlertThreshold, Id, IsoDate, ProjectDashboard, TimetrackState } from "./types"

export function buildProjectDashboard(
  state: TimetrackState,
  projectId: Id,
  todayKey: IsoDate,
  nowSec: number,
): ProjectDashboard | null {
  const project = state.projects.find((p) => p.id === projectId)
  if (!project) return null

  const period = projectPeriod(project, todayKey)
  const projectEntries = liveEntries(state).filter((e) => e.projectId === projectId)
  const entries = entriesInRange(projectEntries, period.start, period.end)

  const trackedSeconds = sumSeconds(entries, nowSec)
  const billableSeconds = sumSeconds(entries.filter((e) => e.billable), nowSec)
  const revenue = entries.reduce((sum, e) => sum + entryRevenue(state, e, entrySeconds(e, nowSec)), 0)
  const cost = entries.reduce((sum, e) => sum + entryCost(state, e, entrySeconds(e, nowSec)), 0)
  const estimatedSeconds = projectEstimateSeconds(state, project)

  // Cumulative tracked time per day, up to today (never into the future)
  const lastDay = todayKey < period.end ? todayKey : period.end
  const days = period.start <= lastDay ? eachDay(period.start, lastDay) : []
  const perDay = new Map<IsoDate, number>()
  for (const entry of entries) {
    const key = dateKey(entry.start)
    perDay.set(key, (perDay.get(key) ?? 0) + entrySeconds(entry, nowSec))
  }
  let running = 0
  const burnUp = days.map((day) => {
    running += perDay.get(day) ?? 0
    return { date: day, seconds: running }
  })

  // Pace = tracked / elapsed days; forecast extends it to the end of the period
  const elapsedDays = Math.max(1, days.length)
  const pacePerDay = trackedSeconds / elapsedDays
  const forecast: { date: IsoDate; seconds: number }[] = []
  if (pacePerDay > 0 && lastDay < period.end) {
    let cumulative = trackedSeconds
    for (const day of eachDay(addDays(lastDay, 1), period.end)) {
      cumulative += pacePerDay
      forecast.push({ date: day, seconds: Math.round(cumulative) })
    }
  }

  // Projected end date = when the pace would consume the estimate
  let projectedEndDate: IsoDate | null = null
  if (estimatedSeconds && pacePerDay > 0) {
    const remaining = estimatedSeconds - trackedSeconds
    if (remaining <= 0) {
      const reached = burnUp.find((point) => point.seconds >= estimatedSeconds)
      projectedEndDate = reached?.date ?? lastDay
    } else {
      const daysNeeded = Math.ceil(remaining / pacePerDay)
      projectedEndDate = addDays(lastDay, daysNeeded)
    }
  } else if (project.endDate) {
    projectedEndDate = project.endDate
  }

  const completionPct = completionPercent(project, estimatedSeconds, trackedSeconds, revenue, cost)
  const triggeredThresholds = project.alerts
    .filter((alert) => alert.enabled)
    .filter((alert) => {
      const pct = alert.basis === "fixed_fee" && project.fixedFee ? (cost / project.fixedFee) * 100 : completionPct
      return pct >= alert.threshold
    })
    .map((alert) => alert.threshold as AlertThreshold)

  const taskTotals = new Map<Id | null, number>()
  for (const entry of entries) {
    taskTotals.set(entry.taskId, (taskTotals.get(entry.taskId) ?? 0) + entrySeconds(entry, nowSec))
  }
  const memberTotals = new Map<Id, number>()
  for (const entry of entries) {
    memberTotals.set(entry.userId, (memberTotals.get(entry.userId) ?? 0) + entrySeconds(entry, nowSec))
  }

  return {
    projectId,
    periodStart: period.start,
    periodEnd: period.end,
    trackedSeconds,
    billableSeconds,
    estimatedSeconds,
    estimatedAmount: project.estimatedAmount,
    fixedFee: project.fixedFee,
    revenue,
    cost,
    profit: revenue + (project.fixedFee ?? 0) - cost,
    completionPct,
    burnUp,
    forecast,
    projectedEndDate,
    triggeredThresholds,
    taskBreakdown: [...taskTotals.entries()]
      .map(([taskId, seconds]) => ({
        taskId,
        label: taskId === null ? "No task" : taskById(state, taskId)?.name ?? "Deleted task",
        seconds,
      }))
      .sort((a, b) => b.seconds - a.seconds),
    memberBreakdown: [...memberTotals.entries()]
      .map(([memberId, seconds]) => ({
        memberId,
        label: memberById(state, memberId)?.name ?? "Unknown",
        seconds,
      }))
      .sort((a, b) => b.seconds - a.seconds),
  }
}

function completionPercent(
  project: { estimateType: string; estimatedAmount: number | null; fixedFee: number | null },
  estimatedSeconds: number | null,
  trackedSeconds: number,
  revenue: number,
  cost: number,
): number {
  if (project.estimateType === "monetary" && project.estimatedAmount) {
    return (revenue / project.estimatedAmount) * 100
  }
  if (estimatedSeconds) return (trackedSeconds / estimatedSeconds) * 100
  if (project.fixedFee) return (cost / project.fixedFee) * 100
  return 0
}

/** Days left in the period — drives the "on pace / over pace" label */
export function periodDaysRemaining(dashboard: ProjectDashboard, todayKey: IsoDate): number {
  return Math.max(0, daysBetween(todayKey, dashboard.periodEnd))
}

export function paceVerdict(
  dashboard: ProjectDashboard,
  todayKey: IsoDate,
): { label: string; tone: "ok" | "warn" | "over" } {
  if (!dashboard.estimatedSeconds) return { label: "No estimate set", tone: "ok" }
  const totalDays = Math.max(1, daysBetween(dashboard.periodStart, dashboard.periodEnd) + 1)
  const elapsed = Math.min(totalDays, Math.max(1, daysBetween(dashboard.periodStart, todayKey) + 1))
  const expectedPct = (elapsed / totalDays) * 100
  const diff = dashboard.completionPct - expectedPct

  if (dashboard.completionPct >= 100) return { label: "Estimate consumed", tone: "over" }
  if (diff > 15) return { label: `${Math.round(diff)}% ahead of pace`, tone: "warn" }
  if (diff < -15) return { label: `${Math.round(-diff)}% behind pace`, tone: "ok" }
  return { label: "On pace", tone: "ok" }
}
