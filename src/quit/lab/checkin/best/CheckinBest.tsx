"use client"

import { useState } from "react"
import { getAddiction } from "../../../data"
import type { QuitAddictionId } from "../../../types"
import type { LabProps } from "../../registry"
import { Card, Head, Tabs } from "../../progress/shared/Bits"
import { useLabState } from "../../store"
import { ExampleGate } from "../shared/Bits"
import { longDate, monthGrid, monthOf, prevMonth } from "../shared/logic"
import { ckText } from "../shared/text"
import {
  DEFAULT_REMINDERS,
  MIN_CHECKINS,
  cellLevel,
  lookBack,
  monthCounts,
  pairing,
  patternsOf,
  seedBest,
  splitFeelings,
  type BestDay,
  type BestDays,
  type Mode,
  type Reminders,
} from "./logic"
import { bestText as t } from "./text"

const SWITCH_IDS = ["nicotine", "alcohol", "weed", "porn"] as const satisfies readonly QuitAddictionId[]
const MODES: Mode[] = ["clear", "hard", "feelings", "notes"]
const LEVEL_BG = ["", "bg-primary/20", "bg-primary/40", "bg-primary/60", "bg-primary/80", "bg-primary"]

const nextMonth = (ym: string) => {
  const [y, m] = ym.split("-").map(Number)
  const d = new Date(y, m, 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
}
const labelOf = (key: string) => longDate(key, ckText.weekdaysLong, ckText.months)

/** Improved Daily check-in: morning pledge and forecast, evening result, his month, honest pattern lines, reminders. */
export function CheckinBest({ addiction: initial }: LabProps) {
  const [chosen, setChosen] = useLabState<string>("checkin", "best", "addiction", initial)
  const id: QuitAddictionId = (SWITCH_IDS as readonly string[]).includes(chosen) ? (chosen as QuitAddictionId) : "nicotine"
  const keys = [...SWITCH_IDS.map((x) => `days-${x}`), "reminders"]
  return (
    <div data-testid="checkin-best" className="flex flex-col gap-4">
      <div role="radiogroup" aria-label={t.addictionLabel} className="flex flex-wrap gap-2">
        {SWITCH_IDS.map((x) => (
          <button
            key={x}
            type="button"
            role="radio"
            aria-checked={id === x}
            data-testid={`switch-${x}`}
            onClick={() => setChosen(x)}
            className={`inline-flex min-h-11 items-center rounded-full border px-4 text-sm ${id === x ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card"}`}
          >
            {t.addictions[x]}
          </button>
        ))}
      </div>
      <ExampleGate letter="best" keys={keys}>
        {(seeded, today) => <Body key={id} id={id} seeded={seeded} today={today} />}
      </ExampleGate>
    </div>
  )
}

type Flow = { kind: "morning" | "evening"; date: string } | { kind: "done"; date: string } | null

function Body({ id, seeded, today }: { id: QuitAddictionId; seeded: boolean; today: string }) {
  const [days, setDays] = useLabState<BestDays>("checkin", "best", `days-${id}`, seeded ? seedBest(today) : {})
  const [reminders, setReminders] = useLabState<Reminders>("checkin", "best", "reminders", DEFAULT_REMINDERS)
  const [tab, setTab] = useState(0)
  const [flow, setFlow] = useState<Flow>(null)
  const words = getAddiction(id)?.symptomWords as Record<string, string> | undefined
  const feelings = splitFeelings(words)

  const patch = (date: string, p: Partial<BestDay>) => setDays({ ...days, [date]: { ...days[date], ...p } })

  if (flow?.kind === "morning" || flow?.kind === "evening") {
    return (
      <FlowScreen
        key={`${flow.kind}-${flow.date}`}
        kind={flow.kind}
        id={id}
        date={flow.date}
        today={today}
        day={days[flow.date]}
        feelings={feelings}
        onExit={() => setFlow(null)}
        onSave={(p) => {
          patch(flow.date, p)
          setFlow({ kind: "done", date: flow.date })
        }}
      />
    )
  }
  if (flow?.kind === "done") {
    return (
      <section data-testid="done-screen" className="flex flex-col gap-3">
        <Head title={t.doneTitle} />
        <p data-testid="saved-line" className="text-sm text-muted-foreground">
          {t.saved}
        </p>
        <DaySummary id={id} date={flow.date} day={days[flow.date]} words={words} testId="done-summary" />
        <button type="button" data-testid="done-back" onClick={() => setFlow(null)} className="min-h-11 rounded-md bg-primary px-4 text-primary-foreground">
          {t.doneBack}
        </button>
      </section>
    )
  }

  const missed = lookBack(days, today)
  const counts = monthCounts(days, monthOf(today))
  const day = days[today]
  return (
    <div className="flex flex-col gap-3">
      <Head title={t.homeTitle} />
      <Tabs items={t.tabs} value={tab} onChange={setTab} id="ck-tab" scroll />
      {tab === 0 && (
        <div data-testid="tab-today" className="flex flex-col gap-3">
          <p className="text-sm text-muted-foreground">{t.homeLine}</p>
          <p data-testid="today-date" className="text-base font-medium">
            {labelOf(today)}
          </p>
          <Card testId="morning-card">
            <h3 className="font-medium">{t.morningTitle}</h3>
            {day?.pledge?.trim() || day?.forecast !== undefined ? (
              <div className="mt-1 text-sm text-muted-foreground">
                {day?.pledge?.trim() ? <p data-testid="morning-pledge">{t.pledgeLine(day.pledge.trim())}</p> : null}
                {day?.forecast !== undefined ? <p data-testid="morning-forecast">{t.forecastLine(day.forecast)}</p> : null}
              </div>
            ) : (
              <p className="mt-1 text-sm text-muted-foreground">{t.notYet}</p>
            )}
            <button type="button" data-testid="morning-start" onClick={() => setFlow({ kind: "morning", date: today })} className="mt-2 inline-flex min-h-11 items-center rounded-md border border-border px-3 text-sm">
              {day?.forecast !== undefined || day?.pledge ? t.morningChange : t.morningStart}
            </button>
          </Card>
          <Card testId="evening-card">
            <h3 className="font-medium">{t.eveningTitle}</h3>
            {day?.slipped !== undefined ? (
              <div className="mt-1 text-sm text-muted-foreground">
                <p data-testid="evening-result">{t.resultLine(!day.slipped, id)}</p>
                {day.hard !== undefined ? <p>{t.hardLine(day.hard)}</p> : null}
              </div>
            ) : (
              <p className="mt-1 text-sm text-muted-foreground">{t.notYet}</p>
            )}
            <button type="button" data-testid="evening-start" onClick={() => setFlow({ kind: "evening", date: today })} className="mt-2 inline-flex min-h-11 items-center rounded-md border border-border px-3 text-sm">
              {day?.slipped !== undefined ? t.eveningChange : t.eveningStart}
            </button>
          </Card>
          {missed && (
            <button type="button" data-testid="lookback-start" onClick={() => setFlow({ kind: "evening", date: missed })} className="inline-flex min-h-11 items-center rounded-md border border-dashed border-border px-3 text-left text-sm">
              {t.lookBack(labelOf(missed))}
            </button>
          )}
          <Card testId="month-counts">
            <h3 className="font-medium">{t.monthCountsTitle}</h3>
            <p data-testid="count-checked" data-n={counts.checkedIn} className="mt-1 text-sm">
              {t.checkedIn(counts.checkedIn)}
            </p>
            <p data-testid="count-clear" data-n={counts.clear} className="text-sm">
              {t.clearDays(counts.clear)}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">{t.neverResets}</p>
          </Card>
        </div>
      )}
      {tab === 1 && <MonthView id={id} days={days} today={today} words={words} />}
      {tab === 2 && <PatternView days={days} words={words} />}
      {tab === 3 && (
        <section data-testid="tab-reminders" className="flex flex-col gap-3">
          <h3 className="text-lg font-semibold">{t.remindersTitle}</h3>
          <p className="text-sm text-muted-foreground">{t.remindersLine}</p>
          {(["morning", "evening"] as const).map((k) => (
            <label key={k} className="flex min-h-11 items-center justify-between gap-3 text-sm">
              <span>{k === "morning" ? t.remindMorning : t.remindEvening}</span>
              <input
                type="time"
                data-testid={`reminder-${k}`}
                value={reminders[k]}
                onChange={(e) => setReminders({ ...reminders, [k]: e.target.value })}
                className="min-h-11 rounded-md border border-border bg-background px-2"
              />
            </label>
          ))}
        </section>
      )}
    </div>
  )
}

function Scale({ value, onChange, label, testId }: { value: number | undefined; onChange: (n: number) => void; label: string; testId: string }) {
  return (
    <div role="radiogroup" aria-label={label} data-testid={testId} className="flex flex-col gap-1.5">
      {[5, 4, 3, 2, 1].map((n) => (
        <button
          key={n}
          type="button"
          role="radio"
          aria-checked={value === n}
          data-testid={`${testId}-${n}`}
          onClick={() => onChange(n)}
          className={`flex min-h-11 items-center justify-between rounded-md border px-3 text-sm ${value === n ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card"}`}
        >
          <span>{n}</span>
          <span>{n === 5 ? t.scaleHigh : n === 1 ? t.scaleLow : ""}</span>
        </button>
      ))}
    </div>
  )
}

function Chips({ list, picked, onToggle, title }: { list: [string, string][]; picked: string[]; onToggle: (k: string) => void; title: string }) {
  if (list.length === 0) return null
  return (
    <div className="flex flex-col gap-1.5">
      <h4 className="text-sm font-medium text-muted-foreground">{title}</h4>
      <div className="flex flex-wrap gap-2">
        {list.map(([k, word]) => (
          <button
            key={k}
            type="button"
            aria-pressed={picked.includes(k)}
            data-testid={`feeling-${k}`}
            onClick={() => onToggle(k)}
            className={`inline-flex min-h-11 items-center rounded-full border px-3 text-sm ${picked.includes(k) ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card"}`}
          >
            {word}
          </button>
        ))}
      </div>
    </div>
  )
}

type Step = "pledge" | "forecast" | "outcome" | "hard" | "urges" | "feelings" | "note"

function FlowScreen({
  kind,
  id,
  date,
  today,
  day,
  feelings,
  onExit,
  onSave,
}: {
  kind: "morning" | "evening"
  id: QuitAddictionId
  date: string
  today: string
  day: BestDay | undefined
  feelings: ReturnType<typeof splitFeelings>
  onExit: () => void
  onSave: (p: Partial<BestDay>) => void
}) {
  const steps: Step[] = kind === "morning" ? ["pledge", "forecast"] : ["outcome", "hard", "urges", "feelings", "note"]
  const [i, setI] = useState(0)
  const [pledge, setPledge] = useState(day?.pledge ?? "")
  const [forecast, setForecast] = useState(day?.forecast)
  const [slipped, setSlipped] = useState(day?.slipped)
  const [hard, setHard] = useState(day?.hard)
  const [urges, setUrges] = useState(day?.urges)
  const [picked, setPicked] = useState<string[]>(day?.feelings ?? [])
  const [note, setNote] = useState(day?.note ?? "")
  const step = steps[i]
  const last = i === steps.length - 1
  const toggle = (k: string) => setPicked(picked.includes(k) ? picked.filter((x) => x !== k) : [...picked, k])
  const save = () =>
    onSave(kind === "morning" ? { pledge: pledge.trim() || undefined, forecast } : { slipped, hard, urges, feelings: picked, note: note.trim() || undefined })
  const blocked = step === "outcome" && slipped === undefined
  const title =
    step === "pledge" ? t.pledgeTitle : step === "forecast" ? t.forecastTitle : step === "outcome" ? t.outcomeTitle(id) : step === "hard" ? t.hardTitle : step === "urges" ? t.urgesTitle(id) : step === "feelings" ? t.feelingsTitle : t.noteTitle
  return (
    <section data-testid={`flow-${kind}`} data-date={date} className="flex flex-col gap-3">
      <Head title={date === today ? labelOf(date) : `${t.yesterdayTag}, ${labelOf(date)}`} onBack={() => (i === 0 ? onExit() : setI(i - 1))} />
      <p className="text-xs text-muted-foreground">{t.stepOf(i + 1, steps.length)}</p>
      <h3 data-testid={`step-${step}`} className="text-lg font-semibold">
        {title}
      </h3>
      {step === "pledge" && (
        <>
          <p className="text-sm text-muted-foreground">{t.pledgeHelp}</p>
          <input
            data-testid="pledge-input"
            aria-label={t.pledgeTitle}
            placeholder={t.pledgePlaceholder}
            maxLength={140}
            value={pledge}
            onChange={(e) => setPledge(e.target.value)}
            className="min-h-11 rounded-md border border-border bg-background px-3"
          />
        </>
      )}
      {step === "forecast" && <Scale value={forecast} onChange={setForecast} label={t.forecastTitle} testId="forecast" />}
      {step === "outcome" && (
        <div role="radiogroup" aria-label={t.outcomeTitle(id)} className="flex flex-col gap-2">
          {[false, true].map((s) => (
            <button
              key={String(s)}
              type="button"
              role="radio"
              aria-checked={slipped === s}
              data-testid={s ? "outcome-slip" : "outcome-clear"}
              onClick={() => setSlipped(s)}
              className={`min-h-12 rounded-md border px-3 text-left ${slipped === s ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card"}`}
            >
              {s ? t.outcomeSlip(id) : t.outcomeClear}
            </button>
          ))}
        </div>
      )}
      {step === "hard" && (
        <>
          <p className="text-sm text-muted-foreground">{t.hardHelp}</p>
          {day?.forecast !== undefined ? <p data-testid="hard-forecast" className="text-sm">{t.forecastLine(day.forecast)}</p> : null}
          <Scale value={hard} onChange={setHard} label={t.hardTitle} testId="hard" />
        </>
      )}
      {step === "urges" && <Scale value={urges} onChange={setUrges} label={t.urgesTitle(id)} testId="urges" />}
      {step === "feelings" && (
        <>
          <p className="text-sm text-muted-foreground">{t.feelingsHelp}</p>
          <Chips list={feelings.hard} picked={picked} onToggle={toggle} title={t.feelingsHard} />
          <Chips list={feelings.good} picked={picked} onToggle={toggle} title={t.feelingsGood} />
        </>
      )}
      {step === "note" && (
        <>
          <textarea
            data-testid="note-input"
            aria-label={t.noteTitle}
            placeholder={t.notePlaceholder}
            rows={5}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className="rounded-md border border-border bg-background p-3"
          />
          <p data-testid="note-privacy" className="text-xs text-muted-foreground">
            {t.notePrivacy}
          </p>
        </>
      )}
      <button
        type="button"
        data-testid={last ? "flow-save" : "flow-next"}
        disabled={blocked}
        onClick={() => (last ? save() : setI(i + 1))}
        className="min-h-11 rounded-md bg-primary px-4 text-primary-foreground disabled:opacity-40"
      >
        {last ? t.save : t.next}
      </button>
    </section>
  )
}

function DaySummary({ id, date, day, words, testId }: { id: QuitAddictionId; date: string; day: BestDay | undefined; words: Record<string, string> | undefined; testId: string }) {
  const pair = pairing(day)
  const names = (day?.feelings ?? []).map((k) => words?.[k] ?? k)
  return (
    <Card testId={testId}>
      <h3 className="font-medium">{labelOf(date)}</h3>
      {!day ? (
        <p className="mt-1 text-sm text-muted-foreground">{t.summaryEmpty}</p>
      ) : (
        <div className="mt-1 flex flex-col gap-1 text-sm">
          <p data-testid="sum-1">{t.sumOutcome(day.slipped === undefined ? undefined : !day.slipped, id)}</p>
          <p data-testid="sum-2" data-diff={pair?.diff ?? ""}>
            {t.sumHard(day.forecast, day.hard, day.urges)}
          </p>
          <p data-testid="sum-3">{t.sumFeelings(names)}</p>
          {day.pledge?.trim() ? <p data-testid="sum-pledge" className="text-muted-foreground">{t.sumPledge(day.pledge.trim())}</p> : null}
          {day.note?.trim() ? <p data-testid="sum-note" className="text-muted-foreground">{t.sumNote(day.note.trim())}</p> : null}
        </div>
      )}
    </Card>
  )
}

function MonthView({ id, days, today, words }: { id: QuitAddictionId; days: BestDays; today: string; words: Record<string, string> | undefined }) {
  const [ym, setYm] = useState(monthOf(today))
  const [mode, setMode] = useState(0)
  const [picked, setPicked] = useState<string | null>(null)
  const counts = monthCounts(days, ym)
  const [y, m] = ym.split("-").map(Number)
  const legend = [t.legendClear, t.legendHard, t.legendFeelings, t.legendNotes][mode]
  return (
    <section data-testid="tab-month" className="flex flex-col gap-3">
      <Tabs items={t.modes} value={mode} onChange={setMode} id="mode" scroll />
      <div className="flex items-center justify-between gap-2">
        <button type="button" data-testid="month-prev" aria-label={t.monthPrev} onClick={() => setYm(prevMonth(ym))} className="inline-flex size-11 items-center justify-center rounded-full border border-border bg-card text-lg">
          {"‹"}
        </button>
        <h3 data-testid="month-name" className="font-semibold">
          {`${ckText.months[m - 1]} ${y}`}
        </h3>
        <button type="button" data-testid="month-next" aria-label={t.monthNext} onClick={() => setYm(nextMonth(ym))} className="inline-flex size-11 items-center justify-center rounded-full border border-border bg-card text-lg">
          {"›"}
        </button>
      </div>
      <p data-testid="month-counts-line" className="text-sm text-muted-foreground">
        {`${t.checkedIn(counts.checkedIn)}. ${t.clearDays(counts.clear)}`}
      </p>
      <div data-testid="grid" data-mode={MODES[mode]} className="grid grid-cols-7 gap-1">
        {t.weekdays.map((w) => (
          <span key={w} className="text-center text-xs text-muted-foreground">
            {w}
          </span>
        ))}
        {monthGrid(ym).map((key, idx) => {
          if (!key) return <span key={`b${idx}`} />
          const c = cellLevel(days[key], MODES[mode])
          const tone = c.state === "slip" ? "border-border bg-muted text-muted-foreground" : c.state === "none" ? "border-border bg-card" : `border-transparent ${LEVEL_BG[c.state === "clear" ? 4 : c.level]} text-foreground`
          return (
            <button
              key={key}
              type="button"
              data-testid={`cell-${key}`}
              data-state={c.state}
              data-level={c.level}
              aria-pressed={picked === key}
              onClick={() => setPicked(key)}
              className={`flex min-h-11 flex-col items-center justify-center rounded-md border text-xs ${tone} ${picked === key ? "ring-2 ring-primary" : ""}`}
            >
              <span>{Number(key.slice(8))}</span>
              {c.state !== "none" && mode === 1 ? <span className="font-semibold">{c.level}</span> : null}
              {c.state !== "none" && mode === 2 ? <span className="font-semibold">{c.level}</span> : null}
              {c.state !== "none" && mode === 3 ? <span aria-hidden="true">{"•"}</span> : null}
            </button>
          )
        })}
      </div>
      <p className="text-xs text-muted-foreground">{mode === 0 ? `${t.legendClear}, ${t.legendSlip.toLowerCase()} (grey), ${t.legendNone.toLowerCase()} (empty)` : legend}</p>
      {picked ? <DaySummary id={id} date={picked} day={days[picked]} words={words} testId="day-summary" /> : <p className="text-sm text-muted-foreground">{t.pickDay}</p>}
    </section>
  )
}

function PatternView({ days, words }: { days: BestDays; words: Record<string, string> | undefined }) {
  const p = patternsOf(days)
  const word = (k?: string) => (k ? (words?.[k] ?? k) : "")
  return (
    <section data-testid="tab-pattern" className="flex flex-col gap-3">
      <h3 className="text-lg font-semibold">{t.patternTitle}</h3>
      <p data-testid="pattern-own" className="text-sm text-muted-foreground">
        {t.patternOwn}
      </p>
      {!p.ready ? (
        <p data-testid="pattern-wait">{t.patternWait(p.count, MIN_CHECKINS)}</p>
      ) : (
        <>
          {p.lines.length === 0 ? <p data-testid="pattern-none">{t.patternNone(p.count)}</p> : null}
          {p.lines.map((l, k) => (
            <Card key={`${l.kind}-${l.key ?? ""}`} testId={`pattern-line-${k}`}>
              <p data-with-days={l.withDays} data-other-days={l.otherDays}>
                {l.kind === "forecast"
                  ? t.forecastPattern(l.withDays, l.withSlips, l.otherDays, l.otherSlips)
                  : l.kind === "urges"
                    ? t.urgesPattern(l.withDays, l.withSlips, l.otherDays, l.otherSlips)
                    : t.feelingPattern(word(l.key), l.withDays, l.withSlips, l.otherDays, l.otherSlips)}
              </p>
            </Card>
          ))}
          {p.pairs.n > 0 ? (
            <Card testId="pairs-line">
              <p>{t.pairsLine(p.pairs.n, p.pairs.harder, p.pairs.easier, p.pairs.same)}</p>
            </Card>
          ) : null}
        </>
      )}
    </section>
  )
}
