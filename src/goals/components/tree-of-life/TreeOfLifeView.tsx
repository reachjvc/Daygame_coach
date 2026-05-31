"use client"

import { useState, useCallback, useEffect } from "react"
import { TreeOfLifeCanvas } from "./TreeOfLifeCanvas"
import { useTreeLayout } from "./useTreeLayout"
import { NodeDetailPanel } from "./NodeDetailPanel"
import { SoilPanel } from "./SoilPanel"
import { EmptyTreeState } from "./EmptyTreeState"
import type { GoalWithProgress, GoalTreeNode, TreeOfLifeData } from "../../types"

interface TreeOfLifeViewProps {
  onIncrement: (goalId: string, amount: number) => Promise<void>
  onEdit: (goal: GoalWithProgress) => void
  onCreateGoal: () => void
}

export function TreeOfLifeView({ onIncrement, onEdit, onCreateGoal }: TreeOfLifeViewProps) {
  const [data, setData] = useState<TreeOfLifeData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null)
  const [selectedValueId, setSelectedValueId] = useState<string | null>(null)
  const [showSoil, setShowSoil] = useState(false)

  // Fetch tree of life data
  useEffect(() => {
    async function fetchData() {
      try {
        const response = await fetch("/api/goals/tree-of-life")
        if (!response.ok) throw new Error("Failed to fetch tree data")
        const json = await response.json()
        setData(json)
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error")
      } finally {
        setIsLoading(false)
      }
    }
    fetchData()
  }, [])

  // Compute layout from data
  const layout = useTreeLayout(
    data?.tree ?? [],
    data?.goals ?? [],
    data?.roots ?? null,
    data?.alignmentMap ?? {}
  )

  const handleNodeClick = useCallback((nodeId: string) => {
    setSelectedNodeId(nodeId)
    setSelectedValueId(null)
    setShowSoil(false)
  }, [])

  const handleRootClick = useCallback((valueId: string) => {
    setSelectedValueId(valueId)
    setSelectedNodeId(null)
    setShowSoil(true)
  }, [])

  const handleEmptyClick = useCallback(() => {
    setSelectedNodeId(null)
    setSelectedValueId(null)
    setShowSoil(false)
  }, [])

  const handleClosePanel = useCallback(() => {
    setSelectedNodeId(null)
    setSelectedValueId(null)
    setShowSoil(false)
  }, [])

  // Find selected goal for detail panel
  const selectedGoal = selectedNodeId
    ? data?.goals.find((g) => g.id === selectedNodeId) ?? null
    : null

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[500px]">
        <div className="animate-pulse text-muted-foreground text-sm">Growing your tree...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-[500px]">
        <div className="text-destructive text-sm">{error}</div>
      </div>
    )
  }

  // Empty state — no goals yet
  if (!data || data.goals.length === 0) {
    return <EmptyTreeState onCreateGoal={onCreateGoal} hasSoil={data ? data.soilDensity > 0 : false} />
  }

  return (
    <div className="relative w-full" style={{ height: "calc(100vh - 200px)", minHeight: 500 }}>
      {/* Canvas tree */}
      <TreeOfLifeCanvas
        layout={layout}
        soilDensity={data.soilDensity}
        onNodeClick={handleNodeClick}
        onRootClick={handleRootClick}
        onEmptyClick={handleEmptyClick}
      />

      {/* Node detail panel (slides from right) */}
      {selectedGoal && (
        <NodeDetailPanel
          goal={selectedGoal}
          roots={data.roots}
          alignedValues={data.alignmentMap[selectedGoal.id] ?? []}
          onClose={handleClosePanel}
          onIncrement={onIncrement}
          onEdit={onEdit}
        />
      )}

      {/* Soil/root panel (slides from bottom) */}
      {showSoil && (
        <SoilPanel
          roots={data.roots}
          aspirational={data.aspirational}
          soilDensity={data.soilDensity}
          selectedValueId={selectedValueId}
          alignmentMap={data.alignmentMap}
          goals={data.goals}
          onClose={handleClosePanel}
        />
      )}
    </div>
  )
}
