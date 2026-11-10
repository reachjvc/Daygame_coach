// @vitest-environment jsdom
/**
 * A NOTE EDITED AFTER A LOST SAVE IS SAVED, AND TYPED TEXT IS NEVER LOST
 * (alpha p10-review-pings-01, sev 2).
 *
 * A save whose reply was lost had landed (the server stored v2), but the sheet
 * still held the note it opened with. The next edit (v3) was then refused as
 * "changed on another device" and the box was filled with v2: v3 was gone.
 * Now the sheet sends the notes and choices of its saves whose outcome it does
 * not know (`noteTried`, `choiceTried`); a stored one of those is its own
 * write, not another device's. When another device really did change the
 * note, the newer note is shown and what he typed stays on screen to put back.
 */
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"
import { applyReviewChange, NOTE_CHANGED, CHOICE_CHANGED } from "@/src/audit/auditService"
import { ActivitySheet } from "@/src/audit/components/ReviewScreen"
import type { ReviewGroup } from "@/src/audit/auditService"
import type { Review } from "@/src/audit/types"

const V1 = "Phone out of the bedroom"
const V2 = "Phone out of the bedroom, v2"
const V3 = "Phone out of the bedroom, v3 typed after the failure"

describe("the server", () => {
  const stored: Review = { choices: { scrolling: "cut" }, notes: { scrolling: V2 }, week: [] }

  it("saves a new note when the stored one is this sheet's own lost save", () => {
    const r = applyReviewChange(stored, { activity: "scrolling", note: V3, noteWas: V1, noteTried: [V2] })
    expect(r).toEqual({ review: { choices: { scrolling: "cut" }, notes: { scrolling: V3 }, week: [] } })
  })

  it("saves a new choice when the stored one is this sheet's own lost save", () => {
    const r = applyReviewChange(stored, { activity: "scrolling", choice: "keep", choiceWas: null, choiceTried: ["cut"], note: V2, noteWas: V2 })
    expect("review" in r && r.review.choices.scrolling).toBe("keep")
  })

  it("still refuses a note another device changed", () => {
    expect(applyReviewChange(stored, { activity: "scrolling", note: V3, noteWas: V1, noteTried: ["something else"] })).toEqual({ error: NOTE_CHANGED })
    expect(applyReviewChange(stored, { activity: "scrolling", choice: "keep", choiceWas: null, choiceTried: ["more"], note: V2, noteWas: V2 })).toEqual({ error: CHOICE_CHANGED })
  })

  it("refuses a bad tried list", () => {
    expect("error" in applyReviewChange(stored, { activity: "scrolling", note: V3, noteWas: V1, noteTried: [1] })).toBe(true)
    expect("error" in applyReviewChange(stored, { activity: "scrolling", note: V3, noteWas: V1, noteTried: "x" })).toBe(true)
    expect("error" in applyReviewChange(stored, { activity: "scrolling", note: V3, noteWas: V1, choiceTried: ["nope"] })).toBe(true)
    expect("error" in applyReviewChange(stored, { removeBlock: "b1", noteTried: [] })).toBe(true)
  })
})

const group = { key: "scrolling", label: "Scrolling", box: "drain", minutes: 120, energy: 2, growth: 1, answers: 8, avoidingMinutes: 0, whys: [] } as unknown as ReviewGroup

afterEach(cleanup)

describe("the activity sheet", () => {
  it("sends the note of a save that failed with the next save", async () => {
    const onSave = vi.fn(async () => "No connection" as string | null)
    const review: Review = { choices: {}, notes: { scrolling: V1 }, week: [] }
    render(<ActivitySheet group={group} review={review} timezone="Europe/Copenhagen" onClose={() => {}} onSave={onSave} />)
    const box = screen.getByTestId("review-note") as HTMLTextAreaElement
    fireEvent.change(box, { target: { value: V2 } })
    fireEvent.click(screen.getByTestId("review-save"))
    await waitFor(() => expect(onSave).toHaveBeenCalledTimes(1))
    await screen.findByRole("alert")
    onSave.mockResolvedValueOnce(null)
    fireEvent.change(box, { target: { value: V3 } })
    fireEvent.click(screen.getByTestId("review-save"))
    await waitFor(() => expect(onSave).toHaveBeenCalledTimes(2))
    expect(onSave.mock.calls[1]).toEqual(["scrolling", null, V3, V1, { notes: [V2], choices: [] }])
    await screen.findByTestId("review-saved")
    expect(box.value).toBe(V3)
  })

  it("keeps what he typed on screen when another device changed the note, and can put it back", async () => {
    // As on the page: the review is read again before the refusal comes back.
    let refuse: (v: string | null) => void = () => {}
    const onSave = vi.fn(() => new Promise<string | null>((r) => (refuse = r)))
    const before: Review = { choices: {}, notes: { scrolling: V1 }, week: [] }
    const { rerender } = render(<ActivitySheet group={group} review={before} timezone="Europe/Copenhagen" onClose={() => {}} onSave={onSave} />)
    const box = screen.getByTestId("review-note") as HTMLTextAreaElement
    fireEvent.change(box, { target: { value: V3 } })
    fireEvent.click(screen.getByTestId("review-save"))
    await waitFor(() => expect(onSave).toHaveBeenCalledTimes(1))
    rerender(<ActivitySheet group={group} review={{ ...before, notes: { scrolling: "From the phone" } }} timezone="Europe/Copenhagen" onClose={() => {}} onSave={onSave} />)
    refuse(NOTE_CHANGED)
    await screen.findByRole("alert")
    await waitFor(() => expect(box.value).toBe("From the phone"))
    expect(screen.getByTestId("review-note-mine").textContent).toContain(V3)
    fireEvent.click(screen.getByTestId("review-note-use-mine"))
    expect(box.value).toBe(V3)
  })
})
