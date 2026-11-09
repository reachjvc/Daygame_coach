"use client"

import type { DueCard } from "@/src/goals/dueNowService"
import { DUE_COPY } from "@/src/goals/data/northStar"

/**
 * DUE NOW, on top of Today (Plans/life-plan-after-setup.md, Phase 3).
 *
 * At most three cards; each opens its place, and "Not now" hides it until its
 * period changes. Two sibling buttons per row, never one inside the other.
 */
export function DueNow({ cards, onGo, onHide }: { cards: DueCard[]; onGo: (c: DueCard) => void; onHide: (c: DueCard) => void }) {
  if (cards.length === 0) return null
  return (
    <section data-testid="due-now" className="rounded-2xl border border-violet-400/25 bg-violet-500/[0.05] px-5 py-4">
      <h2 className="text-sm font-semibold text-violet-100">{DUE_COPY.heading}</h2>
      <ul className="mt-3 space-y-2">
        {cards.map((c) => (
          <li key={c.key} data-testid={`due-${c.kind}`} className="flex items-center gap-2">
            <button type="button" className="flex-1 min-w-0 text-left" onClick={() => onGo(c)}>
              <span className="block text-[13px] text-zinc-100">{c.title}</span>
              <span className="block text-[11.5px] text-zinc-400">{c.detail}</span>
            </button>
            <button type="button" className="shrink-0 text-[11px] text-zinc-500 hover:text-zinc-200" onClick={() => onHide(c)}>
              {c.kind === "new-year" ? DUE_COPY.done : DUE_COPY.notNow}
            </button>
          </li>
        ))}
      </ul>
    </section>
  )
}
