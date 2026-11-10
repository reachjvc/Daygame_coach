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
 *
 * The goals copied before Q4 were shown here, folded, until Phase 7 copied
 * their numbers into the plan and removed the copies.
 */

import type { NsPlan } from "@/src/goals/types"
import { TRACK_COPY } from "@/src/goals/data/northStar"
import { TrackSchedule } from "./TrackSchedule"
import type { TrainingTicks } from "@/src/goals/dayTicks"

export function TrackTab({
  plan,
  today,
  ticks,
  logUnavailable = false,
  onRetryLog,
  onToggleStep,
  onGoToToday,
}: {
  plan: NsPlan
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

    </div>
  )
}
