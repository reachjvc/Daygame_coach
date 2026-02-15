"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Plus, Loader2, Settings2, Library } from "lucide-react"
import { GoalIcon } from "@/components/ui/GoalIcon"
import { GoalFormModal } from "./GoalFormModal"
import { CelebrationOverlay } from "./CelebrationOverlay"
import { MilestoneCompleteDialog } from "./MilestoneCompleteDialog"
import { ConfirmDeleteAllDialog } from "./ConfirmDeleteAllDialog"
import { GoalCatalogPicker } from "./GoalCatalogPicker"
import { GoalHierarchyView } from "./GoalHierarchyView"
import { DailyActionView } from "./DailyActionView"
import { ViewSwitcher } from "./views/ViewSwitcher"
import { ActionToast } from "./ActionToast"
import { flattenTree, getCelebrationTier, generateDirtyDogInserts } from "../goalsService"
import type { GoalWithProgress, GoalTreeNode, GoalViewMode, CelebrationTier } from "../types"

export function GoalsHubContent() {
  const [goals, setGoals] = useState<GoalWithProgress[]>([])
  const [tree, setTree] = useState<GoalTreeNode[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [celebration, setCelebration] = useState<{ tier: CelebrationTier; title: string } | null>(null)
  const [completingGoal, setCompletingGoal] = useState<GoalWithProgress | null>(null)
  const [isCompleting, setIsCompleting] = useState(false)
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingGoal, setEditingGoal] = useState<GoalWithProgress | undefined>()
  const [defaultParentGoalId, setDefaultParentGoalId] = useState<string | null>(null)
  const [isCustomizeMode, setIsCustomizeMode] = useState(false)
  const [viewMode, setViewMode] = useState<GoalViewMode>("daily")
  const [showCatalog, setShowCatalog] = useState(false)
  const [isAddingDirtyDog, setIsAddingDirtyDog] = useState(false)
  const [showDeleteAllConfirm, setShowDeleteAllConfirm] = useState(false)
  const [isDeletingAll, setIsDeletingAll] = useState(false)
  const [toasts, setToasts] = useState<{ id: number; message: string; variant: "error" | "success" }[]>([])
  const toastId = useRef(0)
  const showToast = useCallback((message: string, variant: "error" | "success") => {
    const id = ++toastId.current
    setToasts(prev => [...prev, { id, message, variant }])
  }, [])
  const dismissToast = useCallback((id: number) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])

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

  useEffect(() => {
    fetchGoals()
  }, [fetchGoals])

  const triggerCelebration = useCallback((goal: GoalWithProgress) => {
    const tier = getCelebrationTier(goal)
    setCelebration({ tier, title: goal.title })
  }, [])

  const handleComplete = useCallback((goal: GoalWithProgress) => {
    setCompletingGoal(goal)
  }, [])

  const handleConfirmComplete = async () => {
    if (!completingGoal || isCompleting) return
    setIsCompleting(true)
    try {
      const response = await fetch(`/api/goals/${completingGoal.id}/increment`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: 1 }),
      })
      if (!response.ok) throw new Error("Failed to complete goal")
      triggerCelebration(completingGoal)
      setCompletingGoal(null)
      await fetchGoals()
    } catch {
      showToast("Failed to complete goal — try again", "error")
    } finally {
      setIsCompleting(false)
    }
  }

  const handleIncrement = async (goalId: string, amount: number) => {
    const goal = goals.find(g => g.id === goalId)
    // Optimistic update
    setGoals(prev => prev.map(g =>
      g.id === goalId
        ? {
            ...g,
            current_value: g.current_value + amount,
            progress_percentage: Math.min(100, Math.round(((g.current_value + amount) / g.target_value) * 100)),
            is_complete: g.current_value + amount >= g.target_value,
          }
        : g
    ))
    try {
      const response = await fetch(`/api/goals/${goalId}/increment`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount }),
      })
      if (!response.ok) throw new Error("Failed to increment")
      fetchGoals()
      if (goal && !goal.is_complete && goal.current_value + amount >= goal.target_value) {
        triggerCelebration(goal)
      }
    } catch {
      fetchGoals()
      showToast("Failed to update progress", "error")
    }
  }

  const handleSetValue = async (goalId: string, value: number) => {
    const goal = goals.find(g => g.id === goalId)
    // Optimistic update
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
      const response = await fetch(`/api/goals/${goalId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ current_value: value }),
      })
      if (!response.ok) throw new Error("Failed to set value")
      fetchGoals()
      if (goal && !goal.is_complete && value >= goal.target_value) {
        triggerCelebration(goal)
      }
    } catch {
      fetchGoals()
      showToast("Failed to update progress", "error")
    }
  }

  const handleReset = async (goalId: string) => {
    // Optimistic update
    setGoals(prev => prev.map(g =>
      g.id === goalId
        ? { ...g, current_value: 0, progress_percentage: 0, is_complete: false }
        : g
    ))
    try {
      const response = await fetch(`/api/goals/${goalId}/reset`, { method: "POST" })
      if (!response.ok) throw new Error("Failed to reset")
      fetchGoals()
    } catch {
      fetchGoals()
      showToast("Failed to reset goal", "error")
    }
  }

  const handleEdit = (goal: GoalWithProgress) => {
    setEditingGoal(goal)
    setIsFormOpen(true)
  }

  const handleCreateGoal = () => {
    setEditingGoal(undefined)
    setDefaultParentGoalId(null)
    setIsFormOpen(true)
  }

  const handleAddChild = (parentGoal: GoalWithProgress) => {
    setEditingGoal(undefined)
    setDefaultParentGoalId(parentGoal.id)
    setIsFormOpen(true)
  }

  const handleGoalToggle = async (goalId: string, active: boolean) => {
    try {
      const response = await fetch(`/api/goals/${goalId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_archived: !active, is_active: active }),
      })
      if (!response.ok) throw new Error("Failed to toggle goal")
      await fetchGoals()
    } catch {
      showToast("Failed to toggle goal", "error")
    }
  }

  const handleAddDirtyDogGoals = async () => {
    if (isAddingDirtyDog) return
    setIsAddingDirtyDog(true)
    try {
      const inserts = generateDirtyDogInserts(goals)
      if (inserts.length === 0) return
      const response = await fetch("/api/goals/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ goals: inserts }),
      })
      if (!response.ok) throw new Error("Failed to create dirty dog goals")
      await fetchGoals()
    } catch {
      showToast("Failed to add goals", "error")
    } finally {
      setIsAddingDirtyDog(false)
    }
  }

  const handleDeleteGoal = async (goalId: string) => {
    try {
      const response = await fetch(`/api/goals/${goalId}?permanent=true`, { method: "DELETE" })
      if (!response.ok) throw new Error("Failed to delete goal")
      await fetchGoals()
    } catch {
      showToast("Failed to delete goal", "error")
    }
  }

  const handleDeleteAllGoals = async () => {
    setShowDeleteAllConfirm(true)
  }

  const handleConfirmDeleteAll = async () => {
    setIsDeletingAll(true)
    try {
      const results = await Promise.all(
        goals.map(g => fetch(`/api/goals/${g.id}?permanent=true`, { method: "DELETE" }))
      )
      const failed = results.filter(r => !r.ok).length
      if (failed > 0) showToast(`${failed} goal(s) failed to delete`, "error")
      setShowDeleteAllConfirm(false)
      setIsCustomizeMode(false)
      await fetchGoals()
    } catch {
      showToast("Failed to delete goals", "error")
    } finally {
      setIsDeletingAll(false)
    }
  }

  const handleReorder = async (goalIds: string[]) => {
    try {
      const response = await fetch("/api/goals/reorder", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ goalIds }),
      })
      if (!response.ok) throw new Error("Failed to reorder")
    } catch {
      showToast("Failed to reorder goals", "error")
      fetchGoals()
    }
  }

  const handleFormSuccess = () => { fetchGoals() }

  const handleFormClose = (open: boolean) => {
    setIsFormOpen(open)
    if (!open) {
      setEditingGoal(undefined)
      setDefaultParentGoalId(null)
    }
  }

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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <GoalIcon className="size-7 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">Goals</h1>
            <p className="text-sm text-muted-foreground hidden sm:block">
              Track progress across all areas of your life
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {goals.length > 0 && (
            <>
              <ViewSwitcher activeView={viewMode} onViewChange={(v) => { setViewMode(v); setIsCustomizeMode(false) }} />
              <Button
                variant={isCustomizeMode ? "secondary" : "ghost"}
                size="sm"
                onClick={() => setIsCustomizeMode(!isCustomizeMode)}
              >
                <Settings2 className="size-4 mr-1" />
                {isCustomizeMode ? "Done" : "Customize"}
              </Button>
              <Button variant="outline" onClick={() => setShowCatalog(true)}>
                <Library className="size-4 mr-1" />
                Browse Catalog
              </Button>
            </>
          )}
          <Button onClick={handleCreateGoal}>
            <Plus className="size-4 mr-1" />
            New Goal
          </Button>
        </div>
      </div>

      {goals.length === 0 ? (
        <GoalCatalogPicker onTreeCreated={() => { setViewMode("strategic"); setIsLoading(true); fetchGoals() }} onCreateManual={handleCreateGoal} />
      ) : viewMode === "daily" ? (
        <DailyActionView
          goals={goals}
          isCustomizeMode={isCustomizeMode}
          onIncrement={handleIncrement}
          onSetValue={handleSetValue}
          onComplete={handleComplete}
          onReset={handleReset}
          onEdit={handleEdit}
          onAddChild={handleAddChild}
          onGoalToggle={handleGoalToggle}
          onDeleteGoal={handleDeleteGoal}
          onDeleteAllGoals={handleDeleteAllGoals}
          onReorder={handleReorder}
          onSwitchView={setViewMode}
          onCreateGoal={handleCreateGoal}
        />
      ) : (
        <GoalHierarchyView
          goals={goals}
          isCustomizeMode={isCustomizeMode}
          onIncrement={handleIncrement}
          onSetValue={handleSetValue}
          onComplete={handleComplete}
          onReset={handleReset}
          onEdit={handleEdit}
          onAddChild={handleAddChild}
          onGoalToggle={handleGoalToggle}
          onDeleteGoal={handleDeleteGoal}
          onDeleteAllGoals={handleDeleteAllGoals}
          onReorder={handleReorder}
          onAddDirtyDogGoals={handleAddDirtyDogGoals}
          isAddingDirtyDog={isAddingDirtyDog}
        />
      )}

      <GoalFormModal
        open={isFormOpen}
        onOpenChange={handleFormClose}
        goal={editingGoal}
        parentGoals={goals}
        onSuccess={handleFormSuccess}
        defaultParentGoalId={defaultParentGoalId}
      />

      {/* Milestone completion confirmation */}
      {completingGoal && (
        <MilestoneCompleteDialog
          goal={completingGoal}
          isLoading={isCompleting}
          onConfirm={handleConfirmComplete}
          onCancel={() => setCompletingGoal(null)}
        />
      )}

      {/* Delete all confirmation */}
      {showDeleteAllConfirm && (
        <ConfirmDeleteAllDialog
          goalCount={goals.length}
          isDeleting={isDeletingAll}
          onConfirm={handleConfirmDeleteAll}
          onCancel={() => setShowDeleteAllConfirm(false)}
        />
      )}

      {/* Celebration overlay */}
      {celebration && (
        <CelebrationOverlay
          tier={celebration.tier}
          goalTitle={celebration.title}
          onDismiss={() => setCelebration(null)}
        />
      )}

      {/* Catalog modal for existing users */}
      {showCatalog && goals.length > 0 && (
        <GoalCatalogPicker
          existingGoals={goals}
          onTreeCreated={() => {
            setShowCatalog(false)
            setIsLoading(true)
            fetchGoals()
          }}
          onClose={() => setShowCatalog(false)}
        />
      )}

      {/* Action toasts */}
      {toasts.map((t, i) => (
        <ActionToast
          key={t.id}
          message={t.message}
          variant={t.variant}
          onDismiss={() => dismissToast(t.id)}
          style={{ bottom: `${1.5 + i * 4}rem` }}
        />
      ))}
    </div>
  )
}
