"use client"

import { useState, useEffect, useCallback } from "react"
import Link from "next/link"
import { ArrowLeft, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  flattenTree,
  getInputMode,
  getButtonIncrements,
  getNextMilestoneInfo,
  computeProjectedDate,
  getCelebrationTier,
} from "@/src/goals/goalsService"
import { LIFE_AREAS } from "@/src/goals/data/lifeAreas"
import { GOAL_TEMPLATES } from "@/src/goals/data/goalGraph"
import { CelebrationOverlay } from "@/src/goals/components/CelebrationOverlay"
import type { GoalWithProgress, GoalTreeNode, CelebrationTier } from "@/src/goals/types"
import type { V11ViewProps } from "@/src/goals/components/views/V11ViewProps"

import { V11ViewA } from "@/src/goals/components/views/V11ViewA"
import { V11ViewB } from "@/src/goals/components/views/V11ViewB"
import { V11ViewC } from "@/src/goals/components/views/V11ViewC"
import { V11ViewD } from "@/src/goals/components/views/V11ViewD"
import { V11ViewE } from "@/src/goals/components/views/V11ViewE"

const VIEWS = [
  { id: "a", label: "View A", component: V11ViewA },
  { id: "b", label: "View B", component: V11ViewB },
  { id: "c", label: "View C", component: V11ViewC },
  { id: "d", label: "View D", component: V11ViewD },
  { id: "e", label: "View E", component: V11ViewE },
] as const

export default function GoalsV11Page() {
  const [goals, setGoals] = useState<GoalWithProgress[]>([])
  const [tree, setTree] = useState<GoalTreeNode[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeView, setActiveView] = useState(VIEWS[0].id)
  const [celebration, setCelebration] = useState<{ tier: CelebrationTier; title: string } | null>(null)

  // ─── Data fetching ──────────────────────────────────────

  const fetchGoals = useCallback(async () => {
    try {
      const response = await fetch("/api/goals/tree?includeArchived=true")
      if (!response.ok) throw new Error("Failed to fetch goals")
      const data = await response.json()
      const treeData: GoalTreeNode[] = Array.isArray(data) ? data : []
      setTree(treeData)
      setGoals(flattenTree(treeData))
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load goals")
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => { fetchGoals() }, [fetchGoals])

  // ─── Progress handlers (optimistic + server sync) ──────

  const handleIncrement = useCallback(async (goalId: string, amount: number) => {
    setGoals(prev => prev.map(g =>
      g.id === goalId
        ? {
            ...g,
            current_value: Math.max(0, g.current_value + amount),
            progress_percentage: Math.min(100, Math.round((Math.max(0, g.current_value + amount) / g.target_value) * 100)),
            is_complete: g.current_value + amount >= g.target_value,
          }
        : g
    ))
    try {
      await fetch(`/api/goals/${goalId}/increment`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount }),
      })
    } finally {
      fetchGoals()
    }
  }, [fetchGoals])

  const handleSetValue = useCallback(async (goalId: string, value: number) => {
    setGoals(prev => prev.map(g =>
      g.id === goalId
        ? {
            ...g,
            current_value: value,
            progress_percentage: Math.min(100, Math.round((value / g.target_value) * 100)),
            is_complete: value >= g.target_value,
          }
        : g
    ))
    try {
      await fetch(`/api/goals/${goalId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ current_value: value }),
      })
    } finally {
      fetchGoals()
    }
  }, [fetchGoals])

  const handleReset = useCallback(async (goalId: string) => {
    setGoals(prev => prev.map(g =>
      g.id === goalId
        ? { ...g, current_value: 0, progress_percentage: 0, is_complete: false }
        : g
    ))
    try {
      await fetch(`/api/goals/${goalId}/reset`, { method: "POST" })
    } finally {
      fetchGoals()
    }
  }, [fetchGoals])

  // ─── CRUD handlers ─────────────────────────────────────

  const handleCreate = useCallback(async (goal: Parameters<V11ViewProps["onCreate"]>[0]): Promise<GoalWithProgress | null> => {
    try {
      const response = await fetch("/api/goals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(goal),
      })
      if (!response.ok) {
        const data = await response.json()
        console.error("Create goal failed:", data)
        return null
      }
      const created = await response.json()
      await fetchGoals()
      return created
    } catch (err) {
      console.error("Create goal error:", err)
      return null
    }
  }, [fetchGoals])

  const handleBatchCreate = useCallback(async (goals: Parameters<V11ViewProps["onBatchCreate"]>[0]): Promise<GoalWithProgress[]> => {
    try {
      const response = await fetch("/api/goals/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ goals }),
      })
      if (!response.ok) {
        const data = await response.json()
        console.error("Batch create failed:", data)
        return []
      }
      const created = await response.json()
      await fetchGoals()
      return Array.isArray(created) ? created : []
    } catch (err) {
      console.error("Batch create error:", err)
      return []
    }
  }, [fetchGoals])

  const handleUpdate = useCallback(async (goalId: string, updates: Parameters<V11ViewProps["onUpdate"]>[1]) => {
    try {
      const response = await fetch(`/api/goals/${goalId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      })
      if (!response.ok) console.error("Update failed:", await response.json())
      await fetchGoals()
    } catch (err) {
      console.error("Update error:", err)
    }
  }, [fetchGoals])

  const handleArchive = useCallback(async (goalId: string) => {
    try {
      await fetch(`/api/goals/${goalId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_archived: true, is_active: false }),
      })
      await fetchGoals()
    } catch (err) {
      console.error("Archive error:", err)
    }
  }, [fetchGoals])

  const handleDelete = useCallback(async (goalId: string) => {
    try {
      await fetch(`/api/goals/${goalId}?permanent=true`, { method: "DELETE" })
      await fetchGoals()
    } catch (err) {
      console.error("Delete error:", err)
    }
  }, [fetchGoals])

  // ─── Celebration ────────────────────────────────────────

  const handleCelebrate = useCallback((tier: CelebrationTier, title: string) => {
    setCelebration({ tier, title })
  }, [])

  // ─── Build props ────────────────────────────────────────

  const viewProps: V11ViewProps = {
    goals,
    tree,
    lifeAreas: LIFE_AREAS,
    templates: GOAL_TEMPLATES,
    isLoading,
    onIncrement: handleIncrement,
    onSetValue: handleSetValue,
    onReset: handleReset,
    onCreate: handleCreate,
    onBatchCreate: handleBatchCreate,
    onUpdate: handleUpdate,
    onArchive: handleArchive,
    onDelete: handleDelete,
    onCelebrate: handleCelebrate,
    getInputMode,
    getButtonIncrements,
    getNextMilestoneInfo,
    getProjectedDate: computeProjectedDate,
    getCelebrationTier,
    onRefresh: fetchGoals,
  }

  // ─── Render ─────────────────────────────────────────────

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-20">
        <p className="text-destructive mb-4">{error}</p>
        <Button onClick={() => { setIsLoading(true); fetchGoals() }}>Retry</Button>
      </div>
    )
  }

  const ActiveComponent = VIEWS.find(v => v.id === activeView)?.component ?? VIEWS[0].component

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-6xl px-6 py-8">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button asChild variant="ghost" size="sm">
              <Link href="/test">
                <ArrowLeft className="size-4 mr-2" />
                Back
              </Link>
            </Button>
            <h1 className="text-2xl font-bold">Goals V11 — 5 Complete Experiences</h1>
          </div>
          <span className="text-sm text-muted-foreground">{goals.length} goals</span>
        </div>

        {/* View tabs */}
        <div className="mb-6 flex gap-1 rounded-lg border border-border bg-muted/30 p-1">
          {VIEWS.map(view => {
            const isActive = activeView === view.id
            return (
              <button
                key={view.id}
                onClick={() => setActiveView(view.id)}
                className={`flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {view.label}
              </button>
            )
          })}
        </div>

        {/* Active view */}
        <ActiveComponent {...viewProps} />
      </div>

      {/* Celebration overlay */}
      {celebration && (
        <CelebrationOverlay
          tier={celebration.tier}
          goalTitle={celebration.title}
          onDismiss={() => setCelebration(null)}
        />
      )}
    </div>
  )
}
