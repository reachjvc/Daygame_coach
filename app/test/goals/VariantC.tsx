"use client"

import { useState, useCallback, useMemo } from "react"
import { ArrowLeft, Map, CheckSquare } from "lucide-react"
import { Button } from "@/components/ui/button"
import { GoalPicker } from "./variant-c/GoalPicker"
import { MindMapCanvas } from "./variant-c/MindMapCanvas"
import { HoursPanel } from "./variant-c/HoursPanel"
import { GoalDetailPanel } from "./variant-c/GoalDetailPanel"
import { ConfirmPanel } from "./variant-c/ConfirmPanel"
import { buildMindMapTree, getL1Goals, estimateHoursPerWeek } from "./variant-c/buildMindMap"
import { getChildren } from "@/src/goals/data/goalGraph"
import { generateGoalTreeInserts } from "@/src/goals/treeGenerationService"
import type { GoalTemplate } from "@/src/goals/types"
import type { MindMapNode, FlowPhase } from "./variant-c/types"

/**
 * Variant C: Mind-Map Whiteboard Goal Flow
 *
 * Inspired by the FigJam/whiteboard goal pictures showing a hierarchical
 * mind-map with nested numbered boxes, target dates, and Input/Outcome labels.
 *
 * Flow:
 * 1. GoalPicker — Choose a big life goal (L1) from two paths
 * 2. MindMapCanvas — Interactive whiteboard tree with expandable branches
 *    + HoursPanel (left) + GoalDetailPanel (right on click)
 * 3. ConfirmPanel — Review selected goals and create
 */
export default function VariantC() {
  const [phase, setPhase] = useState<FlowPhase>("canvas")
  const [tree, setTree] = useState<MindMapNode | null>(null)
  const [selectedL1, setSelectedL1] = useState<GoalTemplate | null>(null)
  const [focusedNodeId, setFocusedNodeId] = useState<string | null>(null)
  const [isCreating, setIsCreating] = useState(false)
  const [createdCount, setCreatedCount] = useState<number | null>(null)

  const { onePerson, abundance } = getL1Goals()

  // Hours estimates for all L2 goals
  const hoursEstimates = useMemo(() => {
    const result: Record<string, number> = {}
    // Get all L2s from first L1 (they're the same for all L1s)
    if (onePerson.length > 0) {
      const l2s = getChildren(onePerson[0].id).filter((c) => c.level === 2)
      for (const l2 of l2s) {
        result[l2.id] = estimateHoursPerWeek(l2.id)
      }
    }
    return result
  }, [onePerson])

  // Track which L2s are selected (have selected L3 children)
  const selectedL2Ids = useMemo(() => {
    if (!tree) return new Set<string>()
    const ids = new Set<string>()
    function walk(node: MindMapNode) {
      if (node.level === 2 && node.isSelected) ids.add(node.id)
      if (node.level === 2) {
        // Also include if any L3 child is selected
        for (const child of node.children) {
          if (child.isSelected) {
            ids.add(node.id)
            break
          }
        }
      }
      node.children.forEach(walk)
    }
    walk(tree)
    return ids
  }, [tree])

  // All selected leaf nodes
  const selectedNodes = useMemo(() => {
    if (!tree) return []
    const nodes: MindMapNode[] = []
    function walk(node: MindMapNode) {
      if (node.isSelected) nodes.push(node)
      node.children.forEach(walk)
    }
    walk(tree)
    return nodes
  }, [tree])

  // Focused node
  const focusedNode = useMemo(() => {
    if (!tree || !focusedNodeId) return null
    let found: MindMapNode | null = null
    function walk(node: MindMapNode) {
      if (node.id === focusedNodeId) found = node
      node.children.forEach(walk)
    }
    walk(tree)
    return found
  }, [tree, focusedNodeId])

  // Handle L1 goal pick
  const handlePickL1 = useCallback((template: GoalTemplate) => {
    const newTree = buildMindMapTree(template)
    setSelectedL1(template)
    setTree(newTree)
    setPhase("canvas")
    setFocusedNodeId(null)
  }, [])

  // Toggle expand/collapse on a node
  const handleToggleExpand = useCallback((nodeId: string) => {
    setTree((prev) => {
      if (!prev) return prev
      return updateNode(prev, nodeId, (n) => ({
        ...n,
        isExpanded: !n.isExpanded,
      }))
    })
  }, [])

  // Toggle selection on a node (and cascade to children for L2)
  const handleToggleSelect = useCallback((nodeId: string) => {
    setTree((prev) => {
      if (!prev) return prev
      // Find the node first to check its level
      const target = findNode(prev, nodeId)
      if (!target) return prev

      const newSelected = !target.isSelected

      if (target.level === 2) {
        // Cascade to all L3 children
        let updated = updateNode(prev, nodeId, (n) => ({
          ...n,
          isSelected: newSelected,
        }))
        for (const child of target.children) {
          updated = updateNode(updated, child.id, (n) => ({
            ...n,
            isSelected: newSelected,
          }))
        }
        return updated
      }

      return updateNode(prev, nodeId, (n) => ({
        ...n,
        isSelected: newSelected,
      }))
    })
  }, [])

  // Click a node to show details
  const handleNodeClick = useCallback((nodeId: string) => {
    setFocusedNodeId((prev) => (prev === nodeId ? null : nodeId))
  }, [])

  // Navigate to a child node from the detail panel
  const handleExpandAndShow = useCallback((childId: string) => {
    setTree((prev) => {
      if (!prev) return prev
      // Find parent of the child and expand it
      let updated = prev
      function expandParent(node: MindMapNode): MindMapNode {
        for (const child of node.children) {
          if (child.id === childId) {
            return { ...node, isExpanded: true, children: node.children.map(expandParent) }
          }
          const result = expandParent(child)
          if (result !== child) {
            return { ...node, isExpanded: true, children: node.children.map((c) => (c === child ? result : c)) }
          }
        }
        return node
      }
      updated = expandParent(updated)
      return updated
    })
    setFocusedNodeId(childId)
  }, [])

  // Back to picker
  const handleBackToPicker = useCallback(() => {
    setTree(null)
    setSelectedL1(null)
    setPhase("canvas")
    setFocusedNodeId(null)
    setCreatedCount(null)
  }, [])

  // Proceed to confirm
  const handleProceedToConfirm = useCallback(() => {
    setPhase("confirm")
    setFocusedNodeId(null)
  }, [])

  // Create goals
  const handleConfirm = useCallback(async () => {
    if (!selectedL1 || isCreating) return
    setIsCreating(true)

    try {
      const inserts = generateGoalTreeInserts(selectedL1.id)
      if (inserts.length === 0) {
        setIsCreating(false)
        return
      }

      const response = await fetch("/api/goals/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ goals: inserts }),
      })

      if (!response.ok) {
        throw new Error("Failed to create goals")
      }

      setCreatedCount(inserts.length)
      setPhase("canvas")
    } catch {
      // Error handling - stay on confirm
    } finally {
      setIsCreating(false)
    }
  }, [selectedL1, isCreating])

  // Success state
  if (createdCount !== null) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: "#fafbfc" }}>
        <div
          className="text-center p-8 rounded-2xl border-2 border-dashed"
          style={{ borderColor: "#86efac", backgroundColor: "#dcfce720" }}
        >
          <div
            className="text-4xl mb-3"
            style={{ fontFamily: "'Caveat', 'Patrick Hand', cursive, sans-serif" }}
          >
            Goal map created!
          </div>
          <p className="text-sm mb-4" style={{ color: "#64748b" }}>
            {createdCount} goals built from your whiteboard plan
          </p>
          <Button onClick={handleBackToPicker} variant="outline">
            Start Over
          </Button>
        </div>
      </div>
    )
  }

  // No tree yet — show picker
  if (!tree) {
    return (
      <div className="min-h-screen p-8" style={{ backgroundColor: "#f1f5f9" }}>
        {/* Top bar */}
        <div className="flex items-center gap-3 mb-6 max-w-3xl mx-auto">
          <Map className="size-6" style={{ color: "#1e293b" }} />
          <h1
            className="text-xl font-bold"
            style={{
              color: "#1e293b",
              fontFamily: "'Caveat', 'Patrick Hand', cursive, sans-serif",
              fontSize: 24,
            }}
          >
            Goal Mind Map
          </h1>
        </div>

        <GoalPicker onePerson={onePerson} abundance={abundance} onPick={handlePickL1} />
      </div>
    )
  }

  // Confirm phase
  if (phase === "confirm") {
    return (
      <div className="min-h-screen p-8" style={{ backgroundColor: "#f1f5f9" }}>
        <ConfirmPanel
          tree={tree}
          selectedNodes={selectedNodes}
          isCreating={isCreating}
          onConfirm={handleConfirm}
          onBack={() => setPhase("canvas")}
        />
      </div>
    )
  }

  // Canvas phase — the main mind-map view
  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: "#f1f5f9" }}>
      {/* Top bar */}
      <div
        className="flex items-center justify-between px-6 py-3 border-b"
        style={{ backgroundColor: "#ffffff", borderColor: "#e2e8f0" }}
      >
        <div className="flex items-center gap-3">
          <button
            onClick={handleBackToPicker}
            className="flex items-center gap-1.5 text-sm transition-colors cursor-pointer hover:opacity-70"
            style={{ color: "#64748b" }}
          >
            <ArrowLeft className="size-4" />
            Back
          </button>
          <div className="w-px h-5" style={{ backgroundColor: "#e2e8f0" }} />
          <Map className="size-5" style={{ color: "#1e293b" }} />
          <div>
            <h1
              className="text-base font-bold"
              style={{
                color: "#1e293b",
                fontFamily: "'Caveat', 'Patrick Hand', cursive, sans-serif",
                fontSize: 18,
              }}
            >
              {tree.title}
            </h1>
            <p className="text-xs" style={{ color: "#94a3b8" }}>
              Click nodes to explore, check boxes to select goals
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-sm" style={{ color: "#64748b" }}>
            {selectedNodes.length} selected
          </span>
          <Button
            onClick={handleProceedToConfirm}
            disabled={selectedNodes.length === 0}
            style={{
              backgroundColor: selectedNodes.length > 0 ? "#eab308" : undefined,
              color: selectedNodes.length > 0 ? "#ffffff" : undefined,
              borderColor: selectedNodes.length > 0 ? "#eab308" : undefined,
            }}
          >
            <CheckSquare className="size-4 mr-2" />
            Review & Create
          </Button>
        </div>
      </div>

      {/* Main content: Hours | Canvas | Detail */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left: Hours panel */}
        <div className="flex-shrink-0 p-4 border-r overflow-y-auto" style={{ borderColor: "#e2e8f0" }}>
          <HoursPanel selectedL2Ids={selectedL2Ids} hoursEstimates={hoursEstimates} />
        </div>

        {/* Center: Mind-map canvas */}
        <MindMapCanvas
          tree={tree}
          onToggleExpand={handleToggleExpand}
          onToggleSelect={handleToggleSelect}
          onNodeClick={handleNodeClick}
        />

        {/* Right: Detail panel (when a node is clicked) */}
        {focusedNode && (
          <GoalDetailPanel
            node={focusedNode}
            onClose={() => setFocusedNodeId(null)}
            onToggleSelect={handleToggleSelect}
            onExpandAndShow={handleExpandAndShow}
          />
        )}
      </div>
    </div>
  )
}

// ============================================================================
// Tree update helpers
// ============================================================================

function updateNode(
  root: MindMapNode,
  targetId: string,
  updater: (node: MindMapNode) => MindMapNode
): MindMapNode {
  if (root.id === targetId) return updater(root)
  if (root.children.length === 0) return root

  const newChildren = root.children.map((child) => updateNode(child, targetId, updater))
  // Check if any child actually changed
  const changed = newChildren.some((c, i) => c !== root.children[i])
  return changed ? { ...root, children: newChildren } : root
}

function findNode(root: MindMapNode, targetId: string): MindMapNode | null {
  if (root.id === targetId) return root
  for (const child of root.children) {
    const found = findNode(child, targetId)
    if (found) return found
  }
  return null
}
