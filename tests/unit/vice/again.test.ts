/**
 * "I have tried before" — the attempt review.
 *
 * The corpus's own highest-value question was *what was different on the
 * attempt that finally worked*, and its answer is unusually consistent: the
 * difference is structural, and it is learned from the specific way the last
 * attempt ended. These tests guard the two things a later edit would most
 * likely break — keying the response to the ending, and refusing to turn the
 * screen into encouragement.
 */

import { describe, it, expect } from "vitest"
import { AGAIN, DIFFERENCES, ENDINGS } from "@/src/vice/data/again"
import { LANGUAGE_RULES } from "@/src/vice/data/copy"

describe("the endings drive the advice", () => {
  it("covers the endings people actually report, including the dominant one", () => {
    const ids = ENDINGS.map((e) => e.id)
    // "I felt fine and thought I could handle it" is the most-reported pattern
    // across eight sources; a list without it misses the main case.
    expect(ids).toContain("fine")
    expect(ids).toContain("justone")
    expect(ids).toContain("drink")
    // And a route for somebody on their first attempt, so the screen is not a
    // dead end for them.
    expect(ids).toContain("never")
  })

  it("gives every ending a specific answer rather than one generic one", () => {
    const answers = ENDINGS.map((e) => e.answer)
    expect(new Set(answers).size).toBe(ENDINGS.length)
    for (const e of ENDINGS) expect(e.answer.length, e.id).toBeGreaterThan(80)
  })

  it("never answers with try harder", () => {
    const all = [AGAIN.frame, AGAIN.blurb, ...ENDINGS.map((e) => e.answer), ...DIFFERENCES.map((d) => d.help)].join(" ")
    // The one answer the accounts never give. More motivation, more willpower
    // and more facts about harm are conspicuously absent from every "this time
    // was different" story in the corpus.
    expect(all).not.toMatch(/try harder|more willpower|more motivation than|be stronger/i)
  })
})

describe("the five differences are structural, not motivational", () => {
  it("names the changes the corpus actually credits", () => {
    const ids = DIFFERENCES.map((d) => d.id)
    expect(ids).toEqual(["settled", "absolute", "drug", "second", "room"])
  })

  it("includes medication, which people are least likely to know about", () => {
    const drug = DIFFERENCES.find((d) => d.id === "drug")!
    expect(drug.help).toMatch(/medication|drinking, opioids and nicotine/i)
  })
})

describe("the screen stays honest", () => {
  it("keeps the counter-evidence that some quits have no story", () => {
    // One man succeeded at the worst moment of his life describing himself as
    // having the weakest will of anyone. Insisting on a narrative would be a lie.
    expect(AGAIN.counter.length).toBeGreaterThan(120)
    expect(AGAIN.counter).toMatch(/no story|nothing here fits/i)
  })

  it("says plainly when nothing is in place rather than softening it", () => {
    expect(AGAIN.noneYet).toMatch(/go and do|worth knowing/i)
    expect(AGAIN.noneYet).not.toMatch(/don't worry|that's okay|no problem/i)
  })

  it("proposes recovery time after a lapse instead of a streak", () => {
    expect(AGAIN.metric).toMatch(/how fast you came back|stopped counting time since/i)
  })

  it("obeys the module's language rules", () => {
    const control = new RegExp(`\\b(${LANGUAGE_RULES.bannedControl.join("|")})\\b`, "i")
    const cheer = new RegExp(LANGUAGE_RULES.bannedCheer.join("|"), "i")
    const machine = new RegExp(LANGUAGE_RULES.bannedMachineTells.join("|"), "i")
    const strings = [
      AGAIN.title, AGAIN.blurb, AGAIN.frame, AGAIN.counter, AGAIN.metric, AGAIN.noneYet,
      ...ENDINGS.flatMap((e) => [e.label, e.answer]),
      ...DIFFERENCES.flatMap((d) => [d.label, d.help]),
    ]
    for (const s of strings) {
      expect(control.test(s), `controlling: ${s.slice(0, 60)}`).toBe(false)
      expect(cheer.test(s), `cheer: ${s.slice(0, 60)}`).toBe(false)
      expect(machine.test(s), `machine-written: ${s.slice(0, 60)}`).toBe(false)
    }
  })
})
