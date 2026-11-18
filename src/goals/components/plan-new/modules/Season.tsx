"use client"

import Link from "next/link"
import { useState } from "react"
import { seasonCopy, seasonCloseCopy } from "@/src/goals/planSteps/copy/season"
import { commonCopy } from "@/src/goals/planSteps/copy/common"
import { protectedId, activeAreas, activeSeasonGoals, goalsOfTier, seasonTakeKey } from "@/src/goals/planSteps/planFacts"
import {
  closeSeason, sayYes, setSeasonAreas, setSeasonBigGoals, setSeasonEnd, setSeasonFocusSentence, setSeasonWhy, takeYesBack, type CloseChoice,
} from "@/src/goals/planSteps/planChanges"
import { seasonNotes } from "@/src/goals/planSteps/earlierNotes"
import { homeHref, screenHref } from "@/src/goals/planSteps/planRoutes"
import { fill, plural } from "@/src/goals/planSteps/text"
import { ONE_ANSWERS, COMMIT_DATE_KEY, COMMIT_KEY } from "@/src/goals/data/northStarStart"
import { addDaysISO } from "@/src/goals/northStarService"
import { usePlanNew } from "../PlanNewContext"
import { useNav } from "../nav"
import { DoneScreen, EarlierBlock, NeedsFirst } from "../shared"
import { BadDay, Chip, ChipRow, Frame, GrownText, Line, Pick, Row, TapOrder, btnPrimary, btnQuiet, card, dateText, linkQuiet } from "../ui"

interface CloseDraft {
  take: string
  choices: Record<string, CloseChoice>
}

export function SeasonModule({ segs }: { segs: string[] }) {
  const { status } = usePlanNew()
  const [draft, setDraft] = useState<CloseDraft>({ take: "", choices: {} })
  const screen = segs[0] ?? (status.modules.season.started ? "done" : "focus")
  if (screen === "close") return <Close step={segs[1] ?? "brought"} draft={draft} setDraft={setDraft} />
  if (screen === "big") return <Big />
  if (screen === "areas" && segs[1] === "order") return <AreasOrder />
  if (screen === "areas") return <Areas />
  if (screen === "end") return <End />
  if (screen === "why") return <Why />
  if (screen === "yes") return <Yes />
  if (screen === "done") return <Done />
  return <Focus />
}

const TOTAL = 7

function Focus() {
  const { plan, change, today } = usePlanNew()
  const nav = useNav("season/done")
  const [text, setText] = useState(plan.season?.sentence ?? "")
  const last = plan.pastSeasons.at(-1)?.sentence
  const commit = () => change((p) => (p.season?.sentence === text ? p : setSeasonFocusSentence(p, text, today)))
  return (
    <Frame
      testId="season-focus"
      eyebrow={seasonCopy.name}
      title={seasonCopy.focus.title}
      help={seasonCopy.focus.help}
      dots={{ n: 1, m: TOTAL }}
      back={{ href: nav.back(null), onClick: commit }}
      next={{ disabled: !text.trim(), onClick: () => { commit(); nav.go(goalsOfTier(plan, "life").length ? "season/big" : "season/areas") } }}
      later={{ href: homeHref() }}
    >
      {last?.trim() && !text.trim() && <p className="text-xs text-zinc-500">{fill(seasonCopy.focus.last_season, { sentence: last })}</p>}
      <GrownText label={seasonCopy.focus.field_label} value={text} onChange={setText} placeholder={seasonCopy.focus.placeholder} max={300} rows={2} testId="season-text" />
      {!text.trim() && <p className="text-xs text-zinc-500">{seasonCopy.focus.error_empty}</p>}
    </Frame>
  )
}

function Big() {
  const { plan, change } = usePlanNew()
  const nav = useNav("season/done")
  const big = goalsOfTier(plan, "life")
  const [ids, setIds] = useState<string[]>(big.filter((g) => g.servesOneThing).map((g) => g.id))
  const commit = () => change((p) => setSeasonBigGoals(p, ids, (g) => g.status === "active" && goalsOfTier(p, "life").some((b) => b.id === g.id)))
  if (big.length === 0) return <NeedsFirst eyebrow={seasonCopy.name} kind="big_goal" href={screenHref("direction/big")} back={screenHref("season/focus")} />
  return (
    <Frame
      testId="season-big"
      eyebrow={seasonCopy.name}
      title={seasonCopy.big.title}
      help={seasonCopy.big.help}
      dots={{ n: 2, m: TOTAL }}
      back={{ href: nav.back("season/focus"), onClick: commit }}
      next={{ onClick: () => { commit(); nav.go("season/areas") } }}
      skip={{ onClick: () => nav.go("season/areas") }}
    >
      <Pick options={big.map((g) => ({ id: g.id, label: g.title }))} value={ids} onChange={setIds} multi testPrefix="season-big" />
    </Frame>
  )
}

function Areas() {
  const { plan, change } = usePlanNew()
  const nav = useNav("season/done")
  const areas = activeAreas(plan)
  const picked = goalsOfTier(plan, "life").filter((g) => g.servesOneThing).map((g) => g.areaId)
  const [ids, setIds] = useState<string[]>(plan.seasonAreaIds.length ? plan.seasonAreaIds : [...new Set(picked)].filter((id) => areas.some((a) => a.id === id)))
  const commit = () => change((p) => setSeasonAreas(p, ids))
  return (
    <Frame
      testId="season-areas"
      eyebrow={seasonCopy.name}
      title={seasonCopy.areas.title}
      help={seasonCopy.areas.help}
      dots={{ n: 3, m: TOTAL }}
      back={{ href: nav.back(goalsOfTier(plan, "life").length ? "season/big" : "season/focus"), onClick: commit }}
      next={{ disabled: ids.length === 0, onClick: () => { commit(); nav.go(ids.length >= 2 ? "season/areas/order" : "season/end") } }}
      later={{ href: homeHref() }}
    >
      <ul className="space-y-2">
        {areas.map((a) => {
          const on = ids.includes(a.id)
          const line = plan.review[a.id]?.snapshot?.trim()
          return (
            <li key={a.id}>
              <Chip on={on} testId={`season-area-${a.id}`} onClick={() => setIds(on ? ids.filter((x) => x !== a.id) : [...ids, a.id])}>
                <span className="block">{a.label}</span>
                {line && <span className="block text-xs text-zinc-400">{line}</span>}
              </Chip>
            </li>
          )
        })}
      </ul>
      {ids.length === 0 && <p className="text-sm text-amber-300" role="status">{seasonCopy.areas.error_empty}</p>}
    </Frame>
  )
}

function AreasOrder() {
  const { plan, change } = usePlanNew()
  const nav = useNav("season/done")
  const areas = plan.seasonAreaIds.map((id) => plan.areas.find((a) => a.id === id)).filter((a): a is NonNullable<typeof a> => Boolean(a))
  const [order, setOrder] = useState<string[]>([])
  return (
    <Frame
      testId="season-areas-order"
      eyebrow={seasonCopy.name}
      title={seasonCopy.areas_order.title}
      help={seasonCopy.areas_order.help}
      dots={{ n: 4, m: TOTAL }}
      back={{ href: nav.back("season/areas") }}
      next={{ onClick: () => { if (order.length) change((p) => setSeasonAreas(p, [...order, ...p.seasonAreaIds.filter((x) => !order.includes(x))])); nav.go("season/end") } }}
      skip={{ onClick: () => nav.go("season/end") }}
    >
      <TapOrder items={areas.map((a) => ({ id: a.id, label: a.label }))} order={order} onChange={setOrder} />
    </Frame>
  )
}

function monthsAhead(today: string, months: number): string {
  const d = new Date(`${today}T00:00:00`)
  const day = d.getDate()
  d.setMonth(d.getMonth() + months)
  if (d.getDate() !== day) d.setDate(0)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
}

function End() {
  const { plan, change, today } = usePlanNew()
  const nav = useNav("season/done")
  const [date, setDate] = useState(plan.season?.endsOn ?? "")
  const [custom, setCustom] = useState(false)
  const past = Boolean(date) && date <= today
  const chips = [3, 4, 6]
  const commit = () => date && !past && change((p) => setSeasonEnd(p, date, today))
  return (
    <Frame
      testId="season-end"
      eyebrow={seasonCopy.name}
      title={seasonCopy.end.title}
      help={seasonCopy.end.help}
      dots={{ n: 5, m: TOTAL }}
      back={{ href: nav.back(plan.seasonAreaIds.length >= 2 ? "season/areas/order" : "season/areas"), onClick: commit }}
      next={{ disabled: !date || past, onClick: () => { commit(); nav.go("season/why") } }}
      later={{ href: homeHref() }}
    >
      <ChipRow>
        {chips.map((m) => {
          const d = monthsAhead(today, m)
          return (
            <Chip key={m} on={!custom && date === d} testId={`end-in-${m}`} onClick={() => { setCustom(false); setDate(d) }}>
              {seasonCopy.end[`in_${m}` as "in_3"]}
            </Chip>
          )
        })}
        <Chip on={custom} testId="end-pick" onClick={() => setCustom(true)}>{seasonCopy.end.pick}</Chip>
      </ChipRow>
      {custom && <Line label={seasonCopy.end.pick} value={date} onChange={setDate} type="date" testId="end-date" />}
      {date && !past && <p className="text-sm text-zinc-300" data-testid="end-shown">{fill(seasonCopy.end.ends_on, { date: dateText(date) })}</p>}
      {past && <p className="text-sm text-amber-300" role="status">{seasonCopy.end.error_past}</p>}
    </Frame>
  )
}

function Why() {
  const { plan, change } = usePlanNew()
  const nav = useNav("season/done")
  const [text, setText] = useState(plan.answers[ONE_ANSWERS.why] ?? "")
  const commit = () => change((p) => setSeasonWhy(p, text))
  return (
    <Frame
      testId="season-why"
      eyebrow={seasonCopy.name}
      title={seasonCopy.why.title}
      dots={{ n: 6, m: TOTAL }}
      back={{ href: nav.back("season/end"), onClick: commit }}
      next={{ onClick: () => { commit(); nav.go("season/yes") } }}
      skip={{ onClick: () => nav.go("season/yes") }}
    >
      <GrownText label={seasonCopy.why.field_label} value={text} onChange={setText} placeholder={seasonCopy.why.placeholder} max={3000} rows={3} testId="season-why-text" />
      <BadDay show={Boolean(text.trim())} />
    </Frame>
  )
}

const yesIsLive = (answers: Record<string, string>, startedOn: string | null | undefined) =>
  Boolean(answers[COMMIT_DATE_KEY]) && (!startedOn || answers[COMMIT_DATE_KEY] >= startedOn)

function Yes() {
  const { plan, change, today } = usePlanNew()
  const nav = useNav("season/done")
  const [text, setText] = useState(plan.answers[COMMIT_KEY] ?? "")
  const [asking, setAsking] = useState(false)
  const live = yesIsLive(plan.answers, plan.season?.startedOn)
  return (
    <Frame
      testId="season-yes"
      eyebrow={seasonCopy.name}
      title={fill(seasonCopy.yes.title, { date: dateText(plan.season?.endsOn) })}
      help={seasonCopy.yes.help}
      dots={{ n: 7, m: TOTAL }}
      back={{ href: nav.back("season/why") }}
      next={{ onClick: () => { if (text !== (plan.answers[COMMIT_KEY] ?? "")) change((p) => ({ ...p, answers: { ...p.answers, [COMMIT_KEY]: text } })); nav.go("season/done") } }}
      skip={{ onClick: () => nav.go("season/done") }}
    >
      <GrownText label={seasonCopy.yes.field_label} value={text} onChange={setText} placeholder={seasonCopy.yes.placeholder} max={1000} rows={2} testId="season-yes-text" />
      {live ? (
        <div className={card} data-testid="yes-said">
          <p className="text-sm text-emerald-200">{fill(seasonCopy.yes.said_yes, { date: dateText(plan.answers[COMMIT_DATE_KEY]) })}</p>
          {asking ? (
            <div className="mt-2 space-y-2">
              <p className="text-sm text-zinc-300">{seasonCopy.yes.take_back_confirm}</p>
              <div className="flex gap-2">
                <button type="button" className={btnQuiet} onClick={() => { change(takeYesBack); setAsking(false) }}>{seasonCopy.yes.take_back_yes}</button>
                <button type="button" className={btnQuiet} onClick={() => setAsking(false)}>{commonCopy.cancel}</button>
              </div>
            </div>
          ) : (
            <button type="button" className={linkQuiet} onClick={() => setAsking(true)}>{seasonCopy.yes.take_back}</button>
          )}
        </div>
      ) : (
        <button type="button" className={btnPrimary} disabled={!text.trim()} data-testid="im-in" onClick={() => { change((p) => sayYes(p, text, today)); nav.go("season/done") }}>
          {seasonCopy.yes.button}
        </button>
      )}
    </Frame>
  )
}

function Done() {
  const { plan } = usePlanNew()
  const nav = useNav("season/done")
  const s = plan.season
  const big = goalsOfTier(plan, "life").filter((g) => g.servesOneThing)
  const areaNames = plan.seasonAreaIds.map((id) => plan.areas.find((a) => a.id === id)?.label).filter(Boolean)
  const focus = protectedId(plan)
  const focusTitle =
    plan.goals.find((g) => g.id === focus)?.title ?? plan.routines.flatMap((r) => r.steps).find((x) => x.id === focus)?.title
  return (
    <DoneScreen module="season" eyebrow={seasonCopy.name} title={seasonCopy.done.title}>
      <Row label={seasonCopy.done.focus_label} href={nav.change("season/focus")} testId="done-focus">{s?.sentence}</Row>
      <Row label={seasonCopy.done.ends_label} href={nav.change("season/end")}>{dateText(s?.endsOn)}</Row>
      <Row label={seasonCopy.done.areas_label} href={nav.change("season/areas")}>{areaNames.join(" · ")}</Row>
      {big.length > 0 && <Row label={seasonCopy.done.big_label} href={nav.change("season/big")}>{big.map((g) => g.title).join(" · ")}</Row>}
      {plan.answers[ONE_ANSWERS.why]?.trim() && <Row label={seasonCopy.done.why_label} href={nav.change("season/why")}>{plan.answers[ONE_ANSWERS.why]}</Row>}
      {focusTitle && <Row label={seasonCopy.done.protects_label} href={nav.change("actions/protect")}>{focusTitle}</Row>}
      {plan.answers[COMMIT_KEY]?.trim() && (
        <Row label={seasonCopy.done.yes_label} href={nav.change("season/yes")}>
          {plan.answers[COMMIT_KEY]}
          {yesIsLive(plan.answers, s?.startedOn) && <span className="block text-xs text-zinc-500">{fill(seasonCopy.yes.said_yes, { date: dateText(plan.answers[COMMIT_DATE_KEY]) })}</span>}
        </Row>
      )}
      <EarlierBlock notes={seasonNotes(plan)} topics={seasonCopy.earlier_notes} />
      <div className="flex flex-wrap gap-x-4">
        <Link href={nav.change("season/end")} className={linkQuiet}>{seasonCopy.done.move_end}</Link>
        <Link href={screenHref("season/close/brought")} className={linkQuiet} data-testid="close-early">{seasonCopy.done.close_early}</Link>
      </div>
      <section className="space-y-2">
        <h2 className="text-sm font-semibold text-zinc-300">{seasonCopy.done.earlier_heading}</h2>
        {plan.pastSeasons.length === 0 ? (
          <p className="text-sm text-zinc-500">{seasonCopy.done.earlier_empty}</p>
        ) : (
          [...plan.pastSeasons].reverse().map((p) => (
            <Row key={p.id} label={fill(seasonCopy.done.earlier_dates, { start: dateText(p.startedOn), end: dateText(p.endedOn) })}>
              {p.sentence}
              {plan.answers[seasonTakeKey(p.id)] && <span className="block text-xs text-zinc-500">{plan.answers[seasonTakeKey(p.id)]}</span>}
            </Row>
          ))
        )}
      </section>
    </DoneScreen>
  )
}

// ----------------------------------------------------------------- the close

const CLOSE_STEPS = ["brought", "take", "goals", "look", "start"] as const

function Close({ step, draft, setDraft }: { step: string; draft: CloseDraft; setDraft: (d: CloseDraft) => void }) {
  const { plan, change, today } = usePlanNew()
  const nav = useNav("season/done")
  const s = plan.season
  const goals = activeSeasonGoals(plan).filter((g) => g.servesOneThing)
  const n = Math.max(0, CLOSE_STEPS.indexOf(step as (typeof CLOSE_STEPS)[number])) + 1
  const prev = CLOSE_STEPS[n - 2]
  const here = (id: string) => `season/close/${id}`
  const chrome = { eyebrow: seasonCloseCopy.title, dots: { n, m: CLOSE_STEPS.length }, back: { href: prev ? screenHref(here(prev)) : screenHref("season/done") } }
  if (!s) return <NeedsFirst eyebrow={seasonCopy.name} kind="season" href={screenHref("season/focus")} back={homeHref()} />

  if (step === "take") {
    return (
      <Frame {...chrome} testId="close-take" title={seasonCloseCopy.take.title} help={seasonCloseCopy.take.help} next={{ onClick: () => nav.router.push(screenHref(here("goals"))) }} skip={{ onClick: () => nav.router.push(screenHref(here("goals"))) }}>
        <GrownText label={seasonCloseCopy.take.field_label} value={draft.take} onChange={(take) => setDraft({ ...draft, take })} placeholder={seasonCloseCopy.take.placeholder} max={1000} rows={3} testId="close-take-text" />
      </Frame>
    )
  }
  if (step === "goals") {
    const options: { id: CloseChoice; label: string }[] = [
      { id: "carry", label: seasonCloseCopy.goals.carry }, { id: "achieved", label: seasonCloseCopy.goals.achieved },
      { id: "paused", label: seasonCloseCopy.goals.pause }, { id: "dropped", label: seasonCloseCopy.goals.drop },
    ]
    const all = goals.every((g) => draft.choices[g.id])
    return (
      <Frame {...chrome} testId="close-goals" title={seasonCloseCopy.goals.title.replace("{goal}", "")} help={seasonCloseCopy.goals.help} next={{ disabled: !all, onClick: () => nav.router.push(screenHref(here("look"))) }}>
        {goals.map((g) => (
          <div key={g.id} className={card}>
            <p className="mb-2 text-sm font-medium text-zinc-100">{fill(seasonCloseCopy.goals.title, { goal: g.title })}</p>
            <Pick options={options} value={draft.choices[g.id] ? [draft.choices[g.id]] : []} onChange={(v) => setDraft({ ...draft, choices: { ...draft.choices, [g.id]: v[0] } })} testPrefix={`close-${g.id}`} />
          </div>
        ))}
      </Frame>
    )
  }
  if (step === "look") {
    return (
      <Frame {...chrome} testId="close-look" title={seasonCloseCopy.look.title} next={{ onClick: () => nav.router.push(screenHref(here("start"))) }} skip={{ onClick: () => nav.router.push(screenHref(here("start"))) }}>
        <Link href={screenHref("direction/done")} className={linkQuiet}>{seasonCloseCopy.look.big_link}</Link>
      </Frame>
    )
  }
  if (step === "start") {
    return (
      <Frame {...chrome} testId="close-start" title={seasonCloseCopy.start.title} help={seasonCloseCopy.start.help} next={null}>
        <button
          type="button"
          className={btnPrimary}
          data-testid="close-start-go"
          onClick={() => {
            change((p) => closeSeason(p, today, draft.take, draft.choices))
            nav.router.push(screenHref("season/focus"))
          }}
        >
          {seasonCloseCopy.start.button}
        </button>
      </Frame>
    )
  }
  return <Brought chrome={chrome} />
}

function Brought({ chrome }: { chrome: { eyebrow: string; dots: { n: number; m: number }; back: { href: string } } }) {
  const { plan, today } = usePlanNew()
  const nav = useNav("season/done")
  const s = plan.season
  const since = s?.startedOn ?? "0000-00-00"
  const achieved = plan.goals.filter((g) => g.status === "achieved" && g.statusOn && g.statusOn >= since).length
  const season = plan.goals.filter((g) => g.servesOneThing)
  const rungs = season.flatMap((g) => g.checkpoints).filter((c) => c.done && (!c.doneOn || c.doneOn >= since)).length
  const protectedKey = protectedId(plan)
  const weeks = new Set<string>()
  const allWeeks = new Set<string>()
  for (let d = since; d <= today; d = addDaysISO(d, 1)) {
    const dt = new Date(`${d}T00:00:00`)
    const monday = addDaysISO(d, -((dt.getDay() + 6) % 7))
    allWeeks.add(monday)
    if (protectedKey && (plan.logged[d] ?? []).includes(protectedKey)) weeks.add(monday)
  }
  const practice = season.filter((g) => g.type === "habit_ramp").map((g) => ({
    g, total: Object.entries(plan.numbers).reduce((sum, [d, m]) => (d >= since ? sum + (m[g.id] ?? 0) : sum), 0),
  }))
  const nothing = achieved === 0 && rungs === 0 && weeks.size === 0 && practice.every((p) => p.total === 0)
  return (
    <Frame {...chrome} testId="close-brought" title={seasonCloseCopy.brought.title} next={{ onClick: () => nav.router.push(screenHref("season/close/take")) }}>
      <ul className={`${card} space-y-1 text-sm text-zinc-200`}>
        <li>{plural(seasonCloseCopy.brought, "achieved", achieved)}</li>
        <li>{plural(seasonCloseCopy.brought, "rungs", rungs)}</li>
        {protectedKey && <li>{fill(seasonCloseCopy.brought.protected_kept, { n: weeks.size, m: allWeeks.size })}</li>}
        {practice.map((p) => <li key={p.g.id}>{fill(seasonCloseCopy.brought.practice_total, { goal: p.g.title, n: p.total })}</li>)}
      </ul>
      {nothing && <p className="text-sm text-zinc-400">{seasonCloseCopy.brought.empty}</p>}
    </Frame>
  )
}
