/**
 * THE SANS STACK MUST NOT FALL BACK TO A MONOSPACE FONT'S METRICS.
 *
 * The failure this prevents, exactly as reported: "the fonts changed on parts of
 * the website... it's like an overarching zoom in."
 *
 * `next/font` generates a metric-matched stand-in for each family so that text
 * does not jump when the real webfont arrives. Both are the same physical font —
 * `local(Arial)` — scaled to match:
 *
 *     Geist Fallback        src: local(Arial)   size-adjust: 104.76%
 *     Geist Mono Fallback   src: local(Arial)   size-adjust: 134.59%
 *
 * `app/globals.css` named `"Geist Mono Fallback"` in the SANS stack, from the
 * first commit. So every time the Geist webfont had not arrived — a cold load, a
 * restarted dev server, a stale service worker serving a build that no longer
 * exists — the entire site was painted in Arial at 134.59% instead of 104.76%.
 * 28% larger, every word, layout otherwise intact: a zoomed-in page.
 *
 * WHY NOTHING CAUGHT IT FOR EIGHT MONTHS, and why this test is written the way
 * it is: the fallbacks are `local(Arial)`, and the Linux machines the tests run
 * on have no Arial. The rule never matched, every fallback collapsed to plain
 * `sans-serif`, and both the broken and the fixed stack measured identically.
 * A browser test cannot see this. Reading the declaration can.
 *
 * So this asserts on the DECLARATION, deliberately, and states that limit: it
 * proves the sans stack cannot name a mono stand-in. It does not prove anything
 * about what a browser paints.
 */

import { describe, expect, test } from "vitest"
import * as fs from "node:fs"
import * as path from "node:path"

const css = fs.readFileSync(path.resolve(__dirname, "../../../app/globals.css"), "utf8")

/** The value of a custom property declared in `@theme inline`. */
function token(name: string): string {
  const match = css.match(new RegExp(`--${name}:\\s*([^;]+);`))
  expect(match, `--${name} is not declared in app/globals.css`).not.toBeNull()
  return match![1].trim()
}

describe("the app's font tokens", () => {
  test("the sans stack never names a mono font or a mono stand-in", () => {
    const sans = token("font-sans")
    // Both the family and its metric-matched stand-in. "Geist Mono Fallback"
    // sitting here is the whole defect, and it read as plausible for months.
    expect(sans, `--font-sans is "${sans}" — a mono fallback here paints every page ~28% too large`).not.toMatch(/mono/i)
  })

  test("the mono stack is the one that names the mono stand-in", () => {
    expect(token("font-mono")).toMatch(/mono/i)
  })

  test("both come from next/font rather than being typed out by hand", () => {
    // Typed-out family names are how the two drifted apart in the first place:
    // next/font owns which faces exist and what they are called, and a literal
    // list here cannot be checked against it.
    expect(token("font-sans")).toContain("var(--font-geist-sans)")
    expect(token("font-mono")).toContain("var(--font-geist-mono)")
  })

  test("each stack still ends in a generic family", () => {
    /* `var(--font-geist-sans)` is `"Geist", "Geist Fallback"` and nothing else.
       Both are @font-face rules, and in development Turbopack injects the file
       defining them with JavaScript, after the first paint — so for a moment
       neither exists. Without a generic on the end the stack resolves to
       nothing and the browser uses its own default, which is usually a serif.
       Removing these was a regression introduced by the fix for the 28% bug. */
    expect(token("font-sans")).toMatch(/,\s*sans-serif\s*$/)
    expect(token("font-mono")).toMatch(/,\s*monospace\s*$/)
  })

  test("the variables the tokens point at are the ones the layout defines", () => {
    const layout = fs.readFileSync(path.resolve(__dirname, "../../../app/layout.tsx"), "utf8")
    for (const variable of ["--font-geist-sans", "--font-geist-mono"]) {
      expect(layout, `app/layout.tsx does not define ${variable}, so the token resolves to nothing`).toContain(
        `variable: "${variable}"`,
      )
    }
  })
})
