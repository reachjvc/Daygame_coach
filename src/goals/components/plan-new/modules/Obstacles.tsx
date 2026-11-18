"use client"

import { useSearchParams } from "next/navigation"
import { useState } from "react"
import { obstaclesCopy } from "@/src/goals/planSteps/copy/obstacles"
import { isActive, activeObstacles } from "@/src/goals/planSteps/planFacts"
import { addProblems, defaultGoalId, findObstacle, moveProblem, obstaclesNotes, setFallback, setHelp, SUPPORT_KEY } from "@/src/goals/planSteps/extras/obstaclesChanges"
import { homeHref, screenHref } from "@/src/goals/planSteps/planRoutes"
import { fill } from "@/src/goals/planSteps/text"
import { usePlanNew } from "../PlanNewContext"
import { useNav } from "../nav"
import { DoneScreen, EarlierBlock, NeedsFirst } from "../shared"
import { Chip, Frame, GrownText, LineList, Pick, Row } from "../ui"

export function ObstaclesModule({ segs }: { segs: string[] }) {
  const { status, plan } = usePlanNew()
  const first = segs[0] ?? (status.extras.obstacles.started ? "done" : "what")
  if (first === "done") return <Done />
  if (!plan.goals.some(isActive)) return <NeedsFirst eyebrow={obstaclesCopy.name} kind="goal" href={screenHref("goals/new/what")} back={homeHref()} />
  if (first === "help") return <Help />
  if (segs[1] === "goal") return <GoalOf id={first} />
  if (segs[1] === "then") return <Then id={first} />
  return <What />
}

/** The chips: the nine common ones, in the words file's order. */
const CHIPS = [
  obstaclesCopy.what.chip_time, obstaclesCopy.what.chip_interest, obstaclesCopy.what.chip_work, obstaclesCopy.what.chip_ill, obstaclesCopy.what.chip_people,
  obstaclesCopy.what.chip_too_big, obstaclesCopy.what.chip_forget, obstaclesCopy.what.chip_money, obstaclesCopy.what.chip_thought,
]

/** Old per-area notes, one short chip each (the whole text stays under "From your earlier plan"). */
const noteChips = (blockers: string[]) => blockers.map((b) => b.trim().replace(/\s+/g, " ")).filter((b) => b && b.length <= 80)

function useQueue() {
  const params = useSearchParams()
  const q = (params.get("q") ?? "").split(",").filter(Boolean)
  const withQ = (target: string, ids: string[]) => (ids.length ? `${target}?q=${ids.join(",")}` : target)
  return { q, withQ, preset: params.get("goal") }
}

function useGo() {
  const nav = useNav("obstacles/done")
  const { from } = usePlanNew()
  return { nav, push: (target: string) => nav.router.push(from ?? screenHref(target)) }
}

function What() {
  const { plan, change } = usePlanNew()
  const { nav, push } = useGo()
  const { preset } = useQueue()
  const existing = activeObstacles(plan).map((o) => o.obstacle.what)
  const [picked, setPicked] = useState<string[]>(existing)
  const [own, setOwn] = useState<string[]>([])
  const fromNotes = noteChips(plan.areas.map((a) => plan.review[a.id]?.blockers ?? ""))
  const all = [...picked, ...own]
  const goalId = preset && plan.goals.some((g) => g.id === preset && isActive(g)) ? preset : defaultGoalId(plan)
  const go = () => {
    if (!goalId) return
    const made = addProblems(plan, all, goalId)
    if (made.ids.length === 0) return push("obstacles/done")
    change(() => made.plan)
    const first = made.ids[0]
    const list = made.ids.join(",")
    nav.router.push(preset ? screenHref(`obstacles/${first}/then?q=${list}`) : screenHref(`obstacles/${first}/goal?q=${list}`))
  }
  const toggle = (t: string) => setPicked(picked.includes(t) ? picked.filter((x) => x !== t) : [...picked, t])
  const w = obstaclesCopy.what
  return (
    <Frame
      testId="obstacles-what"
      eyebrow={obstaclesCopy.name}
      title={w.title}
      help={w.help}
      back={{ href: nav.back(null) }}
      next={{ disabled: all.length === 0, onClick: go }}
      later={{ href: homeHref() }}
    >
      <div className="flex flex-wrap gap-2">
        {CHIPS.map((c, i) => <Chip key={c} on={picked.includes(c)} testId={`what-chip-${i}`} onClick={() => toggle(c)}>{c}</Chip>)}
      </div>
      {fromNotes.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-xs font-medium uppercase tracking-wide text-zinc-500">{w.notes_heading}</h2>
          <div className="flex flex-wrap gap-2">
            {fromNotes.map((c, i) => <Chip key={c} on={picked.includes(c)} testId={`what-note-${i}`} onClick={() => toggle(c)}>{c}</Chip>)}
          </div>
        </section>
      )}
      <LineList label={w.own_label} items={own} onChange={setOwn} placeholder={w.own_placeholder} max={200} testId="what-own" />
      {all.length === 0 && <p className="text-sm text-amber-300" role="status">{w.error_empty}</p>}
    </Frame>
  )
}

function GoalOf({ id }: { id: string }) {
  const { plan, change } = usePlanNew()
  const { nav, push } = useGo()
  const { q, withQ } = useQueue()
  const at = findObstacle(plan, id)
  const goals = plan.goals.filter(isActive)
  const [goal, setGoal] = useState<string>(at?.goalId ?? "")
  if (!at) return <Done />
  const commit = () => goal && change((p) => moveProblem(p, id, goal))
  const i = q.indexOf(id)
  const nextGoal = i >= 0 ? q[i + 1] : undefined
  const go = () => {
    commit()
    if (nextGoal) nav.router.push(screenHref(withQ(`obstacles/${nextGoal}/goal`, q)))
    else if (q.length) nav.router.push(screenHref(withQ(`obstacles/${q[0]}/then`, q)))
    else push(`obstacles/${id}/then`)
  }
  return (
    <Frame
      testId="obstacles-goal"
      eyebrow={obstaclesCopy.name}
      title={obstaclesCopy.goal.title}
      help={fill(obstaclesCopy.goal.sub, { obstacle: at.obstacle.what })}
      dots={q.length > 1 && i >= 0 ? { n: i + 1, m: q.length } : undefined}
      back={{ href: nav.back("obstacles/what"), onClick: commit }}
      next={{ disabled: !goal, onClick: go }}
      later={{ href: homeHref() }}
    >
      <Pick options={goals.map((g) => ({ id: g.id, label: g.title }))} value={goal ? [goal] : []} onChange={(v) => setGoal(v[0])} testPrefix="goal-pick" />
    </Frame>
  )
}

function Then({ id }: { id: string }) {
  const { plan, change } = usePlanNew()
  const { nav, push } = useGo()
  const { q, withQ } = useQueue()
  const at = findObstacle(plan, id)
  const [text, setText] = useState(at?.obstacle.counter ?? "")
  if (!at) return <Done />
  const commit = () => change((p) => setFallback(p, id, text))
  const i = q.indexOf(id)
  const nextThen = i >= 0 ? q[i + 1] : undefined
  const go = () => {
    commit()
    if (nextThen) nav.router.push(screenHref(withQ(`obstacles/${nextThen}/then`, q)))
    else if (q.length) nav.router.push(screenHref("obstacles/help"))
    else push("obstacles/done")
  }
  const t = obstaclesCopy.then
  return (
    <Frame
      testId="obstacles-then"
      eyebrow={obstaclesCopy.name}
      title={t.title}
      help={fill(t.sub, { obstacle: at.obstacle.what })}
      dots={q.length > 1 && i >= 0 ? { n: i + 1, m: q.length } : undefined}
      back={{ href: nav.back(null), onClick: commit }}
      next={{ disabled: !text.trim(), onClick: go }}
      later={{ href: homeHref() }}
    >
      <GrownText label={t.field_label} value={text} onChange={setText} placeholder={t.placeholder} max={500} rows={2} testId="then-text" />
      {!text.trim() && <p className="text-sm text-amber-300" role="status">{t.error_empty}</p>}
    </Frame>
  )
}

function Help() {
  const { plan, change } = usePlanNew()
  const { nav } = useGo()
  const [text, setText] = useState(plan.answers[SUPPORT_KEY] ?? "")
  const commit = () => change((p) => setHelp(p, text))
  const h = obstaclesCopy.help
  return (
    <Frame
      testId="obstacles-help"
      eyebrow={obstaclesCopy.name}
      title={h.title}
      back={{ href: nav.back(null), onClick: commit }}
      next={{ onClick: () => { commit(); nav.go("obstacles/done") } }}
      skip={{ onClick: () => nav.go("obstacles/done") }}
    >
      <GrownText label={h.field_label} value={text} onChange={setText} placeholder={h.placeholder} max={1000} rows={3} testId="help-text" />
    </Frame>
  )
}

function Done() {
  const { plan } = usePlanNew()
  const nav = useNav("obstacles/done")
  const d = obstaclesCopy.done
  const all = activeObstacles(plan)
  const goals = plan.goals.filter((g) => isActive(g) && g.obstacles.length > 0)
  const topics: Record<string, string> = { stoppers: obstaclesCopy.earlier_notes.stoppers, beliefs: obstaclesCopy.earlier_notes.beliefs }
  for (const a of plan.areas) topics[`review_blockers:${a.id}`] = obstaclesCopy.earlier_notes.review_blockers.replace("{area}", a.label)
  const help = (plan.answers[SUPPORT_KEY] ?? "").trim()
  return (
    <DoneScreen module="obstacles" eyebrow={obstaclesCopy.name} title={d.title}>
      {all.length === 0 && <p className="text-sm text-zinc-500">{obstaclesCopy.what.error_empty}</p>}
      {goals.map((g) => (
        <section key={g.id} className="space-y-2" data-testid={`done-obstacles-${g.id}`}>
          <h2 className="text-sm font-semibold text-zinc-300">{g.title}</h2>
          {g.obstacles.map((o) => (
            <Row key={o.id} label="" href={nav.change(`obstacles/${o.id}/then`)}>
              <span className="block">{fill(d.pair_problem, { obstacle: o.what })}</span>
              {o.counter.trim() && <span className="block text-xs text-zinc-400">{fill(d.pair_fallback, { then: o.counter })}</span>}
            </Row>
          ))}
        </section>
      ))}
      <Row label={d.help_heading} href={nav.change("obstacles/help")} testId="done-help">{help || "—"}</Row>
      <EarlierBlock notes={obstaclesNotes(plan)} topics={topics} />
    </DoneScreen>
  )
}
