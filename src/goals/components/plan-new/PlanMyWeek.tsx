"use client"

/**
 * PLAN MY WEEK (Plans/plan-new-from-real.md, Phase 6.4, his pick Q5): the real guided build, which nothing opens in the
 * real tool. Three parts it holds: the ideal day, the week grid and the five questions that ask what each goal is missing
 * (`GuidedBuild` -> `IdealDayRamp`, `WeekGrid`, `QuestionsRamp`, the other ramps). Mounted unchanged, with the host's
 * real handlers, on the copy space only (everything under `/plan/new` runs on it).
 */

import Link from "next/link"
import { GuidedBuild } from "@/src/goals/components/north-star/GuidedBuild"
import { planHomeHref } from "@/src/goals/planSteps/planRoutes"
import { sequenceOfPlan } from "@/src/goals/planSteps/planSequences"
import { usePlanNew } from "./PlanNewContext"
import { RealStepHost, useRealStep } from "./RealStep"
import { linkQuiet } from "./ui"

function Body() {
  const r = useRealStep()
  return (
    <div className="mx-auto w-full max-w-5xl space-y-4 px-4 pb-28 pt-4 sm:px-6" data-testid="plan-my-week">
      <header className="space-y-2">
        <Link href={planHomeHref()} className={linkQuiet} data-testid="week-back">Your plan</Link>
        <h1 className="text-2xl font-semibold text-foreground">Plan my week</h1>
      </header>
      <GuidedBuild plan={r.plan} today={r.today} handlers={r.guideHandlers} />
    </div>
  )
}

export function PlanMyWeek() {
  const { plan } = usePlanNew()
  return (
    <RealStepHost stepId="milestones" sequence={sequenceOfPlan(plan)}>
      <Body />
    </RealStepHost>
  )
}
