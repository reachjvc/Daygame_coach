// @vitest-environment jsdom
/**
 * AN UNDO, OR A CHANGE PUT BACK BY HAND, IS WHAT THE ACCOUNT GETS — SIGNAL OR NOT.
 *
 * Found by the offline audit of 2026-11-05 (`undo-offline-delete-is-sent`,
 * `undo-offline-continue-is-sent`, `revert-offline-edit-is-sent`), the worst
 * finding of Phase 8 in Plans/toggl-parity.md:
 *
 *   - swipe-delete with no signal, Undo, signal back: the phone showed the entry
 *     and "Saved"; the account had it deleted;
 *   - the same on a slow signal, Undo while the delete was on its way;
 *   - Continue with no signal, Undo: the account got a third entry, running;
 *   - a running timer renamed "Typo" and back to "Original" offline: the phone
 *     said "Original", the account "Typo".
 *
 * Each change is compared with the account's copy and MERGED into the queue.
 * Putting a row back as the account has it leaves nothing to compare, so the
 * row already queued — the tombstone, the stop, the new entry, "Typo" — stayed
 * in the queue and went up when the signal came back. And a row put back while
 * its first send was in the air was never sent again, so the account kept what
 * landed. The queue now follows what the device shows: a row put back leaves
 * it, and one put back during its send is sent again, as it is now.
 */

import { afterEach, beforeEach, describe, expect, test, vi } from "vitest"
import { cleanup } from "@testing-library/react"

import { PENDING_KEY } from "@/src/timetrack/config"
import { stateToRows } from "@/src/timetrack/timetrackMapperService"
import { continueEntry, deleteEntries, restoreEntries, startTimer, undoDisplacement, updateEntry } from "@/src/timetrack/timetrackService"
import type { EntryDraft, TimeEntry, TimetrackState } from "@/src/timetrack/types"

import { renderDevice, wait } from "./deviceHarness"
import { fakeAccount, type FakeAccount } from "./fakeAccount"
import { baseState, entry } from "./helpers"

const USER = "user-1"
const draft = (description: string): EntryDraft => ({ description, projectId: null, taskId: null, tagIds: ["50"], billable: false })

/** "Keep me", 09:00–10:00, and "Running task" running since 10:30 */
function workspace(): TimetrackState {
  const done = entry("keep", "2026-08-10", "09:00", "10:00", { description: "Keep me", tagIds: ["50"] })
  return startTimer(baseState({ entries: [done] }), draft("Running task"), new Date(2026, 7, 10, 10, 30).toISOString()).state
}

const runningId = (state: TimetrackState) => state.entries.find((e) => e.stop === null)!.id
const liveOnAccount = (account: FakeAccount, all: TimetrackState) =>
  all.entries.map((e) => account.entry(e.id)).filter((row) => row && !row.deleted_at)
const queued = () => window.localStorage.getItem(PENDING_KEY) ?? "{}"

async function openDevice() {
  // one copy for both: a timer started twice would be two timers with two ids
  const copy = workspace()
  const account = fakeAccount(stateToRows(copy, USER))
  vi.stubGlobal("fetch", vi.fn(account.fetch))
  const device = renderDevice(copy)
  await wait(1500)
  return { account, device }
}

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
  vi.useRealTimers()
  window.localStorage.clear()
})

beforeEach(() => {
  window.localStorage.clear()
  vi.useFakeTimers()
  vi.setSystemTime(new Date(2026, 7, 10, 12, 0, 0))
})

describe("with no signal", () => {
  test("a delete undone is not sent: the entry stays on the account", async () => {
    const { account, device } = await openDevice()
    account.online = false

    let removed: TimeEntry[] = []
    device.apply((current) => {
      const result = deleteEntries(current, ["keep"], new Date().toISOString())
      removed = result.removed
      return result.state
    })
    await wait(1500)
    expect(queued(), "the delete was never queued, so this proves nothing").toContain("keep")
    device.apply((current) => restoreEntries(current, removed))
    await wait(1500)

    account.online = true
    window.dispatchEvent(new Event("online"))
    await wait(6000)

    expect(account.entry("keep")?.deleted_at ?? null, "the undone delete reached the account").toBeNull()
    expect(device.latest().entries.some((e) => e.id === "keep")).toBe(true)
    expect(queued(), "the queue still holds the undone delete").not.toContain("keep")
  })

  test("a rename put back is not sent: the account keeps the first name", async () => {
    const { account, device } = await openDevice()
    const timer = runningId(device.latest())
    account.online = false

    const rename = (description: string) => (current: TimetrackState) =>
      updateEntry(current, timer, { description }, new Date().toISOString()).state
    device.apply(rename("Typo"))
    await wait(1500)
    device.apply(rename("Running task"))
    await wait(1500)

    account.online = true
    window.dispatchEvent(new Event("online"))
    await wait(6000)

    expect(account.entry(timer)?.description, "the in-between name reached the account").toBe("Running task")
  })

  test("a Continue undone is not sent: the first timer still runs, and there is no third entry", async () => {
    const { account, device } = await openDevice()
    const all = device.latest()
    const timer = runningId(all)
    expect(liveOnAccount(account, all), "the fixture is not two entries on the account").toHaveLength(2)
    account.online = false

    let started: string | null = null
    device.apply((current) => {
      const result = continueEntry(current, "keep", new Date().toISOString())
      started = result.started!.id
      return result.state
    })
    await wait(1500)
    device.apply((current) => undoDisplacement(current, started!, timer, new Date().toISOString()).state)
    await wait(1500)

    account.online = true
    window.dispatchEvent(new Event("online"))
    await wait(6000)

    expect(account.entry(timer)?.stopped_at ?? null, "the undone Continue stopped the first timer on the account").toBeNull()
    const third = account.entry(started!)
    expect(third && !third.deleted_at ? third : null, "the undone Continue left a third entry on the account").toBeNull()
    expect(liveOnAccount(account, all)).toHaveLength(2)
  })
})

describe("on a slow signal, undone while the first send is on its way", () => {
  test("a delete: the entry comes back on the account", async () => {
    const { account, device } = await openDevice()

    const release = account.holdPosts()
    let removed: TimeEntry[] = []
    device.apply((current) => {
      const result = deleteEntries(current, ["keep"], new Date().toISOString())
      removed = result.removed
      return result.state
    })
    await wait(1500) // the delete has gone out and waits for its answer
    device.apply((current) => restoreEntries(current, removed))
    await wait(500)
    release()
    await wait(6000)

    expect(account.entry("keep")?.deleted_at ?? null, "the account kept the delete the phone undid").toBeNull()
    expect(device.latest().entries.some((e) => e.id === "keep")).toBe(true)
  })

  test("a Continue: the first timer runs on the account, and the new entry is gone from it", async () => {
    const { account, device } = await openDevice()
    const all = device.latest()
    const timer = runningId(all)

    const release = account.holdPosts()
    let started: string | null = null
    device.apply((current) => {
      const result = continueEntry(current, "keep", new Date().toISOString())
      started = result.started!.id
      return result.state
    })
    await wait(1500)
    device.apply((current) => undoDisplacement(current, started!, timer, new Date().toISOString()).state)
    await wait(500)
    release()
    await wait(6000)

    expect(account.entry(timer)?.stopped_at ?? null, "the account kept the stop the phone undid").toBeNull()
    const third = account.entry(started!)
    expect(third && !third.deleted_at ? third : null, "the account kept the entry the phone undid").toBeNull()
  })
})

describe("a change that is not put back", () => {
  test("is still sent, with no signal, when the signal returns", async () => {
    const { account, device } = await openDevice()
    account.online = false

    device.apply((current) => deleteEntries(current, ["keep"], new Date().toISOString()).state)
    await wait(1500)
    account.online = true
    window.dispatchEvent(new Event("online"))
    await wait(6000)

    expect(account.entry("keep")?.deleted_at, "a real delete was dropped").not.toBeNull()
  })
})
