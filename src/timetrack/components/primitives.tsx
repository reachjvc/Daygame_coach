"use client"

/**
 * Small presentational atoms shared by the time-tracking screens.
 * Styled with the project's theme tokens (card / border / primary / muted).
 */

import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState, type ReactNode, type RefObject } from "react"
import { createPortal } from "react-dom"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { NO_PROJECT_COLOR } from "../config"
import { IconCheck, IconClose } from "../icons"

/**
 * Icon-only controls need a 44px target on phones; 32px is fine with a mouse.
 * Apply to every button whose content is just an icon.
 */
export const touchTarget = "flex size-11 shrink-0 items-center justify-center sm:size-8"

/** Menu/option rows: comfortable on a phone, compact on a pointer device */
export const touchRow = "min-h-11 sm:min-h-0 sm:py-1.5"

// ---------------------------------------------------------------------------
// Popover / dropdown
// ---------------------------------------------------------------------------

/**
 * `extra` is for a panel that lives outside the wrapper in the DOM — a
 * portalled popover. Without it, clicking inside your own panel counts as a
 * click outside and closes it.
 */
export function useClickOutside<T extends HTMLElement>(
  onOutside: () => void,
  extra?: RefObject<HTMLElement | null>,
) {
  const ref = useRef<T | null>(null)
  // kept in a ref so an inline callback does not re-register the listener
  const latest = useRef(onOutside)
  latest.current = onOutside
  useEffect(() => {
    const handler = (event: MouseEvent) => {
      const target = event.target as Node
      if (!ref.current) return
      if (ref.current.contains(target)) return
      if (extra?.current?.contains(target)) return
      latest.current()
    }
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape") latest.current()
    }
    document.addEventListener("mousedown", handler)
    document.addEventListener("keydown", escape)
    return () => {
      document.removeEventListener("mousedown", handler)
      document.removeEventListener("keydown", escape)
    }
  }, [extra])
  return ref
}

/**
 * Popover panels are rendered into <body> and positioned with `fixed`, because
 * almost every card that holds a trigger clips its own overflow: the day card
 * in the entry list, the calendar grid, the report tables, the modal body, the
 * horizontal scrollers. An `absolute` panel inside one of those is cut off at
 * the card edge — which is what hid the tag list whenever the picker was opened
 * on a row near the bottom of its day.
 */
const PANEL_GAP = 4
const PANEL_MARGIN = 12
/** Less room than this below the trigger and the panel opens upwards instead */
const PANEL_MIN_SPACE = 160

/**
 * How much of the bottom of the screen is already spoken for.
 *
 * A phone shows a fixed navigation bar across the bottom. A panel measured only
 * against the window ran underneath it, and the last items — Delete, on the
 * entry menu — were drawn under the bar, so tapping one tapped the bar instead.
 * Nothing looked broken; the tap just went somewhere else.
 *
 * The shell publishes the height it occupies as a CSS variable, and every panel
 * measures against that instead of the raw window.
 */
function bottomInset(): number {
  if (typeof document === "undefined") return 0
  const raw = getComputedStyle(document.documentElement).getPropertyValue("--panel-bottom-inset")
  const value = Number.parseFloat(raw)
  return Number.isFinite(value) ? value : 0
}

export type PanelPosition = {
  left: number
  top?: number
  bottom?: number
  maxHeight: number
  /** so a panel asked to match its trigger can be sized without measuring twice */
  anchorWidth: number
}

function samePosition(a: PanelPosition | null, b: PanelPosition) {
  return (
    !!a &&
    a.left === b.left &&
    a.top === b.top &&
    a.bottom === b.bottom &&
    a.maxHeight === b.maxHeight &&
    a.anchorWidth === b.anchorWidth
  )
}

/**
 * Viewport coordinates for a panel anchored under `anchorRef`, recomputed while
 * it is open so scrolling any ancestor keeps it attached to its trigger.
 * `null` until the panel has been measured once — pass `open` as false until
 * the panel is actually in the DOM, or there is nothing to measure against.
 */
export function usePanelPosition(
  anchorRef: RefObject<HTMLElement | null>,
  panelRef: RefObject<HTMLElement | null>,
  open: boolean,
  {
    align = "left",
    matchAnchorWidth = false,
    onDetached,
  }: {
    align?: "left" | "right"
    /** the panel is as wide as its trigger (a select), not its own content */
    matchAnchorWidth?: boolean
    /** the trigger has scrolled out of sight, so the panel is pointing at nothing */
    onDetached?: () => void
  } = {},
): PanelPosition | null {
  const [position, setPosition] = useState<PanelPosition | null>(null)
  const detachedRef = useRef(onDetached)
  detachedRef.current = onDetached

  const place = useCallback(() => {
    const anchor = anchorRef.current
    const panel = panelRef.current
    if (!anchor || !panel) return
    const rect = anchor.getBoundingClientRect()
    // clientWidth/Height, not innerWidth/Height: those include the scrollbar,
    // and a right-aligned panel would sit partly underneath it
    const viewportWidth = document.documentElement.clientWidth
    // the usable bottom, not the window's: fixed chrome sits below it
    const viewportHeight = document.documentElement.clientHeight - bottomInset()

    const width = matchAnchorWidth ? rect.width : panel.getBoundingClientRect().width
    const wanted = align === "right" ? rect.right - width : rect.left
    const furthestLeft = Math.max(PANEL_MARGIN, viewportWidth - PANEL_MARGIN - width)
    const left = Math.min(Math.max(PANEL_MARGIN, wanted), furthestLeft)

    const below = viewportHeight - rect.bottom - PANEL_GAP - PANEL_MARGIN
    const above = rect.top - PANEL_GAP - PANEL_MARGIN
    const base = { left, anchorWidth: rect.width }

    // Prefer below; flip up when below is too cramped. When neither side has
    // room — a short window, a trigger in the middle of it — the panel covers
    // the trigger rather than running off the screen, where nothing could
    // scroll it back: a `fixed` panel is outside every scroll container.
    const next: PanelPosition =
      below >= PANEL_MIN_SPACE
        ? { ...base, top: rect.bottom + PANEL_GAP, maxHeight: below }
        : above >= PANEL_MIN_SPACE
          ? {
              ...base,
              bottom: document.documentElement.clientHeight - rect.top + PANEL_GAP,
              maxHeight: above,
            }
          : { ...base, top: PANEL_MARGIN, maxHeight: Math.max(0, viewportHeight - PANEL_MARGIN * 2) }
    setPosition((previous) => (samePosition(previous, next) ? previous : next))
  }, [align, anchorRef, matchAnchorWidth, panelRef])

  useLayoutEffect(() => {
    if (!open) {
      setPosition(null)
      return
    }
    place()
    const reposition = () => place()
    window.addEventListener("resize", reposition)
    // capture: a scroll inside any ancestor moves the trigger too
    window.addEventListener("scroll", reposition, true)

    // A panel that has left its trigger behind points at nothing. Scrolled out
    // of the window, out of the modal body, out of a table's scroller — an
    // observer covers all three, because it clips against every ancestor;
    // hand-checking the viewport would only have caught the first.
    const anchor = anchorRef.current
    const watcher =
      typeof IntersectionObserver === "undefined" || !anchor
        ? null
        : new IntersectionObserver(
            (entries) => {
              if (entries.some((entry) => !entry.isIntersecting)) detachedRef.current?.()
            },
            { threshold: 0 },
          )
    if (anchor) watcher?.observe(anchor)

    return () => {
      window.removeEventListener("resize", reposition)
      window.removeEventListener("scroll", reposition, true)
      watcher?.disconnect()
    }
  }, [anchorRef, open, place])

  return position
}

/**
 * Inline styles for a panel placed by usePanelPosition. Until it has been
 * measured it is transparent rather than `visibility: hidden` — a hidden
 * element refuses focus, and the browser applies a panel's `autoFocus` in the
 * same commit, so hiding it left every picker's search box unfocused. The
 * measurement runs in a layout effect, so this frame is never painted.
 */
export function panelStyle(position: PanelPosition | null, matchAnchorWidth = false) {
  return {
    left: position?.left ?? 0,
    top: position?.top,
    bottom: position?.bottom,
    maxHeight: position?.maxHeight,
    width: matchAnchorWidth ? position?.anchorWidth : undefined,
    opacity: position ? undefined : 0,
    pointerEvents: position ? undefined : ("none" as const),
  }
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
  /** Panel is exactly as wide as its trigger — for a select, where `width` cannot say so */
  matchAnchorWidth?: boolean
  /** Required when the trigger is icon-only, so it has an accessible name */
  ariaLabel?: string
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
  matchAnchorWidth = false,
  ariaLabel,
}: DropdownProps) {
  const [open, setOpen] = useState(openOnMount)
  const panelRef = useRef<HTMLDivElement | null>(null)
  const triggerRef = useRef<HTMLButtonElement | null>(null)
  // `onOpenChange` must not run inside a setOpen updater: React invokes updaters
  // more than once, so the picker's reset would fire repeatedly and mid-render
  const openRef = useRef(open)
  openRef.current = open
  const close = useCallback(() => {
    if (!openRef.current) return
    setOpen(false)
    onOpenChange?.(false)
  }, [onOpenChange])
  const ref = useClickOutside<HTMLDivElement>(close, panelRef)
  // createPortal needs document, which does not exist during server rendering
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])
  // `mounted`, not just `open`: with openOnMount the panel is not in the DOM on
  // the first render, and a measure that finds no panel would never be retried
  const position = usePanelPosition(ref, panelRef, open && mounted, {
    align,
    matchAnchorWidth,
    onDetached: close,
  })
  // the panel is no longer a descendant of the trigger, so the link a screen
  // reader would otherwise infer from nesting has to be stated
  const panelId = useId()

  // Tab order follows the DOM, and the panel now lives at the end of <body>,
  // so a keyboard user tabbing on from the trigger would sail straight past it.
  // Move focus in when it opens (unless an autoFocus field already took it) and
  // hand it back to the trigger when it closes.
  useEffect(() => {
    if (!open || !mounted) return
    const panel = panelRef.current
    if (panel && !panel.contains(document.activeElement)) {
      panel
        .querySelector<HTMLElement>(
          'input:not([disabled]), button:not([disabled]), select:not([disabled]), textarea:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])',
        )
        ?.focus()
    }
    return () => {
      // the panel left with the focus still inside it
      if (document.activeElement === document.body) triggerRef.current?.focus()
    }
  }, [open, mounted])

  const toggle = () => {
    const next = !open
    setOpen(next)
    onOpenChange?.(next)
  }

  const panel = () => (
    <div
      ref={panelRef}
      id={panelId}
      data-dropdown-panel=""
      style={panelStyle(position, matchAnchorWidth)}
      className={cn(
        // Clamp to the viewport so a fixed panel width cannot cause
        // horizontal scrolling on a phone
        "fixed z-[9650] max-w-[calc(100vw-1.5rem)] overflow-y-auto overflow-x-hidden overscroll-contain rounded-md border border-border bg-card shadow-xl",
        // `w-full` would mean the whole viewport once the panel is portalled
        matchAnchorWidth ? undefined : width,
        panelClassName,
      )}
    >
      {children(close)}
    </div>
  )

  return (
    <div ref={ref} className={cn("relative", className)}>
      <button
        ref={triggerRef}
        type="button"
        onClick={toggle}
        aria-label={ariaLabel}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-controls={open ? panelId : undefined}
        className="w-full text-left"
      >
        {trigger(open)}
      </button>
      {open && mounted && createPortal(panel(), document.body)}
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
    <div className="fixed inset-0 z-[9600] flex items-stretch justify-center overflow-y-auto bg-black/60 sm:items-start sm:p-8">
      <div
        className={cn(
          // Full-screen sheet on a phone, centred dialog on a pointer device
          "flex max-h-none w-full flex-col bg-card shadow-2xl sm:max-h-[85vh] sm:rounded-lg sm:border sm:border-border",
          wide ? "sm:max-w-4xl" : "sm:max-w-lg",
        )}
      >
        <div className="flex shrink-0 items-center justify-between border-b border-border px-4 py-3 sm:px-5">
          <h3 className="text-sm font-semibold">{title}</h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className={cn(touchTarget, "rounded text-muted-foreground hover:bg-secondary hover:text-foreground")}
          >
            <IconClose className="size-5 sm:size-4" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-4 py-4 sm:px-5">{children}</div>
        {footer && (
          <div className="flex shrink-0 justify-end gap-2 border-t border-border px-4 py-3 sm:px-5">{footer}</div>
        )}
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
      {/* block, so a narrow input still sits below its label rather than beside it */}
      <span className="block text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</span>
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
    // max-w-full + overflow lets a long set of options scroll rather than
    // widening the page on a phone
    <div className="-mx-3 max-w-[calc(100%+1.5rem)] overflow-x-auto px-3 sm:mx-0 sm:max-w-full sm:px-0">
      <div className="inline-flex rounded-md border border-border bg-secondary/40 p-0.5">
        {options.map((option) => (
          <button
            key={String(option.id)}
            type="button"
            onClick={() => onChange(option.id)}
            className={cn(
              "shrink-0 whitespace-nowrap rounded px-3 font-medium transition-colors",
              size === "sm" ? "h-9 text-xs sm:h-7" : "h-10 text-sm sm:h-8",
              value === option.id ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground",
            )}
          >
            {option.label}
          </button>
        ))}
      </div>
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
          "relative mt-0.5 h-6 w-11 shrink-0 rounded-full transition-colors sm:h-5 sm:w-9",
          checked ? "bg-primary" : "bg-border",
        )}
      >
        <span
          className={cn(
            "absolute top-0.5 size-5 rounded-full bg-background transition-transform sm:size-4",
            checked ? "translate-x-[22px] sm:translate-x-[18px]" : "translate-x-0.5",
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
      className={cn("flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm hover:bg-secondary/60", touchRow)}
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
        <header className="flex flex-wrap items-start justify-between gap-2 border-b border-border px-4 py-3 sm:gap-3">
          <div className="min-w-0 flex-1">
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
    <div className="rounded-lg border border-border bg-card px-3 py-2.5 sm:px-4 sm:py-3">
      <p className="text-[10px] uppercase tracking-wide text-muted-foreground sm:text-xs">{label}</p>
      <p
        className={cn(
          "mt-1 text-lg font-semibold tabular-nums sm:text-xl",
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
    return <p className="py-8 text-center text-xs text-muted-foreground">Nothing tracked in this range</p>
  }

  return (
    <div className="flex flex-col items-center gap-4 sm:flex-row sm:flex-wrap sm:gap-6">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="max-w-full shrink-0">
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
      <ul className="w-full flex-1 space-y-1 sm:min-w-[160px]">
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

