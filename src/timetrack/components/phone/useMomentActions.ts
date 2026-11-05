"use client"

/**
 * STOP AT…, SWITCHED AT… AND STARTED AT… ON THE PHONE (D-SWITCHED).
 *
 * The owner's own additions to the copy: Toggl has neither. On the PC they sit
 * under the timer bar; on the phone they move into the running sheet, beside
 * Stop, and open the same `MomentDialog`. What a confirmed moment does is the
 * timer bar's `confirmMoment`, word for word — ending a running timer waits for
 * the check (D2), and every change has its Undo — written here rather than
 * shared, so the PC's timer bar, being reshaped next door, is not touched.
 * When both have settled they can share one.
 */

import { useCallback, useRef } from "react"

import type { PushToast } from "../../hooks/useTimetrack"
import { serverNowIso } from "../../serverClock"
import { layOnto } from "../../tabMergeService"
import { stopAt, switchAt, undoStopAt } from "../../timeFixService"
import { dateKey, formatWhen } from "../../timetrackFormatService"
import { deleteEntries, undoDisplacement } from "../../timetrackService"
import type { EntryDraft, IsoDateTime, TimeEntry, TimetrackState } from "../../types"
import type { AfterCheck } from "../afterCheck"
import type { MomentKind } from "../MomentPicker"
import { undoOrSay } from "../neighbourNotice"
import type { SetState } from "./landOnCurrent"

export function useMomentActions({
  state,
  setState,
  pushToast,
  afterCheck,
  onSwitched,
}: {
  state: TimetrackState
  setState: SetState
  pushToast: PushToast
  afterCheck: AfterCheck
  /** a Switched at… went through: the words waiting for it are used */
  onSwitched?: () => void
}) {
  const latestState = useRef(state)
  latestState.current = state

  return useCallback(
    (kind: MomentKind, atIso: IsoDateTime, next: EntryDraft) => {
      afterCheck((latest) => {
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
          pushToast(`Stopped ${quoted(stopped)} ${when(stopped.stop ?? atIso)}`, "info", () =>
            undoOrSay(() => latestState.current, (current) => undoStopAt(current, stopped.id, serverNowIso()), setState, pushToast),
          )
          return
        }

        const result = switchAt(latest, next, atIso, nowIso)
        if (result.violations[0] || !result.started) {
          pushToast(result.violations[0]?.message ?? "Could not start the next entry", "error")
          return
        }
        const { stopped, started } = result
        // the new entry's id is made here, once: the Undo below names it
        setState(layOnto(latest, result.state))
        if (kind === "switch") onSwitched?.()
        if (stopped) {
          pushToast(`${quoted(stopped)} ended ${when(started.start)} and ${quoted(started)} started then`, "info", () =>
            undoOrSay(() => latestState.current, (current) => undoDisplacement(current, started.id, stopped.id, serverNowIso()), setState, pushToast),
          )
          return
        }
        pushToast(`Started ${quoted(started)} ${when(started.start)}`, "info", () =>
          undoOrSay(() => latestState.current, (current) => deleteEntries(current, [started.id], serverNowIso()), setState, pushToast),
        )
      })
    },
    [afterCheck, onSwitched, pushToast, setState],
  )
}
