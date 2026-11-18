"use client"

import Link from "next/link"
import { useState } from "react"
import { identityCopy } from "@/src/goals/planSteps/copy/identity"

import { identityNotes, linesOf, linesWhere, morningRoutine, setIdentity, setLines, setLinesWhere, showsStar, type LinesWhere } from "@/src/goals/planSteps/extras/identityChanges"
import { screenHref } from "@/src/goals/planSteps/planRoutes"
import { usePlanNew } from "../PlanNewContext"
import { useNav } from "../nav"
import { DoneScreen, EarlierBlock } from "../shared"
import { Chip, ChipRow, Frame, GrownText, LineList, Row, linkQuiet } from "../ui"

export function IdentityModule({ segs }: { segs: string[] }) {
  const { status } = usePlanNew()
  const first = segs[0] ?? (status.extras.identity.started ? "done" : "who")
  if (first === "lines") return <Lines />
  if (first === "when") return <When />
  if (first === "done") return <Done />
  return <Who />
}

function Who() {
  const { plan, change } = usePlanNew()
  const nav = useNav("identity/done")
  const [text, setText] = useState(plan.answers["identity_total"] ?? "")
  const [example, setExample] = useState(false)
  const commit = () => change((p) => setIdentity(p, text))
  return (
    <Frame
      testId="identity-who"
      eyebrow={identityCopy.name}
      title={identityCopy.who.title}
      help={identityCopy.who.help}
      dots={{ n: 1, m: 3 }}
      back={{ href: nav.back(null), onClick: commit }}
      next={{ onClick: () => { commit(); nav.go("identity/lines") } }}
      skip={{ onClick: () => nav.go("identity/lines") }}
    >
      <GrownText label={identityCopy.who.field_label} value={text} onChange={setText} placeholder={identityCopy.who.placeholder} max={3000} rows={4} testId="identity-text" />
      <button type="button" className={linkQuiet} onClick={() => setExample(!example)} data-testid="identity-example-link">{identityCopy.who.example_link}</button>
      {example && <p className="rounded-lg border border-white/10 p-3 text-sm text-zinc-300" data-testid="identity-example">{identityCopy.who.example}</p>}
    </Frame>
  )
}

function Lines() {
  const { plan, change } = usePlanNew()
  const nav = useNav("identity/done")
  const [lines, setL] = useState(linesOf(plan))
  const commit = () => change((p) => setLines(p, lines))
  return (
    <Frame
      testId="identity-lines"
      eyebrow={identityCopy.name}
      title={identityCopy.lines.title}
      help={identityCopy.lines.help}
      dots={{ n: 2, m: 3 }}
      back={{ href: nav.back("identity/who"), onClick: commit }}
      next={{ onClick: () => { commit(); nav.go("identity/when") } }}
      skip={{ onClick: () => nav.go("identity/when") }}
    >
      <LineList label={identityCopy.lines.field_label} items={lines} onChange={setL} placeholder={identityCopy.lines.placeholder} max={200} testId="lines" />
    </Frame>
  )
}

function When() {
  const { plan, change } = usePlanNew()
  const nav = useNav("identity/done")
  const hasMorning = Boolean(morningRoutine(plan))
  const [where, setWhere] = useState<LinesWhere>(linesWhere(plan))
  const [star, setStar] = useState(showsStar(plan))
  const commit = () => change((p) => setLinesWhere(p, where, star))
  const w = identityCopy.when
  return (
    <Frame
      testId="identity-when"
      eyebrow={identityCopy.name}
      title={w.title}
      dots={{ n: 3, m: 3 }}
      back={{ href: nav.back("identity/lines"), onClick: commit }}
      next={{ onClick: () => { commit(); nav.go("identity/done") } }}
      skip={{ onClick: () => nav.go("identity/done") }}
    >
      <ChipRow>
        <Chip on={where === "morning"} disabled={!hasMorning} testId="when-morning" onClick={() => setWhere("morning")}>{w.in_morning}</Chip>
        <Chip on={where === "today"} testId="when-today" onClick={() => setWhere("today")}>{w.on_today}</Chip>
        <Chip on={where === "none"} testId="when-none" onClick={() => setWhere("none")}>{w.not_now}</Chip>
      </ChipRow>
      {!hasMorning && (
        <p className="text-sm text-zinc-400">
          {w.no_morning}{" "}
          <Link href={screenHref("routines/pick")} className="underline" data-testid="when-add-routine">{w.add_routine}</Link>
        </p>
      )}
      <Chip on={star} testId="when-star" disabled={where === "none"} onClick={() => setStar(!star)}>{w.include_star}</Chip>
    </Frame>
  )
}

function Done() {
  const { plan } = usePlanNew()
  const nav = useNav("identity/done")
  const d = identityCopy.done
  const lines = linesOf(plan)
  const where = linesWhere(plan)
  const topics: Record<string, string> = { become: identityCopy.earlier_notes.become, conduct: identityCopy.earlier_notes.conduct }
  for (const a of plan.areas) topics[`review_identity:${a.id}`] = identityCopy.earlier_notes.review_identity.replace("{area}", a.label)
  return (
    <DoneScreen module="identity" eyebrow={identityCopy.name} title={d.title}>
      {(plan.answers["identity_total"] ?? "").trim() && (
        <Row label={identityCopy.who.field_label} href={nav.change("identity/who")} testId="done-identity">
          <span className="whitespace-pre-wrap">{plan.answers["identity_total"]}</span>
        </Row>
      )}
      {lines.length > 0 && (
        <Row label={d.lines_heading} href={nav.change("identity/lines")} testId="done-lines">
          <ul className="space-y-1">{lines.map((l, i) => <li key={i}>{l}</li>)}</ul>
        </Row>
      )}
      <Row label={identityCopy.when.title} href={nav.change("identity/when")} testId="done-when">
        {where === "morning" ? d.shown_morning : where === "today" ? d.shown_today : d.shown_nowhere}
      </Row>
      <EarlierBlock notes={identityNotes(plan)} topics={topics} />
    </DoneScreen>
  )
}
