"use client"

/**
 * The one thing: a question, and a box.
 *
 * There used to be a list under this — the person's own sentences from the
 * pages before, ranked and offered to click. It is gone, and what replaced it
 * is nothing. A row of plausible answers under the most important question in
 * the flow is a nudge to pick rather than to think, and the sentence somebody
 * picks is not the sentence they would have written.
 */

import { FOCUS_COPY } from "@/src/goals/data/northStar"
import { OneThingBox } from "./OneThingBox"
import type { OneThingAccount } from "./useOneThing"

/** The other answers on this step — the why, the cost, the identity — are still
 *  written into the plan. Only the sentence itself has moved to the account. */
export interface OneThingHandlers {
  onAnswer: (key: string, text: string) => void
}

export function OneThingCard({
  account,
  title,
  help,
}: {
  account: OneThingAccount
  title?: string
  help?: string
}) {
  return (
    <>
      <h2 className="text-sm font-semibold text-zinc-200">{title ?? FOCUS_COPY.oneTitle}</h2>
      <p className="text-[11.5px] text-zinc-400 mt-1 leading-relaxed">{help ?? FOCUS_COPY.oneHelp}</p>
      {/* The box reads and writes the account. There is no draft in the plan
          any more: one sentence, one place, so no screen can show a stale copy
          of it and no step can be scored against one. */}
      <OneThingBox account={account} />
    </>
  )
}
