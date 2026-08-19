"use client"

/**
 * The three things that have to be reachable in one tap from anywhere, on the
 * worst night, without setting anything up first.
 *
 *   The urge tool   — something is happening right now.
 *   The lapse tool  — it already happened.
 *   The card        — the three reasons and the line, and nothing else.
 *
 * None of them requires a flow to have been completed, or a vice to have been
 * picked, or an account. Roughly half of the quit attempts that work are not
 * planned in advance, and a product that can only help people who did the
 * onboarding is shut to the half most likely to succeed.
 */

import { useEffect, useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import type { ViceEpisode, ViceHandlers, ViceState } from "../types"
import { BODY_PLACES, BODY_TEXTURES } from "../data/vices"
import { FEELINGS, LAPSE, PERMISSION_THOUGHTS, RESPOND, URGE } from "../data/copy"
import { cueForUrge, emptyEpisode, futureCues, refusalLadder, urgeSummary } from "../viceService"
import { Chip, ChipBank, Empty, Field, LineList, Panel, PrimaryButton, QuietButton, Scale, Why } from "./Ui"
import { OneVoice } from "./Voices"

// ---------------------------------------------------------------- urge

type UrgeStage = "halt" | "name" | "body" | "rate" | "respond" | "close"

const STAGES: UrgeStage[] = ["halt", "name", "body", "rate", "respond", "close"]

/**
 * The urge tool.
 *
 * The order is the mechanism: name the feeling, find it in the body, rate it,
 * then wait without arguing with it. Naming takes measurable heat out of a
 * feeling, and locating it somewhere physical cannot be done while still
 * wanting the thing — it moves a person from inside the urge to looking at it.
 *
 * `URGE.standing` stays on screen for every stage. Take the demand away and
 * observing becomes possible; leave it in and this is one more test to fail,
 * and the honest entries stop arriving.
 */
export function UrgeTool({ state, on, onClose, onLapse }: {
  state: ViceState
  on: ViceHandlers
  onClose: () => void
  onLapse: (episodeId: string) => void
}) {
  const [stage, setStage] = useState<UrgeStage>("halt")
  const [episodeId] = useState(() => `urge-${state.episodes.length}-${STAGES.length}`)
  const [halt, setHalt] = useState<string[]>([])
  const [feelings, setFeelings] = useState<string[]>([])
  const [places, setPlaces] = useState<string[]>([])
  const [textures, setTextures] = useState<string[]>([])
  const [intensity, setIntensity] = useState(6)
  const [after, setAfter] = useState<number | null>(null)
  const [seconds, setSeconds] = useState(90)
  const [running, setRunning] = useState(false)
  const [where, setWhere] = useState<string | null>(null)
  const [choice, setChoice] = useState<string | null>(null)
  const [startedAt] = useState(() => Date.now())

  useEffect(() => {
    if (!running || seconds <= 0) return
    const timer = window.setInterval(() => setSeconds((s) => Math.max(0, s - 1)), 1000)
    return () => window.clearInterval(timer)
  }, [running, seconds])

  const minutesSoFar = () => Math.max(1, Math.round((Date.now() - startedAt) / 60_000))

  const finish = (acted: boolean) => {
    const episode: ViceEpisode = {
      ...emptyEpisode(episodeId, new Date().toISOString()),
      actedOn: acted,
      intensity,
      after: after,
      minutes: acted ? null : minutesSoFar(),
      feelings,
      body: [...places, ...textures],
      trigger: halt.join(", "),
    }
    on.addEpisode(episode)
    if (acted) onLapse(episode.id)
    else onClose()
  }

  const index = STAGES.indexOf(stage)
  const next = () => setStage(STAGES[Math.min(STAGES.length - 1, index + 1)])
  const summary = urgeSummary(state)
  // The whole reason the futures flow writes short cues. Imagining a specific
  // later moment is the bit with a trial behind it, and it works at the point
  // of the decision rather than in a flow somebody finished in March. Held in
  // state so it cannot change under the reader mid-wait.
  const [cue] = useState(() => cueForUrge(state))
  const cueRich = RESPOND.whereOptions.some((w) => w.id === where && w.cueRich)
  // In a cue-rich room the two attention-away responses go first. Ordering is
  // the whole intervention here — the list is the same, the default is not.
  const ordered = cueRich
    ? [...RESPOND.options].sort((a, b) => Number(b.id === "out") - Number(a.id === "out"))
    : RESPOND.options

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose() }}>
      <DialogContent className="sm:max-w-lg max-h-[88vh] overflow-y-auto bg-zinc-950 border-white/10 text-white">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold text-white">{URGE.title}</DialogTitle>
        </DialogHeader>

        {/* Never hidden, never conditional, on every stage. */}
        <p className="rounded-xl border border-violet-400/25 bg-violet-500/[0.07] px-3 py-2 text-[12.5px] text-violet-100/90">
          {URGE.standing}
        </p>

        <div className="flex gap-1 mt-1" aria-hidden>
          {STAGES.map((s, i) => (
            <span key={s} className={`h-0.5 flex-1 rounded-full ${i <= index ? "bg-violet-400/60" : "bg-white/10"}`} />
          ))}
        </div>

        <div className="mt-2">
          {stage === "halt" && (
            <div>
              <h3 className="text-[14px] font-medium text-zinc-100">{URGE.steps.halt.title}</h3>
              <p className="text-[12px] text-zinc-500 mt-0.5 leading-relaxed">{URGE.steps.halt.blurb}</p>
              <div className="flex flex-wrap gap-1.5 mt-3">
                {URGE.steps.halt.options.map((option) => (
                  <Chip
                    key={option}
                    label={option}
                    on={halt.includes(option)}
                    onClick={() => setHalt((h) => (h.includes(option) ? h.filter((x) => x !== option) : [...h, option]))}
                  />
                ))}
              </div>
              {halt.length > 0 && (
                <div className="mt-3">
                  <Field
                    label={URGE.steps.halt.followUp}
                    value={state.answers["urge.halt-fix"] ?? ""}
                    onChange={(text) => on.setAnswer("urge.halt-fix", text)}
                    rows={2}
                  />
                </div>
              )}
              <div className="flex items-center gap-3 mt-4">
                <PrimaryButton onClick={next}>{halt.length > 0 ? "Still an urge though" : "None of those"}</PrimaryButton>
              </div>
            </div>
          )}

          {stage === "name" && (
            <div>
              <h3 className="text-[14px] font-medium text-zinc-100">{URGE.steps.name.title}</h3>
              <p className="text-[12px] text-zinc-500 mt-0.5 leading-relaxed">{URGE.steps.name.blurb}</p>
              <div className="mt-3">
                <ChipBank
                  label="What is the feeling"
                  hideLabel
                  options={FEELINGS}
                  selected={feelings}
                  onToggle={(item) => setFeelings((f) => (f.includes(item) ? f.filter((x) => x !== item) : [...f, item]))}
                />
              </div>
              <div className="mt-4"><PrimaryButton onClick={next}>Next</PrimaryButton></div>
            </div>
          )}

          {stage === "body" && (
            <div>
              <h3 className="text-[14px] font-medium text-zinc-100">{URGE.steps.body.title}</h3>
              <p className="text-[12px] text-zinc-500 mt-0.5 leading-relaxed">{URGE.steps.body.blurb}</p>
              <div className="space-y-3 mt-3">
                <ChipBank
                  label="Where"
                  options={BODY_PLACES}
                  selected={places}
                  onToggle={(item) => setPlaces((p) => (p.includes(item) ? p.filter((x) => x !== item) : [...p, item]))}
                  allowCustom={false}
                />
                <ChipBank
                  label="What it is like there"
                  options={BODY_TEXTURES}
                  selected={textures}
                  onToggle={(item) => setTextures((t) => (t.includes(item) ? t.filter((x) => x !== item) : [...t, item]))}
                  allowCustom={false}
                />
              </div>
              <div className="mt-4"><PrimaryButton onClick={next}>Next</PrimaryButton></div>
            </div>
          )}

          {stage === "rate" && (
            <div>
              <h3 className="text-[14px] font-medium text-zinc-100">{URGE.steps.rate.title}</h3>
              <p className="text-[12px] text-zinc-500 mt-0.5 leading-relaxed">{URGE.steps.rate.blurb}</p>
              <div className="mt-3">
                <Scale label="Right now" value={intensity} onChange={setIntensity} lowAnchor="Barely there" highAnchor="All of it" />
              </div>
              <div className="mt-4"><PrimaryButton onClick={() => setStage("respond")}>What to do with it</PrimaryButton></div>
            </div>
          )}

          {stage === "respond" && (
            <div>
              <h3 className="text-[14px] font-medium text-zinc-100">{RESPOND.title}</h3>
              <p className="text-[12px] text-zinc-500 mt-0.5 leading-relaxed">{RESPOND.blurb}</p>

              {/* Asked before the options, because it changes which of them is
                  sensible. In a room full of the cue, attention on the urge is
                  the harder road and a practitioner who teaches this says so. */}
              <div className="mt-3">
                <p className="text-[12px] text-zinc-400">{RESPOND.whereQuestion}</p>
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {RESPOND.whereOptions.map((w) => (
                    <Chip key={w.id} label={w.label} on={where === w.id} onClick={() => setWhere(where === w.id ? null : w.id)} />
                  ))}
                </div>
                {cueRich && (
                  <p className="text-[12.5px] text-amber-100/90 mt-2.5 leading-relaxed rounded-xl border border-amber-400/25 bg-amber-500/[0.06] px-3 py-2">
                    {RESPOND.cueRichNote}
                  </p>
                )}
              </div>

              <div className="grid gap-2 mt-4">
                {ordered.map((option) => {
                  const active = choice === option.id
                  return (
                    <button
                      key={option.id}
                      type="button"
                      aria-pressed={active}
                      onClick={() => { setChoice(option.id); if (option.id === "watch") setRunning(true) }}
                      className={`rounded-xl border p-3.5 text-left transition-colors ${
                        active ? "border-violet-400/40 bg-violet-500/10" : "border-white/10 bg-white/[0.02] hover:border-white/25"
                      }`}
                    >
                      <span className="block text-[14px] font-medium text-zinc-100">{option.label}</span>
                      <span className="block text-[12px] text-zinc-400 mt-0.5 leading-relaxed">{option.help}</span>

                    </button>
                  )
                })}
              </div>

              {choice === "tape" && (
                <div className="mt-4">
                  <Field
                    label={RESPOND.tapePrompt}
                    value={state.answers["urge.tape"] ?? ""}
                    onChange={(text) => on.setAnswer("urge.tape", text)}
                    rows={4}
                  />
                </div>
              )}
              {choice === "out" && (
                <div className="mt-4">
                  <Field
                    label={RESPOND.outPrompt}
                    value={state.answers["urge.out"] ?? ""}
                    onChange={(text) => on.setAnswer("urge.out", text)}
                    rows={2}
                  />
                </div>
              )}
              {choice === "move" && (
                <div className="mt-4">
                  <Field
                    label={RESPOND.movePrompt}
                    value={state.answers["urge.move"] ?? ""}
                    onChange={(text) => on.setAnswer("urge.move", text)}
                    rows={2}
                  />
                </div>
              )}
              {choice === "watch" && (
                <div className="mt-4">
                  <p className="text-[12px] text-zinc-500 leading-relaxed">{URGE.steps.wait.blurb}</p>
                  <p className="text-5xl tabular-nums text-violet-200 text-center my-5">
                    {String(Math.floor(seconds / 60))}:{String(seconds % 60).padStart(2, "0")}
                  </p>
                  {seconds > 0 ? (
                    <div className="flex items-center justify-center gap-4">
                      <QuietButton onClick={() => setRunning((r) => !r)}>{running ? "pause" : "resume"}</QuietButton>
                      <QuietButton onClick={() => setSeconds(0)}>skip</QuietButton>
                    </div>
                  ) : (
                    <Scale label={URGE.steps.wait.after} value={after ?? intensity} onChange={setAfter} lowAnchor="Gone" highAnchor="Worse" />
                  )}
                  {summary.n > 0 && (
                    <p className="text-[11px] text-zinc-600 mt-4 leading-relaxed text-center">
                      Your last {summary.n} that passed ran {summary.medianMinutes} minutes in the middle, {summary.maxMinutes} at the longest.
                    </p>
                  )}
                </div>
              )}

              {/* Their own future cue if they wrote one, somebody else's account
                  if they did not. The fallback is what makes this screen work on
                  a first visit, when nothing has been set up. */}
              {cue ? (
                <div className="mt-5 rounded-xl border border-violet-400/25 bg-violet-500/[0.07] px-3.5 py-3">
                  <p className="text-[11px] text-violet-200/60">{cue.label}, if this one goes the other way</p>
                  <p className="text-[13.5px] text-violet-50 mt-1 leading-relaxed">{cue.changed}</p>
                </div>
              ) : (
                <div className="mt-5">
                  <OneVoice stage="urge" viceId={state.viceId} rotate={state.episodes.length} />
                </div>
              )}

              <Why label="why four options rather than one">
                {RESPOND.options.map((o) => (<p key={o.id}><strong className="text-zinc-400">{o.label}.</strong> {o.basis}</p>))}
                <p>{RESPOND.anyIsFine}</p>
              </Why>
              <div className="mt-4"><PrimaryButton onClick={next}>What happened</PrimaryButton></div>
            </div>
          )}

          {stage === "close" && (
            <div>
              <h3 className="text-[14px] font-medium text-zinc-100">{URGE.steps.close.title}</h3>
              <div className="grid gap-2 mt-3">
                <button
                  type="button"
                  onClick={() => finish(false)}
                  className="rounded-xl border border-emerald-400/30 bg-emerald-500/[0.08] px-4 py-3 text-left text-[14px] text-emerald-100 hover:bg-emerald-500/15 transition-colors"
                >
                  {URGE.steps.close.passed}
                  <span className="block text-[11px] text-emerald-200/60 mt-0.5">Logged as about {minutesSoFar()} {minutesSoFar() === 1 ? "minute" : "minutes"}.</span>
                </button>
                <button
                  type="button"
                  onClick={() => finish(true)}
                  className="rounded-xl border border-white/10 bg-white/[0.02] px-4 py-3 text-left text-[14px] text-zinc-200 hover:border-white/25 transition-colors"
                >
                  {URGE.steps.close.acted}
                  <span className="block text-[11px] text-zinc-500 mt-0.5">Goes straight to the debrief. Nothing resets.</span>
                </button>
              </div>
              <Why label="why logging it is the useful bit"><p>{URGE.steps.close.actedNote}</p></Why>
            </div>
          )}
        </div>

        {/* Available at every stage. Somebody mid-urge who wants the card
            should not have to finish a wizard to reach it. */}
        <div className="flex items-center justify-between gap-3 mt-5 pt-3 border-t border-white/[0.07]">
          <QuietButton onClick={onClose}>close</QuietButton>
          {index > 0 && stage !== "close" && (
            <QuietButton onClick={() => setStage(STAGES[index - 1])}>back</QuietButton>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ---------------------------------------------------------------- lapse

/**
 * After it happened.
 *
 * Built against the thing that turns one lapse into abandoning the attempt: a
 * change of identity plus a stable, internal explanation. So there is no red,
 * no cross, no counter going to nought, and the questions can only be answered
 * at the level of what happened rather than what kind of person somebody is.
 *
 * Then the chain backwards, because the decision was almost always taken
 * several apparently unrelated choices before the moment it looked like it was
 * — and finally the next hour, which is the only part still open.
 */
export function LapseTool({ state, on, onClose }: { state: ViceState; on: ViceHandlers; onClose: () => void }) {
  const chain = state.lists["lapse.chain"] ?? []
  const [showThoughts, setShowThoughts] = useState(false)

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose() }}>
      <DialogContent className="sm:max-w-lg max-h-[88vh] overflow-y-auto bg-zinc-950 border-white/10 text-white">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold text-white">{LAPSE.title}</DialogTitle>
        </DialogHeader>

        <p className="text-[13px] text-zinc-300 leading-relaxed">{LAPSE.opener}</p>

        <Panel tone="quiet" className="mt-1">
          <p className="text-[12px] text-zinc-400 leading-relaxed">{LAPSE.compassion.prompt}</p>
          <div className="mt-2">
            <Field
              label=""
              ariaLabel={LAPSE.compassion.prompt}
              value={state.answers["lapse.compassion"] ?? LAPSE.compassion.draft}
              onChange={(text) => on.setAnswer("lapse.compassion", text)}
              rows={3}
            />
          </div>
        </Panel>

        <div className="space-y-3 mt-3">
          {LAPSE.questions.map((question) => (
            <Field
              key={question.id}
              label={question.label}
              value={state.answers[`lapse.${question.id}`] ?? ""}
              onChange={(text) => on.setAnswer(`lapse.${question.id}`, text)}
              rows={2}
            />
          ))}
        </div>

        <button
          type="button"
          onClick={() => setShowThoughts((v) => !v)}
          className="text-[12px] text-zinc-500 hover:text-zinc-300 transition-colors mt-3 text-left"
        >
          {showThoughts ? "hide" : "was it one of the usual twelve?"}
        </button>
        {showThoughts && (
          <div className="flex flex-wrap gap-1.5 mt-2">
            {PERMISSION_THOUGHTS.map((item) => (
              <Chip
                key={item.id}
                label={item.thought}
                on={(state.lists["lapse.thoughts"] ?? []).includes(item.thought)}
                onClick={() => on.toggleListItem("lapse.thoughts", item.thought)}
              />
            ))}
          </div>
        )}

        <Panel className="mt-4">
          <p className="text-[13px] text-zinc-200">{LAPSE.chain.title}</p>
          <p className="text-[12px] text-zinc-500 mt-0.5 leading-relaxed">{LAPSE.chain.blurb}</p>
          <div className="mt-3">
            <LineList
              label=""
              ariaLabel={LAPSE.chain.title}
              items={chain}
              onChange={(items) => on.setList("lapse.chain", items)}
              placeholder={LAPSE.chain.prompt}
            />
          </div>
          {chain.length > 0 && chain.length < LAPSE.chain.minSteps && (
            <p className="text-[11px] text-amber-200/70 mt-2">
              {chain.length} of {LAPSE.chain.minSteps}. Keep going backwards — the interesting one is usually further back than it feels.
            </p>
          )}
          {chain.length >= LAPSE.chain.minSteps && (
            <div className="mt-3">
              <Field
                label={LAPSE.chain.earliest}
                value={state.answers["lapse.earliest"] ?? ""}
                onChange={(text) => on.setAnswer("lapse.earliest", text)}
                rows={2}
              />
            </div>
          )}
        </Panel>

        <Panel tone="live" className="mt-3">
          <p className="text-[14px] font-medium text-violet-100">{LAPSE.chain.pivot}</p>
          <p className="text-[12px] text-violet-200/70 mt-0.5 leading-relaxed">{LAPSE.chain.pivotHelp}</p>
          <div className="mt-2">
            <Field
              label=""
              ariaLabel={LAPSE.chain.pivot}
              value={state.answers["lapse.why-today"] ?? ""}
              onChange={(text) => on.setAnswer("lapse.why-today", text)}
              rows={3}
            />
          </div>
        </Panel>

        <Panel className="mt-3">
          <p className="text-[13px] text-zinc-200">{LAPSE.next.title}</p>
          <p className="text-[12.5px] text-zinc-300 mt-1.5 leading-relaxed">{LAPSE.next.notStartingOver}</p>
          <ul className="space-y-1 mt-2">
            {LAPSE.next.lines.map((line, i) => (
              <li key={i} className="text-[12px] text-zinc-400 leading-relaxed">— {line}</li>
            ))}
          </ul>
          <div className="mt-3">
            <Field
              label={LAPSE.next.field}
              value={state.answers["lapse.next-hour"] ?? ""}
              onChange={(text) => on.setAnswer("lapse.next-hour", text)}
              rows={2}
            />
          </div>
        </Panel>

        <div className="mt-4">
          <PrimaryButton onClick={onClose}>Done</PrimaryButton>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ---------------------------------------------------------------- card

/** The three reasons and the line, plus whatever else is already written. */
export function CardTool({ state, on, onClose }: { state: ViceState; on: ViceHandlers; onClose: () => void }) {
  const hasCard = state.card.reasons.length > 0 || state.card.line.trim().length > 0
  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose() }}>
      <DialogContent className="sm:max-w-md max-h-[88vh] overflow-y-auto bg-zinc-950 border-white/10 text-white">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold text-white">Your card</DialogTitle>
        </DialogHeader>

        {hasCard ? (
          <div className="rounded-2xl border border-violet-400/30 bg-violet-500/[0.07] p-4">
            <ul className="space-y-2">
              {state.card.reasons.map((reason, i) => (
                <li key={i} className="text-[15px] text-violet-50 leading-snug">{reason}</li>
              ))}
            </ul>
            {state.card.line && (
              <p className="text-[13px] text-violet-200/80 mt-4 pt-3 border-t border-violet-400/20 italic leading-relaxed">
                {state.card.line}
              </p>
            )}
          </div>
        ) : (
          <Panel tone="quiet">
            <Empty>Nothing written on it yet. Three short reasons and one line is the whole thing, and it takes about five minutes.</Empty>
            <div className="mt-3">
              <LineList
                label="Start here"
                items={state.card.reasons}
                onChange={(reasons) => on.setCard({ reasons })}
                placeholder="One reason, a dozen words at most"
                max={3}
              />
            </div>
          </Panel>
        )}

        {/* The cues live here too, because the card is the thing people open
            at eleven at night and these were written to be opened then. */}
        {futureCues(state).length > 0 && (
          <div className="mt-4">
            <p className="text-[12px] text-zinc-500 mb-1.5">Where the other way goes</p>
            <ul className="space-y-1.5">
              {futureCues(state).map((cue) => (
                <li key={cue.horizonId}>
                  <span className="text-[11px] text-zinc-600">{cue.label}</span>
                  <p className="text-[13px] text-zinc-200 leading-relaxed">{cue.changed}</p>
                </li>
              ))}
            </ul>
          </div>
        )}

        {state.voice.back.length > 0 && (
          <div className="mt-4">
            <p className="text-[12px] text-zinc-500 mb-1.5">What you say back</p>
            <ul className="space-y-1">
              {state.voice.back.map((line, i) => (
                <li key={i} className="text-[13px] text-zinc-300 leading-relaxed">&ldquo;{line}&rdquo;</li>
              ))}
            </ul>
          </div>
        )}

        {state.plans.length > 0 && (
          <div className="mt-4">
            <p className="text-[12px] text-zinc-500 mb-1.5">Your plans</p>
            <ul className="space-y-1">
              {state.plans.map((plan) => (
                <li key={plan.id} className="text-[13px] text-zinc-300 leading-relaxed">
                  <span className="text-zinc-500">When</span> {plan.when}<span className="text-zinc-500">, then I</span> {plan.then}
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="mt-4">
          <p className="text-[12px] text-zinc-500 mb-1.5">If it is offered</p>
          <ul className="space-y-0.5">
            {refusalLadder(state).map((line, i) => (
              <li key={i} className="text-[13px] text-zinc-300">&ldquo;{line}&rdquo;</li>
            ))}
          </ul>
        </div>

        <div className="mt-5">
          <PrimaryButton onClick={onClose}>Close</PrimaryButton>
        </div>
      </DialogContent>
    </Dialog>
  )
}
