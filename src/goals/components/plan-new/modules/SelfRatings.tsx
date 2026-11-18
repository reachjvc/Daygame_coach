"use client"

import Link from "next/link"
import { useState } from "react"
import { selfratingsCopy } from "@/src/goals/planSteps/copy/selfratings"
import { questionsCopy } from "@/src/goals/planSteps/copy/questions"
import { commonCopy } from "@/src/goals/planSteps/copy/common"
import { fieldScale, fieldUnitKey } from "@/src/goals/planSteps/planFacts"
import { homeHref } from "@/src/goals/planSteps/planRoutes"
import { addRatings, ratingStrip, scaleOf, setRatingScale, type RatingScale } from "@/src/goals/planSteps/extras/selfratingsChanges"
import { setFieldWhere } from "@/src/goals/planSteps/extras/questionsChanges"
import { fill } from "@/src/goals/planSteps/text"
import { usePlanNew } from "../PlanNewContext"
import { useNav } from "../nav"
import { DoneScreen } from "../shared"
import { Chip, ChipRow, Frame, Line, LineList, Pick, btnPrimary, card, linkQuiet } from "../ui"
import { WhereChoice, useGoLoop, useRest, whereText } from "./extrasShared"

export function SelfRatingsModule({ segs }: { segs: string[] }) {
  const { status } = usePlanNew()
  const first = segs[0] ?? (status.extras.selfratings.started ? "done" : "pick")
  if (first === "done") return <Done />
  if (first === "pick") return <PickScreen />
  if (segs[1] === "where") return <Where id={first} />
  if (segs[1] === "scale") return <Scale id={first} />
  return <PickScreen />
}

const SUGGESTIONS = [
  ["suggest_get_up", selfratingsCopy.pick.suggest_get_up],
  ["suggest_training", selfratingsCopy.pick.suggest_training],
  ["suggest_present", selfratingsCopy.pick.suggest_present],
] as const

function PickScreen() {
  const { plan, change } = usePlanNew()
  const nav = useNav("selfratings/done")
  const go = useGoLoop("selfratings/done")
  const [picked, setPicked] = useState<string[]>([])
  const [own, setOwn] = useState<string[]>([])
  const chosen = [...picked, ...own]
  const have = new Set(plan.fields.filter((f) => f.kind === "number").map((f) => f.label.trim().toLowerCase()))
  const commit = () => {
    const out = addRatings(plan, chosen)
    change((p) => addRatings(p, chosen).plan)
    return out.ids
  }
  return (
    <Frame
      testId="selfratings-pick"
      eyebrow={selfratingsCopy.name}
      title={selfratingsCopy.pick.title}
      help={selfratingsCopy.pick.help}
      back={{ href: nav.back(null) }}
      next={{
        disabled: chosen.length === 0,
        onClick: () => {
          const ids = commit()
          if (ids.length === 0) nav.go("selfratings/done")
          else go(`selfratings/${ids[0]}/scale`, ids.slice(1))
        },
      }}
      later={{ href: homeHref() }}
    >
      <ChipRow>
        {SUGGESTIONS.map(([key, text]) => (
          <Chip
            key={key}
            on={picked.includes(text) || have.has(text.toLowerCase())}
            disabled={have.has(text.toLowerCase())}
            testId={`rating-${key}`}
            onClick={() => setPicked(picked.includes(text) ? picked.filter((x) => x !== text) : [...picked, text])}
          >
            {text}
          </Chip>
        ))}
      </ChipRow>
      <LineList label={commonCopy.add} items={own} onChange={setOwn} placeholder={selfratingsCopy.pick.own_placeholder} max={200} testId="rating-own" />
      {chosen.length === 0 && <p className="text-sm text-zinc-500">{selfratingsCopy.pick.error_empty}</p>}
    </Frame>
  )
}

function Scale({ id }: { id: string }) {
  const { plan, change } = usePlanNew()
  const rest = useRest()
  const nav = useNav("selfratings/done")
  const go = useGoLoop("selfratings/done")
  const field = plan.fields.find((f) => f.id === id && f.kind === "number")
  const existing: RatingScale | null = fieldScale(plan, id) ? scaleOf(plan, id) : plan.answers[fieldUnitKey(id)] ? "number" : null
  const [scale, setScale] = useState<RatingScale | null>(existing)
  const [unit, setUnit] = useState(plan.answers[fieldUnitKey(id)] ?? "")
  if (!field) return <Done />
  const commit = () => scale && change((p) => setRatingScale(p, id, scale, unit))
  return (
    <Frame
      testId="selfratings-scale"
      eyebrow={selfratingsCopy.name}
      title={selfratingsCopy.scale.title}
      back={{ href: nav.back("selfratings/pick"), onClick: commit }}
      next={{ disabled: !scale, onClick: () => { commit(); go(`selfratings/${id}/where`, rest) } }}
      later={{ href: homeHref() }}
    >
      <p className="text-base font-medium text-zinc-100">{field.label}</p>
      <Pick
        options={[{ id: "five", label: selfratingsCopy.scale.five }, { id: "ten", label: selfratingsCopy.scale.ten }, { id: "number", label: selfratingsCopy.scale.number }]}
        value={scale ? [scale] : []}
        onChange={(v) => setScale(v[0] as RatingScale)}
        testPrefix="scale"
      />
      {scale === "number" && <Line label={selfratingsCopy.scale.unit_label} value={unit} onChange={setUnit} placeholder={selfratingsCopy.scale.unit_placeholder} max={20} testId="scale-unit" />}
    </Frame>
  )
}

function Where({ id }: { id: string }) {
  const { plan, change } = usePlanNew()
  const rest = useRest()
  const nav = useNav("selfratings/done")
  const field = plan.fields.find((f) => f.id === id && f.kind === "number")
  const [target, setTarget] = useState<string | null>(field?.targetId ?? null)
  if (!field) return <Done />
  const commit = () => change((p) => setFieldWhere(p, id, target))
  const goOn = () => (rest.length ? nav.go(`selfratings/${rest[0]}/scale?rest=${rest.slice(1).join(",")}`) : nav.go("selfratings/done"))
  return (
    <Frame
      testId="selfratings-where"
      eyebrow={selfratingsCopy.name}
      title={selfratingsCopy.where.title}
      back={{ href: nav.back(`selfratings/${id}/scale`), onClick: commit }}
      next={{ onClick: () => { commit(); goOn() } }}
      skip={{ onClick: goOn }}
    >
      <p className="text-base font-medium text-zinc-100">{field.label}</p>
      <WhereChoice plan={plan} value={target} onChange={setTarget} dayLabel={selfratingsCopy.where.on_day} rowLabel={selfratingsCopy.where.under_row} testPrefix="where" />
    </Frame>
  )
}

function Done() {
  const { plan, today } = usePlanNew()
  const nav = useNav("selfratings/done")
  const fields = plan.fields.filter((f) => f.kind === "number")
  const d = selfratingsCopy.done
  return (
    <DoneScreen module="selfratings" eyebrow={selfratingsCopy.name} title={d.title}>
      <ul className="space-y-3" data-testid="ratings-list">
        {fields.map((f) => {
          const s = scaleOf(plan, f.id)
          const strip = ratingStrip(plan, f.id, today)
          const any = strip.some((x) => x.value !== null)
          return (
            <li key={f.id} className={`${card} space-y-2`} data-testid={`rating-${f.id}`}>
              <p className="break-words text-sm font-medium text-zinc-100">{f.label}</p>
              <p className="text-xs text-zinc-400">
                {s === "five" ? d.scale_five : s === "ten" ? d.scale_ten : fill(d.scale_number, { unit: plan.answers[fieldUnitKey(f.id)] ?? "" })}
                {" · "}
                {whereText(plan, f.targetId, questionsCopy.done.shows_day, questionsCopy.done.shows_under)}
              </p>
              {any ? (
                <div role="img" aria-label={d.strip_label}>
                  <p className="mb-1 text-xs text-zinc-500">{d.strip_label}</p>
                  <div className="grid grid-cols-7 gap-1">
                    {strip.map((x) => (
                      <span key={x.date} className={`flex h-8 items-center justify-center rounded text-xs ${x.value === null ? "bg-white/[0.03] text-zinc-600" : "bg-violet-500/25 text-violet-50"}`}>
                        {x.value ?? "·"}
                      </span>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="text-xs text-zinc-500">{d.strip_empty}</p>
              )}
              <div className="flex gap-4">
                <Link href={nav.change(`selfratings/${f.id}/scale`)} className={linkQuiet}>{commonCopy.change}</Link>
                <Link href={nav.change(`selfratings/${f.id}/where`)} className={linkQuiet}>{selfratingsCopy.where.title}</Link>
              </div>
            </li>
          )
        })}
      </ul>
      <Link href={nav.change("selfratings/pick")} className={btnPrimary} data-testid="ratings-add">{commonCopy.add}</Link>
    </DoneScreen>
  )
}
