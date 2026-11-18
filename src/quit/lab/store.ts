"use client"

import { useCallback, useEffect, useState } from "react"
import type { StorageLike } from "../store"

export const LAB_STORE_KEY = "quit-lab-v1"

type Shape = Record<string, unknown>

export interface LabStore {
  get(tool: string, variant: string, key: string): unknown
  set(tool: string, variant: string, key: string, value: unknown): void
}

const slot = (tool: string, variant: string, key: string) => `${tool}/${variant}/${key}`

/**
 * State of the lab variants, kept in this browser only under `quit-lab-v1`,
 * flat: `<tool>/<variant>/<key>`. Same rules as `quit-v1`: every storage call
 * is in try/catch and the in-memory copy answers when storage is blocked.
 */
export function createLabStore(getStorage: () => StorageLike | null): LabStore {
  let memory: Shape = {}

  const read = (): Shape => {
    try {
      const raw = getStorage()?.getItem(LAB_STORE_KEY)
      if (raw) {
        const parsed: unknown = JSON.parse(raw)
        if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) memory = parsed as Shape
      }
    } catch {
      // keep the in-memory copy
    }
    return memory
  }

  return {
    get: (tool, variant, key) => read()[slot(tool, variant, key)],
    set: (tool, variant, key, value) => {
      memory = { ...read(), [slot(tool, variant, key)]: value }
      try {
        getStorage()?.setItem(LAB_STORE_KEY, JSON.stringify(memory))
      } catch {
        // in-memory only
      }
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

let shared: LabStore | null = null
export function labStore(): LabStore {
  if (!shared) shared = createLabStore(browserStorage)
  return shared
}

/** `[value, set]` for one key of one variant; `initial` until the browser copy is read (SSR-safe). */
export function useLabState<T>(tool: string, variant: string, key: string, initial: T): [T, (next: T) => void] {
  const [value, setValue] = useState<T>(initial)
  useEffect(() => {
    const stored = labStore().get(tool, variant, key)
    if (stored !== undefined) setValue(stored as T)
  }, [tool, variant, key])
  const set = useCallback(
    (next: T) => {
      labStore().set(tool, variant, key, next)
      setValue(next)
    },
    [tool, variant, key],
  )
  return [value, set]
}
