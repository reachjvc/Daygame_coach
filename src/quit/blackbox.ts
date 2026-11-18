"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useBlackBox } from "@/src/vice/blackbox/useBlackBox"
import { useBlackBoxSync } from "@/src/vice/blackbox/useBlackBoxSync"
import { fileReport, latestReportDay, living, nowInBrowser, removeReport, revivalClashes } from "@/src/vice/blackbox/blackboxStore"
import type { ViceAttempt, ViceEndingId } from "@/src/vice/types"
import { laterDay } from "./blackboxLogic"

/** null while unknown; true when the visitor has an account session. Never blocks the tool. */
export function useSignedIn(patient = false): boolean | null {
  const [signedIn, setSignedIn] = useState<boolean | null>(null)
  useEffect(() => {
    let cancelled = false
    const ctl = new AbortController()
    // A slow answer counts as signed out after 4 seconds, so no button waits for it for ever.
    // `patient` waits for the answer however long it takes (the craving tool files when it comes).
    const timer = patient ? null : setTimeout(() => ctl.abort(), 4000)
    fetch("/api/whoami", { credentials: "same-origin", signal: ctl.signal })
      .then((r) => {
        if (!cancelled) setSignedIn(r.status === 200)
      })
      .catch(() => {
        if (!cancelled) setSignedIn(false)
      })
      .finally(() => timer && clearTimeout(timer))
    return () => {
      cancelled = true
      if (timer) clearTimeout(timer)
      ctl.abort()
    }
  }, [])
  return signedIn
}

export interface CloseCallInput {
  at: string
  thought: string
  ending: ViceEndingId
  didInstead: string
}

export interface SlipInput {
  at: string
  thought: string
  ending: ViceEndingId
}

export interface QuitBlackBoxApi {
  /** The browser copy is read. */
  ready: boolean
  /** The living run for this vice, or null. */
  run: ViceAttempt | null
  today: string
  /** Files a close call you beat; the new report id, or null when the Black Box refused it. */
  fileCloseCall: (input: CloseCallInput) => string | null
  /** Files a lapse (ends the run); the new report id, or null when refused. */
  fileSlip: (input: SlipInput) => string | null
  /**
   * Where a filed report is on its way to the account: `saving` until the server answers,
   * `saved` once it has it, `local` when it could not be sent (signed out meanwhile, no network).
   */
  status: (reportId: string) => "saving" | "saved" | "local"
  /** Takes a report back out; false when refused. */
  undo: (reportId: string) => boolean
}

const EMPTY_FIELDS = { closeness: null, withWhom: "", where: "", factors: [] as string[] }

/**
 * The Black Box for one vice, for a signed-in visitor. Mount it only after
 * `useSignedIn` said true: the load and sync talk to the account.
 */
export function useQuitBlackBox(viceId: string): QuitBlackBoxApi {
  const { record, update, ready, today } = useBlackBox()
  const sync = useBlackBoxSync({ record, update, ready })
  const latest = useRef(record)
  latest.current = record

  const run = useMemo(
    () => living(record.attempts).find((a) => a.viceId === viceId && a.endedOn === null) ?? null,
    [record, viceId],
  )

  const file = useCallback(
    (wentThrough: boolean, input: CloseCallInput | SlipInput): string | null => {
      const cur = latest.current
      const attempt = living(cur.attempts).find((a) => a.viceId === viceId && a.endedOn === null)
      if (!attempt) return null
      let at = input.at
      if (wentThrough) {
        const floor = latestReportDay(cur, attempt.id)
        if (at.slice(0, 10) < floor) at = `${laterDay(at.slice(0, 10), floor)}T12:00:00`
      }
      const next = fileReport(cur, {
        attemptId: attempt.id,
        at,
        wentThrough,
        thought: input.thought,
        ending: input.ending,
        ...EMPTY_FIELDS,
        didInstead: "didInstead" in input ? input.didInstead : "",
      })
      const made = next.reports.find((r) => !cur.reports.some((x) => x.id === r.id))
      if (!made) return null
      latest.current = next
      update(() => next)
      return made.id
    },
    [update, viceId],
  )

  const fileCloseCall = useCallback((input: CloseCallInput) => file(false, input), [file])
  const fileSlip = useCallback((input: SlipInput) => file(true, input), [file])
  const undo = useCallback(
    (reportId: string): boolean => {
      const cur = latest.current
      if (revivalClashes(cur, reportId)) return false
      const next = removeReport(cur, reportId)
      if (next === cur) return false
      latest.current = next
      update(() => next)
      return true
    },
    [update],
  )

  const status = useCallback(
    (reportId: string): "saving" | "saved" | "local" => {
      // The tool's copy of this api can be one render behind the filing: it does not know the report yet.
      if (!record.reports.some((r) => r.id === reportId)) return "saving"
      if (sync.state === "failed" || sync.state === "offline" || sync.state === "unreachable") return "local"
      return sync.state === "synced" && sync.pending === 0 ? "saved" : "saving"
    },
    [record, sync.state, sync.pending],
  )

  return useMemo(
    () => ({ ready, run, today, fileCloseCall, fileSlip, status, undo }),
    [ready, run, today, fileCloseCall, fileSlip, status, undo],
  )
}

export { nowInBrowser }
