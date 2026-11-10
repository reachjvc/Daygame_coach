import Link from "next/link"

import type { RoleModelCardData } from "../format"
import { roleModelHref } from "../routes"
import { RoleModelVisual } from "./RoleModelVisual"

/**
 * One person in the gallery. Fixed size, and the whole card is one link to the
 * profile, so it works the same by touch, keyboard and mouse. Nothing appears
 * only on hover (D7).
 */
export function RoleModelCard({ card }: { card: RoleModelCardData }) {
  return (
    <Link
      href={roleModelHref(card.id)}
      className="flex h-44 gap-4 rounded-xl border border-border bg-card p-4 text-left outline-none hover:border-primary/60 focus-visible:ring-2 focus-visible:ring-primary"
      data-testid={`role-model-card-${card.id}`}
    >
      <RoleModelVisual name={card.name} years={card.years} color={card.color} />
      <div className="flex min-w-0 flex-1 flex-col">
        <span className="text-base font-semibold text-foreground">{card.name}</span>
        <span className="text-xs text-muted-foreground">{card.categoryLabel}</span>
        <span className="mt-1 line-clamp-2 text-sm text-foreground/80">{card.tagline}</span>
        <span className="mt-auto flex flex-wrap gap-1">
          {card.values.map((v) => (
            <span key={v} className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
              {v}
            </span>
          ))}
        </span>
      </div>
    </Link>
  )
}
