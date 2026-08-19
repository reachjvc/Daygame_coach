/**
 * What each area offers before you have written anything.
 *
 * Everything on this page that arrives pre-filled is a claim about the person:
 * open Money and the page says "here is what people set in Money". A bench
 * press in that list is not a small mistake — it says the page has not
 * understood the question, and it is the third time this class of thing has
 * been reported (dating templates under Mind & Beliefs, five areas sharing one
 * pillar's objectives, a bench goal read as Money's).
 *
 * The rule these tests enforce: an area may offer its neighbours' things, and
 * never a stranger's. It lives in `fixtures/areaLanguage.ts`, because the same
 * rule now also governs the examples in the empty boxes — see
 * `northStarAreaBoxes.test.tsx`, which is the door the bug was reported through
 * the second time.
 */

import { describe, expect, it } from "vitest"
import { emptyNsPlan } from "@/src/goals/northStarService"
import {
  areaGoalExample,
  areaObjectives,
  areaOffer,
  areaOffersFor,
  areaOfferNote,
  areaPractices,
  areaTemplates,
} from "@/src/goals/northStarService"
import { AREA_GOAL_EXAMPLES, BUILDER_COPY, NEUTRAL_GOAL_EXAMPLE, SYSTEM_BUILDER_COPY } from "@/src/goals/data/northStarStart"
import { belongsElsewhere } from "./fixtures/areaLanguage"

const AREAS = emptyNsPlan().areas

describe("every area offers things that belong to it", () => {
  it.each(AREAS.map((a) => [a.label, a] as const))("%s offers no other area's goals", (_label, area) => {
    const offenders = areaObjectives(area)
      .flatMap((o) => o.targets.map((t) => t.label))
      .map((title) => ({ title, why: belongsElsewhere(title, area.id) }))
      .filter((x) => x.why)
      .map((x) => `${x.title} — ${x.why}`)
    expect(offenders).toEqual([])
  })

  it.each(AREAS.map((a) => [a.label, a] as const))("%s offers no other area's sets", (_label, area) => {
    const offenders = areaTemplates(area)
      .map((t) => ({ title: t.label, why: belongsElsewhere(t.label, area.id) }))
      .filter((x) => x.why)
      .map((x) => `${x.title} — ${x.why}`)
    expect(offenders).toEqual([])
  })

  it.each(AREAS.map((a) => [a.label, a] as const))("%s offers no other area's practices", (_label, area) => {
    const offenders = areaPractices(area)
      .map((p) => ({ title: p.title, why: belongsElsewhere(p.title, area.id) }))
      .filter((x) => x.why)
      .map((x) => `${x.title} — ${x.why}`)
    expect(offenders).toEqual([])
  })
})

describe("the offers are worth showing at all", () => {
  it("gives every built-in area either something to offer or a reason it has none", () => {
    // An area with an empty catalogue and no note renders a heading over
    // nothing, which reads as broken rather than as honest.
    for (const area of AREAS) {
      const has =
        areaObjectives(area).some((o) => o.targets.length > 0) ||
        areaTemplates(area).length > 0 ||
        areaPractices(area).length > 0
      expect(has || areaOfferNote(area) != null, `${area.label} offers nothing and says nothing`).toBe(true)
    }
  })

  it("never offers the same goal twice inside one area", () => {
    for (const area of AREAS) {
      // The pillar map is a five-into-twelve fit and objectives overlap, so a
      // target can arrive down two paths: Money holds Build Income and
      // Financial Freedom, and both used to claim "Monthly Profit".
      const titles = areaObjectives(area).flatMap((o) => o.targets.map((t) => `${o.objective.id}:${t.label}`))
      expect(new Set(titles).size, `${area.label} repeats a goal`).toBe(titles.length)
    }
  })

  it("keeps an area the person invented out of the catalogue's way", () => {
    // A user-added area has no assignment, so it falls back to its pillar —
    // and where there is no pillar either, it must offer nothing rather than
    // everything.
    const invented = { id: "custom-1", label: "Surfing", color: "#fff", rating: null, ten: "" }
    const offer = areaOffer(invented as never)
    expect(offer === null || offer.objectiveIds.length > 0).toBe(true)
  })
})

describe("the twelve areas do not quietly become one", () => {
  it("gives the areas different catalogues", () => {
    // Five areas landed on `meaning` once and were offered each other's
    // objectives — the board showed the same card four times.
    const byArea = AREAS.map((a) => areaObjectives(a).map((o) => o.objective.id).sort().join(","))
    const distinct = new Set(byArea.filter(Boolean))
    expect(distinct.size).toBeGreaterThanOrEqual(8)
  })

  it("does not put a lift in Money, which is the one that got reported", () => {
    const money = AREAS.find((a) => a.id === "lm_money")!
    const titles = [
      ...areaObjectives(money).flatMap((o) => o.targets.map((t) => t.label)),
      ...areaTemplates(money).map((t) => t.label),
      ...areaPractices(money).map((p) => p.title),
    ].join(" | ").toLowerCase()
    expect(titles).not.toMatch(/bench|squat|deadlift|pull-up|bænk/)
  })
})

/**
 * WHAT IS PREFILLED MUST MATCH THE BOX IT IS IN.
 *
 * Reported from the page: switching Fitness from Milestones to Systems changed
 * a line of copy and nothing else, so the systems half sat there offering
 * "Bench Press 1RM" as a thing to do on a Tuesday. A bench of a hundred kilos
 * is not a system — the system is going to the gym four times a week — and a
 * page that offers one where it asked for the other teaches the opposite of
 * the distinction it just drew.
 */
describe("each half offers its own kind, or nothing", () => {
  it.each(AREAS.map((a) => [a.label, a] as const))("%s offers no targets or sets under Systems", (_label, area) => {
    const offers = areaOffersFor(area, "systems")
    expect(offers.objectives).toEqual([])
    expect(offers.templates).toEqual([])
  })

  it.each(AREAS.map((a) => [a.label, a] as const))("%s offers no practices under Milestones", (_label, area) => {
    // A practice is a thing you do every week. On the wanting half it reads as
    // a chore somebody is supposed to find motivating.
    expect(areaOffersFor(area, "milestones").practices).toEqual([])
  })

  it("offers a system-shaped thing under Systems, where there is one", () => {
    const fitness = AREAS.find((a) => a.id === "lm_fitness")!
    const practices = areaOffersFor(fitness, "systems").practices
    expect(practices.length).toBeGreaterThan(0)
    for (const practice of practices) {
      // Every one of them is something you do at a rate, not a number you
      // climb to: "Strength session", not "Bench Press 1RM".
      expect(practice.daysPerWeek).toBeGreaterThan(0)
      expect(practice.title).not.toMatch(/\b1RM\b|\bmax\b/i)
    }
  })

  it("never offers the same title in both halves of one area", () => {
    for (const area of AREAS) {
      const milestones = areaOffersFor(area, "milestones")
      const systems = areaOffersFor(area, "systems")
      const wanted = new Set([
        ...milestones.objectives.flatMap((o) => o.targets.map((t) => t.label.toLowerCase())),
        ...milestones.templates.map((t) => t.label.toLowerCase()),
      ])
      for (const practice of systems.practices) {
        expect(wanted.has(practice.title.toLowerCase()), `${area.label}: ${practice.title}`).toBe(false)
      }
    }
  })

  it("asks a different question in each half, in the box itself", () => {
    // The prefill can be right and the label still wrong: "Everything you want
    // in Fitness" over a box asking for systems is the same bug in words.
    const fitness = areaGoalExample("lm_fitness")
    expect(SYSTEM_BUILDER_COPY.title("Fitness")).not.toBe(BUILDER_COPY.title("Fitness"))
    expect(SYSTEM_BUILDER_COPY.placeholder(fitness.action)).not.toBe(BUILDER_COPY.placeholder(fitness.want))
    expect(SYSTEM_BUILDER_COPY.empty("Fitness")).not.toBe(BUILDER_COPY.empty("Fitness"))
    expect(SYSTEM_BUILDER_COPY.title("Fitness")).toMatch(/do/i)
    expect(BUILDER_COPY.title("Fitness")).toMatch(/want/i)
  })

  /**
   * THE EXAMPLES IN THE EMPTY BOXES, WHICH ARE ALSO A PREFILL.
   *
   * Reported from the page: Relationship's goal box said "e.g. Flat bench 100
   * kg". One string served twelve areas, so eleven of them illustrated the
   * question with somebody else's life. The catalogue had already been held to
   * this rule; the examples had not, so the same bug came back through a
   * different door. Both go through `belongsElsewhere` now.
   */
  it.each(AREAS.map((a) => [a.label, a] as const))("%s writes its examples in its own language", (_label, area) => {
    const example = areaGoalExample(area.id)
    const lines = [example.want, example.action, example.units, ...example.rungs]
    const offenders = lines
      .map((line) => ({ line, why: belongsElsewhere(line, area.id) }))
      .filter((x) => x.why)
      .map((x) => `${x.line} — ${x.why}`)
    expect(offenders).toEqual([])
  })

  it("gives every built-in area its own examples rather than the neutral ones", () => {
    // The neutral set is for an area somebody invented. An built-in area
    // falling back to it means twelve areas share one box again.
    for (const area of AREAS) {
      expect(AREA_GOAL_EXAMPLES[area.id], `${area.label} has no examples`).toBeTruthy()
      expect(areaGoalExample(area.id).want).not.toBe(NEUTRAL_GOAL_EXAMPLE.want)
    }
  })

  it("gives an area somebody invented a neutral box rather than a stranger's life", () => {
    const example = areaGoalExample("custom-1")
    expect(example).toEqual(NEUTRAL_GOAL_EXAMPLE)
    expect(example.want.toLowerCase()).not.toMatch(/bench|squat|gym|girlfriend/)
  })

  it("writes the want, the action and the rungs as three different shapes", () => {
    for (const area of AREAS) {
      const { want, action, rungs } = areaGoalExample(area.id)
      // An action carries a rate; a want does not have to and mostly should not.
      expect(action.toLowerCase(), `${area.label} action has no rate`).toMatch(/week|month|day|every|morning|night|sunday/)
      expect(want.trim().length, `${area.label} want is empty`).toBeGreaterThan(0)
      expect(rungs.length, `${area.label} needs a progression of at least three`).toBeGreaterThanOrEqual(3)
      expect(new Set(rungs).size, `${area.label} repeats a rung`).toBe(rungs.length)
    }
  })

  it("keeps the whole sets, which are the milestone half's best offer", () => {
    // They vanished from the page once — worth pinning that they are still on
    // offer where they belong.
    const fitness = AREAS.find((a) => a.id === "lm_fitness")!
    expect(areaOffersFor(fitness, "milestones").templates.length).toBeGreaterThan(0)
    expect(areaOffersFor(fitness, "milestones").objectives.length).toBeGreaterThan(0)
  })
})
