"use client"

import Link from "next/link"
import { TAB_LABELS } from "@/src/goals/data/northStar"
import { screenRoute, sequenceOfPlan } from "@/src/goals/planSteps/planSequences"
import { homeHref } from "@/src/goals/planSteps/planRoutes"
import { linkQuiet } from "./ui"
import { usePlanNew } from "./PlanNewContext"

/**
 * THE HOME OF /plan/new FOR NOW: the active sequence's screens in order, each a link, and a small link to the first
 * rebuild. Phase 6.3 brings the real plan home (Next up, the season band, the Done summaries) over the real steps.
 */
export function SequenceHome() {
  const { plan } = usePlanNew()
  const seq = sequenceOfPlan(plan)
  return (
    <div className="mx-auto w-full max-w-xl px-4 pb-16 pt-4" data-testid="sequence-home">
      <ol className="divide-y divide-white/5 rounded-xl border border-white/10">
        {seq.screens.map((screen, i) => (
          <li key={screen.id}>
            <Link href={screenRoute(seq, screen)} className="flex min-h-11 items-center gap-3 px-4 py-2 text-sm text-foreground hover:bg-white/[0.03]" data-testid={`home-${screen.id}`}>
              <span className="w-5 shrink-0 text-right text-xs tabular-nums text-muted-foreground">{i + 1}</span>
              <span>{TAB_LABELS[screen.step]}</span>
            </Link>
          </li>
        ))}
      </ol>
      <div className="mt-4">
        <Link href={homeHref()} className={linkQuiet} data-testid="first-rebuild-link">The first rebuild</Link>
      </div>
    </div>
  )
}
