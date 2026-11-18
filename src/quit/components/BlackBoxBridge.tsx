"use client"

import { useEffect } from "react"
import { useQuitBlackBox, type QuitBlackBoxApi } from "../blackbox"

/**
 * Renders nothing. Mounted only for a signed-in visitor, it loads the Black Box
 * and hands the tool its API; signed out, it is never mounted and nothing loads.
 */
export function BlackBoxBridge({ viceId, onApi }: { viceId: string; onApi: (api: QuitBlackBoxApi) => void }) {
  const api = useQuitBlackBox(viceId)
  useEffect(() => {
    onApi(api)
  }, [api, onApi])
  return null
}
