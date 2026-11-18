"use client"

import { useEffect, useRef, useState } from "react"
import { PrimaryButton } from "../../../components/kit"
import { Card, Head, InferredTag, Placeholder, Ring } from "../../progress/shared/Bits"
import { useLabState } from "../../store"
import { ExampleGate, OtherScreen, RoundBtn } from "../shared/Bits"
import { addDays, keyToMs } from "../shared/logic"
import { ckText } from "../shared/text"
import { checkinStreak, clockDays, gap, holdFill, seedCheckins, seedInventory, seedJournal, SEED_CLOCK_DAYS, valueFromY, type Entry, type InvLog } from "./logic"
import { bText, clockLabel } from "./text"

type Screen = "home" | "clock" | "clocksettings" | "inventory" | "expect" | "invnote" | "invinfo" | "invhistory" | "journal" | "editor" | "notif" | "other"
type Times = { morning: string; evening: string; on: boolean }
const HOLD_MS = 1500
const KEYS = ["clock", "checkins", "inv", "journal", "times"]

/** Copy B: hold-to-check-in clock, morning and evening inventory, expected-difficulty slider, journal. */
export function CheckinB() {
  return (
    <div data-testid="checkin-b">
      <ExampleGate letter="b" keys={KEYS}>
        {(seeded, today) => <Main seeded={seeded} today={today} />}
      </ExampleGate>
    </div>
  )
}

function Main({ seeded, today }: { seeded: boolean; today: string }) {
  const [screen, setScreen] = useState<Screen>("home")
  const [otherTitle, setOtherTitle] = useState("")
  const [mode, setMode] = useState<"morning" | "evening">("morning")
  const [value, setValue] = useState(35)
  const [entry, setEntry] = useState<Entry | null>(null)
  const [start] = useLabState<string>("checkin", "b", "clock", seeded ? addDays(today, -SEED_CLOCK_DAYS) : today)
  const [checkins, setCheckins] = useLabState<string[]>("checkin", "b", "checkins", seeded ? seedCheckins(today) : [])
  const [inv, setInv] = useLabState<InvLog>("checkin", "b", "inv", seeded ? seedInventory(today) : {})
  const [journal, setJournal] = useLabState<Entry[]>("checkin", "b", "journal", seeded ? seedJournal(today) : [])
  const [times, setTimes] = useLabState<Times>("checkin", "b", "times", { morning: "08:05", evening: "21:00", on: true })
  const go = (s: Screen) => setScreen(s)

  const tile = (i: number) => {
    if (i === 0) return go("clock")
    if (i === 1) return go("inventory")
    if (i === 6) return go("journal")
    if (i === 8) return go("notif")
    setOtherTitle(bText.tiles[i])
    go("other")
  }
  const startSlider = (m: "morning" | "evening") => {
    setMode(m)
    setValue(inv[today]?.[m] ?? 35)
    go("expect")
  }
  const saveInv = (note: string) => {
    const cur = inv[today] ?? {}
    setInv({ ...inv, [today]: { ...cur, [mode]: value, [mode === "morning" ? "morningNote" : "eveningNote"]: note } })
    go("inventory")
  }

  return (
    <div className="flex flex-col">
      {screen === "home" && (
        <section data-testid="b-home" className="flex flex-col gap-3">
          <h2 className="text-center text-lg font-semibold">{bText.homeTitle}</h2>
          <div className="grid grid-cols-2 gap-3">
            {bText.tiles.map((label, i) => (
              <button key={label} type="button" data-testid={`b-tile-${i}`} onClick={() => tile(i)} className="flex aspect-square flex-col items-center justify-center gap-2 rounded-xl border border-border bg-card text-sm">
                <span aria-hidden="true" className="text-3xl text-sky-400">{bText.tileGlyphs[i]}</span>
                {label}
              </button>
            ))}
          </div>
        </section>
      )}
      {screen === "other" && <OtherScreen title={otherTitle} onBack={() => go("home")} />}
      {screen === "clock" && <Clock days={clockDays(start, today)} checkins={checkins} today={today} onCheckin={() => setCheckins([...checkins, today])} onClose={() => go("home")} onGear={() => go("clocksettings")} />}
      {screen === "clocksettings" && <OtherScreen title={bText.clockSettingsTitle} onBack={() => go("clock")} />}
      {screen === "inventory" && (
        <section data-testid="b-inventory" className="flex min-h-[60vh] flex-col gap-3">
          <div className="flex items-center justify-between">
            <RoundBtn label={ckText.back} testId="screen-back" onClick={() => go("home")}>{"‹"}</RoundBtn>
            <RoundBtn label={bText.infoLabel} testId="b-info" onClick={() => go("invinfo")}>{"i"}</RoundBtn>
          </div>
          <div className="my-auto flex flex-col items-stretch divide-y divide-border">
            <button type="button" data-testid="b-morning" onClick={() => startSlider("morning")} className="flex min-h-32 flex-col items-center justify-center gap-1">
              <span aria-hidden="true" className="text-3xl text-sky-400">{"☀"}</span>
              <span className="text-lg font-semibold">{bText.morning}</span>
              <span data-testid="b-morning-time" className="text-sm text-muted-foreground">{clockLabel(times.morning)}</span>
            </button>
            <button type="button" data-testid="b-evening" onClick={() => startSlider("evening")} className="flex min-h-32 flex-col items-center justify-center gap-1">
              <span aria-hidden="true" className="text-3xl text-sky-400">{"☾"}</span>
              <span className="text-lg font-semibold">{bText.evening}</span>
            </button>
          </div>
          <button type="button" data-testid="b-history-link" onClick={() => go("invhistory")} className="min-h-11 text-center text-sm underline">
            {bText.inventoryHistory}
          </button>
        </section>
      )}
      {screen === "invinfo" && <PlaceholderInfo onBack={() => go("inventory")} />}
      {screen === "expect" && (
        <section data-testid="b-expect" data-mode={mode} className="flex min-h-[70vh] flex-col items-center gap-4">
          <div className="flex w-full items-center justify-between">
            <RoundBtn label={ckText.back} testId="screen-back" onClick={() => go("inventory")}>{"←"}</RoundBtn>
            {mode === "evening" ? <InferredTag /> : <span />}
            <RoundBtn label={ckText.close} testId="b-expect-close" onClick={() => go("inventory")}>{"×"}</RoundBtn>
          </div>
          <h2 className="mt-4 text-center text-2xl font-bold">{mode === "morning" ? bText.expectQ : bText.resultQ}</h2>
          <p className="text-muted-foreground">{bText.hardDay}</p>
          <VSlider value={value} onChange={setValue} />
          <p className="text-muted-foreground">{bText.easyDay}</p>
          <div className="mt-auto w-full">
            <PrimaryButton testId="b-expect-next" onClick={() => go("invnote")}>
              {ckText.next}
            </PrimaryButton>
          </div>
        </section>
      )}
      {screen === "invnote" && <InvNote mode={mode} initial={inv[today]?.[mode === "morning" ? "morningNote" : "eveningNote"] ?? ""} onBack={() => go("expect")} onSave={saveInv} />}
      {screen === "invhistory" && <InvHistory inv={inv} today={today} onBack={() => go("inventory")} />}
      {screen === "journal" && <JournalList entries={journal} onBack={() => go("home")} onOpen={(e) => (setEntry(e), go("editor"))} onNew={() => (setEntry({ id: `n${journal.length}-${Date.now()}`, date: today, title: "", body: "" }), go("editor"))} />}
      {screen === "editor" && entry && (
        <Editor
          entry={entry}
          isNew={!journal.some((j) => j.id === entry.id)}
          onBack={() => go("journal")}
          onSave={(e) => (setJournal(journal.some((j) => j.id === e.id) ? journal.map((j) => (j.id === e.id ? e : j)) : [e, ...journal]), go("journal"))}
        />
      )}
      {screen === "notif" && <Notif times={times} onChange={setTimes} onBack={() => go("home")} />}
    </div>
  )
}

function PlaceholderInfo({ onBack }: { onBack: () => void }) {
  return (
    <section data-testid="b-info-screen" className="flex flex-col gap-3">
      <Head title={bText.infoTitle} onBack={onBack} inferred />
      <Placeholder />
    </section>
  )
}

function Clock({ days, checkins, today, onCheckin, onClose, onGear }: { days: number; checkins: string[]; today: string; onCheckin: () => void; onClose: () => void; onGear: () => void }) {
  const [page, setPage] = useState(0)
  const [fill, setFill] = useState(0)
  const startedAt = useRef<number | null>(null)
  const timer = useRef<ReturnType<typeof setInterval> | null>(null)
  const done = checkins.includes(today)
  const stop = () => {
    if (timer.current) clearInterval(timer.current)
    timer.current = null
    startedAt.current = null
  }
  useEffect(() => stop, [])
  const press = () => {
    if (done || startedAt.current !== null) return
    startedAt.current = Date.now()
    timer.current = setInterval(() => {
      const f = holdFill(Date.now() - (startedAt.current ?? Date.now()), HOLD_MS)
      setFill(f)
      if (f >= 1) {
        stop()
        onCheckin()
      }
    }, 30)
  }
  const release = () => {
    if (startedAt.current === null) return
    stop()
    setFill(0)
  }
  return (
    <section data-testid="b-clock" className="flex flex-col items-center gap-4">
      <div className="flex w-full items-center justify-between">
        <RoundBtn label={bText.closeLabel} testId="b-clock-close" onClick={onClose}>{"×"}</RoundBtn>
        <RoundBtn label={bText.settingsLabel} testId="b-clock-gear" onClick={onGear}>{"⚙"}</RoundBtn>
      </div>
      <div className="relative">
        <Ring value={0.75} size={220} stroke={14} testId="b-ring">
          <span data-testid="b-days" className="text-6xl font-bold">{days}</span>
          <span className="text-sm text-muted-foreground">{bText.daysWord}</span>
        </Ring>
        <span aria-hidden="true" data-testid="b-ring-dot" className="absolute left-1/2 top-0 size-4 -translate-x-1/2 rounded-full border-2 border-background bg-sky-300" />
      </div>
      <p className="text-lg font-semibold">{bText.clockName}</p>
      <hr className="w-full border-border" />
      <div className="flex w-full items-center justify-between gap-2">
        <button type="button" aria-label={bText.prevPage} data-testid="b-prev" disabled={page === 0} onClick={() => setPage(page - 1)} className="inline-flex size-11 items-center justify-center disabled:opacity-30">{"‹"}</button>
        <div className="flex min-h-24 flex-1 flex-col items-center justify-center gap-2">
          {page === 0 ? (
            <>
              <button
                type="button"
                data-testid="b-hold"
                data-fill={fill.toFixed(2)}
                data-done={done}
                onPointerDown={press}
                onPointerUp={release}
                onPointerLeave={release}
                onPointerCancel={release}
                onKeyDown={(e) => (e.key === " " || e.key === "Enter") && !e.repeat && press()}
                onKeyUp={release}
                onContextMenu={(e) => e.preventDefault()}
                className="relative min-h-14 w-full select-none overflow-hidden rounded-full border border-sky-400 bg-card px-6 text-base font-medium touch-none"
              >
                <span aria-hidden="true" className="absolute inset-y-0 left-0 bg-sky-500/50" style={{ width: `${(done ? 1 : fill) * 100}%` }} />
                <span className="relative">{done ? bText.checkedIn : bText.holdLabel}</span>
              </button>
              <p className="text-center text-xs text-muted-foreground">{done ? bText.checkedInLine : bText.holdLine}</p>
              {!done && <InferredTag />}
              {done && (
                <div className="flex flex-wrap items-center justify-center gap-2">
                  <p data-testid="b-checkin-streak" className="text-xs text-muted-foreground">{bText.clockStreak(checkinStreak(checkins, today))}</p>
                  <InferredTag />
                </div>
              )}
            </>
          ) : (
            <div className="w-full">
              <div className="mb-1 flex justify-end"><InferredTag /></div>
              <Placeholder />
            </div>
          )}
        </div>
        <button type="button" aria-label={bText.nextPage} data-testid="b-next" disabled={page === 2} onClick={() => setPage(page + 1)} className="inline-flex size-11 items-center justify-center disabled:opacity-30">{"›"}</button>
      </div>
      <div className="flex">
        {[0, 1, 2].map((i) => (
          <button key={i} type="button" data-testid={`b-dot-${i}`} aria-label={bText.pageDot(i + 1)} aria-current={i === page} onClick={() => setPage(i)} className="inline-flex size-11 items-center justify-center">
            <span className={`size-2.5 rounded-full ${i === page ? "bg-sky-400" : "bg-muted-foreground/40"}`} />
          </button>
        ))}
      </div>
      <div aria-hidden="true" className="-mb-8 flex h-12 w-24 items-end justify-center overflow-hidden rounded-t-full border border-border bg-card text-xs text-muted-foreground">{bText.badgePeek}</div>
    </section>
  )
}

/** Vertical pill slider: fill grows from the bottom; drag, tap or use the arrow keys. */
function VSlider({ value, onChange }: { value: number; onChange: (n: number) => void }) {
  const ref = useRef<HTMLDivElement>(null)
  const drag = useRef(false)
  const at = (clientY: number) => {
    const r = ref.current?.getBoundingClientRect()
    if (r) onChange(valueFromY(clientY, r.top, r.height))
  }
  return (
    <div
      ref={ref}
      role="slider"
      tabIndex={0}
      aria-label={bText.sliderLabel}
      aria-orientation="vertical"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={value}
      data-testid="b-slider"
      data-value={value}
      onPointerDown={(e) => ((drag.current = true), e.currentTarget.setPointerCapture(e.pointerId), at(e.clientY))}
      onPointerMove={(e) => drag.current && at(e.clientY)}
      onPointerUp={() => (drag.current = false)}
      onPointerCancel={() => (drag.current = false)}
      onKeyDown={(e) => {
        if (e.key === "ArrowUp" || e.key === "ArrowRight") onChange(Math.min(100, value + 5))
        if (e.key === "ArrowDown" || e.key === "ArrowLeft") onChange(Math.max(0, value - 5))
      }}
      className="relative h-72 w-36 touch-none overflow-hidden rounded-full bg-muted"
    >
      <div className="absolute inset-x-0 bottom-0 rounded-full bg-sky-600" style={{ height: `${Math.max(value, 14)}%` }} />
      <span data-testid="b-slider-label" className="absolute inset-x-0 top-1/2 -translate-y-1/2 text-center text-xl font-bold">{bText.percent(value)}</span>
    </div>
  )
}

function InvNote({ mode, initial, onBack, onSave }: { mode: "morning" | "evening"; initial: string; onBack: () => void; onSave: (note: string) => void }) {
  const [note, setNote] = useState(initial)
  return (
    <section data-testid="b-invnote" className="flex flex-col gap-3">
      <Head title={mode === "morning" ? bText.noteTitleMorning : bText.noteTitleEvening} onBack={onBack} inferred />
      <textarea data-testid="b-invnote-text" value={note} placeholder={bText.notePlaceholder} aria-label={bText.noteOptional} onChange={(e) => setNote(e.target.value)} className="min-h-32 w-full rounded-md border border-border bg-background p-2" />
      <PrimaryButton testId="b-invnote-save" onClick={() => onSave(note)}>
        {bText.saveInventory}
      </PrimaryButton>
    </section>
  )
}

function InvHistory({ inv, today, onBack }: { inv: InvLog; today: string; onBack: () => void }) {
  const keys = Array.from(new Set([today, ...Object.keys(inv)])).sort().reverse()
  return (
    <section data-testid="b-invhistory" className="flex flex-col gap-2">
      <Head title={bText.historyTitle} onBack={onBack} inferred />
      {keys.map((k) => {
        const d = inv[k]
        const g = gap(d)
        return (
          <Card key={k} testId={`b-hist-${k}`}>
            <p className="text-xs text-muted-foreground">{k}</p>
            <p className="flex justify-between text-sm">
              <span>{`${bText.expected}: ${d?.morning !== undefined ? bText.percent(d.morning) : bText.notDone}`}</span>
              <span>{`${bText.result}: ${d?.evening !== undefined ? bText.percent(d.evening) : bText.notDone}`}</span>
            </p>
            {g !== null && <p className="sr-only">{g}</p>}
          </Card>
        )
      })}
    </section>
  )
}

function JournalList({ entries, onBack, onOpen, onNew }: { entries: Entry[]; onBack: () => void; onOpen: (e: Entry) => void; onNew: () => void }) {
  const sorted = [...entries].sort((a, b) => (a.date < b.date ? 1 : -1))
  let last = ""
  return (
    <section data-testid="b-journal" className="flex flex-col">
      <Head title={bText.journalTitle} onBack={onBack} />
      {sorted.map((e) => {
        const d = new Date(keyToMs(e.date))
        const ym = e.date.slice(0, 7)
        const header = ym !== last
        last = ym
        return (
          <div key={e.id}>
            {header && <p className="bg-muted px-3 py-1.5 text-sm font-semibold">{`${ckText.months[d.getMonth()]} ${d.getFullYear()}`}</p>}
            <button type="button" data-testid={`b-entry-${e.id}`} onClick={() => onOpen(e)} className="flex min-h-16 w-full gap-3 border-b border-border px-3 py-3 text-left">
              <span className="flex w-10 shrink-0 flex-col items-center">
                <span className="text-xs text-muted-foreground">{ckText.weekdaysLong[d.getDay()].slice(0, 3).toUpperCase()}</span>
                <span className="text-2xl font-bold">{d.getDate()}</span>
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate font-semibold">{e.title || bText.untitled}</span>
                <span className="line-clamp-2 text-sm text-muted-foreground">{e.body}</span>
              </span>
            </button>
          </div>
        )
      })}
      <div className="pointer-events-none sticky bottom-6 -mt-9 flex justify-end pr-3">
        <button type="button" data-testid="b-journal-new" aria-label={bText.addEntry} onClick={onNew} className="pointer-events-auto inline-flex size-14 items-center justify-center rounded-full bg-primary text-2xl text-primary-foreground shadow-lg">
          {"+"}
        </button>
      </div>
    </section>
  )
}

function Editor({ entry, isNew, onBack, onSave }: { entry: Entry; isNew: boolean; onBack: () => void; onSave: (e: Entry) => void }) {
  const [e, setE] = useState(entry)
  return (
    <section data-testid="b-editor" data-new={isNew} className="flex flex-col gap-3">
      <Head title={bText.editorTitle} onBack={onBack} inferred />
      <p className="text-sm text-muted-foreground">{e.date}</p>
      <input data-testid="b-editor-title" value={e.title} placeholder={bText.titlePlaceholder} aria-label={bText.titlePlaceholder} onChange={(ev) => setE({ ...e, title: ev.target.value })} className="min-h-11 rounded-md border border-border bg-background px-2" />
      <textarea data-testid="b-editor-body" value={e.body} placeholder={bText.bodyPlaceholder} aria-label={bText.bodyPlaceholder} onChange={(ev) => setE({ ...e, body: ev.target.value })} className="min-h-40 rounded-md border border-border bg-background p-2" />
      <PrimaryButton testId="b-editor-save" onClick={() => onSave(e)}>
        {bText.saveEntry}
      </PrimaryButton>
    </section>
  )
}

function Notif({ times, onChange, onBack }: { times: Times; onChange: (t: Times) => void; onBack: () => void }) {
  return (
    <section data-testid="b-notif" className="flex flex-col gap-3">
      <Head title={bText.notifTitle} onBack={onBack} inferred />
      <p className="text-sm text-muted-foreground">{bText.notifLine}</p>
      <button type="button" data-testid="b-notif-on" aria-pressed={times.on} onClick={() => onChange({ ...times, on: !times.on })} className="min-h-11 self-start rounded-full border border-border px-4 text-sm">
        {times.on ? bText.remindOn : bText.remindOff}
      </button>
      {(["morning", "evening"] as const).map((k) => (
        <label key={k} className="flex min-h-11 items-center justify-between gap-3 text-sm">
          <span>{k === "morning" ? bText.morningTime : bText.eveningTime}</span>
          <input type="time" data-testid={`b-notif-${k}`} value={times[k]} onChange={(e) => e.target.value && onChange({ ...times, [k]: e.target.value })} className="min-h-11 rounded-md border border-border bg-background px-2" />
        </label>
      ))}
    </section>
  )
}
