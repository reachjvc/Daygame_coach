"use client"

import { useMemo, useState } from "react"

import { filterCards, type RoleModelCardData } from "../format"
import { RoleModelCard } from "./RoleModelCard"

type GalleryCategory = { id: string; label: string; description: string; color: string }

/**
 * Search, the category filter, and one section per category with its colour
 * bar, as in the old test gallery. It receives card fields only (from the
 * server page), never whole profiles, so the download stays small.
 */
export function RoleModelGallery({
  cards,
  categories,
}: {
  cards: RoleModelCardData[]
  categories: GalleryCategory[]
}) {
  const [query, setQuery] = useState("")
  const [category, setCategory] = useState<string | null>(null)
  const shown = useMemo(() => filterCards(cards, query, category), [cards, query, category])
  const present = categories.filter((c) => cards.some((card) => card.category === c.id))
  const sections = present
    .map((c) => ({ cat: c, people: shown.filter((card) => card.category === c.id) }))
    .filter((s) => s.people.length > 0)

  return (
    <div className="flex flex-col gap-4">
      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search a name or a value, like Courage"
        aria-label="Search role models by name or value"
        className="h-11 w-full rounded-xl border border-white/10 bg-zinc-900 px-4 text-base text-white placeholder:text-white/30 focus:border-white/30 focus:outline-none"
        data-testid="role-model-search"
      />
      <div className="flex flex-wrap gap-2" role="group" aria-label="Category">
        <FilterChip active={category === null} onClick={() => setCategory(null)} label={`All (${cards.length})`} />
        {present.map((c) => (
          <FilterChip
            key={c.id}
            active={category === c.id}
            onClick={() => setCategory(c.id)}
            label={`${c.label} (${cards.filter((card) => card.category === c.id).length})`}
            color={c.color}
          />
        ))}
      </div>
      <p className="text-sm text-white/40" aria-live="polite" data-testid="role-model-count">
        {shown.length === 1 ? "1 person" : `${shown.length} people`}
      </p>
      {sections.length === 0 ? (
        <p className="py-8 text-center text-sm text-white/40">Nobody matches that. Try another word.</p>
      ) : (
        sections.map(({ cat, people }) => (
          <section key={cat.id} className="mb-6" data-testid={`role-model-section-${cat.id}`}>
            <div className="mb-4">
              <div className="flex items-center gap-3">
                <div className="h-8 w-1 rounded-full" style={{ backgroundColor: cat.color }} />
                <h2 className="text-2xl font-bold text-white">{cat.label}</h2>
                <span className="text-sm text-white/30">({people.length})</span>
              </div>
              <p className="ml-4 pl-3 text-sm text-white/50">{cat.description}</p>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {people.map((c) => (
                <RoleModelCard key={c.id} card={c} />
              ))}
            </div>
          </section>
        ))
      )}
    </div>
  )
}

function FilterChip({
  active,
  onClick,
  label,
  color,
}: {
  active: boolean
  onClick: () => void
  label: string
  color?: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`min-h-9 rounded-lg px-3 text-sm font-medium ${
        active ? (color ? "text-white" : "bg-white text-zinc-900") : "bg-zinc-800 text-white/60 hover:bg-zinc-700 hover:text-white"
      }`}
      style={active && color ? { backgroundColor: color } : undefined}
    >
      {label}
    </button>
  )
}
