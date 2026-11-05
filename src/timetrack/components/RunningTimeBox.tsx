"use client"

/**
 * THE BOX UNDER THE PC'S RUNNING TIME (D-PC-RUNNING, Phase 5 item 3 of
 * Plans/toggl-parity.md).
 *
 * In Toggl Track's web app ONE click on the running duration makes it typeable
 * and opens a box under it: START (typeable), STOP (greyed, it is now) and the
 * date [LIVE web-06, web-07; W25 13:22 "Adjust duration"]. Typing "90" + Enter
 * in the duration means it started 90 minutes ago — that is the duration box's
 * own rule (`setRunningElapsed`), which stays. Ours adds what Toggl leaves to
 * arithmetic (D-SWITCHED): "Stop at…" and "Switched at…", which used to sit in
 * a row under the bar, and a drum icon that opens the drums for the start
 * (D-DRUMS: the drums stay one click away on the PC, since Toggl's web has no
 * wheel). Escape closes it.
 *
 * Every write here is worked out on the copy on screen to say a refusal, and
 * applied inside the update to whatever copy is current, so a change the other
 * device made a moment ago is not put back.
 */

import { useState, type KeyboardEvent, type ReactNode } from "react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import { serverNowIso } from "../serverClock"
import { typeStart } from "../timeFixService"
import { dateKey, formatTimeOfDay, formatWhen, parseStartTimeInput, unreadableTimeMessage } from "../timetrackFormatService"
import { moveEntryToDay } from "../timetrackService"
import type { IsoDate, IsoDateTime, SaveViolation, TimeEntry, TimetrackState } from "../types"
import type { PushToast } from "../hooks/useTimetrack"
import { MomentDrums, SKIPPED_HOUR } from "./Drums"
import { announceNeighbours } from "./neighbourNotice"
import { DayPicker, touchTarget } from "./primitives"
import { askAboutTypedTime } from "./TimerBar"

/** A drum, drawn as an icon: three stacked bands */
function DrumIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" className={className} aria-hidden="true">
      <rect x="3" y="1.5" width="10" height="13" rx="2" />
      <path d="M3 6h10M3 10h10" />
    </svg>
  )
}

export function RunningTimeBox({
  running,
  state,
  setState,
  latestState,
  pushToast,
  nowSec,
  forgotten,
  onClose,
  onStopAt,
  onSwitchAt,
  next,
}: {
  running: TimeEntry
  state: TimetrackState
  setState: (updater: (current: TimetrackState) => TimetrackState) => void
  /** the workspace as it is when a write is pressed, not as this box was last drawn */
  latestState: () => TimetrackState
  pushToast: PushToast
  nowSec: number
  /** the timer has run long enough to look forgotten (`forgottenTimer`) */
  forgotten: boolean
  onClose: () => void
  onStopAt: () => void
  onSwitchAt: () => void
  /** the next-thing box and its buttons, from the timer bar (they were under it) */
  next: ReactNode
}) {
  const format = state.user.timeFormat
  const todayKey = dateKey(new Date(nowSec * 1000))
  const [startText, setStartText] = useState<string | null>(null)
  const [drumsOpen, setDrumsOpen] = useState(false)
  /** the start the drums are turned to and not set yet */
  const [drumStart, setDrumStart] = useState<IsoDateTime | null>(null)
  const [drumNote, setDrumNote] = useState<string | null>(null)

  /** Checked on the latest copy so a refusal is said once; applied to the current one */
  const land = <R extends { state: TimetrackState; violations: SaveViolation[] }>(apply: (base: TimetrackState) => R): R | null => {
    const checked = apply(latestState())
    if (checked.violations[0]) {
      pushToast(checked.violations[0].message, "error")
      return null
    }
    setState((current) => {
      const applied = apply(current)
      return applied.violations.length > 0 ? current : applied.state
    })
    return checked
  }

  /** A new start: the one rule (`typeStart`), the 12-hour question first (`askAboutTypedTime`) */
  const writeStart = (iso: IsoDateTime) => {
    const nowIso = serverNowIso()
    askAboutTypedTime(
      "start",
      iso,
      { start: running.start, stop: nowIso, running: true },
      (at) => {
        const now = serverNowIso()
        const landed = land((base) => typeStart(base, running.id, at, now))
        if (landed) announceNeighbours(landed, latestState().user.timeFormat, setState, pushToast, latestState)
      },
      pushToast,
      format,
    )
  }

  const commitStartText = () => {
    const text = startText?.trim() ?? ""
    setStartText(null)
    if (!text || text === formatTimeOfDay(running.start, format)) return
    const iso = parseStartTimeInput(text, running.start, serverNowIso())
    if (!iso) {
      pushToast(unreadableTimeMessage(text) ?? "Could not read that time — try 9:30, 930 or 9:30 pm", "error")
      return
    }
    writeStart(iso)
  }

  const moveToDay = (day: IsoDate) => {
    if (day === dateKey(running.start)) return
    const now = serverNowIso()
    land((base) => moveEntryToDay(base, running.id, day, now))
  }

  const escapeCloses = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== "Escape") return
    event.preventDefault()
    event.stopPropagation()
    onClose()
  }

  return (
    <div
      role="dialog"
      aria-label="Adjust duration"
      onKeyDown={escapeCloses}
      className="absolute right-0 top-full z-50 mt-1 w-[340px] space-y-3 rounded-lg border border-border bg-card p-3 text-left text-sm shadow-xl"
    >
      <div className="grid grid-cols-2 gap-2">
        <label className="space-y-1">
          <span className="block text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Start</span>
          <Input
            value={startText ?? formatTimeOfDay(running.start, format)}
            onChange={(event) => setStartText(event.target.value)}
            onFocus={(event) => event.currentTarget.select()}
            onBlur={commitStartText}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault()
                event.currentTarget.blur()
              } else if (event.key === "Escape") {
                // the typed start is thrown away, then the box closes (the box's own Escape)
                setStartText(null)
              }
            }}
            inputMode="numeric"
            aria-label="Start"
            className="h-8 tabular-nums"
          />
        </label>
        <label className="space-y-1">
          <span className="block text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Stop</span>
          {/* greyed: a running timer stops when you stop it, or at Stop at… */}
          <Input value="now" disabled aria-label="Stop" title="Still running" className="h-8 text-muted-foreground" />
        </label>
      </div>

      <div className="flex items-center justify-between gap-2">
        <DayPicker value={dateKey(running.start)} onChange={moveToDay} onStep={moveToDay} todayKey={todayKey} />
        <button
          type="button"
          onClick={() => {
            setDrumsOpen((open) => !open)
            setDrumStart(null)
            setDrumNote(null)
          }}
          aria-label={drumsOpen ? "Hide the drums" : "Turn the start on the drums"}
          title={drumsOpen ? "Hide the drums" : "Turn the start on the drums"}
          aria-pressed={drumsOpen}
          className={cn(touchTarget, "rounded-md hover:bg-secondary/60", drumsOpen ? "text-primary" : "text-muted-foreground")}
        >
          <DrumIcon className="size-4" />
        </button>
      </div>

      {drumsOpen && (
        <div className="space-y-2">
          <MomentDrums
            value={drumStart ?? running.start}
            onChange={(iso) => {
              setDrumNote(null)
              setDrumStart(iso)
            }}
            bounds={{ earliest: null, latest: serverNowIso() }}
            timeFormat={format}
            todayKey={todayKey}
            label="Start"
            caption="Start"
            onRefused={(why) => setDrumNote(why === "skipped" ? SKIPPED_HOUR : why === "after" ? "A running timer cannot start in the future" : null)}
          />
          {drumNote && <p className="text-xs text-destructive">{drumNote}</p>}
          <div className="flex justify-end gap-2">
            <Button size="sm" variant="ghost" className="h-8" onClick={() => setDrumStart(null)} disabled={drumStart === null}>
              Cancel
            </Button>
            <Button
              size="sm"
              className="h-8"
              disabled={drumStart === null}
              onClick={() => {
                if (drumStart) writeStart(drumStart)
                setDrumStart(null)
              }}
            >
              ✓ Set start
            </Button>
          </div>
        </div>
      )}

      <p className="text-xs text-muted-foreground">
        Started {formatWhen(running.start, format, todayKey)}
        {forgotten && <span className="text-foreground"> — forgot to stop it? Stop at… ends it where the work did.</span>}
      </p>

      <div className="flex flex-wrap gap-2 border-t border-border pt-3">
        <Button size="sm" variant="outline" className="h-8" onClick={onStopAt}>
          Stop at…
        </Button>
        <Button size="sm" variant="outline" className="h-8" onClick={onSwitchAt}>
          Switched at…
        </Button>
      </div>
      {next}
    </div>
  )
}
