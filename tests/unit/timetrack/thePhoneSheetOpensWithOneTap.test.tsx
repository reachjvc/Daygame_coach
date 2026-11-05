// @vitest-environment jsdom
/**
 * ONE TAP ON THE RUNNING BAR, OR ON A ROW, OPENS ONE SHEET WITH THE DRUMS
 * SHOWING (Plans/toggl-parity.md Phase 2, D-SHEET, D-DRUMS, D-SWITCHED).
 *
 * In Toggl's order: ✕ · DONE; the big duration with ✎; the name; the chips;
 * start → end; the drums for the chip that is chosen (the start on a running
 * entry, the end on a finished one); −15 −5 +5 +15; on a running entry a big
 * Stop with Stop at… and Switched at… beside it; Delete time entry. Nothing is
 * saved until DONE; ✕ with changes asks "Discard changes?", and Android's Back
 * does what ✕ does. "I'm working on…" opens it new, already counting; ⊕ opens
 * it with 30 minutes ending now.
 */

import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest"

import { TogglLab } from "@/src/timetrack/components/TogglLab"
import { STORAGE_KEY } from "@/src/timetrack/config"
import { startTimer } from "@/src/timetrack/timetrackService"
import type { TimetrackState } from "@/src/timetrack/types"

import { baseState, entry } from "./helpers"

const NOW = new Date(2026, 7, 10, 12, 0, 0, 0)
const LAB = "/test/toggl"
const at = (hm: string, day = 10) => {
  const [h, m] = hm.split(":").map(Number)
  return new Date(2026, 7, day, h, m, 0, 0).toISOString()
}

function stored(): TimetrackState {
  return JSON.parse(window.localStorage.getItem(STORAGE_KEY)!) as TimetrackState
}

function asPhone() {
  vi.stubGlobal("matchMedia", (query: string) => ({
    matches: query.includes("max-width"),
    media: query,
    addEventListener: () => {},
    removeEventListener: () => {},
  }))
}

async function open(copy: TimetrackState) {
  asPhone()
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(copy))
  render(<TogglLab />)
  await screen.findByRole("navigation", { name: "Sections" })
}

const bar = () => screen.getByTestId("run-bar")
const sheet = () => screen.getByRole("dialog", { name: /time entry/i })
const inSheet = () => within(sheet())
const sheetOpen = () => screen.queryByRole("dialog", { name: /time entry/i }) !== null

function finished() {
  return baseState({
    entries: [
      entry(1, "2026-08-10", "08:00", "09:00", { description: "Email" }),
      entry(2, "2026-08-10", "09:30", "10:30", { description: "Write report" }),
    ],
  })
}

function runningCall() {
  return startTimer(finished(), { description: "Call", projectId: "30", taskId: null, tagIds: [], billable: false }, at("11:00")).state
}

const runningNow = () => stored().entries.find((e) => e.stop === null && !e.serverDeletedAt)

async function back() {
  await act(async () => {
    const stepped = new Promise((resolve) => window.addEventListener("popstate", resolve, { once: true }))
    window.history.back()
    await stepped
  })
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] })
  vi.setSystemTime(NOW)
  vi.stubGlobal("fetch", vi.fn(async () => new Response("{}", { status: 401 })))
  Element.prototype.scrollIntoView = vi.fn()
  window.history.replaceState(null, "", LAB)
})

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
  vi.useRealTimers()
  window.localStorage.clear()
  window.sessionStorage.clear()
})

describe("one tap on the running bar", () => {
  test("opens the sheet in Toggl's order, with the start drums showing", async () => {
    await open(runningCall())
    fireEvent.click(within(bar()).getByRole("button", { name: "Edit the running time entry" }))
    const s = inSheet()
    const order = [
      s.getByRole("button", { name: "Close" }),
      s.getByRole("button", { name: "Done" }),
      s.getByRole("button", { name: "Type a duration" }),
      s.getByPlaceholderText("I’m working on…"),
      s.getByRole("button", { name: /Alpha/ }),
      s.getByRole("button", { name: /Add tags/ }),
      s.getByRole("button", { name: /Billable/ }),
      s.getByRole("textbox", { name: "Start time" }),
      s.getByRole("listbox", { name: "Start hour" }),
      s.getByRole("button", { name: "15 minutes earlier" }),
      s.getByRole("button", { name: "Stop" }),
      s.getByRole("button", { name: "Stop at…" }),
      s.getByRole("button", { name: "Switched at…" }),
      s.getByRole("button", { name: "Delete time entry" }),
    ]
    for (let i = 1; i < order.length; i++) {
      expect(order[i - 1].compareDocumentPosition(order[i]) & Node.DOCUMENT_POSITION_FOLLOWING, `item ${i} out of order`).toBeTruthy()
    }
    // a running entry's end is "now", with no date
    expect(s.getByText("now")).toBeTruthy()
    expect(s.getByText("1:00:00")).toBeTruthy()
  })

  test("move the start 6 minutes back and DONE: four actions", async () => {
    await open(runningCall())
    fireEvent.click(within(bar()).getByRole("button", { name: "Edit the running time entry" })) // 1
    fireEvent.click(inSheet().getByRole("button", { name: "5 minutes earlier" })) // 2
    fireEvent.keyDown(inSheet().getByRole("listbox", { name: "Start minute" }), { key: "ArrowUp" }) // 3
    fireEvent.click(inSheet().getByRole("button", { name: "Done" })) // 4
    await waitFor(() => expect(runningNow()?.start).toBe(at("10:54")))
    expect(sheetOpen()).toBe(false)
  })

  test("Stop in the sheet stops it", async () => {
    await open(runningCall())
    fireEvent.click(within(bar()).getByRole("button", { name: "Edit the running time entry" }))
    fireEvent.click(inSheet().getByRole("button", { name: "Stop" }))
    await waitFor(() => expect(runningNow()).toBeUndefined())
    expect(sheetOpen()).toBe(false)
  })

  test("Stop at… opens the moment picker for the running timer", async () => {
    await open(runningCall())
    fireEvent.click(within(bar()).getByRole("button", { name: "Edit the running time entry" }))
    fireEvent.click(inSheet().getByRole("button", { name: "Stop at…" }))
    const picker = screen.getByRole("dialog", { name: "Stopped at…" })
    fireEvent.click(within(picker).getByRole("button", { name: "15 min ago" }))
    fireEvent.click(within(picker).getByRole("button", { name: /^Stop at/ }))
    await waitFor(() => expect(stored().entries.find((e) => e.description === "Call")?.stop).toBe(at("11:45")))
  })
})

describe("one tap on a row", () => {
  test("opens the same sheet on a finished entry, with the end drums showing", async () => {
    await open(finished())
    fireEvent.click(within(screen.getByRole("main")).getByText("Email"))
    const s = inSheet()
    expect(s.getByRole("textbox", { name: "End time" })).toBeTruthy()
    expect(s.getByRole("listbox", { name: "End hour" })).toBeTruthy()
    expect(s.getByText("1:00:00")).toBeTruthy()
    expect(s.queryByRole("button", { name: "Stop" })).toBeNull()
  })

  test("choosing the start chip shows the start drums", async () => {
    await open(finished())
    fireEvent.click(within(screen.getByRole("main")).getByText("Email"))
    fireEvent.click(inSheet().getByRole("button", { name: /^Start/ }))
    expect(inSheet().getByRole("listbox", { name: "Start hour" })).toBeTruthy()
  })

  test("nothing is saved until DONE", async () => {
    await open(finished())
    fireEvent.click(within(screen.getByRole("main")).getByText("Email"))
    fireEvent.change(inSheet().getByPlaceholderText("I’ve worked on…"), { target: { value: "Emails to Ana" } })
    await act(async () => {
      vi.advanceTimersByTime?.(2000)
    })
    expect(stored().entries.find((e) => e.id === "1")?.description).toBe("Email")
    fireEvent.click(inSheet().getByRole("button", { name: "Done" }))
    await waitFor(() => expect(stored().entries.find((e) => e.id === "1")?.description).toBe("Emails to Ana"))
  })

  test("✕ with changes asks Discard changes?, and Keep editing keeps them", async () => {
    await open(finished())
    fireEvent.click(within(screen.getByRole("main")).getByText("Email"))
    fireEvent.change(inSheet().getByPlaceholderText("I’ve worked on…"), { target: { value: "Emails" } })
    fireEvent.click(inSheet().getByRole("button", { name: "Close" }))
    const ask = screen.getByRole("alertdialog", { name: "Discard changes?" })
    fireEvent.click(within(ask).getByRole("button", { name: "Keep editing" }))
    expect((inSheet().getByPlaceholderText("I’ve worked on…") as HTMLInputElement).value).toBe("Emails")

    fireEvent.click(inSheet().getByRole("button", { name: "Close" }))
    fireEvent.click(within(screen.getByRole("alertdialog", { name: "Discard changes?" })).getByRole("button", { name: "Discard" }))
    await waitFor(() => expect(sheetOpen()).toBe(false))
    expect(stored().entries.find((e) => e.id === "1")?.description).toBe("Email")
  })

  test("✕ with no changes just closes", async () => {
    await open(finished())
    fireEvent.click(within(screen.getByRole("main")).getByText("Email"))
    fireEvent.click(inSheet().getByRole("button", { name: "Close" }))
    await waitFor(() => expect(sheetOpen()).toBe(false))
    expect(screen.queryByRole("alertdialog")).toBeNull()
  })

  test("Android's Back acts as ✕: closes, or asks when something changed", async () => {
    await open(finished())
    fireEvent.click(within(screen.getByRole("main")).getByText("Email"))
    expect(new URLSearchParams(window.location.search).get("entry")).toBe("1")
    await back()
    await waitFor(() => expect(sheetOpen()).toBe(false))

    fireEvent.click(within(screen.getByRole("main")).getByText("Email"))
    fireEvent.change(inSheet().getByPlaceholderText("I’ve worked on…"), { target: { value: "Emails" } })
    await back()
    const ask = await screen.findByRole("alertdialog", { name: "Discard changes?" })
    fireEvent.click(within(ask).getByRole("button", { name: "Keep editing" }))
    expect((inSheet().getByPlaceholderText("I’ve worked on…") as HTMLInputElement).value).toBe("Emails")
    // and Back still belongs to the sheet
    expect(new URLSearchParams(window.location.search).get("entry")).toBe("1")
  })

  test("a typed start keeps the end; one after the end is refused in Toggl's words", async () => {
    await open(finished())
    fireEvent.click(within(screen.getByRole("main")).getByText("Email"))
    fireEvent.click(inSheet().getByRole("button", { name: /^Start/ }))
    const start = inSheet().getByRole("textbox", { name: "Start time" })
    fireEvent.change(start, { target: { value: "0930" } })
    fireEvent.keyDown(start, { key: "Enter" })
    expect(await screen.findByText("Start time must be before Stop time!")).toBeTruthy()

    fireEvent.change(start, { target: { value: "0830" } })
    fireEvent.keyDown(start, { key: "Enter" })
    fireEvent.click(inSheet().getByRole("button", { name: "Done" }))
    await waitFor(() => expect(stored().entries.find((e) => e.id === "1")).toMatchObject({ start: at("08:30"), stop: at("09:00") }))
  })

  test("one tap on a time chip selects it and makes it typeable, its time selected so typing replaces it", async () => {
    await open(finished())
    fireEvent.click(within(screen.getByRole("main")).getByText("Email"))
    fireEvent.click(inSheet().getByRole("button", { name: /^Start/ }))
    const start = inSheet().getByRole("textbox", { name: "Start time" }) as HTMLInputElement
    expect(document.activeElement).toBe(start)
    expect([start.selectionStart, start.selectionEnd]).toEqual([0, start.value.length])
  })

  test("a typed end before the start is refused in Toggl's words, and the end stays", async () => {
    await open(finished())
    fireEvent.click(within(screen.getByRole("main")).getByText("Email"))
    const end = inSheet().getByRole("textbox", { name: "End time" })
    fireEvent.change(end, { target: { value: "0750" } })
    fireEvent.keyDown(end, { key: "Enter" })
    expect(await screen.findByText("Stop time must be after Start time!")).toBeTruthy()
    fireEvent.click(inSheet().getByRole("button", { name: "Done" }))
    await waitFor(() => expect(sheetOpen()).toBe(false))
    expect(stored().entries.find((e) => e.id === "1")?.stop).toBe(at("09:00"))
  })

  test("130 typed into the duration is 1:30", async () => {
    await open(finished())
    fireEvent.click(within(screen.getByRole("main")).getByText("Email"))
    fireEvent.click(inSheet().getByRole("button", { name: "Type a duration" }))
    const box = inSheet().getByRole("textbox", { name: "Duration" })
    expect(inSheet().getByText("90 = 90 min · 1.30 = 1 h 30")).toBeTruthy()
    for (const key of ["1", "3", "0"]) fireEvent.change(box, { target: { value: (box as HTMLInputElement).value + key } })
    expect((box as HTMLInputElement).value).toBe("1:30")
    fireEvent.keyDown(box, { key: "Enter" })
    fireEvent.click(inSheet().getByRole("button", { name: "Done" }))
    await waitFor(() => expect(stored().entries.find((e) => e.id === "1")?.stop).toBe(at("09:30")))
  })

  test("Delete time entry deletes it, with Undo", async () => {
    await open(finished())
    fireEvent.click(within(screen.getByRole("main")).getByText("Email"))
    fireEvent.click(inSheet().getByRole("button", { name: "Delete time entry" }))
    await waitFor(() => expect(stored().entries.find((e) => e.id === "1")).toBeUndefined())
    expect(screen.getByText("Time entry was deleted")).toBeTruthy()
    fireEvent.click(screen.getByRole("button", { name: /Undo/ }))
    await waitFor(() => expect(stored().entries.find((e) => e.id === "1")).toBeTruthy())
  })

  test("End now and Duration only are in the sheet's ⋮", async () => {
    await open(finished())
    fireEvent.click(within(screen.getByRole("main")).getByText("Email"))
    fireEvent.click(inSheet().getByRole("button", { name: "More options" }))
    const menu = document.querySelector("[data-dropdown-panel]") as HTMLElement
    expect(within(menu).getByRole("button", { name: "End now" })).toBeTruthy()
    fireEvent.click(within(menu).getByRole("button", { name: /Duration only/ }))
    fireEvent.click(inSheet().getByRole("button", { name: "Done" }))
    await waitFor(() => expect(stored().entries.find((e) => e.id === "1")?.duronly).toBe(true))
  })
})

describe("a new entry", () => {
  test("I'm working on… opens CREATE, already counting from the tap", async () => {
    await open(finished())
    fireEvent.click(within(bar()).getByRole("button", { name: /working on/ }))
    const s = inSheet()
    expect(s.getByRole("button", { name: "Create" })).toBeTruthy()
    expect(s.getByText("0:00:00")).toBeTruthy()
    // the drums are folded behind Edit duration here, as in Toggl's start sheet
    expect(s.queryByRole("listbox", { name: "Start hour" })).toBeNull()
    expect(s.getByRole("button", { name: /Edit duration/ })).toBeTruthy()

    vi.setSystemTime(new Date(2026, 7, 10, 12, 0, 20))
    fireEvent.change(s.getByPlaceholderText("I’m working on…"), { target: { value: "Design website" } })
    fireEvent.click(s.getByRole("button", { name: "Create" }))
    await waitFor(() => expect(runningNow()).toMatchObject({ description: "Design website", start: NOW.toISOString() }))
  })

  test("⊕ opens 30 minutes ending now, I've worked on…, CREATE", async () => {
    await open(finished())
    fireEvent.click(screen.getByRole("button", { name: "Add a past time entry" }))
    const s = inSheet()
    expect(s.getByText("0:30:00")).toBeTruthy()
    fireEvent.change(s.getByPlaceholderText("I’ve worked on…"), { target: { value: "Call the clinic" } })
    fireEvent.click(s.getByRole("button", { name: "Create" }))
    await waitFor(() =>
      expect(stored().entries.find((e) => e.description === "Call the clinic")).toMatchObject({ start: at("11:30"), stop: at("12:00") }),
    )
  })
})
