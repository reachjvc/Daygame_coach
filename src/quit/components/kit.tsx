"use client"

import { useEffect, useState } from "react"
import { ChevronDown } from "lucide-react"
import { tooltext as t } from "../tooltext"
import { fill } from "../tooltext"
import type { Evidence, QuitRef } from "../types"

const chipBase =
  "inline-flex min-h-11 min-w-11 items-center justify-center rounded-full border px-4 py-2 text-left text-base leading-snug transition-colors"

export interface ChipOption {
  id: string
  label: string
}

interface ChipsProps {
  options: ChipOption[]
  /** The selected ids. */
  value: string[]
  onChange: (next: string[]) => void
  /** 1 = pick one (a tap replaces); more = pick up to that many. */
  max?: number
  /** Names the group for assistive tech. */
  label: string
}

/** Tappable choices. A single-pick group acts like radio buttons. */
export function Chips({ options, value, onChange, max = 1, label }: ChipsProps) {
  const toggle = (id: string) => {
    if (max === 1) return onChange([id])
    if (value.includes(id)) return onChange(value.filter((v) => v !== id))
    if (value.length >= max) return
    onChange([...value, id])
  }
  return (
    <div role={max === 1 ? "radiogroup" : "group"} aria-label={label} className="flex flex-wrap gap-2">
      {options.map((o) => {
        const on = value.includes(o.id)
        return (
          <button
            key={o.id}
            type="button"
            role={max === 1 ? "radio" : "checkbox"}
            aria-checked={on}
            data-testid={`chip-${o.id}`}
            onClick={() => toggle(o.id)}
            className={`${chipBase} ${on ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card text-foreground"}`}
          >
            {o.label}
          </button>
        )
      })}
    </div>
  )
}

interface StepperProps {
  value: number
  min: number
  max: number
  step?: number
  onChange: (n: number) => void
  label: string
}

/** A number with big plus and minus buttons. */
export function Stepper({ value, min, max, step = 1, onChange, label }: StepperProps) {
  const clamp = (n: number) => Math.min(max, Math.max(min, n))
  return (
    <div role="group" aria-label={label} className="flex items-center gap-3">
      <button
        type="button"
        aria-label={t.common.less}
        onClick={() => onChange(clamp(value - step))}
        disabled={value <= min}
        className="inline-flex size-12 items-center justify-center rounded-full border border-border bg-card text-2xl disabled:opacity-40"
      >
        {"−"}
      </button>
      <span data-testid="stepper-value" aria-live="polite" className="min-w-14 text-center text-3xl font-semibold tabular-nums">
        {value}
      </span>
      <button
        type="button"
        aria-label={t.common.more}
        onClick={() => onChange(clamp(value + step))}
        disabled={value >= max}
        className="inline-flex size-12 items-center justify-center rounded-full border border-border bg-card text-2xl disabled:opacity-40"
      >
        {"+"}
      </button>
    </div>
  )
}

/** "Counted: …" under a number or a proof. */
export function CountedLine({ text }: { text: string | null | undefined }) {
  if (!text) return null
  return (
    <p className="mt-1 text-sm text-muted-foreground">
      {t.common.counted} {text}
    </p>
  )
}

const EVIDENCE_STYLE: Record<Evidence, string> = {
  strong: "border-primary text-primary",
  moderate: "border-border text-foreground",
  weak: "border-border text-muted-foreground",
  none: "border-dashed border-border text-muted-foreground",
}

/** How well a swap has been tested, in plain words. */
export function EvidenceChip({ evidence }: { evidence: Evidence }) {
  return (
    <span
      data-testid={`evidence-${evidence}`}
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${EVIDENCE_STYLE[evidence]}`}
    >
      {t.evidence[evidence]}
    </span>
  )
}

/** The header of a fold (`<details className="group">`): a chevron that turns when it opens, so it looks tappable. */
export function FoldSummary({ children }: { children: React.ReactNode }) {
  return (
    <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-2 font-medium [&::-webkit-details-marker]:hidden">
      {children}
      <ChevronDown aria-hidden data-testid="fold-chevron" className="size-4 shrink-0 text-muted-foreground transition-transform group-[[open]]:rotate-180" />
    </summary>
  )
}

/** Tap to read where a claim comes from: cite, quote, link (P22). */
export function SourceTap({ refs }: { refs: QuitRef[] }) {
  const [open, setOpen] = useState(false)
  if (refs.length === 0) return null
  return (
    <div className="mt-2">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="inline-flex min-h-11 items-center text-sm text-primary underline"
      >
        {open ? t.common.hideSource : t.common.source}
      </button>
      {open && (
        <ul className="mt-1 flex flex-col gap-3 rounded-md border border-border bg-card p-3 text-sm">
          {refs.map((r, i) => (
            <li key={`${r.url}-${i}`}>
              <p>{r.cite}</p>
              {r.quote && <p className="mt-1 italic text-muted-foreground">{`“${r.quote}”`}</p>}
              {r.url && (
                <a href={r.url} target="_blank" rel="noopener noreferrer" className="mt-1 inline-flex min-h-11 items-center break-all text-primary underline">
                  {t.common.openSource}
                </a>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

/** The frame's "Sources" anchor lands here; it opens when the link is followed. */
export function SourcesFold({ refs }: { refs: QuitRef[] }) {
  const [open, setOpen] = useState(false)
  useEffect(() => {
    const check = () => {
      if (window.location.hash === "#sources") setOpen(true)
    }
    check()
    window.addEventListener("hashchange", check)
    return () => window.removeEventListener("hashchange", check)
  }, [])
  if (refs.length === 0) return null
  return (
    <details
      id="sources"
      open={open}
      onToggle={(e) => setOpen((e.currentTarget as HTMLDetailsElement).open)}
      className="group mt-8 rounded-md border border-border bg-card p-3 text-sm"
    >
      <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-2 font-medium [&::-webkit-details-marker]:hidden">
        {fill(t.common.sourcesFold, { n: refs.length })}
        <ChevronDown className="size-4 shrink-0 transition-transform group-open:rotate-180" aria-hidden />
      </summary>
      <ul className="flex flex-col gap-3">
        {refs.map((r, i) => (
          <li key={`${r.url}-${i}`}>
            <p>{r.cite}</p>
            {r.url && (
              <a href={r.url} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center break-all text-primary underline">
                {t.common.openSource}
              </a>
            )}
          </li>
        ))}
      </ul>
    </details>
  )
}

interface OneQuestionProps {
  step: number
  total: number
  onBack: (() => void) | null
  children: React.ReactNode
  /** Writes "Question N of M" above the bar. */
  showStep?: boolean
  /** Leaves the bar out (a first screen whose step count is not known yet). */
  hideBar?: boolean
}

/** One question per screen: progress, the question, an in-page Back. */
export function OneQuestion({ step, total, onBack, children, showStep, hideBar }: OneQuestionProps) {
  return (
    <section data-testid="question" data-step={step} className="flex flex-col gap-4">
      {showStep && (
        <p data-testid="step-text" className="-mb-2 text-sm text-muted-foreground">
          {fill(t.common.stepLabel, { n: step, total })}
        </p>
      )}
      {!hideBar && (
      <div
        role="progressbar"
        aria-label={fill(t.common.stepLabel, { n: step, total })}
        aria-valuemin={0}
        aria-valuemax={total}
        aria-valuenow={step}
        className="h-1.5 w-full overflow-hidden rounded-full bg-muted"
      >
        <div className="h-full bg-primary" style={{ width: `${Math.min(100, (step / total) * 100)}%` }} />
      </div>
      )}
      {children}
      {onBack && (
        <button type="button" data-testid="screen-back" onClick={onBack} className="inline-flex min-h-11 min-w-11 items-center self-start text-sm text-muted-foreground underline">
          {t.common.back}
        </button>
      )}
    </section>
  )
}

/** The primary button of a screen. */
export function PrimaryButton({
  children,
  onClick,
  disabled,
  testId,
}: {
  children: React.ReactNode
  onClick: () => void
  disabled?: boolean
  testId?: string
}) {
  return (
    <button
      type="button"
      data-testid={testId}
      onClick={onClick}
      disabled={disabled}
      className="inline-flex min-h-12 w-full items-center justify-center rounded-md bg-primary px-4 text-base font-medium text-primary-foreground disabled:opacity-40"
    >
      {children}
    </button>
  )
}

/** "Clear my answers" on a result screen. */
export function ClearAnswers({ onClear }: { onClear: () => void }) {
  return (
    <button type="button" data-testid="clear-answers" onClick={onClear} className="mt-6 inline-flex min-h-11 items-center text-sm text-muted-foreground underline">
      {t.common.clear}
    </button>
  )
}
