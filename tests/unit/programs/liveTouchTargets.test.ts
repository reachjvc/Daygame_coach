/**
 * THE FLOOR UNDER THE SCREEN YOU STAND IN FRONT OF FOR AN HOUR.
 *
 * Two rules the live workout screen is held to, both source-level, because
 * both are the kind of thing that comes back one careless class at a time.
 *
 * 1. NOTHING SMALLER THAN 11 px, AND ONLY THE CAPTION ROW AT 11. The rows are
 *    numbers read at arm's length with a bar in your hands. `text-[11px]` was
 *    on the PREVIOUS column, the plates line, the superset tag, the rest
 *    caption and two amber warnings; it belongs on the caption row that names
 *    the columns and nowhere else. Everything else is `text-xs` (12 px).
 *
 * 2. ONE OVERFLOW GLYPH. The app's "⋮" is `MoreVertical`; this screen used
 *    `MoreHorizontal`, which is the same control drawn a different way in the
 *    one place a person meets it most.
 *
 * WHAT THIS HONESTLY DOES NOT CHECK: whether anything is actually 44 px on a
 * real screen. A class list is not a measurement. `tests/e2e` measures the
 * rendered boxes at 390 px, and `tests/support/sweepDebt.ts` holds the count.
 */

import { describe, it, expect } from "vitest"
import * as fs from "fs"
import * as path from "path"

const LIVE_DIR = path.resolve(__dirname, "../../../src/programs/components/live")
const PROGRAMS_DIR = path.resolve(__dirname, "../../../src/programs")

function filesUnder(dir: string): string[] {
  const out: string[] = []
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) out.push(...filesUnder(full))
    else if (/\.tsx?$/.test(entry.name)) out.push(full)
  }
  return out
}

const read = (file: string) => fs.readFileSync(file, "utf-8")

/**
 * Screens that still carry 10 px type, and are not this phase's to rebuild.
 * The list may SHRINK and never grow — that is what stops the floor leaking
 * back onto the screens that have been fixed.
 *
 * IT IS EMPTY, and on 2026-09-23 it reached empty: `ProgramEditor` and
 * `RunningPrograms` were rebuilt, and `CustomProgramBuilder` and `ui.tsx` were
 * deleted with the tap-to-build builder. It stays rather than being removed —
 * the two assertions below are the rule, and "the allowance is zero" is the
 * strongest thing this file can say.
 */
const TINY_TYPE_DEBT = new Set<string>([])

const tinyTypeFiles = (): string[] =>
  filesUnder(PROGRAMS_DIR)
    .filter((file) => /text-\[(?:10|9|8)px\]/.test(read(file)))
    .map((file) => path.relative(PROGRAMS_DIR, file).replace(/\\/g, "/"))

describe("the live screen's type floor", () => {
  it("has no NEW text smaller than 11 px in the programs slice", () => {
    const offenders = tinyTypeFiles().filter((file) => !TINY_TYPE_DEBT.has(file))
    expect(offenders, `Smaller than the floor:\n${offenders.join("\n")}`).toEqual([])
  })

  it("the 10 px allowance only shrinks", () => {
    // Off the same scan as the half above, so the two cannot disagree about
    // what counts as a violation.
    const found = new Set(tinyTypeFiles())
    const stale = [...TINY_TYPE_DEBT].filter((file) => !found.has(file))
    expect(
      stale,
      `These are fixed or gone — remove them from TINY_TYPE_DEBT:\n${stale.join("\n")}`
    ).toEqual([])
  })

  it("keeps 11 px for the caption row alone", () => {
    const uses = filesUnder(LIVE_DIR).flatMap((file) => {
      const hits = read(file).match(/text-\[11px\]/g) ?? []
      return hits.map(() => path.relative(LIVE_DIR, file))
    })
    /**
     * Exactly one, in the file that draws SET · PREVIOUS · KG · REPS. If this
     * rises, something else has been shrunk below `text-xs`; if it falls to
     * zero the caption has moved and this test should follow it, not be
     * deleted.
     */
    expect(uses).toEqual(["LiveWorkoutScreen.tsx"])
  })
})

describe("the overflow glyph", () => {
  it("is MoreVertical, and MoreHorizontal is not imported anywhere in the slice", () => {
    const offenders = filesUnder(PROGRAMS_DIR)
      .filter((file) => /\bMoreHorizontal\b/.test(read(file)))
      .map((file) => path.relative(PROGRAMS_DIR, file))
    expect(offenders, `These draw a different ⋮ from the rest of the app:\n${offenders.join("\n")}`).toEqual([])
  })
})

describe("the controls a finger has to hit", () => {
  /**
   * The three the walkthrough measured under 44 px, each named here with the
   * class that fixed it. A class list is not a measurement — the browser suite
   * measures — but these three regressed once and a grep is enough to catch
   * the same edit happening again.
   */
  it("keeps the set number, the tick and the delete zone at 44 px", () => {
    const row = read(path.join(LIVE_DIR, "SetRow.tsx"))
    // The set number: a caption before, now the door to the set's own menu.
    expect(row).toMatch(/data-testid=\{`set-menu-\$\{label\}`\}[\s\S]{0,400}?h-11 w-11/)
    expect(row).toMatch(/data-testid=\{`tick-\$\{label\}`\}[\s\S]{0,400}?h-11 w-11/)
    expect(row).toMatch(/data-testid=\{`hover-delete-\$\{label\}`\}[\s\S]{0,400}?h-11 w-11/)
  })

  it("keeps the lift's name tappable rather than a 20 px line of text", () => {
    const screen = read(path.join(LIVE_DIR, "LiveWorkoutScreen.tsx"))
    expect(screen).toMatch(/data-testid=\{`lift-name-\$\{ex\.exerciseId\}`\}[\s\S]{0,400}?min-h-11/)
  })
})
