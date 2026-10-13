/**
 * Word budgets, so the bloat cannot creep back.
 *
 * The module reached roughly 9,700 words of copy — about forty-four minutes of
 * reading — in front of somebody who is ambivalent by definition and may have
 * arrived at eleven at night. No single commit did that. Every one of them
 * added a paragraph that was, on its own, worth reading.
 *
 * That is exactly the failure a lint can prevent and a reviewer cannot: the
 * increments are all defensible and the total is not. So there are ceilings
 * here, and the way to satisfy them is to move the reasoning behind a `Why`
 * disclosure — what to do stays visible, why it works folds away — not to
 * raise the number.
 */

import { describe, it, expect } from "vitest"
import { RESPOND } from "@/src/vice/data/copy"

const words = (s: string) => s.trim().split(/\s+/).filter(Boolean).length

/**
 * Only the urge responses are budgeted here now: they are what /life-mastery/quit-vice
 * shows mid-urge (`UrgeNow`). The flow, urge-tool, tripwire and lean-version budgets
 * guarded copy that only the archived lab renders, and were retired with its tests.
 */
describe("the acute surfaces stay short, because they are read in a bad moment", () => {
  it("keeps the four urge responses scannable", () => {
    for (const o of RESPOND.options) {
      expect(words(o.label), o.id).toBeLessThanOrEqual(7)
      expect(words(o.help), o.id).toBeLessThanOrEqual(22)
    }
  })
})
