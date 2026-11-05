// @vitest-environment jsdom
/**
 * THE MANUAL BAR'S LENGTH CAN BE TYPED (Phase 8 audit of Plans/toggl-parity.md).
 *
 * Manual mode showed the length between start and end ("11:08:00") as a
 * readout that looked like a box, and a user tried to type 30 minutes into it.
 * Now it is one: a length typed there keeps the end and moves the start, read
 * the way the running duration reads it ("30" is 30 minutes, "1:30" and
 * "1.30" an hour and a half), and a click selects what it holds.
 */

import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react"
import { afterEach, beforeEach, expect, test, vi } from "vitest"

import { TogglLab } from "@/src/timetrack/components/TogglLab"
import { STORAGE_KEY } from "@/src/timetrack/config"
import type { TimetrackState } from "@/src/timetrack/types"

import { baseState } from "./helpers"

const NOW = new Date(2026, 10, 5, 15, 0, 0, 0)
const at = (h: number, m = 0) => new Date(2026, 10, 5, h, m, 0, 0).toISOString()
const stored = () => JSON.parse(window.localStorage.getItem(STORAGE_KEY)!) as TimetrackState
const bar = () => within(screen.getByRole("main"))

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] })
  vi.setSystemTime(NOW)
  vi.stubGlobal("fetch", vi.fn(async () => new Response("{}", { status: 401 })))
  Element.prototype.scrollIntoView = vi.fn()
  window.history.replaceState(null, "", "/test/toggl")
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(baseState({ entries: [] })))
})

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
  vi.useRealTimers()
  window.localStorage.clear()
  window.sessionStorage.clear()
})

async function manualBar() {
  render(<TogglLab />)
  await screen.findByRole("navigation", { name: "Tracker" })
  act(() => {
    fireEvent.keyDown(document.body, { key: "m" })
  })
  const start = bar().getAllByLabelText("Start time")[0] as HTMLInputElement
  const end = bar().getAllByLabelText("End time")[0] as HTMLInputElement
  fireEvent.change(start, { target: { value: "11:00" } })
  fireEvent.change(end, { target: { value: "11:45" } })
  return { start, end, length: () => bar().getByLabelText("Length") as HTMLInputElement }
}

function typeLength(box: HTMLInputElement, text: string) {
  fireEvent.focus(box)
  fireEvent.change(box, { target: { value: text } })
  fireEvent.keyDown(box, { key: "Enter" })
}

test("is a box, and a click selects what it holds", async () => {
  const { length } = await manualBar()
  expect(length().tagName).toBe("INPUT")
  expect(length().value).toBe("0:45")
  fireEvent.focus(length())
  expect([length().selectionStart, length().selectionEnd]).toEqual([0, length().value.length])
})

test('"30" keeps the end and starts 30 minutes before it', async () => {
  const { start, end, length } = await manualBar()
  typeLength(length(), "30")
  expect(start.value).toBe("11:15")
  expect(end.value).toBe("11:45")
  expect(length().value).toBe("0:30")
})

test('"1:30" and "1.30" are an hour and a half', async () => {
  const { start, length } = await manualBar()
  typeLength(length(), "1:30")
  expect(start.value).toBe("10:15")
  typeLength(length(), "1.30")
  expect(start.value).toBe("10:15")
})

test("the entry added is the one the boxes say", async () => {
  const { length } = await manualBar()
  fireEvent.change(bar().getByPlaceholderText("What have you done?"), { target: { value: "scales" } })
  typeLength(length(), "90")
  fireEvent.click(bar().getByRole("button", { name: "Add time entry" }))
  const added = stored().entries.find((e) => e.description === "scales")!
  expect({ start: added.start, stop: added.stop }).toEqual({ start: at(10, 15), stop: at(11, 45) })
})
