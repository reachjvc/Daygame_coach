// @vitest-environment jsdom
/**
 * TWO TABS ON ONE DEVICE, BOTH WITH NO SIGNAL, ONE QUARTER (alpha p9-saves-03).
 *
 * Both tabs share the waiting queue in localStorage. The second tab's change
 * replaced the first tab's waiting answer for the quarter (it had never seen
 * it), and the first tab still said "Saved". Or, when the second tab wrote
 * before the first tab's write had reached it, it wrote its own older copy of
 * the queue over the first tab's answer. Now each write starts from the queue
 * as stored, and an answer made over a waiting one its card never saw is not
 * queued: the card is told, as for a second device ("Keep that one" / "Use
 * mine").
 */

import { act, renderHook, waitFor } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest"

import { AUDIT_QUEUE_KEY, readAuditQueue, writeAuditViewCopy } from "@/src/audit/auditQueue"
import type { AuditView } from "@/src/audit/auditClient"
import { markOf } from "@/src/audit/auditService"
import { useAudit } from "@/src/audit/hooks/useAudit"
import type { AuditAnswer, AuditRun, AuditSlot } from "@/src/audit/types"

const OWNER = "user-1"
const RUN_ID = "00000000-0000-4000-8000-000000000001"
const SLOT_AT = "2026-11-09T15:30:00.000Z"
const run = { id: RUN_ID, startedAt: "2026-11-09T12:00:00.000Z", endsAt: "2026-11-23T12:00:00.000Z", endedAt: null } as unknown as AuditRun
const set2: AuditSlot = { id: "s2", runId: RUN_ID, slotAt: SLOT_AT, activity: "Set 2", energy: 4, growth: 5, avoiding: false, why: null, source: "app", timeEntryId: null }
const view: AuditView = { run, runs: [run], slots: [set2], timeEntries: [], suggestions: [], timezone: "Europe/Copenhagen", now: "2026-11-09T16:00:00.000Z" }

/** A change of Set 2, made on a card that opened on Set 2. */
const change = (activity: string, energy: 2 | 4 = 4): AuditAnswer => ({
  ...set2,
  activity,
  energy,
  answeredAt: "2026-11-09T15:50:00.000Z",
  was: markOf(set2),
})

beforeEach(() => {
  window.localStorage.clear()
  writeAuditViewCopy(window.localStorage, OWNER, view)
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => {
      throw new TypeError("Failed to fetch")
    }),
  )
})
afterEach(() => {
  vi.unstubAllGlobals()
  window.localStorage.clear()
})

async function twoTabs() {
  const one = renderHook(() => useAudit(OWNER))
  const two = renderHook(() => useAudit(OWNER))
  await waitFor(() => expect(one.result.current.view).not.toBeNull())
  await waitFor(() => expect(two.result.current.view).not.toBeNull())
  return { one: one.result, two: two.result }
}

const waiting = () => readAuditQueue(window.localStorage, OWNER).answers.map((a) => a.activity)

describe("two tabs change one quarter with no signal", () => {
  test("after the first tab's write reached the second: the first answer waits, and the second tab is told", async () => {
    const { one, two } = await twoTabs()
    act(() => one.current.answer([change("Tab one offline")]))
    act(() => void window.dispatchEvent(new StorageEvent("storage", { key: AUDIT_QUEUE_KEY })))
    act(() => two.current.answer([change("Tab two offline", 2)]))
    expect(waiting()).toEqual(["Tab one offline"])
    expect(two.current.notKept).toHaveLength(1)
    expect(two.current.notKept[0]).toMatchObject({ answer: { activity: "Tab two offline" }, stored: { activity: "Tab one offline" } })
  })

  test("before it reached the second: the second tab does not write its old copy over the first's answer", async () => {
    const { one, two } = await twoTabs()
    act(() => one.current.answer([change("Tab one offline")]))
    // no storage event yet
    act(() => two.current.answer([change("Tab two offline", 2)]))
    expect(waiting()).toEqual(["Tab one offline"])
    expect(two.current.notKept[0]).toMatchObject({ answer: { activity: "Tab two offline" }, stored: { activity: "Tab one offline" } })
  })

  test("Use mine (sent over the answer it was told about) replaces it", async () => {
    const { one, two } = await twoTabs()
    act(() => one.current.answer([change("Tab one offline")]))
    act(() => two.current.answer([change("Tab two offline", 2)]))
    const told = two.current.notKept[0]
    act(() => two.current.answer([{ ...told.answer, was: told.stored ?? null }]))
    expect(waiting()).toEqual(["Tab two offline"])
    expect(two.current.notKept).toHaveLength(0)
    // what the server had, Set 2, is still what the replacing answer says it replaces
    expect(readAuditQueue(window.localStorage, OWNER).answers[0].was).toEqual(markOf(set2))
  })

  test("one tab changing its own waiting answer again is not a conflict", async () => {
    const { one } = await twoTabs()
    act(() => one.current.answer([change("First go")]))
    const first = readAuditQueue(window.localStorage, OWNER).answers[0]
    act(() => one.current.answer([{ ...change("Second go"), was: markOf(first) }]))
    expect(waiting()).toEqual(["Second go"])
    expect(one.current.notKept).toHaveLength(0)
  })
})
