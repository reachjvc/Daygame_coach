"use client"

import { useEffect, useState, type Dispatch, type SetStateAction } from "react"

/**
 * `useState` that also keeps its value in this tab's session storage under `key`, so a half-typed line survives the part
 * of the page that holds it being left and come back to (`/plan/new` moves between screens, each its own page). With no
 * `key` it is plain `useState`, which is all `/plan` ever uses. Storage refused: the value just lives in state.
 */
export function useKeptState<T>(key: string | undefined | "", initial: T): [T, Dispatch<SetStateAction<T>>] {
  const [value, setValue] = useState<T>(() => {
    if (!key) return initial
    try {
      const raw = window.sessionStorage.getItem(key)
      return raw === null ? initial : (JSON.parse(raw) as T)
    } catch {
      return initial
    }
  })
  useEffect(() => {
    if (!key) return
    try { window.sessionStorage.setItem(key, JSON.stringify(value)) } catch { /* storage refused: the value stays in state */ }
  }, [key, value])
  return [value, setValue]
}
