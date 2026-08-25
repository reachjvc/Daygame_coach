/**
 * The short version.
 *
 * The fifth path, and the only one built from the evidence ranking rather than
 * from a single school of thought. Two things here are easy to break by
 * accident and would quietly make the page dishonest.
 */

import { describe, it, expect } from "vitest"
import fs from "node:fs"
import path from "node:path"
import { SHORTLIST, SHORTLIST_COPY } from "@/src/vice/data/shortlist"
import { LANGUAGE_RULES } from "@/src/vice/data/copy"

describe("the order matches the numbers on screen", () => {
  it("renders sorted by recurrence, since the copy claims that order", () => {
    // The component sorts rather than trusting the array, because an item with
    // nine sources shown below one with eight makes the stated claim false.
    const src = fs.readFileSync(path.join(process.cwd(), "src/vice/components/Shortlist.tsx"), "utf8")
    expect(src).toMatch(/sort\(\(a, b\) => b\.recurrence - a\.recurrence\)/)
  })

  it("gives every item a source count that could have come from the corpus", () => {
    for (const i of SHORTLIST) {
      // Fifteen source files, so anything above that is a typo rather than a count.
      expect(i.recurrence, i.id).toBeGreaterThan(0)
      expect(i.recurrence, i.id).toBeLessThanOrEqual(15)
    }
  })
})

describe("it points people away from the screen", () => {
  it("has most items happening off this page", () => {
    // Engagement volume predicts nothing good across three independent designs,
    // and a high proportion of recovery-focused time carries OR 5.00 for a use
    // episode. A checklist that could be completed without standing up would be
    // optimising the wrong variable.
    const off = SHORTLIST.filter((i) => i.offScreen).length
    expect(off).toBeGreaterThan(SHORTLIST.length / 2)
  })

  it("says so on the page rather than only in a comment", () => {
    expect(SHORTLIST_COPY.eject).toMatch(/away from|not the work/i)
  })

  it("marks the items that only hold when somebody else controls them", () => {
    // The cross-behaviour finding: gambling blockers get beaten by offshore
    // sites, porn blockers "work only when someone else holds the key".
    const needsPerson = SHORTLIST.filter((i) => i.needsPerson).map((i) => i.id)
    expect(needsPerson).toContain("key")
    expect(needsPerson).toContain("person")
  })
})

describe("it stays honest about what the count is", () => {
  it("refuses to present the count as a streak or a score", () => {
    expect(SHORTLIST_COPY.countNote).toMatch(/not a score and not a streak/i)
  })

  it("tells people to come back less often once it is done", () => {
    // The opposite of what a retention-optimised product would say, and what
    // the evidence actually supports.
    expect(SHORTLIST_COPY.allDone).toMatch(/rather than daily|worse outcomes/i)
  })

  it("obeys the module's language rules", () => {
    const control = new RegExp(`\\b(${LANGUAGE_RULES.bannedControl.join("|")})\\b`, "i")
    const cheer = new RegExp(LANGUAGE_RULES.bannedCheer.join("|"), "i")
    const machine = new RegExp(LANGUAGE_RULES.bannedMachineTells.join("|"), "i")
    const strings = [
      ...Object.values(SHORTLIST_COPY),
      ...SHORTLIST.flatMap((i) => [i.label, i.does]),
    ]
    for (const s of strings) {
      expect(control.test(s), `controlling: ${s.slice(0, 60)}`).toBe(false)
      expect(cheer.test(s), `cheer: ${s.slice(0, 60)}`).toBe(false)
      expect(machine.test(s), `machine-written: ${s.slice(0, 60)}`).toBe(false)
    }
  })
})
