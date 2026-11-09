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
import Link from "next/link"
import { useSearchParams } from "next/navigation"

import { ROUTE_LABELS } from "@/components/navTabs"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { setHaptics } from "../haptics"
import { HELD_STOP_KEY, SHORTCUTS, TIMER_BAR_KEY } from "../config"
import {
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
import { SendWaitingTimerStops } from "./RunningTimerSetting"
import { ErrorBoundary } from "@/src/shared/components/ErrorBoundary"
import { useTimetrack } from "../hooks/useTimetrack"
import { defaultReportConfig, decodeReportConfig, followRounding, followWeekStart } from "../reportsService"
import { dateKey, formatClock, formatWhen } from "../timetrackFormatService"
import { newId } from "../idService"
import {
  draftFromStartLink,
  draftOf,
  emptyDraft,
  startTimer,
  toggleFavorite,
} from "../timetrackService"
import { serverIsoAt } from "../serverClock"
import { layOnto } from "../tabMergeService"
import { pageBeforeTracker, readTrackerAddress, trackerAddressFor, type Section } from "../trackerAddressService"
import type { EntryDraft, Id, IsoDate, ReportConfig, RoundingConfig, TimeEntry, TimetrackState, WeekStart } from "../types"
import { CalendarView } from "./CalendarView"
import { useIsMobile } from "../hooks/useIsMobile"
import { keepTimerView, readTimerView, weekOf, type TimerView } from "../pcTimerPageService"
import { timerList } from "../timerListService"
import { PcSidebar, type SidebarPlace } from "./PcSidebar"
import { PcWeekRow } from "./PcWeekRow"
import { EntryDetailModalBody, EntryList } from "./EntryList"
import { IdleQuestion } from "./IdleQuestion"
import { ManageView, type ManageTab } from "./ManageView"
import { ProjectsView } from "./ProjectsView"
import { ReportsView } from "./ReportsView"
import { SettingsView, type SettingsTab } from "./SettingsView"
import { FavoritesBar, RunningPill, TimerBar, type TimerMode } from "./TimerBar"
import { Modal } from "./primitives"
import { BACK_LINK_CLASS, TrackerLoading } from "./TrackerLoading"
import { PhoneTracker } from "./phone/PhoneTracker"
import { AlertsBell } from "./AlertsBell"
import { SignedOutBanner } from "./SignedOutBanner"

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
 * A pointer device has all of them in its left sidebar (`PcSidebar`).
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
  const { state, setState, nowSec, running, runningSeconds, toasts, pushToast, dismissToast, idlePrompt, resolveIdle, pomodoro, actions, requestNotificationPermission, fromAnotherTab } =
    controller

  const sync = useTimetrackSync({
    state,
    setState,
    replaceState: actions.replaceState,
    pushToast,
    account,
    fromAnotherTab,
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
  /**
   * THE PC'S TIMER PAGE (Phase 5 of Plans/toggl-parity.md): its view, kept per
   * browser, and the week its row names (null: All dates in List view, this
   * week in Calendar). The phone has neither; its Calendar is a tab of its own.
   */
  const isPc = !useIsMobile()
  /** below 640px the phone draws its own screens (`PhoneTracker`, Plans/toggl-parity.md Phases 1–2) */
  const isMobile = !isPc
  const [timerView, setTimerViewState] = useState<TimerView>(readTimerView)
  const [weekAnchor, setWeekAnchor] = useState<IsoDate | null>(null)
  const pcList = useMemo(
    () => (state ? timerList(state.entries, state.user.groupSimilarEntries) : null),
    [state?.entries, state?.user.groupSimilarEntries], // eslint-disable-line react-hooks/exhaustive-deps -- the two fields the list is made of
  )

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
    /** a Stop kept on disk while it waits, by this id (`keepHeldStop`) */
    diskId: string | null
    /** kept from an earlier opening: runs only on a check that landed, and quietly gives way */
    restored: boolean
  } | null>(null)
  /**
   * The running bar's box for the next thing (`TimerBar`'s Switched at…), kept
   * here because a dropped Start fills it: see `keepAsNext` in `afterCheck.ts`.
   */
  const [nextDraft, setNextDraft] = useState<EntryDraft>(emptyDraft)
  /**
   * A HELD TAP IS NOT SAVED YET, AND THE BADGE DOES NOT SAY IT IS.
   *
   * "held" while the tap waits; "ran" for the one render after it ran, before the
   * change-watcher has queued what it wrote. The badge keeps saying Checking…
   * through both: it said "Saved." in that render, about a Stop not yet sent
   * (production-build audit, Plans/time-tracker-leftovers.md). The watcher's
   * queueing and the clearing below land in the same render, so Checking… goes
   * straight to Saving.
   */
  const [holding, setHolding] = useState<"held" | "ran" | null>(null)
  useEffect(() => {
    if (holding === "ran") setHolding(null)
  }, [holding])
  /**
   * A HELD STOP IS KEPT ON DISK UNTIL IT HAS RUN.
   *
   * It lived only in `heldTap`, so a tab closed while it waited took it along:
   * a Stop tapped on a phone just taken out of the pocket, and the phone put
   * away again before the check answered (production-build audit,
   * Plans/time-tracker-leftovers.md). Running it on the way out would skip the
   * check it waits for — the copy on screen may be hours old, and the other
   * device's earlier Stop would lose to this one. So it is written down when it
   * is held, and the next opening holds it again: it runs when that opening's
   * check lands, through the same guards, at the moment it was tapped. A Start
   * is not kept: what it would start is a guess after a reopen.
   */
  const keepHeldStop = useCallback(
    (held: { id: string; seen: Id | null; tappedOnDevice: number }) => {
      try {
        window.localStorage.setItem(HELD_STOP_KEY, JSON.stringify({ owner: account ?? null, ...held }))
      } catch {
        // storage full or blocked: the Stop is held in memory only, as it was
      }
    },
    [account],
  )
  /** only this tap's copy: another tab's held Stop in the same slot is not this one's to forget */
  const forgetHeldStop = useCallback((id: string | null) => {
    if (!id) return
    try {
      const kept = JSON.parse(window.localStorage.getItem(HELD_STOP_KEY) ?? "null") as { id?: string } | null
      if (kept?.id === id) window.localStorage.removeItem(HELD_STOP_KEY)
    } catch {
      // nothing readable is kept
    }
  }, [])
  useEffect(() => {
    let kept: { owner?: string | null; id?: string; seen?: Id | null; tappedOnDevice?: number } | null = null
    try {
      kept = JSON.parse(window.localStorage.getItem(HELD_STOP_KEY) ?? "null")
    } catch {
      kept = null
    }
    if (!kept || typeof kept.id !== "string" || typeof kept.tappedOnDevice !== "number") return
    // another account's Stop waits for that account's opening, untouched
    if ((kept.owner ?? null) !== (account ?? null) || heldTap.current) return
    const seen = kept.seen ?? null
    heldTap.current = {
      run: (_latest, tappedAt) => actionsNow.current.stop(tappedAt, seen),
      runningId: seen,
      always: false,
      keepAsNext: null,
      tappedOnDevice: kept.tappedOnDevice,
      diskId: kept.id,
      restored: true,
    }
    // once, at the opening: what is kept is read before anything new is held
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
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
      // one tap is held, the last one: the one it replaces is forgotten, on disk too
      forgetHeldStop(heldTap.current?.diskId ?? null)
      const diskId = options?.stopSeen !== undefined ? newId() : null
      if (diskId) keepHeldStop({ id: diskId, seen: options?.stopSeen ?? null, tappedOnDevice })
      heldTap.current = {
        run,
        runningId: runningNow.current?.id ?? null,
        always: options?.always === true,
        keepAsNext: options?.keepAsNext ?? null,
        tappedOnDevice,
        diskId,
        restored: false,
      }
      setHolding("held")
    },
    [isChecking, keepHeldStop, forgetHeldStop],
  )
  useEffect(() => {
    if (sync.check.checking) return
    const tap = heldTap.current
    if (!tap) return
    // a Stop from an earlier opening waits for a check that landed, not one that timed out
    if (tap.restored && (sync.check.failed || sync.check.lastCheckedAt === null)) return
    const latest = latestState.current
    heldTap.current = null
    // what ran is queued in the next render; what did not run has nothing to wait for
    setHolding(null)
    // kept on disk until here: with no workspace yet, the next opening holds it again
    if (!latest) return
    forgetHeldStop(tap.diskId)
    if (!tap.always && (runningNow.current?.id ?? null) !== tap.runningId) {
      // a tap from a page that has since closed is not something to be told about again
      if (tap.restored) return
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
    if (tap.restored) {
      const at = formatWhen(serverIsoAt(tap.tappedOnDevice), latest.user.timeFormat, dateKey(new Date()))
      pushToast(`Stopped at ${at}, when you tapped Stop before the page closed.`)
    }
    setHolding("ran")
  }, [sync.check.checking, sync.check.failed, sync.check.lastCheckedAt, pushToast, forgetHeldStop])
  /** the sync as the badges show it: a held tap counts as still checking (see `holding`) */
  const shownSync = useMemo(
    () => (holding && !sync.check.checking ? { ...sync, check: { ...sync.check, checking: true } } : sync),
    [holding, sync],
  )
  /**
   * Stop is for the entry on the screen when it was pressed, never for one the
   * other device started a moment ago and this screen has not drawn yet (Phase 8
   * two-devices audit; `stopSeen`). The bar, the header pill, S and the
   * phone's ■ all come through here.
   */
  const stopTracking = useCallback(() => {
    const seen = runningNow.current?.id ?? null
    afterCheck((_latest, tappedAt) => actionsNow.current.stop(tappedAt, seen), { stopSeen: seen })
  }, [afterCheck])

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
    /**
     * A STOP EMPTIES THE BAR, as Toggl's does. It kept the stopped entry's
     * name, project and tags, so the next Start repeated them unless each was
     * cleared by hand (found 2026-11-05, Plans/toggl-parity.md Phase 0).
     * Carrying on with the same thing is ▶ on its row. A field typed into the
     * bar and not yet saved stays, by the same rule as below.
     */
    if (!running && mirrored.current === null) return
    const last = running ? (mirrored.current?.id === running.id ? mirrored.current.draft : null) : mirrored.current!.draft
    const fromEntry = running ? draftOf(running) : emptyDraft
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
    mirrored.current = running ? { id: running.id, draft: fromEntry } : null
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
  // Settings › Haptic feedback reaches the drums and the calendar (see `haptics`)
  const hapticsOn = state?.user.haptics !== false
  useEffect(() => setHaptics(hapticsOn), [hapticsOn])

  const arrived = useRef(false)
  /** the week start the report's range was made with: see `followWeekStart` below */
  const reportWeekStart = useRef<WeekStart | null>(null)
  /** the workspace rounding the report was made with, null for a shared report's own: see `followRounding` below */
  const reportRounding = useRef<RoundingConfig | null>(null)
  /** Settings › First tab may still arrive with the account's settings, and nobody has gone anywhere yet */
  const firstTabPending = useRef(false)
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
    reportRounding.current = decoded ? null : state.workspace.rounding
    // the address's own section, else where you were last time (see `screen`)
    // …and on a phone with nothing named, the tab chosen in Settings › First tab (Toggl's "First tab")
    const firstTab = !isPc ? state.user.firstTab : undefined
    const section: Screen = decoded ? "reports" : (readTrackerAddress(window.location.search).section ?? firstTab ?? screenNow.current)
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
            setState(layOnto(latest, started.state))
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
    // a phone that opened where nothing was named: see Settings › First tab below
    firstTabPending.current = !isPc && !decoded && !readTrackerAddress(window.location.search).section && !linked

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

  /** …and its rounding follows Default report rounding the same way, until it is changed in the report */
  const workspaceRounding = state?.workspace.rounding
  useEffect(() => {
    const from = reportRounding.current
    if (!workspaceRounding || !from) return
    reportRounding.current = workspaceRounding
    setReportConfig((config) => (config ? followRounding(config, from, workspaceRounding) : config))
  }, [workspaceRounding])

  /**
   * SETTINGS › FIRST TAB, WHEN THE ACCOUNT'S SETTINGS ARRIVE AFTER THE TRACKER OPENED.
   *
   * Arriving reads the first tab from the workspace it opens with — on a phone
   * with no copy of its own (after Log Out, or a new phone) the empty one, which
   * has none — so the first open after signing in showed Timer, and only the
   * next open showed the tab chosen (account-switching audit, Phase 8). The
   * account's choice is taken when it arrives, until the first check has
   * landed. Never once the person has gone somewhere: a tab they chose in this
   * visit is theirs (`goTo` and Back clear this).
   */
  const firstTabNow = isPc ? undefined : state?.user.firstTab
  const heardFromAccount = sync.check.lastCheckedAt !== null
  useEffect(() => {
    if (!firstTabPending.current) return
    if (firstTabNow && firstTabNow !== screenNow.current) {
      setScreen(firstTabNow)
      const arrival: TrackerStep = { timetrack: "arrival" }
      window.history.replaceState(arrival, "", trackerAddressFor(window.location.pathname, { section: firstTabNow, entryId: null }))
    }
    if (heardFromAccount) firstTabPending.current = false
  }, [firstTabNow, heardFromAccount])

  /**
   * GOING SOMEWHERE INSIDE THE TRACKER IS A STEP IN THE BROWSER'S HISTORY (D8).
   *
   * So Android's Back button steps back through what you did here — the sheet
   * first, then the sections — instead of leaving the tracker from wherever you
   * were. A section is a step; the same section again is not.
   */
  const goTo = useCallback((next: Screen) => {
    firstTabPending.current = false
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

  /** A row of the PC's sidebar: a section, and for Manage's rows the tab inside it */
  const goToPlace = useCallback(
    (place: SidebarPlace) => {
      if (place.manageTab) setManageTab(place.manageTab)
      if (place.section !== "projects") setFocusProjectId(null)
      goTo(place.section)
    },
    [goTo],
  )

  /**
   * "Calendar | List view" on the PC's Timer page, kept per browser. An address
   * that named the old Calendar section (`?view=calendar`) shows the Timer page
   * on its Calendar view; List view from there is the Timer address again.
   */
  const setTimerView = useCallback(
    (view: TimerView) => {
      setTimerViewState(view)
      keepTimerView(view)
      if (view === "list" && screenNow.current === "calendar") goTo("timer")
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
    if (section !== screenNow.current) {
      // Back, Forward or a link went somewhere: the first tab arriving late does not move it again
      firstTabPending.current = false
      setScreen(section)
    }
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
   * "← Dashboard" was written in by hand, so coming from Settings it went to the
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
      // the Timer page: on a PC that is also its Calendar view (`?view=calendar`)
      if ((screen !== "timer" && !(isPc && screen === "calendar")) || !state) return

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
        // Toggl's M switches between timer and manual mode, both ways
        setMode(mode === "manual" ? "timer" : "manual")
      } else if (key === "t") {
        // Toggl's T: today, in the calendar and the week row above it
        event.preventDefault()
        setWeekAnchor(null)
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
  }, [afterCheck, isPc, mode, screen, setMode, state, startTracking, stopTracking])

  const unreadAlerts = useMemo(() => state?.alerts.filter((a) => !a.read) ?? [], [state?.alerts])

  if (!state || !reportConfig) {
    // the same header as `app/(app)/time/loading.tsx`: see `TrackerLoading`
    return <TrackerLoading backHref={backHref} backLabel={backText} underAppHeader={underAppHeader} />
  }

  /** The Timer page, which on a PC is also where the calendar is */
  const timerPage = screen === "timer" || (isPc && screen === "calendar")
  const pcView: TimerView = screen === "calendar" ? "calendar" : timerView
  const todayKey = dateKey(new Date(nowSec * 1000))
  const pcAnchor = weekAnchor ?? todayKey
  const pcWeek = weekOf(pcAnchor, state.user.weekStart)
  const calendarView = (onTimerPage: boolean) => (
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
      anchor={onTimerPage ? pcAnchor : undefined}
      onAnchor={onTimerPage ? setWeekAnchor : undefined}
      // Toggl Track's box beside the block, on the PC's Timer page (Phase 6, D-PC-CAL)
      boxes={onTimerPage}
      onGoToProject={goToProject}
    />
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
      <SendWaitingTimerStops />

      {/* THE PHONE HAS ITS OWN SCREENS, laid out like Toggl Track's Android app
          (Plans/toggl-parity.md Phases 1–2). Everything around them — the
          workspace, the sync, the history steps, the toasts — is this shell's. */}
      {isMobile ? (
        <PhoneTracker
          lab={{
            state,
            setState,
            nowSec,
            running,
            pushToast,
            pomodoro,
            requestNotificationPermission,
            resetWorkspace: actions.resetWorkspace,
            replaceState: actions.replaceState,
            sync: shownSync,
            screen,
            goTo,
            manageTab,
            setManageTab,
            settingsTab,
            setSettingsTab,
            focusProjectId,
            setFocusProjectId,
            goToProject,
            draft,
            startTracking,
            stopTracking,
            afterCheck,
            nextDraft,
            setNextDraft,
            detailEntry: detailEntry ? (state.entries.find((e) => e.id === detailEntry.id) ?? detailEntry) : null,
            openEntry,
            closeEntry,
            reportConfig,
            setReportConfig,
            backHref,
            backText,
            goBack,
            bottomBarRef,
            unreadAlerts,
          }}
        />
      ) : (<>
      <header className="sticky top-0 z-[9500] border-b border-border bg-card/95 backdrop-blur">
        {/* flex-wrap: on a phone, a running timer plus a sync badge that keeps
            its words ("Offline · 1 waiting", "Saving 1…") plus the bell do not
            fit beside the back link and the title — they made the header 440px
            on a 390px screen and pushed the bell off it. When they do not fit,
            the right-hand group moves to its own line, still right-aligned,
            instead of off the edge. */}
        {/* Under the app's header on a PC (`underAppHeader`) this one row
            holds the sync badge (the sections are in `PcSidebar`), and the back control and
            the title are for phones only: the app's header already says both,
            and the calendar keeps the height (Q5, D9 in
            Plans/time-tracker-like-toggl.md). */}
        <div
          className={cn(
            "mx-auto flex max-w-6xl flex-wrap items-center gap-x-2 gap-y-1 px-3 py-1.5 sm:gap-3 sm:px-4 sm:py-2",
            underAppHeader && "sm:flex-nowrap",
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
          {/* on a PC the sections are down the left (`PcSidebar`) */}
          {!underAppHeader && <span className="hidden truncate text-xs text-muted-foreground sm:inline">{state.workspace.name}</span>}

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
              check={shownSync.check}
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

            <AlertsBell state={state} setState={setState} unread={unreadAlerts} />

            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShortcutsOpen(true)}
              className="hidden text-xs sm:inline-flex"
              // "⇧?" alone said nothing to a new user or a screen reader (findability check, 2026-11-05)
              aria-label="Keyboard shortcuts"
              title="Keyboard shortcuts (Shift+?)"
            >
              ⇧?
            </Button>
          </div>
        </div>

      </header>

      {/* On a PC the sections are down the left, beside everything under the header (Phase 5, D-PC-SHELL) */}
      <div className="sm:flex">
      <PcSidebar
        screen={screen}
        manageTab={manageTab}
        running={running}
        nowSec={nowSec}
        onGo={goToPlace}
        onEditRunning={openEntry}
      />
      <div className="min-w-0 flex-1">
      {sync.status === "signed-out" && <SignedOutBanner pending={sync.pendingCount} />}

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
        {timerPage && (
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
            {isPc && (
              <PcWeekRow
                anchor={weekAnchor}
                todayKey={todayKey}
                weekStart={state.user.weekStart}
                todaySeconds={pcList?.groupsAt(nowSec).find((group) => group.date === todayKey)?.totalSeconds ?? 0}
                weekSeconds={pcList?.weekSecondsAt(pcAnchor, state.user.weekStart, nowSec) ?? 0}
                durationFormat={state.user.durationFormat}
                view={pcView}
                onAnchor={setWeekAnchor}
                onView={setTimerView}
              />
            )}
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
            {isPc && pcView === "calendar" ? (
              calendarView(true)
            ) : (
              <EntryList
                state={state}
                setState={setState}
                nowSec={nowSec}
                pushToast={pushToast}
                onEditEntry={openEntry}
                onGoToProject={goToProject}
                // All dates until the week row picks a week, as in Toggl Track's List view
                weekFrom={isPc && weekAnchor !== null ? pcWeek.from : undefined}
                weekTo={isPc && weekAnchor !== null ? pcWeek.to : undefined}
                totalsAbove={isPc}
              />
            )}
          </>
        )}

        {/* the phone's Calendar tab; on a PC the calendar is a view of the Timer page */}
        {screen === "calendar" && !isPc && calendarView(false)}

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
      </div>
      </div>

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
      </>)}

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
            Shortcuts work on the Timer page and pause while a field or a dialog has focus.
          </p>
        </Modal>
      )}

      {/* entry details */}
      {detailEntry && !isMobile && (
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

        On a phone they sit above the bottom bar and UNDER an open sheet or menu: on top
        they covered a sheet's rows (findability, 2026-11-05). The phone's sheet says its
        own refusals, and a delete's Undo waits in the bottom bar (`UndoContext`).
      */}
      <div
        role="status"
        aria-live="polite"
        className="pointer-events-none fixed bottom-[calc(var(--panel-bottom-inset,4rem)+0.5rem)] left-1/2 z-[9550] flex w-full max-w-md -translate-x-1/2 sm:z-[9700] flex-col gap-2 px-3 sm:bottom-4 sm:px-4"
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
