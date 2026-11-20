"use client"

/**
 * The record, loaded once and written through on every change.
 *
 * Loads on mount rather than during render: the server has no `localStorage`,
 * so reading it during the first render produces markup that does not match the
 * client's and React throws the whole tree away. `ready` exists so the page can
 * tell "nothing recorded yet" apart from "not read yet" — showing the empty
 * state for a frame to somebody with four years of history is how a person
 * learns not to trust the screen.
 */

import { useCallback, useEffect, useState } from "react"
import type { BlackBoxRecord } from "../types"
import { mergeRecords } from "./viceSyncService"
import { BLACKBOX_KEY, emptyRecord, loadRecord, saveRecordMerged, todayInBrowser } from "./blackboxStore"

export function useBlackBox() {
  const [record, setRecord] = useState<BlackBoxRecord>(emptyRecord)
  const [ready, setReady] = useState(false)
  const [today, setToday] = useState<string>("")

  useEffect(() => {
    setRecord(loadRecord(typeof window === "undefined" ? null : window.localStorage))
    setToday(todayInBrowser())
    setReady(true)
  }, [])

  /**
   * A SECOND TAB IS NOT A SECOND RECORD.
   *
   * The whole record is loaded once and written back whole, so two tabs open on
   * this page each held their own copy and the last one to write won. File a
   * close call in the first tab, then anything at all in the second, and the
   * close call was gone — silently, with no error and nothing on screen, from
   * the one object this tool exists to accumulate over years. Opening a page
   * twice is not an exotic thing to do.
   *
   * `storage` fires in every OTHER tab of the same origin when one writes, so
   * the stale tab picks the new record up instead of overwriting it. It does
   * not make simultaneous writes safe — nothing local can — but simultaneous is
   * not the case that happens; stale is.
   */
  useEffect(() => {
    if (typeof window === "undefined") return
    // The stored record is MERGED into the one in memory, never put in its place: a replacement would drop a row
    // this tab has just written and not saved yet, and would bring back a row the tab has just removed.
    const pull = () => setRecord((cur) => mergeRecords(cur, loadRecord(window.localStorage)))
    const sync = (e: StorageEvent) => {
      // `key === null` is a whole-storage clear, which is also a change to this.
      if (e.key !== null && e.key !== BLACKBOX_KEY) return
      pull()
    }
    // A tab that was asleep (a phone with the browser in the background, a page restored from the back/forward
    // cache) has heard no `storage` events. Catch up when it wakes.
    const wake = () => {
      if (document.visibilityState === "visible") pull()
    }
    const show = (e: PageTransitionEvent) => {
      if (e.persisted) pull()
    }
    window.addEventListener("storage", sync)
    document.addEventListener("visibilitychange", wake)
    window.addEventListener("pageshow", show)
    return () => {
      window.removeEventListener("storage", sync)
      document.removeEventListener("visibilitychange", wake)
      window.removeEventListener("pageshow", show)
    }
  }, [])

  /**
   * Every write goes through here, so nothing can change the record without persisting it.
   *
   * THE CHANGE IS APPLIED TO THE NEWEST RECORD, NOT TO THE ONE THIS TAB LAST SAW: `next` receives the in-memory
   * record merged with what the browser holds now, so "take this slip back out" is judged against a slip another
   * tab may already have removed, and "start a run" against a run another tab may already have started. The result
   * is merged with the browser copy once more before it is saved (a stale row can never win).
   */
  const update = useCallback((next: (current: BlackBoxRecord) => BlackBoxRecord) => {
    setRecord((current) => {
      const storage = typeof window === "undefined" ? null : window.localStorage
      const base = storage ? mergeRecords(current, loadRecord(storage)) : current
      return saveRecordMerged(storage, next(base))
    })
  }, [])

  return { record, update, ready, today }
}
