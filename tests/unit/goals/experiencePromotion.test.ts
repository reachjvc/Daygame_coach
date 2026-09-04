/**
 * A DREAM YOU DECIDED TO CHASE APPEARS ONCE.
 *
 * `promoteExperience` has existed and worked for a while: it turns a bucket-list
 * line into a finish-line goal and leaves the line in the list on purpose. What
 * it did not do was stop the standing list drawing both, so the same dream was
 * on screen twice — once tickable, once not — and nothing said they were the
 * same thing.
 */

import { describe, it, expect } from "vitest"
import {
  addExperiences,
  emptyNsPlan,
  promoteExperience,
  toggleExperienceDone,
} from "@/src/goals/northStarService"
import { standingItems } from "@/src/goals/northStarTrackService"

const NOW = "2026-09-03T10:00:00.000Z"
const TODAY = "2026-09-03"

const withDream = (title = "See the northern lights") => {
  const plan = addExperiences(emptyNsPlan(), title, null, NOW)
  return { plan, id: plan.experiences[plan.experiences.length - 1].id }
}

describe("promoting a dream", () => {
  it("makes one finish-line goal and keeps the line in the list", () => {
    const { plan, id } = withDream()
    const next = promoteExperience(plan, id, "lm_fun", NOW)

    expect(next.goals).toHaveLength(1)
    expect(next.goals[0].type).toBe("achievement")
    expect(next.goals[0].title).toBe("See the northern lights")
    expect(next.experiences).toHaveLength(1)
    expect(next.experiences[0].goalId).toBe(next.goals[0].id)
  })

  it("is never a climb, whatever numbers are in the line", () => {
    // "Three countries this year" is a thing to have done. Spacing four rungs
    // between here and three countries is the goal machinery arriving where it
    // was not invited.
    const { plan, id } = withDream("Visit 3 countries this year")
    const next = promoteExperience(plan, id, "lm_fun", NOW)
    expect(next.goals[0].type).toBe("achievement")
    expect(next.goals[0].ladder).toBeNull()
  })

  it("promoting twice makes one goal, not two", () => {
    const { plan, id } = withDream()
    const once = promoteExperience(plan, id, "lm_fun", NOW)
    const twice = promoteExperience(once, id, "lm_fun", NOW)
    expect(twice.goals).toHaveLength(1)
  })
})

describe("it is listed once, not twice", () => {
  /**
   * The assertion is on the WHOLE list, because either half alone looks correct:
   * the goal is a legitimate milestone and the experience is a legitimate
   * experience. Only together are they a duplicate.
   */
  it("shows a promoted dream once across both halves of the standing list", () => {
    const { plan, id } = withDream()
    const next = promoteExperience(plan, id, "lm_fun", NOW)

    const titles = standingItems(next).map((i) => i.title)
    expect(titles.filter((t) => t === "See the northern lights")).toHaveLength(1)
  })

  it("keeps the tickable one — the experience, because a plan goal cannot tick", () => {
    const { plan, id } = withDream()
    const next = promoteExperience(plan, id, "lm_fun", NOW)

    const item = standingItems(next).find((i) => i.title === "See the northern lights")
    expect(item?.kind).toBe("experience")
  })

  it("still shows a dream nobody has promoted", () => {
    const { plan } = withDream()
    const titles = standingItems(plan).map((i) => i.title)
    expect(titles).toContain("See the northern lights")
  })

  it("still shows goals that did not come from a dream", () => {
    const { plan, id } = withDream()
    const next = promoteExperience(plan, id, "lm_fun", NOW)
    // A second, ordinary finish line must be unaffected by the filter.
    const withOwn = { ...next, goals: [...next.goals, { ...next.goals[0], id: "g_other", title: "Get the licence" }] }
    const titles = standingItems(withOwn).map((i) => i.title)
    expect(titles).toContain("Get the licence")
  })

  it("ticking the dream still works after it has been promoted", () => {
    const { plan, id } = withDream()
    const next = toggleExperienceDone(promoteExperience(plan, id, "lm_fun", NOW), id, TODAY, NOW)
    expect(next.experiences[0].done).toBe(true)
    expect(next.experiences[0].doneOn).toBe(TODAY)
    expect(standingItems(next).find((i) => i.title === "See the northern lights")?.done).toBe(true)
  })
})
