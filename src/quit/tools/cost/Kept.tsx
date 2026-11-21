"use client"

import { useCallback, useEffect, useState, type ReactNode } from "react"
import { useSignedIn } from "../../blackbox"
import { fmtMoney } from "../../money"
import { todayIso, type RecordUnit } from "../../record"
import { useToolState } from "../hooks"
import { LocalBox, SignedBox, type RecordBox } from "../record/box"
import { moneyFor, moneyRuns, viewOf } from "../record/logic"
import { EMPTY_RECORD_TOOL, parseRecordTool, type RecordToolState } from "../record/state"

/**
 * Draws `children(kept)` where `kept` is the money kept so far, worked out the way Your record works it (clean runs from the
 * Black Box, the record's count and price, its spending), so both pages show the same figure. Read only: it never starts a
 * run. Without a run yet, the run Your record would start on the quit date stands in. `kept` is null until it can be known.
 */
export function Kept({ addiction, unit, quitDate, children }: { addiction: string; unit: RecordUnit | null; quitDate: string; children: (kept: string | null) => ReactNode }) {
  const signedIn = useSignedIn(false, true)
  const [box, setBox] = useState<RecordBox | null>(null)
  const onBox = useCallback((b: RecordBox | null) => setBox(b), [])
  const tool = useToolState<RecordToolState>(addiction, "record-tool", EMPTY_RECORD_TOOL, parseRecordTool)
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [])
  let kept: string | null = null
  if (box && box.ready && tool.state && unit) {
    const view = viewOf(box.record, addiction, todayIso(new Date(now)))
    const runs = view.runs.length > 0 ? moneyRuns(view.runs) : [{ start: quitDate, end: null }]
    const money = moneyFor(runs, unit, tool.state.spends, now, null).money
    kept = money === null ? null : fmtMoney(money)
  }
  return (
    <>
      {signedIn === true ? <SignedBox key="in" viceId={addiction} onBox={onBox} /> : null}
      {signedIn === false ? <LocalBox key="out" viceId={addiction} onBox={onBox} /> : null}
      {children(kept)}
    </>
  )
}
