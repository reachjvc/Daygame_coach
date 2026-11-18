"use client"

import { useState } from "react"
import { ExampleBar, Head, Placeholder, PlaceholderScreen, BottomNav } from "../../progress/shared/Bits"
import { Donut, Dropdown, LineChart } from "../shared/Bits"
import { useDiary } from "../shared/hooks"
import { axisMax, dayKey, dotDate, pct, pctText, slashDate, weekOf } from "../shared/logic"
import { dyText } from "../shared/text"
import { type CheckIn, insightNumbers, intensitySeries, meanIntensity, moodShares, seedCheckIns, sorted, upsert, urgesSeries } from "./logic"
import { cText } from "./text"

type Screen = "tabs" | "checkin" | "trigger" | "withdrawal" | "moodchart" | "trends" | "urges" | "intensity" | "insights"

const MOOD_COLORS = ["#ff6b8a", "#ffd60a", "#ff3b3b", "#7aa5ff", "#e08a3c", "#b79cf0", "#9a98a0", "#2aa0ff"]

interface Draft {
  smoked: boolean
  urges: string
  intensity: number
  mood: number | null
}

function ChevronRow({ label, value, onClick, testId }: { label: string; value?: string; onClick: () => void; testId: string }) {
  return (
    <button type="button" data-testid={testId} onClick={onClick} className="flex min-h-14 w-full items-center gap-2 rounded-lg border border-border bg-card px-3 text-left text-sm">
      <span className="min-w-0 flex-1">{label}</span>
      {value && <span className="text-xs text-muted-foreground">{value}</span>}
      <span aria-hidden="true">{"›"}</span>
    </button>
  )
}

function Face() {
  return (
    <svg viewBox="0 0 40 40" className="size-12 shrink-0" aria-hidden="true">
      <circle cx="20" cy="20" r="18" className="fill-card stroke-border" strokeWidth="2" />
      <circle cx="14" cy="17" r="1.8" className="fill-foreground" />
      <circle cx="26" cy="17" r="1.8" className="fill-foreground" />
      <path d="M13 28 Q20 22 27 28" fill="none" className="stroke-foreground" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}

/** A drawn figure that stands in the donut hole: head and shoulders with two question marks. */
function Thinker() {
  return (
    <svg viewBox="0 0 80 80" className="size-24 text-muted-foreground" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
      <circle cx="40" cy="30" r="9" />
      <path d="M22 70 Q22 46 40 46 Q58 46 58 70" />
      <path d="M12 16 q4 -6 8 0 q0 4 -4 5 M16 27 h.1" />
      <path d="M58 10 q4 -6 8 0 q0 4 -4 5 M62 21 h.1" />
    </svg>
  )
}

function Seated() {
  return (
    <svg viewBox="0 0 48 48" className="size-12 text-muted-foreground" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
      <circle cx="24" cy="11" r="5" />
      <path d="M24 17 V30 M14 38 Q24 30 34 38 M14 38 H34 M16 24 L24 28 L32 24" />
    </svg>
  )
}

function Flame() {
  return (
    <svg viewBox="0 0 48 48" className="size-12 text-orange-400" aria-hidden="true" fill="currentColor">
      <path d="M24 4 C26 14 36 18 36 30 A12 12 0 0 1 12 30 C12 24 16 22 17 16 C20 18 21 20 22 22 C24 16 22 10 24 4 Z" />
    </svg>
  )
}

/** Copy C: week strip and check-in form, then the mood donut, two line charts and the insights page. */
export function DiaryC() {
  const diary = useDiary<CheckIn>("c", seedCheckIns)
  const [screen, setScreen] = useState<Screen>("tabs")
  const [tab, setTab] = useState(0)
  const [draft, setDraft] = useState<Draft>({ smoked: false, urges: "0", intensity: 3, mood: null })
  const [mFilter, setMFilter] = useState(0)
  const [seg, setSeg] = useState(0)
  if (!diary.ready) return null
  const entries = sorted(diary.items)
  const todayKey = dayKey(diary.now)
  const week = weekOf(diary.now)
  const nextWeek = weekOf(diary.now + 7 * 86_400_000)
  const done = new Set(entries.map((e) => e.date))
  const root = (children: React.ReactNode) => (
    <div data-testid="diary-c" data-screen={screen === "tabs" ? ["timer", "stats", "health", "entries", "achievements"][tab] : screen}>
      {diary.hasExample && <ExampleBar onClear={diary.clearExample} />}
      {children}
    </div>
  )
  const toTabs = (t: number) => {
    setTab(t)
    setScreen("tabs")
  }
  const startCheckIn = () => {
    const mine = entries.find((e) => e.date === todayKey)
    setDraft(mine ? { smoked: mine.smoked, urges: String(mine.urges), intensity: mine.intensity, mood: mine.mood } : { smoked: false, urges: "0", intensity: 3, mood: null })
    setScreen("checkin")
  }
  const saveCheckIn = () => {
    const n = Number(draft.urges)
    diary.save(upsert(entries, { date: todayKey, smoked: draft.smoked, urges: Number.isFinite(n) && n > 0 ? Math.floor(n) : 0, intensity: draft.intensity, mood: draft.mood }))
    toTabs(0)
  }

  if (screen === "checkin")
    return root(
      <section className="flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <button type="button" data-testid="screen-back" aria-label={dyText.back} onClick={() => toTabs(0)} className="inline-flex size-11 items-center justify-center rounded-full border border-border bg-card text-lg">
            {"‹"}
          </button>
          <h2 className="flex-1 text-lg font-semibold">{cText.checkIn}</h2>
          <button type="button" data-testid="c-save" onClick={saveCheckIn} className="inline-flex min-h-11 items-center rounded-md bg-primary px-4 text-primary-foreground">
            {cText.save}
          </button>
        </div>
        <div className="flex min-h-14 items-center gap-2 rounded-lg border border-border bg-card px-3 text-sm">
          <span className="min-w-0 flex-1">{cText.didSmoke}</span>
          <div role="radiogroup" aria-label={cText.didSmoke} className="flex rounded-full bg-background p-1">
            {[false, true].map((v) => (
              <button key={String(v)} type="button" role="radio" aria-checked={draft.smoked === v} data-testid={`c-smoked-${v ? "yes" : "no"}`} onClick={() => setDraft({ ...draft, smoked: v })} className={`min-h-11 min-w-14 rounded-full px-3 text-sm ${draft.smoked === v ? "bg-primary text-primary-foreground" : ""}`}>
                {v ? cText.yesWord : cText.noWord}
              </button>
            ))}
          </div>
        </div>
        <label className="flex min-h-14 items-center gap-2 rounded-lg border border-border bg-card px-3 text-sm">
          <span className="min-w-0 flex-1">{cText.urgeTimes}</span>
          <input type="number" inputMode="numeric" min={0} data-testid="c-urges" aria-label={cText.urgeInput} value={draft.urges} onChange={(e) => setDraft({ ...draft, urges: e.target.value })} className="min-h-11 w-16 rounded-md border border-border bg-background px-2 text-right" />
          <span className="text-xs text-muted-foreground">{cText.times}</span>
        </label>
        <div className="rounded-lg border border-border bg-card p-3">
          <p className="text-sm">{cText.intensity}</p>
          <div className="mt-2 flex items-center justify-between">
            <Seated />
            <span data-testid="c-intensity-value" className="text-2xl font-semibold">
              {draft.intensity}
            </span>
            <Flame />
          </div>
          <input type="range" min={0} max={10} step={1} value={draft.intensity} data-testid="c-intensity" aria-label={cText.slider} onChange={(e) => setDraft({ ...draft, intensity: Number(e.target.value) })} className="h-11 w-full accent-emerald-400" />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{cText.none}</span>
            <span>{cText.intense}</span>
          </div>
        </div>
        <ChevronRow label={cText.trigger} value={draft.mood === null ? undefined : cText.moods[draft.mood]} onClick={() => setScreen("trigger")} testId="c-trigger-row" />
        <ChevronRow label={cText.withdrawal} onClick={() => setScreen("withdrawal")} testId="c-withdrawal-row" />
        <Placeholder />
      </section>,
    )

  if (screen === "trigger")
    return root(
      <section className="flex flex-col gap-3" data-testid="c-trigger">
        <Head title={cText.triggerTitle} onBack={() => setScreen("checkin")} inferred />
        <div className="flex flex-wrap gap-2" role="radiogroup" aria-label={cText.triggerTitle}>
          {cText.moods.map((m, i) => (
            <button key={m} type="button" role="radio" aria-checked={draft.mood === i} data-testid={`c-mood-${i}`} onClick={() => setDraft({ ...draft, mood: i })} className={`min-h-11 rounded-full border px-4 text-sm ${draft.mood === i ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card"}`}>
              {m}
            </button>
          ))}
        </div>
        <Placeholder />
      </section>,
    )

  if (screen === "withdrawal") return root(<PlaceholderScreen title={cText.withdrawal} onBack={() => setScreen("checkin")} />)

  if (screen === "moodchart") {
    const shares = moodShares(entries)
    const total = shares.reduce((a, s) => a + s.count, 0)
    return root(
      <section className="flex flex-col gap-3" data-testid="c-moodchart">
        <Head title={cText.entriesTitle} onBack={() => toTabs(3)} />
        <div className="rounded-lg border border-border bg-card p-3">
          <Donut
            testId="c-donut"
            slices={shares.map((s) => ({ key: s.key, label: cText.moods[Number(s.key)], count: s.count, color: MOOD_COLORS[Number(s.key)], value: pctText(s.count, total, 2) }))}
            centre={<span className="text-sm font-medium">{cText.moodChartCentre}</span>}
          />
        </div>
      </section>,
    )
  }

  if (screen === "trends") {
    const only = mFilter === 0 ? null : mFilter - 1
    const shares = moodShares(entries, only)
    const total = shares.reduce((a, s) => a + s.count, 0)
    const top = moodShares(entries, only)[0]?.key ?? null
    return root(
      <section className="flex flex-col gap-3" data-testid="c-trends">
        <Head title={cText.trendsTitle} onBack={() => toTabs(3)} />
        <div className="grid grid-cols-[auto_1fr] items-center gap-x-3 gap-y-2 text-sm">
          <span>{cText.graph}</span>
          <Dropdown label={cText.graph} options={[cText.pieChart]} value={0} onChange={() => undefined} testId="c-graph" moreUnseen />
          <span>{cText.range}</span>
          <Dropdown label={cText.range} options={[cText.allTime]} value={0} onChange={() => undefined} testId="c-range" moreUnseen />
        </div>
        <div>
          <h3 className="text-lg font-semibold">{cText.moodDist}</h3>
          <p className="text-sm text-muted-foreground">{cText.moodDistLine}</p>
        </div>
        <div className="grid grid-cols-[auto_1fr] items-center gap-x-3 text-sm">
          <span>{cText.moodsLabel}</span>
          <Dropdown label={cText.moodsLabel} options={[cText.all, ...cText.moods]} value={mFilter} onChange={setMFilter} testId="c-moods" />
        </div>
        <Donut testId="c-donut" slices={shares.map((s) => ({ key: s.key, label: cText.moods[Number(s.key)], count: s.count, color: MOOD_COLORS[Number(s.key)], value: `${pct(s.count, total)}%` }))} centre={<Thinker />} innerRatio={0.55} />
        <div data-testid="c-most-common" className="rounded-lg border border-border bg-card p-3">
          <div className="flex items-center gap-3">
            <Face />
            <div>
              <p className="font-semibold">{cText.mostCommon}</p>
              <p className="text-sm text-muted-foreground">{top === null ? cText.noMoods : cText.mostCommonLine(cText.moods[Number(top)])}</p>
            </div>
          </div>
        </div>
      </section>,
    )
  }

  if (screen === "urges") {
    const series = seg === 0 ? urgesSeries(entries) : intensitySeries(entries)
    return root(
      <section className="flex flex-col gap-3" data-testid="c-urges-chart">
        <Head title={cText.entriesTitle} onBack={() => toTabs(3)} />
        <div role="tablist" className="flex rounded-lg bg-card p-1">
          {[cText.urgesPerDay, cText.avgIntensity].map((l, i) => (
            <button key={l} type="button" role="tab" aria-selected={seg === i} data-testid={`c-seg-${i}`} onClick={() => setSeg(i)} className={`min-h-11 flex-1 rounded-md text-sm ${seg === i ? "bg-primary text-primary-foreground" : ""}`}>
              {l}
            </button>
          ))}
        </div>
        <div className="rounded-lg border border-border bg-card p-2">
          <LineChart testId="c-line" grid points={series.map((s) => ({ label: slashDate(s.date), value: s.value }))} yMin={0} yMax={axisMax(series.map((s) => s.value), 6)} valueText={(v) => (seg === 0 ? String(v) : v.toFixed(1))} />
        </div>
      </section>,
    )
  }

  if (screen === "intensity") {
    const series = intensitySeries(entries)
    const vals = series.map((s) => s.value)
    const yMin = vals.length ? Math.max(0, Math.floor(Math.min(...vals)) - 1) : 0
    const yMax = Math.max(yMin + 2, vals.length ? Math.ceil(Math.max(...vals)) : 10)
    const avg = meanIntensity(entries)
    return root(
      <section className="flex flex-col gap-3" data-testid="c-intensity-page">
        <Head title={cText.intensityTitle} onBack={() => toTabs(3)} />
        <div className="grid grid-cols-[auto_1fr] items-center gap-x-3 gap-y-2 text-sm">
          <span>{cText.graph}</span>
          <Dropdown label={cText.graph} options={[cText.lineChart]} value={0} onChange={() => undefined} testId="c-graph" moreUnseen />
          <span>{cText.range}</span>
          <Dropdown label={cText.range} options={[cText.allTime]} value={0} onChange={() => undefined} testId="c-range" moreUnseen />
        </div>
        <div>
          <h3 className="text-lg font-semibold">{cText.intensityHead}</h3>
          <p className="text-sm text-muted-foreground">{cText.intensityLine}</p>
        </div>
        <div className="rounded-lg border border-border bg-card p-2">
          <LineChart testId="c-line" smooth points={series.map((s) => ({ label: slashDate(s.date), value: s.value }))} yMin={yMin} yMax={yMax} yStep={yMax - yMin > 8 ? 2 : 1} legend={cText.legend} />
        </div>
        <div className="flex items-center gap-3 rounded-lg border border-border bg-card p-3" data-testid="c-trend">
          <div className="min-w-0 flex-1">
            <p className="font-semibold">{cText.trendTitle}</p>
            <p className="text-sm text-muted-foreground">{cText.trendLine}</p>
          </div>
          <div className="rounded-lg bg-primary px-3 py-2 text-primary-foreground">
            <span data-testid="c-trend-value" className="text-2xl font-bold">
              {avg === null ? "–" : avg.toFixed(1)}
            </span>
            <span className="text-sm">{cText.outOf}</span>
          </div>
        </div>
      </section>,
    )
  }

  if (screen === "insights") {
    const n = insightNumbers(entries)
    return root(
      <section className="flex flex-col gap-3" data-testid="c-insights">
        <Head title={cText.insightsTitle} onBack={() => toTabs(3)} />
        {n.days === 0 ? (
          <p className="text-sm text-muted-foreground">{cText.noData}</p>
        ) : (
          <ul className="list-disc space-y-2 pl-5 text-sm">
            <li>{cText.streak(n.streak)}</li>
            <li>{cText.urgeDays(n.urgeDays, n.days)}</li>
            <li>{cText.smokedDays(n.smokedDays, n.days)}</li>
            {n.avg !== null && <li>{cText.avgInt(n.avg.toFixed(1))}</li>}
          </ul>
        )}
        <h3 className="text-lg font-semibold">{cText.recsTitle}</h3>
        <ul className="list-disc space-y-2 pl-5 text-sm">
          {cText.recs.map((r) => (
            <li key={r}>{r}</li>
          ))}
        </ul>
      </section>,
    )
  }

  // main tabs
  const body = () => {
    if (tab === 0)
      return (
        <div className="flex flex-col gap-4" data-testid="c-timer">
          <div className="rounded-3xl bg-emerald-700 px-3 py-2">
            <div className="grid grid-cols-7 text-center text-sm font-semibold text-white">
              {dyText.weekLetters.map((l, i) => (
                <span key={i}>{l}</span>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-7 items-center text-center" data-testid="c-week">
            {week.map((k) => {
              const day = Number(k.slice(8))
              if (k === todayKey) {
                return (
                  <span key={k} data-testid="c-today" className="mx-auto inline-flex size-11 items-center justify-center rounded-full border-4 border-emerald-400/60 text-base font-semibold">
                    {day}
                  </span>
                )
              }
              if (done.has(k))
                return (
                  <span key={k} data-testid={`c-done-${k}`} className="mx-auto inline-flex size-10 items-center justify-center rounded-lg bg-emerald-500/25 text-emerald-300">
                    {"✓"}
                  </span>
                )
              return (
                <span key={k} className="mx-auto inline-flex size-10 items-center justify-center text-muted-foreground">
                  {day}
                </span>
              )
            })}
          </div>
          <div className="grid grid-cols-7 items-center text-center text-muted-foreground" data-testid="c-next-week">
            {nextWeek.map((k) => (
              <span key={k} className="mx-auto inline-flex size-10 items-center justify-center">
                {Number(k.slice(8))}
              </span>
            ))}
          </div>
          <div className="flex min-h-11 items-center justify-center rounded-md border border-dashed border-border px-3 py-3 text-center text-sm text-muted-foreground">{dyText.otherTool}</div>
          <button type="button" data-testid="c-checkin" onClick={startCheckIn} className="min-h-12 rounded-md bg-primary px-4 text-primary-foreground">
            {cText.checkInButton}
          </button>
        </div>
      )
    if (tab === 3)
      return (
        <div className="flex flex-col gap-3" data-testid="c-entries">
          <Head title={cText.entriesTitle} inferred />
          <div className="grid grid-cols-2 gap-2">
            {(
              [
                ["moodchart", cText.goMood],
                ["trends", cText.goTrends],
                ["urges", cText.goUrges],
                ["intensity", cText.goIntensity],
                ["insights", cText.goInsights],
              ] as const
            ).map(([s, l]) => (
              <button key={s} type="button" data-testid={`c-go-${s}`} onClick={() => setScreen(s)} className="min-h-12 rounded-lg border border-border bg-card px-3 text-sm">
                {l}
              </button>
            ))}
          </div>
          {entries.length === 0 ? <p className="text-sm text-muted-foreground">{dyText.noEntries}</p> : <p data-testid="c-entry-count" data-count={entries.length} className="text-sm text-muted-foreground">{cText.entryCount(entries.length)}</p>}
          <ul className="flex flex-col gap-2" data-testid="c-entry-list">
            {[...entries].reverse().map((e) => (
              <li key={e.date} data-testid={`c-entry-${e.date}`} className="flex flex-col gap-0.5 rounded-lg border border-border bg-card p-3 text-sm">
                <span className="font-medium">{dotDate(e.date)}</span>
                <span className="text-muted-foreground">
                  {cText.didSmoke} {e.smoked ? cText.yesWord : cText.noWord} · {e.urges} {cText.urgesShort} · {cText.intensityShort} {e.intensity}
                  {e.mood !== null ? ` · ${cText.moods[e.mood]}` : ""}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )
    return <div className="flex min-h-11 items-center justify-center rounded-md border border-dashed border-border px-3 py-3 text-center text-sm text-muted-foreground">{dyText.otherTool}</div>
  }
  return root(
    <>
      {body()}
      <div className="[&_nav]:static">
        <BottomNav items={cText.navItems} value={tab} onChange={(t) => setTab(t)} id="c-nav" />
      </div>
    </>,
  )
}
