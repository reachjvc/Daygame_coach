"use client"

/**
 * Shell for the time tracker. Mounted twice: at /time, which is the
 * product, and at /test/toggl, which is the signed-out lab the phone suite runs
 * against. Nothing in here may name either address — see `startLinkFor`.
 *
 * Owns navigation, the shared entry draft, keyboard shortcuts, toasts,
 * the alert center, the idle prompt and the entry-detail modal.
 */

import { Suspense, useCallback, useEffect, useMemo, useRef, useState, type MouseEvent } from "react"
import { ROUTES } from "@/src/shared/routes"
import Link from "next/link"
import { useSearchParams } from "next/navigation"

import { ROUTE_LABELS } from "@/components/navTabs"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { SHORTCUTS, TIMER_BAR_KEY } from "../config"
import {
  IconAlert,
  IconBell,
  IconBreak,
  IconCalendar,
  IconClose,
  IconMenu,
  IconProjects,
  IconReports,
  IconSettings,
  IconTeam,
  IconTimer,
  IconUndo,
} from "../icons"
import { BottomSheet, SheetRow } from "@/components/BottomSheet"
import { useTimetrackSync } from "../hooks/useTimetrackSync"
import { AfterCheckContext, type AfterCheck } from "./afterCheck"
import { SyncBadge } from "./SyncBadge"
import { ImportOfferBanner } from "./ImportOfferBanner"
import { OfflineShell } from "@/src/shared/components/OfflineShell"
import { ErrorBoundary } from "@/src/shared/components/ErrorBoundary"
import { useTimetrack } from "../hooks/useTimetrack"
import { defaultReportConfig, decodeReportConfig, followWeekStart } from "../reportsService"
import { dateKey, formatClock } from "../timetrackFormatService"
import {
  draftFromStartLink,
  draftOf,
  emptyDraft,
  markAlertsRead,
  startTimer,
  toggleFavorite,
} from "../timetrackService"
import { serverIsoAt } from "../serverClock"
import { pageBeforeTracker, readTrackerAddress, trackerAddressFor, type Section } from "../trackerAddressService"
import type { EntryDraft, Id, ReportConfig, TimeEntry, TimetrackState, WeekStart } from "../types"
import { CalendarView } from "./CalendarView"
import { EntryDetailModalBody, EntryList } from "./EntryList"
import { IdleQuestion } from "./IdleQuestion"
import { ManageView, type ManageTab } from "./ManageView"
import { ProjectsView } from "./ProjectsView"
import { ReportsView } from "./ReportsView"
import { SettingsView, type SettingsTab } from "./SettingsView"
import { FavoritesBar, RunningPill, TimerBar, type TimerMode } from "./TimerBar"
import { Dropdown, Modal, touchTarget } from "./primitives"
import { BACK_LINK_CLASS, TrackerLoading } from "./TrackerLoading"

type Screen = Section

type NavItem = { id: Screen; label: string; icon: typeof IconTimer }

/**
 * FOUR IN THE BAR ON A PHONE, NOT SIX.
 *
 * Six of these at 390px is 65px each with a 10px label — and the app's own tab
 * bar sets 12px as its floor on purpose, having measured that 11px was a pixel
 * under the smallest text this product is willing to show. The two that leave
 * are the two you visit least: Manage is clients, tags and a team that does not
 * exist here, and Settings is somewhere you go once. They are one tap away in
 * the sheet, which is the same trade the app's own bar makes with "More".
 *
 * A pointer device keeps all six as tabs; the room is there.
 */
const PHONE_TABS: NavItem[] = [
  { id: "timer", label: "Timer", icon: IconTimer },
  { id: "calendar", label: "Calendar", icon: IconCalendar },
  { id: "reports", label: "Reports", icon: IconReports },
  { id: "projects", label: "Projects", icon: IconProjects },
]

const MORE_SECTIONS: NavItem[] = [
  { id: "manage", label: "Manage", icon: IconTeam },
  { id: "settings", label: "Settings", icon: IconSettings },
]

const NAV: NavItem[] = [...PHONE_TABS, ...MORE_SECTIONS]

/** A history step this tracker wrote, so closing the sheet knows whether Back will undo it */
type TrackerStep = { timetrack: "arrival" | "section" | "sheet" }

function isSheetStep(state: unknown): boolean {
  return (state as Partial<TrackerStep> | null)?.timetrack === "sheet"
}

/**
 * Tells the tracker when the app's router changes the address without changing
 * the page: one of its links to the page you are already on. A component of its
 * own, inside Suspense, because a prerendered page learns its search params only
 * in the browser, and the rest of the tracker should not wait for that.
 */
function AddressWatcher({ onChange }: { onChange: () => void }) {
  // null outside the app router (a component test that mounts the tracker alone)
  const search = useSearchParams()?.toString() ?? ""
  useEffect(() => {
    onChange()
  }, [search, onChange])
  return null
}

/** The tab's own history, as the browser's Navigation API lists it; null where there is none (Safari, Firefox) */
function tabHistory(): { entries: { url: string | null }[]; currentIndex: number } | null {
  const navigation = (window as {
    navigation?: { entries?: () => { url: string | null }[]; currentEntry?: { index: number } | null }
  }).navigation
  if (!navigation?.entries || !navigation.currentEntry) return null
  return { entries: navigation.entries(), currentIndex: navigation.currentEntry.index }
}

/**
 * THE TIMER BAR'S UNSTARTED WORK, KEPT FOR THIS TAB.
 *
 * A description typed and not started, and whether the bar was in manual mode,
 * were wiped by leaving the tracker (getting-around #9 in
 * Plans/time-tracker-like-toggl.md). `sessionStorage`, so it lasts as long as
 * the tab does. Only an UNSTARTED draft is kept: a running timer's description
 * is the entry's, and is saved with it.
 */
interface TimerBarSession {
  mode: TimerMode
  draft: EntryDraft | null
}

function savedTimerBar(): TimerBarSession | null {
  if (typeof window === "undefined") return null
  try {
    const raw = window.sessionStorage.getItem(TIMER_BAR_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as Partial<TimerBarSession>
    const draft = parsed.draft
    return {
      mode: parsed.mode === "manual" ? "manual" : "timer",
      draft:
        draft && typeof draft.description === "string" && Array.isArray(draft.tagIds)
          ? {
              description: draft.description,
              projectId: typeof draft.projectId === "string" ? draft.projectId : null,
              taskId: typeof draft.taskId === "string" ? draft.taskId : null,
              tagIds: draft.tagIds.filter((id): id is string => typeof id === "string"),
              billable: draft.billable === true,
            }
          : null,
    }
  } catch {
    return null
  }
}

function keepTimerBar(patch: Partial<TimerBarSession>) {
  try {
    const next = { ...(savedTimerBar() ?? { mode: "timer", draft: null }), ...patch }
    const blank =
      !next.draft ||
      (next.draft.description === "" &&
        next.draft.projectId === null &&
        next.draft.taskId === null &&
        next.draft.tagIds.length === 0 &&
        !next.draft.billable)
    if (next.mode === "timer" && blank) window.sessionStorage.removeItem(TIMER_BAR_KEY)
    else window.sessionStorage.setItem(TIMER_BAR_KEY, JSON.stringify({ ...next, draft: blank ? null : next.draft }))
  } catch {
    // storage blocked: the bar starts empty next time, as it always did
  }
}

/** One idle choice: what happens to the minutes, then what happens to the timer */
export function TogglLab({
  account,
  backHref = "/test",
  backLabel = "/test",
  underAppHeader = false,
}: {
  /**
   * Who the server says is signed in, when the page knows (`/time`). This
   * browser's copy is that account's only, and is never shown or sent for
   * another (`browserOwner`). Absent on the lab page and in tests.
   */
  account?: string
  /** where the back control goes when there is no page before the tracker to return to */
  backHref?: string
  backLabel?: string
  /**
   * The app's own header is drawn above this on a PC (`AppFrame`, D9 in
   * Plans/time-tracker-like-toggl.md), so the tracker's "← Dashboard · Time"
   * row would say the same thing twice: on a PC it goes, and the section tabs
   * share one row with the sync badge. The lab page has no app header, so it
   * keeps its row everywhere.
   */
  underAppHeader?: boolean
} = {}) {
  const controller = useTimetrack({ account })
  const { state, setState, nowSec, running, runningSeconds, toasts, pushToast, dismissToast, idlePrompt, resolveIdle, pomodoro, actions, requestNotificationPermission } =
    controller

  const sync = useTimetrackSync({
    state,
    setState,
    replaceState: actions.replaceState,
    pushToast,
    account,
  })

  /**
   * Tell every dropdown how much of the bottom of the screen this bar occupies.
   *
   * Without it a menu opened near the bottom of a phone was drawn underneath
   * the bar: the items were on screen but the taps landed on the navigation
   * instead, so "Delete" on an entry silently did nothing. Measured rather than
   * hard-coded, because the bar grows by the phone's safe area.
   */
  /**
   * MEASURED WHEN THE BAR APPEARS, NOT WHEN THIS SHELL DOES.
   *
   * This was an effect with `[]`, run on the shell's first render — which is
   * the loading state, where the bar does not exist yet. So it found nothing,
   * published 0px, and never looked again: menus near the bottom of a phone
   * opened under the bar after all (getting-around #10 in
   * Plans/time-tracker-like-toggl.md). A callback ref runs when the bar itself
   * is attached and its clean-up when it goes. Stable (`useCallback` with no
   * dependencies), so the once-a-second re-render does not rebuild the
   * observer — that rebuild was measured at eight times in six seconds before
   * the `[]` was added.
   */
  const bottomBarRef = useCallback((bar: HTMLElement | null) => {
    if (!bar) return
    const root = document.documentElement
    const publish = () => root.style.setProperty("--panel-bottom-inset", `${bar.offsetHeight}px`)
    publish()
    const observer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(publish)
    observer?.observe(bar)
    return () => {
      observer?.disconnect()
      root.style.setProperty("--panel-bottom-inset", "0px")
    }
  }, [])

  /**
   * The section the address names is applied on arrival, not here. Arriving
   * from another page of the app, the router draws this page BEFORE it writes
   * the new address, so the first render still sees the page being left: a
   * link to `?view=timer` from Articles opened the remembered Calendar, found
   * in the browser. By the time the workspace is read, the address is this one.
   *
   * An address with no section is Timer. The tracker used to reopen the section
   * you were last on; now that a reload keeps the section in the address, all
   * that remembering still did was land the app's own "Time" link on
   * yesterday's Calendar instead of the timer.
   */
  const [screen, setScreen] = useState<Screen>("timer")
  const [manageTab, setManageTab] = useState<ManageTab>("clients")
  const [settingsTab, setSettingsTab] = useState<SettingsTab>("profile")
  const [draft, setDraftState] = useState<EntryDraft>(() => savedTimerBar()?.draft ?? emptyDraft)
  const [mode, setModeState] = useState<TimerMode>(() => savedTimerBar()?.mode ?? "timer")
  const [shortcutsOpen, setShortcutsOpen] = useState(false)
  const [moreOpen, setMoreOpen] = useState(false)
  const [detailEntry, setDetailEntry] = useState<TimeEntry | null>(null)
  const [focusProjectId, setFocusProjectId] = useState<Id | null>(null)
  const [reportConfig, setReportConfig] = useState<ReportConfig | null>(null)

  /** the latest of each, for the history listeners, which are attached once */
  const latestState = useRef<TimetrackState | null>(state)
  latestState.current = state
  const screenNow = useRef(screen)
  screenNow.current = screen
  const runningNow = useRef(running)
  runningNow.current = running
  const actionsNow = useRef(actions)
  actionsNow.current = actions
  const isChecking = sync.isChecking

  /**
   * A TAP ON START, STOP OR CONTINUE WAITS FOR THE CHECK (D2). See `afterCheck.ts`.
   *
   * One tap is held, the last one: what you pressed last is what you meant. It
   * runs when the check lands — in an effect, after React has drawn what the
   * check brought, so it acts on the account's copy and not the old one.
   */
  const heldTap = useRef<{
    run: (latest: TimetrackState, tappedAt: string) => void
    runningId: Id | null
    always: boolean
    keepAsNext: EntryDraft | null
    /** when the finger came down, on this device's clock: see `serverIsoAt` */
    tappedOnDevice: number
  } | null>(null)
  /**
   * The running bar's box for the next thing (`TimerBar`'s Switched at…), kept
   * here because a dropped Start fills it: see `keepAsNext` in `afterCheck.ts`.
   */
  const [nextDraft, setNextDraft] = useState<EntryDraft>(emptyDraft)
  const afterCheck = useCallback<AfterCheck>(
    (run, options) => {
      const latest = latestState.current
      if (!latest) return
      // the moment of the tap, not of the replay (bug audit A6)
      const tappedOnDevice = Date.now()
      if (!isChecking()) {
        run(latest, serverIsoAt(tappedOnDevice))
        return
      }
      heldTap.current = {
        run,
        runningId: runningNow.current?.id ?? null,
        always: options?.always === true,
        keepAsNext: options?.keepAsNext ?? null,
        tappedOnDevice,
      }
    },
    [isChecking],
  )
  useEffect(() => {
    if (sync.check.checking) return
    const tap = heldTap.current
    const latest = latestState.current
    heldTap.current = null
    if (!tap || !latest) return
    if (!tap.always && (runningNow.current?.id ?? null) !== tap.runningId) {
      const quoted = (text: string) => `“${text.trim() || "(no description)"}”`
      /**
       * A START THE OTHER DEVICE BEAT KEEPS ITS WORDS (bug audit A5).
       *
       * "Tap again" was wrong advice here: the box now shows the other
       * device's timer and the button under the finger is Stop, so tapping
       * again stopped it, and what was typed was gone. The words wait in the
       * running bar's box for the next thing instead, beside Switch now.
       */
      if (runningNow.current && tap.keepAsNext && tap.keepAsNext.description.trim() !== "") {
        const kept = tap.keepAsNext
        setNextDraft(kept)
        const other = quoted(runningNow.current.description)
        pushToast(
          `Your other device changed the timer while this one was checking: ${other} is running now, so ${quoted(kept.description)} did not start. It waits under the timer — Switch now ends ${other} and starts it.`,
        )
        return
      }
      pushToast(
        runningNow.current
          ? `Your other device changed the timer while this one was checking: ${quoted(runningNow.current.description)} is running now. Tap again if you still want to.`
          : "Your other device stopped the timer while this one was checking. Tap again if you still want to.",
      )
      return
    }
    tap.run(latest, serverIsoAt(tap.tappedOnDevice))
  }, [sync.check.checking, pushToast])
  const stopTracking = useCallback(() => afterCheck((_latest, tappedAt) => actionsNow.current.stop(tappedAt)), [afterCheck])

  /**
   * The timer bar's edits, kept for this tab while nothing is running (see
   * `TimerBarSession`). The bar is the only caller; the mirror below writes the
   * running entry into the draft directly, and that is not something to keep.
   */
  const setDraft = useCallback((next: EntryDraft) => {
    setDraftState(next)
    if (!runningNow.current) keepTimerBar({ draft: next })
  }, [])

  /**
   * THE BAR SHOWS WHAT IS TRACKING, WHOEVER CHANGED IT (bug audit A4).
   *
   * This copied the running entry into the bar only when a different entry
   * started. A rename or a new project from the other device was stored here
   * and never shown: the phone's bar said "Gym" over "Gym, legs day", and a
   * Stop and a Start carried on under the old name. Now every change to the
   * running entry reaches the bar — except a field the person has changed in
   * the bar and not yet saved (the description waits for a pause in typing),
   * because what somebody is typing is never overwritten. "Changed in the bar"
   * means different from what the bar was last given.
   */
  const draftNow = useRef(draft)
  draftNow.current = draft
  const mirrored = useRef<{ id: Id; draft: EntryDraft } | null>(null)
  const runningTags = running?.tagIds.join(",")
  useEffect(() => {
    if (!running) {
      mirrored.current = null
      return
    }
    const fromEntry = draftOf(running)
    const last = mirrored.current?.id === running.id ? mirrored.current.draft : null
    const shown = draftNow.current
    const keep = <K extends keyof EntryDraft>(key: K, same: (a: EntryDraft[K], b: EntryDraft[K]) => boolean = Object.is) =>
      last && !same(shown[key], last[key]) ? shown[key] : fromEntry[key]
    const next: EntryDraft = {
      description: keep("description"),
      projectId: keep("projectId"),
      taskId: keep("taskId"),
      tagIds: keep("tagIds", (a, b) => a.join(",") === b.join(",")),
      billable: keep("billable"),
    }
    mirrored.current = { id: running.id, draft: fromEntry }
    setDraftState(next)
  }, [running?.id, running?.description, running?.projectId, running?.taskId, runningTags, running?.billable]) // deps: the fields the bar shows

  /**
   * Manual mode adds a finished entry through the same description box, and
   * adding one empties it. So back on the timer with something running, the
   * bar shows what runs again: it stayed empty over the running timer, and its
   * next commit would have renamed the entry to nothing (bug audit E3).
   */
  const setMode = useCallback((next: TimerMode) => {
    setModeState(next)
    keepTimerBar({ mode: next })
    const live = runningNow.current
    if (next !== "timer" || !live) return
    const fromEntry = draftOf(live)
    mirrored.current = { id: live.id, draft: fromEntry }
    setDraftState(fromEntry)
  }, [])

  /**
   * A timer starting or stopping ends the life of the unstarted draft: it was
   * started, or what the bar now holds is the stopped entry's words. Only a
   * CHANGE counts — the first look, as the workspace arrives, keeps the draft.
   */
  const runningId = running?.id ?? null
  const hasState = state !== null
  const seenRunningId = useRef<Id | null | undefined>(undefined)
  useEffect(() => {
    if (!hasState) return
    if (seenRunningId.current !== undefined && seenRunningId.current !== runningId) keepTimerBar({ draft: null })
    seenRunningId.current = runningId
  }, [hasState, runningId])

  /**
   * The next thing is next after the timer that is running. Once nothing runs
   * it is about nothing, and left in place it would turn up under whatever
   * timer starts later. Only on stopping: a timer STARTING is how a Start the
   * other device beat arrives, and its words are put here on purpose (A5).
   */
  useEffect(() => {
    if (runningId === null) setNextDraft(emptyDraft)
  }, [runningId])

  /** The tracker's own path, `/time` or `/test/toggl`, as it was when it opened */
  const trackerPath = useRef<string | null>(null)

  /**
   * ARRIVING: WHAT THE ADDRESS ASKED FOR, ONCE, THEN AN ADDRESS THAT SAYS WHERE YOU ARE.
   *
   * Runs when the workspace first exists, because each part needs it: a shared
   * report's defaults, a start link's project, a linked entry. Whatever the link
   * carried is used here and then left out of the address, so a reload does
   * not start the timer twice or force Reports again (getting-around #12). The
   * ref, not the dependency list, keeps it to once: React runs effects twice
   * in development.
   */
  const arrived = useRef(false)
  /** the week start the report's range was made with: see `followWeekStart` below */
  const reportWeekStart = useRef<WeekStart | null>(null)
  useEffect(() => {
    if (!state || arrived.current) return
    arrived.current = true
    trackerPath.current = window.location.pathname
    const params = new URLSearchParams(window.location.search)

    // A shared report. The link is laid over a complete config, so a partial
    // one cannot reach a builder.
    const shared = params.get("report")
    const defaults = defaultReportConfig(dateKey(new Date()), state.user.weekStart, state.workspace.rounding)
    const decoded = shared ? decodeReportConfig(shared, defaults) : null
    setReportConfig(decoded ?? defaults)
    reportWeekStart.current = state.user.weekStart
    // the address's own section, else where you were last time (see `screen`)
    const section: Screen = decoded ? "reports" : (readTrackerAddress(window.location.search).section ?? screenNow.current)
    if (section !== screenNow.current) setScreen(section)

    // `?start=1&description=…` start links (Toggl's "Copy start link")
    if (params.get("start") === "1") {
      const linkDraft = draftFromStartLink(state, params)
      setDraftState(linkDraft)
      // on the account's copy, not the one this device opened with (D2)
      afterCheck(
        (latest, tappedAt) => {
          const started = startTimer(latest, linkDraft, tappedAt)
          if (started.violations.length > 0) pushToast(started.violations[0].message, "error")
          else {
            setState(() => started.state)
            // a link that quietly ends the timer you had running is the worst version
            // of this, because you did not even press anything in this app
            if (started.displaced) {
              pushToast(
                `This link stopped “${started.displaced.description.trim() || "(no description)"}”, which was running`,
              )
            }
          }
        },
        { always: true },
      )
    }

    // `?entry=<id>`: a link to one entry opens its sheet, if it still exists
    const { entryId } = readTrackerAddress(window.location.search)
    const linked = entryId ? (state.entries.find((e) => e.id === entryId && !e.serverDeletedAt) ?? null) : null
    if (linked) setDetailEntry(linked)

    // Replaced, not pushed: arriving is one step, wherever the link pointed.
    const arrival: TrackerStep = { timetrack: "arrival" }
    window.history.replaceState(arrival, "", trackerAddressFor(window.location.pathname, { section, entryId: linked?.id ?? null }))
  }, [state, pushToast, setState, afterCheck])

  /**
   * Reports' "this week" follows the week start: when it is changed in Settings, and
   * when the account's settings arrive after the report was made (see `followWeekStart`).
   */
  const weekStart = state?.user.weekStart
  useEffect(() => {
    const from = reportWeekStart.current
    if (weekStart === undefined || from === null || from === weekStart) return
    reportWeekStart.current = weekStart
    setReportConfig((config) => (config ? followWeekStart(config, dateKey(new Date()), from, weekStart) : config))
  }, [weekStart])

  /**
   * GOING SOMEWHERE INSIDE THE TRACKER IS A STEP IN THE BROWSER'S HISTORY (D8).
   *
   * So Android's Back button steps back through what you did here — the sheet
   * first, then the sections — instead of leaving the tracker from wherever you
   * were. A section is a step; the same section again is not.
   */
  const goTo = useCallback((next: Screen) => {
    if (next === screenNow.current) return
    const step: TrackerStep = { timetrack: "section" }
    window.history.pushState(step, "", trackerAddressFor(window.location.pathname, { section: next, entryId: null }))
    setScreen(next)
  }, [])

  // stable, so a keystroke in the timer bar does not redraw the whole entry list (D6)
  const goToProject = useCallback(
    (projectId: Id) => {
      setFocusProjectId(projectId)
      goTo("projects")
    },
    [goTo],
  )

  /** The detail sheet, opened as a step of its own, so Back closes it */
  const openEntry = useCallback((entry: TimeEntry) => {
    const address = trackerAddressFor(window.location.pathname, { section: screenNow.current, entryId: entry.id })
    // another entry from inside an open sheet takes its place rather than stacking
    if (isSheetStep(window.history.state)) window.history.replaceState({ timetrack: "sheet" } satisfies TrackerStep, "", address)
    else window.history.pushState({ timetrack: "sheet" } satisfies TrackerStep, "", address)
    setDetailEntry(entry)
  }, [])

  /**
   * Closing the sheet with its own X or Escape undoes the step that opened it,
   * so the next Back steps a section rather than opening the sheet again. A
   * sheet that arrived with the page (`?entry=` in a link) has no step of its
   * own to undo, so the address is rewritten instead.
   */
  const closeEntry = useCallback(() => {
    setDetailEntry(null)
    if (isSheetStep(window.history.state)) {
      window.history.back()
      return
    }
    const step: TrackerStep = { timetrack: "section" }
    window.history.replaceState(step, "", trackerAddressFor(window.location.pathname, { section: screenNow.current, entryId: null }))
  }, [])

  /**
   * The address says where you are now: after Back or Forward, and after one of
   * the app's own links to this page (the PC's top bar has "Time" on it).
   *
   * Only what differs is applied. The tracker's own steps change the address
   * too, and they arrive here already true; setting the open sheet again would
   * hand it a fresh copy of the entry mid-edit.
   */
  const applyAddress = useCallback(() => {
    // not arrived yet, or leaving the tracker: the router is taking this page down
    if (trackerPath.current === null || window.location.pathname !== trackerPath.current) return
    const address = readTrackerAddress(window.location.search)
    const section = address.section ?? "timer"
    if (section !== screenNow.current) setScreen(section)
    setDetailEntry((open) => {
      if ((open?.id ?? null) === address.entryId) return open
      const entries = latestState.current?.entries ?? []
      return address.entryId ? (entries.find((e) => e.id === address.entryId && !e.serverDeletedAt) ?? null) : null
    })
  }, [])

  useEffect(() => {
    window.addEventListener("popstate", applyAddress)
    return () => window.removeEventListener("popstate", applyAddress)
  }, [applyAddress])

  /**
   * THE WAY OUT RETURNS TO WHERE YOU CAME FROM (D9).
   *
   * "← Dashboard" was written in by hand, so coming from Thoughts it went to the
   * Dashboard (getting-around #4). Where the browser can list this tab's history
   * (`pageBeforeTracker`), the control names that page and steps back to it,
   * past every section visited in between; otherwise it is the fixed link it
   * always was. Read after mounting: the server cannot know, and the first
   * render must match what it drew.
   */
  const [cameFrom, setCameFrom] = useState<string | null>(null)
  useEffect(() => {
    setCameFrom(pageBeforeTracker(window.location.pathname, tabHistory(), window.location.origin)?.path ?? null)
  }, [])
  const backText = cameFrom ? (ROUTE_LABELS[cameFrom] ?? "Back") : backLabel
  const goBack = useCallback((event: MouseEvent<HTMLAnchorElement>) => {
    const before = pageBeforeTracker(trackerPath.current ?? window.location.pathname, tabHistory(), window.location.origin)
    if (!before) return // the link's own navigation: the fallback page
    event.preventDefault()
    window.history.go(-before.steps)
  }, [])

  const startTracking = useCallback(
    (nextDraft?: EntryDraft) => {
      const payload = nextDraft ?? draft
      if (nextDraft) setDraft(nextDraft)
      // if the other device has a timer running by the time the check lands, these words wait as the next thing (A5)
      afterCheck((_latest, tappedAt) => actionsNow.current.start(payload, tappedAt), { keepAsNext: payload })
    },
    [afterCheck, draft, setDraft],
  )

  // Keyboard shortcuts — Timer screen only, never while typing (Toggl's rule)
  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null
      const typing =
        target?.tagName === "INPUT" || target?.tagName === "TEXTAREA" || target?.tagName === "SELECT" || target?.isContentEditable
      if (event.metaKey || event.ctrlKey || event.altKey) return

      /**
       * THE TYPING GUARD COMES FIRST, INCLUDING FOR `?`.
       *
       * This branch sat three lines above it, so `Shift+?` fired in every text field
       * on every screen — and `preventDefault()` on keydown suppresses the character,
       * so the question mark could not be typed anywhere in the slice. Typing "Call
       * Acme — what next?" lost the "?" and opened a modal over the timer bar. The
       * description field's own placeholder is "What are you working on?".
       *
       * The e2e spec blurs the active element before pressing `Shift+?` — its comment
       * says "Shortcuts are ignored while a field has focus, so blur first" — which is
       * why the suite never saw it: the test encoded the intended rule and the code
       * did not follow it.
       *
       * `?` is still allowed on every SCREEN, unlike the letter shortcuts below, which
       * is the point of a help key.
       */
      if (typing) return

      /**
       * NOR WHILE A DIALOG OR A MENU IS OPEN.
       *
       * The typing guard looks only at the focused element. With the detail
       * sheet, the shortcuts list or an entry's ⋮ menu open and focus on one of
       * its buttons, nothing was being typed, so a stray `s` stopped the timer
       * behind the sheet and `c` started one behind the menu. Whatever is open
       * on top is what the keys belong to; Escape still closes it, because that
       * is the dialog's own listener, not this one.
       */
      const overlay = '[role="dialog"], [data-dropdown-panel]'
      if (target?.closest?.(overlay) || document.querySelector(overlay)) return

      if (event.key === "?" && event.shiftKey) {
        event.preventDefault()
        setShortcutsOpen((open) => !open)
        return
      }
      if (screen !== "timer" || !state) return

      const key = event.key.toLowerCase()
      if (key === "s") {
        event.preventDefault()
        stopTracking()
      } else if (key === "n") {
        event.preventDefault()
        setMode("timer")
        startTracking()
      } else if (key === "m") {
        event.preventDefault()
        setMode("manual")
      } else if (key === "c") {
        event.preventDefault()
        afterCheck((_latest, tappedAt) => actionsNow.current.continueLast(tappedAt))
      } else if (/^[1-9]$/.test(event.key)) {
        const favorite = state.favorites[Number(event.key) - 1]
        if (favorite) {
          event.preventDefault()
          startTracking(favorite.draft)
        }
      }
    }
    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [afterCheck, screen, setMode, state, startTracking, stopTracking])

  const unreadAlerts = useMemo(() => state?.alerts.filter((a) => !a.read) ?? [], [state?.alerts])

  if (!state || !reportConfig) {
    // the same header as `app/(app)/time/loading.tsx`: see `TrackerLoading`
    return <TrackerLoading backHref={backHref} backLabel={backText} underAppHeader={underAppHeader} />
  }

  /** The six sections as tabs, for a pointer device; a phone has the bottom bar */
  const sectionTabs = (className: string, onAppRow: boolean) => (
    <nav className={className}>
      {NAV.map((item) => {
        const Icon = item.icon
        return (
          <button
            key={item.id}
            type="button"
            onClick={() => {
              goTo(item.id)
              if (item.id !== "projects") setFocusProjectId(null)
            }}
            aria-current={screen === item.id ? "page" : undefined}
            className={cn(
              "-mb-px flex items-center gap-1.5 whitespace-nowrap border-b-2 px-3 text-sm",
              onAppRow ? "py-2.5" : "py-2",
              screen === item.id
                ? "border-primary font-medium text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            <Icon className="size-4" />
            {item.label}
          </button>
        )
      })}
    </nav>
  )

  return (
    // The theme's --input equals the card background, which makes bordered
    // fields invisible on cards; give every field in the sandbox real contrast
    <div className="min-h-screen bg-background [&_input[data-slot=input]]:border-border [&_input[data-slot=input]]:bg-background/60 [&_select]:bg-background/60">
      {/* header */}
      <OfflineShell />
      <Suspense fallback={null}>
        <AddressWatcher onChange={applyAddress} />
      </Suspense>

      <header className="sticky top-0 z-[9500] border-b border-border bg-card/95 backdrop-blur">
        {/* flex-wrap: on a phone, a running timer plus a sync badge that keeps
            its words ("Offline · 1 waiting", "Saving 1…") plus the bell do not
            fit beside the back link and the title — they made the header 440px
            on a 390px screen and pushed the bell off it. When they do not fit,
            the right-hand group moves to its own line, still right-aligned,
            instead of off the edge. */}
        {/* Under the app's header on a PC (`underAppHeader`) this one row
            holds the section tabs and the sync badge, and the back control and
            the title are for phones only: the app's header already says both,
            and the calendar keeps the height (Q5, D9 in
            Plans/time-tracker-like-toggl.md). */}
        <div
          className={cn(
            "mx-auto flex max-w-6xl flex-wrap items-center gap-x-2 gap-y-1 px-3 py-1.5 sm:gap-3 sm:px-4 sm:py-2",
            underAppHeader && "sm:flex-nowrap sm:py-0",
          )}
        >
          {/* The only way out of the tracker on a phone: see `BACK_LINK_CLASS` */}
          <Link href={backHref} onClick={goBack} className={cn(BACK_LINK_CLASS, underAppHeader && "sm:hidden")}>
            {/* the arrow always survives; the word gives way first, because a
                header that overflows takes the sync state off the screen with it */}
            <span className="shrink-0">←</span>
            <span className="max-w-[112px] truncate">{backText}</span>
          </Link>
          {/* The page you tapped "Time" to reach says so. It used to be headed
              with the workspace's name and a badge reading "Toggl-style time
              tracker" — the name of the thing it was copied from, on the
              product. The workspace name is the subtitle it always was. */}
          {/* Under the app's header on the PC the title is only read aloud, not
              removed: the page still needs its one heading, and the browser
              tests find the tracker by it at every width */}
          <h1 className={cn("shrink-0 text-sm font-semibold", underAppHeader && "sm:sr-only")}>Time</h1>
          {underAppHeader
            ? sectionTabs("hidden min-w-0 self-stretch overflow-x-auto sm:flex", true)
            : <span className="hidden truncate text-xs text-muted-foreground sm:inline">{state.workspace.name}</span>}

          {/* min-w-0, because this group holds three things that all want their
              full width: the sync badge with its sentence, the running pill with
              its clock, and the bell. With a timer running and the badge in a
              state that keeps its words — offline, not saved, signed out — they
              pushed the bell 28px off the right edge of a 390px screen. Nothing
              caught it: the overflow test stops its timer before it navigates,
              so it never visits another screen with the pill on screen. */}
          {/* With a timer running outside the Timer screen, its pill joins this
              group, and on a phone the group then always takes its own row:
              otherwise the header would jump between one and two rows every
              time the badge briefly says "Saving 1…" after a change. */}
          <div
            className={cn(
              "ml-auto flex min-w-0 max-w-full items-center gap-1 sm:gap-2",
              screen !== "timer" &&
                state.entries.some((e) => e.duration < 0 && !e.serverDeletedAt) &&
                "basis-full justify-end sm:basis-auto",
            )}
          >
            <SyncBadge
              status={sync.status}
              pending={sync.pendingCount}
              check={sync.check}
              nowMs={nowSec * 1000}
              onCheck={sync.checkNow}
            />
            {pomodoro.phase !== "idle" && (
              <span className="hidden items-center gap-1 rounded-full border border-border px-2 py-1 text-xs sm:flex">
                {pomodoro.phase === "break" ? <IconBreak className="size-3.5" /> : <IconTimer className="size-3.5" />}
                {pomodoro.phase === "break" ? "Break" : "Focus"} {formatClock(pomodoro.secondsLeft)}
                {pomodoro.cycles > 0 && <span className="text-muted-foreground">· {pomodoro.cycles} done</span>}
              </span>
            )}
            {/* On a phone the timer card already shows this, so only surface it elsewhere */}
            <div className={cn(screen === "timer" && "hidden sm:block")}>
              <RunningPill state={state} nowSec={nowSec} onStop={stopTracking} />
            </div>

            <Dropdown
              align="right"
              width="w-80"
              ariaLabel="Project alerts"
              onOpenChange={(open) => {
                if (open && unreadAlerts.length > 0) setState((current) => markAlertsRead(current))
              }}
              trigger={() => (
                <span className={cn(touchTarget, "relative rounded-md text-muted-foreground hover:bg-secondary/60")}>
                  <IconBell className="size-5 sm:size-4" />
                  {/*
                    9px was the smallest text anywhere in the slice, on the one badge
                    whose whole job is to be read at a glance, and at 4.17:1 it was under
                    the 4.5:1 contrast floor as well. 10px in a slightly larger circle,
                    at full-strength white on the destructive fill.
                  */}
                  {unreadAlerts.length > 0 && (
                    <span className="absolute -right-1 -top-1 flex size-[18px] items-center justify-center rounded-full bg-destructive text-[10px] font-semibold leading-none text-white">
                      {unreadAlerts.length}
                    </span>
                  )}
                </span>
              )}
            >
              {() => (
                <div className="max-h-72 overflow-y-auto p-2">
                  <p className="px-1 pb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Project alerts
                  </p>
                  {state.alerts.length === 0 ? (
                    <p className="px-1 py-2 text-xs text-muted-foreground">No alerts have fired.</p>
                  ) : (
                    state.alerts.slice(0, 20).map((alert) => (
                      <div key={alert.id} className="flex items-start gap-2 rounded px-1 py-1.5 text-xs">
                        <IconAlert className="mt-0.5 size-3.5 shrink-0 text-destructive" />
                        <span>
                          <strong>{state.projects.find((p) => p.id === alert.projectId)?.name ?? "Project"}</strong> passed{" "}
                          {alert.threshold}% of its {alert.basis === "fixed_fee" ? "fixed fee" : "estimate"} for the period
                          starting {alert.periodStart}.
                        </span>
                      </div>
                    ))
                  )}
                </div>
              )}
            </Dropdown>

            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShortcutsOpen(true)}
              className="hidden text-xs sm:inline-flex"
            >
              ⇧?
            </Button>
          </div>
        </div>

        {!underAppHeader && sectionTabs("mx-auto hidden max-w-6xl gap-1 overflow-x-auto px-4 sm:flex", false)}
      </header>

      {sync.status === "signed-out" && (
        <div className="mx-auto max-w-6xl px-3 pt-3 sm:px-4">
          <div className="flex flex-col gap-2 rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-sm sm:flex-row sm:items-center">
            <p className="flex-1">
              <strong>You have been signed out.</strong> Nothing is lost — everything you have done is saved in
              this browser
              {sync.pendingCount > 0 && <>, including {sync.pendingCount} change{sync.pendingCount === 1 ? "" : "s"} waiting to be saved to your account</>}
              . Sign in again to carry on where you left off.
            </p>
            <Button size="sm" asChild>
              <Link href={`/auth/login?next=${encodeURIComponent(typeof window === "undefined" ? ROUTES.time : window.location.pathname)}`}>
                Sign in again
              </Link>
            </Button>
          </div>
        </div>
      )}

      {sync.importOffer && (
        <div className="mx-auto max-w-6xl px-3 pt-3 sm:px-4">
          <ImportOfferBanner
            offer={sync.importOffer}
            todayKey={dateKey(new Date(nowSec * 1000))}
            onUpload={sync.acceptImport}
            onDismiss={sync.declineImport}
          />
        </div>
      )}

      {/* one screen failing must not take the rest of the tracker with it —
          the timer keeps running even if Reports cannot render */}
      <ErrorBoundary label="this screen">
      <AfterCheckContext.Provider value={afterCheck}>
      <main className="mx-auto max-w-6xl space-y-4 px-3 pb-24 pt-3 sm:px-4 sm:py-4">
        {screen === "timer" && (
          <>
            <TimerBar
              state={state}
              setState={setState}
              draft={draft}
              setDraft={setDraft}
              mode={mode}
              setMode={setMode}
              running={running}
              runningSeconds={runningSeconds}
              nowSec={nowSec}
              onStart={() => startTracking()}
              onStop={stopTracking}
              onEditEntry={openEntry}
              pushToast={pushToast}
              next={nextDraft}
              setNext={setNextDraft}
            />
            <FavoritesBar
              state={state}
              onStart={(favoriteDraft) => startTracking(favoriteDraft)}
              onRemove={(id) => {
                const favorite = state.favorites.find((f) => f.id === id)
                if (!favorite) return
                setState((current) => toggleFavorite(current, favorite.draft, new Date().toISOString()))
                // The control sits beside the one that starts a timer, on a
                // strip you scroll with a thumb. An undo costs a line and makes
                // the mis-tap free.
                pushToast(
                  `Removed “${favorite.draft.description.trim() || "(no description)"}” from favorites`,
                  "info",
                  () => setState((current) => toggleFavorite(current, favorite.draft, new Date().toISOString())),
                )
              }}
            />
            <EntryList
              state={state}
              setState={setState}
              nowSec={nowSec}
              pushToast={pushToast}
              onEditEntry={openEntry}
              onGoToProject={goToProject}
            />
          </>
        )}

        {screen === "calendar" && (
          <CalendarView
            state={state}
            setState={setState}
            nowSec={nowSec}
            pushToast={pushToast}
            onEditEntry={openEntry}
            onOpenIntegrations={() => {
              goTo("settings")
              setSettingsTab("integrations")
            }}
          />
        )}

        {screen === "reports" && (
          <ReportsView
            state={state}
            setState={setState}
            nowSec={nowSec}
            config={reportConfig}
            setConfig={setReportConfig}
            pushToast={pushToast}
          />
        )}

        {screen === "projects" && (
          <ProjectsView
            state={state}
            setState={setState}
            nowSec={nowSec}
            pushToast={pushToast}
            focusProjectId={focusProjectId}
            onFocusProject={setFocusProjectId}
          />
        )}

        {screen === "manage" && (
          <ManageView state={state} setState={setState} nowSec={nowSec} pushToast={pushToast} tab={manageTab} setTab={setManageTab} />
        )}

        {screen === "settings" && (
          <SettingsView
            state={state}
            setState={setState}
            nowSec={nowSec}
            pushToast={pushToast}
            resetWorkspace={actions.resetWorkspace}
            replaceState={actions.replaceState}
            requestNotificationPermission={requestNotificationPermission}
            tab={settingsTab}
            setTab={setSettingsTab}
            syncStatus={sync.status}
            onUploadEverything={sync.uploadEverything}
          />
        )}
      </main>
      </AfterCheckContext.Provider>
      </ErrorBoundary>

      {/* bottom navigation (phones) */}
      <nav
        ref={bottomBarRef}
        className="fixed inset-x-0 bottom-0 z-[9500] flex border-t border-border bg-card/95 pb-[env(safe-area-inset-bottom)] backdrop-blur sm:hidden"
        aria-label="Sections"
      >
        {PHONE_TABS.map((item) => {
          const Icon = item.icon
          const active = screen === item.id
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                goTo(item.id)
                if (item.id !== "projects") setFocusProjectId(null)
              }}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex min-h-11 flex-1 flex-col items-center gap-0.5 py-2 text-xs font-medium",
                active ? "text-primary" : "text-muted-foreground",
              )}
            >
              <Icon className="size-5" />
              {item.label}
            </button>
          )
        })}
        <button
          type="button"
          onClick={() => setMoreOpen(true)}
          aria-current={MORE_SECTIONS.some((item) => item.id === screen) ? "page" : undefined}
          className={cn(
            "flex min-h-11 flex-1 flex-col items-center gap-0.5 py-2 text-xs font-medium",
            MORE_SECTIONS.some((item) => item.id === screen) ? "text-primary" : "text-muted-foreground",
          )}
        >
          <IconMenu className="size-5" />
          More
        </button>
      </nav>

      <BottomSheet open={moreOpen} onClose={() => setMoreOpen(false)} title="More">
        {MORE_SECTIONS.map((item) => (
          <SheetRow
            key={item.id}
            icon={item.icon}
            onClick={() => {
              goTo(item.id)
              setFocusProjectId(null)
              setMoreOpen(false)
            }}
          >
            {item.label}
          </SheetRow>
        ))}
      </BottomSheet>

      {/* shortcut overlay */}
      {shortcutsOpen && (
        <Modal title="Keyboard shortcuts" onClose={() => setShortcutsOpen(false)}>
          <ul className="space-y-1 text-sm">
            {SHORTCUTS.map((shortcut) => (
              <li key={shortcut.keys} className="flex items-center gap-3">
                <kbd className="min-w-[64px] rounded border border-border bg-secondary px-1.5 py-0.5 text-center text-xs">
                  {shortcut.keys}
                </kbd>
                <span className="text-muted-foreground">{shortcut.action}</span>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-xs text-muted-foreground">
            Shortcuts work on the Timer screen and pause while a field is focused — the same rule as Toggl&apos;s web app.
          </p>
        </Modal>
      )}

      {/* entry details */}
      {detailEntry && (
        <Modal title="Time entry details" onClose={closeEntry}>
          <EntryDetailModalBody
            entry={state.entries.find((e) => e.id === detailEntry.id) ?? detailEntry}
            state={state}
            setState={setState}
            pushToast={pushToast}
            nowSec={nowSec}
          />
        </Modal>
      )}

      {/* idle prompt */}
      {idlePrompt && (
        // counts the time away up to now, on every tick: see `IdleQuestion`
        <IdleQuestion
          prompt={idlePrompt}
          entryStartIso={state.entries.find((e) => e.id === idlePrompt.entryId)?.start ?? idlePrompt.idleSinceIso}
          nowSec={nowSec}
          timeFormat={state.user.timeFormat}
          onResolve={resolveIdle}
        />
      )}

      {/*
        Toasts. `role="status"` (an implicit `aria-live="polite"`) on the CONTAINER,
        which is in the tree from first render — a live region announces what appears
        inside it after it is registered, so putting the role on each toast as it
        mounts announces nothing at all. This is the slice's only channel for "that was
        refused and here is why", including the range refusals and the import errors,
        so with no live region a screen-reader user got silence where everyone else got
        a sentence.
      */}
      <div
        role="status"
        aria-live="polite"
        className="pointer-events-none fixed bottom-[calc(4.5rem+env(safe-area-inset-bottom))] left-1/2 z-[9700] flex w-full max-w-md -translate-x-1/2 flex-col gap-2 px-3 sm:bottom-4 sm:px-4"
      >
        {toasts.map((toast) => {
          /**
           * A question's two answers do not fit beside it on a phone, and nor
           * does one long answer — "Keep ‘Email’ as it was" squeezed the
           * sentence beside it into three lines of three words. Either takes
           * its own row.
           */
          const ownRow = Boolean(toast.second) || (toast.undoLabel?.length ?? 0) > 12
          return (
          <div
            key={toast.id}
            className={cn(
              "pointer-events-auto flex items-center gap-3 rounded-lg border px-3 py-2 text-sm shadow-xl",
              toast.tone === "error" ? "border-destructive/50 bg-destructive/15" : "border-border bg-card",
              ownRow && "flex-wrap gap-y-1",
            )}
          >
            <span className={cn("flex-1", ownRow && "basis-full")}>{toast.text}</span>
            {toast.undo && (
              <Button
                size="sm"
                variant="ghost"
                className="h-11 sm:h-7"
                onClick={() => {
                  toast.undo?.()
                  dismissToast(toast.id)
                }}
              >
                {/* an answer to a question is not an undo */}
                {!toast.second && <IconUndo className="size-3.5" />} {toast.undoLabel ?? "Undo"}
              </Button>
            )}
            {toast.second && (
              <Button
                size="sm"
                variant="ghost"
                className="h-11 sm:h-7"
                onClick={() => {
                  toast.second?.run()
                  dismissToast(toast.id)
                }}
              >
                {toast.second.label}
              </Button>
            )}
            <button
              type="button"
              aria-label="Dismiss"
              onClick={() => dismissToast(toast.id)}
              className="text-muted-foreground hover:text-foreground"
            >
              <IconClose className="size-3.5" />
            </button>
          </div>
          )
        })}
      </div>
    </div>
  )
}
