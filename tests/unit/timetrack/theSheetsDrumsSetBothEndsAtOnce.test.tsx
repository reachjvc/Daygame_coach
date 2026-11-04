// @vitest-environment jsdom
/**
 * THE SHEET'S DRUMS SET BOTH ENDS AT ONCE (Phase 5 items 1–5).
 *
 * The entry sheet gets two sets of drums, Start and End, above its boxes. A
 * night's work, yesterday 22:30 to today 01:15, used to be the day box, then
 * the start box (which moved the whole entry when it landed after the end),
 * then the end box. With the drums it is turned straight in, the length reads
 * live under them — "2:45 · ends next day" — and ✓ saves both ends as one
 * change.
 *
 * Until ✓, nothing is written: the drums are turned one at a time, and on the
 * way there an entry passes through shapes nobody means — a 25-hour entry the
 * moment the start's day turns to yesterday. Saved, each of those would ask
 * D10's question, move a touching neighbour (D12) and sync. So the drums hold
 * the pair, the boxes and the ±5 buttons show and change that same pair, and
 * an end set before its start is pointed at, never rolled to tomorrow.
 */

import { useState } from "react"
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest"

import { EntryDetailModalBody } from "@/src/timetrack/components/EntryList"
import { epochSeconds } from "@/src/timetrack/timetrackFormatService"
import { emptyDraft, isRunning, runningEntry, startTimer } from "@/src/timetrack/timetrackService"
import type { TimetrackState } from "@/src/timetrack/types"

import { baseState, entry } from "./helpers"

const at = (day: number, h: number, m = 0, s = 0) => new Date(2026, 10, day, h, m, s, 0).toISOString()
const NOW = at(4, 16, 0)
const TODAY = "2026-11-04"

let latest: TimetrackState

/** like TogglLab: the sheet is drawn from the workspace it writes to — and `latest` sees a write made on the way out */
function Sheet({ initial, id }: { initial: TimetrackState; id: string }) {
  const [state, setState] = useState(initial)
  return (
    <EntryDetailModalBody
      entry={state.entries.find((e) => e.id === id)!}
      state={state}
      setState={(updater) => {
        latest = updater(latest)
        setState(latest)
      }}
      pushToast={vi.fn()}
      nowSec={epochSeconds(NOW)}
    />
  )
}

const open = (state: TimetrackState, id = "a") => {
  latest = state
  return render(<Sheet initial={state} id={id} />)
}
const stored = (id = "a") => latest.entries.find((e) => e.id === id)!
const drum = (name: string) => screen.getByRole("listbox", { name })
const chosen = (name: string) => within(drum(name)).getByRole("option", { selected: true }).textContent
const press = (name: string, key: string, times = 1) => {
  for (let i = 0; i < times; i++) fireEvent.keyDown(drum(name), { key })
}
const boxValue = (label: string) => (screen.getByLabelText(label) as HTMLInputElement).value
const readout = () => screen.getByTestId("drum-length").textContent

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] })
  vi.setSystemTime(new Date(NOW))
})

afterEach(() => {
  cleanup()
  vi.useRealTimers()
})

describe("a finished entry: Start and End drums", () => {
  test("both sets open on the entry, above the boxes", () => {
    open(baseState({ entries: [entry("a", TODAY, "09:00", "10:00")] }))

    expect(chosen("Start day")).toBe("Today")
    expect(chosen("Start hour")).toBe("09")
    expect(chosen("End hour")).toBe("10")
    expect(readout()).toBe("1:00")
    // above the start, end and duration boxes, in the order they are read
    const drums = drum("Start day")
    expect(drums.compareDocumentPosition(screen.getByLabelText("Start time")) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })

  test("yesterday 22:30 to today 01:15 reads 2:45 · ends next day, and ✓ saves both ends (scenario 2)", () => {
    open(baseState({ entries: [entry("a", TODAY, "09:00", "10:00")] }))

    press("Start day", "ArrowUp")
    press("Start hour", "End")
    press("Start hour", "ArrowUp")
    press("Start minute", "PageDown", 6)
    press("End hour", "Home")
    press("End hour", "ArrowDown")
    press("End minute", "PageDown", 3)

    expect(readout()).toBe("2:45 · ends next day")
    // the boxes show the same pair the drums do
    expect(boxValue("Start time")).toBe("22:30")
    expect(boxValue("End time")).toBe("01:15")
    expect(boxValue("Duration")).toBe("2:45")
    // and nothing is written until ✓
    expect(stored().start).toBe(at(4, 9, 0))

    fireEvent.click(screen.getByRole("button", { name: "✓ Set times" }))

    expect(stored().start).toBe(at(3, 22, 30))
    expect(stored().stop).toBe(at(4, 1, 15))
    expect(stored().duration).toBe(2 * 3600 + 45 * 60)
    expect(screen.queryByRole("button", { name: "✓ Set times" })).toBeNull()
  })

  test("Cancel puts the drums back on the entry", () => {
    open(baseState({ entries: [entry("a", TODAY, "09:00", "10:00")] }))
    press("Start hour", "ArrowUp")
    expect(boxValue("Start time")).toBe("08:00")

    fireEvent.click(screen.getByRole("button", { name: "Cancel" }))

    expect(chosen("Start hour")).toBe("09")
    expect(boxValue("Start time")).toBe("09:00")
    expect(stored().start).toBe(at(4, 9, 0))
  })

  test("closing the sheet with the drums turned keeps what they show, like every other edit here", () => {
    open(baseState({ entries: [entry("a", TODAY, "09:00", "10:00")] }))
    press("End minute", "PageDown")

    cleanup()

    expect(stored().stop).toBe(at(4, 10, 5))
  })
})

describe("an end before its start (scenario 6)", () => {
  test("says so, offers End next day, and ✓ waits until it is mended", () => {
    open(baseState({ entries: [entry("a", TODAY, "14:00", "15:00")] }))

    press("End hour", "ArrowUp", 2)

    expect(readout()).toBe("Ends before it starts")
    expect(screen.getByRole("button", { name: "✓ Set times" })).toBeDisabled()
    // never rolled to tomorrow by itself
    expect(chosen("End day")).toBe("Today")

    fireEvent.click(screen.getByRole("button", { name: "End next day" }))

    expect(chosen("End day")).toBe("Tomorrow")
    expect(readout()).toBe("23:00 · ends next day")
    expect(screen.getByText("That makes it 23 hours.")).toBeInTheDocument()
    fireEvent.click(screen.getByRole("button", { name: "✓ Set times" }))
    expect(stored().stop).toBe(at(5, 13, 0))
  })
})

describe("the boxes and the drums follow each other", () => {
  test("a time typed in a box turns the drums", () => {
    open(baseState({ entries: [entry("a", TODAY, "09:00", "10:00")] }))
    const start = screen.getByLabelText("Start time")
    fireEvent.focus(start)
    fireEvent.change(start, { target: { value: "0930" } })
    fireEvent.blur(start)

    expect(stored().start).toBe(at(4, 9, 30))
    expect(chosen("Start minute")).toBe("30")
  })

  test("with the drums turned, a box and ±5 change the drums' pair, read against it", () => {
    open(baseState({ entries: [entry("a", TODAY, "09:00", "10:00")] }))
    press("Start day", "ArrowUp")
    press("Start hour", "End")

    // 0115 after yesterday 23:00 is 01:15 today, not tomorrow after the saved 09:00 start
    const end = screen.getByLabelText("End time")
    fireEvent.focus(end)
    fireEvent.change(end, { target: { value: "0115" } })
    fireEvent.blur(end)
    fireEvent.click(screen.getByRole("button", { name: "Start 5 minutes earlier" }))

    expect(chosen("End hour")).toBe("01")
    expect(chosen("Start minute")).toBe("55")
    expect(readout()).toBe("2:20 · ends next day")
    expect(stored().start).toBe(at(4, 9, 0))

    fireEvent.click(screen.getByRole("button", { name: "✓ Set times" }))
    expect(stored().start).toBe(at(3, 22, 55))
    expect(stored().stop).toBe(at(4, 1, 15))
  })
})

describe("a running entry (scenario 7)", () => {
  const running = () => startTimer(baseState(), { ...emptyDraft, description: "Deep work" }, at(4, 9, 0)).state

  test("shows only the start drums, and Stop at… shows the end drums with after now greyed", () => {
    const state = running()
    const id = runningEntry(state)!.id
    open(state, id)

    expect(screen.queryByRole("listbox", { name: "End hour" })).toBeNull()
    fireEvent.click(screen.getByRole("button", { name: "Stop at…" }))

    expect(chosen("End hour")).toBe("16")
    expect(within(drum("End hour")).getByRole("option", { name: "17" })).toHaveAttribute("aria-disabled", "true")
    press("End hour", "ArrowDown")
    expect(chosen("End hour")).toBe("16")

    // the acceptance story: it ended two hours ago
    press("End hour", "ArrowUp", 2)
    expect(readout()).toBe("5:00")
    fireEvent.click(screen.getByRole("button", { name: "✓ Stop at 14:00" }))

    expect(isRunning(stored(id))).toBe(false)
    expect(stored(id).stop).toBe(at(4, 14, 0))
  })

  test("its start cannot be turned past now", () => {
    const state = running()
    const id = runningEntry(state)!.id
    open(state, id)
    press("Start day", "ArrowDown")
    expect(chosen("Start day")).toBe("Today")
  })
})

describe("planned (Q2, item 5)", () => {
  test("tomorrow 10:00 to 11:30 reads as planned, and saves as an ordinary entry that starts later", () => {
    open(baseState({ entries: [entry("a", TODAY, "09:00", "10:00")] }))
    press("Start day", "ArrowDown")
    press("Start hour", "ArrowDown")
    press("End day", "ArrowDown")
    press("End hour", "ArrowDown")
    press("End minute", "PageDown", 6)

    expect(readout()).toBe("1:30 · planned")
    fireEvent.click(screen.getByRole("button", { name: "✓ Set times" }))

    expect(stored().start).toBe(at(5, 10, 0))
    expect(stored().stop).toBe(at(5, 11, 30))
  })
})
