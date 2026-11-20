"use client"

/**
 * THE REAL TOOL'S SHELL AROUND A STEP, on `/plan/new` (Plans/plan-new-from-real.md, Phase 4).
 *
 * `NorthStarFlow` draws more than the twelve steps: the header (way back, "start over", the title), the step picker
 * with its progress rings, the "Still to fill in" panel, "Your plan, read back", and the bar between steps. Each of
 * those lives in its own file now (`north-star/PlanHeader`, `StepPicker`, `PlanTodos`, `PlanReadBack`,
 * `PlanStepNav`), moved out unchanged; this mounts the same components, fed from the host instead of from
 * `NorthStarFlow`'s state. A pick or a Next goes to the step's screen in the active sequence (`setTab`).
 *
 * The bar at the bottom of the setup steps and the bar at the top of the daily ones are the same component
 * `NorthStarFlow` uses, with the words of the real tool: "← <previous step> · Saved to your account. · <next step> →".
 */

import { useEffect, useRef, useState, type ReactNode } from "react"
import Link from "next/link"
import { BUILD_STEPS, TAB_LABELS, USE_STEPS } from "@/src/goals/data/northStar"
import { planHomeHref } from "@/src/goals/planSteps/planRoutes"
import { navLabel, nextScreen, prevScreen, screenRoute, screensForStep, type Screen, type Sequence } from "@/src/goals/planSteps/planSequences"
import { SECTION_TITLES } from "@/src/goals/planSteps/sectionTitles"
import type { SectionId } from "@/src/goals/planSteps/planSections"
import * as ns from "@/src/goals/northStarService"
import { planInUse } from "@/src/goals/planLanding"
import type { SyncState } from "@/src/goals/lifePlanSync"
import { ROUTES } from "@/src/shared/routes"
import { SiteHeader, sidebarOffset } from "@/components/AppFrame"
import { MobileTabBar } from "@/components/MobileTabBar"
import { PlanHeader } from "../north-star/PlanHeader"
import { StepPicker } from "../north-star/StepPicker"
import { PlanTodos } from "../north-star/PlanTodos"
import { PlanReadBack } from "../north-star/PlanReadBack"
import { PlanStepNav } from "../north-star/PlanStepNav"
import { usePlanNew } from "./PlanNewContext"
import { useRealStep } from "./RealStep"

export function RealShell({ children, seq }: { children: ReactNode; seq?: Sequence }) {
  const r = useRealStep()
  const { store } = usePlanNew()
  const { plan, stepId: tab, planPct, nsAccount, numbers } = r
  const inUse = planInUse(plan)
  const siteBar = USE_STEPS.includes(tab)
  const states = numbers.states
  const progress = { ...ns.nsProgress(plan, nsAccount), done: numbers.done }

  /* ---- the picker's open/closed state, as `NorthStarFlow` keeps it ---- */
  const [railOpen, setRailOpen] = useState(!inUse)
  const [buildOpen, setBuildOpen] = useState(BUILD_STEPS.includes(tab))
  useEffect(() => { setBuildOpen(BUILD_STEPS.includes(tab)) }, [tab])
  const railToggleRef = useRef<HTMLButtonElement>(null)
  const showBuild = !inUse || buildOpen

  /* ---- "start over": the same two resets, on the copy ---- */
  const [confirmReset, setConfirmReset] = useState(false)
  const clearDialogs = () => {
    r.setNowAreaId(null)
    r.setPlanAreaId(null)
    r.setNowGoalId(null)
    r.setOpenRoutineId(null)
  }
  const resetGoals = () => {
    r.setPlan((p) => ns.resetGoalsAndFocus(p))
    setConfirmReset(false)
    r.setPlanAreaId(null)
    r.setNowGoalId(null)
    r.setTab("focus")
  }
  // "Everything" on the copy space is the copy space's own reset: it removes the whole copy, days and journal with it,
  // the same call as the banner's "Start as new". (A plan sent to the store as empty leaves the goal, routine and step
  // rows in the database: see the report.) Pending edits are sent first so none lands after the removal.
  const [resetFailed, setResetFailed] = useState(false)
  const reset = async () => {
    setConfirmReset(false)
    setResetFailed(false)
    clearDialogs()
    try {
      await store.flush()
      const res = await fetch("/api/plan-sandbox/reset", { method: "POST" })
      if (!res.ok) throw new Error("not reset")
      window.location.assign(`${ROUTES.planNew}/star`)
    } catch {
      setResetFailed(true)
    }
  }

  /* ---- what the bar says about saving, from the store's state ---- */
  const status = store.status
  const serverState: SyncState = status === "loading" ? "unknown" : status
  const unsent = status === "saving" || status === "failed"
  const serverNote = status === "failed" || status === "stale" || status === "offline" ? store.note : ""

  const dialogOpen =
    ((tab === "now" || tab === "recap") && !!r.nowAreaId) || ((tab === "milestones" || tab === "systems") && !!r.planAreaId && !!r.nowGoalId)

  /* ---- Back and Next follow the sequence's screens, so a split step's parts come one after the other ---- */
  const screen = r.screen
  // Another screen of the same step keeps the review period (`?period=`); another step starts clean.
  const go = (target: Screen) => () => {
    const keep = screen && target.step === screen.step && r.reviewPeriod ? `?period=${encodeURIComponent(r.reviewPeriod)}` : ""
    r.router.push(`${screenRoute(seq as Sequence, target)}${keep}`)
  }
  const parts = screen && seq ? screensForStep(seq, screen.step) : []
  // "See it all" draws the whole step, so Back and Next leave it: before its first part, after its last.
  const prev = screen && seq ? prevScreen(seq, r.seeAll && parts.length ? parts[0] : screen) : undefined
  const next = screen && seq ? nextScreen(seq, r.seeAll && parts.length ? parts[parts.length - 1] : screen) : undefined
  const navPrev = screen && seq ? (prev ? { label: navLabel(seq, screen, prev), onGo: go(prev) } : null) : undefined
  const navNext = screen && seq ? (next ? { label: navLabel(seq, screen, next), onGo: go(next) } : null) : undefined
  const partIndex = screen ? parts.findIndex((p) => p.id === screen.id) : -1

  const nav = (
    <PlanStepNav
      prev={navPrev}
      next={navNext}
      tab={tab}
      siteBar={siteBar}
      setTab={r.setTab}
      plan={plan}
      loaded={store.loaded}
      unsent={unsent}
      serverState={serverState}
      serverNote={serverNote}
      otherAccount={false}
      storageRefused={false}
      progress={progress}
      testIds
    />
  )

  return (
    <div className={siteBar ? sidebarOffset(false) : undefined} data-testid={`shell-${tab}`}>
      {siteBar && <SiteHeader />}
      {siteBar && nav}
      <div className={`max-w-5xl mx-auto px-6 py-10 ${siteBar ? "pb-tab-bar sm:pb-28" : "pb-28"}`}>
        <PlanHeader
          backHref={ROUTES.dashboard}
          backLabel="Home"
          confirmReset={confirmReset}
          setConfirmReset={setConfirmReset}
          onResetGoals={resetGoals}
          onReset={() => void reset()}
        />
        {resetFailed && (
          <p role="alert" className="mb-4 text-sm text-destructive">Could not start over. Nothing was removed. Try again.</p>
        )}
        <Link href={planHomeHref()} className="mb-3 inline-flex min-h-11 items-center text-[12px] text-primary hover:text-primary underline decoration-dotted underline-offset-2" data-testid="plan-home-link">
          Plan home
        </Link>
        <StepPicker
          tab={tab}
          inUse={inUse}
          states={states}
          planPct={planPct}
          railOpen={railOpen}
          setRailOpen={setRailOpen}
          showBuild={showBuild}
          setBuildOpen={setBuildOpen}
          railToggleRef={railToggleRef}
          onPick={(id) => r.setTab(id)}
        />
        {r.ribbon && !dialogOpen && <div className="mb-5">{r.ribbon}</div>}
        {screen?.section && parts.length > 1 && (
          <div className="mb-4 flex flex-wrap items-center justify-between gap-x-4 gap-y-1" data-testid="section-bar">
            <p className="text-[12px] text-muted-foreground" data-testid="section-title">
              {r.seeAll ? TAB_LABELS[screen.step] : `Part ${partIndex + 1} of ${parts.length}: ${SECTION_TITLES[screen.section as SectionId]}`}
            </p>
            <Link
              href={r.seeAll ? screenRoute(seq as Sequence, screen) : `${screenRoute(seq as Sequence, screen)}?all=1`}
              className="inline-flex min-h-11 items-center text-[12px] text-primary hover:text-primary underline decoration-dotted underline-offset-2"
              data-testid="see-it-all"
            >
              {r.seeAll ? "Back to the short screens" : "See it all on one page"}
            </Link>
          </div>
        )}
        {children}
        <PlanTodos plan={plan} tab={tab} loaded={store.loaded} today={r.today} todos={numbers.chips} onGo={(t, section, areaId) => (areaId ? r.goTo({ tab: t, areaId }) : r.setTab(t, section))} />
        <PlanReadBack plan={plan} loaded={store.loaded} today={r.today} />
      </div>
      {!siteBar && nav}
      {siteBar && <MobileTabBar force />}
    </div>
  )
}
