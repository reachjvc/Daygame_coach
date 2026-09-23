/**
 * A COMPONENT SEVERAL SCREENS DEPEND ON HAS A TEST THAT USES ITS PROPS.
 *
 * On 2026-09-21 a plan said "new file `ProgramRow.tsx`". It was not new: it
 * had a `right` slot, a `className` passthrough and an accessibility note
 * about never using a clickable `div`, and four program lists rendered
 * through it. It was overwritten by a thinner version with different props.
 *
 * Nothing about that was visible. The file was replaced, the app still
 * compiled, and the four lists would simply have lost their trailing content.
 * What caught it was `programRow.test.tsx` — a committed test that
 * constructed the component with its REAL props and therefore failed to
 * typecheck against the replacement.
 *
 * WHAT THIS GUARD DOES AND DOES NOT DO. It would NOT have caught that day:
 * `ProgramRow` has one importer, and it already had the test. Writing a file
 * without reading it is a tool habit, and the check for it lives in
 * `docs/known-failures.md`.
 *
 * What it does is spread the property that saved it. Where several screens
 * depend on one component's shape, something should construct it with that
 * shape, so that changing the shape — or replacing the file — cannot be
 * silent. Three shared components have no such thing today.
 *
 * A RATCHET, not a ban. The two below are allowed and the number may only
 * fall — fix one when you are next in it and remove its line in the same
 * commit. A guard that is red on arrival gets switched off.
 */

import { describe, it, expect } from "vitest"
import fs from "fs"
import path from "path"

const root = path.resolve(__dirname, "../../..")
const COMPONENTS = path.join(root, "src/programs/components")

/**
 * Known gaps. Each is a component two or more files render, with nothing
 * constructing it in a test.
 */
const UNTESTED_SHARED = new Set<string>([
  // A chart primitive: its props are three numbers and a path, and a change of
  // shape shows up as a visibly wrong line rather than as silence.
  "Sparkline",
  // The whole Today screen. Its behaviour is covered through the screens it
  // renders and in the browser; a unit test that constructs it would be a
  // second copy of those, which is why this one is last in the queue.
  "ProgramsApp",
  // The Tracking door's card. Covered end-to-end in
  // tests/e2e/dashboard-training-card.spec.ts at 390px, which is where its
  // seven states are actually worth checking — but nothing constructs it in a
  // unit test, so a prop rename would only surface in a browser.
  "TrainingCard",
])

function filesUnder(dir: string, out: string[] = []): string[] {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) filesUnder(full, out)
    else if (/\.tsx?$/.test(entry.name)) out.push(full)
  }
  return out
}

/** Every source file that imports `name` from anywhere. */
function importersOf(name: string, self: string): number {
  let n = 0
  for (const dir of ["src", "app"]) {
    for (const file of filesUnder(path.join(root, dir))) {
      if (file === self) continue
      const src = fs.readFileSync(file, "utf-8")
      // `from "…/ProgramRow"` and the lazy `import("…/ProgramRow")` form.
      if (new RegExp(`["'][^"']*/${name}["']`).test(src)) n++
    }
  }
  return n
}

/** Whether any unit test names the component's module path. */
function hasTest(name: string): boolean {
  for (const file of filesUnder(path.join(root, "tests/unit"))) {
    const src = fs.readFileSync(file, "utf-8")
    if (new RegExp(`components/(live/)?${name}["'\\s]`).test(src)) return true
  }
  return false
}

describe("components several screens depend on", () => {
  const shared = fs
    .readdirSync(COMPONENTS, { withFileTypes: true })
    .filter((e) => e.isFile() && e.name.endsWith(".tsx"))
    .map((e) => ({ name: e.name.replace(/\.tsx$/, ""), file: path.join(COMPONENTS, e.name) }))
    .filter(({ name, file }) => importersOf(name, file) >= 2)

  it("premise: this scan finds the shared ones at all", () => {
    // Without this, a broken importer scan returns an empty list and the test
    // below passes for ever while checking nothing — which is the same lie as
    // having no test.
    expect(shared.length, "no shared components found — the scan is broken").toBeGreaterThan(3)
    /**
     * A name the scan must find, so a broken importer regex fails here rather
     * than silently reporting that everything is fine.
     *
     * It was `WeekStrip` until 2026-09-23, when that stopped being shared:
     * `/programs` was rendering it AND `TodayCard` was rendering its own, so
     * the Training tab drew two identical seven-day strips twenty pixels apart.
     * The duplicate went and the canary had to move — which is the canary doing
     * its job, not failing at it.
     *
     * `ProgramRow`, not `TodayCard`: this scan counts importers of the file
     * itself, and the dashboard and Life Mastery reach the today card through
     * `TrainingCard`, which wraps it — so it has one importer here and would
     * have been a second canary that quietly stopped being true. `ProgramRow`
     * is the row every list of programs uses, and there are five of them.
     */
    expect(shared.map((s) => s.name)).toContain("ProgramRow")
  })

  it("each has something constructing it with its real props", () => {
    const missing = shared.filter((s) => !UNTESTED_SHARED.has(s.name) && !hasTest(s.name))
    expect(
      missing.map((s) => s.name),
      "Several screens render these and nothing builds them in a test, so a\n" +
        "change of props — or a whole file replaced — is silent. Add a test, or\n" +
        "add the name to UNTESTED_SHARED with the reason:"
    ).toEqual([])
  })

  it("the allowlist only shrinks", () => {
    const fixed = [...UNTESTED_SHARED].filter((name) => hasTest(name))
    expect(
      fixed,
      "These have tests now — remove them from UNTESTED_SHARED:"
    ).toEqual([])
  })
})
