/**
 * Builds a mind-map tree from the goal graph data.
 * Transforms the flat GOAL_TEMPLATES + GOAL_GRAPH_EDGES into a nested tree
 * with numbering (1, 1.1, 1.1.2, etc.) matching the whiteboard pictures.
 */

import { getCatalogTiers, getChildren } from "@/src/goals/data/goalGraph"
import type { GoalTemplate, GoalDisplayCategory } from "@/src/goals/types"
import type { MindMapNode } from "./types"

const CATEGORY_ORDER: GoalDisplayCategory[] = [
  "field_work",
  "results",
  "dirty_dog",
  "texting",
  "dates",
  "relationship",
]

/**
 * Build the full mind-map tree for a given L1 template.
 */
export function buildMindMapTree(l1Template: GoalTemplate): MindMapNode {
  const l2Children = getChildren(l1Template.id).filter((c) => c.level === 2)

  const root: MindMapNode = {
    id: l1Template.id,
    templateId: l1Template.id,
    title: l1Template.title,
    level: 1,
    nature: l1Template.nature,
    numbering: "",
    children: [],
    isExpanded: true,
    isSelected: false,
    templateType: l1Template.templateType,
    targetValue: l1Template.defaultMilestoneConfig?.target,
  }

  l2Children.forEach((l2, l2Idx) => {
    const l2Num = `${l2Idx + 1}`
    const l2Node: MindMapNode = {
      id: l2.id,
      templateId: l2.id,
      title: l2.title,
      level: 2,
      nature: l2.nature,
      numbering: l2Num,
      children: [],
      isExpanded: false,
      isSelected: false,
      templateType: l2.templateType,
    }

    const l3Children = getChildren(l2.id).filter((c) => c.level === 3)
    // Sort by category order
    l3Children.sort((a, b) => {
      const aIdx = CATEGORY_ORDER.indexOf(a.displayCategory as GoalDisplayCategory)
      const bIdx = CATEGORY_ORDER.indexOf(b.displayCategory as GoalDisplayCategory)
      return (aIdx === -1 ? 99 : aIdx) - (bIdx === -1 ? 99 : bIdx)
    })

    l3Children.forEach((l3, l3Idx) => {
      const l3Num = `${l2Num}.${l3Idx + 1}`
      l2Node.children.push({
        id: l3.id,
        templateId: l3.id,
        title: l3.title,
        level: 3,
        nature: l3.nature,
        numbering: l3Num,
        children: [],
        isExpanded: false,
        isSelected: false,
        templateType: l3.templateType,
        displayCategory: l3.displayCategory,
        targetValue: l3.defaultMilestoneConfig?.target,
      })
    })

    root.children.push(l2Node)
  })

  return root
}

/**
 * Get all L1 goals organized by path for the canvas overview.
 */
export function getL1Goals(): { onePerson: GoalTemplate[]; abundance: GoalTemplate[] } {
  const tiers = getCatalogTiers()
  return tiers.tier1
}

/**
 * Estimate hours per week for a given L2 goal based on its L3 children.
 */
export function estimateHoursPerWeek(l2TemplateId: string): number {
  const l3Children = getChildren(l2TemplateId).filter((c) => c.level === 3)
  // Rough estimate: input goals contribute ~1-2 hrs/wk, outcome goals ~0.5 hrs
  let hours = 0
  for (const l3 of l3Children) {
    if (l3.nature === "input") {
      hours += 1.5
    } else {
      hours += 0.5
    }
  }
  return Math.round(hours * 2) / 2 // round to nearest 0.5
}
