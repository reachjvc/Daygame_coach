/**
 * A WRITE CHECKED ON THE COPY ON SCREEN, APPLIED TO THE NEWEST ONE.
 *
 * Every tap on the phone's screens goes through here: the change is worked out
 * once on `latest` to learn whether it is refused — said in a toast, and
 * nothing written — and then worked out again inside the update, on `current`,
 * so what the other device did meanwhile stays
 * (`noTapWritesTheWholeWorkspaceBack`). The same shape `EntryDetailModalBody`'s
 * `landOnCurrent` has always had.
 */

import type { PushToast } from "../../hooks/useTimetrack"
import type { SaveViolation, TimetrackState } from "../../types"

export type SetState = (updater: (current: TimetrackState) => TimetrackState) => void

export function landOnCurrent<R extends { state: TimetrackState; violations: SaveViolation[] }>(
  latest: TimetrackState,
  apply: (base: TimetrackState) => R,
  setState: SetState,
  pushToast: PushToast,
): R | null {
  const checked = apply(latest)
  if (checked.violations.length > 0) {
    pushToast(checked.violations[0].message, "error")
    return null
  }
  setState((current) => {
    const applied = apply(current)
    return applied.violations.length > 0 ? current : applied.state
  })
  return checked
}
