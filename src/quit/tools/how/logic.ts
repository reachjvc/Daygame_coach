import type { QuitNumber } from "../../types"

export type HowGroup = "who" | "how" | "helps" | "after" | "other"
export const HOW_ORDER: HowGroup[] = ["who", "how", "helps", "after", "other"]

export function groupOf(kind: string): HowGroup {
  if (kind.startsWith("who-")) return "who"
  if (kind.startsWith("how-") || kind.startsWith("quit-")) return "how"
  if (kind.startsWith("helps-")) return "helps"
  if (kind.startsWith("after-")) return "after"
  return "other"
}

/** The numbers in reading order: who, how, helps, after, anything else last. Data order inside a group. */
export function groupNumbers(numbers: QuitNumber[]): { group: HowGroup; items: QuitNumber[] }[] {
  return HOW_ORDER.map((group) => ({ group, items: numbers.filter((n) => groupOf(n.kind) === group) })).filter((g) => g.items.length > 0)
}
