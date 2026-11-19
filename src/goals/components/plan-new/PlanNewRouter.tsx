"use client"

import { useEffect } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { CORE_IDS, EXTRA_IDS, type CoreId, type ExtraId, homeHref } from "@/src/goals/planSteps/planRoutes"
import { commonCopy, saveCopy } from "@/src/goals/planSteps/copy/common"
import { Home } from "./Home"
import { ReadAll } from "./ReadAll"
import { AreasModule } from "./modules/Areas"
import { DirectionModule } from "./modules/Direction"
import { SeasonModule } from "./modules/Season"
import { GoalsModule } from "./modules/Goals"
import { ActionsModule } from "./modules/Actions"
import { ReviewModule } from "./modules/Review"
import { StandingModule } from "./modules/Standing"
import { ValuesModule } from "./modules/Values"
import { IdentityModule } from "./modules/Identity"
import { ExperiencesModule } from "./modules/Experiences"
import { ObstaclesModule } from "./modules/Obstacles"
import { RoutinesModule } from "./modules/Routines"
import { QuestionsModule } from "./modules/Questions"
import { RoleModelsModule } from "./modules/RoleModels"
import { QuitModule } from "./modules/Quit"
import { SelfRatingsModule } from "./modules/SelfRatings"
import { TodayPage } from "./daily/Today"
import { TrackPage } from "./daily/Track"
import { JournalPage } from "./daily/Journal"
import { isRealStepId, realStepOfParam, realStepRoute } from "@/src/goals/planSteps/realStepRoutes"
import { usePlanNew } from "./PlanNewContext"
import { RealStepHost } from "./RealStep"
import { RealStepView } from "./RealStepViews"
import { btnQuiet } from "./ui"

const MODULES: Record<CoreId, (p: { segs: string[] }) => React.JSX.Element> = {
  areas: AreasModule, direction: DirectionModule, season: SeasonModule, goals: GoalsModule, actions: ActionsModule, review: ReviewModule,
}

const EXTRA_MODULES: Record<ExtraId, (p: { segs: string[] }) => React.JSX.Element> = {
  standing: StandingModule, values: ValuesModule, identity: IdentityModule, experiences: ExperiencesModule, obstacles: ObstaclesModule,
  routines: RoutinesModule, questions: QuestionsModule, rolemodels: RoleModelsModule, quit: QuitModule, selfratings: SelfRatingsModule,
}

export function PlanNewRouter({ slug }: { slug: string[] }) {
  const { store } = usePlanNew()
  const router = useRouter()
  const search = useSearchParams()
  // An old link to the real tool's address style (`?step=today`, `?step=review&period=week-…`) lands on the step's page.
  const asked = slug.length === 0 ? realStepOfParam(search.get("step")) : null
  const askedPeriod = search.get("period")
  useEffect(() => {
    if (!asked) return
    const route = realStepRoute(asked)
    if (!route) return
    const p = new URLSearchParams()
    if (asked === "review" && askedPeriod) p.set("period", askedPeriod)
    if (search.get("step") === "templates") p.set("catalogue", "1")
    const q = p.toString()
    router.replace(q ? `${route}?${q}` : route)
  }, [asked, askedPeriod, search, router])
  if (asked) return <p className="px-4 pt-2 text-sm text-zinc-500">…</p>
  if (slug.length === 0) return <Home />
  // Nothing is drawn from the plan before the first read has answered: a screen that opens on an empty
  // plan would look like a new account's, and its first Next could save over the real one.
  if (!store.loaded) return <p className="px-4 pt-2 text-sm text-zinc-500">…</p>
  if (store.status === "offline") {
    return (
      <div className="mx-auto max-w-xl space-y-3 px-4" role="alert">
        <p className="text-sm text-rose-300">{store.note}</p>
        <button type="button" className={btnQuiet} onClick={() => void store.retry()}>{saveCopy.retry}</button>
      </div>
    )
  }
  if (slug[0] === "read") return <ReadAll />
  // The real step parts, full width, one page each: /plan/new/s/<stepId>.
  if (slug[0] === "s" && slug.length === 2 && isRealStepId(slug[1])) {
    return (
      <div className="mx-auto w-full max-w-5xl px-4 pb-28 pt-4 sm:px-6">
        <RealStepHost stepId={slug[1]}>
          <RealStepView />
        </RealStepHost>
      </div>
    )
  }
  const first = slug[0]
  if ((CORE_IDS as readonly string[]).includes(first)) {
    const Module = MODULES[first as CoreId]
    return <Module segs={slug.slice(1)} />
  }
  if ((EXTRA_IDS as readonly string[]).includes(first)) {
    const Module = EXTRA_MODULES[first as ExtraId]
    return <Module segs={slug.slice(1)} />
  }
  if (first === "today") return <TodayPage />
  if (first === "track") return <TrackPage />
  if (first === "journal") return <JournalPage />
  return (
    <div className="mx-auto max-w-xl px-4">
      <Link href={homeHref()} className={btnQuiet}>{commonCopy.plan_home}</Link>
    </div>
  )
}
