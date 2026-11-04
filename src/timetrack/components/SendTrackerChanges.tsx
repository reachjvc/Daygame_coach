"use client"

/**
 * THE TRACKER'S SYNC WITHOUT THE TRACKER, FOR LOG OUT.
 *
 * Log Out can be pressed on any page, and what waits to be sent is in this
 * browser's storage, not in a screen. Mounted while Log Out tries to send, this
 * reads the workspace this browser holds and runs the same first contact and
 * upload the tracker runs (`useTimetrackSync`) — the rebase onto the account's
 * copy, the versioned write, the merge when the other device changed a row —
 * and draws nothing. It writes nothing but the queue: the workspace on disk is
 * left as it was, and the next tracker opening reads the account again.
 *
 * Only for the account this browser's copy belongs to — recorded, or named by
 * the copy's own rows when it was kept before owners were recorded. If another
 * account answers, it sends nothing and says so (`onStranger`); that copy is
 * not the person's who is logging out.
 */

import { useCallback, useEffect, useState } from "react"

import { accountTheCopyNames, browserOwner } from "../browserOwner"
import { STATE_VERSION, STORAGE_KEY } from "../config"
import { useTimetrackSync } from "../hooks/useTimetrackSync"
import type { TimetrackState } from "../types"

function heldWorkspace(): TimetrackState | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    const parsed = raw ? (JSON.parse(raw) as TimetrackState) : null
    return parsed?.workspace && Array.isArray(parsed.entries) && parsed.version === STATE_VERSION ? parsed : null
  } catch {
    return null
  }
}

const quiet = () => {}

export function SendTrackerChanges({ onStranger }: { onStranger: () => void }) {
  const [state, setState] = useState<TimetrackState | null>(null)
  // a copy with no owner recorded says whose it is by its own rows; one that says nothing is sent for nobody in particular
  const [account] = useState(() => browserOwner() || accountTheCopyNames() || undefined)
  useEffect(() => setState(heldWorkspace()), [])
  const update = useCallback(
    (change: (current: TimetrackState) => TimetrackState) => setState((current) => (current ? change(current) : current)),
    [],
  )
  const replace = useCallback((next: TimetrackState) => setState(next), [])
  useTimetrackSync({ state, setState: update, replaceState: replace, pushToast: quiet, account, onAccountChanged: onStranger })
  return null
}
