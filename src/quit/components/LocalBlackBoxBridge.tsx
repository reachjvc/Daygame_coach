"use client"

import { useEffect } from "react"
import { useQuitBlackBoxLocal, type QuitBlackBoxApi } from "../blackbox"

/**
 * Renders nothing. For a visitor with no account it hands the tool the Black Box
 * that lives in this browser only: nothing is loaded from or sent to a server.
 */
export function LocalBlackBoxBridge({ viceId, onApi }: { viceId: string; onApi: (api: QuitBlackBoxApi | null) => void }) {
  const api = useQuitBlackBoxLocal(viceId)
  useEffect(() => {
    onApi(api)
    return () => onApi(null)
  }, [api, onApi])
  return null
}
