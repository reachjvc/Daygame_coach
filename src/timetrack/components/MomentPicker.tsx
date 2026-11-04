"use client"

/**
 * WHEN DID IT REALLY HAPPEN? The picker behind Switched at…, Stopped at… and
 * Started at… (Phase 4 of Plans/time-tracker-like-toggl.md).
 *
 * The owner knows the moment he switched — "about five to twelve" — and the
 * app used to make him turn that into a length or into two edits on two rows.
 * Here he gives the moment itself, three ways: typed on the number pad
 * ("1155"), one tap on a chip ("15 min ago", "When the last entry ended"), or
 * nudged with ±1 and ±5. Phase 5's drums slot into the same picker (`drums`),
 * above the box, and every control follows whatever any of them set: the drums
 * are handed the moment and `set`, exactly what the box and the chips use.
 */

import { useState, type ReactNode } from "react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import type { MomentChip } from "../timeFixService"
import { momentBounds, momentChips, momentRefusal } from "../timeFixService"
import {
  LONG_ENTRY_SECONDS,
  dateKey,
  epochSeconds,
  formatDayHeader,
  formatDuration,
  formatIdleSpan,
  formatTimeOfDay,
  isoFromEpochSeconds,
  parseMomentInput,
  unreadableTimeMessage,
} from "../timetrackFormatService"
import type { EntryDraft, IsoDateTime, TimeFormat, TimetrackState } from "../types"
import { MomentDrums, SKIPPED_HOUR } from "./Drums"
import { Modal } from "./primitives"

/** What the drums are handed: the moment, a way to set it, and where it may fall */
export interface MomentControl {
  value: IsoDateTime
  set: (iso: IsoDateTime) => void
  earliest: IsoDateTime | null
  latest: IsoDateTime
}

const STEPS: { minutes: number; text: string; label: string }[] = [
  { minutes: -5, text: "−5", label: "5 minutes earlier" },
  { minutes: -1, text: "−1", label: "1 minute earlier" },
  { minutes: 1, text: "+1", label: "1 minute later" },
  { minutes: 5, text: "+5", label: "5 minutes later" },
]

export function MomentPicker({
  value,
  onChange,
  earliest,
  latest,
  chips,
  timeFormat,
  drums,
}: {
  value: IsoDateTime
  onChange: (iso: IsoDateTime) => void
  /** the running timer's start; a typed bare time is read as the first such time after it */
  earliest: IsoDateTime | null
  latest: IsoDateTime
  chips: MomentChip[]
  timeFormat: TimeFormat
  /** Phase 5: the drums, drawn above the box */
  drums?: (control: MomentControl) => ReactNode
}) {
  /**
   * What is being typed, held until the box is left: "1155" is not a time
   * until all four digits are in, and reading it at "11" would jump the
   * moment to eleven o'clock on the way.
   */
  const [typed, setTyped] = useState<string | null>(null)
  const [unreadable, setUnreadable] = useState<string | null>(null)
  const shown = formatTimeOfDay(value, timeFormat)

  const set = (iso: IsoDateTime) => {
    setTyped(null)
    setUnreadable(null)
    onChange(iso)
  }

  const commitTyped = () => {
    const text = typed?.trim() ?? ""
    setTyped(null)
    // left as it was, it is not an edit: retyping "14:30" must not drop the seconds of now
    if (!text || text === shown) return
    const parsed = parseMomentInput(text, earliest, latest)
    if (!parsed) {
      setUnreadable(unreadableTimeMessage(text) ?? "Could not read that time — try 1155 or 11:55")
      return
    }
    set(parsed)
  }

  const step = (minutes: number) => set(isoFromEpochSeconds(epochSeconds(value) + minutes * 60))
  const todayKey = dateKey(latest)
  const stepButton = (index: number) => {
    const { minutes, text, label } = STEPS[index]
    return (
      <Button
        type="button"
        variant="outline"
        aria-label={label}
        onClick={() => step(minutes)}
        className="h-11 w-11 shrink-0 px-0 tabular-nums sm:h-9 sm:w-10"
      >
        {text}
      </Button>
    )
  }

  return (
    <div className="space-y-3">
      {drums?.({ value, set, earliest, latest })}

      <div className="flex items-center justify-center gap-1.5">
        {stepButton(0)}
        {stepButton(1)}
        <Input
          aria-label="Time"
          // the number pad on a phone: "1155" is 11:55 (plan D11)
          inputMode="numeric"
          value={typed ?? shown}
          onFocus={(event) => {
            setTyped(event.currentTarget.value)
            event.currentTarget.select()
          }}
          onChange={(event) => setTyped(event.target.value)}
          onBlur={commitTyped}
          onKeyDown={(event) => {
            if (event.key !== "Enter") return
            event.preventDefault()
            event.currentTarget.blur()
          }}
          className={cn("h-11 w-[92px] text-center text-lg tabular-nums sm:h-9", timeFormat === "h12" && "w-[112px]")}
        />
        {stepButton(2)}
        {stepButton(3)}
      </div>
      {/* a bare 23:30 on a timer that ran overnight could be either night: name the day when it is not today */}
      {dateKey(value) !== todayKey && (
        <p className="text-center text-xs text-muted-foreground">{formatDayHeader(dateKey(value), todayKey)}</p>
      )}
      {unreadable && (
        <p className="text-center text-xs text-destructive">{unreadable}</p>
      )}

      {chips.length > 0 && (
        <div className="flex flex-wrap justify-center gap-1.5">
          {chips.map((chip) => (
            <button
              key={chip.id}
              type="button"
              disabled={chip.disabled}
              aria-pressed={chip.at === value}
              onClick={() => set(chip.at)}
              className={cn(
                "min-h-11 rounded-full border px-3 text-xs sm:min-h-8",
                chip.at === value ? "border-primary bg-primary/15 text-primary" : "border-border hover:bg-secondary/60",
                "disabled:opacity-40",
              )}
            >
              {chip.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export type MomentKind = "switch" | "stop" | "start"

const TITLES: Record<MomentKind, string> = {
  switch: "Switched at…",
  stop: "Stopped at…",
  start: "Started at…",
}

const VERBS: Record<MomentKind, string> = { switch: "Switch", stop: "Stop", start: "Start" }

/**
 * The picker in its dialog, with what it will do written out before you do it:
 * "“Deep work” 09:00 – 11:55 · 2:55", then "“Email” from 11:55, running".
 *
 * A length over twelve hours is said here rather than asked afterwards (D10):
 * the dialog already is the question, and ✓ is the answer.
 *
 * The drums (Phase 5) are one set, [day][hour][minute]: a moment that has
 * happened, so after now is greyed and refused, and so is anything before the
 * running timer began — the same limits the typed box is held to.
 */
export function MomentDialog({
  kind,
  state,
  openedAt,
  draft,
  onConfirm,
  onClose,
}: {
  kind: MomentKind
  state: TimetrackState
  /** now, as it was when the dialog opened: what the chips count back from */
  openedAt: IsoDateTime
  /** the next entry: for Started at…, the bar's own draft; for Switched at…, its description to start from */
  draft: EntryDraft
  onConfirm: (atIso: IsoDateTime, draft: EntryDraft) => void
  onClose: () => void
}) {
  const [value, setValue] = useState(openedAt)
  /** a drum refused, in the picker's own words; cleared by the next moment that lands */
  const [drumNote, setDrumNote] = useState<string | null>(null)
  const land = (iso: IsoDateTime) => {
    setDrumNote(null)
    setValue(iso)
  }
  const [description, setDescription] = useState(draft.description)
  const { running, earliest, latest } = momentBounds(state, openedAt)
  const refusal = momentRefusal(state, value, openedAt)
  const format = state.user.timeFormat
  const time = formatTimeOfDay(value, format)
  const quoted = (text: string) => `“${text.trim() || "(no description)"}”`

  const endedSeconds = running ? Math.max(0, epochSeconds(value) - epochSeconds(running.start)) : 0
  const next = kind === "switch" ? description : draft.description

  return (
    <Modal
      title={TITLES[kind]}
      onClose={onClose}
      footer={
        <>
          <Button variant="ghost" size="sm" className="h-11 sm:h-8" onClick={onClose}>
            Cancel
          </Button>
          <Button
            size="sm"
            className="h-11 min-w-[132px] sm:h-8"
            disabled={refusal !== null}
            onClick={() => onConfirm(value, { ...draft, description: next.trim() })}
          >
            {VERBS[kind]} at {time}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        {kind === "switch" && (
          <Input
            aria-label="Switched to"
            placeholder="What did you switch to?"
            value={description}
            // from the ⋮ menu nothing is typed yet, and that is the first thing to ask
            autoFocus={description === ""}
            onChange={(event) => setDescription(event.target.value)}
          />
        )}

        <MomentPicker
          value={value}
          onChange={land}
          earliest={earliest}
          latest={latest}
          chips={momentChips(state, openedAt)}
          timeFormat={format}
          drums={(control) => (
            <MomentDrums
              value={control.value}
              onChange={control.set}
              bounds={{ earliest: control.earliest, latest: control.latest }}
              timeFormat={format}
              todayKey={dateKey(openedAt)}
              onRefused={(why, asked) =>
                setDrumNote(
                  why === "skipped"
                    ? SKIPPED_HOUR
                    : ((asked && momentRefusal(state, asked, openedAt)) ?? (why === "after" ? "That has not happened yet" : "That is before the timer started")),
                )
              }
            />
          )}
        />
        {drumNote && (
          <p role="status" className="text-center text-xs text-destructive">
            {drumNote}
          </p>
        )}

        <div className="space-y-1 rounded-md bg-secondary/40 px-3 py-2 text-sm" aria-live="polite">
          {refusal ? (
            <p className="text-destructive">{refusal}</p>
          ) : (
            <>
              {running && kind !== "start" && (
                <p>
                  {quoted(running.description)} {formatTimeOfDay(running.start, format)} – {time}
                  <span className="text-muted-foreground"> · {formatDuration(endedSeconds, state.user.durationFormat)}</span>
                </p>
              )}
              {kind !== "stop" && (
                <p>
                  {quoted(next)} from {time}
                  <span className="text-muted-foreground">, running</span>
                </p>
              )}
              {endedSeconds > LONG_ENTRY_SECONDS && running && (
                <p className="text-xs text-muted-foreground">
                  That makes {quoted(running.description)} {formatIdleSpan(endedSeconds)} long.
                </p>
              )}
            </>
          )}
        </div>
      </div>
    </Modal>
  )
}
