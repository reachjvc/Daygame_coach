"use client"

import { useState } from "react"
import { experiencesCopy } from "@/src/goals/planSteps/copy/experiences"
import { commonCopy } from "@/src/goals/planSteps/copy/common"
import { activeAreas } from "@/src/goals/planSteps/planFacts"
import { addThing, chaseThing, dropThing, tickThing } from "@/src/goals/planSteps/extras/experiencesChanges"
import { homeHref, screenHref } from "@/src/goals/planSteps/planRoutes"
import { fill } from "@/src/goals/planSteps/text"
import { usePlanNew } from "../PlanNewContext"
import { useNav } from "../nav"
import { DoneScreen } from "../shared"
import { Chip, ChipRow, Frame, Line, Row, btnQuiet, card, dateText } from "../ui"

export function ExperiencesModule({ segs }: { segs: string[] }) {
  const { status } = usePlanNew()
  const first = segs[0] ?? (status.extras.experiences.started ? "done" : "list")
  if (first === "chase") return <Chase />
  if (first === "done") return <Done />
  return <List />
}

function List() {
  const { plan, change, today } = usePlanNew()
  const nav = useNav("experiences/done")
  const areas = activeAreas(plan)
  const [draft, setDraft] = useState("")
  const [area, setArea] = useState<string | null>(null)
  const add = () => {
    if (!draft.trim()) return
    change((p) => addThing(p, draft, area))
    setDraft("")
  }
  return (
    <Frame
      testId="experiences-list"
      eyebrow={experiencesCopy.name}
      title={experiencesCopy.list.title}
      help={experiencesCopy.list.help}
      back={{ href: nav.back(null) }}
      next={{ disabled: plan.experiences.length === 0 && !draft.trim(), onClick: () => { add(); nav.go("experiences/chase") } }}
      later={{ href: homeHref() }}
    >
      {plan.experiences.length === 0 ? (
        <p className="text-sm text-zinc-500">{experiencesCopy.list.empty}</p>
      ) : (
        <ul className="space-y-2" data-testid="things">
          {plan.experiences.map((e) => (
            <li key={e.id} className={`${card} flex items-start gap-3`}>
              <input
                type="checkbox"
                checked={e.done}
                onChange={() => change((p) => tickThing(p, e.id, today))}
                className="mt-1 h-6 w-6 shrink-0"
                aria-label={e.title}
                data-testid={`thing-tick-${e.id}`}
              />
              <div className="min-w-0 flex-1">
                <p className={`break-words text-sm ${e.done ? "text-zinc-500 line-through" : "text-zinc-100"}`}>{e.title}</p>
                {e.done && e.doneOn && <p className="text-xs text-zinc-500">{fill(experiencesCopy.list.done_on, { date: dateText(e.doneOn) })}</p>}
              </div>
              <button type="button" className={`${btnQuiet} shrink-0`} onClick={() => change((p) => dropThing(p, e.id))} aria-label={`${commonCopy.remove}: ${e.title}`}>
                {commonCopy.remove}
              </button>
            </li>
          ))}
        </ul>
      )}
      <Line label={experiencesCopy.list.field_label} value={draft} onChange={setDraft} placeholder={experiencesCopy.list.placeholder} max={300} onEnter={add} testId="thing-draft" />
      <div>
        <p className="mb-1 text-sm font-medium text-zinc-200">{experiencesCopy.list.area_label}</p>
        <ChipRow>
          {areas.map((a) => (
            <Chip key={a.id} on={area === a.id} testId={`thing-area-${a.id}`} onClick={() => setArea(area === a.id ? null : a.id)}>{a.label}</Chip>
          ))}
        </ChipRow>
      </div>
      <button type="button" className={btnQuiet} onClick={add} disabled={!draft.trim()} data-testid="thing-add">{commonCopy.add}</button>
    </Frame>
  )
}

function Chase() {
  const { plan, change } = usePlanNew()
  const nav = useNav("experiences/done")
  const open = plan.experiences.filter((e) => !e.done && !e.goalId)
  const [pick, setPick] = useState<string | null>(null)
  const go = () => {
    const made = pick ? chaseThing(plan, pick) : null
    if (made) {
      change(() => made.plan)
      nav.router.push(screenHref(`goals/${made.goalId}/numbers`))
    } else nav.go("experiences/done")
  }
  return (
    <Frame
      testId="experiences-chase"
      eyebrow={experiencesCopy.name}
      title={experiencesCopy.chase.title}
      help={experiencesCopy.chase.help}
      back={{ href: nav.back("experiences/list") }}
      next={{ disabled: !pick, onClick: go }}
      skip={{ onClick: () => nav.go("experiences/done") }}
    >
      <ul className="space-y-2">
        {open.map((e) => (
          <li key={e.id}>
            <Chip on={pick === e.id} testId={`chase-${e.id}`} onClick={() => setPick(e.id)}>{e.title}</Chip>
          </li>
        ))}
      </ul>
    </Frame>
  )
}

function Done() {
  const { plan } = usePlanNew()
  const nav = useNav("experiences/done")
  const d = experiencesCopy.done
  const open = plan.experiences.filter((e) => !e.done && !e.goalId)
  const chasing = plan.experiences.filter((e) => !e.done && e.goalId)
  const done = plan.experiences.filter((e) => e.done)
  const group = (heading: string, list: typeof open, id: string) =>
    list.length > 0 && (
      <section className="space-y-2" data-testid={`done-things-${id}`}>
        <h2 className="text-sm font-semibold text-zinc-300">{heading}</h2>
        {list.map((e) => (
          <Row key={e.id} label="" href={nav.change("experiences/list")}>{e.title}</Row>
        ))}
      </section>
    )
  return (
    <DoneScreen module="experiences" eyebrow={experiencesCopy.name} title={d.title}>
      {group(d.open_heading, open, "open")}
      {group(d.chasing_heading, chasing, "chasing")}
      {group(d.done_heading, done, "done")}
    </DoneScreen>
  )
}
