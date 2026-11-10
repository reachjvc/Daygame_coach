// @vitest-environment jsdom
/**
 * AFTER A SAVE, THE NEXT CARD SITS ON TOP (alpha p9-sheet-01). The sheet
 * scrolled to the next card in the same tick as the save, before the saved
 * card folded into its one green line; the fold then pulled everything up by
 * a card's height, so the next card's Energy row was above the sheet.
 *
 * "KEEP THAT ONE" NAMES ONLY THE QUARTERS IT KEPT (alpha p9-sheet-02). On a
 * card of four quarters from one Time entry where another device had answered
 * one, the card said the whole hour was the other device's answer.
 */

import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, test } from "vitest"

import { AnswerSheet, type AnswerCardInput } from "@/src/audit/components/AnswerSheet"
import type { DrawnSlot, NotKept } from "@/src/audit/hooks/useAudit"
import type { AuditAnswer } from "@/src/audit/types"

const RUN_ID = "00000000-0000-4000-8000-000000000001"
const Q = 900_000
const q0 = Date.parse("2026-11-09T06:30:00.000Z") // 07:30 in Copenhagen

/** For each scroll: the card scrolled to, and whether the card saved before it had folded by then. */
let scrolls: { card: string | null; folded: boolean }[] = []
beforeEach(() => {
  scrolls = []
  Element.prototype.scrollIntoView = function (this: Element) {
    scrolls.push({ card: this.getAttribute("data-card"), folded: document.querySelector("[data-testid=audit-card-saved]") !== null })
  }
})
afterEach(cleanup)

function sheet(cards: AnswerCardInput[], saves: AuditAnswer[][], slots: DrawnSlot[] = [], notKept: NotKept[] = []) {
  return (
    <AnswerSheet
      open
      onClose={() => {}}
      title="Answer now"
      cards={cards}
      runId={RUN_ID}
      timezone="Europe/Copenhagen"
      source="app"
      suggestions={[]}
      slots={slots}
      notKept={notKept}
      onSave={(a) => void saves.push(a)}
    />
  )
}

describe("a three-tap save moves on", () => {
  test("to the next card only once the saved card has folded", () => {
    const cards: AnswerCardInput[] = [2, 1, 0].map((n) => ({ quarters: [q0 + n * Q], text: `Entry ${n}`, entryId: `e${n}`, existing: null }))
    const saves: AuditAnswer[][] = []
    render(sheet(cards, saves))
    fireEvent.click(screen.getAllByRole("radio", { name: "Energy 5" })[0])
    fireEvent.click(screen.getAllByRole("radio", { name: "Growth 6" })[0])
    expect(saves).toHaveLength(1)
    expect(scrolls).toEqual([{ card: "1", folded: true }])
  })
})

describe("Keep that one on a Time stretch", () => {
  test("names the one quarter kept, and the quarters his answer was saved for", () => {
    const hour = [q0, q0 + Q, q0 + 2 * Q, q0 + 3 * Q]
    const cards: AnswerCardInput[] = [{ quarters: hour, text: "Deep work", entryId: "deep", existing: null }]
    const saves: AuditAnswer[][] = []
    const { rerender } = render(sheet(cards, saves))
    fireEvent.click(screen.getByRole("radio", { name: "Energy 6" }))
    fireEvent.click(screen.getByRole("radio", { name: "Growth 6" }))
    const lostOne = saves[0].find((a) => Date.parse(a.slotAt) === q0 + 2 * Q)!
    const other = { id: "other", activity: "Other phone", energy: 2 as const, growth: 2 as const, why: null }
    rerender(sheet(cards, saves, [], [{ answer: lostOne, reason: "Changed on another device since", stored: other }]))
    expect(screen.getByTestId("audit-card-conflict").textContent).toContain("Not saved yet · 08:00–08:15")
    fireEvent.click(screen.getByRole("button", { name: "Keep that one" }))
    const kept = screen.getByTestId("audit-card-kept").textContent!
    expect(kept).toContain("Kept the other device's answer · 08:00–08:15")
    expect(kept).toContain("Other phone · E 2 · G 2")
    expect(kept).toContain("Saved · 07:30–08:00, 08:15–08:30")
    expect(kept).toContain("Deep work · E 6 · G 6")
    expect(kept).not.toContain("07:30–08:30")
  })
})
