"use client"

import { useMemo, useState } from "react"

import { filterCards, type RoleModelCardData } from "../format"
import { RoleModelCard } from "./RoleModelCard"

/**
 * Search and the category filter. It receives card fields only (from the server
 * page), never whole profiles, so the download stays small as the library grows.
 */
export function RoleModelGallery({
  cards,
  categories,
}: {
  cards: RoleModelCardData[]
  categories: Array<{ id: string; label: string }>
}) {
  const [query, setQuery] = useState("")
  const [category, setCategory] = useState<string | null>(null)
  const shown = useMemo(() => filterCards(cards, query, category), [cards, query, category])
  const present = categories.filter((c) => cards.some((card) => card.category === c.id))

  return (
    <div className="flex flex-col gap-4">
      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search a name or a value, like Courage"
        aria-label="Search role models by name or value"
        className="h-11 w-full rounded-lg border border-border bg-background px-3 text-base"
        data-testid="role-model-search"
      />
      <div className="flex flex-wrap gap-2" role="group" aria-label="Category">
        <FilterChip active={category === null} onClick={() => setCategory(null)} label="All" />
        {present.map((c) => (
          <FilterChip key={c.id} active={category === c.id} onClick={() => setCategory(c.id)} label={c.label} />
        ))}
      </div>
      <p className="text-sm text-muted-foreground" aria-live="polite" data-testid="role-model-count">
        {shown.length === 1 ? "1 person" : `${shown.length} people`}
      </p>
      {shown.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">Nobody matches that. Try another word.</p>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {shown.map((c) => (
            <RoleModelCard key={c.id} card={c} />
          ))}
        </div>
      )}
    </div>
  )
}

function FilterChip({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`min-h-9 rounded-full border px-3 text-sm ${
        active ? "border-primary bg-primary text-primary-foreground" : "border-border bg-background text-foreground"
      }`}
    >
      {label}
    </button>
  )
}
