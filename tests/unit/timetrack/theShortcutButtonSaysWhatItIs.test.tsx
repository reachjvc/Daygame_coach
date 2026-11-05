// @vitest-environment jsdom
/**
 * THE SHORTCUT BUTTON SAYS WHAT IT IS. Its face is "⇧?", which a new user did not
 * read as help, and a screen reader read out as "⇧?" (findability check,
 * 2026-11-05, Plans/toggl-parity.md Phase 5).
 */
import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, expect, test, vi } from "vitest"

import { TogglLab } from "@/src/timetrack/components/TogglLab"
import { STORAGE_KEY } from "@/src/timetrack/config"
import { stateToRows } from "@/src/timetrack/timetrackMapperService"

import { wait } from "./deviceHarness"
import { fakeAccount } from "./fakeAccount"
import { baseState } from "./helpers"

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
  vi.useRealTimers()
  window.localStorage.clear()
})

test("the ⇧? button is named Keyboard shortcuts", async () => {
  vi.useFakeTimers()
  window.history.replaceState(null, "", "/test/toggl")
  const copy = baseState({ entries: [] })
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(copy))
  const account = fakeAccount(stateToRows(copy, "user-1"))
  vi.stubGlobal("fetch", (url: string, init?: { method?: string; body?: string }) => account.fetch(url, init))
  render(<TogglLab />)
  await wait(1_000)
  expect(screen.getByRole("button", { name: "Keyboard shortcuts" })).toHaveProperty("title", "Keyboard shortcuts (Shift+?)")
})
