"use client"

import { useEffect, useRef, useState } from "react"
import { eText } from "./text"
import { savedOver } from "./logic"

/** The shown number glides to its new value in about half a second. */
export function useCountUp(target: number, ms = 500): number {
  const [value, setValue] = useState(target)
  const from = useRef(target)
  useEffect(() => {
    const a = from.current
    const t0 = performance.now()
    let raf = 0
    const tick = (t: number) => {
      const p = Math.min(1, (t - t0) / ms)
      const val = a + (target - a) * p
      from.current = val
      setValue(val)
      if (p < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [target, ms])
  return value
}

/** A flame character holding a sign; it raises its arms while the numbers are being edited. */
export function Flame({ figure, cheer }: { figure: string; cheer: boolean }) {
  return (
    <svg viewBox="0 0 120 130" className="h-28 w-28" data-testid="e-flame" data-cheer={cheer ? 1 : 0} role="img" aria-label={eText.signLabel}>
      <rect x="22" y="2" width="76" height="26" rx="5" className="fill-card stroke-border" />
      <text x="60" y="20" textAnchor="middle" fontSize="13" fontWeight="700" className="fill-foreground" data-testid="e-flame-sign">
        {figure}
      </text>
      <line x1="60" y1="28" x2="60" y2="46" className="stroke-border" strokeWidth="3" />
      <path d="M60 40 C88 62 96 84 82 106 C74 120 46 120 38 106 C24 84 34 62 60 40 Z" className="fill-primary" />
      <circle cx="50" cy="84" r="4" className="fill-background" />
      <circle cx="70" cy="84" r="4" className="fill-background" />
      <path d="M52 96 Q60 103 68 96" fill="none" strokeWidth="3" strokeLinecap="round" className="stroke-background" />
      <g strokeWidth="5" strokeLinecap="round" className="stroke-primary" fill="none" style={{ transition: "all 0.25s" }}>
        {cheer ? (
          <>
            <path d="M40 88 L26 62" />
            <path d="M80 88 L94 62" />
          </>
        ) : (
          <>
            <path d="M40 90 L28 100" />
            <path d="M80 90 L92 100" />
          </>
        )}
      </g>
    </svg>
  )
}

/** A 270 degree ring: grey track, orange fill, open at the bottom. */
export function Arc270({ value, size = 220, stroke = 16, children, testId }: { value: number; size?: number; stroke?: number; children?: React.ReactNode; testId?: string }) {
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  const v = Math.min(1, Math.max(0, value))
  const common = { cx: size / 2, cy: size / 2, r, fill: "none", strokeWidth: stroke, strokeLinecap: "round" as const, transform: `rotate(135 ${size / 2} ${size / 2})` }
  return (
    <div className="relative mx-auto" style={{ width: size, height: size }} data-testid={testId} data-value={v.toFixed(3)}>
      <svg width={size} height={size} aria-hidden="true">
        <circle {...common} className="stroke-border" strokeDasharray={`${0.75 * c} ${c}`} />
        {v > 0 && <circle {...common} className="stroke-primary" strokeDasharray={`${0.75 * c * v} ${c}`} style={{ transition: "stroke-dasharray 0.8s ease" }} />}
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">{children}</div>
    </div>
  )
}

/** 20-year line chart: filled area under the line, a dot at 10 years, ticks every 5 years. */
export function SavingsChart({ yearly, rate }: { yearly: number; rate: number }) {
  const W = 320
  const H = 150
  const L = 10
  const B = 22
  const total = savedOver(yearly, 20, rate)
  const max = Math.max(1, total)
  const x = (t: number) => L + ((W - 2 * L) * t) / 20
  const y = (val: number) => 8 + (H - B - 8) * (1 - val / max)
  const pts = Array.from({ length: 21 }, (_, t) => ({ t, v: savedOver(yearly, t, rate) }))
  const line = pts.map((p, i) => `${i === 0 ? "M" : "L"}${x(p.t).toFixed(1)} ${y(p.v).toFixed(1)}`).join(" ")
  const area = `${line} L${x(20)} ${H - B} L${x(0)} ${H - B} Z`
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" data-testid="e-chart" data-rate={rate} data-total={Math.round(total)} role="img" aria-label={eText.chartTitle}>
      <path d={area} className="fill-primary" opacity={0.25} />
      <path d={line} fill="none" strokeWidth={2.5} className="stroke-primary" />
      <circle cx={x(10)} cy={y(savedOver(yearly, 10, rate))} r={5} className="fill-card stroke-primary" strokeWidth={2.5} />
      <line x1={L} x2={W - L} y1={H - B} y2={H - B} className="stroke-border" />
      {[0, 5, 10, 15, 20].map((t, i) => (
        <text key={t} x={x(t)} y={H - 6} textAnchor="middle" fontSize={10} className="fill-muted-foreground">
          {eText.chartYears[i]}
        </text>
      ))}
    </svg>
  )
}
