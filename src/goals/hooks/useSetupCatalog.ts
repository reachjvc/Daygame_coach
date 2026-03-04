import { useMemo } from "react"
import { GOAL_TEMPLATES, getTemplatesByCategoryForArea } from "../data/goalGraph"
import { LIFE_AREAS } from "../data/lifeAreas"
import type { GoalTemplate, LifeAreaConfig } from "../types"

export interface AreaTemplateCatalog {
  areaId: string
  areaName: string
  hex: string
  byCategory: { category: string; goals: GoalTemplate[] }[]
  allL3Goals: GoalTemplate[]
}

export interface SetupCatalogData {
  lifeAreas: LifeAreaConfig[]
  daygameByCategory: { category: string; goals: GoalTemplate[] }[]
  daygameL3Goals: GoalTemplate[]
  areaCatalogs: Record<string, AreaTemplateCatalog>
}

const TEMPLATE_AREA_IDS = ["health_fitness", "career_business", "personal_growth", "vices_elimination"]

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

    const areaCatalogs: Record<string, AreaTemplateCatalog> = {}
    for (const areaId of TEMPLATE_AREA_IDS) {
      const area = lifeAreas.find((a) => a.id === areaId)
      if (!area) continue
      const areaCategories = getTemplatesByCategoryForArea(areaId)
      const byCategory = Object.entries(areaCategories)
        .filter(([, goals]) => goals && goals.length > 0)
        .map(([category, goals]) => ({ category, goals: goals! }))
      if (byCategory.length === 0) continue
      const allL3Goals = GOAL_TEMPLATES.filter(
        (t) => t.lifeArea === areaId && t.level === 3
      )
      areaCatalogs[areaId] = {
        areaId,
        areaName: area.name,
        hex: area.hex,
        byCategory,
        allL3Goals,
      }
    }

    return { lifeAreas, daygameByCategory, daygameL3Goals, areaCatalogs }
  }, [])
}
