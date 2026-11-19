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

/** The headline without a leading repeat of the big figure (A15): "About 19 in 100 Americans…" → "Americans…". */
export function headlineAfterBig(headline: string, big: string): string {
  const b = big.trim()
  if (!b || !headline.toLowerCase().startsWith(b.toLowerCase())) return headline
  const rest = headline.slice(b.length).replace(/^[\s,:;–-]+/, "")
  return rest.length > 0 ? rest : headline
}

/** Sections of the page, in reading order. `hope-` numbers other than the hero sit under "who". */
export type HowSection = "who" | "how" | "helps" | "after" | "other"
export const SECTION_ORDER: HowSection[] = ["who", "how", "helps", "after", "other"]

/** Where each "True or not?" fact sits (once each, review E16). Unknown ids go to "other". */
export const FACT_SECTION: Record<string, HowSection> = { f1: "helps", f2: "after", f3: "how" }

/** Outside-help rows that are real services. Tips (combo-nrt, exercise, tell-one) and the unsourced forum stay out (E16, C6). */
export const OUTSIDE_IDS = ["quitline-us", "smokefree-gov", "quitline-uk", "nhs-services"] as const

export type HowItem<F> = { type: "number"; n: QuitNumber } | { type: "fact"; f: F }

/** Numbers (hero left out) and facts per section; empty sections dropped. */
export function buildSections<F extends { id: string }>(
  numbers: QuitNumber[],
  hope: Pick<QuitNumber, "kind" | "big" | "headline"> | null,
  facts: F[],
): { section: HowSection; items: HowItem<F>[] }[] {
  const groups = groupNumbers(numbers, hope)
  return SECTION_ORDER.map((section) => {
    const nums = groups
      .filter((g) => (g.group === "hope" ? "who" : g.group) === section)
      .flatMap((g) => g.items)
      .map((n): HowItem<F> => ({ type: "number", n }))
    const fs = facts.filter((f) => (FACT_SECTION[f.id] ?? "other") === section).map((f): HowItem<F> => ({ type: "fact", f }))
    return { section, items: [...nums, ...fs] }
  }).filter((s) => s.items.length > 0)
}

/** Outside help, services only, grouped by country in the order of `OUTSIDE_IDS`. */
export function outsideHelp<B extends { id: string }>(besides: B[]): B[] {
  return OUTSIDE_IDS.map((id) => besides.find((b) => b.id === id)).filter((b): b is B => !!b)
}
