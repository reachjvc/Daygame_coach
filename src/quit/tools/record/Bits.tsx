"use client"

import { useState } from "react"
import { recordText as t } from "./text"

/** Where a default price comes from: one short line, the rest behind "More". Typed prices say "Your own price." */
export function PriceBasis({ unitId, typed, testId }: { unitId: string; typed: boolean; testId: string }) {
  const [more, setMore] = useState(false)
  if (typed) return <span data-testid={testId}>{t.priceOwn}</span>
  const b = t.priceBasis[unitId]
  if (!b) return null
  return (
    <span className="flex flex-col gap-1">
      <span data-testid={testId} className="break-words">
        {b.short}
      </span>
      {more && (
        <span data-testid={`${testId}-more`} className="break-words">
          {b.more}
        </span>
      )}
      <button type="button" data-testid={`${testId}-toggle`} aria-expanded={more} onClick={() => setMore((m) => !m)} className="inline-flex min-h-11 min-w-11 items-center self-start text-primary underline">
        {more ? t.priceLess : t.priceMore}
      </button>
    </span>
  )
}
