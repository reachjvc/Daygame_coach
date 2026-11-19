"use client"

import { useCallback, useEffect, useMemo, useRef } from "react"
import { useBlackBox } from "@/src/vice/blackbox/useBlackBox"
import { useBlackBoxSync } from "@/src/vice/blackbox/useBlackBoxSync"
import { isSettled } from "@/src/vice/blackbox/viceSyncService"
import { living } from "@/src/vice/blackbox/blackboxStore"
import type { BlackBoxRecord } from "@/src/vice/types"
import { startRunOn } from "../../blackboxLogic"

/** What this tool needs of the Black Box: every run of the vice (living and ended), and a way to start one. */
export interface RecordBox {
  ready: boolean
  /** Safe to start a run: the copy is read and, signed in, the account has answered (or could not). */
  settled: boolean
  record: BlackBoxRecord
  /** Starts a living run on `day` (today or past). True when a run lives afterwards. */
  startRun: (day: string) => boolean
}

type Core = ReturnType<typeof useBlackBox>

function useBox(viceId: string, core: Core, sync: { state: string } | null): RecordBox {
  const { record, update, ready, today } = core
  const latest = useRef(record)
  latest.current = record
  const startRun = useCallback(
    (day: string): boolean => {
      const cur = latest.current
      const next = startRunOn(cur, viceId, day, today)
      if (next === cur) return living(cur.attempts).some((a) => a.viceId === viceId && a.endedOn === null)
      latest.current = next
      update(() => next)
      return true
    },
    [update, viceId, today],
  )
  const settled = ready && (sync === null || isSettled(sync.state as Parameters<typeof isSettled>[0]))
  return useMemo(() => ({ ready, settled, record, startRun }), [ready, settled, record, startRun])
}

/** The Black Box for a signed-in visitor: loaded and synced with the account. Mount it only once, and only after sign-in is known. */
export function SignedBox({ viceId, onBox }: { viceId: string; onBox: (box: RecordBox | null) => void }) {
  const core = useBlackBox()
  const sync = useBlackBoxSync({ record: core.record, update: core.update, ready: core.ready })
  const box = useBox(viceId, core, sync)
  useEffect(() => {
    onBox(box)
    return () => onBox(null)
  }, [box, onBox])
  return null
}

/** The same for a visitor with no account: the browser copy only. */
export function LocalBox({ viceId, onBox }: { viceId: string; onBox: (box: RecordBox | null) => void }) {
  const core = useBlackBox()
  const box = useBox(viceId, core, null)
  useEffect(() => {
    onBox(box)
    return () => onBox(null)
  }, [box, onBox])
  return null
}
