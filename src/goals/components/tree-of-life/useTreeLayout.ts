import { useMemo } from "react"
import { getLifeAreaConfig } from "../../data/lifeAreas"
import type { GoalTreeNode, GoalWithProgress, TreeLayout, TreeLayoutNode, TreeLayoutRoot, CoreValueRoot } from "../../types"

const CANVAS_WIDTH = 1200
const CANVAS_HEIGHT = 900
const GROUND_Y = 600
const TRUNK_X = CANVAS_WIDTH / 2
const TRUNK_WIDTH = 40
const TRUNK_TOP = 120
const BRANCH_LENGTH = 180
const LEAF_RADIUS = 14
const ROOT_DEPTH = 200

// Life areas fan out at fixed angles from the trunk
const AREA_ANGLES: Record<string, number> = {
  daygame: -70,
  health_fitness: -35,
  career_business: 0,
  personal_growth: 35,
  vices_elimination: 70,
}

function degToRad(deg: number): number {
  return (deg * Math.PI) / 180
}

/**
 * Compute tree layout positions from goal data and values.
 * Returns positioned nodes for the Canvas renderer.
 */
export function computeTreeLayout(
  tree: GoalTreeNode[],
  goals: GoalWithProgress[],
  roots: CoreValueRoot[] | null,
  alignmentMap: Record<string, string[]>
): TreeLayout {
  const nodes: TreeLayoutNode[] = []
  const layoutRoots: TreeLayoutRoot[] = []

  // Group goals by life area for branch positioning
  const goalsByArea: Record<string, GoalWithProgress[]> = {}
  for (const goal of goals) {
    const area = goal.life_area || "custom"
    if (!goalsByArea[area]) goalsByArea[area] = []
    goalsByArea[area].push(goal)
  }

  // --- Position trunk (life area channels) ---
  const trunkNode: TreeLayoutNode = {
    id: "trunk",
    type: "trunk",
    x: TRUNK_X,
    y: GROUND_Y,
    width: TRUNK_WIDTH,
    height: GROUND_Y - TRUNK_TOP,
    color: "#8B6B47",
    label: "",
    progress: 0,
    goalLevel: null,
    lifeArea: "",
    parentId: null,
    children: [],
    isComplete: false,
    streak: 0,
    phase: null,
    alignedValues: [],
  }
  nodes.push(trunkNode)

  // --- Position branches (L1 goals) and leaves (L3 goals) ---
  const l1Goals = goals.filter((g) => (g.goal_level === 1 || g.goal_level === 0) && !g.parent_goal_id)
  const l3Goals = goals.filter((g) => g.goal_level === 3 || (g.goal_level === null && g.parent_goal_id))

  // For each life area, position branches
  const areaEntries = Object.entries(goalsByArea)
  for (const [areaId, areaGoals] of areaEntries) {
    const baseAngle = AREA_ANGLES[areaId] ?? 0
    const areaConfig = getLifeAreaConfig(areaId)
    const color = areaConfig.hex

    // Get L1 goals for this area
    const areaL1s = areaGoals.filter((g) => g.goal_level === 1 || g.goal_level === 0)
    const areaL3s = areaGoals.filter((g) => g.goal_level === 3 || (g.goal_level === null && g.parent_goal_id))

    // Position each L1 as a branch
    areaL1s.forEach((l1, idx) => {
      const spreadAngle = areaL1s.length > 1
        ? baseAngle + (idx - (areaL1s.length - 1) / 2) * 15
        : baseAngle
      const angleRad = degToRad(spreadAngle)

      // Branch starts from trunk at varying heights
      const branchStartY = TRUNK_TOP + 80 + idx * 60
      const branchX = TRUNK_X + Math.sin(angleRad) * BRANCH_LENGTH
      const branchY = branchStartY - Math.cos(angleRad) * (BRANCH_LENGTH * 0.6)

      const branchNode: TreeLayoutNode = {
        id: l1.id,
        type: "branch",
        x: branchX,
        y: branchY,
        width: 8 + (l1.progress_percentage / 100) * 8,
        height: BRANCH_LENGTH,
        color,
        label: l1.title,
        progress: l1.progress_percentage,
        goalLevel: l1.goal_level,
        lifeArea: areaId,
        parentId: "trunk",
        children: [],
        isComplete: l1.is_complete,
        streak: l1.current_streak,
        phase: l1.goal_phase,
        alignedValues: l1.aligned_values || [],
      }
      nodes.push(branchNode)
      trunkNode.children.push(l1.id)

      // Position leaves (children of this L1)
      const childGoals = areaL3s.filter((g) => g.parent_goal_id === l1.id)
      childGoals.forEach((leaf, leafIdx) => {
        const leafSpread = childGoals.length > 1
          ? (leafIdx - (childGoals.length - 1) / 2) * 25
          : 0
        const leafAngleRad = degToRad(spreadAngle + leafSpread)
        const leafDist = BRANCH_LENGTH * 0.3 + leafIdx * 20
        const leafX = branchX + Math.sin(leafAngleRad) * leafDist * 0.4
        const leafY = branchY - Math.cos(leafAngleRad) * leafDist * 0.3

        const leafNode: TreeLayoutNode = {
          id: leaf.id,
          type: "leaf",
          x: leafX,
          y: leafY,
          width: LEAF_RADIUS * 2,
          height: LEAF_RADIUS * 2,
          color,
          label: leaf.title,
          progress: leaf.progress_percentage,
          goalLevel: leaf.goal_level,
          lifeArea: areaId,
          parentId: l1.id,
          children: [],
          isComplete: leaf.is_complete,
          streak: leaf.current_streak,
          phase: leaf.goal_phase,
          alignedValues: leaf.aligned_values || [],
        }
        nodes.push(leafNode)
        branchNode.children.push(leaf.id)
      })
    })

    // Orphan L3s (no parent) become leaves directly on trunk
    const orphanL3s = areaL3s.filter((g) => !g.parent_goal_id || !areaL1s.some((l1) => l1.id === g.parent_goal_id))
    orphanL3s.forEach((leaf, idx) => {
      const angle = degToRad(baseAngle + (idx - (orphanL3s.length - 1) / 2) * 12)
      const leafX = TRUNK_X + Math.sin(angle) * (BRANCH_LENGTH * 0.7)
      const leafY = TRUNK_TOP + 100 + idx * 30

      const leafNode: TreeLayoutNode = {
        id: leaf.id,
        type: "leaf",
        x: leafX,
        y: leafY,
        width: LEAF_RADIUS * 2,
        height: LEAF_RADIUS * 2,
        color,
        label: leaf.title,
        progress: leaf.progress_percentage,
        goalLevel: leaf.goal_level,
        lifeArea: areaId,
        parentId: "trunk",
        children: [],
        isComplete: leaf.is_complete,
        streak: leaf.current_streak,
        phase: leaf.goal_phase,
        alignedValues: leaf.aligned_values || [],
      }
      nodes.push(leafNode)
    })
  }

  // --- Position roots (core values) ---
  if (roots && roots.length > 0) {
    const rootSpacing = 120
    const startX = TRUNK_X - ((roots.length - 1) * rootSpacing) / 2

    roots.forEach((root, idx) => {
      const rootX = startX + idx * rootSpacing
      const rootY = GROUND_Y + 40 + (root.rank <= 3 ? root.rank * 30 : 90 + (root.rank - 3) * 20)
      const thickness = Math.max(2, 8 - root.rank)

      // Find which branches this root connects to
      const connectedBranches: string[] = []
      for (const [goalId, values] of Object.entries(alignmentMap)) {
        if (values.includes(root.id)) {
          connectedBranches.push(goalId)
        }
      }

      layoutRoots.push({
        id: `root-${root.id}`,
        valueId: root.id,
        rank: root.rank,
        x: rootX,
        y: rootY,
        thickness,
        connectedBranches,
      })
    })
  }

  return {
    nodes,
    roots: layoutRoots,
    bounds: { width: CANVAS_WIDTH, height: CANVAS_HEIGHT },
    groundY: GROUND_Y,
  }
}

/**
 * React hook that memoizes the tree layout computation.
 */
export function useTreeLayout(
  tree: GoalTreeNode[],
  goals: GoalWithProgress[],
  roots: CoreValueRoot[] | null,
  alignmentMap: Record<string, string[]>
): TreeLayout {
  return useMemo(
    () => computeTreeLayout(tree, goals, roots, alignmentMap),
    [tree, goals, roots, alignmentMap]
  )
}
