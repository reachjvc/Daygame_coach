"use client"

import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import { Chips, PrimaryButton, SourcesFold } from "../../components/kit"
import { isLiveTool } from "../../menu"
import { MAX_PRICE, parseTyped } from "../date/logic"
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
  countIsClean,
  packPriceFor,
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

function seed(unit: RecordUnit | null, countMode: CountMode, priceMode: PriceMode, size: number, packPrice: number | null): Texts {
  if (!unit) return { count: "", price: "", size: String(size) }
  const count = unit.perDay === null ? "" : boxNumber(countMode === "week" ? unit.perDay * 7 : unit.perDay)
  const price = priceMode === "pack" && unit.id === "cigarettes" ? boxNumber(packPriceFor(unit.priceUsd, size, packPrice), 2) : boxNumber(unit.priceUsd, 2)
  return { count, price, size: String(size) }
}

/** What the boxes say when every box is good: the unit to save and the typed pack price and size that go with it. */
interface Pending {
  unit: RecordUnit
  packPrice: number | null
  size: number
}

const differs = (a: RecordUnit, b: RecordUnit | null) => !b || a.id !== b.id || a.perDay !== b.perDay || a.priceUsd !== b.priceUsd || a.priceBasis !== b.priceBasis

function Inner({ addiction, units }: { addiction: string; units: QuitUnit[] }) {
  const store = useQuitStore()
  const rec = useQuitRecord(addiction)
  const { state, update } = useToolState<CostState>(addiction, "cost", EMPTY_COST, parseCost)
  const started = useStartCount(addiction, "cost")
  const carry = useCarry()
  const unitRec = usableUnit(rec.record.unit)
  /** A unit he tapped but has not given a count for yet: the record keeps its own unit until a complete, valid entry replaces it. */
  const [draft, setDraft] = useState<RecordUnit | null>(null)
  const activeId = draft?.id ?? unitRec?.id ?? null
  const unit = units.find((u) => u.id === activeId) ?? null
  const ready = state !== null && rec.ready

  // The count mode is his pick on this tool; without one, a day for cigarettes and a week for vapes and pouches.
  const countMode: CountMode = state?.countMode ?? (unit ? defaultCountMode(unit.id) : "day")
  const priceMode: PriceMode = unit?.id === "cigarettes" ? (state?.priceMode ?? "pack") : "one"
  const size = state?.packSize ?? EMPTY_COST.packSize
  const savedPack = state?.packPrice ?? null
  const [open, setOpen] = useState<boolean | null>(null)
  const [texts, setTexts] = useState<Texts>({ count: "", price: "", size: "" })
  const [saved, setSaved] = useState(false)
  const touched = useRef(false)

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
    setTexts(seed(u, cm ?? (u ? defaultCountMode(u.id) : "day"), u?.id === "cigarettes" ? (state?.priceMode ?? "pack") : "one", size, savedPack))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready])

  // What the boxes say. Only a complete, valid set of boxes is ever saved to the record; a bad box saves nothing.
  const countField = parseCount(texts.count, countMode)
  const countErr = countField.kind === "bad"
  const countEmpty = countField.kind === "empty"
  const sizeField = parsePackSize(texts.size)
  const sizeErr = priceMode === "pack" && sizeField.kind !== "ok"
  const sizeNow = sizeField.kind === "ok" ? sizeField.value : size
  const priceField = unit ? parsePrice(texts.price, priceMode, sizeNow) : null
  const priceErr = unit !== null && priceField?.kind === "bad"
  const anyErr = countErr || priceErr || sizeErr
  const record = draft ? null : unitRec
  const base = record ?? draft
  // the count box holds the saved count rounded to 4 decimals: left alone, the saved count stays exact (10 a week stays 10 / 7 a day)
  const countAsSeeded = base !== null && base.perDay !== null && texts.count === boxNumber(countMode === "week" ? base.perDay * 7 : base.perDay)
  let pending: Pending | null = null
  if (unit && !anyErr && priceField?.kind === "ok") {
    const typed = parseTyped(texts.price, MAX_PRICE)
    const basis = basisFor(priceField.value, unit)
    pending = {
      unit: { id: unit.id, perDay: countAsSeeded ? (base as RecordUnit).perDay : countField.kind === "ok" ? countField.value : (base?.perDay ?? null), priceUsd: basis === "default" ? (unit.defaultPriceUsd as number) : priceField.value, priceBasis: basis },
      packPrice: priceMode === "pack" && typed.kind === "ok" ? typed.value : savedPack,
      size: sizeNow,
    }
  }
  // the unit the page shows its figures for: what the boxes say while editing, the record otherwise
  const eff: RecordUnit | null = open ? (pending ? pending.unit : record) : unitRec
  const figures = eff && eff.perDay !== null && eff.perDay > 0 ? computeCost(eff.perDay, eff.priceUsd) : null
  const complete = eff !== null && eff.perDay !== null
  useDoneCount(addiction, "cost", figures !== null)

  /** Saves the boxes to the record, when they are complete and valid. A tapped unit is saved only once he has edited it or confirmed with Done. */
  const latest = useRef({ pending, unitRec, draft, state })
  latest.current = { pending, unitRec, draft, state }
  const commit = (force = false) => {
    const L = latest.current
    const p = L.pending
    if (!p) return
    if (L.draft && (p.unit.perDay === null || !(touched.current || force))) return
    if (differs(p.unit, L.unitRec)) {
      started()
      const old = L.unitRec
      if (old && old.id !== p.unit.id) update((s) => ({ ...s, lastByUnit: { ...s.lastByUnit, [old.id]: { perDay: old.perDay, priceUsd: old.priceUsd, priceBasis: old.priceBasis } } }))
      rec.setUnit(p.unit)
      setSaved(true)
    }
    if (L.draft) setDraft(null)
    const st = L.state
    if (st && (st.packSize !== p.size || st.packPrice !== p.packPrice)) update((s) => ({ ...s, packSize: p.size, packPrice: p.packPrice }))
  }
  const commitRef = useRef(commit)
  commitRef.current = commit
  useEffect(() => {
    const flush = () => commitRef.current()
    const hide = () => document.visibilityState === "hidden" && flush()
    window.addEventListener("pagehide", flush)
    document.addEventListener("visibilitychange", hide)
    return () => {
      window.removeEventListener("pagehide", flush)
      document.removeEventListener("visibilitychange", hide)
      flush()
    }
  }, [])

  if (!ready || open === null) return <Subtitle />

  const reseed = (u: RecordUnit | null, cm: CountMode, pm: PriceMode, sz: number, pack: number | null) => setTexts(seed(u, cm, pm, sz, pack))
  /** The unit the boxes now describe: used to refill them after a switch. */
  const source = pending?.unit ?? draft ?? unitRec

  const pickUnit = (id: string) => {
    const u = units.find((x) => x.id === id)
    if (!u || activeId === id) return
    // boxes that are complete and valid are saved before he moves on; the unit he taps is only shown until he enters a count for it
    const savesDraft = draft !== null && pending !== null && pending.unit.perDay !== null && touched.current
    const recNow = draft ? (savesDraft ? (pending as Pending).unit : unitRec) : (pending?.unit ?? unitRec)
    commit()
    touched.current = false
    update((s) => ({ ...s, countMode: null, priceMode: "pack", packSize: EMPTY_COST.packSize, packPrice: null }))
    if (recNow && recNow.id === id) {
      setDraft(null)
      reseed(recNow, defaultCountMode(id), "pack", EMPTY_COST.packSize, null)
      return
    }
    const kept = state?.lastByUnit[id]
    const next: RecordUnit = kept ? { id, ...kept } : { id, perDay: null, priceUsd: u.defaultPriceUsd ?? 0, priceBasis: "default" }
    setDraft(next)
    reseed(next, defaultCountMode(id), "pack", EMPTY_COST.packSize, null)
  }
  const onCount = (text: string) => {
    touched.current = true
    setTexts((x) => ({ ...x, count: text }))
  }
  const onPrice = (text: string) => {
    touched.current = true
    setTexts((x) => ({ ...x, price: text }))
  }
  const onSize = (text: string) => {
    touched.current = true
    setTexts((x) => ({ ...x, size: text }))
  }
  const setMode = (cm: CountMode) => {
    if (cm === countMode) return
    commit()
    update((s) => ({ ...s, countMode: cm }))
    reseed(source, cm, priceMode, pending?.size ?? size, pending?.packPrice ?? savedPack)
  }
  const setPriceMode = (pm: PriceMode) => {
    if (pm === priceMode || !source) return
    commit()
    update((s) => ({ ...s, priceMode: pm }))
    reseed(source, countMode, pm, pending?.size ?? size, pending?.packPrice ?? savedPack)
  }

  const input = "min-h-12 w-full rounded-md border border-border bg-card px-3 text-base"
  const perText = countMode === "week" ? t.modeWeek : t.modeDay
  const shownSize = open && pending ? pending.size : size
  const shownPack = open && pending ? pending.packPrice : savedPack
  const summary =
    unitRec && unit && unitRec.perDay !== null
      ? (() => {
          const n = countMode === "week" ? unitRec.perDay * 7 : unitRec.perDay
          const words = formatCount(n) === "1" ? unit.one : unit.many
          return priceMode === "pack"
            ? t.summaryPack(formatCount(n), words, perText, formatMoney(packPriceFor(unitRec.priceUsd, size, savedPack)), size)
            : t.summary(formatCount(n), words, perText, formatPrice(unitRec.priceUsd))
        })()
      : null
  const today = todayIso()
  const past = rec.record.quitDate !== null && (rec.record.goal === "stop" || rec.record.goal === "break") && rec.record.quitDate <= today
  const showBar = open && figures !== null && !anyErr && !countEmpty
  const savedLine = saved ? (
    <span data-testid="cost-saved" className="text-sm font-normal text-muted-foreground">
      {t.saved}
    </span>
  ) : null

  return (
    <div className="flex flex-col gap-6">
      <Subtitle />
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
                touched.current = false
                reseed(unitRec, countMode, priceMode, size, savedPack)
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
              <Chips label={t.unitLabel} options={units.map((u) => ({ id: u.id, label: dateText.useUnits[u.id] ?? u.many }))} value={activeId ? [activeId] : []} onChange={([id]) => pickUnit(id)} />
            </div>
            {unit && (
              <>
                <div className="flex flex-col gap-2">
                  <label htmlFor="cost-count" className="text-sm font-medium">
                    {t.countLabel(unit.many)}
                  </label>
                  <Switch label={t.modeLabel} testId="cost-count-mode" value={countMode} options={[{ id: "day", label: t.modeDay }, { id: "week", label: t.modeWeek }]} onChange={(id) => setMode(id as CountMode)} />
                  <input id="cost-count" data-testid="cost-count" type="text" inputMode="decimal" maxLength={8} value={texts.count} onChange={(e) => onCount(e.target.value)} onBlur={() => commit()} aria-invalid={countErr || undefined} className={input} />
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
                  <input id="cost-price" data-testid="cost-price" type="text" inputMode="decimal" maxLength={10} value={texts.price} onChange={(e) => onPrice(e.target.value)} onBlur={() => commit()} aria-invalid={priceErr || undefined} className={input} />
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
                      <input id="cost-size" data-testid="cost-size" type="text" inputMode="numeric" maxLength={3} value={texts.size} onChange={(e) => onSize(e.target.value)} onBlur={() => commit()} aria-invalid={sizeErr || undefined} className={input} />
                      {sizeErr && (
                        <span data-testid="cost-size-error" role="alert" className="text-sm font-medium text-destructive">
                          {t.badSize}
                        </span>
                      )}
                    </>
                  )}
                  <p data-testid="cost-basis" className="break-words text-sm text-muted-foreground">
                    {(pending?.unit ?? draft ?? unitRec)?.priceBasis === "typed" ? t.basisTyped : priceMode === "pack" ? t.basisPack : (dateText.priceBasis[unit.id] ?? "")}
                  </p>
                </div>
                {showBar ? (
                  // the answer stays in sight while he types: this bar sticks to the bottom of the screen, with the saved note inside it
                  <div className="sticky bottom-2 z-10 flex flex-wrap items-baseline justify-between gap-x-3 self-stretch rounded-md border border-primary bg-background px-3 py-2 shadow">
                    <p data-testid="cost-live" aria-hidden="true" className="text-base font-semibold text-primary">
                      {t.liveYear(formatCents((figures as CostFigures).yearCents))}
                    </p>
                    {savedLine}
                  </div>
                ) : (
                  savedLine
                )}
                {complete && (
                  <PrimaryButton
                    testId="cost-done"
                    disabled={anyErr}
                    onClick={() => {
                      commit(true)
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

      {unit && (
        <Result
          unit={unit}
          rec={eff}
          figures={figures}
          bad={open && anyErr}
          empty={open && countEmpty}
          countMode={countMode}
          priceMode={priceMode}
          size={shownSize}
          packPrice={shownPack}
          title={past ? t.resultTitlePast : t.resultTitle}
          dateLine={<DateLine record={rec.record} figures={figures} carry={carry} addiction={addiction} />}
        />
      )}
      {unit && <SourcesFold refs={uniqueRefs(realRefs(unit.priceRefs))} />}
    </div>
  )
}

function Subtitle() {
  return (
    <p data-testid="cost-subtitle" className="text-base text-muted-foreground">
      {t.subtitle}
    </p>
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
  packPrice: number | null
  title: string
  /** The quit-date line: shown with the result, above the working. */
  dateLine: React.ReactNode
}

function Result({ unit, rec, figures, bad, empty, countMode, priceMode, size, packPrice, title, dateLine }: ResultProps) {
  const year = useCountUp(figures ? figures.yearCents / 100 : 0)
  // Long figures (a large count at a large price): shrink the type and stack the three tiles, so a number is never cut in the middle.
  const bigLen = figures ? formatCents(figures.yearCents).length : 0
  const wide = figures ? formatCents(figures.tenCents).length > 11 : false
  return (
    <section data-testid="cost-result" aria-label={t.resultTitle} className="flex flex-col gap-4">
      <h2 className="text-lg font-semibold">{title}</h2>
      {bad ? (
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
            <p data-testid="cost-year" data-value={(figures.yearCents / 100).toFixed(2)} aria-hidden="true" className={`break-words font-semibold text-primary ${bigLen > 13 ? "text-2xl" : bigLen > 11 ? "text-3xl" : "text-4xl"}`}>
              {formatMoney(year)}
            </p>
            {/* a screen reader hears the final amount only, not the count-up */}
            <p className="sr-only" role="status" aria-live="polite" data-testid="cost-year-live">
              {t.year}: {formatCents(figures.yearCents)}
            </p>
          </div>
          <div className={`grid gap-2 sm:grid-cols-3 sm:gap-3 ${wide ? "grid-cols-1" : "grid-cols-3"}`}>
            <Tile label={t.day} id="cost-day" value={figures.dayCents} />
            <Tile label={t.month} id="cost-month" value={figures.monthCents} />
            <Tile label={t.ten} id="cost-ten" value={figures.tenCents} />
          </div>
          <p data-testid="cost-units" className="text-base">
            {t.unitsYear(formatCount(figures.unitsYear), figures.unitsYear === 1 ? unit.one : unit.many)}
          </p>
          {dateLine}
          <Working unit={unit} rec={rec} figures={figures} countMode={countMode} priceMode={priceMode} size={size} packPrice={packPrice} />
        </>
      )}
    </section>
  )
}

function Tile({ label, id, value }: { label: string; id: string; value: number }) {
  return (
    <div className="min-w-0 rounded-lg border border-border bg-card p-2 sm:p-3">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p data-testid={id} data-value={(value / 100).toFixed(2)} className={`font-semibold ${formatCents(value).length > 13 ? "text-base sm:text-base" : "text-base sm:text-xl"}`}>
        {formatCents(value)}
      </p>
    </div>
  )
}

function Working({ unit, rec, figures, countMode, priceMode, size, packPrice }: { unit: QuitUnit; rec: RecordUnit; figures: CostFigures; countMode: CountMode; priceMode: PriceMode; size: number; packPrice: number | null }) {
  const perDay = rec.perDay as number
  const price = formatPrice(rec.priceUsd)
  const lines: string[] = []
  if (rec.id === "cigarettes" && priceMode === "pack") lines.push(t.workPack(formatMoney(packPriceFor(rec.priceUsd, size, packPrice)), size, price, unit.one))
  const year = formatCents(figures.yearCents)
  // the count shown must be the count used: a week count of 10 is 10 / 7 a day, so it is written as a week; a count that fits neither way says "about"
  const dayClean = countIsClean(perDay)
  const weekClean = countIsClean(perDay * 7)
  const asWeek = countMode === "week" ? weekClean || !dayClean : !dayClean && weekClean
  const yearText = dayClean || weekClean ? year : t.workAbout(year)
  lines.push(asWeek ? t.workYearWeek(formatCount(perDay * 7), price, yearText) : t.workYearDay(formatCount(perDay), price, yearText))
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
