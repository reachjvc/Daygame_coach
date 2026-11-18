"use client"

import { useEffect, useState } from "react"
import { PrimaryButton } from "../../../components/kit"
import { Head, InferredTag, Placeholder, PlaceholderScreen } from "../../progress/shared/Bits"
import { StartOver } from "../../progress/shared/Setup"
import { useNow } from "../../progress/shared/clock"
import { DAY } from "../../progress/shared/calc"
import { useLabState } from "../../store"
import { NumInput } from "../shared/NumInput"
import { fmtMoney2, fromLocalInput, toLocalInput } from "../shared/logic"
import { costText } from "../shared/text"
import { balanceAfter, currentBalance, lastRestart, projectedAt, purchasedTotal, relapseSpend, rewardPct, savingsFromBeginning, savingsSinceRestart, type Entry, type Habit, type Reward } from "./logic"
import { cText } from "./text"

type Screen = "intro" | "picker" | "spend" | "last" | "loading" | "habit" | "potential" | "add" | "entry" | "ph"

const SMOKING = 2

/** A tappable bar across the screen; the dots show the place in the pager. */
function Dots({ at }: { at: number }) {
  return (
    <div className="flex justify-center gap-2" aria-label={cText.dots(at, cText.slides.length)}>
      {cText.slides.map((_, i) => (
        <span key={i} className={`size-2 rounded-full ${i === at ? "bg-primary" : "bg-border"}`} />
      ))}
    </div>
  )
}

function fmtDateTime(ms: number): string {
  return new Date(ms).toLocaleString("en-US", { month: "long", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" })
}

/** Copy C: first-run cost setup (spend per day, last time), the habit's savings page with rewards and a relapse entry that deducts money. */
export function CostC() {
  const [habit, setHabit] = useLabState<Habit | null>("cost", "c", "habit", null)
  const [entries, setEntries] = useLabState<Entry[]>("cost", "c", "entries", [])
  const [rewards, setRewards] = useLabState<Reward[]>("cost", "c", "rewards", [])
  const [screen, setScreen] = useState<Screen | null>(null)
  const [slide, setSlide] = useState(0)
  const [pickedType, setPickedType] = useState(0)
  const [spend, setSpend] = useState<number | null>(null)
  const [timeMode, setTimeMode] = useState(false)
  const [dialog, setDialog] = useState<string | null>(null)
  const [lastInput, setLastInput] = useState("")
  const [mounted, setMounted] = useState(false)
  const [moneyTab, setMoneyTab] = useState(true)
  const [confirm, setConfirm] = useState<string | null>(null)
  const [formula, setFormula] = useState(false)
  const [ph, setPh] = useState<{ title: string; back: Screen }>({ title: "", back: "habit" })
  const [pdate, setPdate] = useState("")
  const [newReward, setNewReward] = useState<{ name: string; price: number | null }>({ name: "", price: null })
  const [entry, setEntry] = useState<{ when: string; note: string; relapse: boolean; spend: number | null }>({ when: "", note: "", relapse: false, spend: null })
  useEffect(() => setMounted(true), [])
  const now = useNow(1000)
  if (!mounted) return null

  const at: Screen = screen ?? (habit ? "habit" : "intro")
  const go = (s: Screen) => setScreen(s)
  const goPh = (title: string, back: Screen) => {
    setPh({ title, back })
    go("ph")
  }

  const balance = habit ? currentBalance(habit, entries, rewards, now) : 0
  const total = habit ? savingsFromBeginning(habit, now) : 0
  const since = habit ? savingsSinceRestart(habit, entries, now) : 0

  const startOver = () => {
    setHabit(null)
    setEntries([])
    setRewards([])
    setSpend(null)
    setSlide(0)
    setScreen("intro")
  }
  const finishLast = () => {
    const ms = fromLocalInput(lastInput)
    setHabit({ type: pickedType, spend: timeMode ? 0 : (spend ?? 0), startMs: Number.isFinite(ms) ? Math.min(ms, Date.now()) : Date.now() })
    go("loading")
    setTimeout(() => setScreen("habit"), 2000)
  }

  if (at === "intro") {
    const s = cText.slides[slide]
    return (
      <div data-testid="cost-c" data-screen="intro" data-slide={slide} className="flex min-h-[70dvh] flex-col items-center justify-between gap-4 py-6 text-center">
        {slide === 0 ? (
          <button type="button" data-testid="c-splash" aria-label={cText.slideAria(slide)} onClick={() => setSlide(1)} className="flex min-h-[55dvh] w-full flex-1 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <span className="text-8xl">{"∞"}</span>
          </button>
        ) : (
          <>
            <div className="flex flex-1 flex-col items-center justify-center gap-4">
              <svg viewBox="0 0 80 80" className="size-32" aria-hidden="true">
                {slide === 1 ? (
                  <>
                    <circle cx="40" cy="32" r="18" className="fill-primary" />
                    <rect x="32" y="50" width="16" height="10" rx="3" className="fill-border" />
                    <line x1="40" y1="2" x2="40" y2="8" className="stroke-primary" strokeWidth="3" />
                  </>
                ) : (
                  <>
                    <circle cx="40" cy="40" r="30" fill="none" className="stroke-primary" strokeWidth="5" />
                    <circle cx="40" cy="40" r="18" fill="none" className="stroke-primary" strokeWidth="5" />
                    <circle cx="40" cy="40" r="6" className="fill-primary" />
                  </>
                )}
              </svg>
              <h2 data-testid="c-slide-title" className="text-2xl font-bold">
                {s.title}
              </h2>
              <p className="max-w-xs text-muted-foreground">{s.line}</p>
            </div>
            <button type="button" data-testid={slide === 1 ? "c-next" : "c-get-started"} onClick={() => (slide === 1 ? setSlide(2) : go("picker"))} className="inline-flex min-h-12 items-center px-6 text-base font-semibold uppercase text-primary">
              {slide === 1 ? cText.next : cText.getStarted}
            </button>
          </>
        )}
        <Dots at={slide} />
      </div>
    )
  }

  if (at === "picker") {
    return (
      <div data-testid="cost-c" data-screen="picker" className="flex flex-col gap-3">
        <div className="flex items-start gap-2">
          <h2 className="flex-1 text-lg font-semibold">{cText.habitsTitle}</h2>
          <button type="button" data-testid="c-picker-close" aria-label={cText.close} onClick={() => go("intro")} className="inline-flex size-11 items-center justify-center rounded-full border border-border bg-card text-lg">
            {"✕"}
          </button>
        </div>
        <ul className="flex flex-col gap-2">
          {cText.habits.map((h, i) => (
            <li key={h}>
              <button
                type="button"
                data-testid={`c-habit-${i}`}
                onClick={() => {
                  setPickedType(i)
                  setSpend(null)
                  setTimeMode(false)
                  go("spend")
                }}
                className="flex min-h-12 w-full items-center gap-3 rounded-lg border border-border bg-card px-3 text-left"
              >
                <span aria-hidden="true" className="inline-flex size-7 items-center justify-center rounded-full bg-primary text-xs text-primary-foreground">
                  {h.slice(0, 1)}
                </span>
                {h}
              </button>
            </li>
          ))}
        </ul>
      </div>
    )
  }

  if (at === "spend") {
    return (
      <div data-testid="cost-c" data-screen="spend" className="flex flex-col gap-4">
        <Head title="" onBack={() => go("picker")} />
        <svg viewBox="0 0 80 60" className="mx-auto h-24" aria-hidden="true">
          <rect x="24" y="22" width="32" height="30" rx="4" className="fill-primary" />
          <rect x="20" y="16" width="40" height="8" rx="3" className="fill-primary" opacity={0.7} />
          <circle cx="40" cy="8" r="6" className="fill-card stroke-primary" strokeWidth="2" />
        </svg>
        <p className="text-center text-lg font-medium">{cText.spendQuestion}</p>
        <div role="tablist" className="flex gap-1.5">
          {[cText.money, cText.time].map((l, i) => (
            <button key={l} type="button" role="tab" aria-selected={timeMode === (i === 1)} data-testid={`c-mode-${i}`} onClick={() => setTimeMode(i === 1)} className={`min-h-11 flex-1 rounded-full border text-sm ${timeMode === (i === 1) ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card"}`}>
              {l}
            </button>
          ))}
        </div>
        {timeMode ? (
          <Placeholder />
        ) : (
          <button type="button" data-testid="c-spend-field" data-value={spend ?? 0} onClick={() => setDialog(spend === null ? "" : String(spend))} className="min-h-14 w-full rounded-lg border border-border bg-card text-2xl font-semibold text-primary">
            {"$"}
            {spend ?? 0}
          </button>
        )}
        <button type="button" data-testid="c-currency" onClick={() => goPh(cText.currencyList, "spend")} className="inline-flex min-h-11 items-center justify-center text-sm text-primary underline">
          {cText.changeCurrency}
        </button>
        <PrimaryButton
          testId="c-spend-next"
          onClick={() => {
            setLastInput(toLocalInput(Date.now()))
            go("last")
          }}
        >
          {cText.next}
        </PrimaryButton>
        {dialog !== null && (
          <div data-testid="c-dialog" className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 p-4 pt-24">
            <div className="flex w-full max-w-sm flex-col gap-3 rounded-xl border border-border bg-background p-4">
              <p className="text-center font-semibold">{cText.dialogTitle}</p>
              <input
                data-testid="c-dialog-input"
                aria-label={cText.spendInput}
                inputMode="decimal"
                autoFocus
                value={dialog}
                onChange={(e) => {
                  const t = e.target.value.replace(/[^\d.]/g, "")
                  const i = t.indexOf(".")
                  setDialog(i === -1 ? t : t.slice(0, i + 1) + t.slice(i + 1).replace(/\./g, ""))
                }}
                className="min-h-11 w-full rounded-md border border-border bg-card px-2"
              />
              <div className="flex gap-2">
                <button type="button" data-testid="c-dialog-cancel" onClick={() => setDialog(null)} className="min-h-11 flex-1 rounded-md border border-border">
                  {cText.cancel}
                </button>
                <button
                  type="button"
                  data-testid="c-dialog-save"
                  disabled={!/\d/.test(dialog)}
                  onClick={() => {
                    setSpend(Number(dialog))
                    setDialog(null)
                  }}
                  className="min-h-11 flex-1 rounded-md bg-primary text-primary-foreground disabled:opacity-40"
                >
                  {cText.save}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    )
  }

  if (at === "last") {
    return (
      <div data-testid="cost-c" data-screen="last" className="flex flex-col gap-4">
        <Head title="" onBack={() => go("spend")} />
        <svg viewBox="0 0 80 70" className="mx-auto h-28" role="img" aria-label={cText.calendarLabel}>
          <rect x="8" y="12" width="64" height="52" rx="6" className="fill-card stroke-primary" strokeWidth="3" />
          <rect x="8" y="12" width="64" height="12" rx="6" className="fill-primary" />
          {pickedType === SMOKING && (
            <g data-testid="c-cig">
              <rect x="22" y="42" width="30" height="6" rx="2" className="fill-foreground" />
              <rect x="22" y="42" width="8" height="6" className="fill-primary" />
            </g>
          )}
        </svg>
        <p className="text-center text-lg font-medium">{cText.lastQuestion}</p>
        <div className="flex items-center justify-center gap-2">
          <input type="datetime-local" data-testid="c-last-input" aria-label={cText.lastField} value={lastInput} max={toLocalInput(now)} onChange={(e) => setLastInput(e.target.value)} className="min-h-12 rounded-lg border border-border bg-card px-3 text-primary" />
          <InferredTag />
        </div>
        {Number.isFinite(fromLocalInput(lastInput)) && (
          <p data-testid="c-last-text" className="text-center text-sm text-muted-foreground">
            {fmtDateTime(fromLocalInput(lastInput))}
          </p>
        )}
        <PrimaryButton testId="c-last-save" disabled={!Number.isFinite(fromLocalInput(lastInput))} onClick={finishLast}>
          {cText.save}
        </PrimaryButton>
      </div>
    )
  }

  if (at === "loading") {
    return (
      <div data-testid="cost-c" data-screen="loading" className="flex min-h-[60dvh] flex-col items-center justify-center gap-4">
        <svg viewBox="0 0 100 100" className="size-32 animate-pulse" role="img" aria-label={cText.loadingLabel}>
          <rect x="8" y="28" width="30" height="16" rx="8" fill="none" className="stroke-primary" strokeWidth="5" />
          <rect x="62" y="28" width="30" height="16" rx="8" fill="none" className="stroke-primary" strokeWidth="5" />
          <path d="M50 58 L50 88 M38 76 L50 88 L62 76" fill="none" className="stroke-primary" strokeWidth="5" strokeLinecap="round" />
        </svg>
      </div>
    )
  }

  if (at === "ph") return <div data-testid="cost-c" data-screen="placeholder"><PlaceholderScreen title={ph.title} onBack={() => go(ph.back)} /></div>

  if (!habit) return null

  if (at === "potential") {
    const dateMs = fromLocalInput(pdate)
    const projected = Number.isFinite(dateMs) ? projectedAt(habit, now, dateMs) : null
    return (
      <div data-testid="cost-c" data-screen="potential" className="flex flex-col gap-3">
        <Head title={cText.potentialTitle} onBack={() => go("habit")} />
        <div className="flex items-center justify-between rounded-lg border border-border bg-card p-3">
          <span className="text-sm">{cText.toDate}</span>
          <span data-testid="c-pot-now" className="font-bold">
            {fmtMoney2(total)}
          </span>
        </div>
        <label className="flex min-h-11 items-center justify-between gap-3 text-sm">
          <span>{cText.pickDate}</span>
          <input type="datetime-local" data-testid="c-pot-date" value={pdate} min={toLocalInput(now)} onChange={(e) => setPdate(e.target.value)} className="min-h-11 rounded-md border border-border bg-background px-2" />
        </label>
        <div className="flex items-center justify-between rounded-lg border border-border bg-card p-3">
          <span className="text-sm">{cText.atDate}</span>
          <span data-testid="c-pot-total" data-value={projected ?? ""} className="font-bold">
            {projected === null ? "-" : fmtMoney2(projected)}
          </span>
        </div>
        {projected !== null && (
          <p data-testid="c-pot-formula" className="text-xs text-muted-foreground">
            {cText.potentialFormula(fmtMoney2(total), fmtMoney2(habit.spend), (Math.max(0, dateMs - now) / DAY).toFixed(2), fmtMoney2(projected))}
          </p>
        )}
      </div>
    )
  }

  if (at === "add") {
    const ok = newReward.name.trim() !== "" && (newReward.price ?? 0) > 0
    return (
      <div data-testid="cost-c" data-screen="add" className="flex flex-col gap-3">
        <Head title={cText.addTitle} onBack={() => go("habit")} inferred />
        <label className="flex min-h-11 items-center justify-between gap-3 text-sm">
          <span>{cText.rewardName}</span>
          <input data-testid="c-new-name" aria-label={cText.rewardName} value={newReward.name} onChange={(e) => setNewReward({ ...newReward, name: e.target.value })} className="min-h-11 w-44 rounded-md border border-border bg-background px-2" />
        </label>
        <label className="flex min-h-11 items-center justify-between gap-3 text-sm">
          <span>{cText.rewardPrice}</span>
          <NumInput value={newReward.price} onChange={(n) => setNewReward({ ...newReward, price: n })} testId="c-new-price" label={cText.rewardPrice} className="w-32" />
        </label>
        <Placeholder />
        <PrimaryButton
          testId="c-new-save"
          disabled={!ok}
          onClick={() => {
            setRewards([...rewards, { id: String(Date.now()), name: newReward.name.trim(), price: newReward.price ?? 0, bought: false }])
            setNewReward({ name: "", price: null })
            go("habit")
          }}
        >
          {cText.save}
        </PrimaryButton>
      </div>
    )
  }

  if (at === "entry") {
    const save = () => {
      const ms = fromLocalInput(entry.when)
      setEntries([...entries, { ms: Number.isFinite(ms) ? Math.min(ms, Date.now()) : Date.now(), note: entry.note, relapse: entry.relapse, spend: entry.relapse ? (entry.spend ?? 0) : 0 }])
      go("habit")
    }
    return (
      <div data-testid="cost-c" data-screen="entry" className="flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <button type="button" data-testid="c-entry-close" aria-label={cText.close} onClick={() => go("habit")} className="inline-flex size-11 items-center justify-center rounded-full border border-border bg-card text-lg">
            {"✕"}
          </button>
          <h2 className="flex-1 text-center text-lg font-semibold">{cText.entryTitle}</h2>
          <button type="button" data-testid="c-entry-save" aria-label={cText.tick} onClick={save} className="inline-flex size-11 items-center justify-center rounded-full bg-primary text-lg text-primary-foreground">
            {"✓"}
          </button>
        </div>
        <div className="rounded-lg border border-border bg-card p-3">
          <p className="mb-2 text-sm font-medium">{cText.whenHappened}</p>
          <input type="datetime-local" data-testid="c-entry-when" aria-label={cText.whenHappened} value={entry.when} max={toLocalInput(now)} onChange={(e) => setEntry({ ...entry, when: e.target.value })} className="min-h-11 rounded-full border border-border bg-background px-3 text-primary" />
        </div>
        <div className="rounded-lg border border-border bg-card p-3">
          <p className="mb-2 text-sm font-medium">{cText.notesTitle}</p>
          <textarea data-testid="c-entry-note" aria-label={cText.notesField} value={entry.note} onChange={(e) => setEntry({ ...entry, note: e.target.value })} rows={3} className="w-full rounded-md border border-border bg-background p-2" />
        </div>
        <div className="rounded-lg border border-border bg-card p-3">
          <label className="flex min-h-11 items-center justify-between gap-3">
            <span className="text-sm font-medium">{cText.relapseTitle}</span>
            <input type="checkbox" role="switch" data-testid="c-entry-relapse" checked={entry.relapse} onChange={(e) => setEntry({ ...entry, relapse: e.target.checked })} className="size-6 accent-primary" />
          </label>
          <p className="text-xs text-muted-foreground">{cText.relapseLine}</p>
          {entry.relapse && (
            <div className="mt-3 flex flex-col gap-2" data-testid="c-entry-spend-block">
              <p className="text-sm font-medium">{cText.howMuch}</p>
              <p className="text-xs text-muted-foreground">{cText.deductLine}</p>
              <div className="flex gap-2">
                {cText.chips.map((c) => (
                  <button key={c} type="button" data-testid={`c-chip-${c}`} onClick={() => setEntry({ ...entry, spend: c })} className="min-h-11 flex-1 rounded-full border border-border bg-background text-sm">
                    {"$"}
                    {c}
                  </button>
                ))}
              </div>
              <div className="flex items-center justify-center gap-1 text-2xl font-semibold text-primary">
                <span>{"$"}</span>
                <NumInput value={entry.spend} onChange={(n) => setEntry({ ...entry, spend: n })} testId="c-entry-spend" label={cText.entryAmount} placeholder="0" className="w-32 text-2xl" />
              </div>
            </div>
          )}
        </div>
      </div>
    )
  }

  // habit page
  const sheetReward = rewards.find((r) => r.id === confirm) ?? null
  const rows: [string, number, string][] = [
    [cText.rows[0], balance, "c-balance"],
    [cText.rows[1], since, "c-since"],
    [cText.rows[2], total, "c-total"],
  ]
  return (
    <div data-testid="cost-c" data-screen="habit">
      <Head title={cText.habits[habit.type]} onBack={() => goPh(cText.summaryList, "habit")} right={
        <button type="button" data-testid="c-settings" aria-label={cText.settingsIcon} onClick={() => goPh(cText.habitSettings, "habit")} className="inline-flex size-11 items-center justify-center rounded-full border border-border bg-card">
          {"⇅"}
        </button>
      } />
      <div role="tablist" className="mb-3 flex gap-1.5">
        {[cText.money, cText.time].map((l, i) => (
          <button key={l} type="button" role="tab" aria-selected={moneyTab === (i === 0)} data-testid={`c-tab-${i}`} onClick={() => setMoneyTab(i === 0)} className={`min-h-11 flex-1 rounded-full border text-sm ${moneyTab === (i === 0) ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card"}`}>
            {l}
          </button>
        ))}
      </div>
      {!moneyTab ? (
        <Placeholder />
      ) : (
        <div className="flex flex-col gap-3">
          <h3 className="text-lg font-semibold">{cText.savingsTitle}</h3>
          <div className="rounded-lg border border-border bg-card">
            {rows.map(([label, value, id], i) => {
              const inner = (
                <>
                  <span className="min-w-0 flex-1 text-sm">{label}</span>
                  <span data-testid={id} data-value={value} className={`font-bold ${i === 0 ? "text-primary" : ""}`}>
                    {fmtMoney2(value)}
                  </span>
                  {i === 0 && <span aria-hidden="true">{"›"}</span>}
                </>
              )
              return i === 0 ? (
                <button key={id} type="button" data-testid="c-balance-row" onClick={() => goPh(cText.balanceDetail, "habit")} className="flex min-h-12 w-full items-center gap-2 border-b border-border px-3 text-left">
                  {inner}
                </button>
              ) : (
                <div key={id} className={`flex min-h-12 items-center gap-2 px-3 ${i === 1 ? "border-b border-border" : ""}`}>
                  {inner}
                </div>
              )
            })}
          </div>
          <button type="button" data-testid="c-potential" onClick={() => go("potential")} className="flex min-h-12 w-full items-center gap-2 rounded-lg border border-border bg-card px-3 text-left text-sm text-primary">
            <span className="flex-1">{cText.potentialRow}</span>
            <span aria-hidden="true">{"›"}</span>
          </button>
          <div>
            <button type="button" data-testid="c-formula-toggle" onClick={() => setFormula(!formula)} className="inline-flex min-h-11 items-center text-sm underline">
              {formula ? costText.formulaHide : costText.formulaToggle}
            </button>
            {formula && (
              <div data-testid="c-formula" className="flex flex-col gap-1 rounded-md border border-border bg-card p-2 text-xs">
                <p>{cText.balanceFormula(fmtMoney2(total), fmtMoney2(purchasedTotal(rewards)), fmtMoney2(relapseSpend(entries)), fmtMoney2(balance))}</p>
                <p>{cText.sinceFormula(fmtMoney2(habit.spend), ((now - lastRestart(habit, entries, now)) / DAY).toFixed(2), fmtMoney2(since))}</p>
                {rewards.map((r) => (
                  <p key={r.id}>{cText.progressFormula(fmtMoney2(balance), fmtMoney2(r.price), rewardPct(balance, r.price))}</p>
                ))}
              </div>
            )}
          </div>
          <h3 className="text-lg font-semibold">{cText.rewardsTitle}</h3>
          <div className="grid grid-cols-2 gap-2">
            <button type="button" data-testid="c-rewards-edit" onClick={() => goPh(cText.edit, "habit")} className="min-h-11 rounded-md border border-border bg-card text-sm">
              {cText.edit}
            </button>
            <button type="button" data-testid="c-rewards-add" onClick={() => go("add")} className="min-h-11 rounded-md border border-border bg-card text-sm">
              {"+ "}
              {cText.add}
            </button>
          </div>
          {rewards.map((r) => {
            const pct = rewardPct(balance, r.price)
            return (
              <div key={r.id} data-testid="c-reward" data-pct={pct} data-bought={r.bought ? 1 : 0} className={`flex flex-col gap-2 rounded-lg border border-border bg-card p-3 ${r.bought ? "opacity-60" : ""}`}>
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-semibold">{r.name}</p>
                    <p className="text-sm text-muted-foreground">{fmtMoney2(r.price)}</p>
                  </div>
                  <span data-testid="c-reward-pct" className="text-sm">
                    {pct}%
                  </span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-border">
                  <div className="h-full rounded-full bg-primary" style={{ width: `${pct}%` }} />
                </div>
                <div className="flex min-h-11 items-center justify-between gap-2">
                  <span className="text-sm text-muted-foreground">{pct === 100 && !r.bought ? cText.available : ""}</span>
                  {r.bought ? (
                    <Placeholder className="flex-1" />
                  ) : pct === 100 ? (
                    <button type="button" data-testid="c-purchase" onClick={() => setConfirm(r.id)} className="min-h-11 rounded-md bg-primary px-4 text-primary-foreground">
                      {cText.purchase}
                    </button>
                  ) : null}
                </div>
              </div>
            )
          })}
          <div className="flex gap-2">
            <button type="button" data-testid="c-to-entry" onClick={() => {
              setEntry({ when: toLocalInput(Date.now()), note: "", relapse: false, spend: null })
              go("entry")
            }} className="min-h-11 flex-1 rounded-md border border-border bg-card text-sm">
              {cText.toEntry}
            </button>
          </div>
          <StartOver onClick={startOver} />
        </div>
      )}

      {sheetReward && (
        <div data-testid="c-confirm" className="fixed inset-0 z-50 flex flex-col justify-end bg-black/60">
          <div className="flex flex-col gap-3 rounded-t-2xl border-t border-border bg-background p-4">
            <div className="flex items-center justify-between gap-2">
              <span className="font-semibold">{sheetReward.name}</span>
              <span className="text-primary">{rewardPct(balance, sheetReward.price)}%</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-border">
              <div className="h-full rounded-full bg-primary" style={{ width: `${rewardPct(balance, sheetReward.price)}%` }} />
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">{cText.confirmAfter}</span>
              <span data-testid="c-after" data-value={balanceAfter(balance, sheetReward.price)} className="font-bold">
                {fmtMoney2(balanceAfter(balance, sheetReward.price))}
              </span>
            </div>
            <p data-testid="c-after-formula" className="text-xs text-muted-foreground">
              {cText.afterFormula(fmtMoney2(balance), fmtMoney2(sheetReward.price), fmtMoney2(balanceAfter(balance, sheetReward.price)))}
            </p>
            <div className="flex gap-2">
              <button type="button" data-testid="c-confirm-cancel" onClick={() => setConfirm(null)} className="min-h-12 flex-1 rounded-md border border-border">
                {cText.cancel}
              </button>
              <button
                type="button"
                data-testid="c-confirm-ok"
                onClick={() => {
                  setRewards(rewards.map((r) => (r.id === sheetReward.id ? { ...r, bought: true } : r)))
                  setConfirm(null)
                }}
                className="min-h-12 flex-[2] rounded-md bg-primary text-primary-foreground"
              >
                {cText.purchase}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
