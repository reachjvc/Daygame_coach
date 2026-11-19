"use client"

import { SourceTap } from "../../components/kit"
import { tooltext as t } from "../../tooltext"
import type { QuitRef } from "../../types"
import { realRefs } from "../common"

interface Item {
  counted: string | null
  n?: string
  weak?: string | null
  refs: QuitRef[]
}

/**
 * The closed "Based on" fold of a belief or a fact: who was counted, how many, the caveat, then the sources.
 * One component for the lies test and the craving tool's voice tile, so the two never differ.
 * Facts have no caveat field, so they pass `caveat={false}`.
 */
export function BeliefBasis({ item, testId = "belief-basis", caveat = true }: { item: Item; testId?: string; caveat?: boolean }) {
  const weak = caveat ? item.weak : null
  return (
    <details data-testid={testId} className="mt-1 text-sm">
      <summary className="flex min-h-11 cursor-pointer items-center font-medium">{t.common.basedOn}</summary>
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
      <SourceTap refs={realRefs(item.refs)} />
    </details>
  )
}
