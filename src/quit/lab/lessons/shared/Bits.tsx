"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { labStore, useLabState } from "../../store"
import { lsCss } from "./css"
import { lsText } from "./text"

/**
 * All state of one copy under one key. `initial` must be a module-level constant.
 * `update` reads the stored copy at call time, so two updates in one tap both land.
 */
export function useLessonState<T extends object>(letter: string, initial: T): [T, (patch: Partial<T> | ((s: T) => Partial<T>)) => void] {
  const [raw, set] = useLabState<T>("lessons", letter, "state", initial)
  const state = useMemo(() => ({ ...initial, ...raw }), [initial, raw])
  const update = useCallback(
    (patch: Partial<T> | ((s: T) => Partial<T>)) => {
      const stored = (labStore().get("lessons", letter, "state") as Partial<T> | undefined) ?? {}
      const cur = { ...initial, ...stored } as T
      const p = typeof patch === "function" ? patch(cur) : patch
      set({ ...cur, ...p })
    },
    [initial, letter, set],
  )
  return [state, update]
}

/** The lab-only control that moves the program one day on. */
export function SkipBar({ day, onSkip }: { day: number; onSkip: () => void }) {
  return (
    <div data-testid="lab-skip-bar" className="mb-3 flex items-center justify-between gap-2 rounded-md border border-dashed border-border px-3 py-1 text-xs text-muted-foreground">
      <span data-testid="lab-day">{lsText.labDay(day)}</span>
      <button type="button" data-testid="lab-skip" onClick={onSkip} className="inline-flex min-h-11 items-center underline">
        {lsText.skip}
      </button>
    </div>
  )
}

/** Falls once for about 3.5 seconds. */
export function Confetti() {
  const pieces = Array.from({ length: 26 }, (_, i) => i)
  const colors = ["bg-amber-300", "bg-slate-300", "bg-sky-300", "bg-rose-300"]
  return (
    <div data-testid="confetti" aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 h-full overflow-hidden">
      <style>{lsCss}</style>
      {pieces.map((i) => (
        <span
          key={i}
          className={`absolute top-0 block h-2.5 w-1.5 ${colors[i % colors.length]}`}
          style={{ left: `${(i * 37) % 100}%`, animation: `ls-fall ${2.4 + (i % 5) * 0.25}s ease-in ${(i % 7) * 0.1}s forwards` }}
        />
      ))}
    </div>
  )
}

/** A flame drawn in SVG that flickers. */
export function Flame({ size = 40, flicker = false }: { size?: number; flicker?: boolean }) {
  return (
    <svg width={size} height={size * 1.25} viewBox="0 0 32 40" aria-hidden="true" style={flicker ? { animation: "ls-flame 0.9s ease-in-out infinite" } : undefined}>
      <style>{lsCss}</style>
      <path d="M16 2 C18 10 28 14 28 26 A12 12 0 0 1 4 26 C4 18 10 16 11 8 C13 10 14 12 14 14 C16 10 16 6 16 2 Z" fill="#fb923c" />
      <path d="M16 18 C18 22 22 24 22 29 A6 6 0 0 1 10 29 C10 25 15 23 16 18 Z" fill="#fde68a" />
    </svg>
  )
}

/** Small label that marks a lesson as ours, so it is never taken for copied content. */
export function SampleTag() {
  return (
    <span data-testid="sample-tag" className="inline-flex w-fit items-center rounded-full border border-border bg-card px-2 py-0.5 text-xs text-muted-foreground">
      {lsText.sample}
    </span>
  )
}

/** Tab bar fixed to the bottom of the screen. Pages that use it end in `<NavSpace />` so nothing rests under it. */
export function FixedNav({ items, value, onChange, id }: { items: readonly string[]; value: number; onChange: (i: number) => void; id: string }) {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-border bg-background pb-[env(safe-area-inset-bottom)]">
      <div className="mx-auto grid max-w-[640px]" style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` }}>
        {items.map((label, i) => (
          <button
            key={label}
            type="button"
            data-testid={`${id}-${i}`}
            aria-current={i === value}
            onClick={() => onChange(i)}
            className={`min-h-14 break-words px-0.5 text-[11px] leading-tight ${i === value ? "font-semibold text-primary" : "text-muted-foreground"}`}
          >
            {label}
          </button>
        ))}
      </div>
    </nav>
  )
}

/** Blank space the height of the fixed tab bar. */
export function NavSpace() {
  return <div aria-hidden="true" className="h-20" />
}

/** Bottom sheet over a dimmed page. */
export function Sheet({ children, onClose, testId, closeLabel, handle }: { children: React.ReactNode; onClose?: () => void; testId: string; closeLabel?: string; handle?: boolean }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60">
      <div data-testid={testId} role="dialog" aria-modal="true" className="relative max-h-[88dvh] w-full max-w-lg overflow-y-auto rounded-t-2xl border border-border bg-card p-4">
        {handle && <span data-testid="grab-handle" aria-hidden="true" className="mx-auto mb-2 block h-1 w-10 rounded-full bg-border" />}
        {onClose && (
          <button type="button" data-testid={`${testId}-close`} aria-label={closeLabel ?? lsText.close} onClick={onClose} className="absolute right-2 top-2 z-10 inline-flex size-11 items-center justify-center rounded-full text-lg">
            {"✕"}
          </button>
        )}
        {children}
      </div>
    </div>
  )
}

/** A sideways row of cards with an "n of N" pager and arrows. */
export function CardPager({ count, render, id }: { count: number; render: (i: number) => React.ReactNode; id: string }) {
  const [i, setI] = useState(0)
  return (
    <div data-testid={id} className="flex flex-col gap-2">
      <div className="flex gap-2 overflow-x-auto pr-8 [scrollbar-width:none]" style={{ scrollSnapType: "x mandatory" }}>
        {Array.from({ length: count }, (_, k) => (
          <div key={k} className={`w-[75%] shrink-0 ${k === i ? "" : "opacity-60"}`} style={{ scrollSnapAlign: "start" }}>
            {render(k)}
          </div>
        ))}
      </div>
      <div className="flex items-center justify-center gap-3 text-sm">
        <button type="button" data-testid={`${id}-prev`} aria-label={lsText.prev} onClick={() => setI(Math.max(0, i - 1))} className="inline-flex size-11 items-center justify-center">
          {"‹"}
        </button>
        <span data-testid={`${id}-count`}>{lsText.of(i + 1, count)}</span>
        <button type="button" data-testid={`${id}-next`} aria-label={lsText.more} onClick={() => setI(Math.min(count - 1, i + 1))} className="inline-flex size-11 items-center justify-center">
          {"›"}
        </button>
      </div>
    </div>
  )
}

/** Runs `fn` every `ms` while `ms` is a number. */
export function useTick(fn: () => void, ms: number | null) {
  useEffect(() => {
    if (ms === null) return
    const id = setInterval(fn, ms)
    return () => clearInterval(id)
  }, [fn, ms])
}
