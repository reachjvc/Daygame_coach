"use client"

import Link from "next/link"
import { CORE_IDS, type CoreId, homeHref } from "@/src/goals/planSteps/planRoutes"
import { commonCopy } from "@/src/goals/planSteps/copy/common"
import { Home } from "./Home"
import { ReadAll } from "./ReadAll"
import { AreasModule } from "./modules/Areas"
import { DirectionModule } from "./modules/Direction"
import { SeasonModule } from "./modules/Season"
import { GoalsModule } from "./modules/Goals"
import { ActionsModule } from "./modules/Actions"
import { ReviewModule } from "./modules/Review"
import { usePlanNew } from "./PlanNewContext"
import { btnQuiet } from "./ui"

const MODULES: Record<CoreId, (p: { segs: string[] }) => React.JSX.Element> = {
  areas: AreasModule, direction: DirectionModule, season: SeasonModule, goals: GoalsModule, actions: ActionsModule, review: ReviewModule,
}

export function PlanNewRouter({ slug }: { slug: string[] }) {
  const { store } = usePlanNew()
  if (slug.length === 0) return <Home />
  // Nothing is drawn from the plan before the first read has answered: a screen that opens on an empty
  // plan would look like a new account's, and its first Next could save over the real one.
  if (!store.loaded) return <p className="px-4 pt-2 text-sm text-zinc-500">…</p>
  if (store.status === "offline") {
    return (
      <div className="mx-auto max-w-xl space-y-3 px-4" role="alert">
        <p className="text-sm text-rose-300">{store.note}</p>
        <button type="button" className={btnQuiet} onClick={() => void store.retry()}>{commonCopy.back}</button>
      </div>
    )
  }
  if (slug[0] === "read") return <ReadAll />
  const first = slug[0]
  if ((CORE_IDS as readonly string[]).includes(first)) {
    const Module = MODULES[first as CoreId]
    return <Module segs={slug.slice(1)} />
  }
  return (
    <div className="mx-auto max-w-xl px-4">
      <Link href={homeHref()} className={btnQuiet}>{commonCopy.plan_home}</Link>
    </div>
  )
}
