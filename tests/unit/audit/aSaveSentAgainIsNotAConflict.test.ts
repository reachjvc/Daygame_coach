/**
 * A SAVE SENT AGAIN IS NOT A CONFLICT (alpha p9-review-04/05).
 *
 * A save whose reply is lost has landed; pressed again, the same change used
 * to be refused as "changed on another device" (the choice and note, a stale
 * block edit) or as overlapping itself (a new block and its copies). The
 * server now recognises its own earlier write: when what is stored is exactly
 * what is sent, the save is done and nothing changes.
 */
import { describe, expect, it } from "vitest"
import { applyReviewChange } from "@/src/audit/auditService"
import type { Review, WeekBlock } from "@/src/audit/types"

const book = (id: string, day: number, what = "Write the book"): WeekBlock => ({ id, day, start: 9 * 60, end: 12 * 60, what, kind: "deep" })

function applied(stored: Review, change: unknown): Review {
  const r = applyReviewChange(stored, change)
  if (!("review" in r)) throw new Error(`refused: ${r.error}`)
  return r.review
}

describe("a choice and note sent again", () => {
  const change = { activity: "scrolling", choice: "cut", choiceWas: null, note: "Phone out of the bedroom", noteWas: "" }

  it("is saved, not called a change from another device", () => {
    const once = applied({ choices: {}, notes: {}, week: [] }, change)
    expect(applyReviewChange(once, change)).toEqual({ review: once })
  })

  it("still refuses when another device stored something else", () => {
    const other: Review = { choices: { scrolling: "keep" }, notes: { scrolling: "Phone out of the bedroom" }, week: [] }
    expect("error" in applyReviewChange(other, change)).toBe(true)
  })
})

describe("a new block with copies sent again", () => {
  const change = { block: book("b1", 0), edit: false, copies: [book("b1-wed", 2)] }

  it("is saved, not said to overlap itself or share an id", () => {
    const once = applied({ choices: {}, notes: {}, week: [] }, change)
    expect(once.week).toHaveLength(2)
    expect(applyReviewChange(once, change)).toEqual({ review: once })
  })

  it("still refuses a copy whose id holds a different block", () => {
    const once = applied({ choices: {}, notes: {}, week: [] }, change)
    expect("error" in applyReviewChange(once, { ...change, copies: [book("b1-wed", 3)] })).toBe(true)
  })
})

describe("a stale block edit sent again", () => {
  it("is saved when the stored block is already the one sent", () => {
    const was = book("b", 0, "B")
    const change = { block: book("b", 0, "B2"), edit: true, blockWas: was }
    const once = applied({ choices: {}, notes: {}, week: [was] }, change)
    expect(applyReviewChange(once, change)).toEqual({ review: once })
  })
})
