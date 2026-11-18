/** The worksheet's two number boxes take 1 to 10: keep the typed value when valid, else the previous one. */
export function parseScale(raw: string, prev: string): string {
  if (raw === "") return ""
  if (!/^\d{1,2}$/.test(raw)) return prev
  const n = Number(raw)
  return n >= 1 && n <= 10 ? String(n) : prev
}

export interface Helper {
  person: string
  help: string
}

export interface Plan {
  date: string
  changes: string
  importance: string
  confidence: string
  reasons: string
  steps: string
  helpers: Helper[]
  working: string
  interfere: string
  checkin: string
}

/** Every field starts empty, as on the printed worksheet. */
export const EMPTY_PLAN: Plan = {
  date: "",
  changes: "",
  importance: "",
  confidence: "",
  reasons: "",
  steps: "",
  helpers: [{ person: "", help: "" }],
  working: "",
  interfere: "",
  checkin: "",
}

export const hasContent = (p: Plan): boolean =>
  [p.date, p.changes, p.importance, p.confidence, p.reasons, p.steps, p.working, p.interfere, p.checkin].some((v) => v.trim() !== "") || p.helpers.some((h) => h.person.trim() !== "" || h.help.trim() !== "")
