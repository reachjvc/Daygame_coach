"use client"

/**
 * THE PLAN HOME OF `/plan/new` (Plans/plan-new-from-real.md, Phase 6.3: his picks Q4, Q4b, Q5).
 *
 * The first rebuild's home, kept: the season band, "Next up", a status line and a Done summary for each step, the daily
 * buttons, the counts and the earlier notes. Computed over the REAL steps of the active sequence (`planHome.ts`), from the
 * one numbers rule (`planNumbers.ts`). No step is locked. The first rebuild's own home stays at `/plan/new/first`.
 */

import Link from "next/link"
import { useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { BackLink } from "@/components/BackLink"
import { TAB_BLURBS, TAB_LABELS, SCORED_TABS } from "@/src/goals/data/northStar"
import { dueNow, DEFAULT_REVIEW_DAY } from "@/src/goals/dueNowService"
import { planInUse } from "@/src/goals/planLanding"
import { addDaysISO } from "@/src/goals/northStarService"
import { homeCopy } from "@/src/goals/planSteps/copy/home"
import { directionCopy } from "@/src/goals/planSteps/copy/direction"
import { seasonCopy } from "@/src/goals/planSteps/copy/season"
import { goalsCopy } from "@/src/goals/planSteps/copy/goals"
import { directionNotes, goalNotes, seasonNotes, type EarlierNote } from "@/src/goals/planSteps/earlierNotes"
import { goalsOfTier, protectedId, weeklyItems } from "@/src/goals/planSteps/planFacts"
import { accountOf, buildStepsOf, dailyScreensOf, deepenItems, nextUp, stepSummary } from "@/src/goals/planSteps/planHome"
import { planNumbers } from "@/src/goals/planSteps/planNumbers"
import { homeHref, weekHref } from "@/src/goals/planSteps/planRoutes"
import { screenRoute, screensForStep, sequenceOfPlan, type Sequence } from "@/src/goals/planSteps/planSequences"
import { SECTION_TITLES } from "@/src/goals/planSteps/sectionTitles"
import type { SectionId } from "@/src/goals/planSteps/planSections"
import { fill, plural } from "@/src/goals/planSteps/text"
import type { NorthStarTabId } from "@/src/goals/types"
import { ROUTES } from "@/src/shared/routes"
import { usePlanNew } from "./PlanNewContext"
import { EarlierBlock } from "./shared"
import { btnPrimary, card, dateText, linkQuiet } from "./ui"

/** Where `/plan/new` opens: the plan home, or Today once the plan is in use (the same rule `/plan` uses: an active goal or a routine step). */
export function PlanHomeGate() {
  const { plan, store } = usePlanNew()
  const router = useRouter()
  const search = useSearchParams()
  const wantsHome = search.get("home") === "1"
  const goToday = store.loaded && !wantsHome && planInUse(plan)
  useEffect(() => {
    if (goToday) router.replace(`${ROUTES.planNew}/today`)
  }, [goToday, router])
  if (!store.loaded || goToday) return <p className="px-4 pt-2 text-sm text-muted-foreground">…</p>
  return <PlanHome />
}

const chipTone = {
  empty: "border-white/10 text-muted-foreground",
  started: "border-primary/40 bg-primary/10 text-primary",
  done: "border-primary/40 bg-primary/10 text-primary",
} as const

const earlierTopics = { ...directionCopy.earlier_notes, ...seasonCopy.earlier_notes, ...goalsCopy.earlier_notes } as Record<string, string>

export function PlanHome() {
  const { plan, today } = usePlanNew()
  const seq: Sequence = sequenceOfPlan(plan)
  const numbers = planNumbers(plan, accountOf(plan), today)
  const next = nextUp(seq, plan, numbers, today)
  const steps = buildStepsOf(seq)
  const daily = dailyScreensOf(seq)
  const weekDue = dueNow(plan, today, { reviewDay: DEFAULT_REVIEW_DAY, hidden: new Set(), progress: null }).some((c) => c.kind === "week")

  const daysLeft = plan.season?.endsOn ? Math.round((Date.parse(plan.season.endsOn) - Date.parse(today)) / 86_400_000) : null
  const protectedItem = weeklyItems(plan).find((i) => i.id === protectedId(plan))
  const monday = (() => {
    const d = new Date(`${today}T00:00:00`)
    return addDaysISO(today, -((d.getDay() + 6) % 7))
  })()
  const protectedDone = protectedItem
    ? Array.from({ length: 7 }, (_, i) => addDaysISO(monday, i)).some((d) => (plan.logged[d] ?? []).includes(protectedItem.id))
    : false
  const counts = [
    plural(homeCopy, "count_big", goalsOfTier(plan, "life").length),
    plural(homeCopy, "count_growth", goalsOfTier(plan, "become").length),
    plural(homeCopy, "count_season", plan.goals.filter((g) => g.servesOneThing && g.status === "active" && goalsOfTier(plan, "season").includes(g)).length),
    plural(homeCopy, "count_weekly", weeklyItems(plan).length),
    plural(homeCopy, "count_routines", plan.routines.length),
    plural(homeCopy, "count_things", plan.experiences.length),
  ].filter((l) => !l.startsWith("0 "))
  const earlier: EarlierNote[] = [...directionNotes(plan), ...seasonNotes(plan), ...plan.goals.flatMap(goalNotes)]
  const seasonScreen = screensForStep(seq, "focus")[0]
  const deepen = deepenItems(seq)

  return (
    <div className="mx-auto w-full max-w-xl space-y-6 px-4 pb-16 pt-4" data-testid="plan-home">
      <header className="space-y-2">
        <BackLink fallback={ROUTES.dashboard} fallbackLabel="Home" />
        <h1 className="text-2xl font-semibold text-foreground">{homeCopy.title}</h1>
        <p className="text-sm text-muted-foreground" data-testid="plan-percent">
          {`${numbers.progress.percent} %`}
        </p>
      </header>

      {plan.season && seasonScreen && (
        <Link href={screenRoute(seq, seasonScreen)} className={`${card} block`} data-testid="season-band">
          {plan.season.sentence.trim() && <p className="text-sm font-medium text-foreground">{plan.season.sentence}</p>}
          <p className="mt-1 text-xs text-muted-foreground">
            {daysLeft == null
              ? ""
              : daysLeft < 0
                ? fill(homeCopy.season_band.ended, { date: dateText(plan.season.endsOn) })
                : daysLeft === 0
                  ? homeCopy.season_band.ends_today
                  : plural(homeCopy.season_band, "days_left", daysLeft)}
            {" · "}
            {homeCopy.season_band.protected_label}:{" "}
            {protectedItem ? `${protectedItem.title} (${protectedDone ? homeCopy.season_band.protected_done : homeCopy.season_band.protected_not_yet})` : homeCopy.season_band.protected_none}
          </p>
        </Link>
      )}

      <section className={`${card} border-primary/30 bg-primary/[0.06]`} aria-label={homeCopy.next_up.heading} data-testid="next-up">
        <p className="text-xs font-medium uppercase tracking-wide text-primary">{next.kind === "all-set" ? homeCopy.next_up.all_set_heading : homeCopy.next_up.heading}</p>
        {next.kind === "all-set" && (
          <>
            <p className="mt-1 text-sm text-foreground">{homeCopy.next_up.all_set_job}</p>
            {next.screen && <Link href={screenRoute(seq, next.screen)} className={`${btnPrimary} mt-3`} data-testid="next-up-today">{homeCopy.next_up.all_set_button}</Link>}
          </>
        )}
        {next.kind === "build" && (
          <>
            <p className="mt-1 text-lg font-semibold text-foreground" data-testid="next-up-name">{TAB_LABELS[next.step]}</p>
            <p className="mt-1 text-sm text-foreground">{fill(homeCopy.next_up.job_prefix, { job: next.job })}</p>
            {next.chip && <p className="mt-1 text-xs text-muted-foreground">{next.chip}</p>}
            <Link href={next.href} className={`${btnPrimary} mt-3`} data-testid="next-up-go">
              {next.started ? homeCopy.next_up.continue : homeCopy.next_up.start}
            </Link>
          </>
        )}
        {(next.kind === "season-ended" || next.kind === "review-due") && (
          <>
            <p className="mt-1 text-lg font-semibold text-foreground" data-testid="next-up-name">{TAB_LABELS[next.step]}</p>
            <p className="mt-1 text-sm text-foreground">{fill(homeCopy.next_up.job_prefix, { job: next.kind === "season-ended" ? homeCopy.next_up.job_season_ended : homeCopy.next_up.job_review_due })}</p>
            <Link href={screenRoute(seq, next.screen)} className={`${btnPrimary} mt-3`} data-testid="next-up-go">{homeCopy.next_up.start}</Link>
          </>
        )}
      </section>

      <section aria-label={homeCopy.core_heading}>
        <h2 className="mb-2 text-sm font-semibold text-foreground">{homeCopy.core_heading}</h2>
        <ol className="space-y-2">
          {steps.map((step, i) => (
            <StepRow key={step} n={i + 1} step={step} seq={seq} />
          ))}
        </ol>
      </section>

      <section id="deepen" aria-label={deepen.length ? "Deepen" : homeCopy.extra_heading} data-testid={deepen.length ? "deepen-list" : undefined}>
        <h2 className="mb-2 text-sm font-semibold text-foreground">{deepen.length ? "Deepen" : homeCopy.extra_heading}</h2>
        <ul className="space-y-2">
          {deepen.map((item) => (
            <li key={item.id} className={card} data-testid={`deepen-${item.id}`}>
              <Link href={item.href} className="block min-h-11" data-testid={`deepen-${item.id}-open`}>
                <p className="text-sm font-medium text-foreground">{item.title}</p>
                <p className="text-xs text-muted-foreground">{item.blurb}</p>
              </Link>
            </li>
          ))}
          <li className={card} data-testid="deepen-week">
            <Link href={weekHref()} className="block min-h-11" data-testid="deepen-week-open">
              <p className="text-sm font-medium text-foreground">Plan my week</p>
              <p className="text-xs text-muted-foreground">Your ideal day, the week grid, and five questions that fill in what each goal is missing.</p>
            </Link>
          </li>
        </ul>
      </section>

      <section aria-label={homeCopy.daily_heading}>
        <h2 className="mb-2 text-sm font-semibold text-foreground">{homeCopy.daily_heading}</h2>
        <div className="grid grid-cols-2 gap-2">
          {daily.map((screen) => (
            <Link key={screen.id} href={screenRoute(seq, screen)} className={`${btnPrimary} relative`} data-testid={`daily-${screen.step}`}>
              {TAB_LABELS[screen.step]}
              {screen.step === "review" && weekDue && (
                <span className="absolute right-2 top-2 h-2.5 w-2.5 rounded-full bg-primary" role="img" aria-label={homeCopy.review_dot_label} />
              )}
            </Link>
          ))}
        </div>
      </section>

      {earlier.length > 0 && <EarlierBlock notes={earlier} topics={earlierTopics} />}

      <footer className="space-y-2">
        <div className="flex flex-wrap gap-x-5 gap-y-2">
          <Link href={homeHref()} className={linkQuiet} data-testid="first-rebuild-link">The first rebuild</Link>
          <Link href={ROUTES.planNewRoleModels} className={linkQuiet} data-testid="role-models-link">Role models</Link>
        </div>
        <p className="text-xs text-muted-foreground" data-testid="counts">
          {counts.length ? `${homeCopy.count_prefix} ${counts.join(" · ")}` : homeCopy.count_empty}
        </p>
      </footer>
    </div>
  )
}

function StepRow({ n, step, seq }: { n: number; step: NorthStarTabId; seq: Sequence }) {
  const { plan, today } = usePlanNew()
  const numbers = planNumbers(plan, accountOf(plan), today)
  const s = numbers.steps[step]
  const screens = screensForStep(seq, step)
  const scored = SCORED_TABS.includes(step)
  const summary = stepSummary(plan, step, today)
  const first = s.chips[0]
  const pct = Math.floor(s.fraction * 100)
  return (
    <li className={card} data-testid={`home-${step}`} data-state={scored ? s.state : "unscored"}>
      <Link href={screenRoute(seq, screens[0])} className="block min-h-11" data-testid={`home-${step}-open`}>
        <div className="flex items-start gap-3">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white/10 text-xs text-foreground">{n}</span>
          <div className="min-w-0">
            <p className="text-sm font-medium text-foreground">{TAB_LABELS[step]}</p>
            <p className="text-xs text-muted-foreground">{TAB_BLURBS[step]}</p>
          </div>
        </div>
      </Link>
      {summary && <p className="mt-2 break-words pl-10 text-xs text-foreground" data-testid={`home-${step}-summary`}>{summary}</p>}
      {scored && (
        <div className="mt-3 flex flex-wrap items-center gap-2 pl-10">
          <span className={`inline-flex min-h-8 items-center rounded-full border px-3 text-xs ${chipTone[s.state]}`} data-testid={`home-${step}-state`}>
            {s.state === "done" ? homeCopy.status.done : s.state === "empty" ? homeCopy.status.not_started : `${pct} %`}
          </span>
          {first && s.state !== "empty" && (
            <Link
              href={first.areaId ? `${ROUTES.planNew}/now?area=${encodeURIComponent(first.areaId)}` : first.section ? `${ROUTES.planNew}/${first.section}` : screenRoute(seq, screens[0])}
              className="inline-flex min-h-11 max-w-full items-center rounded-lg border border-primary/50 bg-primary/10 px-3 py-2 text-left text-xs text-primary"
              data-testid={`home-${step}-chip`}
            >
              <span>
                <span className="block">{first.text}</span>
                {s.chips.length > 1 && <span className="block opacity-80">{fill(homeCopy.status.and_more, { n: s.chips.length - 1 })}</span>}
              </span>
            </Link>
          )}
        </div>
      )}
      {screens.length > 1 && (
        <details className="mt-2 pl-10">
          <summary className="min-h-11 cursor-pointer py-2.5 text-xs text-muted-foreground" data-testid={`home-${step}-parts`}>{`Parts (${screens.length})`}</summary>
          <ol className="space-y-1">
            {screens.map((screen, i) => (
              <li key={screen.id}>
                <Link href={screenRoute(seq, screen)} className="inline-flex min-h-11 items-center gap-2 text-xs text-primary hover:text-primary" data-testid={`home-part-${screen.id}`}>
                  <span className="tabular-nums text-muted-foreground">{i + 1}</span>
                  {SECTION_TITLES[screen.section as SectionId]}
                </Link>
              </li>
            ))}
          </ol>
        </details>
      )}
    </li>
  )
}
