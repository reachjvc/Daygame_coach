"use client"

import { useEffect, useState } from "react"
import { BottomNav, ExampleBar, InferredTag, Placeholder, Tabs } from "../../progress/shared/Bits"
import { pieSlices } from "../../sos/e/pie"
import { useLabState } from "../../store"
import { pct, sum } from "../shared/logic"
import { dyText } from "../shared/text"
import { bText } from "./text"

const COLORS = ["#c08349", "#8aa0b8", "#a0522d", "#cdbb45"]
interface State {
  counts: number[]
  ex: boolean
}
const SEED: State = { counts: [6, 4, 3, 3], ex: true }

/** Copy B: the log and the chart are one screen; tapping a situation counts it and opens a tip. */
export function DiaryB() {
  const [stored, setStored] = useLabState<State>("diary", "b", "counts", SEED)
  const [nav, setNav] = useState(2)
  const [sub, setSub] = useState(0)
  const [sheet, setSheet] = useState<number | null>(null)
  const [tip, setTip] = useState(0)
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])
  if (!mounted) return null
  const { counts } = stored
  const total = sum(counts.map((count) => ({ count })))
  const set = (next: number[]) => setStored({ counts: next, ex: stored.ex })
  const bump = (i: number, by: number) => set(counts.map((c, j) => (j === i ? Math.max(0, c + by) : c)))
  const openSheet = (i: number) => {
    bump(i, 1)
    setTip(0)
    setSheet(i)
  }
  const slices = pieSlices(counts, 70)

  return (
    <div data-testid="diary-b" data-screen={sheet === null ? "cravings" : "sheet"}>
      {stored.ex && <ExampleBar onClear={() => setStored({ counts: [0, 0, 0, 0], ex: false })} />}
      {nav !== 2 ? (
        <div data-testid="b-other-nav" className="flex min-h-11 items-center justify-center rounded-md border border-dashed border-border px-3 py-3 text-center text-sm text-muted-foreground">
          {dyText.otherTool}
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          <Tabs items={bText.subTabs} value={sub} onChange={setSub} id="b-sub" />
          {sub !== 0 ? (
            <div data-testid="b-other-sub" className="flex min-h-11 items-center justify-center rounded-md border border-dashed border-border px-3 py-3 text-center text-sm text-muted-foreground">
              {dyText.otherTool}
            </div>
          ) : (
            <>
              <section className="rounded-lg border border-border bg-card p-3">
                <h2 className="text-right text-xl font-semibold">{bText.title}</h2>
                <p className="mt-2 text-sm text-muted-foreground">{bText.intro}</p>
              </section>
              <section className="flex justify-center rounded-lg border border-border bg-card p-4" data-testid="b-pie" data-total={total}>
                <svg viewBox="-80 -80 160 160" className="size-44" role="img" aria-label={bText.chartLabel}>
                  {total === 0 && <circle r={70} fill="none" strokeWidth={2} className="stroke-border" />}
                  {slices.map((s) => (
                    <path key={s.index} d={s.path} fill={COLORS[s.index]} stroke="#1f1f1f" strokeWidth={1} data-testid={`b-slice-${s.index}`} />
                  ))}
                </svg>
              </section>
              <section className="flex flex-col gap-2 rounded-lg border border-border bg-card p-3" data-testid="b-list">
                {[...counts.keys()]
                  .sort((a, b) => counts[b] - counts[a] || a - b)
                  .map((i) => (
                    <button key={i} type="button" data-testid={`b-row-${i}`} data-count={counts[i]} onClick={() => openSheet(i)} className="flex min-h-14 w-full items-center gap-2 rounded-lg border border-border bg-background px-2 text-left">
                      <span data-testid={`b-count-${i}`} className="inline-flex size-9 shrink-0 items-center justify-center rounded-lg text-sm font-bold text-black" style={{ background: COLORS[i] }}>
                        {counts[i]}
                      </span>
                      <span className="min-w-0 flex-1 text-center text-sm">{bText.situations[i]}</span>
                      <span data-testid={`b-pct-${i}`} className="inline-flex h-9 min-w-12 shrink-0 items-center justify-center rounded-lg border border-border px-1.5 text-xs font-semibold">
                        {pct(counts[i], total)}%
                      </span>
                    </button>
                  ))}
                <Placeholder />
                <Placeholder />
              </section>
            </>
          )}
        </div>
      )}
      <div className="[&_nav]:static">
        <BottomNav items={bText.navItems} value={nav} onChange={setNav} id="b-nav" />
      </div>

      {sheet !== null && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end bg-black/60" data-testid="b-sheet">
          <div className="max-h-[80dvh] overflow-y-auto rounded-t-2xl border-t border-border bg-background p-3">
            <button type="button" data-testid="b-sheet-close" aria-label={bText.close} onClick={() => setSheet(null)} className="inline-flex size-11 items-center justify-center text-lg text-primary">
              {"✕"}
            </button>
            <div className="mt-1 flex items-center gap-2 rounded-lg border border-border bg-card p-2">
              <button type="button" data-testid="b-minus" aria-label={bText.minus} onClick={() => bump(sheet, -1)} className="inline-flex size-11 shrink-0 items-center justify-center text-xl">
                {"−"}
              </button>
              <span data-testid="b-sheet-count" className="inline-flex size-9 shrink-0 items-center justify-center rounded-lg text-sm font-bold text-black" style={{ background: COLORS[sheet] }}>
                {counts[sheet]}
              </span>
              <button type="button" data-testid="b-plus" aria-label={bText.plus} onClick={() => bump(sheet, 1)} className="inline-flex size-11 shrink-0 items-center justify-center text-xl">
                {"+"}
              </button>
              <span className="min-w-0 flex-1 text-right text-sm">{bText.situations[sheet]}</span>
              <span data-testid="b-sheet-pct" className="inline-flex h-9 min-w-12 shrink-0 items-center justify-center rounded-lg border border-border px-1.5 text-xs font-semibold">
                {pct(counts[sheet], total)}%
              </span>
            </div>
            <div data-testid="b-tip" data-tip={tip} className="mt-3 flex min-h-48 flex-col gap-3 rounded-lg border border-border bg-card p-3">
              {tip === 0 && sheet === 0 ? (
                <>
                  <p className="font-medium">{bText.tipTitle}</p>
                  <p className="text-sm">{bText.tipOne}</p>
                  <p className="text-sm">{bText.tipTwo}</p>
                </>
              ) : (
                <>
                  {tip !== 0 && (
                    <div>
                      <InferredTag />
                    </div>
                  )}
                  <Placeholder />
                </>
              )}
            </div>
            <div className="mt-2 flex justify-center">
              <button type="button" data-testid="b-next-tip" aria-label={bText.next} onClick={() => setTip((t) => (t + 1) % 2)} className="inline-flex size-11 items-center justify-center text-2xl text-primary">
                {"›"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
