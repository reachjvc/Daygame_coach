"use client"

import { useState } from "react"
import { Chips } from "../../components/kit"
import { amountPerDay, fmtMoney } from "../../money"
import { MAX_PER_DAY, MAX_PRICE, parseTyped } from "../date/logic"
import { dateText } from "../date/text"
import type { RecordCtx } from "./ctx"
import { fmtShort } from "./fmt"
import { PERIODS, dayKeyOf, daysText, moneyFor, type PeriodId, moneyRuns } from "./logic"
import { SpendBlock, TargetsBlock } from "./MoneyLists"
import { recordText as t } from "./text"

/** Count and price of one: the same two fields as Your quit date, saved to the same record. */
function AmountForm({ ctx, onDone }: { ctx: RecordCtx; onDone: (saved: boolean) => void }) {
  const [unitId, setUnitId] = useState<string | null>(ctx.unit?.id ?? null)
  const [perDay, setPerDay] = useState(ctx.unit?.perDay === null || ctx.unit === null ? "" : String(ctx.unit?.perDay))
  const [price, setPrice] = useState(ctx.unit ? String(ctx.unit.priceUsd) : "")
  const [tried, setTried] = useState(false)
  const unit = ctx.units.find((u) => u.id === unitId) ?? null
  const count = parseTyped(perDay, MAX_PER_DAY)
  const priceP = parseTyped(price, MAX_PRICE)
  const bad = count.kind === "bad" || priceP.kind === "bad"
  const save = () => {
    setTried(true)
    if (!unit || bad) return
    const priceUsd = priceP.kind === "ok" ? priceP.value : (unit.defaultPriceUsd ?? 0)
    ctx.actions.saveUnit({ id: unit.id, perDay: count.kind === "ok" ? count.value : null, priceUsd, priceBasis: priceUsd !== unit.defaultPriceUsd ? "typed" : "default" })
    onDone(true)
  }
  return (
    <form
      data-testid="amount-form"
      className="flex flex-col gap-3 rounded-lg border border-border bg-card p-3"
      onSubmit={(e) => {
        e.preventDefault()
        save()
      }}
    >
      {!ctx.unit && (
        <Chips
          label={dateText.useTitle}
          options={ctx.units.map((u) => ({ id: u.id, label: dateText.useUnits[u.id] ?? u.many }))}
          value={unitId ? [unitId] : []}
          onChange={(next) => {
            const u = ctx.units.find((x) => x.id === next[0])
            setUnitId(next[0])
            setPrice(String(u?.defaultPriceUsd ?? ""))
          }}
        />
      )}
      {unit && (
        <>
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium">{dateText.perDayLabel(unit.many)}</span>
            <input type="text" inputMode="decimal" data-testid="amount-perday" value={perDay} maxLength={8} onChange={(e) => setPerDay(e.target.value)} className="min-h-12 w-full rounded-md border border-border bg-background px-3 text-base" />
            <span className="text-muted-foreground">{dateText.perDayHelp}</span>
            {count.kind === "bad" && (
              <span data-testid="amount-error-perday" role="alert">
                {t.badNumber}
              </span>
            )}
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium">{dateText.priceLabel(unit.one)}</span>
            <input type="text" inputMode="decimal" data-testid="amount-price" value={price} maxLength={8} onChange={(e) => setPrice(e.target.value)} className="min-h-12 w-full rounded-md border border-border bg-background px-3 text-base" />
            <span className="break-words text-muted-foreground">{dateText.priceBasis[unit.id] ?? ""}</span>
            {priceP.kind === "bad" && (
              <span data-testid="amount-error-price" role="alert">
                {t.badNumber}
              </span>
            )}
          </label>
        </>
      )}
      <div className="flex gap-2">
        <button type="submit" data-testid="amount-save" disabled={!unit || (tried && bad)} className="inline-flex min-h-12 flex-1 items-center justify-center rounded-md bg-primary px-4 font-medium text-primary-foreground disabled:opacity-40">
          {t.save}
        </button>
        <button type="button" data-testid="amount-cancel" onClick={() => onDone(false)} className="inline-flex min-h-12 items-center justify-center rounded-md border border-border px-4">
          {t.cancel}
        </button>
      </div>
    </form>
  )
}

export function MoneyTab({ ctx }: { ctx: RecordCtx }) {
  const [period, setPeriod] = useState<PeriodId>("total")
  const [editing, setEditing] = useState(false)
  const [saved, setSaved] = useState(false)
  const { unit, unitData, nowMs, today } = ctx
  const days = PERIODS.find((p) => p.id === period)?.days ?? null
  const runs = moneyRuns(ctx.view.runs)
  const pm = moneyFor(runs, unit, ctx.spends, nowMs, days)
  const rate = amountPerDay(unit?.perDay, unit?.priceUsd)
  const many = unitData?.many ?? ""
  const thisYear = Number(today.slice(0, 4))
  const fromLabel = days === null ? (ctx.view.runs.length > 0 ? fmtShort(ctx.view.runs[0].start, thisYear) : "") : fmtShort(dayKeyOf(pm.fromMs), thisYear)
  const formula =
    pm.money !== null && unit && unit.perDay !== null ? t.moneyFormula(unit.perDay, fmtMoney(unit.priceUsd), daysText(pm.cleanDays), fmtMoney(pm.spent), fmtMoney(pm.money)) : ""
  const monthly = rate === null ? null : Math.round(((rate * 365) / 12) * 100) / 100
  const yearly = rate === null ? null : Math.round(rate * 365 * 100) / 100

  return (
    <div className="flex flex-col gap-5">
      <section aria-label={t.moneyTitle} className="flex flex-col gap-3">
        <div role="tablist" aria-label={t.periodsLabel} className="grid grid-cols-4 gap-1 rounded-lg bg-muted p-1">
          {PERIODS.map((p) => (
            <button
              key={p.id}
              type="button"
              role="tab"
              aria-selected={period === p.id}
              data-testid={`period-${p.id}`}
              onClick={() => setPeriod(p.id)}
              className={`min-h-11 rounded-md px-1 text-sm leading-tight ${period === p.id ? "bg-card font-semibold shadow-sm" : "text-muted-foreground"}`}
            >
              {t.periods[p.id]}
            </button>
          ))}
        </div>
        <div className="rounded-lg border border-border bg-card p-4 text-center">
          <p data-testid="money-total" className="break-words text-4xl font-semibold tabular-nums">
            {pm.money === null ? t.tileDash : fmtMoney(pm.money)}
          </p>
          {pm.money !== null && pm.money < 0 && (
            <p data-testid="money-negative" className="mt-1 text-sm text-muted-foreground">
              {t.negativeLine}
            </p>
          )}
          {pm.money !== null ? (
            <p data-testid="money-formula" className="mt-2 break-words text-sm text-muted-foreground">
              {formula}
            </p>
          ) : (
            <button type="button" onClick={() => setEditing(true)} className="mt-1 inline-flex min-h-11 items-center text-primary underline">
              {t.addNumbers}
            </button>
          )}
          {fromLabel && <p className="mt-1 break-words text-sm text-muted-foreground">{t.periodBasis(fromLabel)}</p>}
        </div>
      </section>

      <section aria-label={t.amountTitle} className="flex flex-col gap-2">
        <h2 className="text-lg font-semibold">{t.amountTitle}</h2>
        {unit && unit.perDay !== null && rate !== null ? (
          <p data-testid="amount-line" className="break-words text-base">
            {t.amountLine(unit.perDay, unit.perDay === 1 ? (unitData?.one ?? many) : many, fmtMoney(unit.priceUsd), fmtMoney(rate))}
          </p>
        ) : unit ? (
          <p data-testid="amount-line" className="break-words text-base text-muted-foreground">
            {t.tileDash}
          </p>
        ) : null}
        {saved && !editing && (
          <p role="status" data-testid="amount-saved" className="text-sm text-muted-foreground">
            {t.saved} {t.savedNote}
          </p>
        )}
        {editing ? (
          <AmountForm
            ctx={ctx}
            onDone={(ok) => {
              setEditing(false)
              setSaved(ok)
            }}
          />
        ) : (
          !ctx.readOnly && (
            <button type="button" data-testid={unit && unit.perDay !== null ? "amount-change" : "amount-add"} onClick={() => setEditing(true)} className="inline-flex min-h-11 items-center self-start rounded-md border border-border px-4 font-medium">
              {unit ? t.change : t.addNumbersTitle}
            </button>
          )
        )}
        {rate !== null && monthly !== null && yearly !== null && (
          <div className="flex flex-col gap-1 rounded-lg border border-border bg-card p-3 text-sm">
            <p className="font-medium">{t.projTitle}</p>
            <p data-testid="proj-month" className="break-words text-muted-foreground">
              {t.perMonth(fmtMoney(monthly), fmtMoney(rate))}
            </p>
            <p data-testid="proj-year" className="break-words text-muted-foreground">
              {t.perYear(fmtMoney(yearly), fmtMoney(rate))}
            </p>
          </div>
        )}
      </section>

      <SpendBlock ctx={ctx} />
      <TargetsBlock ctx={ctx} />
      <p className="text-sm text-muted-foreground">{t.phoneNote}</p>
    </div>
  )
}
