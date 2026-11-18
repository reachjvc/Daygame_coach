"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { rolemodelsCopy } from "@/src/goals/planSteps/copy/rolemodels"
import { commonCopy, limitsCopy } from "@/src/goals/planSteps/copy/common"
import { LINEUP_HOUR_KEY, LINEUP_REMIND_KEY, LINEUP_WEEK_VALUE_KEY, lineupIds, lineupTaken } from "@/src/goals/planSteps/planFacts"
import { homeHref } from "@/src/goals/planSteps/planRoutes"
import { LINEUP_MAX, addToLineup, removeFromLineup, setRemind, setTaken, setWeekValue } from "@/src/goals/planSteps/extras/rolemodelsChanges"
import { ROLE_MODEL_CATEGORIES } from "@/src/role-models/categories"
import type { RoleModelCardData } from "@/src/role-models/format"
import { fill } from "@/src/goals/planSteps/text"
import { usePlanNew } from "../PlanNewContext"
import { useNav } from "../nav"
import { DoneScreen } from "../shared"
import { Chip, ChipRow, Frame, Line, Pick, Row, btnQuiet, card, hourText, linkQuiet } from "../ui"

interface Catalogue {
  cards: RoleModelCardData[]
  valuesOf: (id: string) => string[]
}

/** The bundled people, loaded when a screen needs them so the plan home does not carry every profile. */
function useCatalogue(): Catalogue | null {
  const [cat, setCat] = useState<Catalogue | null>(null)
  useEffect(() => {
    let live = true
    void import("@/src/role-models/catalog").then((m) => {
      if (!live) return
      const people = m.shownPeople()
      setCat({ cards: people.map(m.cardOf), valuesOf: (id) => { const p = m.shownPerson(id); return p ? m.valueWordsOf(p) : [] } })
    })
    return () => { live = false }
  }, [])
  return cat
}

export function RoleModelsModule({ segs }: { segs: string[] }) {
  const { status } = usePlanNew()
  const first = segs[0] ?? (status.extras.rolemodels.started ? "done" : "pick")
  if (first === "done") return <Done />
  if (first === "week") return <Week />
  if (first === "remind") return <Remind />
  if (first !== "pick" && segs[1] === "take") return <Take id={first} />
  return <PickScreen />
}

function PickScreen() {
  const { plan, change } = usePlanNew()
  const nav = useNav("rolemodels/done")
  const cat = useCatalogue()
  const [query, setQuery] = useState("")
  const [category, setCategory] = useState<string | null>(null)
  const ids = lineupIds(plan)
  const full = ids.length >= LINEUP_MAX
  const name = (id: string) => cat?.cards.find((c) => c.id === id)?.name ?? "…"
  const q = query.trim().toLowerCase()
  const shown = (cat?.cards ?? []).filter((c) => (!category || c.category === category) && (!q || `${c.name} ${c.tagline}`.toLowerCase().includes(q))).slice(0, 40)
  return (
    <Frame
      testId="rolemodels-pick"
      eyebrow={rolemodelsCopy.name}
      title={rolemodelsCopy.pick.title}
      help={rolemodelsCopy.pick.help}
      back={{ href: nav.back(null) }}
      next={{ disabled: ids.length === 0, onClick: () => nav.go(`rolemodels/${ids[0]}/take`) }}
      later={{ href: homeHref() }}
    >
      <section className={card} data-testid="lineup">
        <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">{rolemodelsCopy.group_name}</p>
        <p className="mb-2 text-xs text-zinc-400">{fill(limitsCopy.items, { field: rolemodelsCopy.pick.field_label, count: ids.length, max: LINEUP_MAX })}</p>
        <ChipRow>
          {ids.map((id) => (
            <Chip key={id} on testId={`lineup-${id}`} onClick={() => change((p) => removeFromLineup(p, id))}>{name(id)} ×</Chip>
          ))}
        </ChipRow>
        {full && <p className="mt-2 text-sm text-amber-300">{fill(limitsCopy.items_full, { field: rolemodelsCopy.pick.field_label, max: LINEUP_MAX })}</p>}
      </section>
      <Line label={commonCopy.add} value={query} onChange={setQuery} max={60} testId="person-search" />
      <ChipRow>
        {ROLE_MODEL_CATEGORIES.map((c) => (
          <Chip key={c.id} on={category === c.id} testId={`cat-${c.id}`} onClick={() => setCategory(category === c.id ? null : c.id)}>{c.label}</Chip>
        ))}
      </ChipRow>
      <ul className="space-y-2" data-testid="people">
        {shown.map((c) => {
          const on = ids.includes(c.id)
          return (
            <li key={c.id}>
              <button
                type="button"
                aria-pressed={on}
                disabled={!on && full}
                data-testid={`person-${c.id}`}
                onClick={() => change((p) => (on ? removeFromLineup(p, c.id) : addToLineup(p, c.id)))}
                className={`min-h-11 w-full rounded-lg border px-3 py-2 text-left text-sm disabled:opacity-40 ${on ? "border-violet-400/60 bg-violet-500/20 text-violet-50" : "border-white/10 text-zinc-200"}`}
              >
                <span className="block font-medium">{c.name} <span className="text-xs font-normal text-zinc-500">{c.years}</span></span>
                <span className="block text-xs text-zinc-400">{c.tagline}</span>
              </button>
            </li>
          )
        })}
      </ul>
    </Frame>
  )
}

function Take({ id }: { id: string }) {
  const { plan, change } = usePlanNew()
  const nav = useNav("rolemodels/done")
  const cat = useCatalogue()
  const ids = lineupIds(plan)
  const at = ids.indexOf(id)
  const [values, setValues] = useState<string[]>(lineupTaken(plan, id))
  if (at < 0) return <PickScreen />
  const person = cat?.cards.find((c) => c.id === id)
  const options = (cat?.valuesOf(id) ?? []).map((v) => ({ id: v, label: v }))
  const commit = () => values.length > 0 && change((p) => setTaken(p, id, values))
  const nextId = ids[at + 1]
  return (
    <Frame
      testId="rolemodels-take"
      eyebrow={rolemodelsCopy.name}
      title={fill(rolemodelsCopy.take.title, { name: person?.name ?? "…" })}
      help={rolemodelsCopy.take.help}
      dots={{ n: at + 1, m: ids.length }}
      back={{ href: nav.back(at > 0 ? `rolemodels/${ids[at - 1]}/take` : "rolemodels/pick"), onClick: commit }}
      next={{ disabled: values.length === 0, onClick: () => { commit(); nav.go(nextId ? `rolemodels/${nextId}/take` : "rolemodels/week") } }}
      later={{ href: homeHref() }}
    >
      <Pick
        options={options}
        value={values}
        onChange={(v) => setValues(v.slice(0, 5))}
        multi
        testPrefix="take"
      />
      {values.length >= 5 && <p className="text-sm text-amber-300">{fill(limitsCopy.items_full, { field: fill(rolemodelsCopy.take.field_label, { name: person?.name ?? "" }), max: 5 })}</p>}
    </Frame>
  )
}

function Week() {
  const { plan, change, today } = usePlanNew()
  const nav = useNav("rolemodels/done")
  const all = [...new Set(lineupIds(plan).flatMap((id) => lineupTaken(plan, id)))]
  const [value, setValue] = useState(plan.answers[LINEUP_WEEK_VALUE_KEY] ?? "")
  const commit = () => change((p) => setWeekValue(p, value || null, today))
  return (
    <Frame
      testId="rolemodels-week"
      eyebrow={rolemodelsCopy.name}
      title={rolemodelsCopy.week.title}
      help={rolemodelsCopy.week.help}
      back={{ href: nav.back("rolemodels/pick"), onClick: commit }}
      next={{ onClick: () => { commit(); nav.go("rolemodels/remind") } }}
      skip={{ onClick: () => nav.go("rolemodels/remind") }}
    >
      <Pick options={all.map((v) => ({ id: v, label: v }))} value={value ? [value] : []} onChange={(v) => setValue(v[0] ?? "")} testPrefix="week" />
      {value && <button type="button" className={linkQuiet} onClick={() => setValue("")} data-testid="week-clear">{commonCopy.clear_choice}</button>}
    </Frame>
  )
}

function Remind() {
  const { plan, change } = usePlanNew()
  const nav = useNav("rolemodels/done")
  const [on, setOn] = useState(plan.answers[LINEUP_REMIND_KEY] === "1")
  const [hour, setHour] = useState(Number(plan.answers[LINEUP_HOUR_KEY] ?? 8))
  const commit = () => change((p) => setRemind(p, on, hour))
  return (
    <Frame
      testId="rolemodels-remind"
      eyebrow={rolemodelsCopy.name}
      title={rolemodelsCopy.remind.title}
      help={rolemodelsCopy.remind.copy_note}
      back={{ href: nav.back("rolemodels/week"), onClick: commit }}
      next={{ onClick: () => { commit(); nav.go("rolemodels/done") } }}
      skip={{ onClick: () => nav.go("rolemodels/done") }}
    >
      <ChipRow>
        <Chip on={on} testId="remind-on" onClick={() => setOn(true)}>{rolemodelsCopy.remind.on}</Chip>
        <Chip on={!on} testId="remind-off" onClick={() => setOn(false)}>{rolemodelsCopy.remind.off}</Chip>
      </ChipRow>
      {on && (
        <div>
          <p className="mb-2 text-sm font-medium text-zinc-200">{rolemodelsCopy.remind.hour_label}</p>
          <div className="grid grid-cols-5 gap-2">
            {Array.from({ length: 17 }, (_, i) => i + 6).map((h) => (
              <Chip key={h} on={hour === h} testId={`remind-hour-${h}`} onClick={() => setHour(h)}>{String(h).padStart(2, "0")}</Chip>
            ))}
          </div>
        </div>
      )}
    </Frame>
  )
}

function Done() {
  const { plan } = usePlanNew()
  const nav = useNav("rolemodels/done")
  const cat = useCatalogue()
  const ids = lineupIds(plan)
  const week = plan.answers[LINEUP_WEEK_VALUE_KEY]
  const d = rolemodelsCopy.done
  return (
    <DoneScreen module="rolemodels" eyebrow={rolemodelsCopy.name} title={d.title}>
      {ids.map((id) => (
        <Row key={id} label={cat?.cards.find((c) => c.id === id)?.name ?? "…"} href={nav.change(`rolemodels/${id}/take`)} testId={`lineup-row-${id}`}>
          <span className="text-xs text-zinc-400">{d.takes_label}: </span>
          {lineupTaken(plan, id).join(", ")}
        </Row>
      ))}
      <Row label={d.week_label} href={nav.change("rolemodels/week")} testId="lineup-week">{week || commonCopy.none_yet}</Row>
      {plan.answers[LINEUP_REMIND_KEY] === "1" && (
        <Row label={rolemodelsCopy.remind.title} href={nav.change("rolemodels/remind")} testId="lineup-remind">
          {fill(d.reminder_line, { time: hourText(Number(plan.answers[LINEUP_HOUR_KEY] ?? 8)) })}
        </Row>
      )}
      <Link href={nav.change("rolemodels/pick")} className={btnQuiet}>{commonCopy.add}</Link>
    </DoneScreen>
  )
}
