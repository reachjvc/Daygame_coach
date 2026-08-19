"use client"

/**
 * The awareness flow's five screens.
 *
 * The one rule that shapes all of them: this flow reports, it does not judge.
 * Every number on these screens is arithmetic the person can check, every
 * association is attached to the number rather than to them, and the last
 * screen offers three doors without leaning on any. The moment one of these
 * starts telling somebody what they are, the flow has become the thing it was
 * built to replace.
 */

import { useState } from "react"
import { AlertTriangle, ArrowRight } from "lucide-react"
import type { ViceCriterionAnswer } from "../../types"
import { COUNT, DOORS, FEEDBACK, INCONGRUENCE, TRAJECTORY, USAGE, criteriaFor } from "../../data/awareness"
import {
  criteriaBand,
  criteriaTally,
  flaggedWithdrawal,
  guessGap,
  usageIsEmpty,
  usageTotals,
} from "../../viceService"
import { Field, Panel, PrimaryButton, StepHeader, Why } from "../Ui"
import type { StepProps } from "./BasicSteps"

// ---------------------------------------------------------------- count

const ANSWERS: Array<{ value: ViceCriterionAnswer; label: keyof typeof LABELS }> = [
  { value: "yes", label: "yes" },
  { value: "no", label: "no" },
  { value: "unsure", label: "unsure" },
]

const LABELS = { yes: COUNT.yes, no: COUNT.no, unsure: COUNT.unsure } as const

/**
 * The count.
 *
 * Three buttons rather than a checkbox, because a checkbox conflates "no" with
 * "have not answered yet" and the difference matters when the output is a
 * count out of eleven. Unsure is a first-class answer and is reported
 * separately — several of these genuinely cannot be called from the inside,
 * and forcing a binary either inflates the number or hides it.
 */
export function StepCount({ step, state, on }: StepProps) {
  const set = criteriaFor(state.shape)
  const tally = criteriaTally(state)
  const isSubstance = state.shape === "substance"
  const incongruence = state.answers["where.incongruence"] ?? ""

  return (
    <div>
      <StepHeader title={step.title} blurb={step.blurb} source={step.source} />

      <p className="text-[12px] text-zinc-500 leading-relaxed">{COUNT.window}</p>
      <Why label="what these are"><p>{isSubstance ? COUNT.substanceNote : COUNT.impactNote}</p></Why>

      <ul className="space-y-1.5 mt-4">
        {set.map((criterion, i) => {
          const answer = state.awareness.criteria[criterion.id]
          return (
            <li
              key={criterion.id}
              className={`rounded-xl border p-3 transition-colors ${
                answer ? "border-white/[0.14] bg-white/[0.03]" : "border-white/10 bg-white/[0.02]"
              }`}
            >
              <div className="flex gap-3">
                <span className="text-[11px] text-zinc-600 tabular-nums pt-0.5 shrink-0">{i + 1}</span>
                <div className="min-w-0 flex-1">
                  <p className="text-[13.5px] text-zinc-200 leading-snug">{criterion.text}</p>
                  {criterion.help && <p className="text-[11.5px] text-zinc-500 mt-1 leading-relaxed">{criterion.help}</p>}
                  <div className="flex flex-wrap gap-1.5 mt-2.5">
                    {ANSWERS.map(({ value, label }) => {
                      const on_ = answer === value
                      return (
                        <button
                          key={value}
                          type="button"
                          aria-pressed={on_}
                          onClick={() => on.setCriterion(criterion.id, value)}
                          className={`text-[12px] px-3 py-1 rounded-full border transition-colors ${
                            on_
                              ? value === "yes"
                                ? "border-amber-400/50 bg-amber-500/15 text-amber-100"
                                : "border-white/30 bg-white/10 text-zinc-100"
                              : "border-white/10 bg-transparent text-zinc-500 hover:border-white/30 hover:text-zinc-300"
                          }`}
                        >
                          {LABELS[label]}
                        </button>
                      )
                    })}
                  </div>
                </div>
              </div>
            </li>
          )
        })}
      </ul>

      <p className="text-[11.5px] text-zinc-600 mt-3 leading-relaxed">{COUNT.unsureNote}</p>

      {/* The moral-incongruence question. Behaviours and screens only, because
          for substances the distinction it draws is not the live one. */}
      {!isSubstance && tally.answered > 0 && (
        <Panel className="mt-5">
          <p className="text-[13px] text-zinc-200 leading-relaxed">{INCONGRUENCE.question}</p>
          <p className="text-[11.5px] text-zinc-500 mt-1 leading-relaxed">{INCONGRUENCE.movingNote}</p>
          <div className="grid gap-2 mt-3">
            {INCONGRUENCE.options.map((option) => {
              const active = incongruence === option.id
              return (
                <button
                  key={option.id}
                  type="button"
                  aria-pressed={active}
                  onClick={() => on.setAnswer("where.incongruence", option.id)}
                  className={`rounded-xl border px-3.5 py-2.5 text-left transition-colors ${
                    active ? "border-violet-400/40 bg-violet-500/10" : "border-white/10 bg-white/[0.02] hover:border-white/25"
                  }`}
                >
                  <span className="block text-[13px] text-zinc-100">{option.label}</span>
                  {option.help && <span className="block text-[11.5px] text-zinc-500 mt-0.5 leading-snug">{option.help}</span>}
                </button>
              )
            })}
          </div>
          {incongruence && INCONGRUENCE.notes[incongruence] && (
            <p className="text-[12.5px] text-violet-100/90 mt-3 leading-relaxed rounded-xl border border-violet-400/25 bg-violet-500/[0.07] px-3 py-2.5">
              {INCONGRUENCE.notes[incongruence]}
            </p>
          )}
        </Panel>
      )}

      <p className="text-[12px] text-zinc-500 mt-4 tabular-nums">
        {tally.answered} of {tally.total} answered.
      </p>
    </div>
  )
}

// ---------------------------------------------------------------- usage

/** A number box that keeps an empty field empty rather than coercing it to 0. */
function NumberField({ label, help, value, onChange, placeholder }: {
  label: string
  help?: string
  value: number | null
  onChange: (value: number | null) => void
  placeholder?: string
}) {
  return (
    <label className="block">
      <span className="block text-[12px] text-zinc-400">{label}</span>
      {help && <span className="block text-[11px] text-zinc-600 mt-0.5 leading-relaxed">{help}</span>}
      <input
        type="number"
        inputMode="decimal"
        min={0}
        value={value ?? ""}
        placeholder={placeholder}
        onChange={(e) => {
          const raw = e.target.value.trim()
          if (raw === "") return onChange(null)
          const parsed = Number(raw)
          onChange(Number.isFinite(parsed) && parsed >= 0 ? parsed : null)
        }}
        className="mt-1.5 w-full rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-[14px] text-white tabular-nums placeholder:text-zinc-700 focus:border-violet-400/50 focus:outline-none"
      />
    </label>
  )
}

/**
 * The week, built up rather than estimated.
 *
 * Four small questions instead of one big one is the whole design. A direct
 * "how much a week" is answered from self-image; days multiplied by amount is
 * answered from memory, and the two come out a long way apart. The guess field
 * is taken before any total renders, so the gap between the two is available
 * on the next screen.
 */
export function StepUsage({ step, state, on }: StepProps) {
  const { usage, guess } = state.awareness
  const totals = usageTotals(usage)
  const unit = state.viceUnit || "a time"

  return (
    <div>
      <StepHeader title={step.title} blurb={step.blurb} source={step.source} />

      <Panel tone="quiet">
        <p className="text-[12px] text-zinc-400 leading-relaxed">{USAGE.why}</p>
      </Panel>

      <div className="grid gap-4 sm:grid-cols-2 mt-4">
        <NumberField
          label={USAGE.days.label}
          value={usage.daysPerWeek}
          placeholder={USAGE.days.placeholder}
          onChange={(v) => on.setUsage({ daysPerWeek: v === null ? null : Math.min(7, v) })}
        />
        <NumberField
          label={`${USAGE.perDay.label} (${unit})`}
          value={usage.perDay}
          placeholder={USAGE.perDay.placeholder}
          onChange={(v) => on.setUsage({ perDay: v })}
        />
        <NumberField
          label={USAGE.cost.label}
          value={usage.cost}
          placeholder={USAGE.cost.placeholder}
          onChange={(v) => on.setUsage({ cost: v })}
        />
        <NumberField
          label={USAGE.minutes.label}
          help={USAGE.minutes.help}
          value={usage.minutes}
          placeholder={USAGE.minutes.placeholder}
          onChange={(v) => on.setUsage({ minutes: v })}
        />
      </div>
      <p className="text-[11px] text-zinc-600 mt-2">{USAGE.noCurrencyNote}</p>

      {/* Taken before anything is totalled. Once a total is on screen there is
          no such thing as an uncontaminated guess. */}
      {totals.costPerYear !== null && guess === null && (
        <Panel tone="live" className="mt-5">
          <NumberField
            label={USAGE.guess.label}
            value={guess}
            placeholder={USAGE.guess.placeholder}
            onChange={(v) => on.setGuess(v)}
          />
        </Panel>
      )}

      {!usageIsEmpty(usage) && (guess !== null || totals.costPerYear === null) && (
        <Panel className="mt-5">
          <p className="text-[13px] text-zinc-200">{USAGE.reveal}</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-3">
            {totals.unitsPerWeek !== null && (
              <Total value={String(totals.unitsPerWeek)} caption={`${unit} ${USAGE.perWeek}`} />
            )}
            {totals.costPerYear !== null && <Total value={String(Math.round(totals.costPerYear))} caption={USAGE.perYear} loud />}
            {totals.hoursPerYear !== null && <Total value={String(totals.hoursPerYear)} caption={`hours ${USAGE.perYear}`} />}
            {totals.wakingDaysPerYear !== null && (
              <Total value={String(totals.wakingDaysPerYear)} caption={USAGE.daysOfYear} loud />
            )}
          </div>
        </Panel>
      )}
    </div>
  )
}

function Total({ value, caption, loud = false }: { value: string; caption: string; loud?: boolean }) {
  return (
    <div>
      <p className={`text-2xl tabular-nums ${loud ? "text-violet-200" : "text-zinc-100"}`}>{value}</p>
      <p className="text-[11px] text-zinc-500 mt-0.5 leading-snug">{caption}</p>
    </div>
  )
}

// ---------------------------------------------------------------- feedback

/**
 * The read-back, in the order that decides whether it lands.
 *
 * Elicit, then provide, then elicit. Asking what they expect *before* showing
 * anything is the difference between feedback and an argument: a number that
 * arrives unannounced gets defended against, and a number that confirms or
 * upsets a prediction the person made themselves gets thought about. Nothing
 * below the prediction renders until the prediction exists.
 */
export function StepFeedback({ step, state, on }: StepProps) {
  const tally = criteriaTally(state)
  const band = criteriaBand(state)
  const totals = usageTotals(state.awareness.usage)
  const gap = guessGap(state)
  const predicted = (state.answers["where.expect"] ?? "").trim().length > 0

  return (
    <div>
      <StepHeader title={step.title} blurb={step.blurb} source={step.source} />

      <Panel tone="live">
        <Field
          label={FEEDBACK.elicitFirst}
          value={state.answers["where.expect"] ?? ""}
          onChange={(text) => on.setAnswer("where.expect", text)}
          rows={2}
        />
      </Panel>

      {!predicted ? (
        <p className="text-[12px] text-zinc-600 mt-4 leading-relaxed">
          The numbers are underneath. Worth writing the line above first — a prediction you made yourself is the thing
          the numbers can land against.
        </p>
      ) : (
        <>
          {tally.answered > 0 && (
            <Panel className="mt-4">
              <div className="flex items-baseline gap-4">
                <p className="text-4xl tabular-nums text-violet-200">{tally.yes}</p>
                <div>
                  <p className="text-[13px] text-zinc-200">
                    of {tally.total} {FEEDBACK.countLabel}
                  </p>
                  {tally.unsure > 0 && (
                    <p className="text-[12px] text-zinc-500">
                      {tally.unsure} {FEEDBACK.unsureLabel}
                    </p>
                  )}
                </div>
              </div>
              {band ? (
                <p className="text-[13px] text-zinc-300 mt-3 leading-relaxed">{band.meaning}</p>
              ) : (
                <p className="text-[13px] text-zinc-300 mt-3 leading-relaxed">{FEEDBACK.impactNote}</p>
              )}
            </Panel>
          )}

          {(totals.costPerYear !== null || totals.hoursPerYear !== null) && (
            <Panel className="mt-3">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {totals.costPerYear !== null && <Total value={String(Math.round(totals.costPerYear))} caption={USAGE.perYear} loud />}
                {totals.hoursPerYear !== null && <Total value={String(totals.hoursPerYear)} caption={`hours ${USAGE.perYear}`} />}
                {totals.wakingDaysPerYear !== null && (
                  <Total value={String(totals.wakingDaysPerYear)} caption={USAGE.daysOfYear} loud />
                )}
              </div>
              {gap && (
                <p className="text-[12.5px] text-zinc-300 mt-3 leading-relaxed">
                  {gap.factor >= 1.5 || gap.factor <= 0.67
                    ? USAGE.guessGap
                        .replace("{guess}", String(Math.round(gap.guess)))
                        .replace("{actual}", String(Math.round(gap.actual)))
                    : USAGE.guessClose}
                </p>
              )}
            </Panel>
          )}

          {/* The medical one. Rendered before the reassurance, never after. */}
          {flaggedWithdrawal(state) && (
            <div className="mt-3 rounded-2xl border border-amber-400/40 bg-amber-500/[0.08] p-4">
              <p className="flex items-center gap-2 text-[13px] font-medium text-amber-100">
                <AlertTriangle className="size-4 shrink-0" />
                Worth a doctor before a quit date
              </p>
              <p className="text-[12.5px] text-amber-100/80 mt-1.5 leading-relaxed">{FEEDBACK.withdrawalFlag}</p>
            </div>
          )}

          <Why label="what this count is and is not">
            <p>{FEEDBACK.notADiagnosis}</p>
            <p>{FEEDBACK.resolvable}</p>
          </Why>

          <div className="mt-4">
            <Field
              label={FEEDBACK.elicitAfter}
              value={state.answers["where.after"] ?? ""}
              onChange={(text) => on.setAnswer("where.after", text)}
              rows={3}
            />
          </div>
        </>
      )}
    </div>
  )
}

// -------------------------------------------------------------- trajectory

export function StepTrajectory({ step, state, on }: StepProps) {
  return (
    <div>
      <StepHeader title={step.title} blurb={step.blurb} source={step.source} />
      <div className="space-y-4">
        {(step.fields ?? []).map((field) => (
          <Field
            key={field.id}
            label={field.label}
            help={field.help}
            value={state.answers[field.id] ?? ""}
            onChange={(text) => on.setAnswer(field.id, text)}
            rows={field.rows}
            minWords={field.minWords}
          />
        ))}
      </div>
      <Why label="what this does and does not predict"><p>{TRAJECTORY.closing}</p></Why>
    </div>
  )
}

// ------------------------------------------------------------------ doors

/**
 * The three ways on, presented flat and in a fixed order that is not severity.
 *
 * No recommendation, no highlighted option, no "based on your answers we
 * suggest". The flow has just spent fifteen minutes demonstrating that the
 * person is the one holding the information; issuing a verdict on the last
 * screen would take that back.
 */
export function StepDoors({ step, state, on }: StepProps) {
  return (
    <div>
      <StepHeader title={step.title} blurb={step.blurb} source={step.source} />

      <Field
        label={DOORS.reflect.label}
        value={state.answers[DOORS.reflect.id] ?? ""}
        onChange={(text) => on.setAnswer(DOORS.reflect.id, text)}
        rows={DOORS.reflect.rows}
      />

      <div className="grid gap-2.5 mt-5">
        {DOORS.options.map((option) => {
          const shared = "rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-left hover:border-violet-400/40 hover:bg-violet-500/[0.05] transition-colors group block w-full"
          const inner = (
            <>
              <span className="flex items-center gap-2 text-[15px] font-semibold text-zinc-100 group-hover:text-white transition-colors">
                {option.label}
                <ArrowRight className="size-3.5 opacity-40 group-hover:opacity-80 transition-opacity" />
              </span>
              <span className="block text-[12.5px] text-zinc-400 mt-1 leading-relaxed">{option.help}</span>
            </>
          )
          if (option.to === "help") {
            return (
              <button key={option.id} type="button" onClick={on.openHelp} className={shared}>
                {inner}
              </button>
            )
          }
          return (
            <a key={option.id} href={option.to === "map" ? "/test/quit-vice/map" : "/test/quit-vice"} className={shared}>
              {inner}
            </a>
          )
        })}
      </div>

      <div className="mt-5">
        <PrimaryButton onClick={() => on.setStepDone(step.id, true)}>Done for now</PrimaryButton>
      </div>
    </div>
  )
}
