/**
 * Time-tracking slice — the Timer list's numbers, worked out once per change to the
 * entries rather than once per second.
 *
 * The list rebuilt its day groups and recomputed "This week" from the whole history on
 * every render: every keystroke in "What are you working on?" and every second while a
 * timer ran. At 1,800 entries the week total alone took 41 ms a render, at 7,000 it
 * took 203 ms, and typing lagged ~215 ms a key on a PC and ~380 ms on a phone
 * (heavy-user audit of 2026-11-04, D6).
 *
 * Two things change with the clock: a running entry's length, and whether a planned
 * entry's start has passed (`isPlanned`, which keeps a plan out of every total). So the
 * finished entries are worked out once per STAGE (`plannedStageService`) — redone the
 * second a planned entry starts — and each second redoes only the running entry and
 * the days it can touch.
 */

import { startsInOrder, stageAt } from "./plannedStageService"
import { dateKey, epochSeconds, startOfDayIso, weekStartOf } from "./timetrackFormatService"
import { buildDayGroups, isRunning, weekTotalSeconds } from "./timetrackService"
import type { DayGroup, IsoDate, TimeEntry, WeekStart } from "./types"

export interface TimerList {
  /** the entries the list shows: every one not deleted on the server */
  entries: TimeEntry[]
  /** the day groups as they read at `nowSec`; the same array while nothing changes */
  groupsAt(nowSec: number): DayGroup[]
  /** "This week" at `nowSec`, for the week holding `todayKey` */
  weekSecondsAt(todayKey: IsoDate, weekStart: WeekStart, nowSec: number): number
}

export function timerList(allEntries: TimeEntry[], groupSimilar: boolean): TimerList {
  const entries = allEntries.filter((e) => !e.serverDeletedAt)
  const ticking = entries.filter(isRunning)
  const finished = ticking.length ? entries.filter((e) => !isRunning(e)) : entries
  const starts = startsInOrder(finished)

  /**
   * The days a running entry can change: the one it started on and every later one. Each
   * second those days are rebuilt from the entries that reach into them — all of a day's
   * own entries, and any finished one that ran over midnight into it — so such a day
   * reads exactly as a full rebuild reads it, whatever a day's total is made to count.
   * The entries keep their own order, which is what breaks a tie in the sort.
   */
  const firstLiveDay = ticking.reduce<IsoDate | null>((first, e) => {
    const day = dateKey(e.start)
    return first === null || day < first ? day : first
  }, null)
  const liveFrom = firstLiveDay === null ? 0 : epochSeconds(startOfDayIso(firstLiveDay))
  const nearby = firstLiveDay === null ? [] : entries.filter((e) => isRunning(e) || epochSeconds(e.stop!) >= liveFrom)

  // what holds for one stage: built at a second inside it, valid for every second inside it
  let built: { stage: number; settled: DayGroup[]; before: DayGroup[]; week: { start: IsoDate; seconds: number } | null } | null = null
  const forStage = (nowSec: number) => {
    const stage = stageAt(starts, nowSec)
    if (built?.stage !== stage) {
      const settled = buildDayGroups(entries, { groupSimilar, nowSec })
      const before = firstLiveDay === null ? settled : settled.filter((group) => group.date < firstLiveDay)
      built = { stage, settled, before, week: null }
    }
    return built
  }

  return {
    entries,
    groupsAt(nowSec) {
      const stage = forStage(nowSec)
      if (firstLiveDay === null) return stage.settled
      const fresh = buildDayGroups(nearby, { groupSimilar, nowSec }).filter((group) => group.date >= firstLiveDay)
      return [...fresh, ...stage.before]
    },
    weekSecondsAt(todayKey, weekStart, nowSec) {
      const stage = forStage(nowSec)
      // a week is named by its first day, which differs for every week start
      const start = weekStartOf(todayKey, weekStart)
      if (stage.week?.start !== start) stage.week = { start, seconds: weekTotalSeconds(finished, todayKey, weekStart, nowSec) }
      return stage.week.seconds + (ticking.length ? weekTotalSeconds(ticking, todayKey, weekStart, nowSec) : 0)
    },
  }
}
