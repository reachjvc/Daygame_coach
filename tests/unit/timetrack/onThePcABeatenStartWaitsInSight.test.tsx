// @vitest-environment jsdom
/**
 * ON THE PC, A START THE OTHER DEVICE BEAT WAITS WHERE IT CAN BE SEEN (bug
 * audit A5, found again by the Phase 8 audit of Plans/toggl-parity.md).
 *
 * The words typed and Started during "Checking…", while the other device ran
 * Gym, were kept as the next thing — in the box under the running time, which
 * on a PC is a closed popover, and in a row under the bar that a PC hides. So
 * nobody saw them. Now, while the next thing has words, a strip under the bar
 * says "Next: “Stretching”" with Switch now, Switched at… and a way to let it
 * go, as the phone's does, until it is switched to or dismissed.
 */

import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react"
import { afterEach, beforeEach, expect, test, vi } from "vitest"

import { TogglLab } from "@/src/timetrack/components/TogglLab"
import { STORAGE_KEY } from "@/src/timetrack/config"
import { stateToRows } from "@/src/timetrack/timetrackMapperService"
import { startTimer } from "@/src/timetrack/timetrackService"

import { wait } from "./deviceHarness"
import { fakeAccount } from "./fakeAccount"
import { baseState, entry } from "./helpers"

const NOON = new Date(2026, 7, 10, 12, 0, 0)

let releaseReads: (() => void) | null = null
let holdReads = false

const main = () => within(screen.getByRole("main"))

beforeEach(() => {
  window.localStorage.clear()
  vi.useFakeTimers()
  vi.setSystemTime(NOON)
  holdReads = false
  releaseReads = null
  window.history.replaceState(null, "", "/test/toggl")
})

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
  vi.useRealTimers()
  window.localStorage.clear()
  window.sessionStorage.clear()
})

async function beatenStart() {
  const phone = baseState({ entries: [entry("mail", "2026-08-10", "08:00", "08:30", { description: "Email" })] })
  const onThePc = startTimer(phone, { description: "Gym", projectId: null, taskId: null, tagIds: [], billable: false }, new Date(2026, 7, 10, 11, 0).toISOString()).state
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(phone))
  const account = fakeAccount(stateToRows(onThePc, "user-1"))
  holdReads = true
  vi.stubGlobal("fetch", async (url: string, init?: { method?: string; body?: string }) => {
    if (!init?.method && holdReads) await new Promise<void>((resolve) => (releaseReads = resolve))
    return account.fetch(url, init)
  })
  render(<TogglLab />)
  await wait(50)
  fireEvent.change(main().getByPlaceholderText("What are you working on?"), { target: { value: "Stretching" } })
  fireEvent.click(main().getByRole("button", { name: "Start timer" }))
  await wait(500)
  holdReads = false
  releaseReads?.()
  await wait(2_000)
  return { account, onThePc }
}

const strip = () => document.querySelector<HTMLElement>("[data-next-strip]")

test("the kept words show under the bar, where a PC shows them", async () => {
  await beatenStart()
  const shown = strip()
  expect(shown, "nothing under the bar says what waits").toBeTruthy()
  expect(shown!.textContent).toContain("Next:")
  expect(shown!.textContent).toContain("“Stretching”")
  // not inside anything a PC hides
  expect(shown!.closest(".sm\\:hidden")).toBeNull()
  for (const name of ["Switch now", "Switched at…", "Forget the next entry"]) expect(within(shown!).getByRole("button", { name }), name).toBeTruthy()
})

test("Switch now in the strip ends Gym and starts the words, and the strip goes", async () => {
  const { account, onThePc } = await beatenStart()
  fireEvent.click(within(strip()!).getByRole("button", { name: "Switch now" }))
  await wait(2_000)
  const gym = onThePc.entries.find((e) => e.duration < 0)!
  expect(account.entry(gym.id)?.stopped_at, "Gym is still running on the account").not.toBeNull()
  expect(strip()).toBeNull()
})

test("the words can be let go, and the strip goes", async () => {
  await beatenStart()
  act(() => {
    fireEvent.click(within(strip()!).getByRole("button", { name: "Forget the next entry" }))
  })
  expect(strip()).toBeNull()
  expect((main().getByLabelText("Next entry") as HTMLInputElement).value).toBe("")
})
