"use client"

import { useState } from "react"
import { Chips } from "../../components/kit"
import { addDays } from "../../record"
import { amountPerDay, fmtMoney } from "../../money"
import { MAX_PER_DAY, MAX_PRICE } from "../date/logic"
import { dateText } from "../date/text"
import type { RecordCtx } from "./ctx"
import { fmtShort } from "./fmt"
import { PriceBasis } from "./Bits"
import { PERIODS, daysText, fmtCount, moneyFor, moneyRuns, parseAmount } from "./logic"
import { SpendBlock, TargetsBlock } from "./MoneyLists"
import { recordText as t } from "./text"

/** Count and price of one: the same two fields as Your quit date, saved to the same record. */
function AmountForm({ ctx }: { ctx: RecordCtx }) {
  const { ui } = ctx
  const [unitId, setUnitId] = useState<string | null>(ctx.unit?.id ?? null)
  const [perDay, setPerDay] = useState(ctx.unit?.perDay == null ? "" : fmtCount(ctx.unit.perDay))
  const [price, setPrice] = useState(ctx.unit ? String(ctx.unit.priceUsd) : "")
  const unit = ctx.units.find((u) => u.id === unitId) ?? null
  const count = parseAmount(perDay, MAX_PER_DAY)
  const priceP = parseAmount(price, MAX_PRICE)
  const countZero = count.kind === "ok" && count.value === 0
  const priceZero = priceP.kind === "ok" && priceP.value === 0
  const bad = count.kind === "bad" || count.kind === "big" || priceP.kind === "bad" || priceP.kind === "big" || countZero || priceZero
  const save = () => {
    if (!unit || bad) return
    const priceUsd = priceP.kind === "ok" ? priceP.value : (unit.defaultPriceUsd ?? 0)
    ctx.actions.saveUnit({ id: unit.id, perDay: count.kind === "ok" ? count.value : null, priceUsd, priceBasis: priceUsd !== unit.defaultPriceUsd ? "typed" : "default" })
    ui.setEditing(false)
    ui.setSaved(true)
  }
  return (
    <form
      data-testid="amount-form"
      className="flex flex-col gap-3 rounded-lg border border-border bg-card p-3"
      onSubmit={(e) => {
        e.preventDefault()
        ui.tap("amount-save", save)
      }}
    >
      {!ctx.unit && <p className="font-medium">{t.useQuestion}</p>}
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
            <input type="text" inputMode="decimal" data-testid="amount-perday" aria-invalid={count.kind === "bad" || count.kind === "big" || countZero} value={perDay} maxLength={8} onChange={(e) => setPerDay(e.target.value)} className="min-h-12 w-full rounded-md border border-border bg-background px-3 text-base" />
            <span className="text-muted-foreground">{dateText.perDayHelp}</span>
            <span className="text-muted-foreground">{t.perDayHint}</span>
            {(count.kind === "bad" || count.kind === "big" || countZero) && (
              <span data-testid="amount-error-perday" role="alert" className="font-medium text-destructive">
                {countZero ? t.aboveZeroCount : count.kind === "big" ? t.bigCount : t.badNumber}
              </span>
            )}
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium">{dateText.priceLabel(unit.one)}</span>
            <input type="text" inputMode="decimal" data-testid="amount-price" aria-invalid={priceP.kind === "bad" || priceP.kind === "big" || priceZero} value={price} maxLength={8} onChange={(e) => setPrice(e.target.value)} className="min-h-12 w-full rounded-md border border-border bg-background px-3 text-base" />
            <span className="break-words text-muted-foreground">
              <PriceBasis unitId={unit.id} typed={false} testId="form-price-basis" />
            </span>
            {(priceP.kind === "bad" || priceP.kind === "big" || priceZero) && (
              <span data-testid="amount-error-price" role="alert" className="font-medium text-destructive">
                {priceZero ? t.aboveZeroPrice : priceP.kind === "big" ? t.bigPrice : t.badNumber}
              </span>
            )}
          </label>
        </>
      )}
      <div className="flex gap-2">
        <button type="submit" data-testid="amount-save" disabled={!unit} className="inline-flex min-h-12 flex-1 items-center justify-center rounded-md bg-primary px-4 font-medium text-primary-foreground disabled:opacity-40">
          {t.save}
        </button>
        <button type="button" data-testid="amount-cancel" onClick={() => ui.setEditing(false)} className="inline-flex min-h-12 items-center justify-center rounded-md border border-border px-4">
          {t.cancel}
        </button>
      </div>
    </form>
  )
}

export function MoneyTab({ ctx }: { ctx: RecordCtx }) {
  const { ui, unit, unitData, nowMs, today } = ctx
  const days = PERIODS.find((p) => p.id === ui.period)?.days ?? null
  const runs = moneyRuns(ctx.view.runs)
  const pm = moneyFor(runs, unit, ctx.spends, nowMs, days)
  const rate = amountPerDay(unit?.perDay, unit?.priceUsd)
  const rateShown = rate === null ? null : Math.round(rate * 100) / 100
  const many = unitData?.many ?? ""
  const word = unit?.perDay === 1 ? (unitData?.one ?? many) : many
  const thisYear = Number(today.slice(0, 4))
  const fromLabel = days === null ? (ctx.view.runs.length > 0 ? fmtShort(ctx.view.runs[0].start, thisYear) : "") : fmtShort(addDays(today, -days), thisYear)
  const formula = pm.money !== null && unit && unit.perDay !== null ? t.moneyFormula(fmtCount(unit.perDay), word, fmtMoney(unit.priceUsd), daysText(pm.cleanDays), pm.spent !== 0 ? fmtMoney(pm.spent) : null, fmtMoney(pm.money)) : ""
  // The projections use the rate as it is shown (to the cent), so the shown sum is exact.
  const monthly = rateShown === null ? null : Math.round(((rateShown * 365) / 12) * 100) / 100
  const yearly = rateShown === null ? null : Math.round(rateShown * 365 * 100) / 100

  return (
    <div className="flex flex-col gap-5">
      <section aria-label={t.moneyTitle} className="flex flex-col gap-3">
        <div role="tablist" aria-label={t.periodsLabel} className="grid grid-cols-4 gap-1 rounded-lg bg-muted p-1">
          {PERIODS.map((p) => (
            <button
              key={p.id}
              type="button"
              role="tab"
              aria-selected={ui.period === p.id}
              data-testid={`period-${p.id}`}
              onClick={() => ui.setPeriod(p.id)}
              className={`min-h-11 rounded-md px-1 text-sm leading-tight ${ui.period === p.id ? "bg-card font-semibold shadow-sm" : "text-muted-foreground"}`}
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
          {pm.money !== null && (
            <>
              <p data-testid="money-formula" className="mt-2 break-words text-sm text-muted-foreground">
                {formula}
              </p>
              <p className="mt-1 break-words text-sm text-muted-foreground">{t.cleanTimeLine}</p>
            </>
          )}
          {days !== null && fromLabel && <p className="mt-1 break-words text-sm text-muted-foreground">{t.periodBasis(fromLabel)}</p>}
        </div>
      </section>

      <section aria-label={t.amountTitle} className="flex flex-col gap-2">
        <h2 className="text-lg font-semibold">{t.amountTitle}</h2>
        {unit && unit.perDay !== null && rateShown !== null ? (
          <p data-testid="amount-line" className="break-words text-base">
            {t.perDayLine(fmtCount(unit.perDay), word, fmtMoney(unit.priceUsd), fmtMoney(rateShown))}
          </p>
        ) : unit ? (
          <p data-testid="amount-line" className="break-words text-base text-muted-foreground">
            {t.tileDash}
          </p>
        ) : null}
        {ui.saved && !ui.editing && (
          <p role="status" data-testid="amount-saved" className="text-sm text-muted-foreground">
            {t.savedNote}
          </p>
        )}
        {ui.editing ? (
          <AmountForm ctx={ctx} />
        ) : (
          !ctx.readOnly && (
            <button
              type="button"
              data-testid={unit && unit.perDay !== null ? "amount-change" : "amount-add"}
              onClick={() => {
                ui.setSaved(false)
                ui.setEditing(true)
              }}
              className="inline-flex min-h-11 items-center self-start rounded-md border border-border px-4 font-medium"
            >
              {unit ? t.change : t.addNumbersTitle}
            </button>
          )
        )}
        {rateShown !== null && monthly !== null && yearly !== null && (
          <div className="flex flex-col gap-1 rounded-lg border border-border bg-card p-3 text-sm">
            <p className="font-medium">{t.projTitle}</p>
            <p data-testid="proj-month" className="break-words text-muted-foreground">
              {t.perMonth(fmtMoney(monthly), fmtMoney(rateShown))}
            </p>
            <p data-testid="proj-year" className="break-words text-muted-foreground">
              {t.perYear(fmtMoney(yearly), fmtMoney(rateShown))}
            </p>
          </div>
        )}
      </section>

      <SpendBlock ctx={ctx} />
      <TargetsBlock ctx={ctx} />
      {!ctx.readOnly && <p className="text-sm text-muted-foreground">{t.phoneNote}</p>}
    </div>
  )
}
