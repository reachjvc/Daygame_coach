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
import { emptyRecord, loadRecord, saveRecord, todayInBrowser } from "./blackboxStore"

export function useBlackBox() {
  const [record, setRecord] = useState<BlackBoxRecord>(emptyRecord)
  const [ready, setReady] = useState(false)
  const [today, setToday] = useState<string>("")

  useEffect(() => {
    setRecord(loadRecord(typeof window === "undefined" ? null : window.localStorage))
    setToday(todayInBrowser())
    setReady(true)
  }, [])

  /** Every write goes through here, so nothing can change the record without persisting it. */
  const update = useCallback((next: (current: BlackBoxRecord) => BlackBoxRecord) => {
    setRecord((current) => {
      const updated = next(current)
      saveRecord(typeof window === "undefined" ? null : window.localStorage, updated)
      return updated
    })
  }, [])

  return { record, update, ready, today }
}
