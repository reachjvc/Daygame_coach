"use client"

/**
 * "LOGGED", WITH UNDO, AND THE REFRAME AT THE MOMENT IT MATTERS.
 *
 * After a tap: what was counted and how often today, and Undo for a few
 * seconds. When the thought has a reframe, the reframe is shown here too and
 * stays longer: every recurrence becomes a moment of practising the new
 * sentence, which is the point of reframing (Plans/thought.md).
 */

import { useEffect } from "react"
import type { LoggedNotice as Notice } from "../hooks/useThoughts"

const SHOW_MS = 5000
const SHOW_WITH_REFRAME_MS = 9000

export function LoggedNotice({
  notice,
  onUndo,
  onDone,
}: {
  notice: Notice | null
  onUndo: (n: Notice) => void
  onDone: () => void
}) {
  useEffect(() => {
    if (!notice) return
    const t = setTimeout(onDone, notice.reframe ? SHOW_WITH_REFRAME_MS : SHOW_MS)
    return () => clearTimeout(t)
  }, [notice, onDone])

  if (!notice) return null
  const counted = notice.thoughtId === null ? "Answered: nothing notable" : `${notice.text} · ${notice.today} today`

  return (
    <div
      className="pointer-events-none fixed inset-x-0 bottom-[calc(4rem+env(safe-area-inset-bottom)+0.75rem)] z-50 flex justify-center px-4 sm:bottom-6"
      data-testid="logged-notice"
    >
      <div
        key={notice.seq}
        role="status"
        aria-live="polite"
        className="pointer-events-auto w-full max-w-md rounded-2xl border border-border bg-card/95 px-4 py-3 shadow-xl backdrop-blur motion-safe:animate-[thought-rise_180ms_ease-out]"
      >
        <div className="flex items-center justify-between gap-3">
          <p className="min-w-0 text-sm">
            <span className="text-muted-foreground">Logged </span>
            <span className="break-words font-medium">{counted}</span>
          </p>
          <button
            type="button"
            onClick={() => onUndo(notice)}
            className="min-h-11 shrink-0 rounded-lg px-3 text-sm font-semibold text-primary hover:bg-primary/10"
          >
            Undo
          </button>
        </div>
        {notice.reframe && (
          <p className="mt-1 border-t border-border pt-2 text-sm leading-relaxed text-foreground/90" data-testid="logged-reframe">
            <span className="mb-0.5 block text-xs uppercase tracking-wide text-primary">Your reframe</span>
            {notice.reframe}
          </p>
        )}
      </div>
    </div>
  )
}
