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

import type { EntryDraft, Id, IsoDateTime, TimetrackState } from "../types"

/**
 * `run` is handed the workspace as it is now and `tappedAt`, the moment of the
 * tap on the server's clock — not the moment the check let it through, which
 * is up to three seconds later (bug audit A6). A stop or a start stamps that.
 *
 * `always`: run it even if the running timer changed meanwhile — for a start
 * link, which nobody can "tap again".
 *
 * `keepAsNext`: a Start's draft. If the check finds a timer the other device
 * started, the Start is dropped like any other — and these words wait in the
 * running bar's box for the next thing, one tap from Switch now, instead of
 * being replaced by the other timer's (bug audit A5).
 */
export type AfterCheck = (
  run: (latest: TimetrackState, tappedAt: IsoDateTime) => void,
  /** `keep`: a tap that ends the running timer, as data, kept on disk while it waits (`keepHeldStop` in TogglLab) */
  options?: { always?: boolean; keepAsNext?: EntryDraft; keep?: KeptTap },
) => void

/**
 * A held tap that ends the running timer, written so a later opening can do it
 * again: end `seen` at the tap, or at `at` when a moment was chosen (Stop at…,
 * the sheet's Done with an end). Only the Stop is kept, never the rest of an
 * edit: hours later a rename could overwrite one the other device made since.
 * A Start is never kept: what it would start is a guess after a reopen.
 */
export type KeptTap = { kind: "stop"; seen: Id | null; at?: IsoDateTime }

export const AfterCheckContext = createContext<AfterCheck | null>(null)
