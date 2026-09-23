/**
 * THE COPY LINT, EXTENDED TO WHERE THE COPY ACTUALLY IS.
 *
 * `viceCopyLint.test.ts` reads `data/*.ts` and nothing else, and its own comment
 * says why that matters: "Copy that is not linted is where drift starts."
 *
 * The Black Box has almost no copy in `data/`. Its sentences are written inline
 * in the components — the header, the door, the three stat captions, both
 * forms' blocked-reason lines, the correction confirms, the chart key. So the
 * module's front door, the screen a person actually reads at eleven at night,
 * sat entirely outside the lint that exists to protect the module's voice. It
 * was not that the rules were being broken; it was that nothing would have said
 * so, which is the same position `data/` was in before its lint existed.
 *
 * Both halves read the SAME `LANGUAGE_RULES`, so there is one owner for what
 * the module may say and two places that ask it.
 *
 * What this reads: JSX text, and the string values of the props that carry
 * sentences. Deliberately not every string literal in the file — `className` is
 * most of them, and a lint that cries wolf on Tailwind gets switched off.
 */

import { describe, it, expect } from "vitest"
import { readFileSync, readdirSync } from "node:fs"
import path from "node:path"
import { LANGUAGE_RULES } from "@/src/vice/data/copy"

const ROOT = path.join(process.cwd(), "src/vice/components")

/** Every component in the module, the new front door first. */
function componentFiles(): string[] {
  const out: string[] = []
  const walk = (dir: string) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name)
      if (entry.isDirectory()) walk(full)
      else if (entry.name.endsWith(".tsx")) out.push(full)
    }
  }
  walk(ROOT)
  return out.sort()
}

/** Comments are stripped first: they explain the rules and would trip them. */
function withoutComments(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/^\s*\/\/[^\n]*$/gm, " ")
}

/** The props that carry a sentence rather than a class name or an id. */
const PROSE_PROPS = /\b(label|help|placeholder|caption|blurb|title|lowAnchor|highAnchor|fallbackLabel|aria-label)\s*=\s*(?:"([^"]*)"|\{`([^`]*)`\})/g

/**
 * Text a person reads, pulled out of one component.
 *
 * JSX text is anything between a `>` and a `<` that is not code. Entities are
 * turned back into the characters they stand for, because `&rsquo;` is an
 * apostrophe to a reader and the rules are about what is read.
 */
function userFacingStrings(source: string): string[] {
  const src = withoutComments(source)
  const out: string[] = []

  for (const m of src.matchAll(/>([^<>{}]+)</g)) {
    const text = m[1]
      .replace(/&rsquo;|&apos;/g, "'")
      .replace(/&ldquo;|&rdquo;|&quot;/g, '"')
      .replace(/&mdash;/g, "—")
      .replace(/&middot;/g, "·")
      .replace(/&hellip;/g, "…")
      .replace(/&nbsp;/g, " ")
      .replace(/&amp;/g, "&")
      .replace(/\s+/g, " ")
      .trim()
    // At least two words with letters in them: this skips "·", "→", "{" leftovers.
    if (looksLikeCode(text)) continue
    if (/[a-z]/i.test(text) && text.split(" ").length > 1) out.push(text)
  }

  for (const m of src.matchAll(PROSE_PROPS)) {
    const text = (m[2] ?? m[3] ?? "").replace(/\$\{[^}]*\}/g, "…").replace(/\s+/g, " ").trim()
    if (/[a-z]/i.test(text) && text.split(" ").length > 1) out.push(text)
  }

  // Template literals holding a whole sentence, which is how the blocked-reason
  // lines and the chart caption are written.
  for (const m of src.matchAll(/`([^`]{20,})`/g)) {
    const text = m[1].replace(/\$\{[^}]*\}/g, "…").replace(/\s+/g, " ").trim()
    if (looksLikeClassName(text) || looksLikeCode(text)) continue
    if (/[a-z]/i.test(text) && text.split(" ").length > 2) out.push(text)
  }

  return out
}

/** Tailwind, not English. */
function looksLikeClassName(text: string): boolean {
  return /(^|\s)(text-|bg-|border|rounded|px-|py-|mt-|mb-|ml-|mr-|gap-|grid|flex|inline-flex|absolute|relative|min-h-|w-full|hover:|transition|opacity|whitespace|shrink|space-y|leading-|tracking-|font-|uppercase|overflow|sm:|top-|inset-)/.test(text)
}

/**
 * JavaScript, not English.
 *
 * `>([^<>{}]+)<` is how JSX text is found, and an arrow function inside a prop
 * puts a `>` and a `<` around real code — `sort((x, y) => y.at.localeCompare(x.at))`
 * arrives here as a sentence. Left in, a variable named `shouldReset` or a
 * comparison against a duration would fail the lint with a message quoting
 * source code at somebody looking for a copy problem. A lint that cries wolf is
 * a lint that gets switched off.
 */
function looksLikeCode(text: string): boolean {
  return /=>|\(\(|\)\)|\);|=== |!== |&&|\|\||useState|useMemo|return |\.map\(|\.filter\(|\.slice\(|\?\.|\bconst \b|\blet \b|: string|: number|: boolean/.test(text)
}

const CONTROL = new RegExp(`\\b(${LANGUAGE_RULES.bannedControl.map((w) => w.replace(/ /g, "\\s+")).join("|")})\\b`, "i")
const DIAGNOSIS = new RegExp(`\\b(${LANGUAGE_RULES.bannedDiagnosis.join("|")})\\b`, "i")
const CHEER = new RegExp(
  LANGUAGE_RULES.bannedCheer.map((w) => w.replace(/ /g, "\\s+").replace(/'/g, "['’]")).join("|"),
  "i",
)
const MACHINE = new RegExp(
  LANGUAGE_RULES.bannedMachineTells.map((w) => w.replace(/ /g, "\\s+").replace(/'/g, "['’]")).join("|"),
  "i",
)
const DURATION_PROMISE = /\b(urges?|cravings?)\b[^.]{0,60}\b(last|lasts|only last|pass in)\b[^.]{0,20}\d+\s*(minute|min)/i

interface Violation { where: string; rule: string; text: string }

function lint(): Violation[] {
  const found: Violation[] = []
  for (const file of componentFiles()) {
    const where = path.relative(process.cwd(), file)
    for (const text of userFacingStrings(readFileSync(file, "utf8"))) {
      const add = (rule: string) => found.push({ where, rule, text: text.slice(0, 100) })
      if (CONTROL.test(text)) add("controlling language")
      if (DIAGNOSIS.test(text)) add("diagnosis word")
      if (CHEER.test(text)) add("empty encouragement")
      if (MACHINE.test(text)) add("reads as machine-written")
      if (DURATION_PROMISE.test(text)) add("promises an urge duration")
      if (LANGUAGE_RULES.bannedEmphasisShape.test(text)) add('"not just X but Y"')
      if (text.includes("  ")) add("double space")
    }
  }
  return found
}

describe("the copy a person reads on screen obeys the module's own rules", () => {
  it("finds zero violations in any component", () => {
    const found = lint()
    expect(
      found,
      `Copy rules broken in components (src/vice/data/copy.ts owns the rules):\n${found
        .map((v) => `  ${v.where} [${v.rule}]\n    ${v.text}`)
        .join("\n")}`,
    ).toEqual([])
  })

  /**
   * The lint is worth nothing if it reads nothing. This module's screens carry
   * hundreds of sentences, and a regex change that quietly stopped matching JSX
   * text would leave every test above green while checking an empty list.
   */
  it("actually reads the copy, rather than passing on an empty list", () => {
    const counted = componentFiles().reduce(
      (sum, f) => sum + userFacingStrings(readFileSync(f, "utf8")).length,
      0,
    )
    expect(counted).toBeGreaterThan(200)
  })

  it("reads the Black Box's own screens, which had no lint at all until now", () => {
    for (const file of ["blackbox/BlackBoxPage.tsx", "blackbox/ReportForm.tsx", "blackbox/PastRun.tsx"]) {
      expect(
        userFacingStrings(readFileSync(path.join(ROOT, file), "utf8")).length,
        `${file} contributed no copy to the lint`,
      ).toBeGreaterThan(5)
    }
  })

  it("catches a planted violation", () => {
    // Proves the rules fire rather than that the files happen to be clean.
    const planted = '<p className="x">You should make sure you stay positive.</p>'
    const text = userFacingStrings(planted)[0]
    expect(text).toBe("You should make sure you stay positive.")
    expect(CONTROL.test(text)).toBe(true)
    expect(CHEER.test(text)).toBe(true)
  })

  it("does not mistake source code for a sentence", () => {
    // An arrow function inside a prop is surrounded by `>` and `<`, so the JSX
    // text pattern swallows it whole.
    const jsx = '{[...rows].sort((x, y) => y.at.localeCompare(x.at))}'
    expect(userFacingStrings(jsx)).toEqual([])
    expect(looksLikeCode("y.at.localeCompare(x.at)) return (")).toBe(true)
    expect(looksLikeCode("Filed, and the run is closed on that day.")).toBe(false)
  })

  it("does not mistake a Tailwind class string for a sentence", () => {
    expect(looksLikeClassName("inline-flex min-h-11 items-center px-2 -mx-2 text-rose-300")).toBe(true)
    expect(looksLikeClassName("That run ends before it starts. Check the two dates.")).toBe(false)
  })
})
