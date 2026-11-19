"use client"

import type { NorthStarTabId } from "@/src/goals/types"
import { PROGRESS_COPY, SCORED_TABS, TAB_LABELS } from "@/src/goals/data/northStar"
import * as ns from "@/src/goals/northStarService"

/**
 * THE PLAN, STEP BY STEP, at the top of Everything: the total, then one row
 * per scored step with its bar and percentage, each a link to the step.
 */
export function PlanProgressList({ progress, onGo }: { progress: ns.NsPlanProgress; onGo: (tab: NorthStarTabId) => void }) {
  return (
    <section data-testid="plan-progress" className="mb-6 rounded-2xl border border-white/10 bg-white/[0.02] px-4 py-4 sm:px-5">
      <h2 className="text-sm font-semibold text-zinc-100">{PROGRESS_COPY.total(progress.percent)}</h2>
      <div
        role="progressbar"
        aria-label={PROGRESS_COPY.total(progress.percent)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={progress.percent}
        className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-zinc-800"
      >
        <div className="h-full rounded-full bg-amber-400" style={{ width: `${progress.percent}%` }} />
      </div>
      <ul className="mt-3 divide-y divide-white/5">
        {SCORED_TABS.map((tab) => {
          const pct = ns.percentDown(progress.steps[tab].fraction)
          return (
            <li key={tab}>
              <button type="button" onClick={() => onGo(tab)} className="flex w-full items-center gap-3 py-2 text-left hover:bg-white/[0.03] rounded-md">
                <span className="w-28 shrink-0 truncate text-[12.5px] text-zinc-200 sm:w-40">{TAB_LABELS[tab]}</span>
                <span aria-hidden className="h-1 min-w-0 flex-1 overflow-hidden rounded-full bg-zinc-800">
                  <span className="block h-full rounded-full bg-amber-400/80" style={{ width: `${pct}%` }} />
                </span>
                <span className="w-10 shrink-0 text-right text-[12px] tabular-nums text-zinc-400">{PROGRESS_COPY.percent(pct)}</span>
              </button>
            </li>
          )
        })}
      </ul>
    </section>
  )
}

