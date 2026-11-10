"use client"

import { councilValueSuggestions } from "../councilTypes"
import { useCouncil } from "../hooks/useCouncil"

/**
 * "FROM YOUR COUNCIL" in the values step (Plans/role-models.md, Phase 8).
 *
 * Ali Abdaal's Method 4: the qualities of the people you admire. The values you
 * took from your council that are not yet in your list, each with who it came
 * from; one tap adds it the way any other suggestion is added.
 */
export function CouncilValues({ values, onAdd }: { values: string[]; onAdd: (value: string) => void }) {
  const { state } = useCouncil()
  if (state.status !== "ready") return null
  const names = Object.fromEntries(Object.values(state.people).map((p) => [p.id, p.name]))
  const offered = councilValueSuggestions(
    state.members.filter((m) => names[m.roleModelId]),
    names,
    values,
  )
  if (offered.length === 0) return null
  return (
    <div className="mt-2" data-testid="council-values">
      <p className="text-[11px] text-zinc-400">From your council</p>
      <div className="mt-1 flex flex-wrap gap-1.5">
        {offered.map((o) => (
          <button
            key={o.value}
            type="button"
            onClick={() => onAdd(o.value)}
            className="min-h-8 rounded-full border border-violet-400/30 px-2.5 text-[11.5px] text-violet-100 hover:bg-violet-500/10"
            data-testid={`council-value-${o.value.toLowerCase()}`}
          >
            + {o.value} <span className="text-zinc-500">· {o.from}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
