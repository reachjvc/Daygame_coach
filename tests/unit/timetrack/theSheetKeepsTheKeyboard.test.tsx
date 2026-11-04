// @vitest-environment jsdom
/**
 * THE ENTRY SHEET IS A DIALOG FOR THE KEYBOARD TOO: FOCUS GOES IN, STAYS IN, AND COMES BACK.
 *
 * Found by the heavy-user audit of 2026-11-04 (D12), in a real browser on a PC: with
 * the entry sheet open, all 40 presses of Tab landed on the list rows BEHIND it. The
 * sheet said `role="dialog" aria-modal="true"` and did none of what that promises — it
 * never moved focus in, nothing kept Tab inside, and closing it left focus nowhere.
 *
 * `Modal` is the tracker's one dialog primitive, so the sheet and every other dialog
 * built on it now: move focus inside on open, wrap Tab and Shift+Tab at its edges,
 * close on Escape, and hand focus back to whatever opened it.
 *
 * The whole tracker is mounted, signed out, as the lab at /test/toggl is.
 */

import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, beforeAll, beforeEach, describe, expect, test, vi } from "vitest"

import { TogglLab } from "@/src/timetrack/components/TogglLab"
import { STORAGE_KEY } from "@/src/timetrack/config"

import { baseState, entry } from "./helpers"

const NOW = new Date(2026, 10, 4, 15, 0, 0, 0)

beforeAll(() => {
  Element.prototype.scrollIntoView = () => {}
})

beforeEach(() => {
  // the address a previous test left (`?entry=…`) would open a sheet on arrival
  window.history.replaceState(null, "", "/")
  vi.useFakeTimers({ toFake: ["Date"] })
  vi.setSystemTime(NOW)
  vi.stubGlobal("fetch", vi.fn(async () => new Response("{}", { status: 401 })))
  window.localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify(
      baseState({
        entries: [
          entry(1, "2026-11-04", "09:00", "10:00", { description: "planning" }),
          entry(2, "2026-11-04", "10:00", "11:00", { description: "writing" }),
        ],
      }),
    ),
  )
})

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
  vi.useRealTimers()
  window.localStorage.clear()
})

const insideDialog = () => Boolean(document.activeElement?.closest("[role=dialog]"))

async function openSheet() {
  render(<TogglLab />)
  const opener = (await screen.findAllByLabelText("More actions for this time entry"))[0]
  fireEvent.click(opener)
  fireEvent.click(screen.getByRole("button", { name: "Edit details…" }))
  await screen.findByRole("dialog")
  return opener
}

async function openSheetAndWaitForFocus() {
  const opener = await openSheet()
  await waitFor(() => expect(insideDialog()).toBe(true))
  return opener
}

describe("the entry sheet", () => {
  test("takes focus when it opens", async () => {
    await openSheet()
    await waitFor(() => expect(insideDialog(), `focus is on ${document.activeElement?.outerHTML.slice(0, 80)}`).toBe(true))
  })

  test("keeps Tab and Shift+Tab inside it", async () => {
    await openSheetAndWaitForFocus()
    const user = userEvent.setup({ advanceTimers: () => {} })
    const escaped: string[] = []
    const drumsReached = new Set<string>()
    for (let i = 0; i < 30; i++) {
      await user.tab()
      if (!insideDialog()) escaped.push(document.activeElement?.outerHTML.slice(0, 60) ?? "nothing")
      if (document.activeElement?.getAttribute("role") === "listbox") drumsReached.add(document.activeElement.getAttribute("aria-label") ?? "")
    }
    // the drums (Phase 5) are listboxes in the sheet, and the keyboard reaches them inside the trap
    expect(drumsReached.size, "Tab never reached a drum in the sheet").toBeGreaterThan(0)
    for (let i = 0; i < 10; i++) {
      await user.tab({ shift: true })
      if (!insideDialog()) escaped.push(document.activeElement?.outerHTML.slice(0, 60) ?? "nothing")
    }
    expect(escaped, "Tab reached the page behind the sheet").toEqual([])
  })

  test("closes on Escape and gives focus back to the button that opened it", async () => {
    const opener = await openSheetAndWaitForFocus()
    fireEvent.keyDown(document.activeElement ?? document.body, { key: "Escape" })
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull())
    await waitFor(() => expect(document.activeElement, "focus was left on the page body").toBe(opener))
  })
})
