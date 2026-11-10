/**
 * A SHEET CHANGED AFTER A LOST SAVE SAVES WHAT IT SHOWS (review of 8190829d,
 * sev 3).
 *
 * The block sheet keeps its ids while it is open, so a save sent again after a
 * lost reply is recognised. But when the person changed the sheet before
 * saving again, the save was refused "Two blocks share an id" (a copy stored by
 * the lost save), and a day he unticked kept the copy stored by the lost save,
 * a block he never asked for. The sheet now sends what it tried before
 * (`tried`): a stored block with one of those ids that is exactly one of those
 * tries is his own earlier write, so it is replaced or, unticked, removed. One
 * changed on another device since is refused, never written over.
 */
import { describe, expect, it } from "vitest"
import { applyReviewChange } from "@/src/audit/auditService"
import type { Review, WeekBlock } from "@/src/audit/types"

const block = (id: string, day: number, what = "Write the book", start = 9 * 60): WeekBlock => ({ id, day, start, end: start + 180, what, kind: "deep" })
const empty: Review = { choices: {}, notes: {}, week: [] }

function applied(stored: Review, change: unknown): Review {
  const r = applyReviewChange(stored, change)
  if (!("review" in r)) throw new Error(`refused: ${r.error}`)
  return r.review
}

// The first save: Monday, with copies on Wednesday and Friday. Its reply was lost, but it landed.
const first = { block: block("mon", 0), edit: false, copies: [block("wed", 2), block("fri", 4)] }
const tried = [first.block, ...first.copies]
const landed = applied(empty, first)

describe("a new block saved again after a lost reply, the sheet changed meanwhile", () => {
  it("saves the new name on every day, not refused as sharing an id", () => {
    const again = { block: block("mon", 0, "Write chapter 2"), edit: false, copies: [block("wed", 2, "Write chapter 2"), block("fri", 4, "Write chapter 2")], tried }
    const week = applied(landed, again).week
    expect(week.map((b) => [b.id, b.what])).toEqual([
      ["mon", "Write chapter 2"],
      ["wed", "Write chapter 2"],
      ["fri", "Write chapter 2"],
    ])
  })

  it("removes the copy on a day he unticked", () => {
    const again = { block: block("mon", 0), edit: false, copies: [block("wed", 2)], tried }
    expect(applied(landed, again).week.map((b) => b.id).sort()).toEqual(["mon", "wed"])
  })

  it("adds only what the sheet shows when the lost save never landed", () => {
    const again = { block: block("mon", 0), edit: false, copies: [block("wed", 2)], tried }
    expect(applied(empty, again).week.map((b) => b.id)).toEqual(["mon", "wed"])
  })

  it("keeps every other block", () => {
    const other = block("other", 3, "Gym", 18 * 60)
    const again = { block: block("mon", 0), edit: false, tried }
    expect(applied({ ...landed, week: [...landed.week, other] }, again).week.map((b) => b.id).sort()).toEqual(["mon", "other"])
  })

  it("refuses, naming it, when another device changed one of those blocks since", () => {
    const moved = landed.week.map((b) => (b.id === "fri" ? { ...b, start: 14 * 60, end: 17 * 60 } : b))
    const r = applyReviewChange({ ...landed, week: moved }, { block: block("mon", 0), edit: false, copies: [block("wed", 2)], tried })
    expect("error" in r && r.error).toMatch(/^Changed on another device: now Friday 14:00/)
  })
})

describe("an edit saved again after a lost reply, the sheet changed meanwhile", () => {
  it("is his own earlier write, not a change from another device, and an unticked copy goes", () => {
    const was = block("b", 0, "B")
    const lost = { block: block("b", 0, "B2"), edit: true, blockWas: was, copies: [block("c-tue", 1, "B2")] }
    const stored = applied({ ...empty, week: [was] }, lost)
    const again = { block: block("b", 0, "B3"), edit: true, blockWas: was, tried: [lost.block, ...lost.copies] }
    expect(applied(stored, again).week).toEqual([block("b", 0, "B3")])
  })
})

describe("tried", () => {
  it("must be blocks", () => {
    expect("error" in applyReviewChange(landed, { block: block("mon", 0), edit: false, tried: "x" })).toBe(true)
    expect("error" in applyReviewChange(landed, { block: block("mon", 0), edit: false, tried: [{ id: "mon" }] })).toBe(true)
  })
})
