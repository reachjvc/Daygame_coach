"use client"

/**
 * Listens for the failures a React boundary cannot see, everywhere in the app.
 *
 * A boundary only catches errors thrown while rendering. These two are the rest:
 *   - something thrown outside rendering (a click handler, a timer)
 *   - a promise nobody handled (a fetch with no .catch)
 *
 * It lived inside the time tracker first, which meant a crash on any other page
 * was still invisible. It belongs in the root layout, once, for the whole app.
 */

import { useEffect } from "react"

import { listenForUncaughtErrors } from "../errorReportService"

export function ErrorReporting() {
  useEffect(() => listenForUncaughtErrors(), [])
  return null
}
