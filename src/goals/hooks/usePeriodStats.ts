"use client"

import { useState, useEffect, useMemo } from "react"
import { computeMultiPeriodStats } from "../goalsService"
import type { GoalWithProgress, GoalPeriodStats } from "../types"
import type { DailyGoalSnapshotRow } from "@/src/db/goalTypes"

/**
 * Fetches year-to-date snapshots and computes multi-period stats for each goal.
 * Returns a Map<goalId, GoalPeriodStats> and loading state.
 */
export function usePeriodStats(goals: GoalWithProgress[]) {
  const [snapshots, setSnapshots] = useState<DailyGoalSnapshotRow[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const now = new Date()
    const jan1 = `${now.getFullYear()}-01-01`
    const today = now.toISOString().split("T")[0]

    fetch(`/api/goals/snapshots?start_date=${jan1}&end_date=${today}`)
      .then((res) => (res.ok ? res.json() : []))
      .then((data: DailyGoalSnapshotRow[]) => setSnapshots(data))
      .catch(() => setSnapshots([]))
      .finally(() => setIsLoading(false))
  }, [])

  const statsMap = useMemo(() => {
    if (snapshots.length === 0 && isLoading) return new Map<string, GoalPeriodStats>()
    const map = new Map<string, GoalPeriodStats>()
    for (const goal of goals) {
      map.set(goal.id, computeMultiPeriodStats(goal, snapshots))
    }
    return map
  }, [goals, snapshots, isLoading])

  return { statsMap, isLoading }
}
