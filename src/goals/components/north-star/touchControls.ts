"use client"

import { createContext, useContext } from "react"

/**
 * BUTTONS BESIDE THE DRAG (Plans/plan-new-from-real.md, Phase 6.6, his pick Q9: "drag plus buttons").
 *
 * Dragging a value into place or a curve into shape is hard on a phone and impossible with a keyboard. When this is
 * true, the value order gets Move up / Move down buttons on every row, and the curve editor gets preset shapes and
 * step buttons, all at least 44 px high, next to the drag, which stays. Off by default, so `/plan` draws exactly what
 * it has always drawn; `/plan/new` turns it on at its host.
 */
export const TouchControlsContext = createContext(false)
export const useTouchControls = () => useContext(TouchControlsContext)
