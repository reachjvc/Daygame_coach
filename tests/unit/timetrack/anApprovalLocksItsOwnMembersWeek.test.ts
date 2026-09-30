/**
 * MY APPROVED WEEK LOCKS MY ENTRIES, AND NOBODY ELSE'S.
 *
 * `lockViolations` looked up `selfMember(state)` whatever entry it was handed, so the
 * approval status consulted was always MINE: once I approved my own week, every other
 * member's entries in that week were locked too, and if I had not approved mine, theirs
 * stayed editable however their own timesheet stood. A timesheet approval is per
 * member; asking about the wrong one is not a stricter rule, it is a different rule.
 *
 * Reported as "defensible in a one-user app, noting it only so it is a decision" — and
 * it is not a decision, it is backwards. Latent while there is one member, and wrong the
 * moment there are two, which is exactly the kind of thing that ships.
 *
 * The lock matters because it is what stops a delete: `deleteEntries` syncs, so a
 * deletion tombstones on every device.
 */

import { describe, expect, test } from "vitest"

import { deleteEntries, lockViolations, setApprovalStatus, splitEntry } from "@/src/timetrack/timetrackService"
import type { TimesheetApproval, TimetrackState } from "@/src/timetrack/types"

import { baseState, entry } from "./helpers"

const NOW_ISO = "2026-08-12T12:00:00.000Z"
const WEEK = "2026-08-10"
const SELF = "10"
const OTHER = "11"

/**
 * Two members, one three-hour entry each in the same week, and the approvals built by
 * `setApprovalStatus` — the function the Manage screen calls.
 *
 * NOT a hand-written approval object. The first version of this file built one
 * literally and gave it four fields `TimesheetApproval` does not have
 * (`workspaceId`, `decidedBy`, `at`, `serverDeletedAt`); vitest does not typecheck, so
 * it passed, and only the typecheck ratchet noticed. This fix is about an IDENTITY — 
 * whose timesheet is consulted — and a fixture that rebuilds the identity alongside
 * the production path is how a green test sat over a broken app for four hours in the
 * workout slice. So the production path builds it.
 */
function workspace(approved: { memberId: string; status: TimesheetApproval["status"] }[]): TimetrackState {
  const base = baseState()
  let state: TimetrackState = {
    ...base,
    workspace: { ...base.workspace, timesheetApprovalsEnabled: true },
    approvals: [],
    entries: [
      entry("mine", "2026-08-12", "09:00", "12:00", { userId: SELF }),
      entry("theirs", "2026-08-12", "13:00", "16:00", { userId: OTHER }),
    ],
  }
  for (const { memberId, status } of approved) {
    state = setApprovalStatus(state, memberId, WEEK, status, NOW_ISO)
  }
  return state
}

/** Reads back as `{memberId, status}` for the helper above. */
function approval(memberId: string, status: TimesheetApproval["status"]) {
  return { memberId, status }
}

describe("when my own week is approved", () => {
  const state = workspace([approval(SELF, "approved")])
  const mine = state.entries[0]
  const theirs = state.entries[1]

  test("my entry is locked", () => {
    expect(lockViolations(state, mine.start, mine.userId)).toHaveLength(1)
  })

  test("and their entry is NOT, because their timesheet is untouched", () => {
    expect(lockViolations(state, theirs.start, theirs.userId)).toEqual([])
  })

  test("so a delete of their entry goes through", () => {
    const result = deleteEntries(state, [theirs.id], NOW_ISO)
    expect(result.violations).toEqual([])
    expect(result.removed.map((e) => e.id)).toEqual(["theirs"])
  })

  test("while a delete of mine is refused, naming the week", () => {
    const result = deleteEntries(state, [mine.id], NOW_ISO)
    expect(result.removed).toEqual([])
    expect(result.violations[0]?.message).toContain(WEEK)
  })
})

describe("when only THEIR week is approved", () => {
  const state = workspace([approval(OTHER, "approved")])
  const mine = state.entries[0]
  const theirs = state.entries[1]

  test("their entry is locked", () => {
    expect(lockViolations(state, theirs.start, theirs.userId)).toHaveLength(1)
  })

  test("and mine is not, which is the half that used to fail the other way", () => {
    expect(lockViolations(state, mine.start, mine.userId)).toEqual([])
  })

  test("a split of their entry is refused", () => {
    expect(splitEntry(state, theirs.id, null, NOW_ISO).error).toContain(WEEK)
  })

  test("and a split of mine is not", () => {
    expect(splitEntry(state, mine.id, null, NOW_ISO).error).toBeNull()
  })
})

describe("a bulk delete across two members", () => {
  test("removes the one it may and names the reason for the other", () => {
    /**
     * The mixed case, which is where a silent partial delete would hide: eight of ten
     * rows vanishing is how somebody discovers this a week later.
     */
    const state = workspace([approval(SELF, "approved")])
    const result = deleteEntries(state, ["mine", "theirs"], NOW_ISO)
    expect(result.removed.map((e) => e.id)).toEqual(["theirs"])
    expect(result.violations).toHaveLength(1)
    expect(result.state.entries.map((e) => e.id)).toEqual(["mine"])
  })
})

describe("the workspace-wide date lock, by contrast", () => {
  test("applies to everybody, because it is about the date and not a timesheet", () => {
    const base = workspace([])
    const state = { ...base, workspace: { ...base.workspace, lockEntriesBefore: "2026-08-31" } }
    for (const e of state.entries) {
      expect(lockViolations(state, e.start, e.userId), `${e.userId} escaped the date lock`).toHaveLength(1)
    }
  })
})
