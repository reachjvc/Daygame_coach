// @vitest-environment jsdom
/**
 * A TAP HELD FOR THE CHECK KEEPS THE MOMENT IT WAS TAPPED (bug audit A6).
 *
 * D2 holds a Stop or a Start tapped while the phone is still checking, up to
 * three seconds, and replays it when the check lands. The replay read the
 * clock when it ran, so the stop was stamped when the answer arrived, not when
 * the finger came down — three seconds late, on every entry stopped on a
 * phone that had just woken. The moment is taken at the tap now, and stamped
 * with the server's clock as it is known when the tap is replayed.
 */

import { cleanup, fireEvent, render, screen, within } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest"

import { TogglLab } from "@/src/timetrack/components/TogglLab"
import { STORAGE_KEY } from "@/src/timetrack/config"
import { stateToRows } from "@/src/timetrack/timetrackMapperService"
import { startTimer } from "@/src/timetrack/timetrackService"
import type { TimetrackState } from "@/src/timetrack/types"

import { wait } from "./deviceHarness"
import { fakeAccount } from "./fakeAccount"
import { baseState, entry } from "./helpers"

const NOON = new Date(2026, 7, 10, 12, 0, 0)

let releaseReads: (() => void) | null = null
let holdReads = false

const main = () => within(screen.getByRole("main"))

function serve(copy: TimetrackState) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(copy))
  const account = fakeAccount(stateToRows(copy, "user-1"))
  holdReads = true
  vi.stubGlobal("fetch", async (url: string, init?: { method?: string; body?: string }) => {
    if (!init?.method && holdReads) await new Promise<void>((resolve) => (releaseReads = resolve))
    return account.fetch(url, init)
  })
  return account
}

/** the check's answer, `ms` after the tap; then the upload, however long it takes to land */
async function answerAfter(ms: number, landed: () => boolean) {
  await wait(ms)
  holdReads = false
  releaseReads?.()
  for (let i = 0; i < 12 && !landed(); i++) await wait(500)
}

const sentEntries = (account: ReturnType<typeof fakeAccount>) =>
  account.posts.flatMap((post) => (post.body.rows?.timetrack_entries ?? []) as { id: string; description: string; started_at: string; stopped_at: string | null }[])

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

describe("a tap held while the phone checks", () => {
  test("a Stop is stamped when it was tapped, not when the check landed", async () => {
    const copy = startTimer(
      baseState(),
      { description: "Gym", projectId: null, taskId: null, tagIds: [], billable: false },
      new Date(2026, 7, 10, 9, 0).toISOString(),
    ).state
    const account = serve(copy)

    render(<TogglLab />)
    await wait(50)
    const tappedAt = Date.now()
    fireEvent.click(main().getByRole("button", { name: "Stop timer" }))
    const gymId = copy.entries.find((e) => e.duration < 0)!.id
    await answerAfter(2_500, () => Boolean(account.entry(gymId)?.stopped_at))

    const stoppedAt = Date.parse(String(account.entry(gymId)?.stopped_at))
    expect(Math.round((stoppedAt - tappedAt) / 1000), "seconds between the tap and the stored stop").toBeLessThanOrEqual(1)
  })

  test("a Start begins when it was tapped", async () => {
    const account = serve(baseState({ entries: [entry("mail", "2026-08-10", "08:00", "08:30", { description: "Email" })] }))

    render(<TogglLab />)
    await wait(50)
    fireEvent.change(main().getByPlaceholderText("What are you working on?"), { target: { value: "Stretching" } })
    const tappedAt = Date.now()
    fireEvent.click(main().getByRole("button", { name: "Start timer" }))
    await answerAfter(2_500, () => sentEntries(account).some((row) => row.description === "Stretching"))

    const started = sentEntries(account).find((row) => row.description === "Stretching")
    expect(started, "the held Start never ran").toBeTruthy()
    expect(Math.round((Date.parse(started!.started_at) - tappedAt) / 1000), "seconds between the tap and the stored start").toBeLessThanOrEqual(1)
  })
})
