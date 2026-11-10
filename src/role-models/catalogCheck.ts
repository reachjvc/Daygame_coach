import { personSchema } from "./schema"

/**
 * The machine checks every person file must pass (Plans/role-models.md, Phase 1).
 *
 * Each rule has its own id, so a test can feed a file that breaks exactly one
 * rule and see exactly that rule fail. A check that passes by finding nothing to
 * check would be worthless; the fixtures in tests/fixtures/role-models prove each
 * rule can fail.
 */
export type CatalogRule =
  | "schema"
  | "value-count"
  | "evidence-kinds"
  | "evidence-sources"
  | "primary-source"
  | "secondary-sources"
  | "source-exists"
  | "quote-locator"
  | "shadow"
  | "started-from"
  | "status"
  | "validated-review"
  | "likeness-licence"
  | "duplicate-value"
  | "council-question"

export interface CatalogFailure {
  rule: CatalogRule
  message: string
}

type Loose = Record<string, unknown>
const arr = (v: unknown): Loose[] => (Array.isArray(v) ? (v as Loose[]) : [])
const str = (v: unknown): string => (typeof v === "string" ? v.trim() : "")

export function checkPerson(raw: unknown): CatalogFailure[] {
  const out: CatalogFailure[] = []
  const fail = (rule: CatalogRule, message: string) => out.push({ rule, message })
  const p = (raw ?? {}) as Loose

  const parsed = personSchema.safeParse(raw)
  if (!parsed.success) {
    for (const issue of parsed.error.issues) fail("schema", `${issue.path.join(".")}: ${issue.message}`)
  }

  const sources = arr(p.sources)
  const sourceIds = new Set(sources.map((s) => str(s.id)))
  const kindOf = new Map(sources.map((s) => [str(s.id), str(s.kind)]))

  const values = arr(p.values)
  if (values.length < 3 || values.length > 5) fail("value-count", `${values.length} values; 3 to 5 needed`)
  const seen = new Set<string>()
  for (const v of values) {
    const word = str(v.word)
    if (seen.has(word.toLowerCase())) fail("duplicate-value", `"${word}" twice`)
    seen.add(word.toLowerCase())
    const ev = arr(v.evidence)
    const kinds = new Set(ev.map((e) => str(e.kind)))
    const ids = new Set(ev.map((e) => str(e.sourceId)))
    if (kinds.size < 2) fail("evidence-kinds", `"${word}": evidence of ${kinds.size} kind; two of deed/words/witness needed`)
    if (ids.size < 2) fail("evidence-sources", `"${word}": evidence from ${ids.size} source; two different sources needed`)
  }

  if (![...kindOf.values()].includes("primary")) fail("primary-source", "no primary source")
  if ([...kindOf.values()].filter((k) => k === "secondary").length < 2) fail("secondary-sources", "fewer than two secondary sources")

  const referenced: Array<[string, unknown]> = []
  for (const v of values) for (const e of arr(v.evidence)) referenced.push([`value "${str(v.word)}"`, e.sourceId])
  for (const x of arr(p.principles)) referenced.push(["principle", x.sourceId])
  for (const x of arr(p.quotes)) referenced.push(["quote", x.sourceId])
  const dm = (p.definingMoment ?? {}) as Loose
  const sh = (p.shadow ?? {}) as Loose
  for (const id of Array.isArray(dm.sourceIds) ? dm.sourceIds : []) referenced.push(["definingMoment", id])
  for (const id of Array.isArray(sh.sourceIds) ? sh.sourceIds : []) referenced.push(["shadow", id])
  for (const [where, id] of referenced) {
    if (!sourceIds.has(str(id))) fail("source-exists", `${where} cites "${str(id)}", which is not in sources`)
  }

  for (const q of arr(p.quotes)) if (!str(q.locator)) fail("quote-locator", `quote "${str(q.text).slice(0, 40)}" has no locator`)

  if (!str(sh.text)) fail("shadow", "shadow is empty")
  if (!str(p.startedFrom)) fail("started-from", "startedFrom is empty")

  const review = (p.review ?? {}) as Loose
  const status = str(review.status)
  if (!status) fail("status", "review.status is not set")
  if (status === "validated") {
    if (typeof review.blindAgreement !== "number") fail("validated-review", "validated without a recorded blind agreement")
    if (!str(review.devilsAdvocate)) fail("validated-review", "validated without the devil's advocate's result")
  }

  for (const l of arr(p.likenessSources)) if (!str(l.licence)) fail("likeness-licence", `likeness "${str(l.title)}" names no licence`)

  const cq = (p.councilQuestion ?? {}) as Loose
  const pi = cq.principleIndex
  if (typeof pi === "number" && (pi < 0 || pi >= arr(p.principles).length)) {
    fail("council-question", `councilQuestion points at principle ${pi}, which does not exist`)
  }

  return out
}
