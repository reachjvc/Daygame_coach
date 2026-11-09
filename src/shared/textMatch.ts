/**
 * MATCHING TYPED WORDING AGAINST WORDING THE PERSON USED BEFORE.
 *
 * Pure: no clock, no network. Moved out of the Thoughts service
 * (Plans/energy-audit.md, Phase 1) so the audit's suggestions use the same,
 * already tested, rules.
 */

/**
 * ONE WORDING, ONE KEY.
 *
 * "I am bad", "i am bad." and "  I   am BAD!! " fold to the same key: lower
 * case, curly quotes made straight, whitespace collapsed, and punctuation at
 * either end dropped. Punctuation inside is kept: "I'm" and "Im" are close,
 * not equal, and the matching below handles close.
 */
export function normalizePhrase(text: string): string {
  return text
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[‘’‛]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^[\s.,!?;:…"'()\-–—]+/u, "")
    .replace(/[\s.,!?;:…"'()\-–—]+$/u, "")
}

/** Folded further, for "close" rather than "equal": apostrophes and inner punctuation gone. */
function looseKey(text: string): string {
  return normalizePhrase(text).replace(/['".,!?;:…()\-–—]/g, "").replace(/\s+/g, " ").trim()
}

/** Edit distance, capped: anything beyond `cap` is reported as `cap + 1`. */
export function editDistanceAtMost(a: string, b: string, cap: number): number {
  if (Math.abs(a.length - b.length) > cap) return cap + 1
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i)
  for (let i = 1; i <= a.length; i++) {
    const row = [i]
    let best = i
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1
      row[j] = Math.min(prev[j] + 1, row[j - 1] + 1, prev[j - 1] + cost)
      if (row[j] < best) best = row[j]
    }
    if (best > cap) return cap + 1
    prev = row
  }
  return prev[b.length]
}

/**
 * THE ITEMS THAT MATCH WHAT IS BEING TYPED, best first. Three kinds of match,
 * in this order:
 *   1. the same wording once folded;
 *   2. every typed word starts a word of the item, in order ("i am b");
 *   3. a small spelling distance from the whole wording ("im bad").
 * Within a kind, the higher `countOf` first (compared number by number, so
 * `[thisWeek, allTime]` ranks this week first).
 */
export function matchPhrases<T>(
  query: string,
  items: readonly T[],
  textOf: (item: T) => string,
  countOf: (item: T) => readonly number[],
  limit = 4,
): T[] {
  const q = looseKey(query)
  if (q.length === 0) return []
  const qWords = q.split(" ")

  const scored: { item: T; kind: number }[] = []
  for (const item of items) {
    const key = looseKey(textOf(item))
    if (key === q) {
      scored.push({ item, kind: 0 })
      continue
    }
    const words = key.split(" ")
    let at = 0
    let prefixes = true
    for (const w of qWords) {
      while (at < words.length && !words[at].startsWith(w)) at++
      if (at === words.length) {
        prefixes = false
        break
      }
      at++
    }
    if (prefixes) {
      scored.push({ item, kind: 1 })
      continue
    }
    const cap = q.length < 5 ? 1 : q.length < 12 ? 2 : 3
    const squashedQ = q.replace(/ /g, "")
    const squashedKey = key.replace(/ /g, "")
    if (editDistanceAtMost(squashedQ, squashedKey, cap) <= cap) scored.push({ item, kind: 2 })
  }

  const compare = (a: readonly number[], b: readonly number[]): number => {
    for (let i = 0; i < Math.max(a.length, b.length); i++) {
      const d = (b[i] ?? 0) - (a[i] ?? 0)
      if (d !== 0) return d
    }
    return 0
  }
  return scored
    .sort((a, b) => a.kind - b.kind || compare(countOf(a.item), countOf(b.item)))
    .slice(0, limit)
    .map((s) => s.item)
}
