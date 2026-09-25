/**
 * A TAP LANDED WHILE THE ACCOUNT'S DAYS WERE STILL IN FLIGHT, AND WAS UNDONE.
 *
 * The flow draws the browser's own copy of the day half first — that is the
 * whole point of keeping one — so the screen is tickable before the account's
 * read lands. It then replaced the day half with the account's, wholesale. Tick
 * or untick anything in that window and the control answered the tap, flipped
 * back about a second later, and **nothing was ever sent**: the account kept
 * what it had and the next load brought it back.
 *
 * Found by Check 5, driven at iPhone 14 width and watched over time:
 *
 *   t+0    on screen: unticked
 *   t+1s   on screen: TICKED again   account: still ticked   requests: none
 *
 * A second on a fast laptop; much longer on a phone on mobile data, which is
 * where this milestone's headline lives. The same window loses a rating, a day
 * note and a journal line, and none of them says anything on screen.
 *
 * `keepEditsMadeWhileLoading` puts the account's copy underneath and the
 * person's edits back on top. **Cell by cell, never map by map** — taking their
 * whole day half instead would delete days another device wrote that this
 * browser has never seen, which is the failure the 25-table design exists to
 * prevent, arriving from the other direction.
 */

import { describe, it, expect } from "vitest"
import { keepEditsMadeWhileLoading, patchesBetween, type DayRecord } from "@/src/goals/lifePlanDayService"

const EMPTY: DayRecord = { daily: {}, logged: {}, notes: {}, journal: {} }
const DAY = "2026-09-25"
const OTHER = "2026-09-24"

const record = (over: Partial<DayRecord>): DayRecord => ({ ...EMPTY, ...over })

describe("an edit made while the account's days were loading", () => {
  it("survives, and the account's other days survive with it", () => {
    const atLoad = record({ logged: { [DAY]: ["s7"] } })
    // They untick it while the read is in flight.
    const now = record({ logged: {} })
    // The account's copy lands, and it has a day this browser never had.
    const account = record({ logged: { [DAY]: ["s7"], [OTHER]: ["s5"] } })

    const merged = keepEditsMadeWhileLoading(account, atLoad, now)

    expect(merged.logged[DAY], "the untick was theirs and it stands").toBeUndefined()
    expect(merged.logged[OTHER], "the other device's day is not collateral").toEqual(["s5"])
  })

  /**
   * THE HALF THAT MAKES THE FIX WORTH ANYTHING. Keeping the edit on screen is
   * not enough — the account has to be told. `patchesBetween` is what the save
   * effect runs, so the merged record has to produce a removal against the
   * account's copy or the screen and the database quietly disagree again.
   */
  it("and reaches the account as a removal rather than as silence", () => {
    const atLoad = record({ logged: { [DAY]: ["s7"] } })
    const now = record({ logged: {} })
    const account = record({ logged: { [DAY]: ["s7"] } })

    const merged = keepEditsMadeWhileLoading(account, atLoad, now)
    const patches = patchesBetween(account, merged)

    expect(patches).toEqual([{ date: DAY, ticks: { s7: false } }])
  })

  it("keeps a tick the account made on the same day as one they just added", () => {
    const atLoad = record({ logged: {} })
    const now = record({ logged: { [DAY]: ["s7"] } })
    const account = record({ logged: { [DAY]: ["s5"] } })

    const merged = keepEditsMadeWhileLoading(account, atLoad, now)

    expect([...merged.logged[DAY]].sort(), "both, because a tick is a membership").toEqual(["s5", "s7"])
  })

  it("carries a rating they changed and leaves the ones they did not", () => {
    const atLoad = record({ daily: { [DAY]: { lm_health: 4, lm_money: 7 } } })
    const now = record({ daily: { [DAY]: { lm_health: 9, lm_money: 7 } } })
    const account = record({ daily: { [DAY]: { lm_health: 4, lm_money: 7, lm_fun: 2 } } })

    const merged = keepEditsMadeWhileLoading(account, atLoad, now)

    expect(merged.daily[DAY].lm_health, "theirs").toBe(9)
    expect(merged.daily[DAY].lm_money, "untouched").toBe(7)
    expect(merged.daily[DAY].lm_fun, "the account's, which they never saw").toBe(2)
  })

  it("carries a rating they CLEARED, which is not the same as one they never set", () => {
    const atLoad = record({ daily: { [DAY]: { lm_health: 4 } } })
    const now = record({ daily: {} })
    const account = record({ daily: { [DAY]: { lm_health: 4, lm_money: 7 } } })

    const merged = keepEditsMadeWhileLoading(account, atLoad, now)

    expect(merged.daily[DAY].lm_health, "cleared on purpose").toBeUndefined()
    expect(merged.daily[DAY].lm_money, "not theirs to clear").toBe(7)
  })

  it("carries a day note and a journal line typed in the window", () => {
    const atLoad = record({ notes: { [DAY]: "" }, journal: {} })
    const now = record({ notes: { [DAY]: "Went anyway." }, journal: { [DAY]: { f1: "Coffee." } } })
    const account = record({ notes: { [OTHER]: "Yesterday." }, journal: { [OTHER]: { f1: "Rain." } } })

    const merged = keepEditsMadeWhileLoading(account, atLoad, now)

    expect(merged.notes[DAY]).toBe("Went anyway.")
    expect(merged.journal[DAY]).toEqual({ f1: "Coffee." })
    expect(merged.notes[OTHER], "the account's day is untouched").toBe("Yesterday.")
    expect(merged.journal[OTHER]).toEqual({ f1: "Rain." })
  })

  /**
   * THE ORDINARY CASE, which must not become a merge. Nobody touched anything
   * while the read was in flight, so the account's copy is the answer whole —
   * including a day this browser has never had.
   */
  it("is the account's copy exactly when nothing was touched", () => {
    const atLoad = record({ logged: { [DAY]: ["s7"] } })
    const account = record({ logged: { [DAY]: ["s7"], [OTHER]: ["s5"] }, notes: { [OTHER]: "Yesterday." } })

    expect(keepEditsMadeWhileLoading(account, atLoad, atLoad)).toEqual(account)
  })

  it("and sends nothing in that case, or every load writes its own plan back", () => {
    const atLoad = record({ logged: { [DAY]: ["s7"] } })
    const account = record({ logged: { [DAY]: ["s7"], [OTHER]: ["s5"] } })

    expect(patchesBetween(account, keepEditsMadeWhileLoading(account, atLoad, atLoad))).toEqual([])
  })
})
