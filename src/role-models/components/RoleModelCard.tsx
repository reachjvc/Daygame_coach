import Link from "next/link"

import type { RoleModelCardData } from "../format"
import { roleModelHref } from "../routes"

/**
 * One person in the gallery, in the look of the old test gallery
 * (/test/role-models) the owner liked: a dark card with a band in the
 * category's colour, big initials, the name, and value words in their life
 * plan colours. Fixed size, and the whole card is one link, so it works the
 * same by touch, keyboard and mouse. Hover only adds a glow; nothing appears
 * only on hover (D7). The picture itself is still the one placeholder until
 * the look is decided (D6): when it is, the band is where it goes.
 */
export function RoleModelCard({ card }: { card: RoleModelCardData }) {
  const c = card.color
  return (
    <Link
      href={roleModelHref(card.id)}
      className="group flex flex-col overflow-hidden rounded-xl border border-white/10 bg-gradient-to-b from-zinc-800/50 to-zinc-900 text-left outline-none transition-[border-color,box-shadow] duration-300 hover:border-[var(--cat)] hover:shadow-[0_8px_32px_var(--cat-glow)] focus-visible:ring-2 focus-visible:ring-[var(--cat)]"
      style={{ ["--cat" as string]: `${c}99`, ["--cat-glow" as string]: `${c}33` }}
      data-testid={`role-model-card-${card.id}`}
    >
      <div
        className="relative flex h-28 items-center justify-center"
        style={{ background: `linear-gradient(135deg, ${c}40, ${c}14)`, borderBottom: `1px solid ${c}66` }}
        aria-hidden="true"
      >
        <span className="text-5xl font-bold opacity-60" style={{ color: c }}>
          {card.initials}
        </span>
        <span className="absolute right-3 top-2 text-[11px] text-white/45">{card.years}</span>
        <div className="absolute inset-x-0 bottom-0 h-10 bg-gradient-to-b from-transparent to-zinc-900/80" />
      </div>
      <div className="flex flex-1 flex-col p-4 pt-3">
        <span className="text-base font-bold text-white">{card.name}</span>
        <span className="text-xs" style={{ color: c }}>
          {card.categoryLabel}
        </span>
        <span className="mt-2 line-clamp-2 text-sm italic leading-snug text-white/60">{card.tagline}</span>
        <span className="mt-auto flex flex-wrap gap-1.5 pt-3">
          {card.values.map((v, i) => {
            const vc = card.valueColors[i] ?? "#94a3b8"
            return (
              <span
                key={v}
                className="rounded border px-2 py-0.5 text-xs"
                style={{ backgroundColor: `${vc}1f`, borderColor: `${vc}55`, color: vc }}
              >
                {v}
              </span>
            )
          })}
        </span>
      </div>
    </Link>
  )
}
