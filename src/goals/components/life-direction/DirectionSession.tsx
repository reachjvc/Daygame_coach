"use client"

/**
 * Session 2 — Direction. The long one.
 *
 * Five angles on the same question, because the question does not survive
 * being asked once.
 *
 * Each of the three futures gets its own screen, then a screen that does
 * nothing but compare them. Writing three lives and scoring them on one page
 * means the third gets scored against a memory of the first, which is exactly
 * the comparison the exercise is supposed to make honest.
 */

import { useSteppedFlow } from "@/src/shared/useSteppedFlow"
import {
  LDI_EULOGY_STEMS,
  LDI_FEAR_PROMPTS,
  LDI_LEGACY_PROMPTS,
  LDI_NORTH_STAR_PROMPTS,
  LDI_ODYSSEY_KINDS,
  LDI_ODYSSEY_SCORES,
  LDI_ODYSSEY_SCORE_MAX,
  LDI_ODYSSEY_TEST,
  LDI_SESSION_MAP,
} from "@/src/goals/data/lifeDirection"
import { AWAY_SUGGESTIONS, detectValueConflicts } from "@/src/goals/data/valuesFramework"
import * as ldi from "@/src/goals/lifeDirectionService"
import type { LdiPlan } from "@/src/goals/types"
import { SessionFrame } from "./SessionFrame"
import { AddRow, Chip, Notice, Prompt, Scale, SessionHeading } from "./shared"

const STEPS = LDI_SESSION_MAP.direction.steps

const ODYSSEY_STEP_INDEX: Record<string, number> = {
  "odyssey-current": 0,
  "odyssey-alternative": 1,
  "odyssey-unconstrained": 2,
}

export function DirectionSession({
  plan,
  onPlan,
  onExit,
}: {
  plan: LdiPlan
  onPlan: (fn: (p: LdiPlan) => LdiPlan) => void
  onExit: () => void
}) {
  const flow = useSteppedFlow(STEPS, STEPS[0])
  const question = ldi.currentValueQuestion(plan)
  const leaders = ldi.odysseyLeaders(plan)
  const conflicts = detectValueConflicts(plan.values.ranked, plan.values.away)
  const odysseyIndex = ODYSSEY_STEP_INDEX[flow.step]

  return (
    <SessionFrame
      sessionId="direction"
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
          <SessionHeading title="Direction" blurb="The long session. Give it a real sitting, or split it across two." />
          <p className="text-sm text-muted-foreground">
            You will answer versions of the same question five times: what do you actually want.
            The repetition is the method. The first answer is usually the one you think you are
            supposed to give, and the fourth is usually the true one.
          </p>
          <Notice title="This one is worth doing slowly">
            About two and a half hours. Everything saves, so leaving halfway through and coming
            back tomorrow costs you nothing.
          </Notice>
        </div>
      ) : null}

      {flow.step === "northstar" ? (
        <div className="space-y-6">
          <SessionHeading title="Direction questions" />
          {LDI_NORTH_STAR_PROMPTS.map((prompt) => (
            <Prompt
              key={prompt.id}
              title={prompt.title}
              body={prompt.body}
              minutes={prompt.minutes}
              rows={6}
              value={plan.northStar[prompt.id] ?? ""}
              onChange={(v) => onPlan((p) => ldi.setNorthStar(p, prompt.id, v))}
            />
          ))}
        </div>
      ) : null}

      {flow.step === "legacy" ? (
        <div className="space-y-6">
          <SessionHeading title="Looking back from the end" />
          {LDI_LEGACY_PROMPTS.map((prompt) => (
            <Prompt
              key={prompt.id}
              title={prompt.title}
              body={prompt.body}
              minutes={prompt.minutes}
              value={plan.legacy[prompt.id] ?? ""}
              onChange={(v) => onPlan((p) => ldi.setLegacy(p, prompt.id, v))}
            />
          ))}
        </div>
      ) : null}

      {flow.step === "eulogy" ? (
        <div className="space-y-4">
          <SessionHeading
            title="Finish the sentences"
            blurb={`Stems rather than a blank page, because the blank page is where people write nothing. At least ${ldi.LDI_EULOGY_MIN} of the ten. Skip any that do not fit.`}
          />
          <div className="space-y-3">
            {LDI_EULOGY_STEMS.map((stem, i) => (
              <div key={stem} className="space-y-1">
                <p className="text-sm text-muted-foreground">{stem}…</p>
                <input
                  className="w-full rounded-md border border-border bg-background p-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring"
                  value={plan.eulogy[String(i)] ?? ""}
                  onChange={(e) => onPlan((p) => ldi.setEulogyStem(p, i, e.target.value))}
                  aria-label={stem}
                />
              </div>
            ))}
          </div>
          <p className="text-sm text-muted-foreground">
            {ldi.eulogyAnswered(plan)} filled, {ldi.LDI_EULOGY_MIN} needed.
          </p>
        </div>
      ) : null}

      {odysseyIndex !== undefined
        ? (() => {
            const def = LDI_ODYSSEY_KINDS[odysseyIndex]
            const odyssey = plan.odyssey[odysseyIndex]
            const total = ldi.odysseyTotal(odyssey)
            return (
              <div className="space-y-5">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">
                  Future {odysseyIndex + 1} of 3
                </p>
                <SessionHeading title={def.title} blurb={def.body} />
                <Prompt
                  title="What happens"
                  body="Five years. Concrete: where you live, what your days look like, who is around."
                  rows={8}
                  value={odyssey.body}
                  onChange={(v) => onPlan((p) => ldi.setOdyssey(p, odysseyIndex, { body: v }))}
                />
                <div className="space-y-4 border-t border-border pt-4">
                  <p className="text-sm font-medium text-foreground">Score this one</p>
                  {LDI_ODYSSEY_SCORES.map((score) => (
                    <div key={score.id} className="space-y-1">
                      <p className="text-sm font-medium text-foreground">{score.label}</p>
                      <p className="text-xs text-muted-foreground">{score.question}</p>
                      <Scale
                        min={0}
                        max={LDI_ODYSSEY_SCORE_MAX}
                        value={typeof odyssey.scores[score.id] === "number" ? odyssey.scores[score.id] : null}
                        onChange={(v) => onPlan((p) => ldi.setOdysseyScore(p, odysseyIndex, score.id, v))}
                      />
                    </div>
                  ))}
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-foreground">{LDI_ODYSSEY_TEST}</p>
                    <div className="flex gap-2">
                      <Chip
                        active={odyssey.processAppeals === true}
                        onClick={() => onPlan((p) => ldi.setOdyssey(p, odysseyIndex, { processAppeals: true }))}
                      >
                        The process appeals
                      </Chip>
                      <Chip
                        active={odyssey.processAppeals === false}
                        onClick={() => onPlan((p) => ldi.setOdyssey(p, odysseyIndex, { processAppeals: false }))}
                      >
                        Only the arrival
                      </Chip>
                    </div>
                  </div>
                  {total !== null ? <p className="text-sm text-muted-foreground">Total: {total}</p> : null}
                </div>
              </div>
            )
          })()
        : null}

      {flow.step === "odyssey-compare" ? (
        <div className="space-y-5">
          <SessionHeading
            title="Side by side"
            blurb="Three futures written and never compared is where this exercise usually stops being useful."
          />
          <div className="overflow-x-auto">
            <table className="w-full min-w-[520px] border-collapse text-sm">
              <thead>
                <tr>
                  <th className="border-b border-border p-2 text-left text-xs font-medium text-muted-foreground">
                    Future
                  </th>
                  {LDI_ODYSSEY_SCORES.map((s) => (
                    <th
                      key={s.id}
                      className="border-b border-border p-2 text-left text-xs font-medium text-muted-foreground"
                    >
                      {s.label}
                    </th>
                  ))}
                  <th className="border-b border-border p-2 text-left text-xs font-medium text-muted-foreground">
                    Total
                  </th>
                  <th className="border-b border-border p-2 text-left text-xs font-medium text-muted-foreground">
                    Process
                  </th>
                </tr>
              </thead>
              <tbody>
                {plan.odyssey.map((o, i) => (
                  <tr key={LDI_ODYSSEY_KINDS[i].id}>
                    <td className="border-b border-border p-2 text-foreground">
                      {LDI_ODYSSEY_KINDS[i].title}
                    </td>
                    {LDI_ODYSSEY_SCORES.map((s) => (
                      <td key={s.id} className="border-b border-border p-2 text-muted-foreground">
                        {typeof o.scores[s.id] === "number" ? o.scores[s.id] : "—"}
                      </td>
                    ))}
                    <td className="border-b border-border p-2 text-foreground">
                      {ldi.odysseyTotal(o) ?? "—"}
                    </td>
                    <td className="border-b border-border p-2 text-muted-foreground">
                      {o.processAppeals === null ? "—" : o.processAppeals ? "Appeals" : "Arrival only"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {leaders.length > 0 ? (
            <Notice title={leaders.length > 1 ? "A tie" : "Scores highest"}>
              {leaders.map((l) => LDI_ODYSSEY_KINDS[plan.odyssey.indexOf(l)].title).join(" and ")}
              {leaders.length > 1
                ? ". A tie is a real result. It usually means the deciding factor is not on this list."
                : ". Worth noticing whether that matches the one you would actually pick."}
            </Notice>
          ) : (
            <Notice title="Not all three are scored yet">
              Go back and finish scoring before comparing them.
            </Notice>
          )}
        </div>
      ) : null}

      {flow.step === "values" ? (
        <div className="space-y-6">
          <SessionHeading
            title="Values"
            blurb="Name them first, then rank them by forced comparison. The ranking is the part that does the work: an unranked list never resolves anything when two of them collide."
          />
          <AddRow
            placeholder="Something that matters to you"
            onAdd={(t) => onPlan((p) => ldi.setValueCandidates(p, [...p.values.candidates, t]))}
          />
          {plan.values.candidates.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {plan.values.candidates.map((c) => (
                <span
                  key={c}
                  className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-3 py-1.5 text-sm text-foreground"
                >
                  {c}
                  <button
                    type="button"
                    aria-label={`Remove ${c}`}
                    className="text-muted-foreground transition hover:text-destructive"
                    onClick={() =>
                      onPlan((p) => ldi.setValueCandidates(p, p.values.candidates.filter((x) => x !== c)))
                    }
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          ) : null}

          {plan.values.ranked.length > 0 ? (
            <Notice title="Changing the list clears the ranking">
              You have a finished ranking. Adding or removing a value means ranking again, since
              the old order was built against a different set.
            </Notice>
          ) : null}

          {plan.values.candidates.length >= ldi.LDI_VALUES_MIN && !question && plan.values.ranked.length === 0 ? (
            <button
              type="button"
              className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
              onClick={() => onPlan((p) => ldi.startValueRanking(p))}
            >
              Rank them
            </button>
          ) : null}
          {plan.values.candidates.length < ldi.LDI_VALUES_MIN ? (
            <p className="text-sm text-muted-foreground">
              At least {ldi.LDI_VALUES_MIN} before ranking. {plan.values.candidates.length} so far.
            </p>
          ) : null}

          {question ? (
            <div className="space-y-3 rounded-md border border-border p-4">
              <p className="text-sm text-muted-foreground">
                Which has mattered more? Answer for how you have actually lived, not what sounds
                better.
              </p>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  className="flex-1 rounded-md border border-border px-4 py-3 text-sm hover:border-primary"
                  onClick={() => onPlan((p) => ldi.answerValueQuestion(p, true))}
                >
                  {question.a}
                </button>
                <button
                  type="button"
                  className="flex-1 rounded-md border border-border px-4 py-3 text-sm hover:border-primary"
                  onClick={() => onPlan((p) => ldi.answerValueQuestion(p, false))}
                >
                  {question.b}
                </button>
              </div>
            </div>
          ) : null}

          {plan.values.ranked.length > 0 ? (
            <div className="space-y-2">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                In order
              </h3>
              <ol className="space-y-1">
                {plan.values.ranked.map((v, i) => (
                  <li key={v} className="text-sm text-foreground">
                    {i + 1}. {v}
                  </li>
                ))}
              </ol>
            </div>
          ) : null}

          <div className="space-y-2 border-t border-border pt-5">
            <SessionHeading
              title="What you organise your life to avoid"
              blurb="These drive as much behaviour as the ones above, and usually less consciously."
            />
            <div className="flex flex-wrap gap-2">
              {AWAY_SUGGESTIONS.map((s) => (
                <Chip
                  key={s}
                  active={plan.values.away.includes(s)}
                  onClick={() =>
                    onPlan((p) =>
                      ldi.setAwayValues(
                        p,
                        p.values.away.includes(s)
                          ? p.values.away.filter((x) => x !== s)
                          : [...p.values.away, s],
                      ),
                    )
                  }
                >
                  {s}
                </Chip>
              ))}
            </div>
          </div>

          {conflicts.map((c) => (
            <Notice key={c.title} title={c.title}>
              {c.message}
            </Notice>
          ))}
        </div>
      ) : null}

      {flow.step === "fear" ? (
        <div className="space-y-5">
          <SessionHeading
            title="The one that scares you"
            blurb="Fear that stays vague stays powerful. Written down in detail it usually turns out to be smaller and more survivable than it felt."
          />
          <Prompt title={LDI_FEAR_PROMPTS.option} rows={3} value={plan.fear.option} onChange={(v) => onPlan((p) => ldi.setFear(p, { option: v }))} />
          <Prompt title={LDI_FEAR_PROMPTS.worst} rows={5} value={plan.fear.worst} onChange={(v) => onPlan((p) => ldi.setFear(p, { worst: v }))} />
          <Prompt title={LDI_FEAR_PROMPTS.prevent} rows={4} value={plan.fear.prevent} onChange={(v) => onPlan((p) => ldi.setFear(p, { prevent: v }))} />
          <Prompt title={LDI_FEAR_PROMPTS.repair} rows={4} value={plan.fear.repair} onChange={(v) => onPlan((p) => ldi.setFear(p, { repair: v }))} />
          <Prompt title={LDI_FEAR_PROMPTS.benefits} rows={3} value={plan.fear.benefits} onChange={(v) => onPlan((p) => ldi.setFear(p, { benefits: v }))} />
          <Prompt title={LDI_FEAR_PROMPTS.costInaction} rows={4} value={plan.fear.costInaction} onChange={(v) => onPlan((p) => ldi.setFear(p, { costInaction: v }))} />
        </div>
      ) : null}
    </SessionFrame>
  )
}
