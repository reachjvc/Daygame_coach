"use client"

import { useEffect, useMemo, useState } from "react"
import { useLabState } from "../../store"

export interface Marked {
  /** true for the made-up example entries */
  ex?: boolean
}

export interface Diary<T extends Marked> {
  ready: boolean
  now: number
  items: T[]
  hasExample: boolean
  /** Replace the whole list (keeps the example entries unless the caller drops them). */
  save: (next: T[]) => void
  clearExample: () => void
}

/**
 * Entries of one diary copy. Until the user changes something, the list is the labelled
 * example data (`make(now)`); the first change writes the whole list to `quit-lab-v1`.
 * `make` must be a stable function (declared at module level).
 */
export function useDiary<T extends Marked>(letter: string, make: (now: number) => T[], key = "entries"): Diary<T> {
  const [stored, setStored] = useLabState<T[] | null>("diary", letter, key, null)
  const [ready, setReady] = useState(false)
  const [now, setNow] = useState(0)
  useEffect(() => {
    setNow(Date.now())
    setReady(true)
  }, [])
  const seed = useMemo(() => (ready ? make(now) : []), [ready, now, make])
  const items = stored ?? seed
  return {
    ready,
    now,
    items,
    hasExample: items.some((e) => e.ex),
    save: (next) => setStored(next),
    clearExample: () => setStored(items.filter((e) => !e.ex)),
  }
}
