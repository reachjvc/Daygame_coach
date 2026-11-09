// @vitest-environment jsdom
/**
 * ONE CARD PER QUARTER; A STRETCH ONLY WHEN CHOSEN (alpha test 2026-11-09,
 * fast-audit-07 / picky-eye-03). Blank quarters used to merge into one card,
 * "13:45–16:00 · 9 quarters", and one Save wrote the same answer into all.
 */

import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, beforeAll, describe, expect, test } from "vitest"

import { AnswerSheet, type AnswerCardInput } from "@/src/audit/components/AnswerSheet"
import type { AuditAnswer } from "@/src/audit/types"

const RUN_ID = "00000000-0000-4000-8000-000000000001"
const Q = 900_000
const q0 = Date.parse("2026-11-09T12:00:00.000Z") // 13:00 in Copenhagen
// newest first, as the page orders them
const cards: AnswerCardInput[] = [q0 + 2 * Q, q0 + Q, q0].map((q) => ({ quarters: [q], text: "", entryId: null, existing: null }))

function renderSheet(onSave: (a: AuditAnswer[]) => void) {
  return render(
    <AnswerSheet open onClose={() => {}} title="Answer now" cards={cards} runId={RUN_ID} timezone="Europe/Copenhagen" source="app" suggestions={[]} slots={[]} onSave={onSave} />,
  )
}

// jsdom has no scrolling; a save moves the next open card into view
beforeAll(() => {
  Element.prototype.scrollIntoView = () => {}
})
afterEach(cleanup)

describe("the answer sheet", () => {
  test("draws one card per quarter, and a Save writes only its own quarter", () => {
    const saved: AuditAnswer[][] = []
    renderSheet((a) => saved.push(a))
    expect(screen.getAllByTestId("audit-card")).toHaveLength(3)
    const [first] = screen.getAllByTestId("audit-card")
    expect(first.textContent).toContain("13:30–13:45")
    expect(first.querySelector("h3")!.textContent).not.toContain("quarters")
    fireEvent.change(screen.getAllByTestId("audit-activity")[0], { target: { value: "Email" } })
    fireEvent.click(screen.getAllByRole("radio", { name: "Energy 3" })[0])
    fireEvent.click(screen.getAllByRole("radio", { name: "Growth 3" })[0])
    expect(saved).toHaveLength(1)
    expect(saved[0].map((a) => a.slotAt)).toEqual([new Date(q0 + 2 * Q).toISOString()])
  })

  test("'Same answer for the 2 quarters before' names them, and one answer then fills all three", () => {
    const saved: AuditAnswer[][] = []
    renderSheet((a) => saved.push(a))
    const cover = screen.getAllByTestId("audit-cover")[0]
    expect(cover.textContent).toContain("Same answer for the 2 quarters before (13:00–13:30)")
    fireEvent.click(cover.querySelector("input")!)
    expect(screen.getAllByTestId("audit-card")).toHaveLength(1)
    expect(screen.getByTestId("audit-card").textContent).toContain("13:00–13:45 · 3 quarters")
    fireEvent.change(screen.getByTestId("audit-activity"), { target: { value: "Lunch" } })
    fireEvent.click(screen.getByRole("radio", { name: "Energy 5" }))
    fireEvent.click(screen.getByRole("radio", { name: "Growth 4" }))
    expect(saved[0].map((a) => a.slotAt).sort()).toEqual([q0, q0 + Q, q0 + 2 * Q].map((q) => new Date(q).toISOString()))
  })

  test("unticking gives the covered quarters their own cards back", () => {
    renderSheet(() => {})
    const box = () => screen.getAllByTestId("audit-cover")[0].querySelector("input")!
    fireEvent.click(box())
    expect(screen.getAllByTestId("audit-card")).toHaveLength(1)
    fireEvent.click(box())
    expect(screen.getAllByTestId("audit-card")).toHaveLength(3)
  })
})
