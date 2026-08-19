/**
 * The anti-demo test.
 *
 * ## Why this exists
 *
 * A brief asked for a fully-fledged product built on a research corpus. The
 * corpus was gathered properly — fifteen sources, ~178,000 words, 2,186
 * verified quotes, roughly 200 catalogued techniques — and then **fourteen
 * quotes and zero techniques were wired into the product.** Every other test in
 * this repo passed. Typecheck passed. The e2e suite passed. Nothing objected,
 * because nothing was *wrong*; it was just a demo wearing a product's clothes.
 *
 * That is the failure this file exists to catch. Research that sits in
 * `docs/research/` and never reaches `src/` is not research, it is a reading
 * habit — and a token implementation is worse than none, because it looks like
 * the work is finished.
 *
 * ## What it enforces
 *
 * A **floor on coverage**, not a ceiling on ambition:
 *
 *   1. If the corpus holds N usable quotes, a meaningful share must ship.
 *   2. Techniques catalogued in the corpus must exist as product data, not
 *      only as prose in a markdown file.
 *   3. Every stage a user can be in must have real content, so no one hits an
 *      empty screen at the moment the content was gathered for.
 *   4. Coverage must be broad across sources — shipping 300 quotes all from one
 *      subreddit is the same failure in a different costume.
 *
 * ## When this test fails
 *
 * The fix is to ship more of the corpus, not to lower the number. If a floor
 * genuinely needs to move — a source turned out unusable, a licence forbids it
 * — change it in the same commit that explains why, in the comment beside it.
 */

import { describe, it, expect } from "vitest"
import fs from "node:fs"
import path from "node:path"
import { TESTIMONIALS } from "@/src/vice/data/testimonials"

const CORPUS_DIR = path.join(process.cwd(), "docs/research/recovery-testimonials")

function corpusFiles(): string[] {
  if (!fs.existsSync(CORPUS_DIR)) return []
  return fs
    .readdirSync(CORPUS_DIR)
    .filter((f) => /^\d\d-.*\.md$/.test(f))
    .map((f) => path.join(CORPUS_DIR, f))
}

/** Blockquote lines that look like somebody talking, not like our own analysis. */
function countUsableQuotes(text: string): number {
  const lines = text.split("\n")
  let count = 0
  for (const line of lines) {
    const m = line.match(/^\s*(?:\*\*[^*]{1,24}\*\*\s*|\d{1,3}\.\s*)?>\s?(.+)$/)
    if (!m) continue
    const body = m[1].trim()
    if (body.length < 55) continue
    if (!/\b(I|I'm|I've|my|me|myself)\b/.test(body)) continue
    if (/^[⚠→]|participants?\b|\b\d{1,3}(\.\d)?%|\bp\s*[<=]/i.test(body)) continue
    count += 1
  }
  return count
}

describe("the research corpus actually reaches the product", () => {
  const files = corpusFiles()

  it("has a corpus to draw on at all", () => {
    expect(files.length, "no corpus files found — has the research been deleted?").toBeGreaterThanOrEqual(10)
  })

  it("ships a meaningful share of the usable quotes, not a sample", () => {
    const available = files.reduce((n, f) => n + countUsableQuotes(fs.readFileSync(f, "utf8")), 0)
    const shipped = TESTIMONIALS.length

    // The number that matters. 14 shipped against ~700 usable is what this
    // test was written after. A quarter is a defensible floor: some quotes are
    // unlicensed, off-topic, duplicated, or too long to quote.
    const ratio = shipped / Math.max(available, 1)
    expect(
      ratio,
      `Only ${shipped} of ~${available} usable corpus quotes reach the product (${(ratio * 100).toFixed(1)}%). ` +
        `Research that stays in docs/ is not shipped. Extract more, do not lower this number.`,
    ).toBeGreaterThan(0.25)
  })

  it("draws on most of the sources, not one convenient one", () => {
    // 300 quotes all from r/stopdrinking is the same failure wearing a
    // different hat: it looks like volume and is actually one perspective.
    const sources = new Set(TESTIMONIALS.map((t) => t.source))
    expect(
      sources.size,
      `Only ${sources.size} distinct sources in the product. The corpus has ${files.length} files.`,
    ).toBeGreaterThanOrEqual(8)

    const bySource = new Map<string, number>()
    for (const t of TESTIMONIALS) bySource.set(t.source, (bySource.get(t.source) ?? 0) + 1)
    const biggest = Math.max(...bySource.values())
    expect(
      biggest / TESTIMONIALS.length,
      "One source dominates the set; that is a single perspective, not a corpus.",
    ).toBeLessThan(0.6)
  })

  it("has content for every moment a user can be in", () => {
    // An empty stage means somebody reaches the exact screen this was gathered
    // for and finds nothing there.
    const stages = ["deciding", "early", "urge", "lapse", "goodStretch", "long"] as const
    for (const stage of stages) {
      const n = TESTIMONIALS.filter((t) => t.stages.includes(stage)).length
      expect(n, `stage "${stage}" has ${n} accounts`).toBeGreaterThanOrEqual(5)
    }
  })

  it("covers the good stretch properly, since that is the finding the corpus is loudest about", () => {
    // Eight independent sources say the hazard is feeling fine rather than
    // craving. If that is right, this cannot be the thinnest stage.
    const good = TESTIMONIALS.filter((t) => t.stages.includes("goodStretch")).length
    expect(good).toBeGreaterThanOrEqual(15)
  })
})

/**
 * Techniques are the other half of the brief and were the half most completely
 * missed: catalogued in fifteen files, implemented in none.
 *
 * This suite is deliberately written to fail until `data/techniques.ts` exists.
 * It is a to-do with teeth rather than a line in a plan document, because a
 * line in a plan document is exactly what did not work last time.
 */
describe("the techniques people credit exist as product data", () => {
  const techniquesPath = path.join(process.cwd(), "src/vice/data/techniques.ts")

  it("has a techniques module at all", () => {
    expect(
      fs.existsSync(techniquesPath),
      "src/vice/data/techniques.ts is missing. ~200 techniques were catalogued across the corpus " +
        "and the brief asked for them explicitly. Prose in docs/ does not count as shipped.",
    ).toBe(true)
  })

  it("carries a substantial number of them, each traceable to a source", () => {
    if (!fs.existsSync(techniquesPath)) return // the test above is the failure
    const src = fs.readFileSync(techniquesPath, "utf8")
    const entries = (src.match(/^\s*\{\s*id:/gm) ?? []).length
    expect(entries, `only ${entries} techniques implemented`).toBeGreaterThanOrEqual(40)

    // Every technique needs provenance for the same reason every quote does.
    const withSource = (src.match(/sources?:/g) ?? []).length
    expect(withSource, "techniques must cite where they came from").toBeGreaterThanOrEqual(40)
  })

  it("keeps the reported backfires, because a list with no failures is an advert", () => {
    if (!fs.existsSync(techniquesPath)) return
    const src = fs.readFileSync(techniquesPath, "utf8")
    const backfires = (src.match(/kind: "backfire"/g) ?? []).length
    expect(backfires, "no backfire entries survived — the set has been sanitised").toBeGreaterThanOrEqual(8)
  })
})

/**
 * The last mile, and the one the earlier failure actually died on.
 *
 * Data sitting in `src/` that no component imports is the same failure as prose
 * sitting in `docs/` — it passes a file-exists check and reaches nobody. These
 * assert that a user can actually get to the material.
 */
describe("a user can actually reach the research", () => {
  const componentDir = path.join(process.cwd(), "src/vice/components")

  function allComponentSource(): string {
    const walk = (dir: string): string[] =>
      fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
        const p = path.join(dir, e.name)
        return e.isDirectory() ? walk(p) : p.endsWith(".tsx") ? [p] : []
      })
    return walk(componentDir).map((f) => fs.readFileSync(f, "utf8")).join("\n")
  }

  it("renders the testimonials somewhere", () => {
    const src = allComponentSource()
    expect(src, "no component imports the testimonials").toMatch(/from "\.\.?\/(data\/)?testimonials"/)
  })

  it("renders the techniques somewhere", () => {
    const src = allComponentSource()
    expect(
      src,
      "techniques.ts exists but no component imports it — that is a data file, not a feature",
    ).toMatch(/from "\.\.?\/(data\/)?techniques"/)
  })

  it("puts something in front of a first-time user mid-urge, with nothing set up", () => {
    // The concrete regression: a brand-new visitor used to get a bare
    // ninety-second countdown, because every other surface needed them to have
    // written something first.
    const tools = fs.readFileSync(path.join(componentDir, "Tools.tsx"), "utf8")
    expect(tools, "the urge tool has no zero-setup content in it").toMatch(/OneVoice/)
  })
})
