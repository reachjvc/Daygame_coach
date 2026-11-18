"use client"

import { useState } from "react"
import { Placeholder } from "../../progress/shared/Bits"
import { ringArcs, smoothPath } from "./logic"

export interface DonutSlice {
  key: string
  label: string
  count: number
  color: string
  /** text printed on the slice, already formatted */
  value: string
}

/**
 * Ring chart. Slices run clockwise from the top, in the order given. Labels sit on the slice;
 * small slices put theirs just outside so they never collide.
 */
export function Donut({ slices, centre, testId, onPick, picked, innerRatio = 0.5 }: { slices: DonutSlice[]; centre?: React.ReactNode; testId?: string; onPick?: (key: string) => void; picked?: string | null; innerRatio?: number }) {
  const r1 = 125
  const r0 = r1 * innerRatio
  const total = slices.reduce((a, s) => a + s.count, 0)
  const arcs = ringArcs(
    slices.map((s) => s.count),
    r0,
    r1,
  )
  // labels: on the slice when it is big enough, else just outside; outside labels on one side keep 26 units apart
  interface Place {
    x: number
    y: number
    lx: number
    anchor: "start" | "middle" | "end"
  }
  const place = new Map<number, Place>()
  const outside: { index: number; x: number; y: number; right: boolean }[] = []
  for (const a of arcs) {
    const small = slices[a.index].count / total < 0.085
    if (!small) {
      const rl = (r0 + r1) / 2
      place.set(a.index, { x: rl * Math.cos(a.mid), y: rl * Math.sin(a.mid), lx: 0, anchor: "middle" })
    } else {
      const x = (r1 + 22) * Math.cos(a.mid)
      outside.push({ index: a.index, x, y: (r1 + 22) * Math.sin(a.mid), right: x >= 0 })
    }
  }
  for (const side of [true, false]) {
    const row = outside.filter((o) => o.right === side).sort((p, q) => p.y - q.y)
    row.forEach((o, i) => {
      if (i > 0) o.y = Math.max(o.y, row[i - 1].y + 27)
      place.set(o.index, { x: o.x, y: o.y, lx: o.x + (side ? -3 : 3), anchor: side ? "start" : "end" })
    })
  }
  return (
    <div className="relative mx-auto w-full max-w-[420px]" data-testid={testId} data-total={total}>
      <svg viewBox="-235 -185 470 370" className="w-full" role="img" aria-hidden="false">
        {total === 0 && <circle r={(r0 + r1) / 2} fill="none" strokeWidth={r1 - r0} className="stroke-border" />}
        {arcs.map((a) => {
          const s = slices[a.index]
          const small = s.count / total < 0.085
          const p = place.get(a.index)!
          return (
            <g key={s.key} data-testid={testId ? `${testId}-slice-${s.key}` : undefined} data-count={s.count} data-value={s.value} onClick={onPick ? () => onPick(s.key) : undefined} opacity={picked && picked !== s.key ? 0.45 : 1} style={onPick ? { cursor: "pointer" } : undefined}>
              <path d={a.path} fill={s.color} fillRule="evenodd" stroke="#1f1f1f" strokeWidth={1.5} />
              {small && <line x1={(r1 - 2) * Math.cos(a.mid)} y1={(r1 - 2) * Math.sin(a.mid)} x2={p.lx} y2={p.y - 4} className="stroke-muted-foreground" strokeWidth={0.8} />}
              <text x={p.x} y={p.y - 3} textAnchor={p.anchor} fontSize={12} className={small ? "fill-foreground" : ""} fill={small ? undefined : "#161616"}>
                {s.value}
              </text>
              <text x={p.x} y={p.y + 10} textAnchor={p.anchor} fontSize={11} className={small ? "fill-muted-foreground" : ""} fill={small ? undefined : "#161616"}>
                {s.label}
              </text>
            </g>
          )
        })}
      </svg>
      {centre && <div className="pointer-events-none absolute inset-0 flex items-center justify-center px-24 text-center text-sm">{centre}</div>}
    </div>
  )
}

export interface LinePoint {
  label: string
  value: number
}

/** Line chart on a grid; markers are rings; `valueText` prints a label above each marker. */
export function LineChart({
  points,
  yMin,
  yMax,
  yStep = 1,
  smooth,
  grid,
  valueText,
  testId,
  legend,
}: {
  points: LinePoint[]
  yMin: number
  yMax: number
  yStep?: number
  smooth?: boolean
  grid?: boolean
  valueText?: (v: number) => string
  testId?: string
  legend?: string
}) {
  const W = 360
  const H = 280
  const L = 26
  const R = 14
  const T = 22
  const B = 34
  const span = Math.max(1e-6, yMax - yMin)
  const xs = (i: number) => (points.length <= 1 ? (L + W - R) / 2 : L + ((W - L - R) * i) / (points.length - 1))
  const ys = (v: number) => T + (H - T - B) * (1 - (v - yMin) / span)
  const pts = points.map((p, i) => ({ x: xs(i), y: ys(p.value) }))
  const ticks: number[] = []
  for (let v = yMin; v <= yMax + 1e-9; v += yStep) ticks.push(v)
  const every = Math.max(1, Math.ceil(points.length / 7))
  const d = smooth ? smoothPath(pts) : pts.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(" ")
  return (
    <div data-testid={testId} data-points={points.map((p) => p.value).join(",")}>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-hidden="false">
        {ticks.map((t) => (
          <g key={t}>
            <line x1={L} x2={W - R} y1={ys(t)} y2={ys(t)} className="stroke-border" strokeWidth={grid ? 1 : 0.5} />
            <text x={L - 6} y={ys(t) + 4} textAnchor="end" fontSize={10} className="fill-muted-foreground">
              {t}
            </text>
          </g>
        ))}
        {grid && points.map((_, i) => <line key={i} x1={xs(i)} x2={xs(i)} y1={T} y2={H - B} className="stroke-border" strokeWidth={0.5} />)}
        <path d={d} fill="none" className="stroke-primary" strokeWidth={2} />
        {pts.map((p, i) => (
          <g key={i}>
            <circle cx={p.x} cy={p.y} r={5} className="fill-card stroke-primary" strokeWidth={2.5} />
            {valueText && (
              <text x={p.x} y={p.y - 10} textAnchor="middle" fontSize={points.length > 9 ? 7 : 9} className="fill-foreground">
                {valueText(points[i].value)}
              </text>
            )}
            {i % every === 0 && (
              <text x={p.x} y={H - B + 16} textAnchor="middle" fontSize={10} className="fill-muted-foreground">
                {points[i].label}
              </text>
            )}
          </g>
        ))}
      </svg>
      {legend && (
        <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
          <span aria-hidden="true" className="size-2.5 bg-primary" />
          {legend}
        </p>
      )}
    </div>
  )
}

/**
 * A dropdown that shows only the options seen in public material; any other option is a dashed
 * "not seen" tile in the opened list.
 */
export function Dropdown({ label, options, value, onChange, testId, moreUnseen }: { label: string; options: readonly string[]; value: number; onChange: (i: number) => void; testId: string; moreUnseen?: boolean }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="relative min-w-0">
      <button type="button" data-testid={testId} aria-expanded={open} aria-label={label} onClick={() => setOpen((o) => !o)} className="inline-flex min-h-11 w-full min-w-0 items-center justify-between gap-2 rounded-lg border border-border bg-card px-3 text-sm">
        <span className="truncate">{options[value]}</span>
        <span aria-hidden="true">{open ? "˄" : "˅"}</span>
      </button>
      {open && (
        <div role="listbox" data-testid={`${testId}-list`} className="absolute right-0 z-20 mt-1 flex w-56 max-w-[80vw] flex-col gap-1 rounded-lg border border-border bg-background p-1 shadow-lg">
          {options.map((o, i) => (
            <button
              key={o}
              type="button"
              role="option"
              aria-selected={i === value}
              data-testid={`${testId}-opt-${i}`}
              onClick={() => {
                onChange(i)
                setOpen(false)
              }}
              className={`min-h-11 rounded-md px-3 text-left text-sm ${i === value ? "bg-primary/20" : ""}`}
            >
              {o}
            </button>
          ))}
          {moreUnseen && <Placeholder />}
        </div>
      )}
    </div>
  )
}
