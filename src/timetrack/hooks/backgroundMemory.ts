"use client"

/**
 * WHAT THE TRACKER'S BACKGROUND HELPERS HAVE ALREADY DONE, KEPT ACROSS VISITS.
 *
 * Pomodoro, the tracking reminder and the forgotten-timer warning each kept
 * their memory in the component. Leaving the tracker threw it away, so every
 * arrival started over: Pomodoro began a fresh 25 minutes, the reminder said
 * "Nothing is tracking" again a minute after it last did, and the warning
 * named the same forgotten timer again (getting-around #9 in
 * Plans/time-tracker-like-toggl.md).
 *
 * In this browser (`BACKGROUND_KEY`), not in the workspace: it is about this
 * device, and the workspace travels to the server and the other devices.
 * Every read and write survives blocked storage, where the cost is only the
 * old behaviour.
 */

import { BACKGROUND_KEY } from "../config"
import type { Id } from "../types"

export interface PomodoroMemory {
  phase: "work" | "break"
  /** epoch milliseconds */
  endsAt: number
  cycles: number
  /** the timer this focus period belongs to; another timer starts its own */
  workEntryId: Id | null
  /** what a break's auto-continue continues */
  lastEntryId: Id | null
}

export interface BackgroundMemory {
  pomodoro: PomodoroMemory | null
  /** epoch milliseconds of the last "Nothing is tracking" */
  lastReminderAt: number
  /** the running entry the forgotten-timer warning has already named */
  warnedForgottenId: Id | null
}

const NOTHING: BackgroundMemory = { pomodoro: null, lastReminderAt: 0, warnedForgottenId: null }

export function readBackgroundMemory(): BackgroundMemory {
  if (typeof window === "undefined") return NOTHING
  try {
    const raw = window.localStorage.getItem(BACKGROUND_KEY)
    if (!raw) return NOTHING
    const parsed = JSON.parse(raw) as Partial<BackgroundMemory>
    const pomodoro = parsed.pomodoro
    return {
      pomodoro:
        pomodoro &&
        (pomodoro.phase === "work" || pomodoro.phase === "break") &&
        typeof pomodoro.endsAt === "number" &&
        Number.isFinite(pomodoro.endsAt)
          ? {
              phase: pomodoro.phase,
              endsAt: pomodoro.endsAt,
              cycles: typeof pomodoro.cycles === "number" ? pomodoro.cycles : 0,
              workEntryId: typeof pomodoro.workEntryId === "string" ? pomodoro.workEntryId : null,
              lastEntryId: typeof pomodoro.lastEntryId === "string" ? pomodoro.lastEntryId : null,
            }
          : null,
      lastReminderAt: typeof parsed.lastReminderAt === "number" ? parsed.lastReminderAt : 0,
      warnedForgottenId: typeof parsed.warnedForgottenId === "string" ? parsed.warnedForgottenId : null,
    }
  } catch {
    return NOTHING
  }
}

export function rememberBackground(patch: Partial<BackgroundMemory>): void {
  if (typeof window === "undefined") return
  try {
    window.localStorage.setItem(BACKGROUND_KEY, JSON.stringify({ ...readBackgroundMemory(), ...patch }))
  } catch {
    // Storage full or blocked: the next arrival behaves as it did before this
    // existed, which is a repeat, not a loss.
  }
}
