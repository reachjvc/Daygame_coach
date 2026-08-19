"use client"

/**
 * The steps made of the person's own data: the expected-against-actual loop,
 * the hour histogram, the daily sequence, and the review.
 *
 * Everything here is arithmetic with a caption. No screen in this file offers
 * an interpretation, because every number in it is theirs and the moment the
 * page starts explaining what their numbers mean about them it has become
 * something to argue with.
 */

import { useState } from "react"
import { X } from "lucide-react"
import type { ViceEpisode } from "../../types"
import { MISSIONS } from "../../data/flows"
import { URGE } from "../../data/copy"
import {
  availableMissions,
  dangerWindow,
  daysHeld,
  emptyEpisode,
  experimentDay,
  experimentEnd,
  payoffSummary,
  urgeSummary,
  votesCast,
  WINDOW_MIN_EPISODES,
} from "../../viceService"
import { CheckRow, Empty, Field, Panel, PrimaryButton, QuietButton, Scale, Stat, StepHeader } from "../Ui"
import type { StepProps } from "./BasicSteps"

// ---------------------------------------------------------------- charts

/**
 * Expected against actual, one pair of dots per episode, joined.
 *
 * Drawn by hand in SVG rather than pulled from a charting library, because it
 * is two series of at most a few dozen points and a dependency would be a
 * heavier thing than the chart.
 */
function PayoffChart({ episodes }: { episodes: ViceEpisode[] }) {
  const points = episodes
    .filter((e) => e.expected !== null && e.actual !== null)
    .slice()
    .reverse()
  if (points.length < 2) return null

  const width = 320
  const height = 110
  const padX = 8
  const padY = 10
  const step = points.length > 1 ? (width - padX * 2) / (points.length - 1) : 0
  const y = (value: number) => padY + (10 - value) * ((height - padY * 2) / 10)
  const path = (pick: (e: ViceEpisode) => number) =>
    points.map((e, i) => `${i === 0 ? "M" : "L"} ${padX + i * step} ${y(pick(e))}`).join(" ")

  return (
    <div>
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto" role="img" aria-label="Expected against actual, over time">
        {[0, 5, 10].map((line) => (
          <line key={line} x1={padX} x2={width - padX} y1={y(line)} y2={y(line)} stroke="rgb(255 255 255 / 0.07)" strokeWidth={1} />
        ))}
        <path d={path((e) => e.expected as number)} fill="none" stroke="rgb(196 181 253 / 0.9)" strokeWidth={2} />
        <path d={path((e) => e.actual as number)} fill="none" stroke="rgb(110 231 183 / 0.9)" strokeWidth={2} />
        {points.map((e, i) => (
          <g key={e.id}>
            <circle cx={padX + i * step} cy={y(e.expected as number)} r={2.5} fill="rgb(196 181 253)" />
            <circle cx={padX + i * step} cy={y(e.actual as number)} r={2.5} fill="rgb(110 231 183)" />
          </g>
        ))}
      </svg>
      <div className="flex gap-4 mt-1.5">
        <span className="text-[11px] text-violet-300">— what you expected</span>
        <span className="text-[11px] text-emerald-300">— what you got</span>
      </div>
    </div>
  )
}

/** The hour histogram. */
function HourChart({ bars, peakHour }: { bars: Array<{ hour: number; count: number }>; peakHour: number | null }) {
  const max = Math.max(1, ...bars.map((b) => b.count))
  return (
    <div>
      <div className="flex items-end gap-px h-24">
        {bars.map((bar) => (
          <div key={bar.hour} className="flex-1 flex flex-col justify-end" title={`${String(bar.hour).padStart(2, "0")}:00 — ${bar.count}`}>
            <div
              className={`rounded-t-sm ${bar.hour === peakHour ? "bg-violet-400/80" : "bg-white/15"}`}
              style={{ height: `${(bar.count / max) * 100}%`, minHeight: bar.count > 0 ? 3 : 0 }}
            />
          </div>
        ))}
      </div>
      <div className="flex justify-between text-[10px] text-zinc-600 mt-1 tabular-nums">
        <span>00</span><span>06</span><span>12</span><span>18</span><span>23</span>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------- the log

/**
 * The loop.
 *
 * Two rules that are not negotiable. The expected rating is taken before, never
 * after — a number remembered afterwards is a number rewritten by what
 * happened. And nothing in this flow requires abstaining: the completed state
 * is compatible with having done it, because the moment logging becomes a test
 * the honest entries stop arriving and the data is worthless.
 */
export function StepLog({ step, state, today, on }: StepProps) {
  const [open, setOpen] = useState<string | null>(null)
  const [expected, setExpected] = useState(5)
  const payoff = payoffSummary(state)

  const startOne = () => {
    const id = `ep-${state.episodes.length}-${state.episodes.length + 1}`
    const at = new Date().toISOString()
    on.addEpisode({ ...emptyEpisode(id, at), expected, actedOn: true })
    setOpen(id)
  }

  const openEpisode = state.episodes.find((e) => e.id === open) ?? null

  return (
    <div>
      <StepHeader title={step.title} blurb={step.blurb} caution={step.caution} source={step.source} />

      <Panel tone="live">
        <p className="text-[13px] text-violet-100">About to do it?</p>
        <p className="text-[12px] text-violet-200/70 mt-0.5 leading-relaxed">
          One number first, then go and do it. Come back afterwards for the second.
        </p>
        <div className="mt-3">
          <Scale
            label="How good is this going to be?"
            value={expected}
            onChange={setExpected}
            lowAnchor="Nothing much"
            highAnchor="Exactly what I want"
          />
        </div>
        <div className="flex items-center gap-3 mt-3">
          <PrimaryButton onClick={startOne}>Logged. Going to do it</PrimaryButton>
          <QuietButton onClick={on.openUrge}>Actually, it is just an urge →</QuietButton>
        </div>
      </Panel>

      {openEpisode && (
        <Panel className="mt-3">
          <p className="text-[13px] text-zinc-200">Afterwards</p>
          <p className="text-[12px] text-zinc-500 mt-0.5 leading-relaxed">
            Expected {openEpisode.expected}. No wrong answer here, and a ten is a real answer.
          </p>
          <div className="space-y-4 mt-3">
            <Scale
              label="How was it, actually?"
              value={openEpisode.actual ?? undefined}
              onChange={(n) => on.updateEpisode(openEpisode.id, { actual: n })}
              lowAnchor="Nothing much"
              highAnchor="Exactly what I wanted"
            />
            <Scale
              label="And half an hour later?"
              help="Optional, and the most interesting of the three."
              value={openEpisode.later ?? undefined}
              onChange={(n) => on.updateEpisode(openEpisode.id, { later: n })}
              lowAnchor="Worse"
              highAnchor="Still good"
            />
            <Field
              label="What did you notice?"
              help="Taste, body, head. One line is plenty."
              value={openEpisode.notes}
              onChange={(text) => on.updateEpisode(openEpisode.id, { notes: text })}
              rows={2}
            />
          </div>
          <div className="mt-3">
            <PrimaryButton onClick={() => setOpen(null)}>Done</PrimaryButton>
          </div>
        </Panel>
      )}

      {payoff.n >= 2 && (
        <Panel className="mt-4">
          <PayoffChart episodes={state.episodes} />
          {/* Arithmetic and nothing else. The moment this sentence editorialises,
              it becomes a thing to disagree with rather than a thing they wrote. */}
          <p className="text-[13px] text-zinc-200 mt-3 leading-relaxed">
            You expect {payoff.avgExpected}. You get {payoff.avgActual}.
            {payoff.avgLater !== null && ` Half an hour on, ${payoff.avgLater}.`}{" "}
            <span className="text-zinc-500">Over {payoff.n} {payoff.n === 1 ? "time" : "times"}.</span>
          </p>
        </Panel>
      )}

      {state.episodes.length > 0 && (
        <div className="mt-4">
          <p className="text-[12px] text-zinc-500 mb-2">Everything logged</p>
          <ul className="space-y-1.5">
            {state.episodes.slice(0, 12).map((episode) => (
              <li key={episode.id} className="flex items-start gap-2 rounded-lg border border-white/[0.07] bg-white/[0.015] px-3 py-2">
                <span className="text-[11px] text-zinc-600 tabular-nums shrink-0">{episode.at.slice(5, 16).replace("T", " ")}</span>
                <span className="flex-1 min-w-0 text-[12px] text-zinc-400">
                  {episode.actedOn === false
                    ? `urge, ${episode.intensity ?? "–"}/10${episode.minutes !== null ? `, ${episode.minutes} min, passed` : ", passed"}`
                    : `${episode.expected ?? "–"} expected, ${episode.actual ?? "–"} got`}
                  {episode.notes && <span className="text-zinc-500"> — {episode.notes}</span>}
                </span>
                <button
                  type="button"
                  onClick={() => on.removeEpisode(episode.id)}
                  aria-label="Remove this entry"
                  className="p-0.5 text-zinc-700 hover:text-rose-300 transition-colors shrink-0"
                >
                  <X className="size-3" />
                </button>
              </li>
            ))}
          </ul>
          {state.episodes.length > 12 && (
            <p className="text-[11px] text-zinc-600 mt-2">and {state.episodes.length - 12} more.</p>
          )}
        </div>
      )}

      {state.episodes.length === 0 && (
        <p className="text-[12px] text-zinc-500 mt-4 leading-relaxed">
          Nothing logged yet. The chart appears at two entries, and the numbers start being worth reading at about ten. Today, {today}, is a reasonable place to start.
        </p>
      )}
    </div>
  )
}

// ---------------------------------------------------------------- window

export function StepWindow({ step, state, on }: StepProps) {
  const window = dangerWindow(state)
  const enough = window.n >= WINDOW_MIN_EPISODES
  return (
    <div>
      <StepHeader title={step.title} blurb={step.blurb} source={step.source} />

      {enough ? (
        <Panel>
          <HourChart bars={window.bars} peakHour={window.peakHour} />
          {window.peakHour !== null && (
            <p className="text-[13px] text-zinc-200 mt-3">
              Yours clusters around {String(window.peakHour).padStart(2, "0")}:00.{" "}
              <span className="text-zinc-500">From {window.n} {window.n === 1 ? "entry" : "entries"}.</span>
            </p>
          )}
        </Panel>
      ) : (
        <Panel tone="quiet">
          <Empty>
            {window.n === 0
              ? `Nothing logged yet, so there is no histogram to draw. It needs about ${WINDOW_MIN_EPISODES} entries before a peak means anything rather than being two points wearing a conclusion.`
              : `${window.n} so far. A few more and the chart replaces the box below — a peak drawn from ${window.n} is noise.`}
          </Empty>
        </Panel>
      )}

      <Panel className="mt-3">
        <Field
          label={enough ? "Does that match what you would have guessed?" : "In the meantime: when do you think it is worst?"}
          help="People are reliably wrong about this, which is why the chart exists. Your guess is still worth writing down to compare."
          value={state.answers["window.named"] ?? ""}
          onChange={(text) => on.setAnswer("window.named", text)}
          rows={2}
        />
      </Panel>

      <Panel className="mt-3">
        <Field
          label="What is that hour actually replacing?"
          help="Coming off work, being alone, the silence, nothing in the diary, one specific person."
          value={state.answers["window.replacing"] ?? ""}
          onChange={(text) => on.setAnswer("window.replacing", text)}
          rows={2}
        />
        <div className="mt-4">
          <Field
            label="What goes in it instead, tomorrow?"
            help="Something arranged rather than intended. An arrangement has another person in it."
            value={state.answers["window.instead"] ?? ""}
            onChange={(text) => on.setAnswer("window.instead", text)}
            rows={2}
          />
        </div>
      </Panel>
    </div>
  )
}

// --------------------------------------------------------------- missions

export function StepMissions({ step, state, today, on }: StepProps) {
  const day = experimentDay(state, today)
  const available = availableMissions(state, today)
  const doneCount = Object.keys(state.missionsDone).length

  return (
    <div>
      <StepHeader title={step.title} blurb={step.blurb} source={step.source} />

      {day === null && (
        <Panel tone="quiet" className="mb-3">
          <Empty>
            No period set yet, so this is showing day one only. Pick a length and a start date and the rest arrive one a day.
          </Empty>
          {/* An empty state that names the step it needs and does not go there
              is a dead end wearing a hint's clothes. */}
          <div className="mt-2">
            <QuietButton onClick={() => on.goToStep("exp.length")}>Go and pick one →</QuietButton>
          </div>
        </Panel>
      )}

      {day !== null && (
        <div className="flex items-baseline gap-3 mb-3">
          <p className="text-[13px] text-zinc-300">
            Day {Math.min(day, MISSIONS.length)}{state.experiment.days ? ` of ${state.experiment.days}` : ""}
          </p>
          <p className="text-[11px] text-zinc-600 tabular-nums">{doneCount} done</p>
        </div>
      )}

      <div className="space-y-2">
        {available.slice().reverse().map((mission) => (
          <CheckRow
            key={mission.day}
            label={`${mission.day}. ${mission.title}`}
            note={mission.body}
            on={Boolean(state.missionsDone[mission.day])}
            onClick={() => on.toggleMission(mission.day)}
          />
        ))}
      </div>

      {/* The sequence has no reset in it and says so, because the thing that
          makes somebody stop opening one of these is a number going to nought
          on the evening they most needed the page. */}
      <p className="text-[11px] text-zinc-600 mt-4 leading-relaxed">
        A missed day stays here rather than expiring, and nothing in this list resets. Doing day three on day nine is doing day three.
      </p>
    </div>
  )
}

// ---------------------------------------------------------------- review

export function StepReview({ step, state, today, on }: StepProps) {
  const payoff = payoffSummary(state)
  const urges = urgeSummary(state)
  const window = dangerWindow(state)
  const end = experimentEnd(state)
  const day = experimentDay(state, today)
  const held = daysHeld(state)
  const votes = votesCast(state)
  const nothing = state.episodes.length === 0

  return (
    <div>
      <StepHeader title={step.title} blurb={step.blurb} source={step.source} />

      {nothing ? (
        <Panel tone="quiet">
          <Empty>
            Nothing logged yet, so there is nothing here that would be true. This screen fills itself in from the log — it does not have an opinion of its own.
          </Empty>
        </Panel>
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <Stat value={String(votes)} caption={`urges came and went without you acting${votes === 0 ? " yet" : ""}`} tone={votes > 0 ? "good" : "plain"} />
            <Stat value={String(held)} caption="days with something logged and nothing done" tone={held > 0 ? "good" : "plain"} />
            <Stat value={payoff.n > 0 ? `${payoff.gap > 0 ? "−" : "+"}${Math.abs(payoff.gap)}` : "–"} caption="the gap between expected and actual" />
            <Stat value={urges.n > 0 ? `${urges.medianMinutes}m` : "–"} caption="your median urge, when you did not act" />
          </div>

          {/* Says what is not known, rather than colouring it in. An app that
              assumes a quiet day was a good day ends up congratulating somebody
              who is holding a drink, and they never trust it again. */}
          <p className="text-[11px] text-zinc-600 mt-2 leading-relaxed">
            Days with nothing logged are not counted either way. This page does not know what happened on them and does not guess.
          </p>

          {payoff.n >= 2 && (
            <Panel className="mt-4">
              <PayoffChart episodes={state.episodes} />
              <p className="text-[13px] text-zinc-200 mt-3">
                Expected {payoff.avgExpected}, got {payoff.avgActual}
                {payoff.avgLater !== null && `, and ${payoff.avgLater} half an hour on`}. Over {payoff.n}.
              </p>
            </Panel>
          )}

          {urges.n > 0 && (
            <Panel className="mt-3">
              <p className="text-[13px] text-zinc-200">
                The ones you did not act on ran {urges.medianMinutes} minutes in the middle, and {urges.maxMinutes} at the longest.
              </p>
              <p className="text-[11px] text-zinc-600 mt-1.5 leading-relaxed">{URGE.durationPolicy}</p>
            </Panel>
          )}

          {window.peakHour !== null && (
            <Panel className="mt-3">
              <HourChart bars={window.bars} peakHour={window.peakHour} />
              <p className="text-[13px] text-zinc-200 mt-2">Clustered around {String(window.peakHour).padStart(2, "0")}:00.</p>
            </Panel>
          )}
        </>
      )}

      {(state.answers["exp.find-out"] || state.answers["exp.worst"]) && (
        <Panel tone="quiet" className="mt-4">
          <p className="text-[12px] text-zinc-500">What you wrote at the start</p>
          {state.answers["exp.find-out"] && (
            <p className="text-[13px] text-zinc-300 mt-1.5 leading-relaxed">
              <span className="text-zinc-500">Wanted to know:</span> {state.answers["exp.find-out"]}
            </p>
          )}
          {state.answers["exp.worst"] && (
            <p className="text-[13px] text-zinc-300 mt-1.5 leading-relaxed">
              <span className="text-zinc-500">Thought the worst part would be:</span> {state.answers["exp.worst"]}
            </p>
          )}
          <Field
            label="Was it?"
            value={state.answers["review.was-it"] ?? ""}
            onChange={(text) => on.setAnswer("review.was-it", text)}
            rows={2}
          />
        </Panel>
      )}

      {end && (
        <p className="text-[12px] text-zinc-500 mt-4">
          {day !== null && state.experiment.days !== null && day > state.experiment.days
            ? `The period ended on ${end}.`
            : `The period ends on ${end}.`}
        </p>
      )}

      <Panel tone="live" className="mt-4">
        <Field
          label="Knowing what you know now, what is the next period?"
          help="Same again, longer, different terms, or stop here. All four are real answers and this page has no preference between them."
          value={state.answers["review.next"] ?? ""}
          onChange={(text) => on.setAnswer("review.next", text)}
          rows={3}
        />
      </Panel>
    </div>
  )
}
