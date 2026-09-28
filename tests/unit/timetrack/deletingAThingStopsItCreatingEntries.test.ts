/**
 * DELETING A PROJECT HAS TO STOP THE THINGS THAT CREATE FUTURE ENTRIES FROM USING IT.
 *
 * `deleteProject` unhooked the existing entries and left the autotracker rules and the
 * favourites holding the dead id. And because deletes are SOFT on the server
 * (`deleted_at`), the `on delete cascade` on `timetrack_autotracker_rules.project_id`
 * never fires — the foreign key is satisfied, the row is accepted, and the reference
 * simply does not resolve.
 *
 * The cost is invisible, which is what makes it worth a test. A rule matching "invoice"
 * kept `projectId: "30"`; `applyAutotracker` handed it to the timer bar; `startTimer`
 * accepted it with no violations; and every entry created afterwards carried a project
 * id nothing resolves. The entry list renders that as "No project" — indistinguishable
 * from a rule that deliberately has none — while the entry's money falls through to the
 * member or workspace rate instead of the project rate. So the whole point of nulling
 * `projectId` on the existing entries was bypassed for everything made after the delete.
 *
 * `deleteTag` has always stripped its own references from entries and from autotracker
 * tag lists. These two paths had not.
 */

import { describe, expect, test } from "vitest"

import { createManualEntry, deleteClient, deleteMember, deleteProject, deleteTag, deleteTask } from "@/src/timetrack/timetrackService"
import type { TimetrackState } from "@/src/timetrack/types"

import { NOW_ISO, baseState } from "./helpers"

/** The fixture's project 30 owns tasks 40 and 41. A rule and a favourite use both. */
function withARuleAndAFavourite(): TimetrackState {
  const base = baseState()
  return {
    ...base,
    autotrackers: [{ id: "at1", keyword: "invoice", projectId: "30", taskId: "40", tagIds: ["50"], enabled: true }],
    favorites: [
      {
        id: "fav1",
        at: NOW_ISO,
        draft: { description: "invoicing", projectId: "30", taskId: "40", tagIds: ["50"], billable: true },
      },
    ],
  } as never as TimetrackState
}

describe("deleting a project", () => {
  test("stops the autotracker rule handing out its id", () => {
    const after = deleteProject(withARuleAndAFavourite(), "30")
    const rule = after.autotrackers[0]
    expect(rule, "the rule was removed entirely, which is not what was asked").toBeTruthy()
    expect(rule.projectId, "the rule still points at a project nothing resolves").toBeNull()
    expect(rule.taskId, "the rule still points at a task that went with the project").toBeNull()
    expect(rule.keyword, "the rule itself should survive — only its dead references go").toBe("invoice")
  })

  test("and stops the favourite handing it out", () => {
    const after = deleteProject(withARuleAndAFavourite(), "30")
    expect(after.favorites[0].draft.projectId).toBeNull()
    expect(after.favorites[0].draft.taskId).toBeNull()
    expect(after.favorites[0].draft.description, "the favourite itself should survive").toBe("invoicing")
  })

  test("leaves references to OTHER projects alone", () => {
    /**
     * The other half: a fix that cleared every reference would quietly break every
     * other rule in the workspace.
     */
    const state = withARuleAndAFavourite()
    const after = deleteProject(state, "31") // the fixture's other project
    expect(after.autotrackers[0].projectId).toBe("30")
    expect(after.autotrackers[0].taskId).toBe("40")
    expect(after.favorites[0].draft.projectId).toBe("30")
  })

  test("and keeps the tags, which are not the project's to take", () => {
    const after = deleteProject(withARuleAndAFavourite(), "30")
    expect(after.autotrackers[0].tagIds).toEqual(["50"])
    expect(after.favorites[0].draft.tagIds).toEqual(["50"])
  })
})

describe("deleting a task", () => {
  test("stops the rule and the favourite handing out its id", () => {
    const after = deleteTask(withARuleAndAFavourite(), "40")
    expect(after.autotrackers[0].taskId).toBeNull()
    expect(after.favorites[0].draft.taskId).toBeNull()
    // the project is still there, so the reference to it stays
    expect(after.autotrackers[0].projectId).toBe("30")
  })

  test("and leaves a reference to a different task alone", () => {
    const after = deleteTask(withARuleAndAFavourite(), "41")
    expect(after.autotrackers[0].taskId).toBe("40")
  })
})

describe("copying the same calendar event twice", () => {
  /**
   * `timetrack_entries_source_event_uniq` is
   * `unique (user_id, source_event_id) where source_event_id is not null and
   * deleted_at is null`, and the migration's own comment says it exists "so
   * re-importing the same meeting twice cannot create two entries". Nothing on the
   * client enforced it: the calendar renders "Copy as a time entry" whether or not
   * the event has already been copied, and event ids are deterministic
   * (`${calendarId}:${uid}:${start}`), so a re-sync offers the same button again.
   *
   * Two clicks doubled the day's tracked time locally, and the second row was refused
   * by the server, dropped from the queue and recorded as sent — so it existed on that
   * browser only and vanished on the next device, with an error toast naming the
   * meeting.
   */
  const draft = { description: "standup", projectId: null, taskId: null, tagIds: [], billable: false }
  const times = { start: "2026-08-10T09:00:00.000Z", stop: "2026-08-10T09:30:00.000Z" }

  test("is refused, and says which entry it already is", () => {
    const first = createManualEntry(baseState(), { draft, ...times, sourceEventId: "cal:uid:1" }, NOW_ISO)
    expect(first.violations, "the first copy should be fine").toEqual([])

    const second = createManualEntry(first.state, { draft, ...times, sourceEventId: "cal:uid:1" }, NOW_ISO)
    expect(second.violations.length, "a second copy of the same meeting was accepted").toBe(1)
    expect(second.violations[0].message).toContain("already a time entry")
    expect(second.entry, "and no entry was created").toBeNull()
  })

  test("but a different event from the same calendar is fine", () => {
    const first = createManualEntry(baseState(), { draft, ...times, sourceEventId: "cal:uid:1" }, NOW_ISO)
    const other = createManualEntry(first.state, { draft, ...times, sourceEventId: "cal:uid:2" }, NOW_ISO)
    expect(other.violations).toEqual([])
  })

  test("and an ordinary manual entry is never blocked by this", () => {
    /**
     * The rule is keyed on `source_event_id`, and a hand-made entry has none — so two
     * identical manual entries stay legal, which they are: people do the same
     * half-hour twice.
     */
    const first = createManualEntry(baseState(), { draft, ...times }, NOW_ISO)
    const second = createManualEntry(first.state, { draft, ...times }, NOW_ISO)
    expect(second.violations).toEqual([])
  })
})

describe("a saved report lets go of what has been deleted", () => {
  /**
   * `savedReports[].config.filters` is the fourth place an id list lives, after the
   * entries, the autotracker rules and the favourites — and none of the five delete
   * functions touched it. `applyFilters` then matches nothing, so the person opens
   * "Billable, October" and it is empty, while the filter count still reads one and the
   * dropdown shows nothing selected because the id is no longer in the workspace.
   *
   * Rounds 5 and 6 closed this class for the other three holders one at a time, each
   * time thinking it was closed. One helper owns it now, so the next id list added to a
   * saved report has one place to be swept rather than five.
   */
  function withASavedReport(): TimetrackState {
    const base = baseState()
    return {
      ...base,
      savedReports: [
        {
          id: "sr1",
          name: "Billable, October",
          at: NOW_ISO,
          config: {
            filters: {
              range: { start: "2026-10-01", end: "2026-10-31" },
              clientIds: ["20"], projectIds: ["30"], taskIds: ["40"], tagIds: ["50"], memberIds: ["11"],
              billable: "all", description: "",
            },
          },
        },
      ],
    } as never as TimetrackState
  }

  const filtersAfter = (state: TimetrackState) => state.savedReports[0].config.filters as unknown as Record<string, string[]>

  test.each([
    ["deleteProject", "30", "projectIds"],
    ["deleteTask", "40", "taskIds"],
    ["deleteTag", "50", "tagIds"],
    ["deleteClient", "20", "clientIds"],
    ["deleteMember", "11", "memberIds"],
  ])("%s takes its id out of the filter", (fn, id, field) => {
    const deletes: Record<string, (s: TimetrackState, i: string) => TimetrackState> = {
      deleteProject, deleteTask, deleteTag, deleteClient, deleteMember,
    }
    const after = deletes[fn](withASavedReport(), id)
    expect(filtersAfter(after)[field], `the report still filters on a ${field.slice(0, -3)} that is gone`).toEqual([])
  })

  test("and leaves the filters it has no business touching", () => {
    /**
     * The other half: a sweep that cleared the whole filter set would pass every case
     * above while quietly emptying somebody's saved report.
     */
    const after = deleteProject(withASavedReport(), "30")
    const f = filtersAfter(after)
    expect(f.tagIds).toEqual(["50"])
    expect(f.clientIds).toEqual(["20"])
    expect(f.memberIds).toEqual(["11"])
    expect(after.savedReports[0].name).toBe("Billable, October")
  })

  test("and a report that never mentioned it is the same object", () => {
    const state = withASavedReport()
    const after = deleteTag(state, "51") // a tag the report does not filter on
    expect(after.savedReports[0]).toBe(state.savedReports[0])
  })
})
