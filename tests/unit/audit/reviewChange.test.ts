/**
 * A REVIEW CHANGE TOUCHES ONLY WHAT IT NAMES (alpha findings fast-review-01/02).
 *
 * Two devices on one review: each saves one choice, note or block. The server
 * applies that one change to what is stored, so the other device's saves stay.
 */

import { describe, it, expect } from "vitest"
import { applyReviewChange } from "@/src/audit/auditService"
import type { Review, WeekBlock } from "@/src/audit/types"

const block = (id: string, day: number, start: number, end: number, what: string): WeekBlock => ({ id, day, start, end, what, kind: "deep" })
const stored = (): Review => ({
  choices: { daygame: "more" },
  notes: { daygame: "Mornings" },
  week: [block("pc", 0, 540, 720, "Write the book")],
})

describe("applyReviewChange", () => {
  it("sets one activity's choice and note and keeps every other activity", () => {
    expect(applyReviewChange(stored(), { activity: "scrolling", choice: "cut", note: "Phone away" })).toEqual({
      review: { ...stored(), choices: { daygame: "more", scrolling: "cut" }, notes: { daygame: "Mornings", scrolling: "Phone away" } },
    })
  })

  it("clears one activity's choice and note when sent empty", () => {
    expect(applyReviewChange(stored(), { activity: "daygame", choice: null, note: "  " })).toEqual({ review: { ...stored(), choices: {}, notes: {} } })
  })

  it("adds a block next to the stored ones", () => {
    const r = applyReviewChange(stored(), { block: block("phone", 1, 1020, 1080, "Gym") })
    expect("review" in r && r.review.week.map((b) => b.what)).toEqual(["Write the book", "Gym"])
    expect("review" in r && r.review.choices).toEqual({ daygame: "more" })
  })

  it("changes a block by its id and leaves the others", () => {
    const base = { ...stored(), week: [...stored().week, block("b2", 2, 600, 660, "Calls")] }
    const r = applyReviewChange(base, { block: block("pc", 0, 480, 600, "Book") })
    expect("review" in r && r.review.week).toEqual([block("pc", 0, 480, 600, "Book"), block("b2", 2, 600, 660, "Calls")])
  })

  it("removes one block, and removing one already gone changes nothing", () => {
    const base = { ...stored(), week: [...stored().week, block("b2", 2, 600, 660, "Calls")] }
    const r = applyReviewChange(base, { removeBlock: "pc" })
    expect("review" in r && r.review.week.map((b) => b.id)).toEqual(["b2"])
    expect(applyReviewChange(stored(), { removeBlock: "gone" })).toEqual({ review: stored() })
  })

  it("refuses a block that overlaps one saved from another device, naming both", () => {
    expect(applyReviewChange(stored(), { block: block("phone", 0, 600, 660, "Gym") })).toEqual({ error: '"Gym" overlaps "Write the book" on Monday' })
  })

  it("refuses anything else", () => {
    expect("error" in applyReviewChange(stored(), null)).toBe(true)
    expect("error" in applyReviewChange(stored(), {})).toBe(true)
    expect("error" in applyReviewChange(stored(), { activity: "x", choice: "burn", note: "" })).toBe(true)
    expect("error" in applyReviewChange(stored(), { activity: "", choice: "cut", note: "" })).toBe(true)
    expect("error" in applyReviewChange(stored(), { activity: "x", choice: "cut", note: "y".repeat(2001) })).toBe(true)
    expect("error" in applyReviewChange(stored(), { block: { id: "x" } })).toBe(true)
    expect("error" in applyReviewChange(stored(), { removeBlock: 5 })).toBe(true)
    expect("error" in applyReviewChange(stored(), { removeBlock: "a", block: block("b", 0, 0, 15, "x") })).toBe(true)
  })
})
