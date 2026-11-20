import { createContext, useContext, type ReactNode } from "react"

/**
 * THE GO-DEEPER CARDS OF `/plan/new` VERSION 3 (Plans/plan-new-from-real.md, Phase 7).
 *
 * The real parts (the area sheet, the goal card, the north star) ask this context what to draw at the moment a card
 * matters: under an area's 10, under a goal's shape, under the north star paragraph. Outside `/plan/new` there is no
 * provider, the answer is nothing, and the parts draw exactly what they always drew.
 */
export interface DeeperPrompts {
  /** Under an area's 10, once it is written. */
  area: (areaId: string) => ReactNode
  /** Under a picked season area, on the season screen. */
  seasonArea: (areaId: string) => ReactNode
  /** Under a goal's shape. */
  goal: (goalId: string, areaId: string) => ReactNode
  /** Under the north star paragraph, once it is written. */
  star: () => ReactNode
}

export const DeeperPromptsContext = createContext<DeeperPrompts | null>(null)

export const useDeeperPrompts = (): DeeperPrompts | null => useContext(DeeperPromptsContext)
