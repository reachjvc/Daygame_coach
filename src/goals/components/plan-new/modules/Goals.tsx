"use client"

import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { useState } from "react"
import { goalsCopy } from "@/src/goals/planSteps/copy/goals"
import { commonCopy, moreReasonsCopy } from "@/src/goals/planSteps/copy/common"
import { activeAreas, activeSeasonGoals, goalsOfTier, otherActiveGoals, numbersComplete, tierOf } from "@/src/goals/planSteps/planFacts"
import {
  addSeasonGoal, addToSeason, lowerFirstStep, rungValues, setFeeds, setFinishTasks, setGoalKind, setGoalReward, setGoalStatus, setGoalWhy, setPracticeNumbers,
  setReasons, setTargetNumbers, shapeOf, spreadTasks, type RungShape,
} from "@/src/goals/planSteps/planChanges"
import { goalNotes } from "@/src/goals/planSteps/earlierNotes"
import { homeHref, screenHref } from "@/src/goals/planSteps/planRoutes"
import { fill } from "@/src/goals/planSteps/text"
import { updateGoal } from "@/src/goals/northStarService"
import type { NsGoal } from "@/src/goals/types"
import { usePlanNew } from "../PlanNewContext"
import { useNav } from "../nav"
import { DoneScreen, EarlierBlock, NeedsFirst } from "../shared"
import { BadDay, Chip, ChipRow, Frame, GrownText, Label, Line, LineList, Pick, Row, btnPrimary, btnQuiet, card, dateText, linkQuiet } from "../ui"

export function GoalsModule({ segs }: { segs: string[] }) {
  const { status, plan } = usePlanNew()
  const first = segs[0]
  if (!first) return <List redirectDone={status.modules.goals.started} />
  if (first === "list") return <List />
  if (first === "done") return <Done />
  const goal = plan.goals.find((g) => g.id === first)
  const step = segs[1] ?? "what"
  if (first === "new") return <What id={null} />
  if (!goal) return <NeedsFirst eyebrow={goalsCopy.name} kind="goal" href={screenHref("goals/new/what")} back={homeHref()} />
  switch (step) {
    case "kind": return <Kind id={goal.id} />
    case "numbers": return <Numbers id={goal.id} />
    case "first": return <First id={goal.id} />
    case "why": return <Why id={goal.id} />
    case "feeds": return <Feeds id={goal.id} />
    case "mark": return <Mark id={goal.id} />
    case "status": return <Status id={goal.id} />
    default: return <What id={goal.id} />
  }
}

const num = (s: string): number | null => {
  const n = Number(s.trim().replace(",", "."))
  return s.trim() && Number.isFinite(n) ? n : null
}

function useGoal(id: string): NsGoal {
  const { plan } = usePlanNew()
  return plan.goals.find((g) => g.id === id)!
}

/** The screens a goal passes through, so the dots and the next screen agree. */
function runOf(goal: NsGoal, hasBigger: boolean): string[] {
  const run = ["what", "kind", "numbers"]
  if (goal.type !== "achievement") run.push("first")
  run.push("why")
  if (hasBigger) run.push("feeds")
  run.push("mark")
  return run
}

function useRun(id: string, here: string) {
  const { plan } = usePlanNew()
  const goal = plan.goals.find((g) => g.id === id)
  if (!goal) return { dots: { n: 1, m: 6 }, next: "goals/list", prev: null as string | null }
  const hasBigger = [...goalsOfTier(plan, "life"), ...goalsOfTier(plan, "become")].length > 0
  const run = runOf(goal, hasBigger)
  const i = Math.max(0, run.indexOf(here))
  return {
    dots: { n: i + 1, m: run.length },
    next: i + 1 < run.length ? `goals/${id}/${run[i + 1]}` : "goals/list",
    prev: i > 0 ? `goals/${id}/${run[i - 1]}` : null,
  }
}

function What({ id }: { id: string | null }) {
  const { plan, change } = usePlanNew()
  const nav = useNav("goals/done")
  const search = useSearchParams()
  const goal = id ? plan.goals.find((g) => g.id === id) : null
  const areas = activeAreas(plan)
  const seasonAreas = plan.seasonAreaIds.filter((a) => areas.some((x) => x.id === a))
  const covered = new Set(activeSeasonGoals(plan).map((g) => g.areaId))
  const preset = search.get("area")
  const defaultArea = (preset && areas.some((a) => a.id === preset) ? preset : null) ?? seasonAreas.find((a) => !covered.has(a)) ?? seasonAreas[0] ?? areas[0]?.id ?? ""
  const [title, setTitle] = useState(goal?.title ?? "")
  const [areaId, setAreaId] = useState(goal?.areaId ?? defaultArea)
  const run = useRun(id ?? "", "what")
  const dots = run.dots
  const feeds = search.get("feeds")
  const go = () => {
    const t = title.trim()
    if (!t) return
    if (goal) {
      change((p) => updateGoal(p, goal.id, { title: t, areaId }))
      nav.go(`goals/${goal.id}/kind`)
      return
    }
    let madeId = ""
    change((p) => {
      const made = addSeasonGoal(p, areaId, t)
      if (!made) return p
      madeId = made.id
      return feeds ? setFeeds(made.plan, made.id, [feeds]) : made.plan
    })
    if (madeId) nav.go(`goals/${madeId}/kind`)
  }
  return (
    <Frame
      testId="goal-what"
      eyebrow={goalsCopy.name}
      title={goalsCopy.what.title}
      dots={dots}
      back={{ href: nav.back(goal ? "goals/list" : plan.goals.length ? "goals/list" : null) }}
      next={{ disabled: !title.trim(), onClick: go }}
      later={{ href: homeHref() }}
    >
      <Line label={goalsCopy.what.field_label} value={title} onChange={setTitle} placeholder={goalsCopy.what.placeholder} max={200} testId="goal-title" onEnter={go} />
      {!title.trim() && <p className="text-xs text-zinc-500">{goalsCopy.what.error_empty}</p>}
      <div>
        <Label>{goalsCopy.what.area_label}</Label>
        <Pick options={areas.map((a) => ({ id: a.id, label: a.label }))} value={areaId ? [areaId] : []} onChange={(v) => setAreaId(v[0])} testPrefix="goal-area" />
      </div>
    </Frame>
  )
}

function Kind({ id }: { id: string }) {
  const { change } = usePlanNew()
  const nav = useNav("goals/done")
  const goal = useGoal(id)
  const configured = numbersComplete(goal) && (goal.type !== "achievement" || goal.checkpoints.length > 0 || goal.targetDate != null)
  const [kind, setKind] = useState<NsGoal["type"] | null>(configured ? goal.type : null)
  const run = useRun(id, "kind")
  const commit = () => kind && change((p) => setGoalKind(p, id, kind))
  return (
    <Frame
      testId="goal-kind"
      eyebrow={goalsCopy.name}
      title={goalsCopy.kind.title}
      dots={run.dots}
      back={{ href: nav.back(run.prev), onClick: commit }}
      next={{ disabled: !kind, onClick: () => { commit(); nav.go(`goals/${id}/numbers`) } }}
      later={{ href: homeHref() }}
    >
      <div className="space-y-2">
        {([
          ["milestone_ladder", goalsCopy.kind.target, goalsCopy.kind.target_sub],
          ["habit_ramp", goalsCopy.kind.practice, goalsCopy.kind.practice_sub],
          ["achievement", goalsCopy.kind.finish, goalsCopy.kind.finish_sub],
        ] as const).map(([k, label, sub]) => (
          <button
            key={k}
            type="button"
            data-testid={`kind-${k}`}
            aria-pressed={kind === k}
            onClick={() => setKind(k)}
            className={`flex min-h-14 w-full flex-col rounded-lg border px-4 py-3 text-left ${kind === k ? "border-violet-400/60 bg-violet-500/20 text-violet-50" : "border-white/10 text-zinc-200"}`}
          >
            <span className="text-sm font-medium">{label}</span>
            <span className="text-xs text-zinc-400">{sub}</span>
          </button>
        ))}
      </div>
    </Frame>
  )
}

function Numbers({ id }: { id: string }) {
  const goal = useGoal(id)
  const run = useRun(id, "numbers")
  if (goal.type === "milestone_ladder") return <TargetNumbers goal={goal} run={run} />
  if (goal.type === "habit_ramp") return <PracticeNumbers goal={goal} run={run} />
  return <FinishNumbers goal={goal} run={run} />
}

type Run = ReturnType<typeof useRun>

function TargetNumbers({ goal, run }: { goal: NsGoal; run: Run }) {
  const { plan, change } = usePlanNew()
  const nav = useNav("goals/done")
  const l = goal.ladder
  const [unit, setUnit] = useState(goal.unit)
  const [now, setNow] = useState(l && goal.unit ? String(l.start) : "")
  const [target, setTarget] = useState(l && goal.unit ? String(l.target) : "")
  const [by, setBy] = useState(goal.targetDate ?? plan.season?.endsOn ?? "")
  const [count, setCount] = useState(l?.steps && goal.unit ? l.steps : 6)
  const [shape, setShape] = useState<RungShape>(shapeOf(l?.curveTension ?? 0.5))
  const [editing, setEditing] = useState(false)
  const [pins, setPins] = useState<Record<number, string>>({})
  const from = num(now)
  const to = num(target)
  const problem = !unit.trim() ? goalsCopy.numbers.target.error_unit : to == null ? goalsCopy.numbers.target.error_target : from != null && from === to ? goalsCopy.numbers.target.error_same : ""
  const rungs = from != null && to != null && from !== to ? rungValues(from, to, count, shape) : []
  const commit = () => {
    if (problem || to == null) return false
    const typed: Record<number, number> = {}
    for (const [k, v] of Object.entries(pins)) {
      const n = num(v)
      if (n != null) typed[Number(k)] = n
    }
    change((p) => setTargetNumbers(p, goal.id, { unit, from: from ?? 0, to, count, shape, by: by || null, pins: typed }))
    return true
  }
  const t = goalsCopy.numbers.target
  return (
    <Frame
      testId="goal-numbers"
      eyebrow={goalsCopy.name}
      title={t.title}
      help={t.help}
      dots={run.dots}
      back={{ href: nav.back(run.prev), onClick: () => { commit() } }}
      next={{ disabled: Boolean(problem), onClick: () => { if (commit()) nav.go(run.next) } }}
      later={{ href: homeHref() }}
    >
      <Line label={t.unit_label} value={unit} onChange={setUnit} placeholder={t.unit_placeholder} max={30} testId="num-unit" />
      <Line label={t.now_label} value={now} onChange={setNow} placeholder={t.now_placeholder} inputMode="decimal" max={12} testId="num-now" />
      <Line label={t.target_label} value={target} onChange={setTarget} placeholder={t.target_placeholder} inputMode="decimal" max={12} testId="num-target" />
      <div>
        <Line label={t.date_label} value={by} onChange={setBy} type="date" testId="num-by" />
        <p className="mt-1 text-xs text-zinc-500">{t.date_help}</p>
      </div>
      <div>
        <Label>{t.rungs_label}</Label>
        <div className="grid grid-cols-5 gap-2">
          {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
            <Chip key={n} on={count === n} testId={`rungs-${n}`} onClick={() => setCount(n)}>{n}</Chip>
          ))}
        </div>
      </div>
      <div>
        <Label>{t.shape_label}</Label>
        <div className="space-y-2">
          {([["easy", t.shape_easy, t.shape_easy_help], ["even", t.shape_even, ""], ["hard", t.shape_hard, t.shape_hard_help]] as const).map(([k, label, help]) => (
            <button key={k} type="button" data-testid={`shape-${k}`} aria-pressed={shape === k} onClick={() => setShape(k)} className={`flex min-h-11 w-full flex-col rounded-lg border px-4 py-2 text-left text-sm ${shape === k ? "border-violet-400/60 bg-violet-500/20 text-violet-50" : "border-white/10 text-zinc-200"}`}>
              <span>{label}</span>
              {help && <span className="text-xs text-zinc-400">{help}</span>}
            </button>
          ))}
        </div>
      </div>
      {rungs.length > 0 && (
        <div className={card} data-testid="rung-preview">
          <button type="button" className={linkQuiet} onClick={() => setEditing((e) => !e)}>{t.edit_rungs}</button>
          <ul className="mt-2 space-y-2">
            {rungs.map((v, i) =>
              editing ? (
                <li key={i}>
                  <Line label={fill(t.rung_label, { n: i + 1 })} value={pins[i] ?? String(v)} onChange={(s) => setPins({ ...pins, [i]: s })} inputMode="decimal" max={12} />
                </li>
              ) : (
                <li key={i} className="text-sm text-zinc-300">{fill(t.rung_label, { n: i + 1 })}: {v} {unit}</li>
              ),
            )}
          </ul>
        </div>
      )}
      {problem && (from != null || to != null || unit) && <p className="text-sm text-amber-300" role="status">{problem}</p>}
    </Frame>
  )
}

function easeStages(per: number): { frequencyPerWeek: number; durationWeeks: number }[] {
  const steps = [{ frequencyPerWeek: 1, durationWeeks: 1 }]
  const mid = [Math.max(1, Math.round(per / 3)), Math.max(2, Math.round((2 * per) / 3)), per]
  const weeks = [2, 4, 8]
  mid.forEach((f, i) => {
    if (f > steps[steps.length - 1].frequencyPerWeek) steps.push({ frequencyPerWeek: f, durationWeeks: weeks[i] })
  })
  return steps
}

function PracticeNumbers({ goal, run }: { goal: NsGoal; run: Run }) {
  const { change } = usePlanNew()
  const nav = useNav("goals/done")
  const t = goalsCopy.numbers.practice
  const [unit, setUnit] = useState<"times" | "days">(goal.perWeek != null ? "times" : "days")
  const [per, setPer] = useState(String(goal.perWeek ?? goal.daysPerWeek ?? 3))
  const [ease, setEase] = useState<boolean | null>(goal.rampSteps?.length ? true : null)
  const [stages, setStages] = useState(goal.rampSteps ?? [])
  const p = num(per)
  const bad = p == null || p < 1
  const commit = () => {
    if (bad || p == null) return false
    change((x) => setPracticeNumbers(x, goal.id, { unit, perWeek: p, ease: ease ? stages : null }))
    return true
  }
  return (
    <Frame
      testId="goal-numbers"
      eyebrow={goalsCopy.name}
      title={t.title}
      help={t.help}
      dots={run.dots}
      back={{ href: nav.back(run.prev), onClick: () => { commit() } }}
      next={{ disabled: bad || ease === null, onClick: () => { if (commit()) nav.go(run.next) } }}
      later={{ href: homeHref() }}
    >
      <div>
        <Label>{t.count_in}</Label>
        <Pick options={[{ id: "times", label: t.count_times }, { id: "days", label: t.count_days }]} value={[unit]} onChange={(v) => setUnit(v[0] as "times" | "days")} testPrefix="count-in" />
      </div>
      <Line label={t.per_week_label} value={per} onChange={setPer} inputMode="numeric" max={3} testId="num-per" />
      {bad && <p className="text-sm text-amber-300" role="status">{t.error_zero}</p>}
      <div>
        <Label>{t.ease_question}</Label>
        <ChipRow>
          <Chip on={ease === true} testId="ease-yes" onClick={() => { setEase(true); if (!stages.length && p) setStages(easeStages(Math.min(7, Math.round(p)))) }}>{t.ease_yes}</Chip>
          <Chip on={ease === false} testId="ease-no" onClick={() => setEase(false)}>{t.ease_no}</Chip>
        </ChipRow>
        {ease && <p className="mt-2 text-xs text-zinc-500">{t.ease_help}</p>}
      </div>
      {ease && (
        <ul className="space-y-2" data-testid="stages">
          {stages.map((s, i) => (
            <li key={i} className={`${card} flex items-end gap-2`}>
              <div className="min-w-0 flex-1">
                <Line label={t.stage_times_label} value={String(s.frequencyPerWeek)} inputMode="numeric" max={3} onChange={(v) => setStages(stages.map((x, j) => (j === i ? { ...x, frequencyPerWeek: Math.max(1, num(v) ?? 1) } : x)))} />
              </div>
              <div className="min-w-0 flex-1">
                <Line label={t.stage_weeks_label} value={String(s.durationWeeks)} inputMode="numeric" max={3} onChange={(v) => setStages(stages.map((x, j) => (j === i ? { ...x, durationWeeks: Math.max(1, num(v) ?? 1) } : x)))} />
              </div>
              <button type="button" className={btnQuiet} onClick={() => setStages(stages.filter((_, j) => j !== i))}>{commonCopy.remove}</button>
            </li>
          ))}
          <li>
            <button type="button" className={btnQuiet} onClick={() => setStages([...stages, { frequencyPerWeek: Math.min(7, (stages.at(-1)?.frequencyPerWeek ?? 0) + 1), durationWeeks: 2 }])}>{t.add_stage}</button>
          </li>
        </ul>
      )}
    </Frame>
  )
}

function FinishNumbers({ goal, run }: { goal: NsGoal; run: Run }) {
  const { plan, change, today } = usePlanNew()
  const nav = useNav("goals/done")
  const t = goalsCopy.numbers.finish
  const [tasks, setTasks] = useState(goal.checkpoints.map((c) => c.title))
  const [by, setBy] = useState(goal.targetDate ?? plan.season?.endsOn ?? "")
  const bad = tasks.length === 0 && !by
  const commit = () => {
    if (bad) return false
    change((p) => setFinishTasks(p, goal.id, tasks, by || null))
    return true
  }
  return (
    <Frame
      testId="goal-numbers"
      eyebrow={goalsCopy.name}
      title={t.title}
      help={t.help}
      dots={run.dots}
      back={{ href: nav.back(run.prev), onClick: () => { commit() } }}
      next={{ disabled: bad, onClick: () => { if (commit()) nav.go(run.next) } }}
      later={{ href: homeHref() }}
    >
      <LineList label={t.field_label} items={tasks} onChange={setTasks} placeholder={t.task_placeholder} testId="tasks" />
      <div>
        <Line label={t.date_label} value={by} onChange={setBy} type="date" testId="finish-by" />
        <p className="mt-1 text-xs text-zinc-500">{t.date_help}</p>
      </div>
      {tasks.length > 0 && by && (
        <button type="button" className={btnQuiet} data-testid="spread" onClick={() => { change((p) => spreadTasks(setFinishTasks(p, goal.id, tasks, by), goal.id, today, by)) }}>{t.spread}</button>
      )}
      {goal.checkpoints.some((c) => c.dueOn) && (
        <ul className="space-y-1 text-sm text-zinc-300">
          {goal.checkpoints.map((c) => c.dueOn && <li key={c.id}>{c.title}: {t.due_label} {dateText(c.dueOn)}</li>)}
        </ul>
      )}
      {bad && <p className="text-sm text-amber-300" role="status">{t.error_empty}</p>}
    </Frame>
  )
}

function First({ id }: { id: string }) {
  const { change } = usePlanNew()
  const nav = useNav("goals/done")
  const goal = useGoal(id)
  const run = useRun(id, "first")
  const [note, setNote] = useState("")
  const t = goalsCopy.first
  const firstRung = goal.checkpoints.find((c) => c.id.startsWith("m"))
  const rampFirst = goal.rampSteps?.[0]?.frequencyPerWeek
  const perWeek = rampFirst ?? goal.perWeek ?? goal.daysPerWeek
  const title = goal.type === "milestone_ladder"
    ? fill(t.title_target, { value: Number.parseFloat(firstRung?.title ?? "") || "", unit: goal.unit })
    : fill(t.title_practice, { n: perWeek })
  return (
    <Frame
      testId="goal-first"
      eyebrow={goalsCopy.name}
      title={title}
      help={t.help}
      dots={run.dots}
      back={{ href: nav.back(run.prev) }}
      next={{ onClick: () => nav.go(run.next) }}
      skip={{ onClick: () => nav.go(run.next) }}
    >
      <div className="flex flex-wrap gap-2">
        <button type="button" className={btnPrimary} data-testid="first-yes" onClick={() => nav.go(run.next)}>{t.yes}</button>
        <button
          type="button"
          className={btnQuiet}
          data-testid="first-lower"
          onClick={() => {
            change((p) => lowerFirstStep(p, id))
            setNote(goal.type === "milestone_ladder" ? t.smaller_done_target : t.smaller_done_practice)
          }}
        >
          {t.smaller}
        </button>
      </div>
      {note && <p className="text-sm text-emerald-200" role="status" data-testid="first-lowered">{note.replace("{value}", String(Number.parseFloat(goal.checkpoints.find((c) => c.id.startsWith("m"))?.title ?? ""))).replace("{unit}", goal.unit).replace("{n}", String(goal.rampSteps?.[0]?.frequencyPerWeek ?? ""))}</p>}
    </Frame>
  )
}

function Why({ id }: { id: string }) {
  const { change } = usePlanNew()
  const nav = useNav("goals/done")
  const goal = useGoal(id)
  const run = useRun(id, "why")
  const [text, setText] = useState(goal.why)
  const [more, setMore] = useState(goal.reasonsList)
  const [showMore, setShowMore] = useState(goal.reasonsList.length > 0)
  const commit = () => change((p) => setReasons(setGoalWhy(p, id, text), id, more))
  return (
    <Frame
      testId="goal-why"
      eyebrow={goalsCopy.name}
      title={fill(goalsCopy.why.title, { goal: goal.title })}
      dots={run.dots}
      back={{ href: nav.back(run.prev), onClick: commit }}
      next={{ onClick: () => { commit(); nav.go(run.next) } }}
      skip={{ onClick: () => nav.go(run.next) }}
    >
      <GrownText label={goalsCopy.why.field_label} value={text} onChange={setText} placeholder={goalsCopy.why.placeholder} max={3000} rows={3} testId="goal-why-text" />
      <BadDay show={Boolean(text.trim())} />
      {showMore ? (
        <LineList label={moreReasonsCopy.label} items={more} onChange={setMore} testId="more-reasons" />
      ) : (
        <button type="button" className={linkQuiet} onClick={() => setShowMore(true)}>{moreReasonsCopy.link}</button>
      )}
    </Frame>
  )
}

function Feeds({ id }: { id: string }) {
  const { plan, change } = usePlanNew()
  const nav = useNav("goals/done")
  const goal = useGoal(id)
  const run = useRun(id, "feeds")
  const options = [...goalsOfTier(plan, "life"), ...goalsOfTier(plan, "become")]
    .sort((a, b) => Number(b.areaId === goal.areaId) - Number(a.areaId === goal.areaId))
  const [ids, setIds] = useState<string[]>(goal.feedsGoalIds)
  const commit = () => change((p) => setFeeds(p, id, ids))
  return (
    <Frame
      testId="goal-feeds"
      eyebrow={goalsCopy.name}
      title={fill(goalsCopy.feeds.title, { goal: goal.title })}
      help={goalsCopy.feeds.help}
      dots={run.dots}
      back={{ href: nav.back(run.prev), onClick: commit }}
      next={{ onClick: () => { commit(); nav.go(run.next) } }}
      skip={{ onClick: () => nav.go(run.next) }}
    >
      <Pick
        options={options.map((g) => ({ id: g.id, label: g.title, sub: tierOf(plan, g) === "life" ? goalsCopy.feeds.tag_big : goalsCopy.feeds.tag_growth }))}
        value={ids}
        onChange={setIds}
        multi
        testPrefix="feeds"
      />
    </Frame>
  )
}

function Mark({ id }: { id: string }) {
  const { change } = usePlanNew()
  const nav = useNav("goals/done")
  const goal = useGoal(id)
  const run = useRun(id, "mark")
  const t = goalsCopy.mark
  const rungs = goal.type === "milestone_ladder" ? goal.checkpoints.filter((c) => c.id.startsWith("m")) : goal.type === "achievement" ? goal.checkpoints : []
  const [reward, setReward] = useState(goal.reward)
  const [per, setPer] = useState<Record<string, string>>(Object.fromEntries(rungs.map((c) => [c.id, c.celebration ?? ""])))
  const commit = () => change((p) => setGoalReward(p, id, reward, per))
  return (
    <Frame
      testId="goal-mark"
      eyebrow={goalsCopy.name}
      title={t.title}
      dots={run.dots}
      back={{ href: nav.back(run.prev), onClick: commit }}
      next={{ onClick: () => { commit(); nav.go(run.next) } }}
      skip={{ onClick: () => nav.go(run.next) }}
    >
      <GrownText label={t.field_label} value={reward} onChange={setReward} placeholder={t.placeholder} max={500} rows={2} testId="goal-reward" />
      {rungs.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-zinc-200">{t.rungs_heading}</h2>
          <p className="mb-2 text-xs text-zinc-500">{t.rungs_help}</p>
          <div className="space-y-3">
            {rungs.map((c, i) => (
              <Line
                key={c.id}
                label={goal.type === "milestone_ladder" ? fill(t.rung_label, { n: i + 1, value: c.title }) : fill(t.task_label, { n: i + 1, title: c.title })}
                value={per[c.id] ?? ""}
                onChange={(v) => setPer({ ...per, [c.id]: v })}
                placeholder={t.rung_placeholder}
                max={300}
              />
            ))}
          </div>
        </div>
      )}
    </Frame>
  )
}

function Status({ id }: { id: string }) {
  const { change, today } = usePlanNew()
  const nav = useNav("goals/done")
  const goal = useGoal(id)
  const t = goalsCopy.status
  const [choice, setChoice] = useState<"active" | "achieved" | "paused" | "dropped" | null>(null)
  const [date, setDate] = useState(goal.targetDate && goal.targetDate >= today ? goal.targetDate : "")
  const ready = choice != null && (choice !== "active" || Boolean(date))
  return (
    <Frame
      testId="goal-status"
      eyebrow={goalsCopy.name}
      title={fill(t.title, { goal: goal.title })}
      help={t.help}
      back={{ href: nav.back("goals/list") }}
      next={{ disabled: !ready, onClick: () => { change((p) => setGoalStatus(p, id, choice!, today, choice === "active" ? date : undefined)); nav.go("goals/list") } }}
    >
      <Pick
        options={[{ id: "active", label: t.still_on }, { id: "achieved", label: t.achieved }, { id: "paused", label: t.pause }, { id: "dropped", label: t.drop }]}
        value={choice ? [choice] : []}
        onChange={(v) => setChoice(v[0])}
        testPrefix="status"
      />
      {choice === "active" && <Line label={t.new_date_label} value={date} onChange={setDate} type="date" testId="status-date" />}
    </Frame>
  )
}

function List({ redirectDone = false }: { redirectDone?: boolean }) {
  const { plan, change } = usePlanNew()
  const nav = useNav("goals/done")
  const mine = activeSeasonGoals(plan)
  const others = otherActiveGoals(plan)
  const t = goalsCopy.list
  if (redirectDone && mine.length > 0) return <Done />
  if (!plan.season) return <NeedsFirst eyebrow={goalsCopy.name} kind="season" href={screenHref("season/focus")} back={homeHref()} />
  return (
    <Frame testId="goals-list" eyebrow={goalsCopy.name} title={t.title} back={{ href: homeHref() }} next={{ label: t.done, onClick: () => nav.router.push(screenHref("goals/done")) }}>
      {mine.length === 0 ? <p className="text-sm text-zinc-500">{t.empty}</p> : (
        <ul className="space-y-2">
          {mine.map((g) => (
            <li key={g.id} className={`${card} flex items-center justify-between gap-2`} data-testid={`goal-${g.id}`}>
              <Link href={screenHref(`goals/${g.id}/what`)} className="min-w-0 flex-1 break-words text-sm text-zinc-100">{g.title}</Link>
            </li>
          ))}
        </ul>
      )}
      <Link href={screenHref("goals/new/what")} className={btnPrimary} data-testid="add-goal">{t.add}</Link>
      {others.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-sm font-semibold text-zinc-300">{t.also_heading}</h2>
          <p className="text-xs text-zinc-500">{t.also_help}</p>
          {others.map((g) => (
            <div key={g.id} className={`${card} flex items-center justify-between gap-2`}>
              <span className="min-w-0 break-words text-sm text-zinc-200">{g.title}</span>
              <span className="flex shrink-0 gap-1">
                <button type="button" className={btnQuiet} onClick={() => change((p) => addToSeason(p, g.id))}>{t.add_to_season}</button>
                <button type="button" className={btnQuiet} onClick={() => change((p) => setGoalStatus(p, g.id, "paused", new Date().toISOString().slice(0, 10)))}>{t.pause}</button>
              </span>
            </div>
          ))}
        </section>
      )}
    </Frame>
  )
}

function summaryOf(g: NsGoal): string {
  const d = goalsCopy.done
  if (g.type === "milestone_ladder") {
    const next = g.checkpoints.find((c) => c.id.startsWith("m") && !c.done)
    return next ? fill(d.next_rung, { value: Number.parseFloat(next.title), unit: g.unit }) : `${g.ladder?.target ?? ""} ${g.unit}`
  }
  if (g.type === "habit_ramp") return fill(d.per_week, { n: g.perWeek ?? g.daysPerWeek })
  const done = g.checkpoints.filter((c) => c.done).length
  return g.checkpoints.length ? fill(d.tasks_done, { done, total: g.checkpoints.length }) : ""
}

function Done() {
  const { plan } = usePlanNew()
  const nav = useNav("goals/done")
  const mine = activeSeasonGoals(plan)
  const d = goalsCopy.done
  const kind = (g: NsGoal) => (g.type === "milestone_ladder" ? d.kind_target : g.type === "habit_ramp" ? d.kind_practice : d.kind_finish)
  return (
    <DoneScreen module="goals" eyebrow={goalsCopy.name} title={d.title}>
      {mine.map((g) => (
        <div key={g.id} className="space-y-2" data-testid={`done-goal-${g.id}`}>
          <Row label={kind(g)} href={nav.change(`goals/${g.id}/what`)}>
            <span className="block font-medium">{g.title}</span>
            <span className="block text-xs text-zinc-400">{summaryOf(g)}</span>
            {g.targetDate && <span className="block text-xs text-zinc-500">{fill(d.by_date, { date: dateText(g.targetDate) })}</span>}
            {g.why.trim() && <span className="block text-xs text-zinc-400">{d.why_label}: {g.why}</span>}
            {g.reward.trim() && <span className="block text-xs text-zinc-400">{d.reward_label}: {g.reward}</span>}
            {g.feedsGoalIds.map((f) => <span key={f} className="block text-xs text-zinc-500">{fill(d.moves_line, { goal: plan.goals.find((x) => x.id === f)?.title ?? "" })}</span>)}
          </Row>
          <Link href={screenHref(`goals/${g.id}/status`)} className={linkQuiet}>{fill(goalsCopy.status.title, { goal: g.title })}</Link>
          {g.metric === "daily_area" && (
            <p className="text-xs text-zinc-500">{goalsCopy.earlier_notes.daily_area}{" "}<Link href={nav.change(`goals/${g.id}/kind`)} className="underline">{goalsCopy.earlier_notes.daily_area_link}</Link></p>
          )}
          <EarlierBlock notes={goalNotes(g)} topics={goalsCopy.earlier_notes} />
        </div>
      ))}
      <div className="flex flex-wrap gap-4">
        <Link href={screenHref("goals/new/what")} className={linkQuiet}>{goalsCopy.list.add}</Link>
        <Link href={screenHref("goals/list")} className={linkQuiet}>{goalsCopy.list.title}</Link>
      </div>
    </DoneScreen>
  )
}
