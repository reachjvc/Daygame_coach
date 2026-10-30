"use client"

/**
 * FREQUENCIES (Plans/thought.md, screen 6): what comes most, when it comes,
 * and what changed after a reframe.
 *
 * THE TONE IS INFORMATION, NOT A SCORE ("The habit": seeing "I am bad × 143"
 * must not make things worse). So the most prominent number on the tab is the
 * change since reframing, the counts are plain, and nothing is red.
 *
 * Forms, by the data's job (the dataviz method): ranked magnitude is a bar
 * list; a 7 × 24 pattern is a one-hue heat grid; before/after is two numbers,
 * not a chart; answered reminders is one stat. Every number is counted in the
 * database (`thought_frequency_stats`).
 */

import { useMemo, useState } from "react"
import { cn } from "@/lib/utils"
import type { FrequencyStats, Thought } from "../types"
import { formatDay } from "./format"

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
const DAY_NAMES = ["Mondays", "Tuesdays", "Wednesdays", "Thursdays", "Fridays", "Saturdays", "Sundays"]
/** One hue, five steps, dark to bright on the dark surface (sequential). Step 0 is "none". */
const HEAT_STEPS = ["bg-muted-foreground/10", "bg-primary/20", "bg-primary/40", "bg-primary/60", "bg-primary/80", "bg-primary"]

function step(n: number, max: number): number {
  if (n <= 0 || max <= 0) return 0
  return Math.min(5, Math.max(1, Math.ceil((n / max) * 5)))
}

function perDay(n: number, days: number): string {
  if (days <= 0) return "–"
  const v = n / days
  return v >= 10 ? v.toFixed(0) : v.toFixed(1)
}

function hourRange(h: number): string {
  return `${String(h).padStart(2, "0")}:00–${String((h + 1) % 24).padStart(2, "0")}:00`
}

function Section({ title, children, id }: { title: string; children: React.ReactNode; id: string }) {
  return (
    <section aria-labelledby={id} className="space-y-3">
      <h2 id={id} className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {title}
      </h2>
      {children}
    </section>
  )
}

export function FrequenciesView({
  stats,
  error,
  thoughts,
  timezone,
  onRetry,
}: {
  stats: FrequencyStats | null
  error: string | null
  thoughts: Thought[]
  timezone: string
  onRetry: () => void
}) {
  const [range, setRange] = useState<"week" | "month">("week")
  const [cell, setCell] = useState<{ dow: number; hour: number } | null>(null)
  const names = useMemo(() => new Map(thoughts.map((t) => [t.id, t.text])), [thoughts])

  if (error) {
    return (
      <div role="alert" className="rounded-2xl border border-border bg-card p-5">
        <p>{error}.</p>
        <button type="button" onClick={onRetry} className="mt-2 min-h-11 text-sm text-primary underline underline-offset-4">
          Try again
        </button>
      </div>
    )
  }
  if (!stats) {
    return (
      <div className="space-y-3" aria-busy="true" aria-label="Counting your thoughts">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-16 animate-pulse rounded-2xl bg-card" />
        ))}
      </div>
    )
  }

  const top = (range === "week" ? stats.weekTop : stats.monthTop).filter((t) => names.has(t.thoughtId))
  const topMax = Math.max(1, ...top.map((t) => t.n))
  const grid = new Map(stats.heat.map((c) => [`${c.dow}-${c.hour}`, c.n]))
  const heatMax = Math.max(0, ...stats.heat.map((c) => c.n))
  const heatTotal = stats.heat.reduce((sum, c) => sum + c.n, 0)
  const picked = cell ? (grid.get(`${cell.dow}-${cell.hour}`) ?? 0) : 0
  const busiest = [...stats.heat].sort((a, b) => b.n - a.n).slice(0, 5)
  const reframed = stats.reframes.filter((r) => names.has(r.thoughtId))

  if (stats.monthTop.length === 0) {
    return (
      <p className="rounded-2xl border border-dashed border-border p-5 text-sm leading-relaxed text-muted-foreground" data-testid="frequencies-empty">
        Nothing to count yet. A few days of tapping your thoughts and this fills in: which come most, at what time of day,
        and how often they come once you have reframed them.
      </p>
    )
  }

  return (
    <div className="space-y-8" data-testid="frequencies">
      {reframed.length > 0 && (
        <Section title="Since reframing" id="since-reframing">
          <ul className="space-y-2">
            {reframed.map((r) => {
              const enough = r.afterDays >= 1
              return (
                <li key={r.thoughtId} className="rounded-2xl border border-border bg-card p-4">
                  <div className="flex items-baseline justify-between gap-3">
                    <p className="min-w-0 break-words font-medium">{names.get(r.thoughtId)}</p>
                    <p className="shrink-0 text-xs text-muted-foreground">reframed {formatDay(r.reframedAt, timezone)}</p>
                  </div>
                  {enough ? (
                    <p className="mt-2 flex flex-wrap items-baseline gap-x-2 text-sm">
                      <span className="text-muted-foreground line-through decoration-muted-foreground/50">
                        {perDay(r.beforeN, Math.max(r.beforeDays, 1))} a day
                      </span>
                      <span aria-hidden className="text-muted-foreground">→</span>
                      <span className="text-2xl font-semibold tabular-nums">{perDay(r.afterN, r.afterDays)}</span>
                      <span className="text-muted-foreground">a day since</span>
                      <span className="sr-only">
                        Before the reframe {perDay(r.beforeN, Math.max(r.beforeDays, 1))} a day; since, {perDay(r.afterN, r.afterDays)} a day.
                      </span>
                    </p>
                  ) : (
                    <p className="mt-2 text-sm text-muted-foreground">Too early to tell. Come back tomorrow.</p>
                  )}
                </li>
              )
            })}
          </ul>
        </Section>
      )}

      <Section title="Most frequent" id="most-frequent">
        <div className="flex gap-1 rounded-xl bg-card p-1" role="radiogroup" aria-label="Period">
          {(["week", "month"] as const).map((r) => (
            <button
              key={r}
              type="button"
              role="radio"
              aria-checked={range === r}
              onClick={() => setRange(r)}
              className={cn("min-h-10 flex-1 rounded-lg text-sm", range === r ? "bg-background text-foreground" : "text-muted-foreground")}
            >
              {r === "week" ? "This week" : "This month"}
            </button>
          ))}
        </div>
        {top.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nothing logged this week yet.</p>
        ) : (
          <ol className="space-y-3" data-testid="frequencies-top">
            {top.map((t) => (
              <li key={t.thoughtId} title={`${names.get(t.thoughtId)}: ${t.n}`}>
                <div className="flex items-baseline justify-between gap-3 text-sm">
                  <span className="min-w-0 break-words">{names.get(t.thoughtId)}</span>
                  <span className="shrink-0 tabular-nums text-muted-foreground">{t.n}</span>
                </div>
                <div className="mt-1.5 h-2 w-full rounded-full bg-muted-foreground/10" aria-hidden>
                  <div className="h-2 rounded-full bg-primary" style={{ width: `${Math.max(2, (t.n / topMax) * 100)}%` }} />
                </div>
              </li>
            ))}
          </ol>
        )}
      </Section>

      <Section title="When they come · last 30 days" id="when-they-come">
        <div>
          <div
            className="grid gap-[2px]"
            style={{ gridTemplateColumns: "2.25rem repeat(24, minmax(0, 1fr))" }}
            role="img"
            aria-label={
              busiest.length > 0
                ? `Busiest: ${busiest
                    .slice(0, 3)
                    .map((c) => `${DAY_NAMES[c.dow - 1]} ${hourRange(c.hour)}, ${c.n}`)
                    .join("; ")}`
                : "No thoughts logged in the last 30 days"
            }
            onMouseLeave={() => setCell(null)}
          >
            {DAYS.map((d, i) => (
              <div key={d} className="contents">
                <span className="flex items-center text-[10px] text-muted-foreground">{d}</span>
                {Array.from({ length: 24 }, (_, h) => {
                  const n = grid.get(`${i + 1}-${h}`) ?? 0
                  const on = cell?.dow === i + 1 && cell.hour === h
                  return (
                    <button
                      key={h}
                      type="button"
                      tabIndex={-1}
                      aria-hidden
                      onMouseEnter={() => setCell({ dow: i + 1, hour: h })}
                      onClick={() => setCell({ dow: i + 1, hour: h })}
                      className={cn("aspect-square min-h-2.5 rounded-[3px]", HEAT_STEPS[step(n, heatMax)], on && "ring-2 ring-foreground")}
                    />
                  )
                })}
              </div>
            ))}
          </div>
          <div className="mt-1 grid text-[10px] text-muted-foreground" style={{ gridTemplateColumns: "2.25rem repeat(4, 1fr)" }} aria-hidden>
            <span />
            <span>00</span>
            <span>06</span>
            <span>12</span>
            <span className="flex justify-between">
              <span>18</span>
              <span>24</span>
            </span>
          </div>
          <div className="mt-2 flex min-h-5 items-center justify-between gap-3 text-xs">
            <span className="text-foreground" aria-live="polite">
              {cell
                ? `${DAY_NAMES[cell.dow - 1]} ${hourRange(cell.hour)} · ${picked === 1 ? "1 thought" : `${picked} thoughts`}`
                : `${heatTotal} thoughts. Tap a square for its hour.`}
            </span>
            <span className="flex shrink-0 items-center gap-1 text-muted-foreground" aria-hidden>
              fewer
              {HEAT_STEPS.slice(1).map((c) => (
                <span key={c} className={cn("size-2.5 rounded-[3px]", c)} />
              ))}
              more
            </span>
          </div>
          <details className="mt-2 text-sm">
            <summary className="min-h-11 cursor-pointer py-2 text-xs text-muted-foreground">Show the busiest hours as a list</summary>
            <table className="w-full text-left text-sm">
              <thead className="text-xs text-muted-foreground">
                <tr>
                  <th className="py-1 font-normal">When</th>
                  <th className="py-1 text-right font-normal">Thoughts</th>
                </tr>
              </thead>
              <tbody>
                {busiest.map((c) => (
                  <tr key={`${c.dow}-${c.hour}`} className="border-t border-border">
                    <td className="py-1.5">
                      {DAY_NAMES[c.dow - 1]} {hourRange(c.hour)}
                    </td>
                    <td className="py-1.5 text-right tabular-nums">{c.n}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </details>
        </div>
      </Section>

      <Section title="Reminders · last 7 days" id="reminders-answered">
        <div className="rounded-2xl border border-border bg-card p-4" data-testid="frequencies-answered">
          {stats.prompts.delivered === 0 ? (
            <p className="text-sm text-muted-foreground">No reminders delivered this week.</p>
          ) : (
            <>
              <p className="text-sm text-muted-foreground">Answered</p>
              <p className="mt-0.5 text-2xl font-semibold tabular-nums">
                {stats.prompts.answered} <span className="text-base font-normal text-muted-foreground">of {stats.prompts.delivered}</span>
              </p>
              {stats.prompts.answered * 2 < stats.prompts.delivered && (
                <p className="mt-1 text-xs text-muted-foreground">
                  Fewer than half answered usually means reminders come too often. You can change how often in Settings.
                </p>
              )}
            </>
          )}
        </div>
      </Section>
    </div>
  )
}

/**
 * THE LAST 14 DAYS OF ONE THOUGHT, as a 2px line, with the day of its first
 * reframe marked. In the thought's own sheet.
 */
export function ThoughtTrend({
  stats,
  thought,
  timezone,
}: {
  stats: FrequencyStats | null
  thought: Thought
  timezone: string
}) {
  const series = useMemo(() => {
    if (!stats) return null
    const byDay = new Map(stats.days.filter((d) => d.thoughtId === thought.id).map((d) => [d.day, d.n]))
    const today = new Intl.DateTimeFormat("en-CA", { timeZone: timezone }).format(new Date())
    const [y, m, d] = today.split("-").map(Number)
    return Array.from({ length: 14 }, (_, i) => {
      const key = new Date(Date.UTC(y, m - 1, d - 13 + i)).toISOString().slice(0, 10)
      return { day: key, n: byDay.get(key) ?? 0 }
    })
  }, [stats, thought.id, timezone])

  if (!series) return <div className="h-14 animate-pulse rounded-xl bg-background/60" aria-hidden />

  const max = Math.max(1, ...series.map((p) => p.n))
  const W = 280
  const H = 48
  const x = (i: number) => (i / 13) * (W - 8) + 4
  const y = (n: number) => H - 4 - (n / max) * (H - 12)
  const reframe = stats?.reframes.find((r) => r.thoughtId === thought.id)
  const reframeDay = reframe ? new Intl.DateTimeFormat("en-CA", { timeZone: timezone }).format(new Date(reframe.reframedAt)) : null
  const reframeIndex = reframeDay ? series.findIndex((p) => p.day === reframeDay) : -1
  const total = series.reduce((s, p) => s + p.n, 0)

  return (
    <figure className="space-y-1">
      <svg viewBox={`0 0 ${W} ${H}`} className="h-14 w-full" role="img" aria-label={`Last 14 days: ${total} times, most on one day ${max}.`}>
        <line x1="4" x2={W - 4} y1={H - 4} y2={H - 4} stroke="currentColor" className="text-border" strokeWidth="1" />
        {reframeIndex >= 0 && (
          <>
            <line x1={x(reframeIndex)} x2={x(reframeIndex)} y1="2" y2={H - 4} stroke="currentColor" className="text-muted-foreground" strokeDasharray="3 3" />
            <text x={x(reframeIndex) + 4} y="10" className="fill-muted-foreground" fontSize="9">
              reframed
            </text>
          </>
        )}
        <polyline
          fill="none"
          stroke="var(--primary)"
          strokeWidth="2"
          strokeLinejoin="round"
          strokeLinecap="round"
          points={series.map((p, i) => `${x(i)},${y(p.n)}`).join(" ")}
        />
        {series.map((p, i) => (
          <circle key={p.day} cx={x(i)} cy={y(p.n)} r="6" fill="transparent">
            <title>{`${formatDay(`${p.day}T12:00:00Z`, "UTC")}: ${p.n}`}</title>
          </circle>
        ))}
      </svg>
      <figcaption className="flex justify-between text-[10px] text-muted-foreground">
        <span>14 days ago</span>
        <span>today</span>
      </figcaption>
    </figure>
  )
}
