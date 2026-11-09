"use client"

/**
 * SEVEN BUTTONS IN A ROW, 1 TO 7 (D-SCALES). One tap per score; 44 px tall and
 * filling the width, so the row fits a 360 px phone with no sideways scroll.
 */

import { cn } from "@/lib/utils"
import { SCALE_VALUES, type ScaleValue } from "../types"

export function ScaleRow({
  label,
  low,
  high,
  value,
  onChange,
  testId,
}: {
  label: string
  low: string
  high: string
  value: ScaleValue | null
  onChange: (v: ScaleValue) => void
  testId: string
}) {
  return (
    <fieldset className="min-w-0" data-testid={testId}>
      <legend className="text-sm font-medium">{label}</legend>
      <div className="mt-1.5 flex gap-1" role="radiogroup" aria-label={label}>
        {SCALE_VALUES.map((v) => (
          <button
            key={v}
            type="button"
            role="radio"
            aria-checked={value === v}
            aria-label={`${label} ${v}`}
            onClick={() => onChange(v)}
            className={cn(
              "h-11 min-w-0 flex-1 rounded-lg border text-base font-medium transition-colors",
              value === v ? "border-primary bg-primary text-primary-foreground" : "border-border bg-background/60 hover:bg-muted/50",
            )}
          >
            {v}
          </button>
        ))}
      </div>
      <div className="mt-1 flex justify-between text-xs text-muted-foreground">
        <span>{low}</span>
        <span>{high}</span>
      </div>
    </fieldset>
  )
}
