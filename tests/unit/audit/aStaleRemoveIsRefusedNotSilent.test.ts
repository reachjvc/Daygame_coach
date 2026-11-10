/**
 * A STALE REMOVE IS REFUSED, NOT SILENT (alpha p9-review-03).
 *
 * "Gym" open on two devices; B renames it "Gym with Tom"; A, not reloaded,
 * presses Remove. The remove used to carry no block, so the server could not
 * check it and B's rename was lost with nobody told. A remove now carries the
 * block as the sheet saw it, like an edit, and is refused when the stored
 * block is different, naming what it is now.
 */
import { describe, expect, it } from "vitest"
import { applyReviewChange, BLOCK_CHANGED } from "@/src/audit/auditService"
import type { Review, WeekBlock } from "@/src/audit/types"

const gym = (what: string): WeekBlock => ({ id: "gym", day: 2, start: 17 * 60, end: 18 * 60, what, kind: "workout" })
const renamed = (): Review => ({ choices: {}, notes: {}, week: [gym("Gym with Tom")] })

describe("a remove that carries the block as the sheet saw it", () => {
  it("is refused when another device changed the block, naming it as stored", () => {
    expect(applyReviewChange(renamed(), { removeBlock: "gym", blockWas: gym("Gym") })).toEqual({
      error: `${BLOCK_CHANGED}: now Wednesday 17:00–18:00, "Gym with Tom" (Workout or hobby)`,
    })
  })

  it("removes the block when it is still the one the sheet saw", () => {
    expect(applyReviewChange(renamed(), { removeBlock: "gym", blockWas: gym("Gym with Tom") })).toEqual({ review: { ...renamed(), week: [] } })
  })

  it("is no change when the block is already gone", () => {
    const empty: Review = { choices: {}, notes: {}, week: [] }
    expect(applyReviewChange(empty, { removeBlock: "gym", blockWas: gym("Gym") })).toEqual({ review: empty })
  })

  it("refuses a blockWas that is not a block or not this block", () => {
    expect("error" in applyReviewChange(renamed(), { removeBlock: "gym", blockWas: { id: "gym" } })).toBe(true)
    expect("error" in applyReviewChange(renamed(), { removeBlock: "gym", blockWas: { ...gym("Gym"), id: "other" } })).toBe(true)
  })
})
