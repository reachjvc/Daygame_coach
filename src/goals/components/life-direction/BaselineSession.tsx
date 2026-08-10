"use client"

/**
 * Session 0 — Baseline.
 *
 * Four pieces, and the fourth is the one that matters later: the constraints
 * declared here are what the budget check and the fit test measure against.
 * Everything downstream that refuses to proceed refuses on the strength of a
 * number the user typed on this screen.
 *
 * The assessment runs one dimension per screen. Twenty statements with five
 * buttons each on a single page was the first real thing anybody saw, and it
 * read as a form to endure rather than a question worth answering.
 */

import { useSteppedFlow } from "@/src/shared/useSteppedFlow"
import {
  LDI_AREAS,
  LDI_CONSTRAINT_PROMPTS,
  LDI_ENERGY_MARKS,
  LDI_ENERGY_PROMPT,
  LDI_INTAKE_DIMENSIONS,
  LDI_INTAKE_ITEMS,
  LDI_INTAKE_SCALE,
  LDI_SESSION_MAP,
  LDI_WHEEL_QUESTION,
  LDI_WHEEL_SCALE_MAX,
  LDI_WHEEL_SCALE_MIN,
  type LdiIntakeDimension,
} from "@/src/goals/data/lifeDirection"
import * as ldi from "@/src/goals/lifeDirectionService"
import type { LdiPlan } from "@/src/goals/types"
import { SessionFrame } from "./SessionFrame"
import { AddRow, ChoiceRow, LineInput, Notice, Prompt, Scale, SessionHeading } from "./shared"

const STEPS = LDI_SESSION_MAP.baseline.steps

const DIMENSION_FOR_STEP: Record<string, LdiIntakeDimension> = {
  "intake-vision": "vision",
  "intake-prioritisation": "prioritisation",
  "intake-systems": "systems",
  "intake-presence": "presence",
}

const DIMENSION_BLURB: Record<LdiIntakeDimension, string> = {
  vision: "Whether you know where you are going.",
  prioritisation: "Whether you can choose between good options.",
  systems: "Whether the important things happen without you deciding each time.",
  presence: "Whether any of it feels good while it is happening.",
}

export function BaselineSession({
  plan,
  onPlan,
  onExit,
}: {
  plan: LdiPlan
  onPlan: (fn: (p: LdiPlan) => LdiPlan) => void
  onExit: () => void
}) {
  const flow = useSteppedFlow(STEPS, STEPS[0])
  const scores = ldi.intakeScores(plan)
  const weakest = ldi.weakestDimension(plan)
  const dimension = DIMENSION_FOR_STEP[flow.step]

  return (
    <SessionFrame
      sessionId="baseline"
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
          <SessionHeading
            title="Baseline"
            blurb="Where you actually are, before you decide where you are going."
          />
          <p className="text-sm text-muted-foreground">
            Four things: a short assessment, a rating of each part of your life, an audit of
            where your time actually went, and the limits you are working inside. The last one
            is the one the rest of this process leans on, so answer it honestly rather than
            optimistically.
          </p>
          <p className="text-sm text-muted-foreground">
            Nothing here is scored against anyone else, and nothing is shared.
          </p>
        </div>
      ) : null}

      {dimension ? (
        <div className="space-y-5">
          <SessionHeading
            title={LDI_INTAKE_DIMENSIONS[dimension]}
            blurb={DIMENSION_BLURB[dimension]}
          />
          <p className="text-sm text-muted-foreground">
            Answer for how things are, not how you would like them to be.
          </p>
          {LDI_INTAKE_ITEMS.filter((i) => i.dimension === dimension).map((item) => (
            <div key={item.id} className="space-y-2">
              <p className="text-sm text-foreground">{item.text}</p>
              <ChoiceRow
                options={LDI_INTAKE_SCALE.map((label, i) => ({ id: String(i), label }))}
                value={typeof plan.intake[item.id] === "number" ? String(plan.intake[item.id]) : null}
                onChange={(id) => onPlan((p) => ldi.setIntakeAnswer(p, item.id, Number(id)))}
              />
            </div>
          ))}
          {flow.step === "intake-presence" && ldi.intakeComplete(plan) ? (
            <Notice title="Your baseline">
              <ul className="mt-1 space-y-0.5">
                {(Object.keys(LDI_INTAKE_DIMENSIONS) as LdiIntakeDimension[]).map((dim) => (
                  <li key={dim}>
                    {LDI_INTAKE_DIMENSIONS[dim]}: {scores[dim]}%
                  </li>
                ))}
              </ul>
              {weakest ? (
                <p className="mt-2">
                  Weakest: {LDI_INTAKE_DIMENSIONS[weakest]}. Worth remembering when you choose
                  what to work on.
                </p>
              ) : null}
            </Notice>
          ) : null}
        </div>
      ) : null}

      {flow.step === "wheel" ? (
        <div className="space-y-6">
          <SessionHeading title="Where you are" blurb={LDI_WHEEL_QUESTION} />
          <Notice title="This is not a satisfaction score">
            You are not rating how happy you are with this part of your life. You are rating
            whether what you currently do points where you want it to go. Someone can be content
            and badly misaligned, and that combination is the one worth catching.
          </Notice>
          {LDI_AREAS.map((area) => (
            <div key={area.id} className="space-y-2">
              <div>
                <p className="text-sm font-medium text-foreground">{area.label}</p>
                <p className="text-xs text-muted-foreground">{area.sublabel}</p>
              </div>
              <Scale
                min={LDI_WHEEL_SCALE_MIN}
                max={LDI_WHEEL_SCALE_MAX}
                value={typeof plan.wheel[area.id] === "number" ? plan.wheel[area.id] : null}
                onChange={(v) => onPlan((p) => ldi.setWheelRating(p, area.id, v))}
                lowLabel="Pointing the wrong way"
                highLabel="Fully aligned"
              />
            </div>
          ))}
        </div>
      ) : null}

      {flow.step === "energy" ? (
        <div className="space-y-4">
          <SessionHeading title="Energy audit" blurb={LDI_ENERGY_PROMPT} />
          <AddRow
            placeholder="Something that took up your time"
            onAdd={(t) => onPlan((p) => ldi.addEnergyEntry(p, t))}
          />
          <ul className="space-y-3">
            {plan.energy.map((entry) => (
              <li key={entry.id} className="space-y-2 rounded-md border border-border p-3">
                <div className="flex items-start justify-between gap-3">
                  <span className="text-sm text-foreground">{entry.label}</span>
                  <button
                    type="button"
                    className="shrink-0 text-xs text-muted-foreground hover:text-destructive"
                    onClick={() => onPlan((p) => ldi.removeEnergyEntry(p, entry.id))}
                  >
                    Remove
                  </button>
                </div>
                <ChoiceRow
                  options={LDI_ENERGY_MARKS.map((m) => ({ id: m.id, label: m.label }))}
                  value={entry.mark}
                  onChange={(id) => onPlan((p) => ldi.markEnergyEntry(p, entry.id, id as never))}
                />
              </li>
            ))}
          </ul>
          {plan.energy.length < ldi.LDI_ENERGY_MIN_ENTRIES ? (
            <p className="text-sm text-muted-foreground">
              {ldi.LDI_ENERGY_MIN_ENTRIES} entries is the bar for a fortnight to say anything
              useful. If yours was genuinely quieter than that, you can carry on regardless.
            </p>
          ) : null}
        </div>
      ) : null}

      {flow.step === "constraints" ? (
        <div className="space-y-5">
          <SessionHeading
            title="What you are working inside"
            blurb="The plan you build later gets measured against these. Understate the hours and you will build something you cannot run."
          />
          <LineInput
            label={LDI_CONSTRAINT_PROMPTS.weeklyHours}
            type="number"
            value={plan.constraints.weeklyHours === null ? "" : String(plan.constraints.weeklyHours)}
            onChange={(v) =>
              onPlan((p) => ldi.setConstraints(p, { weeklyHours: v === "" ? null : Number(v) }))
            }
            placeholder="Hours per week"
          />
          <Prompt
            title={LDI_CONSTRAINT_PROMPTS.money}
            rows={2}
            value={plan.constraints.money}
            onChange={(v) => onPlan((p) => ldi.setConstraints(p, { money: v }))}
          />
          <Prompt
            title={LDI_CONSTRAINT_PROMPTS.dependants}
            rows={2}
            value={plan.constraints.dependants}
            onChange={(v) => onPlan((p) => ldi.setConstraints(p, { dependants: v }))}
          />
          <Prompt
            title={LDI_CONSTRAINT_PROMPTS.health}
            rows={2}
            value={plan.constraints.health}
            onChange={(v) => onPlan((p) => ldi.setConstraints(p, { health: v }))}
          />
          <Prompt
            title={LDI_CONSTRAINT_PROMPTS.nonNegotiables}
            rows={2}
            value={plan.constraints.nonNegotiables}
            onChange={(v) => onPlan((p) => ldi.setConstraints(p, { nonNegotiables: v }))}
          />
        </div>
      ) : null}
    </SessionFrame>
  )
}
