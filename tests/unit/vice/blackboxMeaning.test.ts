/**
 * MEANING, NOT SHAPE.
 *
 * `.claude/rules/generated-data.md` rule 3: a test that a quote is *about* the
 * vice it is filed under beats twenty tests that a field is non-empty. These
 * are the equivalents here — each one fires on a change that would leave every
 * other test green while quietly destroying the point of the feature.
 */

import { describe, it, expect } from "vitest"
import { ENDING_FAMILIES, familyFor } from "@/src/vice/data/blackbox"
import { ENDINGS } from "@/src/vice/data/again"
import { emptyRecord, fileReport, startAttempt } from "@/src/vice/blackbox/blackboxStore"
import { stats, thoughtCosts } from "@/src/vice/blackboxService"

const TODAY = "2026-09-20"

describe("the chart's accent means something", () => {
  /**
   * The emphasis form only works because exactly one thing is emphasised. Accent
   * a second family and the chart stops saying "this is the one that keeps
   * killing your runs" and starts saying nothing at all.
   */
  it("accents exactly one family", () => {
    expect(ENDING_FAMILIES.filter((f) => f.accent)).toHaveLength(1)
  })

  /**
   * And it is the good-stretch family specifically. Across eight sources and an
   * RCT the hazard is feeling fine rather than craving; the module's tripwire,
   * its `again` tool and this chart all point at the same finding, and moving
   * the accent to "stressed" would quietly re-aim the whole feature at the
   * thing the research says is NOT the main danger.
   */
  it("accents the good stretch, not the bad night", () => {
    expect(ENDING_FAMILIES.find((f) => f.accent)?.id).toBe("fine")
  })
})

describe("the two surfaces agree about what an ending is", () => {
  /**
   * `data/again.ts` asks how the last attempt ended and `data/blackbox.ts`
   * records how every run ended. If they drift, a person answers the same
   * question two ways in one module. `never` is excluded on purpose: "this is
   * my first real go" is the absence of an ending, not one.
   */
  it("every ending the attempt review offers has a family here", () => {
    const theirs = ENDINGS.map((e) => e.id).filter((id) => id !== "never")
    const ours: string[] = ENDING_FAMILIES.map((f) => f.id)
    expect(theirs.filter((id) => !ours.includes(id))).toEqual([])
  })

  it("resolves an unknown ending to something rather than crashing a chart", () => {
    expect(familyFor("nonsense" as never).id).toBe("other")
  })
})

describe("the numbers say what the screen claims they say", () => {
  /**
   * The headline claim of the cost list is that it ranks by what a thought
   * cost, not by how often it happened. This builds the case where those two
   * orders DISAGREE — one thought filed five times that never ended a run,
   * against one filed twice that ended two long ones — and asserts the
   * expensive one wins. Ranked by frequency, this test fails.
   */
  it("ranks a rare expensive thought above a frequent harmless one", () => {
    let r = emptyRecord()
    r = startAttempt(r, { viceId: "s", label: "Cigarettes", startedOn: "2026-01-01", startedBy: "", structure: [], acknowledgedRisk: false, today: TODAY })
    const long = r.attempts[0].id
    for (let i = 0; i < 5; i++) {
      r = fileReport(r, {
        attemptId: long, at: `2026-01-1${i}T20:00:00.000Z`, wentThrough: false,
        thought: "bad day", ending: "stress", closeness: 5,
        withWhom: "", where: "", factors: [], didInstead: "went for a walk",
      })
    }
    r = fileReport(r, {
      attemptId: long, at: "2026-04-01T20:00:00.000Z", wentThrough: true,
      thought: "I'm clearly fine now", ending: "fine", closeness: 8,
      withWhom: "", where: "", factors: [], didInstead: "",
    })

    const rows = thoughtCosts(r, TODAY)
    expect(rows[0].ending).toBe("fine")
    expect(rows[0].runsEnded).toBe(1)
    const stress = rows.find((x) => x.ending === "stress")!
    expect(stress.survived).toBe(5)
    expect(stress.runsEnded).toBe(0)
    expect(rows.indexOf(stress)).toBeGreaterThan(0)
  })

  /**
   * Rule 3 of the plan, as arithmetic. Every number on the summary either grows
   * or holds when a run ends; none of them falls. This is the rule the first
   * implementation broke — a live run counted today and an ended run did not,
   * so the lifetime total dropped by one at the exact moment somebody lapsed.
   */
  it("no headline number falls when a run ends", () => {
    let r = emptyRecord()
    r = startAttempt(r, { viceId: "s", label: "Cigarettes", startedOn: "2026-08-01", startedBy: "", structure: [], acknowledgedRisk: false, today: TODAY })
    const before = stats(r, TODAY)
    r = fileReport(r, {
      attemptId: r.attempts[0].id, at: `${TODAY}T22:00:00.000Z`, wentThrough: true,
      thought: "gave in", ending: "justone", closeness: 10,
      withWhom: "", where: "", factors: [], didInstead: "",
    })
    const after = stats(r, TODAY)

    expect(after.totalCleanDays).toBeGreaterThanOrEqual(before.totalCleanDays)
    expect(after.longestDays).toBeGreaterThanOrEqual(before.longestDays)
    expect(after.runs).toBeGreaterThanOrEqual(before.runs)
    expect(after.closeCallsSurvived).toBeGreaterThanOrEqual(before.closeCallsSurvived)
  })

  /**
   * A close call must never read as a failure anywhere in the arithmetic. It is
   * the thing the tool most wants people to file, and the moment filing one
   * makes a number look worse, people stop.
   */
  it("filing a close call costs the record nothing", () => {
    let r = emptyRecord()
    r = startAttempt(r, { viceId: "s", label: "Cigarettes", startedOn: "2026-08-01", startedBy: "", structure: [], acknowledgedRisk: false, today: TODAY })
    const before = stats(r, TODAY)
    r = fileReport(r, {
      attemptId: r.attempts[0].id, at: `${TODAY}T22:00:00.000Z`, wentThrough: false,
      thought: "maybe I could moderate", ending: "fine", closeness: 7,
      withWhom: "Alone", where: "Home", factors: ["A good stretch beforehand"], didInstead: "Read the chart",
    })
    const after = stats(r, TODAY)

    expect(after.currentDays).toBe(before.currentDays)
    expect(after.totalCleanDays).toBe(before.totalCleanDays)
    expect(after.longestDays).toBe(before.longestDays)
    expect(after.closeCallsSurvived).toBe(before.closeCallsSurvived + 1)
  })
})
