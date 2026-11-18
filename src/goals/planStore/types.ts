/**
 * THE ONE DOOR TO THE PLAN FOR THE NEW VERSION.
 *
 * Screens read the plan and change it through this and nothing else: they never
 * call `fetch`, never name the copy space, never decide when to save. A later
 * save engine (a queue that survives a reload, a re-read on focus) replaces
 * what sits behind `PlanStore` without a screen noticing.
 */

import type { NsPlan } from "@/src/goals/types"

/** Where the saving stands: the one indicator the bottom bar shows. */
export type SaveStatus = "loading" | "saved" | "saving" | "failed" | "stale" | "offline"

export interface PlanStoreState {
  plan: NsPlan
  /** False until the first read has answered; screens show nothing from the plan before it. */
  loaded: boolean
  status: SaveStatus
  /** Changes made and not yet confirmed by the server. */
  waiting: number
  /** A plain sentence for a failed or stale state, else an empty string. */
  note: string
}

export interface PlanStore {
  getState(): PlanStoreState
  subscribe(listener: () => void): () => void
  /** Change the plan. The screen sees the change at once; the save starts at once and never blocks the caller. */
  update(change: (plan: NsPlan) => NsPlan): void
  /**
   * Change the day half of the plan (ticks, counts, readings, ratings, answers, the day note). The screen sees it at
   * once; the day is sent on its own route, one day at a time, and the plan is saved first when the account has not
   * got an id yet. Never touches the plan's own rows.
   */
  updateDay(change: (plan: NsPlan) => NsPlan): void
  /** Resolve when everything changed so far is confirmed (true) or could not be saved (false). */
  flush(): Promise<boolean>
  /** Try again after a failure. */
  retry(): Promise<boolean>
  /** Read the account's plan again, dropping nothing that is waiting to save (it is saved first). */
  reload(): Promise<void>
}
