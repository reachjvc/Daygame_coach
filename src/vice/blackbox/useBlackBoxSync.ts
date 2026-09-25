"use client"

/**
 * THE ONLY THING THAT TALKS TO THE ACCOUNT.
 *
 * `useBlackBox` owns the record and the browser copy; this owns the
 * conversation with the server. Everything decidable is decided in
 * `viceSyncService`, which has no network, no clock and no storage, so what is
 * left here is genuinely only the talking.
 *
 * ----------------------------------------------------------------------------
 * THE BROWSER STAYS THE WORKING COPY. The page renders from the local record
 * and never waits for a request — the one moment this tool exists for is
 * eleven at night, on a phone, possibly on no signal, and a tool that shows a
 * spinner at that moment is not the tool. Syncing happens behind that, and the
 * worst thing a failed sync does is leave a line of text at the foot saying so.
 *
 * ----------------------------------------------------------------------------
 * THE WATERMARK, AND WHY IT ONLY MOVES ON A SUCCESS.
 *
 * `sentUpTo` is the newest `updatedAt` the server has acknowledged. Rows
 * stamped later are unsent. It advances only when a push comes back ok, so
 * anything that did not land is sent again rather than quietly forgotten — and
 * it is kept in its own key, because losing it costs one redundant full push
 * (every write is an upsert on a stable id) and keeping a wrong one costs a
 * night.
 *
 * A KNOWN, DELIBERATE REDUNDANCY: rows merged in FROM the server may be sent
 * straight back once, because the watermark is not advanced past them. The
 * alternative — advancing it to the instant of the read — would skip any local
 * row written before that instant and never sent, which is the failure this
 * whole file exists to prevent. One idempotent re-upsert is the cheaper wrong.
 */

import { useCallback, useEffect, useRef, useState } from "react"
import type { BlackBoxRecord } from "../types"
import { fetchBlackBox, pushBlackBox } from "./blackBoxClient"
import {
  canPush,
  decideOnLoad,
  pendingSince,
  watermark,
  type SyncDecision,
  type SyncState,
} from "./viceSyncService"

/** Its own key. Losing it costs one redundant push; trusting a wrong one costs data. */
export const SENT_UP_TO_KEY = "vice-blackbox-sent-v1"

/** How long after the last change to send. Long enough to batch a form, short enough to feel saved. */
const DEBOUNCE_MS = 1200

function readWatermark(): string | null {
  try {
    return window.localStorage.getItem(SENT_UP_TO_KEY)
  } catch {
    return null
  }
}

function writeWatermark(value: string | null): void {
  try {
    if (value === null) window.localStorage.removeItem(SENT_UP_TO_KEY)
    else window.localStorage.setItem(SENT_UP_TO_KEY, value)
  } catch {
    // A blocked or full storage costs a redundant push next time, nothing more.
  }
}

export interface BlackBoxSync {
  state: SyncState
  /** Rows waiting to go up. Shown when offline so nobody wonders what is held. */
  pending: number
}

export function useBlackBoxSync({
  record,
  update,
  ready,
}: {
  record: BlackBoxRecord
  update: (next: (current: BlackBoxRecord) => BlackBoxRecord) => void
  ready: boolean
}): BlackBoxSync {
  const [state, setState] = useState<SyncState>("unknown")

  const sentUpTo = useRef<string | null>(null)
  const decision = useRef<SyncDecision | null>(null)
  const loaded = useRef(false)
  /** The record as it is right now, for callbacks that must not close over a stale one. */
  const latest = useRef(record)
  latest.current = record

  /**
   * Send whatever is unsent.
   *
   * Guarded by `canPush`, which is rule 1 from the other end: while the page is
   * on the local copy because the read failed, this browser does not know what
   * it would be writing over, so it writes nothing.
   */
  const push = useCallback(async (from?: BlackBoxRecord) => {
    if (!canPush(decision.current)) return
    // `from` EXISTS BECAUSE `latest.current` IS ONE RENDER BEHIND.
    //
    // The load effect merges and then pushes. `update()` schedules a React
    // state change; `latest.current` is assigned during render, so at the
    // moment the very next line runs it still holds the PRE-MERGE record.
    // Pushing that sent a second device's stale, live copy of a row back over
    // a tombstone the first device had just written — resurrecting a run the
    // person had deleted, on every device, permanently. Found by deleting a run
    // in one browser and reloading another.
    const due = pendingSince(from ?? latest.current, sentUpTo.current)
    if (due.count === 0) {
      setState("synced")
      return
    }
    setState("syncing")
    const ok = await pushBlackBox({ version: 1, attempts: due.attempts, reports: due.reports })
    if (!ok) {
      // NOT a failure of the record. The rows are still here and still unsent,
      // and the watermark has not moved, so the next attempt carries them.
      setState(navigator.onLine ? "failed" : "offline")
      return
    }
    sentUpTo.current = watermark(due, sentUpTo.current)
    writeWatermark(sentUpTo.current)
    setState("synced")
  }, [])

  // ---------------------------------------------------------------- the load
  useEffect(() => {
    if (!ready || loaded.current) return
    loaded.current = true
    let cancelled = false

    void (async () => {
      sentUpTo.current = readWatermark()
      // A FULL READ, not a delta, on the first load of a page view. A delta
      // would answer "nothing changed" for an account this browser has never
      // seen, and `decideOnLoad` would be handed an empty record as if it were
      // the account's whole answer.
      const fetched = await fetchBlackBox(null)
      if (cancelled) return

      const made = decideOnLoad({
        server: fetched === undefined ? undefined : fetched.record,
        browser: latest.current,
      })
      decision.current = made

      if (made.kind === "offline") {
        // THE SAME QUESTION THE PUSH PATH ALREADY ASKS. `decideOnLoad` says
        // "the read did not come back" and cannot know why; only the browser
        // knows whether it has a network. Reporting both as "offline" told
        // somebody with an expired session to wait for signal that was never
        // the problem.
        setState(navigator.onLine ? "unreachable" : "offline")
        return
      }

      // The merged record goes back through `update`, so it is persisted to the
      // browser copy by the same path every other write takes. There is exactly
      // one writer.
      update(() => made.record)
      await push(made.record)
    })()

    return () => {
      cancelled = true
    }
  }, [ready, update, push])

  // ------------------------------------------------- every change, debounced
  useEffect(() => {
    if (!ready || decision.current === null) return
    if (pendingSince(record, sentUpTo.current).count === 0) return
    // SAY IT IS UNSAVED THE INSTANT IT IS UNSAVED.
    //
    // Without this the state stays whatever the last completed sync left — so
    // for the whole debounce window the page said "Saved to your account"
    // while the row it is talking about had not left the device. Caught by
    // driving two browsers: the first said "Saved", and the account held zero
    // live rows at that moment.
    //
    // A stale reassurance is worse than a slow one. It is also what a test
    // waits on, so the lie made the cross-device test race and pass by luck.
    setState("syncing")
    const timer = setTimeout(() => void push(), DEBOUNCE_MS)
    return () => clearTimeout(timer)
  }, [record, ready, push])

  // ------------------------------------------------------ back on the network
  useEffect(() => {
    const onOnline = () => void push()
    window.addEventListener("online", onOnline)
    return () => window.removeEventListener("online", onOnline)
  }, [push])

  /**
   * DERIVED DURING RENDER, NEVER STORED.
   *
   * "How much is unsent" is a pure function of the record and the watermark, so
   * holding it in state means holding a second copy that is right only after an
   * effect has run. For the instant between a change and that effect, the
   * stored copy described the PREVIOUS record — and both this and `state` were
   * stale together, so a test waiting for "synced and nothing pending" matched
   * immediately after a deletion and carried on before the push had even been
   * queued. That is not only a test problem: it is also the instant in which
   * the screen told somebody their change was saved.
   */
  const pending = pendingSince(record, sentUpTo.current).count
  // Unsent work outranks a stale "synced" from the last completed sync.
  const shown: SyncState = pending > 0 && (state === "synced" || state === "unknown") ? "syncing" : state

  return { state: shown, pending }
}
