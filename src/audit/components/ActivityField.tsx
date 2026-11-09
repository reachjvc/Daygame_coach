"use client"

/**
 * WHAT YOU DID, with suggestions that finish your words (D-SUGGEST).
 *
 * Empty: your six most frequent activities as chips. While typing: past
 * activities matching the words up to the cursor. A chip replaces the field.
 */

import { useMemo, useRef, useState } from "react"
import { ACTIVITY_MAX } from "../auditService"
import { applySuggestion, matchActivities, topActivities, type ActivityCount } from "../suggestService"

export function ActivityField({
  value,
  onChange,
  suggestions,
  id,
  invalid = false,
}: {
  value: string
  onChange: (v: string) => void
  suggestions: readonly ActivityCount[]
  id: string
  /** Save was tapped with this empty: the field is marked (alpha picky-eye-20). */
  invalid?: boolean
}) {
  const input = useRef<HTMLInputElement>(null)
  const [cursor, setCursor] = useState<number | null>(null)

  const chips = useMemo(() => {
    const before = value.slice(0, cursor ?? value.length)
    if (!before.trim()) return topActivities(suggestions)
    return matchActivities(before, suggestions).filter((s) => s.activity !== value)
  }, [value, cursor, suggestions])

  return (
    <div className="min-w-0">
      <label htmlFor={id} className={invalid ? "text-sm font-medium text-destructive" : "text-sm font-medium"}>
        What you did
      </label>
      <input
        ref={input}
        id={id}
        value={value}
        maxLength={ACTIVITY_MAX}
        autoComplete="off"
        enterKeyHint="done"
        placeholder="Email, gym, daygame…"
        onChange={(e) => {
          onChange(e.target.value)
          setCursor(e.target.selectionStart)
        }}
        onSelect={(e) => setCursor((e.target as HTMLInputElement).selectionStart)}
        aria-invalid={invalid || undefined}
        className={`mt-1.5 h-11 w-full min-w-0 rounded-lg border ${invalid ? "border-destructive" : "border-border"} bg-background px-3 text-base outline-none focus-visible:ring-2 focus-visible:ring-ring/50`}
        data-testid="audit-activity"
      />
      {chips.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5" data-testid="audit-chips">
          {chips.map((c) => (
            <button
              key={c.activity}
              type="button"
              onClick={() => {
                const next = applySuggestion(value, cursor ?? value.length, c.activity)
                onChange(next.text)
                setCursor(next.cursor)
                input.current?.focus()
              }}
              className="h-11 max-w-full truncate rounded-full border border-border bg-background/60 px-3.5 text-sm hover:bg-muted/50"
            >
              {c.activity}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
