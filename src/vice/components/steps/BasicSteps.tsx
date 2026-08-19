"use client"

/**
 * The steps that are mostly reading and typing: the openers, the vice picker,
 * the safety gate, the two rulers, plain question sets, and chip banks.
 */

import { useState } from "react"
import { AlertTriangle } from "lucide-react"
import type { ViceHandlers, ViceState, ViceStep } from "../../types"
import { VICES } from "../../data/vices"
import { CONFIDENCE_RULER, IMPORTANCE_RULER, RULER_NOTE, SAFETY } from "../../data/copy"
import { rulerFollowUp, rulerNudge } from "../../viceService"
import { ChipBank, Field, Line, Panel, PrimaryButton, Scale, StepHeader, Why } from "../Ui"

export interface StepProps {
  step: ViceStep
  state: ViceState
  today: string
  on: ViceHandlers
}

// ---------------------------------------------------------------- intro

/**
 * Intro screens, with everything after the first paragraph folded away.
 *
 * These ran to 90–150 words each and opened every flow with a wall of
 * reasoning. The reasoning is worth keeping — it is why the flow is shaped the
 * way it is, and somebody who wants it should be able to read it — but leading
 * with it puts the longest text in the module at the exact point a person has
 * committed to nothing.
 *
 * So: the first paragraph, then the rest behind a toggle. Nobody is made to
 * read the case for the design before they are allowed to use it.
 */
export function StepIntro({ step, on }: StepProps) {
  const [expanded, setExpanded] = useState(false)
  const body = step.body ?? []
  const [first, ...rest] = body

  return (
    <div>
      <StepHeader title={step.title} blurb={step.blurb} caution={step.caution} source={step.source} />
      {first && (
        <Panel>
          <p className="text-[13px] text-zinc-300 leading-relaxed">{first}</p>
          {expanded && (
            <div className="space-y-3 mt-3">
              {rest.map((paragraph, i) => (
                <p key={i} className="text-[13px] text-zinc-300 leading-relaxed">{paragraph}</p>
              ))}
            </div>
          )}
          {rest.length > 0 && !expanded && (
            <button
              type="button"
              onClick={() => setExpanded(true)}
              className="mt-2.5 text-[12px] text-zinc-500 hover:text-zinc-300 transition-colors"
            >
              why it is built this way
            </button>
          )}
        </Panel>
      )}
      <div className="mt-4">
        {/* Advances as well as marking the step read. It used to only set a
            flag — which, on a fresh state, was not even persisted (see
            viceStateIsUntouched) and, with the rail collapsed, changed nothing
            on screen. A button labelled "Start" that appears to do nothing is
            the worst possible first interaction. */}
        <PrimaryButton
          onClick={() => {
            on.setStepDone(step.id, true)
            on.nextStep()
          }}
        >
          Start
        </PrimaryButton>
      </div>
    </div>
  )
}

// -------------------------------------------------------------- pickVice

export function StepPickVice({ step, state, on }: StepProps) {
  const [custom, setCustom] = useState(state.viceId === "custom" ? state.viceLabel : "")
  return (
    <div>
      <StepHeader title={step.title} blurb={step.blurb} source={step.source} />
      <div className="grid gap-2 sm:grid-cols-2">
        {VICES.map((vice) => {
          const active = state.viceId === vice.id
          return (
            <button
              key={vice.id}
              type="button"
              onClick={() => on.setVice(vice.id, vice.id === "custom" ? custom : vice.label)}
              aria-pressed={active}
              className={`rounded-xl border p-3 text-left transition-colors ${
                active ? "border-violet-400/40 bg-violet-500/10" : "border-white/10 bg-white/[0.02] hover:border-white/25"
              }`}
            >
              <span className={`block text-[13px] font-medium ${active ? "text-white" : "text-zinc-200"}`}>{vice.label}</span>
              <span className="block text-[11px] text-zinc-500 mt-0.5">Counted in {vice.unit}</span>
            </button>
          )
        })}
      </div>

      {state.viceId === "custom" && (
        <div className="mt-4">
          <Line
            label="What do you call it?"
            value={custom}
            onChange={(text) => { setCustom(text); on.setVice("custom", text) }}
            placeholder="However you say it in your head"
          />
        </div>
      )}

      {state.viceId && state.viceId !== "custom" && (
        <div className="mt-4">
          <Line
            label="Call it something else, if that is not how you say it"
            value={state.viceLabel}
            onChange={(text) => on.setVice(state.viceId as string, text)}
          />
        </div>
      )}

      {/* Said once, here, rather than as a disclaimer nobody reads. It matters
          most for the two on this list that are not diagnoses of anything. */}
      <p className="text-[11px] text-zinc-600 mt-4 leading-relaxed">
        Picking one off this list is not a diagnosis and this page does not think it is. It is a thing you would rather do less of.
      </p>
    </div>
  )
}

// ---------------------------------------------------------------- safety

/**
 * The withdrawal gate.
 *
 * Shown to everybody, and consequential for two of the vices. The question is
 * about the body rather than about the substance, because somebody who does not
 * think of themselves as a heavy drinker can still be shaking in the morning.
 */
export function StepSafety({ state, on }: StepProps) {
  const ticked = state.lists["safety.signs"] ?? []
  const answered = state.safety.asked
  const flagged = state.safety.withdrawal

  const toggleSign = (sign: string) => {
    const next = ticked.includes(sign) ? ticked.filter((s) => s !== sign) : [...ticked, sign]
    on.setList("safety.signs", next)
    on.setSafety(next.length > 0)
  }

  const sayNone = () => {
    on.setList("safety.signs", [])
    on.setSafety(false)
  }

  return (
    <div>
      <StepHeader title={SAFETY.title} blurb={SAFETY.blurb} />
      <Panel>
        <p className="text-[13px] text-zinc-200">{SAFETY.question}</p>
        <div className="space-y-1.5 mt-3">
          {SAFETY.signs.map((sign) => {
            const on_ = ticked.includes(sign)
            return (
              <button
                key={sign}
                type="button"
                onClick={() => toggleSign(sign)}
                aria-pressed={on_}
                className={`w-full text-left rounded-lg border px-3 py-2 text-[13px] transition-colors ${
                  on_ ? "border-amber-400/40 bg-amber-500/10 text-amber-100" : "border-white/10 bg-white/[0.02] text-zinc-300 hover:border-white/25"
                }`}
              >
                {sign}
              </button>
            )
          })}
          <button
            type="button"
            onClick={sayNone}
            aria-pressed={answered && !flagged}
            className={`w-full text-left rounded-lg border px-3 py-2 text-[13px] transition-colors ${
              answered && !flagged
                ? "border-emerald-400/40 bg-emerald-500/10 text-emerald-100"
                : "border-white/10 bg-white/[0.02] text-zinc-300 hover:border-white/25"
            }`}
          >
            {SAFETY.noneLabel}
          </button>
        </div>
      </Panel>

      {flagged && (
        <Panel tone="warn" className="mt-4">
          <div className="flex items-start gap-2.5">
            <AlertTriangle className="size-4 text-amber-300 shrink-0 mt-0.5" />
            <div className="min-w-0">
              <h3 className="text-[14px] font-semibold text-amber-100">{SAFETY.warningTitle}</h3>
              <div className="space-y-2 mt-2">
                {SAFETY.warning.map((paragraph, i) => (
                  <p key={i} className="text-[12.5px] text-amber-100/85 leading-relaxed">{paragraph}</p>
                ))}
              </div>
              {!state.safety.acknowledged ? (
                <button
                  type="button"
                  onClick={on.acknowledgeSafety}
                  className="mt-3 text-[12px] px-3 py-1.5 rounded-lg border border-amber-400/40 bg-amber-500/15 text-amber-100 hover:bg-amber-500/25 transition-colors"
                >
                  {SAFETY.acknowledge}
                </button>
              ) : (
                <p className="mt-3 text-[11px] text-amber-200/70">Noted. The date fields are open again, and the warning stays on them.</p>
              )}
            </div>
          </div>
        </Panel>
      )}

      {answered && !flagged && (
        <p className="text-[12px] text-zinc-500 mt-4 leading-relaxed">
          Nothing to flag then. Worth knowing that this question is only dangerous to get wrong for alcohol and for benzodiazepines — everything else on the list is unpleasant to stop rather than risky.
        </p>
      )}
    </div>
  )
}

// ---------------------------------------------------------------- rulers

/**
 * Two sliders and the questions underneath them.
 *
 * The follow-up compares downwards, always, and the note explains why in one
 * line — somebody who sees the trick and understands it answers more honestly
 * than somebody who spots it and feels handled.
 */
export function StepRuler({ step, state, on }: StepProps) {
  const rulers = [
    { spec: IMPORTANCE_RULER, id: "importance" as const },
    { spec: CONFIDENCE_RULER, id: "confidence" as const },
  ]
  return (
    <div>
      <StepHeader title={step.title} blurb={step.blurb} source={step.source} />
      <div className="space-y-5">
        {rulers.map(({ spec, id }) => {
          const value = state.scales[id]
          const answered = value !== undefined
          const follow = answered ? rulerFollowUp(id, value) : null
          const nudge = answered ? rulerNudge(id, value) : null
          return (
            <Panel key={id}>
              <Scale
                label={spec.question}
                value={value}
                onChange={(n) => on.setScale(id, n)}
                lowAnchor={spec.lowAnchor}
                highAnchor={spec.highAnchor}
              />
              {answered && follow && nudge && (
                <div className="space-y-3 mt-4 pt-4 border-t border-white/[0.07]">
                  <Field
                    label={follow.text}
                    value={state.answers[`${id}.why`] ?? ""}
                    onChange={(text) => on.setAnswer(`${id}.why`, text)}
                    rows={2}
                  />
                  <Field
                    label={nudge.text}
                    value={state.answers[`${id}.move`] ?? ""}
                    onChange={(text) => on.setAnswer(`${id}.move`, text)}
                    rows={2}
                  />
                </div>
              )}
            </Panel>
          )
        })}
      </div>
      <Why label="what happens to what you write"><p>{RULER_NOTE}</p></Why>
      <p className="text-[11px] text-zinc-600 mt-2 leading-relaxed">
        Both questions compare your number with a lower one rather than a higher one, on purpose. Asked the other way round, the honest answer is a list of reasons not to bother — and that list is the half that predicts nothing happening.
      </p>
    </div>
  )
}

// ---------------------------------------------------------------- text

export function StepText({ step, state, on }: StepProps) {
  return (
    <div>
      <StepHeader title={step.title} blurb={step.blurb} caution={step.caution} source={step.source} />
      <Panel>
        <div className="space-y-4">
          {(step.fields ?? []).map((field) => (
            <Field
              key={field.id}
              label={field.label}
              help={field.help}
              placeholder={field.placeholder}
              rows={field.rows ?? 3}
              minWords={field.minWords}
              value={state.answers[field.id] ?? ""}
              onChange={(text) => on.setAnswer(field.id, text)}
            />
          ))}
        </div>
      </Panel>
    </div>
  )
}

// ---------------------------------------------------------------- chips

export function StepChips({ step, state, on }: StepProps) {
  return (
    <div>
      <StepHeader title={step.title} blurb={step.blurb} caution={step.caution} source={step.source} />
      <div className="space-y-4">
        {(step.chips ?? []).map((chip) => (
          <Panel key={chip.id}>
            <ChipBank
              label={chip.label}
              help={chip.help}
              options={chip.options}
              selected={state.lists[chip.id] ?? []}
              onToggle={(item) => on.toggleListItem(chip.id, item)}
              allowCustom={chip.allowCustom}
            />
          </Panel>
        ))}
      </div>
    </div>
  )
}
