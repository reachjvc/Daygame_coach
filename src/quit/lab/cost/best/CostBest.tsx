"use client"

import { useEffect, useState } from "react"
import { getAddiction } from "../../../data"
import { PrimaryButton, SourceTap } from "../../../components/kit"
import type { QuitAddictionId, QuitCostSwap, QuitUnit } from "../../../types"
import type { LabProps } from "../../registry"
import { useLabState } from "../../store"
import { Card } from "../../progress/shared/Bits"
import { dayKey, keyToMs } from "../../progress/shared/calc"
import { useNow } from "../../progress/shared/clock"
import { NumInput } from "../shared/NumInput"
import {
  availableMoney,
  boughtTotal,
  dailyOf,
  elapsedDays,
  fillGoals,
  grossKept,
  netMoney,
  periods,
  sumSpend,
  type CostSetup,
  type Goal,
  type Spend,
} from "./logic"
import { bestText as t, usd } from "./text"

const SWITCH_IDS = ["nicotine", "alcohol", "weed", "porn"] as const satisfies readonly QuitAddictionId[]
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
const fmtDay = (ms: number) => {
  const d = new Date(ms)
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`
}
const section = "flex flex-col gap-2 rounded-lg border border-border bg-card p-3"
const field = "min-h-11 rounded-md border border-border bg-background px-2"
const ghost = "inline-flex min-h-11 items-center justify-center rounded-md border border-border bg-card px-4 text-sm disabled:opacity-40"
const uid = () => Math.random().toString(36).slice(2, 10)

/** Improved Cost and savings: setup, net money with its basis, periods, spent rows, goals that fill in order. */
export function CostBest({ addiction: initial }: LabProps) {
  const [chosen, setChosen] = useLabState<string>("cost", "best", "addiction", initial)
  const id: QuitAddictionId = (SWITCH_IDS as readonly string[]).includes(chosen) ? (chosen as QuitAddictionId) : "nicotine"
  const data = getAddiction(id)
  const units: QuitUnit[] = data && Array.isArray(data.units) ? data.units : []
  const swaps: QuitCostSwap[] = data && Array.isArray(data.costSwaps) ? data.costSwaps : []
  return (
    <div data-testid="cost-best" className="flex flex-col gap-4">
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
      <Gate key={id} id={id} units={units} swaps={swaps} />
    </div>
  )
}

interface Form {
  startMs: number
  unitId: string
  perDay: number | null
  price: number | null
  money: number | null
  editPrice: boolean
}

function Gate({ id, units, swaps }: { id: string; units: QuitUnit[]; swaps: QuitCostSwap[] }) {
  const [setup, setSetup] = useLabState<CostSetup | null>("cost", "best", `${id}/setup`, null)
  const [spends, setSpends] = useLabState<Spend[]>("cost", "best", `${id}/spends`, [])
  const [goals, setGoals] = useLabState<Goal[]>("cost", "best", `${id}/goals`, [])
  const [rise, setRise] = useLabState<number | null>("cost", "best", `${id}/rise`, null)
  const [form, setForm] = useState<Form | null>(null)
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])
  if (!mounted) return null

  const unitOf = (uid_: string) => units.find((u) => u.id === uid_) ?? units[0] ?? null
  const blank = (): Form => {
    const u = units[0] ?? null
    return { startMs: keyToMs(dayKey(Date.now())), unitId: u?.id ?? "", perDay: null, price: u?.defaultPriceUsd ?? null, money: null, editPrice: false }
  }
  const startOver = () => {
    setSetup(null)
    setSpends([])
    setGoals([])
    setRise(null)
    setForm(null)
  }

  if (setup && !form) {
    return (
      <>
        <Main setup={setup} unit={unitOf(setup.unitId)} spends={spends} setSpends={setSpends} goals={goals} setGoals={setGoals} rise={rise} setRise={setRise} swaps={swaps} />
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            data-testid="edit-setup"
            onClick={() => setForm({ startMs: setup.startMs, unitId: setup.unitId, perDay: setup.unitId ? setup.perDay : null, price: setup.price, money: setup.unitId ? null : setup.money, editPrice: setup.priceOwn === 1 })}
            className={ghost}
          >
            {t.editSetup}
          </button>
          <button type="button" data-testid="start-over" onClick={startOver} className="inline-flex min-h-11 items-center text-sm text-muted-foreground underline">
            {t.startOver}
          </button>
        </div>
      </>
    )
  }

  const f = form ?? blank()
  const unit = units.length === 0 ? null : unitOf(f.unitId)
  const own = unit !== null && f.price !== null && f.price !== unit.defaultPriceUsd
  const ready = unit ? (f.perDay ?? 0) > 0 && (f.price ?? 0) > 0 : (f.money ?? 0) > 0
  return (
    <section data-testid="setup-form" className={section}>
      <h2 className="text-lg font-semibold">{t.setupTitle}</h2>
      <label className="flex min-h-11 items-center justify-between gap-3 text-sm">
        <span>{t.fStart}</span>
        <input
          type="date"
          data-testid="setup-start"
          value={dayKey(f.startMs)}
          max={dayKey(Date.now())}
          onChange={(e) => e.target.value && setForm({ ...f, startMs: keyToMs(e.target.value) })}
          className={field}
        />
      </label>
      {unit === null ? (
        <>
          <label className="flex min-h-11 items-center justify-between gap-3 text-sm">
            <span>{t.fMoneyPerDay}</span>
            <NumInput value={f.money} onChange={(n) => setForm({ ...f, money: n })} testId="setup-money" label={t.fMoneyPerDay} step={0.5} className="w-28" />
          </label>
          <p className="text-xs text-muted-foreground">{t.fMoneyPerDayHint}</p>
        </>
      ) : (
        <>
          <div role="radiogroup" aria-label={t.fUnit} className="flex flex-wrap gap-2">
            {units.map((u) => (
              <button
                key={u.id}
                type="button"
                role="radio"
                aria-checked={u.id === unit.id}
                data-testid={`setup-unit-${u.id}`}
                onClick={() => setForm({ ...f, unitId: u.id, price: u.defaultPriceUsd ?? null, editPrice: false })}
                className={`inline-flex min-h-11 items-center rounded-full border px-4 text-sm ${u.id === unit.id ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card"}`}
              >
                {u.many}
              </button>
            ))}
          </div>
          <label className="flex min-h-11 items-center justify-between gap-3 text-sm">
            <span>{t.fPerDay}</span>
            <NumInput value={f.perDay} onChange={(n) => setForm({ ...f, perDay: n })} testId="setup-perday" label={t.fPerDay} className="w-28" />
          </label>
          <p className="text-xs text-muted-foreground">{t.fPerDayHint}</p>
          <div className="flex min-h-11 items-center justify-between gap-3 text-sm">
            <span>{t.fPrice}</span>
            {f.editPrice || unit.defaultPriceUsd === null ? (
              <NumInput value={f.price} onChange={(n) => setForm({ ...f, price: n })} testId="setup-price" label={t.fPrice} step={0.01} className="w-28" />
            ) : (
              <span className="flex items-center gap-2">
                <span data-testid="setup-price-value" className="tabular-nums">
                  {usd(f.price ?? 0)}
                </span>
                <button
                  type="button"
                  data-testid="setup-price-edit"
                  aria-label={t.editPrice}
                  onClick={() => setForm({ ...f, editPrice: true })}
                  className="inline-flex size-11 items-center justify-center rounded-full border border-border bg-card"
                >
                  {"✎"}
                </button>
              </span>
            )}
          </div>
          <p data-testid="setup-price-note" className="text-xs text-muted-foreground">
            {own ? t.priceOwn : unit.defaultPriceUsd !== null ? t.priceFrom : ""}
          </p>
          {!own && unit.priceRefs.length > 0 && (
            <div data-testid="setup-price-source">
              <SourceTap refs={unit.priceRefs} />
            </div>
          )}
        </>
      )}
      <PrimaryButton
        testId="setup-save"
        disabled={!ready}
        onClick={() => {
          setSetup(
            unit === null
              ? { startMs: f.startMs, unitId: "", perDay: 0, price: 0, priceOwn: 1, money: f.money ?? 0 }
              : { startMs: f.startMs, unitId: unit.id, perDay: f.perDay ?? 0, price: f.price ?? 0, priceOwn: own ? 1 : 0, money: 0 },
          )
          setForm(null)
        }}
      >
        {t.save}
      </PrimaryButton>
    </section>
  )
}

interface MainProps {
  setup: CostSetup
  unit: QuitUnit | null
  spends: Spend[]
  setSpends: (s: Spend[]) => void
  goals: Goal[]
  setGoals: (g: Goal[]) => void
  rise: number | null
  setRise: (r: number | null) => void
  swaps: QuitCostSwap[]
}

function Main({ setup, unit, spends, setSpends, goals, setGoals, rise, setRise, swaps }: MainProps) {
  const now = useNow(30_000)
  const [open, setOpen] = useState<string | null>(null)
  const toggle = (k: string) => setOpen((o) => (o === k ? null : k))
  const daily = dailyOf(setup)
  const days = elapsedDays(setup.startMs, now)
  const gross = grossKept(daily, days)
  const spent = sumSpend(spends)
  const net = netMoney(gross, spent)
  const bought = boughtTotal(goals)
  const available = availableMoney(net, bought)
  const rate = rise !== null && rise > 0 ? rise / 100 : 0
  const per = periods(daily, rate)
  const since = fmtDay(setup.startMs)
  const rowBasis = unit && setup.unitId ? t.basisRate(setup.perDay, unit.one, unit.many, setup.price) : t.basisRateMoney(daily)
  const heroBasis = (unit && setup.unitId ? t.basis(setup.perDay, unit.one, unit.many, setup.price, since) : t.basisMoney(daily, since)) + (spent > 0 ? t.spentSuffix(spent) : "")
  const tiles = [per.day, per.week, per.month, per.year, per.tenYears]
  const showSource = unit !== null && !!setup.unitId && setup.priceOwn !== 1

  return (
    <div className="flex flex-col gap-4">
      <section data-testid="hero" className={section}>
        <Card testId="hero-card" onClick={() => toggle("hero")} className="text-center">
          <span className="block text-sm text-muted-foreground">{t.keptTitle}</span>
          <span data-testid="net-money" className="block text-4xl font-semibold tabular-nums">
            {usd(net)}
          </span>
          <span data-testid="basis-hero" className="mt-1 block text-xs text-muted-foreground">
            {heroBasis}
          </span>
        </Card>
        {open === "hero" && (
          <div data-testid="formula-hero" className="text-sm text-muted-foreground">
            <p>{t.keptFormula(daily, days.toFixed(1), gross, spent, net)}</p>
            <p>{setup.priceOwn === 1 || !setup.unitId ? t.ownPriceNote : t.priceNote}</p>
            {showSource && unit && <SourceTap refs={unit.priceRefs} />}
          </div>
        )}
        <p className="text-xs text-muted-foreground">{t.tapForFormula}</p>
      </section>

      <section data-testid="periods" className={section}>
        <h2 className="text-lg font-semibold">{t.periodsTitle}</h2>
        <div className="grid grid-cols-2 gap-2">
          {tiles.map((v, i) => (
            <Card key={i} testId={`tile-${i}`} onClick={() => toggle(`tile-${i}`)} className={i === 4 ? "col-span-2" : ""}>
              <span className="block text-xs text-muted-foreground">{t.periodNames[i]}</span>
              <span data-testid={`tile-${i}-value`} className="block text-xl font-semibold tabular-nums">
                {usd(v)}
              </span>
              <span data-testid={`tile-${i}-basis`} className="block text-xs text-muted-foreground">
                {rowBasis}
                {rate > 0 && i >= 3 ? t.withRise(rise ?? 0) : ""}
              </span>
              {open === `tile-${i}` && (
                <span data-testid={`tile-${i}-formula`} className="mt-1 block text-xs text-muted-foreground">
                  {i === 4 && rate > 0 ? t.tenFormulaRise(per.year, rise ?? 0, v) : i === 4 ? t.periodFormulas[4](per.year, v) : t.periodFormulas[i](daily, v)}
                </span>
              )}
            </Card>
          ))}
        </div>
        <label className="flex min-h-11 items-center justify-between gap-3 text-sm">
          <span>{t.riseLabel}</span>
          <RiseInput value={rise} onChange={setRise} />
        </label>
        <p className="text-xs text-muted-foreground">{t.riseHint}</p>
      </section>

      <SpentSection spends={spends} setSpends={setSpends} startMs={setup.startMs} />

      <GoalsSection goals={goals} setGoals={setGoals} net={net} bought={bought} available={available} daily={daily} swaps={swaps} />
    </div>
  )
}

/** A yearly rise box that can be emptied again: empty means no rise. */
function RiseInput({ value, onChange }: { value: number | null; onChange: (n: number | null) => void }) {
  const [draft, setDraft] = useState(value === null ? "" : String(value))
  return (
    <input
      type="text"
      inputMode="decimal"
      data-testid="rise"
      aria-label={t.riseLabel}
      value={draft}
      onChange={(e) => {
        const text = e.target.value
        if (!/^\d{0,3}\.?\d{0,2}$/.test(text)) return
        setDraft(text)
        const n = Number(text)
        onChange(text === "" || !Number.isFinite(n) || n <= 0 ? null : Math.min(100, n))
      }}
      className={`${field} w-24 text-right`}
    />
  )
}

function SpentSection({ spends, setSpends, startMs }: { spends: Spend[]; setSpends: (s: Spend[]) => void; startMs: number }) {
  const [amount, setAmount] = useState<number | null>(null)
  const [note, setNote] = useState("")
  const [day, setDay] = useState(dayKey(Date.now()))
  const [reset, setReset] = useState(0)
  const add = () => {
    if (!(amount && amount > 0)) return
    setSpends([...spends, { id: uid(), day, amount, note: note.trim() }])
    setAmount(null)
    setNote("")
    setReset((n) => n + 1)
  }
  return (
    <section data-testid="spent" className={section}>
      <h2 className="text-lg font-semibold">{t.spentTitle}</h2>
      <p className="text-sm text-muted-foreground">{t.spentLine}</p>
      {spends.length === 0 ? (
        <p data-testid="spent-none" className="text-sm text-muted-foreground">
          {t.spentNone}
        </p>
      ) : (
        <ul className="flex flex-col gap-1">
          {spends.map((s) => (
            <li key={s.id} data-testid="spend-row" className="flex min-h-11 items-center justify-between gap-2 text-sm">
              <span className="min-w-0 flex-1 truncate">
                {s.day}
                {s.note ? `, ${s.note}` : ""}
              </span>
              <span className="tabular-nums">{usd(s.amount)}</span>
              <button type="button" aria-label={t.remove} data-testid="spend-remove" onClick={() => setSpends(spends.filter((x) => x.id !== s.id))} className="inline-flex size-11 items-center justify-center text-muted-foreground">
                {"✕"}
              </button>
            </li>
          ))}
        </ul>
      )}
      <p data-testid="spent-total" className="text-sm font-medium">
        {t.spentTotal(sumSpend(spends))}
      </p>
      <label className="flex min-h-11 items-center justify-between gap-3 text-sm">
        <span>{t.spendDay}</span>
        <input type="date" data-testid="spend-day" value={day} min={dayKey(startMs)} max={dayKey(Date.now())} onChange={(e) => e.target.value && setDay(e.target.value)} className={field} />
      </label>
      <label className="flex min-h-11 items-center justify-between gap-3 text-sm">
        <span>{t.spendAmount}</span>
        <NumInput key={reset} value={amount} onChange={setAmount} testId="spend-amount" label={t.spendAmount} step={1} className="w-28" />
      </label>
      <input type="text" data-testid="spend-note" aria-label={t.spendNote} placeholder={t.spendNote} value={note} onChange={(e) => setNote(e.target.value)} className={`${field} w-full`} />
      <button type="button" data-testid="spend-add" disabled={!(amount && amount > 0)} onClick={add} className={ghost}>
        {t.spendAdd}
      </button>
    </section>
  )
}

function GoalsSection({
  goals,
  setGoals,
  net,
  bought,
  available,
  daily,
  swaps,
}: {
  goals: Goal[]
  setGoals: (g: Goal[]) => void
  net: number
  bought: number
  available: number
  daily: number
  swaps: QuitCostSwap[]
}) {
  const [name, setName] = useState("")
  const [price, setPrice] = useState<number | null>(null)
  const [reset, setReset] = useState(0)
  const filled = fillGoals(goals, available, daily)
  const done = goals.filter((g) => g.bought)
  const canAdd = name.trim() !== "" && (price ?? 0) > 0
  const add = () => {
    if (!canAdd) return
    setGoals([...goals, { id: uid(), name: name.trim(), price: price ?? 0, bought: false }])
    setName("")
    setPrice(null)
    setReset((n) => n + 1)
  }
  return (
    <section data-testid="goals" className={section}>
      <h2 className="text-lg font-semibold">{t.goalsTitle}</h2>
      <p className="text-sm text-muted-foreground">{t.goalsLine}</p>
      <p data-testid="equation" className="rounded-md border border-dashed border-border px-3 py-2 text-sm tabular-nums">
        {t.equation(net, bought, available)}
      </p>
      {filled.length === 0 && (
        <p data-testid="goals-none" className="text-sm text-muted-foreground">
          {t.goalNoGoals}
        </p>
      )}
      <ol className="flex flex-col gap-2">
        {filled.map((fg, i) => (
          <li key={fg.goal.id} data-testid="goal-row" className="flex flex-col gap-1 rounded-md border border-border bg-background p-3">
            <div className="flex items-center justify-between gap-2">
              <span data-testid="goal-name" className="min-w-0 flex-1 truncate font-medium">
                {i + 1}. {fg.goal.name}
              </span>
              <button type="button" aria-label={t.remove} data-testid="goal-remove" onClick={() => setGoals(goals.filter((g) => g.id !== fg.goal.id))} className="inline-flex size-11 items-center justify-center text-muted-foreground">
                {"✕"}
              </button>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-border" role="progressbar" aria-valuenow={fg.pct} aria-valuemin={0} aria-valuemax={100}>
              <div className="h-full bg-primary" style={{ width: `${fg.pct}%` }} />
            </div>
            <span data-testid="goal-funded" className="text-sm tabular-nums">
              {t.goalFunded(fg.funded, fg.goal.price, fg.pct)}
            </span>
            {fg.ready ? (
              <>
                <span className="text-sm text-muted-foreground">{t.goalReady}</span>
                <span className="text-xs text-muted-foreground">{t.buyNote(fg.goal.price, Math.round((available - fg.goal.price) * 100) / 100)}</span>
                <button type="button" data-testid="goal-buy" onClick={() => setGoals(goals.map((g) => (g.id === fg.goal.id ? { ...g, bought: true } : g)))} className={ghost}>
                  {t.buy}
                </button>
              </>
            ) : fg.reach ? (
              <>
                <span data-testid="goal-reach" className="text-sm">
                  {t.goalReach(fg.reach.n, fg.reach.unit)}
                </span>
                <span className="text-xs text-muted-foreground">{t.goalReachBasis(fg.missing, daily)}</span>
              </>
            ) : (
              <span className="text-sm text-muted-foreground">{t.goalReachNoRate}</span>
            )}
          </li>
        ))}
      </ol>
      {done.length > 0 && (
        <div data-testid="bought-list" className="flex flex-col gap-1">
          <h3 className="text-sm font-medium">{t.boughtTitle}</h3>
          {done.map((g) => (
            <div key={g.id} data-testid="bought-row" className="flex min-h-11 items-center justify-between gap-2 text-sm">
              <span className="min-w-0 flex-1 truncate">{t.boughtLine(g.name, g.price)}</span>
              <button type="button" data-testid="bought-undo" onClick={() => setGoals(goals.map((x) => (x.id === g.id ? { ...x, bought: false } : x)))} className="inline-flex min-h-11 items-center text-sm underline">
                {t.undo}
              </button>
            </div>
          ))}
        </div>
      )}
      <input type="text" data-testid="goal-name-input" aria-label={t.goalName} placeholder={t.goalName} value={name} onChange={(e) => setName(e.target.value)} className={`${field} w-full`} />
      {swaps.length > 0 && (
        <div data-testid="suggestions" className="flex flex-col gap-1">
          <span className="text-xs text-muted-foreground">{t.suggestTitle}</span>
          <div className="flex flex-wrap gap-2">
            {swaps.map((s) => (
              <button key={s.text} type="button" data-testid="suggestion" onClick={() => setName(s.text)} className="inline-flex min-h-11 items-center rounded-full border border-border bg-card px-3 text-sm">
                {s.text}
              </button>
            ))}
          </div>
          <span className="text-xs text-muted-foreground">{t.suggestHint}</span>
        </div>
      )}
      <label className="flex min-h-11 items-center justify-between gap-3 text-sm">
        <span>{t.goalPrice}</span>
        <NumInput key={reset} value={price} onChange={setPrice} testId="goal-price-input" label={t.goalPrice} step={10} className="w-28" />
      </label>
      <button type="button" data-testid="goal-add" disabled={!canAdd} onClick={add} className={ghost}>
        {t.goalAdd}
      </button>
    </section>
  )
}
