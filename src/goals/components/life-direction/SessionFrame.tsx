"use client"

/**
 * The chrome every session sits inside.
 *
 * It exists to fix three things that made the first build hard to finish:
 * you could not tell where you were inside a two-hour session, the list of
 * what was still missing sat below the fold underneath the Next button, and
 * Next said nothing when you skipped a screen without answering it.
 *
 * The nav deliberately does not block. This is a process spread over days,
 * and trapping somebody on a screen because they want to sleep on one
 * question is how a ten-hour flow gets abandoned at hour two. It says what is
 * blank, changes the button to admit it, and lets them past.
 */

import { useState } from "react"
import { Check, ChevronDown, ChevronRight, Circle } from "lucide-react"
import { LDI_SESSION_MAP, type LdiSessionId } from "@/src/goals/data/lifeDirection"
import * as ldi from "@/src/goals/lifeDirectionService"
import type { LdiPlan } from "@/src/goals/types"

export function SessionFrame({
  sessionId,
  stepId,
  stepIndex,
  stepCount,
  isFirst,
  isLast,
  onBack,
  onNext,
  onExit,
  plan,
  children,
}: {
  sessionId: LdiSessionId
  stepId: string
  stepIndex: number
  stepCount: number
  isFirst: boolean
  isLast: boolean
  onBack: () => void
  onNext: () => void
  onExit: () => void
  plan: LdiPlan
  children: React.ReactNode
}) {
  const def = LDI_SESSION_MAP[sessionId]
  const checks = ldi.sessionChecks(plan, sessionId)
  const doneCount = checks.filter((c) => c.ok).length
  const gaps = ldi.stepGaps(plan, sessionId, stepId)
  const [open, setOpen] = useState(false)

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <div className="flex items-baseline justify-between gap-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {def.title}
          </p>
          <p className="text-xs text-muted-foreground">
            Step {stepIndex + 1} of {stepCount}
          </p>
        </div>

        <div
          className="h-1 w-full overflow-hidden rounded-full bg-muted"
          role="progressbar"
          aria-valuenow={stepIndex + 1}
          aria-valuemin={1}
          aria-valuemax={stepCount}
          aria-label={`Step ${stepIndex + 1} of ${stepCount}`}
        >
          <div
            className="h-full rounded-full bg-primary transition-all"
            style={{ width: `${((stepIndex + 1) / stepCount) * 100}%` }}
          />
        </div>

        <div className="rounded-md border border-border">
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            aria-expanded={open}
            className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left"
          >
            <span className="text-sm text-foreground">
              {doneCount === checks.length
                ? "Everything this session needs is done"
                : `${doneCount} of ${checks.length} done in this session`}
            </span>
            {open ? (
              <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
            ) : (
              <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
            )}
          </button>
          {open ? (
            <ul className="space-y-1.5 border-t border-border px-3 py-2">
              {checks.map((c) => (
                <li key={c.id} className="flex items-center gap-2 text-sm">
                  {c.ok ? (
                    <Check className="h-4 w-4 shrink-0 text-primary" />
                  ) : (
                    <Circle className="h-4 w-4 shrink-0 text-muted-foreground/40" />
                  )}
                  <span className={c.ok ? "text-foreground" : "text-muted-foreground"}>
                    {c.label}
                  </span>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      </div>

      {children}

      {gaps.length > 0 ? (
        <p className="rounded-md border border-border bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
          Not finished yet. This screen still needs:{" "}
          {gaps.map((g) => g.charAt(0).toLowerCase() + g.slice(1)).join("; ")}. You can move on and
          come back to it.
        </p>
      ) : null}

      <div className="flex items-center justify-between border-t border-border pt-4">
        <button
          type="button"
          onClick={onBack}
          disabled={isFirst}
          className="rounded-md px-3 py-2 text-sm text-muted-foreground transition hover:text-foreground disabled:invisible"
        >
          Back
        </button>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onExit}
            className="rounded-md px-3 py-2 text-sm text-muted-foreground transition hover:text-foreground"
          >
            Save and leave
          </button>
          {isLast ? (
            <button
              type="button"
              onClick={onExit}
              className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition hover:opacity-90"
            >
              Finish session
            </button>
          ) : (
            <button
              type="button"
              onClick={onNext}
              className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition hover:opacity-90"
            >
              {gaps.length > 0 ? "Next anyway" : "Next"}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
