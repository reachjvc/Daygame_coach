// @vitest-environment jsdom
/**
 * TWO TABS OF ONE BROWSER DO NOT UNDO EACH OTHER.
 *
 * Found during Phase 3 of Plans/time-tracker-like-toggl.md: with a second
 * tracker tab open, edits were sometimes lost. Every tab tells the others about
 * each change it makes, and the other tab took the whole workspace it was told
 * about — and then told the first tab about it again. By the time that echo
 * came back the first tab had moved on, so it took its own older workspace back,
 * and its next upload sent the older version to the account.
 */

import { afterEach, beforeEach, describe, expect, test, vi } from "vitest"
import { cleanup } from "@testing-library/react"

import { STORAGE_KEY } from "@/src/timetrack/config"
import { stateToRows } from "@/src/timetrack/timetrackMapperService"
import type { TimetrackState } from "@/src/timetrack/types"

import { wait } from "./deviceHarness"
import { fakeAccount } from "./fakeAccount"
import { baseState, entry } from "./helpers"
import { installTabChannel, openTab } from "./tabHarness"

const USER = "user-1"

beforeEach(() => {
  window.localStorage.clear()
  vi.useFakeTimers()
  vi.setSystemTime(new Date(2026, 7, 10, 12, 0, 0))
  installTabChannel()
})

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
  vi.useRealTimers()
  window.localStorage.clear()
})

const workspace = (): TimetrackState =>
  baseState({
    entries: [
      entry("gym", "2026-08-10", "09:00", "10:00", { description: "Gym" }),
      entry("mail", "2026-08-10", "10:00", "11:00", { description: "Email" }),
    ],
  })

const describe_ = (id: string, description: string) => (current: TimetrackState): TimetrackState => ({
  ...current,
  entries: current.entries.map((e) => (e.id === id ? { ...e, description, at: new Date().toISOString() } : e)),
})

const named = (state: TimetrackState, id: string) => state.entries.find((e) => e.id === id)?.description

async function twoTabs() {
  const account = fakeAccount(stateToRows(workspace(), USER))
  vi.stubGlobal("fetch", vi.fn(account.fetch))
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(workspace()))
  const first = openTab()
  const second = openTab()
  await wait(500)
  return { account, first, second }
}

describe("two tracker tabs open in one browser", () => {
  test("a second edit made in one tab is not undone by the other tab repeating the first", async () => {
    const { account, first, second } = await twoTabs()

    first.apply(describe_("gym", "Gym, legs"))
    // the other tab hears about it
    await wait(1)
    first.apply(describe_("gym", "Gym, legs day"))
    await wait(1)
    await wait(1)
    await wait(1)
    await wait(5_000)

    expect(named(first.latest(), "gym"), "the tab you typed in went back to what you typed before").toBe("Gym, legs day")
    expect(named(second.latest(), "gym"), "the other tab shows the older text").toBe("Gym, legs day")
    expect(account.entry("gym")?.description, "the account was sent the older text").toBe("Gym, legs day")
  })

  test("edits made in both tabs to different entries are both kept", async () => {
    const { account, first, second } = await twoTabs()

    // each tab changes a different entry before it hears about the other's change
    first.apply(describe_("gym", "Gym, legs day"))
    second.apply(describe_("mail", "Email, inbox zero"))
    for (let i = 0; i < 4; i++) await wait(1)
    await wait(5_000)

    for (const [tab, name] of [
      [first, "first"],
      [second, "second"],
    ] as const) {
      expect(named(tab.latest(), "gym"), `the ${name} tab lost the first tab's edit`).toBe("Gym, legs day")
      expect(named(tab.latest(), "mail"), `the ${name} tab lost the second tab's edit`).toBe("Email, inbox zero")
    }
    expect(account.entry("gym")?.description).toBe("Gym, legs day")
    expect(account.entry("mail")?.description).toBe("Email, inbox zero")
  })

  test("two settings changed in the two tabs at once are both kept", async () => {
    const { first, second } = await twoTabs()

    first.apply((current) => ({ ...current, user: { ...current.user, timeFormat: "h12" } }))
    second.apply((current) => ({ ...current, user: { ...current.user, durationFormat: "decimal" } }))
    for (let i = 0; i < 4; i++) await wait(1)
    await wait(5_000)

    for (const [tab, name] of [
      [first, "first"],
      [second, "second"],
    ] as const) {
      expect(tab.latest().user.timeFormat, `the ${name} tab lost the first tab's setting`).toBe("h12")
      expect(tab.latest().user.durationFormat, `the ${name} tab lost the second tab's setting`).toBe("decimal")
    }
  })

  test("a tab that only listens does not send anything back to the tab that changed", async () => {
    const { first, second } = await twoTabs()
    const heard: string[] = []
    const channel = new BroadcastChannel(STORAGE_KEY)
    channel.onmessage = (event: MessageEvent<{ serialised: string }>) => heard.push(event.data.serialised)

    first.apply(describe_("gym", "Gym, legs"))
    for (let i = 0; i < 4; i++) await wait(1)
    channel.close()

    expect(heard.length, "the listening tab repeated what it heard").toBe(1)
    expect(named(second.latest(), "gym")).toBe("Gym, legs")
  })
})
