"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { todayCopy } from "@/src/goals/planSteps/copy/daily"
import { homeCopy } from "@/src/goals/planSteps/copy/home"
import { commonCopy } from "@/src/goals/planSteps/copy/common"
import { addSubStep, countGoal, setCheckpointDone, setGoalReading } from "@/src/goals/northStarService"
import { toggleStepLogged } from "@/src/goals/northStarTrackService"
import { setAnswer } from "@/src/goals/planSteps/planChanges"
import {
  LINEUP_WEEK_VALUE_KEY, lineupIds, lineupMarkKey, protectedId, readText,
} from "@/src/goals/planSteps/planFacts"
import { homeHref, screenHref } from "@/src/goals/planSteps/planRoutes"
import {
  dueCards, fieldsFor, readingRows, rungsReachedBy, routineGroups, tasksDue, weekItems, type ReadingRow, type WeekItem,
} from "@/src/goals/planSteps/daily/todayModel"
import { fill, plural } from "@/src/goals/planSteps/text"
import { shownPerson } from "@/src/role-models/catalog"
import { memberForDay, quoteForDay } from "@/src/role-models/councilTypes"
import type { NsPlan, NsRoutineStep } from "@/src/goals/types"
import { usePlanNew } from "../PlanNewContext"
import { btnPrimary, btnQuiet, card, dateText, Line, linkQuiet, inputCls } from "../ui"
import { AnswerBox, DailyHeader, DayNoteBox, Fields, NumberQuestion, Section } from "./shared"

/** Not in the words file: a plain label for a tick box row, read out by screen readers. */
const TICK_LABEL = "Done"

export function TodayPage() {
  const { plan, status, store, today: date } = usePlanNew()
  const [toast, setToast] = useState<string[]>([])
  useEffect(() => {
    if (toast.length === 0) return
    const t = window.setTimeout(() => setToast([]), 5000)
    return () => window.clearTimeout(t)
  }, [toast])
  const say = (lines: string[]) => lines.length && setToast(lines)

  const groups = useMemo(() => routineGroups(plan, date), [plan, date])
  const items = useMemo(() => weekItems(plan, date), [plan, date])
  const tasks = useMemo(() => tasksDue(plan, date), [plan, date])
  const readings = useMemo(() => readingRows(plan, date), [plan, date])
  const dayFields = fieldsFor(plan, null)
  const cards = dueCards(
    plan, date, status.modules.review.reasons.concat(status.modules.goals.reasons), screenHref("season/done"), screenHref("season/close/brought"), screenHref("review/run/week"),
  )
  const unfinished = status.nextUp?.rule === "build"
  const pid = protectedId(plan)
  const protectedItem = items.find((i) => i.id === pid) ?? plan.routines.flatMap((r) => r.steps).map((s) => ({ id: s.id, title: s.title })).find((s) => s.id === pid)
  const protectedDone = pid ? items.find((i) => i.id === pid)?.count : null
  const empty = groups.length + items.length + tasks.length + readings.length + dayFields.length === 0

  if (!store.loaded) return <p className="px-4 text-sm text-zinc-500">…</p>

  const log = (item: WeekItem, by: 1 | -1) => {
    store.updateDay((p) => (item.kind === "goal" ? countGoal(p, date, item.id, by) : toggleStepLogged(p, date, item.id)))
    if (by > 0 && item.count + 1 === item.target) say([fill(todayCopy.celebrate.week_hit, { item: item.title, n: item.target })])
  }

  const onReading = (row: ReadingRow, v: number | null) => {
    store.updateDay((p) => setGoalReading(p, date, row.goal.id, v))
    if (v == null) return
    const hit = rungsReachedBy(row.goal, v)
    if (hit.length === 0) return
    store.update((p) => hit.reduce((acc, c) => setCheckpointDone(acc, row.goal.id, c.id, true, date), p))
    const last = hit[hit.length - 1]
    const lines = hit.map((c) => fill(todayCopy.celebrate.rung, { value: Number.parseFloat(c.title), unit: row.goal.unit, goal: row.goal.title }))
    const reward = last.celebration || row.goal.reward
    if (reward) lines.push(fill(todayCopy.celebrate.rung_reward, { reward }))
    if (row.goal.checkpoints.every((c) => c.done || hit.some((h) => h.id === c.id))) {
      lines.push(fill(todayCopy.celebrate.goal, { goal: row.goal.title }))
      if (row.goal.reward) lines.push(fill(todayCopy.celebrate.goal_reward, { reward: row.goal.reward }))
    }
    say(lines)
  }

  return (
    <div className="mx-auto w-full max-w-xl space-y-6 px-4 pb-24" data-testid="today">
      {toast.length > 0 && (
        <div className="fixed inset-x-4 top-3 z-40 mx-auto max-w-xl rounded-xl border border-emerald-400/40 bg-emerald-950/95 p-3 text-sm text-emerald-50 shadow-lg motion-safe:transition-opacity" role="status" data-testid="celebration">
          {toast.map((t, i) => <p key={i}>{t}</p>)}
        </div>
      )}
      <DailyHeader title={todayCopy.title} date={date} />
      {plan.season?.sentence.trim() && (
        <p className="text-sm text-zinc-300" data-testid="today-season">{fill(todayCopy.season_line, { sentence: plan.season.sentence })}</p>
      )}
      {protectedItem && (
        <p className="text-xs text-zinc-400" data-testid="today-protected">
          {todayCopy.protected_label}: {protectedItem.title}{" "}
          {protectedDone != null && `(${protectedDone > 0 ? todayCopy.protected_done : todayCopy.protected_not_yet})`}
        </p>
      )}

      {(cards.length > 0 || unfinished) && (
        <div className="space-y-2" data-testid="due-cards">
          {cards.map((c) => (
            <DueCardView key={c.id + (c.goalTitle ?? "")} card={c} />
          ))}
          {unfinished && cards.length < 2 && status.nextUp && (
            <section className={`${card} border-violet-500/30 bg-violet-500/[0.06]`} data-testid="today-next-up">
              <p className="text-xs font-medium uppercase tracking-wide text-violet-300">{homeCopy.next_up.heading}</p>
              <p className="mt-1 text-sm text-zinc-300">{fill(homeCopy.next_up.job_prefix, { job: status.nextUp.job })}</p>
              <Link href={status.nextUp.href} className={`${btnPrimary} mt-3`}>{homeCopy.next_up.continue}</Link>
            </section>
          )}
        </div>
      )}

      {groups.length > 0 && (
        <Section title={todayCopy.routines_heading} testId="today-routines">
          {groups.map(({ routine, steps }) => (
            <div key={routine.id} className={`${card} space-y-1`} data-testid={`routine-${routine.id}`}>
              <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">{routine.label}</p>
              {steps.map((s) => <StepRow key={s.id} step={s} date={date} onCheck={() => store.updateDay((p) => toggleStepLogged(p, date, s.id))} />)}
            </div>
          ))}
        </Section>
      )}

      {items.length > 0 && (
        <Section title={todayCopy.week_heading} testId="today-week">
          {items.map((i) => (
            <div key={i.id} className={`${card} space-y-2`} data-testid={`week-${i.id}`}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="break-words text-sm text-zinc-100">{i.title}</p>
                  <p className="text-xs text-zinc-400" data-testid={`week-${i.id}-count`}>{fill(todayCopy.week_count, { n: i.count, target: i.target })}</p>
                </div>
                <div className="flex shrink-0 gap-2">
                  {i.clean ? (
                    <button type="button" className={btnPrimary} onClick={() => log(i, plan.numbers[date]?.[i.id] ? -1 : 1)} data-testid={`clean-${i.id}`} aria-pressed={Boolean(plan.numbers[date]?.[i.id])}>
                      {todayCopy.clean_today}
                    </button>
                  ) : (
                    <>
                      <button type="button" className={btnQuiet} onClick={() => log(i, -1)} disabled={i.count === 0} data-testid={`undo-${i.id}`}>{todayCopy.undo_one}</button>
                      <button type="button" className={btnPrimary} onClick={() => log(i, 1)} data-testid={`log-${i.id}`}>{todayCopy.log_one}</button>
                    </>
                  )}
                </div>
              </div>
              <Fields fields={fieldsFor(plan, i.id)} date={date} />
              <Checklist targetId={i.id} date={date} />
            </div>
          ))}
        </Section>
      )}

      {tasks.length > 0 && (
        <Section title={todayCopy.tasks_heading} testId="today-tasks">
          {tasks.map(({ goal, checkpoint, dueOn, late }) => (
            <label key={checkpoint.id} className={`${card} flex min-h-11 cursor-pointer items-start gap-3`}>
              <input
                type="checkbox"
                className="mt-1 h-5 w-5 shrink-0"
                aria-label={TICK_LABEL}
                onChange={() => store.update((p) => setCheckpointDone(p, goal.id, checkpoint.id, true, date))}
                data-testid={`task-${checkpoint.id}`}
              />
              <span className="min-w-0">
                <span className="block break-words text-sm text-zinc-100">{goal.title}: {checkpoint.title}</span>
                <span className="block text-xs text-zinc-400">{fill(late > 0 ? todayCopy.task_overdue : todayCopy.task_due, { date: dateText(dueOn) })}</span>
              </span>
            </label>
          ))}
        </Section>
      )}

      {readings.length > 0 && (
        <Section title={todayCopy.readings_heading} testId="today-readings">
          {readings.map((r) => <ReadingView key={r.goal.id} row={r} date={date} onReading={onReading} />)}
        </Section>
      )}

      {dayFields.length > 0 && (
        <Section title={todayCopy.questions_heading} testId="today-questions">
          {dayFields.map((f) => (f.kind === "number" ? <div key={f.id} className={card}><NumberQuestion field={f} date={date} /></div> : <Fields key={f.id} fields={[f]} date={date} />))}
        </Section>
      )}

      <Lineup plan={plan} date={date} />

      <div className={card}><DayNoteBox date={date} /></div>

      {empty && (
        <section className={`${card} text-center`} data-testid="today-empty">
          <p className="text-sm font-medium text-zinc-100">{todayCopy.empty_title}</p>
          <p className="mt-1 text-sm text-zinc-400">{todayCopy.empty_body}</p>
          <Link href={homeHref()} className={`${btnPrimary} mt-3`}>{todayCopy.empty_button}</Link>
        </section>
      )}
      <Link href={homeHref()} className={linkQuiet}>{commonCopy.plan_home}</Link>
    </div>
  )
}

function DueCardView({ card: c }: { card: ReturnType<typeof dueCards>[number] }) {
  const d = todayCopy.due
  const title =
    c.id === "review" ? d.review_title
    : c.id === "season-ended" ? d.season_ended_title
    : c.id === "season-ending" ? (c.days === 0 ? homeCopy.season_band.ends_today : plural(d, "season_ending_title", c.days ?? 0))
    : fill(d.past_date_title, { goal: c.goalTitle ?? "" })
  const body = c.id === "review" ? d.review_body : c.id === "season-ended" ? d.season_ended_body : c.id === "season-ending" ? d.season_ending_body : d.past_date_body
  const button = c.id === "review" ? d.review_button : c.id === "season-ended" ? d.season_ended_button : c.id === "season-ending" ? d.season_ending_button : d.past_date_button
  return (
    <section className={`${card} border-amber-400/40 bg-amber-500/[0.06]`} data-testid={`due-${c.id}`}>
      <p className="text-sm font-semibold text-amber-100">{title}</p>
      <p className="mt-1 text-sm text-amber-50/80">{body}</p>
      <Link href={c.href} className={`${btnPrimary} mt-3`}>{button}</Link>
    </section>
  )
}

function StepRow({ step, date, onCheck }: { step: NsRoutineStep; date: string; onCheck: () => void }) {
  const { plan } = usePlanNew()
  const done = (plan.logged[date] ?? []).includes(step.id)
  const goes = step.goesTo ? readText(plan, step.goesTo) : null
  return (
    <div className="space-y-2" data-testid={`step-${step.id}`}>
      <label className="flex min-h-11 cursor-pointer items-center gap-3">
        <input type="checkbox" className="h-5 w-5 shrink-0" checked={done} onChange={onCheck} data-testid={`tick-${step.id}`} />
        <span className={`min-w-0 break-words text-sm ${done ? "text-zinc-500 line-through" : "text-zinc-100"}`}>{step.title}</span>
      </label>
      {goes && <p className="whitespace-pre-wrap break-words pl-8 text-sm text-zinc-400">{goes}</p>}
      {step.asks?.trim() && <div className="pl-8"><AnswerBox id={step.id} label={step.asks} date={date} testId={`asks-${step.id}`} /></div>}
      <div className="space-y-2 pl-8">
        <Fields fields={fieldsFor(plan, step.id)} date={date} />
        <Checklist targetId={step.id} date={date} />
      </div>
    </div>
  )
}

function Checklist({ targetId, date }: { targetId: string; date: string }) {
  const { plan, store, change } = usePlanNew()
  const subs = plan.subSteps.filter((u) => u.targetId === targetId)
  const [draft, setDraft] = useState("")
  const add = () => {
    if (!draft.trim()) return
    change((p) => addSubStep(p, targetId, draft))
    setDraft("")
  }
  return (
    <div className="space-y-1" data-testid={`checklist-${targetId}`}>
      {subs.map((u) => {
        const done = (plan.logged[date] ?? []).includes(u.id)
        return (
          <label key={u.id} className="flex min-h-11 cursor-pointer items-center gap-3">
            <input type="checkbox" className="h-5 w-5 shrink-0" checked={done} onChange={() => store.updateDay((p) => toggleStepLogged(p, date, u.id))} data-testid={`tick-${u.id}`} />
            <span className={`min-w-0 break-words text-sm ${done ? "text-zinc-500 line-through" : "text-zinc-200"}`}>{u.title}</span>
          </label>
        )
      })}
      <div className="flex items-end gap-2">
        <div className="min-w-0 flex-1">
          <Line label={todayCopy.checklist_add} value={draft} onChange={setDraft} placeholder={todayCopy.checklist_placeholder} max={200} onEnter={add} testId={`checklist-${targetId}-draft`} />
        </div>
        <button type="button" className={btnQuiet} onClick={add} disabled={!draft.trim()}>{commonCopy.add}</button>
      </div>
    </div>
  )
}

function ReadingView({ row, date, onReading }: { row: ReadingRow; date: string; onReading: (row: ReadingRow, v: number | null) => void }) {
  const { plan } = usePlanNew()
  const logged = plan.numbers[date]?.[row.goal.id]
  const unit = row.goal.unit
  return (
    <div className={`${card} space-y-2`} data-testid={`reading-${row.goal.id}`}>
      <p className="break-words text-sm text-zinc-100">{row.goal.title}</p>
      {row.nextValue != null && (
        <p className="text-xs text-zinc-400">
          {fill(todayCopy.reading_next, { value: row.nextValue, unit })}
          {row.toGo != null && row.toGo > 0 && ` · ${fill(todayCopy.reading_to_go, { n: row.toGo })}`}
        </p>
      )}
      <label className="block">
        <span className="mb-1 block text-sm font-medium text-zinc-200">{todayCopy.reading_label}{unit && ` (${unit})`}</span>
        <input
          type="number"
          inputMode="decimal"
          defaultValue={logged ?? ""}
          placeholder={todayCopy.reading_placeholder}
          onChange={(e) => { const t = e.target.value.trim(); onReading(row, t === "" ? null : Number.isFinite(Number(t)) ? Number(t) : null) }}
          className={inputCls}
          data-testid={`reading-${row.goal.id}-box`}
        />
      </label>
      {logged != null && <p className="text-xs text-emerald-300">{todayCopy.reading_logged}</p>}
    </div>
  )
}

function Lineup({ plan, date }: { plan: NsPlan; date: string }) {
  const { change } = usePlanNew()
  const ids = lineupIds(plan)
  const person = shownPerson(memberForDay(ids, date) ?? "")
  const week = plan.answers[LINEUP_WEEK_VALUE_KEY]?.trim()
  if (ids.length === 0 || (!person && !week)) return null
  const quote = person ? quoteForDay(person.quotes, date) : null
  const mark = plan.answers[lineupMarkKey(date)]
  const set = (v: "lived" | "short") => change((p) => setAnswer(p, lineupMarkKey(date), v))
  return (
    <Section title={todayCopy.lineup_heading} testId="today-lineup">
      <div className={`${card} space-y-2`}>
        {person && <p className="text-sm font-medium text-zinc-100">{fill(todayCopy.lineup_today, { name: person.name })}</p>}
        {quote && <p className="text-sm italic text-zinc-300">“{quote.text}”</p>}
        {week && (
          <>
            <p className="text-sm text-zinc-200">{fill(todayCopy.lineup_week_value, { value: week })}</p>
            <div className="flex gap-2">
              <button type="button" aria-pressed={mark === "lived"} className={`${btnQuiet} ${mark === "lived" ? "border-emerald-400/60 bg-emerald-500/15" : ""}`} onClick={() => set("lived")} data-testid="lineup-lived">{todayCopy.lived_it}</button>
              <button type="button" aria-pressed={mark === "short"} className={`${btnQuiet} ${mark === "short" ? "border-amber-400/60 bg-amber-500/15" : ""}`} onClick={() => set("short")} data-testid="lineup-short">{todayCopy.fell_short}</button>
            </div>
          </>
        )}
      </div>
    </Section>
  )
}

