"use client"

import Link from "next/link"
import { useState } from "react"
import { questionsCopy } from "@/src/goals/planSteps/copy/questions"
import { readAllCopy } from "@/src/goals/planSteps/copy/home"
import { commonCopy } from "@/src/goals/planSteps/copy/common"
import { readOptionIds } from "@/src/goals/planSteps/planFacts"
import { FIRST_BASE, homeHref } from "@/src/goals/planSteps/planRoutes"
import { addFields, isPlanLink, setFieldKind, setFieldWhere } from "@/src/goals/planSteps/extras/questionsChanges"
import { usePlanNew } from "../PlanNewContext"
import { useNav } from "../nav"
import { DoneScreen } from "../shared"
import { Chip, ChipRow, Frame, Line, LineList, Pick, btnPrimary, card, linkQuiet } from "../ui"
import { WhereChoice, useGoLoop, useRest, whereText } from "./extrasShared"

export function QuestionsModule({ segs }: { segs: string[] }) {
  const { status } = usePlanNew()
  const first = segs[0] ?? (status.extras.questions.started ? "done" : "pick")
  if (first === "done") return <Done />
  if (first === "pick") return <PickScreen />
  if (segs[1] === "where") return <Where id={first} />
  if (segs[1] === "kind") return <Kind id={first} />
  return <PickScreen />
}

/** The label a read question shows for a source id. */
export function readLabel(id: string): string {
  return id === "star" ? readAllCopy.north_star
    : id === "answer:identity_total" ? readAllCopy.identity
    : id === "answer:affirmations" ? readAllCopy.identity_lines
    : id === "values" ? readAllCopy.values
    : id
}

const p = questionsCopy.pick
const SETS = [
  { id: "end_of_day", label: p.set_end_of_day, questions: p.set_end_of_day_q },
  { id: "learned", label: p.set_learned, questions: p.set_learned_q },
  { id: "bothers", label: p.set_bothers, questions: p.set_bothers_q },
  { id: "field", label: p.set_field, questions: p.set_field_q },
  { id: "blank", label: p.set_blank, questions: p.set_blank_q },
] as const

function PickScreen() {
  const { plan, change } = usePlanNew()
  const nav = useNav("questions/done")
  const go = useGoLoop("questions/done")
  const [sets, setSets] = useState<string[]>([])
  const [glad, setGlad] = useState(false)
  const [own, setOwn] = useState<string[]>([])
  const labels = [...SETS.filter((s) => sets.includes(s.id)).flatMap((s) => s.questions), ...(glad ? [p.single_glad] : []), ...own]
  const empty = sets.length === 0 && !glad && own.length === 0
  return (
    <Frame
      testId="questions-pick"
      eyebrow={questionsCopy.name}
      title={p.title}
      back={{ href: nav.back(null) }}
      next={{
        disabled: empty,
        onClick: () => {
          const made = addFields(plan, labels, "write")
          change((pl) => addFields(pl, labels, "write").plan)
          if (made.ids.length === 0) nav.go("questions/done")
          else go(`questions/${made.ids[0]}/where`, made.ids.slice(1))
        },
      }}
      later={{ href: homeHref() }}
    >
      <ChipRow>
        {SETS.map((s) => (
          <Chip key={s.id} on={sets.includes(s.id)} testId={`qset-${s.id}`} onClick={() => setSets(sets.includes(s.id) ? sets.filter((x) => x !== s.id) : [...sets, s.id])}>
            {s.label}
          </Chip>
        ))}
        <Chip on={glad} testId="qset-glad" onClick={() => setGlad(!glad)}>{p.single_glad}</Chip>
      </ChipRow>
      <LineList label={p.own_label} items={own} onChange={setOwn} placeholder={p.own_placeholder} max={300} testId="question-own" />
      {empty && <p className="text-sm text-zinc-500">{p.error_empty}</p>}
    </Frame>
  )
}

function Where({ id }: { id: string }) {
  const { plan, change } = usePlanNew()
  const rest = useRest()
  const nav = useNav("questions/done")
  const field = plan.fields.find((f) => f.id === id && f.kind !== "number")
  const [target, setTarget] = useState<string | null>(field?.targetId ?? null)
  if (!field) return <Done />
  const commit = () => change((pl) => setFieldWhere(pl, id, target))
  const tail = rest.length ? `?rest=${rest.join(",")}` : ""
  const goOn = () => nav.go(`questions/${id}/kind${tail}`)
  return (
    <Frame
      testId="questions-where"
      eyebrow={questionsCopy.name}
      title={questionsCopy.where.title}
      back={{ href: nav.back("questions/pick"), onClick: commit }}
      next={{ onClick: () => { commit(); goOn() } }}
      skip={{ onClick: goOn }}
    >
      <p className="text-base font-medium text-zinc-100">{field.label}</p>
      <WhereChoice plan={plan} value={target} onChange={setTarget} dayLabel={questionsCopy.where.on_day} rowLabel={questionsCopy.where.under_row} testPrefix="where" />
    </Frame>
  )
}

function Kind({ id }: { id: string }) {
  const { plan, change } = usePlanNew()
  const rest = useRest()
  const nav = useNav("questions/done")
  const field = plan.fields.find((f) => f.id === id && f.kind !== "number")
  const [kind, setKind] = useState<"write" | "read" | "go">((field?.kind as "write" | "read" | "go") ?? "write")
  const [source, setSource] = useState(field?.readSourceId ?? "")
  if (!field) return <Done />
  const options = readOptionIds(plan).map((o) => ({ id: o.id, label: readLabel(o.id) }))
  const valid = kind === "write" || (kind === "read" && Boolean(source)) || (kind === "go" && isPlanLink(source.trim()))
  const commit = () => valid && change((pl) => setFieldKind(pl, id, kind, kind === "write" ? null : source))
  const goOn = () => (rest.length ? nav.go(`questions/${rest[0]}/where?rest=${rest.slice(1).join(",")}`) : nav.go("questions/done"))
  return (
    <Frame
      testId="questions-kind"
      eyebrow={questionsCopy.name}
      title={questionsCopy.kind.title}
      back={{ href: nav.back(`questions/${id}/where`), onClick: commit }}
      next={{ disabled: !valid, onClick: () => { commit(); goOn() } }}
      skip={{ onClick: goOn }}
    >
      <p className="text-base font-medium text-zinc-100">{field.label}</p>
      <Pick
        options={[{ id: "write", label: questionsCopy.kind.write }, { id: "read", label: questionsCopy.kind.read }, { id: "go", label: questionsCopy.kind.go }]}
        value={[kind]}
        onChange={(v) => { setKind(v[0] as "write" | "read" | "go"); setSource(v[0] === (field.kind as string) ? field.readSourceId ?? "" : "") }}
        testPrefix="kind"
      />
      {kind === "read" && (
        <div className="space-y-2">
          <p className="text-sm font-medium text-zinc-200">{questionsCopy.kind.read_pick}</p>
          <Pick options={options} value={source ? [source] : []} onChange={(v) => setSource(v[0] ?? "")} testPrefix="source" />
        </div>
      )}
      {kind === "go" && <Line label={questionsCopy.kind.go_label} value={source} onChange={setSource} placeholder={`${FIRST_BASE}/${questionsCopy.kind.go_placeholder}`} max={200} testId="go-link" />}
    </Frame>
  )
}

function Done() {
  const { plan } = usePlanNew()
  const nav = useNav("questions/done")
  const fields = plan.fields.filter((f) => f.kind !== "number")
  return (
    <DoneScreen module="questions" eyebrow={questionsCopy.name} title={questionsCopy.done.title}>
      <ul className="space-y-3" data-testid="questions-list">
        {fields.map((f) => (
          <li key={f.id} className={`${card} space-y-1`} data-testid={`question-${f.id}`}>
            <p className="break-words text-sm font-medium text-zinc-100">{f.label}</p>
            <p className="text-xs text-zinc-400">{whereText(plan, f.targetId, questionsCopy.done.shows_day, questionsCopy.done.shows_under)}</p>
            <div className="flex gap-4">
              <Link href={nav.change(`questions/${f.id}/where`)} className={linkQuiet}>{commonCopy.change}</Link>
              <Link href={nav.change(`questions/${f.id}/kind`)} className={linkQuiet}>{questionsCopy.kind.title}</Link>
            </div>
          </li>
        ))}
      </ul>
      <Link href={nav.change("questions/pick")} className={btnPrimary} data-testid="questions-add">{commonCopy.add}</Link>
    </DoneScreen>
  )
}
