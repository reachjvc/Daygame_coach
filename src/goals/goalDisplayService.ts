/**
 * Display helpers for goal enum values.
 * Provides safe fallbacks for unknown/stale values so goals never silently disappear.
 */

import { CATEGORY_LABELS } from "./config"
import { isKnownDisplayCategory } from "@/src/db/goalEnums"

export function getCategoryLabel(category: string): string {
  if (isKnownDisplayCategory(category)) {
    return CATEGORY_LABELS[category]
  }
  return category.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase())
}

export function isUnknownCategory(category: string | null): boolean {
  if (!category) return false
  return !isKnownDisplayCategory(category)
}

export function getGoalTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    recurring: "Recurring",
    milestone: "Milestone",
    habit_ramp: "Habit Ramp",
  }
  return labels[type] ?? type.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase())
}

export function getGoalPhaseLabel(phase: string): string {
  const labels: Record<string, string> = {
    acquisition: "Learning",
    consolidation: "Consolidating",
    graduated: "Graduated",
  }
  return labels[phase] ?? phase.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase())
}

export function getGoalPhaseStyle(phase: string): string {
  if (phase === "graduated") return "bg-emerald-500/10 text-emerald-400 border-emerald-500/25"
  if (phase === "consolidation") return "bg-blue-500/10 text-blue-400 border-blue-500/25"
  if (phase === "acquisition") return "bg-muted text-muted-foreground border-border"
  return "bg-amber-500/10 text-amber-400 border-amber-500/25"
}

export function getPeriodLabel(period: string): string {
  return period.charAt(0).toUpperCase() + period.slice(1)
}
