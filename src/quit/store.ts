"use client"

import { useRef } from "react"

export const QUIT_STORE_KEY = "quit-v1"

type Shape = Record<string, Record<string, unknown>>

/** Minimal storage surface, so tests can hand in one that throws. */
export interface StorageLike {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
}

export interface QuitStore {
  get(addiction: string, tool: string): unknown
  set(addiction: string, tool: string, value: unknown): void
  clear(addiction: string, tool: string): void
}

/**
 * State of the quit tools, kept in this browser only under `quit-v1`.
 * Every storage call is in try/catch; the in-memory copy answers when storage
 * is blocked or throws, so a tool still works for the visit.
 */
export function createQuitStore(getStorage: () => StorageLike | null): QuitStore {
  let memory: Shape = {}

  const read = (): Shape => {
    try {
      const raw = getStorage()?.getItem(QUIT_STORE_KEY)
      if (raw) {
        const parsed: unknown = JSON.parse(raw)
        if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) memory = parsed as Shape
      }
    } catch {
      // keep the in-memory copy
    }
    return memory
  }

  const write = (next: Shape) => {
    memory = next
    try {
      getStorage()?.setItem(QUIT_STORE_KEY, JSON.stringify(next))
    } catch {
      // in-memory only
    }
  }

  return {
    get: (a, tool) => read()[a]?.[tool],
    set: (a, tool, value) => {
      const all = read()
      write({ ...all, [a]: { ...all[a], [tool]: value } })
    },
    clear: (a, tool) => {
      const all = read()
      if (!all[a] || !(tool in all[a])) return
      const rest = { ...all[a] }
      delete rest[tool]
      write({ ...all, [a]: rest })
    },
  }
}

function browserStorage(): StorageLike | null {
  try {
    return typeof window === "undefined" ? null : window.localStorage
  } catch {
    return null
  }
}

export function useQuitStore(): QuitStore {
  const ref = useRef<QuitStore | null>(null)
  if (!ref.current) ref.current = createQuitStore(browserStorage)
  return ref.current
}

