"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ArrowLeft, Plus, Loader2, Target, Search, RefreshCw, Pencil } from "lucide-react"
import { GoalFormModal } from "@/src/goals/components/GoalFormModal"
import { CelebrationOverlay } from "@/src/goals/components/CelebrationOverlay"
import { MilestoneCompleteDialog } from "@/src/goals/components/MilestoneCompleteDialog"
import { LifeAreaFilter } from "@/src/goals/components/LifeAreaFilter"
import { ViewSwitcher } from "@/src/goals/components/views/ViewSwitcher"
import { DashboardView } from "@/src/goals/components/views/DashboardView"
import { TimeHorizonView } from "@/src/goals/components/views/TimeHorizonView"
import { flattenTree, filterGoals, getCelebrationTier } from "@/src/goals/goalsService"
import { getLifeAreaConfig } from "@/src/goals/data/lifeAreas"
import { DEFAULT_FILTER_STATE } from "@/src/goals/config"
import type { GoalWithProgress, GoalTreeNode, GoalViewMode, GoalFilterState, CelebrationTier } from "@/src/goals/types"

function OldGoalsHubContent() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [goals, setGoals] = useState<GoalWithProgress[]>([])
  const [tree, setTree] = useState<GoalTreeNode[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [viewMode, setViewMode] = useState<GoalViewMode>(() => {
    const fromUrl = searchParams.get("view") as GoalViewMode
    if (fromUrl === "standard" || fromUrl === "time-horizon") return fromUrl
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("goals-view-mode") as GoalViewMode
      if (stored === "standard" || stored === "time-horizon") return stored
    }
    return "standard"
  })
  const [filters, setFilters] = useState<GoalFilterState>(DEFAULT_FILTER_STATE)
  const [isEditMode, setIsEditMode] = useState(false)
  const [isSyncing, setIsSyncing] = useState(false)
  const [celebration, setCelebration] = useState<{ tier: CelebrationTier; title: string } | null>(null)
  const [completingGoal, setCompletingGoal] = useState<GoalWithProgress | null>(null)
  const [isCompleting, setIsCompleting] = useState(false)
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingGoal, setEditingGoal] = useState<GoalWithProgress | undefined>()
  const [defaultParentGoalId, setDefaultParentGoalId] = useState<string | null>(null)

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

  useEffect(() => {
    const current = searchParams.get("view")
    if (current !== viewMode) {
      const params = new URLSearchParams(searchParams.toString())
      params.set("view", viewMode)
      router.replace(`?${params.toString()}`, { scroll: false })
    }
  }, [viewMode, searchParams, router])

  const handleViewChange = (mode: GoalViewMode) => {
    setViewMode(mode)
    localStorage.setItem("goals-view-mode", mode)
  }

  const handleFilterChange = (update: Partial<GoalFilterState>) => {
    setFilters((prev) => ({ ...prev, ...update }))
  }

  const handleSync = async () => {
    if (isSyncing) return
    setIsSyncing(true)
    try {
      await fetch("/api/goals/sync", { method: "POST" })
      await fetchGoals()
    } finally {
      setIsSyncing(false)
    }
  }

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

  const handleIncrementWithCelebration = async (goalId: string, amount: number) => {
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

  const handleSetValueWithCelebration = async (goalId: string, value: number) => {
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

  const handleReorder = async (goalIds: string[]) => {
    try {
      await fetch("/api/goals/reorder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ goalIds }),
      })
      await fetchGoals()
    } catch {
      await fetchGoals()
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

  const filteredGoals = filterGoals(goals, filters)

  const filterAreaName = useMemo(() => {
    if (!filters.lifeArea) return null
    return getLifeAreaConfig(filters.lifeArea).name
  }, [filters.lifeArea])

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
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Target className="size-7 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">Goals</h1>
            <p className="text-sm text-muted-foreground">Track progress across all areas of your life</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative hidden sm:block">
            <Search className="size-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search goals..."
              value={filters.search}
              onChange={(e) => handleFilterChange({ search: e.target.value })}
              className="w-48 pl-8 h-9"
            />
          </div>
          <Button variant={isEditMode ? "secondary" : "ghost"} size="icon" className="h-9 w-9" onClick={() => setIsEditMode(!isEditMode)} title={isEditMode ? "Done editing" : "Edit layout"}>
            <Pencil className="size-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-9 w-9" onClick={handleSync} disabled={isSyncing} title="Sync linked goals">
            <RefreshCw className={`size-4 ${isSyncing ? "animate-spin" : ""}`} />
          </Button>
          <ViewSwitcher activeView={viewMode} onViewChange={handleViewChange} />
          <Button onClick={handleCreateGoal}>
            <Plus className="size-4 mr-1" />
            New Goal
          </Button>
        </div>
      </div>

      <LifeAreaFilter goals={goals} selectedArea={filters.lifeArea} onSelect={(area) => handleFilterChange({ lifeArea: area })} />

      {viewMode === "standard" && (
        <DashboardView
          goals={filteredGoals} allGoals={goals} tree={tree} isEditMode={isEditMode}
          onIncrement={handleIncrementWithCelebration} onSetValue={handleSetValueWithCelebration}
          onComplete={handleComplete} onReorder={handleReorder} onReset={handleReset}
          onEdit={handleEdit} onAddChild={handleAddChild} onCreateGoal={handleCreateGoal}
          filterAreaName={filterAreaName}
        />
      )}

      {viewMode === "time-horizon" && (
        <TimeHorizonView
          goals={filteredGoals} allGoals={goals} tree={tree} isEditMode={isEditMode}
          onIncrement={handleIncrementWithCelebration} onSetValue={handleSetValueWithCelebration}
          onComplete={handleComplete} onReorder={handleReorder} onReset={handleReset}
          onEdit={handleEdit} onAddChild={handleAddChild} onCreateGoal={handleCreateGoal}
          filterAreaName={filterAreaName}
        />
      )}

      <GoalFormModal
        open={isFormOpen} onOpenChange={handleFormClose} goal={editingGoal}
        parentGoals={goals} onSuccess={handleFormSuccess}
        defaultLifeArea={filters.lifeArea} defaultParentGoalId={defaultParentGoalId}
      />

      {completingGoal && (
        <MilestoneCompleteDialog goal={completingGoal} isLoading={isCompleting} onConfirm={handleConfirmComplete} onCancel={() => setCompletingGoal(null)} />
      )}

      {celebration && (
        <CelebrationOverlay tier={celebration.tier} goalTitle={celebration.title} onDismiss={() => setCelebration(null)} />
      )}
    </div>
  )
}

export default function OldGoalsTestPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-6xl px-4 py-8">
        <Button asChild variant="ghost" size="sm" className="mb-4">
          <Link href="/test">
            <ArrowLeft className="size-4 mr-2" />
            Back to Test Pages
          </Link>
        </Button>
        <OldGoalsHubContent />
      </div>
    </div>
  )
}
