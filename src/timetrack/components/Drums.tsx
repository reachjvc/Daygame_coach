"use client"

/**
 * THE DRUMS (Phase 5 of Plans/time-tracker-like-toggl.md): [day][hour][minute],
 * like an alarm clock, the owner's pick (Q1).
 *
 * Built on the browser's own scroll snapping, with no library (D14). A drum is
 * a short list that scrolls, and the item that comes to rest in the band across
 * the middle is the value — so a one-handed flick on a phone is the phone's own
 * scrolling, momentum and all, and nothing here imitates it. What this file adds
 * is what a scroll list does not do by itself: a mouse wheel that steps one item
 * a notch, a mouse drag, the keys a listbox answers to, a 5 ms tick per step on
 * phones that vibrate, and refusing what is greyed — a drum that comes to rest
 * on a time after now goes back to where it was.
 *
 * The maths is in `drumService`; this only draws it and turns gestures into
 * "this item, please".
 */

import { useEffect, useId, useLayoutEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from "react"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import type { DrumBounds, DrumParts, TimePair } from "../drumService"
import {
  MINUTE_LABELS,
  dayChoices,
  dayLabel,
  dayRefused,
  fromTwelve,
  halfRefused,
  hourLabels,
  hourRefused,
  lengthLine,
  mendEnd,
  minuteRefused,
  moveDrum,
  partsOf,
  readPair,
  repeatedHour,
  toTwelve,
} from "../drumService"
import { dateKey, formatIdleSpan, formatTimeOfDay } from "../timetrackFormatService"
import type { DurationFormat, IsoDate, IsoDateTime, TimeFormat } from "../types"

/**
 * One item's height. 40px: a thumb can land on it, and three of them — the
 * value and one either side — keep two sets of drums and the boxes under them
 * on a 390px phone's first screen.
 */
export const DRUM_ITEM_PX = 40
const VISIBLE = 3
/** a drum left between two items with no `scrollend` (older Safari) settles after this */
const SETTLE_MS = 150
/** a mouse notch is ~100px in Chrome and ~48px in Firefox: one item each; a trackpad adds up to this */
const WHEEL_STEP_PX = 40

export interface DrumItem {
  key: string
  text: string
  /** greyed: past a limit, or a time the clocks skip */
  refused: boolean
}

function tick() {
  try {
    // Android Chrome has it; iPhones do not, and the drum works the same without
    if (typeof navigator !== "undefined" && typeof navigator.vibrate === "function") navigator.vibrate(5)
  } catch {
    // a browser that refuses before the first tap: no tick, nothing else lost
  }
}

/** The nearest item that is not greyed, going `direction` from `from`; then back towards `home` */
function reachable(items: DrumItem[], from: number, direction: 1 | -1, home: number): number {
  for (let index = from; index >= 0 && index < items.length; index += direction) {
    if (!items[index].refused) return index
  }
  for (let index = Math.min(Math.max(from, 0), items.length - 1); index !== home; index -= direction) {
    if (!items[index].refused) return index
  }
  return home
}

export function Drum({
  name,
  items,
  selected,
  onPick,
  pageStep = 5,
  className,
}: {
  /** what a screen reader calls it: "Start hour" */
  name: string
  items: DrumItem[]
  selected: number
  onPick: (index: number) => void
  pageStep?: number
  className?: string
}) {
  const id = useId()
  const ref = useRef<HTMLDivElement>(null)
  /** the item under the band while it moves; null once it has come to rest on `selected` */
  const [moving, setMoving] = useState<number | null>(null)
  const live = useRef(selected)
  const touching = useRef(false)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const wheelRest = useRef(0)
  const drag = useRef<{ y: number; top: number; dragging: boolean; pointerId: number } | null>(null)
  const swallowClick = useRef(false)
  // the latest of these, for a settle that runs after the render that changed them
  const latest = useRef({ selected, items, onPick })
  latest.current = { selected, items, onPick }

  const indexAt = (top: number) => Math.min(items.length - 1, Math.max(0, Math.round(top / DRUM_ITEM_PX)))

  /** lined up on the value whenever it changes from outside — typing, a chip, ±5 — but never under a finger */
  useLayoutEffect(() => {
    const el = ref.current
    if (!el || touching.current || drag.current?.dragging) return
    el.scrollTop = selected * DRUM_ITEM_PX
    live.current = selected
  }, [selected, items.length])

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current)
  }, [])

  const settle = () => {
    if (timer.current) clearTimeout(timer.current)
    timer.current = null
    const el = ref.current
    if (!el || touching.current) return
    const { selected: current, items: now, onPick: pick } = latest.current
    const index = Math.min(now.length - 1, Math.max(0, Math.round(el.scrollTop / DRUM_ITEM_PX)))
    setMoving(null)
    // refused, or not moved: back onto the value, exactly
    if (index === current || now[index].refused) {
      el.scrollTop = current * DRUM_ITEM_PX
      live.current = current
      return
    }
    pick(index)
    // the value may land elsewhere (an hour that would pass now lands on now): line up on what it became
    const later = typeof requestAnimationFrame === "function" ? requestAnimationFrame : (run: () => void) => setTimeout(run, 0)
    later(() => {
      if (!ref.current || touching.current || drag.current?.dragging) return
      ref.current.scrollTop = latest.current.selected * DRUM_ITEM_PX
      live.current = latest.current.selected
    })
  }

  const settleSoon = () => {
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(settle, SETTLE_MS)
  }

  /** the item under the band changed: say so, and tick */
  const passing = (index: number, byHand: boolean) => {
    if (index === live.current) return
    live.current = index
    if (byHand) tick()
    setMoving(index)
  }

  const onScroll = () => {
    const el = ref.current
    if (!el) return
    const index = indexAt(el.scrollTop)
    passing(index, touching.current || drag.current !== null || index !== selected)
    if (!touching.current) settleSoon()
  }

  // a native listener, because React's wheel listener is passive and could not keep the page still
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const onWheel = (event: WheelEvent) => {
      event.preventDefault()
      const px = event.deltaMode === 1 ? event.deltaY * 16 : event.deltaMode === 2 ? event.deltaY * DRUM_ITEM_PX * VISIBLE : event.deltaY
      let steps: number
      if (Math.abs(px) >= WHEEL_STEP_PX) {
        steps = Math.sign(px)
        wheelRest.current = 0
      } else {
        wheelRest.current += px
        steps = Math.trunc(wheelRest.current / WHEEL_STEP_PX)
        wheelRest.current -= steps * WHEEL_STEP_PX
      }
      if (steps === 0) return
      const { items: now } = latest.current
      const index = Math.min(now.length - 1, Math.max(0, live.current + steps))
      el.scrollTop = index * DRUM_ITEM_PX
      passing(index, true)
      settleSoon()
    }
    // where the browser has it, `scrollend` is the moment a flick comes to rest; the timer covers the rest
    const onEnd = () => settle()
    el.addEventListener("wheel", onWheel, { passive: false })
    el.addEventListener("scrollend", onEnd)
    return () => {
      el.removeEventListener("wheel", onWheel)
      el.removeEventListener("scrollend", onEnd)
    }
    // registered once: everything these read is in a ref
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  /** a mouse or a pen drags it; a finger scrolls it natively, and is only watched */
  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (event.pointerType === "touch" || event.button !== 0 || !ref.current) return
    drag.current = { y: event.clientY, top: ref.current.scrollTop, dragging: false, pointerId: event.pointerId }
  }
  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const el = ref.current
    const held = drag.current
    if (!el || !held) return
    const dy = event.clientY - held.y
    if (!held.dragging) {
      if (Math.abs(dy) < 4) return
      held.dragging = true
      el.setPointerCapture?.(held.pointerId)
      // snapping would pull it back under the pointer at every move
      el.style.scrollSnapType = "none"
    }
    el.scrollTop = held.top - dy
    passing(indexAt(el.scrollTop), true)
  }
  const onPointerEnd = () => {
    const el = ref.current
    const held = drag.current
    drag.current = null
    if (!el || !held?.dragging) return
    swallowClick.current = true
    el.style.scrollSnapType = ""
    el.scrollTop = indexAt(el.scrollTop) * DRUM_ITEM_PX
    settle()
  }

  const step = (target: number, direction: 1 | -1) => {
    const index = reachable(items, Math.min(items.length - 1, Math.max(0, target)), direction, selected)
    if (index === selected) return
    tick()
    onPick(index)
  }
  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const moves: Record<string, [number, 1 | -1]> = {
      ArrowDown: [selected + 1, 1],
      ArrowUp: [selected - 1, -1],
      PageDown: [selected + pageStep, 1],
      PageUp: [selected - pageStep, -1],
      End: [items.length - 1, -1],
      Home: [0, 1],
    }
    const move = moves[event.key]
    if (!move) return
    event.preventDefault()
    step(move[0], move[1])
  }

  const centre = moving ?? selected
  const optionId = (index: number) => `${id}-${index}`

  return (
    <div
      ref={ref}
      role="listbox"
      aria-label={name}
      tabIndex={0}
      aria-activedescendant={optionId(selected)}
      onScroll={onScroll}
      onTouchStart={() => {
        touching.current = true
        if (timer.current) clearTimeout(timer.current)
      }}
      onTouchEnd={() => {
        touching.current = false
        // momentum may carry on: `scrollend` settles it, and this in case it never comes
        settleSoon()
      }}
      onTouchCancel={() => {
        touching.current = false
        settleSoon()
      }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerEnd}
      onPointerCancel={onPointerEnd}
      onKeyDown={onKeyDown}
      className={cn(
        "relative z-10 shrink-0 cursor-grab touch-pan-y select-none overflow-y-auto overscroll-contain rounded-md outline-none",
        "[scrollbar-width:none] [&::-webkit-scrollbar]:hidden focus-visible:ring-2 focus-visible:ring-ring",
        className,
      )}
      style={{
        height: DRUM_ITEM_PX * VISIBLE,
        scrollSnapType: "y mandatory",
        // the value and its neighbours read clearly; further ones fade out at the edges
        maskImage: "linear-gradient(to bottom, transparent, black 30%, black 70%, transparent)",
        WebkitMaskImage: "linear-gradient(to bottom, transparent, black 30%, black 70%, transparent)",
      }}
    >
      {/* room above the first item and below the last, so each can come to rest in the band */}
      <div aria-hidden style={{ height: DRUM_ITEM_PX * ((VISIBLE - 1) / 2) }} />
      {items.map((item, index) => (
        <div
          key={item.key}
          id={optionId(index)}
          role="option"
          aria-selected={index === selected}
          aria-disabled={item.refused || undefined}
          onClick={() => {
            if (swallowClick.current) {
              swallowClick.current = false
              return
            }
            if (!item.refused && index !== selected) {
              tick()
              onPick(index)
            }
          }}
          className={cn(
            "flex items-center justify-center whitespace-nowrap px-1 tabular-nums transition-colors",
            index === centre ? "text-base font-semibold text-foreground" : "text-sm text-muted-foreground",
            item.refused && "opacity-30",
          )}
          style={{ height: DRUM_ITEM_PX, scrollSnapAlign: "center" }}
        >
          {item.text}
        </div>
      ))}
      <div aria-hidden style={{ height: DRUM_ITEM_PX * ((VISIBLE - 1) / 2) }} />
    </div>
  )
}

/** The band the value rests in, drawn once behind a whole row of drums */
function CentreBand() {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-x-0 rounded-md border border-primary/30 bg-primary/10"
      style={{ top: DRUM_ITEM_PX * ((VISIBLE - 1) / 2), height: DRUM_ITEM_PX }}
    />
  )
}

/**
 * One moment as drums: [day][hour][minute], and [AM/PM] in 12-hour mode
 * (scenario 9). `label` names them for a screen reader — "Start" makes "Start
 * day", "Start hour" — and is shown beside them when there are two sets.
 */
export function MomentDrums({
  value,
  onChange,
  bounds,
  timeFormat,
  todayKey,
  label,
  caption,
}: {
  value: IsoDateTime
  onChange: (iso: IsoDateTime) => void
  bounds: DrumBounds
  timeFormat: TimeFormat
  todayKey: IsoDate
  label?: string
  /** shown at the left of the row: "Start", "End" */
  caption?: string
}) {
  const parts = partsOf(value)
  const twelve = timeFormat === "h12"
  const half = toTwelve(parts.hour)
  const named = (part: string) => (label ? `${label} ${part.toLowerCase()}` : part)
  const turn = (change: Partial<DrumParts>) => {
    const next = moveDrum(value, change, bounds)
    // null is a time the clocks skip that night: refused, and the drum goes back
    if (next !== null && next !== value) onChange(next)
  }

  const days = dayChoices(todayKey, parts.day)
  const dayItems = days.map((day) => ({ key: day, text: dayLabel(day, todayKey), refused: dayRefused(day, bounds) }))
  const hours = hourLabels(timeFormat)
  const hourItems = hours.map((text, index) => {
    const hour = twelve ? fromTwelve(index, half.pm) : index
    return { key: text, text, refused: hourRefused(parts.day, hour, bounds) }
  })
  const minuteItems = MINUTE_LABELS.map((text, minute) => ({
    key: text,
    text,
    refused: minuteRefused({ day: parts.day, hour: parts.hour, minute }, bounds),
  }))
  const halfItems = [
    { key: "am", text: "AM", refused: halfRefused(parts.day, false, bounds) },
    { key: "pm", text: "PM", refused: halfRefused(parts.day, true, bounds) },
  ]
  const repeated = repeatedHour(value)

  return (
    <div className="flex items-center gap-2">
      {caption && <span className="w-9 shrink-0 text-xs text-muted-foreground">{caption}</span>}
      <div className="min-w-0 flex-1">
        <div className="relative mx-auto flex w-fit gap-1">
          <CentreBand />
          <Drum
            name={named("Day")}
            items={dayItems}
            selected={days.indexOf(parts.day)}
            onPick={(index) => turn({ day: days[index] })}
            pageStep={7}
            className="w-[108px]"
          />
          <Drum
            name={named("Hour")}
            items={hourItems}
            selected={twelve ? half.index : parts.hour}
            onPick={(index) => turn({ hour: twelve ? fromTwelve(index, half.pm) : index })}
            pageStep={twelve ? 3 : 5}
            className="w-14"
          />
          <Drum
            name={named("Minute")}
            items={minuteItems}
            selected={parts.minute}
            onPick={(minute) => turn({ minute })}
            className="w-14"
          />
          {twelve && (
            <Drum
              name={named("AM or PM")}
              items={halfItems}
              selected={half.pm ? 1 : 0}
              onPick={(index) => turn({ hour: fromTwelve(half.index, index === 1) })}
              pageStep={1}
              className="w-14"
            />
          )}
        </div>
        {/* the night the clocks go back, 02:30 happens twice: say which this is */}
        {repeated && (
          <p className="mt-1 text-center text-[11px] text-muted-foreground">
            {repeated === "first" ? "The first time round, before the clocks went back" : "The second time round, after the clocks went back"}
          </p>
        )}
      </div>
    </div>
  )
}

const NO_LIMITS: DrumBounds = { earliest: null, latest: null }

/**
 * THE SHEET'S DRUMS: Start and End, the length under them, and ✓.
 *
 * They hold a pair until ✓ (or until the sheet closes, which keeps it, like
 * every other edit in the sheet). Turned one drum at a time, an entry passes
 * through shapes nobody means — 25 hours long the moment the start's day turns
 * to yesterday — and saved, each would ask D10's question, move a touching
 * neighbour (D12) and sync. So `held` says a pair is being turned, and the
 * sheet's boxes and ±5 show and change that same pair while it is held.
 *
 * A running entry shows only its start (scenario 7); Stop at… adds the end,
 * where after now is greyed and refused, and ✓ is then a Stop. A finished
 * entry's end may go past now: that makes it planned (Q2), and says so.
 */
export function EntryDrums({
  pair,
  held,
  running,
  nowIso,
  timeFormat,
  durationFormat,
  onTurn,
  onSet,
  onCancel,
}: {
  pair: TimePair
  /** the drums have been turned and hold a pair that is not saved yet */
  held: boolean
  running: boolean
  nowIso: IsoDateTime
  timeFormat: TimeFormat
  durationFormat: DurationFormat
  onTurn: (pair: TimePair) => void
  onSet: () => void
  onCancel: () => void
}) {
  const todayKey = dateKey(nowIso)
  // a running timer started in the future would count down; it ends between its start and now
  const startBounds: DrumBounds = running ? { earliest: null, latest: nowIso } : NO_LIMITS
  const endBounds: DrumBounds = running ? { earliest: pair.start, latest: nowIso } : NO_LIMITS
  const reading = pair.stop === null ? null : readPair(pair.start, pair.stop, nowIso)
  const mend = pair.stop === null ? null : mendEnd(pair.start, pair.stop)
  const confirm =
    running && pair.stop !== null ? `✓ Stop at ${formatTimeOfDay(pair.stop, timeFormat)}` : running ? "✓ Set start" : "✓ Set times"

  return (
    <div className="space-y-2">
      <MomentDrums
        label="Start"
        caption="Start"
        value={pair.start}
        onChange={(start) => onTurn({ ...pair, start })}
        bounds={startBounds}
        timeFormat={timeFormat}
        todayKey={todayKey}
      />
      {pair.stop !== null ? (
        <MomentDrums
          label="End"
          caption="End"
          value={pair.stop}
          onChange={(stop) => onTurn({ ...pair, stop })}
          bounds={endBounds}
          timeFormat={timeFormat}
          todayKey={todayKey}
        />
      ) : (
        <div className="flex items-center gap-2">
          <span className="w-9 shrink-0 text-xs text-muted-foreground">End</span>
          <span className="flex-1 text-sm text-muted-foreground">Still running</span>
          <Button type="button" variant="outline" size="sm" className="h-11 sm:h-8" onClick={() => onTurn({ ...pair, stop: nowIso })}>
            Stop at…
          </Button>
        </div>
      )}

      {reading && (
        <div aria-live="polite" className="text-center">
          <p data-testid="drum-length" className={cn("text-sm font-medium tabular-nums", reading.endsBeforeStart && "text-destructive")}>
            {lengthLine(reading, durationFormat)}
          </p>
          {/* D10: over 12 hours is said here, not asked afterwards; ✓ is the answer */}
          {reading.long && !reading.endsBeforeStart && (
            <p className="text-xs text-muted-foreground">That makes it {formatIdleSpan(reading.seconds)}.</p>
          )}
        </div>
      )}

      {(mend || held) && (
        <div className="flex flex-wrap items-center justify-end gap-2">
          {mend && (
            <Button type="button" variant="outline" size="sm" className="mr-auto h-11 sm:h-8" onClick={() => onTurn({ ...pair, stop: mend.stop })}>
              {mend.label}
            </Button>
          )}
          {held && (
            <>
              <Button type="button" variant="ghost" size="sm" className="h-11 sm:h-8" onClick={onCancel}>
                Cancel
              </Button>
              <Button
                type="button"
                size="sm"
                className="h-11 min-w-[112px] sm:h-8"
                disabled={reading?.endsBeforeStart ?? false}
                onClick={onSet}
              >
                {confirm}
              </Button>
            </>
          )}
        </div>
      )}
    </div>
  )
}
