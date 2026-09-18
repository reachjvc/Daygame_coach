"use client"

/**
 * A NUMBER YOU CAN TAP OR TYPE.
 *
 * Sets and reps are small whole numbers that usually move by one, so −/+ is the
 * common move. But 8 → 20 is twelve taps, and a control that only steps is a
 * control that punishes the person who already knows the number. The middle is
 * a real input: type into it, or step it, whichever is fewer actions for you.
 *
 * Typed text is held locally and only committed on blur or Enter, so typing "1"
 * on the way to "12" does not apply a one-rep prescription and fight the cursor.
 * An empty or nonsense box reverts to the last good value rather than throwing
 * a validation error mid-keystroke.
 *
 * That behaviour is the one thing worth keeping from the blue-grey "kit" this
 * replaces (src/programs/components/ui.tsx). What is not kept is its size and
 * its paint: it was a 36px control with 12.5px type, which is under the 44px a
 * fingertip needs and under the 16px below which Safari zooms the whole page
 * when you tap it -- so the old stepper punished you twice for using it on a
 * phone. Built from the app's own Button and Input, it is 44px and 16px for
 * free, and it is the app's colours rather than a second colour scheme.
 */

import * as React from "react"
import { Minus, Plus } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

export function Stepper({
  label,
  value,
  onChange,
  min = 1,
  max = 100,
  ariaLabel,
  className,
}: {
  /** Shown above the control. Omit for a bare stepper inside a labelled row. */
  label?: string
  value: number
  onChange: (n: number) => void
  min?: number
  max?: number
  /** Overrides `label` as the name a screen reader reads for the box. */
  ariaLabel?: string
  className?: string
}) {
  const name = ariaLabel ?? label ?? "value"
  const [draft, setDraft] = React.useState<string | null>(null)

  function commit() {
    const n = Number(draft)
    setDraft(null)
    if (
      draft !== null &&
      draft.trim() !== "" &&
      Number.isInteger(n) &&
      n >= min &&
      n <= max &&
      n !== value
    ) {
      onChange(n)
    }
  }

  /** Stepping while a draft is open should move from what is on screen. */
  function step(by: -1 | 1) {
    const base = draft !== null && Number.isInteger(Number(draft)) ? Number(draft) : value
    setDraft(null)
    const next = Math.min(max, Math.max(min, base + by))
    if (next !== value) onChange(next)
  }

  return (
    <div className={cn("flex w-fit flex-col gap-1 self-start", className)}>
      {label && <span className="text-xs text-muted-foreground">{label}</span>}
      <div className="inline-flex w-fit items-center gap-1">
        <Button
          type="button"
          variant="outline"
          size="icon-sm"
          onClick={() => step(-1)}
          disabled={value <= min}
          aria-label={`One fewer ${name}`}
        >
          <Minus />
        </Button>
        <Input
          type="number"
          inputMode="numeric"
          aria-label={name}
          value={draft ?? String(value)}
          onChange={(e) => setDraft(e.target.value)}
          onFocus={(e) => e.currentTarget.select()}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === "Enter") (e.target as HTMLInputElement).blur()
            if (e.key === "Escape") setDraft(null)
          }}
          // The browser's own up/down spinners are a third way to change the
          // number, at about eight pixels each. Hidden: the two buttons either
          // side are the same job at a size you can hit.
          className="h-11 w-14 text-center tabular-nums [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
        />
        <Button
          type="button"
          variant="outline"
          size="icon-sm"
          onClick={() => step(1)}
          disabled={value >= max}
          aria-label={`One more ${name}`}
        >
          <Plus />
        </Button>
      </div>
    </div>
  )
}
