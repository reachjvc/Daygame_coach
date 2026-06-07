"use client"

/**
 * Test-only wrapper that turns /test/new-goals into the FULL best-of-both journey:
 * the new creation flow (with the harvested FTO/Abundance path onboarding) ⇄ a
 * tracking view assembled from the REAL hub components (DailyActionView → which
 * renders TodaysPulse + GoalCards — plus GoalFormModal + WeeklyReviewDialog).
 *
 * It reuses the production components unchanged and talks to the real /api/goals/*
 * endpoints, so it demonstrates the combination end-to-end WITHOUT touching any
 * production route (GoalsHubContent is left alone — its handler logic is lifted
 * here, not imported, to keep the test surface self-contained).
 */

import { useState, useEffect, useCallback } from "react"
import { NewGoalsFlow } from "./NewGoalsFlow"
import { AchievementsPanel } from "./AchievementsPanel"
import { LabGoalEditor } from "./LabGoalEditor"
import { DailyActionView } from "../DailyActionView"
import { GoalFormModal } from "../GoalFormModal"
import { WeeklyReviewDialog } from "../WeeklyReviewDialog"
import { flattenTree } from "../../goalsService"
import type { GoalWithProgress, GoalTreeNode } from "../../types"
import { CalendarCheck, Loader2, Plus, Aperture } from "lucide-react"

type Mode = "create" | "track"

export function NewGoalsLab() {
  const [mode, setMode] = useState<Mode>("create")
  const [goals, setGoals] = useState<GoalWithProgress[]>([])
  const [loading, setLoading] = useState(false)
  const [reviewOpen, setReviewOpen] = useState(false)
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingGoal, setEditingGoal] = useState<GoalWithProgress | undefined>()
  const [curveGoal, setCurveGoal] = useState<GoalWithProgress | null>(null)

  const fetchGoals = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/goals/tree?includeArchived=true")
      const data = await res.json()
      const tree: GoalTreeNode[] = Array.isArray(data) ? data : []
      setGoals(flattenTree(tree))
    } catch {
      /* test surface — swallow */
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (mode === "track") fetchGoals()
  }, [mode, fetchGoals])

  const onIncrement = useCallback(async (goalId: string, amount: number) => {
    setGoals((prev) => prev.map((g) => g.id === goalId
      ? { ...g, current_value: g.current_value + amount, progress_percentage: Math.min(100, Math.round(((g.current_value + amount) / g.target_value) * 100)), is_complete: g.current_value + amount >= g.target_value }
      : g))
    await fetch(`/api/goals/${goalId}/increment`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ amount }) }).catch(() => {})
    fetchGoals()
  }, [fetchGoals])

  const onSetValue = useCallback(async (goalId: string, value: number) => {
    setGoals((prev) => prev.map((g) => g.id === goalId
      ? { ...g, current_value: value, progress_percentage: Math.min(100, Math.round((value / g.target_value) * 100)), is_complete: value >= g.target_value }
      : g))
    await fetch(`/api/goals/${goalId}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ current_value: value }) }).catch(() => {})
    fetchGoals()
  }, [fetchGoals])

  const onReset = useCallback(async (goalId: string) => {
    await fetch(`/api/goals/${goalId}/reset`, { method: "POST" }).catch(() => {})
    fetchGoals()
  }, [fetchGoals])

  const onComplete = useCallback((goal: GoalWithProgress) => { onIncrement(goal.id, 1) }, [onIncrement])
  // Milestone goals open the curve editor (reshape + re-pace); others use the form.
  const onEdit = useCallback((goal: GoalWithProgress) => {
    if (goal.goal_type === "milestone" && goal.milestone_config) setCurveGoal(goal)
    else { setEditingGoal(goal); setIsFormOpen(true) }
  }, [])
  const onAddChild = useCallback(() => { setEditingGoal(undefined); setIsFormOpen(true) }, [])

  const tabClass = (m: Mode) => `px-4 py-1.5 rounded-full text-sm font-medium transition-all ${mode === m ? "bg-white/10 text-white" : "text-zinc-500 hover:text-zinc-300"}`

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      {/* Mode toggle — flip between the creation flow and live tracking */}
      <div className="sticky top-0 z-20 bg-zinc-950/80 backdrop-blur-sm border-b border-white/5">
        <div className="max-w-4xl mx-auto px-6 py-3 flex items-center gap-2">
          <button onClick={() => setMode("create")} className={tabClass("create")}>
            <span className="flex items-center gap-1.5"><Aperture className="size-4" /> Create plan</span>
          </button>
          <button onClick={() => setMode("track")} className={tabClass("track")}>Track</button>
          {mode === "track" && (
            <button onClick={() => setReviewOpen(true)} className="ml-auto flex items-center gap-1.5 text-xs text-zinc-400 hover:text-white transition-colors">
              <CalendarCheck className="size-4" /> Weekly Review
            </button>
          )}
        </div>
      </div>

      {mode === "create" ? (
        <NewGoalsFlow />
      ) : (
        <div className="max-w-4xl mx-auto px-6 py-8 pb-24">
          {loading && goals.length === 0 ? (
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
              onAddChild={onAddChild}
              onSwitchView={() => {}}
              onCreateGoal={() => setMode("create")}
              />
            </>
          )}
        </div>
      )}

      <GoalFormModal
        open={isFormOpen}
        onOpenChange={(o) => { setIsFormOpen(o); if (!o) setEditingGoal(undefined) }}
        goal={editingGoal}
        parentGoals={goals}
        onSuccess={fetchGoals}
      />
      <WeeklyReviewDialog isOpen={reviewOpen} onClose={() => setReviewOpen(false)} />
      {curveGoal && (
        <LabGoalEditor goal={curveGoal} onClose={() => setCurveGoal(null)} onSaved={fetchGoals} />
      )}
    </div>
  )
}
