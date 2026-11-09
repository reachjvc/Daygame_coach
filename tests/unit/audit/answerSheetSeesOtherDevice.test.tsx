// @vitest-environment jsdom
/**
 * AN OPEN ANSWER CARD SAYS WHEN ANOTHER DEVICE ANSWERED ITS QUARTER MEANWHILE
 * (code review, 2026-11-09). The page reads again every 30 s; a card opened on
 * a gap used to stay a blank gap, and saving silently replaced the other
 * device's answer.
 */

import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, test } from "vitest"

import { AnswerSheet, type AnswerCardInput } from "@/src/audit/components/AnswerSheet"
import type { DrawnSlot } from "@/src/audit/hooks/useAudit"

const RUN_ID = "00000000-0000-4000-8000-000000000001"
const SLOT_AT = "2026-11-09T15:30:00.000Z"
const cards: AnswerCardInput[] = [{ quarters: [Date.parse(SLOT_AT)], text: "", entryId: null, existing: null }]
const fromPc: DrawnSlot = {
  id: "pc-1",
  runId: RUN_ID,
  slotAt: SLOT_AT,
  activity: "Email",
  energy: 2,
  growth: 3,
  avoiding: false,
  why: null,
  source: "app",
  timeEntryId: null,
  pending: false,
}

function sheet(slots: DrawnSlot[], onSave = () => {}) {
  return (
    <AnswerSheet open onClose={() => {}} title="Fill in" cards={cards} runId={RUN_ID} timezone="Europe/Copenhagen" source="later" suggestions={[]} slots={slots} onSave={onSave} />
  )
}

afterEach(cleanup)

describe("a card opened on a gap", () => {
  test("names the answer another device gave meanwhile, and that saving replaces it", () => {
    const { rerender } = render(sheet([]))
    expect(screen.queryByTestId("audit-card-elsewhere")).toBeNull()
    rerender(sheet([fromPc]))
    const note = screen.getByTestId("audit-card-elsewhere")
    expect(note.textContent).toContain("Answered on another device just now: Email")
    expect(note.textContent).toContain("Saving replaces it")
  })

  test("says nothing about its own answer once it saved", () => {
    const { rerender } = render(sheet([]))
    fireEvent.change(screen.getByTestId("audit-activity"), { target: { value: "Daygame sets" } })
    fireEvent.click(screen.getByRole("radio", { name: "Energy 6" }))
    fireEvent.click(screen.getByRole("radio", { name: "Growth 7" }))
    fireEvent.click(screen.getByTestId("audit-save"))
    rerender(sheet([{ ...fromPc, id: "mine", activity: "Daygame sets", pending: false }]))
    // opened again to change it: still its own answer
    fireEvent.click(screen.getByRole("button", { name: /^Change the answer for/ }))
    expect(screen.getByTestId("audit-save")).toBeTruthy()
    expect(screen.queryByTestId("audit-card-elsewhere")).toBeNull()
  })
})
