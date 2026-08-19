"use client"

/**
 * The guided build. Three steps, and the middle one is five doors.
 *
 * What this replaced was a board: every area on screen at once, every goal set,
 * every target, every practice — 329 controls and nine screens of scrolling,
 * which assumed the hard part was CHOOSING. It is not. A real list of goals
 * looks like "no pain in my back", "bench 28 kg 3×6-8", "one muscle-up",
 * "publish my book", "Masters in League of Legends" — and a catalogue of 166
 * curated targets contains almost none of them.
 *
 * So the order changed. You say which two or three areas this season is about,
 * you get your goals down however you can get them down, and then the app does
 * the part you cannot do alone: asks, one question at a time, what is missing
 * from each one. Where are you now. What will you actually do about it. By
 * when. Why. What it costs you if you never do it.
 *
 * THE MIDDLE STEP USED TO BE A TEXT BOX AND NOTHING ELSE, which assumed the
 * hard part was TYPING. That is not it either. The person who cannot fill that
 * box in cannot fill it in because "what are your goals" is a question almost
 * nobody can answer cold — and every one of them can describe a good Tuesday,
 * or cut up the 10 they wrote one tab back, or say what has been annoying them
 * for a year. So there are five doors into the same list, and which one is
 * easy is a fact about the person rather than about goal-setting.
 *
 * The catalogue is still here, under all of it, as an offer rather than a
 * cover charge.
 */

import { useState } from "react"
import { Check, Plus, X } from "lucide-react"
import type { MilestoneLadderConfig, NsArea, NsGoal, NsPlan, VisionGoalType } from "@/src/goals/types"
import { GOAL_DATE_PRESETS } from "@/src/goals/data/northStar"
import { GUIDE_COPY, GUIDE_QUESTIONS, type GuideQuestionId } from "@/src/goals/data/northStarGuide"
import {
  areaPractices,
  areaReview,
  areaTemplates,
  climbPace,
  formatTargetDate,
  goalMilestones,
  planCascade,
  weeklyLoad,
  goalsInArea,
  guideProgress,
  guideQueue,
  parseGoalDump,
  presetDate,
  seasonAreas,
  suggestedActions,
  targetsForTemplate,
} from "@/src/goals/northStarService"
import type { RoutineNeed } from "@/src/goals/data/northStarBuild"
import { START_RAMPS, type StartRampId } from "@/src/goals/data/northStarStart"
import { AreaBuilder } from "./AreaBuilder"
import { ExperiencesRamp, type ExperienceHandlers } from "./Experiences"
import { IdealDayRamp, type IdealDayHandlers } from "./IdealDay"
import { QuestionsRamp, RampBar, RampChooser, RampHeader, TenRamp } from "./StartRamps"
import { WeekGrid, type WeekHandlers } from "./WeekGrid"
import { SentenceBox } from "./SentenceBox"

export interface GuideHandlers extends IdealDayHandlers, WeekHandlers, ExperienceHandlers {
  onAddDump: (areaId: string, text: string) => void
  onAddTemplate: (areaId: string, templateId: string, level: number) => void
  /** One ready-made goal from the catalogue, added where the area is. */
  onAddTarget: (areaId: string, targetId: string) => void
  onApplyNeed: (need: RoutineNeed) => void
  onTogglePractice: (blueprintId: string, stepId: string, on: boolean) => void
  onRemoveGoal: (goalId: string) => void
  /** A whole set, put back: every goal in this area that arrived with it. */
  onRemoveTemplate: (areaId: string, templateId: string) => void
  /** Rewording a goal after it exists — the thing there was no way to do. */
  onUpdateGoal: (goalId: string, patch: { title: string }) => void
  /** The guide's answers. Each one also marks the question asked. */
  onLadderStart: (goalId: string, start: number) => void
  /** Dragging the curve: the spacing of the rungs is the person's choice. */
  onLadder: (goalId: string, ladder: MilestoneLadderConfig) => void
  /**
   * The rungs, written out by hand.
   *
   * "5 pull-ups → 10 pull-ups → muscle-up" is a climb whose last rung is a
   * different move, and no arithmetic between two numbers will ever produce
   * it. Asked for repeatedly; it existed only inside the goal dialog, which is
   * not where anybody scales anything any more.
   */
  onProgression: (goalId: string, rungs: string[]) => void
  /** The scaling tool's other output: evenly spaced rungs from a range. */
  onMilestones: (goalId: string, spec: { from: number; to: number; count: number; unit?: string; prefix?: string }) => void
  onAction: (goalId: string, title: string, daysPerWeek: number) => void
  onDate: (goalId: string, date: string) => void
  onText: (goalId: string, field: "why" | "painWhy", text: string) => void
  onControllable: (goalId: string, title: string) => void
  /** The builder finishes a goal in place, so it removes actions and reshapes. */
  onRemoveAction: (goalId: string, habitId: string) => void
  onSetType: (goalId: string, type: VisionGoalType) => void
  /** A driver's rate, which is the whole of what a driver is. */
  onDriverDays: (goalId: string, daysPerWeek: number) => void
  /** How much a week, and what it is counted in. A null count drops it. */
  onDriverCount: (goalId: string, count: number | null, unit: string) => void
  /** The number to climb to, when the sentence did not carry one. */
  onSetTarget: (goalId: string, target: number, unit: string) => void
  onSkip: (goalId: string, question: GuideQuestionId) => void
  onOpenArea: (areaId: string) => void
}

type Step = 0 | 1

export function GuidedBuild({ plan, today, handlers }: { plan: NsPlan; today: string; handlers: GuideHandlers }) {
  /**
   * Where to open.
   *
   * Somebody coming back to a plan that already has goals in it does not want
   * to be asked which areas they picked; they want the questions. Somebody
   * arriving at an empty page does not want a queue of nothing.
   */
  const [step, setStep] = useState<Step>(() => (plan.goals.length > 0 ? 1 : 0))
  const progress = guideProgress(plan)
  const queue = guideQueue(plan, plan.seasonAreaIds)

  const steps: Array<{ id: Step; label: string; sub: string }> = [
    // The sub-label ADVERTISES the doors. A returning plan opens on the queue,
    // so without this the only sign that this step is six ways in rather than a
    // text box is a count of what is already written.
    { id: 0, label: "Your goals", sub: plan.goals.length > 0 ? `${plan.goals.length} written · 6 ways in` : "6 ways in" },
    { id: 1, label: "Make them real", sub: queue.length > 0 ? GUIDE_COPY.queueLeft(queue.length) : "nothing missing" },
  ]

  return (
    <section id="ns-board" className="rounded-2xl border border-white/10 bg-white/[0.03] scroll-mt-4 overflow-hidden">
      <nav className="grid grid-cols-2 border-b border-white/10">
        {steps.map((s, i) => {
          const active = s.id === step
          return (
            <button
              key={s.id}
              onClick={() => setStep(s.id)}
              aria-current={active ? "step" : undefined}
              className={`px-4 py-2.5 text-left border-r border-white/[0.07] last:border-r-0 transition-colors ${
                active ? "bg-violet-500/10" : "hover:bg-white/[0.03]"
              }`}
            >
              <span className="flex items-center gap-1.5">
                <span className={`text-[10px] tabular-nums ${active ? "text-violet-200" : "text-zinc-600"}`}>{i + 1}</span>
                <span className={`text-[12.5px] font-medium ${active ? "text-white" : "text-zinc-400"}`}>{s.label}</span>
              </span>
              <span className="block text-[10.5px] text-zinc-500 mt-0.5">{s.sub}</span>
            </button>
          )
        })}
      </nav>

      {step === 0 && <WriteStep plan={plan} today={today} handlers={handlers} onNext={() => setStep(1)} />}
      {step === 1 && <QueueStep plan={plan} today={today} queue={queue} progress={progress} handlers={handlers} onBack={() => setStep(0)} />}
    </section>
  )
}

// ------------------------------------------------------------------- step one

/**
 * The season step used to be here, and it is a tab now.
 *
 * Picking two or three areas out of twelve is not a step inside the goals
 * screen, it is the decision the goals screen depends on — and having it in
 * both places meant two area pickers that could disagree about what the season
 * was. It lives on `FocusTab`, with the one thing and the ordering.
 */

// ------------------------------------------------------------------- step two

/**
 * The five doors, and whichever one is open.
 *
 * THE ROW OF DOORS IS ALWAYS ON SCREEN. It was not, for one version: a plan
 * with goals in it opened straight into the text box, on the argument that
 * somebody returning knows what they want. What that actually did was hide
 * every new way in behind a default — you had to already know the doors existed
 * to go and look for them, which is the exact failure this screen was built to
 * fix, reintroduced one level down. The first user through it said "I don't see
 * the flow as being changed", and they were right.
 *
 * So: the five are a row, always, and the one that is open expands underneath.
 * A first-timer with nothing written gets the full cards instead of the row,
 * because the row is a reminder and the cards are an explanation.
 */
function WriteStep({ plan, today, handlers, onNext }: { plan: NsPlan; today: string; handlers: GuideHandlers; onNext: () => void }) {
  const areas = seasonAreas(plan)
  const [index, setIndex] = useState(0)
  const area = areas[index] ?? areas[0]
  const [text, setText] = useState("")
  const [ramp, setRamp] = useState<StartRampId | null>(() => (plan.goals.length > 0 ? "write" : null))

  /**
   * The builder first, and the season guard after it.
   *
   * This guard used to run first and returned "you have not said what this
   * season is about yet" whenever `seasonAreaIds` was empty — which is the state
   * a fresh plan is in, and the state the partial reset leaves you in. So the
   * builder, which handles an unpicked season perfectly well by offering all
   * twelve areas, never rendered at all. The doors below it are the part that
   * genuinely needs one area chosen.
   */
  if (ramp === null) {
    return (
      <div>
        <AreaBuilder plan={plan} today={today} handlers={handlers} />
        <div className="px-5 pb-4">
          {areas.length === 0 && (
            <button
              onClick={() => handlers.onGoToTab("focus")}
              className="text-[11.5px] text-zinc-500 hover:text-zinc-200 underline decoration-dotted underline-offset-2 transition-colors"
            >
              {GUIDE_COPY.noSeasonGo}
            </button>
          )}
          <details className="mt-2 group/ways">
            <summary className="cursor-pointer list-none text-[11px] text-zinc-500 hover:text-zinc-200 transition-colors">
              {GUIDE_COPY.otherWays}
            </summary>
            <div className="mt-3">
              <RampChooser plan={plan} area={area ?? null} onPick={setRamp} />
            </div>
          </details>
        </div>
        <NextStep onNext={onNext} plan={plan} />
      </div>
    )
  }

  if (!area) {
    return (
      <div className="px-5 py-4">
        <p className="text-[12px] text-zinc-500">{GUIDE_COPY.noSeason}</p>
        <button
          onClick={() => handlers.onGoToTab("focus")}
          className="mt-2 text-[12px] font-medium px-3 py-1.5 rounded-lg border border-white/15 text-zinc-100 hover:bg-white/10 transition-colors"
        >
          {GUIDE_COPY.noSeasonGo}
        </button>
      </div>
    )
  }

  const lines = parseGoalDump(text)
  const existing = goalsInArea(plan, area.id)
  const scope = START_RAMPS.find((r) => r.id === ramp)?.scope ?? "area"

  const add = () => {
    if (lines.length === 0) return
    handlers.onAddDump(area.id, text)
    setText("")
  }

  // The two life-wide doors are their own screens: no area strip above them, no
  // this-area goal list under them, because neither is about one area.
  if (ramp === "day" || ramp === "week" || ramp === "experiences") {
    return (
      <div className="px-5 py-4">
        <RampBar ramp={ramp} onPick={setRamp} />
        {ramp === "day" && <IdealDayRamp plan={plan} handlers={handlers} onBack={() => setRamp(null)} />}
        {ramp === "week" && <WeekGrid plan={plan} handlers={handlers} onBack={() => setRamp(null)} />}
        {ramp === "experiences" && <ExperiencesRamp plan={plan} handlers={handlers} onBack={() => setRamp(null)} />}
        <NextStep onNext={onNext} plan={plan} />
      </div>
    )
  }

  return (
    <div className="px-5 py-4">
      <RampBar ramp={ramp} onPick={setRamp} />

      {scope === "area" && areas.length > 1 && (
        <div className="flex flex-wrap gap-1.5 mb-3">
          {areas.map((a, i) => (
            <button
              key={a.id}
              onClick={() => setIndex(i)}
              aria-pressed={i === index}
              className={`inline-flex items-center gap-1.5 text-[11px] px-2 py-0.5 rounded-full border transition-colors ${
                i === index ? "border-white/35 bg-white/10 text-white" : "border-white/10 text-zinc-400 hover:text-zinc-200"
              }`}
            >
              <span className="size-1.5 rounded-full" style={{ backgroundColor: a.color }} />
              {a.label}
              <span className="text-[9.5px] text-zinc-500 tabular-nums">{goalsInArea(plan, a.id).length}</span>
            </button>
          ))}
        </div>
      )}

      {ramp === "ten" && <TenRamp plan={plan} area={area} today={today} handlers={handlers} onBack={() => setRamp(null)} />}

      {ramp === "questions" && <QuestionsRamp plan={plan} area={area} handlers={handlers} onBack={() => setRamp(null)} />}

      {ramp === "write" && (
        <>
          <RampHeader title={GUIDE_COPY.writeTitle(area.label)} help={GUIDE_COPY.writeHelp} onBack={() => setRamp(null)} />
          {areaReview(plan, area.id).ten.trim() && (
            <p className="text-[11px] text-zinc-500 mt-1.5 border-l-2 pl-2 leading-relaxed" style={{ borderColor: area.color }}>
              Your 10 here: {areaReview(plan, area.id).ten}
            </p>
          )}

          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={7}
            placeholder={GUIDE_COPY.writePlaceholder}
            aria-label={GUIDE_COPY.writeTitle(area.label)}
            className="w-full mt-2.5 rounded-xl border border-white/10 bg-white/[0.02] px-3 py-2.5 text-[13px] text-zinc-100 placeholder:text-zinc-700 focus:outline-none focus:border-white/30 transition-colors leading-relaxed resize-y"
          />
          <div className="flex flex-wrap items-center gap-2 mt-1.5">
            <p className="text-[10.5px] text-zinc-600 min-w-0 flex-1 leading-relaxed">{GUIDE_COPY.writeNumbers}</p>
            <button
              onClick={add}
              disabled={lines.length === 0}
              className="shrink-0 text-[12px] px-3 py-1 rounded-lg border border-white/15 text-zinc-100 hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              {lines.length > 0 ? `${GUIDE_COPY.writeAdd} (${lines.length})` : GUIDE_COPY.writeAdd}
            </button>
          </div>
        </>
      )}

      {existing.length > 0 && (
        <ul className="mt-3 space-y-1">
          {existing.map((goal) => (
            <li key={goal.id} className="group/g flex items-center gap-2 rounded-lg border border-white/[0.07] bg-white/[0.02] px-2.5 py-1.5">
              <span className="text-[10px] shrink-0" aria-hidden>
                {goal.type === "habit_ramp" ? "🔁" : goal.type === "milestone_ladder" ? "🎯" : "🏁"}
              </span>
              <span className="min-w-0 flex-1 text-[12.5px] text-zinc-200">{goal.title}</span>
              {goal.ladder && (
                <span className="text-[10px] text-zinc-600 tabular-nums shrink-0">
                  {goal.ladder.start} → {goal.ladder.target} {goal.unit}
                </span>
              )}
              <button
                onClick={() => handlers.onRemoveGoal(goal.id)}
                aria-label={`Remove ${goal.title}`}
                className="shrink-0 text-zinc-700 hover:text-rose-300 transition-colors"
              ><X className="size-3" /></button>
            </li>
          ))}
        </ul>
      )}

      {ramp !== null && <Offers plan={plan} area={area} handlers={handlers} />}

      <div className="flex items-center gap-3 mt-4">
        {scope === "area" && index < areas.length - 1 ? (
          <button
            onClick={() => setIndex(index + 1)}
            className="text-[12px] text-zinc-400 hover:text-white transition-colors"
          >
            Next area: {areas[index + 1].label} →
          </button>
        ) : <span />}
        <NextStep onNext={onNext} plan={plan} />
      </div>
    </div>
  )
}

/**
 * On to the questions.
 *
 * The same button under every door, because every door ends in the same place
 * and a person who came in through the week grid should not have to find their
 * way back to the text box to get out.
 */
function NextStep({ plan, onNext }: { plan: NsPlan; onNext: () => void }) {
  return (
    <button
      onClick={onNext}
      className="ml-auto block mt-4 text-[12.5px] font-medium px-3 py-1.5 rounded-lg bg-violet-500/20 border border-violet-500/40 text-violet-100 hover:bg-violet-500/30 transition-colors"
    >
      {plan.goals.length > 0 ? GUIDE_COPY.writeNext : GUIDE_COPY.writeSkip}
    </button>
  )
}

/**
 * The catalogue, demoted.
 *
 * It used to be the whole screen. It is worth keeping — somebody who cannot
 * think of anything for Health should not be left staring at an empty box, and
 * a set arrives with numbers, rungs, dates and its routine already filled in —
 * but as the thing under the text box rather than the thing instead of it.
 */
function Offers({ plan, area, handlers }: { plan: NsPlan; area: NsArea; handlers: GuideHandlers }) {
  const [open, setOpen] = useState(false)
  /** Which set is being read before it is accepted. */
  const [preview, setPreview] = useState<string | null>(null)
  const templates = areaTemplates(area)
  const practices = areaPractices(area)
  const previewTemplate = templates.find((t) => t.id === preview) ?? null
  if (templates.length === 0 && practices.length === 0) return null

  return (
    <div className="mt-3 rounded-xl border border-white/[0.07] bg-white/[0.02] px-3 py-2">
      <button
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex items-center gap-2 w-full text-left"
      >
        <span className="text-[11.5px] text-zinc-400">{GUIDE_COPY.writeOr}</span>
        <span className="ml-auto text-[10.5px] text-zinc-600 tabular-nums shrink-0">
          {templates.length} sets · {practices.length} practices
        </span>
      </button>

      {open && (
        <div className="mt-2 space-y-2.5">
          {templates.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {templates.map((t) => {
                const fresh = targetsForTemplate(t).filter((x) => !plan.goals.some((g) => g.title.trim().toLowerCase() === x.label.trim().toLowerCase()))
                return (
                  <button
                    key={t.id}
                    onClick={() => setPreview(preview === t.id ? null : t.id)}
                    aria-pressed={preview === t.id}
                    disabled={fresh.length === 0}
                    title={t.description}
                    className={`inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full border transition-colors disabled:opacity-40 disabled:cursor-default ${
                      preview === t.id ? "border-violet-400/50 bg-violet-500/15 text-violet-50" : "border-white/10 text-zinc-200 hover:bg-white/10 hover:border-white/30"
                    }`}
                  >
                    {fresh.length === 0 ? <Check className="size-2.5" /> : <Plus className="size-2.5 text-zinc-500" />}
                    {t.label}
                    {fresh.length > 0 && <span className="text-[9.5px] text-zinc-500 tabular-nums">+{fresh.length}</span>}
                  </button>
                )
              })}
            </div>
          )}

          {/* WHAT A SET CONTAINS, BEFORE IT IS IN YOUR PLAN.
              Clicking a set used to write every goal in it straight into the
              plan, showing only a count on the way past — so somebody ended up
              with "No Screens Before Bed" among their goals and, correctly,
              said they never chose it. A set is still one click to accept; it
              is now one click to READ first. */}
          {previewTemplate && (
            <div className="rounded-xl border border-white/15 bg-white/[0.04] p-3">
              <p className="text-[11.5px] text-zinc-300">{GUIDE_COPY.setPreview(previewTemplate.label)}</p>
              {previewTemplate.description && (
                <p className="text-[10.5px] text-zinc-500 mt-0.5 leading-relaxed">{previewTemplate.description}</p>
              )}
              <ul className="mt-2 space-y-0.5">
                {targetsForTemplate(previewTemplate).map((target) => {
                  const already = plan.goals.some((g) => g.title.trim().toLowerCase() === target.label.trim().toLowerCase())
                  return (
                    <li key={target.id} className="flex items-baseline gap-1.5 text-[11.5px]">
                      <span className={already ? "text-zinc-600 line-through" : "text-zinc-200"}>{target.label}</span>
                      {already && <span className="text-[10px] text-zinc-600">{GUIDE_COPY.setAlready}</span>}
                    </li>
                  )
                })}
              </ul>
              <div className="flex items-center gap-3 mt-2.5">
                <button onClick={() => setPreview(null)} className="text-[11px] text-zinc-500 hover:text-zinc-200 transition-colors">
                  {GUIDE_COPY.setCancel}
                </button>
                <button
                  onClick={() => { handlers.onAddTemplate(area.id, previewTemplate.id, 1); setPreview(null) }}
                  className="ml-auto text-[12px] font-medium px-3 py-1 rounded-lg bg-violet-500/20 border border-violet-500/40 text-violet-100 hover:bg-violet-500/30 transition-colors"
                >
                  {GUIDE_COPY.setAdd(targetsForTemplate(previewTemplate).filter((x) => !plan.goals.some((g) => g.title.trim().toLowerCase() === x.label.trim().toLowerCase())).length)}
                </button>
              </div>
            </div>
          )}
          {practices.length > 0 && (
            <div>
              <p className="text-[10px] text-zinc-600 mb-1">Practices go into a routine rather than the goal list.</p>
              <div className="flex flex-wrap gap-1.5">
                {practices.map((p) => {
                  const on = plan.routines.some((r) => r.blueprintId === p.blueprintId && r.steps.some((s) => s.id === p.stepId))
                  return (
                    <button
                      key={`${p.blueprintId}-${p.stepId}`}
                      onClick={() => handlers.onTogglePractice(p.blueprintId, p.stepId, !on)}
                      aria-pressed={on}
                      title={`${p.routine} · ${p.daysPerWeek}×/wk`}
                      className={`inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full border transition-colors ${
                        on ? "border-emerald-400/40 bg-emerald-500/10 text-emerald-100" : "border-white/10 text-zinc-300 hover:bg-white/10"
                      }`}
                    >
                      {on ? <Check className="size-2.5" /> : <Plus className="size-2.5 text-zinc-500" />}
                      {p.title}
                    </button>
                  )
                })}
              </div>
            </div>
          )}
          <button
            onClick={() => handlers.onOpenArea(area.id)}
            className="text-[10.5px] text-zinc-500 hover:text-zinc-200 transition-colors"
          >
            Open {area.label} for the whole catalogue →
          </button>
        </div>
      )}
    </div>
  )
}

// ----------------------------------------------------------------- step three

/**
 * One goal, one question, and a way past it.
 *
 * The part of the flow that does the work nobody can do alone. It never asks
 * about something the goal already has, it never asks the same thing twice, and
 * every question can be skipped — a skip is remembered, because a guide that
 * comes back round is nagging.
 */
function QueueStep({ plan, today, queue, progress, handlers, onBack }: {
  plan: NsPlan
  today: string
  queue: Array<{ goal: NsGoal; question: GuideQuestionId }>
  progress: { ready: number; total: number; answered: number; questions: number }
  handlers: GuideHandlers
  onBack: () => void
}) {
  const head = queue[0]

  return (
    <div className="px-5 py-4">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <h2 className="text-sm font-semibold text-zinc-200">{GUIDE_COPY.queueTitle}</h2>
        <span className="text-[11px] text-zinc-500 tabular-nums">{GUIDE_COPY.queueProgress(progress.ready, progress.total)}</span>
        <span className="text-[11px] text-zinc-600 tabular-nums">{GUIDE_COPY.queueAnswered(progress.answered, progress.questions)}</span>
        <button onClick={onBack} className="ml-auto shrink-0 text-[11px] text-zinc-500 hover:text-zinc-200 transition-colors">
          ← add more goals, five ways in
        </button>
      </div>
      <p className="text-[11.5px] text-zinc-400 mt-1 leading-relaxed">{GUIDE_COPY.queueHelp}</p>

      <div className="h-1 rounded-full bg-white/[0.07] mt-2.5 overflow-hidden">
        <div
          className="h-full rounded-full bg-emerald-400/60 transition-all"
          style={{ width: `${progress.questions === 0 ? 0 : Math.round((progress.answered / progress.questions) * 100)}%` }}
        />
      </div>

      {progress.total === 0 ? (
        <p className="text-[12px] text-zinc-500 mt-4">{GUIDE_COPY.queueEmpty}</p>
      ) : !head ? (
        <Built plan={plan} today={today} />
      ) : (
        <QuestionCard
          key={`${head.goal.id}-${head.question}`}
          plan={plan}
          today={today}
          goal={head.goal}
          question={head.question}
          remaining={queue.length}
          handlers={handlers}
        />
      )}
    </div>
  )
}

function QuestionCard({ plan, today, goal, question, remaining, handlers }: {
  plan: NsPlan
  today: string
  goal: NsGoal
  question: GuideQuestionId
  remaining: number
  handlers: GuideHandlers
}) {
  const spec = GUIDE_QUESTIONS[question]
  const area = plan.areas.find((a) => a.id === goal.areaId)
  const [text, setText] = useState("")
  const [days, setDays] = useState(3)
  /** The control question is two questions when the answer is "not mine". */
  const [notMine, setNotMine] = useState(false)

  const save = () => {
    const value = text.trim()
    if (question === "start") {
      const n = Number(value.replace(",", "."))
      if (!Number.isFinite(n)) return
      handlers.onLadderStart(goal.id, n)
    } else if (question === "actions") {
      if (!value) return
      handlers.onAction(goal.id, value, days)
    } else if (question === "why" || question === "cost") {
      if (!value) return
      handlers.onText(goal.id, question === "why" ? "why" : "painWhy", value)
    } else if (question === "control") {
      if (!value) return
      handlers.onControllable(goal.id, value)
    }
    setText("")
  }

  return (
    <div className="mt-3.5 rounded-xl border border-white/10 bg-white/[0.03] p-4">
      <div className="flex items-center gap-2">
        {area && <span className="size-2 rounded-full shrink-0" style={{ backgroundColor: area.color }} />}
        <span className="text-[10.5px] text-zinc-500">{area?.label}</span>
        <span className="ml-auto text-[10.5px] text-zinc-600 tabular-nums shrink-0">{GUIDE_COPY.queueLeft(remaining)}</span>
      </div>

      <p className="text-[15px] font-medium text-white mt-1.5 leading-snug">{spec.ask(goal.title)}</p>
      {question !== "start" && <p className="text-[12px] text-zinc-400 mt-0.5">{goal.title}</p>}
      <p className="text-[11.5px] text-zinc-500 mt-1.5 leading-relaxed">{spec.note}</p>

      {/* -- the answer, by kind ------------------------------------------- */}

      {question === "control" && !notMine && (
        <div className="flex flex-wrap gap-1.5 mt-3">
          <button
            onClick={() => handlers.onSkip(goal.id, "control")}
            className="text-[12px] px-3 py-1.5 rounded-lg border border-white/15 text-zinc-100 hover:bg-white/10 transition-colors"
          >
            {GUIDE_COPY.controlMine}
          </button>
          <button
            onClick={() => setNotMine(true)}
            className="text-[12px] px-3 py-1.5 rounded-lg border border-amber-400/30 text-amber-100 hover:bg-amber-500/10 transition-colors"
          >
            {GUIDE_COPY.controlTheirs}
          </button>
        </div>
      )}

      {question === "control" && notMine && (
        <div className="mt-3">
          <p className="text-[12.5px] text-zinc-200">{GUIDE_COPY.controlFollowUp}</p>
          <p className="text-[11px] text-zinc-500 mt-0.5 leading-relaxed">{GUIDE_COPY.controlFollowUpNote}</p>
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); save() } }}
            placeholder={GUIDE_COPY.controlFollowUpPlaceholder}
            aria-label={GUIDE_COPY.controlFollowUp}
            autoFocus
            className="w-full mt-2 bg-transparent border-b border-white/15 focus:border-white/35 text-[13px] text-zinc-100 placeholder:text-zinc-700 focus:outline-none py-1 transition-colors"
          />
        </div>
      )}

      {question === "start" && (
        <div className="flex items-center gap-2 mt-3">
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); save() } }}
            inputMode="decimal"
            placeholder={spec.placeholder}
            aria-label={spec.ask(goal.title)}
            autoFocus
            className="w-28 bg-transparent border-b border-white/15 focus:border-white/35 text-[15px] tabular-nums text-zinc-100 placeholder:text-zinc-700 focus:outline-none py-1 transition-colors"
          />
          <span className="text-[12px] text-zinc-500">{goal.unit}</span>
          {goal.ladder && (
            <span className="ml-auto text-[10.5px] text-zinc-600 tabular-nums">
              going to {goal.ladder.target} {goal.unit}
            </span>
          )}
        </div>
      )}
      {question === "start" && <Pace goal={goal} start={text} today={today} />}

      {question === "actions" && (
        <div className="mt-3">
          <div className="flex flex-wrap gap-1.5">
            {suggestedActions(plan, goal).map((s) => (
              <button
                key={s.title}
                onClick={() => handlers.onAction(goal.id, s.title, s.daysPerWeek)}
                className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full border border-white/10 text-zinc-200 hover:bg-white/10 hover:border-white/30 transition-colors"
              >
                <Plus className="size-2.5 text-zinc-500" />
                {s.title}
                <span className="text-[9.5px] text-zinc-500 tabular-nums">{s.daysPerWeek}×</span>
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2 mt-2.5">
            <input
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); save() } }}
              placeholder="or write your own"
              aria-label={spec.ask(goal.title)}
              className="min-w-0 flex-1 bg-transparent border-b border-white/15 focus:border-white/35 text-[13px] text-zinc-100 placeholder:text-zinc-700 focus:outline-none py-1 transition-colors"
            />
            <select
              value={days}
              onChange={(e) => setDays(Number(e.target.value))}
              aria-label="Days per week"
              className="bg-white/5 border border-white/10 rounded-md px-1.5 py-1 text-[10.5px] text-zinc-300 focus:outline-none shrink-0"
            >
              {[1, 2, 3, 4, 5, 6, 7].map((n) => <option key={n} value={n} className="bg-zinc-900">{n}×/wk</option>)}
            </select>
          </div>
        </div>
      )}

      {question === "date" && (
        <div className="flex flex-wrap items-center gap-1.5 mt-3">
          {GOAL_DATE_PRESETS.map((preset) => (
            <button
              key={preset.id}
              onClick={() => handlers.onDate(goal.id, presetDate(preset.id) ?? "")}
              title={preset.note}
              className="text-[11.5px] px-2.5 py-1 rounded-full border border-white/10 text-zinc-200 hover:bg-white/10 hover:border-white/30 transition-colors"
            >
              {preset.label}
            </button>
          ))}
          {/* The one people actually have.
              Four round numbers and no way to type a real date is fine for
              "sometime next year" and useless for the goals that have a day
              already: a wedding, a trip, a competition, the month the lease
              ends. Those are the dated goals people care most about hitting. */}
          <label className="inline-flex items-center gap-1.5 text-[11.5px] text-zinc-500">
            or
            <input
              type="date"
              value={goal.targetDate ?? ""}
              onChange={(e) => handlers.onDate(goal.id, e.target.value)}
              aria-label="Pick your own date"
              className="bg-white/5 border border-white/10 rounded-lg px-2 py-1 text-[11.5px] text-zinc-200 focus:outline-none focus:border-white/30 transition-colors [color-scheme:dark]"
            />
          </label>
          <span className="text-[10.5px] text-zinc-600 basis-full mt-0.5">
            Currently {formatTargetDate(goal.targetDate) || "no date"}.
          </span>
        </div>
      )}

      {(question === "why" || question === "cost") && (
        <SentenceBox
          value={text}
          onChange={setText}
          placeholder={spec.placeholder}
          label={spec.ask(goal.title)}
          className="w-full mt-3 rounded-lg border border-white/10 bg-white/[0.02] px-2.5 py-2 text-[13px] text-zinc-100 placeholder:text-zinc-700 focus:outline-none focus:border-white/30 transition-colors leading-relaxed resize-y"
        />
      )}

      <div className="flex items-center gap-2 mt-3">
        <button
          onClick={() => handlers.onSkip(goal.id, question)}
          className="text-[11px] text-zinc-600 hover:text-zinc-300 transition-colors"
        >
          {GUIDE_COPY.skip}
        </button>
        {question !== "date" && !(question === "control" && !notMine) && (
          <button
            onClick={save}
            disabled={!text.trim()}
            className="ml-auto text-[12.5px] font-medium px-3 py-1.5 rounded-lg bg-violet-500/20 border border-violet-500/40 text-violet-100 hover:bg-violet-500/30 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {GUIDE_COPY.save}
          </button>
        )}
      </div>
    </div>
  )
}

/**
 * The end of the queue, and the point of the whole screen.
 *
 * The guide used to finish on one green sentence — "every goal has what it
 * needs" — with the year it had just built three screens further down and
 * nothing saying so. A flow that ends by congratulating you on finishing the
 * flow has mistaken itself for the product. This is what the answers actually
 * made: the count, the week it costs, and the next three things with a date on
 * them.
 */
function Built({ plan, today }: { plan: NsPlan; today: string }) {
  const cascade = planCascade(plan, today)
  const load = weeklyLoad(plan)
  const next = plan.goals
    .flatMap((g) => goalMilestones(g, today))
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 3)

  return (
    <div className="mt-3.5 rounded-xl border border-emerald-400/25 bg-emerald-500/[0.05] p-4">
      <p className="text-[12.5px] text-emerald-200/90">{GUIDE_COPY.queueDone}</p>
      <p className="text-[15px] font-medium text-white mt-2">{GUIDE_COPY.builtTitle}</p>
      <ul className="text-[12px] text-zinc-300 mt-1.5 space-y-0.5">
        <li>{GUIDE_COPY.builtGoals(cascade.goals)}</li>
        <li>{GUIDE_COPY.builtMilestones(cascade.milestones)}</li>
        <li>{GUIDE_COPY.builtLoad(Math.round(load.minutes / 6) / 10, load.actions)}</li>
      </ul>

      {next.length > 0 ? (
        <div className="mt-3">
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-500">{GUIDE_COPY.builtNext}</p>
          <ul className="mt-1 space-y-1">
            {next.map((m) => {
              const color = plan.areas.find((a) => a.id === m.areaId)?.color ?? "#a1a1aa"
              return (
                <li key={m.id} className="flex items-center gap-2">
                  <span className="size-1.5 rounded-full shrink-0" style={{ backgroundColor: color }} />
                  <span className="min-w-0 flex-1 text-[12px] text-zinc-200 truncate">{m.label}</span>
                  <span className="text-[10.5px] text-zinc-500 tabular-nums shrink-0">{formatTargetDate(m.date)}</span>
                </li>
              )
            })}
          </ul>
        </div>
      ) : (
        <p className="text-[11px] text-zinc-500 mt-2.5">{GUIDE_COPY.builtNothing}</p>
      )}

      <button
        onClick={() => document.getElementById("ns-timeline")?.scrollIntoView({ behavior: "smooth", block: "start" })}
        className="mt-3 text-[12px] font-medium px-3 py-1.5 rounded-lg border border-emerald-400/30 text-emerald-100 hover:bg-emerald-500/10 transition-colors"
      >
        {GUIDE_COPY.builtSeeYear}
      </button>
    </div>
  )
}

/**
 * What the climb works out at, per month.
 *
 * Shown the moment the start is typed, before it is even saved, because "is
 * this realistic" is the question somebody is asking themselves while they type
 * the number. No view on whether kilos are hard — this does not know what the
 * unit is — only the rate, and the three cases that are structural: you are
 * already past it, the date is doing no work, or it multiplies what you have.
 */
function Pace({ goal, start, today }: { goal: NsGoal; start: string; today: string }) {
  const n = Number(start.replace(",", "."))
  if (!start.trim() || !Number.isFinite(n) || !goal.ladder) return null
  const pace = climbPace({ ...goal, ladder: { ...goal.ladder, start: n } }, today)
  if (!pace) return null
  const rounded = pace.perMonth >= 10 ? Math.round(pace.perMonth) : Math.round(pace.perMonth * 10) / 10
  const note =
    pace.verdict === "done" ? GUIDE_COPY.paceDone
    : pace.verdict === "slow" ? GUIDE_COPY.paceSlow
    : pace.verdict === "steep" ? GUIDE_COPY.paceSteep
    : GUIDE_COPY.paceSteady
  return (
    <p className={`text-[11px] mt-2 leading-relaxed ${pace.verdict === "steady" ? "text-zinc-500" : "text-amber-100/80"}`}>
      {pace.verdict !== "done" && GUIDE_COPY.paceRate(String(rounded), goal.unit, Math.round(pace.months))}{" "}
      {note}
    </p>
  )
}
