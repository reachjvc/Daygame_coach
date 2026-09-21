import { describe, it, expect } from "vitest"
import { existsSync, readFileSync, readdirSync } from "fs"
import { join } from "path"

/**
 * EVERY PLAN IS CHECKED AGAINST THE OWNER'S CONCEPT, ITEM BY ITEM.
 *
 * The Life Mastery deployment plan went through 13 review agents and 59 verified
 * findings, was approved, and then changed on the owner's first question. The
 * reviews had checked the code and the engineering principles. Nobody had
 * checked the owner's idea of the product, because it existed nowhere in
 * writing. The owner ended up running that review by hand, one question at a
 * time, which is the failure `.claude/rules/finished-work.md` exists to stop.
 *
 * So: the concept lives in `docs/product/<slice>-concept.md`, in the owner's
 * words, as a numbered list. Every `docs/plans/<slice>-*.md` plan carries a
 * section "Your concept, item by item" with one table row per item and a
 * verdict. This test fails when a plan skips an item, invents one, or grades
 * one with a word that is not a verdict. It is a rule in markdown made to bite.
 */

const ROOT = process.cwd()
const PRODUCT = join(ROOT, "docs/product")
const PLANS = join(ROOT, "docs/plans")

/** The only words a verdict may be. "Behaviour" means the data design does not
 * answer it; the structure must only be able to hold the result. */
const VERDICTS = ["Yes", "Partly", "No", "Behaviour"] as const

/** Plans written before their slice had a concept file. May only shrink. */
const GRANDFATHERED = new Set([
  "life-mastery-simple.md",
  "life-mastery-canon.md",
  "life-mastery-off-the-bench.md",
])

const HEADING = "## Your concept, item by item"

function conceptFiles(): Array<{ slice: string; file: string }> {
  if (!existsSync(PRODUCT)) return []
  return readdirSync(PRODUCT)
    .filter((f) => f.endsWith("-concept.md"))
    .map((f) => ({ slice: f.replace(/-concept\.md$/, ""), file: join(PRODUCT, f) }))
}

function conceptItems(file: string): number[] {
  return readFileSync(file, "utf8")
    .split("\n")
    .map((line) => /^(\d+)\. \S/.exec(line))
    .filter((m): m is RegExpExecArray => m !== null)
    .map((m) => Number(m[1]))
}

function plansFor(slice: string): string[] {
  return readdirSync(PLANS).filter((f) => f.startsWith(`${slice}-`) && f.endsWith(".md"))
}

function verdictRows(text: string): Array<{ item: number; verdict: string }> {
  const rows: Array<{ item: number; verdict: string }> = []
  for (const line of text.split("\n")) {
    const m = /^\| (\d+) \| ([^|]+?) \|/.exec(line)
    if (m) rows.push({ item: Number(m[1]), verdict: m[2].trim() })
  }
  return rows
}

describe("owner concept files", () => {
  it("at least one concept file exists", () => {
    expect(conceptFiles().length).toBeGreaterThan(0)
  })

  for (const { slice, file } of conceptFiles()) {
    it(`${slice}: items are numbered 1..N with no gaps and no repeats`, () => {
      const items = conceptItems(file)
      expect(items.length).toBeGreaterThan(0)
      expect(items).toEqual(items.map((_, i) => i + 1))
    })
  }
})

describe("every plan checks the owner's concept, item by item", () => {
  it("grandfathered plans still exist, so the list only shrinks", () => {
    for (const name of GRANDFATHERED) {
      expect(existsSync(join(PLANS, name)), `${name} is gone: remove it from GRANDFATHERED`).toBe(true)
    }
  })

  for (const { slice, file } of conceptFiles()) {
    const items = conceptItems(file)
    for (const plan of plansFor(slice).filter((p) => !GRANDFATHERED.has(p))) {
      it(`${plan} grades all ${items.length} items of ${slice}`, () => {
        const text = readFileSync(join(PLANS, plan), "utf8")
        expect(text, `${plan} has no "${HEADING}" section`).toContain(HEADING)

        const rows = verdictRows(text.slice(text.indexOf(HEADING)))
        const graded = rows.map((r) => r.item)
        const missing = items.filter((n) => !graded.includes(n))
        const invented = graded.filter((n) => !items.includes(n))
        const repeated = graded.filter((n, i) => graded.indexOf(n) !== i)
        const badVerdict = rows.filter((r) => !(VERDICTS as readonly string[]).includes(r.verdict))

        expect(missing, `items with no verdict: ${missing.join(", ")}`).toEqual([])
        expect(invented, `rows for items the concept does not have: ${invented.join(", ")}`).toEqual([])
        expect(repeated, `items graded twice: ${repeated.join(", ")}`).toEqual([])
        expect(
          badVerdict.map((r) => `${r.item}: "${r.verdict}"`),
          `verdict must be one of ${VERDICTS.join(" / ")}`,
        ).toEqual([])
      })
    }
  }
})
