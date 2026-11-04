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
 * it in the same words.
 */

import type { PushToast } from "../hooks/useTimetrack"
import { serverNowIso } from "../serverClock"
import { keepNeighbour, type NeighbourHeld, type NeighbourMove } from "../timeFixService"
import { formatTimeOfDay } from "../timetrackFormatService"
import type { TimeFormat, TimetrackState } from "../types"

export function announceNeighbours(
  outcome: { moved: NeighbourMove[]; held: NeighbourHeld[] },
  timeFormat: TimeFormat,
  setState: (updater: (current: TimetrackState) => TimetrackState) => void,
  pushToast: PushToast,
) {
  for (const move of outcome.moved) {
    const name = `‘${move.description}’`
    pushToast(
      `Also moved ${name} to ${move.edge === "start" ? "start" : "end"} ${formatTimeOfDay(move.to, timeFormat)}`,
      "info",
      // pressed later, on whatever the workspace is by then; a refusal leaves it as it is
      () =>
        setState((current) => {
          const kept = keepNeighbour(current, move, serverNowIso())
          return kept.violations.length > 0 ? current : kept.state
        }),
      `Keep ${name} as it was`,
    )
  }
  for (const held of outcome.held) {
    pushToast(`Left ‘${held.description}’ as it was: it would have been under a minute. The overlap is marked in the list.`, "info")
  }
}
