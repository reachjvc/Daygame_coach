"use client"

/**
 * Which version of the front door to render.
 *
 * Kept in its own localStorage key rather than in the vice state, for two
 * reasons: "start over" wipes the vice state and should not also throw away a
 * display preference, and a person switching versions is not editing their
 * quit — nothing about the choice belongs in the record of it.
 */

import { useEffect, useState } from "react"
import { DEFAULT_VERSION, VERSION_KEY, isVersionId, type ViceVersionId } from "../data/versions"

export function useViceVersion(): {
  version: ViceVersionId
  setVersion: (v: ViceVersionId) => void
  loaded: boolean
} {
  const [version, setVersionState] = useState<ViceVersionId>(DEFAULT_VERSION)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    const saved = window.localStorage.getItem(VERSION_KEY)
    if (isVersionId(saved)) setVersionState(saved)
    setLoaded(true)
  }, [])

  const setVersion = (v: ViceVersionId) => {
    setVersionState(v)
    window.localStorage.setItem(VERSION_KEY, v)
  }

  return { version, setVersion, loaded }
}
