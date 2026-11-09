/**
 * AN OPEN CALENDAR BOX FOLLOWS WHAT THE OTHER DEVICE CHANGED.
 *
 * On the PC the box beside a calendar block copies the entry when it opens.
 * The phone renamed the same entry while the box was open, and the box kept
 * showing the old name (audit `offline/pc-offline.spec.ts:85`, bug 2 of
 * Plans/time-tracker-leftovers.md). Save already wrote only what was changed
 * in the box, so the account was right; only the screen was wrong.
 *
 * D-FOLLOW: a field not touched since the box opened follows the newest copy;
 * a field typed in keeps the typing, and Save writes it.
 */

import { describe, expect, test } from "vitest"

import { followNewest, type BoxFields } from "@/src/timetrack/calendarBoxService"

const at = (h: number, m = 0) => new Date(2026, 7, 10, h, m).toISOString()

const opened: BoxFields = {
  draft: { description: "Shared", projectId: null, taskId: null, tagIds: [], billable: false },
  pair: { start: at(9), stop: at(10) },
}

describe("an open box, and a newer copy of its entry", () => {
  test("an untouched name follows the other device's rename", () => {
    const newest: BoxFields = { ...opened, draft: { ...opened.draft, description: "Shared, named on the phone" } }
    const next = followNewest(opened, opened, newest)
    expect(next.shown.draft.description).toBe("Shared, named on the phone")
    expect(next.opened.draft.description, "Save would write the old name back").toBe("Shared, named on the phone")
  })

  test("a name typed in the box keeps the typing, and Save still writes it", () => {
    const typing: BoxFields = { ...opened, draft: { ...opened.draft, description: "Typed on the PC" } }
    const newest: BoxFields = { ...opened, draft: { ...opened.draft, description: "Shared, named on the phone" } }
    const next = followNewest(opened, typing, newest)
    expect(next.shown.draft.description).toBe("Typed on the PC")
    expect(next.shown.draft.description).not.toBe(next.opened.draft.description)
  })

  test("an untouched start and end follow; a moved end stays, and the other edge still follows", () => {
    const newest: BoxFields = { ...opened, pair: { start: at(8, 30), stop: at(10, 15) } }
    expect(followNewest(opened, opened, newest).shown.pair).toEqual({ start: at(8, 30), stop: at(10, 15) })

    const movedEnd: BoxFields = { ...opened, pair: { start: at(9), stop: at(11) } }
    const next = followNewest(opened, movedEnd, newest)
    expect(next.shown.pair, "the end typed here stays; the start the phone moved follows").toEqual({ start: at(8, 30), stop: at(11) })
  })

  test("a start typed here, then the other device moves the end: Save keeps the other device's end", () => {
    const typedStart: BoxFields = { ...opened, pair: { start: at(9, 30), stop: at(10) } }
    const newest: BoxFields = { ...opened, pair: { start: at(9), stop: at(18) } }
    const next = followNewest(opened, typedStart, newest)
    expect(next.shown.pair).toEqual({ start: at(9, 30), stop: at(18) })
    expect(next.shown.pair.stop, "Save writes what differs from opened: the end must not").toBe(next.opened.pair.stop)
  })

  test("a start typed into a running entry, then the other device stops it: the box shows it stopped", () => {
    const running: BoxFields = { ...opened, pair: { start: at(9), stop: null } }
    const typedStart: BoxFields = { ...running, pair: { start: at(9, 30), stop: null } }
    const newest: BoxFields = { ...running, pair: { start: at(9), stop: at(11) } }
    expect(followNewest(running, typedStart, newest).shown.pair).toEqual({ start: at(9, 30), stop: at(11) })
  })

  test("a running entry the other device stopped shows as stopped", () => {
    const running: BoxFields = { ...opened, pair: { start: at(9), stop: null } }
    const newest: BoxFields = { ...running, pair: { start: at(9), stop: at(9, 40) } }
    const next = followNewest(running, running, newest)
    expect(next.shown.pair.stop).toBe(at(9, 40))
    expect(next.opened.pair.stop, "Save would set it running again").toBe(at(9, 40))
  })

  test("an untouched project and tags follow; a picked project stays", () => {
    const newest: BoxFields = { ...opened, draft: { ...opened.draft, projectId: "p2", taskId: "t2", tagIds: ["a", "b"] } }
    const followed = followNewest(opened, opened, newest).shown.draft
    expect([followed.projectId, followed.taskId, followed.tagIds]).toEqual(["p2", "t2", ["a", "b"]])

    const picked: BoxFields = { ...opened, draft: { ...opened.draft, projectId: "p1" } }
    const kept = followNewest(opened, picked, newest).shown.draft
    expect([kept.projectId, kept.taskId, kept.tagIds]).toEqual(["p1", null, ["a", "b"]])
  })

  test("billable follows the same way", () => {
    const newest: BoxFields = { ...opened, draft: { ...opened.draft, billable: true } }
    expect(followNewest(opened, opened, newest).shown.draft.billable).toBe(true)
    const ticked: BoxFields = { ...opened, draft: { ...opened.draft, billable: true } }
    const off: BoxFields = { ...opened, draft: { ...opened.draft, billable: false, description: "x" } }
    expect(followNewest(opened, ticked, off).shown.draft.billable).toBe(true)
  })

  test("nothing newer: the same objects come back, so the box does not redraw", () => {
    const typing: BoxFields = { ...opened, draft: { ...opened.draft, description: "Typed" } }
    const next = followNewest(opened, typing, opened)
    expect(next.shown).toBe(typing)
    expect(next.opened).toBe(opened)
  })
})
