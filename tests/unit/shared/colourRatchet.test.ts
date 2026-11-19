// @vitest-environment node
/**
 * R1. EVERY COLOUR COMES FROM THE THEME FILE (docs/product/look.md).
 *
 * A Tailwind palette class (`text-orange-400`, `bg-violet-500/10`) or a raw
 * `#rrggbb` in a page is a colour no part of the site can recolour: Life's gold,
 * Quit's violet and Dating's orange arrive through `--primary`
 * (`[data-facet]` in app/globals.css), and a hard-coded colour ignores it.
 *
 * Built like the lint ratchet: the baseline holds the counts that already
 * existed on 2026-11-19 (Plans/rebrand-10kdaysclub.md, Phase 3). A file's count
 * may only fall, and a file the baseline does not know starts at 0. It forbids
 * new ones; it does not demand a rewrite.
 *
 * After you remove some, lower the baseline: `UPDATE_COLOUR_BASELINE=1 npx vitest
 * run tests/unit/shared/colourRatchet.test.ts`. Updating refuses to raise a count.
 */
import { readFileSync, readdirSync, writeFileSync, existsSync } from "node:fs"
import { join, relative, resolve } from "node:path"
import { describe, expect, it } from "vitest"

const ROOT = resolve(__dirname, "../../..")
const BASELINE = join(__dirname, "colour-baseline.json")

const PALETTE =
  /\b(?:text|bg|border|ring|fill|stroke|from|via|to)-(?:red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose|zinc|slate|gray|neutral|stone)-\d{2,3}\b/g
const HEX = /#[0-9a-fA-F]{6}\b/g

/** Live pages only: not the test bench, not the labs. */
function liveFiles(): string[] {
  const out: string[] = []
  const walk = (dir: string) => {
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      const p = join(dir, e.name)
      const rel = relative(ROOT, p)
      if (e.isDirectory()) {
        if (e.name === "node_modules" || e.name === "lab" || rel === join("app", "test")) continue
        walk(p)
      } else if (e.name.endsWith(".tsx")) out.push(rel.split("\\").join("/"))
    }
  }
  for (const top of ["app", "src", "components"]) walk(join(ROOT, top))
  return out.sort()
}

export function countColours(text: string): number {
  return (text.match(PALETTE)?.length ?? 0) + (text.match(HEX)?.length ?? 0)
}

function countsNow(): Record<string, number> {
  const counts: Record<string, number> = {}
  for (const f of liveFiles()) {
    const n = countColours(readFileSync(join(ROOT, f), "utf8"))
    if (n > 0) counts[f] = n
  }
  return counts
}

describe("R1: hard-coded colours may only fall", () => {
  it("counts what it should", () => {
    expect(countColours(`className="text-orange-400 bg-violet-500/10 bg-primary" style={{ color: "#ff6b35" }}`)).toBe(3)
    expect(countColours(`className="text-primary border-border"`)).toBe(0)
  })

  it("no live file has more than its baseline", () => {
    const now = countsNow()
    const base: Record<string, number> = existsSync(BASELINE) ? JSON.parse(readFileSync(BASELINE, "utf8")) : {}
    const over = Object.entries(now)
      .filter(([f, n]) => n > (base[f] ?? 0))
      .map(([f, n]) => `${f}: ${n} (baseline ${base[f] ?? 0})`)
    if (process.env.UPDATE_COLOUR_BASELINE && over.length === 0) {
      writeFileSync(BASELINE, JSON.stringify(now, null, 2) + "\n")
    }
    expect(
      over,
      "New hard-coded colours. Use a theme token (bg-primary, text-muted-foreground, …) instead: docs/product/look.md, R1.",
    ).toEqual([])
  })
})
