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

import type { NsPlan } from "@/src/goals/types"
import { FOCUS_COPY } from "@/src/goals/data/northStar"
import { ONE_THING_KEY } from "@/src/goals/data/northStarStart"
import { answerOf } from "@/src/goals/northStarService"
import { SentenceBox } from "./SentenceBox"

export interface OneThingHandlers {
  onAnswer: (key: string, text: string) => void
}

export function OneThingCard({
  plan,
  handlers,
  title,
  help,
}: {
  plan: NsPlan
  handlers: OneThingHandlers
  title?: string
  help?: string
}) {
  return (
    <>
      <h2 className="text-sm font-semibold text-zinc-200">{title ?? FOCUS_COPY.oneTitle}</h2>
      <p className="text-[11.5px] text-zinc-400 mt-1 leading-relaxed">{help ?? FOCUS_COPY.oneHelp}</p>
      <div className="mt-3">
        <SentenceBox
          value={answerOf(plan, ONE_THING_KEY)}
          onChange={(text) => handlers.onAnswer(ONE_THING_KEY, text)}
          placeholder={FOCUS_COPY.onePlaceholder}
          label={FOCUS_COPY.oneWrite}
          rows={3}
        />
      </div>
    </>
  )
}
