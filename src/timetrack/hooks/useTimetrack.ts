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

import { reportError } from "@/src/shared/errorReportService"

import { serverNow, serverNowIso, serverOffset } from "../serverClock"
import { STATE_VERSION, STORAGE_KEY, WORKSPACE_SIZE_TRIPWIRE } from "../config"
import { readBackgroundMemory, rememberBackground } from "./backgroundMemory"
import { newId } from "../idService"
import { migrateStateToV3, moveLegacyIdleDefault } from "../stateMigrationService"
import { createEmptyWorkspace } from "../data/emptyWorkspace"
import { removeDemoData } from "../demoDataService"
import { mergeTabStates } from "../tabMergeService"
import { dateKey, epochSeconds, formatIdleSpan, hourIsInWindow, plural } from "../timetrackFormatService"
import {
  continueEntry,
  entrySeconds,
  forgottenTimer,
  evaluateAlerts,
  isRunning,
  runningEntry,
  startTimer,
  stopTimer,
  undoDisplacement,
  updateEntry,
} from "../timetrackService"
import type { EntryDraft, Id, TimeEntry, TimetrackState } from "../types"

/** A second button on a toast, for a question with two answers */
export interface ToastChoice {
  label: string
  run: () => void
}

/**
 * What every screen is handed to say something; `undoLabel` replaces "Undo" on
 * the button, and `second` adds another one ("Use 21:00" / "Keep 23 hours").
 */
export type PushToast = (
  text: string,
  tone?: "info" | "error",
  undo?: () => void,
  undoLabel?: string,
  second?: ToastChoice,
) => void

export interface ToastMessage {
  id: number
  text: string
  tone: "info" | "error"
  undo?: () => void
  /** what the undo button says, when undoing is not quite what it does */
  undoLabel?: string
  second?: ToastChoice
}

/** how long a toast stays; one that asks a question waits longer for the answer */
const TOAST_MS = 7000
const QUESTION_MS = 15000

export interface IdlePrompt {
  entryId: Id
  /** What the timer was tracking, so the prompt can name it */
  description: string
  /** When interaction stopped */
  idleSinceIso: string
  idleSeconds: number
}

export type PomodoroPhase = "idle" | "work" | "break"

/**
 * How often the clock ticks with no timer running. Fast enough that a minute
 * boundary — which is what alerts and reminders turn on — is never more than
 * ten seconds late, and slow enough to stop being a re-render loop.
 */
const IDLE_TICK_MS = 10_000

interface LoadResult {
  state: TimetrackState
  /** Set when saved data was discarded, so the user is told rather than silently reset */
  discarded: string | null
  /** Sample rows this page used to seed, cleaned out of an existing browser */
  cleanedDemoEntries: number
  /** True when the old always-on idle default was switched off */
  idleDefaultChanged?: boolean
}

/**
 * A shared workspace's name, made from its content, so it is the same in every
 * tab: a tab that opened on what this browser holds — and so never heard the
 * message that put it there — still knows it by the name the other tabs use,
 * and a change built on it can be merged against it. Random names were tried:
 * a tab opened after a message could not place the next one, and took it whole
 * over its own change. FNV-1a, plus the length: one pass over the text the save
 * has just produced anyway.
 */
function sharedId(serialised: string): string {
  let hash = 0x811c9dc5
  for (let i = 0; i < serialised.length; i++) {
    hash ^= serialised.charCodeAt(i)
    hash = Math.imul(hash, 0x01000193)
  }
  return `stored:${(hash >>> 0).toString(36)}:${serialised.length}`
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
  // A workspace from the numeric-id era is converted, not thrown away
  if (parsed.version === 2) {
    parsed = migrateStateToV3(parsed as unknown as Record<string, unknown>) as unknown as TimetrackState
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

  // once, and recorded: see `moveLegacyIdleDefault`
  const idle = moveLegacyIdleDefault(cleaned.state)

  return {
    state: idle.state,
    discarded: null,
    cleanedDemoEntries: cleaned.removedEntries,
    idleDefaultChanged: idle.moved,
  }
}

export function useTimetrack() {
  const [state, setStateRaw] = useState<TimetrackState | null>(null)
  const [nowSec, setNowSec] = useState(() => Math.floor(serverNow() / 1000))
  const [toasts, setToasts] = useState<ToastMessage[]>([])
  const [idlePrompt, setIdlePrompt] = useState<IdlePrompt | null>(null)
  /**
   * What Pomodoro, the reminder and the forgotten-timer warning already did on
   * this device, read once: see `backgroundMemory.ts`. Leaving the tracker used
   * to reset all three, so every arrival started a fresh 25 minutes and said
   * both of the others again.
   */
  const [memory] = useState(readBackgroundMemory)
  const [pomodoroPhase, setPomodoroPhase] = useState<PomodoroPhase>(() => memory.pomodoro?.phase ?? "idle")
  const [pomodoroEndsAt, setPomodoroEndsAt] = useState<number | null>(() => memory.pomodoro?.endsAt ?? null)
  const [pomodoroCycles, setPomodoroCycles] = useState(() => memory.pomodoro?.cycles ?? 0)

  const toastId = useRef(1)
  const lastInteraction = useRef(Date.now())
  const lastReminder = useRef(memory.lastReminderAt)
  const timelineStart = useRef<number | null>(null)
  const pomodoroLastEntry = useRef<Id | null>(memory.pomodoro?.lastEntryId ?? null)
  /** the timer the running focus period belongs to */
  const pomodoroWorkEntry = useRef<Id | null>(memory.pomodoro?.workEntryId ?? null)
  const pendingLoadNotice = useRef<{ text: string; tone: "info" | "error" } | null>(null)
  /** the running entry already warned about, not a yes/no: a second forgotten timer is news */
  const forgottenWarned = useRef<Id | null>(memory.warnedForgottenId)
  const saveFailed = useRef(false)

  // --- load once on the client ---------------------------------------------
  useEffect(() => {
    const loaded = loadState(serverNowIso())
    /**
     * What this browser held is shared already: every other tab has it, or
     * wrote it. If loading changed it (an old setting moved, demo rows
     * cleaned), that change goes out built on it.
     */
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY)
      const held = raw ? (JSON.parse(raw) as TimetrackState) : null
      if (raw && held?.version === STATE_VERSION) {
        const id = sharedId(raw)
        sharedById.current.set(id, held)
        lastShared.current = { id, state: held }
        lastStored.current = raw
      }
    } catch {
      // unreadable: `loadState` has already said so
    }
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

  const running = state ? runningEntry(state) : null

  /**
   * --- the clock -----------------------------------------------------------
   *
   * Every tick re-renders the whole tracker, because `nowSec` is threaded from
   * here into every screen. That is the price of a timer you can watch, and it
   * is worth paying WHILE ONE IS RUNNING. With nothing running there is no
   * second-hand anywhere on the screen, and the only things that still need the
   * time are the project alerts and the tracking reminder, both of which work
   * in minutes. So an idle page rebuilt the entire tracker sixty times a minute
   * to change nothing at all.
   */
  /**
   * A POMODORO BREAK IS A COUNTDOWN, SO IT TICKS LIKE ONE.
   *
   * Nothing is *running* during a break, so this fell to the 10-second idle rate and
   * the header pill froze: `Break 0:02:01` for ten seconds, then a jump to `0:01:51`.
   * The break's END is detected on the same tick, so a break also overran by up to ten
   * seconds. Focus ticked every second the whole time, one phase away.
   *
   * The dep list stays narrow — the RATE, not the entry — and now names the two things
   * the rate depends on.
   */
  const ticksEverySecond = running !== null || pomodoroPhase === "break"
  useEffect(() => {
    const everyMs = ticksEverySecond ? 1000 : IDLE_TICK_MS
    const timer = window.setInterval(() => setNowSec(Math.floor(serverNow() / 1000)), everyMs)
    return () => window.clearInterval(timer)
  }, [ticksEverySecond])

  const setState = useCallback((updater: (current: TimetrackState) => TimetrackState) => {
    setStateRaw((current) => (current ? updater(current) : current))
  }, [])

  const pushToast = useCallback(
    (text: string, tone: "info" | "error" = "info", undo?: () => void, undoLabel?: string, second?: ToastChoice) => {
      const id = toastId.current++
      setToasts((current) => [...current, { id, text, tone, undo, undoLabel, second }])
      window.setTimeout(() => setToasts((current) => current.filter((t) => t.id !== id)), second ? QUESTION_MS : TOAST_MS)
    },
    [],
  )

  const dismissToast = useCallback((id: number) => {
    setToasts((current) => current.filter((t) => t.id !== id))
  }, [])

  // --- other tabs and windows of the same browser --------------------------
  /**
   * TWO TABS MUST NOT UNDO EACH OTHER.
   *
   * Each change is told to the other tabs with an id and the id of the shared
   * workspace it was built on. A tab that hears one takes it — laying on top
   * whatever it changed itself since that workspace (`mergeTabStates`) — and
   * does NOT tell it back: the sender already stored it and told everyone.
   * Telling it back is what lost edits: by the time the echo arrived the sender
   * had moved on, took its own older workspace back, and uploaded that.
   */
  const channelRef = useRef<BroadcastChannel | null>(null)
  /** the shared workspaces this tab knows by name — sent, heard or read on opening — for merging a message against the one it was built on */
  const sharedById = useRef(new Map<string, TimetrackState>())
  const idOfShared = useRef(new WeakMap<TimetrackState, string>())
  /** a merge of a message with this tab's own changes, and the message it was laid onto: its base when it goes out */
  const mergedOnto = useRef(new WeakMap<TimetrackState, string>())
  /** the last shared workspace this tab has drawn: what its own next change is built on */
  const lastShared = useRef<{ id: string; state: TimetrackState } | null>(null)
  /** what this browser's storage holds, as far as this tab knows, so an unchanged workspace is not written or told again */
  const lastStored = useRef<string | null>(null)
  /** what a workspace heard from another tab looked like as text: it is what that tab stored */
  const heardAs = useRef(new WeakMap<TimetrackState, string>())

  const rememberShared = useCallback((id: string, shared: TimetrackState) => {
    sharedById.current.set(id, shared)
    idOfShared.current.set(shared, id)
    // a few dozen is plenty: a message is built on something at most a moment old
    if (sharedById.current.size > 32) sharedById.current.delete(sharedById.current.keys().next().value!)
  }, [])

  const hear = useCallback(
    (serialised: string, id: string | null, base: string | null) => {
      const incoming = JSON.parse(serialised) as TimetrackState
      const name = id ?? sharedId(serialised)
      heardAs.current.set(incoming, serialised)
      // what the sender built on; a message with no base (the storage event) was built on what we last shared
      const ancestor = (base !== null ? sharedById.current.get(base) : undefined) ?? lastShared.current?.state
      rememberShared(name, incoming)
      const from = ancestor ?? null
      setStateRaw((current) => {
        if (!current || !from) return incoming
        const next = mergeTabStates(from, current, incoming)
        if (next !== incoming) mergedOnto.current.set(next, name)
        return next
      })
    },
    [rememberShared],
  )

  useEffect(() => {
    if (typeof BroadcastChannel === "undefined") return
    const channel = new BroadcastChannel(STORAGE_KEY)
    channelRef.current = channel

    channel.onmessage = (event: MessageEvent<{ kind: string; serialised: string; id?: string; base?: string | null }>) => {
      if (event.data?.kind !== "state") return
      try {
        hear(event.data.serialised, event.data.id ?? null, event.data.base ?? null)
      } catch {
        // A message we cannot read is a bug worth seeing, not something to swallow
        pushToast("Another tab sent an update this one could not read — reload to resync", "error")
      }
    }

    return () => {
      channel.close()
      channelRef.current = null
    }
  }, [pushToast, hear])

  useEffect(() => {
    // Safari private mode and older browsers have no BroadcastChannel; the
    // storage event is the fallback and fires in other tabs on every write.
    // Where the channel exists it already carried the change, with its base.
    const onStorage = (event: StorageEvent) => {
      if (channelRef.current) return
      if (event.key !== STORAGE_KEY || !event.newValue) return
      try {
        hear(event.newValue, null, null)
      } catch {
        pushToast("Another tab saved something this one could not read — reload to resync", "error")
      }
    }
    window.addEventListener("storage", onStorage)
    return () => window.removeEventListener("storage", onStorage)
  }, [pushToast, hear])

  /**
   * The size tripwire. Reported once per session, to the error channel rather
   * than to the person: a workspace this big is not their problem yet, it is a
   * signal that this slice's one-blob design has a horizon. See
   * `WORKSPACE_SIZE_TRIPWIRE`.
   */
  const sizeReported = useRef(false)
  useEffect(() => {
    if (!state || sizeReported.current) return
    if (state.entries.length < WORKSPACE_SIZE_TRIPWIRE) return
    sizeReported.current = true
    reportError(
      new Error(
        `timetrack workspace has ${state.entries.length} entries, past the ${WORKSPACE_SIZE_TRIPWIRE} tripwire: one localStorage blob, whole-account diff on every change`,
      ),
      { severity: "warning" },
    )
  }, [state])

  // --- persist on every change --------------------------------------------
  useEffect(() => {
    if (!state) return
    // Heard from another tab, whole: it is stored already and every tab has it.
    // Telling it back is the echo that lost edits (see `hear`).
    const heardId = idOfShared.current.get(state)
    if (heardId !== undefined) {
      lastShared.current = { id: heardId, state }
      lastStored.current = heardAs.current.get(state) ?? lastStored.current
      return
    }
    try {
      const serialised = JSON.stringify(state)
      // what this browser holds already — the workspace just read on opening, or
      // the same content another tab stored a moment ago — is nothing to tell anyone
      if (serialised === lastStored.current) {
        const id = lastShared.current?.id ?? sharedId(serialised)
        rememberShared(id, state)
        lastShared.current = { id, state }
        return
      }
      window.localStorage.setItem(STORAGE_KEY, serialised)
      // Tell the other tabs. `localStorage` already fires a `storage` event in
      // other tabs, but not in this one and not reliably before this write is
      // read back, so the channel carries the state we just wrote. Without it,
      // two open tabs each hold their own copy and the last one to save wins,
      // silently throwing away whatever the other one did.
      const id = sharedId(serialised)
      const base = mergedOnto.current.get(state) ?? lastShared.current?.id ?? null
      rememberShared(id, state)
      lastShared.current = { id, state }
      lastStored.current = serialised
      channelRef.current?.postMessage({ kind: "state", serialised, id, base })
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
  }, [state, pushToast, rememberShared])

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

  const runningSeconds = running ? entrySeconds(running, nowSec) : 0

  // --- document title mirrors the running timer, like Toggl ---------------
  /** what this hook last wrote into the tab, so leaving can tell whether it is still there */
  const titleWritten = useRef<string | null>(null)
  useEffect(() => {
    if (typeof document === "undefined") return
    // What the tab says when nothing is tracking. It named a lab page, on a
    // tab somebody has open all day.
    const base = "Time"
    if (!running) {
      document.title = base
      titleWritten.current = base
      return
    }
    const h = Math.floor(runningSeconds / 3600)
    const m = Math.floor((runningSeconds % 3600) / 60)
    const s = runningSeconds % 60
    const clock = `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`
    document.title = `${clock} · ${running.description || "(no description)"}`
    titleWritten.current = document.title
  }, [running, runningSeconds])

  /**
   * LEAVING PUTS THE TRACKER'S NAME BACK ONLY IF NOTHING ELSE HAS WRITTEN THE TAB.
   *
   * This used to be the clean-up of the effect above, run on every tick and on
   * the way out. On the way out it ran too late: React writes the next page's
   * <title> while it commits the navigation and runs this clean-up afterwards,
   * so leaving with a timer running left the Dashboard's tab reading "Time"
   * (getting-around #11 in Plans/time-tracker-like-toggl.md). The clock is
   * still replaced when the next page's title is the same text as this one —
   * then React has nothing to write and the clock would stay behind.
   */
  useEffect(
    () => () => {
      if (typeof document === "undefined") return
      if (titleWritten.current !== null && document.title === titleWritten.current) document.title = "Time"
    },
    [],
  )

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
      // measured on this device's clock, stamped on the server's
      idleSinceIso: new Date(lastInteraction.current + serverOffset()).toISOString(),
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

      const nowIso = serverNowIso()
      const entry = state?.entries.find((e) => e.id === prompt.entryId)
      if (!state || !entry) return

      /**
       * THE CONFIRMATION USED TO BE WRITTEN BEFORE ANYONE CHECKED.
       *
       * This took `.state` from the trim and then toasted "Dropped 25m and
       * stopped the timer" whether or not the trim happened. A locked date or a
       * required field is enough to refuse it, and then the message was simply
       * untrue — the worst shape a message can have, because the one thing the
       * user now believes is the thing that did not occur.
       */
      /**
       * Never trim to before the entry began.
       *
       * `idleSinceIso` is the last real interaction, and an entry can start
       * AFTER that: Pomodoro's auto-continue begins one with nobody touching
       * anything. The trim was then refused — correctly, an entry cannot end
       * before it starts — but the prompt had already been dismissed, so
       * nothing was trimmed, the timer kept running, and there was no way back
       * to the question. Clamping gives a zero-length entry, which the rule
       * allows on purpose.
       */
      const trimTo =
        epochSeconds(prompt.idleSinceIso) < epochSeconds(entry.start) ? entry.start : prompt.idleSinceIso
      const trimmed = updateEntry(state, entry.id, { stop: trimTo }, nowIso)
      if (trimmed.violations.length > 0) {
        pushToast(trimmed.violations[0].message, "error")
        return
      }

      const span = formatIdleSpan(prompt.idleSeconds)
      if (action === "discard_and_stop") {
        setState(() => trimmed.state)
        pushToast(`Dropped ${span} and stopped the timer`)
        return
      }

      const restarted = startTimer(
        trimmed.state,
        {
          description: entry.description,
          projectId: entry.projectId,
          taskId: entry.taskId,
          tagIds: entry.tagIds,
          billable: entry.billable,
        },
        nowIso,
      )
      if (restarted.violations.length > 0) {
        // the trim did happen; only the fresh entry was refused, and the
        // message says exactly that rather than claiming both or neither
        setState(() => trimmed.state)
        pushToast(`Dropped ${span}, but could not start a fresh entry: ${restarted.violations[0].message}`, "error")
        return
      }
      setState(() => restarted.state)
      pushToast(`Dropped ${span} and started a fresh entry`)
    },
    [idlePrompt, pushToast, setState, state],
  )

  // --- pomodoro -----------------------------------------------------------
  useEffect(() => {
    // Not before the workspace is read: a focus period carried over from the
    // last visit must not be reset by the first render, which has no state yet.
    if (!state) return
    if (!state.pomodoro.enabled) {
      setPomodoroPhase("idle")
      setPomodoroEndsAt(null)
      return
    }
    if (running && pomodoroPhase === "idle") {
      setPomodoroPhase("work")
      setPomodoroEndsAt(Date.now() + state.pomodoro.workMinutes * 60_000)
      pomodoroWorkEntry.current = running.id
    }
    // A focus period carried over belongs to the timer it was started for. If
    // another one runs now — stopped and restarted on another device — it gets
    // its own 25 minutes rather than the end of somebody else's.
    if (running && pomodoroPhase === "work" && pomodoroWorkEntry.current !== null && pomodoroWorkEntry.current !== running.id) {
      setPomodoroEndsAt(Date.now() + state.pomodoro.workMinutes * 60_000)
      pomodoroWorkEntry.current = running.id
    }
    if (!running && pomodoroPhase === "work") {
      setPomodoroPhase("idle")
      setPomodoroEndsAt(null)
    }
  }, [running, state?.pomodoro.enabled, state?.pomodoro.workMinutes, pomodoroPhase, state])

  // Kept for the next visit: see `backgroundMemory.ts`
  useEffect(() => {
    rememberBackground({
      pomodoro:
        pomodoroPhase === "idle" || pomodoroEndsAt === null
          ? null
          : {
              phase: pomodoroPhase,
              endsAt: pomodoroEndsAt,
              cycles: pomodoroCycles,
              workEntryId: pomodoroWorkEntry.current,
              lastEntryId: pomodoroLastEntry.current,
            },
    })
  }, [pomodoroPhase, pomodoroEndsAt, pomodoroCycles])

  useEffect(() => {
    if (!state?.pomodoro.enabled || pomodoroEndsAt === null) return
    if (Date.now() < pomodoroEndsAt) return

    const nowIso = serverNowIso()
    if (pomodoroPhase === "work") {
      const lastId = running?.id ?? null
      // set before the phase changes, so the memory written for the break carries it
      pomodoroLastEntry.current = lastId
      setState((current) => stopTimer(current, nowIso).state)
      setPomodoroCycles((c) => c + 1)
      setPomodoroPhase("break")
      setPomodoroEndsAt(Date.now() + state.pomodoro.breakMinutes * 60_000)
      if (state.pomodoro.notify) notify("Pomodoro complete", `Timer stopped. Take ${plural(state.pomodoro.breakMinutes, "minute")}.`)
      return
    }

    if (pomodoroPhase === "break") {
      setPomodoroPhase("idle")
      setPomodoroEndsAt(null)
      /**
       * A BREAK THAT ENDED WHILE YOU WERE AWAY ENDS QUIETLY.
       *
       * Its end is only noticed when you come back, maybe an hour later, and
       * auto-continue would then start a timer the moment you open the tracker,
       * for work you are not doing. On the page this is never more than a tick
       * late, so a minute tells the two apart.
       */
      if (Date.now() - pomodoroEndsAt > 60_000) return
      if (state.pomodoro.autoContinue && pomodoroLastEntry.current !== null) {
        // Same failure as the idle prompt one screen away: this used to take
        // `.state` and then announce "Continued your last time entry" whether
        // or not it had. The break is over either way; what did not happen is
        // not announced.
        const result = continueEntry(state, pomodoroLastEntry.current, nowIso)
        if (result.violations.length > 0) {
          if (state.pomodoro.notify) notify("Break over", `Could not continue: ${result.violations[0].message}`)
        } else {
          setState(() => result.state)
          if (state.pomodoro.notify) notify("Break over", "Continued your last time entry.")
        }
      } else if (state.pomodoro.notify) {
        notify("Break over", "Ready when you are.")
      }
    }
  }, [nowSec, pomodoroEndsAt, pomodoroPhase, running, state, notify, setState])

  // --- tracking reminders -------------------------------------------------
  useEffect(() => {
    if (!state?.reminders.enabled || running) return
    const now = new Date(serverNow())
    if (!state.reminders.days.includes(now.getDay())) return
    // a window may wrap past midnight — 20:00 to 03:00 is an ordinary evening window,
    // and the old comparison made it match no hour at all
    if (!hourIsInWindow(now.getHours(), state.reminders.fromHour, state.reminders.toHour)) return
    const gap = state.reminders.everyMinutes * 60_000
    if (Date.now() - lastReminder.current < gap) return
    lastReminder.current = Date.now()
    // and on the next visit: arriving is not a reason to say it again
    rememberBackground({ lastReminderAt: lastReminder.current })
    notify("Nothing is tracking", "Start a timer to keep your day accurate.")
  }, [nowSec, running, state, notify])

  // --- a timer left running for half a day is almost certainly forgotten ---
  useEffect(() => {
    if (!state) return
    const forgotten = forgottenTimer(state, nowSec)
    if (!forgotten || forgottenWarned.current === forgotten.entry.id) return
    forgottenWarned.current = forgotten.entry.id
    rememberBackground({ warnedForgottenId: forgotten.entry.id })
    const what = forgotten.entry.description.trim()
    pushToast(
      `${what ? `“${what}”` : "A timer"} has been running for ${plural(Math.round(forgotten.hours), "hour")}. Forgot to stop it? Type how long you really worked into the timer, and it ends then.`,
      "error",
    )
  }, [state, nowSec, pushToast])

  // --- project alerts -----------------------------------------------------
  const entryCount = state?.entries.length ?? 0
  useEffect(() => {
    if (!state) return
    const nowIso = serverNowIso()
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
            id: newId(),
            start: new Date(startedAt + serverOffset()).toISOString(),
            end: serverNowIso(),
            label: document.title.split(" · ").pop() ?? "Time tracker",
            converted: false,
          },
          ...current.timeline,
        ].slice(0, 100),
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

  /**
   * Starting a timer stops the one before it. That is the right rule and it is
   * Toggl's, but it has to be said out loud: on a phone the taps that do it sit
   * next to taps that do something else, and a timer that stopped without being
   * mentioned shows up days later as a total that is wrong.
   *
   * The Start button, a favorite, a keyboard shortcut and "continue last" all
   * come through the two actions below. THREE ROUTES DO NOT, and each says it
   * where it lives, because each has something different to say: the entry
   * row's Continue (`EntryList`), an event on the calendar (`CalendarView`),
   * and a `?start=1` link (`TogglLab`), which is the worst of them because you
   * did not press anything in this app at all.
   *
   * The idle prompt's restart is deliberately silent: it displaces the entry it
   * is in the middle of trimming, and already has a toast of its own.
   */
  const announceDisplacement = useCallback(
    (displaced: TimeEntry | null, started: TimeEntry | null) => {
      if (!displaced || !started) return
      const name = (entry: TimeEntry) => entry.description.trim() || "(no description)"
      pushToast(`Stopped “${name(displaced)}” and started “${name(started)}”`, "info", () =>
        setState((current) => undoDisplacement(current, started.id, displaced.id, serverNowIso())),
      )
    },
    [pushToast, setState],
  )

  // --- convenience actions -------------------------------------------------
  /**
   * `at` is the moment of the tap, when the tap was held for the check (D2):
   * stamping the replay instead made a woken phone's stops and starts up to
   * three seconds late (bug audit A6). Left out, it is now.
   */
  const actions = useMemo(
    () => ({
      start(draft: EntryDraft, at?: string) {
        if (!state) return
        const result = startTimer(state, draft, at ?? serverNowIso())
        if (result.violations.length > 0) {
          pushToast(result.violations[0].message, "error")
          return
        }
        setState(() => result.state)
        announceDisplacement(result.displaced, result.entry)
      },
      stop(at?: string) {
        const nowIso = at ?? serverNowIso()
        setState((current) => stopTimer(current, nowIso).state)
      },
      continueLast(at?: string) {
        if (!state) return
        const nowIso = at ?? serverNowIso()
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
        announceDisplacement(result.displaced, result.started)
      },
      resetWorkspace() {
        /**
         * CLEARING A WORKSPACE EMPTIES IT. IT DOES NOT SWAP IT FOR A NEW ONE.
         *
         * This used to install a whole fresh state, workspace record included,
         * which has a new id. Two consequences, both measured:
         *
         *   - the change set then carried a tombstone for the old workspace AND
         *     a live row for the new one, and `pushTimetrackRows` rewrites every
         *     workspace id to the one the person owns — so both rows arrived with
         *     the SAME primary key, Postgres answered "ON CONFLICT DO UPDATE
         *     command cannot affect row a second time", and the queue jammed on a
         *     payload that could never be accepted. `isolateRefusedRows` then
         *     wrote each half separately, each succeeded alone, so it named no
         *     ids at all and nothing was dropped: a stuck queue with no way out
         *     but a reload.
         *   - it is the same shape as the bad-read incident `safeToSend` exists
         *     to refuse — a workspace the server has never seen, next to
         *     tombstones for everything the old one held. The guard cannot tell
         *     a deliberate clear from that fault if the deliberate clear looks
         *     identical to it.
         *
         * Keeping the workspace record and the person's display preferences
         * removes both. What the button promises — "delete everything" — is the
         * contents, which is what is emptied here.
         */
        setStateRaw((current) => {
          const fresh = createEmptyWorkspace(serverNowIso())
          if (!current) return fresh
          return { ...fresh, workspace: current.workspace, user: current.user }
        })
        pushToast("Workspace cleared")
      },
      replaceState(next: TimetrackState) {
        /**
         * The sync hands over the account's copy here, and the account may
         * still hold the old idle default this browser moved off when it
         * loaded. Moving it again here — without a second toast — is what
         * gets the move sent: the state that arrives differs from the copy
         * handed over, and the sync queues the difference. Anything that
         * needs nothing comes back as the same object.
         */
        setStateRaw(moveLegacyIdleDefault(next).state)
      },
    }),
    [announceDisplacement, pushToast, setState, state],
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
      /**
       * FLOOR, not round. `nowSec` is floored to the second while `endsAt` carries
       * milliseconds, so this difference runs up to 999 ms LONG — and rounding turned a
       * two-minute break into `0:02:01` at the moment it started, one second more than
       * the number the person had just typed in.
       */
      // `endsAt` is on this device's clock and `nowSec` on the server's
      secondsLeft: pomodoroEndsAt ? Math.max(0, Math.floor((pomodoroEndsAt - (nowSec * 1000 - serverOffset())) / 1000)) : 0,
    },
    actions,
    requestNotificationPermission,
  }
}


/** Latest stopped entries, newest first — used by "continue" affordances */
export function recentEntries(entries: TimeEntry[], limit = 10): TimeEntry[] {
  return entries
    .filter((e) => !isRunning(e))
    .sort((a, b) => epochSeconds(b.start) - epochSeconds(a.start))
    .slice(0, limit)
}
