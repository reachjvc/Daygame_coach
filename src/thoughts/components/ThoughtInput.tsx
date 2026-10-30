"use client"

/**
 * THE TYPE BOX: a new thought, unless it is one you already have.
 *
 * As you type, existing thoughts that match are offered first ("im bad" offers
 * "I am bad"), so near-copies do not pile up (src/thoughts/thoughtsService.ts,
 * `matchThoughts`). Enter, or the button, logs it: an existing thought with the
 * same words is logged rather than duplicated. Words about self-harm open the
 * help card, without blocking anything (Q14).
 */

import { useMemo, useState } from "react"
import { Plus } from "lucide-react"
import { cn } from "@/lib/utils"
import { MAX_THOUGHT_LENGTH, matchThoughts, needsHelpCard, normalizeThought } from "../thoughtsService"
import type { Thought } from "../types"
import { ThoughtHelpCard } from "./ThoughtHelpCard"

export function ThoughtInput({
  thoughts,
  onLogExisting,
  onLogNew,
  placeholder = "What did you just think?",
  autoFocus = false,
}: {
  thoughts: Thought[]
  onLogExisting: (t: Thought) => void
  onLogNew: (text: string) => void
  placeholder?: string
  autoFocus?: boolean
}) {
  const [text, setText] = useState("")
  const [helpDismissed, setHelpDismissed] = useState(false)

  const suggestions = useMemo(() => matchThoughts(text, thoughts), [text, thoughts])
  const exact = suggestions.find((t) => normalizeThought(t.text) === normalizeThought(text)) ?? null
  const showHelp = !helpDismissed && needsHelpCard(text)
  const canAdd = normalizeThought(text).length > 0

  const submit = () => {
    if (!canAdd) return
    if (exact) onLogExisting(exact)
    else onLogNew(text)
    setText("")
  }

  return (
    <div className="space-y-2">
      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault()
          submit()
        }}
      >
        <label htmlFor="thought-input" className="sr-only">
          Type a thought
        </label>
        <input
          id="thought-input"
          data-testid="thought-input"
          value={text}
          autoFocus={autoFocus}
          maxLength={MAX_THOUGHT_LENGTH}
          autoComplete="off"
          enterKeyHint="done"
          placeholder={placeholder}
          onChange={(e) => {
            setText(e.target.value)
            if (!needsHelpCard(e.target.value)) setHelpDismissed(false)
          }}
          className="min-h-12 min-w-0 flex-1 rounded-xl border border-border bg-input px-4 text-base placeholder:text-muted-foreground focus-visible:border-ring focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
        />
        <button
          type="submit"
          disabled={!canAdd}
          aria-label={exact ? `Log "${exact.text}"` : "Add and log this thought"}
          className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground transition-opacity disabled:opacity-40"
        >
          <Plus className="size-5" />
        </button>
      </form>

      {suggestions.length > 0 && (
        <div role="list" aria-label="Thoughts you already have" className="space-y-1.5" data-testid="thought-suggestions">
          <p className="text-xs text-muted-foreground">You already have:</p>
          {suggestions.map((t) => (
            <button
              key={t.id}
              type="button"
              role="listitem"
              onClick={() => {
                onLogExisting(t)
                setText("")
              }}
              className={cn(
                "flex min-h-11 w-full items-center justify-between gap-3 rounded-xl border px-3.5 py-2 text-left text-[15px]",
                "border-primary/30 bg-primary/[0.07] hover:bg-primary/15",
              )}
            >
              <span className="min-w-0 break-words">{t.text}</span>
              <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                {t.counts.today} today{t.archived ? " · archived" : ""}
              </span>
            </button>
          ))}
        </div>
      )}

      {showHelp && <ThoughtHelpCard onDismiss={() => setHelpDismissed(true)} />}
    </div>
  )
}
