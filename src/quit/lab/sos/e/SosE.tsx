"use client"

import { useState } from "react"
import { NotSourced, Placeholder, PlaceholderScreen } from "../shared/Bits"
import { shares } from "../shared/clock"
import { useLabState } from "../../store"
import { bump, nextIndex, pieSlices } from "./pie"
import { eText } from "./text"

const COLORS = ["#c08040", "#8aa0b8", "#a0502c", "#cdbc44"]
const SUB_GLYPH = ["◔", "☰", "▭"]
const TAB_GLYPH = ["▲", "i", "✋", "⚙"]
const SOLUTION_CARDS = 2

/** Copy E: a situation list with a pie of your own taps and a sheet of solutions; plus a reasons card. */
export function SosE() {
  const [tab, setTab] = useState(2)
  const [sub, setSub] = useState(0)
  const [counts, setCounts] = useLabState<number[]>("sos", "e", "counts", [0, 0, 0, 0])
  const [open, setOpen] = useState<number | null>(null)
  const [card, setCard] = useState(0)

  const pct = shares(counts)
  const tap = (i: number) => {
    setCounts(bump(counts, i, 1))
    setCard(0)
    setOpen(i)
  }

  return (
    <div data-testid="sos-e" className="flex min-h-[calc(100dvh-8rem)] flex-col gap-4 rounded-lg bg-[#2b2b2b] p-3 text-[#f0e8e0]">
      <div className="flex justify-center gap-4">
        {SUB_GLYPH.map((g, i) => (
          <button
            key={g}
            type="button"
            data-testid={`sub-${i}`}
            aria-label={eText.subLabels[i]}
            aria-pressed={i === sub}
            onClick={() => setSub(i)}
            className={`inline-flex size-12 items-center justify-center rounded-lg border text-xl ${i === sub ? "border-orange-400 text-orange-400" : "border-white/15 text-white/50"}`}
          >
            {g}
          </button>
        ))}
      </div>

      <div className="flex-1">
        {tab === 2 && sub === 0 ? (
          <Cravings counts={counts} pct={pct} onTap={tap} />
        ) : tab === 0 && sub === 2 ? (
          <Reasons />
        ) : tab === 1 && sub === 2 ? (
          <Tips />
        ) : tab === 2 && sub === 1 ? (
          <Tasks />
        ) : (
          <PlaceholderScreen title={eText.otherTitle} onBack={null} />
        )}
      </div>

      <nav className="sticky bottom-0 z-10 grid grid-cols-4 border-t border-white/10 bg-[#2b2b2b]">
        {eText.tabs.map((label, i) => (
          <button
            key={label}
            type="button"
            data-testid={`tab-${i}`}
            onClick={() => {
              setTab(i)
              setSub(i === 2 ? 0 : 2)
            }}
            className={`flex min-h-12 flex-col items-center justify-center text-[11px] ${i === tab ? "text-orange-400" : "text-white/50"}`}
          >
            <span aria-hidden="true">{TAB_GLYPH[i]}</span>
            {label}
          </button>
        ))}
      </nav>

      {open !== null && (
        <div data-testid="sheet" role="dialog" aria-label={eText.situations[open]} className="fixed inset-x-0 bottom-0 top-1/4 z-30 flex flex-col gap-4 overflow-y-auto rounded-t-2xl border-t border-white/10 bg-[#2b2b2b] p-4 text-[#f0e8e0]">
          <button type="button" data-testid="sheet-close" onClick={() => setOpen(null)} aria-label={eText.closeSheet} className="inline-flex size-11 items-center justify-center self-start text-xl text-orange-400">
            {"✕"}
          </button>
          <div className="flex items-center gap-2 rounded-lg border border-white/10 p-2">
            <button type="button" data-testid="sheet-minus" aria-label={eText.less} onClick={() => setCounts(bump(counts, open, -1))} className="inline-flex size-11 items-center justify-center text-xl text-orange-400">
              {"−"}
            </button>
            <span data-testid="sheet-count" className="inline-flex min-w-8 justify-center rounded-md px-2 py-1 text-sm font-semibold text-black" style={{ background: COLORS[open] }}>
              {counts[open]}
            </span>
            <button type="button" data-testid="sheet-plus" aria-label={eText.more} onClick={() => setCounts(bump(counts, open, 1))} className="inline-flex size-11 items-center justify-center text-xl text-orange-400">
              {"+"}
            </button>
            <span className="flex-1 text-right text-sm">{eText.situations[open]}</span>
            <span data-testid="sheet-pct" className="rounded-md border border-white/15 px-2 py-1 text-xs">
              {pct[open]} %
            </span>
          </div>
          <div data-testid="solution" className="flex min-h-48 flex-col gap-3 rounded-lg border border-white/10 p-4">
            {open === 0 && card === 0 ? (
              <>
                <p className="text-base font-semibold">{eText.advice.title}</p>
                {eText.advice.body.map((p) => (
                  <p key={p} className="text-sm">
                    {p}
                  </p>
                ))}
              </>
            ) : (
              <Placeholder />
            )}
          </div>
          <button type="button" data-testid="sheet-next" aria-label={eText.nextSolution} onClick={() => setCard(nextIndex(card, SOLUTION_CARDS))} className="inline-flex size-12 items-center justify-center self-center text-3xl text-orange-400">
            {"›"}
          </button>
        </div>
      )}
    </div>
  )
}

function Cravings({ counts, pct, onTap }: { counts: number[]; pct: number[]; onTap: (i: number) => void }) {
  const slices = pieSlices(counts, 45)
  return (
    <div data-testid="cravings" className="flex flex-col gap-4">
      <div className="rounded-lg border border-white/10 p-3">
        <h2 className="text-right text-xl">{eText.cravingsTitle}</h2>
        <p className="mt-2 text-sm text-white/70">{eText.cravingsLine}</p>
      </div>
      <div className="flex justify-center rounded-lg border border-white/10 p-4">
        <svg viewBox="-50 -50 100 100" className="size-40" role="img" aria-label={eText.pieLabel} data-testid="pie">
          {slices.length === 0 ? (
            <circle r="45" fill="none" stroke="#ffffff33" strokeDasharray="3 3" data-testid="pie-empty" />
          ) : (
            slices.map((s) => <path key={s.index} d={s.path} fill={COLORS[s.index]} data-testid="pie-slice" stroke="#2b2b2b" strokeWidth="0.6" />)
          )}
        </svg>
      </div>
      <ul className="flex flex-col gap-3 rounded-lg border border-white/10 p-3">
        {eText.situations.map((label, i) => (
          <li key={label}>
            <button type="button" data-testid={`situation-${i}`} onClick={() => onTap(i)} className="flex min-h-14 w-full items-center gap-3 rounded-lg border border-white/10 px-3 text-left">
              <span data-testid={`badge-${i}`} className="inline-flex size-8 shrink-0 items-center justify-center rounded-md text-xs font-bold text-black" style={{ background: COLORS[i] }}>
                {counts[i]}
              </span>
              <span className="flex-1 text-center text-sm">{label}</span>
              <span data-testid={`chip-${i}`} className="rounded-md border border-white/15 px-2 py-1 text-xs">
                {pct[i]} %
              </span>
            </button>
          </li>
        ))}
        <li>
          <Placeholder />
        </li>
        <li>
          <Placeholder />
        </li>
      </ul>
    </div>
  )
}

function Reasons() {
  const [n, setN] = useState(1)
  return (
    <div data-testid="reasons" className="flex flex-col gap-4">
      <div className="rounded-lg border border-white/10 p-3">
        <h2 className="text-xl">{eText.reasonsTitle}</h2>
        <p className="mt-2 text-sm text-white/70">{eText.reasonsLine}</p>
      </div>
      <div className="flex flex-col items-center gap-4 rounded-lg border border-white/10 p-4">
        <Placeholder className="w-full" />
        <p data-testid="reason-count" className="text-xs text-white/60">
          {eText.reasonCount} {n}
        </p>
        <button type="button" data-testid="give-reason" onClick={() => setN((x) => x + 1)} className="min-h-11 px-4 text-orange-400 underline">
          {eText.giveReason}
        </button>
      </div>
    </div>
  )
}

function Tips() {
  return (
    <div data-testid="tips" className="flex flex-col gap-4">
      <div className="rounded-lg border border-white/10 p-3">
        <h2 className="text-right text-xl">{eText.tipsTitle}</h2>
        <p className="mt-2 text-sm text-white/70">{eText.tipsLine}</p>
      </div>
      <div className="flex flex-col gap-3 rounded-lg border border-white/10 p-3">
        <div className="flex items-start gap-3">
          <span className="flex size-14 shrink-0 flex-col items-center justify-center rounded-lg border border-white/15 text-xs">
            {eText.tipLabel}
            <span className="text-xl text-orange-400">{"1"}</span>
          </span>
          <h3 className="flex-1 text-right text-base">{eText.tipTitle}</h3>
        </div>
        <p className="text-sm">
          {eText.tipBodyBefore} <NotSourced />
          {eText.tipBodyAfter}
        </p>
        <p className="text-sm">{eText.tipBody2}</p>
      </div>
      <Placeholder />
    </div>
  )
}

function Tasks() {
  const [done, setDone] = useLabState<boolean>("sos", "e", "task1", false)
  return (
    <div data-testid="tasks" className="flex flex-col gap-4">
      <div className="rounded-lg border border-white/10 p-3">
        <h2 className="text-right text-xl">{eText.tasksTitle}</h2>
        <p className="mt-2 text-sm text-white/70">{eText.tasksLine}</p>
      </div>
      <div className="flex flex-col gap-3 rounded-lg border border-white/10 p-3">
        <div className="flex items-start gap-3">
          <span className="flex size-14 shrink-0 flex-col items-center justify-center rounded-lg border border-white/15 text-xs">
            {eText.dayLabel}
            <span className="text-xl text-orange-400">{"1"}</span>
          </span>
          <h3 className="flex-1 text-right text-base">{eText.taskTitle}</h3>
        </div>
        {eText.taskBody.map((p) => (
          <p key={p} className="text-sm">
            {p}
          </p>
        ))}
        <button type="button" data-testid="task-tick" aria-pressed={done} aria-label={eText.taskDone} onClick={() => setDone(!done)} className={`inline-flex size-12 items-center justify-center self-center rounded-lg border text-xl ${done ? "border-orange-400 bg-orange-400/20 text-orange-400" : "border-white/15 text-white/40"}`}>
          {"✓"}
        </button>
      </div>
      <Placeholder />
    </div>
  )
}
