"use client"

/**
 * Session 5 — Install.
 *
 * Everything before this was written. This session is where it either fits in
 * a week or does not exist. The fit test is deliberately blunt: a goal with no
 * block in the week the user built themselves gets cut, not shrunk, because
 * shrinking is how five goals quietly become five things you are failing at.
 *
 * The prototype step is the only part of the process that leaves the room.
 * Introspection is reliably wrong about what a life feels like from inside it,
 * so the session ends by committing to one cheap real-world test.
 */

import { useState } from "react"
import { useSteppedFlow } from "@/src/shared/useSteppedFlow"
import {
  LDI_ACCOUNTABILITY_PROMPTS,
  LDI_CADENCES,
  LDI_CHECKIN_AGENDA,
  LDI_CHECKIN_MINUTES,
  LDI_FIT_TEST_STATEMENT,
  LDI_IDEAL_WEEK_PROMPT,
  LDI_PROTOTYPE_PROMPTS,
  LDI_SESSION_MAP,
  LDI_WEEK_DAYS,
  LDI_WEEK_SLOTS,
} from "@/src/goals/data/lifeDirection"
import * as ldi from "@/src/goals/lifeDirectionService"
import type { LdiPlan } from "@/src/goals/types"
import { SessionFrame } from "./SessionFrame"
import { Blocker, Chip, LineInput, Notice, Prompt, SessionHeading } from "./shared"

const STEPS = LDI_SESSION_MAP.install.steps

export function InstallSession({
  plan,
  onPlan,
  onExit,
}: {
  plan: LdiPlan
  onPlan: (fn: (p: LdiPlan) => LdiPlan) => void
  onExit: () => void
}) {
  const flow = useSteppedFlow(STEPS, STEPS[0])
  const [placing, setPlacing] = useState<{ day: string; slot: string } | null>(null)
  // Which failing goal is being given a slot without leaving the fit test.
  const [fixing, setFixing] = useState<string | null>(null)
  const failures = ldi.fitTestFailures(plan)
  const readyGoals = plan.goals.filter(ldi.goalReady)

  return (
    <SessionFrame
      sessionId="install"
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
          <SessionHeading title="Install" blurb="Put it in a week, and cut whatever does not fit." />
          <p className="text-sm text-muted-foreground">
            A plan that has never met a calendar is a wish. This session builds the week you would
            want, tries to fit your goals into it, and then makes you decide what happens to the
            ones that do not fit.
          </p>
        </div>
      ) : null}

      {flow.step === "idealweek" ? (
        <div className="space-y-4">
          <SessionHeading title="Your ideal ordinary week" blurb={LDI_IDEAL_WEEK_PROMPT} />
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] border-collapse text-sm">
              <thead>
                <tr>
                  <th className="border border-border p-2 text-left text-xs font-medium text-muted-foreground" />
                  {LDI_WEEK_DAYS.map((d) => (
                    <th
                      key={d.id}
                      className="border border-border p-2 text-left text-xs font-medium text-muted-foreground"
                    >
                      {d.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {LDI_WEEK_SLOTS.map((slot) => (
                  <tr key={slot.id}>
                    <th className="border border-border p-2 text-left text-xs font-medium text-muted-foreground">
                      {slot.label}
                    </th>
                    {LDI_WEEK_DAYS.map((day) => {
                      const blocks = ldi.blocksAt(plan, day.id, slot.id)
                      return (
                        <td key={day.id} className="border border-border p-1 align-top">
                          {blocks.map((b) => (
                            <button
                              key={b.id}
                              type="button"
                              title="Remove this block"
                              onClick={() => onPlan((p) => ldi.removeWeekBlock(p, b.id))}
                              className="mb-1 block w-full rounded bg-primary/10 px-1.5 py-1 text-left text-xs text-foreground hover:bg-destructive/10"
                            >
                              {b.label}
                            </button>
                          ))}
                          <button
                            type="button"
                            className="w-full rounded px-1.5 py-1 text-left text-xs text-muted-foreground hover:bg-muted"
                            onClick={() => setPlacing({ day: day.id, slot: slot.id })}
                          >
                            +
                          </button>
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {placing ? (
            <div className="space-y-3 rounded-md border border-border p-4">
              <p className="text-sm font-medium text-foreground">What goes here?</p>
              <div className="flex flex-wrap gap-2">
                {readyGoals.map((g) => (
                  <Chip
                    key={g.id}
                    active={false}
                    onClick={() => {
                      onPlan((p) =>
                        ldi.addWeekBlock(p, placing.day, placing.slot, g.title, g.id, 1),
                      )
                      setPlacing(null)
                    }}
                  >
                    {g.title}
                  </Chip>
                ))}
                <Chip
                  active={false}
                  onClick={() => {
                    onPlan((p) => ldi.addWeekBlock(p, placing.day, placing.slot, "Everything else", null, 1))
                    setPlacing(null)
                  }}
                >
                  Something else
                </Chip>
                <Chip active={false} onClick={() => setPlacing(null)}>
                  Cancel
                </Chip>
              </div>
              {readyGoals.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No finished goals yet, so there is nothing to place except everything else.
                </p>
              ) : null}
            </div>
          ) : null}
          <p className="text-sm text-muted-foreground">
            {plan.week.length} blocks, {ldi.weekHours(plan)} hours.
          </p>
        </div>
      ) : null}

      {flow.step === "fit" ? (
        <div className="space-y-4">
          <SessionHeading title="The fit test" blurb={LDI_FIT_TEST_STATEMENT} />
          {readyGoals.length === 0 ? (
            <Notice title="No finished goals to test">
              Finish a goal in the previous session first.
            </Notice>
          ) : failures.length === 0 ? (
            <Notice title="Everything fits">
              Every finished goal has a place in the week you built.
            </Notice>
          ) : (
            <div className="space-y-4">
              <Blocker title={`${failures.length} ${failures.length === 1 ? "goal does" : "goals do"} not fit`}>
                Two honest options for each: give it a slot, or cut it. Keeping it without a place
                in the week is the third option, and it is the one that quietly fails.
              </Blocker>
              {failures.map((g) => (
                <div key={g.id} className="space-y-3 rounded-md border border-border p-4">
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-sm font-medium text-foreground">{g.title}</p>
                    <button
                      type="button"
                      className="shrink-0 text-xs text-muted-foreground hover:text-destructive"
                      onClick={() => onPlan((p) => ldi.removeGoal(p, g.id))}
                    >
                      Cut this goal
                    </button>
                  </div>
                  {fixing === g.id ? (
                    <div className="space-y-2">
                      <p className="text-xs text-muted-foreground">Pick a slot.</p>
                      <div className="overflow-x-auto">
                        <table className="w-full min-w-[560px] border-collapse text-xs">
                          <thead>
                            <tr>
                              <th />
                              {LDI_WEEK_DAYS.map((d) => (
                                <th key={d.id} className="p-1 text-left font-medium text-muted-foreground">
                                  {d.label}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {LDI_WEEK_SLOTS.map((slot) => (
                              <tr key={slot.id}>
                                <th className="p-1 text-left font-medium text-muted-foreground">
                                  {slot.label}
                                </th>
                                {LDI_WEEK_DAYS.map((day) => (
                                  <td key={day.id} className="p-0.5">
                                    <button
                                      type="button"
                                      aria-label={`Place ${g.title} on ${day.label} ${slot.label}`}
                                      className="w-full rounded border border-border px-1 py-1 hover:border-primary hover:bg-primary/10"
                                      onClick={() => {
                                        onPlan((p) => ldi.addWeekBlock(p, day.id, slot.id, g.title, g.id, 1))
                                        setFixing(null)
                                      }}
                                    >
                                      +
                                    </button>
                                  </td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      <button
                        type="button"
                        className="text-xs text-muted-foreground hover:text-foreground"
                        onClick={() => setFixing(null)}
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      className="rounded-md border border-border px-3 py-2 text-sm text-foreground hover:bg-muted"
                      onClick={() => setFixing(g.id)}
                    >
                      Give it a slot
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      ) : null}

      {flow.step === "cadence" ? (
        <div className="space-y-4">
          <SessionHeading
            title="The loops"
            blurb="These are what re-surface everything you wrote. Without them this becomes a document you never open again."
          />
          {LDI_CADENCES.map((c) => (
            <div key={c.id} className="space-y-2 rounded-md border border-border p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-foreground">
                    {c.label}
                    <span className="ml-2 text-xs text-muted-foreground">about {c.minutes} min</span>
                  </p>
                  <p className="text-sm text-muted-foreground">{c.blurb}</p>
                </div>
                <Chip
                  active={plan.cadences.includes(c.id)}
                  onClick={() => onPlan((p) => ldi.toggleCadence(p, c.id))}
                >
                  {plan.cadences.includes(c.id) ? "Committed" : "Commit"}
                </Chip>
              </div>
              <ul className="list-disc space-y-1 pl-4 text-sm text-muted-foreground">
                {c.questions.map((q) => (
                  <li key={q}>{q}</li>
                ))}
              </ul>
            </div>
          ))}
          {!ldi.cadenceComplete(plan) ? (
            <Blocker title="The daily and weekly loops are not optional">
              The quarterly and annual reviews only work if something smaller keeps the plan in
              front of you between them.
            </Blocker>
          ) : null}
        </div>
      ) : null}

      {flow.step === "accountability" ? (
        <div className="space-y-5">
          <SessionHeading
            title="Who is checking"
            blurb="The single strongest predictor of whether any of this survives contact with a normal month."
          />
          <LineInput
            label={LDI_ACCOUNTABILITY_PROMPTS.who}
            value={plan.accountability.who}
            onChange={(v) => onPlan((p) => ldi.setAccountability(p, { who: v }))}
            placeholder="A name, not a category"
          />
          <LineInput
            label={LDI_ACCOUNTABILITY_PROMPTS.when}
            value={plan.accountability.when}
            onChange={(v) => onPlan((p) => ldi.setAccountability(p, { when: v }))}
          />
          <Prompt
            title={LDI_ACCOUNTABILITY_PROMPTS.what}
            rows={3}
            value={plan.accountability.what}
            onChange={(v) => onPlan((p) => ldi.setAccountability(p, { what: v }))}
          />
          <Notice title={`The check-in, about ${LDI_CHECKIN_MINUTES} minutes`}>
            <ul className="mt-1 list-disc space-y-1 pl-4">
              {LDI_CHECKIN_AGENDA.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
            <p className="mt-2">
              Unscripted accountability decays into catching up. Keep the agenda.
            </p>
          </Notice>
        </div>
      ) : null}

      {flow.step === "prototype" ? (
        <div className="space-y-5">
          <SessionHeading
            title="Test it against the world"
            blurb="Everything so far has happened inside your own head, which is the least reliable place to find out what a life is actually like."
          />
          {plan.prototypes.length === 0 ? (
            <button
              type="button"
              className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
              onClick={() => onPlan((p) => ldi.addPrototype(p))}
            >
              Plan a test
            </button>
          ) : null}
          {plan.prototypes.map((proto) => (
            <div key={proto.id} className="space-y-4 rounded-md border border-border p-4">
              <Prompt
                title={LDI_PROTOTYPE_PROMPTS.assumption}
                rows={3}
                value={proto.assumption}
                onChange={(v) => onPlan((p) => ldi.updatePrototype(p, proto.id, { assumption: v }))}
              />
              <Prompt
                title={LDI_PROTOTYPE_PROMPTS.test}
                rows={3}
                value={proto.test}
                onChange={(v) => onPlan((p) => ldi.updatePrototype(p, proto.id, { test: v }))}
              />
              <Prompt
                title={LDI_PROTOTYPE_PROMPTS.signal}
                rows={2}
                value={proto.signal}
                onChange={(v) => onPlan((p) => ldi.updatePrototype(p, proto.id, { signal: v }))}
              />
              <LineInput
                label={LDI_PROTOTYPE_PROMPTS.date}
                type="date"
                value={proto.date ?? ""}
                onChange={(v) => onPlan((p) => ldi.updatePrototype(p, proto.id, { date: v || null }))}
              />
              <button
                type="button"
                className="text-xs text-muted-foreground hover:text-destructive"
                onClick={() => onPlan((p) => ldi.removePrototype(p, proto.id))}
              >
                Remove
              </button>
            </div>
          ))}
        </div>
      ) : null}
    </SessionFrame>
  )
}
