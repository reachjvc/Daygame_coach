/**
 * The shape of one lift's run, as a glyph rather than a chart.
 *
 * WHY NOT A CHART. The job here is change-over-time for a SINGLE series, read at
 * a glance inside a list row that already carries the numbers — start, current
 * and the difference are all printed beside it. Axes, a legend and a value scale
 * would repeat what the row says and turn six list items into six figures.
 *
 * So: one series, no axes, no legend (with one series the row's own label names
 * it), no per-point labels. `currentColor` rather than a palette hue, because a
 * single series has no identity to encode — it inherits the row's ink and is
 * therefore correct in light and dark without a second set of values to keep in
 * step.
 *
 * The hover layer is a native `<title>`, not a JS tooltip: the numbers are
 * already on screen, so the only thing left to say is the span of time, and a
 * `<title>` says it to a screen reader too.
 */

import type { LoadPoint } from "../types"

interface Props {
  /** Dated working weights, oldest first. */
  points: LoadPoint[]
  /** Read out to assistive tech and on hover. */
  label: string
  width?: number
  height?: number
}

export function Sparkline({ points, label, width = 72, height = 20 }: Props) {
  // Two points make a line; one makes nothing worth drawing.
  if (points.length < 2) return null

  const weights = points.map((p) => p.weight)
  const min = Math.min(...weights)
  const max = Math.max(...weights)
  const span = max - min
  const pad = 2 // keeps the 2px stroke inside the box at the extremes

  /**
   * X IS TIME, NOT SESSION NUMBER.
   *
   * Spacing points evenly drew a three-month layoff exactly like three
   * consecutive days — so the one thing this line exists to show, the shape of a
   * year, was the one thing it misrepresented. A gap now looks like a gap.
   */
  const t = points.map((p) => new Date(p.at).getTime())
  const t0 = t[0]
  const tSpan = t[t.length - 1] - t0
  const x = (i: number) =>
    // Everything on one day (or clocks disagreeing) would divide by zero and
    // put NaN in the path, which renders nothing at all. Fall back to even
    // spacing, which is exactly right when no time has passed.
    (tSpan > 0 ? (t[i] - t0) / tSpan : i / (points.length - 1)) * (width - pad * 2) + pad
  /**
   * A flat run sits on the middle line, not the floor.
   *
   * With `span === 0` the naive scale divides by zero; drawing it at the bottom
   * would also read as "collapsed to nothing" when what happened is that the
   * weight never moved — which is a stall, and a real thing to be able to see.
   */
  const y = (v: number) =>
    span === 0 ? height / 2 : height - pad - ((v - min) / span) * (height - pad * 2)

  const d = points.map((p, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(p.weight).toFixed(1)}`).join(" ")

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      role="img"
      aria-label={label}
      className="shrink-0 overflow-visible text-muted-foreground/70"
      data-testid="sparkline"
    >
      <title>{label}</title>
      <path d={d} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      {/* Where it is now. A marker on every point would be the "number on every
          point" anti-pattern; one on the last says which end is today. */}
      <circle cx={x(points.length - 1)} cy={y(points[points.length - 1].weight)} r={2.5} fill="currentColor" />
    </svg>
  )
}
