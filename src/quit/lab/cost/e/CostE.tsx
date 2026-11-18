"use client"

import { useEffect, useRef, useState } from "react"
import { PrimaryButton } from "../../../components/kit"
import { Card, ExampleBar, Head, InferredTag, NotSourced, Placeholder, PlaceholderScreen, Ring, Tabs } from "../../progress/shared/Bits"
import { DAY, splitElapsed } from "../../progress/shared/calc"
import { useNow } from "../../progress/shared/clock"
import { useLabState } from "../../store"
import { NumInput } from "../shared/NumInput"
import { fmtMoney2, fmtMoneyShort, fromLocalInput, toLocalInput } from "../shared/logic"
import { costText } from "../shared/text"
import { Arc270, Flame, SavingsChart, useCountUp } from "./parts"
import { FIELDS, TAB_IDS, countdown, dailyCost, goalPct, perMonth, perTenYears, perYear, reachTime, savedOver, savedSoFar, unitsNot, type TabId, type Values } from "./logic"
import { eText } from "./text"

interface EState {
  screen: number
  tab: number
  cur: number
  vals: Record<TabId, Values>
  vapeKind: number
  buy: (number | null)[]
  inflOn: boolean
  rate: number | null
  start: number | null
  goal: { name: string; price: number | null }
  ex: number
}

const EMPTY: EState = {
  screen: 0,
  tab: 0,
  cur: 1,
  vals: { cigarettes: {}, vaping: {}, tobacco: {}, snus: {}, shisha: {} },
  vapeKind: 1,
  buy: [null, null, null, null],
  inflOn: false,
  rate: null,
  start: null,
  goal: { name: "", price: null },
  ex: 0,
}

type Sub = "home" | "goal" | "edit" | "setup"

/** Copy E: the public cost calculator (five product tabs, results, buy-instead, 20-year chart) and the app's savings card and goal ring. */
export function CostE() {
  const [st, setSt] = useLabState<EState>("cost", "e", "state", EMPTY)
  const [sub, setSub] = useState<Sub>("home")
  const [cheer, setCheer] = useState(false)
  const [formula, setFormula] = useState(false)
  const [info, setInfo] = useState<"life" | "total" | null>(null)
  const [mounted, setMounted] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(() => setMounted(true), [])
  const now = useNow(1000)

  const tabId = TAB_IDS[st.tab]
  const vals = st.vals[tabId]
  const daily = dailyCost(tabId, vals)
  const month = perMonth(daily)
  const year = perYear(daily)
  const shownMonth = useCountUp(month)
  if (!mounted) return null

  const sym = eText.symbols[st.cur]
  const touch = () => {
    setCheer(true)
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => setCheer(false), 900)
  }
  const patch = (p: Partial<EState>) => setSt({ ...st, ...p })
  const setVal = (key: string, n: number) => {
    touch()
    patch({ vals: { ...st.vals, [tabId]: { ...vals, [key]: n } }, ex: 0 })
  }
  const fillExample = () =>
    setSt({ ...EMPTY, screen: st.screen, tab: 0, vals: { ...EMPTY.vals, cigarettes: { perDay: 15, price: 9, pack: 20 } }, start: Date.now() - 40 * DAY, goal: { name: eText.exampleGoal, price: 900 }, ex: 1 })
  const clearExample = () => setSt({ ...EMPTY, screen: st.screen })

  const rate = st.inflOn ? (st.rate ?? 0) / 100 : 0
  const money = (n: number) => fmtMoneyShort(n, sym)
  const fields = FIELDS[tabId]
  const labels = eText.fields[tabId]
  const showFields = !(tabId === "vaping" && st.vapeKind === 0)
  const fmt = (k: string) => (vals[k] == null ? "0" : String(vals[k]))
  const dailyText = fmtMoney2(daily, sym)

  const formulaLine = (): string => {
    switch (tabId) {
      case "cigarettes":
        return eText.formulas.cigarettes(fmt("perDay"), fmt("price"), vals.pack == null ? "?" : fmt("pack"), dailyText)
      case "vaping":
        return eText.formulas.vaping(fmt("liquid"), fmt("pods"), dailyText)
      case "tobacco":
        return eText.formulas.tobacco(fmt("pouches"), fmt("price"), dailyText)
      case "snus":
        return eText.formulas.snus(fmt("cans"), fmt("price"), dailyText)
      case "shisha":
        return eText.formulas.shisha(fmt("sessions"), fmt("cost"), dailyText)
    }
  }

  // ---- app side ----
  const cigDaily = dailyCost("cigarettes", st.vals.cigarettes)
  const saved = savedSoFar(cigDaily, st.start, now)
  const pct = goalPct(saved, st.goal.price)
  const left = st.goal.price && st.goal.price > 0 ? Math.max(0, st.goal.price - saved) : 0
  const cd = countdown(saved, st.goal.price, cigDaily)
  const sf = splitElapsed(st.start === null ? 0 : now - st.start)
  const cigsNot = st.start === null ? 0 : Math.floor(((now - st.start) / DAY) * (st.vals.cigarettes.perDay ?? 0))

  const screenName = st.screen === 0 ? "calc" : sub

  return (
    <div data-testid="cost-e" data-screen={screenName}>
      {st.ex === 1 && <ExampleBar onClear={clearExample} />}
      <div className="mb-3">
        <Tabs items={eText.screens} value={st.screen} onChange={(i) => patch({ screen: i })} id="e-screen" />
      </div>

      {st.screen === 0 && (
        <div className="flex flex-col gap-4">
          <section className="flex flex-col gap-2">
            <span className="self-start rounded-full bg-foreground px-3 py-1 text-xs font-semibold text-background">{eText.badge}</span>
            <h2 className="text-2xl font-extrabold uppercase leading-tight">{eText.headline}</h2>
            <p className="text-sm text-muted-foreground">{eText.intro}</p>
            <div className="flex justify-center">
              <Flame figure={money(month)} cheer={cheer} />
            </div>
          </section>

          <section className="flex flex-col gap-3 rounded-xl border border-border bg-card p-3" data-testid="e-card">
            <Tabs items={eText.tabs} value={st.tab} onChange={(i) => patch({ tab: i })} id="e-tab" scroll />
            <div className="rounded-lg bg-foreground p-4 text-background">
              <p className="text-xs uppercase tracking-wide">{eText.perMonth}</p>
              <p data-testid="e-month" data-value={month.toFixed(2)} className="text-5xl font-extrabold">
                {money(shownMonth)}
              </p>
            </div>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{eText.inputsTitle}</p>
            {tabId === "vaping" && (
              <div role="tablist" aria-label={eText.vapeKindLabel} className="flex gap-1.5">
                {eText.vapeKinds.map((k, i) => (
                  <button key={k} type="button" role="tab" aria-selected={st.vapeKind === i} data-testid={`e-vape-${i}`} onClick={() => patch({ vapeKind: i })} className={`min-h-11 flex-1 rounded-full border px-2 text-sm ${st.vapeKind === i ? "border-primary bg-primary text-primary-foreground" : "border-border bg-background"}`}>
                    {k}
                  </button>
                ))}
              </div>
            )}
            {showFields ? (
              fields.map((f, i) => (
                <div key={f.key} className="flex flex-col gap-1 rounded-lg border border-border bg-background px-3 py-2 focus-within:border-primary focus-within:ring-2 focus-within:ring-primary">
                  <div className="flex items-center justify-between gap-2">
                    <span className="min-w-0 flex-1 text-sm font-medium">{labels[i]}</span>
                    <NumInput value={vals[f.key] ?? null} onChange={(n) => setVal(f.key, n)} min={f.min} max={f.max} step={f.step} buttons testId={`e-f-${f.key}`} label={labels[i]} minusLabel={eText.minus} plusLabel={eText.plus} className="w-20" />
                  </div>
                  {f.unused && <p className="text-xs text-muted-foreground">{eText.unusedNote}</p>}
                </div>
              ))
            ) : (
              <Placeholder />
            )}
            <label className="flex min-h-11 items-center justify-between gap-3 rounded-lg border border-border bg-background px-3 text-sm font-medium">
              <span>{eText.currency}</span>
              <select data-testid="e-currency" aria-label={eText.currency} value={st.cur} onChange={(e) => patch({ cur: Number(e.target.value) })} className="min-h-11 rounded-md border border-border bg-card px-2">
                {eText.currencies.map((c, i) => (
                  <option key={c} value={i}>
                    {c}
                  </option>
                ))}
              </select>
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                [eText.perDay, fmtMoneyShort(daily, sym), "e-day"],
                [eText.perYear, money(year), "e-year"],
                [eText.tenYears, money(perTenYears(daily)), "e-ten"],
              ].map(([label, value, id]) => (
                <div key={id} className="rounded-lg border border-border bg-background p-2 text-center">
                  <p className="text-[11px] text-muted-foreground">{label}</p>
                  <p data-testid={id} className="text-sm font-bold">
                    {value}
                  </p>
                </div>
              ))}
            </div>
            <div>
              <button type="button" data-testid="e-formula-toggle" onClick={() => setFormula(!formula)} className="inline-flex min-h-11 items-center text-sm underline">
                {formula ? costText.formulaHide : costText.formulaToggle}
              </button>
              {formula && (
                <div data-testid="e-formula" className="flex flex-col gap-1 rounded-md border border-border bg-background p-2 text-sm">
                  <p>{formulaLine()}</p>
                  <p>{eText.formulaRest(dailyText, fmtMoney2(month, sym), fmtMoney2(year, sym), fmtMoney2(perTenYears(daily), sym))}</p>
                </div>
              )}
            </div>
            <ShareRow month={money(month)} year={money(year)} />
          </section>

          <div className="overflow-hidden rounded-md bg-primary py-2 text-sm font-bold text-primary-foreground" data-testid="e-ticker">
            <style>{"@keyframes e-tick{from{transform:translateX(0)}to{transform:translateX(-50%)}}"}</style>
            <div className="flex w-max gap-8 whitespace-nowrap" style={{ animation: "e-tick 18s linear infinite" }}>
              {[0, 1, 2, 3].map((i) => (
                <span key={i}>{eText.ticker(money(month), money(year), money(perTenYears(daily)))}</span>
              ))}
            </div>
          </div>

          <section className="flex flex-col gap-2" data-testid="e-buy">
            <h3 className="text-lg font-semibold">{eText.buyTitle}</h3>
            <p className="text-sm text-muted-foreground">{eText.buyLine}</p>
            {eText.buyItems.map((item, i) => {
              const r = reachTime(st.buy[i] ?? 0, daily)
              return (
                <div key={item} data-testid={`e-buy-${i}`} className="flex flex-col gap-1 rounded-lg border border-border bg-card p-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="min-w-0 flex-1 text-sm font-medium">{item}</span>
                    <NumInput value={st.buy[i]} onChange={(n) => patch({ buy: st.buy.map((b, j) => (j === i ? n : b)) })} testId={`e-buy-price-${i}`} label={eText.buyPrice(item)} className="w-24" />
                  </div>
                  <div className="flex items-center justify-between gap-2 text-sm">
                    {st.buy[i] == null && <NotSourced />}
                    <span data-testid={`e-buy-reach-${i}`} data-n={r?.n ?? ""} data-unit={r?.unit ?? ""} className="ml-auto text-muted-foreground">
                      {r ? eText.reached(r.n, r.unit === "days" ? eText.days : eText.months) : ""}
                    </span>
                  </div>
                </div>
              )
            })}
            <p className="text-xs text-muted-foreground">{eText.buyFormula}</p>
          </section>

          <section className="flex flex-col gap-2 rounded-xl border border-border bg-card p-3" data-testid="e-chart-card">
            <h3 className="text-lg font-semibold">{eText.chartTitle}</h3>
            <p className="text-3xl font-extrabold" data-testid="e-20" data-value={Math.round(savedOver(year, 20, rate))}>
              {money(savedOver(year, 20, rate))}
            </p>
            <p className="text-sm text-muted-foreground">{eText.chartLabel}</p>
            <label className="flex min-h-11 items-center justify-between gap-3 text-sm">
              <span>{eText.inflationLabel}</span>
              <input type="checkbox" role="switch" data-testid="e-infl" checked={st.inflOn} onChange={(e) => patch({ inflOn: e.target.checked })} className="size-6 accent-primary" />
            </label>
            {st.inflOn && (
              <div className="flex items-center justify-between gap-2 text-sm">
                <span>{eText.inflationRate}</span>
                {st.rate === null && <NotSourced />}
                <NumInput value={st.rate} onChange={(n) => patch({ rate: n })} testId="e-infl-rate" label={eText.inflationRate} step={0.5} className="w-20" />
              </div>
            )}
            <SavingsChart yearly={year} rate={rate} />
            <div className="grid grid-cols-2 gap-2 text-center">
              <div className="rounded-lg border border-border bg-background p-2">
                <p className="text-[11px] text-muted-foreground">{eText.tenYearsTotal}</p>
                <p data-testid="e-10y" data-value={Math.round(savedOver(year, 10, rate))} className="text-sm font-bold">
                  {money(savedOver(year, 10, rate))}
                </p>
              </div>
              <div className="rounded-lg border border-border bg-background p-2">
                <p className="text-[11px] text-muted-foreground">{eText.twentyYearsTotal}</p>
                <p data-testid="e-20y" className="text-sm font-bold">
                  {money(savedOver(year, 20, rate))}
                </p>
              </div>
            </div>
            <p data-testid="e-chart-formula" className="text-xs text-muted-foreground">
              {rate > 0 ? eText.chartFormula(fmtMoney2(year, sym), `${(rate * 100).toFixed(1)}%`, fmtMoney2(savedOver(year, 20, rate), sym)) : eText.chartFormulaFlat(fmtMoney2(year, sym), fmtMoney2(savedOver(year, 20, 0), sym))}
            </p>
          </section>

          <section className="flex flex-col gap-2" data-testid="e-more">
            <h3 className="text-lg font-semibold">{eText.moreTitle}</h3>
            <Card testId="e-more-units">
              <p className="text-sm text-muted-foreground">{eText.moreUnits}</p>
              {tabId === "cigarettes" ? (
                <>
                  <p data-testid="e-units" data-value={unitsNot(vals.perDay ?? 0, 20)} className="text-2xl font-bold">
                    {unitsNot(vals.perDay ?? 0, 20).toLocaleString("en-US")}
                  </p>
                  <p className="text-xs text-muted-foreground">{eText.moreUnitsFormula(fmt("perDay"), unitsNot(vals.perDay ?? 0, 20).toLocaleString("en-US"))}</p>
                </>
              ) : (
                <Placeholder />
              )}
            </Card>
            <Card testId="e-more-life">
              <p className="text-sm text-muted-foreground">{eText.moreLife}</p>
              <NotSourced />
            </Card>
            <Card testId="e-more-co">
              <p className="text-sm text-muted-foreground">{eText.moreCo}</p>
              <NotSourced />
            </Card>
          </section>
        </div>
      )}

      {st.screen === 1 && sub === "home" && (
        <section className="flex flex-col gap-3" data-testid="e-home">
          <Card>
            <p className="text-center text-sm font-medium">{eText.appSmokeFree}</p>
            <div data-testid="e-smoke-free" className="mt-1 grid grid-cols-3 text-center">
              {[
                [sf.days, eText.appDays],
                [sf.hours, eText.appHours],
                [sf.minutes, eText.appMinutes],
              ].map(([v, l]) => (
                <div key={l}>
                  <p className="text-4xl font-extrabold">{v}</p>
                  <p className="text-xs text-muted-foreground">{l}</p>
                </div>
              ))}
            </div>
            <label className="mt-2 flex min-h-11 items-center justify-between gap-3 text-sm">
              <span>{eText.appQuitDate}</span>
              <input
                type="datetime-local"
                data-testid="e-start"
                value={st.start === null ? "" : toLocalInput(st.start)}
                max={toLocalInput(now)}
                onChange={(e) => {
                  const t = fromLocalInput(e.target.value)
                  if (Number.isFinite(t)) patch({ start: t, ex: 0 })
                }}
                className="min-h-11 rounded-md border border-border bg-background px-2"
              />
            </label>
            <Dots count={2} />
          </Card>
          <div className="grid grid-cols-2 gap-2">
            <Card>
              <p className="text-xs text-muted-foreground">{eText.appNotSmoked}</p>
              <p data-testid="e-cigs-not" className="text-xl font-bold">
                {cigsNot}
              </p>
            </Card>
            <div className="relative">
              <Card>
                <p className="text-xs text-muted-foreground">{eText.appLife}</p>
                <NotSourced />
              </Card>
              <button type="button" data-testid="e-life-info" aria-label={eText.appInfo} onClick={() => setInfo(info === "life" ? null : "life")} className="absolute right-0 top-0 inline-flex size-11 items-center justify-center text-sm">
                <span className="inline-flex size-6 items-center justify-center rounded-full border border-border">{"i"}</span>
              </button>
            </div>
          </div>
          {info === "life" && <div data-testid="e-info-tile"><Placeholder /></div>}
          <div className="relative">
            <button type="button" data-testid="e-total" data-value={saved} onClick={() => setSub("goal")} className="flex min-h-24 w-full flex-col items-center justify-center gap-1 rounded-lg border border-border bg-card p-3 text-center">
              <span data-testid="e-total-value" className="text-4xl font-bold">
                {fmtMoney2(saved)}
              </span>
              <span className="text-sm text-muted-foreground">{eText.appTotal}</span>
              <Dots count={4} />
            </button>
            <button type="button" data-testid="e-total-info" aria-label={eText.appInfo} onClick={() => setInfo(info === "total" ? null : "total")} className="absolute left-0 top-0 inline-flex size-11 items-center justify-center text-sm">
              <span className="inline-flex size-6 items-center justify-center rounded-full border border-border">{"i"}</span>
            </button>
          </div>
          {info === "total" && <div data-testid="e-info-tile"><Placeholder /></div>}
          <div className="grid grid-cols-3 gap-2" data-testid="e-rings">
            <Card>
              <Ring value={pct / 100} size={72} stroke={8} testId="e-ring-savings">
                <span data-testid="e-ring-pct" className="text-xs font-bold">
                  {pct}%
                </span>
              </Ring>
              <p className="mt-1 text-center text-xs">{eText.appRings[0]}</p>
              <p className="text-center text-xs text-muted-foreground">{st.goal.price ? fmtMoneyShort(st.goal.price) : <NotSourced />}</p>
            </Card>
            <Card>
              <Ring value={0} size={72} stroke={8} />
              <p className="mt-1 text-center text-xs">{eText.appRings[1]}</p>
              <NotSourced />
            </Card>
            <Card>
              <Ring value={0} size={72} stroke={8} />
              <p className="mt-1 text-center text-xs">{eText.appRings[2]}</p>
              <NotSourced />
            </Card>
          </div>
          <Card testId="e-milestones">
            <div className="mb-2 flex items-center justify-between gap-2">
              <p className="text-sm font-medium">{eText.appMilestones}</p>
              <NotSourced />
            </div>
            <div className="flex items-center" aria-hidden="true">
              {Array.from({ length: 7 }, (_, i) => (
                <div key={i} className="flex flex-1 items-center last:flex-none">
                  <span data-testid="e-milestone" className="size-5 shrink-0 rounded-full border border-dashed border-muted-foreground" />
                  {i < 6 && <span className="h-0 flex-1 border-t border-dashed border-border" />}
                </div>
              ))}
            </div>
          </Card>
          <div className="flex items-center gap-2">
            <button type="button" data-testid="e-to-edit" onClick={() => setSub("edit")} className="min-h-11 flex-1 rounded-md border border-border bg-card px-2 text-sm">
              {eText.appEditLink}
            </button>
            <InferredTag />
            <button type="button" data-testid="e-to-setup" onClick={() => setSub("setup")} className="min-h-11 flex-1 rounded-md border border-border bg-card px-2 text-sm">
              {eText.appSetupLink}
            </button>
            <InferredTag />
          </div>
          <div className="flex items-center gap-2">
            <div className="flex-1">
              <PrimaryButton testId="e-example" onClick={fillExample}>
                {costText.useExample}
              </PrimaryButton>
            </div>
            <InferredTag />
          </div>
        </section>
      )}

      {st.screen === 1 && sub === "goal" && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end bg-black/60" data-testid="e-goal">
          <div className="relative max-h-[92dvh] overflow-y-auto rounded-t-2xl border-t border-border bg-background p-3 pb-10">
            <div className="flex items-center justify-between">
              <button type="button" data-testid="e-goal-close" aria-label={eText.goalClose} onClick={() => setSub("home")} className="inline-flex size-11 items-center justify-center rounded-full border border-border bg-card text-lg">
                {"✕"}
              </button>
              <button type="button" data-testid="e-goal-more" aria-label={eText.goalMore} onClick={() => setSub("edit")} className="inline-flex size-11 items-center justify-center rounded-full border border-border bg-card text-lg">
                {"⋯"}
              </button>
            </div>
            <p className="mt-2 text-center text-xs uppercase tracking-wide text-muted-foreground">{eText.goalHeading}</p>
            <p data-testid="e-goal-name" className="text-center text-xl font-bold">
              {st.goal.name || eText.goalNone}
            </p>
            <p data-testid="e-goal-count" data-days={cd?.days ?? ""} className="text-center text-sm text-primary">
              {cd ? eText.goalCountdown(cd.days, cd.hours) : <NotSourced />}
            </p>
            <div className="mt-3">
              <Arc270 value={pct / 100} testId="e-goal-ring">
                <span className="text-4xl text-primary">{"$"}</span>
              </Arc270>
            </div>
            <p data-testid="e-goal-pct" className="mx-auto -mt-6 w-fit rounded-full bg-card px-3 py-1 text-sm font-semibold">
              {pct}%
            </p>
            <p data-testid="e-goal-saved" className="mt-2 text-center text-2xl font-bold text-primary">
              {fmtMoney2(saved)}
            </p>
            <p className="text-center text-sm">{eText.goalOf(st.goal.price ? fmtMoney2(st.goal.price) : "-")}</p>
            {cd && st.goal.price ? (
              <p data-testid="e-goal-formula" className="mt-2 text-center text-xs text-muted-foreground">
                {eText.goalFormula(fmtMoney2(saved), fmtMoney2(st.goal.price), pct, fmtMoney2(left), fmtMoney2(cigDaily), cd.days, cd.hours)}
              </p>
            ) : (
              <p className="mt-2 text-center text-xs text-muted-foreground">{eText.goalFormulaNoRate}</p>
            )}
          </div>
        </div>
      )}

      {st.screen === 1 && sub === "edit" && (
        <section data-testid="e-edit" className="flex flex-col gap-3">
          <Head title={eText.editTitle} onBack={() => setSub("home")} inferred />
          <label className="flex min-h-11 items-center justify-between gap-3 text-sm">
            <span>{eText.editName}</span>
            <input data-testid="e-goal-name-input" aria-label={eText.editName} value={st.goal.name} onChange={(e) => patch({ goal: { ...st.goal, name: e.target.value }, ex: 0 })} className="min-h-11 w-44 rounded-md border border-border bg-background px-2" />
          </label>
          <label className="flex min-h-11 items-center justify-between gap-3 text-sm">
            <span>{eText.editPrice}</span>
            <NumInput value={st.goal.price} onChange={(n) => patch({ goal: { ...st.goal, price: n }, ex: 0 })} testId="e-goal-price-input" label={eText.editPrice} className="w-32" />
          </label>
          <Placeholder />
          <PrimaryButton testId="e-edit-save" onClick={() => setSub("goal")}>
            {costText.save}
          </PrimaryButton>
        </section>
      )}

      {st.screen === 1 && sub === "setup" && <PlaceholderScreen title={eText.setupTitle} onBack={() => setSub("home")} />}
    </div>
  )
}

/** Pager dots: the first one is lit. */
function Dots({ count }: { count: number }) {
  return (
    <div aria-hidden="true" data-testid="e-dots" className="mt-2 flex justify-center gap-1.5">
      {Array.from({ length: count }, (_, i) => (
        <span key={i} className={`size-1.5 rounded-full ${i === 0 ? "bg-primary" : "bg-border"}`} />
      ))}
    </div>
  )
}

function ShareRow({ month, year }: { month: string; year: string }) {
  const text = encodeURIComponent(eText.shareText(month, year))
  const here = typeof window === "undefined" ? "" : window.location.href
  const links = [`https://wa.me/?text=${text}`, `https://x.com/intent/tweet?text=${text}`, `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(here)}`, `mailto:?body=${text}`]
  const round = "inline-flex size-11 items-center justify-center rounded-full border border-border bg-background text-sm font-bold"
  const copy = () => {
    try {
      void navigator.clipboard.writeText(here).catch(() => undefined)
    } catch {
      // no clipboard here
    }
  }
  return (
    <div className="flex items-center gap-2" data-testid="e-share">
      <span className="min-w-0 flex-1 text-sm font-medium">{eText.shareTitle}</span>
      {links.map((href, i) => (
        <a key={href} href={href} target="_blank" rel="noopener noreferrer" data-testid={`e-share-${i}`} aria-label={eText.shareNames[i]} className={round}>
          {eText.shareGlyphs[i]}
        </a>
      ))}
      <button type="button" data-testid="e-share-4" aria-label={eText.shareNames[4]} onClick={copy} className={round}>
        {eText.shareGlyphs[4]}
      </button>
    </div>
  )
}
