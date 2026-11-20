"use client"

import { Bell, CalendarCheck, CalendarDays, ChevronLeft, ChevronRight, TrendingUp, X } from "lucide-react"
import { useEffect, useRef } from "react"
import {
  MODES,
  canFill,
  cellLevel,
  dayLabel,
  firstMonth,
  googleCalendarUrl,
  icsFor,
  monthCounts,
  monthGrid,
  monthName,
  monthOf,
  patternsOf,
  shiftMonth,
  MIN_CHECKINS,
  type Day,
  type Days,
  type Reminders,
} from "./logic"
import { checkinText as t, feelingLabel, pastPhrase } from "./text"

export const TAB_ICONS = { today: CalendarCheck, month: CalendarDays, pattern: TrendingUp, reminders: Bell } as const
export type TabId = keyof typeof TAB_ICONS
export const TAB_IDS = Object.keys(TAB_ICONS) as TabId[]

export function Card({ children, testId }: { children: React.ReactNode; testId?: string }) {
  return (
    <div data-testid={testId} className="min-w-0 rounded-lg border border-border bg-card p-4">
      {children}
    </div>
  )
}

/** The tab row: icon over label, 56 px high. */
export function TabRow({ value, onChange }: { value: TabId; onChange: (id: TabId) => void }) {
  return (
    <div role="tablist" aria-label={t.tabsLabel} className="grid grid-cols-4 gap-1 rounded-lg border border-border bg-card p-1">
      {TAB_IDS.map((id) => {
        const Icon = TAB_ICONS[id]
        const on = id === value
        return (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={on}
            data-testid={`tab-${id}`}
            onClick={() => onChange(id)}
            className={`flex min-h-14 min-w-0 flex-col items-center justify-center gap-0.5 rounded-md px-1 text-sm ${on ? "bg-primary text-primary-foreground" : "text-foreground"}`}
          >
            <Icon className="size-5" aria-hidden />
            <span>{t.tabs[id]}</span>
          </button>
        )
      })}
    </div>
  )
}

/** What one day holds, in lines. */
export function DaySummary({ date, day, verb, testId, hideDate = false }: { date: string; day: Day | undefined; verb: string; testId: string; hideDate?: boolean }) {
  const lines: { id: string; text: string }[] = []
  if (day?.slipped !== undefined) lines.push({ id: "outcome", text: day.slipped ? t.slipResult(pastPhrase(verb)) : t.clearResult })
  if (day?.forecast !== undefined) lines.push({ id: "expected", text: t.sumExpected(day.forecast) })
  if (day?.hard !== undefined) lines.push({ id: "hard", text: t.sumHard(day.hard) })
  if (day?.urges !== undefined) lines.push({ id: "urges", text: t.sumUrges(day.urges) })
  if (day?.feelings?.length) lines.push({ id: "feelings", text: t.sumFeelings(day.feelings.map(feelingLabel)) })
  if (day?.pledge?.trim()) lines.push({ id: "pledge", text: t.sumPledge(day.pledge.trim()) })
  if (day?.note?.trim()) lines.push({ id: "note", text: t.sumNote(day.note.trim()) })
  return (
    <Card testId={testId}>
      {!hideDate && <h3 className="font-medium">{dayLabel(date)}</h3>}
      {lines.length === 0 ? (
        <p className="mt-1 text-sm text-muted-foreground">{t.sumEmpty}</p>
      ) : (
        <div className={`${hideDate ? "" : "mt-1 "}flex flex-col gap-1 text-sm`}>
          {lines.map((l) => (
            <p key={l.id} data-testid={`sum-${l.id}`} className="[overflow-wrap:anywhere]">
              {l.text}
            </p>
          ))}
        </div>
      )}
    </Card>
  )
}

/** Two number tiles: days checked in and clear days. */
export function CountTiles({ checked, clear, ids }: { checked: number; clear: number; ids: [string, string] }) {
  return (
    <div className="grid grid-cols-2 gap-2">
      <div className="rounded-lg border border-border bg-card p-3">
        <p className="text-2xl font-semibold" data-testid={ids[0]} data-n={checked}>
          {checked}
        </p>
        <p className="text-sm text-muted-foreground">{t.checkedShort}</p>
      </div>
      <div className="rounded-lg border border-border bg-card p-3">
        <p className="text-2xl font-semibold" data-testid={ids[1]} data-n={clear}>
          {clear}
        </p>
        <p className="text-sm text-muted-foreground">{t.clearShort}</p>
      </div>
    </div>
  )
}

const LEVEL_BG = ["", "bg-primary/20", "bg-primary/40", "bg-primary/60", "bg-primary/80", "bg-primary"]

/** The month grid: four modes, Prev and Next, counts, and a day's summary with "Fill in this day". */
export function MonthView({
  days,
  own,
  today,
  verb,
  ym,
  mode,
  picked,
  onNav,
  onFill,
}: {
  /** What the calendar shows (Black Box slips included). */
  days: Days
  /** His own check-in answers: only these are counted. */
  own: Days
  today: string
  verb: string
  /** The month, mode and picked day come from the address, so Back returns to them. */
  ym: string
  mode: number
  picked: string | null
  onNav: (patch: { m?: string; mode?: number; day?: string | null }) => void
  /** null in the example: nothing can be filled there. */
  onFill: ((date: string) => void) | null
}) {
  const first = firstMonth(own, today)
  const last = monthOf(today)
  const counts = monthCounts(own, ym)
  const summaryRef = useRef<HTMLDivElement>(null)
  const tapped = useRef(false)
  useEffect(() => {
    if (tapped.current && picked) summaryRef.current?.scrollIntoView({ block: "nearest", behavior: "smooth" })
    tapped.current = false
  }, [picked])
  const none: readonly [string, string] = ["border-border bg-card", t.legendNone]
  const legends: (readonly [string, string])[][] = [
    [["border-transparent bg-primary/80", t.legendClear], ["border-dashed border-foreground/60 bg-muted-foreground/30", t.legendSlip], none],
    [["border-transparent bg-primary/20", t.legendEasy], ["border-transparent bg-primary", t.legendVeryHard], none],
    [["border-transparent bg-primary/20", t.legendFew], ["border-transparent bg-primary", t.legendMany], none],
    [["border-transparent bg-primary/20", t.legendNotes], none],
  ]
  const navBtn = "inline-flex size-11 items-center justify-center rounded-full border border-border bg-card disabled:opacity-40"
  return (
    <section data-testid="tab-month-panel" className="flex flex-col gap-3">
      <div role="radiogroup" aria-label={t.modesLabel} data-testid="modes" className="grid grid-cols-2 gap-2">
        {t.modes.map((name, i) => (
          <button
            key={name}
            type="button"
            role="radio"
            aria-checked={mode === i}
            data-testid={`mode-${MODES[i]}`}
            onClick={() => onNav({ mode: i })}
            className={`inline-flex min-h-11 items-center justify-center rounded-full border px-4 text-sm ${mode === i ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card"}`}
          >
            {name}
          </button>
        ))}
      </div>
      <div className="flex items-center justify-between gap-2">
        <button type="button" data-testid="month-prev" aria-label={t.monthPrev} disabled={ym <= first} onClick={() => onNav({ m: shiftMonth(ym, -1), day: null })} className={navBtn}>
          <ChevronLeft className="size-5" aria-hidden />
        </button>
        <h3 data-testid="month-name" className="font-semibold">
          {monthName(ym)}
        </h3>
        <button type="button" data-testid="month-next" aria-label={t.monthNext} disabled={ym >= last} onClick={() => onNav({ m: shiftMonth(ym, 1), day: null })} className={navBtn}>
          <ChevronRight className="size-5" aria-hidden />
        </button>
      </div>
      <CountTiles checked={counts.checkedIn} clear={counts.clear} ids={["month-checked", "month-clear"]} />
      <p className="text-xs text-muted-foreground">{t.checkedNote}</p>
      <div data-testid="grid" data-mode={MODES[mode]} className="grid grid-cols-7 gap-1">
        {t.weekdays.map((w) => (
          <span key={w} className="text-center text-xs text-muted-foreground">
            {w}
          </span>
        ))}
        {monthGrid(ym).map((key, idx) => {
          if (!key) return <span key={`b${idx}`} />
          const c = cellLevel(days[key], MODES[mode])
          const future = key > today
          const tone = c.state === "slip" ? "border-dashed border-foreground/60 bg-muted-foreground/30" : c.state === "none" ? "border-border bg-card" : `border-transparent ${LEVEL_BG[c.state === "clear" ? 4 : c.level]}`
          return (
            <button
              key={key}
              type="button"
              disabled={future}
              data-testid={`cell-${key}`}
              data-state={c.state}
              data-level={c.level}
              aria-pressed={picked === key}
              onClick={() => {
                tapped.current = true
                onNav({ day: key })
              }}
              className={`flex min-h-11 flex-col items-center justify-center rounded-md border text-xs text-foreground disabled:opacity-40 ${tone} ${key === today ? "outline outline-2 -outline-offset-2 outline-foreground" : ""} ${picked === key ? "ring-2 ring-primary" : ""}`}
            >
              <span>{Number(key.slice(8))}</span>
              {c.state === "slip" ? <X className="size-3" aria-hidden /> : null}
              {c.state !== "none" && (mode === 1 || mode === 2) ? <span className="font-semibold">{c.level}</span> : null}
              {c.state !== "none" && mode === 3 ? <span aria-hidden="true">{"•"}</span> : null}
            </button>
          )
        })}
      </div>
      <ul data-testid="legend" className="flex flex-wrap gap-x-4 gap-y-2 text-xs text-muted-foreground">
        {legends[mode].map(([swatch, label]) => (
          <li key={label} className="flex items-center gap-1.5">
            <span aria-hidden="true" className={`inline-block size-5 rounded border ${swatch}`} />
            <span>{label}</span>
          </li>
        ))}
        <li className="flex items-center gap-1.5">
          <span aria-hidden="true" className="inline-block size-5 rounded border border-border bg-card outline outline-2 -outline-offset-2 outline-foreground" />
          <span>{t.legendToday}</span>
        </li>
      </ul>
      {picked ? (
        <div ref={summaryRef} className="flex flex-col gap-3">
          <DaySummary date={picked} day={days[picked]} verb={verb} testId="day-summary" />
          {onFill && canFill(picked, today) && (
            <button type="button" data-testid="fill-day" onClick={() => onFill(picked)} className="inline-flex min-h-12 items-center justify-center rounded-md border border-primary px-4 text-primary">
              {days[picked]?.slipped !== undefined || days[picked]?.hard !== undefined ? t.changeDay : t.fillDay}
            </button>
          )}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">{t.pickDay}</p>
      )}
    </section>
  )
}

/** Pattern lines from the morning forecast only. */
export function PatternView({ days, example }: { days: Days; example: boolean }) {
  const p = patternsOf(days)
  const showsLine = p.ready && (p.forecast !== null || p.pairs.n > 0)
  return (
    <section data-testid="tab-pattern-panel" className="flex flex-col gap-3">
      {!p.ready ? (
        <>
          <div
            role="progressbar"
            aria-label={t.patternBar(p.count, MIN_CHECKINS)}
            aria-valuemin={0}
            aria-valuemax={MIN_CHECKINS}
            aria-valuenow={p.count}
            className="h-1.5 w-full overflow-hidden rounded-full bg-muted"
          >
            <div className="h-full bg-primary" style={{ width: `${Math.min(100, (p.count / MIN_CHECKINS) * 100)}%` }} />
          </div>
          <p data-testid="pattern-bar-label" className="text-sm font-medium">
            {t.patternBar(p.count, MIN_CHECKINS)}
          </p>
          <p data-testid="pattern-wait">{t.patternWait(p.count)}</p>
        </>
      ) : (
        <>
          {p.forecast ? (
            <Card testId="pattern-forecast">
              <p>{t.forecastPattern(p.forecast.withDays, p.forecast.withSlips, p.forecast.otherDays, p.forecast.otherSlips)}</p>
            </Card>
          ) : (
            <p data-testid="pattern-none">{p.reason === "equal" ? t.patternEqual : t.patternNone}</p>
          )}
          {p.pairs.n > 0 && (
            <Card testId="pairs-line">
              <p>{t.pairsLine(p.pairs.n, p.pairs.harder, p.pairs.easier, p.pairs.same)}</p>
            </Card>
          )}
        </>
      )}
      {showsLine && (
        <p data-testid="pattern-own" className="text-sm text-muted-foreground">
          {example ? t.patternExample : t.patternOwn}
        </p>
      )}
    </section>
  )
}

/** Two times and a calendar file with two daily events. */
export function RemindersView({ times, onChange, today, link }: { times: Reminders; onChange: (r: Reminders) => void; today: string; link: string }) {
  const names = { morning: t.morningEvent, evening: t.eveningEvent }
  const download = () => {
    const blob = new Blob([icsFor(times, today, new Date(), link, names)], { type: "text/calendar;charset=utf-8" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = t.icsFile
    document.body.appendChild(a)
    a.click()
    a.remove()
    setTimeout(() => URL.revokeObjectURL(url), 10_000)
  }
  const btn = "inline-flex min-h-11 items-center justify-center rounded-md border border-border bg-card px-4 text-sm"
  return (
    <section data-testid="tab-reminders-panel" className="flex flex-col gap-3">
      {(["morning", "evening"] as const).map((k) => (
        <label key={k} className="flex min-h-11 items-center justify-between gap-3">
          <span>{k === "morning" ? t.remindMorning : t.remindEvening}</span>
          <input
            type="time"
            data-testid={`reminder-${k}`}
            value={times[k]}
            onChange={(e) => e.target.value && onChange({ ...times, [k]: e.target.value })}
            className="min-h-11 rounded-md border border-border bg-background px-2"
          />
        </label>
      ))}
      <p className="text-sm text-muted-foreground">{t.remindersLine}</p>
      <button type="button" data-testid="cal-ics" onClick={download} className="inline-flex min-h-12 items-center justify-center rounded-md bg-primary px-4 font-medium text-primary-foreground">
        {t.addCalendar}
      </button>
      <div className="flex flex-col gap-2">
        <a data-testid="cal-google-morning" href={googleCalendarUrl("morning", times, today, link, names)} target="_blank" rel="noopener noreferrer" className={`${btn} w-full justify-center`}>
          {t.googleMorning}
        </a>
        <a data-testid="cal-google-evening" href={googleCalendarUrl("evening", times, today, link, names)} target="_blank" rel="noopener noreferrer" className={`${btn} w-full justify-center`}>
          {t.googleEvening}
        </a>
      </div>
    </section>
  )
}
