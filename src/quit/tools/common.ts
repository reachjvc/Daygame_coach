import { isTodo, type Draftable, type QuitNumber, type QuitRef, type Severity } from "../types"

/** A draft field that is still "TODO" is not usable. */
export function usable<T>(x: Draftable<T> | null | undefined): T | null {
  return x === undefined || x === null || isTodo(x) ? null : (x as T)
}

/** Refs that carry a real cite (draft refs may be "TODO"). */
export function realRefs(refs: Draftable<QuitRef>[] | undefined | null): QuitRef[] {
  return (refs ?? []).filter((r): r is QuitRef => !isTodo(r) && typeof r === "object" && r !== null)
}

/** Drops repeated refs (same cite and url), keeping first-seen order. */
export function uniqueRefs(refs: QuitRef[]): QuitRef[] {
  const seen = new Set<string>()
  const out: QuitRef[] = []
  for (const r of refs) {
    const key = `${r.cite}|${r.url}`
    if (seen.has(key)) continue
    seen.add(key)
    out.push(r)
  }
  return out
}

/** RULEBOOK rules 2 and 3: severities whose source counted people with a problem; the rest are not checked for addiction. */
const HOOKED_SEVERITIES: readonly Severity[] = ["dependent", "disorder", "treatment", "resolved"]

/** The one tag on a number card: `checked` decides, else the severity. */
export function checkedTag(n: Pick<QuitNumber, "checked" | "severity">): "hooked" | "not" {
  if (n.checked) return n.checked
  return HOOKED_SEVERITIES.includes(n.severity) ? "hooked" : "not"
}

/** Local date as YYYY-MM-DD. */
export function localDate(d: Date = new Date()): string {
  const m = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  return `${d.getFullYear()}-${m}-${day}`
}

/** Number of the first screen without an answer, clamped to the result screen. */
export function clampScreen(raw: string | null, firstUnanswered: number, total: number): number {
  const max = Math.min(Math.max(1, firstUnanswered), total + 1)
  if (raw === null || !/^\d{1,3}$/.test(raw)) return max
  const n = Number(raw)
  return n >= 1 && n <= max ? n : max
}

/* Readers of saved state. A tool trusts nothing from storage: each field is checked and falls back to empty. */

export function isObj(x: unknown): x is Record<string, unknown> {
  return typeof x === "object" && x !== null && !Array.isArray(x)
}

/** A whole number from `min` to `max`, else `fallback`. */
export function pickInt<F>(x: unknown, min: number, max: number, fallback: F): number | F {
  return typeof x === "number" && Number.isInteger(x) && x >= min && x <= max ? x : fallback
}

export function pickStr<F>(x: unknown, fallback: F): string | F {
  return typeof x === "string" ? x : fallback
}

export function pickBool<F>(x: unknown, fallback: F): boolean | F {
  return typeof x === "boolean" ? x : fallback
}

/** One of the listed words, else `fallback`. */
export function pickOne<T extends string, F>(x: unknown, allowed: readonly T[], fallback: F): T | F {
  return typeof x === "string" && (allowed as readonly string[]).includes(x) ? (x as T) : fallback
}

/** Only the strings of an array; anything else gives `fallback`. */
export function pickStrings<F>(x: unknown, fallback: F): string[] | F {
  return Array.isArray(x) ? x.filter((v): v is string => typeof v === "string") : fallback
}

/** Keeps the entries of an object whose value passes `keep`; anything else gives {}. */
export function pickRecord<V>(x: unknown, keep: (v: unknown) => v is V): Record<string, V> {
  const out: Record<string, V> = {}
  if (!isObj(x)) return out
  for (const [k, v] of Object.entries(x)) if (keep(v)) out[k] = v
  return out
}

export const isDay = (x: unknown): x is string => typeof x === "string" && /^\d{4}-\d{2}-\d{2}$/.test(x)

/** The band link that means "make your free plan": the quit date tool, a page a signed-out reader can open. */
export const isFreePlanLink = (link: string): boolean => link === "/quit/nicotine/date"
