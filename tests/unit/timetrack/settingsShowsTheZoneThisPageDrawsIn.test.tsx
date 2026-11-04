// @vitest-environment jsdom
/**
 * SETTINGS SHOWS THE TIME ZONE THIS PAGE DRAWS IN.
 *
 * The workspace remembers the zone of whichever browser first made it, and
 * Settings showed that under "Taken from this browser". A workspace made in a
 * Tokyo browser and opened in Copenhagen said "Asia/Tokyo" while every time on
 * the page was drawn in Copenhagen's zone. Found by the edits audit on
 * 2026-11-04. Which zone the page draws in is unchanged: this browser's.
 *
 * Vitest runs with TZ=Europe/Copenhagen (vitest.config.ts).
 */

import { cleanup, render } from "@testing-library/react"
import { afterEach, describe, expect, test, vi } from "vitest"

import { SettingsView } from "@/src/timetrack/components/SettingsView"

import { baseState } from "./helpers"

// the tab switch scrolls its active chip into view, which jsdom cannot do
Element.prototype.scrollIntoView = Element.prototype.scrollIntoView ?? (() => {})

afterEach(cleanup)

describe("Settings › Profile", () => {
  test("names this browser's zone, not the one the workspace was made in", () => {
    const state = baseState()
    state.user.timezone = "Asia/Tokyo"
    const view = render(
      <SettingsView
        state={state}
        setState={vi.fn()}
        nowSec={0}
        pushToast={vi.fn()}
        resetWorkspace={vi.fn()}
        replaceState={vi.fn()}
        requestNotificationPermission={vi.fn()}
        tab="profile"
        setTab={vi.fn()}
        syncStatus="Saved"
        onUploadEverything={vi.fn()}
      />,
    )
    const zone = [...view.container.querySelectorAll("input")].find((input) => /\//.test(input.value))

    expect(zone?.value).toBe(Intl.DateTimeFormat().resolvedOptions().timeZone)
    expect(zone?.value).toBe("Europe/Copenhagen")
  })
})
