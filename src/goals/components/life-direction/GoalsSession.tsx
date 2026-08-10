"use client"

/**
 * Session 4 — Goal formation.
 *
 * Twelve fields per goal, in three groups. The count is deliberate: the two
 * widely-taught versions of this shape each leave out something the other
 * keeps, and the fields they disagree about are the ones that do the work.
 * Support and Adaptation get skipped by people who then have nobody to ask
 * and no idea what to do when it slips.
 *
 * The realism pair is the gate. Under the floor on either number, the goal
 * cannot be finished, and the message says to change the plan rather than
 * the number. That refusal is the point of the screen.
 */

import { useState } from "react"
import { useSteppedFlow } from "@/src/shared/useSteppedFlow"
import {
  LDI_AREA_MAP,
  LDI_GOAL_FIELDS,
  LDI_GOAL_GROUPS,
  LDI_LEAD_INDICATOR_PROMPT,
  LDI_PHRASING_HINTS,
  LDI_REALISM_FLOOR,
  LDI_REALISM_PROMPTS,
  LDI_SESSION_MAP,
  LDI_SURPRISE_MAX,
  LDI_SURPRISE_PROMPT,
} from "@/src/goals/data/lifeDirection"
import * as ldi from "@/src/goals/lifeDirectionService"
import type { LdiGoal, LdiPlan } from "@/src/goals/types"
import { SessionFrame } from "./SessionFrame"
import { AddRow, Blocker, LineInput, Notice, Prompt, Scale, SessionHeading } from "./shared"

const STEPS = LDI_SESSION_MAP.goals.steps

function phrasingHints(title: string): string[] {
  return LDI_PHRASING_HINTS.filter((h) => h.test.test(title)).map((h) => h.hint)
}

function GoalEditor({
  goal,
  onPlan,
}: {
  goal: LdiGoal
  onPlan: (fn: (p: LdiPlan) => LdiPlan) => void
}) {
  const gaps = ldi.goalGaps(goal)
  const blocked = ldi.realismBlocked(goal)
  const message = ldi.realismMessage(goal)
  const hints = phrasingHints(goal.title)

  return (
    <div className="space-y-5 rounded-md border border-border p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold text-foreground">{goal.title}</h3>
          <p className="text-xs text-muted-foreground">
            {LDI_AREA_MAP[goal.areaId]?.label ?? goal.areaId}
          </p>
        </div>
        <button
          type="button"
          className="shrink-0 text-xs text-muted-foreground hover:text-destructive"
          onClick={() => onPlan((p) => ldi.removeGoal(p, goal.id))}
        >
          Remove
        </button>
      </div>

      {hints.map((h) => (
        <Notice key={h} title="Worth rephrasing">
          {h}
        </Notice>
      ))}

      {LDI_GOAL_GROUPS.map((group) => (
        <div key={group.id} className="space-y-4">
          <h4 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            {group.label}
          </h4>
          {LDI_GOAL_FIELDS.filter((f) => f.group === group.id).map((field) => (
            <Prompt
              key={field.id}
              title={field.label}
              body={field.question}
              rows={3}
              value={goal.fields[field.id] ?? ""}
              onChange={(v) => onPlan((p) => ldi.setGoalField(p, goal.id, field.id, v))}
            />
          ))}
        </div>
      ))}

      <div className="space-y-4 border-t border-border pt-4">
        <h4 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Reality check
        </h4>
        <div className="space-y-1">
          <p className="text-sm text-foreground">{LDI_REALISM_PROMPTS.theory}</p>
          <input
            type="number"
            min={0}
            max={100}
            className="w-24 rounded-md border border-border bg-background p-2 text-sm text-foreground"
            value={goal.realismTheory ?? ""}
            onChange={(e) =>
              onPlan((p) =>
                ldi.updateGoal(p, goal.id, {
                  realismTheory: e.target.value === "" ? null : Number(e.target.value),
                }),
              )
            }
          />
        </div>
        <div className="space-y-1">
          <p className="text-sm text-foreground">{LDI_REALISM_PROMPTS.practice}</p>
          <input
            type="number"
            min={0}
            max={100}
            className="w-24 rounded-md border border-border bg-background p-2 text-sm text-foreground"
            value={goal.realismPractice ?? ""}
            onChange={(e) =>
              onPlan((p) =>
                ldi.updateGoal(p, goal.id, {
                  realismPractice: e.target.value === "" ? null : Number(e.target.value),
                }),
              )
            }
          />
        </div>
        {blocked && message ? <Blocker title="Below the floor">{message}</Blocker> : null}

        <div className="space-y-1">
          <p className="text-sm text-foreground">{LDI_SURPRISE_PROMPT}</p>
          <Scale
            min={0}
            max={LDI_SURPRISE_MAX}
            value={goal.surpriseIfFailed}
            onChange={(v) => onPlan((p) => ldi.updateGoal(p, goal.id, { surpriseIfFailed: v }))}
            lowLabel="Not at all surprised"
            highLabel="Astonished"
          />
          {goal.surpriseIfFailed !== null && goal.surpriseIfFailed <= 3 ? (
            <p className="text-sm text-muted-foreground">
              You would not be surprised to fail at this. That is worth sitting with before you
              commit a year to it.
            </p>
          ) : null}
        </div>

        <LineInput
          label={LDI_LEAD_INDICATOR_PROMPT}
          value={goal.leadIndicator}
          onChange={(v) => onPlan((p) => ldi.updateGoal(p, goal.id, { leadIndicator: v }))}
          placeholder="A number you could count every week"
        />
      </div>

      {gaps.length > 0 ? (
        <p className="text-sm text-muted-foreground">Still missing: {gaps.join(", ")}.</p>
      ) : blocked ? null : (
        <p className="text-sm text-foreground">Finished.</p>
      )}
    </div>
  )
}

export function GoalsSession({
  plan,
  onPlan,
  onExit,
}: {
  plan: LdiPlan
  onPlan: (fn: (p: LdiPlan) => LdiPlan) => void
  onExit: () => void
}) {
  const flow = useSteppedFlow(STEPS, STEPS[0])
  const [openAreaId, setOpenAreaId] = useState<string | null>(null)
  const warnings = ldi.coherenceWarnings(plan)

  return (
    <SessionFrame
      sessionId="goals"
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
          <SessionHeading title="Goal formation" blurb="Turn each one into something specific enough to fail at." />
          <p className="text-sm text-muted-foreground">
            One finished goal for each area you are carrying. Twelve fields each, which is more
            than feels necessary, and the ones that feel unnecessary are the ones people skip and
            then wish they had not: who is helping, what you will do when it slips, and what you
            are refusing to sacrifice to get it.
          </p>
        </div>
      ) : null}

      {flow.step === "build" ? (
        <div className="space-y-6">
          <SessionHeading title="Your goals" />
          {plan.portfolioAreaIds.length === 0 ? (
            <Notice title="Nothing chosen yet">
              Go back to the converge session and pick what you are carrying.
            </Notice>
          ) : null}
          {plan.portfolioAreaIds.map((areaId) => {
            const goals = ldi.goalsInArea(plan, areaId)
            return (
              <div key={areaId} className="space-y-3">
                <div className="flex items-baseline justify-between gap-3 border-b border-border pb-2">
                  <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                    {LDI_AREA_MAP[areaId]?.label ?? areaId}
                  </h3>
                  {plan.celebrations[areaId] ? (
                    <span className="text-xs text-muted-foreground">
                      Celebrating: {plan.celebrations[areaId]}
                    </span>
                  ) : null}
                </div>
                {goals.map((g) => (
                  <GoalEditor key={g.id} goal={g} onPlan={onPlan} />
                ))}
                {openAreaId === areaId ? (
                  <AddRow
                    placeholder="What is the goal?"
                    buttonLabel="Create"
                    onAdd={(t) => {
                      onPlan((p) => ldi.addGoal(p, areaId, t))
                      setOpenAreaId(null)
                    }}
                  />
                ) : (
                  <button
                    type="button"
                    className="rounded-md border border-border px-3 py-2 text-sm text-muted-foreground hover:text-foreground"
                    onClick={() => setOpenAreaId(areaId)}
                  >
                    Add a goal here
                  </button>
                )}
              </div>
            )
          })}
        </div>
      ) : null}

      {flow.step === "review" ? (
        <div className="space-y-5">
          <SessionHeading
            title="Does this hang together?"
            blurb="Warnings, not blocks. You are allowed to want something that does not match what you said you value. You just have to look at it."
          />
          {warnings.length === 0 ? (
            <Notice title="Nothing contradicts itself">
              Your goals line up with your values, your focus areas and your constraints.
            </Notice>
          ) : (
            warnings.map((w) => (
              <Notice key={w.id} title={w.title}>
                {w.message}
              </Notice>
            ))
          )}
          <div className="space-y-2 border-t border-border pt-4">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Status
            </h3>
            {plan.goals.map((g) => (
              <p key={g.id} className="text-sm">
                <span className="text-foreground">{g.title}</span>{" "}
                <span className="text-muted-foreground">
                  {ldi.goalReady(g)
                    ? "finished"
                    : ldi.realismBlocked(g)
                      ? `below the ${LDI_REALISM_FLOOR}% floor`
                      : `${ldi.goalGaps(g).length} fields left`}
                </span>
              </p>
            ))}
          </div>
        </div>
      ) : null}
    </SessionFrame>
  )
}
