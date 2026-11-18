"use client"

import { useEffect, useState } from "react"
import { getAddiction } from "../../../data"
import { PrimaryButton, SourceTap } from "../../../components/kit"
import type { QuitAddictionId, QuitUnit } from "../../../types"
import type { LabProps } from "../../registry"
import { useLabState } from "../../store"
import { BottomNav, Card, ExampleBar, NumField, Tabs } from "../shared/Bits"
import { DAY, addDays, dayKey, fmtMoney, keyToMs } from "../shared/calc"
import { useNow } from "../shared/clock"
import {
  PERIOD_DAYS,
  cellState,
  clearDayKeys,
  dailyAmount,
  dayMilestones,
  fillTargets,
  monthGrid,
  moneyKept,
  moneyMilestones,
  periodMoney,
  stats,
  sumSpend,
  type BestSetup,
  type Slip,
  type Spend,
  type Target,
} from "./logic"
import { bestText as t } from "./text"

const SWITCH_IDS = ["nicotine", "alcohol", "weed", "porn"] as const satisfies readonly QuitAddictionId[]
type Screen = "home" | "money" | "milestones" | "calendar"
const SCREENS: Screen[] = ["home", "money", "milestones", "calendar"]

/** `12 Nov 2026` from a day key. */
const fmtDay = (key: string) => {
  const [y, m, d] = key.split("-").map(Number)
  return `${d} ${t.months[m - 1].slice(0, 3)} ${y}`
}

/** Improved Progress home: total clear days that never reset, runs, money, targets, milestones, calendar. */
export function ProgressBest({ addiction: initial }: LabProps) {
  const [chosen, setChosen] = useLabState<string>("progress", "best", "addiction", initial)
  const id: QuitAddictionId = (SWITCH_IDS as readonly string[]).includes(chosen) ? (chosen as QuitAddictionId) : "nicotine"
  const data = getAddiction(id)
  const units: QuitUnit[] = data && Array.isArray(data.units) ? data.units : []
  return (
    <div data-testid="progress-best" className="flex flex-col gap-4">
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
      {units.length === 0 ? (
        <p data-testid="content-coming" className="rounded-md border border-dashed border-border px-3 py-3 text-sm text-muted-foreground">
          {t.contentComing}
        </p>
      ) : (
        <Gate key={id} id={id} units={units} />
      )}
    </div>
  )
}

/** Setup first (one screen), then the app. Everything is kept per addiction under its own keys. */
function Gate({ id, units }: { id: string; units: QuitUnit[] }) {
  const [setup, setSetup] = useLabState<BestSetup | null>("progress", "best", `${id}/setup`, null)
  const [slips, setSlips] = useLabState<Slip[]>("progress", "best", `${id}/slips`, [])
  const [spends, setSpends] = useLabState<Spend[]>("progress", "best", `${id}/spends`, [])
  const [targets, setTargets] = useLabState<Target[]>("progress", "best", `${id}/targets`, [])
  const [mounted, setMounted] = useState(false)
  const [form, setForm] = useState<{ startMs: number; unitId: string; perDay: number; price: number } | null>(null)
  useEffect(() => setMounted(true), [])
  if (!mounted) return null

  const clear = () => {
    setSetup(null)
    setSlips([])
    setSpends([])
    setTargets([])
    setForm(null)
  }
  const seed = () => {
    const now = Date.now()
    const u = units[0]
    setSlips([{ day: dayKey(now - 9 * DAY), note: t.exampleNote }])
    setTargets([{ id: "t1", name: t.exampleTarget, price: 150 }])
    setSetup({ startMs: now - 23 * DAY, unitId: u.id, perDay: 10, price: u.defaultPriceUsd ?? 0, priceOwn: 0, seeded: 1 })
  }

  if (setup) {
    const unit = units.find((u) => u.id === setup.unitId) ?? units[0]
    return (
      <>
        {setup.seeded === 1 && <ExampleBar onClear={clear} />}
        <Main
          setup={setup}
          unit={unit}
          setSetup={setSetup}
          slips={slips}
          setSlips={setSlips}
          spends={spends}
          setSpends={setSpends}
          targets={targets}
          setTargets={setTargets}
          example={setup.seeded === 1}
        />
        <button type="button" data-testid="start-over" onClick={clear} className="mt-6 inline-flex min-h-11 items-center text-sm text-muted-foreground underline">
          {t.startOver}
        </button>
      </>
    )
  }

  if (form) {
    const unit = units.find((u) => u.id === form.unitId) ?? units[0]
    const own = Number.isFinite(form.price) && form.price !== unit.defaultPriceUsd
    return (
      <section data-testid="setup-form" className="flex flex-col gap-2">
        <h2 className="text-lg font-semibold">{t.formTitle}</h2>
        <label className="flex min-h-11 items-center justify-between gap-3 text-sm">
          <span>{t.fStart}</span>
          <input
            type="date"
            data-testid="setup-start"
            value={dayKey(form.startMs)}
            max={dayKey(Date.now())}
            onChange={(e) => e.target.value && setForm({ ...form, startMs: keyToMs(e.target.value) })}
            className="min-h-11 rounded-md border border-border bg-background px-2"
          />
        </label>
        <div role="radiogroup" aria-label={t.fUnit} className="flex flex-wrap gap-2">
          {units.map((u) => (
            <button
              key={u.id}
              type="button"
              role="radio"
              aria-checked={u.id === form.unitId}
              data-testid={`setup-unit-${u.id}`}
              onClick={() => setForm({ ...form, unitId: u.id, price: u.defaultPriceUsd ?? NaN })}
              className={`inline-flex min-h-11 items-center rounded-full border px-4 text-sm ${u.id === form.unitId ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card"}`}
            >
              {u.many}
            </button>
          ))}
        </div>
        <NumField label={t.fPerDay} value={form.perDay} testId="setup-perday" onChange={(n) => setForm({ ...form, perDay: n })} />
        <p className="text-xs text-muted-foreground">{t.fPerDayHint}</p>
        <NumField label={t.fPrice} value={form.price} step={0.01} testId="setup-price" onChange={(n) => setForm({ ...form, price: n })} />
        <p data-testid="setup-price-note" className="text-xs text-muted-foreground">
          {own ? t.priceOwn : unit.defaultPriceUsd !== null ? t.priceFrom : ""}
        </p>
        {!own && unit.priceRefs.length > 0 && (
          <div data-testid="setup-price-source">
            <SourceTap refs={unit.priceRefs} />
          </div>
        )}
        <PrimaryButton
          testId="setup-save"
          disabled={!Number.isFinite(form.price)}
          onClick={() =>
            setSetup({ startMs: form.startMs, unitId: form.unitId, perDay: Number.isFinite(form.perDay) ? form.perDay : 0, price: form.price, priceOwn: own ? 1 : 0, seeded: 0 })
          }
        >
          {t.save}
        </PrimaryButton>
      </section>
    )
  }

  return (
    <section data-testid="setup-choice" className="flex flex-col gap-3">
      <h2 className="text-lg font-semibold">{t.setupTitle}</h2>
      <p className="text-sm text-muted-foreground">{t.setupLine}</p>
      <PrimaryButton
        testId="setup-own-btn"
        onClick={() => setForm({ startMs: Date.now(), unitId: units[0].id, perDay: NaN, price: units[0].defaultPriceUsd ?? NaN })}
      >
        {t.ownBtn}
      </PrimaryButton>
      <button type="button" data-testid="setup-seed" onClick={seed} className="inline-flex min-h-12 w-full items-center justify-center rounded-md border border-border bg-card px-4 text-base">
        {t.seedBtn}
      </button>
    </section>
  )
}

interface MainProps {
  setup: BestSetup
  unit: QuitUnit
  setSetup: (s: BestSetup) => void
  slips: Slip[]
  setSlips: (s: Slip[]) => void
  spends: Spend[]
  setSpends: (s: Spend[]) => void
  targets: Target[]
  setTargets: (s: Target[]) => void
  example: boolean
}

function Main(p: MainProps) {
  const { setup, unit, slips, spends, targets } = p
  const now = useNow(30_000)
  const today = dayKey(now)
  const startKey = dayKey(setup.startMs)
  const [screen, setScreen] = useState<Screen>("home")
  const [slipForm, setSlipForm] = useState<{ day: string; note: string } | null>(null)
  const [slipDone, setSlipDone] = useState(false)

  const st = stats(startKey, today, slips)
  const perDay = dailyAmount(setup.perDay, setup.price)
  const spent = sumSpend(spends)
  const money = moneyKept(perDay, st.total, spent)
  const openSlip = (day: string) => {
    setSlipDone(false)
    setSlipForm({ day, note: "" })
    setScreen("home")
  }

  return (
    <div className="flex flex-col gap-4">
      {screen === "home" && (
        <Home
          {...p}
          st={st}
          today={today}
          startKey={startKey}
          perDay={perDay}
          spent={spent}
          money={money}
          slipForm={slipForm}
          setSlipForm={setSlipForm}
          slipDone={slipDone}
          onSlipSaved={(day, note) => {
            p.setSlips([...slips.filter((s) => s.day !== day), { day, note }])
            setSlipForm(null)
            setSlipDone(true)
          }}
          openSlip={openSlip}
        />
      )}
      {screen === "money" && <Money {...p} today={today} startKey={startKey} perDay={perDay} total={st.total} money={money} />}
      {screen === "milestones" && <Milestones {...p} today={today} startKey={startKey} perDay={perDay} money={money} />}
      {screen === "calendar" && <Calendar slips={slips} today={today} startKey={startKey} openSlip={openSlip} />}
      <BottomNav id="nav" items={t.nav} value={SCREENS.indexOf(screen)} onChange={(i) => setScreen(SCREENS[i])} />
    </div>
  )
}

type HomeProps = MainProps & {
  st: ReturnType<typeof stats>
  today: string
  startKey: string
  perDay: number
  spent: number
  money: number
  slipForm: { day: string; note: string } | null
  setSlipForm: (f: { day: string; note: string } | null) => void
  slipDone: boolean
  onSlipSaved: (day: string, note: string) => void
  openSlip: (day: string) => void
}

function Home({ setup, unit, st, today, startKey, perDay, spent, money, slips, slipForm, setSlipForm, slipDone, onSlipSaved, openSlip }: HomeProps) {
  const [open, setOpen] = useState<string | null>(null)
  const toggle = (k: string) => setOpen((o) => (o === k ? null : k))
  const units = Math.round(setup.perDay * st.total * 100) / 100
  const hasRate = setup.perDay > 0
  const yesterday = addDays(today, -1)
  const slipDays = st.stretches.filter((s) => s.endedBy).length
  return (
    <>
      <section data-testid="home" className="flex flex-col gap-3">
        <Card testId="total-card" onClick={() => toggle("total")} className="text-center">
          <span data-testid="total-days" className="block text-6xl font-semibold tabular-nums">
            {st.total}
          </span>
          <span className="block text-sm text-muted-foreground">{t.totalCaption}</span>
          {open === "total" && (
            <span data-testid="formula-total" className="mt-2 block text-sm text-muted-foreground">
              {t.totalFormula(fmtDay(startKey), fmtDay(yesterday), slipDays)}
            </span>
          )}
        </Card>
        <div className="grid grid-cols-2 gap-2">
          <Card testId="current-card" onClick={() => toggle("current")}>
            <span className="block text-sm text-muted-foreground">{t.currentRun}</span>
            <span className="block text-2xl font-semibold tabular-nums">
              <span data-testid="current-run">{st.current}</span> {t.runUnit(st.current)}
            </span>
          </Card>
          <Card testId="best-card" onClick={() => toggle("best")}>
            <span className="block text-sm text-muted-foreground">{t.bestRun}</span>
            <span className="block text-2xl font-semibold tabular-nums">
              <span data-testid="best-run">{st.best}</span> {t.runUnit(st.best)}
            </span>
          </Card>
        </div>
        {(open === "current" || open === "best") && (
          <p data-testid={`formula-${open}`} className="text-sm text-muted-foreground">
            {open === "current" ? t.currentFormula : t.bestFormula}
          </p>
        )}
        <p className="text-xs text-muted-foreground">{t.tapForFormula}</p>

        <div role="group" aria-label={t.tilesLabel} data-testid="tiles" className="grid grid-cols-3 gap-2">
          <Card testId="tile-money" onClick={() => toggle("money")}>
            <span className="block text-xs text-muted-foreground">{t.tileMoney}</span>
            <span className="block text-base font-semibold tabular-nums">{hasRate ? fmtMoney(money) : "–"}</span>
          </Card>
          <Card testId="tile-units" onClick={() => toggle("units")}>
            <span className="block break-words text-xs text-muted-foreground first-letter:uppercase">{t.tileUnits(unit.many)}</span>
            <span className="block text-base font-semibold tabular-nums">{hasRate ? units : "–"}</span>
          </Card>
          <Card testId="tile-price" onClick={() => toggle("price")}>
            <span className="block break-words text-xs text-muted-foreground">{t.tilePrice(unit.one)}</span>
            <span className="block text-base font-semibold tabular-nums">{fmtMoney(setup.price)}</span>
          </Card>
        </div>
        {open === "money" && (
          <p data-testid="formula-money" className="text-sm text-muted-foreground">
            {hasRate ? t.tileMoneyFormula(fmtMoney(perDay), st.total, fmtMoney(spent), fmtMoney(money)) : t.tileNeeds}
          </p>
        )}
        {open === "units" && (
          <p data-testid="formula-units" className="text-sm text-muted-foreground">
            {hasRate ? t.tileUnitsFormula(setup.perDay, st.total, units, unit.many) : t.tileNeeds}
          </p>
        )}
        {open === "price" && (
          <div data-testid="formula-price" className="text-sm text-muted-foreground">
            <p>{setup.priceOwn ? t.priceOwn : t.tilePriceNote}</p>
            {!setup.priceOwn && <SourceTap refs={unit.priceRefs} />}
          </div>
        )}
      </section>

      {slipForm ? (
        <section data-testid="slip-form" className="flex flex-col gap-2 rounded-lg border border-border bg-card p-3">
          <h2 className="text-base font-semibold">{t.slipTitle}</h2>
          <p className="text-sm text-muted-foreground">{t.slipLine}</p>
          <label className="flex min-h-11 items-center justify-between gap-3 text-sm">
            <span>{t.slipDay}</span>
            <input
              type="date"
              data-testid="slip-day"
              value={slipForm.day}
              min={startKey}
              max={today}
              onChange={(e) => e.target.value && setSlipForm({ ...slipForm, day: e.target.value })}
              className="min-h-11 rounded-md border border-border bg-background px-2"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span>{t.slipNote}</span>
            <textarea
              data-testid="slip-note"
              rows={3}
              placeholder={t.slipNoteHint}
              value={slipForm.note}
              onChange={(e) => setSlipForm({ ...slipForm, note: e.target.value })}
              className="rounded-md border border-border bg-background px-2 py-2"
            />
          </label>
          <PrimaryButton testId="slip-save" onClick={() => onSlipSaved(slipForm.day, slipForm.note.trim())}>
            {t.slipSave}
          </PrimaryButton>
          <button type="button" data-testid="slip-cancel" onClick={() => setSlipForm(null)} className="inline-flex min-h-11 items-center justify-center text-sm text-muted-foreground underline">
            {t.slipCancel}
          </button>
        </section>
      ) : (
        <>
          <button
            type="button"
            data-testid="slip-open"
            onClick={() => openSlip(today)}
            className="inline-flex min-h-12 w-full items-center justify-center rounded-md border border-border bg-card px-4 text-base"
          >
            {t.slipBtn}
          </button>
          {slipDone && (
            <p data-testid="slip-done" className="text-sm text-muted-foreground">
              {t.slipDone}
            </p>
          )}
        </>
      )}

      <section data-testid="stretches" className="flex flex-col gap-2">
        <h2 className="text-base font-semibold">{t.stretchesTitle}</h2>
        <p className="text-sm text-muted-foreground">{t.stretchesLine}</p>
        <ul className="flex flex-col gap-2">
          {[...st.stretches].reverse().map((s) => (
            <li key={s.endedBy ? s.endedBy.day : "running"} data-testid={s.endedBy ? "stretch" : "stretch-running"} className="rounded-lg border border-border bg-card p-3 text-sm">
              <div className="flex items-baseline justify-between gap-2">
                <span className="font-semibold tabular-nums">{t.stretchLength(s.length)}</span>
                <span className="text-muted-foreground">{s.endedBy ? (s.length > 0 ? t.stretchRange(fmtDay(s.from), fmtDay(s.to)) : t.stretchEmpty) : t.stretchRunning}</span>
              </div>
              {s.endedBy && (
                <p className="mt-1 text-muted-foreground">
                  {t.slipOn(fmtDay(s.endedBy.day))}
                  {": "}
                  <span data-testid="stretch-note">{s.endedBy.note || t.noNote}</span>
                </p>
              )}
            </li>
          ))}
        </ul>
      </section>
    </>
  )
}

function Money(p: MainProps & { today: string; startKey: string; perDay: number; total: number; money: number }) {
  const { setup, unit, slips, spends, targets, today, startKey, perDay, money } = p
  const [period, setPeriod] = useState(0)
  const [edit, setEdit] = useState<{ perDay: number; price: number } | null>(null)
  const [spend, setSpend] = useState<{ amount: number; note: string }>({ amount: NaN, note: "" })
  const [target, setTarget] = useState<{ name: string; price: number }>({ name: "", price: NaN })
  const [openDays, setOpenDays] = useState<string | null>(null)
  const pm = periodMoney(PERIOD_DAYS[period], startKey, today, slips, spends, perDay)
  const hasRate = setup.perDay > 0
  const filled = fillTargets(targets, money, perDay)
  const saveEdit = () => {
    if (!edit) return
    const price = Number.isFinite(edit.price) ? edit.price : setup.price
    p.setSetup({ ...setup, perDay: Number.isFinite(edit.perDay) ? edit.perDay : 0, price, priceOwn: price !== unit.defaultPriceUsd ? 1 : 0 })
    setEdit(null)
  }
  return (
    <section data-testid="money" className="flex flex-col gap-4">
      <h2 className="text-lg font-semibold">{t.moneyTitle}</h2>
      <Tabs id="period" items={t.periods} value={period} onChange={setPeriod} scroll />
      <Card className="text-center">
        <span data-testid="money-total" className="block text-4xl font-semibold tabular-nums">
          {hasRate ? fmtMoney(pm.money) : "–"}
        </span>
        <span className="block text-sm text-muted-foreground">{t.periodCaption(period)}</span>
      </Card>
      <p data-testid="money-formula" className="rounded-md border border-border bg-card px-3 py-2 text-sm">
        <span className="block text-xs text-muted-foreground">{t.formulaLabel}</span>
        {hasRate ? t.periodFormula(fmtMoney(perDay), pm.clear, fmtMoney(pm.spent), fmtMoney(pm.money)) : t.perDayEmpty}
      </p>

      <Card>
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <span className="block text-xs text-muted-foreground">{t.perDayLabel}</span>
            <span data-testid="per-day" className="block text-base font-semibold">
              {hasRate ? t.perDayShown(fmtMoney(perDay), setup.perDay, unit.many, fmtMoney(setup.price)) : t.perDayEmpty}
            </span>
          </div>
          <button
            type="button"
            data-testid="per-day-edit"
            aria-label={t.editPerDay}
            onClick={() => setEdit({ perDay: setup.perDay || NaN, price: setup.price })}
            className="inline-flex size-11 shrink-0 items-center justify-center rounded-full border border-border bg-card"
          >
            {"✎"}
          </button>
        </div>
        {edit && (
          <div data-testid="per-day-form" className="mt-2 flex flex-col gap-1">
            <NumField label={t.editUnits} value={edit.perDay} testId="edit-perday" step={1} onChange={(n) => setEdit({ ...edit, perDay: n })} />
            <NumField label={t.editPrice} value={edit.price} testId="edit-price" step={0.01} onChange={(n) => setEdit({ ...edit, price: n })} />
            <div className="flex gap-2">
              <PrimaryButton testId="edit-save" onClick={saveEdit}>
                {t.editSave}
              </PrimaryButton>
              <button type="button" data-testid="edit-cancel" onClick={() => setEdit(null)} className="inline-flex min-h-12 shrink-0 items-center rounded-md border border-border px-4">
                {t.editCancel}
              </button>
            </div>
          </div>
        )}
      </Card>

      {hasRate && (
        <section data-testid="projections" className="flex flex-col gap-2">
          <h3 className="text-base font-semibold">{t.projTitle}</h3>
          <div className="grid grid-cols-2 gap-2">
            <Card>
              <span className="block text-xs text-muted-foreground">{t.projMonth}</span>
              <span data-testid="proj-month" className="block text-base font-semibold tabular-nums">
                {fmtMoney(Math.round(((perDay * 365) / 12) * 100) / 100)}
              </span>
            </Card>
            <Card>
              <span className="block text-xs text-muted-foreground">{t.projYear}</span>
              <span data-testid="proj-year" className="block text-base font-semibold tabular-nums">
                {fmtMoney(Math.round(perDay * 365 * 100) / 100)}
              </span>
            </Card>
          </div>
          <p className="text-xs text-muted-foreground">{t.projMonthFormula(fmtMoney(perDay), fmtMoney(Math.round(((perDay * 365) / 12) * 100) / 100))}</p>
          <p className="text-xs text-muted-foreground">{t.projYearFormula(fmtMoney(perDay), fmtMoney(Math.round(perDay * 365 * 100) / 100))}</p>
        </section>
      )}

      <section data-testid="spending" className="flex flex-col gap-2">
        <h3 className="text-base font-semibold">{t.spentTitle}</h3>
        <p className="text-sm text-muted-foreground">{t.spentLine}</p>
        {spends.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t.spentNone}</p>
        ) : (
          <ul className="flex flex-col gap-1">
            {spends.map((s) => (
              <li key={s.id} data-testid="spend-row" className="flex items-center justify-between gap-2 rounded-md border border-border bg-card px-3 text-sm">
                <span className="min-w-0 truncate">
                  {fmtDay(s.day)} {s.note}
                </span>
                <span className="tabular-nums">{fmtMoney(s.amount)}</span>
                <button type="button" data-testid="spend-remove" onClick={() => p.setSpends(spends.filter((x) => x.id !== s.id))} className="inline-flex min-h-11 items-center text-muted-foreground underline">
                  {t.spentRemove}
                </button>
              </li>
            ))}
          </ul>
        )}
        <NumField label={t.spentAmount} value={spend.amount} testId="spend-amount" step={0.01} onChange={(n) => setSpend({ ...spend, amount: n })} />
        <label className="flex min-h-11 items-center justify-between gap-3 text-sm">
          <span>{t.spentNote}</span>
          <input data-testid="spend-note" value={spend.note} onChange={(e) => setSpend({ ...spend, note: e.target.value })} className="min-h-11 w-40 rounded-md border border-border bg-background px-2" />
        </label>
        <PrimaryButton
          testId="spend-add"
          disabled={!Number.isFinite(spend.amount) || spend.amount <= 0}
          onClick={() => {
            p.setSpends([...spends, { id: `s${Date.now()}`, day: today, amount: spend.amount, note: spend.note.trim() }])
            setSpend({ amount: NaN, note: "" })
          }}
        >
          {t.spentSave}
        </PrimaryButton>
      </section>

      <section data-testid="targets" className="flex flex-col gap-2">
        <h3 className="text-base font-semibold">{t.targetsTitle}</h3>
        <p className="text-sm text-muted-foreground">{t.targetsLine}</p>
        {targets.length === 0 && <p className="text-sm text-muted-foreground">{t.targetNone}</p>}
        <ul className="flex flex-col gap-2">
          {filled.map((f, i) => (
            <li key={f.target.id} data-testid="target-row" className="rounded-lg border border-border bg-card p-3 text-sm">
              <div className="flex items-center justify-between gap-2">
                <span className="min-w-0 truncate font-semibold">{f.target.name || `#${i + 1}`}</span>
                <span className="tabular-nums text-muted-foreground">{t.funded(fmtMoney(f.funded), fmtMoney(f.target.price))}</span>
              </div>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-border" role="progressbar" aria-valuenow={Math.round((f.funded / Math.max(1, f.target.price)) * 100)} aria-valuemin={0} aria-valuemax={100}>
                <div className="h-full bg-primary" style={{ width: `${Math.min(100, (f.funded / Math.max(1, f.target.price)) * 100)}%` }} />
              </div>
              <button type="button" data-testid="target-togo" onClick={() => setOpenDays(openDays === f.target.id ? null : f.target.id)} className="mt-1 inline-flex min-h-11 items-center text-left text-muted-foreground">
                {f.done ? t.reachedTarget : f.daysToGo === null ? t.noRate : t.daysToGo(f.daysToGo)}
              </button>
              {openDays === f.target.id && !f.done && f.daysToGo !== null && (
                <p data-testid="target-formula" className="text-xs text-muted-foreground">
                  {t.daysToGoFormula(fmtMoney(f.missing), fmtMoney(perDay))}
                </p>
              )}
              <button type="button" data-testid="target-remove" onClick={() => p.setTargets(targets.filter((x) => x.id !== f.target.id))} className="ml-3 inline-flex min-h-11 items-center text-muted-foreground underline">
                {t.targetRemove}
              </button>
            </li>
          ))}
        </ul>
        <label className="flex min-h-11 items-center justify-between gap-3 text-sm">
          <span>{t.targetName}</span>
          <input data-testid="target-name" value={target.name} onChange={(e) => setTarget({ ...target, name: e.target.value })} className="min-h-11 w-40 rounded-md border border-border bg-background px-2" />
        </label>
        <NumField label={t.targetPrice} value={target.price} testId="target-price" step={1} onChange={(n) => setTarget({ ...target, price: n })} />
        <PrimaryButton
          testId="target-add"
          disabled={!Number.isFinite(target.price) || target.price <= 0}
          onClick={() => {
            p.setTargets([...targets, { id: `t${Date.now()}`, name: target.name.trim(), price: target.price }])
            setTarget({ name: "", price: NaN })
          }}
        >
          {t.targetAdd}
        </PrimaryButton>
      </section>
    </section>
  )
}

function Milestones({ setup, slips, spends, today, startKey, perDay, money }: MainProps & { today: string; startKey: string; perDay: number; money: number }) {
  const days = dayMilestones(clearDayKeys(startKey, today, slips))
  const cash = moneyMilestones(startKey, today, slips, spends, perDay, money)
  const rows = (steps: typeof days, label: (n: number) => string, togo: (n: number) => string, id: string) => (
    <ul className="flex flex-col gap-2">
      {steps.map((s) => (
        <li key={s.threshold} data-testid={`${id}-step`} data-reached={s.date ? "1" : "0"} className={`flex items-center justify-between gap-2 rounded-lg border border-border px-3 py-2 text-sm ${s.date ? "bg-card" : "text-muted-foreground"}`}>
          <span className="font-semibold tabular-nums">{label(s.threshold)}</span>
          <span data-testid={`${id}-step-note`}>{s.date ? t.reachedOn(fmtDay(s.date)) : s.toGo === null ? t.noRateMilestone : togo(s.toGo)}</span>
        </li>
      ))}
    </ul>
  )
  return (
    <section data-testid="milestones" className="flex flex-col gap-4">
      <h2 className="text-lg font-semibold">{t.milestonesTitle}</h2>
      <p className="text-sm text-muted-foreground">{t.milestonesLine}</p>
      <h3 className="text-base font-semibold">{t.daysLadder}</h3>
      {rows(days, t.stepDays, t.toGoDays, "day")}
      <h3 className="text-base font-semibold">{t.moneyLadder}</h3>
      {setup.perDay > 0 ? rows(cash, t.stepMoney, t.toGoRate, "money") : <p className="text-sm text-muted-foreground">{t.perDayEmpty}</p>}
    </section>
  )
}

function Calendar({ slips, today, startKey, openSlip }: { slips: Slip[]; today: string; startKey: string; openSlip: (day: string) => void }) {
  const [y0, m0] = today.split("-").map(Number)
  const [ym, setYm] = useState({ y: y0, m: m0 - 1 })
  const [pick, setPick] = useState<string | null>(null)
  const shift = (n: number) => {
    const d = new Date(ym.y, ym.m + n, 1)
    setYm({ y: d.getFullYear(), m: d.getMonth() })
  }
  const style: Record<string, string> = {
    clear: "border-primary/40 bg-primary/20",
    slip: "border-dashed border-muted-foreground bg-muted",
    today: "border-primary border-dashed",
    outside: "border-transparent text-muted-foreground/50",
  }
  const pickState = pick ? cellState(pick, startKey, today, slips) : null
  const note = pick ? slips.find((s) => s.day === pick)?.note : ""
  return (
    <section data-testid="calendar" className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <button type="button" data-testid="cal-prev" aria-label={t.prevMonth} onClick={() => shift(-1)} className="inline-flex size-11 items-center justify-center rounded-full border border-border bg-card">
          {"‹"}
        </button>
        <h2 data-testid="cal-month" className="flex-1 text-center text-lg font-semibold">
          {t.months[ym.m]} {ym.y}
        </h2>
        <button type="button" data-testid="cal-next" aria-label={t.nextMonth} onClick={() => shift(1)} className="inline-flex size-11 items-center justify-center rounded-full border border-border bg-card">
          {"›"}
        </button>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center text-xs text-muted-foreground">
        {t.weekdays.map((w) => (
          <span key={w}>{w}</span>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {monthGrid(ym.y, ym.m)
          .flat()
          .map((k, i) =>
            k === null ? (
              <span key={`e${i}`} />
            ) : (
              <button
                key={k}
                type="button"
                data-testid={`day-${k}`}
                data-state={cellState(k, startKey, today, slips)}
                onClick={() => setPick(k)}
                className={`flex min-h-11 items-center justify-center rounded-md border text-sm tabular-nums ${style[cellState(k, startKey, today, slips)]} ${pick === k ? "ring-2 ring-foreground" : ""}`}
              >
                {Number(k.slice(8))}
              </button>
            ),
          )}
      </div>
      <ul className="flex flex-wrap gap-3 text-xs text-muted-foreground">
        {(
          [
            ["clear", t.legendClear],
            ["slip", t.legendSlip],
            ["today", t.legendToday],
          ] as const
        ).map(([s, label]) => (
          <li key={s} className="flex items-center gap-1">
            <span className={`inline-block size-4 rounded border ${style[s]}`} />
            {label}
          </li>
        ))}
      </ul>
      {pick && pickState && (
        <div data-testid="day-detail" className="rounded-lg border border-border bg-card p-3 text-sm">
          <p className="font-semibold">{fmtDay(pick)}</p>
          <p className="text-muted-foreground">{pickState === "clear" ? t.dayClear : pickState === "slip" ? t.daySlip : pickState === "today" ? t.dayToday : t.dayOutside}</p>
          {pickState === "slip" && note && <p>{note}</p>}
          {pickState !== "outside" && pickState !== "slip" && (
            <button type="button" data-testid="day-log-slip" onClick={() => openSlip(pick)} className="mt-1 inline-flex min-h-11 items-center underline">
              {t.dayLogSlip}
            </button>
          )}
        </div>
      )}
    </section>
  )
}
