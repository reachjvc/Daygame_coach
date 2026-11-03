// @vitest-environment jsdom
/**
 * TAKING A TAG OFF AN ENTRY STICKS — HERE, ON THE ACCOUNT, AND ON THE OTHER DEVICE.
 *
 * Sync defect #3 in Plans/time-tracker-like-toggl.md. A tag link has no
 * `deleted_at`, so a removal could not travel as a tombstone the way every other
 * deletion does, and `diffRows` simply skipped it. Nothing was sent; the account
 * kept the link; the next check brought the tag back within a minute. And had
 * the account ever dropped a link, no device would have noticed: every check
 * returns the whole link table, and the merge only ever added from it.
 *
 * An entry's tags now travel as its whole set, with the entry row and under the
 * entry's version check, and the server removes the links that are not in it.
 */

import { afterEach, beforeEach, describe, expect, test, vi } from "vitest"
import { cleanup } from "@testing-library/react"

import { stateToRows } from "@/src/timetrack/timetrackMapperService"
import type { TimetrackState } from "@/src/timetrack/types"

import { renderDevice, wait } from "./deviceHarness"
import { fakeAccount } from "./fakeAccount"
import { baseState, entry } from "./helpers"

const USER = "user-1"

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
  vi.useRealTimers()
  window.localStorage.clear()
})

beforeEach(() => {
  window.localStorage.clear()
  vi.useFakeTimers()
})

// tags "50" (deep) and "51" (meeting) are in the base workspace
const tagged = (): TimetrackState =>
  baseState({ entries: [entry("e", "2026-08-10", "09:00", "10:00", { description: "planning", tagIds: ["50", "51"] })] })

const untag = (tagId: string) => (current: TimetrackState): TimetrackState => ({
  ...current,
  entries: current.entries.map((e) =>
    e.id === "e" ? { ...e, tagIds: e.tagIds.filter((t) => t !== tagId), at: new Date().toISOString() } : e,
  ),
})

const tagsHere = (state: TimetrackState) => [...(state.entries.find((e) => e.id === "e")?.tagIds ?? [])].sort()

describe("a tag taken off an entry", () => {
  test("is taken off on the account too", async () => {
    const account = fakeAccount(stateToRows(tagged(), USER))
    vi.stubGlobal("fetch", vi.fn(account.fetch))

    const device = renderDevice(tagged())
    await wait(100)
    device.apply(untag("51"))
    await wait(1500)

    expect(account.linksOf("e"), "the removal never reached the account").toEqual(["50"])

    // and the next check does not put it back here
    document.dispatchEvent(new Event("visibilitychange"))
    await wait(1500)
    expect(tagsHere(device.latest()), "the next check brought the tag back").toEqual(["50"])
  })

  test("on the other device is taken off here at the next check, and stays off", async () => {
    const account = fakeAccount(stateToRows(tagged(), USER))
    vi.stubGlobal("fetch", vi.fn(account.fetch))

    const device = renderDevice(tagged())
    await wait(100)

    account.untag("e", "51")
    document.dispatchEvent(new Event("visibilitychange"))
    await wait(1500)

    expect(tagsHere(device.latest()), "this device still shows a tag the other one took off").toEqual(["50"])
    await wait(3000)
    expect(account.linksOf("e"), "this device put the tag back on the account").toEqual(["50"])
  })

  test("survives a second tab opening while the removal still waits in the shared queue", async () => {
    /**
     * The multi-tab case `queuedStopSurvivesFirstContact` pins for a stop. A
     * removal is not a row, so laying the queue on top of the account's copy at
     * first contact could not express it: the account's link came back.
     */
    const account = fakeAccount(stateToRows(tagged(), USER))
    vi.stubGlobal("fetch", vi.fn(account.fetch))

    const first = renderDevice(tagged())
    await wait(100)
    account.online = false
    first.apply(untag("51"))
    await wait(1500)
    const held = first.latest()
    first.unmount()
    account.online = true

    const second = renderDevice(held)
    await wait(3000)

    expect(tagsHere(second.latest()), "the second tab put the tag back").toEqual(["50"])
    expect(account.linksOf("e"), "the queued removal never reached the account").toEqual(["50"])
  })
})
