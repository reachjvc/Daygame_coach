"use client"

import { useEffect, useRef } from "react"

import type { TimeEntry } from "../types"

/** What the tab says when nothing is tracking. It named a lab page, on a tab somebody has open all day. */
const BASE = "Time Log"

/**
 * THE TAB'S TITLE MIRRORS THE RUNNING TIMER, LIKE TOGGL: "0:25:03 · Writing".
 *
 * Not while the timer is `unsure` (`TimerUnsureContext`): a timer the other
 * device stopped must not tick on in the tab either. Moved here from
 * `useTimetrack` so it can know that, which only the sync knows.
 */
export function useTabTitle(running: TimeEntry | null, runningSeconds: number, unsure: boolean): void {
  /** what this hook last wrote into the tab, so leaving can tell whether it is still there */
  const titleWritten = useRef<string | null>(null)
  useEffect(() => {
    if (typeof document === "undefined") return
    if (!running || unsure) {
      document.title = BASE
      titleWritten.current = BASE
      return
    }
    const h = Math.floor(runningSeconds / 3600)
    const m = Math.floor((runningSeconds % 3600) / 60)
    const s = runningSeconds % 60
    const clock = `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`
    document.title = `${clock} · ${running.description || "(no description)"}`
    titleWritten.current = document.title
  }, [running, runningSeconds, unsure])

  /**
   * LEAVING PUTS THE TRACKER'S NAME BACK ONLY IF NOTHING ELSE HAS WRITTEN THE TAB.
   *
   * This used to be the clean-up of the effect above, run on every tick and on
   * the way out. On the way out it ran too late: React writes the next page's
   * <title> while it commits the navigation and runs this clean-up afterwards,
   * so leaving with a timer running left the Dashboard's tab reading "Time"
   * (getting-around #11 in Plans/time-tracker-like-toggl.md). The clock is
   * still replaced when the next page's title is the same text as this one —
   * then React has nothing to write and the clock would stay behind.
   */
  useEffect(
    () => () => {
      if (typeof document === "undefined") return
      if (titleWritten.current !== null && document.title === titleWritten.current) document.title = BASE
    },
    [],
  )
}
