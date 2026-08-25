"use client"

/**
 * Shell for the time-tracking sandbox at /test/toggl.
 * Owns navigation, the shared entry draft, keyboard shortcuts, toasts,
 * the alert center, the idle prompt and the entry-detail modal.
 */

import { useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { SHORTCUTS } from "../config"
import {
  IconAlert,
  IconBell,
  IconBreak,
  IconCalendar,
  IconClose,
  IconProjects,
  IconReports,
  IconSettings,
  IconTeam,
  IconTimer,
  IconUndo,
} from "../icons"
import { useTimetrack } from "../hooks/useTimetrack"
import { defaultReportConfig, decodeReportConfig } from "../reportsService"
import { dateKey, formatClock, formatDuration } from "../timetrackFormatService"
import {
  draftFromStartLink,
  emptyDraft,
  markAlertsRead,
  startTimer,
  toggleFavorite,
} from "../timetrackService"
import type { EntryDraft, Id, ReportConfig, TimeEntry } from "../types"
import { CalendarView } from "./CalendarView"
import { EntryDetailModalBody, EntryList } from "./EntryList"
import { ManageView, type ManageTab } from "./ManageView"
import { ProjectsView } from "./ProjectsView"
import { ReportsView } from "./ReportsView"
import { SettingsView, type SettingsTab } from "./SettingsView"
import { FavoritesBar, RunningPill, TimerBar, type TimerMode } from "./TimerBar"
import { Dropdown, Modal, SectionCard, touchTarget } from "./primitives"

type Screen = "timer" | "calendar" | "reports" | "projects" | "manage" | "settings"

const NAV: { id: Screen; label: string; icon: typeof IconTimer }[] = [
  { id: "timer", label: "Timer", icon: IconTimer },
  { id: "calendar", label: "Calendar", icon: IconCalendar },
  { id: "reports", label: "Reports", icon: IconReports },
  { id: "projects", label: "Projects", icon: IconProjects },
  { id: "manage", label: "Manage", icon: IconTeam },
  { id: "settings", label: "Settings", icon: IconSettings },
]

export function TogglLab() {
  const controller = useTimetrack()
  const { state, setState, nowSec, running, runningSeconds, toasts, pushToast, dismissToast, idlePrompt, resolveIdle, pomodoro, actions, requestNotificationPermission } =
    controller

  const [screen, setScreen] = useState<Screen>("timer")
  const [manageTab, setManageTab] = useState<ManageTab>("clients")
  const [settingsTab, setSettingsTab] = useState<SettingsTab>("profile")
  const [draft, setDraft] = useState<EntryDraft>(emptyDraft)
  const [mode, setMode] = useState<TimerMode>("timer")
  const [shortcutsOpen, setShortcutsOpen] = useState(false)
  const [detailEntry, setDetailEntry] = useState<TimeEntry | null>(null)
  const [focusProjectId, setFocusProjectId] = useState<Id | null>(null)
  const [reportConfig, setReportConfig] = useState<ReportConfig | null>(null)

  // Mirror the running entry into the draft so the bar shows what is tracking
  useEffect(() => {
    if (!running) return
    setDraft({
      description: running.description,
      projectId: running.projectId,
      taskId: running.taskId,
      tagIds: running.tagIds,
      billable: running.billable,
    })
  }, [running?.id]) // deps intentionally narrow: see comment above

  // Report config needs the loaded state for its defaults
  useEffect(() => {
    if (!state || reportConfig) return
    const params = new URLSearchParams(window.location.search)
    const shared = params.get("report")
    const decoded = shared ? decodeReportConfig(shared) : null
    setReportConfig(
      decoded ?? defaultReportConfig(dateKey(new Date()), state.user.weekStart, state.workspace.rounding),
    )
    if (decoded) setScreen("reports")
  }, [state, reportConfig])

  // `?start=1&description=…` start links (Toggl's "Copy start link")
  useEffect(() => {
    if (!state) return
    const params = new URLSearchParams(window.location.search)
    if (params.get("start") !== "1") return
    const linkDraft = draftFromStartLink(state, params)
    setDraft(linkDraft)
    const started = startTimer(state, linkDraft, new Date().toISOString())
    if (started.violations.length > 0) pushToast(started.violations[0].message, "error")
    else setState(() => started.state)
    window.history.replaceState({}, "", window.location.pathname)
  }, [state !== null]) // deps intentionally narrow: see comment above

  const startTracking = useCallback(
    (nextDraft?: EntryDraft) => {
      const payload = nextDraft ?? draft
      if (nextDraft) setDraft(nextDraft)
      actions.start(payload)
    },
    [actions, draft],
  )

  // Keyboard shortcuts — Timer screen only, never while typing (Toggl's rule)
  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null
      const typing =
        target?.tagName === "INPUT" || target?.tagName === "TEXTAREA" || target?.tagName === "SELECT" || target?.isContentEditable
      if (event.metaKey || event.ctrlKey || event.altKey) return

      if (event.key === "?" && event.shiftKey) {
        event.preventDefault()
        setShortcutsOpen((open) => !open)
        return
      }
      if (typing || screen !== "timer" || !state) return

      const key = event.key.toLowerCase()
      if (key === "s") {
        event.preventDefault()
        actions.stop()
      } else if (key === "n") {
        event.preventDefault()
        setMode("timer")
        startTracking()
      } else if (key === "m") {
        event.preventDefault()
        setMode("manual")
      } else if (key === "c") {
        event.preventDefault()
        actions.continueLast()
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
  }, [actions, screen, state, startTracking])

  const unreadAlerts = useMemo(() => state?.alerts.filter((a) => !a.read) ?? [], [state?.alerts])

  if (!state || !reportConfig) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">
        Loading your time tracker…
      </div>
    )
  }

  return (
    // The theme's --input equals the card background, which makes bordered
    // fields invisible on cards; give every field in the sandbox real contrast
    <div className="min-h-screen bg-background [&_input[data-slot=input]]:border-border [&_input[data-slot=input]]:bg-background/60 [&_select]:bg-background/60">
      {/* header */}
      <header className="sticky top-0 z-[9500] border-b border-border bg-card/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center gap-2 px-3 py-1.5 sm:gap-3 sm:px-4 sm:py-2">
          <Link href="/test" className="-ml-1 flex h-9 shrink-0 items-center px-1 text-xs text-muted-foreground hover:text-foreground">
            ← <span className="hidden sm:inline">/test</span>
          </Link>
          <h1 className="truncate text-sm font-semibold">{state.workspace.name}</h1>
          <span className="hidden rounded bg-secondary px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-muted-foreground sm:inline">
            Toggl-style time tracker
          </span>

          <div className="ml-auto flex items-center gap-1 sm:gap-2">
            {pomodoro.phase !== "idle" && (
              <span className="hidden items-center gap-1 rounded-full border border-border px-2 py-1 text-xs sm:flex">
                {pomodoro.phase === "break" ? <IconBreak className="size-3.5" /> : <IconTimer className="size-3.5" />}
                {pomodoro.phase === "break" ? "Break" : "Focus"} {formatClock(pomodoro.secondsLeft)}
                {pomodoro.cycles > 0 && <span className="text-muted-foreground">· {pomodoro.cycles} done</span>}
              </span>
            )}
            {/* On a phone the timer card already shows this, so only surface it elsewhere */}
            <div className={cn(screen === "timer" && "hidden sm:block")}>
              <RunningPill state={state} nowSec={nowSec} onStop={actions.stop} />
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
                  {unreadAlerts.length > 0 && (
                    <span className="absolute -right-0.5 -top-0.5 flex size-4 items-center justify-center rounded-full bg-destructive text-[9px] text-white">
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

        <nav className="mx-auto hidden max-w-6xl gap-1 overflow-x-auto px-4 sm:flex">
          {NAV.map((item) => {
            const Icon = item.icon
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  setScreen(item.id)
                  if (item.id !== "projects") setFocusProjectId(null)
                }}
                className={cn(
                  "-mb-px flex items-center gap-1.5 whitespace-nowrap border-b-2 px-3 py-2 text-sm",
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
      </header>

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
              onStop={actions.stop}
              pushToast={pushToast}
            />
            <FavoritesBar
              state={state}
              onStart={(favoriteDraft) => startTracking(favoriteDraft)}
              onRemove={(id) => {
                const favorite = state.favorites.find((f) => f.id === id)
                if (favorite) setState((current) => toggleFavorite(current, favorite.draft, new Date().toISOString()))
              }}
            />
            <EntryList
              state={state}
              setState={setState}
              nowSec={nowSec}
              pushToast={pushToast}
              onEditEntry={setDetailEntry}
            />
          </>
        )}

        {screen === "calendar" && (
          <CalendarView
            state={state}
            setState={setState}
            nowSec={nowSec}
            pushToast={pushToast}
            onEditEntry={setDetailEntry}
            onOpenIntegrations={() => {
              setScreen("settings")
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
          />
        )}
      </main>

      {/* bottom navigation (phones) */}
      <nav
        className="fixed inset-x-0 bottom-0 z-[9500] flex border-t border-border bg-card/95 pb-[env(safe-area-inset-bottom)] backdrop-blur sm:hidden"
        aria-label="Sections"
      >
        {NAV.map((item) => {
          const Icon = item.icon
          const active = screen === item.id
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                setScreen(item.id)
                if (item.id !== "projects") setFocusProjectId(null)
              }}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex flex-1 flex-col items-center gap-0.5 py-2 text-[10px] font-medium",
                active ? "text-primary" : "text-muted-foreground",
              )}
            >
              <Icon className="size-5" />
              {item.label}
            </button>
          )
        })}
      </nav>

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
        <Modal title="Time entry details" onClose={() => setDetailEntry(null)}>
          <EntryDetailModalBody
            entry={state.entries.find((e) => e.id === detailEntry.id) ?? detailEntry}
            state={state}
            setState={setState}
            pushToast={pushToast}
          />
        </Modal>
      )}

      {/* idle prompt */}
      {idlePrompt && (
        <Modal title="You were away" onClose={() => resolveIdle("keep")}>
          <SectionCard>
            <p className="text-sm">
              The timer kept running while nothing happened for{" "}
              <strong>{formatDuration(idlePrompt.idleSeconds, state.user.durationFormat)}</strong>, since{" "}
              {new Date(idlePrompt.idleSinceIso).toLocaleTimeString()}.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Button size="sm" onClick={() => resolveIdle("keep")}>
                Keep the idle time
              </Button>
              <Button size="sm" variant="outline" onClick={() => resolveIdle("discard")}>
                <IconUndo className="size-4" /> Discard and keep tracking
              </Button>
              <Button size="sm" variant="destructive" onClick={() => resolveIdle("discard_and_stop")}>
                Discard and stop
              </Button>
            </div>
          </SectionCard>
        </Modal>
      )}

      {/* toasts */}
      <div className="pointer-events-none fixed bottom-[calc(4.5rem+env(safe-area-inset-bottom))] left-1/2 z-[9700] flex w-full max-w-md -translate-x-1/2 flex-col gap-2 px-3 sm:bottom-4 sm:px-4">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={cn(
              "pointer-events-auto flex items-center gap-3 rounded-lg border px-3 py-2 text-sm shadow-xl",
              toast.tone === "error" ? "border-destructive/50 bg-destructive/15" : "border-border bg-card",
            )}
          >
            <span className="flex-1">{toast.text}</span>
            {toast.undo && (
              <Button
                size="sm"
                variant="ghost"
                className="h-7"
                onClick={() => {
                  toast.undo?.()
                  dismissToast(toast.id)
                }}
              >
                <IconUndo className="size-3.5" /> Undo
              </Button>
            )}
            <button type="button" onClick={() => dismissToast(toast.id)} className="text-muted-foreground hover:text-foreground">
              <IconClose className="size-3.5" />
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
