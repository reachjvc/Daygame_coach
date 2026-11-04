// @vitest-environment jsdom
/**
 * TWO STOPS OF ONE RUNNING TIMER MEAN IT ENDED WHEN IT WAS FIRST STOPPED.
 *
 * The owner stops Gym on the phone after the gym. The PC tab, open at home, has
 * not checked since, so it still shows Gym running, and Stop is pressed there
 * too, minutes later. The PC's write is refused as stale (D1) and merged three
 * ways — and both sides had changed the end, so the later sender won: Gym ended
 * at the PC's press, minutes it never ran. When the phone had already started
 * Shower, Gym overlapped it and those minutes were counted twice. And nothing
 * said the other device had changed the entry, although D1 promises that.
 *
 * The rule now: when the copy both stops were made on had the timer running,
 * the earlier stop wins. An edit to an entry that had already ended keeps the
 * old rule (the later sender wins), because moving a finished entry's end is a
 * choice, not a second press of Stop. Either way, when the other device's value
 * is kept over one this device changed, this device says so.
 */

import { cleanup } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest"

import { mergeRow } from "@/src/timetrack/syncVersionService"
import { epochSeconds } from "@/src/timetrack/timetrackFormatService"
import { stateToRows } from "@/src/timetrack/timetrackMapperService"
import { startTimer, stopTimer } from "@/src/timetrack/timetrackService"
import type { TimetrackState } from "@/src/timetrack/types"

import { renderDevice, wait } from "./deviceHarness"
import { fakeAccount } from "./fakeAccount"
import { baseState, entry } from "./helpers"

const USER = "user-1"
/** when the phone stopped Gym */
const PHONE_STOP = "2026-08-10T12:00:00.000Z"

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
  vi.useRealTimers()
  window.localStorage.clear()
})

beforeEach(() => {
  window.localStorage.clear()
  vi.useFakeTimers()
  vi.setSystemTime(new Date("2026-08-10T11:59:00.000Z"))
})

const shape = entry("gym", "2026-08-10", "10:00", "11:00", { description: "Gym" })
const gym = { ...shape, stop: null, duration: -epochSeconds(shape.start) }
const withGymRunning = (): TimetrackState => baseState({ entries: [gym] })
const stopNow = (current: TimetrackState) => stopTimer(current, new Date().toISOString()).state

/** The PC tab, open since before the phone's Stop, and in step with the account then */
async function pcShowingGymRunning() {
  const account = fakeAccount(stateToRows(withGymRunning(), USER))
  vi.stubGlobal("fetch", vi.fn(account.fetch))
  const pc = renderDevice(withGymRunning())
  await wait(1_000)
  return { account, pc }
}

describe("the PC presses Stop on a timer the phone stopped before it checked", () => {
  test("Gym still ends when the phone stopped it, and the PC says the other device changed it", async () => {
    const { account, pc } = await pcShowingGymRunning()
    account.stop("gym", PHONE_STOP)

    vi.setSystemTime(new Date(Date.parse(PHONE_STOP) + 20_000))
    pc.apply(stopNow)
    await wait(3_000)

    expect(account.conflicts, "the PC's stale Stop was never refused, so this proves nothing").toBeGreaterThan(0)
    expect(account.entry("gym")?.stopped_at, "Gym ends at the PC's later press").toBe(PHONE_STOP)
    expect(pc.latest().entries.find((e) => e.id === "gym")?.stop, "the PC shows its own later stop").toBe(PHONE_STOP)
    expect(
      pc.toasts().some((text) => /other device/i.test(text) && text.includes("Gym")),
      `no "changed on your other device" notice; toasts: ${JSON.stringify(pc.toasts())}`,
    ).toBe(true)
  })

  test("Gym does not overlap the Shower the phone started when it stopped Gym", async () => {
    const { account, pc } = await pcShowingGymRunning()
    account.stop("gym", PHONE_STOP)
    const withShower = startTimer(
      stopTimer(withGymRunning(), PHONE_STOP).state,
      { description: "Shower", projectId: null, taskId: null, tagIds: [], billable: false },
      PHONE_STOP,
    ).state
    const shower = withShower.entries.find((e) => e.description === "Shower")!
    const showerRow = stateToRows(withShower, USER).timetrack_entries.find((row) => row.id === shower.id)!
    account.edit("timetrack_entries", shower.id, showerRow as unknown as Record<string, unknown>)

    vi.setSystemTime(new Date(Date.parse(PHONE_STOP) + 15_000))
    pc.apply(stopNow)
    await wait(3_000)

    const gymEnds = Date.parse(String(account.entry("gym")?.stopped_at))
    const showerStarts = Date.parse(String(account.entry(shower.id)?.started_at))
    expect((gymEnds - showerStarts) / 1000, "Gym overlaps Shower: that time is counted twice").toBeLessThanOrEqual(0)
  })
})

describe("the merge of two stops", () => {
  const rowOf = (start: string, stop: string | null) =>
    stateToRows(
      baseState({
        entries: [
          {
            ...shape,
            start,
            stop,
            duration: stop ? Math.round((Date.parse(stop) - Date.parse(start)) / 1000) : -epochSeconds(start),
          },
        ],
      }),
      USER,
    ).timetrack_entries[0] as unknown as Record<string, unknown>
  const START = "2026-08-10T10:00:00.000Z"

  test("of a running timer keeps the earlier one, whichever side made it", () => {
    const base = rowOf(START, null)
    const early = rowOf(START, "2026-08-10T11:00:00.000Z")
    const late = rowOf(START, "2026-08-10T11:30:00.000Z")

    const theirsEarlier = mergeRow("timetrack_entries", base, late, early)
    expect(theirsEarlier.stopped_at).toBe("2026-08-10T11:00:00.000Z")
    expect(theirsEarlier.duration_seconds).toBe(3600)

    const mineEarlier = mergeRow("timetrack_entries", base, early, late)
    expect(mineEarlier.stopped_at).toBe("2026-08-10T11:00:00.000Z")
    expect(mineEarlier.duration_seconds).toBe(3600)
  })

  test("of an entry that had already ended keeps this device's, as before", () => {
    const base = rowOf(START, "2026-08-10T11:00:00.000Z")
    const mine = rowOf(START, "2026-08-10T11:45:00.000Z")
    const theirs = rowOf(START, "2026-08-10T11:15:00.000Z")

    const merged = mergeRow("timetrack_entries", base, mine, theirs)
    expect(merged.stopped_at).toBe("2026-08-10T11:45:00.000Z")
    expect(merged.duration_seconds).toBe(6300)
  })
})
