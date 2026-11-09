"use client"

/**
 * STOP AT…, SWITCHED AT… AND STARTED AT…: what a confirmed moment does
 * (Phase 4 of Plans/time-tracker-like-toggl.md; D-SWITCHED in
 * Plans/toggl-parity.md).
 *
 * One place for the PC's timer bar and the phone's running sheet, which open
 * the same `MomentDialog`. Ending a running timer waits for the check (D2): run
 * on the account's copy when the check lands, or dropped with a word when the
 * timer it was about is no longer the one running (`TogglLab`'s `afterCheck`).
 * Without the tracker around it — a test, a component on its own — it runs at
 * once on the workspace it was handed. Every change has its Undo.
 */

import { useCallback, useRef } from "react"

import type { PushToast } from "../hooks/useTimetrack"
import { serverNowIso } from "../serverClock"
import { layOnto } from "../tabMergeService"
import { stopAt, switchAt, undoStopAt } from "../timeFixService"
import { dateKey, formatWhen } from "../timetrackFormatService"
import { deleteEntries, runningEntry, undoDisplacement } from "../timetrackService"
import type { EntryDraft, IsoDateTime, TimeEntry, TimetrackState } from "../types"
import type { AfterCheck } from "./afterCheck"
import type { MomentKind } from "./MomentPicker"
import { undoOrSay } from "./neighbourNotice"

export function useMomentActions({
  state,
  setState,
  pushToast,
  afterCheck,
  onSwitched,
}: {
  state: TimetrackState
  setState: (updater: (current: TimetrackState) => TimetrackState) => void
  pushToast: PushToast
  afterCheck: AfterCheck | null
  /** a Switched at… went through: the words waiting for it are used */
  onSwitched?: () => void
}) {
  const latestState = useRef(state)
  latestState.current = state
  const switched = useRef(onSwitched)
  switched.current = onSwitched

  return useCallback(
    (kind: MomentKind, atIso: IsoDateTime, nextDraft: EntryDraft) => {
      const gate: AfterCheck = afterCheck ?? ((run) => run(latestState.current, serverNowIso()))
      // a Stop at… is kept on disk while it waits; a Switched at… starts something, and is not (`KeptTap`)
      const keep = kind === "stop" ? { keep: { kind: "stop" as const, seen: runningEntry(latestState.current)?.id ?? null, at: atIso } } : undefined
      gate((latest) => {
        const nowIso = serverNowIso()
        const when = (iso: IsoDateTime) => formatWhen(iso, latest.user.timeFormat, dateKey(nowIso))
        const quoted = (entry: TimeEntry) => `“${entry.description.trim() || "(no description)"}”`

        if (kind === "stop") {
          const result = stopAt(latest, atIso, nowIso)
          if (result.violations[0] || !result.stopped) {
            pushToast(result.violations[0]?.message ?? "Nothing is running", "error")
            return
          }
          const stopped = result.stopped
          setState(layOnto(latest, result.state))
          pushToast(`Stopped ${quoted(stopped)} ${when(stopped.stop ?? atIso)}`, "info", () => {
            // read when Undo is pressed: another timer may have started by then
            const refusal = undoStopAt(latestState.current, stopped.id, serverNowIso()).violations[0]
            if (refusal) {
              pushToast(refusal.message, "error")
              return
            }
            setState((current) => {
              const resumed = undoStopAt(current, stopped.id, serverNowIso())
              return resumed.violations.length > 0 ? current : resumed.state
            })
          })
          return
        }

        const result = switchAt(latest, nextDraft, atIso, nowIso)
        if (result.violations[0] || !result.started) {
          pushToast(result.violations[0]?.message ?? "Could not start the next entry", "error")
          return
        }
        const { stopped, started } = result
        // the new entry's id is made here, once: the Undo below names it
        setState(layOnto(latest, result.state))
        if (kind === "switch") switched.current?.()
        if (stopped) {
          // one change, one Undo: the next entry goes and the first runs again from its own start — both, or neither and why
          pushToast(`${quoted(stopped)} ended ${when(started.start)} and ${quoted(started)} started then`, "info", () =>
            undoOrSay(() => latestState.current, (current) => undoDisplacement(current, started.id, stopped.id, serverNowIso()), setState, pushToast),
          )
          return
        }
        pushToast(`Started ${quoted(started)} ${when(started.start)}`, "info", () =>
          undoOrSay(() => latestState.current, (current) => deleteEntries(current, [started.id], serverNowIso()), setState, pushToast),
        )
      }, keep)
    },
    [afterCheck, pushToast, setState],
  )
}
