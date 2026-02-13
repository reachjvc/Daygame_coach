"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Plus, Loader2, Target, Search } from "lucide-react"
import { GoalFormModal } from "./GoalFormModal"
import { LifeAreaFilter } from "./LifeAreaFilter"
import { ViewSwitcher } from "./views/ViewSwitcher"
import { DashboardView } from "./views/DashboardView"
import { TimeHorizonView } from "./views/TimeHorizonView"
import { flattenTree, filterGoals } from "../goalsService"
import { getLifeAreaConfig } from "../data/lifeAreas"
import { DEFAULT_FILTER_STATE } from "../config"
import type { GoalWithProgress, GoalTreeNode, GoalViewMode, GoalFilterState } from "../types"

export function GoalsHubContent() {
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
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingGoal, setEditingGoal] = useState<GoalWithProgress | undefined>()

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

  // Sync view mode to URL
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

  const handleIncrement = async (goalId: string, amount: number) => {
    const response = await fetch(`/api/goals/${goalId}/increment`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amount }),
    })
    if (!response.ok) throw new Error("Failed to increment")
    await fetchGoals()
  }

  const handleReset = async (goalId: string) => {
    const response = await fetch(`/api/goals/${goalId}/reset`, {
      method: "POST",
    })
    if (!response.ok) throw new Error("Failed to reset")
    await fetchGoals()
  }

  const handleEdit = (goal: GoalWithProgress) => {
    setEditingGoal(goal)
    setIsFormOpen(true)
  }

  const handleCreateGoal = () => {
    setEditingGoal(undefined)
    setIsFormOpen(true)
  }

  const handleFormSuccess = () => {
    fetchGoals()
  }

  const handleFormClose = (open: boolean) => {
    setIsFormOpen(open)
    if (!open) setEditingGoal(undefined)
  }

  const filteredGoals = filterGoals(goals, filters)

  // Derive the filter area name for empty states
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
        <Button onClick={() => { setIsLoading(true); fetchGoals() }}>
          Retry
        </Button>
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
          <div className="relative hidden sm:block">
            <Search className="size-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search goals..."
              value={filters.search}
              onChange={(e) => handleFilterChange({ search: e.target.value })}
              className="w-48 pl-8 h-9"
            />
          </div>
          <ViewSwitcher activeView={viewMode} onViewChange={handleViewChange} />
          <Button onClick={handleCreateGoal}>
            <Plus className="size-4 mr-1" />
            New Goal
          </Button>
        </div>
      </div>

      {/* Life Area Filter */}
      <LifeAreaFilter
        goals={goals}
        selectedArea={filters.lifeArea}
        onSelect={(area) => handleFilterChange({ lifeArea: area })}
      />

      {/* Active View */}
      {viewMode === "standard" && (
        <DashboardView
          goals={filteredGoals}
          allGoals={goals}
          tree={tree}
          onIncrement={handleIncrement}
          onReset={handleReset}
          onEdit={handleEdit}
          onCreateGoal={handleCreateGoal}
          filterAreaName={filterAreaName}
        />
      )}

      {viewMode === "time-horizon" && (
        <TimeHorizonView
          goals={filteredGoals}
          allGoals={goals}
          tree={tree}
          onIncrement={handleIncrement}
          onReset={handleReset}
          onEdit={handleEdit}
          onCreateGoal={handleCreateGoal}
          filterAreaName={filterAreaName}
        />
      )}

      {/* Goal Form Modal */}
      <GoalFormModal
        open={isFormOpen}
        onOpenChange={handleFormClose}
        goal={editingGoal}
        parentGoals={goals}
        onSuccess={handleFormSuccess}
        defaultLifeArea={filters.lifeArea}
      />
    </div>
  )
}
