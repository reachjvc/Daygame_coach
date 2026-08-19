"use client"

/**
 * The five screens of the "what it gives you" flow.
 *
 * The rule holding all of them together: the good half and the costly half
 * never appear on the same screen, are never totalled, and are never set
 * against each other. A pros-and-cons grid gets an ambivalent person to argue
 * out loud for keeping it, and arguing for keeping it is what predicts keeping
 * it. Everything below is arranged to avoid that one shape.
 */

import { useState } from "react"
import type { ViceBelief } from "../../data/gives"
import {
  BELIEFS,
  BELIEF_TEST,
  FUTURES,
  HORIZONS,
  LETTER,
  VALUES,
  VALUES_STEP,
  beliefsFor,
} from "../../data/gives"
import { BELIEF_LIVE_AT, beliefTally, futureCues, liveBeliefs, payoffSummary } from "../../viceService"
import { Chip, Empty, Field, Panel, PrimaryButton, Scale, StepHeader, Why } from "../Ui"
import type { StepProps } from "./BasicSteps"

// --------------------------------------------------------------- beliefs

/**
 * What it gives you, rated and not argued with.
 *
 * Everything starts unrated rather than at a midpoint. A slider parked at five
 * reads as the page having an opinion about how true the claim is, and on this
 * screen in particular the page is meant to have none.
 */
export function StepBeliefs({ step, state, on }: StepProps) {
  const beliefs = beliefsFor(state.shape)
  const live = liveBeliefs(state)

  return (
    <div>
      <StepHeader title={step.title} blurb={step.blurb || BELIEFS.blurb} source={step.source} />

      <Why label="why beliefs and not willpower"><p>{BELIEFS.why}</p></Why>

      <p className="text-[12px] text-zinc-500 mt-4">{BELIEFS.instruction}</p>

      <div className="space-y-4 mt-3">
        {beliefs.map((belief) => {
          const value = state.scales[`belief.${belief.id}`]
          return (
            <div
              key={belief.id}
              className={`rounded-xl border p-3.5 transition-colors ${
                value !== undefined && value >= BELIEF_LIVE_AT
                  ? "border-violet-400/30 bg-violet-500/[0.05]"
                  : "border-white/10 bg-white/[0.02]"
              }`}
            >
              <Scale
                label={belief.claim}
                value={value ?? 0}
                onChange={(v) => on.setScale(`belief.${belief.id}`, v)}
                lowAnchor={BELIEFS.scaleLow}
                highAnchor={BELIEFS.scaleHigh}
              />
            </div>
          )
        })}
      </div>

      <p className="text-[12px] text-zinc-500 mt-4">
        {live.length === 0
          ? BELIEFS.empty
          : `${live.length} of them ${live.length === 1 ? "is" : "are"} a four or higher. Those are the ones the next screen checks.`}
      </p>
    </div>
  )
}

// ------------------------------------------------------------ belief test

/** The log line for a belief, when there is a log to draw on. */
function LogLine({ state }: { state: StepProps["state"] }) {
  const payoff = payoffSummary(state)
  if (payoff.n === 0) return <p className="text-[11.5px] text-zinc-600 leading-relaxed">{BELIEF_TEST.noLog}</p>
  return (
    <p className="text-[11.5px] text-emerald-200/70 leading-relaxed">
      {BELIEF_TEST.fromLog
        .replace("{expected}", String(payoff.avgExpected))
        .replace("{actual}", String(payoff.avgActual))
        .replace("{n}", `${payoff.n} ${payoff.n === 1 ? "time" : "times"}`)}
    </p>
  )
}

function BeliefRow({ belief, state, on }: { belief: ViceBelief } & Pick<StepProps, "state" | "on">) {
  const verdict = state.answers[`verdict.${belief.id}`] ?? ""
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.02] p-3.5">
      <p className="text-[13.5px] text-zinc-100 leading-snug">{belief.claim}</p>
      <p className="text-[12px] text-zinc-500 mt-1.5 leading-relaxed">{belief.check}</p>
      <div className="mt-2"><LogLine state={state} /></div>

      <div className="flex flex-wrap gap-1.5 mt-3">
        {BELIEF_TEST.verdicts.map((option) => (
          <Chip
            key={option.id}
            label={option.label}
            on={verdict === option.id}
            onClick={() => on.setAnswer(`verdict.${belief.id}`, verdict === option.id ? "" : option.id)}
          />
        ))}
      </div>

      {verdict && (
        <div className="mt-3">
          <Field
            label={BELIEF_TEST.findingLabel}
            value={state.answers[`finding.${belief.id}`] ?? ""}
            onChange={(text) => on.setAnswer(`finding.${belief.id}`, text)}
            rows={2}
          />
        </div>
      )}
    </div>
  )
}

export function StepBeliefTest({ step, state, on }: StepProps) {
  const live = liveBeliefs(state)
  const tally = beliefTally(state)

  return (
    <div>
      <StepHeader title={step.title} blurb={step.blurb} source={step.source} />

      {live.length === 0 ? (
        <Panel tone="quiet">
          <Empty>
            Nothing rated four or higher yet, so there is nothing to check. The previous screen is where that happens.
          </Empty>
        </Panel>
      ) : (
        <>
          <p className="text-[12.5px] text-zinc-400 leading-relaxed">{BELIEF_TEST.intro}</p>

          <div className="space-y-2.5 mt-4">
            {live.map((belief) => (
              <BeliefRow key={belief.id} belief={belief} state={state} on={on} />
            ))}
          </div>

          {tally.judged > 0 && (
            <Panel className="mt-4">
              <p className="text-[13px] text-zinc-200">
                <span className="tabular-nums text-violet-200">{tally.held + tally.mixed}</span> {BELIEF_TEST.summaryHeld},{" "}
                <span className="tabular-nums text-violet-200">{tally.fell}</span> {BELIEF_TEST.summaryFell}.
              </p>
              {tally.held + tally.mixed > 0 && (
                <p className="text-[12.5px] text-zinc-400 mt-1.5 leading-relaxed">
                  The ones still standing are the useful finding. Whatever ends up in its place gets judged on whether it
                  covers them, and a plan that ignores them is a plan that lasts about a fortnight.
                </p>
              )}
            </Panel>
          )}

          <Why label="how well this works, honestly"><p>{BELIEF_TEST.decay}</p></Why>
        </>
      )}
    </div>
  )
}

// ---------------------------------------------------------------- values

/**
 * The card sort, and the two questions asked in both directions.
 *
 * The page never draws the conclusion. It collects what somebody is for, then
 * asks which of it the vice helps and which it obstructs, and stops. Pointing
 * at the gap converts a thing the person noticed into a thing the page claimed,
 * and those two land completely differently.
 */
export function StepValues({ step, state, on }: StepProps) {
  const picked = state.lists["values.picked"] ?? []
  const top = state.lists["values.top"] ?? []

  const toggleTop = (value: string) => {
    if (top.includes(value)) return on.setList("values.top", top.filter((v) => v !== value))
    if (top.length >= 3) return
    on.setList("values.top", [...top, value])
  }

  return (
    <div>
      <StepHeader title={step.title} blurb={step.blurb} source={step.source} />

      <p className="text-[12px] text-zinc-400">{VALUES_STEP.pickLabel}</p>
      <p className="text-[11.5px] text-zinc-600 mt-0.5 mb-2.5 leading-relaxed">{VALUES_STEP.pickHelp}</p>
      <div className="flex flex-wrap gap-1.5">
        {VALUES.map((value) => (
          <Chip
            key={value}
            label={value}
            on={picked.includes(value)}
            onClick={() => {
              on.toggleListItem("values.picked", value)
              // Dropping a value it was built from must not leave it in the top three.
              if (picked.includes(value) && top.includes(value)) {
                on.setList("values.top", top.filter((v) => v !== value))
              }
            }}
          />
        ))}
      </div>

      {picked.length > 0 && (
        <Panel className="mt-5">
          <p className="text-[12.5px] text-zinc-200">{VALUES_STEP.topLabel}</p>
          <p className="text-[11.5px] text-zinc-600 mt-0.5 leading-relaxed">{VALUES_STEP.topHelp}</p>
          {/* Labelled group: these buttons carry the same names as the chips
              above them, so without it neither a screen reader nor a test can
              tell the ranking row from the picker. */}
          <div role="group" aria-label="Your top three" className="flex flex-wrap gap-1.5 mt-2.5">
            {picked.map((value) => {
              const rank = top.indexOf(value)
              return (
                <button
                  key={value}
                  type="button"
                  aria-pressed={rank >= 0}
                  onClick={() => toggleTop(value)}
                  className={`text-[12px] px-3 py-1.5 rounded-full border transition-colors ${
                    rank >= 0
                      ? "border-violet-400/50 bg-violet-500/15 text-violet-100"
                      : "border-white/10 text-zinc-400 hover:border-white/30 hover:text-zinc-200"
                  }`}
                >
                  {rank >= 0 && <span className="tabular-nums opacity-60 mr-1.5">{rank + 1}</span>}
                  {value}
                </button>
              )
            })}
          </div>
        </Panel>
      )}

      {top.length > 0 && (
        <div className="mt-4">
          <Field
            label={VALUES_STEP.livingLabel.replace("the top one", `“${top[0]}”`)}
            help={VALUES_STEP.livingHelp}
            value={state.answers["values.living"] ?? ""}
            onChange={(text) => on.setAnswer("values.living", text)}
            rows={3}
          />
        </div>
      )}

      {picked.length > 0 && (
        <div className="space-y-4 mt-5">
          {/* Helpful half first. A page that will only accept the costs is one
              people stop believing, and they are right to. */}
          <Field
            label={VALUES_STEP.servesLabel}
            help={VALUES_STEP.servesHelp}
            value={state.answers["values.serves"] ?? ""}
            onChange={(text) => on.setAnswer("values.serves", text)}
            rows={3}
          />
          <Field
            label={VALUES_STEP.costsLabel}
            help={VALUES_STEP.costsHelp}
            value={state.answers["values.costs"] ?? ""}
            onChange={(text) => on.setAnswer("values.costs", text)}
            rows={3}
          />
        </div>
      )}

      <Why label="why there is no score here"><p>{VALUES_STEP.closing}</p></Why>
    </div>
  )
}

// --------------------------------------------------------------- futures

/**
 * Two futures per horizon, written as cues rather than as an essay.
 *
 * Short fields on purpose. These get re-read in the ten seconds before a
 * decision, and nobody reads a paragraph then. The changed version is second on
 * every row so it is the one left on screen, and it is the one that gets
 * carried into the card and the urge tool.
 */
export function StepFutures({ step, state, on }: StepProps) {
  const cues = futureCues(state)
  // One horizon, and the rest behind a button.
  //
  // This screen used to render eight textareas — four horizons, unchanged and
  // changed — which on a phone is four full screens of scrolling. The
  // mechanism needs one or two vivid cues, not eight, so asking for eight
  // mostly produced none. The first horizon is the nearest one because a
  // month out is the easiest to actually picture.
  const [showAll, setShowAll] = useState(cues.length > 1)
  const horizons = showAll ? HORIZONS : HORIZONS.slice(0, 1)

  return (
    <div>
      <StepHeader title={step.title} blurb={step.blurb} source={step.source} />

      <ul className="space-y-1">
        {FUTURES.rules.map((rule, i) => (
          <li key={i} className="text-[12px] text-zinc-400 leading-relaxed">— {rule}</li>
        ))}
      </ul>
      <Why label="why a specific evening beats a general intention"><p>{FUTURES.why}</p></Why>

      <div className="space-y-5 mt-5">
        {horizons.map((horizon) => (
          <div key={horizon.id} className="rounded-xl border border-white/10 bg-white/[0.02] p-3.5">
            <p className="text-[13.5px] font-medium text-zinc-100">{horizon.label}</p>
            <p className="text-[11.5px] text-zinc-600 mt-0.5 leading-relaxed">{horizon.hint}</p>
            <div className="grid gap-3 mt-3 sm:grid-cols-2">
              <Field
                label={FUTURES.unchangedLabel}
                help={FUTURES.unchangedHelp}
                value={state.answers[`future.unchanged.${horizon.id}`] ?? ""}
                onChange={(text) => on.setAnswer(`future.unchanged.${horizon.id}`, text)}
                rows={3}
              />
              <Field
                label={FUTURES.changedLabel}
                help={FUTURES.changedHelp}
                value={state.answers[`future.changed.${horizon.id}`] ?? ""}
                onChange={(text) => on.setAnswer(`future.changed.${horizon.id}`, text)}
                rows={3}
              />
            </div>
          </div>
        ))}
      </div>

      {!showAll && (
        <button
          type="button"
          onClick={() => setShowAll(true)}
          className="mt-3 text-[12px] text-zinc-500 hover:text-white underline underline-offset-2 decoration-white/20 transition-colors"
        >
          Add the further-out ones too — six months, two years, five years
        </button>
      )}

      <p className="text-[11.5px] text-zinc-600 mt-4 leading-relaxed">{FUTURES.order}</p>

      {cues.length > 0 && (
        <Panel tone="live" className="mt-4">
          <p className="text-[12.5px] text-violet-100 leading-relaxed">{FUTURES.useNote}</p>
          <p className="text-[11.5px] text-violet-200/60 mt-1 tabular-nums">
            {cues.length} of {HORIZONS.length} written.
          </p>
        </Panel>
      )}
    </div>
  )
}

// ---------------------------------------------------------------- letter

export function StepLetter({ step, state, on }: StepProps) {
  const kind = state.answers["gives.letter-kind"] ?? ""
  const chosen = LETTER.options.find((o) => o.id === kind) ?? null
  const [showSeeds, setShowSeeds] = useState(false)

  // A goodbye presumes a decision. The line flow is where that gets made, so
  // that is what decides whether the farewell is offered without a caveat.
  const hasLine = (state.answers["line.sentence"] ?? "").trim().length > 0

  return (
    <div>
      <StepHeader title={step.title} blurb={step.blurb} source={step.source} />

      <div className="grid gap-2.5">
        {LETTER.options.map((option) => {
          const active = kind === option.id
          return (
            <button
              key={option.id}
              type="button"
              aria-pressed={active}
              onClick={() => on.setAnswer("gives.letter-kind", option.id)}
              className={`rounded-xl border p-3.5 text-left transition-colors ${
                active ? "border-violet-400/40 bg-violet-500/10" : "border-white/10 bg-white/[0.02] hover:border-white/25"
              }`}
            >
              <span className="block text-[14px] font-medium text-zinc-100">{option.label}</span>
              <span className="block text-[12px] text-zinc-500 mt-0.5 leading-relaxed">{option.help}</span>
              {option.id === "to" && !hasLine && (
                <span className="block text-[11.5px] text-amber-200/70 mt-1.5 leading-relaxed">{LETTER.earlyNote}</span>
              )}
            </button>
          )
        })}
      </div>

      {chosen && (
        <div className="mt-5">
          <Field
            label={chosen.prompt}
            value={state.answers["gives.letter"] ?? ""}
            onChange={(text) => on.setAnswer("gives.letter", text)}
            rows={12}
          />
          <button
            type="button"
            onClick={() => setShowSeeds((v) => !v)}
            className="text-[12px] text-zinc-500 hover:text-zinc-300 transition-colors mt-2"
          >
            {showSeeds ? "hide" : "stuck? a few opening lines"}
          </button>
          {showSeeds && (
            <ul className="mt-2 space-y-1.5">
              {chosen.seeds.map((seed, i) => (
                <li key={i} className="text-[12.5px] text-zinc-400 leading-relaxed italic">&ldquo;{seed}&rdquo;</li>
              ))}
            </ul>
          )}
          {(state.answers["gives.letter"] ?? "").trim().length > 0 && (
            <p className="text-[11.5px] text-emerald-200/70 mt-3">{LETTER.savedNote}</p>
          )}
        </div>
      )}

      <div className="mt-5">
        <PrimaryButton onClick={() => on.setStepDone(step.id, true)}>Done</PrimaryButton>
      </div>

      <Why label="how well this one is evidenced"><p>{LETTER.provenance}</p></Why>
    </div>
  )
}
