"use client"

/**
 * Session 3 — Converge.
 *
 * Diverge first, then narrow. The dream dump runs on a timer and asks for
 * volume, because a list written under time pressure surfaces things a
 * considered list edits out. Only afterwards does anything get tagged,
 * chosen, or costed.
 *
 * Choosing what you are carrying comes BEFORE writing what you want to
 * celebrate. The other order produced celebrations for areas that never got
 * a goal, and goals with nothing written above them.
 *
 * The budget step is where this stops being a writing exercise. Hours are
 * finite, they were declared in session 0, and the flow will not let the
 * allocation exceed them.
 */

import { useEffect, useState } from "react"
import { useSteppedFlow } from "@/src/shared/useSteppedFlow"
import {
  LDI_AREA_MAP,
  LDI_BUDGET_PROMPT,
  LDI_CELEBRATION_PROMPT,
  LDI_DREAM_CATEGORIES,
  LDI_DREAM_MINUTES,
  LDI_DREAM_PROMPT,
  LDI_HORIZONS,
  LDI_PORTFOLIO_MAX,
  LDI_PORTFOLIO_MIN,
  LDI_PORTFOLIO_SEEDED_NOTE,
  LDI_SESSION_MAP,
  LDI_WHEEL_AREAS,
} from "@/src/goals/data/lifeDirection"
import * as ldi from "@/src/goals/lifeDirectionService"
import type { LdiPlan } from "@/src/goals/types"
import { SessionFrame } from "./SessionFrame"
import { AddRow, Blocker, Chip, Notice, Prompt, SessionHeading } from "./shared"

const STEPS = LDI_SESSION_MAP.converge.steps

/** A visible timer for the divergent step. Counts down, never blocks. */
function DreamTimer() {
  const [secondsLeft, setSecondsLeft] = useState(LDI_DREAM_MINUTES * 60)
  const [running, setRunning] = useState(false)

  useEffect(() => {
    if (!running || secondsLeft <= 0) return
    const t = setTimeout(() => setSecondsLeft((s) => s - 1), 1000)
    return () => clearTimeout(t)
  }, [running, secondsLeft])

  const mins = Math.floor(secondsLeft / 60)
  const secs = secondsLeft % 60

  return (
    <div className="flex items-center gap-3 rounded-md border border-border px-3 py-2">
      <span className="font-mono text-lg tabular-nums text-foreground">
        {mins}:{String(secs).padStart(2, "0")}
      </span>
      <button
        type="button"
        className="rounded-md border border-border px-3 py-1.5 text-sm hover:bg-muted"
        onClick={() => setRunning((r) => !r)}
      >
        {running ? "Pause" : "Start"}
      </button>
      <button
        type="button"
        className="text-sm text-muted-foreground hover:text-foreground"
        onClick={() => {
          setRunning(false)
          setSecondsLeft(LDI_DREAM_MINUTES * 60)
        }}
      >
        Reset
      </button>
      {secondsLeft === 0 ? (
        <span className="text-sm text-foreground">Time. Stop writing.</span>
      ) : null}
    </div>
  )
}

export function ConvergeSession({
  plan,
  onPlan,
  onExit,
}: {
  plan: LdiPlan
  onPlan: (fn: (p: LdiPlan) => LdiPlan) => void
  onExit: () => void
}) {
  const flow = useSteppedFlow(STEPS, STEPS[0])
  const remaining = ldi.budgetRemaining(plan)
  const over = ldi.budgetOverAllocated(plan)
  const seeded = plan.portfolioAreaIds.length > 0 && plan.focusAreaIds.length > 0

  // Carry the earlier choice forward rather than asking for it a second time.
  // Idempotent and only ever fills an empty portfolio, so a deliberate
  // emptying is not undone on the next visit.
  useEffect(() => {
    if (flow.step === "portfolio") onPlan((p) => ldi.seedPortfolioFromFocus(p))
  }, [flow.step, onPlan])

  return (
    <SessionFrame
      sessionId="converge"
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
          <SessionHeading title="Converge" blurb="Everything you wrote, narrowed to what you will actually carry." />
          <p className="text-sm text-muted-foreground">
            This session goes wide and then deliberately cuts. The cutting is not a failure of
            ambition. Carrying more than a handful of live pursuits is how a plan turns into a
            list of things you feel guilty about.
          </p>
        </div>
      ) : null}

      {flow.step === "dreams" ? (
        <div className="space-y-4">
          <SessionHeading title={LDI_DREAM_PROMPT} blurb="Volume, not quality. Do not edit. Do not judge. Just list." />
          <DreamTimer />
          <p className="text-sm text-muted-foreground">
            Stuck? Try: {LDI_DREAM_CATEGORIES.map((c) => c.label).join(", ")}.
          </p>
          <AddRow placeholder="I want to…" onAdd={(t) => onPlan((p) => ldi.addDream(p, t))} />
          <ul className="space-y-1">
            {plan.dreams.map((d) => (
              <li key={d.id} className="flex items-center justify-between gap-3 text-sm">
                <span className="text-foreground">{d.text}</span>
                <button
                  type="button"
                  aria-label={`Remove ${d.text}`}
                  className="shrink-0 text-xs text-muted-foreground hover:text-destructive"
                  onClick={() => onPlan((p) => ldi.removeDream(p, d.id))}
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
          <p className="text-sm text-muted-foreground">
            {plan.dreams.length} written. {ldi.LDI_DREAM_MIN} is the minimum before this is worth
            narrowing.
          </p>
        </div>
      ) : null}

      {flow.step === "horizons" ? (
        <div className="space-y-4">
          <SessionHeading
            title="When"
            blurb="Tag each one with the horizon it belongs to. Tagging before choosing keeps the ten-year things from being crowded out by the one-year things."
          />
          {plan.dreams.length === 0 ? (
            <Notice title="Nothing to tag yet">Go back and list some first.</Notice>
          ) : null}
          <ul className="space-y-3">
            {plan.dreams.map((d) => (
              <li key={d.id} className="space-y-2 rounded-md border border-border p-3">
                <p className="text-sm text-foreground">{d.text}</p>
                <div className="flex flex-wrap gap-2">
                  {LDI_HORIZONS.map((h) => (
                    <Chip
                      key={h}
                      active={d.horizonYears === h}
                      onClick={() => onPlan((p) => ldi.updateDream(p, d.id, { horizonYears: h }))}
                    >
                      {h} {h === 1 ? "year" : "years"}
                    </Chip>
                  ))}
                </div>
              </li>
            ))}
          </ul>
          <p className="text-sm text-muted-foreground">
            {ldi.dreamsTagged(plan)} of {plan.dreams.length} tagged.
          </p>
        </div>
      ) : null}

      {flow.step === "portfolio" ? (
        <div className="space-y-4">
          <SessionHeading
            title="What you are actually carrying"
            blurb={`Between ${LDI_PORTFOLIO_MIN} and ${LDI_PORTFOLIO_MAX} active areas. Everything else waits, which is different from never.`}
          />
          {seeded ? <Notice title="Carried over">{LDI_PORTFOLIO_SEEDED_NOTE}</Notice> : null}
          <div className="flex flex-wrap gap-2">
            {LDI_WHEEL_AREAS.map((area) => {
              const active = plan.portfolioAreaIds.includes(area.id)
              const full = !active && plan.portfolioAreaIds.length >= LDI_PORTFOLIO_MAX
              const wasFocus = plan.focusAreaIds.includes(area.id)
              return (
                <Chip
                  key={area.id}
                  active={active}
                  disabled={full}
                  onClick={() => onPlan((p) => ldi.togglePortfolioArea(p, area.id))}
                >
                  {area.label}
                  {wasFocus ? (
                    <span className="ml-1.5 text-xs text-muted-foreground">chosen earlier</span>
                  ) : null}
                </Chip>
              )
            })}
          </div>
          <p className="text-sm text-muted-foreground">
            {plan.portfolioAreaIds.length} chosen.
            {plan.portfolioAreaIds.length >= LDI_PORTFOLIO_MAX
              ? " That is the cap. Remove one before adding another."
              : ""}
          </p>
          <p className="text-sm text-muted-foreground">
            Dropping an area here also removes anything you wrote for it further on, so it does
            not linger as a goal with nothing behind it.
          </p>
        </div>
      ) : null}

      {flow.step === "celebrate" ? (
        <div className="space-y-5">
          <SessionHeading title="Twelve months from now" blurb={LDI_CELEBRATION_PROMPT} />
          {plan.portfolioAreaIds.length === 0 ? (
            <Notice title="Nothing chosen yet">
              Go back a step and pick the areas you are carrying.
            </Notice>
          ) : null}
          {plan.portfolioAreaIds.map((areaId) => (
            <Prompt
              key={areaId}
              title={LDI_AREA_MAP[areaId]?.label ?? areaId}
              body={LDI_AREA_MAP[areaId]?.sublabel}
              rows={3}
              value={plan.celebrations[areaId] ?? ""}
              onChange={(v) => onPlan((p) => ldi.setCelebration(p, areaId, v))}
            />
          ))}
        </div>
      ) : null}

      {flow.step === "budget" ? (
        <div className="space-y-4">
          <SessionHeading title="Hours" blurb={LDI_BUDGET_PROMPT} />
          {plan.constraints.weeklyHours === null ? (
            <Blocker title="You have not said how many hours you have">
              Go back to the baseline session and answer that first. Without it there is nothing
              to measure this against.
            </Blocker>
          ) : (
            <>
              <div className="space-y-3">
                {plan.portfolioAreaIds.map((areaId) => (
                  <div key={areaId} className="flex items-center justify-between gap-4">
                    <label className="text-sm text-foreground" htmlFor={`budget-${areaId}`}>
                      {LDI_AREA_MAP[areaId]?.label ?? areaId}
                    </label>
                    <input
                      id={`budget-${areaId}`}
                      type="number"
                      min={0}
                      className="w-24 rounded-md border border-border bg-background p-2 text-sm text-foreground"
                      value={plan.budget[areaId] ?? 0}
                      onChange={(e) => onPlan((p) => ldi.setBudget(p, areaId, Number(e.target.value)))}
                    />
                  </div>
                ))}
              </div>
              <div
                className="h-2 w-full overflow-hidden rounded-full bg-muted"
                role="progressbar"
                aria-valuenow={ldi.budgetTotal(plan)}
                aria-valuemin={0}
                aria-valuemax={plan.constraints.weeklyHours}
                aria-label="Hours allocated"
              >
                <div
                  className={`h-full rounded-full transition-all ${over ? "bg-destructive" : "bg-primary"}`}
                  style={{
                    width: `${Math.min(100, (ldi.budgetTotal(plan) / plan.constraints.weeklyHours) * 100)}%`,
                  }}
                />
              </div>
              <p className="text-sm text-muted-foreground">
                {ldi.budgetTotal(plan)} of {plan.constraints.weeklyHours} hours allocated.
                {remaining !== null && remaining >= 0 ? ` ${remaining} left.` : ""}
              </p>
              {over ? (
                <Blocker title="You are spending hours you do not have">
                  This is the trade-off the wheel was pointing at. Something has to come down, or
                  something has to come out of the portfolio. Both are real answers. Pretending
                  the week is longer than it is, is not.
                </Blocker>
              ) : null}
            </>
          )}
        </div>
      ) : null}
    </SessionFrame>
  )
}
