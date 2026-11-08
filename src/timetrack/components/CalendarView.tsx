"use client"

/**
 * Calendar view — Toggl's split grid: time entries in the left column of each
 * day, external calendar events in the right column. Supports day/week, three
 * zoom levels, drag-to-create, drag-to-move, resize by either edge, a
 * now-line, and the click-an-event menu (start timer / copy as entry / open
 * event).
 *
 * Every drag is pointer events, one path for mouse, touch and pen (D13 in
 * Plans/time-tracker-like-toggl.md): a mouse drags at once; a finger holds
 * for `LONG_PRESS_MS` first, so scrolling and the day swipe stay the page's.
 */

import { useCallback, useContext, useEffect, useMemo, useRef, useState } from "react"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { hapticsAllowed } from "../haptics"
import { CALENDAR_ZOOMS } from "../config"
import { useIsMobile } from "../hooks/useIsMobile"
import type { PushToast } from "../hooks/useTimetrack"
import { serverNowIso } from "../serverClock"
import { layOnto } from "../tabMergeService"
import { stopAt, undoStopAt, withNeighbours } from "../timeFixService"
import { edgesOfDay, heldBlock, landOnEdge, snapToQuarterOrEdge, spansOfDay, type Landing } from "../phoneCalendarService"
import { AfterCheckContext } from "./afterCheck"
import { announceNeighbours, undoOrSay } from "./neighbourNotice"
import { IconCalendar, IconDown, IconNext, IconPrev, IconStart } from "../icons"
import { CalendarEntryBox, type CalendarBoxTarget } from "./CalendarEntryBox"
import {
  DRAG_THRESHOLD_PX,
  LONG_PRESS_MS,
  MOUSE_EDGE_PX,
  TOUCH_EDGE_PX,
  TOUCH_SLOP_PX,
  blockDragPatch,
  blockGrabMode,
  blockLabel,
  calendarDays,
  dayColumnSeconds,
  drawnBlockHeight,
  entriesForDay,
  entryInterval,
  eventInterval,
  eventToDraft,
  eventsForDay,
  layoutBlocks,
  ownEdges,
  shiftEntryBy,
  snapMinutes,
  swipeDirection,
  type BlockDragPatch,
  type GrabMode,
} from "../calendarService"
import {
  addDays,
  dateKey,
  epochSeconds,
  formatCompact,
  formatDayHeader,
  formatDuration,
  formatHourOfDay,
  formatTimeOfDay,
  formatWhen,
  isoAtMinutes,
  minutesIntoDay,
} from "../timetrackFormatService"
import {
  continueEntry,
  createManualEntry,
  deleteEntries,
  entrySeconds,
  isPlanned,
  isRunning,
  liveEntries,
  restoreEntries,
  startTimer,
  undoDisplacement,
  updateEntry,
} from "../timetrackService"
import type { CalendarEvent, EntryDraft, Id, IsoDate, IsoDateTime, TimeEntry, TimetrackState } from "../types"
import { ColorDot, Dropdown, Segmented, plannedStripes } from "./primitives"

/** "workweek" is Toggl Track's "5 days": Monday to Friday of the week shown */
type Range = "day" | "workweek" | "week"

/** Toggl Track's view menu, "Week view ▾" (D-PC-CAL; W25 10:04) */
const RANGE_NAMES: { id: Range; label: string }[] = [
  { id: "week", label: "Week view" },
  { id: "workweek", label: "5 days view" },
  { id: "day", label: "Day view" },
]

/** On the PC a drag or a click on empty space makes a block in 15-minute steps, as Toggl's does (D-PC-CAL) */
const PC_CREATE_SNAP = 15
type ZoomId = (typeof CALENDAR_ZOOMS)[number]["id"]

/** What a drag is doing, and where, drawn as the preview while it lasts */
interface DragState {
  day: string
  mode: "create" | GrabMode
  /** Create: where the drag began. A block: where the pointer went down on it. Snapped minutes. */
  startMinutes: number
  currentMinutes: number
  entryId?: Id
  /** A block's top as drawn on this day */
  topMinutes?: number
  /**
   * Whether the pointer has travelled `DRAG_THRESHOLD_PX` since it went down
   * on a block. Until it has, the press is a click: mouse-up used to write the
   * snapped pointer position as the end whether or not the mouse had moved, so
   * a click on a block's lower edge changed its end, and on the running block
   * stopped the timer (edits audit B2, 2026-11-04). A create has no click to
   * protect and counts as moved from the start.
   */
  moved: boolean
  /**
   * The phone's drags (D-PHONE-CAL): the instant a create began on, and the
   * instant the moving edge landed on, when either is a neighbour's own edge —
   * so it is written to the second, not rounded to its minute.
   */
  startAt?: IsoDateTime | null
  currentAt?: IsoDateTime | null
}

/**
 * One pointer on the calendar, from down to up (D13: mouse, touch and pen take
 * the same path).
 *
 * A mouse drags at once. A finger or a pen is the page's until it has been
 * held still for `LONG_PRESS_MS`: before that a flick scrolls (the browser
 * takes it and sends `pointercancel`) or, on the day view, turns the day. Only
 * once the hold has taken (`armed`) does the calendar capture the pointer and
 * keep the page from scrolling under it.
 */
interface Gesture {
  pointerId: number
  pointerType: string
  originX: number
  originY: number
  /**
   * Where the finger was when the hold took. A finger drifts a few pixels
   * while it holds (up to `TOUCH_SLOP_PX`), and the threshold that tells a
   * drag from a still hold is measured from here, or that drift alone would
   * move the block the moment the hold took.
   */
  armY: number
  /** The day column the press began in; null on the hour ruler. Its minutes are the drag's. */
  column: HTMLElement | null
  /**
   * What takes the pointer once the calendar has it: the block pressed, or
   * the column for a new block. The block itself, never its column: the
   * browser sends the click after a captured press to whatever captured it,
   * so a block captured by its column never got its click and its sheet
   * never opened (found in the browser while building Phase 6).
   */
  captureTarget: HTMLElement | null
  /** The drag this press would start, decided where it went down; null on the ruler or a calendar event (a swipe only) */
  plan: DragState | null
  armed: boolean
  timer: ReturnType<typeof setTimeout> | null
}

/**
 * One tick of the phone's motor (D13): when a hold takes, and on every
 * 5-minute step after it. Android's Chrome has it; Safari and the desktop do
 * not, and there it is nothing. Chrome also refuses it until the page has had
 * a tap, and says so in the console each time, so it is not asked before then.
 */
function tick() {
  // Settings › Haptic feedback
  if (!hapticsAllowed()) return
  if (typeof navigator === "undefined" || typeof navigator.vibrate !== "function") return
  if (navigator.userActivation && !navigator.userActivation.hasBeenActive) return
  navigator.vibrate(5)
}

export function CalendarView({
  state,
  setState,
  nowSec,
  pushToast,
  onEditEntry,
  onOpenIntegrations,
  anchor: anchorFromPage,
  onAnchor,
  boxes = false,
  onGoToProject,
  phone,
}: {
  state: TimetrackState
  setState: (updater: (current: TimetrackState) => TimetrackState) => void
  nowSec: number
  /** the third argument is an Undo; see the displaced-timer toast below, and "Keep ‘B’ as it was" on a resize */
  pushToast: PushToast
  onEditEntry: (entry: TimeEntry) => void
  onOpenIntegrations: () => void
  /**
   * On the PC's Timer page the week row above the calendar names the week
   * (Phase 5 of Plans/toggl-parity.md): it holds the day shown, and the
   * calendar's own ‹ Today › then step only a Day view, which the row does not.
   */
  anchor?: IsoDate
  onAnchor?: (day: IsoDate) => void
  /**
   * Toggl Track's box beside the block (the PC's Timer page, D-PC-CAL): a
   * drag or a click on empty space draws a block and asks for it there, and a
   * click on a block edits it there. Without it, a block opens `onEditEntry`
   * and a drag writes the block at once, as on the phone.
   */
  boxes?: boolean
  onGoToProject?: (projectId: Id) => void
  /**
   * The phone's Calendar tab (Phase 4 of Plans/toggl-parity.md, D-PHONE-CAL):
   * its own day line and week strip sit above, so the steps and the day's
   * header go; a tap selects (`selectedId` is drawn with handles); a still
   * hold on empty space makes 30 minutes or fills a gap of two hours or less;
   * a drag lands on a quarter hour or a neighbour's edge, whichever is closer.
   */
  phone?: {
    selectedId: Id | null
    /**
     * A block a held finger made: Toggl opens its editor at once, so the
     * nameless "(no description)" is not left behind with no way to name it
     * in sight (audit findability, Phase 8).
     */
    onCreated?: (entry: TimeEntry) => void
  }
}) {
  const isMobile = useIsMobile()
  const todayKey = dateKey(new Date(nowSec * 1000))
  const [range, setRange] = useState<Range>("week")
  const [rangeTouched, setRangeTouched] = useState(false)

  // A seven-column week is unreadable at phone width, so start on a single day
  useEffect(() => {
    if (!rangeTouched) setRange(isMobile ? "day" : "week")
  }, [isMobile, rangeTouched])
  const [zoom, setZoom] = useState<ZoomId>("normal")
  const [zoomTouched, setZoomTouched] = useState(false)
  /**
   * Phones open one zoom step taller. At 56px/hour a 20-minute block is 19px —
   * under the height where its title fits, so it renders as a nameless bar, and
   * a phone has no hover tooltip to fall back on.
   */
  useEffect(() => {
    if (!zoomTouched) setZoom(isMobile ? "comfortable" : "normal")
  }, [isMobile, zoomTouched])
  const [ownAnchor, setOwnAnchor] = useState(todayKey)
  const anchor = anchorFromPage ?? ownAnchor
  const anchorNow = useRef(anchor)
  anchorNow.current = anchor
  const setAnchor = (next: IsoDate | ((current: IsoDate) => IsoDate)) => {
    const day = typeof next === "function" ? next(anchorNow.current) : next
    if (onAnchor) onAnchor(day)
    else setOwnAnchor(day)
  }
  /** the week row above says which week this is, so the calendar's own steps are only for a Day view */
  const rowAbove = (onAnchor !== undefined && range !== "day") || phone !== undefined
  /** what the box beside a block is showing, when it is open */
  const [boxTarget, setBoxTarget] = useState<CalendarBoxTarget | null>(null)
  const [drag, setDrag] = useState<DragState | null>(null)
  /**
   * The same drag, for the pointer handlers. A move and the release can
   * arrive before React has drawn the move's state, and the release must
   * write where the pointer really was, not where the last drawn frame had it.
   */
  const dragRef = useRef<DragState | null>(null)
  const showDrag = (next: DragState | null) => {
    dragRef.current = next
    setDrag(next)
  }
  const gesture = useRef<Gesture | null>(null)
  /**
   * A finger is down and its hold has not taken yet. Drawn on the grid as
   * `data-pressing`, so a browser test can wait for a flick to be over —
   * after which no hold can take — instead of sleeping past the hold.
   */
  const [pressing, setPressing] = useState(false)
  const scrollRef = useRef<HTMLDivElement | null>(null)
  /**
   * Set when a press was a drag, a held finger or a swipe, so the click the
   * browser may send after it does not open the editor. Cleared by the next
   * press, so a click that never came cannot swallow the one after it.
   */
  const suppressClick = useRef(false)
  /** the workspace as it is when a toast's Undo is pressed, to say why an Undo cannot be done (`undoOrSay`) */
  const latestState = useRef(state)
  latestState.current = state

  const hourHeight = CALENDAR_ZOOMS.find((z) => z.id === zoom)!.hourHeight
  const minuteHeight = hourHeight / 60

  // 5 days is Monday to Friday of the person's own week holding the day shown (`calendarDays`)
  const days = useMemo(() => calendarDays(range, anchor, state.user.weekStart), [range, anchor, state.user.weekStart])

  const entries = liveEntries(state)
  const enabledCalendars = state.calendars.filter((c) => c.enabled)
  const events = state.events.filter((e) => enabledCalendars.some((c) => c.id === e.calendarId))
  const nowIso = () => serverNowIso()
  const afterCheck = useContext(AfterCheckContext)
  /** Only give up half of each day to external events when there are some */
  const splitColumns = events.length > 0
  const entryLaneWidth = splitColumns ? 50 : 100

  const shift = (direction: number) => {
    setAnchor((current) => addDays(current, direction * (range === "day" ? 1 : 7)))
  }

  /**
   * Open on the working hours instead of midnight: scroll to an hour before the
   * earliest thing shown, falling back to an hour before now.
   */
  useEffect(() => {
    const container = scrollRef.current
    if (!container) return
    /**
     * ON A PC, NOW IN VIEW WHEN TODAY IS SHOWN, as Toggl Track's calendar opens
     * (Phase 8 audit of Plans/toggl-parity.md): at 19:56 with the work done in
     * the morning, the rule below put the now line off the screen. About a
     * third of the way down, so what came just before is in view too.
     */
    if (!isMobile && days.includes(todayKey)) {
      const nowMinutes = minutesIntoDay(new Date(nowSec * 1000).toISOString())
      container.scrollTop = Math.max(0, nowMinutes * minuteHeight - container.clientHeight / 3)
      return
    }
    const starts = [
      ...days.flatMap((day) => entriesForDay(entries, day, nowSec).map((entry) => entryInterval(entry, day, nowSec).startMin)),
      ...days.flatMap((day) => eventsForDay(events, day).map((event) => eventInterval(event, day).startMin)),
    ].filter((minutes) => minutes > 0)
    const earliest = starts.length > 0 ? Math.min(...starts) : minutesIntoDay(new Date(nowSec * 1000).toISOString())
    // The extra 10px keeps the topmost hour label from being clipped
    container.scrollTop = Math.max(0, (earliest - 60) * minuteHeight - 10)
    // Only re-anchor when the visible range or zoom changes, not every tick
  }, [days[0], days.length, minuteHeight]) // deps intentionally narrow: see comment above

  const minutesAt = (clientY: number, column: HTMLElement, snap?: number): number =>
    snapMinutes((clientY - column.getBoundingClientRect().top) / minuteHeight, snap)
  /** a new block's steps: 15 minutes with the box, else the calendar's 5 */
  const createSnap = boxes ? PC_CREATE_SNAP : undefined
  /** where the pointer is, in minutes of the day, before any snapping: the phone snaps by its own rules */
  const rawMinutesAt = (clientY: number, column: HTMLElement): number =>
    Math.min(24 * 60, Math.max(0, (clientY - column.getBoundingClientRect().top) / minuteHeight))
  /**
   * THE PHONE'S POINTER, ON ITS QUARTER HOUR OR A NEIGHBOUR'S EDGE (D-PHONE-CAL).
   * The edge that moves — the new block's end, a resized edge, a moved block's
   * top — is put where it lands, and the pointer is given back as the minute
   * that puts it there, so `blockDragPatch` reads it as it reads any drag. A
   * neighbour's edge comes with its own instant (`at`), which is what is written.
   */
  const phonePointer = (current: DragState, raw: number): Landing => {
    const except = current.entryId ?? null
    const edges = edgesOfDay(entries, current.day, nowSec, except)
    if (current.mode === "create") return snapToQuarterOrEdge(raw, edges)
    const moving = entries.find((e) => e.id === except)
    if (!moving) return { minutes: raw, at: null }
    const interval = entryInterval(moving, current.day, nowSec)
    const edge = current.mode === "resize-start" ? interval.startMin : current.mode === "resize-end" ? interval.endMin : (current.topMinutes ?? interval.startMin)
    const landed = snapToQuarterOrEdge(edge + raw - current.startMinutes, edges)
    /**
     * Back where the edge would land unmoved: the pointer is home, and home
     * writes nothing (see `finishDrag`). Without this an entry at 09:00:40
     * dragged away and back was snapped to 09:00, and a touching neighbour
     * rewritten with it (code review of 47e97f0c).
     */
    const home = snapToQuarterOrEdge(edge, edges)
    if (landed.minutes === home.minutes && landed.at === home.at) return { minutes: current.startMinutes, at: null }
    /**
     * Where the edge lands, as an instant: the neighbour's own, or the quarter
     * hour's. Given only as minutes, a move of an entry with seconds added
     * fractional minutes, the clock dropped the fraction, and 01:20:40 dragged
     * ten minutes landed at 01:29:40, not 01:30 (heavy-history audit, Phase 8).
     */
    return { minutes: current.startMinutes + (landed.minutes - edge), at: landed.at ?? isoAtMinutes(current.day, landed.minutes) }
  }
  /** the phone's edges arrive snapped: `blockDragPatch` keeps them where they are */
  const edgeSnap = phone ? (minutes: number) => minutes : undefined
  /** a block's new times as this drag would write them; on the phone an edge on a neighbour is the neighbour's own instant */
  const patchOf = (entry: TimeEntry, day: IsoDate, current: DragState): BlockDragPatch | null => {
    const patch = blockDragPatch(entry, day, blockDrag(current), nowIso(), edgeSnap)
    if (!phone || !current.currentAt || current.mode === "create") return patch
    return landOnEdge(entry, day, current.mode, current.currentAt, patch, nowIso())
  }

  /**
   * THE PAGE MUST NOT SCROLL UNDER A HELD FINGER.
   *
   * `touch-action` is read once, when the finger lands, and it has to let the
   * page scroll then, because the finger is the page's until the hold takes.
   * Afterwards only a touchmove the page cancels keeps the browser from
   * starting a scroll, and React's touch listeners are passive, which cannot
   * cancel. Hence a listener of its own, which cancels only while a drag is on.
   */
  useEffect(() => {
    const container = scrollRef.current
    if (!container) return
    const hold = (event: TouchEvent) => {
      if (gesture.current?.armed && event.cancelable) event.preventDefault()
    }
    container.addEventListener("touchmove", hold, { passive: false })
    return () => container.removeEventListener("touchmove", hold)
  }, [])

  /** Let go of the pointer and forget the press, without writing anything */
  const endGesture = () => {
    const current = gesture.current
    gesture.current = null
    if (current?.timer) clearTimeout(current.timer)
    setPressing(false)
    const target = current?.captureTarget
    if (current && target?.hasPointerCapture?.(current.pointerId)) target.releasePointerCapture(current.pointerId)
    if (dragRef.current) showDrag(null)
  }

  /**
   * From here the moves come to the drag even when the pointer leaves the
   * grid, and the release is not lost outside it: a mouse that left the grid
   * on its first move used to leave the drag stuck, waiting for an up that
   * went elsewhere.
   */
  const capture = (pressed: Gesture) => {
    const target = pressed.captureTarget
    if (target && !target.hasPointerCapture?.(pressed.pointerId)) target.setPointerCapture?.(pressed.pointerId)
  }

  // a press still held when the calendar goes away (a section change) leaves no timer behind
  useEffect(() => () => {
    if (gesture.current?.timer) clearTimeout(gesture.current.timer)
  }, [])

  /** The hold has taken, or a mouse went down: from here the calendar has the pointer */
  const arm = (pressed: Gesture) => {
    if (gesture.current !== pressed || !pressed.plan) return
    pressed.timer = null
    pressed.armed = true
    setPressing(false)
    capture(pressed)
    showDrag(pressed.plan)
    if (pressed.pointerType !== "mouse") tick()
  }

  /** A press: `plan` is the drag it may become (null: a swipe at most), `takes` what captures the pointer once it does */
  const beginGesture = (event: React.PointerEvent<HTMLElement>, plan: DragState | null, takes: HTMLElement | null = null) => {
    const held = gesture.current
    /**
     * A second finger while the first is down is a pinch, not a drag: let the
     * first one go too. A new PRIMARY pointer means every earlier one is up,
     * so a press whose release was lost (its element went away under it) is
     * forgotten rather than swallowing this one.
     */
    if (held && !event.isPrimary) {
      endGesture()
      return
    }
    if (held) endGesture()
    if (event.pointerType === "mouse" && event.button !== 0) return
    const column = event.currentTarget.closest<HTMLElement>("[data-day-column]")
    if (plan && !column) return
    suppressClick.current = false
    const pressed: Gesture = {
      pointerId: event.pointerId,
      pointerType: event.pointerType,
      originX: event.clientX,
      originY: event.clientY,
      armY: event.clientY,
      column,
      captureTarget: plan ? (takes ?? column) : null,
      plan,
      armed: false,
      timer: null,
    }
    if (event.pointerType === "mouse") {
      // a cursor cannot scroll the page by dragging, so it drags at once
      if (!plan) return
      gesture.current = pressed
      arm(pressed)
      return
    }
    gesture.current = pressed
    if (plan) {
      pressed.timer = setTimeout(() => arm(pressed), LONG_PRESS_MS)
      setPressing(true)
    }
  }

  const onPointerMove = (event: React.PointerEvent<HTMLElement>) => {
    const pressed = gesture.current
    if (!pressed || event.pointerId !== pressed.pointerId) return
    const dx = event.clientX - pressed.originX
    const dy = event.clientY - pressed.originY
    if (!pressed.armed) {
      // where the hold takes, if it does: see `armY`
      pressed.armY = event.clientY
      // a finger going somewhere before the hold took is a scroll or a swipe, never a drag
      if (pressed.timer && Math.hypot(dx, dy) > TOUCH_SLOP_PX) {
        clearTimeout(pressed.timer)
        pressed.timer = null
        setPressing(false)
      }
      return
    }
    const current = dragRef.current
    if (!current || !pressed.column) return
    // a press on a block is a click, or a still hold, until the pointer has really moved: see `DragState`
    const moved = current.moved || Math.abs(event.clientY - pressed.armY) >= DRAG_THRESHOLD_PX
    if (!moved) return
    const landing = phone ? phonePointer(current, rawMinutesAt(event.clientY, pressed.column)) : null
    const minutes = landing ? landing.minutes : minutesAt(event.clientY, pressed.column, current.mode === "create" ? createSnap : undefined)
    if (moved === current.moved && minutes === current.currentMinutes) return
    // one tick of the phone's motor per 5-minute step; a mouse has none
    if (minutes !== current.currentMinutes && pressed.pointerType !== "mouse") tick()
    showDrag({ ...current, moved: true, currentMinutes: minutes, currentAt: landing?.at ?? null })
  }

  const onPointerUp = (event: React.PointerEvent<HTMLElement>) => {
    const pressed = gesture.current
    if (!pressed || event.pointerId !== pressed.pointerId) return
    if (pressed.armed) {
      finishDrag(pressed)
    } else if (pressed.pointerType !== "mouse" && range === "day") {
      const direction = swipeDirection(event.clientX - pressed.originX, event.clientY - pressed.originY)
      if (direction !== 0) {
        suppressClick.current = true
        shift(direction)
      }
    }
    endGesture()
  }

  /**
   * A block's new times, written with whatever refused them said out loud.
   *
   * Computed against this render's `state` first, so a refusal has somewhere
   * to be said: move and resize used to take `.state` and drop theirs, so in a
   * workspace that requires a project — or with a locked date — the block slid
   * under the cursor, snapped back, and the app said nothing.
   *
   * Then applied through the updater, not from this render's `state`: a drag
   * spans down to up, and a sync pull or the per-minute alert sweep can land
   * inside it — writing the closure's copy back would throw that away. If the
   * newer state refuses it too, it is left alone rather than given a copy
   * that was only valid a moment ago.
   *
   * A whole-block move moves the block alone. An edge moves the touching
   * neighbour's edge with it (D12), never across days (`withNeighbours`).
   */
  const commitBlock = (entryId: Id, patch: BlockDragPatch, withEdge: boolean) => {
    const now = nowIso()
    const apply = (base: TimetrackState) =>
      withEdge
        ? withNeighbours(base, entryId, now, (edited) => updateEntry(edited, entryId, patch, now))
        : { ...updateEntry(base, entryId, patch, now), moved: [], held: [] }
    const checked = apply(state)
    if (checked.violations[0]) {
      pushToast(checked.violations[0].message, "error")
      return
    }
    setState((current) => {
      const applied = apply(current)
      return applied.violations.length > 0 ? current : applied.state
    })
    announceNeighbours(checked, state.user.timeFormat, setState, pushToast, () => latestState.current)
  }

  const finishDrag = (pressed: Gesture) => {
    const drag = dragRef.current
    if (!drag) return
    const { day, mode } = drag
    const from = Math.min(drag.startMinutes, drag.currentMinutes)
    const to = Math.max(drag.startMinutes, drag.currentMinutes)

    // the click a browser may send after a held finger or a drag is not a tap
    if (pressed.pointerType !== "mouse" || drag.moved) suppressClick.current = true

    // a press on a block that never moved: with a mouse, a click (the click handler opens it); held, nothing
    if (mode !== "create" && !drag.moved) return

    if (mode === "create" && boxes) {
      // a click is a 15-minute block where it was pressed (Toggl's default length); a drag is what it covered
      const dragged = to - from >= PC_CREATE_SNAP
      const start = dragged ? from : Math.min(from, 24 * 60 - PC_CREATE_SNAP)
      setBoxTarget({ kind: "new", start: isoAtMinutes(day, start), stop: isoAtMinutes(day, dragged ? to : start + PC_CREATE_SNAP) })
      return
    }

    if (mode === "create") {
      // the phone: a finger held still makes Toggl's block, 30 minutes or the gap it is in (D-PHONE-CAL)
      const still = phone && pressed.pointerType !== "mouse" && to - from < 5 ? heldBlock(spansOfDay(entries, day, nowSec), from) : null
      // the ends that landed on a neighbour's edge are its instants, seconds included
      const startFirst = drag.startMinutes <= drag.currentMinutes
      const span = still ?? (to - from >= 5
        ? { from, to, fromAt: (startFirst ? drag.startAt : drag.currentAt) ?? null, toAt: (startFirst ? drag.currentAt : drag.startAt) ?? null }
        : null)
      if (span) {
        const result = createManualEntry(
          state,
          {
            draft: { description: "", projectId: null, taskId: null, tagIds: [], billable: state.workspace.projectsBillableByDefault },
            start: span.fromAt ?? isoAtMinutes(day, span.from),
            stop: span.toAt ?? isoAtMinutes(day, span.to),
          },
          nowIso(),
        )
        if (result.violations.length > 0) pushToast(result.violations[0].message, "error")
        else {
          setState(layOnto(state, result.state))
          if (result.entry) phone?.onCreated?.(result.entry)
        }
      }
      return
    }

    /**
     * The whole entry shifts by how far the block was dragged, or one edge
     * goes where the pointer is (`blockDragPatch`). Setting an absolute start
     * and an end of `start + heightMinutes` wrote the layout's one-minute floor
     * into the data and rounded the seconds away — and, for an entry dragged by
     * its second-day fragment, put both ends on that fragment's day and
     * destroyed the first half. A pointer back where it went down writes
     * nothing: a tap on an edge used to trim the entry, and now that an edge
     * moves its neighbour as well (D12), would have moved two.
     */
    const moving = state.entries.find((e) => e.id === drag.entryId)
    const patch = moving ? patchOf(moving, day, drag) : null
    if (moving && patch) commitBlock(moving.id, patch, mode !== "move")
  }

  /** A block's drag in the terms `blockDragPatch` reads */
  const blockDrag = (current: DragState) => ({
    mode: current.mode as GrabMode,
    topMinutes: current.topMinutes ?? 0,
    grabMinutes: current.startMinutes,
    pointerMinutes: current.currentMinutes,
  })

  /** ↑ and ↓ on a focused block move it 5 minutes, alone, like a drag of its body */
  const nudge = (entry: TimeEntry, minutes: number) => commitBlock(entry.id, shiftEntryBy(entry, minutes), false)

  /** A block clicked, or Enter on it: the box beside it on the PC, the sheet elsewhere */
  const openBlock = (entry: TimeEntry) => {
    if (boxes) setBoxTarget({ kind: "edit", entryId: entry.id })
    else onEditEntry(entry)
  }

  /** The box's ▶: the entry again from now, held until the check lands like every start (D2) */
  const continueFromBox = (entry: TimeEntry) =>
    (afterCheck ?? ((run) => run(latestState.current, nowIso())))((latest, tappedAt) => {
      const result = continueEntry(latest, entry.id, tappedAt)
      if (result.violations.length > 0) {
        pushToast(result.violations[0].message, "error")
        return
      }
      setState(layOnto(latest, result.state))
      setBoxTarget(null)
      const { displaced, started } = result
      if (displaced && started) {
        pushToast(
          `Stopped “${displaced.description.trim() || "(no description)"}” and started “${entry.description.trim() || "(no description)"}”`,
          "info",
          () => undoOrSay(() => latestState.current, (current) => undoDisplacement(current, started.id, displaced.id, nowIso()), setState, pushToast),
        )
      }
    })

  /**
   * The running block's ■: it stops now. A Stop waits for the check like every
   * Stop (D2), and says so with the Undo that Stop at… gives (`undoStopAt`).
   */
  const stopFromBox = (entry: TimeEntry) =>
    (afterCheck ?? ((run) => run(latestState.current, nowIso())))((latest, tappedAt) => {
      const result = stopAt(latest, tappedAt, nowIso())
      if (result.violations[0] || !result.stopped || result.stopped.id !== entry.id) {
        pushToast(result.violations[0]?.message ?? "Nothing is running", "error")
        return
      }
      const stopped = result.stopped
      setState(layOnto(latest, result.state))
      setBoxTarget(null)
      const name = `“${stopped.description.trim() || "(no description)"}”`
      pushToast(`Stopped ${name} ${formatWhen(stopped.stop ?? tappedAt, latest.user.timeFormat, dateKey(nowIso()))}`, "info", () =>
        undoOrSay(() => latestState.current, (current) => undoStopAt(current, stopped.id, nowIso()), setState, pushToast),
      )
    })

  /** The box's ⋮ → Delete: no question, Toggl Track's words, and Undo */
  const deleteFromBox = (entry: TimeEntry) => {
    const checked = deleteEntries(latestState.current, [entry.id], nowIso())
    if (checked.violations[0] && checked.removed.length === 0) {
      pushToast(checked.violations[0].message, "error")
      return
    }
    const now = nowIso()
    setState((current) => deleteEntries(current, [entry.id], now).state)
    pushToast("The time entry was deleted.", "info", () => setState((current) => restoreEntries(current, checked.removed)))
  }

  /** What the box sits beside: the block, or the one being drawn */
  const boxAnchor = useCallback((): HTMLElement | null => {
    const grid = scrollRef.current
    if (!grid || !boxTarget) return null
    return boxTarget.kind === "edit"
      ? grid.querySelector<HTMLElement>(`[data-entry-id="${CSS.escape(boxTarget.entryId)}"]`)
      : grid.querySelector<HTMLElement>("[data-preview]")
  }, [boxTarget])

  const zoomIndex = CALENDAR_ZOOMS.findIndex((z) => z.id === zoom)
  const stepZoom = (direction: -1 | 1) => {
    const next = CALENDAR_ZOOMS[zoomIndex + direction]
    if (!next) return
    setZoomTouched(true)
    setZoom(next.id)
  }

  const rangeLabel =
    range === "day"
      ? formatDayHeader(anchor, todayKey)
      : `${days[0]} → ${days.at(-1)}`

  /**
   * The width of the hour gutter, named once because TWO elements use it: the
   * spacer above the day headers and the ruler itself. They have to be identical
   * or every day column is offset by the difference. "1:00 PM" does not fit where
   * "13:00" did, so the format decides it.
   */
  const gutter = state.user.timeFormat === "h12" ? "w-16" : "w-12"

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        {!rowAbove && (
          <>
            <Button variant="outline" size="icon-sm" onClick={() => shift(-1)} aria-label="Previous">
              <IconPrev className="size-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={() => setAnchor(todayKey)}>
              Today
            </Button>
            <Button variant="outline" size="icon-sm" onClick={() => shift(1)} aria-label="Next">
              <IconNext className="size-4" />
            </Button>
            <span className="ml-1 text-sm font-medium">{rangeLabel}</span>
          </>
        )}

        <div className="ml-auto flex flex-wrap items-center gap-2">
          {isMobile ? (
            <Segmented
              size="sm"
              value={range === "workweek" ? "week" : range}
              onChange={(next) => {
                setRangeTouched(true)
                setRange(next)
              }}
              options={[
                { id: "day", label: "Day" },
                { id: "week", label: "Week" },
              ]}
            />
          ) : (
            // Toggl Track's "Week view ▾" with Week / 5 days / Day (D-PC-CAL)
            <Dropdown
              align="right"
              width="w-44"
              ariaLabel="Calendar view"
              trigger={() => (
                <span className="flex h-8 items-center gap-1.5 rounded-md border border-border px-3 text-sm">
                  {RANGE_NAMES.find((option) => option.id === range)?.label}
                  <IconDown className="size-3 text-muted-foreground" />
                </span>
              )}
            >
              {(close) => (
                <div className="py-1 text-sm">
                  {RANGE_NAMES.map((option) => (
                    <button
                      key={option.id}
                      type="button"
                      aria-pressed={range === option.id}
                      onClick={() => {
                        setRangeTouched(true)
                        setRange(option.id)
                        close()
                      }}
                      className={cn("flex w-full items-center px-3 py-1.5 text-left hover:bg-secondary/60", range === option.id && "text-primary")}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              )}
            </Dropdown>
          )}
          <Button variant="outline" size="sm" onClick={onOpenIntegrations}>
            <IconCalendar className="size-4" />
            {enabledCalendars.length > 0 ? `${enabledCalendars.length} calendar${enabledCalendars.length > 1 ? "s" : ""}` : "Connect calendar"}
          </Button>
        </div>
      </div>

      {phone && (
        <p className="text-[11px] text-muted-foreground">
          Hold empty space to add a block · hold a block to move it, or an edge to resize · tap one to choose it.
          {range === "day" && " Swipe sideways for another day."}
        </p>
      )}
      <div className="overflow-hidden rounded-lg border border-border bg-card">
        {/* day headers: on the phone's day view its own day line says this (`PhoneCalendar`) */}
        <div className={cn("flex border-b border-border bg-secondary/30", range !== "day" && "min-w-[640px] sm:min-w-0", phone && range === "day" && "hidden")}>
          {/* must match the ruler below exactly, or every day column is offset; on the PC it holds Toggl's − + zoom */}
          <div className={cn(gutter, "flex shrink-0 items-center justify-center gap-0.5 border-r border-border")}>
            {!isMobile && (
              <>
                <button
                  type="button"
                  onClick={() => stepZoom(-1)}
                  disabled={zoomIndex <= 0}
                  aria-label="Zoom out"
                  title={`Zoom out (${CALENDAR_ZOOMS[zoomIndex - 1]?.label ?? CALENDAR_ZOOMS[0].label})`}
                  className="flex size-5 items-center justify-center rounded text-muted-foreground hover:bg-secondary hover:text-foreground disabled:opacity-30"
                >
                  −
                </button>
                <button
                  type="button"
                  onClick={() => stepZoom(1)}
                  disabled={zoomIndex >= CALENDAR_ZOOMS.length - 1}
                  aria-label="Zoom in"
                  title={`Zoom in (${CALENDAR_ZOOMS[zoomIndex + 1]?.label ?? CALENDAR_ZOOMS.at(-1)!.label})`}
                  className="flex size-5 items-center justify-center rounded text-muted-foreground hover:bg-secondary hover:text-foreground disabled:opacity-30"
                >
                  +
                </button>
              </>
            )}
          </div>
          {days.map((day) => (
            <div key={day} data-day-header className="flex-1 border-r border-border px-2 py-1.5 last:border-r-0">
              <p className={cn("text-xs font-semibold", day === todayKey && "text-primary")}>
                {formatDayHeader(day, todayKey)}
              </p>
              <p className="text-[10px] tabular-nums text-muted-foreground">
                {formatDuration(dayColumnSeconds(entries, day, nowSec), state.user.durationFormat)}
              </p>
            </div>
          ))}
        </div>

        {/* grid */}
        {/*
          What a finger does before the hold takes is the browser's: up and
          down scroll. On the day view sideways is kept for the page, so a
          flick there turns the day instead of panning nothing; the week view
          is wider than a phone and pans both ways. Pinch-zoom stays on both.
        */}
        <div
          ref={scrollRef}
          data-calendar-scroll
          className="max-h-[70vh] overflow-auto"
          style={{ touchAction: range === "day" ? "pan-y pinch-zoom" : "pan-x pan-y pinch-zoom" }}
        >
          <div
            className={cn(
              "relative flex select-none [-webkit-touch-callout:none]",
              range !== "day" && "min-w-[640px] sm:min-w-0",
              drag && "cursor-grabbing",
            )}
            data-calendar-grid
            data-pressing={pressing || undefined}
            // a held finger is a drag here, not a request for the browser's menu; a right-click still gets it
            onContextMenu={(event) => {
              if (gesture.current) event.preventDefault()
            }}
            // here rather than on each day, so a swipe begun on the ruler is heard too
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            // the browser took the finger for a scroll, or the pointer went away: nothing is written
            onPointerCancel={endGesture}
          >
            {/* hour gutter: nothing is made here, but a thumb that lands on it may still swipe the day */}
            <div data-hour-ruler className={cn(gutter, "shrink-0 border-r border-border")} onPointerDown={(event) => beginGesture(event, null)}>
              {Array.from({ length: 24 }, (_, hour) => (
                <div
                  key={hour}
                  className="relative border-b border-border/50 text-[10px] text-muted-foreground"
                  style={{ height: hourHeight }}
                >
                  {/*
                    The ruler reads in the format the person chose, like every
                    other time on this page. It was hard-coded to 24-hour, so
                    somebody on 12-hour saw 13:00–23:00 down the side of the
                    calendar while every block beside it said "1:30 PM".
                  */}
                  <span className="absolute -top-1.5 right-1">{hour > 0 ? formatHourOfDay(hour, state.user.timeFormat) : ""}</span>
                </div>
              ))}
            </div>

            {days.map((day) => {
              const dayEntries = entriesForDay(entries, day, nowSec)
              const entryBlocks = layoutBlocks(dayEntries, (entry) => entryInterval(entry, day, nowSec))
              const dayEvents = eventsForDay(events, day)
              const eventBlocks = layoutBlocks(dayEvents, (event) => eventInterval(event, day))
              const isDragDay = drag?.day === day

              return (
                <div
                  key={day}
                  data-day-column
                  className="relative flex-1 border-r border-border last:border-r-0"
                  style={{ height: hourHeight * 24 }}
                  onPointerDown={(event) => {
                    // empty space: a new block from here; with the box, from the quarter pressed in; on the phone, its quarter or a neighbour's edge
                    if (phone) {
                      const landed = snapToQuarterOrEdge(rawMinutesAt(event.clientY, event.currentTarget), edgesOfDay(entries, day, nowSec, null))
                      beginGesture(event, { day, mode: "create", startMinutes: landed.minutes, currentMinutes: landed.minutes, startAt: landed.at, moved: true })
                      return
                    }
                    const minutes = boxes
                      ? Math.floor((event.clientY - event.currentTarget.getBoundingClientRect().top) / minuteHeight / PC_CREATE_SNAP) * PC_CREATE_SNAP
                      : minutesAt(event.clientY, event.currentTarget)
                    beginGesture(event, { day, mode: "create", startMinutes: minutes, currentMinutes: minutes, moved: true })
                  }}
                >
                  {/* hour lines */}
                  {Array.from({ length: 24 }, (_, hour) => (
                    <div key={hour} className="border-b border-border/40" style={{ height: hourHeight }} />
                  ))}

                  {/* now line */}
                  {day === todayKey && (
                    <div
                      className="pointer-events-none absolute left-0 right-0 z-20 border-t border-primary"
                      style={{ top: minutesIntoDay(new Date(nowSec * 1000).toISOString()) * minuteHeight }}
                    >
                      <span className="absolute -left-1 -top-1 size-2 rounded-full bg-primary" />
                    </div>
                  )}

                  {/* time entries — left half */}
                  {entryBlocks.map((block) => {
                    const entry = block.item
                    const width = entryLaneWidth / block.columns
                    const project = state.projects.find((p) => p.id === entry.projectId)
                    /**
                     * The block being dragged is drawn where the drag would put
                     * it, in its own lane: the entry with the drag's patch on it,
                     * so what is seen is what will be written. Its lane stays put,
                     * so it does not jump sideways as it passes another block.
                     */
                    // taken: the hold took (or a mouse went down), so it lifts before it moves
                    const held = drag !== null && drag.entryId === entry.id && drag.day === day
                    const dragging = held && drag.moved ? drag : null
                    const patch = dragging ? patchOf(entry, day, dragging) : null
                    const shown = patch ? { ...entry, ...patch } : entry
                    const interval = patch ? entryInterval(shown, day, nowSec) : null
                    const topMinutes = interval ? interval.startMin : block.topMinutes
                    const heightMinutes = interval ? Math.max(1, interval.endMin - interval.startMin) : block.heightMinutes
                    const drawnHeight = drawnBlockHeight(heightMinutes, minuteHeight)
                    // not begun yet: striped over its colour, and out of the day's total above (Q2) — while dragged too
                    const planned = isPlanned(shown, nowSec)
                    const selected = phone?.selectedId === entry.id
                    return (
                      <div
                        key={entry.id}
                        data-block
                        data-entry-block
                        data-entry-id={entry.id}
                        data-selected={selected || undefined}
                        data-planned={planned || undefined}
                        data-held={held || undefined}
                        data-dragging={dragging ? true : undefined}
                        role="button"
                        tabIndex={0}
                        aria-label={blockLabel(entry, nowSec, state.user.timeFormat)}
                        onPointerDown={(event) => {
                          // measured on the block as drawn, from the block itself, not from a child under the pointer
                          const rect = event.currentTarget.getBoundingClientRect()
                          /**
                           * WHERE THE FINGER IS, NOT WHERE CHROME SENT IT. Android's
                           * Chrome moves a touch that lands near a button onto the
                           * button ("touch adjustment"), up to about 10 px away, so
                           * a hold just under a block grabbed that block's edge and
                           * a block could not be made straight after another (found
                           * in the browser). A press outside the block's own box is
                           * the day's: it bubbles on and makes a new block. A box
                           * with no size has not been laid out, so there is nothing
                           * to be outside of.
                           */
                          const outside =
                            rect.height > 0 &&
                            (event.clientY < rect.top || event.clientY > rect.bottom || event.clientX < rect.left || event.clientX > rect.right)
                          if (outside) return
                          event.stopPropagation()
                          const offset = event.clientY - rect.top
                          const column = event.currentTarget.closest<HTMLElement>("[data-day-column]")
                          const minutes = column ? (phone ? rawMinutesAt(event.clientY, column) : minutesAt(event.clientY, column)) : block.topMinutes
                          const mode = blockGrabMode(offset, drawnHeight, {
                            edgePx: event.pointerType === "mouse" ? MOUSE_EDGE_PX : TOUCH_EDGE_PX,
                            // an edge that is midnight, not the entry's own start or end, moves the block
                            ...ownEdges(entry, day, todayKey),
                          })
                          beginGesture(
                            event,
                            { day, mode, startMinutes: minutes, currentMinutes: minutes, entryId: entry.id, topMinutes: block.topMinutes, moved: false },
                            event.currentTarget,
                          )
                        }}
                        onClick={() => {
                          if (suppressClick.current) {
                            suppressClick.current = false
                            return
                          }
                          if (!dragRef.current) openBlock(entry)
                        }}
                        onKeyDown={(event) => {
                          if (event.key === "Enter" || event.key === " ") {
                            event.preventDefault()
                            openBlock(entry)
                          } else if (event.key === "ArrowUp" || event.key === "ArrowDown") {
                            event.preventDefault()
                            nudge(entry, event.key === "ArrowUp" ? -5 : 5)
                          }
                        }}
                        className={cn(
                          "absolute z-10 cursor-grab overflow-hidden rounded border-l-2 px-1 py-0.5 text-[10px] leading-tight outline-none focus-visible:ring-2 focus-visible:ring-primary",
                          isRunning(entry) && !held && "animate-pulse",
                          held && "z-30 shadow-lg ring-1 ring-primary",
                          selected && "z-20 ring-2 ring-primary",
                        )}
                        style={{
                          top: topMinutes * minuteHeight,
                          height: drawnHeight,
                          left: `${block.column * width}%`,
                          width: `${width}%`,
                          backgroundColor: `${project?.color ?? "#525266"}33`,
                          borderColor: project?.color ?? "#525266",
                          ...(planned ? plannedStripes : {}),
                        }}
                        title={`${entry.description || "(no description)"} · ${project?.name ?? "No project"} · ${formatCompact(entrySeconds(entry, nowSec))}${planned ? " · planned" : ""}`}
                      >
                        {/* the phone's selected block: a handle on each edge, as Toggl draws them [H25 #21] */}
                        {selected && (
                          <>
                            <span data-handle="top" aria-hidden className="pointer-events-none absolute right-2 top-0.5 size-2.5 rounded-full border border-primary bg-white" />
                            <span data-handle="bottom" aria-hidden className="pointer-events-none absolute bottom-0.5 left-2 size-2.5 rounded-full border border-primary bg-white" />
                          </>
                        )}
                        {/* Below ~22px there is no room for legible text — the tooltip carries it */}
                        {heightMinutes * minuteHeight >= 22 && (
                          <>
                            <p className="truncate font-medium">{entry.description || "(no description)"}</p>
                            {heightMinutes * minuteHeight >= 34 && (
                              <p className="truncate text-muted-foreground">
                                {/* while dragged, where it is going; under a finger the hour lines are hidden */}
                                {dragging
                                  ? `${formatTimeOfDay(shown.start, state.user.timeFormat)}–${shown.stop ? formatTimeOfDay(shown.stop, state.user.timeFormat) : "now"}`
                                  : `${project?.name ?? "No project"} · ${formatCompact(entrySeconds(entry, nowSec))}`}
                              </p>
                            )}
                          </>
                        )}
                      </div>
                    )
                  })}

                  {/* external events — right half */}
                  {eventBlocks.map((block) => {
                    const event = block.item
                    const calendar = state.calendars.find((c) => c.id === event.calendarId)
                    const width = 50 / block.columns
                    return (
                      <div
                        key={event.id}
                        data-block
                        className="absolute z-10 overflow-visible"
                        style={{
                          top: block.topMinutes * minuteHeight,
                          height: Math.max(14, block.heightMinutes * minuteHeight - 1),
                          left: `${50 + block.column * width}%`,
                          width: `${width}%`,
                        }}
                        // never a new entry under an event; a finger may still swipe the day from here
                        onPointerDown={(pointerEvent) => {
                          pointerEvent.stopPropagation()
                          beginGesture(pointerEvent, null)
                        }}
                      >
                        <EventBlock
                          event={event}
                          color={calendar?.color ?? "#4285f4"}
                          calendarName={calendar?.name ?? "Calendar"}
                          onStart={(draft) =>
                            // held until the check after opening or waking lands (D2)
                            (afterCheck ?? ((run) => run(state, nowIso())))((latest, tappedAt) => {
                              // stamped at the tap, not when the check let it through (bug audit A6)
                              const result = startTimer(latest, draft, tappedAt)
                              if (result.violations.length > 0) {
                                pushToast(result.violations[0].message, "error")
                                return
                              }
                              setState(layOnto(latest, result.state))
                              // starting here ends whatever was running; say so
                              if (result.displaced) {
                                const { displaced, entry } = result
                                pushToast(
                                  `Stopped “${displaced.description.trim() || "(no description)"}” and started “${entry.description.trim() || "(no description)"}”`,
                                  "info",
                                  // both halves or neither, and a refusal is said (`undoDisplacement`)
                                  () =>
                                    undoOrSay(
                                      () => latestState.current,
                                      (current) => undoDisplacement(current, entry.id, displaced.id, nowIso()),
                                      setState,
                                      pushToast,
                                    ),
                                )
                              }
                            })
                          }
                          onCopy={(draft) => {
                            const result = createManualEntry(
                              state,
                              { draft, start: event.start, stop: event.end, sourceEventId: event.id },
                              nowIso(),
                            )
                            if (result.violations.length > 0) {
                              pushToast(result.violations[0].message, "error")
                              return
                            }
                            setState(layOnto(state, result.state))
                            pushToast("Calendar event copied as a time entry")
                          }}
                          timeFormat={state.user.timeFormat}
                        />
                      </div>
                    )
                  })}

                  {/* the block being made: striped when it would start after now, as it will be once made (Q2);
                      with the box, it stays drawn until the box adds it or is closed */}
                  {((isDragDay && drag.mode === "create") || (!drag && boxTarget?.kind === "new" && dateKey(boxTarget.start) === day)) && (() => {
                    const pending = !drag && boxTarget?.kind === "new" ? boxTarget : null
                    const from = pending ? minutesIntoDay(pending.start) : Math.min(drag!.startMinutes, drag!.currentMinutes)
                    const to = pending ? (dateKey(pending.stop) === day ? minutesIntoDay(pending.stop) : 24 * 60) : Math.max(drag!.startMinutes, drag!.currentMinutes)
                    const planned = epochSeconds(isoAtMinutes(day, from)) > nowSec
                    return (
                      <div
                        data-preview
                        data-planned={planned || undefined}
                        className={cn(
                          "pointer-events-none absolute left-0 z-30 overflow-hidden rounded border border-primary bg-primary/25 px-1 text-[10px] leading-tight",
                          splitColumns ? "w-1/2" : "w-full",
                        )}
                        style={{
                          top: from * minuteHeight,
                          height: Math.max(4, (to - from) * minuteHeight),
                          ...(planned ? plannedStripes : {}),
                        }}
                      >
                        {formatTimeOfDay(isoAtMinutes(day, from), state.user.timeFormat)}–{formatTimeOfDay(isoAtMinutes(day, to), state.user.timeFormat)}
                        {" · "}
                        {formatCompact((to - from) * 60)}
                      </div>
                    )
                  })()}
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* the phone's hint is above the grid, where it is seen (audit findability, Phase 8) */}
      {!phone && (
      <p className="text-[11px] text-muted-foreground">
        {isMobile
          ? "Hold empty space and drag to plan or log a block · hold a block to move it, or its top or bottom edge to resize · tap to edit."
          : boxes
            ? "Drag or click empty space to add an entry · drag a block to move it, its top or bottom edge to resize · click it to edit."
            : "Drag empty space to create an entry · drag a block to move it, its top or bottom edge to resize · click it to edit."}
        {isMobile && range === "day" && " Swipe sideways for another day."}
        {splitColumns
          ? " Calendar events share each day on the right and never change your entries."
          : " Connect a calendar to see your events beside your time."}
      </p>
      )}

      {boxes && boxTarget && (
        <CalendarEntryBox
          target={boxTarget}
          state={state}
          setState={setState}
          latestState={() => latestState.current}
          pushToast={pushToast}
          nowSec={nowSec}
          anchor={boxAnchor}
          onClose={() => setBoxTarget(null)}
          onContinue={continueFromBox}
          onStop={stopFromBox}
          onDelete={deleteFromBox}
          onEditEntry={onEditEntry}
          onGoToProject={onGoToProject}
        />
      )}
    </div>
  )
}

function EventBlock({
  event,
  color,
  calendarName,
  onStart,
  onCopy,
  timeFormat,
}: {
  event: CalendarEvent
  color: string
  calendarName: string
  onStart: (draft: EntryDraft) => void
  onCopy: (draft: EntryDraft) => void
  timeFormat: TimetrackState["user"]["timeFormat"]
}) {
  return (
    <Dropdown
      align="right"
      width="w-64"
      className="h-full"
      trigger={() => (
        <span
          className="block h-full overflow-hidden rounded border-l-2 px-1 py-0.5 text-left text-[10px] leading-tight"
          style={{ backgroundColor: `${color}26`, borderColor: color }}
          title={`${event.title} (${calendarName})`}
        >
          <span className="block truncate font-medium">{event.title}</span>
          <span className="block truncate text-muted-foreground">{formatTimeOfDay(event.start, timeFormat)}</span>
        </span>
      )}
    >
      {(close) => (
        <div className="space-y-2 p-3 text-sm">
          <div>
            <p className="font-medium">{event.title}</p>
            <p className="text-xs text-muted-foreground">
              {formatTimeOfDay(event.start, timeFormat)} – {formatTimeOfDay(event.end, timeFormat)}
            </p>
            <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
              <ColorDot color={color} /> {calendarName}
            </p>
            {event.location && <p className="mt-1 text-xs text-muted-foreground">📍 {event.location}</p>}
            {event.description && <p className="mt-1 line-clamp-3 text-xs text-muted-foreground">{event.description}</p>}
          </div>
          <div className="flex flex-col gap-1">
            <Button
              size="sm"
              onClick={() => {
                onStart(eventToDraft(event))
                close()
              }}
            >
              <IconStart className="size-3.5" /> Start a timer from this event
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                onCopy(eventToDraft(event))
                close()
              }}
            >
              Copy as time entry
            </Button>
            {event.htmlLink && (
              <Button size="sm" variant="ghost" asChild>
                <a href={event.htmlLink} target="_blank" rel="noreferrer">
                  Open calendar event
                </a>
              </Button>
            )}
          </div>
          <p className="text-[10px] text-muted-foreground">
            Only the event title is copied — assign project, tags and billable status yourself.
          </p>
        </div>
      )}
    </Dropdown>
  )
}
