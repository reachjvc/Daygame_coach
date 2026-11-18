"use client"

import { useState } from "react"
import { useLabState } from "../../store"
import { PrimaryButton } from "../../../components/kit"
import { Card, Head, InferredTag, NumField, Placeholder, PlaceholderScreen, Tabs, BottomNav } from "../shared/Bits"
import { addDays, billCount, dayKey, fmtMoney, HOUR, MIN, monthly, splitElapsed, yearly } from "../shared/calc"
import { useNow } from "../shared/clock"
import { SetupGate, StartOver, seedStart, type SetupField } from "../shared/Setup"
import { sharedText } from "../shared/text"
import { aText } from "./text"
import { buildHabits, daysBarFill, lastMilestone, MILESTONE_DAYS, pledgeStreak, totals, type Habit } from "./logic"

type Setup = { startMs: number; perDay: number; calPerDay: number; seeded: number }
type Screen = "summary" | "drawer" | "savings" | "feed" | "today" | "pledge" | "quote" | "review" | "editlist" | "add" | "stats" | "calendar" | "settings"

const FIELDS: SetupField[] = [
  { key: "startMs", label: aText.fStart, kind: "date" },
  { key: "perDay", label: aText.fPerDay, kind: "number", step: 0.5 },
  { key: "calPerDay", label: aText.fCal, kind: "number", step: 10 },
]

const BAR_TINT = ["bg-emerald-500/80", "bg-sky-500/80", "bg-blue-500/80", "bg-violet-500/80"]

/** Copy A: stacked unit bars, habit list, savings page with a bill strip, milestone chips, pledge and quote. */
export function ProgressA() {
  return (
    <div data-testid="progress-a">
      <SetupGate<Setup>
        letter="a"
        fields={FIELDS}
        seed={(now) => ({ startMs: seedStart(now, 8 * HOUR + 29 * MIN), perDay: 8, calPerDay: 150, seeded: 1 })}
        own={(now) => ({ startMs: now, perDay: 8, calPerDay: 0, seeded: 0 })}
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
  const [screen, setScreen] = useState<Screen>("summary")
  const [sel, setSel] = useLabState<number>("progress", "a", "sel", 0)
  const [added, setAdded] = useLabState<Habit[]>("progress", "a", "added", [])
  const [rates, setRates] = useLabState<Record<string, number>>("progress", "a", "rates", {})
  const [pledged, setPledged] = useLabState<string[]>("progress", "a", "pledged", [])
  const habits = buildHabits(setup, { main: aText.habitMain, caffeine: aText.habitCaffeine, pills: aText.habitPills }, added, rates)
  const habit = habits[Math.min(sel, habits.length - 1)]
  const today = dayKey(now)
  const seedPledges = setup.seeded ? [1, 2, 3, 4, 5, 6].map((n) => addDays(today, -n)) : []
  const allPledges = Array.from(new Set([...seedPledges, ...pledged]))
  const go = (s: Screen) => setScreen(s)
  const back = () => go("summary")

  const nav = screen === "today" || screen === "pledge" || screen === "review" ? 1 : screen === "feed" ? 2 : screen === "quote" ? 3 : 0
  const navTo = (i: number) => go((["summary", "today", "feed", "quote"] as const)[i])

  return (
    <div className="flex flex-col">
      {(screen === "summary" || screen === "stats" || screen === "calendar" || screen === "settings") && (
        <SummaryShell habit={habit} screen={screen} go={go} now={now} />
      )}
      {screen === "drawer" && <Drawer habits={habits} sel={sel} now={now} onPick={(i) => (setSel(i), go("summary"))} go={go} onBack={back} />}
      {screen === "editlist" && <PlaceholderScreen title={aText.editListTitle} onBack={() => go("drawer")} />}
      {screen === "add" && <AddHabit onBack={() => go("drawer")} onSave={(h) => (setAdded([...added, h]), setSel(habits.length), go("summary"))} index={added.length} now={now} />}
      {screen === "savings" && <Savings habit={habit} now={now} onBack={back} onRate={(n) => setRates({ ...rates, [habit.id]: n })} />}
      {screen === "feed" && <Feed habit={habit} now={now} />}
      {screen === "today" && <Today pledged={allPledges} today={today} go={go} />}
      {screen === "pledge" && <Pledge today={today} now={now} onBack={() => go("today")} onConfirm={() => (setPledged([...pledged, today]), go("today"))} done={allPledges.includes(today)} />}
      {screen === "review" && <PlaceholderScreen title={aText.reviewTitle} onBack={() => go("today")} />}
      {screen === "quote" && <Quote now={now} onClose={back} />}
      {(screen === "summary" || screen === "today" || screen === "feed" || screen === "quote") && <BottomNav id="a-nav" items={aText.nav} value={nav} onChange={navTo} />}
    </div>
  )
}

function SummaryShell({ habit, screen, go, now }: { habit: Habit; screen: Screen; go: (s: Screen) => void; now: number }) {
  const idx = screen === "summary" ? 0 : screen === "stats" ? 1 : screen === "calendar" ? 2 : 3
  const sp = splitElapsed(now - habit.startMs)
  const days = sp.days
  const [page, setPage] = useState(0)
  const [touch, setTouch] = useState<number | null>(null)
  const ms = lastMilestone(days)
  const bars = [
    { n: days, unit: aText.barDays, fill: daysBarFill(days) },
    { n: sp.hours, unit: aText.barHours, fill: sp.hours / 24 },
    { n: sp.minutes, unit: aText.barMinutes, fill: sp.minutes / 60 },
    { n: sp.seconds, unit: aText.barSeconds, fill: sp.seconds / 60 },
  ]
  return (
    <section data-testid="screen-summary" className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <button type="button" data-testid="a-menu" aria-label={aText.menuLabel} onClick={() => go("drawer")} className="inline-flex size-11 items-center justify-center rounded-full border border-border bg-card text-lg">
          {"☰"}
        </button>
        <h2 data-testid="a-habit-name" className="min-w-0 flex-1 truncate text-lg font-semibold">
          {habit.name}
        </h2>
      </div>
      <Tabs items={aText.tabs} value={idx} id="a-tab" onChange={(i) => go((["summary", "stats", "calendar", "settings"] as const)[i])} />
      {screen !== "summary" ? (
        <PlaceholderScreen title={aText.tabTitle[idx]} onBack={null} />
      ) : (
        <>
          <p className="text-sm text-muted-foreground">{aText.freeFor(habit.name)}</p>
          <div
            data-testid="a-pager"
            data-page={page}
            onTouchStart={(e) => setTouch(e.touches[0].clientX)}
            onTouchEnd={(e) => {
              if (touch === null) return
              const dx = e.changedTouches[0].clientX - touch
              if (Math.abs(dx) > 40) setPage((p) => Math.min(3, Math.max(0, p + (dx < 0 ? 1 : -1))))
              setTouch(null)
            }}
          >
            {page === 0 ? (
              <div className="flex flex-col gap-2" data-testid="a-bars">
                {bars.map((b, i) => (
                  <div key={b.unit} className="relative h-14 overflow-hidden rounded-full bg-muted" data-testid={`a-bar-${i}`} data-fill={b.fill.toFixed(3)}>
                    <div className={`absolute inset-y-0 left-0 ${BAR_TINT[i]}`} style={{ width: `${Math.max(8, b.fill * 100)}%`, transition: "width 0.6s ease" }} />
                    <div className="relative flex h-full items-center justify-between px-5">
                      <span className="text-2xl font-bold tabular-nums">{b.n}</span>
                      <span className="text-base">{b.unit}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <span className="flex-1 text-sm font-medium">{aText.pageOther}</span>
                  <InferredTag />
                </div>
                <Placeholder />
              </div>
            )}
          </div>
          <div className="flex justify-center">
            {[0, 1, 2, 3].map((i) => (
              <button key={i} type="button" data-testid={`a-dot-${i}`} aria-label={aText.pageDot(i + 1)} aria-current={i === page} onClick={() => setPage(i)} className="inline-flex size-11 items-center justify-center">
                <span className={`size-2.5 rounded-full ${i === page ? "bg-primary" : "bg-muted-foreground/40"}`} />
              </button>
            ))}
          </div>
          <Card testId="a-last-milestone" onClick={() => go("feed")}>
            <p className="text-xs text-muted-foreground">{aText.lastMilestone}</p>
            <p className="text-lg font-semibold">{ms >= 0 ? aText.milestoneNames[ms] : aText.noMilestone}</p>
          </Card>
          <PrimaryButton testId="a-open-savings" onClick={() => go("savings")}>
            {aText.openSavings}
          </PrimaryButton>
        </>
      )}
    </section>
  )
}

function Drawer({ habits, sel, now, onPick, go, onBack }: { habits: Habit[]; sel: number; now: number; onPick: (i: number) => void; go: (s: Screen) => void; onBack: () => void }) {
  return (
    <section data-testid="screen-drawer" className="flex flex-col gap-3">
      <Head title={aText.drawerTitle} onBack={onBack} />
      {habits.map((h, i) => {
        const t = totals(h, now)
        return (
          <Card key={h.id} testId={`a-habit-${i}`} onClick={() => onPick(i)}>
            <p className="flex items-center gap-2 font-semibold">
              <span className="flex-1">{h.name}</span>
              {i === sel && <span aria-hidden="true">{"✓"}</span>}
            </p>
            <p className="mt-1 flex justify-between text-sm">
              <span className="text-muted-foreground">{aText.soberFor}</span>
              <span data-testid={`a-habit-${i}-days`}>{aText.daysValue(t.days)}</span>
            </p>
            <p className="flex justify-between text-sm">
              <span className="text-muted-foreground">{aText.moneySaved}</span>
              <span data-testid={`a-habit-${i}-money`}>{fmtMoney(t.money)}</span>
            </p>
            {h.calPerDay > 0 && (
              <p className="flex justify-between text-sm">
                <span className="text-muted-foreground">{aText.caloriesSaved}</span>
                <span>{t.calories.toLocaleString("en-US")}</span>
              </p>
            )}
          </Card>
        )
      })}
      <div className="flex gap-2">
        <button type="button" data-testid="a-add-new" onClick={() => go("add")} className="min-h-11 flex-1 rounded-md border border-border bg-card px-3 text-sm">
          {aText.addNew}
        </button>
        <button type="button" data-testid="a-edit-list" onClick={() => go("editlist")} className="min-h-11 flex-1 rounded-md border border-border bg-card px-3 text-sm">
          {aText.editList}
        </button>
      </div>
    </section>
  )
}

function AddHabit({ onBack, onSave, index, now }: { onBack: () => void; onSave: (h: Habit) => void; index: number; now: number }) {
  const [name, setName] = useState("")
  const [perDay, setPerDay] = useState(8)
  return (
    <section data-testid="screen-add" className="flex flex-col gap-2">
      <Head title={aText.addTitle} onBack={onBack} inferred />
      <label className="flex min-h-11 items-center justify-between gap-3 text-sm">
        <span>{aText.addName}</span>
        <input data-testid="a-add-name" value={name} onChange={(e) => setName(e.target.value)} className="min-h-11 w-40 rounded-md border border-border bg-background px-2" />
      </label>
      <NumField label={aText.fPerDay} value={perDay} onChange={setPerDay} step={0.5} testId="a-add-rate" />
      <PrimaryButton testId="a-add-save" disabled={!name.trim() || !Number.isFinite(perDay)} onClick={() => onSave({ id: `n${index}`, name: name.trim(), startMs: now, perDay, calPerDay: 0 })}>
        {aText.addSave}
      </PrimaryButton>
    </section>
  )
}

function Savings({ habit, now, onBack, onRate }: { habit: Habit; now: number; onBack: () => void; onRate: (n: number) => void }) {
  const [tab, setTab] = useState(0)
  const [editing, setEditing] = useState(false)
  const t = totals(habit, now)
  const money = tab === 0
  const perDay = money ? habit.perDay : habit.calPerDay
  const total = money ? t.money : t.calories
  const fmt = (n: number) => (money ? fmtMoney(n) : Math.round(n).toLocaleString("en-US"))
  const bills = billCount(t.money)
  return (
    <section data-testid="screen-savings" className="flex flex-col gap-3">
      <Head title={aText.savingsTitle(habit.name)} onBack={onBack} />
      <Tabs items={[aText.money, aText.calories]} value={tab} id="a-sav-tab" onChange={setTab} />
      <h3 className="text-base font-semibold">{money ? aText.currentSavings : aText.currentCalories}</h3>
      <p data-testid="a-total" className="text-4xl font-bold tabular-nums">
        {fmt(total)}
      </p>
      {money && (
        <>
          <p data-testid="a-bills-line" className="text-sm text-muted-foreground">
            {aText.orBills(bills)}
          </p>
          <div data-testid="a-bills" data-count={bills} className="flex flex-wrap gap-1.5">
            {Array.from({ length: bills }, (_, i) => (
              <span key={i} className="inline-flex h-5 w-9 items-center justify-center rounded-sm bg-emerald-500/80 text-[10px] font-semibold text-black">
                {aText.billLabel}
              </span>
            ))}
          </div>
        </>
      )}
      <div className="divide-y divide-border rounded-lg border border-border bg-card px-3">
        <p className="flex min-h-11 items-center justify-between text-sm">
          <span className="text-muted-foreground">{aText.daysSince}</span>
          <span data-testid="a-days" className="font-semibold">
            {aText.daysValue(t.days)}
          </span>
        </p>
        <div className="flex min-h-11 items-center justify-between text-sm">
          <span className="text-muted-foreground">{money ? aText.perDay : aText.calPerDay}</span>
          {editing && money ? (
            <input
              type="number"
              inputMode="decimal"
              data-testid="a-rate-input"
              autoFocus
              defaultValue={perDay}
              onBlur={(e) => {
                const n = Number(e.target.value)
                if (e.target.value !== "" && Number.isFinite(n) && n >= 0) onRate(n)
                setEditing(false)
              }}
              className="min-h-11 w-24 rounded-md border border-border bg-background px-2 text-right"
            />
          ) : (
            <span className="flex items-center gap-1">
              <span data-testid="a-rate" className="font-semibold text-emerald-400">
                {money ? fmtMoney(perDay) : perDay}
              </span>
              {money && (
                <button type="button" data-testid="a-rate-edit" aria-label={aText.editRate} onClick={() => setEditing(true)} className="inline-flex size-11 items-center justify-center text-emerald-400">
                  {"✎"}
                </button>
              )}
            </span>
          )}
        </div>
      </div>
      <h3 className="mt-2 text-base font-semibold">{aText.projected}</h3>
      <div className="divide-y divide-border rounded-lg border border-border bg-card px-3">
        <p className="flex min-h-11 items-center justify-between text-sm">
          <span className="text-muted-foreground">{aText.projMonthly}</span>
          <span data-testid="a-monthly" className="text-sky-400">
            {fmt(money ? monthly(perDay) : (perDay * 365) / 12)}
          </span>
        </p>
        <p className="flex min-h-11 items-center justify-between text-sm">
          <span className="text-muted-foreground">{aText.projYearly}</span>
          <span data-testid="a-yearly" className="text-sky-400">
            {fmt(money ? yearly(perDay) : perDay * 365)}
          </span>
        </p>
      </div>
    </section>
  )
}

function Feed({ habit, now }: { habit: Habit; now: number }) {
  const days = totals(habit, now).days
  const last = lastMilestone(days)
  const [chip, setChip] = useState(-1)
  const reachedNames = MILESTONE_DAYS.map((_, i) => i).filter((i) => i <= last)
  return (
    <section data-testid="screen-feed" className="flex flex-col gap-3">
      <Head title={`${aText.feedTitle} - ${habit.name}`} />
      <div className="flex gap-1.5 overflow-x-auto" role="tablist">
        {[...reachedNames.slice(-3).reverse(), -1].map((i) => (
          <button
            key={i}
            type="button"
            role="tab"
            aria-selected={chip === i}
            data-testid={`a-chip-${i}`}
            onClick={() => setChip(i)}
            className={`inline-flex min-h-11 shrink-0 items-center rounded-full border px-4 text-sm ${chip === i ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card"}`}
          >
            {i === -1 ? aText.feedAll : aText.milestoneNames[i]}
          </button>
        ))}
      </div>
      <p className="text-sm text-muted-foreground">{aText.feedLine}</p>
      <Placeholder />
      <p className="text-xs text-muted-foreground">{aText.feedOut}</p>
    </section>
  )
}

function Today({ pledged, today, go }: { pledged: string[]; today: string; go: (s: Screen) => void }) {
  const [tab, setTab] = useState(0)
  const [checked, setChecked] = useLabState<number[]>("progress", "a", "workbook", [0])
  const streak = pledgeStreak(pledged, today, (k) => addDays(k, -1))
  const days = Array.from({ length: 7 }, (_, i) => addDays(today, -i))
  return (
    <section data-testid="screen-today" className="flex flex-col gap-3">
      <Tabs items={aText.todayTabs} value={tab} id="a-today-tab" onChange={setTab} />
      {tab === 0 && (
        <>
          <PrimaryButton testId="a-pledge-btn" onClick={() => go("pledge")}>
            {aText.pledgeBtn}
          </PrimaryButton>
          <p className="text-center text-sm text-muted-foreground">{aText.pledgeLater}</p>
          <button type="button" data-testid="a-review-now" onClick={() => go("review")} className="min-h-11 text-sm text-primary underline">
            {aText.reviewNow}
          </button>
          <h3 className="font-semibold">{aText.challengeHeading}</h3>
          <Card>
            <p className="font-medium">{aText.challengeTitle}</p>
            <div data-testid="a-segments" data-filled={streak} className="my-2 flex gap-1">
              {Array.from({ length: 7 }, (_, i) => (
                <span key={i} className={`h-3 flex-1 rounded-full ${i < streak ? "bg-emerald-500/80" : "bg-muted"}`} />
              ))}
            </div>
            <p data-testid="a-challenge-line" className="text-sm text-muted-foreground">
              {aText.challengeLine(7 - streak)}
            </p>
          </Card>
        </>
      )}
      {tab === 1 && (
        <ul data-testid="a-history" className="flex flex-col gap-1.5">
          {days.map((d, i) => (
            <li key={d} className="flex min-h-11 items-center justify-between rounded-md border border-border bg-card px-3 text-sm">
              <span>{i === 0 ? aText.historyToday : i === 1 ? aText.historyYesterday : d}</span>
              <span className={pledged.includes(d) ? "text-emerald-400" : "text-muted-foreground"}>{pledged.includes(d) ? aText.pledged : aText.notPledged}</span>
            </li>
          ))}
        </ul>
      )}
      {tab === 2 && (
        <>
          <h3 className="font-semibold">{aText.workbookHeading}</h3>
          <p className="text-sm text-muted-foreground">{aText.workbookLine}</p>
          {aText.workbookRows.map((row, i) => (
            <button
              key={row}
              type="button"
              data-testid={`a-work-${i}`}
              aria-pressed={checked.includes(i)}
              onClick={() => setChecked(checked.includes(i) ? checked.filter((c) => c !== i) : [...checked, i])}
              className="flex min-h-11 items-center gap-3 rounded-md border border-border bg-card px-3 text-left text-sm"
            >
              <span aria-hidden="true">{checked.includes(i) ? "☑" : "☐"}</span>
              {row}
            </button>
          ))}
          <Placeholder />
        </>
      )}
    </section>
  )
}

function Pledge({ today, now, onBack, onConfirm, done }: { today: string; now: number; onBack: () => void; onConfirm: () => void; done: boolean }) {
  const [dot, setDot] = useState(0)
  const [reasons, setReasons] = useLabState<string[]>("progress", "a", "reasons", [...aText.reasonsSeed])
  const [draft, setDraft] = useState("")
  const weekday = new Date(now).toLocaleDateString("en-US", { weekday: "long" })
  return (
    <section data-testid="screen-pledge" data-date={today} className="flex flex-col gap-3">
      <Head title={aText.pledgeFor(weekday)} onBack={onBack} inferred />
      <button type="button" data-testid="a-pledge-sentence" onClick={onConfirm} className="min-h-16 rounded-lg bg-card px-4 py-4 text-left text-lg font-bold">
        {aText.pledgeSentences[dot]}
      </button>
      <p className="text-sm text-muted-foreground">{done ? aText.pledgeDone : aText.confirmLine}</p>
      <div className="flex justify-center">
        {aText.pledgeSentences.map((s, i) => (
          <button key={s} type="button" data-testid={`a-pledge-dot-${i}`} aria-label={aText.pageDot(i + 1)} aria-current={i === dot} onClick={() => setDot(i)} className="inline-flex size-11 items-center justify-center">
            <span className={`size-2.5 rounded-full ${i === dot ? "bg-primary" : "bg-muted-foreground/40"}`} />
          </button>
        ))}
      </div>
      <h3 className="font-semibold">{aText.whyHeading}</h3>
      <div data-testid="a-reasons" className="grid grid-cols-2 gap-2">
        {reasons.map((r, i) => (
          <div key={`${r}-${i}`} className="rounded-lg border border-border bg-card p-3 text-sm font-medium">
            {r}
          </div>
        ))}
      </div>
      <div className="flex gap-2">
        <input data-testid="a-reason-input" value={draft} placeholder={aText.reasonPlaceholder} aria-label={aText.reasonPlaceholder} onChange={(e) => setDraft(e.target.value)} className="min-h-11 min-w-0 flex-1 rounded-md border border-border bg-background px-2" />
        <button
          type="button"
          data-testid="a-reason-add"
          disabled={!draft.trim()}
          onClick={() => (setReasons([...reasons, draft.trim()]), setDraft(""))}
          className="min-h-11 rounded-md border border-border bg-card px-3 text-sm disabled:opacity-40"
        >
          {aText.addReason}
        </button>
      </div>
    </section>
  )
}

function Quote({ now, onClose }: { now: number; onClose: () => void }) {
  const d = new Date(now)
  const q = aText.quotes[Math.floor(now / 86_400_000) % aText.quotes.length]
  const share = () => {
    try {
      if (typeof navigator !== "undefined" && navigator.share) void navigator.share({ text: q }).catch(() => undefined)
    } catch {
      // no share sheet here
    }
  }
  return (
    <section data-testid="screen-quote" className="flex min-h-[60dvh] flex-col items-center justify-between gap-6 rounded-lg border border-border bg-card p-4 text-center">
      <div className="flex w-full items-center">
        <button type="button" data-testid="a-quote-close" aria-label={sharedText.close} onClick={onClose} className="inline-flex size-11 items-center justify-center text-lg">
          {"✕"}
        </button>
        <h2 className="flex-1 text-sm font-semibold">{aText.quoteTitle}</h2>
        <span className="size-11" />
      </div>
      <p className="text-sm text-muted-foreground">{`${aText.months[d.getMonth()]} ${d.getDate()}`}</p>
      <p data-testid="a-quote" className="text-2xl font-semibold leading-snug">
        {q}
      </p>
      <button type="button" data-testid="a-share" onClick={share} className="min-h-11 rounded-md border border-border px-4 text-sm">
        {aText.share}
      </button>
    </section>
  )
}
