"use client"

import { useState } from "react"
import { useLabState } from "../../store"
import { PrimaryButton } from "../../../components/kit"
import { Card, Head, InferredTag, NotSourced, NumField, Placeholder, PlaceholderScreen, Tabs } from "../shared/Bits"
import { DAY, HOUR, dayKey, fmtMoney, keyToMs, splitElapsed, ymdhms } from "../shared/calc"
import { useNow } from "../shared/clock"
import { SetupGate, StartOver, seedStart, type SetupField } from "../shared/Setup"
import { sharedText } from "../shared/text"
import { cText } from "./text"
import {
  STANDARD_HOURS,
  allSavings,
  current,
  dayTags,
  finished,
  goalProgress,
  habitSavings,
  lengthLabel,
  nextGoal,
  pieSlices,
  seedHabits,
  seedJournal,
  sortedGoals,
  stretchCount,
  stretchMs,
  type CHabit,
  type Entry,
  type Goal,
} from "./logic"

type Setup = { startMs: number; perDay: number; seeded: number }
type Screen = "counter" | "menu" | "milestones" | "stats" | "calendar" | "day" | "history" | "reset" | "community"

const FIELDS: SetupField[] = [
  { key: "startMs", label: cText.fStart, kind: "date" },
  { key: "perDay", label: cText.fPerDay, kind: "number", step: 0.5 },
]
const PIE_COLORS = ["#60a5fa", "#f87171", "#34d399", "#fbbf24", "#a78bfa"]
const pad = (n: number) => String(n).padStart(2, "0")
const STANDARD = STANDARD_HOURS.map((hours, i) => ({ name: cText.goalNames[i], hours }))

/** Copy C: counter with display modes, milestones, statistics, calendar, day journal, reset history. */
export function ProgressC() {
  return (
    <div data-testid="progress-c">
      <SetupGate<Setup>
        letter="c"
        fields={FIELDS}
        seed={(now) => ({ startMs: seedStart(now, 9 * HOUR + 43 * 60_000), perDay: 8, seeded: 1 })}
        own={(now) => ({ startMs: now, perDay: 8, seeded: 0 })}
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

function Main({ setup }: { setup: Setup }) {
  const now = useNow(1000)
  const [born] = useState(() => Date.now())
  const [stored, setStored] = useLabState<CHabit[] | null>("progress", "c", "habits", null)
  const habits: CHabit[] =
    stored ??
    (setup.seeded
      ? seedHabits(born, setup.startMs, setup.perDay, cText.habitNames, cText.seedNotes)
      : [{ id: "alc", name: cText.habitSingle, perDay: setup.perDay, stretches: [{ startMs: setup.startMs, endMs: null, note: "" }] }])
  const [sel, setSel] = useLabState<number>("progress", "c", "sel", 0)
  const [mode, setMode] = useLabState<number>("progress", "c", "mode", 0)
  const [personal, setPersonal] = useLabState<Record<string, Goal[]>>("progress", "c", "personal", {})
  const [journalStored, setJournal] = useLabState<Record<string, Record<string, Entry>> | null>("progress", "c", "journal", null)
  const journal = journalStored ?? (setup.seeded ? { alc: seedJournal(setup.startMs, cText.seedEntries, cText.seedMoods) } : {})
  const [screen, setScreen] = useState<Screen>("counter")
  const [dayOpen, setDayOpen] = useState(dayKey(born))
  const habit = habits[Math.min(sel, habits.length - 1)]
  const goals = sortedGoals(STANDARD, personal[habit.id] ?? [])
  const go = (s: Screen) => setScreen(s)
  const home = () => go("counter")

  const doReset = (note: string) => {
    const next = habits.map((h) => {
      if (h.id !== habit.id) return h
      const s = [...h.stretches]
      s[s.length - 1] = { ...s[s.length - 1], endMs: Date.now(), note }
      return { ...h, stretches: [...s, { startMs: Date.now(), endMs: null, note: "" }] }
    })
    setStored(next)
    home()
  }
  const saveEntry = (k: string, e: Entry | null) => {
    const mine = { ...(journal[habit.id] ?? {}) }
    if (e) mine[k] = e
    else delete mine[k]
    setJournal({ ...journal, [habit.id]: mine })
    go("calendar")
  }

  return (
    <div className="flex flex-col gap-3">
      {screen === "counter" && <Counter habits={habits} sel={sel} setSel={setSel} now={now} mode={mode} setMode={setMode} goals={goals} go={go} onJournal={() => (setDayOpen(dayKey(now)), go("day"))} />}
      {screen === "menu" && (
        <section data-testid="screen-menu" className="flex flex-col gap-2">
          <Head title={cText.menuTitle} onBack={home} />
          {cText.menu.map((label, i) => (
            <Card key={label} testId={`c-menu-${i}`} onClick={() => go((["milestones", "stats", "calendar", "history", "reset"] as const)[i])}>
              {label}
            </Card>
          ))}
        </section>
      )}
      {screen === "milestones" && <Milestones habit={habit} goals={goals} now={now} personal={personal[habit.id] ?? []} onAdd={(g) => setPersonal({ ...personal, [habit.id]: [...(personal[habit.id] ?? []), g] })} onBack={home} />}
      {screen === "stats" && <Stats habits={habits} now={now} onBack={home} />}
      {screen === "calendar" && <Calendar habit={habit} goals={goals} now={now} journal={journal[habit.id] ?? {}} onPick={(k) => (setDayOpen(k), go("day"))} onBack={home} />}
      {screen === "day" && <Day key={dayOpen} day={dayOpen} entry={(journal[habit.id] ?? {})[dayOpen] ?? null} onSave={(e) => saveEntry(dayOpen, e)} onBack={() => go("calendar")} />}
      {screen === "history" && <History habit={habit} now={now} onBack={home} />}
      {screen === "reset" && <ResetPage onDo={doReset} onBack={home} />}
      {screen === "community" && <PlaceholderScreen title={cText.communityTitle} onBack={home} />}
    </div>
  )
}

function Counter({ habits, sel, setSel, now, mode, setMode, goals, go, onJournal }: { habits: CHabit[]; sel: number; setSel: (n: number) => void; now: number; mode: number; setMode: (n: number) => void; goals: Goal[]; go: (s: Screen) => void; onJournal: () => void }) {
  const habit = habits[Math.min(sel, habits.length - 1)]
  const run = current(habit)
  const elapsed = now - run.startMs
  const hours = elapsed / HOUR
  const t = ymdhms(run.startMs, now)
  const g = nextGoal(goals, hours)
  const sp = splitElapsed(elapsed)
  const m = mode % cText.modes.length
  const total = (
    <p data-testid="c-mode-name" className="sr-only">
      {cText.modes[m]}
    </p>
  )
  const big = (v: string, small: string) => (
    <p className="text-5xl font-bold tabular-nums">
      {v} <span className="text-xl font-normal text-muted-foreground">{small}</span>
    </p>
  )
  return (
    <section data-testid="screen-counter" className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <button type="button" data-testid="c-menu-btn" aria-label={cText.menuLabel} onClick={() => go("menu")} className="inline-flex size-11 items-center justify-center rounded-full border border-border bg-card text-lg">
          {"☰"}
        </button>
        <div className="flex-1" />
        <button type="button" data-testid="c-community" aria-label={cText.community} onClick={() => go("community")} className="inline-flex size-11 items-center justify-center rounded-full border border-border bg-card">
          {"☺"}
        </button>
        <button type="button" data-testid="c-journal" aria-label={cText.journal} onClick={onJournal} className="inline-flex size-11 items-center justify-center rounded-full border border-border bg-card">
          {"✎"}
        </button>
      </div>
      <Tabs items={habits.map((h) => h.name)} value={sel} id="c-habit" onChange={setSel} scroll />
      <button type="button" data-testid="c-goal" onClick={() => go("milestones")} className="flex min-h-11 flex-col gap-1 rounded-lg border border-border bg-card p-3 text-left">
        <span className="text-sm font-medium">{g ? g.name : cText.noGoal}</span>
        <span className="h-2 overflow-hidden rounded-full bg-muted">
          <span data-testid="c-goal-bar" data-fill={g ? Math.min(1, hours / g.hours).toFixed(3) : "1"} className="block h-full bg-primary" style={{ width: `${g ? Math.min(100, (hours / g.hours) * 100) : 100}%`, transition: "width 0.6s ease" }} />
        </span>
      </button>
      <button type="button" data-testid="c-counter" data-mode={m} onClick={() => setMode((m + 1) % cText.modes.length)} className="flex min-h-48 flex-col items-center justify-center gap-2 rounded-lg border border-border bg-card p-4">
        {total}
        {m === 0 && (
          <>
            <p data-testid="c-ymd" className="text-4xl font-bold tabular-nums">
              {`${pad(t.years)}${cText.yUnit} ${pad(t.months)}${cText.mUnit} ${pad(t.days)}${cText.dUnit}`}
            </p>
            <p data-testid="c-hms" className="text-2xl tabular-nums text-muted-foreground">
              {`${pad(t.hours)}${cText.hUnit} ${pad(t.minutes)}${cText.minUnit} ${pad(t.seconds)}${cText.sUnit}`}
            </p>
          </>
        )}
        {m === 1 && big((elapsed / DAY).toFixed(2), cText.daysWord)}
        {m === 2 && big(Math.floor(hours).toLocaleString("en-US"), cText.hoursWord)}
        {m === 3 && big(Math.floor(elapsed / 60_000).toLocaleString("en-US"), cText.minutesWord)}
        {(m === 4 || m === 5) && <NotSourced />}
        {m === 6 && big(fmtMoney(Math.round(habit.perDay * (elapsed / DAY) * 100) / 100), cText.moneyWord)}
        <span className="text-xs text-muted-foreground">{cText.modes[m]}</span>
        <span className="sr-only">{sp.seconds}</span>
      </button>
      <p className="text-center text-sm text-muted-foreground">{cText.modeHint}</p>
      <p className="text-center text-sm italic">{cText.quote}</p>
    </section>
  )
}

function Milestones({ habit, goals, now, personal, onAdd, onBack }: { habit: CHabit; goals: Goal[]; now: number; personal: Goal[]; onAdd: (g: Goal) => void; onBack: () => void }) {
  const [tab, setTab] = useState(0)
  const [open, setOpen] = useState<Goal | null>(null)
  const [name, setName] = useState("")
  const [days, setDays] = useState(10)
  const run = current(habit)
  const hours = (now - run.startMs) / HOUR
  const list = tab === 0 ? goals.filter((g) => !personal.includes(g)) : personal
  const dateOf = (g: Goal) => new Date(run.startMs + g.hours * HOUR).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
  return (
    <section data-testid="screen-milestones" className="flex flex-col gap-3">
      <Head title={cText.msTitle(habit.name)} onBack={onBack} />
      <Tabs items={cText.msTabs} value={tab} id="c-ms-tab" onChange={setTab} />
      {tab === 1 && (
        <div className="flex flex-col gap-2 rounded-lg border border-border bg-card p-3">
          <p className="text-sm text-muted-foreground">{cText.personalLine}</p>
          <label className="flex min-h-11 items-center justify-between gap-3 text-sm">
            <span>{cText.goalName}</span>
            <input data-testid="c-goal-name" value={name} onChange={(e) => setName(e.target.value)} className="min-h-11 w-40 rounded-md border border-border bg-background px-2" />
          </label>
          <NumField label={cText.goalDays} value={days} step={1} min={1} onChange={setDays} testId="c-goal-days" />
          <PrimaryButton testId="c-goal-add" disabled={!name.trim() || !Number.isFinite(days) || days < 1} onClick={() => (onAdd({ name: name.trim(), hours: days * 24 }), setName(""))}>
            {cText.goalAdd}
          </PrimaryButton>
        </div>
      )}
      <ul data-testid="c-goals" className="flex flex-col gap-1.5">
        {list.map((g, i) => {
          const done = hours >= g.hours
          return (
            <li key={`${g.name}-${i}`}>
              <button type="button" data-testid={`c-goal-row-${i}`} data-done={done} disabled={!done} onClick={() => setOpen(g)} className="flex min-h-12 w-full items-center gap-3 rounded-md border border-border bg-card px-3 text-left text-sm disabled:opacity-100">
                <span aria-hidden="true">{done ? "◉" : "○"}</span>
                <span className="flex-1">
                  <span className="block font-medium">{g.name}</span>
                  <span className="block text-xs text-muted-foreground">{cText.progress(goalProgress(g.hours, hours))}</span>
                </span>
                {done && <span className="text-xs text-muted-foreground">{dateOf(g)}</span>}
              </button>
            </li>
          )
        })}
      </ul>
      {open && (
        <div data-testid="c-reached" className="flex flex-col items-center gap-3 rounded-lg border border-primary bg-card p-4 text-center">
          <p className="text-sm text-muted-foreground">{cText.msReached}</p>
          <p className="text-xs text-muted-foreground">{dateOf(open)}</p>
          <div className="flex size-32 items-center justify-center rounded-full border-4 border-amber-400 bg-amber-400/15 p-3 text-sm font-bold">{cText.msCoin(open.name)}</div>
          <button type="button" data-testid="c-reached-close" onClick={() => setOpen(null)} className="min-h-11 px-4 text-sm underline">
            {sharedText.close}
          </button>
        </div>
      )}
    </section>
  )
}

function Stats({ habits, now, onBack }: { habits: CHabit[]; now: number; onBack: () => void }) {
  const [tab, setTab] = useState(1)
  const vals = habits.map((h) => habitSavings(h, now))
  const slices = pieSlices(vals)
  const r = 15.9155
  return (
    <section data-testid="screen-stats" className="flex flex-col gap-3">
      <Head title={cText.statsTitle} onBack={onBack} />
      <Tabs items={cText.statsTabs} value={tab} id="c-stat-tab" onChange={setTab} scroll />
      {tab !== 1 ? (
        <div className="flex flex-col gap-2">
          <InferredTag />
          <Placeholder />
          <Placeholder />
        </div>
      ) : (
        <>
          <p data-testid="c-stat-total" className="text-4xl font-bold tabular-nums">
            {fmtMoney(allSavings(habits, now))}
          </p>
          <p data-testid="c-stat-line" className="text-sm text-muted-foreground">
            {cText.statsTotal(habits.length, stretchCount(habits))}
          </p>
          <svg viewBox="0 0 42 42" className="mx-auto size-48 -rotate-90" role="img" aria-label={cText.statsTabs[1]} data-testid="c-pie">
            {slices.map((s, i) => (
              <circle key={habits[i].id} cx="21" cy="21" r={r} fill="none" stroke={PIE_COLORS[i % PIE_COLORS.length]} strokeWidth="8" strokeDasharray={`${s.frac * 100} ${100 - s.frac * 100}`} strokeDashoffset={-s.start * 100} />
            ))}
          </svg>
          <ul className="flex flex-col gap-1.5">
            {habits.map((h, i) => (
              <li key={h.id} className="flex min-h-11 items-center gap-3 rounded-md border border-border bg-card px-3 text-sm">
                <span className="size-3 rounded-full" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} />
                <span className="flex-1">{h.name}</span>
                <span data-testid={`c-stat-${i}`}>{fmtMoney(vals[i])}</span>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  )
}

function Calendar({ habit, goals, now, journal, onPick, onBack }: { habit: CHabit; goals: Goal[]; now: number; journal: Record<string, Entry>; onPick: (k: string) => void; onBack: () => void }) {
  const t = new Date(now)
  const [ym, setYm] = useState({ y: t.getFullYear(), m: t.getMonth() })
  const tags = dayTags(habit, goals, now, cText.resetN)
  const first = new Date(ym.y, ym.m, 1)
  const count = new Date(ym.y, ym.m + 1, 0).getDate()
  const cells: (number | null)[] = [...Array(first.getDay()).fill(null), ...Array.from({ length: count }, (_, i) => i + 1)]
  const step = (d: number) => {
    const n = new Date(ym.y, ym.m + d, 1)
    setYm({ y: n.getFullYear(), m: n.getMonth() })
  }
  return (
    <section data-testid="screen-calendar" className="flex flex-col gap-3">
      <Head title={cText.calTitle} onBack={onBack} />
      <div className="flex items-center justify-between">
        <button type="button" data-testid="c-cal-prev" aria-label={cText.calPrev} onClick={() => step(-1)} className="size-11 rounded-full border border-border bg-card">
          {"‹"}
        </button>
        <p data-testid="c-cal-title" className="font-semibold">{`${sharedText.months[ym.m]} ${ym.y}`}</p>
        <button type="button" data-testid="c-cal-next" aria-label={cText.calNext} onClick={() => step(1)} className="size-11 rounded-full border border-border bg-card">
          {"›"}
        </button>
      </div>
      <div className="grid grid-cols-7 gap-0.5 text-center text-xs text-muted-foreground">
        {cText.weekLetters.map((l, i) => (
          <span key={i}>{l}</span>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-0.5">
        {cells.map((d, i) => {
          if (d === null) return <span key={`e${i}`} />
          const k = dayKey(new Date(ym.y, ym.m, d).getTime())
          const e = journal[k]
          const tg = tags[k] ?? []
          const reset = tg.some((x) => x.startsWith(cText.resetN(1).slice(0, 6)))
          return (
            <button
              key={k}
              type="button"
              data-testid={`c-day-${k}`}
              data-tags={tg.join("|")}
              onClick={() => onPick(k)}
              className={`flex min-h-14 flex-col items-center gap-0.5 rounded-md border p-0.5 text-xs ${reset ? "border-destructive" : "border-border"} ${e ? (e.rating <= 2 ? "bg-red-900/40" : "bg-emerald-900/40") : "bg-card"}`}
            >
              <span>{d}</span>
              {tg.slice(0, 2).map((x) => (
                <span key={x} className="w-full break-words text-[8px] leading-[1.1] text-primary">
                  {x}
                </span>
              ))}
              {e && <span className="text-[8px] text-muted-foreground">{"···"}</span>}
            </button>
          )
        })}
      </div>
    </section>
  )
}

function Day({ day, entry, onSave, onBack }: { day: string; entry: Entry | null; onSave: (e: Entry | null) => void; onBack: () => void }) {
  const [rating, setRating] = useState(entry?.rating ?? 3)
  const [mood, setMood] = useState(entry?.mood ?? cText.moods[1])
  const [text, setText] = useState(entry?.text ?? "")
  const [photo, setPhoto] = useState<string | null>(entry?.photo ?? null)
  const d = new Date(keyToMs(day))
  const title = `${sharedText.months[d.getMonth()].slice(0, 3)} ${d.getDate()}`
  const pick = (f: File | undefined) => {
    if (!f) return
    const r = new FileReader()
    r.onload = () => typeof r.result === "string" && setPhoto(r.result)
    r.readAsDataURL(f)
  }
  return (
    <section data-testid="screen-day" className="flex flex-col gap-3">
      <Head
        title={title}
        onBack={onBack}
        right={
          <>
            <button type="button" data-testid="c-day-delete" aria-label={cText.trash} onClick={() => onSave(null)} className="inline-flex size-11 items-center justify-center rounded-full border border-border bg-card">
              {"✕"}
            </button>
            <button type="button" data-testid="c-day-save" aria-label={cText.saveEntry} onClick={() => onSave({ rating, mood, text, photo })} className="inline-flex size-11 items-center justify-center rounded-full border border-primary bg-primary text-primary-foreground">
              {"✓"}
            </button>
          </>
        }
      />
      <label className="flex flex-col gap-1 text-sm font-medium">
        {cText.rate}
        <input type="range" min={1} max={5} step={1} value={rating} data-testid="c-rating" onChange={(e) => setRating(Number(e.target.value))} className="min-h-11 w-full accent-primary" />
      </label>
      <select data-testid="c-mood" aria-label={cText.rate} value={mood} onChange={(e) => setMood(e.target.value)} className="min-h-11 rounded-full border border-border bg-card px-3 text-sm">
        {cText.moods.map((m) => (
          <option key={m} value={m}>
            {m}
          </option>
        ))}
      </select>
      <p className="text-sm font-medium">{cText.question}</p>
      <textarea data-testid="c-day-text" value={text} placeholder={cText.answerPlaceholder} aria-label={cText.question} onChange={(e) => setText(e.target.value)} className="min-h-32 rounded-md border border-border bg-background p-2" />
      {photo ? (
        <div className="flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={photo} alt={cText.photo} className="size-24 rounded-md object-cover" />
          <button type="button" data-testid="c-photo-remove" onClick={() => setPhoto(null)} className="min-h-11 rounded-md border border-border px-3 text-sm">
            {cText.removePhoto}
          </button>
        </div>
      ) : (
        <label className="inline-flex min-h-11 cursor-pointer items-center justify-center rounded-md border border-border bg-card px-3 text-sm">
          {cText.addPhoto}
          <input type="file" accept="image/*" data-testid="c-photo-input" className="sr-only" onChange={(e) => pick(e.target.files?.[0])} />
        </label>
      )}
    </section>
  )
}

function History({ habit, now, onBack }: { habit: CHabit; now: number; onBack: () => void }) {
  const list = finished(habit)
  const fmt = (ms: number) => new Date(ms).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
  const download = () => {
    try {
      const rows = list.map((s, i) => ({ reset: i + 1, from: fmt(s.startMs), to: fmt(s.endMs ?? now), days: Math.round((stretchMs(s, now) / DAY) * 10) / 10, note: s.note }))
      const url = URL.createObjectURL(new Blob([JSON.stringify(rows, null, 2)], { type: "application/json" }))
      const a = document.createElement("a")
      a.href = url
      a.download = "history.json"
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      // no download here
    }
  }
  return (
    <section data-testid="screen-history" className="flex flex-col gap-3">
      <Head title={cText.historyTitle(habit.name)} onBack={onBack} right={<button type="button" data-testid="c-export" aria-label={cText.exportLabel} onClick={download} className="inline-flex size-11 items-center justify-center rounded-full border border-border bg-card">{"⇩"}</button>} />
      {list.length === 0 && <p className="text-sm text-muted-foreground">{cText.historyEmpty}</p>}
      <ul data-testid="c-history" className="flex flex-col gap-2">
        {[...list].reverse().map((s, i) => (
          <li key={s.startMs} className="flex gap-3 rounded-lg border border-border bg-card p-3">
            <div className="size-12 shrink-0 rounded-md bg-muted" aria-hidden="true" />
            <div className="min-w-0 flex-1">
              <p className="font-semibold">
                {cText.resetN(list.length - i)} <span className="font-normal text-muted-foreground" data-testid={`c-hist-len-${i}`}>{`(${lengthLabel(s, now)})`}</span>
              </p>
              <p className="text-xs text-muted-foreground">{cText.range(fmt(s.startMs), fmt(s.endMs ?? now))}</p>
              {s.note && <p className="mt-1 text-sm">{s.note}</p>}
            </div>
          </li>
        ))}
      </ul>
    </section>
  )
}

function ResetPage({ onDo, onBack }: { onDo: (note: string) => void; onBack: () => void }) {
  const [note, setNote] = useState("")
  return (
    <section data-testid="screen-reset" className="flex flex-col gap-3">
      <Head title={cText.resetTitle} onBack={onBack} inferred />
      <p className="text-sm text-muted-foreground">{cText.resetLine}</p>
      <p className="text-sm font-medium">{cText.resetNote}</p>
      <textarea data-testid="c-reset-note" value={note} placeholder={cText.resetNotePlaceholder} aria-label={cText.resetNote} onChange={(e) => setNote(e.target.value)} className="min-h-24 rounded-md border border-border bg-background p-2" />
      <PrimaryButton testId="c-reset-do" onClick={() => onDo(note.trim())}>
        {cText.resetDo}
      </PrimaryButton>
    </section>
  )
}
