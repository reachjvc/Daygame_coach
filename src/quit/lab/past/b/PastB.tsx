"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { ExampleBar, Head, InferredTag, NotSourced, Placeholder, PlaceholderScreen } from "../../progress/shared/Bits"
import { useNow } from "../../progress/shared/clock"
import { NotCopied } from "../../beliefs/shared/Bits"
import { useLabState } from "../../store"
import {
  EXAMPLE_GOAL_DAYS,
  EXAMPLE_GOAL_PRICE_USD,
  EXAMPLE_PER_DAY_USD,
  avgShare,
  averageMs,
  barShares,
  clockText,
  datesText,
  durationText,
  exampleData,
  goalShare,
  localInput,
  monthGrid,
  moneyFor,
  relapseDays,
  savings,
  stretches,
  type Entry,
  type Unit,
} from "./logic"
import { pbText } from "./text"

type Phase = "last" | "loading" | "paywall" | "hub"

interface Data {
  start: number | null
  entries: Entry[]
  ex: boolean
  reasons: string[]
  purchased: number
}
const INITIAL: Data = { start: null, entries: [], ex: true, reasons: [], purchased: 0 }

/** Copy B: a habit tracker's last-time question, slip entry, abstinence periods, progress, savings and reasons. */
export function PastB() {
  const [data, setData] = useLabState<Data>("past", "b", "data", INITIAL)
  const [phase, setPhase] = useLabState<Phase>("past", "b", "phase", "last")
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])
  if (!mounted) return null
  return <Inner data={data} setData={setData} phase={phase} setPhase={setPhase} />
}

function Inner({ data, setData, phase, setPhase }: { data: Data; setData: (d: Data) => void; phase: Phase; setPhase: (p: Phase) => void }) {
  const now = useNow(1000)
  const [tab, setTab] = useState(0)
  const [sheet, setSheet] = useState<null | "entry" | "goal" | "potential">(null)

  const ex = useMemo(() => exampleData(Date.now()), [])
  const start = data.ex ? ex.start : data.start
  const entries = data.ex ? ex.entries : data.entries
  const list = start === null ? [] : stretches(start, entries, now)

  useEffect(() => {
    if (phase !== "loading") return
    const id = setTimeout(() => setPhase("paywall"), 2000)
    return () => clearTimeout(id)
  }, [phase, setPhase])

  if (phase === "last") return <LastTime onSave={(t) => { setData({ ...data, start: t }); setPhase("loading") }} />
  if (phase === "loading") return <Loading />
  if (phase === "paywall") return <Paywall onContinue={() => setPhase("hub")} />

  const perDay = data.ex ? EXAMPLE_PER_DAY_USD : null
  const clearExample = () => setData({ ...data, ex: false, entries: [], purchased: 0 })

  if (sheet === "entry")
    return (
      <div data-testid="past-b" data-screen="entry">
        {data.ex && <ExampleBar onClear={clearExample} />}
        <EntryForm
          onClose={() => setSheet(null)}
          onSave={(e) => {
            if (data.ex) setData({ ...data, ex: false, entries: [e], start: data.start ?? Date.now(), purchased: 0 })
            else setData({ ...data, entries: [...data.entries, e] })
            setSheet(null)
          }}
        />
      </div>
    )
  if (sheet === "goal") return <div data-testid="past-b" data-screen="goal"><PlaceholderScreen title={pbText.goalScreen} onBack={() => setSheet(null)} /></div>
  if (sheet === "potential") return <div data-testid="past-b" data-screen="potential"><PlaceholderScreen title={pbText.potentialScreen} onBack={() => setSheet(null)} /></div>

  return (
    <div data-testid="past-b" data-screen={["progress", "periods", "savings", "reasons"][tab]} className="flex flex-col gap-3">
      {data.ex && <ExampleBar onClear={clearExample} />}
      <div className="flex items-start gap-2" data-testid="b-nav-box">
        <div role="tablist" className="grid min-w-0 flex-1 grid-cols-4 gap-1">
          {pbText.tabs.map((label, i) => (
            <button
              key={label}
              type="button"
              role="tab"
              aria-selected={i === tab}
              data-testid={`b-tab-${i}`}
              onClick={() => setTab(i)}
              className={`inline-flex min-h-11 min-w-0 items-center justify-center rounded-full border px-1 text-xs ${i === tab ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card"}`}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="flex shrink-0 flex-col items-center gap-1">
          <button type="button" data-testid="b-add" aria-label={pbText.addEntry} onClick={() => setSheet("entry")} className="inline-flex size-11 items-center justify-center rounded-full bg-primary text-xl text-primary-foreground">
            {"+"}
          </button>
          <InferredTag />
        </div>
      </div>

      {tab === 0 && <ProgressTab list={list} entries={entries} now={now} ex={data.ex} onGoal={() => setSheet("goal")} />}
      {tab === 1 && <PeriodsTab list={list} perDay={perDay} onBack={() => setTab(0)} />}
      {tab === 2 && <SavingsTab list={list} entries={entries} perDay={perDay} data={data} setData={setData} onPotential={() => setSheet("potential")} />}
      {tab === 3 && <ReasonsTab list={list} now={now} data={data} setData={setData} />}
    </div>
  )
}

function LastTime({ onSave }: { onSave: (t: number) => void }) {
  const [value, setValue] = useState(() => localInput(Date.now()))
  return (
    <div data-testid="past-b" data-screen="last" className="flex min-h-[calc(100dvh-8rem)] flex-col">
      <div className="flex flex-1 flex-col items-center justify-center gap-5">
        <span aria-hidden="true" className="text-6xl">{"📅"}</span>
        <h2 className="text-center text-xl font-bold">{pbText.lastTitle}</h2>
        <input type="datetime-local" data-testid="b-last" aria-label={pbText.lastPill} value={value} onChange={(e) => setValue(e.target.value)} className="min-h-12 w-full max-w-xs rounded-xl bg-muted px-4 text-center text-base" />
      </div>
      <button type="button" data-testid="b-last-save" onClick={() => { const t = Date.parse(value); onSave(Number.isFinite(t) ? t : Date.now()) }} className="sticky bottom-0 mb-3 min-h-14 w-full rounded-full bg-primary text-base font-semibold text-primary-foreground">
        {pbText.save}
      </button>
    </div>
  )
}

function Loading() {
  return (
    <div data-testid="past-b" data-screen="loading" className="flex min-h-[calc(100dvh-8rem)] items-center justify-center">
      <svg viewBox="0 0 120 60" role="img" aria-label={pbText.loadingLabel} className="w-48">
        <rect x="8" y="20" width="44" height="20" rx="10" className="fill-none stroke-primary" strokeWidth="5" />
        <rect x="68" y="20" width="44" height="20" rx="10" className="fill-none stroke-primary" strokeWidth="5" />
      </svg>
    </div>
  )
}

function Paywall({ onContinue }: { onContinue: () => void }) {
  return (
    <div data-testid="past-b" data-screen="paywall" className="flex min-h-[calc(100dvh-8rem)] flex-col justify-center gap-4">
      <NotCopied label={pbText.notCopiedPayment} />
      <button type="button" data-testid="b-paywall-continue" onClick={onContinue} className="min-h-14 w-full rounded-full bg-primary text-base font-semibold text-primary-foreground">
        {pbText.continue}
      </button>
    </div>
  )
}

function EntryForm({ onClose, onSave }: { onClose: () => void; onSave: (e: Entry) => void }) {
  const [at, setAt] = useState(() => localInput(Date.now()))
  const [note, setNote] = useState("")
  const [relapse, setRelapse] = useState(false)
  const [unit, setUnit] = useState<Unit>("money")
  const [amount, setAmount] = useState("")
  const save = () => {
    const t = Date.parse(at)
    const n = Number(amount)
    onSave({ id: String(Date.now()), at: new Date(Number.isFinite(t) ? t : Date.now()).toISOString(), note, relapse, amount: relapse && Number.isFinite(n) && n > 0 ? n : 0, unit })
  }
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <button type="button" data-testid="b-entry-close" aria-label={pbText.close} onClick={onClose} className="inline-flex size-11 items-center justify-center rounded-full border border-border bg-card">{"✕"}</button>
        <h2 className="flex-1 text-center text-lg font-semibold">{pbText.newEntry}</h2>
        <button type="button" data-testid="b-entry-save" aria-label={pbText.saveEntry} onClick={save} className="inline-flex size-11 items-center justify-center rounded-full bg-primary text-primary-foreground">{"✓"}</button>
      </div>
      <section className="flex flex-col gap-2 rounded-xl border border-border bg-card p-3">
        <h3 className="text-sm font-semibold">{pbText.whenTitle}</h3>
        <input type="datetime-local" data-testid="b-entry-at" aria-label={pbText.whenTitle} value={at} onChange={(e) => setAt(e.target.value)} className="min-h-11 rounded-lg bg-muted px-3 text-center text-sm" />
      </section>
      <section className="flex flex-col gap-2 rounded-xl border border-border bg-card p-3">
        <h3 className="text-sm font-semibold">{pbText.notesTitle}</h3>
        <textarea data-testid="b-entry-note" aria-label={pbText.notesLabel} rows={3} value={note} onChange={(e) => setNote(e.target.value)} className="rounded-lg bg-muted p-3 text-sm" />
      </section>
      <section className="flex flex-col gap-3 rounded-xl border border-border bg-card p-3">
        <div className="flex items-center gap-3">
          <h3 className="flex-1 text-sm font-semibold">{pbText.relapseTitle}</h3>
          <button type="button" role="switch" aria-checked={relapse} aria-label={pbText.relapseTitle} data-testid="b-entry-relapse" onClick={() => setRelapse(!relapse)} className={`relative inline-flex h-11 w-16 shrink-0 items-center rounded-full ${relapse ? "bg-primary" : "bg-foreground/20"}`}>
            <span className={`absolute size-8 rounded-full bg-white transition-all ${relapse ? "left-7" : "left-1"}`} />
          </button>
        </div>
        <p className="text-xs text-muted-foreground">{pbText.relapseHelp}</p>
        {relapse && (
          <div data-testid="b-spend" className="flex flex-col gap-3">
            <h3 className="text-sm font-semibold">{pbText.spendTitle}</h3>
            <p className="text-xs text-muted-foreground">{pbText.spendHelp}</p>
            <div role="tablist" className="grid grid-cols-2 gap-1 rounded-lg bg-muted p-1">
              {(["money", "time"] as const).map((u) => (
                <button key={u} type="button" role="tab" aria-selected={unit === u} data-testid={`b-unit-${u}`} onClick={() => setUnit(u)} className={`min-h-11 rounded-md text-sm ${unit === u ? "bg-background font-semibold" : ""}`}>
                  {u === "money" ? pbText.money : pbText.time}
                </button>
              ))}
            </div>
            {unit === "money" ? (
              <div className="grid grid-cols-3 gap-2">
                {pbText.chips.map((c) => (
                  <button key={c} type="button" data-testid={`b-chip-${c}`} onClick={() => setAmount(String(c))} className="min-h-11 rounded-lg border border-border bg-background text-sm">{`$${c}`}</button>
                ))}
              </div>
            ) : (
              <Placeholder />
            )}
            <input type="text" inputMode="decimal" data-testid="b-amount" aria-label={pbText.amountLabel} value={`${unit === "money" ? "$" : ""}${amount === "" ? "0" : amount}`} onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, "").replace(/^0+(?=\d)/, ""))} className="min-h-14 rounded-xl bg-muted px-4 text-center text-3xl font-semibold" />
          </div>
        )}
      </section>
    </div>
  )
}

function HabitHead({ onBack, right }: { onBack?: () => void; right?: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2">
      {onBack ? (
        <button type="button" data-testid="b-habit-back" aria-label={pbText.back} onClick={onBack} className="inline-flex size-11 items-center justify-center rounded-full border border-border bg-card text-lg">{"‹"}</button>
      ) : (
        <span className="size-11" />
      )}
      <h2 data-testid="b-habit" className="min-w-0 flex-1 truncate text-center text-base font-semibold">{pbText.habit}</h2>
      {right ?? <span className="size-11" />}
    </div>
  )
}

function MoreMenu({ testId }: { testId: string }) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <button type="button" data-testid={testId} aria-label={pbText.more} aria-expanded={open} onClick={() => setOpen(!open)} className="inline-flex size-11 items-center justify-center rounded-full border border-border bg-card">{"…"}</button>
      {open && (
        <div className="basis-full">
          <Placeholder />
        </div>
      )}
    </>
  )
}

function ProgressTab({ list, entries, now, ex, onGoal }: { list: ReturnType<typeof stretches>; entries: readonly Entry[]; now: number; ex: boolean; onGoal: () => void }) {
  const [menu, setMenu] = useState<null | "share" | "more">(null)
  const cur = list.find((s) => s.current)
  const elapsed = cur?.ms ?? 0
  const share = ex ? goalShare(elapsed, EXAMPLE_GOAL_DAYS) : 0
  const remaining = ex ? Math.max(0, EXAMPLE_GOAL_DAYS * 86_400_000 - elapsed) : null
  const d = new Date(now)
  const grid = monthGrid(d.getFullYear(), d.getMonth())
  const rows = Array.from({ length: grid.length / 7 }, (_, r) => grid.slice(r * 7, r * 7 + 7))
  const marks = relapseDays(entries, d.getFullYear(), d.getMonth())
  const arc = Math.PI * 70
  return (
    <>
      <HabitHead />
      <div className="flex items-center gap-2">
        <h3 className="min-w-0 flex-1 text-lg font-semibold">{pbText.progressTitle}</h3>
        <button type="button" data-testid="b-share" aria-label={pbText.share} aria-expanded={menu === "share"} onClick={() => setMenu(menu === "share" ? null : "share")} className="inline-flex size-11 items-center justify-center rounded-full border border-border bg-card">{"↗"}</button>
        <button type="button" data-testid="b-more" aria-label={pbText.more} aria-expanded={menu === "more"} onClick={() => setMenu(menu === "more" ? null : "more")} className="inline-flex size-11 items-center justify-center rounded-full border border-border bg-card">{"…"}</button>
      </div>
      {menu && <Placeholder />}
      <section data-testid="b-progress-card" className="flex flex-col items-center gap-2 rounded-xl border border-border bg-card p-4">
        <div className="relative" data-testid="b-ring" data-value={share.toFixed(3)}>
          <svg viewBox="0 0 180 100" role="img" aria-label={pbText.ringLabel} className="w-56">
            <path d="M20 90 A70 70 0 0 1 160 90" fill="none" strokeWidth="14" strokeLinecap="round" className="stroke-border" />
            <path d="M20 90 A70 70 0 0 1 160 90" fill="none" strokeWidth="14" strokeLinecap="round" className="stroke-primary" strokeDasharray={arc} strokeDashoffset={arc * (1 - share)} />
          </svg>
          <div className="absolute inset-x-0 bottom-2 flex justify-center text-center text-2xl font-bold">{ex ? `${Math.round(share * 100)}%` : <NotSourced />}</div>
        </div>
        {ex && <p className="text-sm text-muted-foreground">{pbText.goalName}</p>}
        {ex && <p className="text-center text-sm font-semibold">{pbText.motto}</p>}
        <div className="w-full border-t border-border pt-2 text-center">
          <p className="text-xs text-muted-foreground">{pbText.abstinenceTime}</p>
          <p data-testid="b-clean-time" className="text-base font-semibold">{durationText(elapsed)}</p>
        </div>
        <div className="w-full border-t border-border pt-2 text-center">
          <p className="text-xs text-muted-foreground">{pbText.remainingTime}</p>
          {remaining !== null ? <p data-testid="b-remaining" className="text-base font-semibold">{durationText(remaining)}</p> : <NotSourced />}
        </div>
      </section>
      <button type="button" data-testid="b-goal-row" onClick={onGoal} className="flex min-h-12 items-center gap-3 rounded-xl border border-border bg-card px-3 text-left text-sm">
        <span aria-hidden="true">{"◎"}</span>
        <span className="flex-1">{pbText.goalRow}</span>
        <span aria-hidden="true">{"›"}</span>
      </button>
      <section data-testid="b-calendar" className="rounded-xl border border-border bg-card p-3">
        <h3 className="mb-2 text-center text-base font-semibold">{`${pbText.months[d.getMonth()]} ${d.getFullYear()}`}</h3>
        <div className="grid grid-cols-7 gap-y-1 text-center text-xs text-muted-foreground">
          {pbText.weekdays.map((w) => <span key={w}>{w}</span>)}
        </div>
        <div className="mt-1 flex flex-col">
          {rows.map((row, r) => (
            <div key={r} className="relative grid grid-cols-7">
              <span aria-hidden="true" data-testid="b-cal-line" className="absolute inset-x-5 top-1/2 border-t-2 border-dotted border-muted-foreground/60" />
              {row.map((day, i) => (
                <span key={i} data-testid={day && marks.has(day) ? "b-cal-relapse" : day ? "b-cal-day" : undefined} className="relative flex h-9 items-center justify-center">
                  {day > 0 && (
                    <span className={`flex size-8 items-center justify-center rounded-full text-xs ${marks.has(day) ? "bg-rose-500 text-white" : "bg-foreground/20"}`}>
                      {marks.has(day) ? pbText.relapseMark : day}
                    </span>
                  )}
                </span>
              ))}
            </div>
          ))}
        </div>
      </section>
    </>
  )
}

function PeriodsTab({ list, perDay, onBack }: { list: ReturnType<typeof stretches>; perDay: number | null; onBack: () => void }) {
  const [sel, setSel] = useState<number | null>(null)
  const i = sel !== null && sel < list.length ? sel : list.length - 1
  const cur = list[i]
  const avg = averageMs(list)
  const shares = barShares(list)
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (ref.current) ref.current.scrollLeft = ref.current.scrollWidth
  }, [list.length])
  if (!cur) return null
  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex w-full items-center gap-2">
          <button type="button" data-testid="b-habit-back" aria-label={pbText.back} onClick={onBack} className="inline-flex size-11 items-center justify-center rounded-full border border-border bg-card text-lg">{"‹"}</button>
          <h2 data-testid="b-habit" className="min-w-0 flex-1 truncate text-center text-base font-semibold">{pbText.habit}</h2>
          <MoreMenu testId="b-periods-more" />
        </div>
      </div>
      <h3 className="text-lg font-semibold">{pbText.periodsTitle}</h3>
      <section className="flex flex-col gap-3 rounded-xl border border-border bg-card p-3">
        <p data-testid="b-avg" className="text-right text-xs text-muted-foreground">{`${pbText.avg}: ${durationText(avg)}`}</p>
        <div ref={ref} className="overflow-x-auto" data-testid="b-chart-scroll">
          <div className="relative flex h-40 items-end" style={{ minWidth: list.length * 44 }} data-testid="b-chart" data-count={list.length}>
            <div aria-hidden="true" data-testid="b-avg-line" className="pointer-events-none absolute inset-x-0 border-t border-dashed border-muted-foreground" style={{ bottom: `${(avgShare(list) ?? 0) * 98}%` }} />
            {list.map((s, k) => (
              <button key={k} type="button" data-testid={`b-bar-${k}`} data-current={s.current ? "1" : "0"} data-selected={k === i ? "1" : "0"} aria-label={`${pbText.barLabel} ${k + 1}`} onClick={() => setSel(k)} className="flex h-full w-11 shrink-0 items-end justify-center">
                <span className={`block w-6 rounded-t ${s.current ? "bg-primary/40" : "bg-primary"} ${k === i ? "ring-2 ring-foreground/60" : ""}`} style={{ height: `${Math.max(2, shares[k] * 98)}%` }} />
              </button>
            ))}
          </div>
        </div>
        <div className="flex flex-col divide-y divide-border">
          <div className="flex min-h-12 items-center gap-3 py-2">
            <span aria-hidden="true">{"⏳"}</span>
            <div><p className="text-xs text-muted-foreground">{pbText.duration}</p><p data-testid="b-duration" className="text-sm font-semibold">{durationText(cur.ms)}</p></div>
          </div>
          <div className="flex min-h-12 items-center gap-3 py-2">
            <span aria-hidden="true">{"🗓"}</span>
            <div><p className="text-xs text-muted-foreground">{pbText.dates}</p><p data-testid="b-dates" className="text-sm font-semibold">{datesText(cur)}</p></div>
          </div>
          <div className="flex min-h-12 items-center gap-3 py-2">
            <span aria-hidden="true">{"💰"}</span>
            <div><p className="text-xs text-muted-foreground">{pbText.moneySaved}</p>{perDay === null ? <NotSourced /> : <p data-testid="b-money" className="text-sm font-semibold">{`$${moneyFor(cur.ms, perDay)}`}</p>}</div>
          </div>
        </div>
      </section>
      <p className="text-center text-sm text-muted-foreground">{pbText.tagline}</p>
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2"><h3 className="flex-1 text-sm font-semibold">{pbText.stretchList}</h3><InferredTag /></div>
        <Placeholder />
      </div>
    </>
  )
}

function SavingsTab({ list, entries, perDay, data, setData, onPotential }: { list: ReturnType<typeof stretches>; entries: readonly Entry[]; perDay: number | null; data: Data; setData: (d: Data) => void; onPotential: () => void }) {
  const [unit, setUnit] = useState<Unit>("money")
  const [card, setCard] = useState(true)
  const s = perDay === null ? null : savings(list, entries, perDay, data.purchased)
  const usd = (n: number) => `$${n}`
  const rows: [string, number | null, string][] = [
    [pbText.balance, s?.balance ?? null, "b-balance"],
    [pbText.sinceBegan, s?.sinceBegan ?? null, "b-since"],
    [pbText.fromBeginning, s?.fromBeginning ?? null, "b-from"],
  ]
  const after = s ? Math.round((s.balance - EXAMPLE_GOAL_PRICE_USD) * 10) / 10 : null
  return (
    <>
      <div role="tablist" className="grid grid-cols-2 gap-1 rounded-lg bg-muted p-1">
        {(["money", "time"] as const).map((u) => (
          <button key={u} type="button" role="tab" aria-selected={unit === u} data-testid={`b-sav-${u}`} onClick={() => setUnit(u)} className={`min-h-11 rounded-md text-sm ${unit === u ? "bg-background font-semibold" : ""}`}>
            {u === "money" ? pbText.money : pbText.time}
          </button>
        ))}
      </div>
      <Head title={pbText.savingsTitle} />
      <section className="flex flex-col divide-y divide-border rounded-xl border border-border bg-card px-3">
        {rows.map(([label, v, id]) => (
          <div key={id} className="flex min-h-14 flex-col justify-center py-2">
            <p className="text-xs text-muted-foreground">{label}</p>
            {unit === "money" && v !== null ? <p data-testid={id} data-value={v} className="text-lg font-semibold">{usd(v)}</p> : <NotSourced />}
          </div>
        ))}
      </section>
      <button type="button" data-testid="b-potential" onClick={onPotential} className="flex min-h-12 items-center gap-3 rounded-xl border border-border bg-card px-3 text-left text-sm text-primary">
        <span className="flex-1">{pbText.potential}</span>
        <span aria-hidden="true">{"›"}</span>
      </button>
      {perDay !== null && unit === "money" && after !== null && card ? (
        <section data-testid="b-purchase" className="flex flex-col gap-3 rounded-xl border border-border bg-card p-3">
          <div className="flex items-center justify-between"><span className="text-base font-semibold">{pbText.goalItem}</span><span className="text-sm text-primary">{s && s.balance >= EXAMPLE_GOAL_PRICE_USD ? "100%" : `${Math.round(((s?.balance ?? 0) / EXAMPLE_GOAL_PRICE_USD) * 100)}%`}</span></div>
          <div className="flex justify-between text-sm text-muted-foreground"><span>{pbText.afterPurchase}</span><span data-testid="b-after">{usd(after)}</span></div>
          <div className="grid grid-cols-2 gap-3">
            <button type="button" data-testid="b-cancel" onClick={() => setCard(false)} className="min-h-12 rounded-full bg-muted text-sm font-semibold">{pbText.cancel}</button>
            <button type="button" data-testid="b-buy" disabled={after < 0} onClick={() => { setData({ ...data, purchased: data.purchased + EXAMPLE_GOAL_PRICE_USD }); setCard(false) }} className="min-h-12 rounded-full bg-primary text-sm font-semibold text-primary-foreground disabled:opacity-50">{pbText.purchase}</button>
          </div>
        </section>
      ) : (
        <Placeholder />
      )}
    </>
  )
}

function ReasonsTab({ list, now, data, setData }: { list: ReturnType<typeof stretches>; now: number; data: Data; setData: (d: Data) => void }) {
  const [page, setPage] = useState(0)
  const [draft, setDraft] = useState("")
  const cur = list.find((s) => s.current)
  const reasons = [...(data.ex ? pbText.exampleReasons : []), ...data.reasons]
  const add = () => {
    const t = draft.trim()
    if (!t) return
    setData({ ...data, reasons: [...data.reasons, t] })
    setDraft("")
  }
  void now
  return (
    <>
      <section data-testid="b-age-card" className="flex flex-col items-center gap-1 rounded-xl border border-border bg-card p-4">
        {page === 0 ? (
          <>
            <p className="text-xs uppercase text-muted-foreground">{pbText.ageLabel}</p>
            <Placeholder className="w-full" />
            <p data-testid="b-age-clock" className="text-sm text-muted-foreground">{clockText(cur?.ms ?? 0)}</p>
          </>
        ) : (
          <Placeholder className="w-full" />
        )}
        <div className="flex">
          {[0, 1].map((p) => (
            <button key={p} type="button" data-testid={`b-page-${p}`} aria-label={`${pbText.page} ${p + 1}`} aria-current={page === p} onClick={() => setPage(p)} className="inline-flex size-11 items-center justify-center">
              <span className={`block size-2 rounded-full ${page === p ? "bg-primary" : "bg-border"}`} />
            </button>
          ))}
        </div>
      </section>
      <Head title={pbText.reasonsTitle} />
      <ol data-testid="b-reasons" className="flex flex-col gap-2">
        {reasons.map((r, i) => (
          <li key={`${i}-${r}`} className="flex min-h-12 items-center gap-3 rounded-xl border border-border bg-card px-3 py-2 text-sm">
            <span className="inline-flex size-7 shrink-0 items-center justify-center rounded-md bg-primary/15 text-xs font-bold">{i + 1}</span>
            <span className="min-w-0 flex-1">{r}</span>
          </li>
        ))}
      </ol>
      <div className="flex items-center gap-2">
        <InferredTag />
        <input data-testid="b-reason-input" aria-label={pbText.reasonPlaceholder} placeholder={pbText.reasonPlaceholder} value={draft} onChange={(e) => setDraft(e.target.value)} className="min-h-11 min-w-0 flex-1 rounded-lg border border-border bg-background px-3 text-sm" />
        <button type="button" data-testid="b-reason-add" onClick={add} className="min-h-11 shrink-0 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground">{pbText.addReason}</button>
      </div>
    </>
  )
}
