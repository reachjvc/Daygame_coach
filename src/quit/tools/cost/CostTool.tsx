"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import Link from "next/link"
import { Chips, PrimaryButton, SourcesFold } from "../../components/kit"
import { isLiveTool } from "../../menu"
import { useQuitRecord, todayIso, type RecordUnit } from "../../record"
import { useQuitStore } from "../../store"
import type { QuitUnit, ToolProps } from "../../types"
import { realRefs, uniqueRefs, usable } from "../common"
import { dateText } from "../date/text"
import { useCarry, useDoneCount, useStartCount, useToolState } from "../hooks"
import { NotReady } from "../NotReady"
import {
  EMPTY_COST,
  basisFor,
  boxNumber,
  computeCost,
  defaultCountMode,
  formatCents,
  formatCount,
  formatMoney,
  formatPrice,
  importOldCost,
  importedCountMode,
  usableUnit,
  isOldCost,
  parseCost,
  parseCount,
  parsePackSize,
  parsePrice,
  type CostFigures,
  type CostState,
  type CountMode,
  type PriceMode,
} from "./logic"
import { costText as t } from "./text"

const fmtDay = (day: string) => new Date(`${day}T12:00:00`).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })

/** The shown number glides to its new value in about 0.4 seconds; with reduced motion it jumps. */
function useCountUp(target: number, ms = 400): number {
  const [value, setValue] = useState(target)
  const from = useRef(target)
  useEffect(() => {
    if (from.current === target) return
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      from.current = target
      setValue(target)
      return
    }
    const a = from.current
    const t0 = performance.now()
    let raf = 0
    const tick = (now: number) => {
      const p = Math.max(0, Math.min(1, (now - t0) / ms))
      const v = p === 1 ? target : a + (target - a) * p
      from.current = v
      setValue(v)
      if (p < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [target, ms])
  return value
}

/** What it costs you: a calculator that saves to the shared record as he types. */
export function CostTool({ addiction, data }: ToolProps) {
  const units = usable<QuitUnit[]>(data.units)
  if (!units || units.length === 0) return <NotReady />
  return <Inner addiction={addiction} units={units} />
}

interface Texts {
  count: string
  price: string
  size: string
}

function seed(unit: RecordUnit | null, countMode: CountMode, priceMode: PriceMode, size: number): Texts {
  if (!unit) return { count: "", price: "", size: String(size) }
  const count = unit.perDay === null ? "" : boxNumber(countMode === "week" ? unit.perDay * 7 : unit.perDay)
  const price = priceMode === "pack" && unit.id === "cigarettes" ? boxNumber(unit.priceUsd * size, 2) : boxNumber(unit.priceUsd, 2)
  return { count, price, size: String(size) }
}

function Inner({ addiction, units }: { addiction: string; units: QuitUnit[] }) {
  const store = useQuitStore()
  const rec = useQuitRecord(addiction)
  const { state, update } = useToolState<CostState>(addiction, "cost", EMPTY_COST, parseCost)
  const started = useStartCount(addiction, "cost")
  const carry = useCarry()
  const unitRec = usableUnit(rec.record.unit)
  const unit = units.find((u) => u.id === unitRec?.id) ?? null
  const ready = state !== null && rec.ready

  // a count given elsewhere (Your quit date asks it a day) is shown a day until he picks otherwise
  const countMode: CountMode = state?.countMode ?? (unitRec && unitRec.perDay !== null ? "day" : unit ? defaultCountMode(unit.id) : "day")
  const priceMode: PriceMode = unit?.id === "cigarettes" ? (state?.priceMode ?? "pack") : "one"
  const size = state?.packSize ?? EMPTY_COST.packSize
  const complete = unitRec !== null && unitRec.perDay !== null
  const [open, setOpen] = useState<boolean | null>(null)
  const [texts, setTexts] = useState<Texts>({ count: "", price: "", size: "" })
  const [saved, setSaved] = useState(false)

  // First read: wave-1 answers move into the shared record once; the form starts open when the record has no unit or no count.
  useEffect(() => {
    if (!ready || open !== null) return
    let u = usableUnit(rec.record.unit)
    let cm: CountMode | null = state?.countMode ?? null
    const stored = store.get(addiction, "cost")
    if (stored !== undefined && isOldCost(stored)) {
      const moved = importOldCost(stored, units, rec.record.unit)
      if (moved) {
        rec.setUnit(moved)
        u = moved
        cm = importedCountMode(stored)
      }
      update(() => ({ ...EMPTY_COST, countMode: cm }))
    }
    setOpen(!(u !== null && u.perDay !== null))
    setTexts(seed(u, cm ?? (u && u.perDay !== null ? "day" : u ? defaultCountMode(u.id) : "day"), u?.id === "cigarettes" ? (state?.priceMode ?? "pack") : "one", size))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready])
  const figures = unitRec && unitRec.perDay !== null ? computeCost(unitRec.perDay, unitRec.priceUsd) : null
  useDoneCount(addiction, "cost", figures !== null)

  const reseed = useCallback((u: RecordUnit | null, cm: CountMode, pm: PriceMode, sz: number) => setTexts(seed(u, cm, pm, sz)), [])

  if (!ready || open === null) return null

  const write = (next: RecordUnit) => {
    started()
    rec.setUnit(next)
    setSaved(true)
  }
  const countErr = parseCount(texts.count, countMode).kind === "bad"
  const countEmpty = parseCount(texts.count, countMode).kind === "empty"
  const sizeField = parsePackSize(texts.size)
  const sizeErr = priceMode === "pack" && sizeField.kind !== "ok"
  const sizeNow = sizeField.kind === "ok" ? sizeField.value : size
  const priceErr = unit !== null && parsePrice(texts.price, priceMode, sizeNow).kind === "bad"
  const anyErr = countErr || priceErr || sizeErr

  const pickUnit = (id: string) => {
    const u = units.find((x) => x.id === id)
    if (!u || unitRec?.id === id) return
    // the numbers of the unit he leaves are kept here, and come back if he taps it again
    const kept = state?.lastByUnit[id]
    const cm = kept && kept.perDay !== null ? "day" : defaultCountMode(id)
    const next: RecordUnit = kept ? { id, ...kept } : { id, perDay: null, priceUsd: u.defaultPriceUsd ?? 0, priceBasis: "default" }
    update((s) => ({
      ...s,
      countMode: cm,
      priceMode: "pack",
      packSize: EMPTY_COST.packSize,
      lastByUnit: unitRec ? { ...s.lastByUnit, [unitRec.id]: { perDay: unitRec.perDay, priceUsd: unitRec.priceUsd, priceBasis: unitRec.priceBasis } } : s.lastByUnit,
    }))
    write(next)
    reseed(next, cm, "pack", EMPTY_COST.packSize)
  }
  const onCount = (text: string) => {
    setTexts((x) => ({ ...x, count: text }))
    const f = parseCount(text, countMode)
    // an emptied box is not written: clearing it to retype never wipes the count the other tools read
    if (unitRec && f.kind === "ok") write({ ...unitRec, perDay: f.value })
  }
  const setMode = (cm: CountMode) => {
    if (cm === countMode) return
    update((s) => ({ ...s, countMode: cm }))
    reseed({ ...(unitRec as RecordUnit) }, cm, priceMode, size)
  }
  const savePrice = (priceText: string, sizeText: string, pm: PriceMode) => {
    if (!unit || !unitRec) return
    const sf = parsePackSize(sizeText)
    const sz = sf.kind === "ok" ? sf.value : size
    if (pm === "pack" && sf.kind !== "ok") return
    const f = parsePrice(priceText, pm, sz)
    if (f.kind !== "ok") return
    const basis = basisFor(f.value, unit)
    write({ ...unitRec, priceUsd: basis === "default" ? (unit.defaultPriceUsd as number) : f.value, priceBasis: basis })
  }
  const onPrice = (text: string) => {
    setTexts((x) => ({ ...x, price: text }))
    savePrice(text, texts.size, priceMode)
  }
  const onSize = (text: string) => {
    setTexts((x) => ({ ...x, size: text }))
    const f = parsePackSize(text)
    // the size is kept only with a good price, so the saved price of one and the size always belong together
    if (f.kind === "ok" && parsePrice(texts.price, priceMode, f.value).kind === "ok") update((s) => ({ ...s, packSize: f.value }))
    savePrice(texts.price, text, priceMode)
  }
  const setPriceMode = (pm: PriceMode) => {
    if (pm === priceMode || !unitRec) return
    update((s) => ({ ...s, priceMode: pm }))
    reseed(unitRec, countMode, pm, size)
  }

  const input = "min-h-12 w-full rounded-md border border-border bg-card px-3 text-base"
  const perText = countMode === "week" ? t.modeWeek : t.modeDay
  const summary =
    unitRec && unit && unitRec.perDay !== null
      ? (() => {
          const n = countMode === "week" ? unitRec.perDay * 7 : unitRec.perDay
          const words = formatCount(n) === "1" ? unit.one : unit.many
          return priceMode === "pack"
            ? t.summaryPack(formatCount(n), words, perText, formatMoney(Math.round(unitRec.priceUsd * size * 100) / 100), size)
            : t.summary(formatCount(n), words, perText, formatPrice(unitRec.priceUsd))
        })()
      : null

  return (
    <div className="flex flex-col gap-6">
      <section aria-label={t.title} data-testid="cost-numbers" className="flex flex-col gap-4 rounded-lg border border-border bg-card p-4">
        {!open && summary ? (
          <>
            <p data-testid="cost-summary" className="text-lg font-medium">
              {summary}
            </p>
            <button
              type="button"
              data-testid="cost-change"
              onClick={() => {
                reseed(unitRec, countMode, priceMode, size)
                setSaved(false)
                setOpen(true)
              }}
              className="inline-flex min-h-11 items-center justify-center self-start rounded-md border border-border px-4 text-base font-medium"
            >
              {t.change}
            </button>
            <p className="text-sm text-muted-foreground">{t.shared}</p>
          </>
        ) : (
          <>
            <div className="flex flex-col gap-2">
              <span className="text-sm font-medium">{t.unitLabel}</span>
              <Chips label={t.unitLabel} options={units.map((u) => ({ id: u.id, label: dateText.useUnits[u.id] ?? u.many }))} value={unitRec ? [unitRec.id] : []} onChange={([id]) => pickUnit(id)} />
            </div>
            {unit && unitRec && (
              <>
                <div className="flex flex-col gap-2">
                  <label htmlFor="cost-count" className="text-sm font-medium">
                    {t.countLabel(unit.many)}
                  </label>
                  <Switch label={t.modeLabel} testId="cost-count-mode" value={countMode} options={[{ id: "day", label: t.modeDay }, { id: "week", label: t.modeWeek }]} onChange={(id) => setMode(id as CountMode)} />
                  <input id="cost-count" data-testid="cost-count" type="text" inputMode="decimal" maxLength={8} value={texts.count} onChange={(e) => onCount(e.target.value)} aria-invalid={countErr || undefined} className={input} />
                  <span className="text-sm text-muted-foreground">{t.countHelp}</span>
                  {countErr && (
                    <span data-testid="cost-count-error" role="alert" className="text-sm font-medium text-destructive">
                      {t.needCount(countMode === "week" ? "3,500" : "500")}
                    </span>
                  )}
                </div>
                <div className="flex flex-col gap-2">
                  {unit.id === "cigarettes" && (
                    <span className="text-sm font-medium">{t.priceModeLabel}</span>
                  )}
                  {unit.id === "cigarettes" && (
                    <Switch label={t.priceModeLabel} testId="cost-price-mode" value={priceMode} options={[{ id: "pack", label: t.priceModePack }, { id: "one", label: t.priceModeOne }]} onChange={(id) => setPriceMode(id as PriceMode)} />
                  )}
                  <label htmlFor="cost-price" className="text-sm font-medium">
                    {priceMode === "pack" ? t.packPriceLabel : unit.id === "pouches" ? t.pouchPriceLabel : t.onePriceLabel(unit.one)}
                  </label>
                  <input id="cost-price" data-testid="cost-price" type="text" inputMode="decimal" maxLength={10} value={texts.price} onChange={(e) => onPrice(e.target.value)} aria-invalid={priceErr || undefined} className={input} />
                  {priceErr && (
                    <span data-testid="cost-price-error" role="alert" className="text-sm font-medium text-destructive">
                      {t.needPrice}
                    </span>
                  )}
                  {priceMode === "pack" && (
                    <>
                      <label htmlFor="cost-size" className="text-sm font-medium">
                        {t.packSizeLabel}
                      </label>
                      <input id="cost-size" data-testid="cost-size" type="text" inputMode="numeric" maxLength={3} value={texts.size} onChange={(e) => onSize(e.target.value)} aria-invalid={sizeErr || undefined} className={input} />
                      {sizeErr && (
                        <span data-testid="cost-size-error" role="alert" className="text-sm font-medium text-destructive">
                          {t.badSize}
                        </span>
                      )}
                    </>
                  )}
                  <p data-testid="cost-basis" className="break-words text-sm text-muted-foreground">
                    {unitRec.priceBasis === "typed" ? t.basisTyped : priceMode === "pack" ? t.basisPack : (t.basisOne[unit.id] ?? "")}
                  </p>
                </div>
                {saved && (
                  <p data-testid="cost-saved" className="text-sm text-muted-foreground">
                    {t.saved}
                  </p>
                )}
                {figures && !anyErr && !countEmpty && (
                  // the answer stays in sight while he types: this line sticks to the bottom of the screen
                  <p data-testid="cost-live" aria-hidden="true" className="sticky bottom-2 z-10 self-stretch rounded-md border border-primary bg-background px-3 py-2 text-base font-semibold text-primary shadow">
                    {t.liveYear(formatCents(figures.yearCents))}
                  </p>
                )}
                {complete && (
                  <PrimaryButton
                    testId="cost-done"
                    disabled={anyErr}
                    onClick={() => {
                      setOpen(false)
                      requestAnimationFrame(() => document.querySelector("[data-testid=cost-result]")?.scrollIntoView({ block: "start" }))
                    }}
                  >
                    {t.done}
                  </PrimaryButton>
                )}
              </>
            )}
          </>
        )}
      </section>

      {unit && <Result unit={unit} rec={unitRec} figures={figures} bad={open && anyErr} empty={open && countEmpty} countMode={countMode} priceMode={priceMode} size={size} />}
      <DateLine record={rec.record} figures={figures} carry={carry} addiction={addiction} />
      {unit && <SourcesFold refs={uniqueRefs(realRefs(unit.priceRefs))} />}
    </div>
  )
}

function Switch({ label, options, value, onChange, testId }: { label: string; options: { id: string; label: string }[]; value: string; onChange: (id: string) => void; testId: string }) {
  return (
    <div role="radiogroup" aria-label={label} data-testid={testId} className="inline-flex self-start overflow-hidden rounded-full border border-border">
      {options.map((o) => (
        <button
          key={o.id}
          type="button"
          role="radio"
          aria-checked={value === o.id}
          data-testid={`${testId}-${o.id}`}
          onClick={() => onChange(o.id)}
          className={`min-h-11 px-4 text-base ${value === o.id ? "bg-primary text-primary-foreground" : "bg-card text-foreground"}`}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

interface ResultProps {
  /** A box holds a bad or empty number: no figure is shown that does not match the boxes. */
  bad: boolean
  /** The count box is empty while he edits. */
  empty: boolean
  unit: QuitUnit | null
  rec: RecordUnit | null
  figures: CostFigures | null
  countMode: CountMode
  priceMode: PriceMode
  size: number
}

function Result({ unit, rec, figures, bad, empty, countMode, priceMode, size }: ResultProps) {
  const year = useCountUp(figures ? figures.yearCents / 100 : 0)
  return (
    <section data-testid="cost-result" aria-label={t.resultTitle} className="flex flex-col gap-4">
      <h2 className="text-lg font-semibold">{t.resultTitle}</h2>
      {bad && figures ? (
        <p data-testid="cost-fix" className="text-muted-foreground">
          {t.fixFirst}
        </p>
      ) : empty || !unit || !rec || !figures || rec.perDay === null ? (
        <p data-testid="cost-nocount" className="text-muted-foreground">
          {t.noCount}
        </p>
      ) : (
        <>
          <div className="rounded-lg border border-border bg-card p-4">
            <p className="text-sm text-muted-foreground">{t.year}</p>
            <p data-testid="cost-year" data-value={(figures.yearCents / 100).toFixed(2)} aria-live="polite" className="break-words text-4xl font-semibold text-primary">
              {formatMoney(year)}
            </p>
          </div>
          <div className="grid grid-cols-3 gap-2 sm:gap-3">
            <Tile label={t.day} id="cost-day" value={figures.dayCents} />
            <Tile label={t.month} id="cost-month" value={figures.monthCents} />
            <Tile label={t.ten} id="cost-ten" value={figures.tenCents} />
          </div>
          <p data-testid="cost-units" className="text-base">
            {t.unitsYear(formatCount(figures.unitsYear), figures.unitsYear === 1 ? unit.one : unit.many)}
          </p>
          <Working unit={unit} rec={rec} figures={figures} countMode={countMode} priceMode={priceMode} size={size} />
        </>
      )}
    </section>
  )
}

function Tile({ label, id, value }: { label: string; id: string; value: number }) {
  return (
    <div className="min-w-0 rounded-lg border border-border bg-card p-2 sm:p-3">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p data-testid={id} data-value={(value / 100).toFixed(2)} className="break-words text-base font-semibold sm:text-xl">
        {formatCents(value)}
      </p>
    </div>
  )
}

function Working({ unit, rec, figures, countMode, priceMode, size }: { unit: QuitUnit; rec: RecordUnit; figures: CostFigures; countMode: CountMode; priceMode: PriceMode; size: number }) {
  const perDay = rec.perDay as number
  const price = formatPrice(rec.priceUsd)
  const lines: string[] = []
  if (rec.id === "cigarettes" && priceMode === "pack") lines.push(t.workPack(formatMoney(Math.round(rec.priceUsd * size * 100) / 100), size, price, unit.one))
  const year = formatCents(figures.yearCents)
  lines.push(countMode === "week" ? t.workYearWeek(formatCount(perDay * 7), price, year) : t.workYearDay(formatCount(perDay), price, year))
  lines.push(t.workDay(year, formatCents(figures.dayCents)))
  lines.push(t.workMonth(formatCents(figures.yearCents), formatCents(figures.monthCents)))
  lines.push(t.workTen(formatCents(figures.yearCents), formatCents(figures.tenCents)))
  return (
    <div data-testid="cost-working" className="flex flex-col gap-1 break-words text-sm text-muted-foreground">
      <h3 className="font-medium text-foreground">{t.workTitle}</h3>
      {lines.map((l, i) => (
        <p key={i} data-testid={`cost-line-${i}`}>
          {l}
        </p>
      ))}
      <p>{t.workNote}</p>
    </div>
  )
}

function DateLine({ record, figures, carry, addiction }: { record: ReturnType<typeof useQuitRecord>["record"]; figures: CostFigures | null; carry: (p: string) => string; addiction: string }) {
  const today = todayIso()
  const link = (tool: string, name: string) =>
    isLiveTool(tool) ? (
      <Link href={carry(`/quit/${addiction}/${tool}`)} className="inline-flex min-h-11 items-center text-primary underline">
        {name}
      </Link>
    ) : (
      <>{name}</>
    )
  const date = record.quitDate
  const hasPlan = date !== null && (record.goal === "stop" || record.goal === "break")
  let body: React.ReactNode
  if (!hasPlan) {
    body = (
      <>
        {t.datePickPre}
        {link("date", t.nameDate)}
        {t.datePickPost}
      </>
    )
  } else if (date > today) {
    if (record.goal === "break") body = figures ? t.dateBreakFuture(fmtDay(date), formatCents(figures.dayCents)) : t.dateBreakFutureBare(fmtDay(date))
    else body = figures ? t.dateFuture(fmtDay(date), formatCents(figures.dayCents), formatCents(figures.yearCents)) : t.dateFutureBare(fmtDay(date))
  } else {
    body = (
      <>
        {record.goal === "break" ? t.dateBreakPastPre(fmtDay(date)) : t.datePastPre(fmtDay(date))}
        {link("record", t.nameRecord)}
        {t.datePastPost}
      </>
    )
  }
  return (
    <p data-testid="cost-dateline" className="text-base">
      {body}
    </p>
  )
}
