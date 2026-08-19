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
import { VICE_FLOWS } from "@/src/vice/data/flows"
import { PLAIN, GUIDED } from "@/src/vice/data/plain"
import { RESPOND, TRIPWIRE, URGE } from "@/src/vice/data/copy"

const words = (s: string) => s.trim().split(/\s+/).filter(Boolean).length

describe("no single screen opens with a wall of text", () => {
  it("keeps every step blurb short enough to read at a glance", () => {
    const over: string[] = []
    for (const flow of VICE_FLOWS) {
      for (const step of flow.steps) {
        // The blurb is the one line under the title. It is always visible and
        // it is the last thing that should be doing any explaining.
        if (words(step.blurb) > 32) over.push(`${flow.id}/${step.id}: ${words(step.blurb)}w`)
      }
    }
    expect(over, `blurbs over 32 words:\n  ${over.join("\n  ")}`).toEqual([])
  })

  it("keeps step titles to a phrase", () => {
    for (const flow of VICE_FLOWS) {
      for (const step of flow.steps) {
        expect(words(step.title), `${flow.id}/${step.id}`).toBeLessThanOrEqual(9)
      }
    }
  })

  it("allows long intro bodies only because they are folded away", () => {
    // Intro `body` paragraphs are the longest strings in the module and that
    // is fine — StepIntro shows the first and hides the rest behind a toggle.
    // If that ever changes, this budget is the thing that should start failing.
    const intro = VICE_FLOWS.flatMap((f) => f.steps.filter((s) => s.kind === "intro"))
    for (const step of intro) {
      const body = step.body ?? []
      if (body.length === 0) continue
      expect(words(body[0]), `${step.id} first paragraph is what people actually see`).toBeLessThanOrEqual(70)
    }
  })
})

describe("the acute surfaces stay short, because they are read in a bad moment", () => {
  it("keeps every urge-tool step blurb brief", () => {
    for (const [key, step] of Object.entries(URGE.steps)) {
      const blurb = (step as { blurb?: string }).blurb
      if (blurb) expect(words(blurb), `URGE.steps.${key}`).toBeLessThanOrEqual(30)
    }
  })

  it("keeps the four urge responses scannable", () => {
    for (const o of RESPOND.options) {
      expect(words(o.label), o.id).toBeLessThanOrEqual(7)
      expect(words(o.help), o.id).toBeLessThanOrEqual(22)
    }
  })

  it("keeps the tripwire's visible copy short and its reasoning folded", () => {
    expect(words(TRIPWIRE.blurb)).toBeLessThanOrEqual(32)
    for (const t of TRIPWIRE.thoughts) expect(words(t), t).toBeLessThanOrEqual(9)
  })
})

describe("the lean versions stay lean", () => {
  it("keeps every plain answer to a sentence", () => {
    expect(words(PLAIN.question)).toBeLessThanOrEqual(6)
    for (const a of PLAIN.answers) {
      expect(words(a.label), a.id).toBeLessThanOrEqual(9)
      if (a.sub) expect(words(a.sub), a.id).toBeLessThanOrEqual(10)
    }
  })

  it("keeps the guided doors to a label and a line", () => {
    for (const door of GUIDED.doors) {
      expect(words(door.label), door.id).toBeLessThanOrEqual(7)
      expect(words(door.sub), door.id).toBeLessThanOrEqual(10)
      for (const item of door.items) expect(words(item.label), item.id).toBeLessThanOrEqual(8)
    }
  })
})
