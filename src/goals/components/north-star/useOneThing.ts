"use client"

/**
 * THE ONE THING, READ FROM AND WRITTEN TO THE PLAN'S SEASON.
 *
 * It used to be fetched once for the whole flow from `/api/life-answers`, its
 * own tables beside the plan. Since Plans/life-plan-rebuild.md, Phase 3 it is
 * the sentence of the plan's current season: shown from the plan, written into
 * the plan, and saved with the plan. The shape is still `OneThing` from
 * `oneThingService`, so the box and the step that show it did not change.
 */

import { useCallback, useMemo } from "react"
import type { OneThing, OneThingAct } from "@/src/goals/oneThingService"
import { defaultDueOn } from "@/src/goals/oneThingService"
import { currentSeasonOneThing, pastSeasonOneThings, removePastSeason, writeSeasonOneThing } from "@/src/goals/seasonService"
import type { NsPlan } from "@/src/goals/types"

export interface OneThingAccount {
  /** The one in force, or null when nothing has ever been written. */
  current: OneThing | null
  /** The ones before it, newest first. */
  past: OneThing[]
  /** False until the plan has loaded. Nothing should be drawn before it. */
  loaded: boolean
  /** Kept for the shape the box reads; the plan's own load says signed out. */
  signedOut: boolean
  /** Set when the read itself failed, as opposed to there being nothing to read. */
  error: string | null
  /** Nothing to re-read: the plan is the source. Kept for the box's shape. */
  reload: () => Promise<void>
  /** Reword it, move its deadline, or start the next season. Throws the reason it was refused. */
  write: (act: OneThingAct, body: string, dueOn: string | undefined) => Promise<void>
  /** Delete one of the past ones. */
  remove: (id: string) => Promise<void>
  /** The account's today, or null until it is known. */
  today: string | null
}

export function useOneThing(
  plan: NsPlan,
  setPlan: (update: (p: NsPlan) => NsPlan) => void,
  today: string | null,
  timezone: string,
  loaded: boolean,
): OneThingAccount {
  const write = useCallback(
    async (act: OneThingAct, body: string, dueOn: string | undefined) => {
      // The account's plan replaces the one on screen when it lands, so a
      // sentence saved before that would be lost with it.
      if (!today || !loaded) throw new Error("Your plan is still opening. Try again in a moment.")
      const fresh = defaultDueOn(timezone)
      // Asked of the plan on screen for the reason, then applied to the latest.
      const check = writeSeasonOneThing(plan, act, body, dueOn, today, fresh)
      if (!check.ok) throw new Error(check.reason)
      setPlan((p) => {
        const out = writeSeasonOneThing(p, act, body, dueOn, today, fresh)
        return out.ok ? out.plan : p
      })
    },
    [plan, setPlan, today, timezone, loaded],
  )
  const remove = useCallback(async (id: string) => setPlan((p) => removePastSeason(p, id)), [setPlan])
  const reload = useCallback(async () => {}, [])

  return useMemo(
    () => ({
      current: today ? currentSeasonOneThing(plan, today) : null,
      past: today ? pastSeasonOneThings(plan, today) : [],
      loaded: loaded && !!today,
      signedOut: false,
      error: null,
      reload,
      write,
      remove,
      today,
    }),
    [plan, today, loaded, reload, write, remove],
  )
}
