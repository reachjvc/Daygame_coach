"use client"

/**
 * WHICH COUNTRY'S HELPLINE NUMBERS TO SHOW.
 *
 * Its own key, like `vice-blackbox-view` beside it, and for the same reason: a
 * choice about what to display is never part of the record. It also never reads
 * or writes `quit-vice-v1`, which holds the old module's copy of this answer —
 * the Black Box's whole storage rule is that it does not touch that key, and
 * one convenience is not worth the exception.
 *
 * THE COST OF LOSING IT IS ONE TAP, AND THE COST OF GETTING IT WRONG IS A DEAD
 * PHONE NUMBER. So every read and write is wrapped and the fallback is `null`,
 * which the door reads as "not asked yet" and answers by asking. There is
 * deliberately no guess from the browser's locale or timezone: a number for the
 * wrong country, presented as this country's, is worse than no number at all,
 * and someone on a UK phone in a US hotel is exactly the person who would get
 * it wrong.
 */

import { useCallback, useEffect, useState } from "react"
import type { HelpLocale } from "../types"

export const HELP_LOCALE_KEY = "vice-help-locale-v1"

/** The closed set, so a corrupted or hand-edited value cannot reach the door. */
const KNOWN: HelpLocale[] = ["uk", "us", "other"]

function isKnown(value: string | null): value is HelpLocale {
  return value !== null && (KNOWN as string[]).includes(value)
}

export function useHelpLocale() {
  const [locale, setLocale] = useState<HelpLocale | null>(null)

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(HELP_LOCALE_KEY)
      if (isKnown(stored)) setLocale(stored)
    } catch {
      // Private window, blocked storage: the door asks again. No worse than new.
    }
  }, [])

  const remember = useCallback((next: HelpLocale) => {
    setLocale(next)
    try {
      window.localStorage.setItem(HELP_LOCALE_KEY, next)
    } catch {
      // It holds for this visit, which is the visit that matters.
    }
  }, [])

  return { locale, remember }
}
