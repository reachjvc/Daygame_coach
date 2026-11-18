"use client"

import { useEffect, useState } from "react"
import { PrimaryButton } from "../../../components/kit"
import { BottomNav, ExampleBar, InferredTag, Placeholder } from "../../progress/shared/Bits"
import { DAY } from "../../progress/shared/calc"
import { useNow } from "../../progress/shared/clock"
import { useLabState } from "../../store"
import { NumInput } from "../shared/NumInput"
import { cascade, fmtMoney2, fromLocalInput, toLocalInput } from "../shared/logic"
import { costText } from "../shared/text"
import { EMPTY_GOALS, EMPTY_SETUP, cigsNotSmoked, daysSince, moneySaved, type BSetup, type Goal } from "./logic"
import { bText } from "./text"

/** Copy B: the money counter, three savings goals that fill in order, and the price setup. */
export function CostB() {
  const [setup, setSetup] = useLabState<BSetup>("cost", "b", "setup", EMPTY_SETUP)
  const [goals, setGoals] = useLabState<Goal[]>("cost", "b", "goals", EMPTY_GOALS)
  const [nav, setNav] = useState(0)
  const [sub, setSub] = useState(2)
  const [topOther, setTopOther] = useState(false)
  const [showFormula, setShowFormula] = useState(false)
  const [showCascade, setShowCascade] = useState(false)
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])
  const now = useNow(1000)
  if (!mounted) return null

  const cigs = cigsNotSmoked(setup, now)
  const money = moneySaved(setup, now)
  const shares = cascade(
    money,
    goals.map((g) => g.price ?? 0),
  )
  const edit = (i: number, next: Goal) => setGoals(goals.map((g, j) => (j === i ? next : g)))
  const seed = () => {
    setSetup({ startMs: Date.now() - 14.5 * DAY, cigsPerDay: 20, packSize: 20, packPrice: 9, ex: 1 })
    setGoals([
      { name: bText.exampleGoals[0], price: 60 },
      { name: bText.exampleGoals[1], price: 900 },
      { name: "", price: null },
    ])
  }
  const clearExample = () => {
    setSetup(EMPTY_SETUP)
    setGoals(EMPTY_GOALS)
  }
  const perPack = setup.packPrice ?? 0
  const packSize = setup.packSize ?? 0

  return (
    <div data-testid="cost-b" data-screen={["home", "info", sub === 2 ? "goals" : "sub-other", "setup"][nav]}>
      {setup.ex === 1 && <ExampleBar onClear={clearExample} />}

      {nav === 0 && (
        <section data-testid="b-home" className="flex flex-col gap-3">
          <div className="grid grid-cols-3 gap-2">
            {bText.topIcons.map((label, i) => (
              <button key={label} type="button" data-testid={`b-top-${i}`} aria-label={label} onClick={() => setTopOther(!topOther)} className="min-h-12 rounded-lg border border-border bg-card text-lg">
                {["◔", "★", "▤"][i]}
              </button>
            ))}
          </div>
          {topOther ? (
            <div data-testid="b-top-other" className="flex min-h-11 items-center justify-center rounded-md border border-dashed border-border px-3 py-3 text-center text-sm text-muted-foreground">
              {costText.otherTool}
            </div>
          ) : (
            <div className="flex flex-col items-center gap-4 rounded-lg border border-border bg-card p-5 text-center">
              <div>
                <p className="text-sm text-muted-foreground">{bText.smokeFreeFor}</p>
                <p data-testid="b-days" className="text-2xl font-semibold">
                  {daysSince(setup, now)} {bText.days}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{bText.cigarettes}</p>
                <p data-testid="b-cigs" className="text-2xl font-semibold">
                  {cigs}
                </p>
                <p className="text-sm text-muted-foreground">{bText.notSmoked}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{bText.moneySaved}</p>
                <p data-testid="b-money" data-value={money} className="text-4xl font-bold text-primary">
                  {fmtMoney2(money)}
                </p>
              </div>
            </div>
          )}
          {packSize > 0 ? (
            <div>
              <button type="button" data-testid="b-formula-toggle" onClick={() => setShowFormula(!showFormula)} className="inline-flex min-h-11 items-center text-sm underline">
                {showFormula ? costText.formulaHide : costText.formulaToggle}
              </button>
              {showFormula && (
                <p data-testid="b-formula" className="rounded-md border border-border bg-card p-2 text-sm">
                  {bText.formula(cigs, fmtMoney2(perPack), packSize, fmtMoney2(money))} {bText.roundNote}
                </p>
              )}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">{bText.emptyHint}</p>
          )}
        </section>
      )}

      {nav === 1 && (
        <div data-testid="b-info" className="flex min-h-11 items-center justify-center rounded-md border border-dashed border-border px-3 py-3 text-center text-sm text-muted-foreground">
          {costText.otherTool}
        </div>
      )}

      {nav === 2 && (
        <section data-testid="b-participation" className="flex flex-col gap-3">
          <div className="grid grid-cols-3 gap-2">
            {bText.subIcons.map((label, i) => (
              <button
                key={label}
                type="button"
                data-testid={`b-sub-${i}`}
                aria-label={label}
                aria-pressed={sub === i}
                onClick={() => setSub(i)}
                className={`min-h-12 rounded-lg border text-lg ${sub === i ? "border-primary bg-card text-primary" : "border-border bg-card text-muted-foreground"}`}
              >
                {["◔", "⇅", "▣"][i]}
              </button>
            ))}
          </div>
          {sub !== 2 ? (
            <div data-testid="b-sub-other" className="flex min-h-11 items-center justify-center rounded-md border border-dashed border-border px-3 py-3 text-center text-sm text-muted-foreground">
              {costText.otherTool}
            </div>
          ) : (
            <>
              <div className="rounded-lg border border-border bg-card p-3">
                <h2 className="text-right text-xl font-semibold">{bText.goalsTitle}</h2>
                <p className="mt-2 text-sm text-muted-foreground">{bText.goalsLine}</p>
              </div>
              {goals.map((g, i) => (
                <div key={i} data-testid={`b-goal-${i}`} data-pct={shares[i].pct ?? ""} className="flex flex-col gap-2 rounded-lg border border-border bg-card p-3">
                  <div className="flex justify-end">
                    <span className="inline-flex size-9 items-center justify-center rounded-lg border border-border text-sm">#{i + 1}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="h-2 min-w-0 flex-1 overflow-hidden rounded-full bg-border">
                      <div data-testid={`b-bar-${i}`} className="h-full rounded-full bg-primary" style={{ width: `${shares[i].pct ?? 0}%` }} />
                    </div>
                    <span data-testid={`b-pct-${i}`} className="w-12 shrink-0 text-right text-sm">
                      {shares[i].pct === null ? "" : `${shares[i].pct}%`}
                    </span>
                  </div>
                  {shares[i].pct === 100 && (
                    <div data-testid={`b-reached-${i}`} className="flex items-center gap-2">
                      <InferredTag />
                      <Placeholder className="flex-1" />
                    </div>
                  )}
                  <div className="flex gap-2">
                    <input
                      data-testid={`b-name-${i}`}
                      aria-label={bText.goalName(i + 1)}
                      placeholder={bText.goalPlaceholder}
                      value={g.name}
                      onChange={(e) => edit(i, { ...g, name: e.target.value })}
                      className="min-h-11 min-w-0 flex-1 rounded-md border border-border bg-background px-2"
                    />
                    <div className="flex w-28 shrink-0 items-center gap-1 rounded-md border border-border bg-background pl-2">
                      <span>{"$"}</span>
                      <NumInput value={g.price} onChange={(n) => edit(i, { ...g, price: n })} testId={`b-price-${i}`} label={bText.goalPrice(i + 1)} placeholder={bText.pricePlaceholder} className="w-full border-0" />
                    </div>
                  </div>
                </div>
              ))}
              {money > 0 && goals.some((g) => (g.price ?? 0) > 0) && (
                <div>
                  <button type="button" data-testid="b-cascade-toggle" onClick={() => setShowCascade(!showCascade)} className="inline-flex min-h-11 items-center text-sm underline">
                    {showCascade ? costText.formulaHide : costText.formulaToggle}
                  </button>
                  {showCascade && (
                    <p data-testid="b-cascade" className="rounded-md border border-border bg-card p-2 text-sm">
                      {bText.cascadeFormula(
                        fmtMoney2(money),
                        goals.flatMap((g, i) => (shares[i].pct === null ? [] : [bText.cascadePart(i + 1, fmtMoney2(shares[i].funded), fmtMoney2(g.price ?? 0), shares[i].pct ?? 0)])),
                      )}{" "}
                      {bText.roundNote}
                    </p>
                  )}
                </div>
              )}
            </>
          )}
        </section>
      )}

      {nav === 3 && (
        <section data-testid="b-settings" className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <h2 className="flex-1 text-lg font-semibold">{bText.settingsTitle}</h2>
            <InferredTag />
          </div>
          <label className="flex min-h-11 items-center justify-between gap-3 text-sm">
            <span>{bText.fStart}</span>
            <input
              type="datetime-local"
              data-testid="b-set-start"
              value={setup.startMs === null ? "" : toLocalInput(setup.startMs)}
              max={toLocalInput(now)}
              onChange={(e) => {
                const t = fromLocalInput(e.target.value)
                if (Number.isFinite(t)) setSetup({ ...setup, startMs: t, ex: 0 })
              }}
              className="min-h-11 rounded-md border border-border bg-background px-2"
            />
          </label>
          <label className="flex min-h-11 items-center justify-between gap-3 text-sm">
            <span>{bText.fCigs}</span>
            <NumInput value={setup.cigsPerDay} onChange={(n) => setSetup({ ...setup, cigsPerDay: n, ex: 0 })} testId="b-set-cigs" label={bText.fCigs} className="w-28" />
          </label>
          <label className="flex min-h-11 items-center justify-between gap-3 text-sm">
            <span>{bText.fPack}</span>
            <NumInput value={setup.packSize} onChange={(n) => setSetup({ ...setup, packSize: n, ex: 0 })} testId="b-set-pack" min={1} label={bText.fPack} className="w-28" />
          </label>
          <label className="flex min-h-11 items-center justify-between gap-3 text-sm">
            <span>{bText.fPrice}</span>
            <NumInput value={setup.packPrice} onChange={(n) => setSetup({ ...setup, packPrice: n, ex: 0 })} testId="b-set-price" step={0.5} label={bText.fPrice} className="w-28" />
          </label>
          <div className="flex items-center gap-2">
            <div className="flex-1">
              <PrimaryButton testId="b-seed" onClick={seed}>
                {costText.useExample}
              </PrimaryButton>
            </div>
            <InferredTag />
          </div>
        </section>
      )}

      <div className="[&_nav]:static">
        <BottomNav items={bText.nav} value={nav} onChange={setNav} id="b-nav" />
      </div>
    </div>
  )
}
