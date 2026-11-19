"use client"

import { useEffect, useMemo, useState } from "react"
import { fetchBlackBox } from "@/src/vice/blackbox/blackBoxClient"
import { BLACKBOX_KEY, emptyRecord, living, loadRecord } from "@/src/vice/blackbox/blackboxStore"
import { decideOnLoad } from "@/src/vice/blackbox/viceSyncService"
import type { BlackBoxRecord, ViceAttempt, ViceReport } from "@/src/vice/types"

/** What this page needs of the Black Box: the living run and the reports of one vice. */
export interface BlackBoxView {
  ready: boolean
  run: ViceAttempt | null
  reports: ViceReport[]
}

/** The living run and the reports of one vice in a record, oldest report first. */
export function viewOf(record: BlackBoxRecord, viceId: string): Omit<BlackBoxView, "ready"> {
  const run = living(record.attempts).find((a) => a.viceId === viceId && a.endedOn === null) ?? null
  const mine = new Set(record.attempts.filter((a) => a.viceId === viceId).map((a) => a.id))
  const reports = living(record.reports)
    .filter((r) => mine.has(r.attemptId))
    .sort((a, b) => (a.at < b.at ? -1 : a.at > b.at ? 1 : 0))
  return { run, reports }
}

/**
 * The Black Box, READ ONLY. The tools that write (date, craving, record, slip) mount the syncing bridge, whose
 * first load writes the merged record back to the browser and pushes unsent rows. A page that only shows the day
 * must not: a stale tab could put its copy back over rows another tab or tool has just saved. So this reads the
 * browser copy, and signed in also the account's copy, merges them in memory with the same union rule, and never
 * writes to storage or to the account. A change from another tab (`storage` event) is read again.
 * `signedIn` is null while unknown; the view is ready once the browser copy is read and, signed in, the account
 * has answered (or could not be reached).
 */
export function useBlackBoxView(viceId: string, signedIn: boolean | null): BlackBoxView {
  const [local, setLocal] = useState<BlackBoxRecord | null>(null)
  const [server, setServer] = useState<BlackBoxRecord | null | undefined>(null)
  const [answered, setAnswered] = useState(false)

  useEffect(() => {
    const read = () => {
      try {
        setLocal(loadRecord(window.localStorage))
      } catch {
        setLocal(emptyRecord())
      }
    }
    read()
    const onStorage = (e: StorageEvent) => {
      if (e.key === null || e.key === BLACKBOX_KEY) read()
    }
    window.addEventListener("storage", onStorage)
    return () => window.removeEventListener("storage", onStorage)
  }, [])

  useEffect(() => {
    if (signedIn !== true) return
    let cancelled = false
    void fetchBlackBox(null).then((fetched) => {
      if (cancelled) return
      setServer(fetched === undefined ? undefined : fetched.record)
      setAnswered(true)
    })
    return () => {
      cancelled = true
    }
  }, [signedIn])

  return useMemo(() => {
    const ready = local !== null && (signedIn === false || (signedIn === true && answered))
    if (!local) return { ready: false, run: null, reports: [] }
    let record = local
    if (signedIn === true && answered && server !== undefined && server !== null) {
      const made = decideOnLoad({ server, browser: local })
      if (made.kind !== "offline") record = made.record
    }
    return { ready, ...viewOf(record, viceId) }
  }, [local, server, answered, signedIn, viceId])
}
