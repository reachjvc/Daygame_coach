/**
 * EVERY FUNCTION THAT WRITES USER DATA IS CLASSIFIED, AND THE DEBT ONLY SHRINKS.
 *
 * The failure this prevents, measured 2026-09-07: `completeOnboardingForUser`
 * was the one function that wrote a new user's whole signup profile, and it had
 * ZERO tests — while its four small pure helpers had 55 between them. The easy,
 * pleasant functions were covered; the awkward one that touched the database was
 * not, and the headline "4,470 passing" read as though everything was.
 *
 * Two real defects lived in the untested one: a completely blank profile could
 * be saved and marked "signup complete", and `level` was written from a formula
 * no other part of the app agreed with (3 of 4 real accounts ended up wrong).
 *
 * WHAT THIS GUARD DOES
 *
 *   1. Enumerates every exported function in src/**\/*Service.ts and
 *      src/db/*Repo.ts whose own body performs an insert/update/upsert/delete.
 *      Derived, so a new one appears here the day it is written.
 *   2. Requires each to be classified in the baseline. A new write function
 *      fails this test until somebody decides which it is.
 *   3. Holds the "unasserted" count as a RATCHET. It may fall, never rise.
 *
 * WHAT IT HONESTLY DOES NOT DO: prove a test asserts on the payload handed to
 * the database. That cannot be decided from source. "mentioned" means exactly
 * what it says — some test file names the function — and claiming more would be
 * the same proxy error the rest of this suite has just been audited for.
 *
 * TODAY, measured 2026-09-08: 178 functions write user data.
 *
 *     125  "unasserted"  no test file mentions them at all
 *      52  "mentioned"   some test names them; whether it checks what they save
 *                        is NOT verified, and this guard does not claim it is
 *       1  "asserted"    a test checks the payload handed to the database
 *                        (completeOnboardingForUser — the one that started this)
 *
 * The ratchet below holds the 125. That is the number to drive down.
 */

import { describe, it, expect } from "vitest"
import * as fs from "fs"
import * as path from "path"
import { writeFunctions, isMentionedInTests } from "@/tests/support/writePaths"

const BASELINE_PATH = path.resolve(__dirname, "../support/writeCoverage.baseline.json")

/**
 * The ceiling. Lower it whenever real coverage is added; never raise it.
 * Raising it is how a guard becomes a description of whatever happened.
 */
/**
 * RAISED FROM 125 TO 136 ON 2026-09-08, AND THE DEBT DID NOT GROW.
 *
 * The scanner that finds write functions took a function's body to start at the
 * first `{` after its name — but a return type can contain braces of its own
 * (`Promise<{ updated: number }>`), so for any such function the "body" was the
 * return type, and the write inside it was invisible. Twenty-three write paths
 * were hidden that way, eleven of them with no test asserting what they save.
 *
 * They were always there. Fixing the scanner did not add debt, it stopped
 * hiding it, and the honest thing is to count it. Do not raise this again
 * without the same kind of explanation.
 *
 * The same pass removed four entries that only existed because the scanner had
 * read a COMMENT as a function declaration — a sentence containing the words
 * "this function is expected to write" produced a phantom function named `is`,
 * whose supposed body was the real code below it. Because the propagation
 * matches by name, every Supabase read filtering with `.is(...)` then looked
 * like a write. Comments and string literals are blanked before scanning now.
 */
const MAX_UNASSERTED = 136

type Baseline = Record<string, string>

function readBaseline(): Baseline {
  return JSON.parse(fs.readFileSync(BASELINE_PATH, "utf-8")) as Baseline
}

describe("write coverage", () => {
  it("finds the write surface at all", () => {
    // The ratchet on the enumerator itself. If the source patterns stop
    // matching, every assertion below passes while checking nothing.
    expect(
      writeFunctions().length,
      "No write functions were found in src/. The enumerator in " +
        "tests/support/writePaths.ts has stopped matching, and this guard is " +
        "now checking nothing.",
    ).toBeGreaterThan(50)
  })

  it("every function that writes user data is classified", () => {
    const baseline = readBaseline()
    const unclassified = writeFunctions()
      .filter((f) => !(f.key in baseline))
      .map((f) => f.key)

    expect(
      unclassified,
      `These functions write user data and are not in the coverage baseline:\n` +
        unclassified.map((k) => `  ${k}`).join("\n") +
        `\n\nAdd each to tests/support/writeCoverage.baseline.json as either\n` +
        `  "asserted"    — a test checks what it hands the database, or\n` +
        `  "unasserted"  — nothing does yet (and MAX_UNASSERTED must not rise).\n` +
        `A new write path should not reach users without that decision being made.`,
    ).toEqual([])
  })

  it("the unasserted debt does not grow", () => {
    const baseline = readBaseline()
    const live = new Set(writeFunctions().map((f) => f.key))

    // Only count entries that still exist: deleting a function is a legitimate
    // way for the debt to fall.
    const unasserted = Object.entries(baseline)
      // "unasserted" only: no test mentions these at all. The 52 "mentioned"
      // ones are a weaker claim tracked separately -- see the docblock -- and
      // folding them in here would make the ceiling 177 and the ratchet useless.
      .filter(([key, state]) => live.has(key) && state === "unasserted")
      .map(([key]) => key)

    expect(
      unasserted.length,
      `${unasserted.length} write functions have no test asserting what they save ` +
        `(ceiling ${MAX_UNASSERTED}).\n` +
        `If this rose, a new write path was added without coverage. If it fell, ` +
        `lower MAX_UNASSERTED in this file to lock the gain in.`,
    ).toBeLessThanOrEqual(MAX_UNASSERTED)
  })

  it("nothing claims to be tested when no test mentions it", () => {
    const baseline = readBaseline()
    const live = new Map(writeFunctions().map((f) => [f.key, f.fn]))

    const lying = Object.entries(baseline)
      .filter(([key, state]) => state === "asserted" && live.has(key))
      .filter(([key]) => !isMentionedInTests(live.get(key)!))
      .map(([key]) => key)

    expect(
      lying,
      `Marked "asserted" in the baseline, but no test file mentions them:\n` +
        lying.map((k) => `  ${k}`).join("\n"),
    ).toEqual([])
  })

  it("the baseline has no stale entries", () => {
    // A renamed or deleted function leaves a row that silently counts toward
    // nothing and hides the real shape of the debt.
    const baseline = readBaseline()
    const live = new Set(writeFunctions().map((f) => f.key))
    const stale = Object.keys(baseline).filter((k) => !live.has(k))

    expect(
      stale,
      `These baseline entries no longer exist in src/ — remove them:\n` +
        stale.map((k) => `  ${k}`).join("\n"),
    ).toEqual([])
  })
})
