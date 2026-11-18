"use client"

import { useEffect, useState } from "react"
import { clampTo, parseTyped, round2 } from "./logic"

/**
 * A number box that starts empty. Typed values snap into [min, max] at once; an emptied or
 * half-typed box keeps the last valid number. `buttons` adds minus and plus round buttons.
 */
export function NumInput({
  value,
  onChange,
  min = 0,
  max,
  step = 1,
  buttons,
  testId,
  label,
  placeholder,
  className = "",
  minusLabel,
  plusLabel,
}: {
  value: number | null
  onChange: (n: number) => void
  min?: number
  max?: number
  step?: number
  buttons?: boolean
  testId: string
  label: string
  placeholder?: string
  className?: string
  minusLabel?: string
  plusLabel?: string
}) {
  const [draft, setDraft] = useState(value == null ? "" : String(value))
  useEffect(() => {
    setDraft((d) => {
      const p = parseTyped(d)
      if (value == null) return Number.isNaN(p) ? d : ""
      return p === value ? d : String(value)
    })
  }, [value])

  const type = (text: string) => {
    setDraft(text)
    const p = parseTyped(text)
    if (Number.isNaN(p)) return
    const c = clampTo(p, min, max)
    if (c !== p) setDraft(String(c))
    onChange(c)
  }
  const bump = (by: number) => {
    const c = clampTo(round2((value ?? min) + by), min, max)
    setDraft(String(c))
    onChange(c)
  }
  const input = (
    <input
      type="text"
      inputMode="decimal"
      data-testid={testId}
      aria-label={label}
      placeholder={placeholder}
      value={draft}
      onChange={(e) => type(e.target.value)}
      className={`min-h-11 min-w-0 rounded-md border border-border bg-background px-2 text-right ${className}`}
    />
  )
  if (!buttons) return input
  const round = "inline-flex size-11 shrink-0 items-center justify-center rounded-full border border-border bg-card text-lg disabled:opacity-30"
  return (
    <div className="flex items-center gap-1.5">
      <button type="button" data-testid={`${testId}-minus`} aria-label={minusLabel} disabled={(value ?? min) <= min} onClick={() => bump(-step)} className={round}>
        {"−"}
      </button>
      {input}
      <button type="button" data-testid={`${testId}-plus`} aria-label={plusLabel} disabled={max !== undefined && (value ?? min) >= max} onClick={() => bump(step)} className={round}>
        {"+"}
      </button>
    </div>
  )
}
