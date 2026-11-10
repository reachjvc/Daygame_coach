"use client"

import Link from "next/link"

import type { RoleModelCardData } from "../format"
import { useCouncil } from "../hooks/useCouncil"
import { roleModelHref } from "../routes"
import { CouncilSettings } from "./CouncilSettings"
import { RoleModelVisual } from "./RoleModelVisual"

/**
 * "Your council" on top of the gallery, when it has members: each person with
 * the values you take from him, in your order. Move up, move down, remove.
 */
export function CouncilStrip({ cards }: { cards: RoleModelCardData[] }) {
  const { state, error, busy, remove, reorder } = useCouncil()
  if (state.status !== "ready" || state.members.length === 0) return null
  const byId = new Map(cards.map((c) => [c.id, c]))
  const members = state.members.filter((m) => byId.has(m.roleModelId))
  const order = members.map((m) => m.roleModelId)
  const move = (i: number, by: -1 | 1) => {
    const next = [...order]
    ;[next[i], next[i + by]] = [next[i + by], next[i]]
    void reorder(next)
  }

  return (
    <section className="flex flex-col gap-2 rounded-xl border border-primary/30 bg-card p-4" data-testid="council-strip">
      <h2 className="text-base font-semibold text-foreground">Your council</h2>
      <p className="text-xs text-muted-foreground">
        Seneca: keep a person of high character before your eyes, living as if he were watching you.
      </p>
      <ol className="flex flex-col gap-2">
        {members.map((m, i) => {
          const c = byId.get(m.roleModelId)!
          return (
            <li key={m.roleModelId} className="flex items-center gap-3" data-testid={`council-member-${m.roleModelId}`}>
              <RoleModelVisual name={c.name} years={c.years} color={c.color} size="small" />
              <Link href={roleModelHref(c.id)} className="min-w-0 flex-1">
                <span className="block text-sm font-medium text-foreground">{c.name}</span>
                <span className="block truncate text-xs text-muted-foreground">You take: {m.takenValues.join(", ")}</span>
              </Link>
              <button type="button" aria-label={`Move ${c.name} up`} disabled={busy || i === 0} onClick={() => move(i, -1)} className="min-h-10 min-w-10 rounded-lg border border-border text-sm disabled:opacity-30">
                ↑
              </button>
              <button type="button" aria-label={`Move ${c.name} down`} disabled={busy || i === members.length - 1} onClick={() => move(i, 1)} className="min-h-10 min-w-10 rounded-lg border border-border text-sm disabled:opacity-30">
                ↓
              </button>
              <button type="button" aria-label={`Remove ${c.name} from your council`} disabled={busy} onClick={() => void remove(m.roleModelId)} className="min-h-10 rounded-lg border border-border px-2 text-xs">
                Remove
              </button>
            </li>
          )
        })}
      </ol>
      {error && <p role="alert" className="text-sm text-red-400">{error}</p>}
      <CouncilSettings members={members} />
    </section>
  )
}
