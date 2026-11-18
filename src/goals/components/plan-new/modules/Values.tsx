"use client"

import { useMemo, useState } from "react"
import { valuesCopy } from "@/src/goals/planSteps/copy/values"

import { NS_VALUE_GROUPS } from "@/src/goals/data/northStar"
import { shownPerson } from "@/src/role-models/catalog"
import { goalsServingValue, isActive, topValues } from "@/src/goals/planSteps/planFacts"
import { findValues, type FoundSource } from "@/src/goals/planSteps/extras/valuesFound"
import { addValues, setMostImportant, setValueServes, valuesNotes } from "@/src/goals/planSteps/extras/valuesChanges"
import { homeHref } from "@/src/goals/planSteps/planRoutes"
import { fill } from "@/src/goals/planSteps/text"
import { usePlanNew } from "../PlanNewContext"
import { useNav } from "../nav"
import { DoneScreen, EarlierBlock } from "../shared"
import { Chip, ChipRow, Frame, LineList, Pick, Row, TapOrder } from "../ui"

const decode = (s: string) => {
  try { return decodeURIComponent(s) } catch { return s }
}
const seg = (s: string) => encodeURIComponent(s)

export function ValuesModule({ segs }: { segs: string[] }) {
  const { status, plan } = usePlanNew()
  const first = segs[0] ?? (status.extras.values.started ? "done" : "found")
  if (first === "add") return <Add />
  if (first === "most") return <Most />
  if (first === "done") return <Done />
  if (first === "found") return <Found />
  if (segs[1] === "where" && plan.values.length > 0) return <Where value={decode(first)} />
  return <Done />
}

const sourceText = (s: FoundSource): string => {
  const f = valuesCopy.found
  switch (s.kind) {
    case "north_star": return f.source_north_star
    case "north_star_why": return f.source_north_star_why
    case "goal_why": return fill(f.source_goal_why, { goal: s.goal })
    case "season": return f.source_season
    case "identity": return f.source_identity
    case "person": return fill(f.source_person, { name: s.name })
    case "old": return f.source_old
  }
}

function Found() {
  const { plan, change } = usePlanNew()
  const nav = useNav("values/done")
  const found = useMemo(() => findValues(plan, (id) => shownPerson(id)?.name ?? null), [plan])
  const [kept, setKept] = useState<string[]>([])
  const commit = () => change((p) => addValues(p, kept))
  return (
    <Frame
      testId="values-found"
      eyebrow={valuesCopy.name}
      title={valuesCopy.found.title}
      help={valuesCopy.intro}
      dots={{ n: 1, m: 3 }}
      back={{ href: nav.back(null), onClick: commit }}
      next={{ onClick: () => { commit(); nav.go("values/add") } }}
      skip={{ onClick: () => nav.go("values/add") }}
    >
      {found.length === 0 ? (
        <p className="text-sm text-zinc-500">{valuesCopy.found.empty}</p>
      ) : (
        <ul className="space-y-2">
          {found.map((f) => (
            <li key={f.value}>
              <Chip on={kept.includes(f.value)} testId={`found-${f.value}`} onClick={() => setKept(kept.includes(f.value) ? kept.filter((x) => x !== f.value) : [...kept, f.value])}>
                <span className="block">{f.value}</span>
                <span className="block text-xs text-zinc-400">{fill(valuesCopy.found.found_in, { source: f.sources.map(sourceText).join(", ") })}</span>
              </Chip>
            </li>
          ))}
        </ul>
      )}
    </Frame>
  )
}

function Add() {
  const { plan, change } = usePlanNew()
  const nav = useNav("values/done")
  const [picked, setPicked] = useState<string[]>([])
  const [own, setOwn] = useState<string[]>([])
  const commit = () => change((p) => addValues(p, [...picked, ...own]))
  const have = plan.values.map((v) => v.toLowerCase())
  return (
    <Frame
      testId="values-add"
      eyebrow={valuesCopy.name}
      title={valuesCopy.add.title}
      dots={{ n: 2, m: 3 }}
      back={{ href: nav.back("values/found"), onClick: commit }}
      next={{ onClick: () => { commit(); nav.go("values/most") } }}
      skip={{ onClick: () => nav.go("values/most") }}
    >
      {NS_VALUE_GROUPS.map((g) => {
        const options = g.values.filter((v) => !have.includes(v.toLowerCase()))
        if (options.length === 0) return null
        return (
          <section key={g.label} className="space-y-2">
            <h2 className="text-xs font-medium uppercase tracking-wide text-zinc-500">{g.label}</h2>
            <Pick options={options.map((v) => ({ id: v, label: v }))} value={picked} onChange={setPicked} multi testPrefix="value" />
          </section>
        )
      })}
      <LineList label={valuesCopy.add.field_label} items={own} onChange={setOwn} placeholder={valuesCopy.add.placeholder} max={60} testId="value-own" />
    </Frame>
  )
}

function Most() {
  const { plan, change } = usePlanNew()
  const nav = useNav("values/done")
  const [order, setOrder] = useState<string[]>(topValues(plan))
  const commit = () => order.length > 0 && change((p) => setMostImportant(p, order))
  return (
    <Frame
      testId="values-most"
      eyebrow={valuesCopy.name}
      title={valuesCopy.most.title}
      help={valuesCopy.most.help}
      dots={{ n: 3, m: 3 }}
      back={{ href: nav.back("values/add"), onClick: commit }}
      next={{
        disabled: order.length === 0,
        onClick: () => {
          commit()
          const first = order[0]
          nav.go(first ? `values/${seg(first)}/where` : "values/done")
        },
      }}
      later={{ href: homeHref() }}
    >
      {plan.values.length === 0 && <p className="text-sm text-amber-300" role="status">{valuesCopy.most.error_empty}</p>}
      <TapOrder
        items={plan.values.map((v) => ({ id: v, label: v }))}
        order={order}
        onChange={(o) => setOrder(o.slice(0, 3))}
        testPrefix="most"
      />
    </Frame>
  )
}

function Where({ value }: { value: string }) {
  const { plan, change, from } = usePlanNew()
  const nav = useNav("values/done")
  const goals = plan.goals.filter((g) => isActive(g))
  const [ids, setIds] = useState<string[]>(goalsServingValue(plan, value).map((g) => g.id))
  const top = topValues(plan)
  const at = top.findIndex((v) => v.toLowerCase() === value.toLowerCase())
  const commit = () => change((p) => setValueServes(p, value, ids))
  const next = from ? null : top[at + 1]
  return (
    <Frame
      testId="values-where"
      eyebrow={valuesCopy.name}
      title={fill(valuesCopy.where.title, { value })}
      help={valuesCopy.where.help}
      back={{ href: nav.back("values/most"), onClick: commit }}
      next={{ onClick: () => { commit(); nav.go(next ? `values/${seg(next)}/where` : "values/done") } }}
      skip={{ onClick: () => nav.go(next ? `values/${seg(next)}/where` : "values/done") }}
    >
      <Pick options={goals.map((g) => ({ id: g.id, label: g.title }))} value={ids} onChange={setIds} multi testPrefix="where-goal" />
    </Frame>
  )
}

function Done() {
  const { plan } = usePlanNew()
  const nav = useNav("values/done")
  const d = valuesCopy.done
  const top = topValues(plan)
  const rest = plan.values.slice(3)
  const topics: Record<string, string> = { area_values: valuesCopy.earlier_notes.area_values, values_note: valuesCopy.earlier_notes.values_note }
  return (
    <DoneScreen module="values" eyebrow={valuesCopy.name} title={d.title}>
      {top.length > 0 && (
        <section className="space-y-2" data-testid="done-values-top">
          <h2 className="text-sm font-semibold text-zinc-300">{d.top_heading}</h2>
          {top.map((v, i) => {
            const goals = goalsServingValue(plan, v)
            return (
              <Row key={v} label={`${i + 1}`} href={nav.change(`values/${seg(v)}/where`)}>
                <span className="block">{v}</span>
                <span className="block text-xs text-zinc-400">{goals.length ? `${d.served_by}: ${goals.map((g) => g.title).join(", ")}` : d.served_none}</span>
              </Row>
            )
          })}
        </section>
      )}
      {rest.length > 0 && (
        <section className="space-y-2" data-testid="done-values-rest">
          <h2 className="text-sm font-semibold text-zinc-300">{d.rest_heading}</h2>
          <ChipRow>{rest.map((v) => <span key={v} className="rounded-full border border-white/10 px-3 py-1.5 text-sm text-zinc-300">{v}</span>)}</ChipRow>
        </section>
      )}
      <EarlierBlock notes={valuesNotes(plan)} topics={topics} />
    </DoneScreen>
  )
}
