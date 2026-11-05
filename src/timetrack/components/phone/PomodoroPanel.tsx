"use client"

/**
 * THE POMODORO TAB, BESIDE LIST VIEW (Plans/toggl-parity.md Phase 1 item 1).
 *
 * Toggl's phone has "List view | Pomodoro" at the top of the Timer tab [V1
 * 0:05, 3:36]. Ours was a card in Settings › Automation and a pill in the PC's
 * header, nowhere on a phone's main screen. Here: the focus or break left, the
 * rounds done, "Start session" (a timer, which the focus period follows), and
 * the same switches as the Settings card — which stays where it was.
 */

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { IconBreak, IconStart, IconTimer } from "../../icons"
import { clampSetting, formatClock } from "../../timetrackFormatService"
import type { TimetrackState } from "../../types"
import { Field, SectionCard, ToggleRow } from "../primitives"
import type { SetState } from "./landOnCurrent"

export interface PomodoroNow {
  phase: "idle" | "work" | "break"
  secondsLeft: number
  cycles: number
}

export function PomodoroPanel({
  state,
  setState,
  pomodoro,
  running,
  onStart,
  requestNotificationPermission,
}: {
  state: TimetrackState
  setState: SetState
  pomodoro: PomodoroNow
  running: boolean
  onStart: () => void
  requestNotificationPermission: () => Promise<boolean>
}) {
  const settings = state.pomodoro
  const set = (patch: Partial<TimetrackState["pomodoro"]>) => setState((current) => ({ ...current, pomodoro: { ...current.pomodoro, ...patch } }))
  const left = pomodoro.phase === "idle" ? settings.workMinutes * 60 : pomodoro.secondsLeft

  return (
    <div className="space-y-4">
      <div className="flex flex-col items-center gap-2 rounded-xl border border-border bg-card px-4 py-6 text-center">
        <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
          {pomodoro.phase === "break" ? <IconBreak className="size-4" /> : <IconTimer className="size-4" />}
          {pomodoro.phase === "break" ? "Break" : pomodoro.phase === "work" ? "Focus" : "Ready?"}
        </span>
        <span className="text-5xl font-semibold tabular-nums">{formatClock(left)}</span>
        {pomodoro.cycles > 0 && <span className="text-xs text-muted-foreground">{pomodoro.cycles} done</span>}
        {!settings.enabled ? (
          <p className="max-w-xs text-xs text-muted-foreground">Turn on Pomodoro below: each timer then runs for a focus period and stops for a break.</p>
        ) : running ? (
          <p className="max-w-xs text-xs text-muted-foreground">The running timer stops when the focus period ends.</p>
        ) : (
          <Button className="mt-1 h-11 min-w-[160px]" onClick={onStart}>
            <IconStart className="size-4" /> Start session
          </Button>
        )}
      </div>

      <SectionCard title="Pomodoro settings">
        <ToggleRow
          label="Use Pomodoro"
          checked={settings.enabled}
          onChange={async (enabled) => {
            if (enabled && settings.notify) await requestNotificationPermission()
            set({ enabled })
          }}
        />
        <div className="grid grid-cols-2 gap-3">
          <Field label="Focus (minutes)">
            <Input
              type="number"
              inputMode="numeric"
              min={1}
              max={480}
              value={settings.workMinutes}
              onChange={(event) => {
                const raw = event.target.value
                setState((current) => ({ ...current, pomodoro: { ...current.pomodoro, workMinutes: clampSetting(raw, 1, 480, current.pomodoro.workMinutes) } }))
              }}
            />
          </Field>
          <Field label="Break (minutes)">
            <Input
              type="number"
              inputMode="numeric"
              min={1}
              max={480}
              value={settings.breakMinutes}
              onChange={(event) => {
                const raw = event.target.value
                setState((current) => ({ ...current, pomodoro: { ...current.pomodoro, breakMinutes: clampSetting(raw, 1, 480, current.pomodoro.breakMinutes) } }))
              }}
            />
          </Field>
        </div>
        <ToggleRow label="Continue the last entry when the break ends" checked={settings.autoContinue} onChange={(autoContinue) => set({ autoContinue })} />
        <ToggleRow
          label="Notifications"
          checked={settings.notify}
          onChange={async (notify) => {
            if (notify) await requestNotificationPermission()
            set({ notify })
          }}
        />
      </SectionCard>
    </div>
  )
}
