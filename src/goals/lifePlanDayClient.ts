"use client"

/**
 * THE BROWSER'S SIDE OF `/api/life-plan/day`.
 *
 * A module rather than a hook, for the same reason `lifePlanClient` next door
 * is one: screens such as `NorthStarFlow` do not call `fetch` themselves; they
 * go through a client module.
 *
 * WHAT THIS NEVER DOES IS GUESS. A read that fails returns `undefined`, which
 * is not an empty record — `undefined` means "nobody knows" and an empty record
 * means "there is nothing there". Collapsing the two is how a flaky request
 * turns into a year of ticks being written over with nothing.
 */

import type { DayPatch } from "@/src/db/lifePlanDayTypes"
import type { DayRecord } from "./lifePlanDayService"
import { claimKeepalive } from "./keepaliveBudget"
import { ACCOUNT_CHANGED_MESSAGE, accountHeaders, planApiUrl, refusedForAccount } from "./planAccount"

/** The account's day half, or `undefined` when it could not be read. */
export async function fetchDayRecord(account: string): Promise<DayRecord | undefined> {
  try {
    const res = await fetch(planApiUrl("/api/life-plan/day", account), { headers: accountHeaders(account) })
    if (refusedForAccount(res, account) || !res.ok) return undefined
    const body = (await res.json()) as Partial<DayRecord>
    return {
      daily: body.daily ?? {},
      logged: body.logged ?? {},
      notes: body.notes ?? {},
      journal: body.journal ?? {},
      numbers: body.numbers ?? {},
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
  | { ok: false; planBehind: false; message: string; limit?: true }

/** Send one day. Only the keys present are changed. */
export async function saveDayFromBrowser(patch: DayPatch, account: string): Promise<DaySaveOutcome> {
  try {
    const res = await fetch(planApiUrl("/api/life-plan/day", account), {
      method: "PUT",
      headers: { "Content-Type": "application/json", ...accountHeaders(account) },
      body: JSON.stringify(patch),
    })
    if (refusedForAccount(res, account)) return { ok: false, planBehind: false, message: ACCOUNT_CHANGED_MESSAGE }
    if (res.ok) return { ok: true }

    const body = (await res.json().catch(() => null)) as { error?: string; unknown?: string[] } | null
    if (res.status === 409 && body?.error === "plan-behind") {
      return { ok: false, planBehind: true, unknown: body.unknown ?? [] }
    }
    const message = body?.error ?? "Today could not be saved."
    // 422: a text over its cap. The same day can never be saved as it is.
    return res.status === 422 ? { ok: false, planBehind: false, message, limit: true } : { ok: false, planBehind: false, message }
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
  account: string,
): Promise<DaySaveOutcome> {
  const first = await saveDayFromBrowser(patch, account)
  if (first.ok || !first.planBehind) return first

  const saved = await savePlanFirst()
  if (!saved) {
    return {
      ok: false,
      planBehind: false,
      message: "Today could not be saved because your plan has not been saved yet.",
    }
  }
  return saveDayFromBrowser(patch, account)
}

/** One part of a day sent on leave: small, so several fit the page's shared keepalive budget (`keepaliveBudget.ts`). */
const LEAVE_PART_BYTES = 20_000

/**
 * A day's patch as one or more patches that each fit `LEAVE_PART_BYTES`.
 *
 * Split by key, then by entry, so every part is a valid patch on its own: the
 * route changes only the keys a patch carries. A single entry bigger than the
 * cap (a journal line of 30 KB) goes alone and the browser decides.
 */
export function splitDayPatch(patch: DayPatch, limit = LEAVE_PART_BYTES): DayPatch[] {
  const size = (p: DayPatch) => new Blob([JSON.stringify(p)]).size
  if (size(patch) <= limit) return [patch]
  const parts: DayPatch[] = []
  const { date, note, asked, ...maps } = patch
  if (note !== undefined) parts.push({ date, note })
  for (const [key, map] of Object.entries(maps) as [keyof DayPatch, Record<string, unknown> | undefined][]) {
    if (!map) continue
    let current: Record<string, unknown> = {}
    const flush = () => {
      if (Object.keys(current).length === 0) return
      const part = { date, [key]: current } as unknown as DayPatch
      if (key === "journal" && asked) {
        part.asked = Object.fromEntries(Object.keys(current).filter((id) => asked[id] !== undefined).map((id) => [id, asked[id]]))
      }
      parts.push(part)
      current = {}
    }
    for (const [id, value] of Object.entries(map)) {
      current[id] = value
      const trial = { date, [key]: current } as unknown as DayPatch
      if (key === "journal" && asked) trial.asked = Object.fromEntries(Object.keys(current).filter((k) => asked[k] !== undefined).map((k) => [k, asked[k]]))
      if (size(trial) > limit && Object.keys(current).length > 1) {
        delete current[id]
        flush()
        current[id] = value
      }
    }
    flush()
  }
  return parts
}

/**
 * Send one day as the page goes away (Plans/life-plan-rebuild.md, Q4).
 *
 * `keepalive` lets the browser finish the request after the page is gone. The
 * browser allows 64 KiB of those IN TOTAL across the page, shared with the plan
 * save sent beside this one, so each part claims its bytes from one budget
 * (`claimKeepalive`) and a part that does not fit goes as a plain request. A
 * day bigger than one part is sent in parts (`splitDayPatch`). No answer is
 * waited for and nothing is retried: the page is leaving. The values are the
 * day's own, never additions, so a day sent here and again by the usual save
 * lands the same.
 */
export function sendDayOnLeave(patch: DayPatch, account: string): void {
  for (const part of splitDayPatch(patch)) {
    try {
      const body = JSON.stringify(part)
      const release = claimKeepalive(new Blob([body]).size)
      void fetch(planApiUrl("/api/life-plan/day", account), {
        method: "PUT",
        headers: { "Content-Type": "application/json", ...accountHeaders(account) },
        body,
        keepalive: release !== null,
      })
        .catch(() => {})
        .finally(() => release?.())
    } catch {
      /* The page is going; there is nobody left to tell. */
    }
  }
}
