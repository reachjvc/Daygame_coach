"use client"

import Link from "next/link"
import { useMemo } from "react"
import { trackCopy } from "@/src/goals/planSteps/copy/daily"
import { allAchievements } from "@/src/goals/planAchievementsService"
import { todayHref } from "@/src/goals/planSteps/planRoutes"
import { earlierRatings, earlierScores, climbs, pastWeeks, ratingStrip, weekRows, type Climb, type WeekRow } from "@/src/goals/planSteps/daily/trackModel"
import { fill } from "@/src/goals/planSteps/text"
import { usePlanNew } from "../PlanNewContext"
import { btnPrimary, card, dateText, weekdayName } from "../ui"
import { DailyHeader, Section } from "./shared"

export function TrackPage() {
  const { plan, store, today } = usePlanNew()
  const week = useMemo(() => weekRows(plan, today), [plan, today])
  const past = useMemo(() => pastWeeks(plan, today, 8), [plan, today])
  const cl = useMemo(() => climbs(plan, today), [plan, today])
  const ach = useMemo(() => allAchievements(plan, today), [plan, today])
  const numberFields = plan.fields.filter((f) => f.kind === "number")
  const earlier = useMemo(() => ({ daily: earlierRatings(plan), scores: earlierScores(plan) }), [plan])
  if (!store.loaded) return <p className="px-4 text-sm text-zinc-500">…</p>
  const empty = week.length === 0 && cl.length === 0 && past.length === 0 && ach.length === 0

  return (
    <div className="mx-auto w-full max-w-xl space-y-6 px-4 pb-24" data-testid="track">
      <DailyHeader title={trackCopy.title} />
      {empty && (
        <section className={`${card} text-center`} data-testid="track-empty">
          <p className="text-sm font-medium text-zinc-100">{trackCopy.empty_title}</p>
          <p className="mt-1 text-sm text-zinc-400">{trackCopy.empty_body}</p>
          <Link href={todayHref()} className={`${btnPrimary} mt-3`}>{trackCopy.empty_button}</Link>
        </section>
      )}

      {week.length > 0 && (
        <Section title={trackCopy.week_heading} testId="track-week">
          {week.map((r) => <WeekStrip key={r.item.id} row={r} />)}
        </Section>
      )}

      {cl.length > 0 && (
        <Section title={trackCopy.climbs_heading} testId="track-climbs">
          {cl.map((c) => <ClimbCard key={c.goal.id} climb={c} />)}
        </Section>
      )}

      {past.length > 0 && (
        <Section title={trackCopy.weeks_heading} testId="track-weeks">
          {past.map((w) => (
            <div key={w.monday} className={`${card} space-y-1`}>
              <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">{fill(trackCopy.weeks_row, { date: dateText(w.monday) })}</p>
              {w.rows.map((r) => (
                <p key={r.item.id} className="flex justify-between gap-3 text-sm text-zinc-200">
                  <span className="min-w-0 break-words">{r.item.title}</span>
                  <span className="shrink-0 text-zinc-300">{fill(trackCopy.week_line, { done: r.done, planned: r.planned })}</span>
                </p>
              ))}
            </div>
          ))}
        </Section>
      )}

      {ach.length > 0 ? (
        <Section title={trackCopy.achievements_heading} testId="track-achievements">
          <ul className="space-y-2">
            {ach.map((a) => (
              <li key={a.id} className={`${card} text-sm text-zinc-100`}>
                <span className="block break-words">{a.label}</span>
                <span className="block text-xs text-zinc-500">{a.partTitle}{a.earnedOn ? ` · ${dateText(a.earnedOn)}` : ""}</span>
              </li>
            ))}
          </ul>
        </Section>
      ) : (
        !empty && <Section title={trackCopy.achievements_heading}><p className="text-sm text-zinc-500">{trackCopy.achievements_empty}</p></Section>
      )}

      {numberFields.length > 0 && (
        <Section title={trackCopy.ratings_heading} testId="track-ratings">
          <p className="text-xs text-zinc-500">{trackCopy.ratings_range}</p>
          {numberFields.map((f) => <RatingStrip key={f.id} id={f.id} label={f.label} />)}
        </Section>
      )}

      {(earlier.daily.length > 0 || earlier.scores.length > 0) && (
        <details className={card} data-testid="track-earlier">
          <summary className="min-h-11 cursor-pointer text-sm font-medium text-zinc-300">{trackCopy.earlier_heading}</summary>
          <p className="mb-2 text-xs text-zinc-500">{trackCopy.earlier_help}</p>
          <ul className="space-y-2">
            {[...earlier.daily, ...earlier.scores].map((e, i) => (
              <li key={`${e.date}${i}`} className="text-sm text-zinc-300">
                <span className="block text-xs text-zinc-500">{dateText(e.date)}</span>
                {e.scores.map((s) => `${s.area} ${s.value}`).join(" · ")}
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  )
}

function WeekStrip({ row }: { row: WeekRow }) {
  const goal = row.item.kind === "goal"
  return (
    <div className={`${card} space-y-2`} data-testid={`strip-${row.item.id}`}>
      <div className="flex items-start justify-between gap-3">
        <p className="min-w-0 break-words text-sm text-zinc-100">{row.item.title}{row.protected && <span className="ml-2 text-xs text-violet-200">★</span>}</p>
        <p className="shrink-0 text-sm text-zinc-300">{fill(trackCopy.week_line, { done: row.done, planned: row.planned })}</p>
      </div>
      <div className="grid grid-cols-7 gap-1" aria-hidden>
        {row.days.map((n, i) => (
          <div key={i} className="text-center">
            <div className={`flex h-8 items-center justify-center rounded-md text-xs ${n > 0 ? "bg-violet-500/30 text-violet-50" : "bg-white/5 text-zinc-600"}`}>{n > 0 ? (goal ? n : "✓") : ""}</div>
            <div className="mt-0.5 text-[10px] text-zinc-500">{weekdayName(i + 1).slice(0, 2)}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

function ClimbCard({ climb: c }: { climb: Climb }) {
  const unit = c.goal.unit
  return (
    <div className={`${card} space-y-1`} data-testid={`climb-${c.goal.id}`}>
      <p className="break-words text-sm font-medium text-zinc-100">{c.goal.title}</p>
      {c.kind === "target" && (
        <p className="text-sm text-zinc-300">
          {c.now != null && fill(trackCopy.climb_now, { value: c.now, unit })}
          {c.now != null && c.next != null && " · "}
          {c.next != null && fill(trackCopy.climb_next, { value: c.next, unit })}
        </p>
      )}
      {c.kind === "finish" && (
        <>
          <p className="text-sm text-zinc-300">{fill(trackCopy.climb_tasks, { done: c.done, total: c.total })}</p>
          <ul className="space-y-0.5 text-xs text-zinc-400">
            {c.goal.checkpoints.map((s) => <li key={s.id}>{s.done ? "✓ " : ""}{s.title}{s.dueOn ? ` · ${dateText(s.dueOn)}` : ""}</li>)}
          </ul>
        </>
      )}
      {c.kind === "practice" && <p className="text-sm text-zinc-300">{fill(trackCopy.climb_stage, { s: c.stage, m: c.of, n: c.perWeek })}</p>}
      {c.kind === "growth" && <p className="text-sm text-zinc-300">{fill(trackCopy.climb_growth, { pct: c.pct })}</p>}
    </div>
  )
}

function RatingStrip({ id, label }: { id: string; label: string }) {
  const { plan, today } = usePlanNew()
  const strip = ratingStrip(plan, id, today, 30)
  const max = Math.max(1, ...strip.map((s) => s.value ?? 0))
  return (
    <div className={`${card} space-y-2`} data-testid={`ratings-${id}`}>
      <p className="break-words text-sm text-zinc-100">{label}</p>
      <div className="flex h-10 items-end gap-px" aria-hidden>
        {strip.map((s) => (
          <div key={s.date} className="flex h-full flex-1 items-end">
            <div className={s.value == null ? "h-0.5 w-full bg-white/10" : "w-full rounded-sm bg-violet-400/70"} style={s.value == null ? undefined : { height: `${Math.max(8, (s.value / max) * 100)}%` }} />
          </div>
        ))}
      </div>
      <p className="text-xs text-zinc-500">{strip.filter((s) => s.value != null).map((s) => s.value).join(" · ")}</p>
    </div>
  )
}

