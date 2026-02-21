import { useMemo } from "react"
import { GOAL_TEMPLATES, getTemplatesByCategoryForArea } from "../data/goalGraph"
import { LIFE_AREAS } from "../data/lifeAreas"
import type { GoalTemplate, LifeAreaConfig } from "../types"

export interface SetupCatalogData {
  lifeAreas: LifeAreaConfig[]
  daygameByCategory: { category: string; goals: GoalTemplate[] }[]
  daygameL3Goals: GoalTemplate[]
}

export function useSetupCatalog(): SetupCatalogData {
  return useMemo(() => {
    const lifeAreas = LIFE_AREAS
    const categories = getTemplatesByCategoryForArea("daygame")
    const daygameL3Goals = GOAL_TEMPLATES.filter(
      (t) => t.lifeArea === "daygame" && t.level === 3
    )
    const daygameByCategory = Object.entries(categories)
      .filter(([, goals]) => goals && goals.length > 0)
      .map(([category, goals]) => ({ category, goals: goals! }))
    return { lifeAreas, daygameByCategory, daygameL3Goals }
  }, [])
}
