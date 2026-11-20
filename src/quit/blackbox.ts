"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useBlackBox } from "@/src/vice/blackbox/useBlackBox"
import { useBlackBoxSync } from "@/src/vice/blackbox/useBlackBoxSync"
import { fileReport, latestReportDay, living, nowInBrowser, removeReport, revivalClashes } from "@/src/vice/blackbox/blackboxStore"
import type { ViceAttempt, ViceEndingId, ViceReport } from "@/src/vice/types"
import { isSettled } from "@/src/vice/blackbox/viceSyncService"
import { amendReport, laterDay, removeRunIfEmpty, startRunOn, type AmendPatch } from "./blackboxLogic"

function hasSignInCookie(): boolean {
  try {
    return /(?:^|;\s*)sb-[^=]*auth-token/.test(document.cookie)
  } catch {
    return true
  }
}

/** null while unknown; true when the visitor has an account session. Never blocks the tool. */
export function useSignedIn(patient = false, quiet = false): boolean | null {
  const [signedIn, setSignedIn] = useState<boolean | null>(null)
  useEffect(() => {
    // `quiet`: no sign-in cookie means signed out and no request is made (a 401 shows as a console error).
    if (quiet && !hasSignInCookie()) {
      setSignedIn(false)
      return
    }
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
  }, [patient, quiet])
  return signedIn
}

export interface CloseCallInput {
  at: string
  thought: string
  ending: ViceEndingId
  didInstead: string
  /** How strong it was, 1 to 10; absent means not said. */
  closeness?: number | null
  /** An id of the addiction's `riskyMoments`; absent means not said. */
  where?: string
}

export interface SlipInput {
  at: string
  thought: string
  ending: ViceEndingId
  closeness?: number | null
  where?: string
}

/** What `amend` may change on a filed report. */
export type ReportPatch = AmendPatch

/** What the quit date tool needs of the Black Box, signed in or not. */
export interface QuitRunApi {
  /** The browser copy is read. */
  ready: boolean
  /** Safe to start a run: the copy is read and, signed in, the account has answered (or could not). */
  settled: boolean
  /** The living run for this vice, or null. */
  run: ViceAttempt | null
  today: string
  /** Starts a living run on `startedOn` (today or past). True when a run lives afterwards. */
  startRun: (startedOn: string) => boolean
  /** Every living report against any run of this vice, oldest first. */
  reports: ViceReport[]
}

export interface QuitBlackBoxApi extends QuitRunApi {
  /** Files a close call you beat; the new report id, or null when the Black Box refused it. */
  fileCloseCall: (input: CloseCallInput) => string | null
  /** Files a lapse (ends the run); the new report id, or null when refused. */
  fileSlip: (input: SlipInput) => string | null
  /**
   * Where a filed report is on its way to the account: `saving` until the server answers,
   * `saved` once it has it, `local` when it could not be sent (signed out meanwhile, no network).
   */
  status: (reportId: string) => "saving" | "saved" | "local"
  /** True when the record still holds a living report with this id against the current living run. */
  has: (reportId: string) => boolean
  /** Takes a report back out; false when refused. */
  undo: (reportId: string) => boolean
  /** Changes strength, situation, thought or ending of a filed report; false when it is not there. */
  amend: (reportId: string, patch: ReportPatch) => boolean
  /** Every living run of this vice, oldest first (ended and still going). */
  runs: ViceAttempt[]
  /** Removes a run that is still going and has no living report; false when refused. */
  removeRun: (attemptId: string) => boolean
}

const EMPTY_FIELDS = { closeness: null, withWhom: "", where: "", factors: [] as string[] }

type BlackBoxCore = ReturnType<typeof useBlackBox>
type SyncView = { state: string; pending: number } | null

/** The API of one vice on top of a loaded record. `sync` is null when nothing is sent to an account. */
function useApi(viceId: string, core: BlackBoxCore, sync: SyncView): QuitBlackBoxApi {
  const { record, update, ready, today } = core
  const latest = useRef(record)
  latest.current = record

  const run = useMemo(
    () => living(record.attempts).find((a) => a.viceId === viceId && a.endedOn === null) ?? null,
    [record, viceId],
  )

  const startRun = useCallback(
    (startedOn: string): boolean => {
      const cur = latest.current
      const next = startRunOn(cur, viceId, startedOn, today)
      if (next === cur) return living(cur.attempts).some((a) => a.viceId === viceId && a.endedOn === null)
      latest.current = next
      update(() => next)
      return true
    },
    [update, viceId, today],
  )

  const reports = useMemo(() => {
    const mine = new Set(record.attempts.filter((a) => a.viceId === viceId).map((a) => a.id))
    return living(record.reports)
      .filter((r) => mine.has(r.attemptId))
      .sort((a, b) => (a.at < b.at ? -1 : a.at > b.at ? 1 : 0))
  }, [record, viceId])

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
        closeness: input.closeness ?? null,
        where: input.where ?? "",
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

  const amend = useCallback(
    (reportId: string, patch: ReportPatch): boolean => {
      const cur = latest.current
      const next = amendReport(cur, reportId, patch)
      if (next === cur) return false
      latest.current = next
      update(() => next)
      return true
    },
    [update],
  )

  const runs = useMemo(
    () => living(record.attempts).filter((a) => a.viceId === viceId).sort((a, b) => (a.startedOn < b.startedOn ? -1 : a.startedOn > b.startedOn ? 1 : 0)),
    [record, viceId],
  )

  const removeRun = useCallback(
    (attemptId: string): boolean => {
      const cur = latest.current
      const mine = living(cur.attempts).find((a) => a.id === attemptId)
      if (!mine || mine.viceId !== viceId) return false
      const next = removeRunIfEmpty(cur, attemptId)
      if (next === cur) return false
      latest.current = next
      update(() => next)
      return true
    },
    [update, viceId],
  )

  const has = useCallback(
    (reportId: string): boolean => run !== null && record.reports.some((r) => r.id === reportId && !r.deletedAt && r.attemptId === run.id),
    [record, run],
  )

  const status = useCallback(
    (reportId: string): "saving" | "saved" | "local" => {
      // The tool's copy of this api can be one render behind the filing: it does not know the report yet.
      if (!record.reports.some((r) => r.id === reportId)) return "saving"
      if (sync === null) return "local"
      if (sync.state === "failed" || sync.state === "offline" || sync.state === "unreachable") return "local"
      return sync.state === "synced" && sync.pending === 0 ? "saved" : "saving"
    },
    [record, sync],
  )

  // Signed in, a run is not started until the account has answered: otherwise a run the account already holds could be doubled.
  const settled = ready && (sync === null || isSettled(sync.state as Parameters<typeof isSettled>[0]))
  return useMemo(
    () => ({ ready, settled, run, today, startRun, fileCloseCall, fileSlip, status, has, undo, reports, amend, runs, removeRun }),
    [ready, settled, run, today, startRun, fileCloseCall, fileSlip, status, has, undo, reports, amend, runs, removeRun],
  )
}

/**
 * The Black Box for one vice, for a signed-in visitor. Mount it only after
 * `useSignedIn` said true: the load and sync talk to the account.
 */
export function useQuitBlackBox(viceId: string): QuitBlackBoxApi {
  const core = useBlackBox()
  const sync = useBlackBoxSync({ record: core.record, update: core.update, ready: core.ready })
  const view = useMemo(() => ({ state: sync.state, pending: sync.pending }), [sync.state, sync.pending])
  return useApi(viceId, core, view)
}

/** The same Black Box for a visitor with no account: the browser copy only, nothing is sent anywhere. */
export function useQuitBlackBoxLocal(viceId: string): QuitBlackBoxApi {
  const core = useBlackBox()
  return useApi(viceId, core, null)
}

export { nowInBrowser }

/** The quit date tool's name for the browser-only Black Box. */
export function useLocalQuitBlackBox(viceId: string): QuitBlackBoxApi {
  return useQuitBlackBoxLocal(viceId)
}
