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

import { DEFAULT_IDLE, LEGACY_IDLE_DEFAULT, STATE_VERSION, STORAGE_KEY } from "../config"
import { createEmptyWorkspace } from "../data/emptyWorkspace"
import { removeDemoData } from "../demoDataService"
import { dateKey, epochSeconds, formatIdleSpan } from "../timetrackFormatService"
import {
  continueEntry,
  entrySeconds,
  forgottenTimer,
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
  /** What the timer was tracking, so the prompt can name it */
  description: string
  /** When interaction stopped */
  idleSinceIso: string
  idleSeconds: number
}

export type PomodoroPhase = "idle" | "work" | "break"

interface LoadResult {
  state: TimetrackState
  /** Set when saved data was discarded, so the user is told rather than silently reset */
  discarded: string | null
  /** Sample rows this page used to seed, cleaned out of an existing browser */
  cleanedDemoEntries: number
  /** True when the old always-on idle default was switched off */
  idleDefaultChanged?: boolean
}

function loadState(nowIso: string): LoadResult {
  if (typeof window === "undefined") {
    return { state: createEmptyWorkspace(nowIso), discarded: null, cleanedDemoEntries: 0 }
  }

  let raw: string | null = null
  try {
    raw = window.localStorage.getItem(STORAGE_KEY)
  } catch {
    return {
      state: createEmptyWorkspace(nowIso),
      discarded: "This browser blocked local storage, so nothing you do here will be saved.",
      cleanedDemoEntries: 0,
    }
  }
  if (!raw) return { state: createEmptyWorkspace(nowIso), discarded: null, cleanedDemoEntries: 0 }

  let parsed: TimetrackState | null = null
  try {
    parsed = JSON.parse(raw) as TimetrackState
  } catch {
    return {
      state: createEmptyWorkspace(nowIso),
      discarded: "Saved data could not be read, so this workspace was started fresh.",
      cleanedDemoEntries: 0,
    }
  }

  if (!parsed?.workspace || !Array.isArray(parsed.entries)) {
    return {
      state: createEmptyWorkspace(nowIso),
      discarded: "Saved data was incomplete, so this workspace was started fresh.",
      cleanedDemoEntries: 0,
    }
  }
  if (parsed.version !== STATE_VERSION) {
    return {
      state: createEmptyWorkspace(nowIso),
      discarded: `Saved data came from an older version of this page (v${String(parsed.version)}), so this workspace was started fresh.`,
      cleanedDemoEntries: 0,
    }
  }

  // This page used to seed sample entries. Strip any that are still stored,
  // keeping everything the user created.
  const cleaned = removeDemoData(parsed)

  // Idle detection used to be on with a 5-minute threshold, which fired at
  // anyone running a timer while working in another app. Move that default off.
  const onLegacyIdleDefault =
    cleaned.state.idle.enabled === LEGACY_IDLE_DEFAULT.enabled &&
    cleaned.state.idle.minutes === LEGACY_IDLE_DEFAULT.minutes
  const state = onLegacyIdleDefault
    ? { ...cleaned.state, idle: { ...cleaned.state.idle, ...DEFAULT_IDLE } }
    : cleaned.state

  return {
    state,
    discarded: null,
    cleanedDemoEntries: cleaned.removedEntries,
    idleDefaultChanged: onLegacyIdleDefault,
  }
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
  const pendingLoadNotice = useRef<{ text: string; tone: "info" | "error" } | null>(null)
  const forgottenWarned = useRef(false)
  const saveFailed = useRef(false)

  // --- load once on the client ---------------------------------------------
  useEffect(() => {
    const loaded = loadState(new Date().toISOString())
    setStateRaw(loaded.state)
    if (loaded.discarded) {
      pendingLoadNotice.current = { text: loaded.discarded, tone: "error" }
    } else if (loaded.idleDefaultChanged) {
      pendingLoadNotice.current = {
        text: "Idle detection is now off by default — it could not tell working in another app from being away. Turn it back on in Settings → Automation.",
        tone: "info",
      }
    } else if (loaded.cleanedDemoEntries > 0) {
      pendingLoadNotice.current = {
        text: `Removed ${loaded.cleanedDemoEntries} sample entries this page used to ship with. Your own entries are untouched.`,
        tone: "info",
      }
    }
  }, [])

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

  // --- persist on every change --------------------------------------------
  useEffect(() => {
    if (!state) return
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
      saveFailed.current = false
    } catch {
      // Losing writes silently would look like the page is saving when it is not.
      // Warn once per failure streak rather than on every keystroke.
      if (!saveFailed.current) {
        saveFailed.current = true
        pushToast(
          "Could not save to this browser (storage is full or blocked). Your changes are only in memory now — export a backup from Settings → Data.",
          "error",
        )
      }
    }
  }, [state, pushToast])

  // Report the demo re-dating once the toast queue is available
  useEffect(() => {
    if (!state || !pendingLoadNotice.current) return
    pushToast(pendingLoadNotice.current.text, pendingLoadNotice.current.tone)
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
    // Coming back to the tab is activity: the clock restarts rather than
    // counting the whole time you spent in another app as idle
    document.addEventListener("visibilitychange", mark)
    window.addEventListener("focus", mark)
    return () => {
      for (const name of events) window.removeEventListener(name, mark)
      document.removeEventListener("visibilitychange", mark)
      window.removeEventListener("focus", mark)
    }
  }, [])

  useEffect(() => {
    if (!state?.idle.enabled || !running || idlePrompt) return
    // Only meaningful while this page is the thing you are looking at. Working
    // in another window is not idleness, and this page cannot see it.
    if (document.visibilityState !== "visible" || !document.hasFocus()) return
    const idleMs = Date.now() - lastInteraction.current
    if (idleMs < state.idle.minutes * 60_000) return
    setIdlePrompt({
      entryId: running.id,
      description: running.description,
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
      const span = formatIdleSpan(prompt.idleSeconds)
      pushToast(
        action === "discard"
          ? `Dropped ${span} and started a fresh entry`
          : `Dropped ${span} and stopped the timer`,
      )
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
    const what = forgotten.entry.description.trim()
    pushToast(
      `${what ? `“${what}”` : "A timer"} has been running for ${Math.round(forgotten.hours)} hours. Stop it if you forgot about it.`,
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
        if (!state) return
        const result = startTimer(state, draft, new Date().toISOString())
        if (result.violations.length > 0) {
          pushToast(result.violations[0].message, "error")
          return
        }
        setState(() => result.state)
      },
      stop() {
        const nowIso = new Date().toISOString()
        setState((current) => stopTimer(current, nowIso).state)
      },
      continueLast() {
        if (!state) return
        const nowIso = new Date().toISOString()
        const nowEpoch = epochSeconds(nowIso)
        const stopped = state.entries
          .filter((e) => !isRunning(e) && !e.serverDeletedAt)
          .sort((a, b) => epochSeconds(b.start) - epochSeconds(a.start))
        // Manual mode can create entries dated in the future; "continue last"
        // means the most recent entry that has actually started
        const last = stopped.find((e) => epochSeconds(e.start) <= nowEpoch) ?? stopped[0]
        if (!last) return
        const result = continueEntry(state, last.id, nowIso)
        if (result.violations.length > 0) {
          pushToast(result.violations[0].message, "error")
          return
        }
        setState(() => result.state)
      },
      resetWorkspace() {
        setStateRaw(createEmptyWorkspace(new Date().toISOString()))
        pushToast("Workspace cleared")
      },
      replaceState(next: TimetrackState) {
        setStateRaw(next)
      },
    }),
    [pushToast, setState, state],
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
