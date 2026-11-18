"use client"

import { checkedTag } from "../tools/common"
import { tooltext as t } from "../tooltext"
import type { QuitNumber } from "../types"
import { CountedLine, SourceTap } from "./kit"

const BASIS_KEYS = ["design", "who", "n", "where", "when", "measured"] as const

/** One checked number: figure, headline, who was counted, tag, chips, fold. */
export function NumberCard({ n, big = false }: { n: QuitNumber; big?: boolean }) {
  const tag = checkedTag(n)
  return (
    <article data-testid={`number-${n.kind}`} className="rounded-lg border border-border bg-card p-4">
      <p className={`${big ? "text-5xl" : "text-3xl"} font-semibold leading-tight text-primary`}>{n.big}</p>
      <p className="mt-2 text-base leading-snug">{n.headline}</p>
      <CountedLine text={n.counted} />
      <div className="mt-2 flex flex-wrap gap-2">
        <span data-testid="tag-checked" className="rounded-full border border-border px-2.5 py-0.5 text-xs font-medium">
          {t.tags[tag]}
        </span>
        {n.projection && <span className="rounded-full border border-amber-500 px-2.5 py-0.5 text-xs font-medium text-amber-500">{t.chips.projection}</span>}
        {n.pooled && <span className="rounded-full border border-amber-500 px-2.5 py-0.5 text-xs font-medium text-amber-500">{t.chips.pooled}</span>}
      </div>
      {n.weak && <p className="mt-2 text-sm text-muted-foreground">{n.weak}</p>}
      <details className="mt-2 text-sm">
        <summary className="flex min-h-11 cursor-pointer items-center font-medium">{t.common.basedOn}</summary>
        <dl className="flex flex-col gap-2">
          {BASIS_KEYS.map((k) => (
            <div key={k}>
              <dt className="text-muted-foreground">{t.common.basis[k]}</dt>
              <dd>{n.basis[k]}</dd>
            </div>
          ))}
          {n.caveat && (
            <div>
              <dt className="text-muted-foreground">{t.common.basis.caveat}</dt>
              <dd>{n.caveat}</dd>
            </div>
          )}
        </dl>
      </details>
      <SourceTap refs={[n.ref, ...(n.alsoRef ?? [])]} />
    </article>
  )
}
