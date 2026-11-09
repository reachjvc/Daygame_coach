// @vitest-environment jsdom
/**
 * THE SAME QUARTER ANSWERED ON TWO DEVICES (alpha slow-pass-06). The later
 * save used to overwrite the earlier one with a plain "Saved". Now each save
 * carries what the card saw when it opened (`was`); the server refuses it when
 * the quarter holds something else, and the card names the other answer with
 * "Keep that one" / "Use mine".
 */

import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, test } from "vitest"

import { AnswerSheet, type AnswerCardInput } from "@/src/audit/components/AnswerSheet"
import type { DrawnSlot, NotKept } from "@/src/audit/hooks/useAudit"
import type { AuditAnswer } from "@/src/audit/types"

const RUN_ID = "00000000-0000-4000-8000-000000000001"
const SLOT_AT = "2026-11-09T15:30:00.000Z"
const cards: AnswerCardInput[] = [{ quarters: [Date.parse(SLOT_AT)], text: "", entryId: null, existing: null }]
const fromPhone: DrawnSlot = {
  id: "phone-1",
  runId: RUN_ID,
  slotAt: SLOT_AT,
  activity: "Walk",
  energy: 5,
  growth: 4,
  avoiding: false,
  why: null,
  source: "app",
  timeEntryId: null,
  pending: false,
}
const phoneMark = { id: "phone-1", activity: "Walk", energy: 5, growth: 4, why: null }

function sheet(slots: DrawnSlot[], saves: AuditAnswer[][], notKept: NotKept[] = [], kept: AuditAnswer[][] = []) {
  return (
    <AnswerSheet
      open
      onClose={() => {}}
      title="Fill in"
      cards={cards}
      runId={RUN_ID}
      timezone="Europe/Copenhagen"
      source="app"
      suggestions={[]}
      slots={slots}
      notKept={notKept}
      onSave={(a) => void saves.push(a)}
      onKeepStored={(a) => void kept.push(a)}
    />
  )
}

function answerReading() {
  fireEvent.change(screen.getByTestId("audit-activity"), { target: { value: "Reading" } })
  fireEvent.click(screen.getByRole("radio", { name: "Energy 2" }))
  fireEvent.click(screen.getByRole("radio", { name: "Growth 2" }))
}

afterEach(cleanup)

describe("a save says what the card saw", () => {
  test("a card opened on a gap saves with was: null", () => {
    const saves: AuditAnswer[][] = []
    render(sheet([], saves))
    answerReading()
    expect(saves).toHaveLength(1)
    expect(saves[0][0].was).toBeNull()
  })

  test("a card opened on an answer saves with that answer as was", () => {
    const saves: AuditAnswer[][] = []
    const editCards: AnswerCardInput[] = [{ quarters: [Date.parse(SLOT_AT)], text: "Walk", entryId: null, existing: fromPhone }]
    render(
      <AnswerSheet open onClose={() => {}} title="Change" cards={editCards} runId={RUN_ID} timezone="Europe/Copenhagen" source="app" suggestions={[]} slots={[fromPhone]} onSave={(a) => void saves.push(a)} />,
    )
    fireEvent.click(screen.getByTestId("audit-save"))
    expect(saves[0][0].was).toEqual(phoneMark)
  })

  test("the page's re-read bringing another answer does not change was, unless the card showed it", () => {
    const saves: AuditAnswer[][] = []
    const { rerender } = render(sheet([], saves))
    rerender(sheet([fromPhone], saves))
    // the card names it ("Saving replaces it"), so Save means replace it
    fireEvent.change(screen.getByTestId("audit-activity"), { target: { value: "Reading" } })
    fireEvent.click(screen.getByRole("radio", { name: "Energy 2" }))
    fireEvent.click(screen.getByRole("radio", { name: "Growth 2" }))
    fireEvent.click(screen.getByTestId("audit-save"))
    expect(saves[0][0].was).toEqual(phoneMark)
  })
})

describe("the server refused it: another device answered first", () => {
  function refused(saves: AuditAnswer[][], kept: AuditAnswer[][] = []) {
    const { rerender } = render(sheet([], saves, [], kept))
    answerReading()
    const mine = saves[0][0]
    rerender(sheet([fromPhone], saves, [{ answer: mine, reason: "Changed on another device since", stored: phoneMark }], kept))
    return mine
  }

  test("names the other answer and offers Keep that one / Use mine, never a plain Saved", () => {
    refused([])
    expect(screen.queryByTestId("audit-card-saved")).toBeNull()
    const box = screen.getByTestId("audit-card-conflict")
    expect(box.textContent).toContain("Answered on another device: Walk · E 5 · G 4")
    expect(screen.getByRole("button", { name: "Keep that one" })).toBeTruthy()
    expect(screen.getByRole("button", { name: "Use mine" })).toBeTruthy()
  })

  test("Use mine sends this card's answer again, now saying it saw the other one", () => {
    const saves: AuditAnswer[][] = []
    const mine = refused(saves)
    fireEvent.click(screen.getByRole("button", { name: "Use mine" }))
    expect(saves).toHaveLength(2)
    expect(saves[1]).toHaveLength(1)
    expect(saves[1][0]).toMatchObject({ id: mine.id, activity: "Reading", energy: 2, growth: 2, was: phoneMark })
  })

  test("Keep that one sends nothing and shows the kept answer", () => {
    const saves: AuditAnswer[][] = []
    const kept: AuditAnswer[][] = []
    refused(saves, kept)
    fireEvent.click(screen.getByRole("button", { name: "Keep that one" }))
    expect(saves).toHaveLength(1)
    expect(kept).toHaveLength(1)
    expect(screen.getByTestId("audit-card-kept").textContent).toContain("Walk · E 5 · G 4")
  })
})
