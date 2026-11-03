// @vitest-environment jsdom
/**
 * AN ENTRY DELETED ON ONE DEVICE STAYS DELETED WHEN THE OTHER ONE WAKES UP.
 *
 * The same fault as the restarted timer (sync defect #1), on the other column a
 * stale copy could clear: the mapper sends `deleted_at: null` for every entry it
 * holds, and the server replaced whole rows. So a phone with any queued edit to
 * an entry the PC had since deleted brought it back — on every device, with no
 * way to tell it had ever gone.
 *
 * A deletion is the server's newer version of the row. The phone's queued row
 * was based on an older one, so the server refuses it and hands back the
 * tombstone, and the phone, which never deleted anything itself, has no
 * business clearing it.
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
  baseState({
    entries: [
      entry("notes", "2026-08-10", "09:00", "10:00", { description: "meeting notes" }),
      entry("kept", "2026-08-10", "10:00", "11:00", { description: "kept" }),
    ],
  })

const retitle = (description: string) => (current: TimetrackState): TimetrackState => ({
  ...current,
  entries: current.entries.map((e) => (e.id === "notes" ? { ...e, description, at: new Date().toISOString() } : e)),
})

describe("a device holding an edit to an entry the other device deleted", () => {
  test("does not bring it back when it comes online", async () => {
    const account = fakeAccount(stateToRows(workspace(), USER))
    vi.stubGlobal("fetch", vi.fn(account.fetch))

    const phone = renderDevice(workspace())
    await wait(100)

    account.online = false
    phone.apply(retitle("meeting notes, typed up"))
    await wait(1500)

    // the PC deletes it
    account.remove("timetrack_entries", "notes")

    account.online = true
    window.dispatchEvent(new Event("online"))
    await wait(6000)

    expect(account.entry("notes")?.deleted_at, "the phone's old copy brought the deleted entry back").not.toBeNull()
    expect(
      phone.latest().entries.map((e) => e.id),
      "the phone still lists an entry the other device deleted",
    ).toEqual(["kept"])
    expect(account.entry("kept")?.deleted_at, "the other entry was caught up in it").toBeNull()
  })

  test("does not bring it back when the app is opened again with the edit queued", async () => {
    const account = fakeAccount(stateToRows(workspace(), USER))
    vi.stubGlobal("fetch", vi.fn(account.fetch))

    const before = renderDevice(workspace())
    await wait(100)
    account.online = false
    before.apply(retitle("meeting notes, typed up"))
    await wait(1500)
    const held = before.latest()
    before.unmount()

    account.remove("timetrack_entries", "notes")
    account.online = true

    const phone = renderDevice(held)
    await wait(6000)

    expect(account.entry("notes")?.deleted_at, "opening the app brought the deleted entry back").not.toBeNull()
    expect(phone.latest().entries.map((e) => e.id)).toEqual(["kept"])
  })
})
