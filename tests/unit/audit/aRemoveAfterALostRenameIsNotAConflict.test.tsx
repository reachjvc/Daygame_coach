// @vitest-environment jsdom
/**
 * A REMOVE AFTER THIS DEVICE'S OWN LOST RENAME IS NOT A CONFLICT
 * (alpha p10-review-pings-02, sev 4).
 *
 * "Gym" renamed "Gym legs", the reply lost (the rename was stored), then
 * Remove: refused "Changed on another device: now ... Gym legs", his own
 * rename. The remove now carries the blocks this sheet tried in saves that
 * failed (`tried`), like a save does; a stored block that is one of those is
 * his own write, so it is removed. One changed elsewhere is still refused.
 */
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"
import { applyReviewChange, BLOCK_CHANGED } from "@/src/audit/auditService"
import { PerfectWeek } from "@/src/audit/components/PerfectWeek"
import type { Review, WeekBlock } from "@/src/audit/types"

const gym = (what: string): WeekBlock => ({ id: "gym", day: 1, start: 9 * 60, end: 10 * 60, what, kind: "workout" })
const stored = (what: string): Review => ({ choices: {}, notes: {}, week: [gym(what)] })

describe("the server", () => {
  it("removes a block that is this sheet's own lost rename", () => {
    expect(applyReviewChange(stored("Gym legs"), { removeBlock: "gym", blockWas: gym("Gym"), tried: [gym("Gym legs")] })).toEqual({ review: { choices: {}, notes: {}, week: [] } })
  })

  it("still refuses one another device changed", () => {
    const r = applyReviewChange(stored("Gym with Tom"), { removeBlock: "gym", blockWas: gym("Gym"), tried: [gym("Gym legs")] })
    expect("error" in r && r.error.startsWith(BLOCK_CHANGED)).toBe(true)
  })

  it("refuses a bad tried list", () => {
    expect("error" in applyReviewChange(stored("Gym"), { removeBlock: "gym", blockWas: gym("Gym"), tried: "x" })).toBe(true)
    expect("error" in applyReviewChange(stored("Gym"), { removeBlock: "gym", blockWas: gym("Gym"), tried: [{ id: "gym" }] })).toBe(true)
  })
})

afterEach(cleanup)

describe("the block sheet", () => {
  it("sends its failed rename with Remove", async () => {
    const onSaveBlock = vi.fn(async () => "No connection" as string | null)
    const onRemoveBlock = vi.fn(async () => null as string | null)
    render(<PerfectWeek week={[gym("Gym")]} doMore={[]} bestHours={[]} workHours={[]} onSaveBlock={onSaveBlock} onRemoveBlock={onRemoveBlock} />)
    fireEvent.click(screen.getByTestId("week-block"))
    fireEvent.change(screen.getByTestId("week-what"), { target: { value: "Gym legs" } })
    fireEvent.click(screen.getByTestId("week-save"))
    await waitFor(() => expect(onSaveBlock).toHaveBeenCalledTimes(1))
    await screen.findByTestId("week-error")
    fireEvent.click(screen.getByTestId("week-delete"))
    await waitFor(() => expect(onRemoveBlock).toHaveBeenCalledTimes(1))
    expect(onRemoveBlock.mock.calls[0]).toEqual(["gym", gym("Gym"), [gym("Gym legs")]])
  })
})
