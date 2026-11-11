/**
 * The thirteen role model categories (Plans/role-models.md, "Categories").
 *
 * Each names the life plan areas it serves, so the plan can suggest people per
 * area. Colours are flat placeholder backgrounds until the look is decided (D6).
 */
export type RoleModelCategoryId =
  | "sages"
  | "philosophers"
  | "scientists"
  | "warriors"
  | "leaders"
  | "explorers"
  | "builders"
  | "money"
  | "athletes"
  | "artists"
  | "charisma"
  | "teachers"
  | "givers"

export interface RoleModelCategory {
  id: RoleModelCategoryId
  label: string
  description: string
  color: string
  areaIds: string[]
}

export const ROLE_MODEL_CATEGORIES: readonly RoleModelCategory[] = [
  { id: "sages", label: "Stoics & Sages", description: "Men who trained their own minds and wrote down how.", color: "#d4a65a", areaIds: ["lm_mindset", "lm_emotions", "lm_spirituality"] },
  { id: "philosophers", label: "Philosophers", description: "Thinkers who changed how people see a life.", color: "#6fcf97", areaIds: ["lm_mindset"] },
  { id: "scientists", label: "Scientists & Inventors", description: "Curiosity, patience and proof.", color: "#4fa3e0", areaIds: ["lm_mission"] },
  { id: "warriors", label: "Warriors", description: "Courage and discipline where it cost the most.", color: "#e05252", areaIds: ["lm_mindset", "lm_fitness"] },
  { id: "leaders", label: "Leaders", description: "People who carried others through hard times.", color: "#a57be8", areaIds: ["lm_mission", "lm_contribution"] },
  { id: "explorers", label: "Explorers & Adventurers", description: "Went where nobody had been, and came back.", color: "#3fc1b5", areaIds: ["lm_fun"] },
  { id: "builders", label: "Builders & Founders", description: "Turned an idea into something that lasts.", color: "#f08c3a", areaIds: ["lm_mission", "lm_money"] },
  { id: "money", label: "Money Minds", description: "How to earn, keep and think about money.", color: "#9ccc3f", areaIds: ["lm_money"] },
  { id: "athletes", label: "Athletes & Fighters", description: "Bodies and wills trained to the limit.", color: "#f0603a", areaIds: ["lm_fitness", "lm_health"] },
  { id: "artists", label: "Artists & Writers", description: "Made something true and kept making it.", color: "#e05aa8", areaIds: ["lm_fun", "lm_mission"] },
  { id: "charisma", label: "Charisma & Romance", description: "Charm, nerve and the art of connection.", color: "#f0507a", areaIds: ["lm_relationship", "lm_friends"] },
  { id: "teachers", label: "Teachers & Coaches", description: "People whose methods you can copy today.", color: "#6f8ff0", areaIds: ["lm_mindset"] },
  { id: "givers", label: "Givers & Family Men", description: "Lives spent on other people.", color: "#3fbf7f", areaIds: ["lm_contribution", "lm_family", "lm_relationship"] },
]

export const ROLE_MODEL_CATEGORY_MAP = new Map(ROLE_MODEL_CATEGORIES.map((c) => [c.id, c]))
