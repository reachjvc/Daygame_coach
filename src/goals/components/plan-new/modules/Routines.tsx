"use client"

import Link from "next/link"
import { useState } from "react"
import { routinesCopy } from "@/src/goals/planSteps/copy/routines"
import { commonCopy } from "@/src/goals/planSteps/copy/common"
import { activeAreas, isExtraRoutine, readOptionIds } from "@/src/goals/planSteps/planFacts"
import { homeHref } from "@/src/goals/planSteps/planRoutes"
import {
  ROUTINE_PICKS, addRoutines, clockText, libraryKeyOf, parseClock, setRoutineSteps, setRoutineWhen, setServes, setSplit, setStepTimes, totalMinutes,
  type RoutinePick, type StepInput,
} from "@/src/goals/planSteps/extras/routinesChanges"
import { fill } from "@/src/goals/planSteps/text"
import type { NsRoutine } from "@/src/goals/types"
import { usePlanNew } from "../PlanNewContext"
import { useNav } from "../nav"
import { DoneScreen } from "../shared"
import { Chip, ChipRow, Frame, Label, Line, LineList, Pick, btnQuiet, btnPrimary, card, inputCls, linkQuiet, weekdayName } from "../ui"
import { readLabel } from "./Questions"

export function RoutinesModule({ segs }: { segs: string[] }) {
  const { plan, status } = usePlanNew()
  const first = segs[0] ?? (status.extras.routines.started ? "done" : "pick")
  if (first === "done") return <Done />
  if (first === "pick") return <PickScreen />
  const routine = plan.routines.find((r) => r.id === first && isExtraRoutine(r))
  if (!routine) return <PickScreen />
  const screen = segs[1] ?? "steps"
  if (screen === "when") return <When routine={routine} />
  if (screen === "split") return <Split routine={routine} />
  if (screen === "serves") return <Serves routine={routine} />
  return <Steps routine={routine} />
}

const PICK_LABELS: Record<RoutinePick, string> = {
  morning: routinesCopy.pick.morning, evening: routinesCopy.pick.evening, training: routinesCopy.pick.training,
  work: routinesCopy.pick.work, people: routinesCopy.pick.people, mind: routinesCopy.pick.mind,
}

function PickScreen() {
  const { plan, change } = usePlanNew()
  const nav = useNav("routines/done")
  const have = new Set(plan.routines.filter(isExtraRoutine).map((r) => libraryKeyOf(r)).filter(Boolean))
  const [picked, setPicked] = useState<RoutinePick[]>([])
  const [own, setOwn] = useState<string[]>([])
  const picks = picked.map((pick) => ({ pick, label: PICK_LABELS[pick] }))
  const empty = picked.length === 0 && own.length === 0
  return (
    <Frame
      testId="routines-pick"
      eyebrow={routinesCopy.name}
      title={routinesCopy.pick.title}
      back={{ href: nav.back(null) }}
      next={{
        disabled: empty,
        onClick: () => {
          const made = addRoutines(plan, picks, own)
          change((p) => addRoutines(p, picks, own).plan)
          nav.go(made.ids.length ? `routines/${made.ids[0]}/steps` : "routines/done")
        },
      }}
      later={{ href: homeHref() }}
    >
      <ChipRow>
        {ROUTINE_PICKS.map((k) => (
          <Chip key={k} on={picked.includes(k) || have.has(k)} disabled={have.has(k)} testId={`routine-${k}`} onClick={() => setPicked(picked.includes(k) ? picked.filter((x) => x !== k) : [...picked, k])}>
            <span className="block">{PICK_LABELS[k]}</span>
            {have.has(k) && <span className="block text-xs text-zinc-400">{routinesCopy.pick.have_it}</span>}
          </Chip>
        ))}
      </ChipRow>
      <LineList label={routinesCopy.pick.own} items={own} onChange={setOwn} placeholder={routinesCopy.pick.own_placeholder} max={60} testId="routine-own" />
      {empty && <p className="text-sm text-zinc-500">{routinesCopy.pick.error_empty}</p>}
    </Frame>
  )
}

/** Minutes a library line names ("Daylight outside, 10 min"), else 0. */
const minutesIn = (title: string): number => Number(/(\d+)\s*min/.exec(title)?.[1] ?? 0)

function Steps({ routine }: { routine: NsRoutine }) {
  const { plan, change } = usePlanNew()
  const nav = useNav("routines/done")
  const key = libraryKeyOf(routine)
  const library: readonly string[] = key ? routinesCopy.library[key] : []
  const [items, setItems] = useState<StepInput[]>(routine.steps.map((s) => ({ title: s.title, minutes: s.minutes, goesTo: s.goesTo, asks: s.asks })))
  const [draft, setDraft] = useState("")
  const ordered = routine.kind === "sequence"
  const has = (t: string) => items.some((i) => i.title.toLowerCase() === t.toLowerCase())
  const add = (title: string) => {
    const t = title.trim()
    if (t && !has(t)) setItems([...items, { title: t, minutes: minutesIn(t), goesTo: null, asks: null }])
  }
  const patch = (i: number, p: Partial<StepInput>) => setItems(items.map((x, j) => (j === i ? { ...x, ...p } : x)))
  const commit = () => items.length > 0 && change((p) => setRoutineSteps(p, routine.id, items))
  const options = [{ id: "", label: routinesCopy.steps.opens_none }, ...readOptionIds(plan).map((o) => ({ id: o.id, label: readLabel(o.id) }))]
  return (
    <Frame
      testId="routines-steps"
      eyebrow={routinesCopy.name}
      title={fill(routinesCopy.steps.title, { routine: routine.label })}
      help={routinesCopy.steps.help}
      back={{ href: nav.back("routines/pick"), onClick: commit }}
      next={{ disabled: items.length === 0, onClick: () => { commit(); nav.go(`routines/${routine.id}/when`) } }}
      later={{ href: homeHref() }}
    >
      {library.length > 0 && (
        <ChipRow>
          {library.map((t) => (
            <Chip key={t} on={has(t)} testId={`lib-${library.indexOf(t)}`} onClick={() => (has(t) ? setItems(items.filter((x) => x.title.toLowerCase() !== t.toLowerCase())) : add(t))}>{t}</Chip>
          ))}
        </ChipRow>
      )}
      {items.length > 0 && (
        <ul className="space-y-2" data-testid="step-items">
          {items.map((it, i) => (
            <li key={`${it.title}-${i}`} className={`${card} space-y-2`} data-testid={`step-${i}`}>
              <div className="flex items-start justify-between gap-2">
                <p className="min-w-0 break-words text-sm text-zinc-100">{it.title}</p>
                <button type="button" className={btnQuiet} onClick={() => setItems(items.filter((_, j) => j !== i))} aria-label={`${commonCopy.remove}: ${it.title}`}>{commonCopy.remove}</button>
              </div>
              {ordered && (
                <div className="flex items-center gap-2">
                  <Label htmlFor={`min-${i}`}>{routinesCopy.steps.minutes_label}</Label>
                  <input id={`min-${i}`} type="number" inputMode="numeric" min={0} max={180} value={it.minutes || ""} onChange={(e) => patch(i, { minutes: Number(e.target.value) || 0 })} className={`${inputCls} w-24`} />
                </div>
              )}
              <details>
                <summary className="min-h-11 cursor-pointer py-3 text-sm text-zinc-400">{routinesCopy.steps.more}</summary>
                <div className="space-y-3">
                  <p className="text-sm font-medium text-zinc-200">{routinesCopy.steps.opens_label}</p>
                  <Pick options={options} value={[it.goesTo ?? ""]} onChange={(v) => patch(i, { goesTo: v[0] || null })} testPrefix={`opens-${i}`} />
                  <Line label={routinesCopy.steps.asks_label} value={it.asks ?? ""} onChange={(v) => patch(i, { asks: v || null })} placeholder={routinesCopy.steps.asks_placeholder} max={300} />
                </div>
              </details>
            </li>
          ))}
        </ul>
      )}
      <div className="flex items-end gap-2">
        <div className="min-w-0 flex-1">
          <Line label={routinesCopy.steps.field_label} value={draft} onChange={setDraft} placeholder={routinesCopy.steps.own_placeholder} max={200} onEnter={() => { add(draft); setDraft("") }} testId="step-draft" />
        </div>
        <button type="button" className={btnQuiet} disabled={!draft.trim()} onClick={() => { add(draft); setDraft("") }} data-testid="step-add">{commonCopy.add}</button>
      </div>
      {items.length === 0 && <p className="text-sm text-zinc-500">{routinesCopy.steps.error_empty}</p>}
    </Frame>
  )
}

function When({ routine }: { routine: NsRoutine }) {
  const { change } = usePlanNew()
  const nav = useNav("routines/done")
  const ordered = routine.kind === "sequence"
  const [days, setDays] = useState<number[]>(routine.steps[0]?.days ?? [])
  const [time, setTime] = useState(clockText(routine.steps[0]?.startMin ?? null))
  const [times, setTimes] = useState<Record<string, number>>(Object.fromEntries(routine.steps.map((s) => [s.id, s.daysPerWeek])))
  const commit = () =>
    change((p) => {
      if (ordered) return days.length ? setRoutineWhen(p, routine.id, days, parseClock(time)) : p
      return routine.steps.reduce((acc, s) => setStepTimes(acc, routine.id, s.id, times[s.id] ?? s.daysPerWeek), p)
    })
  const afterWhen = () => nav.go(routine.blueprintId === "workout" ? `routines/${routine.id}/split` : `routines/${routine.id}/serves`)
  return (
    <Frame
      testId="routines-when"
      eyebrow={routinesCopy.name}
      title={ordered ? routinesCopy.when.title_ordered : routinesCopy.when.title_weekly}
      help={routine.label}
      back={{ href: nav.back(`routines/${routine.id}/steps`), onClick: commit }}
      next={{ disabled: ordered && days.length === 0, onClick: () => { commit(); afterWhen() } }}
      later={{ href: homeHref() }}
    >
      {ordered ? (
        <>
          <Label>{routinesCopy.when.days_label}</Label>
          <ChipRow>
            {[0, 1, 2, 3, 4, 5, 6].map((d) => (
              <Chip key={d} on={days.includes(d)} testId={`when-day-${d}`} onClick={() => setDays(days.includes(d) ? days.filter((x) => x !== d) : [...days, d])}>{weekdayName(d + 1)}</Chip>
            ))}
          </ChipRow>
          <Line label={routinesCopy.when.time_label} value={time} onChange={setTime} placeholder="07:30" max={5} testId="when-time" />
          {days.length === 0 && <p className="text-sm text-zinc-500">{routinesCopy.when.error_days}</p>}
        </>
      ) : (
        <ul className="space-y-3">
          {routine.steps.map((s) => (
            <li key={s.id} className={`${card} space-y-2`} data-testid={`times-${s.id}`}>
              <p className="break-words text-sm text-zinc-100">{s.title}</p>
              <p className="text-xs text-zinc-500">{routinesCopy.when.times_label}</p>
              <ChipRow>
                {[1, 2, 3, 4, 5, 6, 7].map((n) => (
                  <Chip key={n} on={(times[s.id] ?? s.daysPerWeek) === n} testId={`times-${s.id}-${n}`} onClick={() => setTimes({ ...times, [s.id]: n })}>{n}</Chip>
                ))}
              </ChipRow>
            </li>
          ))}
        </ul>
      )}
    </Frame>
  )
}

const SPLITS: { id: string; label: string; names: string[] }[] = [
  { id: "full_body", label: routinesCopy.split.full_body, names: [routinesCopy.split.full_body, routinesCopy.split.full_body, routinesCopy.split.full_body] },
  { id: "upper_lower", label: routinesCopy.split.upper_lower, names: routinesCopy.split.upper_lower.split(" / ").map((s) => s[0].toUpperCase() + s.slice(1)) },
  { id: "push_pull_legs", label: routinesCopy.split.push_pull_legs, names: routinesCopy.split.push_pull_legs.split(" / ").map((s) => s[0].toUpperCase() + s.slice(1)) },
]

function Split({ routine }: { routine: NsRoutine }) {
  const { change } = usePlanNew()
  const nav = useNav("routines/done")
  const [names, setNames] = useState<string[]>(routine.splitDays.map((d) => d.name))
  const [custom, setCustom] = useState(false)
  const kept = () => change((p) => setSplit(p, routine.id, names))
  const go = () => nav.go(`routines/${routine.id}/serves`)
  return (
    <Frame
      testId="routines-split"
      eyebrow={routinesCopy.name}
      title={routinesCopy.split.title}
      help={routinesCopy.split.help}
      back={{ href: nav.back(`routines/${routine.id}/when`), onClick: kept }}
      next={{ onClick: () => { kept(); go() } }}
      skip={{ onClick: go }}
    >
      <ChipRow>
        {SPLITS.map((s) => (
          <Chip key={s.id} on={!custom && names.join("|") === s.names.join("|")} testId={`split-${s.id}`} onClick={() => { setNames(s.names); setCustom(false) }}>{s.label}</Chip>
        ))}
        <Chip on={custom} testId="split-own" onClick={() => setCustom(true)}>{routinesCopy.split.own_split}</Chip>
      </ChipRow>
      {custom && <LineList label={fill(routinesCopy.split.day_label, { n: names.length + 1 })} items={names} onChange={setNames} max={40} testId="split-days" />}
    </Frame>
  )
}

function Serves({ routine }: { routine: NsRoutine }) {
  const { plan, change } = usePlanNew()
  const nav = useNav("routines/done")
  const areas = activeAreas(plan)
  const goals = plan.goals.filter((g) => g.status === "active")
  const [serves, setServesState] = useState<string[]>(routine.serves)
  const [goalOf, setGoalOf] = useState<Record<string, string | null>>(Object.fromEntries(routine.steps.map((s) => [s.id, s.servesGoalIds[0] ?? null])))
  const commit = () => change((p) => setServes(p, routine.id, serves, goalOf))
  const nextBare = plan.routines.find((r) => isExtraRoutine(r) && r.id !== routine.id && r.steps.length === 0)
  const goOn = () => nav.go(nextBare ? `routines/${nextBare.id}/steps` : "routines/done")
  return (
    <Frame
      testId="routines-serves"
      eyebrow={routinesCopy.name}
      title={routinesCopy.serves.title}
      help={routine.label}
      back={{ href: nav.back(routine.blueprintId === "workout" ? `routines/${routine.id}/split` : `routines/${routine.id}/when`), onClick: commit }}
      next={{ onClick: () => { commit(); goOn() } }}
      skip={{ onClick: goOn }}
    >
      <Pick options={areas.map((a) => ({ id: a.id, label: a.label }))} value={serves} onChange={setServesState} multi testPrefix="serve" />
      {goals.length > 0 && routine.steps.length > 0 && (
        <ul className="space-y-3">
          {routine.steps.map((s) => (
            <li key={s.id} className={`${card} space-y-2`}>
              <p className="break-words text-sm text-zinc-100">{s.title}</p>
              <p className="text-xs text-zinc-500">{routinesCopy.serves.step_goal_label}</p>
              <Pick
                options={[{ id: "", label: routinesCopy.serves.step_goal_none }, ...goals.map((g) => ({ id: g.id, label: g.title }))]}
                value={[goalOf[s.id] ?? ""]}
                onChange={(v) => setGoalOf({ ...goalOf, [s.id]: v[0] || null })}
                testPrefix={`goal-${s.id}`}
              />
            </li>
          ))}
        </ul>
      )}
    </Frame>
  )
}

function Done() {
  const { plan } = usePlanNew()
  const nav = useNav("routines/done")
  const mine = plan.routines.filter(isExtraRoutine)
  const d = routinesCopy.done
  return (
    <DoneScreen module="routines" eyebrow={routinesCopy.name} title={d.title}>
      <ul className="space-y-3" data-testid="routines-list">
        {mine.map((r) => {
          const days = r.steps[0]?.days ?? []
          const line = r.kind === "sequence"
            ? fill(d.line_ordered, { days: days.map((x) => weekdayName(x + 1)).join(", "), time: clockText(r.steps[0]?.startMin ?? null), min: totalMinutes(r) })
            : fill(d.line_weekly, { n: r.steps.length })
          return (
            <li key={r.id} className={`${card} space-y-2`} data-testid={`routine-${r.id}`}>
              <p className="text-sm font-medium text-zinc-100">{r.label}</p>
              <ul className="list-disc pl-5 text-sm text-zinc-300">
                {r.steps.map((s) => <li key={s.id} className="break-words">{s.title}</li>)}
              </ul>
              <p className="text-xs text-zinc-400">{line}</p>
              {r.kind === "sequence" && <p className="text-xs text-zinc-500">{fill(d.total_minutes, { min: totalMinutes(r) })}</p>}
              <div className="flex flex-wrap gap-4">
                <Link href={nav.change(`routines/${r.id}/steps`)} className={linkQuiet}>{commonCopy.change}: {routinesCopy.steps.field_label}</Link>
                <Link href={nav.change(`routines/${r.id}/when`)} className={linkQuiet}>{routinesCopy.when.days_label}</Link>
                <Link href={nav.change(`routines/${r.id}/serves`)} className={linkQuiet}>{routinesCopy.serves.title}</Link>
              </div>
            </li>
          )
        })}
      </ul>
      <Link href={nav.change("routines/pick")} className={btnPrimary} data-testid="routines-add">{commonCopy.add}</Link>
    </DoneScreen>
  )
}
