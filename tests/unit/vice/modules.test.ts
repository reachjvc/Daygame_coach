/**
 * The teaching spine.
 *
 * Everything before this was a toolbox — reactive tools, two assessment flows,
 * a checklist and a library. Useful, but nothing taught anything: no sequence,
 * nothing saying what a person would understand afterwards, and the strongest
 * findings buried inside `Why` disclosures on screens people only reach in a
 * crisis.
 *
 * These guard the properties that make a module a module rather than another
 * place to put the same work.
 */

import { describe, it, expect } from "vitest"
import { MODULES, MODULES_COPY } from "@/src/vice/data/modules"
import { LANGUAGE_RULES } from "@/src/vice/data/copy"
import { TESTIMONIALS } from "@/src/vice/data/testimonials"

describe("every module is one idea, one exercise and real accounts", () => {
  it("gives each a takeaway that stands alone", () => {
    // Somebody who reads only this line has still got the useful part.
    for (const m of MODULES) {
      expect(m.takeaway.length, m.id).toBeGreaterThan(30)
      expect(m.takeaway.split(/\s+/).length, `${m.id} takeaway is too long to be a takeaway`).toBeLessThanOrEqual(26)
    }
  })

  it("points every module at an exercise that already exists", () => {
    // A module is a frame around a tool, never a new place to do the same work.
    for (const m of MODULES) {
      const routed = Boolean(m.exercise.tool || m.exercise.flow || m.exercise.href)
      expect(routed, `${m.id} has no exercise`).toBe(true)
    }
  })

  it("has accounts to show under every module", () => {
    for (const m of MODULES) {
      const available = TESTIMONIALS.filter((t) => t.stages.includes(m.accounts)).length
      expect(available, `${m.id} points at an empty stage "${m.accounts}"`).toBeGreaterThan(0)
    }
  })

  it("cites something specific in every evidence note", () => {
    // No hand-waving: each names a quantity, a study or a source count. The
    // check accepts spelled-out numbers because that is the module's house
    // style throughout — "ninety seconds", "four mentions against ten" — and
    // a digits-only rule would be testing the wrong convention.
    const QUANTIFIED =
      /\d|\b(one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|dozens|ninety|forty|seventy|percent|sources|studies|trials?|RCT)\b/i
    for (const m of MODULES) {
      expect(m.evidence, `${m.id} evidence names no quantity or source`).toMatch(QUANTIFIED)
      expect(m.evidence.length, m.id).toBeGreaterThan(120)
    }
  })
})

describe("the order is the awareness order", () => {
  it("opens with the count rather than with a technique", () => {
    // ~95% of people who met criteria and got no help said they did not think
    // they needed any. Teaching a technique first is aimed at the wrong problem.
    expect(MODULES[0].id).toBe("cannot-see")
  })

  it("puts the environment module before anything about willpower or resolve", () => {
    const env = MODULES.findIndex((m) => m.id === "environment")
    const good = MODULES.findIndex((m) => m.id === "good-stretch")
    expect(env).toBeLessThan(good)
  })

  it("says plainly that nothing is a prerequisite", () => {
    // Readiness-gating is contradicted by the corpus: two durable quits in it
    // began with no wish to stop at all.
    expect(MODULES_COPY.frame).toMatch(/nothing is a prerequisite|Nothing is a prerequisite/i)
  })
})

describe("it does not become a daily habit product", () => {
  it("has a fixed, finite list", () => {
    expect(MODULES).toHaveLength(9)
  })

  it("tells people there is no reason to be here every day", () => {
    // The opposite of what a retention-optimised product says, and what the
    // evidence supports: proportion of recovery-focused activity carries OR
    // 5.00 for a use episode.
    expect(MODULES_COPY.ejectNote).toMatch(/no daily module|every day/i)
  })

  it("refuses to call the progress count a score", () => {
    expect(MODULES_COPY.progressNote).toMatch(/not a score/i)
    expect(MODULES_COPY.progressNote).toMatch(/skipping/i)
  })
})

describe("the modules obey the module's language rules", () => {
  it("has no controlling language, cheer or machine phrasing", () => {
    const control = new RegExp(`\\b(${LANGUAGE_RULES.bannedControl.join("|")})\\b`, "i")
    const cheer = new RegExp(LANGUAGE_RULES.bannedCheer.join("|"), "i")
    const machine = new RegExp(LANGUAGE_RULES.bannedMachineTells.join("|"), "i")
    const strings = [
      ...Object.values(MODULES_COPY),
      ...MODULES.flatMap((m) => [m.title, m.premise, m.takeaway, m.evidence, m.exercise.label]),
    ]
    for (const s of strings) {
      expect(control.test(s), `controlling: ${s.slice(0, 70)}`).toBe(false)
      expect(cheer.test(s), `cheer: ${s.slice(0, 70)}`).toBe(false)
      expect(machine.test(s), `machine-written: ${s.slice(0, 70)}`).toBe(false)
    }
  })
})
