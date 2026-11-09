// @vitest-environment jsdom
/**
 * OPENING THE TRACKER DOES NOT DOWNLOAD EVERY ENTRY EVER DELETED.
 *
 * Found by the heavy-history audit (Phase 8 of Plans/toggl-parity.md,
 * `tombstones.spec.ts`): every opening read the whole account, deleted entries
 * and their tag links included, and then had no use for most of them. 1,791 live
 * entries were 1.5 MB; after about 7,000 deletions (a bulk delete, a mistaken
 * import) the same 1,791 were 7.7 MB, and on a 1.6 Mbit/s phone link "Saved"
 * took 37–45 s instead of 6.
 *
 * Why the opening reads everything: the cursor of the last check lives only in
 * the page, so each opening starts from nothing, and it treats the answer as the
 * whole account — a row this device holds that the answer lacks is taken to be
 * one the account never had, and is kept and sent. So a deletion this device has
 * not heard of yet MUST be in the answer, or the entry comes back.
 *
 * The opening now asks for live rows only (`live=1`), and checks the answer
 * against every row it holds, queued or shown. If anything it holds is missing,
 * it may have been deleted elsewhere, so it asks again for the whole account as
 * before. A device whose rows are all live — the ordinary case — downloads no
 * deleted history at all.
 */

import { afterEach, beforeEach, describe, expect, test, vi } from "vitest"
import { cleanup } from "@testing-library/react"

import { stateToRows } from "@/src/timetrack/timetrackMapperService"
import type { TimetrackState } from "@/src/timetrack/types"

import { createEmptyWorkspace } from "@/src/timetrack/data/emptyWorkspace"

import { renderDevice, wait } from "./deviceHarness"
import { fakeAccount } from "./fakeAccount"
import { baseState, entry } from "./helpers"

const USER = "user-1"

/** Two live entries; the account also has fifty it deleted long ago, each with a tag */
function anAccountWithDeletedHistory() {
  const live = [
    entry("call", "2026-08-10", "09:00", "10:00", { description: "Call", tagIds: ["50"] }),
    entry("gym", "2026-08-10", "11:00", "12:00", { description: "Gym" }),
  ]
  const gone = Array.from({ length: 50 }, (_, i) =>
    entry(`old-${i}`, "2026-07-01", "09:00", "09:30", { description: `Deleted ${i}`, tagIds: ["50"] }),
  )
  const account = fakeAccount(stateToRows(baseState({ entries: [...live, ...gone] }), USER))
  for (const old of gone) account.remove("timetrack_entries", old.id)
  const held: TimetrackState = baseState({ entries: live })
  return { account, held }
}

const firstRead = (gets: string[]) => gets.find((url) => !url.includes("since="))

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
  vi.useRealTimers()
  window.localStorage.clear()
})

beforeEach(() => {
  window.localStorage.clear()
  vi.useFakeTimers()
  vi.setSystemTime(new Date(2026, 7, 10, 13, 0, 0))
})

describe("opening on a device whose rows are all live", () => {
  test("asks for live rows only, once", async () => {
    const { account, held } = anAccountWithDeletedHistory()
    vi.stubGlobal("fetch", vi.fn(account.fetch))

    const device = renderDevice(held)
    await wait(3000)

    expect(firstRead(account.gets), "the opening read every deleted entry too").toContain("live=1")
    expect(account.gets.filter((url) => !url.includes("since=")), "the opening read the account twice").toHaveLength(1)
    expect(device.latest().entries.map((e) => e.id).sort()).toEqual(["call", "gym"])
    expect(account.posts.flatMap((p) => p.body.rows?.timetrack_entries ?? []), "the opening sent entries it had no reason to").toEqual([])
  })
})

describe("opening on a device that still holds an entry deleted elsewhere", () => {
  test("asks again for the whole account, so the entry goes here and does not come back there", async () => {
    const { account, held } = anAccountWithDeletedHistory()
    vi.stubGlobal("fetch", vi.fn(account.fetch))
    // the PC deleted Gym while this phone was shut
    account.remove("timetrack_entries", "gym")

    const device = renderDevice(held)
    await wait(3000)

    expect(account.entry("gym")?.deleted_at, "the phone's old copy brought Gym back on the account").not.toBeNull()
    expect(
      device.latest().entries.some((e) => e.id === "gym" && !e.serverDeletedAt),
      "the phone still shows the entry the PC deleted",
    ).toBe(false)
  })
})

describe("opening on a browser that has nothing of this account yet", () => {
  /**
   * A new phone, or a browser whose storage was cleared, starts from a blank
   * workspace with ids of its own. The account does not have those, and they are
   * not sent: the account's copy replaces them. Counting them as rows the live
   * answer must hold sent every such opening for the whole account a second time
   * (production-build audit, 2026-11-09: 1.5 MB, then 7.7 MB with 7,164 deleted).
   */
  test("asks for live rows only, once", async () => {
    const { account } = anAccountWithDeletedHistory()
    vi.stubGlobal("fetch", vi.fn(account.fetch))

    const device = renderDevice(createEmptyWorkspace(new Date().toISOString()), { account: USER })
    await wait(3000)

    expect(account.gets.filter((url) => !url.includes("since=")), "a blank browser read the account twice").toHaveLength(1)
    expect(device.latest().entries.map((e) => e.id).sort()).toEqual(["call", "gym"])
    expect(account.posts.flatMap((p) => p.body.rows?.timetrack_entries ?? []), "the opening sent entries it had no reason to").toEqual([])
  })

  test("a copy holding any row of the account is checked row by row, whatever table it is in", async () => {
    // a phone in step with an account that has only one timeline block; the PC has since deleted it
    const block = { id: "tl-1", start: "2026-08-10T08:00:00.000Z", end: "2026-08-10T08:30:00.000Z", label: "/time", converted: false }
    const blank = createEmptyWorkspace(new Date().toISOString())
    const phone = { ...blank, timeline: [block] }
    const account = fakeAccount(stateToRows(phone, USER))
    account.remove("timetrack_timeline", "tl-1")
    vi.stubGlobal("fetch", vi.fn(account.fetch))

    const device = renderDevice(phone, { account: USER })
    await wait(3000)

    expect(account.gets.filter((url) => !url.includes("since=")), "a copy holding a deleted timeline block was let off the check").toHaveLength(2)
    expect(device.latest().timeline.map((b) => b.id), "the block the PC deleted is still here").toEqual([])
  })
})
