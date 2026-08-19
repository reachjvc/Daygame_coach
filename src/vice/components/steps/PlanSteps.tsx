"use client"

/**
 * The steps that produce an artefact: the negotiated period, the if-then plans,
 * the environment decisions, the refusal script, the card, the voice work, and
 * the tape played forward.
 */

import { useState } from "react"
import { AlertTriangle, X } from "lucide-react"
import type { ViceState } from "../../types"
import { BINDING, IFTHEN, LAPSE, PERMISSION_THOUGHTS, REBUTTAL_METHOD, REFUSAL, VOICE } from "../../data/copy"
import { LENGTH_OFFERS } from "../../data/flows"
import { dateIsBlocked, planProblem, refusalLadder, startDateOptions } from "../../viceService"
import { SAFETY } from "../../data/copy"
import { ChipBank, Empty, Field, Line, LineList, Panel, PrimaryButton, QuietButton, StepHeader, Why } from "../Ui"
import type { StepProps } from "./BasicSteps"

// ------------------------------------------------------------- negotiate

/**
 * The length picker, offered top-down.
 *
 * Thirty days is on screen first and every tap of "shorter" reveals the next
 * one down. The number somebody argues their way to is worth more than the one
 * they were handed, and a one-day period they will actually run beats a
 * thirty-day one they will not. So one day is a real option here, presented
 * without a hint of disappointment.
 */
export function StepNegotiate({ step, state, today, on }: StepProps) {
  const [shown, setShown] = useState(() => {
    const chosen = state.experiment.days
    const index = chosen ? LENGTH_OFFERS.indexOf(chosen) : -1
    return index >= 0 ? index + 1 : 1
  })
  const blocked = dateIsBlocked(state)
  const visible = LENGTH_OFFERS.slice(0, shown)
  const dates = startDateOptions(today)

  return (
    <div>
      <StepHeader title={step.title} blurb={step.blurb} source={step.source} />

      {blocked && (
        <Panel tone="warn" className="mb-4">
          <div className="flex items-start gap-2.5">
            <AlertTriangle className="size-4 text-amber-300 shrink-0 mt-0.5" />
            <p className="text-[12.5px] text-amber-100/85 leading-relaxed">
              {SAFETY.warningTitle}. You flagged withdrawal signs and have not marked the warning as read, so the date is held until you do.
            </p>
          </div>
        </Panel>
      )}

      <Panel>
        <div className="space-y-2">
          {visible.map((days) => {
            const active = state.experiment.days === days
            return (
              <button
                key={days}
                type="button"
                disabled={blocked}
                onClick={() => {
                  on.offerLength(days)
                  on.setExperiment(days, state.experiment.startDate ?? today)
                }}
                aria-pressed={active}
                className={`w-full text-left rounded-xl border px-3.5 py-3 transition-colors disabled:opacity-40 ${
                  active ? "border-violet-400/40 bg-violet-500/10" : "border-white/10 bg-white/[0.02] hover:border-white/25"
                }`}
              >
                <span className={`text-[15px] font-medium ${active ? "text-white" : "text-zinc-200"}`}>
                  {days} {days === 1 ? "day" : "days"}
                </span>
              </button>
            )
          })}
        </div>

        {shown < LENGTH_OFFERS.length ? (
          <button
            type="button"
            onClick={() => setShown((n) => n + 1)}
            className="mt-3 text-[12px] text-zinc-500 hover:text-zinc-200 transition-colors"
          >
            That is too long. Show me a shorter one →
          </button>
        ) : (
          <p className="mt-3 text-[11px] text-zinc-600 leading-relaxed">
            One day is on that list because it belongs there. A day you actually run tells you more than a month you abandon on the fourth.
          </p>
        )}
      </Panel>

      {state.experiment.days !== null && (
        <Panel className="mt-4">
          <p className="text-[13px] text-zinc-200">Starting when?</p>
          <div className="flex flex-wrap gap-2 mt-2">
            {dates.map((option) => {
              const active = state.experiment.startDate === option.date
              return (
                <button
                  key={option.id}
                  type="button"
                  disabled={blocked}
                  onClick={() => on.setExperiment(state.experiment.days as number, option.date)}
                  aria-pressed={active}
                  className={`text-[12px] px-3 py-2 rounded-lg border transition-colors disabled:opacity-40 ${
                    active ? "border-violet-400/50 bg-violet-500/15 text-violet-100" : "border-white/10 bg-white/[0.02] text-zinc-300 hover:border-white/30"
                  }`}
                >
                  {option.label}
                  <span className="block text-[10px] text-zinc-500 mt-0.5 tabular-nums">{option.date}</span>
                </button>
              )
            })}
          </div>
          <p className="text-[11px] text-zinc-600 mt-3 leading-relaxed">
            Today is on that list first and deliberately. Attempts that start on the spur of the moment do better than planned ones, not worse, so a picker that nudges everything to next week is throwing something away.
          </p>
        </Panel>
      )}
    </div>
  )
}

// ---------------------------------------------------------------- if-then

/**
 * The plan builder, with the one validation rule that has an experiment behind
 * it: a plan phrased as what you will *not* do backfires, and it backfires
 * worst in the people whose habit is strongest. So it is refused, and the
 * refusal says why rather than just marking the box red.
 */
export function StepIfThen({ step, state, on }: StepProps) {
  const [when, setWhen] = useState("")
  const [then, setThen] = useState("")
  const problem = when.trim() || then.trim() ? planProblem({ when, then }) : null
  const message =
    problem === "negation" ? IFTHEN.rejectNegation : problem === "vague" ? IFTHEN.vagueCue : null

  const add = () => {
    if (planProblem({ when, then })) return
    on.addPlan(when, then)
    setWhen("")
    setThen("")
  }

  return (
    <div>
      <StepHeader title={step.title} blurb={step.blurb || IFTHEN.blurb} source={step.source} />

      {state.plans.length > 0 && (
        <ul className="space-y-2 mb-4">
          {state.plans.map((plan) => (
            <li key={plan.id} className="flex items-start gap-2 rounded-xl border border-white/10 bg-white/[0.02] px-3.5 py-2.5">
              <p className="flex-1 min-w-0 text-[13px] text-zinc-200 leading-relaxed">
                <span className="text-zinc-500">When</span> {plan.when}<span className="text-zinc-500">, then I</span> {plan.then}
              </p>
              <button
                type="button"
                onClick={() => on.removePlan(plan.id)}
                aria-label="Remove this plan"
                className="p-1 text-zinc-600 hover:text-rose-300 transition-colors shrink-0"
              >
                <X className="size-3.5" />
              </button>
            </li>
          ))}
        </ul>
      )}

      <Panel>
        <div className="space-y-3">
          <Line label={IFTHEN.whenLabel} value={when} onChange={setWhen} placeholder={IFTHEN.whenPlaceholder} />
          <Line label={IFTHEN.thenLabel} value={then} onChange={setThen} placeholder={IFTHEN.thenPlaceholder} />
        </div>
        {message && (
          <p className="mt-3 rounded-lg border border-amber-400/25 bg-amber-500/[0.06] px-3 py-2 text-[12px] text-amber-100/90 leading-relaxed">
            {message}
          </p>
        )}
        <div className="flex items-center gap-3 mt-3">
          <PrimaryButton onClick={add} disabled={planProblem({ when, then }) !== null}>Add it</PrimaryButton>
          <span className="text-[11px] text-zinc-600">{IFTHEN.rehearse}</span>
        </div>
      </Panel>
    </div>
  )
}

// ---------------------------------------------------------------- binding

export function StepBinding({ step, state, on }: StepProps) {
  return (
    <div>
      <StepHeader title={step.title || BINDING.title} blurb={step.blurb || BINDING.blurb} source={step.source} />
      <div className="space-y-4">
        {BINDING.groups.map((group) => (
          <Panel key={group.id}>
            <ChipBank
              label={group.label}
              help={group.help}
              options={group.seeds}
              selected={state.lists[`binding.${group.id}`] ?? []}
              onToggle={(item) => on.toggleListItem(`binding.${group.id}`, item)}
            />
          </Panel>
        ))}
      </div>
      <p className="text-[11px] text-zinc-600 mt-4 leading-relaxed">
        Ticking one here does not do it. Doing one of them today, before the day gets away, is the entire value of this screen.
      </p>
    </div>
  )
}

// ---------------------------------------------------------------- refusal

export function StepRefusal({ step, state, on }: StepProps) {
  return (
    <div>
      <StepHeader title={step.title || REFUSAL.title} blurb={step.blurb || REFUSAL.blurb} source={step.source} />

      <Panel>
        <p className="text-[13px] text-zinc-200">The ladder</p>
        <ol className="space-y-1.5 mt-2">
          {refusalLadder(state).map((line, i) => (
            <li key={i} className="flex items-start gap-2.5">
              <span className="text-[11px] text-zinc-600 tabular-nums pt-0.5">{i + 1}</span>
              <span className="text-[13px] text-zinc-100">&ldquo;{line}&rdquo;</span>
            </li>
          ))}
        </ol>
        <Why label="if they keep pushing"><p>{REFUSAL.brokenRecord}</p></Why>
      </Panel>

      <Panel tone="quiet" className="mt-3">
        <ul className="space-y-1">
          {REFUSAL.rules.map((rule, i) => (
            <li key={i} className="text-[12px] text-zinc-400 leading-relaxed">— {rule}</li>
          ))}
        </ul>
      </Panel>

      <Panel className="mt-3">
        <p className="text-[13px] text-zinc-200 mb-3">Write your own, for a room you can actually picture.</p>
        <div className="space-y-3">
          {REFUSAL.scriptFields.map((field) => (
            <Line
              key={field.id}
              label={field.label}
              value={state.answers[`refusal.${field.id}`] ?? ""}
              onChange={(text) => on.setAnswer(`refusal.${field.id}`, text)}
            />
          ))}
        </div>

      </Panel>

      <Panel tone="live" className="mt-3">
        <Why label="why &ldquo;I decided&rdquo; and not &ldquo;I am not allowed&rdquo;"><p>{REFUSAL.autonomy}</p></Why>
      </Panel>
    </div>
  )
}

// ---------------------------------------------------------------- voice

export function StepVoice({ step, state, on }: StepProps) {
  return (
    <div>
      <StepHeader title={step.title || VOICE.title} blurb={step.blurb || VOICE.blurb} source={step.source} />

      <Panel>
        <Line
          label="What are you calling it?"
          value={state.voice.name}
          onChange={(name) => on.setVoice({ name })}
          placeholder="The Negotiator"
        />

        <div className="flex flex-wrap gap-1.5 mt-2">
          {VOICE.nameSeeds.map((seed) => (
            <button
              key={seed}
              type="button"
              onClick={() => on.setVoice({ name: seed })}
              className="text-[11px] px-2 py-1 rounded-full border border-white/10 text-zinc-500 hover:text-zinc-200 hover:border-white/30 transition-colors"
            >
              {seed}
            </button>
          ))}
        </div>
      </Panel>

      <Panel className="mt-3">
        <LineList
          label={VOICE.saysLabel}
          items={state.voice.says}
          onChange={(says) => on.setVoice({ says })}
          placeholder="Write it the way it actually arrives"
          seeds={VOICE.saysSeeds}
        />
      </Panel>

      <Panel className="mt-3">
        <LineList
          label={VOICE.backLabel}
          items={state.voice.back}
          onChange={(back) => on.setVoice({ back })}
          placeholder="Yours, not the suggested one"
          seeds={VOICE.backSeeds}
        />
      </Panel>

      <Panel tone="quiet" className="mt-3">
        <p className="text-[12px] text-zinc-400 leading-relaxed">
          The move underneath is one word. <span className="text-zinc-500">&ldquo;{VOICE.swapDemo.from}&rdquo;</span> becomes{" "}
          <span className="text-zinc-100">&ldquo;{VOICE.swapDemo.to}&rdquo;</span>.
        </p>
      </Panel>

      <details className="mt-3 group">
        <summary className="cursor-pointer text-[12px] text-zinc-500 hover:text-zinc-300 transition-colors">
          The twelve lines it usually uses, and what stands up to them
        </summary>
        <div className="mt-3 space-y-2">
          <p className="text-[12px] text-zinc-400 leading-relaxed">
            {REBUTTAL_METHOD.interrupt} — then find the error, then say the replacement.
          </p>
          {PERMISSION_THOUGHTS.map((item) => (
            <div key={item.id} className="rounded-xl border border-white/10 bg-white/[0.02] px-3.5 py-2.5">
              <p className="text-[13px] text-zinc-200">&ldquo;{item.thought}&rdquo;</p>
              <p className="text-[10.5px] text-zinc-600 mt-0.5">{item.kind}</p>
              <p className="text-[12.5px] text-zinc-400 mt-1.5 leading-relaxed">{item.rebuttal}</p>
              <div className="mt-2">
                <Line
                  label="Your version"
                  value={state.answers[`rebuttal.${item.id}`] ?? ""}
                  onChange={(text) => on.setAnswer(`rebuttal.${item.id}`, text)}
                  placeholder="The one you would actually say"
                />
              </div>
            </div>
          ))}
          <p className="text-[11px] text-zinc-600 leading-relaxed">
            A borrowed rebuttal does not hold at eleven at night. One you wrote does, which is what the boxes are for.
          </p>
        </div>
      </details>
    </div>
  )
}

// ---------------------------------------------------------------- card

export function StepCard({ step, state, on }: StepProps) {
  return (
    <div>
      <StepHeader title={step.title} blurb={step.blurb} source={step.source} />
      <Panel>
        <LineList
          label="Three reasons. Short — a dozen words each at most."
          help="These are read in a doorway, not in an armchair."
          items={state.card.reasons}
          onChange={(reasons) => on.setCard({ reasons })}
          placeholder="I want to stop feeling like this every Saturday morning"
          max={3}
        />
      </Panel>
      <Panel className="mt-3">
        <Field
          label="One line for the night you nearly give up"
          help="Written to yourself, now, because it is not writable then."
          value={state.card.line}
          onChange={(line) => on.setCard({ line })}
          rows={2}
        />
      </Panel>

      {(state.card.reasons.length > 0 || state.card.line) && (
        <Panel tone="live" className="mt-4">
          <p className="text-[10.5px] uppercase tracking-wide text-violet-300/70">How it will look</p>
          <ul className="space-y-1 mt-2">
            {state.card.reasons.map((reason, i) => (
              <li key={i} className="text-[14px] text-violet-50">{reason}</li>
            ))}
          </ul>
          {state.card.line && <p className="text-[13px] text-violet-200/80 mt-3 italic leading-relaxed">{state.card.line}</p>}
        </Panel>
      )}

      <p className="text-[11px] text-zinc-600 mt-4 leading-relaxed">
        The card is on the toolbar at the bottom of every screen from here on, one tap away, including from inside the urge tool.
      </p>
    </div>
  )
}

// ---------------------------------------------------------------- tape

/**
 * Playing it forward.
 *
 * The stepper matters more than the prompt. Frames one and two are always
 * pleasant — that is what the thing is for — and everything worth knowing is in
 * frames three to five, which is exactly where a free-text box lets people
 * stop. So it asks the same question five times and counts.
 */
export function StepTape({ step, state, on }: StepProps) {
  const forward = state.lists["tape.forward"] ?? []
  const turned = state.lists["tape.turned"] ?? []
  const minimum = 5
  return (
    <div>
      <StepHeader title={step.title} blurb={step.blurb} source={step.source} />

      <Panel>
        <LineList
          label="Say you do it. And then what happens?"
          help="Then what happens after that? Keep going. Nobody stops at the good bit by accident."
          items={forward}
          onChange={(items) => on.setList("tape.forward", items)}
          placeholder={forward.length === 0 ? "It tastes good and I relax" : "And then…"}
        />
        {forward.length > 0 && forward.length < minimum && (
          <p className="text-[11px] text-amber-200/70 mt-2">
            {forward.length} of {minimum}. The first two are always pleasant — the useful ones start about here.
          </p>
        )}
        {forward.length >= minimum && (
          <p className="text-[11px] text-emerald-200/70 mt-2">That is the whole tape. Read it back from the top.</p>
        )}
      </Panel>

      <Panel className="mt-3">
        <LineList
          label="Now the other one. You turn it down. And then what?"
          help="Same depth. This half gets skipped and it is the half that gives you somewhere to go."
          items={turned}
          onChange={(items) => on.setList("tape.turned", items)}
          placeholder="A dull twenty minutes"
        />
      </Panel>
    </div>
  )
}

// ---------------------------------------------- lapse protocol, read-only

/** The pre-written lapse response, shown inside the decisive flow. */
export function LapsePreview({ state }: { state: ViceState }) {
  return (
    <Panel tone="quiet">
      <p className="text-[13px] text-zinc-200">{LAPSE.title}</p>
      <p className="text-[12px] text-zinc-400 mt-1 leading-relaxed">{LAPSE.opener}</p>
      {state.card.line ? (
        <p className="text-[12px] text-zinc-300 mt-3 italic leading-relaxed">&ldquo;{state.card.line}&rdquo;</p>
      ) : (
        <Empty>Once you have written the line on the card, it appears here too.</Empty>
      )}
    </Panel>
  )
}

/** A tiny helper the shell uses for the "nothing here yet" states. */
export function NothingYet({ children, onGo, goLabel }: { children: string; onGo?: () => void; goLabel?: string }) {
  return (
    <Panel tone="quiet">
      <Empty>{children}</Empty>
      {onGo && goLabel && (
        <div className="mt-2">
          <QuietButton onClick={onGo}>{goLabel} →</QuietButton>
        </div>
      )}
    </Panel>
  )
}
