"use client"

import Link from "next/link"
import { useState } from "react"
import { reviewCopy } from "@/src/goals/planSteps/copy/review"
import { reviewPageCopy } from "@/src/goals/planSteps/copy/daily"
import { lineupIds } from "@/src/goals/planSteps/planFacts"
import { usePersonLookup } from "../usePersonLookup"
import { memberForDay } from "@/src/role-models/councilTypes"
import { commonCopy } from "@/src/goals/planSteps/copy/common"
import { protectedId, activeSeasonGoals, checkinSettings, weeklyItems, type WeeklyItem } from "@/src/goals/planSteps/planFacts"
import { dueCheckinWeek } from "@/src/goals/planSteps/planStatus"
import { nudgeWeekly, setCheckin, setRungReward, writeWeek } from "@/src/goals/planSteps/planChanges"
import { homeHref, screenHref } from "@/src/goals/planSteps/planRoutes"
import { fill } from "@/src/goals/planSteps/text"
import { addDaysISO } from "@/src/goals/northStarService"
import type { NsPlan } from "@/src/goals/types"
import { usePlanNew } from "../PlanNewContext"
import { useNav } from "../nav"
import { DoneScreen } from "../shared"
import { Chip, ChipRow, Frame, GrownText, Pick, Row, btnQuiet, btnPrimary, card, dateText, hourText, linkQuiet, weekdayName } from "../ui"

type Choice = "keep" | "up" | "down"

export function ReviewModule({ segs }: { segs: string[] }) {
  const { status } = usePlanNew()
  // Opening Review with no screen named: set it up, or run the check-in when it is due, else the summary.
  if (segs.length === 0) {
    if (!status.modules.review.started) return <NeedsSetup />
    if (status.modules.review.reasons.some((r) => r.id === "review.due")) return <Run step="week" />
    return <Done />
  }
  const first = segs[0]
  if (first === "time") return <Time />
  if (first === "phone") return <Phone />
  if (first === "run") return <Run step={segs[1] ?? "week"} />
  if (first === "done") return <Done />
  return <Day />
}

const SETUP_TOTAL = 3

function NeedsSetup() {
  return (
    <Frame testId="review-setup-needed" eyebrow={reviewCopy.name} title={reviewPageCopy.title} help={reviewPageCopy.setup_needed} back={{ href: homeHref() }}>
      <Link href={screenHref("review/day")} className={btnPrimary} data-testid="review-setup-go">{reviewPageCopy.setup_button}</Link>
    </Frame>
  )
}

function Day() {
  const { plan, change } = usePlanNew()
  const nav = useNav("review/done")
  const now = checkinSettings(plan, null)
  const [day, setDay] = useState<number | null>(now?.reviewDay ?? null)
  const commit = () => day && change((p) => setCheckin(p, { day }))
  return (
    <Frame
      testId="review-day"
      eyebrow={reviewCopy.name}
      title={reviewCopy.day.title}
      help={fill(reviewCopy.day.help, { fri: weekdayName(5), sun: weekdayName(7), mon: weekdayName(1), thu: weekdayName(4) })}
      dots={{ n: 1, m: SETUP_TOTAL }}
      back={{ href: nav.back(null), onClick: commit }}
      next={{ disabled: !day, onClick: () => { commit(); nav.go("review/time") } }}
      later={{ href: homeHref() }}
    >
      <Pick options={[1, 2, 3, 4, 5, 6, 7].map((d) => ({ id: String(d), label: weekdayName(d) }))} value={day ? [String(day)] : []} onChange={(v) => setDay(Number(v[0]))} testPrefix="review-day" />
    </Frame>
  )
}

function Time() {
  const { plan, change } = usePlanNew()
  const nav = useNav("review/done")
  const [hour, setHour] = useState(checkinSettings(plan, null)?.reviewHour ?? 19)
  const commit = () => change((p) => setCheckin(p, { hour }))
  return (
    <Frame
      testId="review-time"
      eyebrow={reviewCopy.name}
      title={reviewCopy.time.title}
      dots={{ n: 2, m: SETUP_TOTAL }}
      back={{ href: nav.back("review/day"), onClick: commit }}
      next={{ onClick: () => { commit(); nav.go("review/phone") } }}
      skip={{ onClick: () => nav.go("review/phone") }}
    >
      <div className="grid grid-cols-5 gap-2">
        {Array.from({ length: 17 }, (_, i) => i + 6).map((h) => (
          <Chip key={h} on={hour === h} testId={`hour-${h}`} onClick={() => setHour(h)}>{String(h).padStart(2, "0")}</Chip>
        ))}
      </div>
    </Frame>
  )
}

function Phone() {
  const { plan, change } = usePlanNew()
  const nav = useNav("review/done")
  const [on, setOn] = useState(checkinSettings(plan, null)?.pushOn ?? false)
  const commit = () => change((p) => setCheckin(p, { phone: on }))
  return (
    <Frame
      testId="review-phone"
      eyebrow={reviewCopy.name}
      title={reviewCopy.phone.title}
      help={reviewCopy.phone.copy_note}
      dots={{ n: 3, m: SETUP_TOTAL }}
      back={{ href: nav.back("review/time"), onClick: commit }}
      next={{ onClick: () => { commit(); nav.go("review/done") } }}
      skip={{ onClick: () => nav.go("review/done") }}
    >
      <ChipRow>
        <Chip on={on} testId="phone-on" onClick={() => setOn(true)}>{reviewCopy.phone.on}</Chip>
        <Chip on={!on} testId="phone-off" onClick={() => setOn(false)}>{reviewCopy.phone.off}</Chip>
      </ChipRow>
    </Frame>
  )
}

function Done() {
  const { plan, status } = usePlanNew()
  const nav = useNav("review/done")
  const s = checkinSettings(plan, null)
  const due = status.modules.review.reasons.some((r) => r.id === "review.due")
  const weeks = plan.reviews.filter((r) => r.cadence === "week")
  const h = reviewCopy.done
  const label = (r: NsPlan["reviews"][number]) =>
    r.cadence === "week" ? fill(h.history_week, { date: dateText(r.periodStart) })
    : r.cadence === "month" ? fill(h.history_month, { month: r.periodStart.slice(0, 7) })
    : r.cadence === "quarter" ? fill(h.history_quarter, { quarter: r.periodStart })
    : r.cadence === "year" ? fill(h.history_year, { year: r.periodStart.slice(0, 4) })
    : fill(h.history_week, { date: dateText(r.periodStart) })
  return (
    <DoneScreen module="review" eyebrow={reviewCopy.name} title={h.title}>
      {s && (
        <Row label={reviewCopy.day.title} href={nav.change("review/day")} testId="done-checkin">
          {fill(h.when_line, { day: weekdayName(s.reviewDay, "long"), time: hourText(s.reviewHour) })}
          <span className="block text-xs text-zinc-400">{s.pushOn ? h.reminder_on : h.reminder_off}</span>
        </Row>
      )}
      <Link href={nav.change("review/time")} className={linkQuiet}>{reviewCopy.time.title}</Link>
      {s && !due && (
        <p className="text-sm text-zinc-400" data-testid="review-not-due">
          {fill(reviewPageCopy.not_due, { day: weekdayName(s.reviewDay, "long"), time: hourText(s.reviewHour) })}
        </p>
      )}
      {due && (
        <Link href={screenHref("review/run/week")} className={btnPrimary} data-testid="start-run">{reviewCopy.reasons.due}</Link>
      )}
      <section className="space-y-2">
        <h2 className="text-sm font-semibold text-zinc-300">{h.history_heading}</h2>
        {plan.reviews.length === 0 ? <p className="text-sm text-zinc-500">{h.history_empty}</p> : (
          [...plan.reviews].reverse().map((r) => (
            <Row key={r.id} label={label(r)}>{r.lessons || r.nextOutcomes || ""}</Row>
          ))
        )}
        {weeks.length === 0 && null}
      </section>
    </DoneScreen>
  )
}

// ------------------------------------------------------------------- the run

const RUN = ["week", "rungs", "slipped", "next", "done"] as const

interface WeekFacts {
  monday: string
  sunday: string
  items: { item: WeeklyItem; done: number; planned: number; protected: boolean }[]
}

function weekFacts(plan: NsPlan, today: string, hour: number): WeekFacts {
  const s = checkinSettings(plan, null)
  const monday = dueCheckinWeek(today, hour, s?.reviewDay ?? 7, s?.reviewHour ?? 19)
  const days = Array.from({ length: 7 }, (_, i) => addDaysISO(monday, i))
  const items = weeklyItems(plan).map((item) => {
    const done = days.filter((d) => (plan.logged[d] ?? []).includes(item.id)).length
    const goal = plan.goals.find((g) => g.id === item.id)
    const step = plan.routines.flatMap((r) => r.steps).find((x) => x.id === item.id)
    return { item, done, planned: goal ? goal.perWeek ?? goal.daysPerWeek : step?.daysPerWeek ?? 0, protected: protectedId(plan) === item.id }
  })
  items.sort((a, b) => Number(b.protected) - Number(a.protected))
  return { monday, sunday: addDaysISO(monday, 6), items }
}

function Run({ step }: { step: string }) {
  const { plan, change, today } = usePlanNew()
  const nav = useNav("review/done")
  const [choices, setChoices] = useState<Record<string, Choice>>({})
  const facts = weekFacts(plan, today, new Date().getHours())
  const season = activeSeasonGoals(plan)
  const days = Array.from({ length: 7 }, (_, i) => addDaysISO(facts.monday, i))
  const reached = season.flatMap((g) => g.checkpoints.filter((c) => c.done && c.doneOn && days.includes(c.doneOn)).map((c) => ({ g, c })))
  const finished = plan.goals.filter((g) => g.status === "achieved" && g.statusOn && days.includes(g.statusOn))
  const slipped = facts.items.filter((f) => f.done < f.planned)
  const go = (id: (typeof RUN)[number]) => nav.router.push(screenHref(`review/run/${id}`))
  const visible = RUN.filter((r) => (r === "rungs" ? reached.length + finished.length > 0 : r === "slipped" ? slipped.length > 0 : r === "next" ? facts.items.length > 0 : true))
  const here = Math.max(0, visible.indexOf(step as (typeof RUN)[number]))
  const nextOf = () => visible[here + 1] ?? "done"
  const dots = { n: here + 1, m: visible.length }
  const prev = visible[here - 1]
  const chrome = { eyebrow: reviewCopy.name, dots, back: { href: prev ? screenHref(`review/run/${prev}`) : screenHref("review/done") } }
  const started = plan.reviews.some((r) => r.id === `week-${facts.monday}`)
  // The week's numbers are what keeps the check-in row (a row with no words is not kept by the plan's own save).
  const summary = facts.items.length
    ? facts.items.map((f) => `${f.item.title}: ${fill(reviewCopy.run.week.done_of_planned, { done: f.done, planned: f.planned })}`)
    : [reviewCopy.run.week.empty]
  const ensure = () => { if (!started) change((p) => writeWeek(p, facts.monday, today, { nextOutcomes: summary.join("\n") })) }
  const r = reviewCopy.run

  if (step === "rungs") {
    return (
      <Frame {...chrome} testId="run-rungs" title={r.rungs.title} help={r.rungs.help} next={{ onClick: () => { ensure(); go(nextOf()) } }} skip={{ onClick: () => go(nextOf()) }}>
        {reached.map(({ g, c }) => (
          <RungRow key={c.id} text={fill(r.rungs.rung_line, { goal: g.title, value: Number.parseFloat(c.title) || c.title, unit: g.unit })} reward={c.celebration || g.reward} onReward={(v) => change((p) => setRungReward(p, g.id, c.id, v))} />
        ))}
        {finished.map((g) => (
          <div key={g.id} className={`${card} space-y-2`}>
            <p className="text-sm text-zinc-100">{fill(r.rungs.goal_done, { goal: g.title })}</p>
            <Link href={screenHref(`goals/new/what?feeds=${g.feedsGoalIds[0] ?? ""}`)} className={linkQuiet}>{r.rungs.whats_next}</Link>
          </div>
        ))}
      </Frame>
    )
  }
  if (step === "slipped") {
    return <Slipped chrome={chrome} monday={facts.monday} slipped={slipped} onNext={() => go(nextOf())} />
  }
  if (step === "next") {
    return (
      <Frame
        {...chrome}
        testId="run-next"
        title={r.next.title}
        help={r.next.help}
        next={{
          onClick: () => {
            const lines: string[] = []
            change((p) => {
              let acc = p
              for (const f of facts.items) {
                const c = choices[f.item.id]
                if (!c || c === "keep") continue
                const moved = nudgeWeekly(acc, f.item, c === "up" ? 1 : -1)
                if (moved.from !== moved.to) lines.push(fill(r.next.change_line, { item: f.item.title, from: moved.from, to: moved.to }))
                acc = moved.plan
              }
              return writeWeek(acc, facts.monday, today, { nextOutcomes: [...summary, ...lines].join("\n") })
            })
            go("done")
          },
        }}
        skip={{ onClick: () => { ensure(); go("done") } }}
      >
        {facts.items.map((f) => {
          const at = f.planned
          return (
            <div key={f.item.id} className={`${card} space-y-2`} data-testid={`next-${f.item.id}`}>
              <p className="text-sm text-zinc-100">{f.item.title}</p>
              <Pick
                options={[{ id: "keep", label: r.next.keep }, { id: "up", label: r.next.step_up }, { id: "down", label: r.next.ease_off }]}
                value={choices[f.item.id] ? [choices[f.item.id]] : []}
                onChange={(v) => setChoices({ ...choices, [f.item.id]: v[0] as Choice })}
                testPrefix={`next-${f.item.id}`}
              />
              {choices[f.item.id] === "up" && at >= 7 && <p className="text-xs text-zinc-500">{r.next.at_max}</p>}
              {choices[f.item.id] === "down" && at <= 1 && <p className="text-xs text-zinc-500">{r.next.at_min}</p>}
            </div>
          )
        })}
      </Frame>
    )
  }
  if (step === "done") {
    return (
      <Frame {...chrome} testId="run-done" title={r.done.title} back={null} next={{ label: r.done.button, onClick: () => nav.router.push(screenHref("review/done")) }}>
        <WeekList facts={facts} />
        <div className="flex gap-4">
          <Link href={screenHref("actions/done")} className={linkQuiet}>{r.done.actions_link}</Link>
          <Link href={screenHref("review/done")} className={linkQuiet}>{r.done.history_link}</Link>
        </div>
      </Frame>
    )
  }
  return (
    <Frame {...chrome} testId="run-week" title={r.week.title} help={fill(r.week.dates, { start: dateText(facts.monday), end: dateText(facts.sunday) })} next={{ onClick: () => { ensure(); go(nextOf()) } }}>
      {plan.season?.sentence.trim() && <p className="text-sm text-zinc-400">{fill(r.week.season_line, { sentence: plan.season.sentence })}</p>}
      {facts.items.length === 0 ? <p className="text-sm text-zinc-500">{r.week.empty}</p> : <WeekList facts={facts} />}
      {season.filter((g) => g.type === "milestone_ladder").map((g) => {
        const latest = Object.entries(plan.numbers).filter(([d, m]) => days.includes(d) && m[g.id] != null).sort(([a], [b]) => (a < b ? 1 : -1))[0]
        const next = g.checkpoints.find((c) => c.id.startsWith("m") && !c.done)
        return (
          <p key={g.id} className="text-sm text-zinc-300">
            {g.title}: {latest ? fill(r.week.reading_line, { value: latest[1][g.id], unit: g.unit, next: next ? Number.parseFloat(next.title) || "" : "" }) : r.week.reading_none}
          </p>
        )
      })}
      {season.filter((g) => g.type === "achievement" && g.checkpoints.length > 0).map((g) => (
        <p key={g.id} className="text-sm text-zinc-300">{g.title}: {fill(r.week.tasks_line, { done: g.checkpoints.filter((c) => c.done).length, total: g.checkpoints.length })}</p>
      ))}
    </Frame>
  )
}

function WeekList({ facts }: { facts: WeekFacts }) {
  const r = reviewCopy.run.week
  return (
    <ul className="space-y-2" data-testid="week-list">
      {facts.items.map((f) => (
        <li key={f.item.id} className={`${card} flex items-center justify-between gap-2`}>
          <span className="min-w-0 break-words text-sm text-zinc-100">{f.item.title}</span>
          <span className="shrink-0 text-sm text-zinc-300">
            {fill(r.done_of_planned, { done: f.done, planned: f.planned })}
            {f.protected && <span className="ml-2 text-xs text-violet-200">{f.done >= f.planned ? r.protected_kept : r.protected_missed}</span>}
          </span>
        </li>
      ))}
    </ul>
  )
}

function RungRow({ text, reward, onReward }: { text: string; reward: string; onReward: (v: string) => void }) {
  const [draft, setDraft] = useState("")
  const r = reviewCopy.run.rungs
  return (
    <div className={`${card} space-y-2`}>
      <p className="text-sm text-zinc-100">{text}</p>
      {reward ? <p className="text-sm text-emerald-200">{fill(r.reward_line, { reward })}</p> : (
        <>
          <GrownText label={r.reward_label} value={draft} onChange={setDraft} placeholder={r.reward_placeholder} max={300} rows={1} />
          <button type="button" className={btnQuiet} disabled={!draft.trim()} onClick={() => onReward(draft.trim())}>{commonCopy.add}</button>
        </>
      )}
    </div>
  )
}

function Slipped({ chrome, monday, slipped, onNext }: { chrome: { eyebrow: string; dots: { n: number; m: number }; back: { href: string } }; monday: string; slipped: WeekFacts["items"]; onNext: () => void }) {
  const { plan, change, today } = usePlanNew()
  const s = reviewCopy.run.slipped
  const week = plan.reviews.find((r) => r.id === `week-${monday}`)
  const [text, setText] = useState(week?.lessons ?? "")
  const commit = () => change((p) => writeWeek(p, monday, today, { lessons: text }))
  const lookup = usePersonLookup()
  const hint = lookup?.(memberForDay(lineupIds(plan), today) ?? "")?.name ?? ""
  return (
    <Frame {...chrome} testId="run-slipped" title={s.title} help={s.help} next={{ onClick: () => { commit(); onNext() } }} skip={{ onClick: onNext }}>
      <GrownText label={s.field_label} value={text} onChange={setText} placeholder={s.placeholder} max={3000} rows={3} testId="slipped-text" />
      <ul className="space-y-2" data-testid="slipped-items">
        {slipped.map((f) => (
          <li key={f.item.id} className={`${card} flex items-center justify-between gap-3`}>
            <span className="min-w-0 break-words text-sm text-zinc-100">{f.item.title}</span>
            <Link href={screenHref(`obstacles/what?goal=${f.item.serves[0] ?? ""}`)} className={`${linkQuiet} shrink-0`} data-testid={`plan-for-${f.item.id}`}>{s.plan_for_it}</Link>
          </li>
        ))}
      </ul>
      {hint && <p className="text-sm text-violet-200" data-testid="lineup-hint">{fill(s.lineup_hint, { name: hint })}</p>}
    </Frame>
  )
}

