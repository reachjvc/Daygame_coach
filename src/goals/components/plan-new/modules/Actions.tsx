"use client"

import Link from "next/link"
import { useState } from "react"
import { actionsCopy } from "@/src/goals/planSteps/copy/actions"
import { commonCopy } from "@/src/goals/planSteps/copy/common"
import { protectedId, activeSeasonGoals, itemsServingSeason, weeklyItems } from "@/src/goals/planSteps/planFacts"
import { addAction, addSubStep, linkStepToGoal, removeAction, removeSubStep, setPracticeLoad, setProtected, setStepDays, updateAction } from "@/src/goals/planSteps/planChanges"
import { ideasFor } from "@/src/goals/planSteps/areaThemes"
import { homeHref, screenHref } from "@/src/goals/planSteps/planRoutes"
import { fill } from "@/src/goals/planSteps/text"
import type { NsGoal, NsPlan, NsRoutineStep } from "@/src/goals/types"
import { usePlanNew } from "../PlanNewContext"
import { useNav } from "../nav"
import { DoneScreen, NeedsFirst } from "../shared"
import { Chip, ChipRow, Frame, Label, Line, Pick, Row, btnQuiet, card, linkQuiet, weekdayName } from "../ui"

export function ActionsModule({ segs }: { segs: string[] }) {
  const { status, plan } = usePlanNew()
  const first = segs[0] ?? (status.modules.actions.started ? "done" : "goal")
  if (first === "goal") return <PerGoal id={segs[1] ?? activeSeasonGoals(plan)[0]?.id ?? ""} />
  if (first === "days") return <Days />
  if (first === "protect") return <Protect />
  if (first === "sub") return <Sub id={segs[1] ?? ""} />
  return <Done />
}

const stepsServing = (plan: NsPlan, goalId: string): NsRoutineStep[] =>
  plan.routines.flatMap((r) => r.steps).filter((s) => s.servesGoalIds.includes(goalId))

function PerGoal({ id }: { id: string }) {
  const { plan, change } = usePlanNew()
  const nav = useNav("actions/done")
  const goals = activeSeasonGoals(plan)
  const i = goals.findIndex((g) => g.id === id)
  const goal = goals[i] as NsGoal | undefined
  const [title, setTitle] = useState("")
  const [times, setTimes] = useState(3)
  if (!goal) return <NeedsFirst eyebrow={actionsCopy.name} kind="goal" href={screenHref("goals/new/what")} back={homeHref()} />
  const mine = stepsServing(plan, goal.id)
  const area = plan.areas.find((a) => a.id === goal.areaId)
  const ideas = area ? ideasFor(area, actionsCopy.ideas_per_area) : []
  const already = plan.routines.flatMap((r) => r.steps).filter((s) => s.daysPerWeek > 0 && !s.servesGoalIds.includes(goal.id))
  const last = i === goals.length - 1
  const none = itemsServingSeason(plan).length === 0
  const add = (t: string, n: number) => {
    const text = t.trim()
    if (!text) return
    change((p) => addAction(p, goal.id, text, n))
    setTitle("")
  }
  const t = actionsCopy.goal
  return (
    <Frame
      testId="actions-goal"
      eyebrow={actionsCopy.name}
      title={fill(t.title, { goal: goal.title })}
      help={t.help}
      dots={{ n: i + 1, m: goals.length }}
      back={{ href: nav.back(i > 0 ? `actions/goal/${goals[i - 1].id}` : null) }}
      next={{ disabled: last && none, onClick: () => nav.go(last ? "actions/days" : `actions/goal/${goals[i + 1].id}`) }}
      later={{ href: homeHref() }}
    >
      {goal.type === "habit_ramp" && (
        <div className={card}>
          <p className="text-sm text-zinc-200">{fill(t.practice_note, { goal: goal.title, n: goal.perWeek ?? goal.daysPerWeek })}</p>
          <ChipRow>
            <button type="button" className={btnQuiet} onClick={() => change((p) => setPracticeLoad(p, goal.id, (goal.perWeek ?? goal.daysPerWeek) - 1))}>−</button>
            <button type="button" className={btnQuiet} onClick={() => change((p) => setPracticeLoad(p, goal.id, (goal.perWeek ?? goal.daysPerWeek) + 1))}>+</button>
            <span className="self-center text-xs text-zinc-500">{t.practice_edit}</span>
          </ChipRow>
        </div>
      )}
      {mine.length > 0 && (
        <ul className="space-y-2" data-testid="goal-actions">
          {mine.map((s) => (
            <li key={s.id} className={`${card} space-y-2`} data-testid={`action-${s.id}`}>
              <p className="break-words text-sm text-zinc-100">{s.title}</p>
              <div className="flex items-center justify-between gap-2">
                <ChipRow>
                  {[1, 2, 3, 4, 5, 6, 7].map((n) => (
                    <Chip key={n} on={s.daysPerWeek === n} onClick={() => change((p) => updateAction(p, goal.id, s.id, { daysPerWeek: n }))}>{n}</Chip>
                  ))}
                </ChipRow>
              </div>
              <button type="button" className={btnQuiet} onClick={() => change((p) => removeAction(p, goal.id, s.id))}>{commonCopy.remove}</button>
            </li>
          ))}
        </ul>
      )}
      <div className={card}>
        <Line label={t.action_label} value={title} onChange={setTitle} placeholder={t.action_placeholder} max={200} onEnter={() => add(title, times)} testId="action-title" />
        <Label>{t.times_label}</Label>
        <ChipRow>
          {[1, 2, 3, 4, 5, 6, 7].map((n) => (
            <Chip key={n} on={times === n} testId={`times-${n}`} onClick={() => setTimes(n)}>{n}</Chip>
          ))}
        </ChipRow>
        <button type="button" className={`${btnQuiet} mt-3`} onClick={() => add(title, times)} disabled={!title.trim()} data-testid="action-add">{commonCopy.add}</button>
      </div>
      {ideas.length > 0 && (
        <div>
          <p className="mb-1 text-xs font-medium uppercase tracking-wide text-zinc-500">{fill(t.ideas_heading, { area: area?.label ?? "" })}</p>
          <ChipRow>{ideas.map((x) => <Chip key={x} onClick={() => add(x, 3)}>{x}</Chip>)}</ChipRow>
        </div>
      )}
      {already.length > 0 && (
        <div>
          <p className="mb-1 text-xs font-medium uppercase tracking-wide text-zinc-500">{t.already_heading}</p>
          <ChipRow>
            {already.map((s) => {
              const routine = plan.routines.find((r) => r.steps.some((x) => x.id === s.id))
              return <Chip key={s.id} onClick={() => routine && change((p) => linkStepToGoal(p, routine.id, s.id, goal.id, true))}>{s.title}</Chip>
            })}
          </ChipRow>
        </div>
      )}
      {last && none && <p className="text-sm text-amber-300" role="status">{t.error_none}</p>}
    </Frame>
  )
}

function Days() {
  const { plan, change } = usePlanNew()
  const nav = useNav("actions/done")
  const steps = [...new Map(activeSeasonGoals(plan).flatMap((g) => stepsServing(plan, g.id)).map((s) => [s.id, s])).values()]
  const [days, setDays] = useState<Record<string, number[]>>(Object.fromEntries(steps.map((s) => [s.id, s.days])))
  const [time, setTime] = useState<Record<string, string>>(
    Object.fromEntries(steps.map((s) => [s.id, s.startMin != null ? `${String(Math.floor(s.startMin / 60)).padStart(2, "0")}:${String(s.startMin % 60).padStart(2, "0")}` : ""])),
  )
  const commit = () =>
    change((p) =>
      steps.reduce((acc, s) => {
        const t = time[s.id]
        const startMin = t && /^\d\d:\d\d$/.test(t) ? Number(t.slice(0, 2)) * 60 + Number(t.slice(3)) : null
        return setStepDays(acc, s.id, days[s.id] ?? [], startMin)
      }, p),
    )
  const last = activeSeasonGoals(plan).at(-1)
  return (
    <Frame
      testId="actions-days"
      eyebrow={actionsCopy.name}
      title={actionsCopy.days.title}
      help={actionsCopy.days.help}
      back={{ href: nav.back(last ? `actions/goal/${last.id}` : null), onClick: commit }}
      next={{ onClick: () => { commit(); nav.go("actions/protect") } }}
      skip={{ onClick: () => nav.go("actions/protect") }}
    >
      {steps.map((s) => (
        <div key={s.id} className={`${card} space-y-2`}>
          <p className="text-sm font-medium text-zinc-100">{s.title}</p>
          <ChipRow>
            {[0, 1, 2, 3, 4, 5, 6].map((d) => {
              const on = (days[s.id] ?? []).includes(d)
              return (
                <Chip key={d} on={on} testId={`day-${s.id}-${d}`} onClick={() => setDays({ ...days, [s.id]: on ? days[s.id].filter((x) => x !== d) : [...(days[s.id] ?? []), d] })}>
                  {weekdayName(d + 1)}
                </Chip>
              )
            })}
          </ChipRow>
          <Line label={actionsCopy.days.time_label} type="text" value={time[s.id] ?? ""} onChange={(v) => setTime({ ...time, [s.id]: v })} placeholder="07:30" max={5} />
        </div>
      ))}
    </Frame>
  )
}

function Protect() {
  const { plan, change } = usePlanNew()
  const nav = useNav("actions/done")
  const items = weeklyItems(plan)
  const [id, setId] = useState<string | null>(items.some((i) => i.id === protectedId(plan)) ? protectedId(plan) : null)
  if (items.length === 0) return <NeedsFirst eyebrow={actionsCopy.name} kind="weekly_action" href={screenHref("actions/goal")} back={homeHref()} />
  const commit = () => change((p) => setProtected(p, id))
  return (
    <Frame
      testId="actions-protect"
      eyebrow={actionsCopy.protect.eyebrow}
      title={actionsCopy.protect.title}
      help={actionsCopy.protect.help}
      back={{ href: nav.back("actions/days"), onClick: commit }}
      next={{ onClick: () => { commit(); nav.go("actions/done") } }}
      skip={{ onClick: () => nav.go("actions/done") }}
    >
      <Pick options={items.map((i) => ({ id: i.id, label: i.title }))} value={id ? [id] : []} onChange={(v) => setId(v[0])} testPrefix="protect" />
      {id && <button type="button" className={linkQuiet} onClick={() => setId(null)}>{commonCopy.clear_choice}</button>}
    </Frame>
  )
}

function Sub({ id }: { id: string }) {
  const { plan, change } = usePlanNew()
  const nav = useNav("actions/done")
  const step = plan.routines.flatMap((r) => r.steps).find((s) => s.id === id)
  const [draft, setDraft] = useState("")
  if (!step) return <NeedsFirst eyebrow={actionsCopy.name} kind="weekly_action" href={screenHref("actions/goal")} back={homeHref()} />
  const mine = plan.subSteps.filter((x) => x.targetId === id)
  const add = () => {
    if (!draft.trim()) return
    change((p) => addSubStep(p, id, draft.trim()))
    setDraft("")
  }
  return (
    <Frame testId="actions-sub" eyebrow={actionsCopy.name} title={fill(actionsCopy.sub.title, { action: step.title })} help={actionsCopy.sub.help} back={{ href: nav.back("actions/done") }} next={{ onClick: () => nav.go("actions/done") }}>
      <ul className="space-y-2">
        {mine.map((x) => (
          <li key={x.id} className={`${card} flex items-center justify-between gap-2`}>
            <span className="min-w-0 break-words text-sm">{x.title}</span>
            <button type="button" className={btnQuiet} onClick={() => change((p) => removeSubStep(p, x.id))}>{commonCopy.remove}</button>
          </li>
        ))}
      </ul>
      <Line label={actionsCopy.sub.field_label} value={draft} onChange={setDraft} placeholder={actionsCopy.sub.placeholder} onEnter={add} testId="sub-draft" />
      <button type="button" className={btnQuiet} onClick={add} disabled={!draft.trim()}>{commonCopy.add}</button>
    </Frame>
  )
}

function Done() {
  const { plan } = usePlanNew()
  const nav = useNav("actions/done")
  const goals = activeSeasonGoals(plan)
  const items = weeklyItems(plan)
  const total = items.reduce((n, i) => {
    if (i.kind === "goal") {
      const g = plan.goals.find((x) => x.id === i.id)
      return n + (g?.perWeek ?? g?.daysPerWeek ?? 0)
    }
    return n + (plan.routines.flatMap((r) => r.steps).find((s) => s.id === i.id)?.daysPerWeek ?? 0)
  }, 0)
  const d = actionsCopy.done
  const hhmm = (m: number) => `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`
  const dayLine = (s: NsRoutineStep) =>
    s.days.length ? `${fill(d.fixed_days, { days: s.days.map((x) => weekdayName(x + 1)).join(", ") })}${s.startMin != null ? ` ${fill(d.at_time, { time: hhmm(s.startMin) })}` : ""}` : ""
  return (
    <DoneScreen module="actions" eyebrow={actionsCopy.name} title={d.title}>
      {goals.map((g) => (
        <section key={g.id} className="space-y-2" data-testid={`done-actions-${g.id}`}>
          <h2 className="text-sm font-semibold text-zinc-300">{g.title}</h2>
          {g.type === "habit_ramp" && <Row label="" href={nav.change(`actions/goal/${g.id}`)}>{fill(d.times, { n: g.perWeek ?? g.daysPerWeek })}{protectedId(plan) === g.id && ` · ${d.protected_badge}`}</Row>}
          {stepsServing(plan, g.id).map((s) => (
            <Row key={s.id} label="" href={nav.change(`actions/goal/${g.id}`)}>
              <span className="block">{s.title}{protectedId(plan) === s.id && <span className="ml-2 rounded-full border border-violet-400/50 px-2 text-xs text-violet-200">{d.protected_badge}</span>}</span>
              <span className="block text-xs text-zinc-400">{fill(d.times, { n: s.daysPerWeek })} {dayLine(s)}</span>
              <Link href={screenHref(`actions/sub/${s.id}`)} className="text-xs text-zinc-400 underline">{d.checklist_link}</Link>
            </Row>
          ))}
        </section>
      ))}
      <p className="text-sm text-zinc-300" data-testid="week-load">{fill(d.load_line, { n: total })}</p>
      <div className="flex gap-4">
        <Link href={nav.change("actions/days")} className={linkQuiet}>{actionsCopy.days.title}</Link>
        <Link href={nav.change("actions/protect")} className={linkQuiet}>{actionsCopy.protect.eyebrow}</Link>
      </div>
    </DoneScreen>
  )
}
