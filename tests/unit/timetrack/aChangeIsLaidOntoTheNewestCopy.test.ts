/**
 * A CHANGE WORKED OUT ON THE COPY ON SCREEN IS LAID ONTO THE NEWEST COPY.
 *
 * `layOnto(drawn, next)` is the one rule every tap in the tracker writes with
 * (see `tabMergeService`). A tap is worked out on the workspace the page last
 * drew; the account's answer to a check may be waiting, handed over and not
 * drawn yet. Writing the tap whole put the drawn copy back over the answer: a
 * timer the PC had stopped ran again, everywhere. Here the rule itself.
 */

import { describe, expect, test } from "vitest"

import { layOnto } from "@/src/timetrack/tabMergeService"
import { epochSeconds } from "@/src/timetrack/timetrackFormatService"
import { applyDraftPatch, createProject, startTimer, stopTimer, updateEntry } from "@/src/timetrack/timetrackService"
import type { EntryDraft, TimetrackState } from "@/src/timetrack/types"

import { baseState } from "./helpers"

const at = (h: number, m = 0) => new Date(2026, 7, 10, h, m).toISOString()
const NOON = at(12)
const draft: EntryDraft = { description: "Call", projectId: null, taskId: null, tagIds: [], billable: false }

/** "Call", running since nine: what the phone drew */
function drawn(): { state: TimetrackState; id: string } {
  const started = startTimer(baseState({ entries: [] }), draft, at(9))
  return { state: started.state, id: started.entry.id }
}

describe("a tap laid onto a copy the other device changed meanwhile", () => {
  test("keeps the other device's stop, and the field the tap changed", () => {
    const { state: screen, id } = drawn()
    const pcStopped = stopTimer(screen, at(11)).state
    const picked = applyDraftPatch(screen, draft, { projectId: "30" }, NOON).state

    const landed = layOnto(screen, picked)(pcStopped)
    const call = landed.entries.find((e) => e.id === id)!

    expect(call.stop, "the pick started the call again that the PC had stopped").toBe(at(11))
    expect(call.duration).toBe(2 * 3600)
    expect(call.projectId, "the pick itself was lost").toBe("30")
  })

  test("keeps what the tap added: a project the picker just created", () => {
    const { state: screen, id } = drawn()
    const pcStopped = stopTimer(screen, at(11)).state
    const created = createProject(screen, { name: "Writing" }, NOON)
    const picked = applyDraftPatch(created.state, draft, { projectId: created.id }, NOON).state

    const landed = layOnto(screen, picked)(pcStopped)

    expect(landed.projects.map((p) => p.name), "the new project was lost").toContain("Writing")
    expect(landed.entries.find((e) => e.id === id)).toMatchObject({ stop: at(11), projectId: created.id })
  })

  test("never leaves an entry stopped with a running length", () => {
    const { state: screen, id } = drawn()
    const pcStopped = stopTimer(screen, at(11)).state
    // the tap moved the start of what it took to be a running timer
    const moved = updateEntry(screen, id, { start: at(10) }, NOON).state

    const call = layOnto(screen, moved)(pcStopped).entries.find((e) => e.id === id)!

    expect(call.start).toBe(at(10))
    expect(call.stop).toBe(at(11))
    expect(call.duration, "a stopped entry with a negative length reads as running").toBe(
      epochSeconds(at(11)) - epochSeconds(at(10)),
    )
  })

  test("is the tap's own result when nothing newer was waiting", () => {
    const { state: screen } = drawn()
    const picked = applyDraftPatch(screen, draft, { projectId: "30" }, NOON).state

    expect(layOnto(screen, picked)(screen)).toBe(picked)
  })

  test("changes nothing when the tap changed nothing", () => {
    const { state: screen } = drawn()
    const pcStopped = stopTimer(screen, at(11)).state

    expect(layOnto(screen, screen)(pcStopped)).toBe(pcStopped)
  })
})
