"use client"

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react"
import { usePathname, useSearchParams } from "next/navigation"
import { count } from "../count"
import { QUIT_STORE_KEY, useQuitStore } from "../store"
import { clampScreen } from "./common"

/**
 * A tool's saved answers. `state` is null until the browser has read them
 * (the server render never shows answers), then `update` saves each change.
 * `parse` checks the stored shape and gives an empty state for anything bad.
 *
 * Each save starts from what storage holds right now, not from this tab's
 * copy, so a second tab's answers are kept; a change made in another tab is
 * picked up through the `storage` event.
 */
export function useToolState<T extends object>(addiction: string, tool: string, initial: T, parse: (stored: unknown) => T) {
  const store = useQuitStore()
  const [state, setState] = useState<T | null>(null)
  const latest = useRef<T>(initial)
  const initialRef = useRef(initial)
  const parseRef = useRef(parse)

  useEffect(() => {
    const read = () => {
      const next = parseRef.current(store.get(addiction, tool))
      latest.current = next
      setState(next)
    }
    read()
    const onStorage = (e: StorageEvent) => {
      if (e.key === null || e.key === QUIT_STORE_KEY) read()
    }
    window.addEventListener("storage", onStorage)
    return () => window.removeEventListener("storage", onStorage)
  }, [store, addiction, tool])

  const update = useCallback(
    (fn: (s: T) => T) => {
      const stored = store.get(addiction, tool)
      const base = stored === undefined ? latest.current : parseRef.current(stored)
      const next = fn(base)
      latest.current = next
      store.set(addiction, tool, next)
      setState(next)
    },
    [store, addiction, tool],
  )

  const clear = useCallback(() => {
    store.clear(addiction, tool)
    latest.current = initialRef.current
    setState(initialRef.current)
  }, [store, addiction, tool])

  return { state, update, clear }
}

/** `?preview=1` and `?present=1` follow every link a tool draws. */
export function useCarry() {
  const sp = useSearchParams()
  return useCallback(
    (path: string, extra?: Record<string, string>) => {
      const p = new URLSearchParams()
      for (const k of ["preview", "present"]) if (sp.getAll(k).includes("1")) p.set(k, "1")
      for (const [k, v] of Object.entries(extra ?? {})) p.set(k, v)
      const q = p.toString()
      return q ? `${path}?${q}` : path
    },
    [sp],
  )
}

/** The address bar's query, as a store `useScreens` reads: it changes on browser Back and Forward and on a screen move. */
const ADDRESS_MOVED = "quit-address-moved"
function subscribeAddress(onChange: () => void) {
  window.addEventListener("popstate", onChange)
  window.addEventListener(ADDRESS_MOVED, onChange)
  return () => {
    window.removeEventListener("popstate", onChange)
    window.removeEventListener(ADDRESS_MOVED, onChange)
  }
}
const readAddress = () => window.location.search
const readNoAddress = () => null
const addressMoved = () => window.dispatchEvent(new Event(ADDRESS_MOVED))

/**
 * One screen at a time, kept in `?s=N` so the browser Back button walks back.
 * A missing or out-of-range `s` lands on the first unanswered screen.
 * Screen `total + 1` is the result.
 */
export function useScreens(firstUnanswered: number, total: number, ready = true) {
  const pathname = usePathname()
  const sp = useSearchParams()
  // The screen comes from the address bar itself, not from Next's copy of it. After a reload, each browser Back
  // makes Next fetch that address from the server; a screen change made while that fetch is out was rolled back
  // when it landed (address `?s=1`, screen 2 still drawn). The server render and the first client render use
  // Next's copy, which is the same address then.
  const search = useSyncExternalStore(subscribeAddress, readAddress, readNoAddress)
  const screen = clampScreen((search === null ? sp : new URLSearchParams(search)).get("s"), firstUnanswered, total)

  const hrefFor = useCallback(
    (n: number | null) => {
      const p = new URLSearchParams(window.location.search)
      if (n === null) p.delete("s")
      else p.set("s", String(n))
      const q = p.toString()
      return q ? `${pathname}?${q}` : pathname
    },
    [pathname],
  )
  // The screens of the history entries made in this visit, and where we are in them.
  // It starts only once the saved answers are read: before that the screen is a guess,
  // and a wrong first entry made Back step into an entry that showed the same screen twice.
  const trail = useRef<{ stack: number[]; idx: number } | null>(null)
  useEffect(() => {
    if (!ready) return
    const t = trail.current
    if (!t) {
      trail.current = { stack: [screen], idx: 0 }
      return
    }
    if (t.stack[t.idx] === screen) return
    if (t.stack[t.idx - 1] === screen) t.idx -= 1
    else if (t.stack[t.idx + 1] === screen) t.idx += 1
    else {
      t.stack = [...t.stack.slice(0, t.idx + 1), screen]
      t.idx += 1
    }
  }, [screen, ready])

  // A new screen takes focus, so a keyboard or screen-reader reader starts at its top.
  const shown = useRef<number | null>(null)
  useEffect(() => {
    if (!ready) return
    const first = shown.current === null
    const changed = shown.current !== screen
    shown.current = screen
    if (first || !changed) return
    // A new screen opens at its top, not where the last one was scrolled to.
    window.scrollTo?.({ top: 0 })
    const el = document.querySelector<HTMLElement>('[data-testid="question"], [data-testid="result"]')
    if (!el) return
    if (!el.hasAttribute("tabindex")) el.tabIndex = -1
    el.style.outline = "none"
    el.focus({ preventScroll: true })
  }, [screen, ready])

  // Native history calls: Next syncs useSearchParams with them and no server round trip is needed.
  const go = useCallback(
    (n: number) => {
      window.history.pushState(null, "", hrefFor(n))
      addressMoved()
    },
    [hrefFor],
  )
  const reset = useCallback(() => {
    trail.current = { stack: [1], idx: 0 }
    window.history.replaceState(null, "", hrefFor(null))
    addressMoved()
  }, [hrefFor])
  /** Like the browser's Back: steps back in history when the previous screen is the previous entry, else rewrites this entry. Never adds one. */
  const back = useCallback(() => {
    const t = trail.current
    const prev = screen - 1
    if (prev < 1 || !t) return
    if (t.stack[t.idx - 1] === prev) {
      window.history.back()
      return
    }
    t.stack[t.idx] = prev
    window.history.replaceState(null, "", hrefFor(prev))
    addressMoved()
  }, [screen, hrefFor])
  /** How many history entries this visit has added behind the one shown. */
  const depth = useCallback(() => trail.current?.idx ?? 0, [])
  /**
   * Ends the visit's trail: goes back over every entry the visit added (`extra` more from before a reload) and
   * rewrites the entry it lands on to the plain address, so one browser Back from there leaves the tool.
   */
  const settle = useCallback(
    (extra = 0) => {
      const steps = depth() + extra
      if (steps <= 0) {
        trail.current = null
        window.history.replaceState(null, "", hrefFor(null))
        return
      }
      const plain = hrefFor(null)
      const onPop = () => {
        window.removeEventListener("popstate", onPop)
        window.history.replaceState(null, "", plain)
        // the entry we landed on is the new start of the trail
        trail.current = null
      }
      window.addEventListener("popstate", onPop)
      window.history.go(-steps)
    },
    [depth, hrefFor],
  )
  return { screen, go, back, reset, depth, settle, isResult: screen === total + 1 }
}

/** Counts `start` once, on the first answer of a visit that had none. */
export function useStartCount(addiction: string, tool: string) {
  const sent = useRef(false)
  return useCallback(() => {
    if (sent.current) return
    sent.current = true
    count(addiction, tool, "start")
  }, [addiction, tool])
}

/** Counts `done` when the result screen shows. */
export function useDoneCount(addiction: string, tool: string, onResult: boolean) {
  useEffect(() => {
    if (onResult) count(addiction, tool, "done")
  }, [addiction, tool, onResult])
}
