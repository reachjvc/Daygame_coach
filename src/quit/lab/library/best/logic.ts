import { usable, realRefs } from "../../../tools/common"
import type { Evidence, QuitAddiction, QuitBesides, QuitFact, QuitNeed, QuitRef, QuitSymptomCourse } from "../../../types"

export type SectionId = "helps" | "true" | "expect" | "outside"
export const SECTION_ORDER: SectionId[] = ["helps", "true", "expect", "outside"]

export interface LibItem {
  /** Unique across addictions: `<addiction>:<data id>`. */
  id: string
  section: SectionId
  title: string
  text: string
  /** Facts: the explanation shown with the answer. */
  explain?: string
  answer?: boolean
  evidence?: Evidence
  refs: QuitRef[]
  /** Swaps without refs and outside help without refs: shown as ideas, not as fact. */
  idea?: boolean
  need?: string
  peak?: string | null
  lasts?: string
  link?: string
}

const RANK: Record<Evidence, number> = { strong: 0, moderate: 1, weak: 2, none: 3 }

/** Stable sort: strong, moderate, weak, none; data order inside a rank. */
export function sortByEvidence<T extends { evidence?: Evidence }>(items: T[]): T[] {
  return items
    .map((x, i) => ({ x, i }))
    .sort((a, b) => RANK[a.x.evidence ?? "none"] - RANK[b.x.evidence ?? "none"] || a.i - b.i)
    .map((p) => p.x)
}

export function wordCount(s: string): number {
  return s.split(/\s+/).filter(Boolean).length
}

/** Everything a reader reads on one item. */
export function itemWords(i: LibItem): number {
  return wordCount([i.title, i.section === "true" ? "" : i.text, i.explain ?? "", i.peak ?? "", i.lasts ?? ""].join(" "))
}

/** Words / 200, rounded up, never below 1. */
export function readMinutes(i: LibItem): number {
  return Math.max(1, Math.ceil(itemWords(i) / 200))
}

/** An item shows as fact only with at least one real source. */
const sourced = (refs: QuitRef[]) => refs.length > 0

export interface Built {
  helps: LibItem[] | null
  true: LibItem[] | null
  expect: LibItem[] | null
  outside: LibItem[] | null
  expectNote: string | null
}

/** All items of one addiction; a section is `null` where the data file has nothing usable ("content coming"). */
export function buildItems(data: QuitAddiction): Built {
  const needs = usable<QuitNeed[]>(data.needs)
  const swaps: LibItem[] = (needs ?? []).flatMap((n) =>
    (n.swaps ?? []).map((s): LibItem => {
      const refs = realRefs(s.refs)
      return { id: `${data.id}:${s.id}`, section: "helps", title: n.name, text: s.text, evidence: s.evidence, refs, idea: !sourced(refs), need: n.name }
    }),
  )
  const facts = (usable<QuitFact[]>(data.facts) ?? [])
    .map((f): LibItem => ({ id: `${data.id}:${f.id}`, section: "true", title: f.statement, text: f.statement, explain: f.explain, answer: f.answer, refs: realRefs(f.refs) }))
    .filter((f) => sourced(f.refs))
  const words = usable<Record<string, string>>(data.symptomWords)
  const course = (usable<QuitSymptomCourse[]>(data.symptomCourse) ?? [])
    .map((c): LibItem => ({ id: `${data.id}:course-${c.symptom}`, section: "expect", title: words?.[c.symptom] ?? c.symptom, text: c.text, evidence: c.evidence, refs: realRefs(c.refs), peak: c.peak, lasts: c.lasts }))
    .filter((c) => sourced(c.refs))
  const outside = (usable<QuitBesides[]>(data.besides) ?? []).map((b): LibItem => {
    const refs = realRefs(b.refs)
    return { id: `${data.id}:${b.id}`, section: "outside", title: b.text, text: b.text, refs, idea: !sourced(refs), link: b.link }
  })
  const helps = [...sortByEvidence(swaps.filter((s) => !s.idea)), ...swaps.filter((s) => s.idea)]
  const note = usable<string>(data.symptomCourseNote)
  const orNull = (x: LibItem[]) => (x.length ? x : null)
  return { helps: orNull(helps), true: orNull(facts), expect: orNull(course), outside: orNull(outside), expectNote: note && course.length ? note : null }
}

export function allItems(b: Built): LibItem[] {
  return SECTION_ORDER.flatMap((s) => b[s] ?? [])
}

/** Every typed word must appear in the title or text (case-insensitive). Empty query matches nothing. */
export function searchItems(items: LibItem[], query: string): LibItem[] {
  const terms = query.toLowerCase().split(/\s+/).filter(Boolean)
  if (terms.length === 0) return []
  return items.filter((i) => {
    const hay = [i.title, i.text, i.explain ?? "", i.need ?? ""].join(" ").toLowerCase()
    return terms.every((t) => hay.includes(t))
  })
}

/** Toggles an id in a list of marks (saved, read). */
export function toggleMark(marks: string[], id: string): string[] {
  return marks.includes(id) ? marks.filter((x) => x !== id) : [...marks, id]
}

/** Marks from storage: only strings, no repeats. */
export function parseMarks(raw: unknown): string[] {
  return Array.isArray(raw) ? [...new Set(raw.filter((x): x is string => typeof x === "string"))] : []
}

/** Saved items that still exist, in the order they were saved. */
export function savedItems(items: LibItem[], saved: string[]): LibItem[] {
  return saved.map((id) => items.find((i) => i.id === id)).filter((i): i is LibItem => !!i)
}
