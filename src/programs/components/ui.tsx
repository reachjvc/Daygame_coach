"use client"

/**
 * The small set of shapes the program screens are built from.
 *
 * WHY THIS EXISTS. The first version of the builder used seven different font
 * sizes in one component and three different button languages in a single row —
 * lowercase text links ("close", "edit", "set up") next to bare icon buttons
 * next to bordered chips. Every one of those was a local decision that looked
 * fine on its own line, and together they read as unfinished. The fix is not
 * better individual choices, it is having a set to choose from.
 *
 * FOUR TYPE SIZES, and no others on these screens:
 *   LABEL 10px  — the word above a field, uppercase, never a sentence
 *   META  11px  — counts, units, hints, anything you read second
 *   BODY  12.5px — names, values, the things you actually read
 *   TITLE 13px  — the heading of a card
 *
 * TWO BUTTON LANGUAGES, and they mean different things:
 *   IconButton — reversible manipulation of a row (move, remove, expand)
 *   Segmented  — a choice between named alternatives, always visible together
 * Anything else is a real Button with a border and a label.
 *
 * Touch targets follow the timetrack rule: icon-only controls get 44px on a
 * phone and shrink on a pointer device, because a 18px delete button is a
 * coin-flip on a touchscreen.
 */

import type { ReactNode } from "react"
import type { LucideIcon } from "lucide-react"

export const TYPE = {
  label: "text-[10px] font-medium uppercase tracking-[0.09em] text-zinc-500",
  meta: "text-[11px] text-zinc-500",
  body: "text-[12.5px] text-zinc-200",
  title: "text-[13px] font-semibold text-zinc-100",
  hint: "text-[11px] text-zinc-500 leading-relaxed",
} as const

/** An icon-only control. 44px on touch, 28px with a mouse. */
export function IconButton({
  icon: Icon,
  label,
  onClick,
  disabled,
  tone = "default",
}: {
  icon: LucideIcon
  /** Required: an icon with no accessible name is invisible to a screen reader. */
  label: string
  onClick: () => void
  disabled?: boolean
  tone?: "default" | "danger"
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className={`flex size-11 sm:size-7 shrink-0 items-center justify-center rounded-md border border-white/10 bg-white/[0.02] transition-colors disabled:opacity-25 disabled:hover:bg-white/[0.02] ${
        tone === "danger"
          ? "text-zinc-500 hover:bg-rose-500/15 hover:text-rose-300 hover:border-rose-400/30"
          : "text-zinc-400 hover:bg-white/10 hover:text-zinc-100"
      }`}
    >
      <Icon className="size-3.5" />
    </button>
  )
}

/**
 * A choice between named alternatives.
 *
 * One bordered group with dividers rather than a row of loose chips: loose
 * chips do not say that the options belong to each other, which is why the
 * kg/lb pair read as two unrelated buttons that happened to sit together.
 */
export function Segmented<T extends string>({
  value,
  options,
  onChange,
  label,
  size = "md",
}: {
  value: T
  options: Array<{ value: T; label: string; hint?: string }>
  onChange: (value: T) => void
  /** Rendered as the group's accessible name, and shown when `showLabel`. */
  label: string
  size?: "sm" | "md"
}) {
  return (
    <div
      role="group"
      aria-label={label}
      className="inline-flex w-fit shrink-0 self-start overflow-hidden rounded-md border border-white/12 divide-x divide-white/10"
    >
      {options.map((option) => {
        const active = option.value === value
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            aria-pressed={active}
            title={option.hint}
            className={`${size === "sm" ? "px-2 py-1" : "px-2.5 py-1.5"} text-[11px] transition-colors ${
              active
                ? "bg-sky-500/15 text-sky-200"
                : "text-zinc-400 hover:bg-white/[0.06] hover:text-zinc-200"
            }`}
          >
            {option.label}
          </button>
        )
      })}
    </div>
  )
}

/**
 * A labelled input.
 *
 * The label sits ABOVE the box rather than beside it, and the unit sits inside
 * on the right. Inline labels made a row read as a broken sentence — "sets 3
 * reps 8 start at 60 kg" — instead of as a set of fields, and repeating the
 * unit after every box said "kg" four times on one line.
 */
export function Field({
  label,
  value,
  onChange,
  onBlur,
  suffix,
  width = "w-16",
  invalid,
  placeholder,
  inputMode = "numeric",
  ariaLabel,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  onBlur?: () => void
  suffix?: string
  width?: string
  invalid?: boolean
  placeholder?: string
  inputMode?: "numeric" | "decimal" | "text"
  ariaLabel?: string
}) {
  return (
    <label className="flex w-fit flex-col gap-1 self-start">
      <span className={TYPE.label}>{label}</span>
      <span className="relative inline-flex w-fit items-center">
        <input
          type={inputMode === "text" ? "text" : "number"}
          inputMode={inputMode === "text" ? undefined : inputMode}
          value={value}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
          onBlur={onBlur}
          onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
          aria-label={ariaLabel ?? label}
          aria-invalid={invalid || undefined}
          className={`${width} rounded-md border bg-black/25 py-1.5 pl-2.5 ${suffix ? "pr-7" : "pr-2.5"} text-[12.5px] tabular-nums text-zinc-100 placeholder:text-zinc-600 transition-colors focus:outline-none ${
            invalid
              ? "border-amber-400/40 focus:border-amber-400/70"
              : "border-white/12 focus:border-sky-400/50"
          }`}
        />
        {suffix && (
          <span className="pointer-events-none absolute right-2 text-[10.5px] text-zinc-600">{suffix}</span>
        )}
      </span>
    </label>
  )
}

/**
 * A number you change by tapping, not by typing.
 *
 * Sets and reps are small whole numbers that move by one, and making somebody
 * select-all-and-retype to go from 3 to 4 is the same class of friction as
 * making them search for a bench press. The value is still typable for the
 * person going from 8 to 20, but the common move is a tap.
 */
export function Stepper({
  label,
  value,
  onChange,
  min = 1,
  max = 100,
  ariaLabel,
}: {
  label: string
  value: number
  onChange: (n: number) => void
  min?: number
  max?: number
  ariaLabel?: string
}) {
  const name = ariaLabel ?? label
  return (
    <div className="flex w-fit flex-col gap-1 self-start">
      <span className={TYPE.label}>{label}</span>
      <div className="inline-flex w-fit items-center overflow-hidden rounded-md border border-white/12 divide-x divide-white/10">
        <button
          type="button"
          onClick={() => onChange(Math.max(min, value - 1))}
          disabled={value <= min}
          aria-label={`One fewer ${name}`}
          className="flex h-9 w-9 sm:h-7 sm:w-7 items-center justify-center text-zinc-400 transition-colors hover:bg-white/10 hover:text-zinc-100 disabled:opacity-25 disabled:hover:bg-transparent"
        >
          −
        </button>
        <span
          aria-label={name}
          aria-live="polite"
          className="flex h-9 sm:h-7 min-w-9 items-center justify-center bg-black/25 px-1 text-[12.5px] tabular-nums text-zinc-100"
        >
          {value}
        </span>
        <button
          type="button"
          onClick={() => onChange(Math.min(max, value + 1))}
          disabled={value >= max}
          aria-label={`One more ${name}`}
          className="flex h-9 w-9 sm:h-7 sm:w-7 items-center justify-center text-zinc-400 transition-colors hover:bg-white/10 hover:text-zinc-100 disabled:opacity-25 disabled:hover:bg-transparent"
        >
          +
        </button>
      </div>
    </div>
  )
}

/** A bordered card. One radius, one border colour, everywhere. */
export function Panel({
  children,
  accent,
  className = "",
}: {
  children: ReactNode
  accent?: boolean
  className?: string
}) {
  return (
    <div
      className={`rounded-lg border ${
        accent ? "border-sky-400/25 bg-sky-500/[0.05]" : "border-white/10 bg-white/[0.02]"
      } ${className}`}
    >
      {children}
    </div>
  )
}

/** A labelled action that is not an icon and not a choice. */
export function Action({
  children,
  onClick,
  disabled,
  variant = "quiet",
}: {
  children: ReactNode
  onClick: () => void
  disabled?: boolean
  variant?: "primary" | "quiet"
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`rounded-md border px-3 py-1.5 text-[12px] transition-colors disabled:opacity-30 ${
        variant === "primary"
          ? "border-sky-400/45 bg-sky-500/15 text-sky-100 hover:bg-sky-500/25"
          : "border-white/12 bg-white/[0.02] text-zinc-300 hover:bg-white/[0.07] hover:text-zinc-100"
      }`}
    >
      {children}
    </button>
  )
}

/** The small uppercase caption above a group of controls. */
export function GroupLabel({ children }: { children: ReactNode }) {
  return <p className={TYPE.label}>{children}</p>
}
