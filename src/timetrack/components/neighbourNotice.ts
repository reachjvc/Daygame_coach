/**
 * What an edit did to the entry next door, said out loud (D12 in
 * Plans/time-tracker-like-toggl.md).
 *
 * A touching neighbour moves by itself, which is right most of the time and
 * a surprise when it is not — so every move is said, with the way back one
 * tap away: "Also moved ‘Email’ to start 11:55 · Keep ‘Email’ as it was". A
 * neighbour left alone because following would have shrunk it under a minute
 * is said too, with where the overlap now shows.
 *
 * Shared by the detail sheet, the list rows and the calendar, so the three say
 * it in the same words. So is `undoOrSay`, which every toast's Undo goes through.
 */

import type { PushToast } from "../hooks/useTimetrack"
import { serverNowIso } from "../serverClock"
import { keepNeighbour, type NeighbourHeld, type NeighbourMove } from "../timeFixService"
import { formatTimeOfDay } from "../timetrackFormatService"
import type { SaveViolation, TimeFormat, TimetrackState } from "../types"

type SetState = (updater: (current: TimetrackState) => TimetrackState) => void

/**
 * AN UNDO DOES ALL OF ITS CHANGE OR NONE OF IT, AND SAYS WHY WHEN IT IS NONE.
 *
 * Every toast's Undo used to drop a refusal on the floor: `violations.length
 * > 0 ? current : …` kept the workspace and said nothing, so a lock set on
 * another device made Undo a button that did nothing in silence (code review,
 * 2026-11-04). `undo` answers all or nothing on its own (`undoDisplacement`
 * does both halves or neither); this asks it of the workspace as it is when
 * Undo is pressed — `latest`, not the copy the toast was made from — says the
 * refusal, and otherwise applies it to whatever is current.
 */
export function undoOrSay(
  latest: () => TimetrackState,
  undo: (current: TimetrackState) => { state: TimetrackState; violations: SaveViolation[] },
  setState: SetState,
  pushToast: PushToast,
) {
  const refusal = undo(latest()).violations[0]
  if (refusal) {
    pushToast(`Nothing was undone: ${refusal.message}`, "error")
    return
  }
  setState((current) => {
    const done = undo(current)
    return done.violations.length > 0 ? current : done.state
  })
}

export function announceNeighbours(
  outcome: { moved: NeighbourMove[]; held: NeighbourHeld[] },
  timeFormat: TimeFormat,
  setState: SetState,
  pushToast: PushToast,
  /** the workspace as it is when "Keep" is pressed, to say why it cannot be done */
  latest: () => TimetrackState,
) {
  for (const move of outcome.moved) {
    const name = `‘${move.description}’`
    pushToast(
      `Also moved ${name} to ${move.edge === "start" ? "start" : "end"} ${formatTimeOfDay(move.to, timeFormat)}`,
      "info",
      // pressed later, on whatever the workspace is by then
      () => undoOrSay(latest, (current) => keepNeighbour(current, move, serverNowIso()), setState, pushToast),
      `Keep ${name} as it was`,
    )
  }
  for (const held of outcome.held) {
    pushToast(`Left ‘${held.description}’ as it was: it would have been under a minute. The overlap is marked in the list.`, "info")
  }
}
