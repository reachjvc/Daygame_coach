"use client"

/**
 * THE TRACKER ON A PHONE, LAID OUT LIKE TOGGL TRACK'S ANDROID APP
 * (Plans/toggl-parity.md Phases 1–2: D-PHONE-SHELL, D-SHEET, D-START).
 *
 * Below 640px `TogglLab` draws this instead of its own header, sections and
 * tab bar; everything else — the workspace, the sync, the history steps that
 * make Android's Back work, leaving and logging out, the toasts, the idle
 * question — is still `TogglLab`'s and reaches this through `lab`.
 *
 *   header   ← (where you came from) · "Timer" · sync · ⊕ · 🔔 · ⚙
 *            List view | Pomodoro           (on the Timer tab)
 *   main     YOUR ACTIVITY, the days, the rows
 *   bottom   the bar — "I'm working on…" ▶, or the running timer ■ —
 *            above three tabs: Timer · Calendar · Reports
 *
 * ⚙ holds what the old fourth and fifth tabs held: Projects, Clients, Tags,
 * Settings, Import and export, each today's screen unchanged. The bell has no
 * Toggl counterpart; it sits where Toggl's minimise button does.
 */

import { useCallback, useEffect, useRef, useState } from "react"
import Link from "next/link"

import { BottomSheet, SheetRow } from "@/components/BottomSheet"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { ErrorBoundary } from "@/src/shared/components/ErrorBoundary"
import type { PushToast, ToastMessage } from "../../hooks/useTimetrack"
import type { useTimetrackSync } from "../../hooks/useTimetrackSync"
import {
  IconAdd,
  IconCalendar,
  IconClient,
  IconClose,
  IconExport,
  IconImport,
  IconProjects,
  IconReports,
  IconSettings,
  IconTag,
  IconTimer,
  IconUndo,
} from "../../icons"
import { serverNowIso } from "../../serverClock"
import { dateKey, formatClock, plural } from "../../timetrackFormatService"
import { bulkEditEntries, deleteEntries, emptyDraft, toggleFavorite } from "../../timetrackService"
import type { Section } from "../../trackerAddressService"
import type { EntryDraft, Id, IsoDate, AlertEvent, ReportConfig, TimeEntry, TimetrackState } from "../../types"
import { AfterCheckContext, type AfterCheck } from "../afterCheck"
import { AlertsBell } from "../AlertsBell"
import { undoOrSay } from "../neighbourNotice"
import { useBackCloses } from "../../hooks/useBackCloses"
import { undoStopAt } from "../../timeFixService"
import { SignedOutBanner } from "../SignedOutBanner"
import { useMomentActions } from "../useMomentActions"
import { UNDO_WAITS_MS, UndoContext } from "./undoContext"
import { BlockPanel, PhoneCalendar } from "./PhoneCalendar"
import { PhoneReports } from "./PhoneReports"
import { ImportOfferBanner } from "../ImportOfferBanner"
import { ManageView, type ManageTab } from "../ManageView"
import { MomentDialog, type MomentKind } from "../MomentPicker"
import { ProjectPicker, TagPicker } from "../pickers"
import { touchTarget } from "../primitives"
import { ProjectsView } from "../ProjectsView"
import { ReportsView } from "../ReportsView"
import { SettingsView, type SettingsTab } from "../SettingsView"
import { SyncBadge, describeBadge } from "../SyncBadge"
import { FavoritesBar } from "../TimerBar"
import { BACK_LINK_CLASS } from "../TrackerLoading"
import { EntrySheet, sheetKey, type SheetTarget } from "./EntrySheet"
import { deleteWithUndo, PhoneEntryList } from "./PhoneEntryList"
import { PomodoroPanel, type PomodoroNow } from "./PomodoroPanel"
import { RunBar } from "./RunBar"
import type { SetState } from "./landOnCurrent"

/** What the shell is handed by `TogglLab`: its state and its navigation, nothing re-implemented */
export interface PhoneLab {
  state: TimetrackState
  setState: SetState
  nowSec: number
  running: TimeEntry | null
  pushToast: PushToast
  pomodoro: PomodoroNow
  requestNotificationPermission: () => Promise<boolean>
  resetWorkspace: () => void
  replaceState: (next: TimetrackState) => void
  sync: ReturnType<typeof useTimetrackSync>
  screen: Section
  goTo: (section: Section) => void
  manageTab: ManageTab
  setManageTab: (tab: ManageTab) => void
  settingsTab: SettingsTab
  setSettingsTab: (tab: SettingsTab) => void
  focusProjectId: Id | null
  setFocusProjectId: (id: Id | null) => void
  goToProject: (projectId: Id) => void
  /** what waits to be started (a start link's words, the PC bar's half-typed name in this tab) */
  draft: EntryDraft
  startTracking: (draft?: EntryDraft) => void
  stopTracking: () => void
  afterCheck: AfterCheck
  /** the words a Start the other device beat left waiting (A5) */
  nextDraft: EntryDraft
  setNextDraft: (draft: EntryDraft) => void
  /** the entry whose sheet the address names, as `TogglLab` keeps it */
  detailEntry: TimeEntry | null
  openEntry: (entry: TimeEntry) => void
  closeEntry: () => void
  reportConfig: ReportConfig
  setReportConfig: (config: ReportConfig | ((config: ReportConfig | null) => ReportConfig | null)) => void
  backHref: string
  backText: string
  goBack: (event: React.MouseEvent<HTMLAnchorElement>) => void
  bottomBarRef: (bar: HTMLElement | null) => void | (() => void)
  unreadAlerts: AlertEvent[]
  /** a newer build waits to be loaded (`useNewBuild`) */
  newBuild: { ready: boolean; reload: () => void }
  /** the shell's toasts: on a phone the newest is drawn here, in the bottom block (4.5) */
  toasts: ToastMessage[]
  dismissToast: (id: number) => void
}

/** A name in a toast is cut to 30 characters (Plans/time-log-phone.md 4.5) */
export function shortNames(text: string): string {
  return text.replace(/([“‘])([^”’]+)([”’])/g, (whole, open: string, name: string, close: string) =>
    name.length > 30 ? `${open}${name.slice(0, 29).trimEnd()}…${close}` : whole,
  )
}

const TABS: { id: Section; label: string; icon: typeof IconTimer }[] = [
  { id: "timer", label: "Timer", icon: IconTimer },
  { id: "calendar", label: "Calendar", icon: IconCalendar },
  { id: "reports", label: "Reports", icon: IconReports },
]

function titleOf(screen: Section, manageTab: ManageTab, settingsTab: SettingsTab): string {
  if (screen === "manage") return manageTab === "tags" ? "Tags" : manageTab === "team" ? "Team" : "Clients"
  // "Import/export": the full words were cut to "Import and…" beside the icons (6.4)
  if (screen === "settings") return settingsTab === "data" ? "Import/export" : "Settings"
  return { timer: "Timer", calendar: "Calendar", reports: "Reports", projects: "Projects" }[screen]
}

/** A history step this shell writes for a new entry's sheet, the same shape as `TogglLab`'s, so Back closes it */
const SHEET_STEP = { timetrack: "sheet" as const }
const isSheetStep = (state: unknown) => (state as { timetrack?: string } | null)?.timetrack === "sheet"

export function PhoneTracker({ lab }: { lab: PhoneLab }) {
  const { state, setState: writeState, nowSec, running, pushToast, sync, screen } = lab

  /**
   * A DELETE'S UNDO WAITS (`UndoContext`): in the bottom bar until the next
   * change to the workspace — any write from these screens, or a timer
   * starting or stopping — or 30 seconds; a newer delete's replaces it.
   */
  const [undo, setUndo] = useState<{ key: number; text: string; run: () => void; ids: string[] } | null>(null)
  const undoCount = useRef(0)
  /** the workspace as it is now, for an Undo pressed after the sheet that offered it closed */
  const latestState = useRef(state)
  latestState.current = state
  /**
   * ONE TOAST AT A TIME, THE NEWEST (Plans/time-log-phone.md 4.5). A delete's
   * Undo (here) and the shell's toasts (a continue, a fix, a neighbour moved)
   * were two kinds in two places, and could stack. Each new one replaces the
   * one before, in the bottom block above the bar, so none covers it.
   */
  const toastsNow = useRef(lab.toasts)
  toastsNow.current = lab.toasts
  const { dismissToast } = lab
  const offerUndo = useCallback(
    (text: string, run: () => void, ids: string[]) => {
      for (const toast of toastsNow.current) dismissToast(toast.id)
      setUndo({ key: ++undoCount.current, text, run, ids })
    },
    [dismissToast],
  )
  const newestToast = lab.toasts.length > 0 ? lab.toasts[lab.toasts.length - 1] : null
  const toastSeen = useRef<number | null>(null)
  useEffect(() => {
    if (!newestToast || newestToast.id === toastSeen.current) return
    toastSeen.current = newestToast.id
    setUndo(null)
    for (const toast of toastsNow.current) if (toast.id !== newestToast.id) dismissToast(toast.id)
  }, [newestToast, dismissToast])
  const setState: SetState = useCallback(
    (updater) => {
      setUndo(null)
      writeState(updater)
    },
    [writeState],
  )
  useEffect(() => {
    if (!undo) return
    const timer = window.setTimeout(() => setUndo(null), UNDO_WAITS_MS)
    return () => window.clearTimeout(timer)
  }, [undo])
  /**
   * A timer starting or stopping is a change, so the Undo goes — but not when
   * the running entry stopped because it was the one deleted: that is the
   * delete the Undo is for (offline audit, Phase 8).
   */
  const runningId = running?.id ?? null
  const runningBefore = useRef(runningId)
  useEffect(() => {
    const was = runningBefore.current
    runningBefore.current = runningId
    if (was === runningId) return
    setUndo((current) => (current && was !== null && runningId === null && current.ids.includes(was) ? current : null))
  }, [runningId])

  /** each tab opens at its top: the Calendar opened scrolled down, its week strip out of sight (audit findability, Phase 8) */
  const shownScreen = useRef(screen)
  useEffect(() => {
    if (shownScreen.current === screen) return
    shownScreen.current = screen
    window.scrollTo(0, 0)
  }, [screen])

  /**
   * THE BOTTOM BLOCK'S OWN HEIGHT, MEASURED HERE. Every tab is padded clear of
   * it by this, not only by the page-wide `--panel-bottom-inset` (which the
   * menus read, and which any bar going away sets back to nothing): on Reports
   * the last rows of Group by sat under the bar (audit findability, Phase 8).
   */
  const [barHeight, setBarHeight] = useState<number | null>(null)
  const { bottomBarRef } = lab
  const bottomBlockRef = useCallback(
    (block: HTMLElement | null) => {
      const published = bottomBarRef(block)
      if (!block) return
      const measure = () => setBarHeight(block.offsetHeight)
      measure()
      const observer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(measure)
      observer?.observe(block)
      return () => {
        observer?.disconnect()
        if (typeof published === "function") published()
      }
    },
    [bottomBarRef],
  )
  const clearOfBar = barHeight !== null ? `${barHeight + 16}px` : "calc(var(--panel-bottom-inset, 9rem) + 1rem)"
  const [view, setView] = useState<"list" | "pomodoro">("list")
  const [menuOpen, setMenuOpen] = useState(false)
  /** how Settings was opened: from ⚙ "Settings" its list of sections, otherwise the section itself (6.4) */
  const [settingsEntry, setSettingsEntry] = useState({ list: true, visit: 0 })
  const [selected, setSelected] = useState<Id[] | null>(null)
  /** the day the Calendar tab shows; "See in calendar" on a planned day goes there */
  const [calendarDay, setCalendarDay] = useState<IsoDate | null>(null)
  /** Reports: Toggl's short screen, or "Details", the full reports (D-PHONE-REPORTS) */
  const [reportsDetails, setReportsDetails] = useState(false)
  const reportsDownload = useRef<(() => void) | null>(null)
  /**
   * DETAILS IS A STEP IN THE HISTORY (audit 2026-11-14, b04): Android's Back
   * left the tracker from it. Opening pushes a step on the same address;
   * Back, or "‹ Back to the short report", takes it away.
   */
  const openDetails = () => {
    window.history.pushState({ timetrack: "report-details" }, "", window.location.href)
    setReportsDetails(true)
  }
  useEffect(() => {
    if (!reportsDetails) return
    const onPop = () => setReportsDetails(false)
    window.addEventListener("popstate", onPop)
    return () => window.removeEventListener("popstate", onPop)
  }, [reportsDetails])
  /** a block a held finger made: its sheet opens with the name ready to type (audit findability, Phase 8) */
  const nameFor = useRef<Id | null>(null)
  /**
   * A HELD BLOCK CLOSED UNCHANGED IS TAKEN AWAY AGAIN (Plans/time-log-phone.md 1.2).
   *
   * A hold on the grid makes the block and opens its sheet. Closed with ✕ or
   * Done and nothing changed, it stayed as a 30-minute "(no description)"
   * entry, a junk entry from an accidental hold. `held` is the block as it was
   * made; `heldClosed` asks, once the save from Done has landed, whether it is
   * still exactly that.
   */
  /**
   * NO PULL-TO-REFRESH BY ACCIDENT (Plans/time-log-phone.md 2.5). A drag down
   * at the top of the list or calendar reloaded the page in the installed
   * app. Only while the phone tracker is on screen; the PC never draws it.
   *
   * On <body> too: on Android Chrome (emulated Pixel 7, 2026-11-14), the value on
   * <html> alone still let a pull reload the page, 2 out of 2 times, and
   * that threw away an open sheet's unsaved edits. With <body> set as well,
   * 4 out of 4 pulls left the page alone.
   */
  useEffect(() => {
    const roots = [document.documentElement, document.body]
    const was = roots.map((el) => el.style.overscrollBehaviorY)
    for (const el of roots) el.style.overscrollBehaviorY = "contain"
    return () => {
      roots.forEach((el, i) => {
        el.style.overscrollBehaviorY = was[i]
      })
    }
  }, [])
  const held = useRef<TimeEntry | null>(null)
  const [heldClosed, setHeldClosed] = useState<Id | null>(null)
  useEffect(() => {
    if (heldClosed === null) return
    setHeldClosed(null)
    const made = held.current
    held.current = null
    if (!made || made.id !== heldClosed) return
    const now = state.entries.find((e) => e.id === made.id && !e.serverDeletedAt)
    const same =
      now &&
      now.description === made.description &&
      now.projectId === made.projectId &&
      now.taskId === made.taskId &&
      now.start === made.start &&
      now.stop === made.stop &&
      now.billable === made.billable &&
      now.tagIds.join() === made.tagIds.join()
    if (!same) return
    setState((current) => {
      const removed = deleteEntries(current, [made.id], serverNowIso())
      return removed.violations.length === 0 ? removed.state : current
    })
  }, [heldClosed, state, setState])
  /** the calendar block whose panel is open (D-PHONE-CAL) */
  const [blockId, setBlockId] = useState<Id | null>(null)
  const block = screen === "calendar" && blockId ? (state.entries.find((e) => e.id === blockId && !e.serverDeletedAt) ?? null) : null
  useBackCloses(block !== null, () => setBlockId(null))

  // --- the sheet, and Back ----------------------------------------------------

  const [newSheet, setNewSheet] = useState<Extract<SheetTarget, { mode: "start" | "manual" }> | null>(null)
  /** Back was pressed with something changed: the sheet stays and asks (D-SHEET item 2) */
  const [backedOut, setBackedOut] = useState<SheetTarget | null>(null)
  const dirty = useRef(false)
  const closing = useRef(false)
  const editId = lab.detailEntry?.id ?? null

  /**
   * An edit sheet is `TogglLab`'s step: Back clears its entry. With changes,
   * that is a question, not a close — worked out while drawing, not in an
   * effect after it, or the sheet would be taken down for one frame and come
   * back empty, its changes gone.
   */
  const [shownEdit, setShownEdit] = useState<Id | null>(editId)
  if (shownEdit !== editId) {
    if (shownEdit !== null && editId === null && !closing.current && dirty.current) setBackedOut({ mode: "edit", entryId: shownEdit })
    // Back on a held block's sheet with nothing changed takes the block away, as ✕ does (audit 2026-11-14, b06)
    else if (shownEdit !== null && editId === null && !closing.current && held.current?.id === shownEdit) setHeldClosed(shownEdit)
    closing.current = false
    setShownEdit(editId)
  }

  const target: SheetTarget | null = editId !== null ? { mode: "edit", entryId: editId } : (newSheet ?? backedOut)

  // a new entry's sheet is this shell's own step
  useEffect(() => {
    if (!newSheet) return
    const onPop = () => {
      if (isSheetStep(window.history.state)) return
      if (dirty.current) setBackedOut(newSheet)
      setNewSheet(null)
    }
    window.addEventListener("popstate", onPop)
    return () => window.removeEventListener("popstate", onPop)
  }, [newSheet])

  const openNew = (mode: "start" | "manual") => {
    window.history.pushState(SHEET_STEP, "", `${window.location.pathname}${window.location.search}`)
    // the moment of the tap: a new entry from the bar is already counting (D-START)
    setNewSheet({ mode, openedAt: serverNowIso(), draft: mode === "start" ? lab.draft : emptyDraft })
  }

  const closeSheet = useCallback(() => {
    if (held.current && held.current.id === editId) setHeldClosed(editId)
    nameFor.current = null
    dirty.current = false
    if (backedOut) {
      // Back already took the step away
      setBackedOut(null)
      return
    }
    if (editId !== null) {
      closing.current = true
      lab.closeEntry()
      return
    }
    setNewSheet(null)
    if (isSheetStep(window.history.state)) window.history.back()
  }, [backedOut, editId, lab])

  const keepEditing = () => {
    const was = backedOut
    setBackedOut(null)
    if (!was) return
    if (was.mode === "edit") {
      const entry = state.entries.find((e) => e.id === was.entryId)
      if (entry) lab.openEntry(entry)
      return
    }
    window.history.pushState(SHEET_STEP, "", `${window.location.pathname}${window.location.search}`)
    setNewSheet(was)
  }

  // --- Stop at…, Switched at…, Started at… ------------------------------------

  const [moment, setMoment] = useState<{ kind: MomentKind; openedAt: string; draft: EntryDraft } | null>(null)
  const { setNextDraft } = lab
  const confirmMoment = useMomentActions({
    state,
    setState,
    pushToast,
    afterCheck: lab.afterCheck,
    onSwitched: () => setNextDraft(emptyDraft),
  })

  // --- the pieces -------------------------------------------------------------

  const title = titleOf(screen, lab.manageTab, lab.settingsTab)
  /**
   * THE TAB YOU CAME FROM (Plans/time-log-phone.md 1.5). Projects, Clients,
   * Tags, Settings and Import are opened from ⚙ over one of the three tabs; their
   * ← went to Home and threw you out of the tracker. Now it goes back to that
   * tab, says its name, and the tab stays lit underneath.
   */
  const mainTab = TABS.some((t) => t.id === screen)
  const fromTab = useRef<Section>("timer")
  if (mainTab) fromTab.current = screen
  /** history steps pushed since leaving that tab: one step back is Back's own, more is a fresh step */
  const stepsAway = useRef(0)
  useEffect(() => {
    const onPop = () => {
      stepsAway.current = 0
    }
    window.addEventListener("popstate", onPop)
    return () => window.removeEventListener("popstate", onPop)
  }, [])
  const backToTab = () => {
    // inside a Settings section its own step is on top: one Back would only reach the list
    const subStep = (window.history.state as { timetrack?: string } | null)?.timetrack === "settings-section"
    if (stepsAway.current === 1 && !subStep) {
      window.history.back()
      return
    }
    go(fromTab.current)
  }
  const go = (section: Section) => {
    if (section !== screen) stepsAway.current = TABS.some((t) => t.id === section) ? 0 : stepsAway.current + 1
    setMenuOpen(false)
    setBlockId(null)
    setReportsDetails(false)
    if (section !== "projects") lab.setFocusProjectId(null)
    lab.goTo(section)
  }
  const menuRows: { label: string; icon: typeof IconTimer; run: () => void }[] = [
    { label: "Projects", icon: IconProjects, run: () => go("projects") },
    { label: "Clients", icon: IconClient, run: () => (lab.setManageTab("clients"), go("manage")) },
    { label: "Tags", icon: IconTag, run: () => (lab.setManageTab("tags"), go("manage")) },
    { label: "Settings", icon: IconSettings, run: () => (lab.setSettingsTab("profile"), setSettingsEntry((n) => ({ list: true, visit: n.visit + 1 })), go("settings")) },
    { label: "Import and export", icon: IconImport, run: () => (lab.setSettingsTab("data"), setSettingsEntry((n) => ({ list: false, visit: n.visit + 1 })), go("settings")) },
  ]

  const next = lab.nextDraft.description.trim()

  /**
   * ■ ON THE BAR, WITH THE SAME UNDO AS CONTINUE AND DELETE (Plans/time-log-phone.md
   * 4.6): a stop by a slipped thumb was a trip into the entry to clear its end.
   * Undo runs it again from its own start (`undoStopAt`), unless another timer
   * has started since, which it says.
   */
  const stopWithUndo = () => {
    const stopping = running
    lab.stopTracking()
    if (!stopping) return
    const name = stopping.description.trim() || "(no description)"
    offerUndo(
      `Stopped “${name}”`,
      () => undoOrSay(() => latestState.current, (current) => undoStopAt(current, stopping.id, serverNowIso()), setState, pushToast),
      [stopping.id],
    )
  }

  return (
    <UndoContext.Provider value={offerUndo}>
      {/* below the phone's status bar in the installed app (Plans/time-log-phone.md 2.3) */}
      <header className="sticky top-0 z-[9500] border-b border-border bg-card/95 pt-[env(safe-area-inset-top)] backdrop-blur">
        {/* ONE ROW, ALWAYS. The sync badge keeps its words while it saves or is
            offline ("Saving 1…"); a row that wrapped then grew by a line and
            moved everything under it — a finger holding the calendar landed
            40px off, found by the touch test. The back word and the title give
            way instead, the back word first. */}
        <div className="flex items-center gap-x-1 px-3 pt-1.5">
          {/* the way out: see `BACK_LINK_CLASS`; small, left of the title (D-PHONE-SHELL).
              The back word gives way WHOLE, and before the title does (alpha
              picky-eye-17: "← Dashbo…  Repor…" while the badge said "Saving 1…").
              The link wraps and is one 44px line tall with the rest hidden: a
              word that does not fit beside the arrow drops to the hidden second
              line instead of being cut. Flex shrinks in proportion to weight
              times width, so at 100 the title still lost a pixel and showed
              "Repor…"; at 10000 the link gives up all the room it can first. */}
          {mainTab ? (
            <Link
              href={lab.backHref}
              onClick={lab.goBack}
              className={cn(BACK_LINK_CLASS, "h-11 min-w-8 shrink-[10000] flex-wrap content-start overflow-hidden")}
            >
              <span className="shrink-0 leading-[2.75rem]">←</span>
              <span className="max-w-[96px] truncate leading-[2.75rem]">{lab.backText}</span>
            </Link>
          ) : (
            <button
              type="button"
              onClick={backToTab}
              className={cn(BACK_LINK_CLASS, "h-11 min-w-8 shrink-[10000] flex-wrap content-start overflow-hidden")}
            >
              <span className="shrink-0 leading-[2.75rem]">←</span>
              <span className="max-w-[96px] truncate leading-[2.75rem]">{TABS.find((t) => t.id === fromTab.current)?.label ?? "Timer"}</span>
            </button>
          )}
          {/* the page's one heading, for a screen reader and the browser tests; the title below says where you are */}
          <h1 className="sr-only">Time Log</h1>
          <h2 className="min-w-0 shrink truncate text-xl font-semibold">{title}</h2>
          <div className="ml-auto flex shrink-0 items-center">
            {/* a dot says nothing by itself: a tap says what it means, in the PC badge's words, and checks (findability, 2026-11-05) */}
            <SyncBadge
              compact
              status={sync.status}
              pending={sync.pendingCount}
              check={sync.check}
              nowMs={nowSec * 1000}
              onCheck={() => {
                const shown = describeBadge(sync.status, sync.pendingCount, sync.check, nowSec * 1000)
                if (shown) pushToast(`${shown.label}. ${shown.title}`)
                sync.checkNow()
              }}
            />
            {/* Reports has ⬇ where the Timer has ⊕, as Toggl's does [H25 help_28] */}
            {/* Reports keeps ⬇ inside Details too (6.1); ⊕ only on Timer and Calendar (6.6) */}
            {screen === "reports" ? (
              <button
                type="button"
                onClick={() => reportsDownload.current?.()}
                aria-label="Download this report"
                title="Download this report"
                className={cn(touchTarget, "rounded-md text-muted-foreground hover:bg-secondary/60")}
              >
                <IconExport className="size-5" />
              </button>
            ) : screen === "timer" || screen === "calendar" ? (
              <button
                type="button"
                onClick={() => openNew("manual")}
                aria-label="Add a past time entry"
                title="Add a past time entry"
                className={cn(touchTarget, "rounded-md text-muted-foreground hover:bg-secondary/60")}
              >
                <IconAdd className="size-5 rounded-full border-2 border-current p-0.5" />
              </button>
            ) : null}
            {/* the bell only once an alert has fired (D2, 6.6); the PC always shows it */}
            {state.alerts.length > 0 && <AlertsBell state={state} setState={setState} unread={lab.unreadAlerts} />}
            <button
              type="button"
              onClick={() => setMenuOpen(true)}
              aria-label="Settings and more"
              title="Projects, clients, tags, settings"
              className={cn(touchTarget, "rounded-md text-muted-foreground hover:bg-secondary/60")}
            >
              <IconSettings className="size-5" />
            </button>
          </div>
        </div>
        {screen === "timer" && (
          <div role="tablist" className="flex">
            {(
              [
                ["list", "List view"],
                ["pomodoro", "Pomodoro"],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={view === id}
                onClick={() => setView(id)}
                className={cn(
                  "-mb-px min-h-11 flex-1 border-b-2 text-sm",
                  view === id ? "border-primary font-medium text-foreground" : "border-transparent text-muted-foreground",
                )}
              >
                {label}
                {id === "pomodoro" && lab.pomodoro.phase !== "idle" && (
                  <span className="ml-1.5 text-xs tabular-nums text-muted-foreground">{formatClock(lab.pomodoro.secondsLeft)}</span>
                )}
              </button>
            ))}
          </div>
        )}
      </header>

      {sync.status === "signed-out" && <SignedOutBanner pending={sync.pendingCount} />}
      {sync.importOffer && (
        <div className="px-3 pt-3">
          <ImportOfferBanner offer={sync.importOffer} todayKey={dateKey(new Date(nowSec * 1000))} onUpload={sync.acceptImport} onDismiss={sync.declineImport} />
        </div>
      )}

      <ErrorBoundary label="this screen">
        <AfterCheckContext.Provider value={lab.afterCheck}>
          <main className="space-y-4 px-3 pt-3" style={{ paddingBottom: clearOfBar }}>
            {screen === "timer" && view === "list" && (
              <PhoneEntryList
                state={state}
                setState={setState}
                nowSec={nowSec}
                pushToast={pushToast}
                afterCheck={lab.afterCheck}
                onEditEntry={lab.openEntry}
                onGoToProject={lab.goToProject}
                selected={selected}
                onSelect={setSelected}
                onSeeInCalendar={(day) => {
                  setCalendarDay(day)
                  go("calendar")
                }}
              />
            )}
            {screen === "timer" && view === "pomodoro" && (
              <PomodoroPanel
                state={state}
                setState={setState}
                pomodoro={lab.pomodoro}
                running={running !== null}
                onStart={() => lab.startTracking()}
                requestNotificationPermission={lab.requestNotificationPermission}
              />
            )}
            {screen === "calendar" && (
              /* THE HOUR GRID ENDS ABOVE THE BAR. Its window is 70vh, sized for the
                 old 56px tab bar; under the bar and the tabs (116px) its last hour
                 was hidden and the page scrolled under a finger dragging a block.
                 The top of the window is below the header and the day controls,
                 about 14rem down. */
              <div
                
                style={{ "--phone-bar": barHeight !== null ? `${barHeight}px` : undefined } as React.CSSProperties}
              >
              <PhoneCalendar
                state={state}
                setState={setState}
                nowSec={nowSec}
                pushToast={pushToast}
                day={calendarDay ?? dateKey(new Date(nowSec * 1000))}
                onDay={(day) => {
                  setCalendarDay(day)
                  setBlockId(null)
                }}
                selectedId={blockId}
                onSelect={setBlockId}
                onCreated={(entry) => {
                  setBlockId(null)
                  nameFor.current = entry.id
                  held.current = entry
                  lab.openEntry(entry)
                }}
                onOpenIntegrations={() => {
                  setSettingsEntry((n) => ({ list: false, visit: n.visit + 1 }))
                  lab.setSettingsTab("integrations")
                  go("settings")
                }}
              />
              </div>
            )}
            {screen === "reports" && !reportsDetails && (
              <PhoneReports
                state={state}
                nowSec={nowSec}
                config={lab.reportConfig}
                downloadRef={reportsDownload}
                onDetails={(range, detailed) => {
                  // a bar or a project row opens Detailed on that day or project (6.2); "Details" keeps the tab
                  lab.setReportConfig((config) =>
                    config
                      ? {
                          ...config,
                          ...(detailed ? { tab: "detailed" as const } : {}),
                          filters: { ...config.filters, range, projectIds: detailed?.projectId ? [detailed.projectId] : detailed ? [] : config.filters.projectIds },
                        }
                      : config,
                  )
                  openDetails()
                }}
              />
            )}
            {/* "Details": today's full reports, every tab kept (D-PHONE-REPORTS) */}
            {screen === "reports" && reportsDetails && (
              <>
                <Button variant="ghost" size="sm" className="h-11 px-1" onClick={() => window.history.back()}>
                  ‹ Back to the short report
                </Button>
                <ReportsView
                  state={state}
                  setState={setState}
                  nowSec={nowSec}
                  config={lab.reportConfig}
                  setConfig={lab.setReportConfig}
                  pushToast={pushToast}
                  downloadRef={reportsDownload}
                />
              </>
            )}
            {screen === "projects" && (
              <ProjectsView
                state={state}
                setState={setState}
                nowSec={nowSec}
                pushToast={pushToast}
                focusProjectId={lab.focusProjectId}
                onFocusProject={lab.setFocusProjectId}
              />
            )}
            {screen === "manage" && (
              <ManageView state={state} setState={setState} nowSec={nowSec} pushToast={pushToast} tab={lab.manageTab} setTab={lab.setManageTab} />
            )}
            {screen === "settings" && (
              <SettingsView
                key={settingsEntry.visit}
                listFirst={settingsEntry.list}
                state={state}
                setState={setState}
                nowSec={nowSec}
                pushToast={pushToast}
                resetWorkspace={lab.resetWorkspace}
                replaceState={lab.replaceState}
                requestNotificationPermission={lab.requestNotificationPermission}
                tab={lab.settingsTab}
                setTab={lab.setSettingsTab}
                syncStatus={sync.status}
                onUploadEverything={sync.uploadEverything}
              />
            )}
          </main>
        </AfterCheckContext.Provider>
      </ErrorBoundary>

      {/* the bottom: favorites, the bar, the tabs — measured, so menus and toasts stay above it */}
      <div
        ref={bottomBlockRef}
        data-bottom-block
        className="fixed inset-x-0 bottom-0 z-[9500] border-t border-border bg-card/95 pb-[env(safe-area-inset-bottom)] backdrop-blur"
      >
        {lab.newBuild.ready && (
          <button type="button" onClick={lab.newBuild.reload} className="block min-h-9 w-full border-b border-border bg-primary/10 px-3 text-center text-xs">
            Updated · Tap to reload
          </button>
        )}
        {undo ? (
          <div data-testid="undo-bar" role="status" className="flex items-center gap-1 border-b border-border py-0.5 pl-3 text-sm">
            <span className="min-w-0 flex-1">{shortNames(undo.text)}</span>
            <Button
              size="sm"
              variant="ghost"
              className="h-11 px-3 font-semibold text-primary"
              onClick={() => {
                const run = undo.run
                setUndo(null)
                run()
              }}
            >
              <IconUndo className="size-4" /> Undo
            </Button>
            <button type="button" aria-label="Dismiss" onClick={() => setUndo(null)} className="flex size-11 shrink-0 items-center justify-center text-muted-foreground">
              <IconClose className="size-4" />
            </button>
          </div>
        ) : (
          newestToast && (
            <div
              data-testid="toast-bar"
              role="status"
              className={cn(
                "flex flex-wrap items-center gap-x-1 border-b border-border py-0.5 pl-3 text-sm",
                newestToast.tone === "error" && "bg-destructive/15",
              )}
            >
              <span className="min-w-0 flex-1 py-2">{shortNames(newestToast.text)}</span>
              <span className="ml-auto flex items-center">
                {newestToast.undo && (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-11 px-3 font-semibold text-primary"
                    onClick={() => {
                      newestToast.undo?.()
                      dismissToast(newestToast.id)
                    }}
                  >
                    {!newestToast.second && <IconUndo className="size-4" />} {shortNames(newestToast.undoLabel ?? "Undo")}
                  </Button>
                )}
                {newestToast.second && (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-11 px-3"
                    onClick={() => {
                      newestToast.second?.run()
                      dismissToast(newestToast.id)
                    }}
                  >
                    {newestToast.second.label}
                  </Button>
                )}
                <button type="button" aria-label="Dismiss" onClick={() => dismissToast(newestToast.id)} className="flex size-11 shrink-0 items-center justify-center text-muted-foreground">
                  <IconClose className="size-4" />
                </button>
              </span>
            </div>
          )
        )}
        {selected !== null && (
          <BulkBar
            state={state}
            setState={setState}
            pushToast={pushToast}
            selected={selected}
            onDone={() => setSelected(null)}
            onDelete={() => {
              const removed = deleteWithUndo(state, selected, setState, pushToast, offerUndo)
              setSelected(selected.filter((id) => !removed.includes(id)))
            }}
          />
        )}
        {screen === "timer" && view === "list" && selected === null && state.favorites.length > 0 && (
          <div className="px-3 pt-2">
            <FavoritesBar
              state={state}
              onStart={(draft) => lab.startTracking(draft)}
              onRemove={(id) => {
                const favorite = state.favorites.find((f) => f.id === id)
                if (!favorite) return
                setState((current) => toggleFavorite(current, favorite.draft, serverNowIso()))
                pushToast(`Removed “${favorite.draft.description.trim() || "(no description)"}” from favorites`, "info", () =>
                  setState((current) => toggleFavorite(current, favorite.draft, serverNowIso())),
                )
              }}
            />
          </div>
        )}
        {/* the words a Start the other device beat left waiting, one tap from Switch now (A5) */}
        {running && next !== "" && (
          <div className="flex flex-wrap items-center gap-2 border-b border-border px-3 py-2 text-sm">
            <span className="min-w-0 flex-1 truncate">
              Next: <strong>“{next}”</strong>
            </span>
            <Button size="sm" className="h-11" onClick={() => confirmMoment("switch", serverNowIso(), { ...lab.nextDraft, description: next })}>
              Switch now
            </Button>
            <Button size="sm" variant="outline" className="h-11" onClick={() => setMoment({ kind: "switch", openedAt: serverNowIso(), draft: lab.nextDraft })}>
              Switched at…
            </Button>
            <button type="button" aria-label="Forget the next entry" onClick={() => lab.setNextDraft(emptyDraft)} className={cn(touchTarget, "text-muted-foreground")}>
              <IconClose className="size-4" />
            </button>
          </div>
        )}
        {block ? (
          // a tapped block's panel takes the bar's place, as Toggl's does
          <BlockPanel
            entry={block}
            state={state}
            latestState={() => latestState.current}
            setState={setState}
            pushToast={pushToast}
            afterCheck={lab.afterCheck}
            onEdit={() => lab.openEntry(block)}
            onStop={lab.stopTracking}
            onClose={() => setBlockId(null)}
          />
        ) : (
        <div data-testid="run-bar">
          <RunBar
            state={state}
            running={running}
            nowSec={nowSec}
            draft={lab.draft}
            onOpenRunning={() => running && lab.openEntry(running)}
            onOpenNew={() => openNew("start")}
            onStart={() => lab.startTracking()}
            onStop={stopWithUndo}
          />
        </div>
        )}
        <nav aria-label="Sections" className="flex border-t border-border">
          {TABS.map((tab) => {
            const Icon = tab.icon
            const active = screen === tab.id || (!mainTab && fromTab.current === tab.id)
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => go(tab.id)}
                aria-current={screen === tab.id ? "page" : undefined}
                className={cn("flex min-h-11 flex-1 flex-col items-center gap-0.5 py-1.5 text-xs font-medium", active ? "text-primary" : "text-muted-foreground")}
              >
                <Icon className="size-5" />
                {tab.label}
              </button>
            )
          })}
        </nav>
      </div>

      <BottomSheet open={menuOpen} onClose={() => setMenuOpen(false)} title="Settings and more">
        {menuRows.map((row) => (
          <SheetRow key={row.label} icon={row.icon} onClick={row.run}>
            {row.label}
          </SheetRow>
        ))}
      </BottomSheet>

      {target && (
        <EntrySheet
          key={sheetKey(target)}
          target={target}
          state={state}
          setState={setState}
          latestState={() => latestState.current}
          nowSec={nowSec}
          pushToast={pushToast}
          afterCheck={lab.afterCheck}
          dirtyRef={dirty}
          focusName={target.mode === "edit" && nameFor.current === target.entryId}
          backedOut={backedOut !== null}
          onClose={closeSheet}
          onGoToProject={lab.goToProject}
          onKeepEditing={keepEditing}
          onMoment={(kind, draft) => {
            closeSheet()
            setMoment({ kind, openedAt: serverNowIso(), draft })
          }}
        />
      )}

      {moment && (
        <MomentDialog
          kind={moment.kind}
          state={state}
          openedAt={moment.openedAt}
          draft={moment.draft}
          onConfirm={(atIso, draft) => {
            setMoment(null)
            confirmMoment(moment.kind, atIso, draft)
          }}
          onClose={() => setMoment(null)}
        />
      )}
    </UndoContext.Provider>
  )
}

/** Select's bar: the old bulk bar's actions, above the timer bar where the thumb is */
function BulkBar({
  state,
  setState,
  pushToast,
  selected,
  onDone,
  onDelete,
}: {
  state: TimetrackState
  setState: SetState
  pushToast: PushToast
  selected: Id[]
  onDone: () => void
  onDelete: () => void
}) {
  const apply = (patch: Parameters<typeof bulkEditEntries>[2]) => {
    const now = serverNowIso()
    const preview = bulkEditEntries(state, selected, patch, now)
    if (preview.violations.length > 0) {
      pushToast(`${plural(preview.violations.length, "entry", "entries")} not changed: ${preview.violations[0].message}`, "error")
    }
    setState((current) => bulkEditEntries(current, selected, patch, now).state)
  }
  return (
    <div className="flex flex-wrap items-center gap-1 border-b border-border px-3 py-2 text-sm">
      <span className="font-medium">{selected.length} selected</span>
      <ProjectPicker state={state} projectId={null} taskId={null} compact onChange={(projectId, taskId) => apply({ projectId, taskId })} />
      <TagPicker state={state} tagIds={[]} onChange={(tagIds) => apply({ addTagIds: tagIds })} />
      <Button size="sm" variant="ghost" className="h-11" onClick={() => apply({ billable: true })}>
        Mark billable
      </Button>
      <Button size="sm" variant="ghost" className="h-11" onClick={() => apply({ billable: false })}>
        Mark non-billable
      </Button>
      <Button size="sm" variant="destructive" className="h-11" disabled={selected.length === 0} onClick={onDelete}>
        Delete
      </Button>
      <Button size="sm" variant="ghost" className="ml-auto h-11" onClick={onDone}>
        Done
      </Button>
    </div>
  )
}
