"use client"

import Link from "next/link"
import { homeCopy } from "@/src/goals/planSteps/copy/home"
import { extrasCopy } from "@/src/goals/planSteps/copy/extras"
import { areasCopy } from "@/src/goals/planSteps/copy/areas"
import { directionCopy } from "@/src/goals/planSteps/copy/direction"
import { seasonCopy } from "@/src/goals/planSteps/copy/season"
import { goalsCopy } from "@/src/goals/planSteps/copy/goals"
import { actionsCopy } from "@/src/goals/planSteps/copy/actions"
import { reviewCopy } from "@/src/goals/planSteps/copy/review"
import { commonCopy } from "@/src/goals/planSteps/copy/common"
import { CORE_IDS, EXTRA_IDS, screenHref, readHref, type CoreId } from "@/src/goals/planSteps/planRoutes"
import { firstTarget, type ModuleStatus } from "@/src/goals/planSteps/planStatus"
import { protectedId, goalsOfTier, weeklyItems } from "@/src/goals/planSteps/planFacts"
import { fill, plural } from "@/src/goals/planSteps/text"
import { ROUTES } from "@/src/shared/routes"
import { addDaysISO } from "@/src/goals/northStarService"
import { usePlanNew } from "./PlanNewContext"
import { btnPrimary, card, dateText, linkQuiet } from "./ui"

const CORE_COPY = {
  areas: areasCopy, direction: directionCopy, season: seasonCopy, goals: goalsCopy, actions: actionsCopy, review: reviewCopy,
} as const

const chipTone = {
  "not-started": "border-white/10 text-zinc-400",
  done: "border-emerald-400/40 bg-emerald-500/10 text-emerald-200",
  "needs-a-look": "border-amber-400/50 bg-amber-500/10 text-amber-100",
} as const

export function Home() {
  const { plan, status, today, store } = usePlanNew()
  if (!store.loaded) return <p className="px-4 text-sm text-zinc-500">…</p>

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

  const next = status.nextUp
  const nextName = next ? CORE_COPY[next.module].name : ""

  return (
    <div className="mx-auto w-full max-w-xl space-y-6 px-4 pb-16" data-testid="plan-home">
      <header>
        <h1 className="text-2xl font-semibold text-zinc-50">{homeCopy.title}</h1>
      </header>

      {plan.season && (
        <Link href={screenHref("season/done")} className={`${card} block`} data-testid="season-band">
          {plan.season.sentence.trim() && <p className="text-sm font-medium text-zinc-100">{plan.season.sentence}</p>}
          <p className="mt-1 text-xs text-zinc-400">
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

      <section className={`${card} border-violet-500/30 bg-violet-500/[0.06]`} aria-label={homeCopy.next_up.heading} data-testid="next-up">
        {next ? (
          <>
            <p className="text-xs font-medium uppercase tracking-wide text-violet-300">{homeCopy.next_up.heading}</p>
            <p className="mt-1 text-lg font-semibold text-zinc-50">{nextName}</p>
            <p className="mt-1 text-sm text-zinc-300">{fill(homeCopy.next_up.job_prefix, { job: next.job })}</p>
            <Link href={next.href} className={`${btnPrimary} mt-3`} data-testid="next-up-go">
              {status.modules[next.module].started ? homeCopy.next_up.continue : homeCopy.next_up.start}
            </Link>
          </>
        ) : (
          <>
            <p className="text-xs font-medium uppercase tracking-wide text-violet-300">{homeCopy.next_up.all_set_heading}</p>
            <p className="mt-1 text-sm text-zinc-300">{homeCopy.next_up.all_set_job}</p>
            <Link href={`${ROUTES.planSandbox}?step=today`} className={`${btnPrimary} mt-3`} data-testid="next-up-today">
              {homeCopy.next_up.all_set_button}
            </Link>
          </>
        )}
      </section>

      <section aria-label={homeCopy.core_heading}>
        <h2 className="mb-2 text-sm font-semibold text-zinc-300">{homeCopy.core_heading}</h2>
        <ol className="space-y-2">
          {CORE_IDS.map((id, i) => (
            <CoreRow key={id} id={id} n={i + 1} m={status.modules[id]} firstOpen={firstTarget(id, plan)} />
          ))}
        </ol>
      </section>

      <section aria-label={homeCopy.extra_heading}>
        <h2 className="mb-2 text-sm font-semibold text-zinc-300">{homeCopy.extra_heading}</h2>
        <ul className="space-y-2">
          {EXTRA_IDS.map((id) => (
            <li key={id} className={`${card} flex items-start justify-between gap-3 opacity-70`} data-testid={`extra-${id}`}>
              <div className="min-w-0">
                <p className="text-sm font-medium text-zinc-200">{extrasCopy[id].name}</p>
                <p className="text-xs text-zinc-500">{extrasCopy[id].what_you_get}</p>
              </div>
              <span className="shrink-0 rounded-full border border-white/10 px-2.5 py-1 text-xs text-zinc-500">{comingSoon}</span>
            </li>
          ))}
        </ul>
      </section>

      <section aria-label={homeCopy.daily_heading}>
        <h2 className="mb-2 text-sm font-semibold text-zinc-300">{homeCopy.daily_heading}</h2>
        <div className="grid grid-cols-2 gap-2">
          <Link href={`${ROUTES.planSandbox}?step=today`} className={`${btnPrimary}`} data-testid="daily-today">{homeCopy.daily_today}</Link>
          <Link href={`${ROUTES.planSandbox}?step=track`} className={`${btnPrimary}`}>{homeCopy.daily_track}</Link>
          <Link href={`${ROUTES.planSandbox}?step=journal`} className={`${btnPrimary}`}>{homeCopy.daily_journal}</Link>
          <Link href={screenHref("review/done")} className={`${btnPrimary} relative`} data-testid="daily-review">
            {homeCopy.daily_review}
            {status.modules.review.reasons.some((r) => r.id === "review.due") && (
              <span className="absolute right-2 top-2 h-2.5 w-2.5 rounded-full bg-amber-400" role="img" aria-label={homeCopy.review_dot_label} />
            )}
          </Link>
        </div>
      </section>

      <footer className="space-y-2">
        <Link href={readHref()} className={linkQuiet} data-testid="read-all">{homeCopy.read_all_link}</Link>
        <p className="text-xs text-zinc-500" data-testid="counts">
          {counts.length ? `${homeCopy.count_prefix} ${counts.join(" · ")}` : homeCopy.count_empty}
        </p>
      </footer>
    </div>
  )
}

/** Not in the words file: a plain label for a module that opens nothing yet. */
const comingSoon = "Coming soon"

function CoreRow({ id, n, m, firstOpen }: { id: CoreId; n: number; m: ModuleStatus; firstOpen: string }) {
  const { plan, status } = usePlanNew()
  const copy = CORE_COPY[id]
  const locked = m.lockedBy
  const href = locked ? screenHref(firstTarget(locked, plan)) : m.started ? screenHref(`${id}/done`) : screenHref(firstOpen)
  const first = m.reasons[0]
  void status
  return (
    <li className={card} data-testid={`core-${id}`} data-state={locked ? "locked" : m.state}>
      <Link href={href} className="block" data-testid={`core-${id}-open`}>
        <div className="flex items-start gap-3">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white/10 text-xs text-zinc-300">{n}</span>
          <div className="min-w-0">
            <p className="text-sm font-medium text-zinc-100">{copy.name}</p>
            <p className="text-xs text-zinc-500">{copy.what_you_get}</p>
          </div>
        </div>
      </Link>
      <div className="mt-3 pl-10">
        {locked ? (
          <span className="inline-flex min-h-11 items-center text-xs text-zinc-500" data-testid={`core-${id}-chip`}>
            {fill(homeCopy.status.locked, { module: CORE_COPY[locked].name })}
          </span>
        ) : m.state === "needs-a-look" && first ? (
          <Link
            href={first.href}
            className={`inline-flex min-h-11 max-w-full items-center rounded-lg border px-3 py-2 text-left text-xs ${chipTone["needs-a-look"]}`}
            data-testid={`core-${id}-chip`}
            data-reason={first.id}
          >
            <span>
              <span className="font-semibold">{homeCopy.status.needs_look}</span>
              <span className="block">{first.text}</span>
              {m.reasons.length > 1 && <span className="block opacity-80">{fill(homeCopy.status.and_more, { n: m.reasons.length - 1 })}</span>}
            </span>
          </Link>
        ) : (
          <span className={`inline-flex min-h-8 items-center rounded-full border px-3 text-xs ${chipTone[m.state]}`} data-testid={`core-${id}-chip`}>
            {m.state === "done" ? homeCopy.status.done : homeCopy.status.not_started}
          </span>
        )}
      </div>
    </li>
  )
}

void commonCopy
