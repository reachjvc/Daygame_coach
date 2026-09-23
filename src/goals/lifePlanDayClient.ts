"use client"

/**
 * THE BROWSER'S SIDE OF `/api/life-plan/day`.
 *
 * A module rather than a hook, for the same reason `lifePlanClient` next door
 * is one: `NorthStarFlow` is not on the architecture test's fetch allowlist and
 * that allowlist only ever shrinks.
 *
 * WHAT THIS NEVER DOES IS GUESS. A read that fails returns `undefined`, which
 * is not an empty record — `undefined` means "nobody knows" and an empty record
 * means "there is nothing there". Collapsing the two is how a flaky request
 * turns into a year of ticks being written over with nothing.
 */

import type { DayPatch } from "@/src/db/lifePlanDayTypes"
import type { DayRecord } from "./lifePlanDayService"

/** The account's day half, or `undefined` when it could not be read. */
export async function fetchDayRecord(): Promise<DayRecord | undefined> {
  try {
    const res = await fetch("/api/life-plan/day")
    if (!res.ok) return undefined
    const body = (await res.json()) as Partial<DayRecord>
    return {
      daily: body.daily ?? {},
      logged: body.logged ?? {},
      notes: body.notes ?? {},
      journal: body.journal ?? {},
    }
  } catch {
    return undefined
  }
}

export type DaySaveOutcome =
  | { ok: true }
  /**
   * The account has not got some of these ids yet, because the plan holding
   * them has not been saved. Never a silent drop: the caller saves the plan and
   * sends the same day again.
   */
  | { ok: false; planBehind: true; unknown: string[] }
  | { ok: false; planBehind: false; message: string }

/** Send one day. Only the keys present are changed. */
export async function saveDayFromBrowser(patch: DayPatch): Promise<DaySaveOutcome> {
  try {
    const res = await fetch("/api/life-plan/day", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    })
    if (res.ok) return { ok: true }

    const body = (await res.json().catch(() => null)) as { error?: string; unknown?: string[] } | null
    if (res.status === 409 && body?.error === "plan-behind") {
      return { ok: false, planBehind: true, unknown: body.unknown ?? [] }
    }
    return { ok: false, planBehind: false, message: body?.error ?? "Today could not be saved." }
  } catch {
    return { ok: false, planBehind: false, message: "Today could not be saved." }
  }
}

/**
 * Send one day, and if the account has not caught up with the plan, save the
 * plan first and send it once more.
 *
 * ONE retry, and only for `plan-behind`. The common case is not an error at
 * all — add a routine step and tick it, and the plan's own save is still a few
 * seconds away — so `savePlanFirst` is the flow's own save, awaited, rather
 * than a second copy of it here. A second failure is reported: retrying past
 * that would hide a real problem behind a loop.
 */
export async function saveDayCatchingUp(
  patch: DayPatch,
  savePlanFirst: () => Promise<boolean>,
): Promise<DaySaveOutcome> {
  const first = await saveDayFromBrowser(patch)
  if (first.ok || !first.planBehind) return first

  const saved = await savePlanFirst()
  if (!saved) {
    return {
      ok: false,
      planBehind: false,
      message: "Today could not be saved because your plan has not been saved yet.",
    }
  }
  return saveDayFromBrowser(patch)
}
