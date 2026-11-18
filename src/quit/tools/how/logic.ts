import type { QuitNumber } from "../../types"

export type HowGroup = "hope" | "who" | "how" | "helps" | "after" | "other"
export const HOW_ORDER: HowGroup[] = ["hope", "who", "how", "helps", "after", "other"]

export function groupOf(kind: string): HowGroup {
  if (kind.startsWith("hope-")) return "hope"
  if (kind.startsWith("who-")) return "who"
  if (kind.startsWith("how-") || kind.startsWith("quit-")) return "how"
  if (kind.startsWith("helps-")) return "helps"
  if (kind.startsWith("after-")) return "after"
  return "other"
}

/** True when `n` is the hope number again (same kind, figure and headline). */
export function isSameNumber(n: Pick<QuitNumber, "kind" | "big" | "headline">, hope: Pick<QuitNumber, "kind" | "big" | "headline"> | null): boolean {
  return hope !== null && n.kind === hope.kind && n.big === hope.big && n.headline === hope.headline
}

/**
 * The numbers under the hope number, in reading order: those of kind `hope-`
 * (the lifetime projection sits directly under the head count, RULEBOOK rule
 * 10), then who, how and quit, helps, after, anything else last. Data order
 * inside a group. A number equal to `hope` is left out so it shows once.
 */
export function groupNumbers(
  numbers: QuitNumber[],
  hope: Pick<QuitNumber, "kind" | "big" | "headline"> | null = null,
): { group: HowGroup; items: QuitNumber[] }[] {
  const rest = numbers.filter((n) => !isSameNumber(n, hope))
  return HOW_ORDER.map((group) => ({ group, items: rest.filter((n) => groupOf(n.kind) === group) })).filter((g) => g.items.length > 0)
}
