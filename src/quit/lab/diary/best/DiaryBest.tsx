"use client"

import { useEffect, useState } from "react"
import { getAddiction } from "../../../data"
import { EvidenceChip, SourceTap } from "../../../components/kit"
import { realRefs, usable } from "../../../tools/common"
import type { QuitAddictionId, QuitNeed, QuitOption, QuitResponse } from "../../../types"
import type { LabProps } from "../../registry"
import { Head, Tabs } from "../../progress/shared/Bits"
import { sharedText } from "../../progress/shared/text"
import { ContentComing } from "../../sos/best/Tools"
import { buildDeck, startCard, nextCard, prevCard, type Card as DeckCard } from "../../sos/best/logic"
import { labStore, useLabState } from "../../store"
import { splitFeelings } from "../../checkin/best/logic"
import { dayKey } from "../shared/logic"
import { atFromParts, parseEntries, remove, seedEntries, timeOf, upsert, validStrength, type DiaryEntry } from "./logic"
import { bestText as t } from "./text"
import { History, Patterns, type Pieces } from "./Views"

const SWITCH_IDS = ["nicotine", "alcohol", "weed", "porn"] as const satisfies readonly QuitAddictionId[]
const TOOL = "diary"
const VARIANT = "best"

const chip = (on: boolean) => `inline-flex min-h-11 items-center rounded-full border px-3 text-sm ${on ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card"}`

/** Improved Craving and slip diary: quick log, tip at once, history by day, patterns from his own entries. */
export function DiaryBest({ addiction: initial }: LabProps) {
  const [chosen, setChosen] = useLabState<string>(TOOL, VARIANT, "addiction", initial)
  const id: QuitAddictionId = (SWITCH_IDS as readonly string[]).includes(chosen) ? (chosen as QuitAddictionId) : "nicotine"
  return (
    <div data-testid="diary-best" className="flex flex-col gap-4">
      <div role="radiogroup" aria-label={t.addictionLabel} className="flex flex-wrap gap-2">
        {SWITCH_IDS.map((x) => (
          <button key={x} type="button" role="radio" aria-checked={id === x} data-testid={`switch-${x}`} onClick={() => setChosen(x)} className={chip(id === x)}>
            {t.addictions[x]}
          </button>
        ))}
      </div>
      <Gate keys={SWITCH_IDS.map((x) => `entries-${x}`)}>{(seeded) => <Body key={id} id={id} seeded={seeded} />}</Gate>
    </div>
  )
}

/** Opens with 20 labelled example entries; "Clear example" empties the diary, "Load example data" brings them back. */
function Gate({ keys, children }: { keys: string[]; children: (seeded: boolean) => React.ReactNode }) {
  const [mode, setMode] = useState<"example" | "own" | null>(null)
  useEffect(() => {
    setMode(labStore().get(TOOL, VARIANT, "mode") === "own" ? "own" : "example")
  }, [])
  if (!mode) return null
  const switchTo = (next: "example" | "own") => {
    for (const k of keys) labStore().set(TOOL, VARIANT, k, undefined)
    labStore().set(TOOL, VARIANT, "mode", next)
    setMode(next)
  }
  return (
    <>
      {mode === "example" && (
        <div data-testid="example-bar" className="flex items-center justify-between gap-2 rounded-md border border-dashed border-border px-3 py-1 text-xs text-muted-foreground">
          <span>{sharedText.exampleLabel}</span>
          <button type="button" data-testid="example-clear" onClick={() => switchTo("own")} className="inline-flex min-h-11 items-center underline">
            {sharedText.clearExample}
          </button>
        </div>
      )}
      <div key={mode}>{children(mode === "example")}</div>
      {mode === "own" && (
        <button type="button" data-testid="example-load" onClick={() => switchTo("example")} className="mt-6 inline-flex min-h-11 items-center text-sm text-muted-foreground underline">
          {t.exampleLoad}
        </button>
      )}
    </>
  )
}

type Screen = { kind: "home" } | { kind: "form"; entry: DiaryEntry | null; past: boolean } | { kind: "saved"; entry: DiaryEntry }

function Body({ id, seeded }: { id: QuitAddictionId; seeded: boolean }) {
  const data = getAddiction(id)
  const moments = usable<QuitOption[]>(data?.riskyMoments)
  const responses = usable<QuitResponse[]>(data?.responses)
  const deck = buildDeck(responses, usable<QuitNeed[]>(data?.needs))
  const words = (data?.symptomWords as Record<string, string> | undefined) ?? {}
  const feel = splitFeelings(data?.symptomWords as Record<string, string> | undefined)
  const [seed] = useState(() => (seeded ? seedEntries(Date.now(), { moments: moments ?? [], moves: deck, feelings: feel.hard.map(([k]) => k) }) : []))
  const [stored, setStored] = useLabState<DiaryEntry[]>(TOOL, VARIANT, `entries-${id}`, seed)
  const entries = parseEntries(stored)
  const [tab, setTab] = useState(0)
  const [screen, setScreen] = useState<Screen>({ kind: "home" })
  const pieces: Pieces = { id, moments, deck, words: Object.fromEntries(Object.entries(words)), hasResponses: deck.length > 0 }
  const home = () => setScreen({ kind: "home" })

  if (screen.kind === "form")
    return (
      <Form
        key={screen.entry?.id ?? "new"}
        id={id}
        entry={screen.entry}
        past={screen.past}
        pieces={pieces}
        feelings={[...feel.hard, ...feel.good]}
        onCancel={home}
        onSave={(e) => {
          setStored(upsert(entries, e))
          if (screen.entry) home()
          else setScreen({ kind: "saved", entry: e })
        }}
      />
    )
  if (screen.kind === "saved") return <Saved entry={screen.entry} pieces={pieces} onDone={home} />

  return (
    <div className="flex flex-col gap-3">
      <Head title={t.title} />
      <p className="text-sm text-muted-foreground">{t.line}</p>
      <button type="button" data-testid="log-now" onClick={() => setScreen({ kind: "form", entry: null, past: false })} className="min-h-12 rounded-md bg-primary px-4 text-primary-foreground">
        {t.logNow}
      </button>
      <button type="button" data-testid="log-past" onClick={() => setScreen({ kind: "form", entry: null, past: true })} className="min-h-11 rounded-md border border-border px-4 text-sm">
        {t.logPast}
      </button>
      <Tabs items={t.tabs} value={tab} onChange={setTab} id="dy-tab" />
      {tab === 0 ? (
        <History entries={entries} pieces={pieces} onEdit={(e) => setScreen({ kind: "form", entry: e, past: true })} onDelete={(eid) => setStored(remove(entries, eid))} />
      ) : (
        <Patterns entries={entries} pieces={pieces} />
      )}
    </div>
  )
}

function Form({
  id,
  entry,
  past,
  pieces,
  feelings,
  onCancel,
  onSave,
}: {
  id: QuitAddictionId
  entry: DiaryEntry | null
  past: boolean
  pieces: Pieces
  feelings: [string, string][]
  onCancel: () => void
  onSave: (e: DiaryEntry) => void
}) {
  const [strength, setStrength] = useState<number | null>(entry?.strength ?? null)
  const [situation, setSituation] = useState<string | null>(entry?.situation ?? null)
  const [picked, setPicked] = useState<string[]>(entry?.feelings ?? [])
  const [moves, setMoves] = useState<string[]>(entry?.moves ?? [])
  const [used, setUsed] = useState<boolean | null>(entry?.used ?? null)
  const [date, setDate] = useState(() => dayKey(entry?.at ?? Date.now()))
  const [time, setTime] = useState(() => timeOf(entry?.at ?? Date.now()))
  const toggle = (list: string[], v: string) => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v])
  const at = past ? atFromParts(date, time) : (entry?.at ?? Date.now())
  const future = past && (at === null || at > Date.now())
  const needSituation = pieces.moments !== null
  const ready = validStrength(strength) && (!needSituation || situation !== null) && !future
  const title = entry ? t.formTitleEdit : past ? t.formTitlePast : t.formTitleNew
  const save = () => {
    if (!ready || strength === null || at === null) return
    onSave({
      id: entry?.id ?? `e${Date.now().toString(36)}${Math.floor(Math.random() * 1e6).toString(36)}`,
      at,
      strength,
      situation,
      feelings: picked,
      moves,
      used,
    })
  }
  return (
    <section data-testid="diary-form" className="flex flex-col gap-4">
      <Head title={title} onBack={onCancel} />
      {past && (
        <fieldset className="flex flex-wrap gap-3">
          <legend className="mb-1 text-sm font-medium">{t.whenLabel}</legend>
          <label className="flex flex-col gap-1 text-sm">
            {t.dateLabel}
            <input type="date" data-testid="past-date" value={date} max={dayKey(Date.now())} onChange={(e) => setDate(e.target.value)} className="min-h-11 rounded-md border border-border bg-background px-2" />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            {t.timeLabel}
            <input type="time" data-testid="past-time" value={time} onChange={(e) => setTime(e.target.value)} className="min-h-11 rounded-md border border-border bg-background px-2" />
          </label>
          {future && (
            <p data-testid="future-line" className="w-full text-sm text-muted-foreground">
              {t.futureLine}
            </p>
          )}
        </fieldset>
      )}
      <div className="flex flex-col gap-2">
        <h3 className="text-sm font-medium">{t.strengthLabel}</h3>
        <p className="text-xs text-muted-foreground">{t.strengthHelp}</p>
        <div role="radiogroup" aria-label={t.strengthLabel} className="grid grid-cols-5 gap-2">
          {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
            <button
              key={n}
              type="button"
              role="radio"
              aria-checked={strength === n}
              aria-label={t.strengthItem(n)}
              data-testid={`strength-${n}`}
              onClick={() => setStrength(n)}
              className={`min-h-12 rounded-md border text-base ${strength === n ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card"}`}
            >
              {n}
            </button>
          ))}
        </div>
      </div>
      <div className="flex flex-col gap-2">
        <h3 className="text-sm font-medium">{t.situationLabel}</h3>
        {pieces.moments ? (
          <div role="radiogroup" aria-label={t.situationLabel} className="flex flex-wrap gap-2">
            {pieces.moments.map((m) => (
              <button key={m.id} type="button" role="radio" aria-checked={situation === m.id} data-testid={`situation-${m.id}`} onClick={() => setSituation(m.id)} className={chip(situation === m.id)}>
                {m.label}
              </button>
            ))}
          </div>
        ) : (
          <ContentComing />
        )}
      </div>
      <details data-testid="more" className="rounded-lg border border-border bg-card p-3">
        <summary className="flex min-h-11 cursor-pointer items-center text-sm">{t.moreSummary}</summary>
        <div className="mt-3 flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <h3 className="text-sm font-medium">{t.feelingsLabel}</h3>
            <div className="flex flex-wrap gap-2">
              {feelings.map(([k, label]) => (
                <button key={k} type="button" aria-pressed={picked.includes(k)} data-testid={`feeling-${k}`} onClick={() => setPicked(toggle(picked, k))} className={chip(picked.includes(k))}>
                  {label}
                </button>
              ))}
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <h3 className="text-sm font-medium">{t.movesLabel}</h3>
            {pieces.deck.length === 0 ? (
              <ContentComing />
            ) : (
              <div className="flex flex-wrap gap-2">
                {pieces.deck.map((c) => (
                  <button key={c.id} type="button" aria-pressed={moves.includes(c.id)} data-testid={`move-${c.id}`} onClick={() => setMoves(toggle(moves, c.id))} className={`${chip(moves.includes(c.id))} text-left`}>
                    {c.text}
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="flex flex-col gap-2">
            <h3 className="text-sm font-medium">{t.usedLabel(id)}</h3>
            <div role="radiogroup" aria-label={t.usedLabel(id)} className="flex gap-2">
              {([true, false] as const).map((v) => (
                <button key={String(v)} type="button" role="radio" aria-checked={used === v} data-testid={`used-${v ? "yes" : "no"}`} onClick={() => setUsed(used === v ? null : v)} className={`${chip(used === v)} flex-1 justify-center`}>
                  {v ? t.yes : t.no}
                </button>
              ))}
            </div>
          </div>
        </div>
      </details>
      <button type="button" data-testid="save-entry" disabled={!ready} onClick={save} className="min-h-12 rounded-md bg-primary px-4 text-primary-foreground disabled:opacity-40">
        {t.save}
      </button>
      <button type="button" data-testid="cancel-entry" onClick={onCancel} className="min-h-11 rounded-md border border-border px-4 text-sm">
        {t.cancel}
      </button>
    </section>
  )
}

/** After saving: the help card for the situation, straight from the data file, with its source when it has one. */
function Saved({ entry, pieces, onDone }: { entry: DiaryEntry; pieces: Pieces; onDone: () => void }) {
  const idx = pieces.moments?.findIndex((m) => m.id === entry.situation) ?? -1
  const deck = pieces.deck as DeckCard[]
  const [i, setI] = useState(() => (idx >= 0 ? startCard(idx, deck.length) : 0))
  const card = deck[i]
  return (
    <section data-testid="diary-saved" className="flex flex-col gap-3">
      <Head title={t.savedTitle} />
      <p className="text-sm text-muted-foreground">{t.savedLine}</p>
      <h3 className="font-medium">{t.tipTitle}</h3>
      {!card ? (
        <ContentComing />
      ) : (
        <div data-testid="tip-card" className="flex flex-col gap-2 rounded-lg border border-border bg-card p-4">
          <p className="text-xs text-muted-foreground">
            {t.tipOf} <span data-testid="tip-pos">{i + 1}</span> {t.tipOfTotal} {deck.length}
          </p>
          <p data-testid="tip-text" className="text-lg">
            {card.text}
          </p>
          {card.swap && (
            <div>
              <EvidenceChip evidence={card.swap.evidence} />
              <SourceTap refs={realRefs(card.swap.refs)} />
            </div>
          )}
          <div className="flex items-center justify-between">
            <button type="button" data-testid="tip-prev" aria-label={t.tipPrev} onClick={() => setI(prevCard(i, deck.length))} className="inline-flex size-12 items-center justify-center rounded-md border border-border text-2xl">
              {"‹"}
            </button>
            <button type="button" data-testid="tip-next" aria-label={t.tipNext} onClick={() => setI(nextCard(i, deck.length))} className="inline-flex size-12 items-center justify-center rounded-md border border-primary text-2xl text-primary">
              {"›"}
            </button>
          </div>
        </div>
      )}
      <button type="button" data-testid="saved-done" onClick={onDone} className="min-h-12 rounded-md bg-primary px-4 text-primary-foreground">
        {t.toDiary}
      </button>
    </section>
  )
}

