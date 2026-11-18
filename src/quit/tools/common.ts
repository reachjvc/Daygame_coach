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

/** RULEBOOK rule 2: severities whose source counted people checked as hooked. */
const HOOKED_SEVERITIES: readonly Severity[] = ["dependent", "disorder"]

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
