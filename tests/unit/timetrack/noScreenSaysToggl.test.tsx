// @vitest-environment jsdom
/**
 * NO SCREEN OF THE TRACKER SAYS "TOGGL" (D-LOOK in Plans/toggl-parity.md).
 *
 * The tracker copies Toggl Track's layout, taps and words, and will be sold, so
 * Toggl's name stays out of everything a person reads or a screen reader says:
 * text, labels, tooltips and placeholders, on the phone and on the PC. Until
 * 2026-11-05 it was in the shortcut list, Integrations, Webhooks and Manage.
 * Code names (`TogglLab`, the `toggl-clone:` storage keys) are not shown and
 * may stay.
 */
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest"

import { TogglLab } from "@/src/timetrack/components/TogglLab"
import { STORAGE_KEY } from "@/src/timetrack/config"
import { stateToRows } from "@/src/timetrack/timetrackMapperService"
import { SECTIONS } from "@/src/timetrack/trackerAddressService"

import { wait } from "./deviceHarness"
import { fakeAccount } from "./fakeAccount"
import { baseState } from "./helpers"

/** Every word a person can read or hear on the page right now */
function whatThePageSays(): string {
  const parts = [document.body.textContent ?? ""]
  for (const el of document.querySelectorAll("[aria-label], [title], [placeholder], [alt]")) {
    for (const name of ["aria-label", "title", "placeholder", "alt"]) {
      const value = el.getAttribute(name)
      if (value) parts.push(value)
    }
  }
  return parts.join("\n")
}

function asPhone() {
  vi.stubGlobal("matchMedia", (query: string) => ({
    matches: query.includes("max-width"),
    media: query,
    addEventListener: () => {},
    removeEventListener: () => {},
  }))
}

async function open(section: string) {
  window.history.replaceState(null, "", `/test/toggl?view=${section}`)
  const copy = baseState()
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(copy))
  const account = fakeAccount(stateToRows(copy, "user-1"))
  vi.stubGlobal("fetch", (url: string, init?: { method?: string; body?: string }) => account.fetch(url, init))
  render(<TogglLab />)
  await wait(1_500)
}

/** Press each tab of a row of tabs that is on screen, reading the page after each */
async function readEachTab(names: string[], said: string[]) {
  for (const name of names) {
    const tab = screen.queryAllByRole("button", { name, exact: true })[0] ?? screen.queryAllByRole("tab", { name, exact: true })[0]
    if (!tab) continue
    await act(async () => {
      fireEvent.click(tab)
    })
    await wait(300)
    said.push(whatThePageSays())
  }
}

beforeEach(() => {
  window.localStorage.clear()
  vi.useFakeTimers()
})

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
  vi.useRealTimers()
  window.localStorage.clear()
  window.sessionStorage.clear()
})

describe.each([
  ["on a PC", () => {}],
  ["on a phone", asPhone],
])("%s", (_, device) => {
  test.each([...SECTIONS])("the %s section never says Toggl", async (section) => {
    device()
    await open(section)
    const said = [whatThePageSays()]
    if (section === "settings") await readEachTab(["Profile", "Workspace", "Automation", "Integrations", "Data"], said)
    if (section === "manage") await readEachTab(["Clients", "Tags", "Team"], said)
    if (section === "timer") {
      const shortcuts = screen.queryAllByRole("button", { name: "Keyboard shortcuts" })[0]
      if (shortcuts) {
        await act(async () => {
          fireEvent.click(shortcuts)
        })
        said.push(whatThePageSays())
      }
    }
    for (const text of said) expect(text.match(/.{0,40}\btoggl\b.{0,40}/i)?.[0] ?? null).toBeNull()
  })
})
