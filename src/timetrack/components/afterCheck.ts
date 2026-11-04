"use client"

/**
 * START, STOP AND CONTINUE WAIT FOR THE CHECK (D2 in Plans/time-tracker-like-toggl.md).
 *
 * After opening or waking, this device's copy may be hours old: the PC may
 * have stopped the timer the phone still shows running. A tap on that copy used
 * to act on it, and its stop replaced the PC's. The tracker therefore holds such
 * a tap until the first check lands — three seconds at most — and runs it then,
 * on the workspace as it is NOW, which `run` is handed. If the running timer
 * changed meanwhile, the tap is dropped and the person is told, because the
 * button they pressed is no longer the one on the screen.
 *
 * Provided by `TogglLab`. With no provider (a component on its own, a test),
 * the tap runs at once on the workspace the caller holds.
 */

import { createContext } from "react"

import type { TimetrackState } from "../types"

/**
 * `always`: run it even if the running timer changed meanwhile — for a start
 * link, which nobody can "tap again".
 */
export type AfterCheck = (run: (latest: TimetrackState) => void, options?: { always?: boolean }) => void

export const AfterCheckContext = createContext<AfterCheck | null>(null)
