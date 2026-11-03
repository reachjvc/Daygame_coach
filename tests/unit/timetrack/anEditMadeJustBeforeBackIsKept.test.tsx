// @vitest-environment jsdom
/**
 * AN EDIT MADE JUST BEFORE PRESSING BACK IS KEPT.
 *
 * A description lands 0.4 s after the last keystroke, and a typed time when
 * its box loses focus; both also land "on the way out", when their field
 * unmounts. But when Back leaves the whole tracker, the field's way out is the
 * workspace's way out too: the write arrived at a tracker that was itself being
 * taken down, and nothing stored it. Back is a `popstate`, so the fields land
 * their edits on it, while the tracker is still there to keep them.
 *
 * THE ROUTER TAKES THE PAGE DOWN INSIDE THAT SAME EVENT. Its own `popstate`
 * listener was attached first, when the app started, and in Chrome it unmounts
 * the tracker before any listener the tracker attached later is reached —
 * capture phase or not, measured. The first version of this fix listened to
 * `popstate`, passed here, and lost the words in a real browser. So the
 * browser is modelled as Chrome behaves: the Navigation API's `navigate`
 * event first, then `popstate`, where `routerTakesThePageDown` — attached
 * before the tracker, in the capture phase so nothing can run ahead of it —
 * unmounts the tracker on the spot.
 */

import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest"

import { TogglLab } from "@/src/timetrack/components/TogglLab"
import { STORAGE_KEY } from "@/src/timetrack/config"
import { runningEntry, startTimer } from "@/src/timetrack/timetrackService"
import type { TimetrackState } from "@/src/timetrack/types"

import { baseState, entry } from "./helpers"

const NOW = new Date(2026, 10, 3, 15, 0, 0, 0)

function stored(): TimetrackState {
  return JSON.parse(window.localStorage.getItem(STORAGE_KEY)!) as TimetrackState
}

/**
 * The router's own Back handling: attached before the tracker exists, and
 * taking the tracker down synchronously when the address leaves it.
 */
let takeDown: (() => void) | null = null
function routerTakesThePageDown() {
  if (window.location.pathname !== "/test/toggl" && takeDown) {
    const unmount = takeDown
    takeDown = null
    unmount()
  }
}

/** The Navigation API, as Chrome has it: a `navigate` event before every Back */
const navigation = new EventTarget()

async function back() {
  await act(async () => {
    const navigate = Object.assign(new Event("navigate"), { navigationType: "traverse" })
    navigation.dispatchEvent(navigate)
    // the browser steps history on its own schedule; wait for the step itself, not a guess at its time
    const stepped = new Promise((resolve) => window.addEventListener("popstate", resolve, { once: true }))
    window.history.back()
    await stepped
  })
}

/** Back, out of the tracker: the router unmounts it inside the event */
async function backAndLeave() {
  await back()
  expect(takeDown, "the router never took the tracker down").toBeNull()
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] })
  vi.setSystemTime(NOW)
  vi.stubGlobal("fetch", vi.fn(async () => new Response("{}", { status: 401 })))
  const finished = baseState({ entries: [entry(1, "2026-11-03", "09:00", "10:00", { description: "planning" })] })
  const withTimer = startTimer(
    finished,
    { description: "writing", projectId: null, taskId: null, tagIds: [], billable: false },
    new Date(2026, 10, 3, 14, 0).toISOString(),
  ).state
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(withTimer))
  // the page you came from, then the tracker
  window.history.replaceState(null, "", "/dashboard")
  window.history.pushState(null, "", "/test/toggl")
  window.addEventListener("popstate", routerTakesThePageDown, { capture: true })
  vi.stubGlobal("navigation", navigation)
})

afterEach(() => {
  window.removeEventListener("popstate", routerTakesThePageDown, { capture: true })
  takeDown = null
  cleanup()
  vi.unstubAllGlobals()
  vi.useRealTimers()
  window.localStorage.clear()
  window.sessionStorage.clear()
})

async function mount() {
  const view = render(<TogglLab />)
  takeDown = () => act(() => view.unmount())
  await screen.findAllByLabelText("Stop timer")
  return view
}

/** The sheet for "planning", the finished entry — the oldest row, so the last menu */
function openSheet() {
  fireEvent.click(screen.getAllByLabelText("More actions for this time entry").at(-1)!)
  fireEvent.click(screen.getByRole("button", { name: "Edit details…" }))
  const sheet = screen.getByRole("dialog", { name: "Time entry details" })
  expect((within(sheet).getByPlaceholderText("Description") as HTMLInputElement).value).toBe("planning")
  return sheet
}

describe("leaving the tracker with Back", () => {
  test("keeps a description typed into the running timer a moment before", async () => {
    await mount()
    fireEvent.change(screen.getByPlaceholderText("What are you working on?"), { target: { value: "writing the plan" } })

    await backAndLeave()

    expect(window.location.pathname).toBe("/dashboard")
    expect(runningEntry(stored())?.description).toBe("writing the plan")
  })
})

describe("leaving the tracker with Back while a linked sheet is open", () => {
  test("keeps an end time typed and not yet confirmed", async () => {
    window.history.replaceState(null, "", "/test/toggl?entry=1")
    await mount()
    const sheet = screen.getByRole("dialog", { name: "Time entry details" })
    fireEvent.change(within(sheet).getByRole("textbox", { name: "End time" }), { target: { value: "10:45" } })

    await backAndLeave()

    expect(window.location.pathname).toBe("/dashboard")
    const planning = stored().entries.find((e) => e.id === "1")!
    expect(new Date(planning.stop!).getHours() * 60 + new Date(planning.stop!).getMinutes()).toBe(10 * 60 + 45)
  })
})

describe("closing the sheet with Back", () => {
  test("keeps an end time typed and not yet confirmed", async () => {
    await mount()
    const sheet = openSheet()
    fireEvent.change(within(sheet).getByRole("textbox", { name: "End time" }), { target: { value: "10:30" } })

    await back()

    await waitFor(() => expect(screen.queryByRole("dialog", { name: "Time entry details" })).toBeNull())
    const planning = stored().entries.find((e) => e.id === "1")!
    expect(new Date(planning.stop!).getHours() * 60 + new Date(planning.stop!).getMinutes()).toBe(10 * 60 + 30)
    expect(window.location.pathname, "Back left the tracker instead of closing the sheet").toBe("/test/toggl")
  })

  test("keeps a description typed a moment before", async () => {
    await mount()
    const sheet = openSheet()
    fireEvent.change(within(sheet).getByPlaceholderText("Description"), { target: { value: "planning the week" } })

    await back()

    await waitFor(() => expect(screen.queryByRole("dialog", { name: "Time entry details" })).toBeNull())
    expect(stored().entries.find((e) => e.id === "1")!.description).toBe("planning the week")
  })
})
