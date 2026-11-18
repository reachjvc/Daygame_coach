"use client"

import { sharedText } from "./text"

/** Small tag on a screen (or a setup) that was never seen in public material. */
export function InferredTag() {
  return (
    <span data-testid="inferred-tag" className="inline-flex items-center rounded-full border border-dashed border-border px-2 py-0.5 text-xs text-muted-foreground">
      {sharedText.inferredTag}
    </span>
  )
}

/** A dashed tile where a guessed label, item or card would be. */
export function Placeholder({ className = "" }: { className?: string }) {
  return (
    <div
      data-testid="placeholder"
      className={`flex min-h-11 items-center justify-center rounded-md border border-dashed border-border px-3 py-3 text-center text-sm text-muted-foreground ${className}`}
    >
      {sharedText.notSeen}
    </div>
  )
}

/** Stands where a competitor's unsourced number would be. */
export function NotSourced() {
  return (
    <span data-testid="not-sourced" className="inline-block rounded border border-dashed border-border px-1.5 py-0.5 text-xs text-muted-foreground">
      {sharedText.notSourced}
    </span>
  )
}

/** A whole screen that was never seen: back link, inferred tag, placeholder tiles. */
export function PlaceholderScreen({ title, onBack }: { title: string; onBack: (() => void) | null }) {
  return (
    <section data-testid="placeholder-screen" className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        {onBack && (
          <button type="button" data-testid="screen-back" onClick={onBack} className="inline-flex min-h-11 items-center text-sm text-muted-foreground underline">
            {sharedText.back}
          </button>
        )}
        <h2 className="flex-1 text-lg font-semibold">{title}</h2>
        <InferredTag />
      </div>
      <p className="text-sm text-muted-foreground">{sharedText.placeholderScreen}</p>
      <Placeholder />
      <Placeholder />
    </section>
  )
}

/** Screen header: back, title, optional right slot. */
export function Head({ title, onBack, right, inferred }: { title: string; onBack?: (() => void) | null; right?: React.ReactNode; inferred?: boolean }) {
  return (
    <div className="mb-3 flex items-center gap-2">
      {onBack && (
        <button type="button" data-testid="screen-back" aria-label={sharedText.back} onClick={onBack} className="inline-flex size-11 items-center justify-center rounded-full border border-border bg-card text-lg">
          {"‹"}
        </button>
      )}
      <h2 className="min-w-0 flex-1 truncate text-lg font-semibold">{title}</h2>
      {inferred && <InferredTag />}
      {right}
    </div>
  )
}

/** A row of pill tabs. */
export function Tabs({ items, value, onChange, id, scroll }: { items: readonly string[]; value: number; onChange: (i: number) => void; id: string; scroll?: boolean }) {
  return (
    <div role="tablist" className={`flex gap-1.5 ${scroll ? "overflow-x-auto" : ""}`}>
      {items.map((label, i) => (
        <button
          key={label}
          type="button"
          role="tab"
          aria-selected={i === value}
          data-testid={`${id}-${i}`}
          onClick={() => onChange(i)}
          className={`inline-flex min-h-11 shrink-0 items-center justify-center rounded-full border px-3.5 text-sm ${scroll ? "" : "flex-1"} ${i === value ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card text-foreground"}`}
        >
          {label}
        </button>
      ))}
    </div>
  )
}

/** Bottom navigation; `glyphs` are one-character icons. */
export function BottomNav({ items, value, onChange, id }: { items: readonly string[]; value: number; onChange: (i: number) => void; id: string }) {
  return (
    <nav className="sticky bottom-0 z-10 mt-4 grid border-t border-border bg-background" style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` }}>
      {items.map((label, i) => (
        <button
          key={label}
          type="button"
          data-testid={`${id}-${i}`}
          aria-current={i === value}
          onClick={() => onChange(i)}
          className={`min-h-12 break-words px-0.5 text-[11px] leading-tight ${i === value ? "font-semibold text-primary" : "text-muted-foreground"}`}
        >
          {label}
        </button>
      ))}
    </nav>
  )
}

/** A ring that fills from 0 to 1 with children in the middle. */
export function Ring({ value, size = 160, stroke = 12, children, testId }: { value: number; size?: number; stroke?: number; children?: React.ReactNode; testId?: string }) {
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  const v = Math.min(1, Math.max(0, value))
  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }} data-testid={testId} data-value={v.toFixed(3)}>
      <svg width={size} height={size} className="-rotate-90" aria-hidden="true">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={stroke} className="stroke-muted" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          strokeWidth={stroke}
          strokeLinecap="round"
          className="stroke-primary"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - v)}
          style={{ transition: "stroke-dashoffset 0.8s ease" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">{children}</div>
    </div>
  )
}

/** A labelled card block. */
export function Card({ children, className = "", testId, onClick }: { children: React.ReactNode; className?: string; testId?: string; onClick?: () => void }) {
  const cls = `rounded-lg border border-border bg-card p-3 text-left ${className}`
  return onClick ? (
    <button type="button" data-testid={testId} onClick={onClick} className={`${cls} min-h-11 w-full`}>
      {children}
    </button>
  ) : (
    <div data-testid={testId} className={cls}>
      {children}
    </div>
  )
}

/** Number input that keeps the typed text and commits valid numbers. */
export function NumField({ label, value, onChange, step = 1, testId, min = 0 }: { label: string; value: number; onChange: (n: number) => void; step?: number; testId?: string; min?: number }) {
  return (
    <label className="flex min-h-11 items-center justify-between gap-3 text-sm">
      <span>{label}</span>
      <input
        type="number"
        inputMode="decimal"
        data-testid={testId}
        min={min}
        step={step}
        value={Number.isFinite(value) ? value : ""}
        onChange={(e) => onChange(e.target.value === "" ? NaN : Number(e.target.value))}
        className="min-h-11 w-28 rounded-md border border-border bg-background px-2 text-right"
      />
    </label>
  )
}

/** Small bar shown on every screen while the example data is active. */
export function ExampleBar({ onClear }: { onClear: () => void }) {
  return (
    <div data-testid="example-bar" className="mb-3 flex items-center justify-between gap-2 rounded-md border border-dashed border-border px-3 py-1 text-xs text-muted-foreground">
      <span>{sharedText.exampleLabel}</span>
      <button type="button" data-testid="example-clear" onClick={onClear} className="inline-flex min-h-11 items-center underline">
        {sharedText.clearExample}
      </button>
    </div>
  )
}

/** Share icon: opens the share sheet where the browser has one; otherwise does nothing. */
export function ShareBtn({ text, testId }: { text: string; testId?: string }) {
  const share = () => {
    try {
      if (typeof navigator !== "undefined" && navigator.share) void navigator.share({ text }).catch(() => undefined)
    } catch {
      // no share sheet here
    }
  }
  return (
    <button type="button" data-testid={testId} aria-label={sharedText.share} onClick={share} className="inline-flex size-11 items-center justify-center rounded-full border border-border bg-card">
      {"↗"}
    </button>
  )
}

/** Round icon button. */
export function IconBtn({ label, onClick, children, testId }: { label: string; onClick: () => void; children: React.ReactNode; testId?: string }) {
  return (
    <button type="button" data-testid={testId} aria-label={label} onClick={onClick} className="inline-flex size-11 shrink-0 items-center justify-center rounded-full border border-border bg-card">
      {children}
    </button>
  )
}
