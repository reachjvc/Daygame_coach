"use client"

import { useState } from "react"
import Link from "next/link"
import { addDays } from "../../record"
import { isLiveTool } from "../../menu"
import { amountPerDay, dayStartMs, fmtMoney, unitsNotUsed } from "../../money"
import { dateText } from "../date/text"
import type { RecordCtx } from "./ctx"
import { fmtDay, fmtShort } from "./fmt"
import { daysText, moneyFor, nextDayStep, ringFill, splitElapsed, moneyRuns } from "./logic"
import { recordText as t } from "./text"

const R = 88
const CIRC = 2 * Math.PI * R

/** The ring: total clean days inside, filling toward the next step; one dot runs round it once a minute while a run lives. */
function Ring({ total, running }: { total: number; running: boolean }) {
  const next = nextDayStep(total)
  const fill = ringFill(total)
  return (
    <div data-testid="ring" data-total={total} className="relative mx-auto size-[200px]" role="img" aria-label={t.ringLabel(total)}>
      <svg viewBox="0 0 200 200" className="absolute inset-0 size-full -rotate-90" aria-hidden="true">
        <circle cx="100" cy="100" r={R} fill="none" strokeWidth="12" className="stroke-muted" />
        <circle cx="100" cy="100" r={R} fill="none" strokeWidth="12" strokeLinecap="round" className="stroke-primary" strokeDasharray={CIRC} strokeDashoffset={CIRC * (1 - fill)} />
      </svg>
      {running && (
        <div data-testid="ring-dot" aria-hidden="true" className="absolute inset-0 animate-[spin_60s_linear_infinite] motion-reduce:animate-none">
          <span className="absolute left-1/2 top-[6px] size-3 -translate-x-1/2 rounded-full bg-foreground" />
        </div>
      )}
      <div className="absolute inset-0 flex flex-col items-center justify-center px-8 text-center">
        <span data-testid="ring-total" className="text-5xl font-semibold tabular-nums leading-none">
          {total}
        </span>
        <span className="mt-1 text-sm text-muted-foreground">{t.ringCaption}</span>
        <span data-testid="ring-step" className="mt-1 text-sm tabular-nums text-muted-foreground">
          {next === null ? t.ringAllDone : t.ringOf(total, next)}
        </span>
      </div>
    </div>
  )
}

/** A card or tile that opens its formula line when tapped. */
function Tile({ id, label, value, sub, open, onToggle, children }: { id: string; label: string; value: string; sub?: string; open: boolean; onToggle: () => void; children?: React.ReactNode }) {
  return (
    <div data-testid={`tile-${id}`} className="rounded-lg border border-border bg-card">
      <button type="button" aria-expanded={open} onClick={onToggle} className="flex min-h-16 w-full flex-col items-start justify-center gap-0.5 p-3 text-left">
        <span className="text-sm text-muted-foreground">{label}</span>
        <span data-testid={`tile-${id}-value`} className="break-words text-2xl font-semibold tabular-nums">
          {value}
        </span>
        {sub && <span className="break-words text-sm text-muted-foreground">{sub}</span>}
      </button>
      {open && (
        <div data-testid={`tile-${id}-formula`} className="break-words border-t border-border p-3 text-sm text-muted-foreground">
          {children}
        </div>
      )}
    </div>
  )
}

export function HomeTab({ ctx }: { ctx: RecordCtx }) {
  const { view, today, nowMs, unit, unitData, record } = ctx
  const [openCard, setOpenCard] = useState<string | null>(null)
  const [counterOpen, setCounterOpen] = useState(false)
  const toggleCard = (id: string) => setOpenCard((c) => (c === id ? null : id))
  const live = view.runs.find((r) => r.live) ?? null
  const thisYear = Number(today.slice(0, 4))
  const runs = moneyRuns(view.runs)
  const pm = moneyFor(runs, unit, ctx.spends, nowMs, null)
  const rate = amountPerDay(unit?.perDay, unit?.priceUsd)
  const units = unit ? unitsNotUsed(runs, nowMs, unit.perDay) : null
  const many = unitData?.many ?? ""
  const hasNumbers = pm.money !== null
  const slipOpen = isLiveTool("slip")
  const dateOpen = isLiveTool("date")
  const breakEnd = record.goal === "break" ? record.breakEnd : null
  const next = nextDayStep(view.total)
  const toGo = next === null ? 0 : next - view.total
  const elapsed = live ? splitElapsed(nowMs - dayStartMs(live.start)) : null
  const pad = (n: number) => String(n).padStart(2, "0")

  const moneyFormula =
    pm.money !== null && unit && unit.perDay !== null ? t.moneyFormula(unit.perDay, fmtMoney(unit.priceUsd), daysText(pm.cleanDays), fmtMoney(pm.spent), fmtMoney(pm.money)) : ""
  const unitsFormula = units !== null && unit && unit.perDay !== null ? t.unitsFormula(unit.perDay, daysText(pm.cleanDays), units, many) : ""

  return (
    <div className="flex flex-col gap-5">
      <section aria-label={t.tabs.home} className="flex flex-col gap-3">
        <Ring total={view.total} running={live !== null} />
        <p className="text-center text-sm text-muted-foreground">{t.ringBasis}</p>

        {live && elapsed ? (
          <div className="text-center">
            <button
              type="button"
              data-testid="counter"
              aria-expanded={counterOpen}
              onClick={() => setCounterOpen((o) => !o)}
              className="mx-auto flex min-h-11 flex-col items-center justify-center rounded-md px-3 py-1"
            >
              <span className="text-base tabular-nums">
                {t.counterLabel}: <span data-testid="counter-time">{`${elapsed.days} ${t.counterUnits.d} ${elapsed.hours} ${t.counterUnits.h} ${pad(elapsed.minutes)} ${t.counterUnits.m} ${pad(elapsed.seconds)} ${t.counterUnits.s}`}</span>
              </span>
              <span data-testid="counter-day" className="text-sm text-muted-foreground">
                {t.dayLine(live.days, fmtDay(live.start))}
              </span>
            </button>
            {counterOpen && (
              <p data-testid="counter-basis" className="text-sm text-muted-foreground">
                {t.counterTap}
              </p>
            )}
          </div>
        ) : (
          <p data-testid="no-run" className="break-words rounded-lg border border-border bg-card p-3 text-center text-base">
            {t.noRun(view.total)}{" "}
            {slipOpen ? (
              <Link href={ctx.carry(`/quit/${ctx.addiction}/slip`)} data-testid="slip-link" className="inline-flex min-h-11 items-center text-primary underline">
                {t.noRunLink}
              </Link>
            ) : (
              t.noRunPlain
            )}
          </p>
        )}

        {breakEnd &&
          (breakEnd > today ? (
            <p data-testid="break-line" className="text-center text-sm text-muted-foreground">
              {t.breakEnds(fmtDay(breakEnd))}
            </p>
          ) : (
            <p data-testid="break-line" className="text-center text-sm text-muted-foreground">
              {t.breakEnded(fmtDay(breakEnd))}{" "}
              {dateOpen && (
                <Link href={ctx.carry(`/quit/${ctx.addiction}/date`)} className="inline-flex min-h-11 items-center text-primary underline">
                  {t.breakToDate}
                </Link>
              )}
            </p>
          ))}
      </section>

      <section aria-label={t.cardRun} className="flex flex-col gap-2">
        <div className="grid grid-cols-3 gap-2">
          {(
            [
              ["run", t.cardRun, view.current],
              ["best", t.cardBest, view.best],
              ["close", t.cardClose, view.closeCalls],
            ] as const
          ).map(([id, label, n]) => (
            <button
              key={id}
              type="button"
              data-testid={`card-${id}`}
              aria-expanded={openCard === id}
              onClick={() => toggleCard(id)}
              className={`flex min-h-20 flex-col items-start justify-between gap-1 rounded-lg border p-3 text-left ${openCard === id ? "border-primary bg-primary/10" : "border-border bg-card"}`}
            >
              <span className="text-sm leading-tight text-muted-foreground">{label}</span>
              <span data-testid={`card-${id}-value`} className="text-2xl font-semibold tabular-nums">
                {n === null ? t.cardNone : n}
              </span>
            </button>
          ))}
        </div>
        {openCard && (openCard === "run" || openCard === "best" || openCard === "close") && (
          <p data-testid="card-formula" className="break-words rounded-lg border border-border bg-card p-3 text-sm text-muted-foreground">
            {openCard === "run" ? (view.current === null ? t.noRun(view.total) : t.cardRunBasis(view.current)) : openCard === "best" ? t.cardBestBasis(view.best) : t.cardCloseBasis(view.closeCalls)}
          </p>
        )}
      </section>

      <section aria-label={t.tileMoney} className="grid gap-2 sm:grid-cols-3">
        <Tile id="money" label={t.tileMoney} value={hasNumbers ? fmtMoney(pm.money as number) : t.tileDash} sub={hasNumbers ? (pm.money as number) < 0 ? t.negativeLine : undefined : undefined} open={openCard === "t-money"} onToggle={() => toggleCard("t-money")}>
          {hasNumbers ? (
            <>
              <span data-testid="money-formula">{moneyFormula}</span>
              <span className="mt-1 block">{t.cleanTimeLine}</span>
            </>
          ) : (
            <NeedNumbers ctx={ctx} />
          )}
        </Tile>
        <Tile id="units" label={unitData ? t.unitsTile(unitData.many, unitData.id) : t.unitsTileNone} value={units !== null ? String(units) : t.tileDash} open={openCard === "t-units"} onToggle={() => toggleCard("t-units")}>
          {units !== null ? <span data-testid="units-formula">{unitsFormula}</span> : <NeedNumbers ctx={ctx} />}
        </Tile>
        <Tile id="price" label={t.tilePrice} value={unit ? fmtMoney(unit.priceUsd) : t.tileDash} sub={unit ? (unit.priceBasis === "typed" ? t.priceOwn : (dateText.priceBasis[unit.id] ?? "")) : undefined} open={openCard === "t-price"} onToggle={() => toggleCard("t-price")}>
          {unit && rate !== null && unit.perDay !== null ? <span data-testid="price-formula">{`${unit.perDay} ${unit.perDay === 1 ? (unitData?.one ?? many) : many} × ${fmtMoney(unit.priceUsd)} = ${fmtMoney(rate)}`}</span> : <NeedNumbers ctx={ctx} />}
        </Tile>
        {!hasNumbers && (
          <button type="button" data-testid="add-numbers" onClick={() => ctx.openTab("money")} className="inline-flex min-h-11 items-center self-start text-primary underline sm:col-span-3">
            {t.addNumbers}
          </button>
        )}
      </section>

      <p data-testid="next-step" className="text-base">
        {next === null ? t.allSteps : live ? t.nextStep(next, fmtDay(addDays(today, toGo))) : t.nextStepNoRun(next, toGo)}
      </p>

      <section aria-label={t.runsTitle} className="flex flex-col gap-2">
        <h2 className="text-lg font-semibold">{t.runsTitle}</h2>
        <ul className="flex flex-col gap-2">
          {[...view.runs].reverse().map((r) => (
            <li key={r.id} data-testid="run-row" data-live={r.live ? "true" : "false"} className="break-words rounded-lg border border-border bg-card p-3">
              <p className="font-medium">{r.live ? t.runGoing(r.days, fmtShort(r.start, thisYear)) : t.runRange(r.days, fmtShort(r.start, thisYear), fmtShort(r.end ?? r.start, thisYear))}</p>
              {r.closeCalls.length > 0 && <p className="text-sm text-muted-foreground">{t.runClose(r.closeCalls.length)}</p>}
              {r.slip && (
                <p className="text-sm text-muted-foreground">
                  {t.runEnded(fmtShort(r.slip.day, thisYear))}
                  {r.slip.thought ? `: “${r.slip.thought}”` : ""}
                </p>
              )}
            </li>
          ))}
        </ul>
        <p className="text-sm text-muted-foreground">{t.runsLine}</p>
      </section>
    </div>
  )
}

/** Shown where a number needs the count a day and the price: one line and a way to the Money screen. */
function NeedNumbers({ ctx }: { ctx: RecordCtx }) {
  return (
    <button type="button" onClick={() => ctx.openTab("money")} className="inline-flex min-h-11 items-center text-primary underline">
      {t.addNumbers}
    </button>
  )
}
