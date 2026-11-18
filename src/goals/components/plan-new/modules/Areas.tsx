"use client"

import { useState } from "react"
import { areasCopy } from "@/src/goals/planSteps/copy/areas"
import { activeAreas, hiddenAreas } from "@/src/goals/planSteps/planFacts"
import { addOwnArea, describeArea, markAreasDescribed, orderAreas, renameArea, setAreaHidden } from "@/src/goals/planSteps/planChanges"
import Link from "next/link"
import { homeHref } from "@/src/goals/planSteps/planRoutes"
import { usePlanNew } from "../PlanNewContext"
import { useNav } from "../nav"
import { DoneScreen, EarlierBlock } from "../shared"
import { areasSwitchCopy } from "@/src/goals/planSteps/copy/planAreas"
import { foldAreas, foldedNotes, matchOldAreas } from "@/src/goals/planSteps/foldAreas"
import { Chip, Frame, GrownText, Line, Row, TapOrder, btnQuiet, card, linkQuiet } from "../ui"

export function AreasModule({ segs }: { segs: string[] }) {
  const { status } = usePlanNew()
  const screen = segs[0] ?? (status.modules.areas.started ? "done" : "pick")
  if (screen === "describe") return <Describe />
  if (screen === "order") return <Order />
  if (screen === "done") return <Done />
  return <Pick />
}

/** Not in the words file: the plain line that names areas the switch leaves alone. */
const LEFT_ALONE = "These stay as they are:"

function SwitchAreas() {
  const { plan, change } = usePlanNew()
  const [asking, setAsking] = useState(false)
  const [done, setDone] = useState(false)
  const match = matchOldAreas(plan)
  if (done) return <p className="text-sm text-emerald-200" role="status" data-testid="switch-done">{areasSwitchCopy.done_toast}</p>
  if (Object.keys(match.mapping).length === 0) return null
  return (
    <section className={card} data-testid="switch-areas">
      <h2 className="text-sm font-semibold text-zinc-100">{areasSwitchCopy.action}</h2>
      <p className="mt-1 text-xs text-zinc-400">{areasSwitchCopy.help}</p>
      {asking ? (
        <div className="mt-3 space-y-2" role="alertdialog" aria-label={areasSwitchCopy.confirm_title}>
          <p className="text-sm font-medium text-zinc-100">{areasSwitchCopy.confirm_title}</p>
          <p className="text-sm text-zinc-300">{areasSwitchCopy.confirm_body}</p>
          {match.unmatched.length > 0 && <p className="text-sm text-amber-200" data-testid="switch-unmatched">{LEFT_ALONE} {match.unmatched.map((a) => a.label).join(", ")}</p>}
          <div className="flex gap-2">
            <button type="button" className={btnQuiet} data-testid="switch-yes" onClick={() => { change((p) => foldAreas(p, matchOldAreas(p).mapping)); setAsking(false); setDone(true) }}>{areasSwitchCopy.confirm_yes}</button>
            <button type="button" className={btnQuiet} onClick={() => setAsking(false)}>{areasSwitchCopy.cancel}</button>
          </div>
        </div>
      ) : (
        <button type="button" className={`${btnQuiet} mt-3`} data-testid="switch-go" onClick={() => setAsking(true)}>{areasSwitchCopy.button}</button>
      )}
    </section>
  )
}

function stepsOf(count: number): number {
  return count >= 3 ? 3 : 2
}

function Pick() {
  const { plan, change } = usePlanNew()
  const nav = useNav("areas/done")
  const active = activeAreas(plan)
  const hidden = hiddenAreas(plan)
  const [own, setOwn] = useState("")
  const [error, setError] = useState("")
  const [editing, setEditing] = useState<string | null>(null)
  const [draft, setDraft] = useState("")

  const blank = active.some((a) => !a.label.trim())
  const tooFew = active.length < 2

  const addOne = () => {
    const name = own.trim()
    if (!name) return
    if (plan.areas.some((a) => a.label.trim().toLowerCase() === name.toLowerCase())) {
      setError(areasCopy.pick.error_duplicate)
      return
    }
    setError("")
    change((p) => addOwnArea(p, name))
    setOwn("")
  }
  const commitRename = () => {
    if (editing) {
      const name = draft.trim()
      if (name) change((p) => renameArea(p, editing, name))
    }
    setEditing(null)
  }

  const row = (id: string, label: string, on: boolean) => (
    <li key={id} className="flex items-center gap-2" data-testid={`area-${id}`}>
      {editing === id ? (
        <input
          autoFocus
          value={draft}
          maxLength={60}
          aria-label={areasCopy.pick.name_label}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commitRename}
          onKeyDown={(e) => e.key === "Enter" && commitRename()}
          className="min-h-11 min-w-0 flex-1 rounded-lg border border-violet-400/60 bg-white/[0.03] px-3 text-base text-zinc-100"
        />
      ) : (
        <Chip on={on} testId={`area-toggle-${id}`} onClick={() => change((p) => setAreaHidden(p, id, on))}>
          {label || areasCopy.pick.name_label}
        </Chip>
      )}
      {editing !== id && (
        <button type="button" className={`${btnQuiet} ml-auto shrink-0`} onClick={() => { setEditing(id); setDraft(label) }} data-testid={`area-rename-${id}`}>
          {areasCopy.pick.rename}
        </button>
      )}
    </li>
  )

  return (
    <Frame
      testId="areas-pick"
      eyebrow={areasCopy.name}
      title={areasCopy.pick.title}
      help={areasCopy.pick.help}
      dots={{ n: 1, m: stepsOf(active.length) }}
      back={{ href: nav.back(null) }}
      next={{ disabled: tooFew || blank, onClick: () => nav.go(`areas/describe`) }}
      later={{ href: homeHref() }}
    >
      <SwitchAreas />
      <ul className="space-y-2">{active.map((a) => row(a.id, a.label, true))}</ul>
      {tooFew && <p className="text-sm text-amber-300" role="status">{areasCopy.pick.error_few}</p>}
      {blank && <p className="text-sm text-amber-300" role="status">{areasCopy.pick.error_blank}</p>}
      {hidden.length > 0 && (
        <section>
          <h2 className="mb-2 text-sm font-semibold text-zinc-400">{areasCopy.pick.hidden_heading}</h2>
          <ul className="space-y-2">{hidden.map((a) => row(a.id, a.label, false))}</ul>
        </section>
      )}
      <div className={card}>
        <div className="flex items-end gap-2">
          <div className="min-w-0 flex-1">
            <Line label={areasCopy.pick.own_label} value={own} onChange={setOwn} placeholder={areasCopy.pick.own_placeholder} max={60} onEnter={addOne} testId="area-own" />
          </div>
          <button type="button" className={btnQuiet} onClick={addOne} disabled={!own.trim()} data-testid="area-own-add">
            {areasCopy.pick.own_button}
          </button>
        </div>
        {error && <p className="mt-2 text-sm text-amber-300" role="status">{error}</p>}
      </div>
    </Frame>
  )
}

function Describe() {
  const { plan, change } = usePlanNew()
  const nav = useNav("areas/done")
  const active = activeAreas(plan)
  const [drafts, setDrafts] = useState<Record<string, string>>(() => Object.fromEntries(active.map((a) => [a.id, a.sublabel])))
  const commit = () => {
    change((p) => active.reduce((acc, a) => describeArea(acc, a.id, drafts[a.id] ?? a.sublabel), markAreasDescribed(p)))
  }
  return (
    <Frame
      testId="areas-describe"
      eyebrow={areasCopy.name}
      title={areasCopy.describe.title}
      help={areasCopy.describe.help}
      dots={{ n: 2, m: stepsOf(active.length) }}
      back={{ href: nav.back("areas/pick"), onClick: commit }}
      next={{ onClick: () => { commit(); nav.go(active.length >= 3 ? "areas/order" : "areas/done") } }}
      skip={{ onClick: () => nav.go(active.length >= 3 ? "areas/order" : "areas/done") }}
    >
      {active.map((a) => (
        <div key={a.id}>
          <p className="mb-1 text-sm font-semibold text-zinc-100">{a.label}</p>
          <GrownText label={areasCopy.describe.field_label} value={drafts[a.id] ?? ""} onChange={(v) => setDrafts((d) => ({ ...d, [a.id]: v }))} placeholder={areasCopy.describe.placeholder} max={200} rows={1} testId={`describe-${a.id}`} />
        </div>
      ))}
    </Frame>
  )
}

function Order() {
  const { plan, change } = usePlanNew()
  const nav = useNav("areas/done")
  const active = activeAreas(plan)
  const [order, setOrder] = useState<string[]>([])
  return (
    <Frame
      testId="areas-order"
      eyebrow={areasCopy.name}
      title={areasCopy.order.title}
      help={areasCopy.order.help}
      dots={{ n: 3, m: 3 }}
      back={{ href: nav.back("areas/describe") }}
      next={{ onClick: () => { if (order.length) change((p) => orderAreas(p, order)); nav.go("areas/done") } }}
      skip={{ onClick: () => nav.go("areas/done") }}
    >
      <TapOrder items={active.map((a) => ({ id: a.id, label: a.label }))} order={order} onChange={setOrder} />
    </Frame>
  )
}

function Done() {
  const { plan } = usePlanNew()
  const nav = useNav("areas/done")
  const active = activeAreas(plan)
  const hidden = hiddenAreas(plan)
  return (
    <DoneScreen module="areas" eyebrow={areasCopy.name} title={areasCopy.done.title}>
      <Row label={areasCopy.name} href={nav.change("areas/pick")} testId="done-areas">
        <ul className="space-y-1">
          {active.map((a) => (
            <li key={a.id}>
              {a.label}
              {a.sublabel && <span className="block text-xs text-zinc-500">{a.sublabel}</span>}
            </li>
          ))}
        </ul>
      </Row>
      {hidden.length > 0 && (
        <Row label={areasCopy.done.hidden_label}>{hidden.map((a) => a.label).join(", ")}</Row>
      )}
      <SwitchAreas />
      <EarlierBlock notes={active.flatMap((a) => foldedNotes(plan, a.id).map((n) => ({ topic: `${a.label} (${n.from})`, text: n.text })))} topics={{}} />
      <div className="flex gap-4">
        <Link className={linkQuiet} href={nav.change("areas/describe")}>{areasCopy.describe.field_label}</Link>
        {active.length >= 3 && <Link className={linkQuiet} href={nav.change("areas/order")}>{areasCopy.order.title}</Link>}
      </div>
    </DoneScreen>
  )
}
