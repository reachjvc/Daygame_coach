"use client"

/**
 * Session 1 — Reflect.
 *
 * The prompts run in a fixed order because the first one changes the quality
 * of all the others: walking the calendar month by month recovers the year
 * that actually happened, rather than the compressed version everyone
 * remembers, which is mostly the last six weeks.
 */

import { useSteppedFlow } from "@/src/shared/useSteppedFlow"
import {
  LDI_DOMAINS,
  LDI_FOCUS_INSTRUCTION,
  LDI_REFLECT_PROMPTS,
  LDI_SESSION_MAP,
  areasInDomain,
} from "@/src/goals/data/lifeDirection"
import * as ldi from "@/src/goals/lifeDirectionService"
import type { LdiPlan } from "@/src/goals/types"
import { SessionFrame } from "./SessionFrame"
import { Chip, Notice, Prompt, SessionHeading } from "./shared"

const STEPS = LDI_SESSION_MAP.reflect.steps

export function ReflectSession({
  plan,
  onPlan,
  onExit,
}: {
  plan: LdiPlan
  onPlan: (fn: (p: LdiPlan) => LdiPlan) => void
  onExit: () => void
}) {
  const flow = useSteppedFlow(STEPS, STEPS[0])

  return (
    <SessionFrame
      sessionId="reflect"
      stepId={flow.step}
      stepIndex={flow.stepIndex}
      stepCount={STEPS.length}
      isFirst={flow.isFirst}
      isLast={flow.isLast}
      onBack={flow.goBack}
      onNext={flow.goNext}
      onExit={onExit}
      plan={plan}
    >
      {flow.step === "intro" ? (
        <div className="space-y-4">
          <SessionHeading title="Reflect" blurb="Walk back through the year before you try to plan the next one." />
          <p className="text-sm text-muted-foreground">
            Do the first prompt properly and the rest get easier. Open a calendar, go month by
            month, and write down what actually happened before you try to summarise it.
          </p>
        </div>
      ) : null}

      {flow.step === "prompts" ? (
        <div className="space-y-6">
          <SessionHeading title="The year behind you" />
          {LDI_REFLECT_PROMPTS.map((prompt) => (
            <Prompt
              key={prompt.id}
              title={prompt.title}
              body={prompt.body}
              minutes={prompt.minutes}
              value={plan.reflect[prompt.id] ?? ""}
              onChange={(v) => onPlan((p) => ldi.setReflect(p, prompt.id, v))}
            />
          ))}
        </div>
      ) : null}

      {flow.step === "focus" ? (
        <div className="space-y-5">
          <SessionHeading title="What to work on" blurb={LDI_FOCUS_INSTRUCTION} />
          <Notice title="Not automatically the lowest score">
            A low rating in an area you genuinely do not care about is not a problem to solve.
            Pick the one where the gap actually bothers you.
          </Notice>
          {LDI_DOMAINS.map((domain) => (
            <div key={domain.id} className="space-y-2">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                {domain.label}
              </h3>
              <div className="flex flex-wrap gap-2">
                {areasInDomain(domain.id).map((area) => {
                  const rating = plan.wheel[area.id]
                  return (
                    <Chip
                      key={area.id}
                      active={plan.focusAreaIds.includes(area.id)}
                      onClick={() => onPlan((p) => ldi.toggleFocusArea(p, area.id))}
                    >
                      {area.label}
                      {typeof rating === "number" ? (
                        <span className="ml-1.5 text-xs text-muted-foreground">{rating}/10</span>
                      ) : null}
                    </Chip>
                  )
                })}
              </div>
            </div>
          ))}
          <p className="text-sm text-muted-foreground">
            One per domain. Choosing a second in the same domain replaces the first.
          </p>
          <Notice title="These carry forward">
            What you pick here becomes the starting point for what you actually take on later,
            so you will not be asked to choose your areas twice.
          </Notice>
        </div>
      ) : null}
    </SessionFrame>
  )
}
