"use client"

import { BackLink } from "@/components/BackLink"

/**
 * THE HEADER OF THE PLAN PAGE: the way back, "start over" with its two resets, the title and its line.
 *
 * Moved out of `NorthStarFlow` unchanged (Plans/plan-new-from-real.md, Phase 4) so `/plan` and `/plan/new` draw the
 * same block. The caller keeps the "Clear what?" state and the two resets: this only draws.
 */
export function PlanHeader({
  backHref,
  backLabel,
  confirmReset,
  setConfirmReset,
  onResetGoals,
  onReset,
}: {
  backHref: string
  backLabel: string
  confirmReset: boolean
  setConfirmReset: (open: boolean) => void
  onResetGoals: () => void
  onReset: () => void
}) {
  return (
    <>
    <div className="flex items-center justify-between gap-3 mb-6">
      {/* The props stay, as the fallback: a return address on the link
          wins, so arriving here from the tracking page goes back there. */}
      <BackLink
        fallback={backHref}
        fallbackLabel={backLabel}
        className="inline-flex items-center gap-1.5 text-[12px] text-zinc-500 hover:text-white transition-colors"
      />
      {confirmReset ? (
        /* Two resets, because they are asked for at different moments. The
           goals and the season are downstream of a decision and get redone
           often; the 10s, the values and the north star took an hour and
           are still true when the goals are wrong. */
        <span className="flex flex-wrap items-center gap-2 text-[11px]">
          <span className="text-zinc-400">Clear what?</span>
          <button onClick={onResetGoals} className="text-amber-200 hover:text-amber-100">
            the goals and the season, keep my 10s
          </button>
          {/* "everything" has always included the day half — every rating,
              every tick, every day note and the whole journal — and never
              said so. It is the part that cannot be rewritten from memory. */}
          <button onClick={onReset} className="text-rose-300 hover:text-rose-200">
            everything, including my journal and every day I have tracked
          </button>
          <button onClick={() => setConfirmReset(false)} className="text-zinc-500 hover:text-zinc-300">nothing, close this</button>
        </span>
      ) : (
        <button onClick={() => setConfirmReset(true)} className="text-[11px] text-zinc-600 hover:text-zinc-300 transition-colors">
          start over
        </button>
      )}
    </div>

    <header className="mb-6">
      <h1 className="text-2xl font-semibold">Your plan</h1>
      <p className="text-sm text-zinc-400 mt-1">
        {/* "Everything saves as you type" was here until 2026-09-23 and was
            false for the whole day half. The day route landed in M1 and the
            line was NOT put back, deliberately: it is true only signed in
            and only while the account can be reached, and a promise with
            two conditions on it is the shape that goes stale in a file
            nobody edits when the storage changes. Three of those were found
            across three slices on 2026-09-25. What the page says instead is
            nothing — and the banner below says the one thing that matters
            on the day it is false. */}
        Your north star, the areas under it, the goals that get you there, and an honest look at where you are.
      </p>
    </header>
    </>
  )
}
