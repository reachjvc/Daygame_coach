// @vitest-environment jsdom
/**
 * A TIME STRETCH IS ONE CARD (alpha prove-eye-14). Quarters filled from the
 * same Time entry came as one card each, each with "Same answer for N
 * quarters before", so a 3-hour Gym entry was 12 cards. The plan (How it
 * works, step 3): "Gym, 08:30–10:00 is one card". The card can be split into
 * single quarters, and each quarter it saves still says what it saw (`was`).
 */

import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, beforeAll, describe, expect, test } from "vitest"

import { AnswerSheet, type AnswerCardInput } from "@/src/audit/components/AnswerSheet"
import type { DrawnSlot } from "@/src/audit/hooks/useAudit"
import type { AuditAnswer } from "@/src/audit/types"

const RUN_ID = "00000000-0000-4000-8000-000000000001"
const Q = 900_000
const q0 = Date.parse("2026-11-09T08:00:00.000Z") // 09:00 in Copenhagen
const gym = [q0, q0 + Q, q0 + 2 * Q, q0 + 3 * Q]
const single = (q: number): AnswerCardInput => ({ quarters: [q], text: "Gym", entryId: "gym-entry", existing: null })
const cards: AnswerCardInput[] = [
  { quarters: [q0 + 4 * Q], text: "", entryId: null, existing: null },
  { quarters: gym, text: "Gym", entryId: "gym-entry", existing: null, parts: [...gym].reverse().map(single) },
]

function renderSheet(onSave: (a: AuditAnswer[]) => void, slots: DrawnSlot[] = []) {
  return render(
    <AnswerSheet open onClose={() => {}} title="Answer now" cards={cards} runId={RUN_ID} timezone="Europe/Copenhagen" source="app" suggestions={[]} slots={slots} onSave={onSave} />,
  )
}

beforeAll(() => {
  Element.prototype.scrollIntoView = () => {}
})
afterEach(cleanup)

describe("a stretch filled from one Time entry", () => {
  test("is one card that names its range, its quarters and the entry", () => {
    renderSheet(() => {})
    const all = screen.getAllByTestId("audit-card")
    expect(all).toHaveLength(2)
    expect(all[1].querySelector("h3")!.textContent).toContain("09:00–10:00 · 4 quarters · from Time: Gym")
    expect(all[1].querySelector("[data-testid=audit-cover]")).toBeNull()
  })

  test("one answer saves every quarter, each with its own was", () => {
    const saved: AuditAnswer[][] = []
    renderSheet((a) => saved.push(a))
    const card = screen.getAllByTestId("audit-card")[1]
    fireEvent.click(card.querySelector("[aria-label='Energy 4']") ?? screen.getAllByRole("radio", { name: "Energy 4" })[1])
    fireEvent.click(screen.getAllByRole("radio", { name: "Growth 6" })[1])
    expect(saved).toHaveLength(1)
    expect(saved[0].map((a) => Date.parse(a.slotAt)).sort()).toEqual(gym)
    expect(saved[0].every((a) => a.activity === "Gym" && a.timeEntryId === "gym-entry" && a.was === null)).toBe(true)
    expect(new Set(saved[0].map((a) => a.id)).size).toBe(4)
  })

  test("Split gives each quarter its own card, newest first, after the cards above it", () => {
    const saved: AuditAnswer[][] = []
    renderSheet((a) => saved.push(a))
    fireEvent.click(screen.getByRole("button", { name: "Split into 4 single quarters" }))
    const all = screen.getAllByTestId("audit-card")
    expect(all).toHaveLength(5)
    expect(all.slice(1).map((c) => c.querySelector("h3")!.textContent!.slice(0, 11))).toEqual(["09:45–10:00", "09:30–09:45", "09:15–09:30", "09:00–09:15"])
    // a split quarter saves only itself
    fireEvent.click(screen.getAllByRole("radio", { name: "Energy 2" })[2])
    fireEvent.click(screen.getAllByRole("radio", { name: "Growth 2" })[2])
    expect(saved[0].map((a) => Date.parse(a.slotAt))).toEqual([q0 + 2 * Q])
  })

  test("a saved card above keeps its Saved line when the stretch below is split", () => {
    renderSheet(() => {})
    fireEvent.change(screen.getAllByTestId("audit-activity")[0], { target: { value: "Email" } })
    fireEvent.click(screen.getAllByRole("radio", { name: "Energy 3" })[0])
    fireEvent.click(screen.getAllByRole("radio", { name: "Growth 3" })[0])
    expect(screen.getAllByTestId("audit-card-saved")).toHaveLength(1)
    fireEvent.click(screen.getByRole("button", { name: "Split into 4 single quarters" }))
    expect(screen.getAllByTestId("audit-card-saved")).toHaveLength(1)
    expect(screen.getAllByTestId("audit-card")).toHaveLength(5)
  })
})
