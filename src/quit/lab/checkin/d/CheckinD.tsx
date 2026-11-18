"use client"

import { useState } from "react"
import { Card, Head, InferredTag, Tabs } from "../../progress/shared/Bits"
import { useLabState } from "../../store"
import { ExampleGate, OtherScreen } from "../shared/Bits"
import { keyToMs, longDate, monthGrid, monthOf, prevMonth } from "../shared/logic"
import { ckText } from "../shared/text"
import { dayAverage, dryCount, ITEMS, monthAverage, noteCount, oneDecimal, seedDaysD, unitsTotal, withStarter, type DayD, type DaysD, type Item } from "./logic"
import { dText } from "./text"

type Screen = "calendar" | "dashboard" | "progress" | "settings" | "log" | "drink" | "panel" | "picker" | "notes"
type Prefs = { badge: boolean; goal: boolean; daily: boolean; message: number; time: string }
const PREFS: Prefs = { badge: true, goal: true, daily: true, message: 0, time: "20:00" }
const KEYS = ["days", "prefs"]
const GAUGE = ["bg-orange-500", "bg-pink-600", "bg-slate-400", "bg-violet-500"]

/** Copy D: rating pickers, notes editor with starter chips, calendar with four modes, reminder screen. */
export function CheckinD() {
  return (
    <div data-testid="checkin-d">
      <ExampleGate letter="d" keys={KEYS}>
        {(seeded, today) => <Main seeded={seeded} today={today} />}
      </ExampleGate>
    </div>
  )
}

const fullDate = (key: string) => {
  const d = new Date(keyToMs(key))
  return `${String(d.getDate()).padStart(2, "0")} ${ckText.monthsShort[d.getMonth()]} ${d.getFullYear()}`
}

function Main({ seeded, today }: { seeded: boolean; today: string }) {
  const [days, setDays] = useLabState<DaysD>("checkin", "d", "days", seeded ? seedDaysD(today) : {})
  const [prefs, setPrefs] = useLabState<Prefs>("checkin", "d", "prefs", PREFS)
  const [screen, setScreen] = useState<Screen>("calendar")
  const [date, setDate] = useState(today)
  const [queue, setQueue] = useState<Item[]>([])
  const [pickItem, setPickItem] = useState<Item>("mood")
  const [back, setBack] = useState<Screen>("panel")
  const patch = (k: string, fn: (d: DayD) => DayD) => setDays({ ...days, [k]: fn(days[k] ?? { status: "dry", wellbeing: {} }) })
  const day = days[date]
  const openDay = (k: string) => {
    setDate(k)
    setScreen(days[k] ? "panel" : "log")
  }
  const startPicker = (items: Item[]) => {
    setQueue(items.slice(1))
    setPickItem(items[0])
    setScreen("picker")
  }
  const navIdx = screen === "calendar" || screen === "panel" || screen === "notes" || screen === "picker" ? 1 : screen === "dashboard" ? 0 : screen === "progress" ? 3 : screen === "settings" ? 4 : 2
  const navTo = (i: number) => {
    if (i === 2) {
      setDate(today)
      setScreen("log")
    } else setScreen((["dashboard", "calendar", "log", "progress", "settings"] as const)[i])
  }
  return (
    <div className="flex flex-col">
      {screen === "dashboard" && <OtherScreen title={dText.tabTitles[0]} onBack={null} />}
      {screen === "progress" && <OtherScreen title={dText.tabTitles[1]} onBack={null} />}
      {screen === "calendar" && <CalendarView days={days} today={today} onDay={openDay} />}
      {screen === "settings" && <Settings prefs={prefs} onChange={setPrefs} />}
      {screen === "log" && (
        <section data-testid="d-log" className="flex flex-col gap-3">
          <Head title={dText.logTitle} onBack={() => setScreen("calendar")} inferred />
          <p className="text-sm text-muted-foreground">{longDate(date, ckText.weekdaysLong, ckText.months)}</p>
          <p className="text-sm text-muted-foreground">{dText.logLine}</p>
          <button type="button" data-testid="d-dry" onClick={() => (patch(date, () => ({ status: "dry", wellbeing: {} })), setScreen("panel"))} className="min-h-14 rounded-xl bg-amber-400 px-4 font-bold text-slate-900">
            {dText.stayedDry}
          </button>
          <button type="button" data-testid="d-drink" onClick={() => setScreen("drink")} className="min-h-14 rounded-xl border border-border bg-card px-4 font-semibold">
            {dText.hadDrink}
          </button>
        </section>
      )}
      {screen === "drink" && <OtherScreen title={dText.drinkTitle} onBack={() => setScreen("log")} />}
      {screen === "panel" && day && (
        <section data-testid="d-panel" data-date={date} data-status={day.status} className="flex flex-col gap-3">
          <div className="relative overflow-hidden rounded-2xl bg-amber-400 px-4 pb-8 pt-3 text-slate-900">
            <div className="flex items-center justify-between">
              <span className="size-11" aria-hidden="true" />
              <p data-testid="d-panel-date" className="font-semibold">{fullDate(date)}</p>
              <button type="button" data-testid="d-panel-close" aria-label={dText.closeLabel} onClick={() => setScreen("calendar")} className="inline-flex size-11 items-center justify-center text-2xl">{"×"}</button>
            </div>
            {day.status === "dry" && [8, 22, 38, 56, 71, 86].map((l, i) => (
              <span key={l} aria-hidden="true" data-testid="d-confetti" className="absolute h-3 w-1.5 rounded-sm bg-slate-900/40" style={{ left: `${l}%`, top: `${14 + ((i * 23) % 50)}%`, transform: `rotate(${i * 47}deg)` }} />
            ))}
            <p data-testid="d-panel-line" className="mt-8 text-center text-3xl font-extrabold">{day.status === "dry" ? dText.dryLine : dText.drankLine}</p>
          </div>
          <button type="button" data-testid="d-had-drink" onClick={() => (patch(date, (d) => ({ ...d, status: "drank" })), setBack("panel"), setScreen("drink"))} className="min-h-11 self-center text-sm font-semibold tracking-widest underline">
            {dText.hadDrinkLink}
          </button>
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">{dText.wellbeing}</h3>
            <button type="button" data-testid="d-record-all" onClick={() => startPicker([...ITEMS])} className="min-h-11 rounded-md bg-pink-600 px-3 text-sm font-semibold text-white">
              {`+ ${dText.recordAll}`}
            </button>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {ITEMS.map((it, i) => {
              const v = day.wellbeing[it]
              return (
                <button key={it} type="button" data-testid={`d-tile-${it}`} data-value={v ?? 0} onClick={() => startPicker([it])} className="flex min-h-16 items-center gap-3 rounded-2xl border border-border bg-card px-3 text-left">
                  <span aria-hidden="true" className="relative h-10 w-2.5 overflow-hidden rounded-full bg-muted">
                    <span className={`absolute inset-x-0 bottom-0 ${GAUGE[i]}`} style={{ height: `${((v ?? 0) / 5) * 100}%` }} />
                  </span>
                  <span className="text-sm font-semibold tracking-wide">{dText.items[i]}</span>
                </button>
              )
            })}
          </div>
          <Card testId="d-note-block">
            <div className="flex items-center justify-between">
              <p className="font-semibold">{day.note?.trim() ? dText.noteAdded : dText.noNote}</p>
              {day.note?.trim() && <span aria-hidden="true" className="inline-flex size-9 items-center justify-center rounded-full border-2 border-pink-400 text-pink-400">{"✓"}</span>}
            </div>
            <button type="button" data-testid="d-note-open" onClick={() => setScreen("notes")} className="mt-2 min-h-11 rounded-md border border-border px-3 text-sm font-semibold">
              {day.note?.trim() ? dText.viewEdit : dText.addNote}
            </button>
          </Card>
        </section>
      )}
      {screen === "picker" && <Picker item={pickItem} value={day?.wellbeing[pickItem]} last={queue.length === 0} onBack={() => setScreen(back)} onPick={(n) => {
        patch(date, (d) => ({ ...d, wellbeing: { ...d.wellbeing, [pickItem]: n } }))
        if (queue.length === 0) setScreen("panel")
        else {
          setPickItem(queue[0])
          setQueue(queue.slice(1))
        }
      }} onSkip={() => {
        if (queue.length === 0) setScreen("panel")
        else {
          setPickItem(queue[0])
          setQueue(queue.slice(1))
        }
      }} />}
      {screen === "notes" && <NoteEditor date={date} note={day?.note ?? ""} onClose={(n) => (patch(date, (d) => ({ ...d, note: n })), setScreen("panel"))} />}
      {(screen === "calendar" || screen === "dashboard" || screen === "progress" || screen === "settings" || screen === "log") && (
        <nav className="sticky bottom-0 z-10 mt-4 grid grid-cols-5 items-center border-t border-border bg-background">
          {dText.nav.map((label, i) =>
            i === 2 ? (
              <button key={label} type="button" data-testid="d-nav-2" aria-label={label} onClick={() => navTo(2)} className="mx-auto -mt-4 inline-flex size-14 items-center justify-center rounded-full bg-amber-400 text-2xl font-bold text-slate-900">
                {"+"}
              </button>
            ) : (
              <button key={label} type="button" data-testid={`d-nav-${i}`} aria-current={navIdx === i} onClick={() => navTo(i)} className={`min-h-12 break-words px-0.5 text-[11px] ${navIdx === i ? "font-semibold text-amber-400" : "text-muted-foreground"}`}>
                {label}
              </button>
            ),
          )}
        </nav>
      )}
    </div>
  )
}

function Picker({ item, value, last, onBack, onPick, onSkip }: { item: Item; value: number | undefined; last: boolean; onBack: () => void; onPick: (n: number) => void; onSkip: () => void }) {
  const i = ITEMS.indexOf(item)
  return (
    <section data-testid="d-picker" data-item={item} className="flex flex-col gap-4">
      <Head title={dText.items[i]} onBack={onBack} inferred />
      <h3 className="text-center text-xl font-bold">{dText.pickerQ[i]}</h3>
      <div className="grid grid-cols-5 gap-1.5">
        {dText.pickerScale.map((s, k) => (
          <button key={s} type="button" data-testid={`d-seg-${k + 1}`} aria-label={dText.segment(k + 1)} aria-pressed={value === k + 1} onClick={() => onPick(k + 1)} className={`min-h-16 rounded-lg border text-lg font-semibold ${value === k + 1 ? "border-amber-400 bg-amber-400 text-slate-900" : "border-border bg-card"}`}>
            {s}
          </button>
        ))}
      </div>
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>{dText.pickerLow}</span>
        <span>{dText.pickerHigh}</span>
      </div>
      {!last && (
        <button type="button" data-testid="d-picker-skip" onClick={onSkip} className="min-h-11 self-center text-sm underline">
          {dText.skip}
        </button>
      )}
    </section>
  )
}

function NoteEditor({ date, note, onClose }: { date: string; note: string; onClose: (n: string) => void }) {
  const [text, setText] = useState(note)
  return (
    <section data-testid="d-notes" className="flex flex-col gap-3">
      <div className="flex items-center justify-between rounded-xl bg-amber-400 px-2 text-slate-900">
        <button type="button" data-testid="d-notes-close" onClick={() => onClose(text)} className="min-h-11 px-2 font-semibold">
          {ckText.close}
        </button>
        <p className="font-semibold">{fullDate(date)}</p>
        <span className="w-16" aria-hidden="true" />
      </div>
      <textarea data-testid="d-notes-text" value={text} placeholder={dText.notePlaceholder} aria-label={dText.notePlaceholder} onChange={(e) => setText(e.target.value)} className="min-h-40 w-full rounded-md border border-border bg-background p-3" />
      <p className="text-sm font-semibold">{dText.hintsHeading}</p>
      <div className="flex flex-wrap gap-2">
        {dText.hints.map((h, i) => (
          <button key={h} type="button" data-testid={`d-hint-${i}`} onClick={() => setText(withStarter(text, h))} className="min-h-11 rounded-full border border-border bg-card px-3 text-left text-sm">
            {h}
          </button>
        ))}
      </div>
      <p className="flex items-center gap-2 text-xs text-muted-foreground">
        <span aria-hidden="true">{"🔒"}</span>
        {dText.confidential}
      </p>
    </section>
  )
}

function CalendarView({ days, today, onDay }: { days: DaysD; today: string; onDay: (k: string) => void }) {
  const [mode, setMode] = useState(0)
  const [help, setHelp] = useState(false)
  const months = [monthOf(today), prevMonth(monthOf(today))]
  return (
    <section data-testid="d-calendar" className="flex flex-col gap-3">
      <h2 className="text-lg font-semibold">{dText.calendarTitle}</h2>
      <Tabs items={dText.modes} value={mode} onChange={setMode} id="d-mode" scroll />
      {mode === 2 && <div className="flex justify-end"><InferredTag /></div>}
      {months.map((ym) => {
        const d = new Date(keyToMs(`${ym}-01`))
        const avg = monthAverage(days, ym)
        const pill = mode === 0 ? dText.dryPill(dryCount(days, ym)) : mode === 1 ? dText.unitsPill(unitsTotal(days, ym)) : mode === 2 ? (avg === null ? "-" : dText.avgPill(oneDecimal(avg))) : dText.notesPill(noteCount(days, ym))
        return (
          <div key={ym} data-testid={`d-month-${ym}`}>
            <div className="mb-1 flex items-center justify-between">
              <h3 className="font-semibold">{`${ckText.months[d.getMonth()]} ${d.getFullYear()}`}</h3>
              <span data-testid="d-pill" className="rounded-full bg-amber-400/20 px-3 py-0.5 text-sm text-amber-300">{pill}</span>
            </div>
            <div className="mb-1 grid grid-cols-7 gap-1 text-center text-xs text-muted-foreground">
              {dText.weekdays.map((w, i) => (
                <span key={i}>{w}</span>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {monthGrid(ym).map((k, i) => {
                if (!k) return <span key={i} />
                const e = days[k]
                const future = k > today
                const avgDay = dayAverage(e)
                const base = future ? "border-border/40 text-muted-foreground/50" : !e ? "border-border text-muted-foreground" : mode === 0 ? (e.status === "dry" ? "border-amber-400 bg-amber-400 text-slate-900" : "border-border bg-slate-700 text-white") : "border-border bg-card"
                return (
                  <button key={k} type="button" data-testid={`d-cell-${k}`} data-status={e?.status ?? "none"} disabled={future} aria-label={dText.dayOpen(k)} onClick={() => onDay(k)} className={`relative flex min-h-12 flex-col items-center justify-between rounded-md border px-0.5 py-0.5 text-xs ${base}`}>
                    <span>{Number(k.slice(8))}</span>
                    {mode === 0 && <span aria-hidden="true">{e ? (e.status === "dry" ? dText.dryGlyph : dText.drankGlyph) : future ? "" : "+"}</span>}
                    {mode === 1 && <span>{e?.units ?? (e || future ? "" : "+")}</span>}
                    {mode === 2 && (
                      <span aria-hidden="true" className="h-4 w-1.5 overflow-hidden rounded-full bg-muted">
                        <span className="block w-full bg-orange-500" style={{ height: `${((avgDay ?? 0) / 5) * 100}%`, marginTop: `${100 - ((avgDay ?? 0) / 5) * 100}%` }} />
                      </span>
                    )}
                    {mode === 3 && <span aria-hidden="true">{e?.note?.trim() ? dText.noteGlyph : future ? "" : "+"}</span>}
                  </button>
                )
              })}
            </div>
          </div>
        )
      })}
      {mode === 2 && (
        <div className="flex flex-col items-end gap-1">
          <button type="button" data-testid="d-help" aria-label={dText.helpLabel} onClick={() => setHelp(!help)} className="inline-flex size-11 items-center justify-center rounded-full border border-border bg-card">{"?"}</button>
          {help && <p data-testid="d-help-line" className="text-xs text-muted-foreground">{dText.helpLine}</p>}
        </div>
      )}
    </section>
  )
}

function Settings({ prefs, onChange }: { prefs: Prefs; onChange: (p: Prefs) => void }) {
  const rows: [keyof Pick<Prefs, "badge" | "goal" | "daily">, string][] = [
    ["badge", dText.badgeAlerts],
    ["goal", dText.goalAlerts],
    ["daily", dText.dailyReminder],
  ]
  return (
    <section data-testid="d-settings" className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <h2 className="flex-1 text-lg font-semibold">{dText.settingsTitle}</h2>
        <InferredTag />
      </div>
      <p className="text-sm text-muted-foreground">{dText.settingsLine}</p>
      {rows.map(([k, label]) => (
        <button key={k} type="button" data-testid={`d-pref-${k}`} aria-pressed={prefs[k]} onClick={() => onChange({ ...prefs, [k]: !prefs[k] })} className="flex min-h-12 items-center justify-between rounded-lg border border-border bg-card px-3">
          {label}
          <span className="text-sm text-muted-foreground">{prefs[k] ? dText.on : dText.off}</span>
        </button>
      ))}
      <label className="flex min-h-12 items-center justify-between gap-3 text-sm">
        <span>{dText.chooseMessage}</span>
        <select data-testid="d-pref-message" value={prefs.message} onChange={(e) => onChange({ ...prefs, message: Number(e.target.value) })} className="min-h-11 max-w-[60%] rounded-md border border-border bg-background px-2">
          {dText.messages.map((m, i) => (
            <option key={m} value={i}>
              {m}
            </option>
          ))}
        </select>
      </label>
      <label className="flex min-h-12 items-center justify-between gap-3 text-sm">
        <span>{dText.reminderTime}</span>
        <input type="time" data-testid="d-pref-time" value={prefs.time} onChange={(e) => e.target.value && onChange({ ...prefs, time: e.target.value })} className="min-h-11 rounded-md border border-border bg-background px-2" />
      </label>
    </section>
  )
}
