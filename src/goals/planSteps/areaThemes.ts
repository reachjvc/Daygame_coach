/** The words files key their example lines by theme (`dating`, `body`…); an area is matched to a theme by its own name, so a renamed or added area simply gets none. */
const THEMES: [string, RegExp][] = [
  ["dating", /relationship|dating|love|romance/i],
  ["body", /health|fitness|body|training/i],
  ["money_work", /money|mission|work|career|business|wealth|financ/i],
  ["friends", /friend|social|communit/i],
  ["mind", /mind|emotion|belief|mental/i],
  ["family", /family/i],
  ["fun_travel", /\bfun\b|travel|hobb|advent/i],
  ["skills", /skill|learn/i],
  ["home", /\bhome\b|environment|house/i],
  ["habits", /habit|vice|addict/i],
  ["style", /style|appearance|look/i],
]

export function themeOf(area: { label: string }): string | null {
  return THEMES.find(([, re]) => re.test(area.label))?.[0] ?? null
}

export function ideasFor(area: { label: string }, ideas: Record<string, readonly string[]>): string[] {
  const t = themeOf(area)
  return t && ideas[t] ? [...ideas[t]] : []
}
