// @vitest-environment jsdom
/**
 * A PHONE CHANGING TIME ZONE CHANGES WHAT IS SHOWN, NEVER WHAT IS STORED.
 *
 * Clock trap 4 of the Time Log test plan. Entries are made in Europe/Copenhagen
 * and then looked at from a browser in America/New_York or Asia/Tokyo (a flight,
 * or a phone that changes zone by itself). The rule the app has: every time on
 * the page is drawn in THIS BROWSER'S zone (`browserTimeZone`), whatever zone
 * the workspace was made in (`settingsShowsTheZoneThisPageDrawsIn`). A stored
 * time is an instant, so nothing about it may move. The lock-screen notification
 * is built on the server from the zone saved with the person, so it does not
 * follow the phone.
 *
 * Zones are set per test with `useZone` (see `clockTraps.ts`) and put back after.
 * January 2027: Copenhagen is UTC+1, New York UTC-5, Tokyo UTC+9, none changes.
 *
 * The fixtures are made in Copenhagen:
 *   Late     Tue 12 Jan 23:30 -> Wed 13 Jan 00:30   (22:30Z -> 23:30Z)
 *   Morning  Wed 13 Jan 09:00 -> 10:00              (08:00Z -> 09:00Z)
 */

import { cleanup, render } from "@testing-library/react"
import { afterEach, describe, expect, test, vi } from "vitest"

import { SettingsView } from "@/src/timetrack/components/SettingsView"
import { EntryList } from "@/src/timetrack/components/EntryList"
import { runningPayload, type TimerRow } from "@/src/timetrack/runningTimerService"
import {
  dateKey,
  formatTimeOfDay,
  fromLocalInputValue,
  localIsoWithOffset,
  toLocalInputValue,
} from "@/src/timetrack/timetrackFormatService"
import { buildDayGroups, daySeconds, entrySeconds } from "@/src/timetrack/timetrackService"
import type { TimeEntry, TimetrackState } from "@/src/timetrack/types"

import { baseState } from "../helpers"
import { boxValues, COPENHAGEN, freezeClockAt, movePhoneTo, restoreZoneAfterEach, secondsOf, useZone, withEntry, withTimerSince } from "./clockTraps"

// the tab switch scrolls its active chip into view, which jsdom cannot do
Element.prototype.scrollIntoView = Element.prototype.scrollIntoView ?? (() => {})

const HOUR = 3600
const MINUTE = 60
/** Wed 13 Jan 2027 12:00 in Copenhagen = 11:00Z, the same instant wherever the phone is */
const NOW_ISO = "2027-01-13T11:00:00.000Z"
const NOW_SEC = secondsOf(NOW_ISO)

/** made while the suite is still in Copenhagen, before any test moves the phone */
const MADE_IN_COPENHAGEN = (() => {
  let state = baseState({ user: { ...baseState().user, timezone: COPENHAGEN } })
  state = withEntry("2027-01-12T22:30:00.000Z", "2027-01-12T23:30:00.000Z", "Late", state)
  state = withEntry("2027-01-13T08:00:00.000Z", "2027-01-13T09:00:00.000Z", "Morning", state)
  return state
})()
const entryOf = (state: TimetrackState, name: string): TimeEntry => state.entries.find((e) => e.description === name)!

const showList = (state: TimetrackState) =>
  render(<EntryList state={state} setState={vi.fn()} nowSec={NOW_SEC} pushToast={vi.fn()} onEditEntry={vi.fn()} />)

freezeClockAt(() => NOW_ISO)
afterEach(cleanup)

/** the same checks under each zone, so the zone is the only thing that differs */
interface Phone {
  zone: string
  morning: [string, string]
  lateStart: string
  lateDay: string
  /** the minutes the "Late" entry puts on Tuesday 12th and Wednesday 13th */
  lateMinutes: [number, number]
}
const PHONES: Phone[] = [
  { zone: "America/New_York", morning: ["03:00", "04:00"], lateStart: "17:30", lateDay: "2027-01-12", lateMinutes: [60, 0] },
  { zone: "Asia/Tokyo", morning: ["17:00", "18:00"], lateStart: "07:30", lateDay: "2027-01-13", lateMinutes: [0, 60] },
]

describe.each(PHONES)("a phone in $zone", (phone) => {
  useZone(() => phone.zone)

  test("draws the Copenhagen entries on its own clock", () => {
    const view = showList(MADE_IN_COPENHAGEN)
    expect(boxValues(view.container)).toEqual(expect.arrayContaining(phone.morning))
  })

  test("reads the same moment from a time-of-day label", () => {
    expect([formatTimeOfDay(entryOf(MADE_IN_COPENHAGEN, "Morning").start), formatTimeOfDay(entryOf(MADE_IN_COPENHAGEN, "Morning").stop!)]).toEqual(phone.morning)
  })

  test("leaves the stored times exactly as they were made", () => {
    const snapshot = JSON.stringify(MADE_IN_COPENHAGEN)
    const setState = vi.fn()
    render(<EntryList state={MADE_IN_COPENHAGEN} setState={setState} nowSec={NOW_SEC} pushToast={vi.fn()} onEditEntry={vi.fn()} />)

    expect(setState).not.toHaveBeenCalled()
    expect(JSON.stringify(MADE_IN_COPENHAGEN)).toBe(snapshot)
    expect(entryOf(MADE_IN_COPENHAGEN, "Morning").start).toBe("2027-01-13T08:00:00.000Z")
  })

  test("gives the late entry the day its own clock says", () => {
    expect(dateKey(entryOf(MADE_IN_COPENHAGEN, "Late").start)).toBe(phone.lateDay)
    expect(formatTimeOfDay(entryOf(MADE_IN_COPENHAGEN, "Late").start)).toBe(phone.lateStart)
  })

  test("splits the late entry's hour over the days its own clock puts it on", () => {
    const late = [entryOf(MADE_IN_COPENHAGEN, "Late")]
    expect([daySeconds(late, "2027-01-12", NOW_SEC) / MINUTE, daySeconds(late, "2027-01-13", NOW_SEC) / MINUTE]).toEqual(phone.lateMinutes)
  })

  test("keeps every entry's length", () => {
    expect(MADE_IN_COPENHAGEN.entries.map((e) => entrySeconds(e, NOW_SEC))).toEqual([HOUR, HOUR])
  })

  test("keeps a running timer's length: from the Copenhagen morning it has run the same three hours", () => {
    const timer = withTimerSince("2027-01-13T08:00:00.000Z").entries[0]
    expect(entrySeconds(timer, NOW_SEC)).toBe(3 * HOUR)
  })

  test("reads a running timer's clock the same as a phone in Copenhagen would", () => {
    const view = showList(withTimerSince("2027-01-13T08:00:00.000Z"))
    expect(boxValues(view.container)).toContain("3:00:00")
  })

  test("hands the sheet's date-and-time boxes the phone's clock, and takes back the same moment", () => {
    const start = entryOf(MADE_IN_COPENHAGEN, "Morning").start
    expect(fromLocalInputValue(toLocalInputValue(start))).toBe(start)
  })

  test("writes an exported time with the phone's offset, naming the same moment", () => {
    const start = entryOf(MADE_IN_COPENHAGEN, "Morning").start
    const written = localIsoWithOffset(start)
    expect(written.endsWith(phone.zone === "Asia/Tokyo" ? "+09:00" : "-05:00")).toBe(true)
    expect(Date.parse(written)).toBe(Date.parse(start))
  })

  test("says its own zone in Settings, not the one the workspace was made in", () => {
    const view = render(
      <SettingsView
        state={MADE_IN_COPENHAGEN}
        setState={vi.fn()}
        nowSec={NOW_SEC}
        pushToast={vi.fn()}
        resetWorkspace={vi.fn()}
        replaceState={vi.fn()}
        requestNotificationPermission={vi.fn()}
        tab="profile"
        setTab={vi.fn()}
        syncStatus="Saved"
        onUploadEverything={vi.fn()}
      />,
    )
    const zone = [...view.container.querySelectorAll("input")].find((input) => /\//.test(input.value))

    expect(MADE_IN_COPENHAGEN.user.timezone).toBe(COPENHAGEN)
    expect(zone?.value).toBe(phone.zone)
  })
})

describe("the same entries from Copenhagen, then from Tokyo", () => {
  restoreZoneAfterEach()
  const groups = () => buildDayGroups(MADE_IN_COPENHAGEN.entries, { groupSimilar: false, nowSec: NOW_SEC })

  test("sit on two days in Copenhagen and on one day in Tokyo", () => {
    expect(groups().map((g) => g.date)).toEqual(["2027-01-13", "2027-01-12"])
    movePhoneTo("Asia/Tokyo")
    expect(groups().map((g) => g.date)).toEqual(["2027-01-13"])
  })

  test("add up to the same two hours on the day headers, in both", () => {
    const total = () => groups().reduce((sum, g) => sum + g.totalSeconds, 0)
    const inCopenhagen = total()
    movePhoneTo("Asia/Tokyo")
    expect([inCopenhagen, total()]).toEqual([2 * HOUR, 2 * HOUR])
  })

  test("are not rewritten by being looked at from another zone", () => {
    const snapshot = JSON.stringify(MADE_IN_COPENHAGEN.entries)
    movePhoneTo("America/New_York")
    buildDayGroups(MADE_IN_COPENHAGEN.entries, { groupSimilar: true, nowSec: NOW_SEC })
    expect(JSON.stringify(MADE_IN_COPENHAGEN.entries)).toBe(snapshot)
  })
})

describe("the lock-screen timer", () => {
  restoreZoneAfterEach()
  const timer: TimerRow = {
    id: "t",
    description: "Gym",
    projectName: null,
    startedAt: "2027-01-13T08:05:00.000+00:00",
    stoppedAt: null,
    deletedAt: null,
    updatedAt: "2027-01-13T08:05:00.000+00:00",
  }

  test("says the time in the zone saved with the person, though the phone is in New York", () => {
    movePhoneTo("America/New_York")
    expect(runningPayload(timer, COPENHAGEN, new Date(NOW_ISO)).title).toBe("● Gym · since 09:05")
  })

  test("follows the person's saved zone when that is changed to Tokyo", () => {
    expect(runningPayload(timer, "Asia/Tokyo", new Date(NOW_ISO)).title).toBe("● Gym · since 17:05")
  })
})
