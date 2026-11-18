"use client"

import { useState } from "react"
import { InferredTag, NotSourced, Placeholder, Tabs } from "../../progress/shared/Bits"
import { sharedText } from "../../progress/shared/text"
import { useLabState } from "../../store"
import { ibText } from "./text"

const toggle = (list: string[], id: string) => (list.includes(id) ? list.filter((x) => x !== id) : [...list, id])
const RING_COLORS = ["#e8603c", "#e8b923", "#14b8a6"]
const RING_RADII = [13, 24, 36]

function Rings({ index }: { index: number }) {
  return (
    <svg viewBox="0 0 100 100" className="mx-auto size-32" aria-hidden="true" data-testid={`b-ring-${index}`}>
      {[44, 30, 16].map((r) => (
        <circle key={r} cx="50" cy="50" r={r} fill="none" strokeWidth="1" className="stroke-border" />
      ))}
      <circle cx="50" cy="50" r={RING_RADII[index]} fill="none" strokeWidth="5" stroke={RING_COLORS[index]} />
    </svg>
  )
}

function Lighthouse() {
  return (
    <svg viewBox="0 0 200 70" className="h-16 w-full" aria-hidden="true">
      <path d="M0 62h200" className="stroke-border" fill="none" strokeWidth="1" />
      <path d="M90 62l5-30h10l5 30z" className="fill-muted stroke-border" strokeWidth="1" />
      <path d="M94 32v-8h12v8M97 24l3-6 3 6" className="stroke-border" fill="none" strokeWidth="1" />
      <path d="M10 56c10-10 20-10 30 0M150 50c10-8 22-8 34 2" className="stroke-border" fill="none" strokeWidth="1" />
    </svg>
  )
}

/** Copy B: three circle cards, the boundaries survey, and the feeling chips of the slip analysis. Nothing beyond these three seen screens. */
export function IfthenB() {
  const [screen, setScreen] = useState(0)
  return (
    <div data-testid="ifthen-b" data-screen={screen} className="pb-6">
      <div className="mb-3">
        <Tabs id="b-screen" items={ibText.screens} value={screen} onChange={setScreen} />
      </div>
      {screen === 0 ? <Circles /> : screen === 1 ? <Survey onBack={() => setScreen(0)} /> : <Analyze onBack={() => setScreen(1)} onClose={() => setScreen(0)} />}
    </div>
  )
}

function Circles() {
  const tilt = ["-rotate-2", "rotate-1", "-rotate-1"]
  return (
    <section data-testid="b-circles" className="flex flex-col gap-4 overflow-hidden px-3 py-3">
      {ibText.circles.map((c, i) => (
        <div key={c.name} data-testid={`b-card-${i}`} className={`rounded-2xl border border-border bg-card p-4 ${tilt[i]}`}>
          <Rings index={i} />
          <div className="mt-2 text-xs text-muted-foreground">{c.label}</div>
          <div className="text-lg font-bold">{c.name}</div>
          {i === 2 && (
            <div data-testid="b-habit-tile" className="mt-3 flex flex-col gap-1 rounded-lg border border-teal-500 p-3 text-sm">
              <span className="font-semibold">{ibText.habitLabel}</span>
              <span className="flex flex-wrap items-center gap-2">
                <NotSourced />
                <span className="text-muted-foreground">{ibText.habitOf}</span>
              </span>
              <Placeholder />
            </div>
          )}
        </div>
      ))}
    </section>
  )
}

function Survey({ onBack }: { onBack: () => void }) {
  const [ratings, setRatings] = useLabState<Record<string, number>>("ifthen", "b", "ratings", {})
  return (
    <section data-testid="b-survey" className="flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <button type="button" data-testid="b-back" aria-label={ibText.back} onClick={onBack} className="inline-flex size-11 items-center justify-center text-xl">
          {"‹"}
        </button>
        <span className="inline-flex min-h-11 items-center gap-2 rounded-full bg-yellow-500 px-4 text-sm font-semibold text-black">
          <span aria-hidden="true">{"◎"}</span>
          {ibText.surveyPill}
        </span>
      </div>
      <Lighthouse />
      <h2 className="text-center font-serif text-2xl font-bold">{ibText.surveyTitle}</h2>
      {ibText.statements.map((s, i) => (
        <div key={s} data-testid={`b-q-${i}`} className="flex flex-col gap-2">
          <p className="font-semibold">
            {i + 1}. {s}
          </p>
          <div role="radiogroup" aria-label={`${ibText.rate} ${i + 1}`} className="grid grid-cols-5 gap-1.5">
            {[1, 2, 3, 4, 5].map((n) => (
              <button key={n} type="button" role="radio" aria-checked={ratings[i] === n} data-testid={`b-q-${i}-${n}`} onClick={() => setRatings({ ...ratings, [i]: n })} className={`min-h-12 rounded-md text-base ${ratings[i] === n ? "bg-teal-500 font-semibold text-black" : "bg-muted"}`}>
                {n}
              </button>
            ))}
          </div>
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{ibText.never}</span>
            <span>{ibText.always}</span>
          </div>
        </div>
      ))}
      <Placeholder />
    </section>
  )
}

function Analyze({ onBack, onClose }: { onBack: () => void; onClose: () => void }) {
  const [picked, setPicked] = useLabState<string[]>("ifthen", "b", "chips", [])
  const [custom, setCustom] = useLabState<string[]>("ifthen", "b", "customChips", [])
  const [level, setLevel] = useLabState<number | null>("ifthen", "b", "resilience", null)
  const [adding, setAdding] = useState(false)
  const [draft, setDraft] = useState("")
  const addCustom = () => {
    const v = draft.trim()
    if (v && ![...ibText.chips, ...custom].includes(v)) {
      setCustom([...custom, v])
      setPicked([...picked, v])
    }
    setDraft("")
    setAdding(false)
  }
  return (
    <section data-testid="b-analyze" className="flex flex-col gap-4 rounded-xl bg-teal-950 p-4 text-teal-50">
      <div className="flex items-center gap-2">
        <button type="button" data-testid="b-an-back" aria-label={ibText.back} onClick={onBack} className="inline-flex size-11 shrink-0 items-center justify-center text-xl text-teal-300">
          {"‹"}
        </button>
        <div data-testid="b-progress" data-active="1" className="grid flex-1 grid-cols-3 gap-1.5" aria-hidden="true">
          {[0, 1, 2].map((i) => (
            <span key={i} className={`h-0.5 rounded-full ${i === 1 ? "bg-white" : "bg-teal-500"}`} />
          ))}
        </div>
        <button type="button" data-testid="b-an-close" aria-label={ibText.close} onClick={onClose} className="inline-flex size-11 shrink-0 items-center justify-center text-xl text-teal-300">
          {"✕"}
        </button>
      </div>
      <div className="text-center text-sm">{ibText.analyzeLabel}</div>
      <h2 className="text-lg font-bold">{ibText.analyzeTitle}</h2>
      <p className="text-sm text-teal-100">{ibText.analyzeText}</p>
      <div role="group" aria-label={ibText.analyzeTitle} className="flex flex-wrap items-center gap-2">
        {[...ibText.chips, ...custom].map((c, i) => {
          const on = picked.includes(c)
          return (
            <button key={c} type="button" role="checkbox" aria-checked={on} data-testid={`b-chip-${i}`} onClick={() => setPicked(toggle(picked, c))} className={`rounded-full ${on ? "min-h-14 bg-emerald-100 px-6 text-xl text-teal-900" : "min-h-11 bg-teal-800 px-4 text-sm"}`}>
              {c}
            </button>
          )
        })}
        <button type="button" data-testid="b-chip-add" aria-label={ibText.addChip} onClick={() => setAdding(!adding)} className="inline-flex size-11 items-center justify-center rounded-full bg-teal-800 text-lg">
          {"+"}
        </button>
      </div>
      {adding && (
        <div className="flex items-center gap-2">
          <input data-testid="b-chip-input" aria-label={ibText.addChipField} value={draft} onChange={(e) => setDraft(e.target.value)} className="min-h-11 min-w-0 flex-1 rounded-md border border-teal-700 bg-teal-900 px-2" />
          <button type="button" data-testid="b-chip-input-add" onClick={addCustom} className="min-h-11 rounded-md bg-emerald-100 px-3 text-teal-900">
            {ibText.addChipDone}
          </button>
          <InferredTag />
        </div>
      )}
      <div data-testid="b-resilience" className="flex flex-col gap-2 rounded-xl bg-card p-4 text-foreground">
        <div data-testid="b-resilience-word" className="text-center font-semibold">
          {level === null ? ibText.resilient : <span className="text-sm font-normal text-muted-foreground">{sharedText.notSeen}</span>}
        </div>
        <input type="range" min={0} max={100} data-testid="b-slider" aria-label={ibText.slider} value={level ?? 50} onChange={(e) => setLevel(Number(e.target.value))} className="min-h-11 w-full accent-teal-500" />
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>{ibText.hopeless}</span>
          <span>{ibText.resilientEnd}</span>
        </div>
      </div>
    </section>
  )
}
