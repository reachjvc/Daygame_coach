// @vitest-environment jsdom
/**
 * A DEVICE'S OWN SECOND EDIT IS NOT REFUSED AS STALE.
 *
 * The other half of the version check, and the half that breaks quietly. The
 * server refuses a row unless the device names the version it was based on —
 * and every write makes a NEW version. A device that does not learn the version
 * its own write produced sends its next edit based on the one before, and the
 * server refuses it, as if somebody else had been there in between. Every edit
 * after the first would cost a refusal and a merge; with a bug in the merge,
 * every edit after the first would be lost.
 *
 * Measured against a server that only takes versioned writes (`strict`), which
 * is what the database function is. Two shapes: an edit after the first has
 * landed, and an edit made while the first is still in the air.
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

const workspace = (): TimetrackState =>
  baseState({ entries: [entry("e", "2026-08-10", "09:00", "10:00", { description: "first draft" })] })

const describeAs = (description: string) => (current: TimetrackState): TimetrackState => ({
  ...current,
  entries: current.entries.map((e) => (e.id === "e" ? { ...e, description, at: new Date().toISOString() } : e)),
})

describe("two edits in a row on one device", () => {
  test("both land, and neither is refused as stale", async () => {
    const account = fakeAccount(stateToRows(workspace(), USER), { strict: true })
    vi.stubGlobal("fetch", vi.fn(account.fetch))

    const device = renderDevice(workspace())
    await wait(100)

    device.apply(describeAs("second draft"))
    await wait(1500)
    expect(account.entry("e")?.description, "the device's first edit was refused").toBe("second draft")

    device.apply(describeAs("third draft"))
    await wait(1500)
    expect(account.entry("e")?.description, "the device's own second edit was refused as stale").toBe("third draft")
    expect(account.conflicts, "a write was refused although nobody else had touched the row").toBe(0)
  })

  test("an edit made while the first is still in the air lands too, without a refusal", async () => {
    const account = fakeAccount(stateToRows(workspace(), USER), { strict: true })
    vi.stubGlobal("fetch", vi.fn(account.fetch))

    const device = renderDevice(workspace())
    await wait(100)

    const release = account.holdPosts()
    device.apply(describeAs("second draft"))
    await wait(1000) // the upload has gone out and is waiting for its answer
    device.apply(describeAs("third draft"))
    await wait(1000)
    release()
    await wait(3000)

    expect(account.entry("e")?.description, "the edit made during the upload never landed").toBe("third draft")
    expect(account.conflicts, "the device's own edit was refused as stale").toBe(0)
  })
})
