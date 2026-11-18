"use client"

import { SRC_PATTERN, type CountStep } from "./countValidate"

const SRC_KEY = "quit-src"

function isPresent(): boolean {
  return new URLSearchParams(window.location.search).get("present") === "1"
}

/** The campaign tag from the page URL, kept for the visit in sessionStorage. */
function readSrc(): string | undefined {
  let stored: string | null = null
  try {
    stored = window.sessionStorage.getItem(SRC_KEY)
  } catch {
    // storage blocked
  }
  if (stored && SRC_PATTERN.test(stored)) return stored
  const fromUrl = new URLSearchParams(window.location.search).get("src")
  if (fromUrl && SRC_PATTERN.test(fromUrl)) {
    try {
      window.sessionStorage.setItem(SRC_KEY, fromUrl)
    } catch {
      // storage blocked
    }
    return fromUrl
  }
  return undefined
}

/** Tells the counter a step happened. Never throws; does nothing in `?present=1`. */
export function count(addiction: string, tool: string, step: CountStep): void {
  try {
    if (typeof window === "undefined" || isPresent()) return
    const src = readSrc()
    const payload = JSON.stringify({ addiction, tool, step, ...(src ? { src } : {}) })
    const url = "/api/quit/count"
    if (typeof navigator.sendBeacon === "function") {
      const blob = new Blob([payload], { type: "application/json" })
      if (navigator.sendBeacon(url, blob)) return
    }
    void fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: payload,
      keepalive: true,
    }).catch(() => {})
  } catch {
    // counting must never break a page
  }
}
