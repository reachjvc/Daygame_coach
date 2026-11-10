// @vitest-environment jsdom
/**
 * TURNING THE PHONE MUST NOT WIPE THE ANSWER (alpha p9-saves-01, -02).
 *
 * The shared sheet drew a bottom sheet below 640 px and a centred dialog
 * above, as two different trees, so crossing 640 px (a phone turned sideways,
 * a window narrowed, and once on every desktop open, a frame after it drew)
 * threw every card away and built it again: what he had typed went back to the
 * old answer, Save stored the old one, and a saved card read "Saved · · E · G"
 * with a pencil that called his own answer another device's.
 */

import { act, cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest"

import { AnswerSheet, type AnswerCardInput } from "@/src/audit/components/AnswerSheet"
import type { DrawnSlot } from "@/src/audit/hooks/useAudit"
import type { AuditAnswer } from "@/src/audit/types"

const RUN_ID = "00000000-0000-4000-8000-000000000001"
const SLOT_AT = "2026-11-09T15:30:00.000Z"
const nervous: DrawnSlot = {
  id: "set-2",
  runId: RUN_ID,
  slotAt: SLOT_AT,
  activity: "Set 2",
  energy: 4,
  growth: 5,
  avoiding: false,
  why: "nervous",
  source: "app",
  timeEntryId: null,
  pending: false,
}

/** A window whose width can cross 640 px, the way a turned phone does. */
let wide = false
const listeners = new Set<() => void>()
function turnTo(next: boolean) {
  wide = next
  act(() => listeners.forEach((l) => l()))
}
beforeEach(() => {
  wide = false
  listeners.clear()
  Element.prototype.scrollIntoView = () => {}
  vi.stubGlobal("matchMedia", (query: string) => ({
    get matches() {
      return query.includes("min-width: 640px") ? wide : false
    },
    media: query,
    addEventListener: (_: string, l: () => void) => listeners.add(l),
    removeEventListener: (_: string, l: () => void) => listeners.delete(l),
  }))
})
afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

function sheet(cards: AnswerCardInput[], slots: DrawnSlot[], saves: AuditAnswer[][]) {
  return (
    <AnswerSheet
      open
      onClose={() => {}}
      title="Change"
      cards={cards}
      runId={RUN_ID}
      timezone="Europe/Copenhagen"
      source="app"
      suggestions={[]}
      slots={slots}
      onSave={(a) => void saves.push(a)}
    />
  )
}

describe("the answer sheet across a turn of the phone", () => {
  test("what he typed, the why and the new score stay, and Save stores them", () => {
    const saves: AuditAnswer[][] = []
    render(sheet([{ quarters: [Date.parse(SLOT_AT)], text: "Set 2", entryId: null, existing: nervous }], [nervous], saves))
    fireEvent.change(screen.getByTestId("audit-activity"), { target: { value: "Set 2 number close" } })
    fireEvent.change(screen.getByTestId("audit-why"), { target: { value: "nervous but went" } })
    fireEvent.click(screen.getByRole("radio", { name: "Energy 2" }))
    turnTo(true)
    expect((screen.getByTestId("audit-activity") as HTMLInputElement).value).toBe("Set 2 number close")
    expect((screen.getByTestId("audit-why") as HTMLTextAreaElement).value).toBe("nervous but went")
    expect(screen.getByRole("radio", { name: "Energy 2" })).toHaveAttribute("aria-checked", "true")
    turnTo(false)
    fireEvent.click(screen.getByTestId("audit-save"))
    expect(saves).toHaveLength(1)
    expect(saves[0][0]).toMatchObject({ activity: "Set 2 number close", why: "nervous but went", energy: 2 })
  })

  test("a saved card still names his answer, and its pencil reopens it as his own", () => {
    const saves: AuditAnswer[][] = []
    const cards: AnswerCardInput[] = [{ quarters: [Date.parse(SLOT_AT)], text: "", entryId: null, existing: null }]
    const { rerender } = render(sheet(cards, [], saves))
    fireEvent.change(screen.getByTestId("audit-activity"), { target: { value: "Coffee" } })
    fireEvent.click(screen.getByRole("radio", { name: "Energy 3" }))
    fireEvent.click(screen.getByRole("radio", { name: "Growth 4" }))
    expect(saves).toHaveLength(1)
    // the page now draws his answer, waiting to be sent
    rerender(sheet(cards, [{ ...saves[0][0], pending: true }], saves))
    turnTo(true)
    expect(screen.getByTestId("audit-card-saved").textContent).toContain("Coffee · E 3 · G 4")
    fireEvent.click(screen.getByRole("button", { name: /Change the answer/ }))
    expect(screen.queryByTestId("audit-card-elsewhere")).toBeNull()
    expect((screen.getByTestId("audit-activity") as HTMLInputElement).value).toBe("Coffee")
  })

  test("opened on a wide screen, the card drawn first is the card he types in (never thrown away a frame later)", async () => {
    wide = true
    const thrownAway: Node[] = []
    const watch = new MutationObserver((records) => {
      for (const r of records) for (const n of r.removedNodes) if (n instanceof Element && n.querySelector("[data-testid=audit-activity]")) thrownAway.push(n)
    })
    watch.observe(document.body, { childList: true, subtree: true })
    render(sheet([{ quarters: [Date.parse(SLOT_AT)], text: "Set 2", entryId: null, existing: nervous }], [nervous], []))
    await Promise.resolve()
    watch.disconnect()
    expect(thrownAway).toHaveLength(0)
  })
})
