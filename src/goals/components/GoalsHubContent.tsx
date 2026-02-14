"use client"

import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Plus, Loader2, Target, Settings2, Sparkles } from "lucide-react"
import { GoalFormModal } from "./GoalFormModal"
import { CelebrationOverlay } from "./CelebrationOverlay"
import { MilestoneCompleteDialog } from "./MilestoneCompleteDialog"
import { GoalCatalogPicker } from "./GoalCatalogPicker"
import { GoalHierarchyView } from "./GoalHierarchyView"
import { DailyActionView } from "./DailyActionView"
import { ViewSwitcher } from "./views/ViewSwitcher"
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

  const fetchGoals = useCallback(async () => {
    try {
      const response = await fetch("/api/goals/tree")
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
    } finally {
      setIsCompleting(false)
    }
  }

  const handleIncrement = async (goalId: string, amount: number) => {
    const goal = goals.find(g => g.id === goalId)
    const response = await fetch(`/api/goals/${goalId}/increment`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amount }),
    })
    if (!response.ok) throw new Error("Failed to increment")
    await fetchGoals()
    if (goal && !goal.is_complete && goal.current_value + amount >= goal.target_value) {
      triggerCelebration(goal)
    }
  }

  const handleSetValue = async (goalId: string, value: number) => {
    const goal = goals.find(g => g.id === goalId)
    const response = await fetch(`/api/goals/${goalId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ current_value: value }),
    })
    if (!response.ok) throw new Error("Failed to set value")
    await fetchGoals()
    if (goal && !goal.is_complete && value >= goal.target_value) {
      triggerCelebration(goal)
    }
  }

  const handleReset = async (goalId: string) => {
    const response = await fetch(`/api/goals/${goalId}/reset`, { method: "POST" })
    if (!response.ok) throw new Error("Failed to reset")
    await fetchGoals()
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
    const response = await fetch(`/api/goals/${goalId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_archived: !active, is_active: active }),
    })
    if (!response.ok) throw new Error("Failed to toggle goal")
    await fetchGoals()
  }

  const handleAddDirtyDogGoals = async () => {
    const inserts = generateDirtyDogInserts(goals)
    if (inserts.length === 0) return
    const response = await fetch("/api/goals/batch", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ goals: inserts }),
    })
    if (!response.ok) throw new Error("Failed to create dirty dog goals")
    await fetchGoals()
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
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Target className="size-7 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">Goals</h1>
            <p className="text-sm text-muted-foreground">
              Track progress across all areas of your life
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {goals.length > 0 && (
            <>
              <ViewSwitcher activeView={viewMode} onViewChange={setViewMode} />
              {viewMode === "strategic" && (
                <Button
                  variant={isCustomizeMode ? "secondary" : "ghost"}
                  size="sm"
                  onClick={() => setIsCustomizeMode(!isCustomizeMode)}
                >
                  <Settings2 className="size-4 mr-1" />
                  {isCustomizeMode ? "Done" : "Customize"}
                </Button>
              )}
              <Button variant="outline" onClick={() => setShowCatalog(true)}>
                <Sparkles className="size-4 mr-1" />
                Browse Catalog
              </Button>
              <Button onClick={handleCreateGoal}>
                <Plus className="size-4 mr-1" />
                New Goal
              </Button>
            </>
          )}
        </div>
      </div>

      {goals.length === 0 ? (
        <GoalCatalogPicker onTreeCreated={() => { setIsLoading(true); fetchGoals() }} />
      ) : viewMode === "daily" ? (
        <DailyActionView
          goals={goals}
          onIncrement={handleIncrement}
          onSetValue={handleSetValue}
          onComplete={handleComplete}
          onReset={handleReset}
          onEdit={handleEdit}
          onAddChild={handleAddChild}
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
          onAddDirtyDogGoals={handleAddDirtyDogGoals}
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
    </div>
  )
}
