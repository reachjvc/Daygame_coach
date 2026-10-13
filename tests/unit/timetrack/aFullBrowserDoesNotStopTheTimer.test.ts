// @vitest-environment jsdom
/**
 * A full or blocked browser storage does not take the tracker down.
 *
 * Found 2026-10-13 when the browser tests moved from the /test/toggl bench to
 * the product page: with storage full, starting a timer threw an uncaught
 * QuotaExceededError from the device id, inside the sync effect, and the page
 * fell over before its own "could not save to this browser" warning could show.
 */
import { afterEach, describe, expect, test, vi } from "vitest"
import { stateToRows } from "@/src/timetrack/timetrackMapperService"
import { startTimer } from "@/src/timetrack/timetrackService"
import { NOW_ISO, baseState } from "./helpers"

const draft = { description: "deep work", projectId: "30", taskId: null, tagIds: [], billable: false }

afterEach(() => vi.restoreAllMocks())

describe("a running timer when the browser will not store anything", () => {
  test("still turns into rows, naming one device every time", () => {
    vi.spyOn(Storage.prototype, "getItem").mockReturnValue(null)
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new DOMException("The quota has been exceeded.", "QuotaExceededError")
    })
    const { state } = startTimer(baseState(), draft, NOW_ISO)

    const first = stateToRows(state, "u1").timetrack_entries.find((r) => r.stopped_at === null)
    const second = stateToRows(state, "u1").timetrack_entries.find((r) => r.stopped_at === null)

    expect(first?.running_device_id).toMatch(/\S/)
    expect(second?.running_device_id).toBe(first?.running_device_id)
  })

  test("and when reading is blocked too", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new DOMException("The operation is insecure.", "SecurityError")
    })
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new DOMException("The operation is insecure.", "SecurityError")
    })
    const { state } = startTimer(baseState(), draft, NOW_ISO)

    expect(() => stateToRows(state, "u1")).not.toThrow()
  })
})
