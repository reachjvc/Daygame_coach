"use client"

/**
 * THE DAY LIST: every awake quarter of one day that has ended (Plans/energy-audit.md, screens).
 *
 * Answered quarters show the activity and both scores ("E 3 · G 6"); gaps are
 * grey rows. No box colours during the audit (D-NO-PUSH). Tap a gap to start
 * a selection and another to end it, then "Answer these (N)" answers the
 * stretch once. Tap an answered row to change or delete it.
 */

import { ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { quarterLabel } from "../quarterService"
import type { DrawnSlot } from "../hooks/useAudit"

export interface DaySelection {
  start: number | null
  end: number | null
}

/** The gaps a selection covers: every unanswered quarter from its start to its end. */
export function selectedGaps(quarters: readonly number[], answered: ReadonlyMap<number, DrawnSlot>, sel: DaySelection): number[] {
  if (sel.start === null) return []
  const end = sel.end ?? sel.start
  const lo = Math.min(sel.start, end)
  const hi = Math.max(sel.start, end)
  return quarters.filter((q) => q >= lo && q <= hi && !answered.has(q))
}

export function DayList({
  dayLabel,
  canPrev,
  canNext,
  onPrev,
  onNext,
  quarters,
  answered,
  timezone,
  selection,
  onSelect,
  onAnswerSelection,
  onOpenAnswer,
}: {
  dayLabel: string
  canPrev: boolean
  canNext: boolean
  onPrev: () => void
  onNext: () => void
  quarters: readonly number[]
  answered: ReadonlyMap<number, DrawnSlot>
  timezone: string
  selection: DaySelection
  onSelect: (next: DaySelection) => void
  onAnswerSelection: (gaps: number[]) => void
  onOpenAnswer: (slot: DrawnSlot) => void
}) {
  const gaps = selectedGaps(quarters, answered, selection)
  const chosen = new Set(gaps)

  const tapGap = (q: number) => {
    if (selection.start === null || selection.end !== null) onSelect({ start: q, end: null })
    else if (q === selection.start) onSelect({ start: null, end: null })
    else onSelect({ start: selection.start, end: q })
  }

  return (
    <section className="mt-6" data-testid="audit-day">
      <div className="flex items-center justify-between gap-2">
        <Button variant="ghost" size="icon" onClick={onPrev} disabled={!canPrev} aria-label="Day before">
          <ChevronLeft className="size-5" />
        </Button>
        <h2 className="text-base font-semibold" data-testid="audit-day-label">
          {dayLabel}
        </h2>
        <Button variant="ghost" size="icon" onClick={onNext} disabled={!canNext} aria-label="Day after">
          <ChevronRight className="size-5" />
        </Button>
      </div>

      {gaps.length > 0 && (
        <div className="sticky top-2 z-10 mt-2 flex items-center gap-2 rounded-xl border border-primary/40 bg-card p-2 shadow-sm">
          <Button className="flex-1" onClick={() => onAnswerSelection(gaps)} data-testid="audit-answer-selection">
            Answer these ({gaps.length})
          </Button>
          <Button variant="ghost" onClick={() => onSelect({ start: null, end: null })}>
            Clear
          </Button>
        </div>
      )}

      {quarters.length === 0 ? (
        <p className="mt-3 rounded-xl border border-border bg-card px-4 py-3 text-sm text-muted-foreground" data-testid="audit-day-empty">
          No quarters to answer yet on this day. The first one shows when it has ended.
        </p>
      ) : (
        <ul className="mt-2 divide-y divide-border overflow-hidden rounded-xl border border-border">
          {quarters.map((q) => {
            const slot = answered.get(q)
            if (slot) {
              return (
                <li key={q}>
                  <button
                    type="button"
                    onClick={() => onOpenAnswer(slot)}
                    className="flex min-h-11 w-full items-center gap-3 bg-card px-3 py-2 text-left hover:bg-muted/40"
                    data-testid="audit-row-answered"
                  >
                    <span className="w-24 shrink-0 text-sm tabular-nums text-muted-foreground">{quarterLabel(q, timezone)}</span>
                    <span className="min-w-0 flex-1 truncate text-sm">{slot.activity}</span>
                    <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                      E {slot.energy} · G {slot.growth}
                      {slot.pending && <span className="ml-1" title="Saved on this phone, not sent yet">⧗</span>}
                    </span>
                  </button>
                </li>
              )
            }
            const isChosen = chosen.has(q) || selection.start === q
            return (
              <li key={q}>
                <button
                  type="button"
                  onClick={() => tapGap(q)}
                  aria-pressed={isChosen}
                  className={cn(
                    "flex min-h-11 w-full items-center gap-3 px-3 py-2 text-left",
                    isChosen ? "bg-primary/15" : "bg-muted/30 hover:bg-muted/50",
                  )}
                  data-testid="audit-row-gap"
                >
                  <span className="w-24 shrink-0 text-sm tabular-nums text-muted-foreground">{quarterLabel(q, timezone)}</span>
                  <span className="text-sm text-muted-foreground">{isChosen ? "Selected" : "—"}</span>
                </button>
              </li>
            )
          })}
        </ul>
      )}
      <p className="mt-2 text-xs text-muted-foreground">Tap a gap, then another, to answer a stretch at once.</p>
    </section>
  )
}
