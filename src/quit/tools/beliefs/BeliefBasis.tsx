"use client"

import { useState } from "react"
import { FoldSummary } from "../../components/kit"
import { tooltext as t } from "../../tooltext"
import type { QuitRef } from "../../types"
import { realRefs } from "../common"

interface Item {
  counted: string | null
  n?: string
  weak?: string | null
  refs: QuitRef[]
}

export interface Paper {
  cite: string
  url: string
  quotes: string[]
}

/** One entry per paper: refs with the same cite and link are joined, each quote kept once, in first-seen order. */
export function papersOf(refs: QuitRef[]): Paper[] {
  const out: Paper[] = []
  for (const r of refs) {
    let p = out.find((x) => x.cite === r.cite && x.url === r.url)
    if (!p) out.push((p = { cite: r.cite, url: r.url, quotes: [] }))
    if (r.quote && !p.quotes.includes(r.quote)) p.quotes.push(r.quote)
  }
  return out
}

function Sources({ refs }: { refs: QuitRef[] }) {
  const [open, setOpen] = useState(false)
  const papers = papersOf(refs)
  if (papers.length === 0) return null
  return (
    <div className="mt-2">
      <button type="button" aria-expanded={open} onClick={() => setOpen((o) => !o)} className="inline-flex min-h-11 items-center text-sm text-primary underline">
        {open ? t.common.hideSource : t.common.source}
      </button>
      {open && (
        <ul className="mt-1 flex flex-col gap-3 rounded-md border border-border bg-card p-3 text-sm">
          {papers.map((p) => (
            <li key={`${p.url}-${p.cite}`} data-testid="basis-paper">
              <p>{p.cite}</p>
              {p.quotes.map((q) => (
                <p key={q} className="mt-1 italic text-muted-foreground">{`“${q}”`}</p>
              ))}
              {p.url && (
                <a href={p.url} target="_blank" rel="noopener noreferrer" className="mt-1 inline-flex min-h-11 items-center break-all text-primary underline">
                  {t.common.openSource}
                </a>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

/**
 * The closed "Based on" fold of a belief or a fact: who was counted, how many, the caveat, then the sources
 * (one entry per paper, holding all its quotes).
 * One component for the lies test and the craving tool's voice tile, so the two never differ.
 * Facts have no caveat field, so they pass `caveat={false}`.
 */
export function BeliefBasis({ item, testId = "belief-basis", caveat = true }: { item: Item; testId?: string; caveat?: boolean }) {
  const weak = caveat ? item.weak : null
  return (
    <details data-testid={testId} className="group mt-1 text-sm">
      <FoldSummary>{t.common.basedOn}</FoldSummary>
      <dl className="flex flex-col gap-2">
        {item.counted && (
          <div>
            <dt className="text-muted-foreground">{t.common.basis.who}</dt>
            <dd data-testid="basis-who">{item.counted}</dd>
          </div>
        )}
        <div>
          <dt className="text-muted-foreground">{t.common.basis.n}</dt>
          <dd data-testid="basis-n">{item.n ?? t.common.basisNone}</dd>
        </div>
        {weak && (
          <div>
            <dt className="text-muted-foreground">{t.common.basis.caveat}</dt>
            <dd data-testid="basis-caveat">{weak}</dd>
          </div>
        )}
      </dl>
      <Sources refs={realRefs(item.refs)} />
    </details>
  )
}
