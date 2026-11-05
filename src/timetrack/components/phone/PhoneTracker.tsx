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
import type { PushToast } from "../../hooks/useTimetrack"
import type { useTimetrackSync } from "../../hooks/useTimetrackSync"
import {
  IconAdd,
  IconCalendar,
  IconClient,
  IconClose,
  IconImport,
  IconProjects,
  IconReports,
  IconSettings,
  IconTag,
  IconTimer,
} from "../../icons"
import { serverNowIso } from "../../serverClock"
import { dateKey, formatClock, plural } from "../../timetrackFormatService"
import { bulkEditEntries, emptyDraft, toggleFavorite } from "../../timetrackService"
import type { Section } from "../../trackerAddressService"
import type { EntryDraft, Id, AlertEvent, ReportConfig, TimeEntry, TimetrackState } from "../../types"
import { AfterCheckContext, type AfterCheck } from "../afterCheck"
import { AlertsBell } from "../AlertsBell"
import { SignedOutBanner } from "../SignedOutBanner"
import { useMomentActions } from "../useMomentActions"
import { CalendarView } from "../CalendarView"
import { ImportOfferBanner } from "../ImportOfferBanner"
import { ManageView, type ManageTab } from "../ManageView"
import { MomentDialog, type MomentKind } from "../MomentPicker"
import { ProjectPicker, TagPicker } from "../pickers"
import { touchTarget } from "../primitives"
import { ProjectsView } from "../ProjectsView"
import { ReportsView } from "../ReportsView"
import { SettingsView, type SettingsTab } from "../SettingsView"
import { SyncBadge } from "../SyncBadge"
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
}

const TABS: { id: Section; label: string; icon: typeof IconTimer }[] = [
  { id: "timer", label: "Timer", icon: IconTimer },
  { id: "calendar", label: "Calendar", icon: IconCalendar },
  { id: "reports", label: "Reports", icon: IconReports },
]

function titleOf(screen: Section, manageTab: ManageTab, settingsTab: SettingsTab): string {
  if (screen === "manage") return manageTab === "tags" ? "Tags" : manageTab === "team" ? "Team" : "Clients"
  if (screen === "settings") return settingsTab === "data" ? "Import and export" : "Settings"
  return { timer: "Timer", calendar: "Calendar", reports: "Reports", projects: "Projects" }[screen]
}

/** A history step this shell writes for a new entry's sheet, the same shape as `TogglLab`'s, so Back closes it */
const SHEET_STEP = { timetrack: "sheet" as const }
const isSheetStep = (state: unknown) => (state as { timetrack?: string } | null)?.timetrack === "sheet"

export function PhoneTracker({ lab }: { lab: PhoneLab }) {
  const { state, setState, nowSec, running, pushToast, sync, screen } = lab
  const [view, setView] = useState<"list" | "pomodoro">("list")
  const [menuOpen, setMenuOpen] = useState(false)
  const [selected, setSelected] = useState<Id[] | null>(null)

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
  const go = (section: Section) => {
    setMenuOpen(false)
    if (section !== "projects") lab.setFocusProjectId(null)
    lab.goTo(section)
  }
  const menuRows: { label: string; icon: typeof IconTimer; run: () => void }[] = [
    { label: "Projects", icon: IconProjects, run: () => go("projects") },
    { label: "Clients", icon: IconClient, run: () => (lab.setManageTab("clients"), go("manage")) },
    { label: "Tags", icon: IconTag, run: () => (lab.setManageTab("tags"), go("manage")) },
    { label: "Settings", icon: IconSettings, run: () => (lab.setSettingsTab("profile"), go("settings")) },
    { label: "Import and export", icon: IconImport, run: () => (lab.setSettingsTab("data"), go("settings")) },
  ]

  const next = lab.nextDraft.description.trim()

  return (
    <>
      <header className="sticky top-0 z-[9500] border-b border-border bg-card/95 backdrop-blur">
        {/* ONE ROW, ALWAYS. The sync badge keeps its words while it saves or is
            offline ("Saving 1…"); a row that wrapped then grew by a line and
            moved everything under it — a finger holding the calendar landed
            40px off, found by the touch test. The back word and the title give
            way instead, the back word first. */}
        <div className="flex items-center gap-x-1 px-3 pt-1.5">
          {/* the way out: see `BACK_LINK_CLASS`; small, left of the title (D-PHONE-SHELL) */}
          <Link href={lab.backHref} onClick={lab.goBack} className={cn(BACK_LINK_CLASS, "min-w-0 shrink-[3]")}>
            <span className="shrink-0">←</span>
            <span className="max-w-[96px] truncate">{lab.backText}</span>
          </Link>
          {/* the page's one heading, for a screen reader and the browser tests; the title below says where you are */}
          <h1 className="sr-only">Time</h1>
          <h2 className="min-w-0 shrink truncate text-xl font-semibold">{title}</h2>
          <div className="ml-auto flex shrink-0 items-center">
            <SyncBadge status={sync.status} pending={sync.pendingCount} check={sync.check} nowMs={nowSec * 1000} onCheck={sync.checkNow} />
            <button
              type="button"
              onClick={() => openNew("manual")}
              aria-label="Add a past time entry"
              title="Add a past time entry"
              className={cn(touchTarget, "rounded-md text-muted-foreground hover:bg-secondary/60")}
            >
              <IconAdd className="size-5 rounded-full border-2 border-current p-0.5" />
            </button>
            <AlertsBell state={state} setState={setState} unread={lab.unreadAlerts} />
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
          <main className="space-y-4 px-3 pt-3" style={{ paddingBottom: "calc(var(--panel-bottom-inset, 9rem) + 1rem)" }}>
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
              <div className="[&_[data-calendar-scroll]]:max-h-[calc(100dvh-var(--panel-bottom-inset,7rem)-14rem)]">
              <CalendarView
                state={state}
                setState={setState}
                nowSec={nowSec}
                pushToast={pushToast}
                onEditEntry={lab.openEntry}
                onOpenIntegrations={() => {
                  lab.setSettingsTab("integrations")
                  go("settings")
                }}
              />
              </div>
            )}
            {screen === "reports" && (
              <ReportsView state={state} setState={setState} nowSec={nowSec} config={lab.reportConfig} setConfig={lab.setReportConfig} pushToast={pushToast} />
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
      <div ref={lab.bottomBarRef} className="fixed inset-x-0 bottom-0 z-[9500] border-t border-border bg-card/95 pb-[env(safe-area-inset-bottom)] backdrop-blur">
        {selected !== null && (
          <BulkBar
            state={state}
            setState={setState}
            pushToast={pushToast}
            selected={selected}
            onDone={() => setSelected(null)}
            onDelete={() => {
              const removed = deleteWithUndo(state, selected, setState, pushToast)
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
        <div data-testid="run-bar">
          <RunBar
            state={state}
            running={running}
            nowSec={nowSec}
            draft={lab.draft}
            onOpenRunning={() => running && lab.openEntry(running)}
            onOpenNew={() => openNew("start")}
            onStart={() => lab.startTracking()}
            onStop={lab.stopTracking}
          />
        </div>
        <nav aria-label="Sections" className="flex border-t border-border">
          {TABS.map((tab) => {
            const Icon = tab.icon
            const active = screen === tab.id
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => go(tab.id)}
                aria-current={active ? "page" : undefined}
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
          nowSec={nowSec}
          pushToast={pushToast}
          afterCheck={lab.afterCheck}
          dirtyRef={dirty}
          backedOut={backedOut !== null}
          onClose={closeSheet}
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
    </>
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
