"use client"

import { Chips, ClearAnswers, OneQuestion, PrimaryButton, SourcesFold, Stepper } from "../../components/kit"
import { fill, tooltext as t } from "../../tooltext"
import type { QuitCostSwap, QuitUnit, ToolProps } from "../../types"
import { realRefs, uniqueRefs, usable } from "../common"
import { useDoneCount, useScreens, useStartCount, useToolState } from "../hooks"
import { NotReady } from "../NotReady"
import {
  amountOutOfRange,
  computeCost,
  defaultPerDay,
  EMPTY_COST,
  formatUsd,
  MAX_MINUTES,
  MAX_PER_DAY,
  MAX_PRICE,
  parseAmount,
  parseCost,
  pickCostSwap,
  type CostState,
} from "./logic"

/** What it costs you: a year and ten years in dollars (and hours). */
export function CostTool({ addiction, data }: ToolProps) {
  const units = usable<QuitUnit[]>(data.units)
  const swaps = usable<QuitCostSwap[]>(data.costSwaps)
  if (!units || units.length === 0) return <NotReady />
  return <Inner addiction={addiction} units={units} swaps={swaps ?? []} />
}

function Inner({ addiction, units, swaps }: { addiction: string; units: QuitUnit[]; swaps: QuitCostSwap[] }) {
  const { state, update, clear } = useToolState<CostState>(addiction, "cost", EMPTY_COST, parseCost)
  const hasMinutes = (u: QuitUnit | undefined) => u?.defaultMinutesPerUnit != null
  const unit = units.find((u) => u.id === state?.unit)
  const total = 3
  const { screen, go, back: goBack, reset, isResult } = useScreens((state?.done ?? 0) + 1, total, state !== null)
  const started = useStartCount(addiction, "cost")
  useDoneCount(addiction, "cost", state !== null && isResult)

  if (!state) return null
  const back = screen > 1 ? goBack : null
  const pass = (patch: Partial<CostState> = {}) => {
    update((s) => ({ ...s, ...patch, done: Math.max(s.done, screen) }))
    go(screen + 1)
  }

  if (isResult && unit && state.result) {
    const r = state.result
    const pick = pickCostSwap(r.yearUsd, swaps)
    return (
      <div data-testid="result" className="flex flex-col gap-4">
        <section className="rounded-lg border border-border bg-card p-4">
          <p className="text-sm text-muted-foreground">{t.cost.yearLabel}</p>
          <p data-testid="year-cost" className="text-4xl font-semibold text-primary">
            {formatUsd(r.yearUsd)}
          </p>
          <p className="mt-3 text-sm text-muted-foreground">{t.cost.tenYearLabel}</p>
          <p data-testid="ten-year-cost" className="text-3xl font-semibold">
            {formatUsd(r.tenYearUsd)}
          </p>
          {r.hoursYear !== null && <p className="mt-3 text-lg">{fill(t.cost.hoursLine, { n: Math.round(r.hoursYear) })}</p>}
          <p className="mt-3 text-sm text-muted-foreground">{t.cost.basis}</p>
        </section>
        {pick && (
          <p data-testid="cost-swap" className="text-lg">
            {pick.years === null
              ? fill(t.cost.swapNow, { text: pick.swap.text })
              : fill(t.cost.swapIn, { n: pick.years, text: pick.swap.text })}
          </p>
        )}
        <ClearAnswers
          onClear={() => {
            clear()
            reset()
          }}
        />
        <SourcesFold refs={uniqueRefs(realRefs(unit.priceRefs))} />
      </div>
    )
  }

  if (screen === 1 || !unit) {
    return (
      <>
        <OneQuestion step={1} total={total} onBack={null}>
          <p className="font-medium">{t.cost.unitQuestion}</p>
          <Chips
            label={t.cost.unitQuestion}
            options={units.map((u) => ({ id: u.id, label: u.many }))}
            value={state.unit ? [state.unit] : []}
            onChange={([id]) => {
              started()
              update((s) =>
                s.unit === id
                  ? s
                  : { ...s, unit: id, perDay: defaultPerDay(id), price: String(units.find((u) => u.id === id)?.defaultPriceUsd ?? ""), minutes: String(units.find((u) => u.id === id)?.defaultMinutesPerUnit ?? ""), result: null },
              )
            }}
          />
          <PrimaryButton testId="cost-continue" disabled={!state.unit} onClick={() => pass()}>
            {t.common.continue}
          </PrimaryButton>
        </OneQuestion>
        <SourcesFold refs={[]} />
      </>
    )
  }

  if (screen === 2) {
    return (
      <>
        <OneQuestion step={2} total={total} onBack={back}>
          <p className="font-medium">{`${t.cost.amountQuestion} ${unit.many}`}</p>
          <p className="text-sm text-muted-foreground">{t.cost.perDay}</p>
          <Stepper
            label={t.cost.perDay}
            value={state.perDay ?? defaultPerDay(unit.id)}
            min={0}
            max={MAX_PER_DAY}
            onChange={(n) => update((s) => ({ ...s, perDay: n }))}
          />
          <p className="text-sm text-muted-foreground">{t.cost.daysPerWeek}</p>
          <Stepper label={t.cost.daysPerWeek} value={state.daysPerWeek} min={1} max={7} onChange={(n) => update((s) => ({ ...s, daysPerWeek: n }))} />
          <PrimaryButton testId="cost-continue" onClick={() => pass({ perDay: state.perDay ?? defaultPerDay(unit.id) })}>
            {t.common.continue}
          </PrimaryButton>
        </OneQuestion>
        <SourcesFold refs={[]} />
      </>
    )
  }

  const price = parseAmount(state.price, 0, MAX_PRICE)
  const minutes = hasMinutes(unit) ? parseAmount(state.minutes, 0, MAX_MINUTES) : null
  const valid = price !== null && (!hasMinutes(unit) || minutes !== null)
  const priceBad = amountOutOfRange(state.price, 0, MAX_PRICE)
  const minutesBad = hasMinutes(unit) && amountOutOfRange(state.minutes, 0, MAX_MINUTES)
  const finish = () => {
    if (!valid) return
    pass({
      result: computeCost({
        perDay: state.perDay ?? defaultPerDay(unit.id),
        daysPerWeek: state.daysPerWeek,
        priceUsd: price ?? 0,
        minutesPerUnit: hasMinutes(unit) ? minutes : null,
      }),
    })
  }
  const onEnter = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault()
      finish()
    }
  }
  return (
    <>
      <OneQuestion step={3} total={total} onBack={back}>
        <label htmlFor="cost-price" className="font-medium">
          {fill(t.cost.priceQuestion, { unit: unit.one })}
        </label>
        <input
          id="cost-price"
          data-testid="cost-price"
          type="number"
          inputMode="decimal"
          min={0}
          max={MAX_PRICE}
          step={0.01}
          value={state.price}
          onChange={(e) => update((s) => ({ ...s, price: e.target.value }))}
          onKeyDown={onEnter}
          aria-invalid={priceBad || undefined}
          aria-describedby={priceBad ? "cost-price-error" : undefined}
          className="h-12 w-full rounded-md border border-border bg-card px-3 text-lg"
        />
        {priceBad && (
          <p id="cost-price-error" data-testid="cost-price-error" role="alert" className="text-sm text-destructive">
            {fill(t.cost.range, { min: 0, max: MAX_PRICE })}
          </p>
        )}
        {hasMinutes(unit) && (
          <>
            <label htmlFor="cost-minutes" className="font-medium">
              {fill(t.cost.minutesQuestion, { unit: unit.one })}
            </label>
            <input
              id="cost-minutes"
              data-testid="cost-minutes"
              type="number"
              inputMode="numeric"
              min={0}
              max={MAX_MINUTES}
              step={1}
              value={state.minutes}
              onChange={(e) => update((s) => ({ ...s, minutes: e.target.value }))}
              onKeyDown={onEnter}
              aria-invalid={minutesBad || undefined}
              aria-describedby={minutesBad ? "cost-minutes-error" : undefined}
              className="h-12 w-full rounded-md border border-border bg-card px-3 text-lg"
            />
            {minutesBad && (
              <p id="cost-minutes-error" data-testid="cost-minutes-error" role="alert" className="text-sm text-destructive">
                {fill(t.cost.range, { min: 0, max: MAX_MINUTES })}
              </p>
            )}
          </>
        )}
        <PrimaryButton testId="cost-continue" disabled={!valid} onClick={finish}>
          {t.common.done}
        </PrimaryButton>
      </OneQuestion>
      <SourcesFold refs={uniqueRefs(realRefs(unit.priceRefs))} />
    </>
  )
}
