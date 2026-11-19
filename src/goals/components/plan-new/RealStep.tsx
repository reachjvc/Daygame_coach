"use client"

/**
 * THE HOST THAT LETS A REAL STEP PART RUN INSIDE `/plan/new` (Plans/plan-new-from-real.md, Phase 3.3).
 *
 * The real tool's twelve steps are drawn from props alone. This gives them what `NorthStarFlow` gives them:
 *  - the plan, and a `setPlan` that is safe for the day half too (a tick, a rating, a note is sent, not only shown);
 *  - the same writers (`usePlanWriters`) and reads (`usePlanReads`) that `/plan` uses, unchanged;
 *  - the account's day and timezone;
 *  - the three dialog states (`?area=`, `?goal=`, `?routine=`) kept in the address, so a reload keeps them;
 *  - the errand ribbon and its way back;
 *  - a step id to `/plan/new/s/<id>` map for every jump (`onGoToTab`, `onNext`, `goTo`).
 *
 * Nothing here draws a step: `RealStepViews.tsx` mounts the real parts with the props `NorthStarFlow` passes.
 * Two things are on purpose absent on the copy space: the review reminder (`onReminderChange` is never passed,
 * as on `/plan/sandbox`) and anything that writes outside the plan and day routes.
 */

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type Dispatch, type ReactNode, type SetStateAction } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import type { NorthStarTabId, NsAccount, NsPlace, NsPlan } from "@/src/goals/types"
import type { SyncDecision } from "@/src/goals/lifePlanSync"
import { PROGRESS_COPY, stepFor } from "@/src/goals/data/northStar"
import * as ns from "@/src/goals/northStarService"
import * as nsTrack from "@/src/goals/northStarTrackService"
import { stepTick } from "@/src/goals/dayTicks"
import { patchesBetween, recordOf } from "@/src/goals/lifePlanDayService"
import { DEFAULT_REVIEW_DAY, dueNow, type DueCard } from "@/src/goals/dueNowService"
import { getTodayInTimezone } from "@/src/shared/dateUtils"
import { PlanBasePathContext } from "@/src/goals/components/north-star/planBasePath"
import { usePlanWriters } from "@/src/goals/components/north-star/usePlanWriters"
import { usePlanReads } from "@/src/goals/components/north-star/usePlanReads"
import { AreaDialog } from "@/src/goals/components/north-star/AreaDialog"
import { AreaGoalsDialog } from "@/src/goals/components/north-star/AreaGoalsDialog"
import { ROUTES } from "@/src/shared/routes"
import { realStepRoute } from "@/src/goals/planSteps/realStepRoutes"
import { usePlanNew } from "./PlanNewContext"
import { ErrandRibbon } from "../north-star/ErrandRibbon"

/** What the person came to a step to do, with the way back to where they left (NorthStarFlow's errand). */
export interface Errand {
  label: string
  tickId: string | null
  back: NorthStarTabId
  backAnchor?: string
}

interface Session {
  errand: Errand | null
  setErrand: Dispatch<SetStateAction<Errand | null>>
  /** Somewhere to scroll once the next step has drawn. */
  anchor: string | null
  setAnchor: Dispatch<SetStateAction<string | null>>
  /** Unsaved text in the one thing box; survives a step change, gone on reload. */
  oneThingTyped: string | null
  setOneThingTyped: Dispatch<SetStateAction<string | null>>
}

const SessionCtx = createContext<Session | null>(null)

/**
 * What outlives a step change. Each step is its own address, and the page under the layout starts over when the
 * address changes, so the errand (a jump's way back) lives here, above it, in the shell. It fetches nothing.
 */
export function RealStepSessionProvider({ children }: { children: ReactNode }) {
  const [errand, setErrand] = useState<Errand | null>(null)
  const [anchor, setAnchor] = useState<string | null>(null)
  const [oneThingTyped, setOneThingTyped] = useState<string | null>(null)
  const value = useMemo(() => ({ errand, setErrand, anchor, setAnchor, oneThingTyped, setOneThingTyped }), [errand, anchor, oneThingTyped])
  return <SessionCtx.Provider value={value}>{children}</SessionCtx.Provider>
}

type Writers = ReturnType<typeof usePlanWriters>
type Reads = ReturnType<typeof usePlanReads>

export interface RealStep extends Writers, Reads {
  stepId: NorthStarTabId
  plan: NsPlan
  /** The account's day (its timezone), never null once a step is drawn. */
  today: string
  timezone: string
  setPlan: Dispatch<SetStateAction<NsPlan>>
  /** Open a step (by any id the real tool knows, folded ones included). */
  setTab: (tab: NorthStarTabId) => void
  /** Arrive anywhere with the right dialog open; `on` makes it an errand with a way back. */
  goTo: (place: NsPlace, on?: Errand) => void
  /** Back where the errand came from (true), or just drop it (false). */
  endErrand: (go: boolean) => void
  /** Open dialogs, kept in the address: `?area=` (assessment), `?area=&goal=` (goal sheet), `?routine=`. */
  nowAreaId: string | null
  planAreaId: string | null
  nowGoalId: string | null
  openRoutineId: string | null
  setNowAreaId: (id: string | null) => void
  setPlanAreaId: (id: string | null) => void
  setNowGoalId: (id: string | null) => void
  setOpenRoutineId: (id: string | null) => void
  openAreaGoals: (areaId: string) => void
  openAreaRating: (areaId: string) => void
  openGoalFromToday: (goalId: string) => void
  errand: Errand | null
  ribbon: ReactNode
  catalogueOpen: boolean
  setCatalogueOpen: Dispatch<SetStateAction<boolean>>
  oneThingBody: string | null
  oneThingTyped: string | null
  setOneThingTyped: Dispatch<SetStateAction<string | null>>
  planPct: ns.NsPlanProgress
  dueCards: DueCard[]
  dueWeek: DueCard | undefined
  onDueGo: (c: DueCard) => void
  onHideDue: (c: DueCard) => void
  /** The review period an address named, if any (`?period=`). */
  reviewPeriod: string | null
}

const Ctx = createContext<RealStep | null>(null)

export function useRealStep(): RealStep {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error("useRealStep needs <RealStepHost>")
  return ctx
}

interface Q {
  area: string | null
  goal: string | null
  routine: string | null
}
const NO_Q: Q = { area: null, goal: null, routine: null }

function queryOf(q: Q, extra?: Record<string, string>): string {
  const p = new URLSearchParams()
  if (q.area) p.set("area", q.area)
  if (q.goal) p.set("goal", q.goal)
  if (q.routine) p.set("routine", q.routine)
  for (const [k, v] of Object.entries(extra ?? {})) p.set(k, v)
  const s = p.toString()
  return s ? `?${s}` : ""
}

export function RealStepHost({ stepId, children }: { stepId: NorthStarTabId; children: ReactNode }) {
  const { store, timezone, account } = usePlanNew()
  const session = useContext(SessionCtx)
  if (!session) throw new Error("RealStepHost needs <RealStepSessionProvider>")
  const { errand, setErrand, setAnchor, anchor, oneThingTyped, setOneThingTyped } = session
  const router = useRouter()
  const search = useSearchParams()
  const plan = store.plan
  const loaded = store.loaded

  /* ---- the day-safe setPlan ---- */
  const storeRef = useRef(store)
  storeRef.current = store
  const setPlan = useCallback<Dispatch<SetStateAction<NsPlan>>>((arg) => {
    const st = storeRef.current
    let dayMoved = false
    st.update((p) => {
      const next = typeof arg === "function" ? arg(p) : arg
      if (next !== p && patchesBetween(recordOf(p), recordOf(next)).length > 0) dayMoved = true
      return next
    })
    // `update` sends the plan rows only. A tick, rating, note or reading changes the day half, which has its own
    // route: start that send now, as `NorthStarFlow`'s `setPlan` does by comparing the day record (a flush waits
    // for the plan save first, which a day sometimes needs).
    // Phase 9: move into createPlanStore.update
    if (dayMoved) void st.flush()
  }, [])

  /* ---- the account's day ---- */
  const [today, setToday] = useState<string | null>(() => getTodayInTimezone(timezone))

  /* ---- dialog state in the address ---- */
  const live = useRef({ stepId, router, q: NO_Q })
  const q: Q = { area: search.get("area"), goal: search.get("goal"), routine: search.get("routine") }
  live.current = { stepId, router, q }
  const draft = useRef<{ q: Q; touched: boolean; tab: NorthStarTabId | null } | null>(null)
  const apply = useCallback(() => {
    const d = draft.current
    draft.current = null
    if (!d) return
    const { stepId: here, router: r } = live.current
    const tab = d.tab ?? here
    const moved = tab !== here
    const next: Q = moved && !d.touched ? NO_Q : d.q
    const href = `${realStepRoute(tab) ?? ROUTES.planNew}${queryOf(next)}`
    if (moved) {
      r.push(href)
      return
    }
    // The same step: only the address changes. `replaceState` and not `router.replace`, so a sheet opening is not
    // a round trip to the server (Next folds it into `useSearchParams`).
    try { window.history.replaceState(null, "", href) } catch { /* the sheet still opens next render; only the address lags */ }
  }, [])
  const queue = useCallback((edit: (d: NonNullable<typeof draft.current>) => void) => {
    const first = draft.current === null
    draft.current ??= { q: { ...live.current.q }, touched: false, tab: null }
    edit(draft.current)
    if (first) queueMicrotask(apply)
  }, [apply])
  const [catalogueOpen, setCatalogueOpen] = useState(search.get("catalogue") === "1")
  const setTab = useCallback((asked: NorthStarTabId) => {
    if (asked === "templates") setCatalogueOpen(true)
    queue((d) => { d.tab = stepFor(asked) })
  }, [queue])
  const setNowAreaId = useCallback((id: string | null) => queue((d) => { d.q = { ...d.q, area: id }; d.touched = true; if (!id) d.q.goal = null }), [queue])
  const setPlanAreaId = useCallback((id: string | null) => queue((d) => { d.q = { ...d.q, area: id }; d.touched = true; if (!id) d.q.goal = null }), [queue])
  const setNowGoalId = useCallback((id: string | null) => queue((d) => { d.q = { ...d.q, goal: id }; d.touched = true }), [queue])
  const setOpenRoutineId = useCallback((id: string | null) => queue((d) => { d.q = { ...d.q, routine: id }; d.touched = true }), [queue])

  const areaOpen = stepId === "now" || stepId === "recap"
  const goalsOpen = stepId === "milestones" || stepId === "systems"
  const nowAreaId = areaOpen ? q.area : null
  const planAreaId = goalsOpen ? q.area : null
  const nowGoalId = goalsOpen ? q.goal : null
  const openRoutineId = q.routine

  /* ---- the two halves of an area, an errand, an arrival ---- */
  const goTo = useCallback((place: NsPlace, on?: Errand) => {
    queue((d) => {
      d.touched = true
      d.tab = stepFor(place.tab)
      d.q = {
        area: place.areaId ?? null,
        goal: place.goalId ?? null,
        routine: null,
      }
    })
    setErrand(on ?? null)
    setAnchor(place.anchor ?? null)
  }, [queue, setErrand, setAnchor])
  const endErrand = useCallback((go: boolean) => {
    setErrand((e) => {
      if (e && go) {
        queue((d) => { d.touched = true; d.tab = stepFor(e.back); d.q = NO_Q })
        setAnchor(e.backAnchor ?? null)
      }
      return null
    })
  }, [queue, setErrand, setAnchor])

  const writers = usePlanWriters({ setPlan, today, setTab, setPlanAreaId, setNowGoalId, setOpenRoutineId })
  const decision = useMemo<SyncDecision | null>(() => (loaded ? { kind: "start-empty", revision: 0 } : null), [loaded])
  const reads = usePlanReads({ plan, setPlan, loaded, today, setToday, timezone, decision })
  const { ticks, oneThing } = reads
  const { goalHandlers } = writers

  const openAreaGoals = useCallback((areaId: string) => {
    queue((d) => { d.touched = true; d.tab = "milestones"; d.q = { area: areaId, goal: null, routine: d.q.routine } })
  }, [queue])
  const openAreaRating = useCallback((areaId: string) => {
    queue((d) => { d.touched = true; d.tab = "now"; d.q = { area: areaId, goal: null, routine: d.q.routine } })
  }, [queue])

  const day = today ?? ns.todayISO()
  const openGoalFromToday = (goalId: string) => {
    const goal = plan.goals.find((g) => g.id === goalId)
    if (!goal) return
    goTo(
      { tab: ns.isMilestone(goal) ? "milestones" : "systems", areaId: goal.areaId, goalId: goal.id },
      { label: goal.title, tickId: null, back: "today" },
    )
  }

  /* ---- the one thing, progress, Due now ---- */
  const nsAccount = useMemo<NsAccount>(() => ({ hasOneThing: !!oneThing.current }), [oneThing.current])
  const oneThingBody = oneThing.current?.body ?? null
  const planPct = ns.planProgress(plan, nsAccount)

  const [hiddenDue, setHiddenDue] = useState<ReadonlySet<string>>(new Set())
  const dueKey = `plan-due-hidden:${account}`
  useEffect(() => {
    try { const raw = window.localStorage.getItem(dueKey); setHiddenDue(new Set(raw ? (JSON.parse(raw) as string[]) : [])) } catch { /* storage refused: nothing hidden */ }
  }, [dueKey])
  const dueCards = loaded
    ? dueNow(plan, day, {
        reviewDay: DEFAULT_REVIEW_DAY,
        hidden: hiddenDue,
        progress: {
          percent: planPct.percent,
          mostLeft: planPct.mostLeft,
          mostLeftDetail: planPct.mostLeft ? PROGRESS_COPY.detail(planPct.steps[planPct.mostLeft].parts) : "",
        },
      })
    : []
  const dueWeek = dueCards.find((c) => c.kind === "week")
  const onDueGo = (c: DueCard) => {
    if ("goalId" in c.go) { openGoalFromToday(c.go.goalId); return }
    goTo({ tab: c.go.tab }, { label: c.title, tickId: null, back: "today" })
  }
  const onHideDue = (c: DueCard) => {
    const next = [...hiddenDue, c.key].slice(-60)
    setHiddenDue(new Set(next))
    try { window.localStorage.setItem(dueKey, JSON.stringify(next)) } catch { /* storage refused: hidden until reload */ }
  }

  /* ---- scroll to an anchor once the step has drawn ---- */
  useEffect(() => {
    if (!anchor || !loaded) return
    const el = document.getElementById(anchor)
    setAnchor(null)
    el?.scrollIntoView({ behavior: "smooth", block: "center" })
  }, [anchor, stepId, loaded, setAnchor])

  /* ---- the ribbon: inside the open dialog, else on the page ---- */
  const ribbon = errand ? (
    <ErrandRibbon
      label={errand.label}
      done={errand.tickId ? stepTick(plan, day, errand.tickId, ticks).done : null}
      onTick={() => {
        const id = errand.tickId
        if (id) setPlan((p) => nsTrack.toggleStepLogged(p, day, id))
      }}
      onBack={() => endErrand(true)}
      onDismiss={() => endErrand(false)}
    />
  ) : null

  const value: RealStep = {
    ...writers,
    ...reads,
    stepId,
    plan,
    today: day,
    timezone,
    setPlan,
    setTab,
    goTo,
    endErrand,
    nowAreaId,
    planAreaId,
    nowGoalId,
    openRoutineId,
    setNowAreaId,
    setPlanAreaId,
    setNowGoalId,
    setOpenRoutineId,
    openAreaGoals,
    openAreaRating,
    openGoalFromToday,
    errand,
    ribbon,
    catalogueOpen,
    setCatalogueOpen,
    oneThingBody,
    oneThingTyped,
    setOneThingTyped,
    planPct,
    dueCards,
    dueWeek,
    onDueGo,
    onHideDue,
    reviewPeriod: search.get("period"),
  }

  const areaDialogOpen = areaOpen && !!nowAreaId
  const goalDialogOpen = goalsOpen && !!planAreaId && !!nowGoalId

  return (
    <PlanBasePathContext.Provider value={ROUTES.planNew}>
      <Ctx.Provider value={value}>
        {ribbon && !areaDialogOpen && !goalDialogOpen && <div className="mb-5">{ribbon}</div>}
        {children}
        <RealStepDialogs />
      </Ctx.Provider>
    </PlanBasePathContext.Provider>
  )
}

/**
 * THE DIALOGS, mounted once. The assessment sheet for one area (Your 10s, Everything) and the goal sheet (Experiences,
 * Systems) open from the address: `?area=<id>` and `?area=<id>&goal=<id>`. Drawn as `NorthStarFlow` draws them.
 */
function RealStepDialogs() {
  const r = useRealStep()
  const { plan, today, ticks, stepId } = r
  const nowArea = (stepId === "now" || stepId === "recap") && r.nowAreaId ? plan.areas.find((a) => a.id === r.nowAreaId) : undefined
  const goalArea = (stepId === "milestones" || stepId === "systems") && r.planAreaId && r.nowGoalId ? plan.areas.find((a) => a.id === r.planAreaId) : undefined
  return (
    <>
      {nowArea && (
        <AreaDialog
          area={nowArea}
          plan={plan}
          today={today}
          onAreaReview={r.reviewHandlers.onAreaReview}
          onRate={r.reviewHandlers.onRate}
          onDailyRating={r.reviewHandlers.onDailyRating}
          onUpdateArea={r.areaHandlers.onUpdateArea}
          onRemoveArea={r.areaHandlers.onRemoveArea}
          onOpenRoutine={(id) => { r.setNowAreaId(null); r.setOpenRoutineId(id); r.setTab("milestones") }}
          onSeasonFocus={r.setSeasonFocus}
          onOpenArea={(id) => r.setNowAreaId(id)}
          onGoToGoals={r.openAreaGoals}
          banner={r.ribbon}
          /* Closing IS the way back when something sent you here. */
          onClose={() => (r.errand ? r.endErrand(true) : r.setNowAreaId(null))}
        />
      )}
      {goalArea && (
        <AreaGoalsDialog
          area={goalArea}
          plan={plan}
          today={today}
          ticks={ticks}
          openGoalId={r.nowGoalId}
          onOpenGoal={(id) => r.setNowGoalId(r.nowGoalId === id ? null : id)}
          goalHandlers={r.goalHandlers}
          onAddGoal={r.addGoal}
          onAddTarget={r.addTarget}
          onAddTemplate={r.addTemplate}
          onOpenRoutine={(id) => { r.setPlanAreaId(null); r.setOpenRoutineId(id) }}
          onSeasonFocus={r.setSeasonFocus}
          onOpenArea={(id) => { r.setPlanAreaId(id); r.setNowGoalId(null) }}
          onGoToRating={r.openAreaRating}
          banner={r.ribbon}
          onClose={() => {
            if (r.errand) return r.endErrand(true)
            r.setPlanAreaId(null)
            r.setNowGoalId(null)
          }}
        />
      )}
    </>
  )
}
