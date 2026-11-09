/**
 * A REVIEW CHANGE TOUCHES ONLY WHAT IT NAMES (alpha findings fast-review-01/02).
 *
 * Two devices on one review: each saves one choice, note or block. The server
 * applies that one change to what is stored, so the other device's saves stay.
 */

import { describe, it, expect } from "vitest"
import { applyReviewChange, applyReviewParts, BLOCK_CHANGED, BLOCK_GONE, CHOICE_AND_NOTE_CHANGED, CHOICE_CHANGED, nextReviewVersion, NOTE_CHANGED, readStoredReview, REVIEW_UNREADABLE, reviewToStore } from "@/src/audit/auditService"
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

  it("a note-only save leaves the stored choice alone (review of 3c01aebb: a pre-filled Do more overwrote a Keep)", () => {
    const base = { ...stored(), choices: { daygame: "keep" as const } }
    expect(applyReviewChange(base, { activity: "daygame", note: "Evenings", noteWas: "Mornings" })).toEqual({
      review: { ...base, notes: { daygame: "Evenings" } },
    })
  })

  it("refuses a choice when the stored one changed since the sheet opened, and takes it when it did not", () => {
    expect(applyReviewChange(stored(), { activity: "daygame", choice: "cut", choiceWas: null, note: "Mornings" })).toEqual({ error: CHOICE_CHANGED })
    expect(applyReviewChange(stored(), { activity: "scrolling", choice: "cut", choiceWas: "keep", note: "" })).toEqual({ error: CHOICE_CHANGED })
    const ok = applyReviewChange(stored(), { activity: "daygame", choice: "keep", choiceWas: "more", note: "Mornings" })
    expect("review" in ok && ok.review.choices).toEqual({ daygame: "keep" })
    const fresh = applyReviewChange(stored(), { activity: "scrolling", choice: "cut", choiceWas: null, note: "" })
    expect("review" in fresh && fresh.review.choices).toEqual({ daygame: "more", scrolling: "cut" })
    expect("error" in applyReviewChange(stored(), { activity: "daygame", choice: "keep", choiceWas: 5, note: "" })).toBe(true)
    expect(applyReviewChange(stored(), { activity: "daygame", choice: "keep", choiceWas: null, note: "x", noteWas: "" })).toEqual({ error: CHOICE_AND_NOTE_CHANGED })
  })

  it("adds a block with its copies on other days in one write (alpha picky-eye-07)", () => {
    const r = applyReviewChange(stored(), { block: block("g1", 0, 1020, 1080, "Gym"), copies: [block("g2", 2, 1020, 1080, "Gym"), block("g3", 4, 1020, 1080, "Gym")] })
    expect("review" in r && r.review.week.map((b) => [b.id, b.day])).toEqual([
      ["pc", 0],
      ["g1", 0],
      ["g2", 2],
      ["g3", 4],
    ])
  })

  it("adds no copy at all when one overlaps, and refuses a copy that reuses a stored id", () => {
    expect(applyReviewChange(stored(), { block: block("g1", 1, 600, 660, "Gym"), copies: [block("g2", 0, 600, 660, "Gym")] })).toEqual({ error: '"Gym" overlaps "Write the book" on Monday' })
    expect("error" in applyReviewChange(stored(), { block: block("g1", 1, 600, 660, "Gym"), copies: [block("pc", 2, 600, 660, "Gym")] })).toBe(true)
    expect("error" in applyReviewChange(stored(), { block: block("g1", 1, 600, 660, "Gym"), copies: "x" })).toBe(true)
  })

  it("changes a block and adds its copies", () => {
    const r = applyReviewChange(stored(), { block: block("pc", 0, 480, 600, "Book"), edit: true, copies: [block("c1", 3, 480, 600, "Book")] })
    expect("review" in r && r.review.week.map((b) => [b.id, b.day, b.what])).toEqual([
      ["pc", 0, "Book"],
      ["c1", 3, "Book"],
    ])
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

describe("a block edit carries the block as the sheet opened it (alpha prove-review-01)", () => {
  // PC moved "Write the book" 09:00-12:00 to 13:00-16:00; the phone, not reloaded, renames the old 09:00-12:00.
  const moved = (): Review => ({ ...stored(), week: [block("pc", 0, 780, 960, "Write the book")] })
  const stale = block("pc", 0, 540, 720, "Write the book")

  it("refuses when the stored block is not the one the sheet opened, and names the stored block", () => {
    const r = applyReviewChange(moved(), { block: block("pc", 0, 540, 720, "Write the book, chapter 2"), edit: true, blockWas: stale })
    expect(r).toEqual({ error: `${BLOCK_CHANGED}: now Monday 13:00–16:00, "Write the book" (Deep work)` })
  })

  it("applies the edit when the stored block is still the one the sheet opened", () => {
    const r = applyReviewChange(moved(), { block: block("pc", 0, 780, 960, "Write the book, chapter 2"), edit: true, blockWas: block("pc", 0, 780, 960, "Write the book") })
    expect("review" in r && r.review.week).toEqual([block("pc", 0, 780, 960, "Write the book, chapter 2")])
  })

  it("says the block is gone when it was removed elsewhere, and refuses a bad or misplaced blockWas", () => {
    expect(applyReviewChange(stored(), { block: block("gone", 1, 60, 120, "Old"), edit: true, blockWas: block("gone", 1, 60, 120, "Old") })).toEqual({ error: BLOCK_GONE })
    expect("error" in applyReviewChange(moved(), { block: stale, edit: true, blockWas: { id: "pc" } })).toBe(true)
    expect("error" in applyReviewChange(moved(), { block: stale, edit: true, blockWas: block("other", 0, 780, 960, "Write the book") })).toBe(true)
    expect(applyReviewChange(moved(), { activity: "x", note: "", blockWas: stale })).toEqual({ error: "Send one change" })
    expect(applyReviewChange(moved(), { removeBlock: "pc", blockWas: stale })).toEqual({ error: "Send one change" })
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
