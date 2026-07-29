"use client"

/**
 * Test-only wrapper that turns /test/new-goals into a fully DISCONNECTED sandbox:
 * the new creation flow ⇄ a tracking view assembled from the REAL hub components
 * (DailyActionView → TodaysPulse + GoalCards, plus the lab curve editor).
 *
 * NOTHING here writes to /api/goals/*, and the lab itself never reads it either.
 * Saving a plan materializes it into local GoalWithProgress rows
 * (buildLocalPlanGoals) kept in localStorage, and all tracking interactions
 * mutate that local copy — so you can play freely without touching your real
 * goals. Production-API affordances that can't run locally (GoalFormModal,
 * WeeklyReviewDialog) are left out. Known benign leak: GoalCards internally GET
 * /api/goals/snapshots (usePeriodStats) — read-only, and sandbox goal ids never
 * match real snapshot rows, so nothing real renders and nothing is written.
 */

import { useState, useEffect, useCallback } from "react"
import { NewGoalsFlow } from "./NewGoalsFlow"
import { AchievementsPanel } from "./AchievementsPanel"
import { LabGoalEditor } from "./LabGoalEditor"
import { DailyActionView } from "../DailyActionView"
import { buildLocalPlanGoals } from "../../goalsService"
import type { GoalWithProgress, NewGoalsFlowState } from "../../types"
import { Loader2, Plus, Aperture, RotateCcw } from "lucide-react"

type Mode = "create" | "track"

const SANDBOX_KEY = "newGoalsLabSandboxGoals_v1"

function loadSandboxGoals(): GoalWithProgress[] {
  try {
    const raw = localStorage.getItem(SANDBOX_KEY)
    const parsed = raw ? JSON.parse(raw) : []
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

/** Recompute the display progress fields after a local value change. */
function withProgress(g: GoalWithProgress, current_value: number): GoalWithProgress {
  return {
    ...g,
    current_value,
    progress_percentage: g.target_value > 0 ? Math.min(100, Math.round((current_value / g.target_value) * 100)) : 0,
    is_complete: current_value >= g.target_value,
  }
}

export function NewGoalsLab() {
  const [mode, setMode] = useState<Mode>("create")
  const [goals, setGoals] = useState<GoalWithProgress[]>([])
  const [hydrated, setHydrated] = useState(false)
  const [curveGoal, setCurveGoal] = useState<GoalWithProgress | null>(null)

  // Sandbox plan survives reloads via localStorage (this browser only).
  useEffect(() => {
    setGoals(loadSandboxGoals())
    setHydrated(true)
  }, [])

  const updateGoals = useCallback((updater: (prev: GoalWithProgress[]) => GoalWithProgress[]) => {
    setGoals((prev) => {
      const next = updater(prev)
      try { localStorage.setItem(SANDBOX_KEY, JSON.stringify(next)) } catch { /* quota */ }
      return next
    })
  }, [])

  const onSandboxSave = useCallback((state: NewGoalsFlowState) => {
    updateGoals(() => buildLocalPlanGoals(state))
  }, [updateGoals])

  const resetSandbox = useCallback(() => {
    try { localStorage.removeItem(SANDBOX_KEY) } catch { /* ignore */ }
    setGoals([])
    setMode("create")
  }, [])

  const onIncrement = useCallback(async (goalId: string, amount: number) => {
    updateGoals((prev) => prev.map((g) => (g.id === goalId ? withProgress(g, g.current_value + amount) : g)))
  }, [updateGoals])

  const onSetValue = useCallback(async (goalId: string, value: number) => {
    updateGoals((prev) => prev.map((g) => (g.id === goalId ? withProgress(g, value) : g)))
  }, [updateGoals])

  const onReset = useCallback(async (goalId: string) => {
    updateGoals((prev) => prev.map((g) => {
      if (g.id !== goalId) return g
      const start = typeof (g.milestone_config as { start?: unknown } | null)?.start === "number"
        ? (g.milestone_config as { start: number }).start
        : 0
      return withProgress(g, start)
    }))
  }, [updateGoals])

  const onComplete = useCallback((goal: GoalWithProgress) => { onIncrement(goal.id, 1) }, [onIncrement])
  // Milestone goals open the lab curve editor (local save); other types have no
  // sandbox-safe editor — their edit is a no-op here.
  const onEdit = useCallback((goal: GoalWithProgress) => {
    if (goal.goal_type === "milestone" && goal.milestone_config) setCurveGoal(goal)
  }, [])

  const onCurveSaveLocal = useCallback((update: { milestone_config: Record<string, unknown>; target_value: number }) => {
    if (!curveGoal) return
    updateGoals((prev) => prev.map((g) =>
      g.id === curveGoal.id
        ? withProgress({ ...g, milestone_config: update.milestone_config, target_value: update.target_value }, g.current_value)
        : g,
    ))
  }, [curveGoal, updateGoals])

  const tabClass = (m: Mode) => `px-4 py-1.5 rounded-full text-sm font-medium transition-all ${mode === m ? "bg-white/10 text-white" : "text-zinc-500 hover:text-zinc-300"}`

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      {/* Mode toggle — flip between the creation flow and local tracking */}
      <div className="sticky top-0 z-20 bg-zinc-950/80 backdrop-blur-sm border-b border-white/5">
        <div className="max-w-4xl mx-auto px-6 py-3 flex items-center gap-2">
          <button onClick={() => setMode("create")} className={tabClass("create")}>
            <span className="flex items-center gap-1.5"><Aperture className="size-4" /> Create plan</span>
          </button>
          <button onClick={() => setMode("track")} className={tabClass("track")}>Track</button>
          <span className="ml-auto flex items-center gap-3">
            <span className="text-[10px] font-medium px-2 py-0.5 rounded-full border border-amber-400/30 bg-amber-500/10 text-amber-300" title="Nothing here reads or writes your real goals — everything stays in this browser.">
              Sandbox
            </span>
            <button onClick={resetSandbox} className="flex items-center gap-1.5 text-xs text-zinc-500 hover:text-white transition-colors" title="Clear the sandbox plan and start over">
              <RotateCcw className="size-3.5" /> Reset
            </button>
          </span>
        </div>
      </div>

      {mode === "create" ? (
        <NewGoalsFlow sandbox onSandboxSave={onSandboxSave} onSaved={() => setMode("track")} />
      ) : (
        <div className="max-w-4xl mx-auto px-6 py-8 pb-24">
          {!hydrated ? (
            <div className="flex items-center justify-center py-20"><Loader2 className="size-8 animate-spin text-zinc-500" /></div>
          ) : goals.length === 0 ? (
            <div className="text-center py-20">
              <p className="text-zinc-500 mb-4">No goals yet — build a plan in Create, then come back here to track it.</p>
              <button onClick={() => setMode("create")} className="inline-flex items-center gap-2 px-5 py-2 rounded-lg bg-white/10 text-white hover:bg-white/15 transition-all text-sm font-medium">
                <Plus className="size-4" /> Create a plan
              </button>
            </div>
          ) : (
            <>
              <AchievementsPanel goals={goals} onEdit={onEdit} />
              <DailyActionView
                goals={goals}
                onIncrement={onIncrement}
                onSetValue={onSetValue}
                onComplete={onComplete}
                onReset={onReset}
                onEdit={onEdit}
                onAddChild={() => {}}
                onSwitchView={() => {}}
                onCreateGoal={() => setMode("create")}
              />
            </>
          )}
        </div>
      )}

      {curveGoal && (
        <LabGoalEditor goal={curveGoal} onClose={() => setCurveGoal(null)} onSaved={() => {}} onSaveLocal={onCurveSaveLocal} />
      )}
    </div>
  )
}
