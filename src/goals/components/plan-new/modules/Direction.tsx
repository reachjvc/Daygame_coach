"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { directionCopy } from "@/src/goals/planSteps/copy/direction"
import { commonCopy } from "@/src/goals/planSteps/copy/common"
import { activeAreas, goalsOfTier, growthProgress, isUnfiled } from "@/src/goals/planSteps/planFacts"
import {
  addBigGoal, addGrowthGoal, dropGoal, fileBigGoal, renameGoal, setGoalWhy, setPicture, setStarWhy, startNewNorthStar,
} from "@/src/goals/planSteps/planChanges"
import { directionNotes } from "@/src/goals/planSteps/earlierNotes"
import { ideasFor } from "@/src/goals/planSteps/areaThemes"
import { homeHref, screenHref } from "@/src/goals/planSteps/planRoutes"
import { fill } from "@/src/goals/planSteps/text"
import type { NsGoal } from "@/src/goals/types"
import { usePlanNew } from "../PlanNewContext"
import { useNav } from "../nav"
import { DoneScreen, EarlierBlock, NeedsFirst } from "../shared"
import { BadDay, Chip, ChipRow, Frame, GrownText, Label, Line, LineList, Pick, Row, btnQuiet, card, dateText, linkQuiet } from "../ui"

export function DirectionModule({ segs }: { segs: string[] }) {
  const { status } = usePlanNew()
  const screen = segs[0] ?? (status.modules.direction.started ? "done" : "picture")
  if (screen === "why") return <Why />
  if (screen === "big" && segs[1] === "loop") return <BigLoop />
  if (screen === "big" && segs[1] && segs[2] === "file") return <BigFile id={segs[1]} />
  if (screen === "big" && segs[1] && segs[2] === "why") return <BigWhy id={segs[1]} />
  if (screen === "big") return <Big />
  if (screen === "become") return <Become />
  if (screen === "done") return <Done />
  return <Picture />
}

const TOTAL = 4

function Picture() {
  const { plan, change, today } = usePlanNew()
  const nav = useNav("direction/done")
  const [text, setText] = useState(plan.northStar)
  const [stuck, setStuck] = useState(false)
  const areas = activeAreas(plan)
  const big = goalsOfTier(plan, "life")
  const first = areas[0]
  const placeholder = first ? `${first.label}: ${directionCopy.picture.placeholder.split(": ").slice(1).join(": ") || ""}`.trim() : directionCopy.picture.placeholder
  const commit = () => change((p) => (p.northStar === text ? p : setPicture(p, text, today)))
  const insert = (line: string) => setText((t) => (t.trim() ? `${t.trimEnd()}\n${line}` : line))

  return (
    <Frame
      testId="direction-picture"
      eyebrow={directionCopy.name}
      title={directionCopy.picture.title}
      help={directionCopy.picture.help}
      dots={{ n: 1, m: TOTAL }}
      back={{ href: nav.back(null), onClick: commit }}
      next={{ disabled: !text.trim(), onClick: () => { commit(); nav.go("direction/why") } }}
      later={{ href: homeHref() }}
    >
      <p className="text-xs text-zinc-500">{fill(directionCopy.picture.cue_areas, { areas: areas.map((a) => a.label).join(", ") })}</p>
      {big.length > 0 && <p className="text-xs text-zinc-500">{fill(directionCopy.picture.cue_big, { goals: big.map((g) => g.title).join(", ") })}</p>}
      <GrownText label={directionCopy.picture.field_label} value={text} onChange={setText} placeholder={placeholder} max={5000} rows={5} testId="picture-text" />
      {!text.trim() && <p className="text-xs text-zinc-500">{directionCopy.picture.error_empty}</p>}
      <button type="button" className={linkQuiet} onClick={() => setStuck((s) => !s)} data-testid="stuck-link" aria-expanded={stuck}>
        {stuck ? directionCopy.stuck.back_to_writing : directionCopy.picture.stuck_link}
      </button>
      {stuck && (
        <section className={`${card} space-y-4`} data-testid="stuck-panel">
          <h2 className="text-sm font-semibold text-zinc-100">{directionCopy.stuck.title}</h2>
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">{directionCopy.stuck.example_heading}</p>
            <p className="mt-1 text-sm text-zinc-300">{directionCopy.stuck.example}</p>
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">{directionCopy.stuck.yours_heading}</p>
            <p className="text-xs text-zinc-500">{directionCopy.stuck.yours_help}</p>
            {big.length > 0 && (
              <>
                <p className="mt-2 text-xs text-zinc-400">{directionCopy.stuck.your_big_goals}</p>
                <ChipRow>{big.map((g) => <Chip key={g.id} onClick={() => insert(g.title)}>{g.title}</Chip>)}</ChipRow>
              </>
            )}
            {plan.experiences.length > 0 && (
              <>
                <p className="mt-2 text-xs text-zinc-400">{directionCopy.stuck.your_things}</p>
                <ChipRow>{plan.experiences.slice(0, 8).map((e) => <Chip key={e.id} onClick={() => insert(e.title)}>{e.title}</Chip>)}</ChipRow>
              </>
            )}
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">{directionCopy.stuck.ideas_heading}</p>
            {areas.map((a) => {
              const ideas = ideasFor(a, directionCopy.ideas_per_area)
              return ideas.length ? (
                <div key={a.id} className="mt-2">
                  <p className="text-xs text-zinc-400">{a.label}</p>
                  <ChipRow>{ideas.map((i) => <Chip key={i} onClick={() => insert(i)}>{i}</Chip>)}</ChipRow>
                </div>
              ) : null
            })}
          </div>
        </section>
      )}
    </Frame>
  )
}

function Why() {
  const { plan, change } = usePlanNew()
  const nav = useNav("direction/done")
  const [text, setText] = useState(plan.answers.star_why ?? "")
  const commit = () => change((p) => setStarWhy(p, text))
  return (
    <Frame
      testId="direction-why"
      eyebrow={directionCopy.name}
      title={directionCopy.why.title}
      help={directionCopy.why.help}
      dots={{ n: 2, m: TOTAL }}
      back={{ href: nav.back("direction/picture"), onClick: commit }}
      next={{ onClick: () => { commit(); nav.go("direction/big") } }}
      skip={{ onClick: () => nav.go("direction/big") }}
    >
      <GrownText label={directionCopy.why.field_label} value={text} onChange={setText} placeholder={directionCopy.why.placeholder} max={3000} rows={3} testId="why-text" />
      <BadDay show={Boolean(text.trim())} />
    </Frame>
  )
}

interface Row2 { id: string | null; title: string }

function Big() {
  const { plan, change, today } = usePlanNew()
  const nav = useNav("direction/done")
  const goals = goalsOfTier(plan, "life")
  const [rows, setRows] = useState<Row2[]>(() => goals.map((g) => ({ id: g.id, title: g.title })))
  const [dropped, setDropped] = useState<string[]>([])

  const onChange = (items: string[]) => {
    if (items.length === rows.length + 1) setRows([...rows, { id: null, title: items[items.length - 1] }])
    else if (items.length === rows.length - 1) {
      const at = rows.findIndex((r, i) => items[i] !== r.title)
      const idx = at === -1 ? rows.length - 1 : at
      const gone = rows[idx]
      if (gone.id) setDropped((d) => [...d, gone.id!])
      setRows(rows.filter((_, i) => i !== idx))
    } else setRows(rows.map((r, i) => ({ ...r, title: items[i] ?? r.title })))
  }
  const commit = () => {
    change((p) => {
      let next = p
      for (const id of dropped) next = dropGoal(next, id, today)
      for (const r of rows) {
        const t = r.title.trim()
        if (!t) continue
        if (r.id) {
          const g = next.goals.find((x) => x.id === r.id)
          if (g && g.title !== t) next = renameGoal(next, r.id, t)
        } else next = addBigGoal(next, t)
      }
      return next
    })
    setDropped([])
    setRows((rs) => rs.filter((r) => r.title.trim()))
  }
  const after = () => {
    commit()
    // Each big goal in turn: which area, then why. The new ones have no id until saved, so the loop screen picks the first.
    nav.go("direction/big/loop")
  }
  return (
    <Frame
      testId="direction-big"
      eyebrow={directionCopy.name}
      title={directionCopy.big.title}
      help={directionCopy.big.help}
      dots={{ n: 3, m: TOTAL }}
      back={{ href: nav.back("direction/why"), onClick: commit }}
      next={{ disabled: rows.filter((r) => r.title.trim()).length === 0, onClick: after }}
      later={{ href: homeHref() }}
    >
      <LineList
        label={directionCopy.big.field_label}
        items={rows.map((r) => r.title)}
        onChange={onChange}
        placeholder={directionCopy.big.placeholder}
        maxItems={7}
        addLabel={directionCopy.big.add_button}
        testId="big-list"
      />
      {rows.length === 0 && <p className="text-xs text-zinc-500">{directionCopy.big.error_empty}</p>}
    </Frame>
  )
}

/** `direction/big/loop`: sends to the first big goal's own screens, so the address always names a saved goal. */
function BigLoop() {
  const { plan, from } = usePlanNew()
  const router = useRouter()
  const first = goalsOfTier(plan, "life")[0]
  useEffect(() => {
    router.replace(from ?? screenHref(first ? `direction/big/${first.id}/file` : "direction/big"))
  }, [first, from, router])
  return null
}

function bigOrder(goals: NsGoal[], id: string) {
  const i = goals.findIndex((g) => g.id === id)
  return { i, n: goals.length, goal: goals[i] as NsGoal | undefined, next: goals[i + 1] as NsGoal | undefined, prev: goals[i - 1] as NsGoal | undefined }
}

function BigFile({ id }: { id: string }) {
  const { plan, change } = usePlanNew()
  const nav = useNav("direction/done")
  const goals = goalsOfTier(plan, "life")
  const { i, n, goal, prev } = bigOrder(goals, id)
  const areas = activeAreas(plan)
  const [areaId, setAreaId] = useState<string | null>(goal && !isUnfiled(plan, goal.id) ? goal.areaId : null)
  const [year, setYear] = useState(goal?.targetDate ? goal.targetDate.slice(0, 4) : "")
  if (!goal) return <NeedsFirst eyebrow={directionCopy.name} kind="big_goal" href={screenHref("direction/big")} back={homeHref()} />
  const thisYear = new Date().getFullYear()
  const yearNum = year.trim() ? Number(year) : null
  const yearBad = yearNum != null && (!Number.isInteger(yearNum) || yearNum < thisYear)
  const commit = () => change((p) => fileBigGoal(p, id, areaId, yearBad ? null : yearNum))
  return (
    <Frame
      testId="direction-big-file"
      eyebrow={directionCopy.name}
      title={fill(directionCopy.big_file.title, { goal: goal.title })}
      help={directionCopy.big_file.help}
      dots={{ n: i + 1, m: n }}
      back={{ href: nav.back(prev ? `direction/big/${prev.id}/why` : "direction/big"), onClick: commit }}
      next={{ disabled: yearBad, onClick: () => { commit(); nav.go(`direction/big/${id}/why`) } }}
      skip={{ onClick: () => nav.go(`direction/big/${id}/why`) }}
    >
      <div>
        <Label>{directionCopy.big_file.area_label}</Label>
        <Pick options={areas.map((a) => ({ id: a.id, label: a.label }))} value={areaId ? [areaId] : []} onChange={(v) => setAreaId(v[0] ?? null)} testPrefix="file-area" />
        {areaId && <button type="button" className={linkQuiet} onClick={() => setAreaId(null)}>{directionCopy.big_file.clear_area}</button>}
      </div>
      <div>
        <Line label={directionCopy.big_file.year_label} value={year} onChange={setYear} placeholder={directionCopy.big_file.year_placeholder} max={4} inputMode="numeric" testId="file-year" />
        {yearBad && <p className="mt-1 text-sm text-amber-300">{fill(directionCopy.big_file.error_year_past, { year: thisYear })}</p>}
      </div>
    </Frame>
  )
}

function BigWhy({ id }: { id: string }) {
  const { plan, change } = usePlanNew()
  const nav = useNav("direction/done")
  const goals = goalsOfTier(plan, "life")
  const { i, n, goal, next } = bigOrder(goals, id)
  const [text, setText] = useState(goal?.why ?? "")
  if (!goal) return <NeedsFirst eyebrow={directionCopy.name} kind="big_goal" href={screenHref("direction/big")} back={homeHref()} />
  const commit = () => change((p) => setGoalWhy(p, id, text))
  const onward = () => nav.go(next ? `direction/big/${next.id}/file` : "direction/become")
  return (
    <Frame
      testId="direction-big-why"
      eyebrow={directionCopy.name}
      title={fill(directionCopy.big_why.title, { goal: goal.title })}
      dots={{ n: i + 1, m: n }}
      back={{ href: nav.back(`direction/big/${id}/file`), onClick: commit }}
      next={{ onClick: () => { commit(); onward() } }}
      skip={{ onClick: onward }}
    >
      <GrownText label={directionCopy.big_why.field_label} value={text} onChange={setText} placeholder={directionCopy.big_why.placeholder} max={3000} rows={3} testId="bigwhy-text" />
      <BadDay show={Boolean(text.trim())} />
    </Frame>
  )
}

function Become() {
  const { plan, change, today } = usePlanNew()
  const nav = useNav("direction/done")
  const big = goalsOfTier(plan, "life")
  const growth = goalsOfTier(plan, "become")
  const [title, setTitle] = useState("")
  const [bigId, setBigId] = useState<string | null>(null)
  const [error, setError] = useState("")
  const add = () => {
    const t = title.trim()
    if (!t) return
    if (!bigId) {
      setError(directionCopy.become.error_no_big)
      return
    }
    setError("")
    change((p) => addGrowthGoal(p, t, bigId))
    setTitle("")
  }
  return (
    <Frame
      testId="direction-become"
      eyebrow={directionCopy.name}
      title={directionCopy.become.title}
      help={directionCopy.become.help}
      dots={{ n: 4, m: TOTAL }}
      back={{ href: nav.back(big.length ? `direction/big/${big[big.length - 1].id}/why` : "direction/big") }}
      next={{ onClick: () => nav.go("direction/done") }}
      skip={{ onClick: () => nav.go("direction/done") }}
    >
      {growth.length > 0 && (
        <ul className="space-y-2">
          {growth.map((g) => (
            <li key={g.id} className={`${card} flex items-start justify-between gap-2`} data-testid={`growth-${g.id}`}>
              <div className="min-w-0 text-sm text-zinc-100">
                <p className="break-words">{g.title}</p>
                <p className="text-xs text-zinc-500">{big.find((b) => g.feedsGoalIds.includes(b.id))?.title}</p>
              </div>
              <button type="button" className={btnQuiet} onClick={() => change((p) => dropGoal(p, g.id, today))}>{commonCopy.remove}</button>
            </li>
          ))}
        </ul>
      )}
      <Line label={directionCopy.become.field_label} value={title} onChange={setTitle} placeholder={directionCopy.become.placeholder} onEnter={add} testId="become-title" />
      <div>
        <Label>{directionCopy.become.serves_label}</Label>
        <Pick options={big.map((g) => ({ id: g.id, label: g.title }))} value={bigId ? [bigId] : []} onChange={(v) => setBigId(v[0] ?? null)} testPrefix="become-for" />
      </div>
      {error && <p className="text-sm text-amber-300" role="status">{error}</p>}
      <button type="button" className={btnQuiet} onClick={add} disabled={!title.trim()} data-testid="become-add">{commonCopy.add}</button>
    </Frame>
  )
}

function Done() {
  const { plan, change, today } = usePlanNew()
  const nav = useNav("direction/done")
  const big = goalsOfTier(plan, "life")
  const growth = goalsOfTier(plan, "become")
  const [asking, setAsking] = useState(false)
  const areaName = (id: string) => plan.areas.find((a) => a.id === id)?.label ?? ""
  return (
    <DoneScreen module="direction" eyebrow={directionCopy.name} title={directionCopy.done.title}>
      <Row label={directionCopy.name} href={nav.change("direction/picture")} testId="done-picture">
        <span className="whitespace-pre-wrap">{plan.northStar}</span>
      </Row>
      {plan.answers.star_why?.trim() && (
        <Row label={directionCopy.why.field_label} href={nav.change("direction/why")}>
          <span className="whitespace-pre-wrap">{plan.answers.star_why}</span>
        </Row>
      )}
      <section className="space-y-2">
        <h2 className="text-sm font-semibold text-zinc-300">{directionCopy.done.big_heading}</h2>
        {big.map((g) => (
          <Row key={g.id} label={isUnfiled(plan, g.id) ? "" : areaName(g.areaId)} href={nav.change(`direction/big/${g.id}/file`)} testId={`done-big-${g.id}`}>
            <span className="block">{g.title}</span>
            {g.targetDate && <span className="block text-xs text-zinc-500">{fill(directionCopy.done.by_year, { year: g.targetDate.slice(0, 4) })}</span>}
            {g.why.trim() && (
              <Link href={nav.change(`direction/big/${g.id}/why`)} className="block text-xs text-zinc-400 underline">{g.why}</Link>
            )}
          </Row>
        ))}
        <Link href={nav.change("direction/big")} className={linkQuiet}>{commonCopy.change}</Link>
      </section>
      {growth.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-sm font-semibold text-zinc-300">{directionCopy.done.growth_heading}</h2>
          {growth.map((g) => {
            const pct = growthProgress(plan, g.id)
            return (
              <Row key={g.id} label="" href={nav.change("direction/become")}>
                <span className="block">{g.title}</span>
                <span className="block text-xs text-zinc-500">
                  {pct == null ? directionCopy.done.growth_none : fill(directionCopy.done.growth_progress, { pct })}
                </span>
                {pct == null && (
                  <Link href={screenHref(`goals/new/what?feeds=${g.id}`)} className="text-xs text-violet-300 underline">{directionCopy.done.growth_add}</Link>
                )}
              </Row>
            )
          })}
        </section>
      )}
      <EarlierBlock notes={directionNotes(plan)} topics={directionCopy.earlier_notes} />
      {plan.pastNorthStars.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-sm font-semibold text-zinc-300">{directionCopy.done.history_heading}</h2>
          {plan.pastNorthStars.map((p) => (
            <Row key={p.id} label={fill(directionCopy.done.history_dates, { start: dateText(p.startedOn), end: dateText(p.endedOn) })}>
              <span className="whitespace-pre-wrap">{p.text}</span>
            </Row>
          ))}
        </section>
      )}
      {asking ? (
        <div className={card} role="alertdialog" aria-label={directionCopy.done.new_star_confirm_title}>
          <p className="text-sm font-medium text-zinc-100">{directionCopy.done.new_star_confirm_title}</p>
          <p className="text-sm text-zinc-400">{directionCopy.done.new_star_confirm_body}</p>
          <div className="mt-3 flex gap-2">
            <button type="button" className={btnQuiet} onClick={() => { change((p) => startNewNorthStar(p, today)); setAsking(false); nav.router.push(screenHref("direction/picture")) }} data-testid="new-star-yes">{directionCopy.done.new_star_confirm_yes}</button>
            <button type="button" className={btnQuiet} onClick={() => setAsking(false)}>{commonCopy.cancel}</button>
          </div>
        </div>
      ) : (
        <button type="button" className={linkQuiet} onClick={() => setAsking(true)} data-testid="new-star">{directionCopy.done.new_star_link}</button>
      )}
    </DoneScreen>
  )
}
