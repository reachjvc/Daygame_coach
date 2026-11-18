/**
 * The words files key their example lines by theme (`dating`, `body`...); an area is matched to its themes
 * by its own name (the owner's eight, and the old twelve while a copy still holds them). A renamed or
 * added area simply gets none.
 */
import { PLAN_AREAS } from "./copy/planAreas"

const THEMES: [string[], RegExp][] = [
  [["dating"], /dating|daygame|relationship|romance/i],
  [["body", "style"], /health|appearance|fitness|body|training/i],
  [["money_work"], /career|financ|money|mission|work|business|wealth/i],
  [["friends", "family"], /social|friend|family|communit/i],
  [["mind", "skills"], /growth|mind|emotion|belief|skill|learn|mental/i],
  [["fun_travel", "home"], /lifestyle|\bfun\b|travel|hobb|advent|\bhome\b|house/i],
  [["habits"], /vice|elimin|habit|addict/i],
]

export function themesOf(area: { label: string }): string[] {
  return THEMES.find(([, re]) => re.test(area.label))?.[0] ?? []
}

export function ideasFor(area: { label: string }, ideas: Record<string, readonly string[]>): string[] {
  return themesOf(area).flatMap((t) => (ideas[t] ? [...ideas[t]] : []))
}

/** The area's own North star line from the owner's pick, when the area is one of his eight. */
export function northStarIdeaFor(area: { label: string }): string | null {
  return PLAN_AREAS.find((a) => a.label.toLowerCase() === area.label.trim().toLowerCase())?.northStarIdea ?? null
}
