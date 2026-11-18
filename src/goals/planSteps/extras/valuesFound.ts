/** Values that show up in what a person already wrote (Values screen "found"). Pure. */

import { NS_VALUE_LIBRARY } from "@/src/goals/data/northStar"
import { ONE_ANSWERS } from "@/src/goals/data/northStarStart"
import type { NsPlan } from "@/src/goals/types"
import { lineupIds, lineupTaken } from "../planFacts"

export type FoundSource =
  | { kind: "north_star" }
  | { kind: "north_star_why" }
  | { kind: "goal_why"; goal: string }
  | { kind: "season" }
  | { kind: "identity" }
  | { kind: "person"; name: string }
  | { kind: "old" }

export interface FoundValue {
  value: string
  sources: FoundSource[]
}

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")

/** Whole-word, case-insensitive: "freedom" in "my freedom" yes, "love" in "glove" no. */
export function mentions(text: string, word: string): boolean {
  if (!text.trim()) return false
  return new RegExp(`(^|[^\\p{L}])${escape(word)}($|[^\\p{L}])`, "iu").test(text)
}

export function findValues(plan: NsPlan, nameOf: (personId: string) => string | null = () => null): FoundValue[] {
  const chosen = new Set(plan.values.map((v) => v.trim().toLowerCase()))
  const found = new Map<string, FoundValue>()
  const add = (value: string, source: FoundSource) => {
    const key = value.trim().toLowerCase()
    if (!key || chosen.has(key)) return
    const cur = found.get(key) ?? { value: value.trim(), sources: [] }
    if (!cur.sources.some((s) => JSON.stringify(s) === JSON.stringify(source))) cur.sources.push(source)
    found.set(key, cur)
  }
  const texts: [string, FoundSource][] = [
    [plan.northStar, { kind: "north_star" }],
    [plan.answers["star_why"] ?? "", { kind: "north_star_why" }],
    [plan.season?.sentence ?? "", { kind: "season" }],
    [plan.answers[ONE_ANSWERS.why] ?? "", { kind: "season" }],
    [plan.answers["identity_total"] ?? "", { kind: "identity" }],
    ...plan.goals.filter((g) => g.status === "active").map((g): [string, FoundSource] => [`${g.why} ${g.reasonsList.join(" ")}`, { kind: "goal_why", goal: g.title }]),
  ]
  for (const word of NS_VALUE_LIBRARY) for (const [text, source] of texts) if (mentions(text, word)) add(word, source)
  for (const id of lineupIds(plan)) {
    const name = nameOf(id)
    if (name) for (const v of lineupTaken(plan, id)) add(v, { kind: "person", name })
  }
  for (const v of plan.currentValues) add(v, { kind: "old" })
  return [...found.values()]
}
