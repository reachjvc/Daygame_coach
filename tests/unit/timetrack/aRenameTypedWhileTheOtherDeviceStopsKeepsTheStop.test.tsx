// @vitest-environment jsdom
/**
 * A NAME TYPED ON THE PHONE WHILE THE PC STOPS THE TIMER KEEPS THE STOP.
 *
 * Found 2026-11-05. "Call" runs on both devices. On the phone the person types
 * "Call with Ana" into the timer bar; meanwhile the PC stops the call at 11:00.
 * The phone is put away and taken out again, checks, and hears of the stop. A
 * moment later the bar's pause is up and the typed name is stored — and that
 * store started the call running again, on the account and so on every device.
 *
 * The sync engine was not at fault: it did what it is told. The bar built the
 * renamed workspace from the copy it had last DRAWN and put that whole copy in
 * place (`setState(() => result.state)`). The check's answer had been handed
 * over but not drawn yet, so the bar's copy was the one from before the stop:
 * the stopped workspace was replaced by the running one with the new name on
 * it. To the engine that is this device setting the timer running again, on
 * top of the version the PC's stop wrote — so the account took it. A call the
 * PC DELETED came back the same way.
 *
 * Drawn first, the other way round, it went wrong more quietly: the stored
 * name looked for a RUNNING entry by that id, found none, and threw the typed
 * name away.
 *
 * The rule is the one `aSleepingPhoneCannotRestartAStoppedTimer` holds for a
 * queued edit: lay only what this device changed itself onto the newest copy.
 * The name now goes onto the entry it was typed into, in whatever state that
 * entry is by the time it lands.
 */

import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest"

import { TogglLab } from "@/src/timetrack/components/TogglLab"
import { STORAGE_KEY } from "@/src/timetrack/config"
import { stateToRows } from "@/src/timetrack/timetrackMapperService"
import { startTimer } from "@/src/timetrack/timetrackService"
import type { TimetrackState } from "@/src/timetrack/types"

import { wait } from "./deviceHarness"
import { fakeAccount } from "./fakeAccount"
import { baseState } from "./helpers"

const NOON = new Date(2026, 7, 10, 12, 0, 0)
/** where the PC stopped the call */
const PC_STOP = new Date(2026, 7, 10, 11, 0).toISOString()

function callSinceNine(): TimetrackState {
  return startTimer(
    baseState(),
    { description: "Call", projectId: "30", taskId: null, tagIds: ["50"], billable: false },
    new Date(2026, 7, 10, 9, 0).toISOString(),
  ).state
}

const main = () => within(screen.getByRole("main"))
const bar = () => main().getByPlaceholderText("What are you working on?") as HTMLInputElement
const stored = () => JSON.parse(window.localStorage.getItem(STORAGE_KEY)!) as TimetrackState

async function openPhone(copy: TimetrackState) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(copy))
  const account = fakeAccount(stateToRows(copy, "user-1"))
  vi.stubGlobal("fetch", (url: string, init?: { method?: string; body?: string }) => account.fetch(url, init))
  render(<TogglLab />)
  for (let i = 0; i < 10 && !screen.queryByRole("button", { name: /^Saved\./ }); i++) await wait(500)
  return account
}

function setVisibility(value: "visible" | "hidden") {
  Object.defineProperty(document, "visibilityState", { value, configurable: true })
  act(() => {
    document.dispatchEvent(new Event("visibilitychange"))
  })
}

beforeEach(() => {
  window.localStorage.clear()
  vi.useFakeTimers()
  vi.setSystemTime(NOON)
  window.history.replaceState(null, "", "/test/toggl")
})

afterEach(() => {
  Object.defineProperty(document, "visibilityState", { value: "visible", configurable: true })
  cleanup()
  vi.unstubAllGlobals()
  vi.useRealTimers()
  window.localStorage.clear()
  window.sessionStorage.clear()
})

/** The phone types the new name, the PC stops the call, the phone is put away and taken out */
async function typeWhileThePcStops(drawnBeforeThePause: boolean) {
  const copy = callSinceNine()
  const id = copy.entries.find((e) => e.duration < 0)!.id
  const account = await openPhone(copy)

  fireEvent.change(bar(), { target: { value: "Call with Ana" } })
  account.stop(id, PC_STOP)
  setVisibility("hidden")
  setVisibility("visible")
  // the check's answer lands at once; the bar's pause is up 400 ms after the typing
  if (drawnBeforeThePause) await wait(100)
  await wait(2_000)
  // and whatever came of it has gone up
  await wait(10_000)

  return { onAccount: account.entry(id)!, here: stored().entries.find((e) => e.id === id)! }
}

describe("a name typed on the phone while the PC stops the timer", () => {
  test("does not start the timer again when the name is stored before the phone has drawn the stop", async () => {
    const { onAccount, here } = await typeWhileThePcStops(false)

    expect(onAccount.stopped_at, "storing the typed name started the call again that the PC had stopped").toBe(PC_STOP)
    expect(onAccount.description, "the phone's own name was not kept").toBe("Call with Ana")
    expect(here.stop, "the phone shows the call running").toBe(PC_STOP)
    expect(here.description).toBe("Call with Ana")
  })

  test("does not bring back an entry the PC deleted meanwhile", async () => {
    const copy = callSinceNine()
    const id = copy.entries.find((e) => e.duration < 0)!.id
    const account = await openPhone(copy)

    fireEvent.change(bar(), { target: { value: "Call with Ana" } })
    account.remove("timetrack_entries", id)
    setVisibility("hidden")
    setVisibility("visible")
    await wait(2_000)
    await wait(10_000)

    expect(account.entry(id)!.deleted_at, "storing the typed name brought the deleted call back").not.toBeNull()
    expect(
      stored().entries.some((e) => e.id === id && !e.serverDeletedAt),
      "the phone shows the deleted call again",
    ).toBe(false)
  })

  test("is not thrown away when the phone has drawn the stop first", async () => {
    const { onAccount, here } = await typeWhileThePcStops(true)

    expect(onAccount.stopped_at).toBe(PC_STOP)
    expect(onAccount.description, "the typed name was dropped because the call no longer ran").toBe("Call with Ana")
    expect(here.stop).toBe(PC_STOP)
    expect(here.description).toBe("Call with Ana")
  })
})
