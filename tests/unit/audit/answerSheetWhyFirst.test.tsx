// @vitest-environment jsdom
/**
 * THE OPTIONAL WHY SITS ABOVE THE TWO SCORES (alpha prove-audit-02, owner note
 * K-D5). The tap that completes a new answer saves it and folds the card, so a
 * why box below the scores cost a pencil and a Save. Now "+ Why I feel like
 * this" opens it above the scores: a why written top-down goes in the same
 * pass, and closed it takes no room, so the plain answer is still three taps.
 */

import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, test } from "vitest"

import { AnswerSheet, type AnswerCardInput } from "@/src/audit/components/AnswerSheet"
import type { AuditAnswer } from "@/src/audit/types"

const RUN_ID = "00000000-0000-4000-8000-000000000001"
const SLOT_AT = "2026-11-09T15:30:00.000Z"
const cards: AnswerCardInput[] = [{ quarters: [Date.parse(SLOT_AT)], text: "Gym", entryId: null, existing: null }]

function sheet(onSave: (answers: AuditAnswer[]) => void) {
  return (
    <AnswerSheet open onClose={() => {}} title="Fill in" cards={cards} runId={RUN_ID} timezone="Europe/Copenhagen" source="later" suggestions={[]} slots={[]} onSave={onSave} />
  )
}

afterEach(cleanup)

describe("the why box", () => {
  test("opens after the activity and before Energy and Growth", () => {
    render(sheet(() => {}))
    expect(screen.queryByTestId("audit-why")).toBeNull()
    fireEvent.click(screen.getByTestId("audit-why-open"))
    const why = screen.getByTestId("audit-why")
    const energy = screen.getByTestId("audit-energy")
    const activity = screen.getByTestId("audit-activity")
    expect(activity.compareDocumentPosition(why) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(why.compareDocumentPosition(energy) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })

  test("a why typed top-down is saved by the Growth tap, in one pass", () => {
    const saves: AuditAnswer[][] = []
    render(sheet((a) => void saves.push(a)))
    fireEvent.click(screen.getByTestId("audit-why-open"))
    fireEvent.change(screen.getByTestId("audit-why"), { target: { value: "Scared, but it builds me" } })
    fireEvent.click(screen.getByRole("radio", { name: "Energy 3" }))
    fireEvent.click(screen.getByRole("radio", { name: "Growth 7" }))
    expect(saves).toHaveLength(1)
    expect(saves[0][0]).toMatchObject({ activity: "Gym", energy: 3, growth: 7, why: "Scared, but it builds me" })
  })

  test("an answer with a why shows it open", () => {
    const withWhy: AnswerCardInput[] = [
      {
        ...cards[0],
        existing: { id: "a1", runId: RUN_ID, slotAt: SLOT_AT, activity: "Gym", energy: 4, growth: 6, avoiding: false, why: "Tired", source: "app", timeEntryId: null, pending: false },
      },
    ]
    render(
      <AnswerSheet open onClose={() => {}} title="Change" cards={withWhy} runId={RUN_ID} timezone="Europe/Copenhagen" source="later" suggestions={[]} slots={[]} onSave={() => {}} />,
    )
    expect((screen.getByTestId("audit-why") as HTMLTextAreaElement).value).toBe("Tired")
  })

  test("with no why, Energy then Growth still saves", () => {
    const saves: AuditAnswer[][] = []
    render(sheet((a) => void saves.push(a)))
    fireEvent.click(screen.getByRole("radio", { name: "Energy 3" }))
    fireEvent.click(screen.getByRole("radio", { name: "Growth 7" }))
    expect(saves).toHaveLength(1)
    expect(saves[0][0].why).toBeNull()
  })
})
