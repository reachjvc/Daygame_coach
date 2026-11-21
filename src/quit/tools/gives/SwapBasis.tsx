"use client"

import { useState } from "react"
import { tooltext as t } from "../../tooltext"
import type { QuitRef, QuitSwap } from "../../types"
import { realRefs } from "../common"

/** A closed "Based on" fold for a sourced swap: who, how many, caveat, then the quotes and links. A "Not tested" swap draws nothing. */
export function SwapBasis({ swap }: { swap: QuitSwap }) {
  const [open, setOpen] = useState(false)
  if (swap.evidence === "none") return null
  const refs: QuitRef[] = realRefs(swap.refs)
  // One cite and one link per paper, with each of its quotes under it.
  const groups: { cite: string; url?: string; quotes: string[] }[] = []
  for (const r of refs) {
    const g = groups.find((x) => x.cite === r.cite && x.url === r.url)
    if (g) {
      if (r.quote) g.quotes.push(r.quote)
    } else groups.push({ cite: r.cite, url: r.url, quotes: r.quote ? [r.quote] : [] })
  }
  const rows: [string, string | undefined][] = [
    [t.common.basis.who, swap.counted],
    [t.common.basis.n, swap.n],
    [t.common.basis.caveat, swap.weak],
  ]
  return (
    <div data-testid="swap-basis" className="mt-1">
      <button type="button" data-testid="swap-basis-toggle" aria-expanded={open} onClick={() => setOpen(!open)} className="inline-flex min-h-11 min-w-11 items-center justify-start px-0 text-sm text-primary underline">
        {open ? t.gives.basisClose : t.gives.basisOpen}
      </button>
      {open && (
        <div data-testid="swap-basis-detail" className="rounded-md border border-border bg-background p-3 text-sm">
          <dl className="flex flex-col gap-1 text-muted-foreground">
            {rows.map(([k, v]) => (
              <div key={k} data-testid={`basis-${k}`}>
                <dt className="inline font-medium text-foreground">{k}: </dt>
                <dd className="inline">{v ?? "Not stated"}</dd>
              </div>
            ))}
          </dl>
          <ul className="mt-2 flex flex-col gap-3">
            {groups.map((g) => (
              <li key={`${g.url}-${g.cite}`}>
                <p>{g.cite}</p>
                {g.quotes.map((q) => (
                  <p key={q} className="mt-1 italic text-muted-foreground">{`“${q}”`}</p>
                ))}
                {g.url && (
                  <a href={g.url} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center text-primary underline">
                    {t.common.openSource}
                  </a>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
