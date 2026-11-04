// @vitest-environment jsdom
/**
 * A START TAPPED DURING "CHECKING…" KEEPS WHAT WAS TYPED (bug audit A5).
 *
 * The phone's copy is old and shows nothing running; the PC runs Gym. The
 * owner types "Stretching" and taps Start while the phone is still checking.
 * The check finds Gym, so the held Start is dropped (D2) — rightly: the button
 * he pressed is not the one on the screen any more. But the toast said "Tap
 * again if you still want to" while the box now read "Gym" and the button was
 * Stop: tapping again would have stopped Gym, and "Stretching" was gone.
 *
 * Now "Stretching" waits in the running bar's own box for the next thing,
 * where Switched at… lives, and one tap — Switch now — ends Gym and starts it.
 * The toast says that, in those words.
 */

import { cleanup, fireEvent, render, screen, within } from "@testing-library/react"
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

test("the typed words wait as the next thing, and Switch now ends Gym and starts them", async () => {
  // the phone last saw a quiet morning; since then the PC started Gym at eleven
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
  expect(screen.getByRole("button", { name: /^Checking…/ })).toBeInTheDocument()
  fireEvent.change(main().getByPlaceholderText("What are you working on?"), { target: { value: "Stretching" } })
  fireEvent.click(main().getByRole("button", { name: "Start timer" }))
  await wait(500)
  holdReads = false
  releaseReads?.()
  await wait(2_000)

  expect(
    screen.getByText(
      "Your other device changed the timer while this one was checking: “Gym” is running now, so “Stretching” did not start. It waits under the timer — Switch now ends “Gym” and starts it.",
    ),
  ).toBeInTheDocument()
  expect((main().getByPlaceholderText("What are you working on?") as HTMLInputElement).value).toBe("Gym")
  expect((main().getByLabelText("Next entry") as HTMLInputElement).value, "what was typed was lost").toBe("Stretching")

  fireEvent.click(main().getByRole("button", { name: "Switch now" }))
  await wait(2_000)

  const gym = onThePc.entries.find((e) => e.duration < 0)!
  expect(account.entry(gym.id)?.stopped_at, "Gym is still running on the account").not.toBeNull()
  const sent = account.posts.flatMap((post) => (post.body.rows?.timetrack_entries ?? []) as { description: string; stopped_at: string | null }[])
  expect(sent.some((row) => row.description === "Stretching" && row.stopped_at === null)).toBe(true)
})
