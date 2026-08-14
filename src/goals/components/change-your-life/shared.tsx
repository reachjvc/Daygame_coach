"use client"

/**
 * Small pieces shared by the research view, the prototype flow and the script.
 *
 * Nothing here holds state. Two conventions run through all three views:
 * evidence is set in mono (counts, multipliers, timecodes) and argument is set
 * in the body face, and a like count is always shown next to a quote — a quote
 * without its count is an assertion, with it it is evidence.
 */

import Link from "next/link"
import { ArrowLeft } from "lucide-react"

import { Button } from "@/components/ui/button"

export function LabHeader({
  eyebrow,
  title,
  blurb,
  backHref = "/test",
  backLabel = "Back to Test Pages",
  children,
}: {
  eyebrow: string
  title: string
  blurb: string
  backHref?: string
  backLabel?: string
  children?: React.ReactNode
}) {
  return (
    <div className="mb-8">
      <Button asChild variant="ghost" size="sm" className="mb-4 -ml-2">
        <Link href={backHref}>
          <ArrowLeft className="size-4 mr-2" />
          {backLabel}
        </Link>
      </Button>
      <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-muted-foreground">{eyebrow}</p>
      <h1 className="mt-2 text-3xl font-bold tracking-tight text-foreground text-balance">{title}</h1>
      <p className="mt-3 max-w-2xl text-muted-foreground">{blurb}</p>
      {children ? <div className="mt-5">{children}</div> : null}
    </div>
  )
}

export function SectionHeading({
  n,
  title,
  blurb,
}: {
  n?: string
  title: string
  blurb?: string
}) {
  return (
    <div className="mb-5">
      {n ? (
        <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-muted-foreground">{n}</p>
      ) : null}
      <h2 className="mt-1.5 text-xl font-semibold tracking-tight text-foreground text-balance">{title}</h2>
      {blurb ? <p className="mt-2 max-w-2xl text-sm text-muted-foreground">{blurb}</p> : null}
    </div>
  )
}

export function StatTile({ value, label }: { value: string; label: string }) {
  return (
    <div className="rounded-lg border border-border bg-card p-3">
      <div className="font-mono text-xl font-semibold tabular-nums tracking-tight text-foreground">{value}</div>
      <div className="mt-1 font-mono text-[10px] uppercase tracking-[0.1em] text-muted-foreground">{label}</div>
    </div>
  )
}

/**
 * A quote with the likes that endorsed it. The count carries the weight because
 * the count is what makes the quote evidence rather than an anecdote.
 */
export function Specimen({
  likes,
  text,
  source,
  size = "default",
}: {
  likes: number
  text: string
  source: string
  size?: "default" | "hero"
}) {
  const formatted = likes >= 1000 ? `${(likes / 1000).toFixed(likes >= 10000 ? 0 : 1)}k` : String(likes)
  if (size === "hero") {
    return (
      <figure className="rounded-lg border border-primary/30 bg-primary/5 p-5">
        <div className="font-mono text-xs uppercase tracking-[0.1em] text-muted-foreground">
          <span className="text-lg font-semibold tabular-nums text-primary">{likes.toLocaleString()}</span> likes
        </div>
        <blockquote className="mt-3 text-xl font-medium leading-snug text-foreground text-balance">
          “{text}”
        </blockquote>
        <figcaption className="mt-3 font-mono text-[11px] text-muted-foreground">{source}</figcaption>
      </figure>
    )
  }
  return (
    <figure className="grid grid-cols-[64px_1fr] gap-4 border-t border-border pt-3">
      <div className="pt-0.5 text-right">
        <div className="font-mono text-sm font-semibold tabular-nums text-primary">{formatted}</div>
        <div className="font-mono text-[9px] uppercase tracking-[0.1em] text-muted-foreground">likes</div>
      </div>
      <div>
        <blockquote className="text-sm text-foreground">“{text}”</blockquote>
        <figcaption className="mt-1.5 font-mono text-[11px] text-muted-foreground">{source}</figcaption>
      </div>
    </figure>
  )
}

/** A horizontal magnitude bar. One series, so no legend and a direct label. */
export function Bar({
  label,
  sublabel,
  value,
  max,
  suffix = "",
  emphasis = false,
  /** Let long names wrap instead of clipping. Use wherever the bar may be filmed. */
  wrapLabel = false,
}: {
  label: string
  sublabel?: string
  value: number
  max: number
  suffix?: string
  emphasis?: boolean
  wrapLabel?: boolean
}) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100))
  const clip = wrapLabel ? "" : "truncate"
  return (
    <div
      className={`grid items-center gap-3 ${
        wrapLabel ? "grid-cols-[minmax(120px,190px)_1fr_56px]" : "grid-cols-[minmax(96px,168px)_1fr_56px]"
      }`}
    >
      <div className="min-w-0">
        <div className={`text-sm leading-snug text-foreground ${clip}`}>{label}</div>
        {sublabel ? (
          <div className={`font-mono text-[10px] uppercase tracking-[0.08em] text-muted-foreground ${clip}`}>
            {sublabel}
          </div>
        ) : null}
      </div>
      <div className="h-4">
        <div
          className={`h-4 rounded-r ${emphasis ? "bg-primary" : "bg-primary/45"}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="text-right font-mono text-sm font-semibold tabular-nums text-foreground">
        {value}
        {suffix}
      </div>
    </div>
  )
}

/**
 * The page's recurring structural device: a thing the corpus says, and the thing
 * it leaves out. Used instead of decorative numbering, because the claim/gap
 * split is the actual finding.
 */
export function ClaimGap({
  title,
  said,
  gap,
  gapLabel = "Gap",
}: {
  title?: string
  said: string
  gap: string
  gapLabel?: string
}) {
  return (
    <div className="border-l-2 border-border pl-4">
      {title ? <h3 className="text-base font-semibold text-foreground">{title}</h3> : null}
      <p className="mt-1 text-sm text-muted-foreground">{said}</p>
      <p className="mt-2 text-sm text-foreground">
        <span className="font-mono text-[10px] uppercase tracking-[0.1em] text-primary">{gapLabel}</span>{" "}
        {gap}
      </p>
    </div>
  )
}

// ------------------------------------------------- graphics for the showcase
// These are built to be filmed: large, high-contrast, and legible for the two
// seconds they are on screen. Each carries one fact and no second idea.

/**
 * `total` dots with `filled` of them lit. Reads instantly at any size and needs
 * no axis, no legend and no explanation — which is what a scrolling shot needs.
 */
export function DotGrid({
  total,
  filled,
  perRow = 13,
  size = "default",
}: {
  total: number
  filled: number
  perRow?: number
  size?: "default" | "large"
}) {
  const dot = size === "large" ? "size-3.5" : "size-2.5"
  return (
    <div
      className="grid w-fit gap-1.5"
      style={{ gridTemplateColumns: `repeat(${perRow}, minmax(0, 1fr))` }}
      role="img"
      aria-label={`${filled} of ${total}`}
    >
      {Array.from({ length: total }, (_, i) => (
        <span
          key={i}
          className={`${dot} rounded-full ${i < filled ? "bg-primary" : "bg-muted-foreground/25"}`}
        />
      ))}
    </div>
  )
}

export function BigStat({
  value,
  unit,
  caption,
}: {
  value: string
  unit?: string
  caption: string
}) {
  return (
    <div>
      <div className="flex items-baseline gap-2">
        <span className="font-mono text-5xl font-semibold tabular-nums tracking-tighter text-foreground md:text-6xl">
          {value}
        </span>
        {unit ? <span className="text-lg text-muted-foreground">{unit}</span> : null}
      </div>
      <p className="mt-2 text-sm text-muted-foreground">{caption}</p>
    </div>
  )
}

/**
 * Competing answers to one question, drawn on a shared log axis.
 *
 * Log, not linear: the claims span thirty days to fifteen years, and on a linear
 * axis the short ones collapse into the axis line and the picture stops being
 * readable. The axis is labelled in human units so the compression is visible
 * rather than hidden.
 */
export function DurationChart({
  rows,
}: {
  rows: readonly { label: string; lowDays: number; highDays: number; human: string }[]
}) {
  const MIN = 10
  const MAX = 5475
  const pos = (d: number) => {
    const t = (Math.log(Math.max(d, MIN)) - Math.log(MIN)) / (Math.log(MAX) - Math.log(MIN))
    return Math.max(0, Math.min(100, t * 100))
  }
  const ticks: { at: number; label: string }[] = [
    { at: 30, label: "1 month" },
    { at: 365, label: "1 year" },
    { at: 1825, label: "5 years" },
    { at: 5475, label: "15 years" },
  ]

  // The label sits above its bar rather than beside it. Beside it, the label
  // column has to be fixed-width, and at any narrow crop — which is exactly what
  // a 9:16 capture is — the names truncate to an ellipsis and the chart looks
  // broken on camera.
  return (
    <div>
      <div className="space-y-4">
        {rows.map((r) => {
          const left = pos(r.lowDays)
          const right = pos(r.highDays)
          const width = Math.max(right - left, 1.5)
          return (
            <div key={r.label}>
              <div className="flex items-baseline justify-between gap-3">
                <span className="text-sm text-muted-foreground">{r.label}</span>
                <span className="shrink-0 font-mono text-xs tabular-nums text-foreground">{r.human}</span>
              </div>
              <div className="relative mt-1.5 h-3.5">
                <div className="absolute inset-y-1 left-0 right-0 rounded bg-muted-foreground/15" />
                <div
                  className="absolute inset-y-0 rounded bg-primary"
                  style={{ left: `${left}%`, width: `${width}%` }}
                />
              </div>
            </div>
          )
        })}
      </div>
      <div className="relative mt-2 h-5 border-t border-border">
        {ticks.map((t) => {
          const at = pos(t.at)
          // The end ticks would hang half off each edge and wrap; pin them inside.
          const nudge = at >= 99 ? "-translate-x-full" : at <= 1 ? "translate-x-0" : "-translate-x-1/2"
          return (
            <span
              key={t.label}
              className={`absolute whitespace-nowrap pt-1 font-mono text-[10px] text-muted-foreground ${nudge}`}
              style={{ left: `${at}%` }}
            >
              {t.label}
            </span>
          )
        })}
      </div>
    </div>
  )
}

/** A left-to-right sequence. Used for the loop the audience invented. */
export function Chain({ steps }: { steps: readonly { label: string; sub: string }[] }) {
  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-stretch">
      {steps.map((s, i) => (
        <div key={s.label} className="flex flex-1 items-stretch gap-2">
          <div className="flex-1 rounded-lg border border-border bg-background p-3">
            <p className="text-sm font-medium text-foreground">{s.label}</p>
            <p className="mt-1 text-xs text-muted-foreground">{s.sub}</p>
          </div>
          {i < steps.length - 1 ? (
            <span aria-hidden className="hidden self-center text-muted-foreground sm:inline">→</span>
          ) : null}
        </div>
      ))}
    </div>
  )
}

/**
 * The method as one picture: four steps left to right, and the branch for the
 * day you miss looping back to the last step rather than to the first.
 *
 * Built from boxes and a labelled return bar rather than an SVG, so the text
 * stays at readable size when the column is cropped to 9:16.
 */
export function MethodLoop({
  steps,
  miss,
}: {
  steps: readonly { n: string; label: string; detail: string }[]
  miss: { label: string; detail: string }
}) {
  return (
    <div>
      <ol className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {steps.map((s, i) => (
          <li key={s.n} className="relative rounded-lg border border-border bg-card p-4">
            <span className="font-mono text-xs tabular-nums text-primary">{s.n}</span>
            <p className="mt-1.5 text-base font-semibold leading-snug text-foreground">{s.label}</p>
            <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{s.detail}</p>
            {i < steps.length - 1 ? (
              <span
                aria-hidden
                className="absolute -right-3 top-1/2 hidden -translate-y-1/2 text-border lg:block"
              >
                ▶
              </span>
            ) : null}
          </li>
        ))}
      </ol>

      {/* the return path: back to step four, never back to step one */}
      <div className="mt-3 flex items-stretch gap-3">
        <div aria-hidden className="hidden w-3/4 items-end lg:flex">
          <div className="h-6 w-full rounded-bl-lg border-b-2 border-l-2 border-dashed border-primary/50" />
        </div>
        <div className="flex-1 rounded-lg border border-primary/40 bg-primary/5 p-4">
          <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-primary">{miss.label}</p>
          <p data-spoken className="mt-1.5 text-sm leading-relaxed text-foreground">{miss.detail}</p>
        </div>
      </div>
    </div>
  )
}

/** The same steps in several lives. A grid on wide, stacked cards when cropped. */
export function AreaMatrix({
  rows,
  headings,
}: {
  rows: readonly { area: string; oneThing: string; rep: string; counts: string }[]
  headings: readonly [string, string, string]
}) {
  return (
    <>
      {/* wide: one column per area, so the steps read across */}
      <div className="hidden overflow-x-auto lg:block">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr>
              <th className="w-40 border-b border-border pb-3 pr-4 text-left font-mono text-[10px] uppercase tracking-[0.1em] text-muted-foreground">
                Step
              </th>
              {rows.map((r) => (
                <th
                  key={r.area}
                  className="border-b border-border px-4 pb-3 text-left text-base font-semibold text-foreground"
                >
                  {r.area}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {([["oneThing", headings[0]], ["rep", headings[1]], ["counts", headings[2]]] as const).map(
              ([key, label]) => (
                <tr key={key}>
                  <th className="border-b border-border/60 py-4 pr-4 text-left align-top font-mono text-[11px] font-normal uppercase tracking-[0.08em] text-muted-foreground">
                    {label}
                  </th>
                  {rows.map((r) => (
                    <td
                      key={r.area}
                      className="border-b border-border/60 px-4 py-4 align-top text-base leading-snug text-foreground"
                    >
                      {r[key]}
                    </td>
                  ))}
                </tr>
              ),
            )}
          </tbody>
        </table>
      </div>

      {/* cropped: one card per area */}
      <div className="grid gap-3 sm:grid-cols-2 lg:hidden">
        {rows.map((r) => (
          <div key={r.area} className="rounded-lg border border-border bg-card p-4">
            <p className="text-base font-semibold text-foreground">{r.area}</p>
            <dl className="mt-3 space-y-2">
              {([[headings[0], r.oneThing], [headings[1], r.rep], [headings[2], r.counts]] as const).map(
                ([k, v]) => (
                  <div key={k}>
                    <dt className="font-mono text-[10px] uppercase tracking-[0.08em] text-muted-foreground">{k}</dt>
                    <dd className="text-sm leading-snug text-foreground">{v}</dd>
                  </div>
                ),
              )}
            </dl>
          </div>
        ))}
      </div>
    </>
  )
}

/** A full-width block with the breathing room a scrolling shot needs. */
export function Panel({
  eyebrow,
  headline,
  body,
  children,
}: {
  eyebrow?: string
  headline: string
  body?: string
  children?: React.ReactNode
}) {
  return (
    <section className="border-t border-border py-10 md:py-14">
      {eyebrow ? (
        <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-primary">{eyebrow}</p>
      ) : null}
      <h2 className="mt-3 max-w-3xl text-2xl font-semibold leading-tight tracking-tight text-foreground text-balance md:text-4xl">
        {headline}
      </h2>
      {body ? <p className="mt-4 max-w-2xl text-base leading-relaxed text-muted-foreground md:text-lg">{body}</p> : null}
      {children ? <div className="mt-8">{children}</div> : null}
    </section>
  )
}

export function Callout({
  label,
  children,
  tone = "primary",
}: {
  label: string
  children: React.ReactNode
  tone?: "primary" | "warn"
}) {
  const ring = tone === "warn" ? "border-destructive/40 bg-destructive/5" : "border-primary/30 bg-primary/5"
  const text = tone === "warn" ? "text-destructive" : "text-primary"
  return (
    <div className={`rounded-lg border p-4 ${ring}`}>
      <p className={`font-mono text-[10px] uppercase tracking-[0.12em] ${text}`}>{label}</p>
      <div className="mt-2 text-sm text-foreground">{children}</div>
    </div>
  )
}
