/**
 * A CONTROL IS BIG ENOUGH TO TAP, CHECKED IN THE SOURCE RATHER THAN THE BROWSER.
 *
 * WHY THIS EXISTS AND WHY THE BROWSER SWEEP WAS NOT ENOUGH, 2026-09-26.
 *
 * `tests/e2e/mobile/mobile-toggl.spec.ts` has a sweep that measures every
 * control at 390px and fails on anything under 44. It was green while
 * twenty-nine controls in this slice were too small, because a browser sweep can
 * only measure what it navigates to and what its selector names, and both of
 * those are things its author writes by hand:
 *
 *   - it queried `button`, so every `select`, `input`, `a` and `[role=switch]`
 *     was invisible to it BY CONSTRUCTION;
 *   - it visited each screen's default tab, so Settings › Automation, Manage ›
 *     Team and four Reports tabs were never measured at all;
 *   - a separate overflow test stopped its timer before navigating, so the
 *     running pill was never on screen while anything measured width.
 *
 * Each hole was one line of the test's own code. Widening it fixes that sweep;
 * it does nothing for the next sweep somebody writes for another slice, which
 * will have a fresh selector and fresh holes. The owner said, correctly, that
 * discipline plus a widened instance would not hold.
 *
 * A SOURCE SCAN HAS NO SELECTOR AND NO NAVIGATION. It sees every call site
 * whether or not any test can reach it, including tabs nothing opens, states
 * nothing enters and screens nobody wrote a spec for. That is the property being
 * bought here — not thoroughness, but the absence of a reach to get wrong.
 *
 * WHAT IT DOES NOT CATCH, stated because the failure above was a claim made
 * without its enumeration:
 *   - a class built at runtime (`h-${n}`) or composed from a variable;
 *   - a size coming from a shared component's own default rather than a
 *     className here (that is the default's job, and `components/ui/input.tsx`
 *     is already `h-11 sm:h-9`);
 *   - overlap, spacing and whether two 44px targets sit 4px apart;
 *   - anything outside `src/timetrack/`. Widening the scope means seeding the
 *     allowlist below for whatever the new slice already has.
 * The browser sweep still runs, and still earns its place on the first three.
 */

import { describe, expect, test } from "vitest"
import fs from "fs"
import path from "path"

const root = path.resolve(__dirname, "../../..")
const SCOPE = path.join(root, "src/timetrack")

/** Tailwind's `sm`. Below it we are on a phone; this slice's floor is 44px = 11. */
const FLOOR = 11

/** Tags that a thumb can hit. `MiniSelect` is this slice's only `<select>`. */
const INTERACTIVE = [
  "button",
  "Button",
  "input",
  "Input",
  "select",
  "MiniSelect",
  "textarea",
  "Textarea",
  "a",
]

/**
 * Sizes that are deliberate and stay. Each says why, and the list may only
 * shrink — an entry whose file or class no longer exists fails the last test
 * here, so a fixed one cannot sit around excusing its own return.
 */
/**
 * Deliberate exceptions, each with a reason. **It is empty, and that is the
 * point** — the two entries this started with both turned out to be avoidable by
 * stating an inert `sm:` partner on the element itself, which needs no list to
 * excuse it. An allowlist is a place for violations to live; prefer making the
 * source say what it means.
 */
const ALLOWED: { file: string; cls: string; why: string }[] = []

interface Finding {
  file: string
  cls: string
  token: string
}

/** The value that applies on a phone: the bare token, not an `sm:` one. */
function phoneFloorViolation(cls: string): string | null {
  // `hidden ` with no `sm:hidden` means the element is pointer-device only
  if (/(^|\s)hidden(\s|$)/.test(cls) && !/sm:hidden/.test(cls)) return null
  for (const match of cls.matchAll(/(^|\s)(min-h-|h-|size-)(\d+)(\s|$)/g)) {
    const [, , prefix, digits] = match
    if (Number(digits) < FLOOR) return `${prefix}${digits}`
  }
  return null
}

/**
 * Every `className` in the file, attributed to the element it is ON.
 *
 * Written backwards — from each `className=` to the nearest `<` before it —
 * because the obvious direction does not work. Reading forwards from `<button`
 * to its closing `>` trips over the `>` in every `onClick={() => …}`, and a
 * fixed window past it swallows the classNames of the element's CHILDREN: the
 * first version of this reported the 24px count chip INSIDE the 44px expand
 * button as a violation of the button.
 */
function taggedClassNames(source: string): { tag: string; cls: string; attrs: string }[] {
  const out: { tag: string; cls: string; attrs: string }[] = []
  for (const match of source.matchAll(/className=(?:"([^"]*)"|\{cn\(([\s\S]*?)\)\}|\{"([^"]*)"\})/g)) {
    const at = match.index ?? 0
    const before = source.slice(Math.max(0, at - 1200), at)
    const open = before.lastIndexOf("<")
    if (open === -1) continue
    const tagMatch = /^<([A-Za-z][A-Za-z0-9.]*)/.exec(before.slice(open))
    if (!tagMatch) continue
    const attrs = before.slice(open)
    const literals: string[] = []
    if (match[1] !== undefined) literals.push(match[1])
    if (match[3] !== undefined) literals.push(match[3])
    if (match[2] !== undefined) for (const piece of match[2].matchAll(/"([^"]*)"/g)) literals.push(piece[1])
    for (const cls of literals) out.push({ tag: tagMatch[1], cls, attrs })
  }
  return out
}

/**
 * A checkbox or radio is conventionally a small box, and what you actually hit
 * is its label. This scan cannot see the wrapper reliably, so it does not judge
 * them — the browser sweep measures the effective target and does.
 */
function judged(entry: { tag: string; attrs: string }): boolean {
  if (!INTERACTIVE.includes(entry.tag)) return false
  if (/type="(checkbox|radio)"/.test(entry.attrs)) return false
  return true
}

/** The findings in one file's text — the unit the parser tests can drive */
function scanText(source: string): string[] {
  const out: string[] = []
  for (const found of taggedClassNames(source)) {
    if (!judged(found)) continue
    const token = phoneFloorViolation(found.cls)
    if (token) out.push(`${found.cls} (${token})`)
  }
  return out
}

function scan(): Finding[] {
  const findings: Finding[] = []
  const walk = (dir: string) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name)
      if (entry.isDirectory()) walk(full)
      else if (entry.name.endsWith(".tsx")) {
        const source = fs.readFileSync(full, "utf8")
        for (const found of taggedClassNames(source)) {
          if (!judged(found)) continue
          const token = phoneFloorViolation(found.cls)
          if (token) findings.push({ file: path.basename(full), cls: found.cls, token })
        }
      }
    }
  }
  walk(SCOPE)
  const allowed = new Set(ALLOWED.map((a) => `${a.file}::${a.cls}`))
  return findings.filter((f) => !allowed.has(`${f.file}::${f.cls}`))
}

describe("every tappable control in the time tracker clears 44px on a phone", () => {
  test("no interactive element sets a phone height below the floor", () => {
    const findings = scan()
    const report = findings.map((f) => `${f.file}: "${f.cls}" (${f.token})`)
    expect(
      report,
      `These set a size under 44px that applies on a phone. Give each an ` +
        `\`sm:\` partner so the pointer-device size is unchanged — ` +
        `\`h-9\` becomes \`h-11 sm:h-9\` — or add it to ALLOWED with a reason.`,
    ).toEqual([])
  })

  /**
   * The scan has to be able to see something, or it is a test that passes by
   * finding nothing anywhere. A deliberately short class must be reported.
   */
  test("the scan can actually detect a short control", () => {
    expect(phoneFloorViolation("h-9 w-full")).toBe("h-9")
    expect(phoneFloorViolation("size-8 rounded-full")).toBe("size-8")
    expect(phoneFloorViolation("min-h-9 px-1 text-xs")).toBe("min-h-9")
    // and must NOT report the shapes that are correct
    expect(phoneFloorViolation("h-11 sm:h-9")).toBeNull()
    expect(phoneFloorViolation("min-h-11 sm:min-h-0")).toBeNull()
    expect(phoneFloorViolation("hidden h-8 sm:grid")).toBeNull()
  })

  test("a className is attributed to its own element, not to a child", () => {
    // the shape that fooled the first version: a small span inside a big button
    const source = `
      <button type="button" onClick={() => go()} className="flex size-11 items-center">
        <span className="flex size-6 rounded bg-primary/15">{n}</span>
      </button>
    `
    const judgedHere = taggedClassNames(source).filter(judged)
    expect(judgedHere.map((e) => e.cls)).toEqual(["flex size-11 items-center"])
    expect(scanText(source)).toEqual([])
  })

  test("it sees a real file, and a short control in one", () => {
    const timerBar = fs.readFileSync(path.join(SCOPE, "components/TimerBar.tsx"), "utf8")
    expect(taggedClassNames(timerBar).filter(judged).length).toBeGreaterThan(3)
    // and would report a regression introduced into that file
    expect(scanText(timerBar.replace('className="h-11 w-[100px]', 'className="h-9 w-[100px]'))).not.toEqual([])
  })

  test("ALLOWED only holds entries that still exist — remove the rest", () => {
    const stale: string[] = []
    for (const entry of ALLOWED) {
      const files: string[] = []
      const walk = (dir: string) => {
        for (const item of fs.readdirSync(dir, { withFileTypes: true })) {
          const full = path.join(dir, item.name)
          if (item.isDirectory()) walk(full)
          else if (item.name === entry.file) files.push(full)
        }
      }
      walk(SCOPE)
      const present = files.some((f) => fs.readFileSync(f, "utf8").includes(entry.cls))
      if (!present) stale.push(`${entry.file}: "${entry.cls}"`)
    }
    expect(stale, "These are fixed or gone — remove them from ALLOWED").toEqual([])
  })
})
