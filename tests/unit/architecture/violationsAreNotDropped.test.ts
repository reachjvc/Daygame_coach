/**
 * A REFUSAL MUST REACH THE PERSON WHO WAS REFUSED.
 *
 * Five functions in `timetrackService` answer with `{ state, violations }`:
 * `startTimer`, `continueEntry`, `createManualEntry`, `updateEntry` and
 * `applyDraftPatch`. Taking `.state` straight off the call discards the reason
 * and returns the state unchanged — which on screen is a control that does
 * nothing and says nothing.
 *
 * On 2026-09-26 twelve of the twenty-six call sites did exactly that:
 *
 *   - `CalendarView` drag-to-move and drag-to-resize (drag-to-CREATE showed its
 *     message; its two neighbours did not), so in a workspace with a required
 *     project or a locked date the block slid under the cursor, snapped back,
 *     and nothing was said;
 *   - the detail sheet's project, tag, billable, duration-only and shared-with
 *     controls, and the inline row's create-and-assign paths;
 *   - and the worst one, the idle prompt, which trimmed with `.state` and then
 *     toasted "Dropped 25m and stopped the timer" whether or not the trim had
 *     happened. A confirmation written before anyone checked.
 *
 * WHY A SOURCE SCAN. The browser tests reach the screens they navigate to, and
 * a refusal only appears in a workspace configured to refuse something — so the
 * states that expose this are exactly the ones no spec sets up. This reads the
 * source instead: every call site is in scope whether or not a test can reach
 * it.
 *
 * WHAT IT DOES NOT CATCH, stated so nobody mistakes green here for safety —
 * and the first item is not hypothetical, it is measured:
 *   - a caller that binds the result and then ignores `violations` anyway
 *     (`const r = updateEntry(...); setState(() => r.state)`). Run against the
 *     source as it stood before these fixes, this scan finds **eleven** of the
 *     twelve sites: two in `CalendarView`, seven in `EntryList`, two in
 *     `useTimetrack`. The twelfth — the idle prompt's restart, which bound
 *     `const restarted = startTimer(...)` and then returned `restarted.state` —
 *     was found by reading, and this scan would not have found it. Eleven of
 *     twelve is what a syntactic guard buys; the twelfth is why the reading
 *     still has to happen;
 *   - a caller that shows the message somewhere invisible;
 *   - anything outside `src/timetrack/`.
 */

import { readdirSync, readFileSync, statSync } from "node:fs"
import { join } from "node:path"

import { describe, expect, test } from "vitest"

const SLICE = "src/timetrack"
const OWNER = "timetrackService.ts"

/** The functions whose result carries a refusal. */
const RETURNS_VIOLATIONS = [
  "startTimer",
  "continueEntry",
  "createManualEntry",
  "updateEntry",
  "applyDraftPatch",
]

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = join(dir, name)
    if (statSync(full).isDirectory()) return sourceFiles(full)
    return /\.tsx?$/.test(name) ? [full] : []
  })
}

/** Block and line comments, so an example in a docstring is not a finding. */
function withoutComments(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1")
}

/**
 * Every `<fn>(...).state` in `source`, found by walking back from each `.state`
 * to the parenthesis that opened it and reading the identifier in front.
 *
 * Bracket-matching rather than a regex: these calls run across as many as ten
 * lines, and a regex that spans them either misses the nested parens or matches
 * far too much.
 */
function droppedViolations(source: string): { fn: string; line: number }[] {
  const text = withoutComments(source)
  const found: { fn: string; line: number }[] = []

  for (let i = text.indexOf(").state"); i !== -1; i = text.indexOf(").state", i + 1)) {
    let depth = 0
    let open = -1
    for (let j = i; j >= 0; j--) {
      if (text[j] === ")") depth++
      else if (text[j] === "(") {
        depth--
        if (depth === 0) {
          open = j
          break
        }
      }
    }
    if (open === -1) continue
    const before = text.slice(Math.max(0, open - 40), open)
    const name = before.match(/([A-Za-z_$][\w$]*)\s*$/)?.[1]
    if (name && RETURNS_VIOLATIONS.includes(name)) {
      found.push({ fn: name, line: text.slice(0, open).split("\n").length })
    }
  }
  return found
}

describe("a refusal is never taken off the result and thrown away", () => {
  test("no call site in the slice reads `.state` straight off one of them", () => {
    const offenders = sourceFiles(SLICE)
      .filter((file) => !file.endsWith(OWNER))
      .flatMap((file) =>
        droppedViolations(readFileSync(file, "utf8")).map(({ fn, line }) => `${file}:${line} — ${fn}(...).state`),
      )

    expect(offenders).toEqual([])
  })

  test("the service itself may, because that is where the rule is decided", () => {
    // Not an exemption so much as a statement of where the line is: inside
    // `timetrackService` these compose, and the outermost caller is the one
    // that has to answer for the violations.
    const inside = droppedViolations(readFileSync(join(SLICE, OWNER), "utf8"))
    expect(inside.length).toBeGreaterThan(0)
  })

  test("the scan finds a violation when there is one to find", () => {
    /**
     * The guard that never fires is the guard nobody notices is broken. This
     * plants the exact shape that was live on 2026-09-26 — including the
     * ten-line, multi-argument version from `CalendarView` — and requires the
     * scan to see both.
     */
    const planted = `
      const a = () => setState((current) => updateEntry(current, id, { billable: true }, nowIso()).state)
      const b = () =>
        setState((current) =>
          updateEntry(
            current,
            entryId,
            { start: isoAtMinutes(day, newStart), stop: isoAtMinutes(day, newStart + duration) },
            nowIso(),
          ).state,
        )
      const c = () => somethingElse(current, id).state
    `

    const found = droppedViolations(planted)
    expect(found.map((f) => f.fn)).toEqual(["updateEntry", "updateEntry"])
  })

  test("a commented-out example is not a finding", () => {
    const planted = `
      // updateEntry(current, id, patch, nowIso()).state
      /* const old = updateEntry(current, id, patch, nowIso()).state */
      const result = updateEntry(current, id, patch, nowIso())
      if (result.violations.length > 0) return
    `

    expect(droppedViolations(planted)).toEqual([])
  })
})
