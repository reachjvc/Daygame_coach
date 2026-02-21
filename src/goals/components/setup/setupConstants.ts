export type FlowStep = "onboarding" | "direction" | "goals" | "summary" | "orrery"
export const STEPS: FlowStep[] = ["onboarding", "direction", "goals", "summary", "orrery"]
export const STEP_LABELS = ["Start", "Direction", "Goals", "Summary", "Your System"]

export const CATEGORY_COLORS: Record<string, string> = {
  field_work: "#06b6d4",
  results: "#8b5cf6",
  dirty_dog: "#f97316",
  texting: "#10b981",
  dates: "#ec4899",
  relationship: "#f59e0b",
  mindfulness: "#a78bfa",
  resilience: "#ef4444",
  learning: "#3b82f6",
  reflection: "#14b8a6",
  discipline: "#f97316",
  social_activity: "#06b6d4",
  friendships: "#8b5cf6",
  hosting: "#ec4899",
  social_skills: "#10b981",
  network_expansion: "#3b82f6",
  mentorship: "#f59e0b",
  strength: "#ef4444",
  training: "#f97316",
  nutrition: "#10b981",
  body_comp: "#8b5cf6",
  flexibility: "#06b6d4",
  endurance: "#3b82f6",
  income: "#f59e0b",
  saving: "#10b981",
  investing: "#8b5cf6",
  career_growth: "#3b82f6",
  entrepreneurship: "#f97316",
  porn_freedom: "#ef4444",
  digital_discipline: "#06b6d4",
  substance_control: "#f97316",
  self_control: "#a78bfa",
  hobbies_skills: "#ec4899",
  cooking_domestic: "#f59e0b",
  adventure_travel: "#06b6d4",
  style_grooming: "#8b5cf6",
}

export const SETUP_TIER_ORDER: Record<string, number> = {
  bronze: 0,
  silver: 1,
  gold: 2,
  diamond: 3,
  none: 4,
}

let _customIdCounter = 0
export function nextCustomId(prefix: string) {
  return `${prefix}_${++_customIdCounter}_${Date.now()}`
}

export const ORBIT_CONFIG: Record<
  string,
  { radius: number; duration: number; startAngle: number; planetSize: number }
> = {
  daygame: { radius: 100, duration: 45, startAngle: 0, planetSize: 20 },
  health_fitness: { radius: 155, duration: 60, startAngle: 45, planetSize: 14 },
  career_business: { radius: 200, duration: 80, startAngle: 120, planetSize: 14 },
  social: { radius: 240, duration: 100, startAngle: 200, planetSize: 13 },
  personal_growth: { radius: 275, duration: 120, startAngle: 300, planetSize: 13 },
  lifestyle: { radius: 305, duration: 140, startAngle: 160, planetSize: 12 },
}

export const SUN_RADIUS = 38
export const CENTER = 370

export const AURORA_HALO_COLORS: Record<string, string[]> = {
  daygame: ["#00E676", "#00FF7F", "#69F0AE", "#00C853"],
  health_fitness: ["#FF4081", "#F50057", "#FF80AB", "#E91E63"],
  career_business: ["#7C4DFF", "#536DFE", "#B388FF", "#651FFF"],
  social: ["#00E5FF", "#00B8D4", "#84FFFF", "#18FFFF"],
  personal_growth: ["#FFAB40", "#FF6D00", "#FFD180", "#FF9100"],
  lifestyle: ["#69F0AE", "#00C853", "#B9F6CA", "#00E676"],
}
