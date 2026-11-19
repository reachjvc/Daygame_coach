"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Info } from "lucide-react"
import { addDays } from "../../record"
import { isLiveTool } from "../../menu"
import { amountPerDay, fmtMoney, unitsNotUsed } from "../../money"
import type { RecordCtx } from "./ctx"
import { PriceBasis } from "./Bits"
import { fmtDay, fmtShort } from "./fmt"
import { daysText, elapsedSince, fmtCount, moneyFor, moneyRuns, nextDayStep, ringFill, splitElapsed } from "./logic"
import { recordText as t } from "./text"

const R = 88
const CIRC = 2 * Math.PI * R

/** The ring: total clean days inside, filling toward the next step; one dot runs round it once a minute while a run lives. Tap for its basis. */
function Ring({ total, running, open, onToggle }: { total: number; running: boolean; open: boolean; onToggle: () => void }) {
  const next = nextDayStep(total)
  const fill = ringFill(total)
  return (
    <button type="button" data-testid="ring" data-total={total} aria-expanded={open} aria-label={t.ringLabel(total)} onClick={onToggle} className="relative mx-auto block size-[200px] rounded-full">
      <svg viewBox="0 0 200 200" className="absolute inset-0 size-full -rotate-90" aria-hidden="true">
        <circle cx="100" cy="100" r={R} fill="none" strokeWidth="12" className="stroke-muted" />
        <circle cx="100" cy="100" r={R} fill="none" strokeWidth="12" strokeLinecap="round" className="stroke-primary" strokeDasharray={CIRC} strokeDashoffset={CIRC * (1 - fill)} />
      </svg>
      {running && (
        <div data-testid="ring-dot" aria-hidden="true" className="absolute inset-0 animate-[spin_60s_linear_infinite] motion-reduce:animate-none">
          <span className="absolute left-1/2 top-[6px] size-3 -translate-x-1/2 rounded-full bg-foreground" />
        </div>
      )}
      <div className="absolute inset-0 flex flex-col items-center justify-center px-9 text-center">
        <span data-testid="ring-total" className="text-5xl font-semibold tabular-nums leading-none">
          {total}
        </span>
        <span className="mt-1 text-sm text-muted-foreground">{t.ringCaption(total)}</span>
        <span data-testid="ring-step" className="mt-1 text-xs leading-tight tabular-nums text-muted-foreground">
          {next === null ? t.ringAllDone : t.ringStep(total, next)}
        </span>
      </div>
      <Info className="absolute right-2 top-2 size-4 text-muted-foreground" aria-hidden />
    </button>
  )
}

/** A tile that opens its basis when tapped. */
function Tile({ id, label, value, sub, open, onToggle, children }: { id: string; label: string; value: string; sub?: string; open: boolean; onToggle: () => void; children?: React.ReactNode }) {
  return (
    <div data-testid={`tile-${id}`} className="flex flex-col rounded-lg border border-border bg-card">
      <button type="button" aria-expanded={open} onClick={onToggle} className="relative flex min-h-16 w-full flex-1 flex-col items-start justify-center gap-0.5 p-3 pr-9 text-left">
        <span className="text-sm text-muted-foreground">{label}</span>
        <span data-testid={`tile-${id}-value`} className="break-words text-2xl font-semibold tabular-nums">
          {value}
        </span>
        {sub && <span className="break-words text-sm text-muted-foreground">{sub}</span>}
        <Info className="absolute right-3 top-3 size-4 text-muted-foreground" aria-hidden />
      </button>
      {open && children && (
        <div data-testid={`tile-${id}-formula`} className="flex flex-col gap-1 break-words border-t border-border p-3 text-sm text-muted-foreground">
          {children}
        </div>
      )}
    </div>
  )
}

/** True from 640 px wide: the tiles sit in a row and one shared panel opens below them. */
function useWide(): boolean {
  const [wide, setWide] = useState(false)
  useEffect(() => {
    const q = window.matchMedia("(min-width: 640px)")
    const on = () => setWide(q.matches)
    on()
    q.addEventListener("change", on)
    return () => q.removeEventListener("change", on)
  }, [])
  return wide
}

export function HomeTab({ ctx }: { ctx: RecordCtx }) {
  const { view, today, nowMs, unit, unitData, record } = ctx
  const [openCard, setOpenCard] = useState<string | null>(null)
  const [counterOpen, setCounterOpen] = useState(false)
  const [ringOpen, setRingOpen] = useState(false)
  const toggleCard = (id: string) => setOpenCard((c) => (c === id ? null : id))
  const wide = useWide()
  const live = view.runs.find((r) => r.live) ?? null
  const thisYear = Number(today.slice(0, 4))
  const runs = moneyRuns(view.runs)
  const pm = moneyFor(runs, unit, ctx.spends, nowMs, null)
  const rate = amountPerDay(unit?.perDay, unit?.priceUsd)
  const units = unit ? unitsNotUsed(runs, nowMs, unit.perDay) : null
  const many = unitData?.many ?? ""
  const word = unit?.perDay === 1 ? (unitData?.one ?? many) : many
  const perDayText = unit?.perDay == null ? "" : fmtCount(unit.perDay)
  const hasNumbers = pm.money !== null
  const slipOpen = isLiveTool("slip")
  const dateOpen = isLiveTool("date")
  const breakEnd = record.goal === "break" ? record.breakEnd : null
  const next = nextDayStep(view.uniqueTotal)
  const toGo = next === null ? 0 : next - view.uniqueTotal
  const elapsed = live ? splitElapsed(elapsedSince(live.start, nowMs)) : null
  const pad = (n: number) => String(n).padStart(2, "0")

  const moneyFormula = pm.money !== null && unit && unit.perDay !== null ? t.moneyFormula(perDayText, word, fmtMoney(unit.priceUsd), daysText(pm.cleanDays), pm.spent !== 0 ? fmtMoney(pm.spent) : null, fmtMoney(pm.money)) : ""
  const unitsFormula = units !== null && unit && unit.perDay !== null ? t.unitsFormula(perDayText, word, daysText(pm.cleanDays), units, many) : ""
  const perDayLine = unit && rate !== null && unit.perDay !== null ? t.perDayLine(perDayText, word, fmtMoney(unit.priceUsd), fmtMoney(Math.round(rate * 100) / 100)) : ""

  const cards = [
    ["run", t.cardRun, view.current, t.cardRunBasis(view.current ?? 0), (n: number) => t.cardDays(n), t.noneNow],
    ["best", t.cardBest, view.best, t.cardBestBasis(view.best), (n: number) => t.cardDays(n), t.cardNone],
    ["close", t.cardClose, view.closeCalls, t.cardCloseBasis(view.closeCalls), (n: number) => t.cardTimes(n), t.noneYet],
  ] as const

  /** What each tile shows when it is open; null when it has nothing to say (no numbers yet). */
  const panels: Record<string, React.ReactNode> = {
    "t-money": hasNumbers ? (
      <>
        <span data-testid="money-formula">{moneyFormula}</span>
        <span>{t.cleanTimeLine}</span>
      </>
    ) : null,
    "t-units": units !== null ? (
      <>
        <span data-testid="units-formula">{unitsFormula}</span>
        <span>{t.cleanTimeLine}</span>
      </>
    ) : null,
    "t-price": unit ? (
      <>
        <PriceBasis unitId={unit.id} typed={unit.priceBasis === "typed"} testId="price-basis" />
        {perDayLine && <span data-testid="price-formula">{perDayLine}</span>}
        {!ctx.readOnly && (
          <button type="button" data-testid="price-change" onClick={() => ctx.openChange()} className="inline-flex min-h-11 items-center self-start text-primary underline">
            {t.change}
          </button>
        )}
      </>
    ) : null,
  }

  return (
    <div className="flex flex-col gap-5">
      <section aria-label={t.tabs.home} className="flex flex-col gap-3">
        <Ring total={view.total} running={live !== null} open={ringOpen} onToggle={() => setRingOpen((o) => !o)} />
        {ringOpen && (
          <p data-testid="ring-basis" className="text-center text-sm text-muted-foreground">
            {t.ringBasis}
          </p>
        )}

        {live && elapsed ? (
          <div className="text-center">
            <button type="button" data-testid="counter" aria-expanded={counterOpen} onClick={() => setCounterOpen((o) => !o)} className="relative mx-auto flex min-h-11 flex-col items-center justify-center gap-1 rounded-md px-6 py-1">
              <span className="text-sm text-muted-foreground">{t.counterLabel}</span>
              <span data-testid="counter-time" className="flex items-end gap-3 tabular-nums">
                {(
                  [
                    ["d", String(elapsed.days), t.counterUnits.d],
                    ["h", String(elapsed.hours), t.counterUnits.h],
                    ["m", pad(elapsed.minutes), t.counterUnits.m],
                    ["s", pad(elapsed.seconds), t.counterUnits.s],
                  ] as const
                ).map(([k, n, label]) => (
                  <span key={k} className="flex min-w-12 flex-col items-center">
                    <span data-testid={`counter-${k}`} className="text-4xl font-semibold leading-none">
                      {n}
                    </span>
                    <span className="mt-1 text-xs text-muted-foreground">{label}</span>
                  </span>
                ))}
              </span>
              <span data-testid="counter-day" className="text-sm text-muted-foreground">
                {t.dayLine(live.days, fmtDay(live.start, today))}
              </span>
              <Info className="absolute right-0 top-1 size-4 text-muted-foreground" aria-hidden />
            </button>
            {counterOpen && (
              <p data-testid="counter-basis" className="text-sm text-muted-foreground">
                {t.counterTap}
              </p>
            )}
          </div>
        ) : (
          <div data-testid="no-run" className="flex flex-col items-center gap-1 break-words rounded-lg border border-border bg-card p-3 text-center text-base">
            <p>{t.noRun(view.total)}</p>
            {slipOpen ? (
              <Link href={ctx.carry(`/quit/${ctx.addiction}/slip`)} data-testid="slip-link" className="inline-flex min-h-11 items-center text-primary underline">
                {t.noRunSlip}
              </Link>
            ) : dateOpen ? (
              <Link href={ctx.carry(`/quit/${ctx.addiction}/date`)} data-testid="date-link" className="inline-flex min-h-11 items-center text-primary underline">
                {t.noRunDate}
              </Link>
            ) : (
              <p className="text-sm text-muted-foreground">{t.noRunPlain}</p>
            )}
          </div>
        )}

        {breakEnd &&
          (breakEnd > today ? (
            <p data-testid="break-line" className="text-center text-sm text-muted-foreground">
              {t.breakEnds(fmtDay(breakEnd, today))}
            </p>
          ) : (
            <p data-testid="break-line" className="text-center text-sm text-muted-foreground">
              {t.breakEnded(fmtDay(breakEnd, today))}{" "}
              {dateOpen && (
                <Link href={ctx.carry(`/quit/${ctx.addiction}/date`)} className="inline-flex min-h-11 items-center text-primary underline">
                  {t.breakToDate}
                </Link>
              )}
            </p>
          ))}
      </section>

      <section aria-label={t.cardRun} className="flex flex-col gap-2">
        <div className="grid grid-cols-3 items-stretch gap-2">
          {cards.map(([id, label, n, , unitWord, none]) => (
            <button
              key={id}
              type="button"
              data-testid={`card-${id}`}
              aria-expanded={openCard === id}
              onClick={() => toggleCard(id)}
              className={`relative flex min-h-28 flex-col items-start rounded-lg border p-3 text-left ${openCard === id ? "border-primary bg-primary/10" : "border-border bg-card"}`}
            >
              <span className="pr-4 text-sm leading-tight text-muted-foreground">{label}</span>
              <span className="mt-auto flex flex-col">
                <span data-testid={`card-${id}-value`} className={`${n === null || n === 0 ? "text-lg" : "text-2xl"} font-semibold leading-none tabular-nums`}>
                  {n === null || n === 0 ? none : n}
                </span>
                {n !== null && n !== 0 && <span className="text-xs text-muted-foreground">{unitWord(n)}</span>}
              </span>
              <Info className="absolute right-2 top-2 size-4 text-muted-foreground" aria-hidden />
            </button>
          ))}
        </div>
        {openCard && cards.some((c) => c[0] === openCard) && (
          <p data-testid="card-formula" className="break-words rounded-lg border border-border bg-card p-3 text-sm text-muted-foreground">
            {openCard === "run" && view.current === null ? t.noRun(view.total) : (cards.find((c) => c[0] === openCard)?.[3] ?? "")}
          </p>
        )}
      </section>

      <section aria-label={t.tileMoney} className="flex flex-col gap-2">
        <div className="grid gap-2 sm:grid-cols-3 sm:items-stretch">
          <Tile id="money" label={t.tileMoney} value={hasNumbers ? fmtMoney(pm.money as number) : t.tileDash} sub={hasNumbers ? ((pm.money as number) < 0 ? t.negativeLine : undefined) : t.noNumbersLine} open={openCard === "t-money"} onToggle={() => toggleCard("t-money")}>
            {!wide && panels["t-money"]}
          </Tile>
          <Tile id="units" label={units !== null && unitData ? t.unitsTile(unitData.many, unitData.id) : t.unitsTileNone} value={units !== null ? String(units) : t.tileDash} sub={units === null ? t.noNumbersLine : undefined} open={openCard === "t-units"} onToggle={() => toggleCard("t-units")}>
            {!wide && panels["t-units"]}
          </Tile>
          <Tile id="price" label={t.tilePrice} value={unit ? fmtMoney(unit.priceUsd) : t.tileDash} sub={unit ? undefined : t.noNumbersLine} open={openCard === "t-price"} onToggle={() => toggleCard("t-price")}>
            {!wide && panels["t-price"]}
          </Tile>
        </div>
        {wide && openCard && panels[openCard] && (
          <div data-testid={`tile-${openCard.slice(2)}-formula`} className="flex flex-col gap-1 break-words rounded-lg border border-border bg-card p-3 text-sm text-muted-foreground">
            {panels[openCard]}
          </div>
        )}
        {!hasNumbers && !ctx.readOnly && (
          <button type="button" data-testid="add-numbers" onClick={() => ctx.openTab("money")} className="inline-flex min-h-11 items-center self-start text-primary underline">
            {t.addNumbers}
          </button>
        )}
      </section>

      <p data-testid="next-step" className="text-base">
        {next === null ? t.allSteps : live ? t.nextStep(next, fmtDay(addDays(today, toGo), today)) : t.nextStepNoRun(next, toGo)}
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
