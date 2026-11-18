"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { usePathname, useSearchParams } from "next/navigation"
import { count } from "../count"
import { useQuitStore } from "../store"
import { clampScreen } from "./common"

/**
 * A tool's saved answers. `state` is null until the browser has read them
 * (the server render never shows answers), then `update` saves each change.
 */
export function useToolState<T extends object>(addiction: string, tool: string, initial: T) {
  const store = useQuitStore()
  const [state, setState] = useState<T | null>(null)
  const latest = useRef<T>(initial)
  const initialRef = useRef(initial)

  useEffect(() => {
    const stored = store.get(addiction, tool)
    const merged =
      stored && typeof stored === "object" && !Array.isArray(stored)
        ? ({ ...initialRef.current, ...(stored as object) } as T)
        : initialRef.current
    latest.current = merged
    setState(merged)
  }, [store, addiction, tool])

  const update = useCallback(
    (fn: (s: T) => T) => {
      const next = fn(latest.current)
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
      for (const k of ["preview", "present"]) if (sp.get(k) === "1") p.set(k, "1")
      for (const [k, v] of Object.entries(extra ?? {})) p.set(k, v)
      const q = p.toString()
      return q ? `${path}?${q}` : path
    },
    [sp],
  )
}

/**
 * One screen at a time, kept in `?s=N` so the browser Back button walks back.
 * A missing or out-of-range `s` lands on the first unanswered screen.
 * Screen `total + 1` is the result.
 */
export function useScreens(firstUnanswered: number, total: number) {
  const pathname = usePathname()
  const sp = useSearchParams()
  const screen = clampScreen(sp.get("s"), firstUnanswered, total)

  const hrefFor = useCallback(
    (n: number | null) => {
      const p = new URLSearchParams(sp.toString())
      if (n === null) p.delete("s")
      else p.set("s", String(n))
      const q = p.toString()
      return q ? `${pathname}?${q}` : pathname
    },
    [sp, pathname],
  )
  // The screens of the history entries made in this visit, and where we are in them.
  const trail = useRef<{ stack: number[]; idx: number }>({ stack: [screen], idx: 0 })
  useEffect(() => {
    const t = trail.current
    if (t.stack[t.idx] === screen) return
    if (t.stack[t.idx - 1] === screen) t.idx -= 1
    else if (t.stack[t.idx + 1] === screen) t.idx += 1
    else {
      t.stack = [...t.stack.slice(0, t.idx + 1), screen]
      t.idx += 1
    }
  }, [screen])

  // Native history calls: Next syncs useSearchParams with them and no server round trip is needed.
  const go = useCallback((n: number) => window.history.pushState(null, "", hrefFor(n)), [hrefFor])
  const reset = useCallback(() => {
    trail.current = { stack: [1], idx: 0 }
    window.history.replaceState(null, "", hrefFor(null))
  }, [hrefFor])
  /** Like the browser's Back: steps back in history when the previous screen is the previous entry, else rewrites this entry. Never adds one. */
  const back = useCallback(() => {
    const t = trail.current
    const prev = screen - 1
    if (prev < 1) return
    if (t.stack[t.idx - 1] === prev) {
      window.history.back()
      return
    }
    t.stack[t.idx] = prev
    window.history.replaceState(null, "", hrefFor(prev))
  }, [screen, hrefFor])
  return { screen, go, back, reset, isResult: screen === total + 1 }
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
