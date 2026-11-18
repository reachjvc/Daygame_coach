"use client"

import { useState } from "react"
import { useLabState } from "../../store"
import { PrimaryButton, Stepper } from "../../../components/kit"
import { Card, Head, IconBtn, InferredTag, NotSourced, NumField, Placeholder, PlaceholderScreen, Ring, Tabs } from "../shared/Bits"
import { dayKey, fmtMoney, keyToMs, unitsOf } from "../shared/calc"
import { useNow } from "../shared/clock"
import { SetupGate, StartOver, seedStart, type SetupField } from "../shared/Setup"
import { sharedText } from "../shared/text"
import { eText } from "./text"
import { EMPTY_WB, EXAMPLE_PER_UNIT, EXAMPLE_WEEK_UNITS, SIZES, TOTAL_LADDER, GOAL_LADDER, badgesOf, dash, dayCost, dayUnits, seedLog, wbAverage, type DayRec, type Drink, type DrinkKind, type ESetup, type Place, type Wellbeing } from "./logic"

type Screen = "dash" | "log" | "add" | "day" | "calendar" | "badges" | "note" | "baseline" | "streak" | "nextgoal" | "progress" | "settings"

const FIELDS: SetupField[] = [
  { key: "startMs", label: eText.fStart, kind: "date" },
  { key: "baseUnits", label: eText.fUnits, kind: "number" },
  { key: "baseCost", label: eText.fCost, kind: "number", step: 1 },
]
const blank = (): DayRec => ({ status: "dry", drinks: [], wb: EMPTY_WB, note: "" })
const WB_KEYS = ["mood", "energy", "sleep", "cravings"] as const

/** Copy E: dry-days ring with period tabs, current and best streak, add a drink, calendar views, three badge families, note editor. */
export function ProgressE() {
  return (
    <div data-testid="progress-e">
      <SetupGate<ESetup>
        letter="e"
        keys={["setup", "days", "base"]}
        fields={FIELDS}
        seed={(now) => ({ startMs: seedStart(now), baseUnits: EXAMPLE_WEEK_UNITS, baseCost: Math.round(EXAMPLE_WEEK_UNITS * EXAMPLE_PER_UNIT * 100) / 100, seeded: 1 })}
        own={(now) => ({ startMs: now, baseUnits: NaN, baseCost: NaN, seeded: 0 })}
      >
        {(setup, startOver) => (
          <>
            <Main setup={setup} />
            <StartOver onClick={startOver} />
          </>
        )}
      </SetupGate>
    </div>
  )
}

function Main({ setup }: { setup: ESetup }) {
  const now = useNow(30_000)
  const today = dayKey(now)
  const startKey = dayKey(setup.startMs)
  const [stored, setStored] = useLabState<Record<string, DayRec> | null>("progress", "e", "days", null)
  const [seedBase] = useState(() => (setup.seeded ? seedLog(dayKey(Date.now()), startKey) : {}))
  const days = stored ?? seedBase
  const [base, setBase] = useLabState<{ units: number; cost: number }>("progress", "e", "base", { units: setup.baseUnits, cost: setup.baseCost })
  const [screen, setScreen] = useState<Screen>("dash")
  const [open, setOpen] = useState(today)
  const [from, setFrom] = useState<Screen>("dash")
  const go = (s: Screen) => setScreen(s)
  const setDay = (k: string, rec: DayRec) => setStored({ ...days, [k]: rec })
  const eff: ESetup = { ...setup, baseUnits: base.units, baseCost: base.cost }
  const showDay = (k: string, via: Screen = "dash") => (setOpen(k), setFrom(via), go("day"))
  const nav = screen === "calendar" ? 1 : screen === "log" || screen === "add" ? 2 : screen === "progress" ? 3 : screen === "settings" ? 4 : 0
  const navTo = (i: number) => {
    if (i === 2) {
      setOpen(today)
      go("log")
    } else go((["dash", "calendar", "log", "progress", "settings"] as const)[i])
  }
  const logDry = (k: string) => setDay(k, { ...(days[k] ?? blank()), status: "dry", drinks: [] })
  const addDrink = (k: string, d: Drink) => {
    const cur = days[k] ?? blank()
    setDay(k, { ...cur, status: "drank", drinks: cur.status === "drank" ? [...cur.drinks, d] : [d] })
    showDay(k)
  }
  const rec = days[open]

  return (
    <div className="flex flex-col">
      {screen === "dash" && <Dash days={days} setup={eff} today={today} startKey={startKey} go={go} />}
      {screen === "log" && (
        <section data-testid="screen-log" className="flex flex-col gap-3">
          <Head title={eText.logTitle} onBack={() => go("dash")} inferred />
          <PrimaryButton testId="e-log-dry" onClick={() => (logDry(today), showDay(today))}>
            {eText.logDry}
          </PrimaryButton>
          <button type="button" data-testid="e-log-drink" onClick={() => go("add")} className="min-h-12 rounded-md border border-border bg-card px-4 text-base">
            {eText.logDrink}
          </button>
        </section>
      )}
      {screen === "add" && <AddDrink day={open} example={setup.seeded === 1} onBack={() => go(rec ? "day" : "log")} onAdd={(d) => addDrink(open, d)} />}
      {screen === "day" && <Day day={open} rec={rec} onClose={() => go(from)} onDry={() => logDry(open)} onDrink={() => go("add")} onWb={(w) => setDay(open, { ...(rec ?? blank()), wb: w })} onNote={() => go("note")} />}
      {screen === "calendar" && <Calendar days={days} today={today} startKey={startKey} onPick={(k) => showDay(k, "calendar")} />}
      {screen === "badges" && <Badges days={days} onBack={() => go("dash")} />}
      {screen === "note" && <Note day={open} value={rec?.note ?? ""} onClose={() => go("day")} onSave={(t) => (setDay(open, { ...(rec ?? blank()), note: t }), go("day"))} />}
      {screen === "baseline" && (
        <section data-testid="screen-baseline" className="flex flex-col gap-2">
          <Head title={eText.baselineTitle} onBack={() => go("dash")} inferred />
          <p className="text-sm text-muted-foreground">{eText.baselineLine}</p>
          <NumField label={eText.fUnits} value={base.units} onChange={(n) => setBase({ ...base, units: Number.isFinite(n) ? n : 0 })} testId="e-base-units" />
          <NumField label={eText.fCost} value={base.cost} step={1} onChange={(n) => setBase({ ...base, cost: Number.isFinite(n) ? n : 0 })} testId="e-base-cost" />
        </section>
      )}
      {screen === "streak" && <PlaceholderScreen title={eText.streakTitle} onBack={() => go("dash")} />}
      {screen === "nextgoal" && <PlaceholderScreen title={eText.nextGoalTitle} onBack={() => go("dash")} />}
      {screen === "progress" && <PlaceholderScreen title={eText.progressTitle} onBack={null} />}
      {screen === "settings" && <PlaceholderScreen title={eText.settingsTitle} onBack={null} />}
      {(screen === "dash" || screen === "calendar" || screen === "log" || screen === "progress" || screen === "settings") && <Nav value={nav} onChange={navTo} />}
    </div>
  )
}

function Dash({ days, setup, today, startKey, go }: { days: Record<string, DayRec>; setup: ESetup; today: string; startKey: string; go: (s: Screen) => void }) {
  const [p, setP] = useState(0)
  const d = dash(days, setup, p as 0 | 1 | 2 | 3, today, startKey)
  const b = badgesOf(days, 0)
  const stat = (id: string, v: React.ReactNode, label: string) => (
    <div className="flex min-w-0 flex-1 flex-col items-center gap-1 text-center">
      <span data-testid={id} className="text-2xl font-bold tabular-nums">
        {v}
      </span>
      <span className="text-xs uppercase text-muted-foreground">{label}</span>
    </div>
  )
  return (
    <section data-testid="screen-dash" className="flex flex-col gap-3">
      <div className="flex justify-center">
        <Ring value={d.dry / Math.max(1, d.dayCount)} size={190} stroke={20} testId="e-ring">
          <span data-testid="e-dry" className="text-5xl font-bold tabular-nums">
            {d.dry}
          </span>
          <span className="text-xs uppercase text-muted-foreground">{eText.dryDays}</span>
        </Ring>
      </div>
      <Tabs items={eText.periods} value={p} id="e-period" onChange={setP} />
      <div className="flex gap-1 rounded-lg border border-border bg-card p-3">
        {stat("e-units", d.units, eText.unitsSaved)}
        <div className="flex min-w-0 flex-1 flex-col items-center gap-1 text-center">
          <span data-testid="e-money" className="text-2xl font-bold tabular-nums">
            {fmtMoney(d.money)}
          </span>
          <span className="flex items-center text-xs uppercase text-muted-foreground">
            {eText.moneySaved}
            <button type="button" data-testid="e-edit-cost" aria-label={eText.editCost} onClick={() => go("baseline")} className="inline-flex size-11 items-center justify-center">
              {"✎"}
            </button>
          </span>
        </div>
        {stat("e-cal", <NotSourced />, eText.caloriesSaved)}
      </div>
      <div className="flex items-center gap-1 rounded-lg border border-border bg-card p-3">
        {stat("e-current", d.current, eText.currentStreak)}
        <button type="button" data-testid="e-streak-icon" aria-label={eText.streakIcon} onClick={() => go("streak")} className="inline-flex size-11 items-center justify-center text-lg">
          {"∿"}
        </button>
        {stat("e-best", d.best, eText.bestStreak)}
      </div>
      <Card testId="e-last" onClick={() => go("badges")}>
        <p className="text-sm text-muted-foreground">{eText.lastAchieved}</p>
        <p className="font-semibold">{b.last >= 0 ? eText.daysBadge(TOTAL_LADDER[b.last]) : eText.noneYet}</p>
      </Card>
      <PrimaryButton testId="e-next-goal" onClick={() => go("nextgoal")}>
        {eText.nextGoal}
      </PrimaryButton>
    </section>
  )
}

function AddDrink({ day, example, onBack, onAdd }: { day: string; example: boolean; onBack: () => void; onAdd: (d: Drink) => void }) {
  // Example data uses what the public add-drink screen shows: shop bought, cider, half pint, 5.5%, one.
  const [place, setPlace] = useState<Place | null>(example ? "shop" : null)
  const [kind, setKind] = useState<DrinkKind | null>(example ? "cider" : null)
  const [size, setSize] = useState<number | null>(example ? 0 : null)
  const [abv, setAbv] = useState(example ? 5.5 : NaN)
  const [qty, setQty] = useState(example ? 1 : 0)
  const [cost, setCost] = useState(NaN)
  const kinds: DrinkKind[] = ["beer", "cider", "wine"]
  const places: Place[] = ["shop", "bar"]
  const ml = kind !== null && size !== null ? SIZES[kind][size].ml : 0
  const valid = place !== null && kind !== null && size !== null && abv > 0 && qty >= 1 && Number.isFinite(cost) && cost >= 0
  const wheel = Number.isFinite(abv) ? [-0.2, -0.1, 0, 0.1, 0.2].map((s) => Math.round((abv + s) * 10) / 10).filter((v) => v > 0) : []
  const pill = (on: boolean) => `min-h-11 flex-1 rounded-md border px-2 text-sm ${on ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card"}`
  return (
    <section data-testid="screen-add" data-day={day} className="flex flex-col gap-3">
      <Head title={eText.addTitle} onBack={onBack} />
      <div className="flex gap-2">
        {places.map((pl, i) => (
          <button key={pl} type="button" aria-pressed={place === pl} data-testid={`e-place-${pl}`} onClick={() => setPlace(pl)} className={pill(place === pl)}>
            {eText.places[i]}
          </button>
        ))}
      </div>
      <div className="flex gap-2">
        {kinds.map((k, i) => (
          <button key={k} type="button" aria-pressed={kind === k} data-testid={`e-kind-${k}`} onClick={() => (setKind(k), setSize(null))} className={pill(kind === k)}>
            {eText.kinds[i]}
          </button>
        ))}
      </div>
      {kind && (
        <div className="flex gap-2">
          {SIZES[kind].map((_, i) => (
            <button key={i} type="button" aria-pressed={size === i} data-testid={`e-size-${i}`} onClick={() => setSize(i)} className={pill(size === i)}>
              {eText.sizeLabels[kind][i]}
            </button>
          ))}
        </div>
      )}
      <NumField label={eText.strengthPct} value={abv} step={0.1} testId="e-abv" onChange={setAbv} />
      {wheel.length > 0 && (
        <div className="flex items-center justify-center gap-1" data-testid="e-wheel">
          <button type="button" aria-label={eText.strengthDown} data-testid="e-abv-down" onClick={() => setAbv(Math.max(0.5, Math.round((abv - 0.1) * 10) / 10))} className="size-11 rounded-full border border-border">
            {"‹"}
          </button>
          {wheel.map((v) => (
            <button key={v} type="button" data-testid={v === abv ? "e-abv-selected" : undefined} aria-pressed={v === abv} onClick={() => setAbv(v)} className={`min-h-11 min-w-12 rounded-md px-1 text-sm ${v === abv ? "bg-primary font-bold text-primary-foreground" : "text-muted-foreground"}`}>
              {`${v.toFixed(1)}%`}
            </button>
          ))}
          <button type="button" aria-label={eText.strengthUp} data-testid="e-abv-up" onClick={() => setAbv(Math.round((abv + 0.1) * 10) / 10)} className="size-11 rounded-full border border-border">
            {"›"}
          </button>
        </div>
      )}
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">{eText.quantity}</span>
        <Stepper value={qty} min={0} max={20} onChange={setQty} label={eText.quantity} />
      </div>
      <NumField label={eText.costPer} value={cost} step={0.5} testId="e-cost" onChange={setCost} />
      <p data-testid="e-units-line" className="text-sm text-muted-foreground">
        {valid ? eText.unitsLine(unitsOf(ml, abv, qty)) : ""}
      </p>
      <PrimaryButton testId="e-add-drink" disabled={!valid} onClick={() => valid && onAdd({ kind, place, ml, abv, qty, cost })}>
        {eText.addBtn}
      </PrimaryButton>
    </section>
  )
}

function Day({ day, rec, onClose, onDry, onDrink, onWb, onNote }: { day: string; rec: DayRec | undefined; onClose: () => void; onDry: () => void; onDrink: () => void; onWb: (w: Wellbeing) => void; onNote: () => void }) {
  const [sheet, setSheet] = useState<{ idx: number; all: boolean } | null>(null)
  const d = new Date(keyToMs(day))
  const title = `${d.getDate()} ${sharedText.months[d.getMonth()].slice(0, 3)} ${d.getFullYear()}`
  const wb = rec?.wb ?? EMPTY_WB
  const pick = (level: number) => {
    if (!sheet) return
    onWb({ ...wb, [WB_KEYS[sheet.idx]]: level })
    setSheet(sheet.all && sheet.idx < 3 ? { idx: sheet.idx + 1, all: true } : null)
  }
  return (
    <section data-testid="screen-day" data-day={day} className="flex flex-col gap-3">
      <Head title={title} right={<IconBtn label={sharedText.close} onClick={onClose} testId="e-day-close">{"✕"}</IconBtn>} />
      <p data-testid="e-day-state" className="text-xl font-semibold">
        {!rec ? eText.dayNone : rec.status === "dry" ? eText.dayDry : eText.dayDrank}
      </p>
      {rec?.status === "drank" && (
        <p className="text-sm text-muted-foreground">
          {eText.unitsLine(dayUnits(rec))} {fmtMoney(dayCost(rec))}
        </p>
      )}
      <div className="flex gap-2">
        {rec?.status !== "dry" && (
          <button type="button" data-testid="e-mark-dry" onClick={onDry} className="min-h-11 flex-1 rounded-md border border-border bg-card px-3 text-sm">
            {eText.logThisDry}
          </button>
        )}
        <button type="button" data-testid="e-had-drink" onClick={onDrink} className="min-h-11 flex-1 rounded-md border border-border bg-card px-3 text-sm underline">
          {eText.iHadDrink}
        </button>
      </div>
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">{eText.wellbeing}</h3>
        <button type="button" data-testid="e-record-all" onClick={() => setSheet({ idx: 0, all: true })} className="min-h-11 rounded-full bg-primary px-4 text-sm font-medium text-primary-foreground">
          {eText.recordAll}
        </button>
      </div>
      <div className="grid grid-cols-4 gap-2">
        {eText.wbTiles.map((label, i) => (
          <button key={label} type="button" data-testid={`e-wb-${i}`} data-level={wb[WB_KEYS[i]]} onClick={() => setSheet({ idx: i, all: false })} className="flex min-h-20 flex-col items-center justify-between gap-1 rounded-lg border border-border bg-card p-2 text-xs">
            <span className="flex h-10 w-2 items-end overflow-hidden rounded-full bg-muted">
              <span className="block w-full bg-primary" style={{ height: `${(wb[WB_KEYS[i]] / 5) * 100}%` }} />
            </span>
            {label}
          </button>
        ))}
      </div>
      {sheet && (
        <div data-testid="e-sheet" className="flex flex-col gap-2 rounded-lg border border-primary bg-card p-3">
          <p className="text-sm font-medium">{`${eText.wbTiles[sheet.idx]}: ${eText.wbSheet}`}</p>
          <div className="flex gap-2">
            {eText.wbLevels.map((l, i) => (
              <button key={l} type="button" data-testid={`e-level-${i + 1}`} onClick={() => pick(i + 1)} className="min-h-11 flex-1 rounded-md border border-border">
                {l}
              </button>
            ))}
          </div>
        </div>
      )}
      {rec?.note ? (
        <Card testId="e-note-card">
          <p className="flex items-center gap-2 font-medium">
            <span aria-hidden="true" className="inline-flex size-6 items-center justify-center rounded-full border-2 border-pink-400 text-xs">
              {"✓"}
            </span>
            {eText.noteAdded}
          </p>
          <button type="button" data-testid="e-note-open" onClick={onNote} className="mt-1 min-h-11 rounded-md border border-border px-3 text-sm">
            {eText.viewEdit}
          </button>
        </Card>
      ) : (
        <button type="button" data-testid="e-note-open" onClick={onNote} className="min-h-11 rounded-md border border-border bg-card px-3 text-sm">
          {eText.addNote}
        </button>
      )}
    </section>
  )
}

function Calendar({ days, today, startKey, onPick }: { days: Record<string, DayRec>; today: string; startKey: string; onPick: (k: string) => void }) {
  const [view, setView] = useState(0)
  const [help, setHelp] = useState(false)
  const [sync, setSync] = useState(false)
  const months: { y: number; m: number }[] = []
  const t = new Date(keyToMs(today))
  const s = new Date(keyToMs(startKey))
  const total = (t.getFullYear() - s.getFullYear()) * 12 + (t.getMonth() - s.getMonth())
  for (let i = 0; i <= total; i++) {
    const d = new Date(t.getFullYear(), t.getMonth() - i, 1)
    months.push({ y: d.getFullYear(), m: d.getMonth() })
  }
  return (
    <section data-testid="screen-calendar" className="flex flex-col gap-3">
      <Head title={eText.calTitle} right={<><IconBtn label={eText.syncLabel} onClick={() => setSync(!sync)} testId="e-cal-sync">{"⟳"}</IconBtn><button type="button" data-testid="e-cal-help" aria-label={eText.calHelp} onClick={() => setHelp(!help)} className="inline-flex size-11 items-center justify-center rounded-full border border-border">{eText.help}</button></>} />
      {sync && (
        <div data-testid="e-sync-panel" className="flex flex-col gap-2">
          <InferredTag />
          <Placeholder />
        </div>
      )}
      {(view === 1 || view === 3) && (
        <div>
          <InferredTag />
        </div>
      )}
      {help && <p data-testid="e-cal-help-text" className="rounded-md border border-border bg-card p-2 text-sm">{eText.calHelpText}</p>}
      <Tabs items={eText.calViews} value={view} id="e-cal-view" onChange={setView} scroll />
      {months.map(({ y, m }) => {
        const count = new Date(y, m + 1, 0).getDate()
        const lead = (new Date(y, m, 1).getDay() + 6) % 7
        const keys = Array.from({ length: count }, (_, i) => dayKey(new Date(y, m, i + 1).getTime()))
        const recs = keys.map((k) => days[k])
        const dry = recs.filter((r) => r?.status === "dry").length
        const units = Math.round(recs.reduce((a, r) => a + (r ? dayUnits(r) : 0), 0) * 10) / 10
        const avgs = recs.map((r) => (r ? wbAverage(r.wb) : 0)).filter((n) => n > 0)
        const avg = avgs.length ? (avgs.reduce((a, b) => a + b, 0) / avgs.length).toFixed(1) : "-"
        const pillText = view === 0 ? eText.monthDry(dry) : view === 1 ? eText.monthUnits(units) : view === 2 ? eText.monthAvg(avg) : null
        return (
          <div key={`${y}-${m}`} data-testid={`e-month-${y}-${m + 1}`} className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <p className="font-semibold">{`${sharedText.months[m]} ${y}`}</p>
              {pillText && <span data-testid="e-month-pill" className="rounded-full border border-border bg-card px-3 py-0.5 text-xs">{pillText}</span>}
            </div>
            <div className="grid grid-cols-7 gap-1 text-center text-[10px] text-muted-foreground">
              {sharedText.weekdays.map((w) => (
                <span key={w}>{w}</span>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {Array.from({ length: lead }, (_, i) => (
                <span key={`l${i}`} />
              ))}
              {keys.map((k, i) => {
                const r = recs[i]
                const future = k > today
                const cls = r?.status === "dry" && view === 0 ? "border-primary bg-primary/20" : r?.status === "drank" && view === 0 ? "border-border bg-muted" : "border-border bg-card"
                return (
                  <button key={k} type="button" disabled={future} data-testid={`e-day-${k}`} data-status={r?.status ?? "none"} onClick={() => onPick(k)} className={`flex min-h-12 flex-col items-center justify-center rounded-md border text-xs disabled:opacity-40 ${cls}`}>
                    <span className="text-[10px] text-muted-foreground">{i + 1}</span>
                    {view === 0 && (r ? <span>{r.status === "dry" ? eText.dryMark : eText.drankMark}</span> : !future && <span aria-label={eText.addDay}>{"+"}</span>)}
                    {view === 1 && r && <span>{dayUnits(r)}</span>}
                    {view === 2 && r && wbAverage(r.wb) > 0 && (
                      <span className="flex h-5 w-2 items-end overflow-hidden rounded-full bg-muted">
                        <span className="block w-full bg-orange-400" style={{ height: `${(wbAverage(r.wb) / 5) * 100}%` }} />
                      </span>
                    )}
                    {view === 3 && r?.note && <span aria-hidden="true">{"•"}</span>}
                  </button>
                )
              })}
            </div>
          </div>
        )
      })}
    </section>
  )
}

function Badges({ days, onBack }: { days: Record<string, DayRec>; onBack: () => void }) {
  const b = badgesOf(days, 0)
  const circle = (key: string, label: string, on: boolean) => (
    <div key={key} data-testid={`e-badge-${key}`} data-earned={on} className={`flex size-[4.5rem] shrink-0 items-center justify-center rounded-full border-2 p-1 text-center text-[11px] leading-tight ${on ? "border-amber-400 bg-amber-400/15" : "border-border opacity-50"}`}>
      {label}
    </div>
  )
  const counter = (id: string, n: number, of: number) => (
    <div data-testid={id} className="flex size-[4.5rem] shrink-0 flex-col items-center justify-center rounded-full border-2 border-primary text-xs">
      <span className="font-bold">{`${n}/${of}`}</span>
      <span className="text-[10px] text-muted-foreground">{eText.viewAll}</span>
    </div>
  )
  const first = TOTAL_LADDER.slice(0, 3)
  return (
    <section data-testid="screen-badges" className="flex flex-col gap-4">
      <Head title={eText.badgesTitle} onBack={onBack} />
      <div>
        <h3 className="mb-2 font-semibold">{eText.famTotal}</h3>
        <div className="flex gap-2 overflow-x-auto">
          {first.map((n, i) => circle(`t${i}`, eText.daysBadge(n), b.totalDry >= n))}
          {counter("e-count-total", b.total, TOTAL_LADDER.length)}
        </div>
      </div>
      <div>
        <h3 className="mb-2 font-semibold">{eText.famGoals}</h3>
        <div className="flex gap-2 overflow-x-auto">
          {GOAL_LADDER.map((n, i) => circle(`g${i}`, eText.goalsBadge(n), b.goals > i))}
          {counter("e-count-goals", b.goals, GOAL_LADDER.length)}
        </div>
        <p className="mt-1 text-xs text-muted-foreground">{eText.goalsLine}</p>
      </div>
      <div>
        <h3 className="mb-2 font-semibold">{eText.famMissions}</h3>
        <div className="flex gap-2 overflow-x-auto">
          {circle("m0", eText.missionName, b.mission)}
          {counter("e-count-missions", b.mission ? 1 : 0, 1)}
        </div>
      </div>
    </section>
  )
}

function Note({ day, value, onClose, onSave }: { day: string; value: string; onClose: () => void; onSave: (t: string) => void }) {
  const [text, setText] = useState(value)
  const d = new Date(keyToMs(day))
  const title = `${String(d.getDate()).padStart(2, "0")} ${sharedText.months[d.getMonth()].slice(0, 3)} ${d.getFullYear()}`
  return (
    <section data-testid="screen-note" className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <button type="button" data-testid="e-note-close" onClick={onClose} className="min-h-11 px-2 text-sm text-muted-foreground">
          {sharedText.close}
        </button>
        <h2 className="font-semibold">{title}</h2>
        <button type="button" data-testid="e-note-save" onClick={() => onSave(text)} className="min-h-11 px-2 text-sm text-primary">
          {sharedText.save}
        </button>
      </div>
      <textarea data-testid="e-note-text" value={text} placeholder={eText.notePlaceholder} aria-label={eText.noteTitle} onChange={(e) => setText(e.target.value)} className="min-h-40 rounded-md border border-border bg-background p-2" />
      <div className="flex flex-wrap gap-2">
        {eText.noteChips.map((c, i) => (
          <button key={c} type="button" data-testid={`e-chip-${i}`} onClick={() => setText(text ? `${text}\n${c}` : c)} className="min-h-11 rounded-full border border-border bg-card px-3 text-sm">
            {c}
          </button>
        ))}
      </div>
      <p className="flex items-center gap-2 text-xs text-muted-foreground">
        <span role="img" aria-label={eText.lockLabel}>{"🔒"}</span>
        {eText.noteLock}
      </p>
    </section>
  )
}

function Nav({ value, onChange }: { value: number; onChange: (i: number) => void }) {
  return (
    <nav className="sticky bottom-0 z-10 mt-4 grid grid-cols-5 items-center border-t border-border bg-background">
      {eText.nav.map((label, i) =>
        i === 2 ? (
          <button key={label} type="button" data-testid="e-nav-2" aria-label={eText.logPlus} onClick={() => onChange(2)} className="mx-auto -mt-5 inline-flex size-14 items-center justify-center rounded-full bg-primary text-3xl text-primary-foreground shadow-lg">
            {"+"}
          </button>
        ) : (
          <button key={label} type="button" data-testid={`e-nav-${i}`} aria-current={i === value} onClick={() => onChange(i)} className={`min-h-12 break-words px-0.5 text-[11px] leading-tight ${i === value ? "font-semibold text-primary" : "text-muted-foreground"}`}>
            {label}
          </button>
        ),
      )}
    </nav>
  )
}
