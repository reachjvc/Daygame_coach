"use client"

/**
 * Track: the weeks at a glance, and where counting happens.
 *
 * Its number moves whenever a step is added, so it is not named by one here.
 *
 * UNTIL Q4 OF Plans/life-plan-rebuild.md this step COPIED the plan's goals into
 * `user_goals`, the old goals table, and a goal was only counted once copied:
 * Today's "+1" went there. Now Today counts every goal on the day itself, in
 * the plan's own day half, and nothing is copied. What is left here:
 *
 *   - **The schedule**, week by week, ramps included.
 *   - **A pointer to Today**, where the counting is.
 *   - **The goals copied before**, still in the old table with what was counted
 *     on them, shown through the old goals hub, scoped to this plan. This is
 *     the one live place they show, so they stay until the owner decides
 *     (Phase 7). Hidden when nothing was ever copied.
 */

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react"
import type { NsPlan } from "@/src/goals/types"
import { linksToBackfill, pushedGoalIds } from "@/src/goals/northStarTrackService"
import { saveGoalLinks } from "@/src/goals/lifePlanClient"
import { TRACK_COPY } from "@/src/goals/data/northStar"
import { GoalsHubContent } from "@/src/goals/components/GoalsHubContent"
import { TrackSchedule } from "./TrackSchedule"
import type { TrainingTicks } from "@/src/goals/dayTicks"

interface HubGoal {
  id: string
  template_id?: string | null
}

export function TrackTab({
  account,
  plan,
  runId,
  goalLinks = {},
  today,
  ticks,
  logUnavailable = false,
  onRetryLog,
  onToggleStep,
  onGoToToday,
}: {
  /** The account the page was opened for, named on this step's requests (`src/goals/planAccount.ts`). */
  account: string
  plan: NsPlan
  runId: string
  /**
   * WHICH COUNTED GOAL EACH PLAN GOAL BECAME, as the account knows it.
   *
   * Keyed by the plan's own ids. Empty on a browser that has not loaded the
   * account's plan yet, which falls back to the tag — see `pushed` below.
   */
  goalLinks?: Record<string, string>
  today: string
  /**
   * What the training log ticks, BUILT ONCE BY THE FLOW AND HANDED TO EVERY TAB.
   *
   * This tab used to fetch the log and derive these itself, which had two
   * consequences. The small one: Today and Recap could not see them, so the
   * same morning read differently on three tabs. The large one: the derived
   * ticks were passed to the schedule on the `checking` and signed-OUT
   * branches and forgotten on the signed-in one — the only branch a real
   * person sits in — so the feature was dead for everybody it was built for.
   */
  ticks: TrainingTicks
  /** The log could not be read. Said out loud rather than drawn as an untrained week. */
  logUnavailable?: boolean
  onRetryLog?: () => void
  /**
   * Ticking one of today's routine steps off from inside the schedule.
   *
   * The same handler the Today step uses, writing to the same `plan.logged`,
   * because two screens showing the morning routine must not keep two
   * different answers to "did you read your north star".
   */
  onToggleStep: (stepId: string) => void
  /** Where the counting is now (Q4). */
  onGoToToday: () => void
}) {
  /** Null until read; the old block below is drawn only once there is something in it. */
  const [hubGoals, setHubGoals] = useState<HubGoal[] | null>(null)
  const [hubOpen, setHubOpen] = useState(false)

  /*
   * THE OLD GOALS, read only to find the ones this plan copied before Q4. A
   * failed read, or none signed in, simply draws no old block: nothing on this
   * step needs them any more, so it says nothing about them either.
   */
  const loadHub = useCallback(async () => {
    try {
      // Named like every request from this page (`nameEveryRequest`), so a tab
      // left open while somebody else signed in shows none of their goals.
      const res = await fetch("/api/goals")
      if (!res.ok) return
      // The route returns a plain array; a defensive read costs nothing.
      const data = await res.json()
      setHubGoals(Array.isArray(data) ? data : data.goals ?? [])
    } catch {
      /* No old block; see above. */
    }
  }, [])

  useEffect(() => {
    loadHub()
  }, [loadHub])

  /**
   * WRITE DOWN WHAT ONLY THIS BROWSER KNOWS, ONCE.
   *
   * The push has recorded `user_goal_id` since `48fa55b1`, but it records it AT
   * PUSH TIME — so anybody who pushed before that has counted goals and no
   * links, and the fix never reaches them. Measured on the owner's account on
   * 2026-09-26: 50 tagged rows in `user_goals`, 0 of 50 plan goals linked. On
   * this browser the tag's run still matches and everything looks right; on
   * their phone all fifty read as never pushed and pushing again would make a
   * second copy of every one.
   *
   * The tag IS the proof. It just lives in one browser's localStorage instead of
   * on the account, so the browser that can still read it says so. One device
   * heals every other one, with no migration and nothing deleted.
   *
   * Guarded by a ref rather than by a dependency: `goalLinks` is the flow's
   * state and does not change when this writes, so keying the effect on it
   * would send the same map every time the hub reloaded.
   */
  const backfilled = useRef(false)
  useEffect(() => {
    if (backfilled.current || !hubGoals || hubGoals.length === 0) return
    const missing = linksToBackfill(runId, hubGoals, goalLinks)
    if (Object.keys(missing).length === 0) return
    backfilled.current = true
    /* Not awaited and not reported: nothing the person did is waiting on it, and
       a failure costs them only what they already have — the next load tries
       again. The push's own link write is the one that says so on screen,
       because there a failure means a duplicate on the next device. */
    void saveGoalLinks(missing, account)
  }, [hubGoals, goalLinks, runId, account])

  /**
   * The hub below shows THIS plan, not the account.
   *
   * Memoised because it is a prop the hub's fetch depends on; a fresh object
   * every render would put it in a refetch loop.
   */
  // One place owns "is this already over there" — see `pushedGoalIds`.
  const pushed = useMemo(() => pushedGoalIds(runId, hubGoals ?? [], goalLinks), [runId, hubGoals, goalLinks])

  /**
   * The hub below shows THE ROWS THIS PLAN PUSHED, by id.
   *
   * It narrowed by the `ns:<run>:` tag prefix, and the run is minted in one
   * browser — so on a second device this list was EMPTY underneath a step that
   * had just said those goals were tracked. The ids come from `pushedGoalIds`,
   * which reads the account's links, so every device sees the same list.
   */
  const hubScope = useMemo(
    () => ({
      goalIds: [...pushed.values()],
      title: TRACK_COPY.hubTitle,
      subtitle: TRACK_COPY.hubHelp,
    }),
    [pushed]
  )
  return (
    <div className="space-y-5">
      {/* What you will be doing comes first. The training log's props are
          required, so no branch can draw the schedule without it again (a
          signed-in branch once did, and the merge it performs never ran). */}
      <TrackSchedule
        plan={plan}
        today={today}
        onToggleStep={onToggleStep}
        ticks={ticks}
        logUnavailable={logUnavailable}
        onRetryLog={onRetryLog}
      />

      {/* COUNTING HAPPENS ON TODAY NOW (Plans/life-plan-rebuild.md, Q4). This
          step used to copy the plan's goals into the old goals table, and a
          goal was only counted once copied; now "Log one" on Today counts any
          goal, on the day, with the plan. Nothing is copied any more. */}
      <section className="rounded-2xl border border-white/10 bg-white/[0.02] px-5 py-4">
        <h2 className="text-sm font-semibold text-zinc-200">{TRACK_COPY.title}</h2>
        <p className="text-[11.5px] text-zinc-400 mt-1 leading-relaxed max-w-prose">{TRACK_COPY.help}</p>
        <button
          onClick={onGoToToday}
          className="inline-block mt-3 text-[12px] px-3 py-1.5 rounded-full border border-violet-400/40 bg-violet-500/10 text-violet-100 hover:bg-violet-500/20 transition-colors"
        >
          {TRACK_COPY.toToday}
        </button>
      </section>

      {/* THE GOALS COPIED HERE BEFORE Q4, still on the old table with what was
          counted on them, and this is the one live place they show. Kept, not
          removed: what happens to them is the owner's call (Phase 7). Folded,
          because counting there no longer reaches Today, and the hub inside is
          the real one, scoped to this plan, with its own buttons. */}
      {pushed.size > 0 && (
        <section className="rounded-2xl border border-white/10 bg-white/[0.02] overflow-hidden">
          <button
            onClick={() => setHubOpen((v) => !v)}
            aria-expanded={hubOpen}
            className="w-full text-left px-5 py-4 hover:bg-white/[0.02] transition-colors"
          >
            <span className="block text-sm font-semibold text-zinc-200">{TRACK_COPY.hubTitle} ({pushed.size})</span>
            <span className="block text-[11.5px] text-zinc-400 mt-1 leading-relaxed max-w-prose">{TRACK_COPY.hubHelp}</span>
          </button>
          {hubOpen && (
            <Suspense fallback={<p className="px-5 py-6 text-sm text-zinc-500">Opening your goals…</p>}>
              <GoalsHubContent scope={hubScope} />
            </Suspense>
          )}
        </section>
      )}
    </div>
  )
}
