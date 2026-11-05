// @vitest-environment jsdom
/**
 * A LOCKED DAY REFUSES A BULK EDIT, AND SAYS HOW MANY IT KEPT.
 *
 * Found by the heavy-user audit of 2026-11-04 (D1), twice in a real browser: with
 * "Lock time entries on or before" five days back, Select → tick a locked day → set a
 * project in the bulk bar moved all 17 locked entries, and the change reached the
 * account. A collapsed group's project picker on a locked day did the same, while its
 * description field beside it was correctly disabled.
 *
 * `bulkEditEntries` had no lock check at all. The single-row edit (`updateEntry`), Split
 * and Delete all ask `lockViolations` about the entry's own day and owner; this was the
 * one write path that changes an entry's fields and never asked.
 */

import { cleanup, fireEvent, render, screen, within } from "@testing-library/react"
import { useCallback, useState } from "react"
import { afterEach, describe, expect, test } from "vitest"

import { EntryList } from "@/src/timetrack/components/EntryList"
import { bulkEditEntries } from "@/src/timetrack/timetrackService"
import type { TimetrackState } from "@/src/timetrack/types"

import { NOW_ISO, baseState, entry } from "./helpers"

afterEach(cleanup)

const NOW_SEC = Math.floor(new Date(2026, 7, 10, 18, 0, 0).getTime() / 1000)
const LOCK = "2026-08-09"
const LOCK_MESSAGE = `Time entries on or before ${LOCK} are locked`

function lockedWorkspace(entries: TimetrackState["entries"]): TimetrackState {
  const state = baseState({ entries })
  return { ...state, workspace: { ...state.workspace, lockEntriesBefore: LOCK } }
}

describe("bulkEditEntries", () => {
  test("changes the open entries, keeps the locked ones, and names one reason per kept entry", () => {
    const state = lockedWorkspace([
      entry(1, "2026-08-09", "09:00", "10:00", { projectId: null }),
      entry(2, "2026-08-09", "10:00", "11:00", { projectId: null }),
      entry(3, "2026-08-10", "09:00", "10:00", { projectId: null }),
    ])

    const result = bulkEditEntries(state, ["1", "2", "3"], { projectId: "31", billable: false }, NOW_ISO)

    const projectOf = (id: string) => result.state.entries.find((e) => e.id === id)!.projectId
    expect(projectOf("3")).toBe("31")
    expect([projectOf("1"), projectOf("2")], "a locked entry took the bulk edit").toEqual([null, null])
    expect(result.changed).toEqual(["3"])
    expect(result.violations.map((v) => v.message)).toEqual([LOCK_MESSAGE, LOCK_MESSAGE])
  })

  test("a submitted timesheet refuses it too, for that member's week only", () => {
    const base = baseState({
      entries: [
        entry(1, "2026-08-10", "09:00", "10:00", { userId: "10", projectId: null }),
        entry(2, "2026-08-10", "10:00", "11:00", { userId: "11", projectId: null }),
      ],
      // 2026-08-10 is a Monday, and the base workspace's week starts on Monday
      approvals: [{ id: "a1", memberId: "10", weekStart: "2026-08-10", status: "submitted", submittedAt: NOW_ISO, decidedAt: null, note: "" }],
    })
    const state = { ...base, workspace: { ...base.workspace, timesheetApprovalsEnabled: true } }

    const result = bulkEditEntries(state, ["1", "2"], { projectId: "31" }, NOW_ISO)

    expect(result.state.entries.find((e) => e.id === "1")!.projectId, "my submitted week took the edit").toBeNull()
    expect(result.state.entries.find((e) => e.id === "2")!.projectId).toBe("31")
    expect(result.violations).toHaveLength(1)
  })
})

function Harness({ initial, latest, errors }: { initial: TimetrackState; latest: { current: TimetrackState }; errors: string[] }) {
  const [state, setState] = useState(initial)
  latest.current = state
  const update = useCallback((updater: (current: TimetrackState) => TimetrackState) => setState(updater), [])
  return (
    <EntryList
      state={state}
      setState={update}
      nowSec={NOW_SEC}
      pushToast={(text, tone) => {
        if (tone === "error") errors.push(text)
      }}
      onEditEntry={() => {}}
    />
  )
}

function pickProject(trigger: HTMLElement, name: RegExp) {
  fireEvent.click(trigger)
  const search = screen.getByPlaceholderText("Search by project, task or client")
  const panel = search.closest("[data-dropdown-panel]") as HTMLElement
  fireEvent.click(within(panel).getAllByRole("button", { name })[0])
}

describe("on the timer list", () => {
  test("the bulk bar leaves a locked day alone and says how many it kept", () => {
    const latest = { current: null as unknown as TimetrackState }
    const errors: string[] = []
    render(
      <Harness
        initial={lockedWorkspace([
          entry(1, "2026-08-09", "09:00", "10:00", { description: "locked one", projectId: null }),
          entry(2, "2026-08-09", "10:00", "11:00", { description: "locked two", projectId: null }),
          entry(3, "2026-08-10", "09:00", "10:00", { description: "open", projectId: null }),
        ])}
        latest={latest}
        errors={errors}
      />,
    )

    fireEvent.click(screen.getAllByRole("button", { name: "Select" })[0])
    fireEvent.click(screen.getByRole("checkbox", { name: "Select all entries on 2026-08-10" }))
    fireEvent.click(screen.getByRole("checkbox", { name: "Select all entries on 2026-08-09" }))
    expect(screen.getByText("3 selected")).toBeTruthy()

    const bar = screen.getByText("3 selected").parentElement as HTMLElement
    pickProject(within(bar).getAllByRole("button", { name: "Project" })[0], /^Beta/)

    const projectOf = (id: string) => latest.current.entries.find((e) => e.id === id)!.projectId
    expect(projectOf("3")).toBe("31")
    expect([projectOf("1"), projectOf("2")], "the bulk bar changed entries on a locked day").toEqual([null, null])
    expect(errors).toEqual([`2 entries not changed: ${LOCK_MESSAGE}`])
  })

  test("a collapsed group on a locked day keeps its project, and says why", () => {
    const latest = { current: null as unknown as TimetrackState }
    const errors: string[] = []
    render(
      <Harness
        initial={lockedWorkspace([
          entry(1, "2026-08-09", "06:00", "06:10", { description: "Standup", projectId: null }),
          entry(2, "2026-08-09", "06:15", "06:25", { description: "Standup", projectId: null }),
          entry(3, "2026-08-09", "06:30", "06:40", { description: "Standup", projectId: null }),
        ])}
        latest={latest}
        errors={errors}
      />,
    )
    expect(screen.getByRole("button", { name: "Expand group" })).toBeTruthy()

    pickProject(screen.getAllByRole("button", { name: "Project" })[0], /^Alpha/)

    expect(
      latest.current.entries.map((e) => e.projectId),
      "the group's picker moved locked entries to Alpha",
    ).toEqual([null, null, null])
    expect(errors).toEqual([`3 entries not changed: ${LOCK_MESSAGE}`])
  })
})
