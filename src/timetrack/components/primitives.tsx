"use client"

/**
 * Small presentational atoms shared by the time-tracking screens.
 * Styled with the project's theme tokens (card / border / primary / muted).
 */

import { useEffect, useRef, useState, type ReactNode } from "react"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { NO_PROJECT_COLOR } from "../config"
import { IconCheck, IconClose, IconDown } from "../icons"

// ---------------------------------------------------------------------------
// Popover / dropdown
// ---------------------------------------------------------------------------

export function useClickOutside<T extends HTMLElement>(onOutside: () => void) {
  const ref = useRef<T | null>(null)
  useEffect(() => {
    const handler = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) onOutside()
    }
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape") onOutside()
    }
    document.addEventListener("mousedown", handler)
    document.addEventListener("keydown", escape)
    return () => {
      document.removeEventListener("mousedown", handler)
      document.removeEventListener("keydown", escape)
    }
  }, [onOutside])
  return ref
}

interface DropdownProps {
  trigger: (open: boolean) => ReactNode
  children: (close: () => void) => ReactNode
  align?: "left" | "right"
  width?: string
  className?: string
  panelClassName?: string
  openOnMount?: boolean
  onOpenChange?: (open: boolean) => void
}

export function Dropdown({
  trigger,
  children,
  align = "left",
  width = "w-72",
  className,
  panelClassName,
  openOnMount = false,
  onOpenChange,
}: DropdownProps) {
  const [open, setOpen] = useState(openOnMount)
  const ref = useClickOutside<HTMLDivElement>(() => {
    if (open) {
      setOpen(false)
      onOpenChange?.(false)
    }
  })

  const toggle = () => {
    const next = !open
    setOpen(next)
    onOpenChange?.(next)
  }

  return (
    <div ref={ref} className={cn("relative", className)}>
      <button type="button" onClick={toggle} className="w-full text-left">
        {trigger(open)}
      </button>
      {open && (
        <div
          className={cn(
            "absolute z-50 mt-1 rounded-md border border-border bg-card shadow-xl",
            align === "right" ? "right-0" : "left-0",
            width,
            panelClassName,
          )}
        >
          {children(() => {
            setOpen(false)
            onOpenChange?.(false)
          })}
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Modal
// ---------------------------------------------------------------------------

export function Modal({
  title,
  onClose,
  children,
  footer,
  wide,
}: {
  title: string
  onClose: () => void
  children: ReactNode
  footer?: ReactNode
  wide?: boolean
}) {
  useEffect(() => {
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose()
    }
    document.addEventListener("keydown", escape)
    return () => document.removeEventListener("keydown", escape)
  }, [onClose])

  return (
    <div className="fixed inset-0 z-[60] flex items-start justify-center overflow-y-auto bg-black/60 p-4 sm:p-8">
      <div className={cn("w-full rounded-lg border border-border bg-card shadow-2xl", wide ? "max-w-4xl" : "max-w-lg")}>
        <div className="flex items-center justify-between border-b border-border px-5 py-3">
          <h3 className="text-sm font-semibold">{title}</h3>
          <button type="button" onClick={onClose} className="rounded p-1 text-muted-foreground hover:bg-secondary hover:text-foreground">
            <IconClose className="size-4" />
          </button>
        </div>
        <div className="px-5 py-4">{children}</div>
        {footer && <div className="flex justify-end gap-2 border-t border-border px-5 py-3">{footer}</div>}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Form helpers
// ---------------------------------------------------------------------------

export function Field({ label, hint, children, className }: { label: string; hint?: string; children: ReactNode; className?: string }) {
  return (
    <label className={cn("block space-y-1", className)}>
      <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</span>
      {children}
      {hint && <span className="block text-xs text-muted-foreground">{hint}</span>}
    </label>
  )
}

export function Segmented<T extends string | number>({
  value,
  options,
  onChange,
  size = "default",
}: {
  value: T
  options: { id: T; label: string }[]
  onChange: (value: T) => void
  size?: "default" | "sm"
}) {
  return (
    <div className="inline-flex rounded-md border border-border bg-secondary/40 p-0.5">
      {options.map((option) => (
        <button
          key={String(option.id)}
          type="button"
          onClick={() => onChange(option.id)}
          className={cn(
            "rounded px-3 font-medium transition-colors",
            size === "sm" ? "h-7 text-xs" : "h-8 text-sm",
            value === option.id ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground",
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  )
}

export function ToggleRow({
  label,
  hint,
  checked,
  onChange,
}: {
  label: string
  hint?: string
  checked: boolean
  onChange: (checked: boolean) => void
}) {
  return (
    <div className="flex items-start justify-between gap-4 py-2">
      <div className="min-w-0">
        <p className="text-sm">{label}</p>
        {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        onClick={() => onChange(!checked)}
        className={cn(
          "relative mt-0.5 h-5 w-9 shrink-0 rounded-full transition-colors",
          checked ? "bg-primary" : "bg-border",
        )}
      >
        <span
          className={cn(
            "absolute top-0.5 size-4 rounded-full bg-background transition-transform",
            checked ? "translate-x-[18px]" : "translate-x-0.5",
          )}
        />
      </button>
    </div>
  )
}

export function CheckOption({
  label,
  checked,
  onClick,
  color,
  meta,
}: {
  label: string
  checked: boolean
  onClick: () => void
  color?: string | null
  meta?: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm hover:bg-secondary/60"
    >
      <span className={cn("flex size-4 shrink-0 items-center justify-center rounded border", checked ? "border-primary bg-primary text-primary-foreground" : "border-border")}>
        {checked && <IconCheck className="size-3" />}
      </span>
      {color !== undefined && <ColorDot color={color} />}
      <span className="flex-1 truncate">{label}</span>
      {meta && <span className="text-xs text-muted-foreground">{meta}</span>}
    </button>
  )
}

// ---------------------------------------------------------------------------
// Visual bits
// ---------------------------------------------------------------------------

export function ColorDot({ color, size = 8 }: { color?: string | null; size?: number }) {
  return (
    <span
      className="inline-block shrink-0 rounded-full"
      style={{ backgroundColor: color ?? NO_PROJECT_COLOR, width: size, height: size }}
    />
  )
}

export function ProgressBar({
  value,
  max,
  color,
  height = 6,
}: {
  value: number
  max: number
  color?: string
  height?: number
}) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0
  const over = max > 0 && value > max
  return (
    <div className="w-full overflow-hidden rounded-full bg-secondary" style={{ height }}>
      <div
        className="h-full rounded-full transition-all"
        style={{ width: `${pct}%`, backgroundColor: over ? "var(--destructive)" : color ?? "var(--primary)" }}
      />
    </div>
  )
}

export function EmptyState({ title, hint, action }: { title: string; hint?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border py-12 text-center">
      <p className="text-sm font-medium">{title}</p>
      {hint && <p className="max-w-md text-xs text-muted-foreground">{hint}</p>}
      {action}
    </div>
  )
}

export function SectionCard({
  title,
  description,
  actions,
  children,
  className,
}: {
  title?: string
  description?: string
  actions?: ReactNode
  children: ReactNode
  className?: string
}) {
  return (
    <section className={cn("rounded-lg border border-border bg-card", className)}>
      {(title || actions) && (
        <header className="flex items-start justify-between gap-3 border-b border-border px-4 py-3">
          <div>
            {title && <h3 className="text-sm font-semibold">{title}</h3>}
            {description && <p className="text-xs text-muted-foreground">{description}</p>}
          </div>
          {actions}
        </header>
      )}
      <div className="p-4">{children}</div>
    </section>
  )
}

export function StatTile({
  label,
  value,
  sub,
  tone = "default",
}: {
  label: string
  value: string
  sub?: string
  tone?: "default" | "positive" | "negative"
}) {
  return (
    <div className="rounded-lg border border-border bg-card px-4 py-3">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <p
        className={cn(
          "mt-1 text-xl font-semibold tabular-nums",
          tone === "positive" && "text-[#2da608]",
          tone === "negative" && "text-destructive",
        )}
      >
        {value}
      </p>
      {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Charts (inline SVG — no external chart dependency)
// ---------------------------------------------------------------------------

export interface BarDatum {
  key: string
  label: string
  total: number
  segments: { key: string; label: string; color: string | null; value: number }[]
}

export function StackedBarChart({
  data,
  formatValue,
  height = 180,
}: {
  data: BarDatum[]
  formatValue: (value: number) => string
  height?: number
}) {
  const max = Math.max(1, ...data.map((d) => d.total))
  const [hover, setHover] = useState<string | null>(null)

  return (
    <div className="w-full overflow-x-auto">
      <div className="flex min-w-full items-end gap-1" style={{ height }}>
        {data.map((datum) => {
          // Reserve room for the value label above and the period label below
          const barHeight = (datum.total / max) * (height - 48)
          const segments = datum.segments.length > 0 ? datum.segments : [{ key: "all", label: datum.label, color: null, value: datum.total }]
          return (
            <div
              key={datum.key}
              className="group flex min-w-[18px] flex-1 flex-col items-center justify-end gap-1"
              onMouseEnter={() => setHover(datum.key)}
              onMouseLeave={() => setHover(null)}
            >
              <span className={cn("text-[10px] tabular-nums text-muted-foreground", datum.total === 0 && "opacity-0")}>
                {formatValue(datum.total)}
              </span>
              <div className="relative flex w-full flex-col justify-end" style={{ height: barHeight }}>
                {segments.map((segment) => (
                  <div
                    key={segment.key}
                    title={`${segment.label}: ${formatValue(segment.value)}`}
                    style={{
                      height: `${datum.total > 0 ? (segment.value / datum.total) * 100 : 0}%`,
                      backgroundColor: segment.color ?? "var(--primary)",
                      opacity: hover && hover !== datum.key ? 0.6 : 1,
                    }}
                    className="w-full first:rounded-t"
                  />
                ))}
                {datum.total === 0 && <div className="h-[2px] w-full rounded bg-border" />}
              </div>
              <span className="w-full truncate text-center text-[10px] text-muted-foreground">{datum.label}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export function DonutChart({
  slices,
  formatValue,
  size = 180,
}: {
  slices: { key: string; label: string; color: string | null; value: number }[]
  formatValue: (value: number) => string
  size?: number
}) {
  const total = slices.reduce((sum, s) => sum + s.value, 0)
  const radius = size / 2 - 10
  const circumference = 2 * Math.PI * radius
  let offset = 0

  if (total === 0) {
    return <p className="py-8 text-center text-xs text-muted-foreground">No tracked time in this range</p>
  }

  return (
    <div className="flex flex-wrap items-center gap-6">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="shrink-0">
        <g transform={`rotate(-90 ${size / 2} ${size / 2})`}>
          {slices.map((slice) => {
            const fraction = slice.value / total
            const dash = fraction * circumference
            const element = (
              <circle
                key={slice.key}
                cx={size / 2}
                cy={size / 2}
                r={radius}
                fill="none"
                stroke={slice.color ?? "var(--primary)"}
                strokeWidth={16}
                strokeDasharray={`${dash} ${circumference - dash}`}
                strokeDashoffset={-offset}
              />
            )
            offset += dash
            return element
          })}
        </g>
        <text x="50%" y="50%" textAnchor="middle" dominantBaseline="middle" className="fill-foreground text-sm font-semibold">
          {formatValue(total)}
        </text>
      </svg>
      <ul className="min-w-[160px] flex-1 space-y-1">
        {slices.slice(0, 8).map((slice) => (
          <li key={slice.key} className="flex items-center gap-2 text-xs">
            <ColorDot color={slice.color} />
            <span className="flex-1 truncate">{slice.label}</span>
            <span className="tabular-nums text-muted-foreground">{formatValue(slice.value)}</span>
            <span className="w-10 text-right tabular-nums text-muted-foreground">
              {Math.round((slice.value / total) * 100)}%
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}

/** Cumulative line chart with a dashed forecast tail (project dashboard) */
export function BurnUpChart({
  actual,
  forecast,
  target,
  formatValue,
  height = 200,
}: {
  actual: { date: string; seconds: number }[]
  forecast: { date: string; seconds: number }[]
  target: number | null
  formatValue: (value: number) => string
  height?: number
}) {
  // Measure the container so the SVG draws in real pixels — a stretched viewBox
  // would scale the axis labels along with the geometry
  const containerRef = useRef<HTMLDivElement | null>(null)
  const [width, setWidth] = useState(640)
  useEffect(() => {
    const element = containerRef.current
    if (!element || typeof ResizeObserver === "undefined") return
    const observer = new ResizeObserver((entries) => {
      const measured = entries[0]?.contentRect.width ?? 0
      if (measured > 0) setWidth(measured)
    })
    observer.observe(element)
    return () => observer.disconnect()
  }, [])

  const points = [...actual, ...forecast]
  if (points.length === 0) return <p className="py-8 text-center text-xs text-muted-foreground">Nothing tracked yet</p>

  const max = Math.max(target ?? 0, ...points.map((p) => p.seconds), 1)
  const xStep = points.length > 1 ? width / (points.length - 1) : width
  const toY = (value: number) => height - 24 - (value / max) * (height - 40)
  const path = (list: { seconds: number }[], startIndex: number) =>
    list.map((p, i) => `${i === 0 ? "M" : "L"} ${(startIndex + i) * xStep} ${toY(p.seconds)}`).join(" ")

  const targetY = target ? toY(target) : null

  return (
    <div ref={containerRef} className="w-full">
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Burn-up chart">
      {targetY !== null && (
        <>
          <line x1={0} x2={width} y1={targetY} y2={targetY} stroke="var(--destructive)" strokeWidth={1} strokeDasharray="4 4" />
          <text x={4} y={targetY - 4} className="fill-muted-foreground text-[10px]">
            estimate {formatValue(target!)}
          </text>
        </>
      )}
      <path d={path(actual, 0)} fill="none" stroke="var(--primary)" strokeWidth={2} />
      {forecast.length > 0 && actual.length > 0 && (
        <path
          d={`M ${(actual.length - 1) * xStep} ${toY(actual.at(-1)!.seconds)} ${forecast
            .map((p, i) => `L ${(actual.length + i) * xStep} ${toY(p.seconds)}`)
            .join(" ")}`}
          fill="none"
          stroke="var(--primary)"
          strokeWidth={2}
          strokeDasharray="5 4"
          opacity={0.6}
        />
      )}
      <line x1={0} x2={width} y1={height - 24} y2={height - 24} stroke="var(--border)" strokeWidth={1} />
      <text x={0} y={height - 8} className="fill-muted-foreground text-[10px]">
        {points[0]?.date}
      </text>
      <text x={width} y={height - 8} textAnchor="end" className="fill-muted-foreground text-[10px]">
        {points.at(-1)?.date}
      </text>
    </svg>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Misc
// ---------------------------------------------------------------------------

export function ConfirmButton({
  label,
  confirmLabel = "Confirm",
  onConfirm,
  variant = "ghost",
  size = "sm",
  children,
}: {
  label?: string
  confirmLabel?: string
  onConfirm: () => void
  variant?: "ghost" | "outline" | "destructive"
  size?: "sm" | "icon-sm"
  children?: ReactNode
}) {
  const [armed, setArmed] = useState(false)
  useEffect(() => {
    if (!armed) return
    const timer = window.setTimeout(() => setArmed(false), 4000)
    return () => window.clearTimeout(timer)
  }, [armed])

  return (
    <Button
      variant={armed ? "destructive" : variant}
      size={size}
      onClick={() => {
        if (armed) {
          onConfirm()
          setArmed(false)
        } else {
          setArmed(true)
        }
      }}
    >
      {armed ? confirmLabel : children ?? label}
    </Button>
  )
}

export function SelectMenu<T extends string | number>({
  value,
  options,
  onChange,
  className,
  placeholder = "Select…",
}: {
  value: T | null
  options: { id: T; label: string }[]
  onChange: (value: T) => void
  className?: string
  placeholder?: string
}) {
  const current = options.find((o) => o.id === value)
  return (
    <Dropdown
      className={className}
      width="w-full min-w-[10rem]"
      trigger={() => (
        <span className="flex h-9 items-center justify-between gap-2 rounded-md border border-border bg-transparent px-3 text-sm">
          <span className={cn("truncate", !current && "text-muted-foreground")}>{current?.label ?? placeholder}</span>
          <IconDown className="size-3 shrink-0 text-muted-foreground" />
        </span>
      )}
    >
      {(close) => (
        <div className="max-h-64 overflow-y-auto py-1">
          {options.map((option) => (
            <button
              key={String(option.id)}
              type="button"
              onClick={() => {
                onChange(option.id)
                close()
              }}
              className={cn(
                "flex w-full items-center justify-between px-3 py-1.5 text-left text-sm hover:bg-secondary/60",
                option.id === value && "text-primary",
              )}
            >
              <span className="truncate">{option.label}</span>
              {option.id === value && <IconCheck className="size-3" />}
            </button>
          ))}
        </div>
      )}
    </Dropdown>
  )
}
