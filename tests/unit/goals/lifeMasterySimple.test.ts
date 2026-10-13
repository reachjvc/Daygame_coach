import { describe, it, expect } from "vitest"
import { emptyLifeMasteryPlan, rungSentences } from "@/src/goals/lifeMasteryService"
import {
  DEFAULT_HORIZON, HORIZON_CHOICES, HORIZON_SCREEN, IDENTITY_PROMPTS, VISION_RUNGS, WHY_PROMPTS,
} from "@/src/goals/data/lifeMasteryWhy"

/*
 * What is left of the v1 flow's tests (`/test/life-mastery-v1`) is what the live
 * page also runs: `rungSentences`, which `northStarService` uses to assemble the
 * vision paragraph, and the horizon constants `StarTab` and `RecapTab` render.
 * The rest of `lifeMasteryService` is reached only from that lab.
 */

describe("lifeMasteryService — how far out the vision sits", () => {
  it("starts at ten years, the horizon he names most", () => {
    expect(emptyLifeMasteryPlan().horizonYears).toBe(10)
    expect(DEFAULT_HORIZON).toBe(10)
    expect(HORIZON_CHOICES).toContain(DEFAULT_HORIZON)
  })

  it("offers exactly the horizons the opening screen shows, in the same order", () => {
    expect(HORIZON_SCREEN.options.map((o) => o.years)).toEqual([...HORIZON_CHOICES])
    expect(HORIZON_SCREEN.options.filter((o) => !o.label.trim() || !o.note.trim())).toEqual([])
  })
})

describe("lifeMasteryService — assembling the vision from the ladder", () => {
  it("puts the lead in front of an answer that continues it", () => {
    expect(rungSentences("I wake up in", "a small house near the water"))
      .toEqual(["I wake up in a small house near the water."])
  })

  it("leaves out the lead when the answer is already a sentence about you", () => {
    expect(rungSentences("My body feels", "I train at six every morning"))
      .toEqual(["I train at six every morning."])
  })

  it("keeps the lead in front of a noun phrase that only looks like a sentence", () => {
    expect(rungSentences("The people around me are", "my partner and our two kids"))
      .toEqual(["The people around me are my partner and our two kids."])
    expect(rungSentences("The people around me are", "our neighbours, who we actually know"))
      .toEqual(["The people around me are our neighbours, who we actually know."])
  })

  it("does not print the lead twice when the answer repeats it", () => {
    expect(rungSentences("My body feels", "My body feels strong"))
      .toEqual(["My body feels strong."])
  })

  it("keeps a lead that the sentence needs, even before an I", () => {
    expect(rungSentences("If nothing was in the way,", "I would own the building"))
      .toEqual(["If nothing was in the way, I would own the building."])
  })

  it("turns each extra line into its own sentence", () => {
    expect(rungSentences("I wake up in", "a small house\nThe window is open\n\n  "))
      .toEqual(["I wake up in a small house.", "The window is open."])
  })

  it("keeps punctuation the writer already made", () => {
    expect(rungSentences("My days go into", "the business. I finish by four!"))
      .toEqual(["My days go into the business. I finish by four!"])
  })

  it("returns nothing for a rung that was skipped", () => {
    expect(rungSentences("I wake up in", "   ")).toEqual([])
  })
})

describe("lifeMasteryWhy — the questions", () => {
  it("attributes every quote to a video", () => {
    const all = [...VISION_RUNGS, ...WHY_PROMPTS, ...IDENTITY_PROMPTS]
    expect(all.filter((q) => q.quote && !q.quoteVideoId)).toEqual([])
  })
})
