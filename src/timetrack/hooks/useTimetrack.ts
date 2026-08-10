"use client"

/**
 * Time-tracking sandbox state: localStorage persistence, the one-second clock,
 * and the background behaviors Toggl's desktop app provides — Pomodoro,
 * idle detection, tracking reminders, project alerts and the (browser-scoped)
 * timeline recorder.
 *
 * All domain logic lives in the services; this hook only wires them to React.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react"

import { STATE_VERSION, STORAGE_KEY } from "../config"
import { createSeedState } from "../data/seed"
import { forgottenTimer, refreshDemoHistory, type DemoRefreshResult } from "../demoDataService"
import {
  dateKey,
  epochSeconds,
} from "../timetrackFormatService"
import {
  continueEntry,
  entrySeconds,
  evaluateAlerts,
  isRunning,
  runningEntry,
  startTimer,
  stopTimer,
  updateEntry,
} from "../timetrackService"
import type { EntryDraft, TimeEntry, TimetrackState } from "../types"

export interface ToastMessage {
  id: number
  text: string
  tone: "info" | "error"
  undo?: () => void
}

export interface IdlePrompt {
  entryId: number
  /** When interaction stopped */
  idleSinceIso: string
  idleSeconds: number
}

export type PomodoroPhase = "idle" | "work" | "break"

function loadState(nowIso: string): { state: TimetrackState; refreshed: DemoRefreshResult | null } {
  if (typeof window === "undefined") return { state: createSeedState(nowIso), refreshed: null }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as TimetrackState
      const usable =
        parsed && parsed.workspace && Array.isArray(parsed.entries) && parsed.version === STATE_VERSION
      if (usable) {
        // Re-date the demo history so the sandbox never opens on stale days
        const refreshed = refreshDemoHistory(parsed, nowIso)
        return { state: refreshed.state, refreshed }
      }
    }
  } catch {
    // Corrupt payload — fall through to a fresh seed rather than crashing
  }
  return { state: createSeedState(nowIso), refreshed: null }
}

export function useTimetrack() {
  const [state, setStateRaw] = useState<TimetrackState | null>(null)
  const [nowSec, setNowSec] = useState(() => Math.floor(Date.now() / 1000))
  const [toasts, setToasts] = useState<ToastMessage[]>([])
  const [idlePrompt, setIdlePrompt] = useState<IdlePrompt | null>(null)
  const [pomodoroPhase, setPomodoroPhase] = useState<PomodoroPhase>("idle")
  const [pomodoroEndsAt, setPomodoroEndsAt] = useState<number | null>(null)
  const [pomodoroCycles, setPomodoroCycles] = useState(0)

  const toastId = useRef(1)
  const lastInteraction = useRef(Date.now())
  const lastReminder = useRef(0)
  const timelineStart = useRef<number | null>(null)
  const pomodoroLastEntry = useRef<number | null>(null)
  const pendingLoadNotice = useRef<string | null>(null)
  const forgottenWarned = useRef(false)

  // --- load once on the client ---------------------------------------------
  useEffect(() => {
    const loaded = loadState(new Date().toISOString())
    setStateRaw(loaded.state)
    if (loaded.refreshed && loaded.refreshed.shifted > 0) {
      pendingLoadNotice.current = `Demo history re-dated to today (${loaded.refreshed.shifted} demo entries moved ${loaded.refreshed.days} day${loaded.refreshed.days === 1 ? "" : "s"} forward). Your own entries were not touched.`
    }
  }, [])

  // --- persist on every change --------------------------------------------
  useEffect(() => {
    if (!state) return
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
    } catch {
      // Quota exceeded — the sandbox keeps working in memory
    }
  }, [state])

  // --- one-second clock ---------------------------------------------------
  useEffect(() => {
    const timer = window.setInterval(() => setNowSec(Math.floor(Date.now() / 1000)), 1000)
    return () => window.clearInterval(timer)
  }, [])

  const setState = useCallback((updater: (current: TimetrackState) => TimetrackState) => {
    setStateRaw((current) => (current ? updater(current) : current))
  }, [])

  const pushToast = useCallback((text: string, tone: "info" | "error" = "info", undo?: () => void) => {
    const id = toastId.current++
    setToasts((current) => [...current, { id, text, tone, undo }])
    window.setTimeout(() => setToasts((current) => current.filter((t) => t.id !== id)), 7000)
  }, [])

  const dismissToast = useCallback((id: number) => {
    setToasts((current) => current.filter((t) => t.id !== id))
  }, [])

  // Report the demo re-dating once the toast queue is available
  useEffect(() => {
    if (!state || !pendingLoadNotice.current) return
    pushToast(pendingLoadNotice.current)
    pendingLoadNotice.current = null
  }, [state, pushToast])

  const notify = useCallback((title: string, body: string) => {
    pushToast(`${title} — ${body}`)
    if (typeof Notification === "undefined" || Notification.permission !== "granted") return
    try {
      new Notification(title, { body })
    } catch {
      // Notification constructor is unavailable in some embedded contexts
    }
  }, [pushToast])

  const running = state ? runningEntry(state) : null
  const runningSeconds = running ? entrySeconds(running, nowSec) : 0

  // --- document title mirrors the running timer, like Toggl ---------------
  useEffect(() => {
    if (typeof document === "undefined") return
    const base = "Time tracker · /test/toggl"
    if (!running) {
      document.title = base
      return
    }
    const h = Math.floor(runningSeconds / 3600)
    const m = Math.floor((runningSeconds % 3600) / 60)
    const s = runningSeconds % 60
    const clock = `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`
    document.title = `${clock} · ${running.description || "(no description)"}`
    return () => {
      document.title = base
    }
  }, [running, runningSeconds])

  // --- idle detection ------------------------------------------------------
  useEffect(() => {
    const mark = () => {
      lastInteraction.current = Date.now()
    }
    const events = ["mousemove", "mousedown", "keydown", "wheel", "touchstart"]
    for (const name of events) window.addEventListener(name, mark, { passive: true })
    return () => {
      for (const name of events) window.removeEventListener(name, mark)
    }
  }, [])

  useEffect(() => {
    if (!state?.idle.enabled || !running || idlePrompt) return
    const idleMs = Date.now() - lastInteraction.current
    if (idleMs < state.idle.minutes * 60_000) return
    setIdlePrompt({
      entryId: running.id,
      idleSinceIso: new Date(lastInteraction.current).toISOString(),
      idleSeconds: Math.floor(idleMs / 1000),
    })
  }, [nowSec, state?.idle.enabled, state?.idle.minutes, running, idlePrompt, state])

  const resolveIdle = useCallback(
    (action: "keep" | "discard" | "discard_and_stop") => {
      const prompt = idlePrompt
      if (!prompt) return
      lastInteraction.current = Date.now()
      setIdlePrompt(null)
      if (action === "keep") return

      const nowIso = new Date().toISOString()
      setState((current) => {
        const entry = current.entries.find((e) => e.id === prompt.entryId)
        if (!entry) return current
        // Trim the idle tail off the entry, then either keep tracking or stop
        const trimmed = updateEntry(current, entry.id, { stop: prompt.idleSinceIso }, nowIso).state
        if (action === "discard_and_stop") return trimmed
        const restarted = startTimer(
          trimmed,
          {
            description: entry.description,
            projectId: entry.projectId,
            taskId: entry.taskId,
            tagIds: entry.tagIds,
            billable: entry.billable,
          },
          nowIso,
        )
        return restarted.state
      })
      pushToast(action === "discard" ? "Idle time discarded, timer restarted" : "Idle time discarded, timer stopped")
    },
    [idlePrompt, pushToast, setState],
  )

  // --- pomodoro -----------------------------------------------------------
  useEffect(() => {
    if (!state?.pomodoro.enabled) {
      setPomodoroPhase("idle")
      setPomodoroEndsAt(null)
      return
    }
    if (running && pomodoroPhase === "idle") {
      setPomodoroPhase("work")
      setPomodoroEndsAt(Date.now() + state.pomodoro.workMinutes * 60_000)
    }
    if (!running && pomodoroPhase === "work") {
      setPomodoroPhase("idle")
      setPomodoroEndsAt(null)
    }
  }, [running, state?.pomodoro.enabled, state?.pomodoro.workMinutes, pomodoroPhase, state])

  useEffect(() => {
    if (!state?.pomodoro.enabled || pomodoroEndsAt === null) return
    if (Date.now() < pomodoroEndsAt) return

    const nowIso = new Date().toISOString()
    if (pomodoroPhase === "work") {
      const lastId = running?.id ?? null
      setState((current) => stopTimer(current, nowIso).state)
      setPomodoroCycles((c) => c + 1)
      setPomodoroPhase("break")
      setPomodoroEndsAt(Date.now() + state.pomodoro.breakMinutes * 60_000)
      if (state.pomodoro.notify) notify("Pomodoro complete", `Timer stopped. Take ${state.pomodoro.breakMinutes} minutes.`)
      pomodoroLastEntry.current = lastId
      return
    }

    if (pomodoroPhase === "break") {
      setPomodoroPhase("idle")
      setPomodoroEndsAt(null)
      if (state.pomodoro.autoContinue && pomodoroLastEntry.current !== null) {
        const lastId = pomodoroLastEntry.current
        setState((current) => continueEntry(current, lastId, nowIso).state)
        if (state.pomodoro.notify) notify("Break over", "Continued your last time entry.")
      } else if (state.pomodoro.notify) {
        notify("Break over", "Ready when you are.")
      }
    }
  }, [nowSec, pomodoroEndsAt, pomodoroPhase, running, state, notify, setState])

  // --- tracking reminders -------------------------------------------------
  useEffect(() => {
    if (!state?.reminders.enabled || running) return
    const now = new Date()
    if (!state.reminders.days.includes(now.getDay())) return
    if (now.getHours() < state.reminders.fromHour || now.getHours() >= state.reminders.toHour) return
    const gap = state.reminders.everyMinutes * 60_000
    if (Date.now() - lastReminder.current < gap) return
    lastReminder.current = Date.now()
    notify("Nothing is tracking", "Start a timer to keep your day accurate.")
  }, [nowSec, running, state, notify])

  // --- a timer left running for half a day is almost certainly forgotten ---
  useEffect(() => {
    if (!state || forgottenWarned.current) return
    const forgotten = forgottenTimer(state, nowSec)
    if (!forgotten) return
    forgottenWarned.current = true
    pushToast(
      `"${forgotten.entry.description || "Untitled"}" has been running for ${Math.round(forgotten.hours)} hours — stop it if you forgot it.`,
      "error",
    )
  }, [state, nowSec, pushToast])

  // --- project alerts -----------------------------------------------------
  const entryCount = state?.entries.length ?? 0
  useEffect(() => {
    if (!state) return
    const nowIso = new Date().toISOString()
    setState((current) => evaluateAlerts(current, dateKey(nowIso), nowIso))
    // Re-evaluated when entries change or the running timer ticks a minute on
  }, [entryCount, Math.floor(nowSec / 60), setState]) // deps intentionally narrow: see comment above

  // --- timeline recorder (browser tab only) -------------------------------
  useEffect(() => {
    if (!state?.user.showTimelineRecorder) {
      timelineStart.current = null
      return
    }
    if (timelineStart.current === null) timelineStart.current = Date.now()

    const flush = () => {
      const startedAt = timelineStart.current
      timelineStart.current = null
      if (startedAt === null) return
      const seconds = Math.floor((Date.now() - startedAt) / 1000)
      if (seconds < 30) return
      setState((current) => ({
        ...current,
        timeline: [
          {
            id: current.nextId,
            start: new Date(startedAt).toISOString(),
            end: new Date().toISOString(),
            label: document.title.split(" · ").pop() ?? "Time tracker",
            converted: false,
          },
          ...current.timeline,
        ].slice(0, 100),
        nextId: current.nextId + 1,
      }))
    }

    const onVisibility = () => {
      if (document.visibilityState === "hidden") flush()
      else timelineStart.current = Date.now()
    }
    document.addEventListener("visibilitychange", onVisibility)
    window.addEventListener("beforeunload", flush)
    return () => {
      document.removeEventListener("visibilitychange", onVisibility)
      window.removeEventListener("beforeunload", flush)
      flush()
    }
  }, [state?.user.showTimelineRecorder, setState])

  // --- convenience actions -------------------------------------------------
  const actions = useMemo(
    () => ({
      start(draft: EntryDraft) {
        const nowIso = new Date().toISOString()
        setState((current) => {
          const result = startTimer(current, draft, nowIso)
          if (result.violations.length > 0) {
            pushToast(result.violations[0].message, "error")
            return current
          }
          return result.state
        })
      },
      stop() {
        const nowIso = new Date().toISOString()
        setState((current) => stopTimer(current, nowIso).state)
      },
      continueLast() {
        const nowIso = new Date().toISOString()
        setState((current) => {
          const nowEpoch = epochSeconds(nowIso)
          const stopped = current.entries
            .filter((e) => !isRunning(e) && !e.serverDeletedAt)
            .sort((a, b) => epochSeconds(b.start) - epochSeconds(a.start))
          // Manual mode can create entries dated in the future; "continue last"
          // means the most recent entry that has actually started
          const last = stopped.find((e) => epochSeconds(e.start) <= nowEpoch) ?? stopped[0]
          if (!last) return current
          const result = continueEntry(current, last.id, nowIso)
          if (result.violations.length > 0) {
            pushToast(result.violations[0].message, "error")
            return current
          }
          return result.state
        })
      },
      resetSandbox() {
        const nowIso = new Date().toISOString()
        setStateRaw(createSeedState(nowIso))
        pushToast("Sandbox reset to the seeded demo workspace")
      },
      replaceState(next: TimetrackState) {
        setStateRaw(next)
      },
    }),
    [pushToast, setState],
  )

  const requestNotificationPermission = useCallback(async () => {
    if (typeof Notification === "undefined") return false
    if (Notification.permission === "granted") return true
    const result = await Notification.requestPermission()
    return result === "granted"
  }, [])

  return {
    state,
    setState,
    nowSec,
    running,
    runningSeconds,
    toasts,
    pushToast,
    dismissToast,
    idlePrompt,
    resolveIdle,
    pomodoro: {
      phase: pomodoroPhase,
      endsAt: pomodoroEndsAt,
      cycles: pomodoroCycles,
      secondsLeft: pomodoroEndsAt ? Math.max(0, Math.round((pomodoroEndsAt - nowSec * 1000) / 1000)) : 0,
    },
    actions,
    requestNotificationPermission,
  }
}

export type TimetrackController = ReturnType<typeof useTimetrack>

/** Latest stopped entries, newest first — used by "continue" affordances */
export function recentEntries(entries: TimeEntry[], limit = 10): TimeEntry[] {
  return entries
    .filter((e) => !isRunning(e))
    .sort((a, b) => epochSeconds(b.start) - epochSeconds(a.start))
    .slice(0, limit)
}
