/**
 * Each case breaks exactly one rule of the catalogue check, starting from
 * good.json. The test expects that rule, and only that rule, to fail.
 */
import type { CatalogRule } from "@/src/role-models/catalogCheck"

type P = Record<string, any> // eslint-disable-line @typescript-eslint/no-explicit-any

export const BAD_CASES: Array<{ name: string; rules: CatalogRule[]; mutate: (p: P) => void }> = [
  { name: "a value word not on the life plan list", rules: ["schema"], mutate: (p) => { p.values[0].word = "Calmness" } },
  { name: "only two values", rules: ["schema", "value-count"], mutate: (p) => { p.values.pop() } },
  { name: "six values", rules: ["schema", "value-count"], mutate: (p) => {
    for (const w of ["Wisdom", "Humility", "Patience"]) p.values.push({ ...structuredClone(p.values[0]), word: w })
  } },
  { name: "evidence of one kind only", rules: ["evidence-kinds"], mutate: (p) => { p.values[0].evidence[1].kind = "deed" } },
  { name: "evidence from one source only", rules: ["evidence-sources"], mutate: (p) => { p.values[0].evidence[1].sourceId = "s2" } },
  { name: "no primary source", rules: ["primary-source"], mutate: (p) => {
    p.sources[0].kind = "secondary"
  } },
  { name: "one secondary source", rules: ["secondary-sources"], mutate: (p) => { p.sources[2].kind = "primary" } },
  { name: "a source id that does not exist", rules: ["source-exists"], mutate: (p) => { p.shadow.sourceIds = ["s9"] } },
  { name: "a quote without a locator", rules: ["schema", "quote-locator"], mutate: (p) => { p.quotes[0].locator = "" } },
  { name: "an empty shadow", rules: ["schema", "shadow"], mutate: (p) => { p.shadow.text = " " } },
  { name: "an empty startedFrom", rules: ["schema", "started-from"], mutate: (p) => { p.startedFrom = "" } },
  { name: "no status", rules: ["schema", "status"], mutate: (p) => { delete p.review.status } },
  { name: "validated without a blind agreement", rules: ["validated-review"], mutate: (p) => { p.review.blindAgreement = null } },
  { name: "validated without a devil's advocate", rules: ["validated-review"], mutate: (p) => { p.review.devilsAdvocate = "" } },
  { name: "a likeness without a licence", rules: ["schema", "likeness-licence"], mutate: (p) => { p.likenessSources[0].licence = "" } },
  { name: "the same value twice", rules: ["duplicate-value"], mutate: (p) => { p.values[2].word = "discipline" } },
  { name: "a council question pointing past the principles", rules: ["council-question"], mutate: (p) => { p.councilQuestion.principleIndex = 7 } },
  { name: "a Wikipedia page as a source", rules: ["no-wikipedia"], mutate: (p) => { p.sources[2].url = "https://en.wikipedia.org/wiki/X" } },
  { name: "a Wikiquote page as a source", rules: ["no-wikipedia"], mutate: (p) => { p.sources[2].url = "https://en.m.wikiquote.org/wiki/X" } },
  { name: "a source link that is not https", rules: ["schema"], mutate: (p) => { p.sources[2].url = "javascript:alert(1)" } },
  { name: "a plain http source link", rules: ["schema"], mutate: (p) => { p.sources[2].url = "http://example.org/x" } },
  { name: "an unknown category", rules: ["schema"], mutate: (p) => { p.category = "wizards" } },
  { name: "an unknown area", rules: ["schema"], mutate: (p) => { p.areaIds = ["lm_cooking"] } },
]
