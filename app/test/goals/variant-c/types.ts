/**
 * Types for the Variant C mind-map whiteboard goal flow.
 */

export interface MindMapNode {
  id: string
  templateId: string
  title: string
  level: number
  nature: "input" | "outcome"
  numbering: string // e.g. "1", "1.1", "1.1.2"
  targetDate?: string
  targetValue?: number
  templateType?: "milestone_ladder" | "habit_ramp" | null
  children: MindMapNode[]
  isExpanded: boolean
  isSelected: boolean
  displayCategory?: string | null
  hoursPerWeek?: number
}

export interface TimeBudget {
  areaId: string
  areaName: string
  hoursPerWeek: number
  color: string
}

export type FlowPhase = "canvas" | "customize" | "confirm"
