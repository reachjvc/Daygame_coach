"use client"

/**
 * A DELETE'S UNDO, ON THE PHONE: ONE AT A TIME, AND IT WAITS.
 *
 * The toast that carried it left after seven seconds, while it was still being
 * read, and the tap meant for Undo landed on a row's ▶ under it and started a
 * timer (findability, 2026-11-05: "delete an entry and get it back" missed).
 * So a delete's Undo is offered here instead: `PhoneTracker` shows it in the
 * bottom bar, where no row is under it, until the next change to the workspace
 * or 30 seconds, and a newer delete's Undo replaces it.
 */

import { createContext } from "react"

/** "Time entry was deleted", and what Undo puts back */
export type OfferUndo = (text: string, undo: () => void) => void

export const UndoContext = createContext<OfferUndo | null>(null)

/** how long a delete's Undo waits when nothing else changes */
export const UNDO_WAITS_MS = 30_000
