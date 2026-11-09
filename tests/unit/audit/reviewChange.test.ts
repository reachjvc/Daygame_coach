/**
 * A REVIEW CHANGE TOUCHES ONLY WHAT IT NAMES (alpha findings fast-review-01/02).
 *
 * Two devices on one review: each saves one choice, note or block. The server
 * applies that one change to what is stored, so the other device's saves stay.
 */

import { describe, it, expect } from "vitest"
import { applyReviewChange, applyReviewParts, BLOCK_GONE, nextReviewVersion, NOTE_CHANGED, readStoredReview, REVIEW_UNREADABLE, reviewToStore } from "@/src/audit/auditService"
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
    expect("error" in applyReviewChange(stored(), { block: block("b", 0, 0, 15, "x"), edit: "yes" })).toBe(true)
    expect("error" in applyReviewChange(stored(), { activity: "x", choice: "cut", note: "", noteWas: 3 })).toBe(true)
  })
})

describe("a change that would overwrite what it did not see", () => {
  it("refuses a note when the stored note changed since the sheet opened", () => {
    expect(applyReviewChange(stored(), { activity: "daygame", choice: "more", note: "Evenings", noteWas: "" })).toEqual({ error: NOTE_CHANGED })
    expect(applyReviewChange(stored(), { activity: "daygame", choice: "keep", note: "Evenings", noteWas: "Mornings" })).toEqual({
      review: { ...stored(), choices: { daygame: "keep" }, notes: { daygame: "Evenings" } },
    })
    expect("review" in applyReviewChange(stored(), { activity: "gym", choice: "keep", note: "x", noteWas: "" })).toBe(true)
  })

  it("refuses an edit of a block another device removed, instead of adding it back", () => {
    expect(applyReviewChange(stored(), { block: block("gone", 1, 60, 120, "Old"), edit: true })).toEqual({ error: BLOCK_GONE })
    const r = applyReviewChange(stored(), { block: block("pc", 0, 540, 600, "Book"), edit: true })
    expect("review" in r && r.review.week).toEqual([block("pc", 0, 540, 600, "Book")])
  })
})

describe("applyReviewParts (pages from before reviewChange)", () => {
  it("replaces only the parts sent, on top of the review as stored", () => {
    expect(applyReviewParts(stored(), { choices: { gym: "keep" }, notes: {} })).toEqual({ review: { choices: { gym: "keep" }, notes: {}, week: stored().week } })
    expect(applyReviewParts(stored(), { week: [] })).toEqual({ review: { ...stored(), week: [] } })
    expect("error" in applyReviewParts(stored(), { choices: { gym: "burn" } })).toBe(true)
  })
})

describe("readStoredReview and reviewToStore: a part that cannot be read is never written over", () => {
  const badWeek = [{ id: "x", day: 9, start: 0, end: 15, what: "Old shape", kind: "deep" }]
  it("names the unreadable parts", () => {
    expect(readStoredReview({ choices: { a: "more" }, week: badWeek })).toEqual({ review: { choices: { a: "more" }, notes: {}, week: [] }, unreadable: ["week"] })
    expect(readStoredReview({ choices: "no", notes: [1] }).unreadable).toEqual(["choices", "notes"])
    expect(readStoredReview({}).unreadable).toEqual([])
    expect(readStoredReview(null).unreadable).toEqual([])
  })

  it("carries an unreadable week through a choice change unchanged", () => {
    const raw = { choices: {}, notes: {}, week: badWeek }
    const { review } = readStoredReview(raw)
    const after = applyReviewChange(review, { activity: "gym", choice: "keep", note: "" })
    if (!("review" in after)) throw new Error("expected a review")
    expect(reviewToStore(raw, review, after.review)).toEqual({ value: { choices: { gym: "keep" }, notes: {}, week: badWeek } })
  })

  it("refuses a change to the unreadable part itself", () => {
    const raw = { week: badWeek }
    const { review } = readStoredReview(raw)
    const after = applyReviewChange(review, { block: block("n", 0, 0, 60, "New") })
    if (!("review" in after)) throw new Error("expected a review")
    expect(reviewToStore(raw, review, after.review)).toEqual({ error: REVIEW_UNREADABLE })
  })
})

describe("nextReviewVersion", () => {
  it("is always later than the version read, even when the clock is not", () => {
    const now = new Date("2026-11-09T10:00:00.000Z")
    expect(nextReviewVersion("2026-11-09T09:00:00.000Z", now)).toBe("2026-11-09T10:00:00.000Z")
    expect(nextReviewVersion("2026-11-09T10:00:00.000Z", now)).toBe("2026-11-09T10:00:00.001Z")
    expect(nextReviewVersion("2026-11-09T10:00:00.000999+00:00", now)).toBe("2026-11-09T10:00:00.001Z")
    expect(nextReviewVersion("2026-11-09T11:00:00.5+00:00", now)).toBe("2026-11-09T11:00:00.501Z")
  })
})
