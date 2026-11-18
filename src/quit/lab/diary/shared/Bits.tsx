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
 * Ring chart. Slices run clockwise from the top, in the order given. A slice carries its words
 * only where they fit; every slice is listed with its percent in a legend under the ring.
 */
export function Donut({ slices, centre, testId, onPick, picked, innerRatio = 0.5 }: { slices: DonutSlice[]; centre?: React.ReactNode; testId?: string; onPick?: (key: string) => void; picked?: string | null; innerRatio?: number }) {
  const r1 = 140
  const r0 = r1 * innerRatio
  const total = slices.reduce((a, s) => a + s.count, 0)
  const arcs = ringArcs(
    slices.map((s) => s.count),
    r0,
    r1,
  )
  const rl = (r0 + r1) / 2
  return (
    <div className="mx-auto w-full max-w-[380px]" data-testid={testId} data-total={total}>
      <div className="relative">
        <svg viewBox="-150 -150 300 300" className="w-full" role="img" aria-hidden="false">
          {total === 0 && <circle r={rl} fill="none" strokeWidth={r1 - r0} className="stroke-border" />}
          {arcs.map((a) => {
            const s = slices[a.index]
            const arc = (s.count / total) * Math.PI * 2 * rl
            const showValue = arc > 30
            const showName = arc > s.label.length * 6.4 + 10
            const x = rl * Math.cos(a.mid)
            const y = rl * Math.sin(a.mid)
            return (
              <g key={s.key} data-testid={testId ? `${testId}-slice-${s.key}` : undefined} data-count={s.count} data-value={s.value} onClick={onPick ? () => onPick(s.key) : undefined} opacity={picked && picked !== s.key ? 0.45 : 1} style={onPick ? { cursor: "pointer" } : undefined}>
                <path d={a.path} fill={s.color} fillRule="evenodd" stroke="#1f1f1f" strokeWidth={1.5} />
                {showValue && (
                  <text x={x} y={showName ? y - 3 : y + 4} textAnchor="middle" fontSize={12} fontWeight={600} fill="#161616">
                    {s.value}
                  </text>
                )}
                {showValue && showName && (
                  <text x={x} y={y + 10} textAnchor="middle" fontSize={11} fill="#161616">
                    {s.label}
                  </text>
                )}
              </g>
            )
          })}
        </svg>
        {centre && <div className="pointer-events-none absolute inset-0 flex items-center justify-center px-[27%] text-center text-sm">{centre}</div>}
      </div>
      {slices.length > 0 && (
        <ul data-testid={testId ? `${testId}-legend` : undefined} className="mt-3 grid grid-cols-2 gap-x-3 gap-y-1 text-sm">
          {slices.map((s) => (
            <li key={s.key} className="flex min-h-8 items-center gap-2">
              <span aria-hidden="true" className="size-3 shrink-0 rounded-sm" style={{ background: s.color }} />
              <span className="min-w-0 flex-1 truncate">{s.label}</span>
              <span className="shrink-0 font-semibold">{s.value}</span>
            </li>
          ))}
        </ul>
      )}
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
