/**
 * THE BROWSER'S SIDE OF `/api/life-plan`.
 *
 * A module rather than a hook or a component: screens such as `NorthStarFlow`
 * do not fetch directly; they go through a client module.
 * `lifePlanDayClient` next door works the same way. (`planSnapshotClient` did
 * too, and was deleted on 2026-09-24 with the mirror it served.)
 *
 * WHAT THIS FILE NEVER DOES IS GUESS. A read that fails returns `undefined` —
 * which is not `null`, and the difference is the whole safety design: `null`
 * means "the account has no plan", `undefined` means "nobody knows". Collapsing
 * the two is how a flaky request turns into an overwritten plan.
 */

import type { NsPlan } from "./types"
import type { PlanRows } from "@/src/db/lifePlanTypes"
import { planToRows, rowsToPlan } from "./lifePlanMapper"
import { diffPlanRows, nothingChanged, type PlanChanges } from "./lifePlanDiff"

export interface LoadedPlan {
  /** The plan row's id, when there is one. Null when the account has none. */
  planId: string | null
  plan: NsPlan | null
  /** The rows exactly as the account holds them: what the first save is compared with. */
  rows: PlanRows | null
  revision: number
  /** The counted-goal link per plan-goal UUID, so a push can find it. */
  goalLinks: Record<string, string | null>
  /** The node UUIDs already minted, keyed by the plan's own ids. */
  ids: Map<string, string>
}

/**
 * The account's plan, or `undefined` when it could not be read.
 *
 * Three outcomes and they are all different: a plan, no plan, or no answer.
 */
export async function fetchLifePlan(): Promise<LoadedPlan | undefined> {
  try {
    const res = await fetch("/api/life-plan")
    if (!res.ok) return undefined
    const body = (await res.json()) as {
      plan: PlanRows | null
      revision?: number
      goalLinks?: Record<string, string | null>
    }
    if (!body.plan) return { planId: null, plan: null, rows: null, revision: 0, goalLinks: {}, ids: new Map() }

    return {
      planId: body.plan.plan_id,
      plan: rowsToPlan(body.plan),
      rows: body.plan,
      revision: body.revision ?? 0,
      goalLinks: body.goalLinks ?? {},
      // KEPT SO THE NEXT SAVE REUSES THEM. A node that keeps its UUID keeps its
      // ticks and its journal; re-minting deletes both, silently.
      ids: new Map(body.plan.nodes.map((n) => [n.local_id, n.id])),
    }
  } catch {
    return undefined
  }
}

/** Start a plan row for an account that has none. Undefined when it failed. */
export async function startLifePlan(): Promise<{ id: string; revision: number } | undefined> {
  try {
    const res = await fetch("/api/life-plan", { method: "POST" })
    if (!res.ok) return undefined
    return (await res.json()) as { id: string; revision: number }
  } catch {
    return undefined
  }
}

/**
 * A node's UUID.
 *
 * UUID-SHAPED, because the column is `UUID` and the database refuses anything
 * else. The flow's own `newRunId` next door returns eight characters, which is
 * right for a run id and would have failed every single insert here.
 *
 * The fallback is v4-shaped rather than random text for the same reason: a
 * browser without `crypto.randomUUID` still has to produce something the column
 * will accept.
 */
export function newNodeId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID()
  }
  const hex = (n: number) =>
    Array.from({ length: n }, () => Math.floor(Math.random() * 16).toString(16)).join("")
  const variant = "89ab"[Math.floor(Math.random() * 4)]
  return `${hex(8)}-${hex(4)}-4${hex(3)}-${variant}${hex(3)}-${hex(12)}`
}

export type SaveOutcome =
  /** `rows`: what the account now holds, for the next save to compare with. */
  | { ok: true; revision: number; ids: Map<string, string>; rows?: PlanRows }
  /** Somebody else's device saved first. Never merged, always reported. */
  | { ok: false; stale: true }
  | { ok: false; stale: false; message: string }

/**
 * Send only what changed since the account last accepted the plan.
 *
 * `before` is the ROWS the account holds (as read, then as last accepted),
 * null when nothing is known to be there; `lifePlanDiff.ts` says why rows and
 * not a plan. Nothing changed means nothing is sent and the revision stays: a
 * tick or a journal line makes a new plan object, and sending it anyway made
 * every other device stale for nothing.
 */
export async function saveLifePlanChanges(
  before: PlanRows | null,
  after: NsPlan,
  planId: string,
  revision: number,
  ids: Map<string, string>,
  newId: () => string,
): Promise<SaveOutcome> {
  let changes: PlanChanges
  let rows: PlanRows
  try {
    const context = {
      planId,
      userId: "",
      idFor: (localId: string) => {
        const had = ids.get(localId)
        if (had) return had
        const made = newId()
        ids.set(localId, made)
        return made
      },
    }
    rows = planToRows(after, context)
    changes = diffPlanRows(before, rows)
  } catch (error) {
    // The mapper refuses a plan whose parts share an id, naming the id.
    return { ok: false, stale: false, message: error instanceof Error ? error.message : "This plan could not be saved." }
  }
  if (nothingChanged(changes)) return { ok: true, revision, ids, rows: before ?? rows }

  try {
    const res = await fetch("/api/life-plan", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ changes, revision }),
    })
    if (res.status === 409) return { ok: false, stale: true }
    if (!res.ok) {
      const body = (await res.json().catch(() => null)) as { error?: string } | null
      return { ok: false, stale: false, message: body?.error ?? "The last change could not be saved." }
    }
    const body = (await res.json()) as { revision: number }
    return { ok: true, revision: body.revision, ids, rows }
  } catch {
    return { ok: false, stale: false, message: "The last change could not be saved." }
  }
}

/**
 * Record which counted goal each plan goal became.
 *
 * Sent after a push, keyed by the plan's own ids. Failure is reported rather
 * than thrown: the goals themselves are already on the account by this point,
 * and losing the LINK costs a duplicate on the next device — bad, but not worth
 * throwing away a push that succeeded.
 */
export async function saveGoalLinks(links: Record<string, string | null>): Promise<boolean> {
  if (Object.keys(links).length === 0) return true
  try {
    const res = await fetch("/api/life-plan/goal-link", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ links }),
    })
    return res.ok
  } catch {
    return false
  }
}


/**
 * ARCHIVE A COUNTED GOAL, asked for when its plan goal is removed.
 *
 * Here rather than in the flow because a screen that fetches has to decide what
 * to show when the request fails, and `NorthStarFlow` does not fetch directly.
 * The boolean is the whole contract: the caller removes the plan goal only on
 * true, because doing the two halves independently is how somebody ends up with
 * the plan goal gone, the counted one still running, and no link left to find
 * it by.
 *
 * ARCHIVE, never `?permanent=true`. The row may carry weeks of history, and "I
 * took it out of my plan" is not "throw the record away".
 */
export async function archiveCountedGoal(goalId: string): Promise<boolean> {
  try {
    const res = await fetch(`/api/goals/${goalId}`, { method: "DELETE" })
    return res.ok
  } catch {
    return false
  }
}
