"use client"

import { useState } from "react"
import { standingCopy } from "@/src/goals/planSteps/copy/standing"
import { PLAN_AREAS } from "@/src/goals/planSteps/copy/planAreas"
import { activeAreas, standingLine } from "@/src/goals/planSteps/planFacts"
import { areaFacts, setStanding, standingNotes, standingOrder } from "@/src/goals/planSteps/extras/standingChanges"
import { homeHref } from "@/src/goals/planSteps/planRoutes"
import { fill, plural } from "@/src/goals/planSteps/text"
import { usePlanNew } from "../PlanNewContext"
import { useNav } from "../nav"
import { DoneScreen, EarlierBlock } from "../shared"
import { Frame, GrownText, Row } from "../ui"

export function StandingModule({ segs }: { segs: string[] }) {
  const { status, plan } = usePlanNew()
  const first = segs[0] ?? (status.extras.standing.started ? "done" : standingOrder(plan)[0] ?? "done")
  if (first === "done" || !plan.areas.some((a) => a.id === first)) return <Done />
  return <Area key={first} areaId={first} />
}

function Area({ areaId }: { areaId: string }) {
  const { plan, change, from } = usePlanNew()
  const nav = useNav("standing/done")
  const order = standingOrder(plan)
  const at = Math.max(0, order.indexOf(areaId))
  const area = plan.areas.find((a) => a.id === areaId)!
  const [text, setText] = useState(standingLine(plan, areaId))
  const commit = () => change((p) => setStanding(p, areaId, text))
  const nextId = order[at + 1]
  const placeholder = PLAN_AREAS.find((a) => a.id === areaId)?.standingPlaceholder ?? standingCopy.area.placeholder
  const prevId = order[at - 1]
  return (
    <Frame
      testId={`standing-${areaId}`}
      eyebrow={standingCopy.name}
      title={fill(standingCopy.area.title, { area: area.label })}
      help={standingCopy.area.help}
      dots={{ n: at + 1, m: order.length }}
      back={{ href: nav.back(prevId ? `standing/${prevId}` : null), onClick: commit }}
      next={{ disabled: !text.trim(), onClick: () => { commit(); nav.go(nextId ? `standing/${nextId}` : "standing/done") } }}
      later={{ href: homeHref() }}
    >
      <GrownText label={standingCopy.area.field_label} value={text} onChange={setText} placeholder={placeholder} max={1000} rows={2} testId="standing-text" />
    </Frame>
  )
}

function Done() {
  const { plan, today } = usePlanNew()
  const nav = useNav("standing/done")
  const d = standingCopy.done
  const notes = standingOrder(plan).flatMap((id) => standingNotes(plan, id).map((n) => ({ ...n, topic: `${n.topic}:${id}` })))
  const topics: Record<string, string> = {}
  for (const a of activeAreas(plan)) for (const k of ["review_blockers", "area_values", "review_purpose", "review_ten", "review_identity"] as const) topics[`${k}:${a.id}`] = `${a.label} · ${standingCopy.earlier_notes[k]}`
  return (
    <DoneScreen module="standing" eyebrow={standingCopy.name} title={d.title}>
      {standingOrder(plan).map((id) => {
        const area = plan.areas.find((a) => a.id === id)!
        const line = standingLine(plan, id)
        const f = areaFacts(plan, id, today)
        return (
          <Row key={id} label={area.label} href={nav.change(`standing/${id}`)} testId={`done-standing-${id}`}>
            <span className="block">{line || <span className="text-zinc-500">{d.no_line}</span>}</span>
            <span className="block text-xs text-zinc-400">
              {plural(d, "goals", f.goals)}
              {f.planned > 0 ? ` · ${fill(d.week_line, { done: f.done, planned: f.planned })}` : ""}
            </span>
          </Row>
        )
      })}
      <EarlierBlock notes={notes} topics={topics} />
      <p className="text-xs text-zinc-500">{standingCopy.earlier_notes.old_ratings}</p>
    </DoneScreen>
  )
}
