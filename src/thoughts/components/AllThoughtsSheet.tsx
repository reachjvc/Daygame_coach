"use client"

/**
 * EVERY THOUGHT, SEARCHABLE: the way to a thought that is not in the top
 * buttons, and to its own sheet. Archived thoughts sit below, folded.
 */

import { useMemo, useState } from "react"
import { Search } from "lucide-react"
import { BottomSheet } from "@/components/BottomSheet"
import { matchThoughts, sortForButtons } from "../thoughtsService"
import type { Thought } from "../types"

export function AllThoughtsSheet({
  open,
  thoughts,
  onClose,
  onOpen,
}: {
  open: boolean
  thoughts: Thought[]
  onClose: () => void
  onOpen: (t: Thought) => void
}) {
  const [query, setQuery] = useState("")
  const [showArchived, setShowArchived] = useState(false)

  const active = useMemo(() => {
    const sorted = sortForButtons(thoughts)
    return query.trim() ? matchThoughts(query, sorted, 50).filter((t) => !t.archived) : sorted
  }, [thoughts, query])
  const archived = thoughts.filter((t) => t.archived)

  const row = (t: Thought) => (
    <li key={t.id}>
      <button
        type="button"
        onClick={() => onOpen(t)}
        className="flex min-h-11 w-full items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-left hover:bg-muted"
      >
        <span className="min-w-0 break-words">
          {t.pinned && <span className="mr-1.5 text-xs text-primary">Pinned</span>}
          {t.text}
        </span>
        <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
          {t.counts.week} this week · {t.counts.total}
        </span>
      </button>
    </li>
  )

  return (
    <BottomSheet open={open} onClose={onClose} title={`All thoughts (${thoughts.length})`} testId="all-thoughts-sheet">
      <div className="space-y-3 pb-2">
        <label className="relative block">
          <span className="sr-only">Search your thoughts</span>
          <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search"
            className="min-h-11 w-full rounded-xl border border-border bg-input pl-10 pr-4 text-base focus-visible:border-ring focus-visible:outline-none"
          />
        </label>
        {active.length === 0 ? (
          <p className="px-1 text-sm text-muted-foreground">{query ? "No thought matches that." : "No thoughts yet."}</p>
        ) : (
          <ul className="-mx-1 divide-y divide-border">{active.map(row)}</ul>
        )}
        {archived.length > 0 && !query && (
          <div>
            <button type="button" onClick={() => setShowArchived((s) => !s)} className="min-h-11 px-1 text-sm text-muted-foreground underline underline-offset-4">
              {showArchived ? "Hide" : "Show"} archived ({archived.length})
            </button>
            {showArchived && <ul className="-mx-1 divide-y divide-border opacity-80">{archived.map(row)}</ul>}
          </div>
        )}
      </div>
    </BottomSheet>
  )
}
