// @vitest-environment jsdom
/**
 * ON THE PC, THE RUNNING ROW HAS NO ▶, AND A ROW'S NAME BOX IS CALLED "DESCRIPTION".
 *
 * Found 2026-11-05 by the audit's findability checks (Plans/toggl-parity.md,
 * Phase 8): a first-time user saw an orange ▶ on the timer that was already
 * running and could not tell what it would do (the phone lost it in Phase 3;
 * Toggl's list does not show the running entry at all). And a screen reader
 * called every row's name box "(no description)", even one with a name.
 */
import { cleanup, render, screen, within } from "@testing-library/react"
import { afterEach, expect, test, vi } from "vitest"

import { TogglLab } from "@/src/timetrack/components/TogglLab"
import { STORAGE_KEY } from "@/src/timetrack/config"
import { stateToRows } from "@/src/timetrack/timetrackMapperService"
import { startTimer } from "@/src/timetrack/timetrackService"
import type { TimetrackState } from "@/src/timetrack/types"

import { wait } from "./deviceHarness"
import { fakeAccount } from "./fakeAccount"
import { baseState, entry } from "./helpers"

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
  vi.useRealTimers()
  window.localStorage.clear()
})

async function open(copy: TimetrackState) {
  vi.useFakeTimers()
  vi.setSystemTime(new Date(2026, 7, 10, 12, 0))
  window.history.replaceState(null, "", "/test/toggl")
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(copy))
  const account = fakeAccount(stateToRows(copy, "user-1"))
  vi.stubGlobal("fetch", (url: string, init?: { method?: string; body?: string }) => account.fetch(url, init))
  render(<TogglLab />)
  await wait(1_000)
}

test("only the stopped row offers ▶, and each name box is called Description", async () => {
  const withOld = baseState({ entries: [entry(1, "2026-08-10", "08:00", "09:00", { description: "Email" })] })
  await open(
    startTimer(withOld, { description: "Gym", projectId: null, taskId: null, tagIds: [], billable: false }, new Date(2026, 7, 10, 11, 0).toISOString())
      .state,
  )
  const list = within(screen.getByRole("main"))
  expect(list.getAllByRole("button", { name: "Continue this entry" })).toHaveLength(1)
  const names = list.getAllByRole("textbox", { name: "Description" }).map((box) => (box as HTMLInputElement).value)
  expect(names).toEqual(expect.arrayContaining(["Gym", "Email"]))
})
