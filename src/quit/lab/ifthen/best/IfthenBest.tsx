"use client"

import { useEffect, useState } from "react"
import { EvidenceChip, SourceTap } from "../../../components/kit"
import { getAddiction } from "../../../data"
import { localDate, realRefs, usable } from "../../../tools/common"
import type { QuitAddiction, QuitAddictionId, QuitNeed, QuitOption, QuitResponse } from "../../../types"
import type { LabProps } from "../../registry"
import { ExampleBar } from "../../progress/shared/Bits"
import { buildDeck, type Card } from "../../sos/best/logic"
import { useLabState } from "../../store"
import { EVIDENCE } from "./evidence"
import {
  buildSentence,
  EMPTY_SETTINGS,
  handoffSituations,
  hasNegation,
  newPairId,
  pairsFor,
  parsePairs,
  parseSettings,
  sameSituation,
  toggleSituation,
  upsertPair,
  type Pair,
  type Situation,
} from "./logic"
import { EvidenceLine, Nudge } from "./Parts"
import { PlanScreen } from "./Plan"
import { bestText as t } from "./text"

const SWITCH_IDS = ["nicotine", "alcohol", "weed", "porn"] as const satisfies readonly QuitAddictionId[]
type Step = "pick" | "then" | "plan"
interface Choice {
  then: string
  own: boolean
  swapId: string | null
}

const btn = "inline-flex min-h-11 items-center justify-center rounded-md border border-border px-3 text-sm"
const primary = "inline-flex min-h-12 items-center justify-center rounded-md bg-primary px-4 text-base text-primary-foreground disabled:opacity-50"
const fill = (s: string, vars: Record<string, string | number>) => s.replace(/\{(\w+)\}/g, (_, k: string) => String(vars[k] ?? ""))

/** Improved If-then plan: pick the moments, pick one thing to do for each, then a plan he can edit, print and check back on. */
export function IfthenBest({ addiction: initial }: LabProps) {
  const [chosen, setChosen] = useLabState<string>("ifthen", "best", "addiction", initial)
  const id: QuitAddictionId = (SWITCH_IDS as readonly string[]).includes(chosen) ? (chosen as QuitAddictionId) : "nicotine"
  return (
    <div data-testid="ifthen-best" className="flex flex-col gap-4">
      <div role="radiogroup" aria-label={t.addictionLabel} className="flex flex-wrap gap-2">
        {SWITCH_IDS.map((x) => (
          <button
            key={x}
            type="button"
            role="radio"
            aria-checked={id === x}
            data-testid={`switch-${x}`}
            onClick={() => setChosen(x)}
            className={`inline-flex min-h-11 items-center rounded-full border px-4 text-sm ${id === x ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card"}`}
          >
            {t.addictions[x]}
          </button>
        ))}
      </div>
      <Flow key={id} id={id} data={getAddiction(id)} />
    </div>
  )
}

function Flow({ id, data }: { id: QuitAddictionId; data: QuitAddiction | null }) {
  const [raw, setRaw] = useLabState<unknown>("ifthen", "best", "pairs", [])
  const [rawSettings, setRawSettings] = useLabState<unknown>("ifthen", "best", "settings", EMPTY_SETTINGS)
  const [handoff] = useLabState<unknown>("past", "best", "handoff-endings", [])
  const all = parsePairs(raw)
  const settings = parseSettings(rawSettings)
  const mine = pairsFor(all, id)
  const moments = usable<QuitOption[]>(data?.riskyMoments)
  const deck = buildDeck(usable<QuitResponse[]>(data?.responses), usable<QuitNeed[]>(data?.needs))

  const [today, setToday] = useState("")
  useEffect(() => setToday(localDate()), [])
  const [step, setStep] = useState<Step | null>(null)
  const [sel, setSel] = useState<Situation[] | null>(null)
  const [choices, setChoices] = useState<Record<string, Choice>>({})
  const [idx, setIdx] = useState(0)

  const effStep: Step = step ?? (mine.length > 0 ? "plan" : "pick")
  const fromHandoff = mine.length === 0 ? handoffSituations(handoff, moments ?? []) : []
  const picked: Situation[] = sel ?? (mine.length > 0 ? [] : fromHandoff)
  const key = (s: Situation) => s.label.trim().toLowerCase()
  const choiceFor = (s: Situation): Choice => {
    const c = choices[key(s)]
    if (c) return c
    const p = mine.find((q) => sameSituation(q.situation, s.label))
    return p ? { then: p.then, own: p.own, swapId: p.swapId } : { then: "", own: false, swapId: null }
  }

  const setAll = (next: Pair[]) => setRaw(next)
  const setSettings = (next: typeof settings) => setRawSettings(next)

  const seedExample = () => {
    if (!moments || deck.length === 0) return
    const rows: Pair[] = moments.slice(0, 2).map((m, i) => ({
      id: newPairId(),
      addiction: id,
      situation: m.label,
      custom: false,
      then: deck[i].text,
      own: false,
      swapId: deck[i].swap?.id ?? null,
      example: true,
    }))
    setAll([...all, ...rows])
    setStep("plan")
  }
  const clearExample = () => {
    setAll(all.filter((p) => !p.example))
    setStep(null)
  }
  const hasExample = mine.some((p) => p.example)

  const toThen = () => {
    setIdx(0)
    setStep("then")
  }
  const finish = () => {
    let next = all
    for (const s of picked) {
      const c = choiceFor(s)
      const prev = mine.find((q) => sameSituation(q.situation, s.label))
      next = upsertPair(next, { id: prev?.id ?? newPairId(), addiction: id, situation: s.label, custom: s.custom, then: c.then.trim(), own: c.own, swapId: c.swapId })
    }
    setAll(next)
    setSel(null)
    setChoices({})
    setStep("plan")
  }
  const addMore = () => {
    setSel(mine.map((p) => ({ label: p.situation, custom: p.custom })))
    setStep("pick")
  }

  return (
    <>
      {hasExample && <ExampleBar onClear={clearExample} />}
      {effStep === "pick" && (
        <PickStep
          id={id}
          moments={moments}
          picked={picked}
          prefilled={sel === null && fromHandoff.length > 0}
          canExample={!!moments && deck.length > 0}
          onExample={seedExample}
          onChange={setSel}
          onNext={toThen}
          onBack={mine.length > 0 ? () => { setSel(null); setStep("plan") } : null}
        />
      )}
      {effStep === "then" && picked.length > 0 && (
        <ThenStep
          key={picked[Math.min(idx, picked.length - 1)].label}
          id={id}
          deck={deck}
          needs={usable<QuitNeed[]>(data?.needs)}
          situation={picked[Math.min(idx, picked.length - 1)]}
          i={Math.min(idx, picked.length - 1)}
          n={picked.length}
          choice={choiceFor(picked[Math.min(idx, picked.length - 1)])}
          allDone={picked.every((s) => choiceFor(s).then.trim() !== "")}
          onChoice={(c) => setChoices({ ...choices, [key(picked[Math.min(idx, picked.length - 1)])]: c })}
          onIdx={setIdx}
          onBack={() => setStep("pick")}
          onFinish={finish}
        />
      )}
      {effStep === "plan" && <PlanScreen addiction={id} all={all} setAll={setAll} settings={settings} setSettings={setSettings} today={today} onAdd={addMore} />}
    </>
  )
}

function PickStep({ id, moments, picked, prefilled, canExample, onExample, onChange, onNext, onBack }: {
  id: string
  moments: QuitOption[] | null
  picked: Situation[]
  prefilled: boolean
  canExample: boolean
  onExample: () => void
  onChange: (next: Situation[]) => void
  onNext: () => void
  onBack: (() => void) | null
}) {
  const [text, setText] = useState("")
  const listed = (moments ?? []).map((m) => m.label)
  const customs = picked.filter((s) => s.custom && !listed.some((l) => sameSituation(l, s.label)))
  const add = () => {
    const label = text.trim()
    if (!label) return
    if (!picked.some((s) => sameSituation(s.label, label))) onChange([...picked, { label, custom: true }])
    setText("")
  }
  return (
    <section data-testid="step-pick" className="flex flex-col gap-3">
      <header>
        <h2 className="text-xl font-semibold">{t.pickTitle}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{t.pickLine}</p>
      </header>
      {prefilled && (
        <p data-testid="prefilled" className="rounded-md border border-border bg-card px-3 py-2 text-sm">
          {t.prefilled}
        </p>
      )}
      {moments ? (
        <div role="group" aria-label={t.pickTitle} className="flex flex-wrap gap-2">
          {moments.map((m) => {
            const on = picked.some((s) => sameSituation(s.label, m.label))
            return (
              <button
                key={m.id}
                type="button"
                aria-pressed={on}
                data-testid={`sit-${m.id}`}
                onClick={() => onChange(toggleSituation(picked, { label: m.label, custom: false }))}
                className={`inline-flex min-h-11 items-center rounded-full border px-3 text-sm ${on ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card"}`}
              >
                {m.label}
              </button>
            )
          })}
        </div>
      ) : (
        <p data-testid="content-coming" className="rounded-md border border-dashed border-border px-3 py-3 text-sm text-muted-foreground">
          {t.contentComing}. {t.noList}
        </p>
      )}
      {customs.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {customs.map((s, i) => (
            <button key={s.label} type="button" aria-pressed data-testid={`sit-own-${i}`} onClick={() => onChange(toggleSituation(picked, s))} className="inline-flex min-h-11 items-center rounded-full border border-primary bg-primary px-3 text-sm text-primary-foreground">
              {s.label}
            </button>
          ))}
        </div>
      )}
      <div className="flex gap-2">
        <label className="flex min-w-0 flex-1 flex-col gap-1 text-sm">
          {t.customLabel}
          <input
            data-testid="sit-custom-input"
            value={text}
            maxLength={120}
            placeholder={t.customPlaceholder}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault()
                add()
              }
            }}
            className="min-h-11 min-w-0 rounded-md border border-border bg-card px-3 text-base"
          />
        </label>
        <button type="button" data-testid="sit-custom-add" onClick={add} className={`${btn} self-end`}>
          {t.customAdd}
        </button>
      </div>
      <EvidenceLine ev={EVIDENCE.quitting} addiction={id} testId="ev-quitting" />
      <div className="flex flex-wrap items-center gap-2">
        {onBack && (
          <button type="button" data-testid="pick-back" onClick={onBack} className={btn}>
            {t.back}
          </button>
        )}
        <button type="button" data-testid="sit-next" disabled={picked.length === 0} onClick={onNext} className={`${primary} flex-1`}>
          {t.pickNext}
        </button>
      </div>
      {picked.length === 0 && <p className="text-sm text-muted-foreground">{t.pickNone}</p>}
      {canExample && (
        <button type="button" data-testid="example-start" onClick={onExample} className="inline-flex min-h-11 items-center self-start text-sm text-muted-foreground underline">
          {t.exampleBtn}
        </button>
      )}
    </section>
  )
}

function ThenStep({ id, deck, needs, situation, i, n, choice, allDone, onChoice, onIdx, onBack, onFinish }: {
  id: string
  deck: Card[]
  needs: QuitNeed[] | null
  situation: Situation
  i: number
  n: number
  choice: Choice
  allDone: boolean
  onChoice: (c: Choice) => void
  onIdx: (i: number) => void
  onBack: () => void
  onFinish: () => void
}) {
  const groups: { name: string; cards: Card[] }[] = []
  const rest = deck.filter((c) => !c.swap)
  if (rest.length) groups.push({ name: t.groupQuick, cards: rest })
  const seen = new Set<string>()
  for (const nd of needs ?? []) {
    const cards = deck.filter((c) => c.swap && !seen.has(c.id) && nd.swaps.some((s) => s.id === c.swap?.id))
    cards.forEach((c) => seen.add(c.id))
    if (cards.length) groups.push({ name: nd.name, cards })
  }
  const [group, setGroup] = useState(0)
  const cardPicked = deck.find((c) => !choice.own && c.text === choice.then)
  const sentence = buildSentence(situation.label, situation.custom, choice.then)
  const last = i === n - 1
  return (
    <section data-testid="step-then" className="flex flex-col gap-3">
      <header>
        <h2 className="text-xl font-semibold">{t.thenTitle}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{t.thenLine}</p>
      </header>
      <p className="text-xs text-muted-foreground">{fill(t.situationOf, { i: i + 1, n })}</p>
      <p data-testid="sentence" className="rounded-lg border border-border bg-card p-3 text-lg">
        {sentence}
      </p>
      {groups.length > 0 && (
        <>
          <div role="tablist" aria-label={t.thenTitle} className="flex flex-wrap gap-2">
            {groups.map((g, gi) => (
              <button key={g.name} type="button" role="tab" aria-selected={group === gi} data-testid={`group-${gi}`} onClick={() => setGroup(gi)} className={`inline-flex min-h-11 items-center rounded-full border px-3 text-sm ${group === gi ? "border-primary text-primary" : "border-border"}`}>
                {g.name}
              </button>
            ))}
          </div>
          <div role="radiogroup" aria-label={t.thenTitle} className="flex flex-col gap-2">
            {(groups[Math.min(group, groups.length - 1)]?.cards ?? []).map((c) => {
              const on = !choice.own && choice.then === c.text
              return (
                <button
                  key={c.id}
                  type="button"
                  role="radio"
                  aria-checked={on}
                  data-testid={`then-${c.id}`}
                  onClick={() => onChoice({ then: c.text, own: false, swapId: c.swap?.id ?? c.id })}
                  className={`flex min-h-11 flex-col items-start gap-1 rounded-md border px-3 py-2 text-left text-base ${on ? "border-primary bg-card" : "border-border bg-card"}`}
                >
                  <span>{c.text}</span>
                  {c.swap && <EvidenceChip evidence={c.swap.evidence} />}
                </button>
              )
            })}
          </div>
          {cardPicked?.swap && realRefs(cardPicked.swap.refs).length > 0 && (
            <div data-testid="picked-source">
              <SourceTap refs={realRefs(cardPicked.swap.refs)} />
            </div>
          )}
        </>
      )}
      <label className="flex flex-col gap-1 text-sm">
        {t.ownLabel}
        <input
          data-testid="own-then"
          value={choice.own ? choice.then : ""}
          maxLength={160}
          placeholder={t.ownPlaceholder}
          onChange={(e) => onChoice({ then: e.target.value, own: true, swapId: null })}
          className="min-h-11 rounded-md border border-border bg-card px-3 text-base"
        />
      </label>
      {choice.own && hasNegation(choice.then) && <Nudge addiction={id} testId="nudge" negation={EVIDENCE.negation} />}
      {i === 0 && (
        <>
          <EvidenceLine ev={EVIDENCE.list} addiction={id} testId="ev-list" />
          <EvidenceLine ev={EVIDENCE.format} addiction={id} testId="ev-format" />
        </>
      )}
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" data-testid="then-back" onClick={i === 0 ? onBack : () => onIdx(i - 1)} className={btn}>
          {i === 0 ? t.back : t.prev}
        </button>
        {!last && (
          <button type="button" data-testid="then-next" disabled={choice.then.trim() === ""} onClick={() => onIdx(i + 1)} className={`${primary} flex-1`}>
            {t.next}
          </button>
        )}
        {last && (
          <button type="button" data-testid="see-plan" disabled={!allDone} onClick={onFinish} className={`${primary} flex-1`}>
            {t.makePlan}
          </button>
        )}
      </div>
      {last && !allDone && <p className="text-sm text-muted-foreground">{choice.then.trim() === "" ? t.needThen : t.needAll}</p>}
    </section>
  )
}
