"use client"

/**
 * One goal, collapsed to a row and opened into the full editor.
 *
 * Same component either way, so a goal reads and edits identically wherever you
 * meet it. The row carries the shape toggle, the title, the controls that shape
 * needs, and the date. Everything that makes a goal survive contact with a bad
 * week lives inside: the why, the cost of not doing it, the two ratings, the
 * sentence, what could stop you, and the belief in the way.
 *
 * The shape is flippable at any time. A goal typed wrong at birth used to be
 * frozen forever, and that is the loudest thing that can be wrong with a goal
 * editor.
 */

import { useState } from "react"
import { Check, ChevronDown, Minus, Plus, RotateCcw, X } from "lucide-react"
import type { HabitRampStep, MilestoneLadderConfig, NsArea, NsGoal, NsPlan, VisionGoalType } from "@/src/goals/types"
import {
  BELIEF_STEP_COPY,
  GOAL_DATE_PRESETS,
  GOAL_IN_ROUTINE,
  GOAL_METRIC_COPY,
  NS_GOAL_TYPES,
  NS_PAIN_WHY_QUESTION,
  NS_QUALIFY_THRESHOLD,
  NS_VALUE_SUGGESTIONS,
  NS_WHY_ANGLES,
  OBSTACLE_COUNTER_QUESTION,
  OBSTACLE_PRESETS,
  SEASON_FOCUS_COPY,
  SERVES_COPY,
} from "@/src/goals/data/northStar"
import {
  goalAlreadyInRoutine,
  goalCanUseDailyMetric,
  goalGaps,
  goalHasWhy,
  goalHorizon,
  goalIsQualified,
  goalMetricProgress,
  goalMetricValue,
  goalNeedsAction,
  goalToolLink,
  matchingDatePreset,
  presetDate,
  qualifyWarnings,
  suggestSentence,
  wouldCycle,
} from "@/src/goals/northStarService"
import { HORIZON_META, formatCountdown } from "@/src/goals/horizonService"
import { REASON_PROMPTS } from "@/src/goals/visionPlanService"
import { MilestoneCurveEditor } from "../MilestoneCurveEditor"

export interface GoalHandlers {
  onUpdate: (goalId: string, patch: Partial<Omit<NsGoal, "id">>) => void
  onSetType: (goalId: string, type: VisionGoalType) => void
  onRemove: (goalId: string) => void
  onLadder: (goalId: string, ladder: MilestoneLadderConfig) => void
  onRamp: (goalId: string, steps: HabitRampStep[] | null) => void
  onLink: (fromId: string, toId: string) => void
  onUnlink: (fromId: string, toId: string) => void
  onAddObstacle: (goalId: string, what: string) => void
  onUpdateObstacle: (goalId: string, obstacleId: string, patch: { what?: string; counter?: string }) => void
  onRemoveObstacle: (goalId: string, obstacleId: string) => void
  onAddBelief: (goalId: string, old: string) => void
  onUpdateBelief: (goalId: string, beliefId: string, patch: { old?: string; useful?: boolean | null; evidence?: string; replacement?: string }) => void
  onRemoveBelief: (goalId: string, beliefId: string) => void
  onAddCheckpoint: (goalId: string, title: string) => void
  onUpdateCheckpoint: (goalId: string, checkpointId: string, patch: { title?: string; done?: boolean }) => void
  onRemoveCheckpoint: (goalId: string, checkpointId: string) => void
  onSetPriority: (goalId: string, rank: number) => void
  onMovePriority: (goalId: string, dir: -1 | 1) => void
  onAddAction: (goalId: string, title: string, daysPerWeek: number) => void
  onUpdateAction: (goalId: string, habitId: string, patch: { title?: string; daysPerWeek?: number }) => void
  onRemoveAction: (goalId: string, habitId: string) => void
  onAddReasons: (goalId: string, text: string) => void
  onRemoveReason: (goalId: string, index: number) => void
  /** Wire a target goal's current number to its area's daily ratings. */
  onSetMetric: (goalId: string, metric: "daily_area" | null) => void
  /** Which other areas this one goal lifts. */
  onSetServes: (goalId: string, areaIds: string[]) => void
  /** Make this the one thing for the season, or clear it. */
  onSeasonFocus: (goalId: string) => void
  /** Jump to another tab, for a goal that is really an in-app tool. */
  onGoToTab: (tab: import("@/src/goals/types").NorthStarTabId) => void
}

export function GoalCard({ goal, area, areas, allGoals, subGoals, rank, totalGoals, today, plan, isFocus, open, onToggleOpen, handlers }: {
  goal: NsGoal
  area: NsArea | undefined
  areas: NsArea[]
  allGoals: NsGoal[]
  subGoals: NsGoal[]
  /** 1-based priority across the whole plan. */
  rank: number | null
  totalGoals: number
  today: string
  /** Needed for the readings the page can take on the goal's behalf. */
  plan: NsPlan
  isFocus: boolean
  open: boolean
  onToggleOpen: () => void
  handlers: GoalHandlers
}) {
  const [angle, setAngle] = useState(0)
  const color = area?.color ?? "#a1a1aa"
  const hasWhy = goalHasWhy(goal)
  const qualified = goalIsQualified(goal)
  const gaps = goalGaps(goal)
  const warnings = qualifyWarnings(goal)
  const isTarget = goal.type === "milestone_ladder"
  const isPractice = goal.type === "habit_ramp"
  const isFinish = goal.type === "achievement"
  const currentAngle = NS_WHY_ANGLES[angle % NS_WHY_ANGLES.length]
  const suggestion = suggestSentence(goal)
  const needsAction = goalNeedsAction(goal)
  const horizon = goalHorizon(goal, today)
  const horizonMeta = HORIZON_META[horizon]
  const countdown = goal.targetDate ? formatCountdown(goal.targetDate, new Date(`${today}T00:00:00`)) : null
  const showHorizon = goal.type === "habit_ramp" || !!goal.targetDate
  const datePreset = matchingDatePreset(goal.targetDate, today)
  const metricValue = goalMetricValue(plan, goal, today)
  const metricProgress = goalMetricProgress(plan, goal, today)
  const toolLink = goalToolLink(goal)
  const inRoutine = goalAlreadyInRoutine(plan, goal)
  const otherAreas = areas.filter((a) => a.id !== goal.areaId)

  return (
    <div className={`rounded-2xl border transition-colors ${
      qualified ? "border-emerald-400/25 bg-emerald-500/[0.04]" : hasWhy ? "border-white/15 bg-white/[0.03]" : "border-white/10 bg-white/[0.02]"
    }`}>
      {/* The row */}
      <div className="group/row flex flex-wrap items-center gap-2 px-3 py-2.5">
        <button onClick={onToggleOpen} aria-expanded={open} aria-label={`${open ? "Close" : "Open"} ${goal.title}`} className="shrink-0 text-zinc-500 hover:text-zinc-200 transition-colors">
          <ChevronDown className={`size-4 transition-transform ${open ? "" : "-rotate-90"}`} />
        </button>
        {rank != null && (
          <PriorityBadge
            rank={rank}
            total={totalGoals}
            color={color}
            title={goal.title}
            onSet={(r) => handlers.onSetPriority(goal.id, r)}
            onMove={(d) => handlers.onMovePriority(goal.id, d)}
          />
        )}
        <TypeToggle type={goal.type} onSetType={(t) => handlers.onSetType(goal.id, t)} />
        <span className="min-w-0 flex-1 basis-40">
          <input
            value={goal.title}
            onChange={(e) => handlers.onUpdate(goal.id, { title: e.target.value })}
            aria-label="Goal"
            className="w-full bg-transparent border-b border-transparent hover:border-white/10 focus:border-white/25 text-sm text-zinc-100 focus:outline-none py-0.5 transition-colors"
          />
          <span className="flex items-center gap-1.5 text-[10px] text-zinc-600 mt-0.5">
            <span className="size-1.5 rounded-full shrink-0" style={{ backgroundColor: color }} />
            {area?.label ?? ""}
            {goal.feedsGoalIds.length > 0 && <span>· feeds {goal.feedsGoalIds.length}</span>}
            {subGoals.length > 0 && <span>· {subGoals.length} feed it</span>}
          </span>
        </span>

        {isTarget && goal.ladder && (
          <span className="flex items-center gap-1.5 shrink-0">
            <input
              type="number"
              value={goal.ladder.start}
              onChange={(e) => handlers.onLadder(goal.id, { ...goal.ladder!, start: Number(e.target.value) })}
              aria-label={`Where you are now for ${goal.title}`}
              placeholder="from"
              className="w-14 bg-white/5 border border-white/10 rounded-md px-1.5 py-1 text-[11px] text-zinc-200 focus:outline-none focus:border-white/25 tabular-nums"
            />
            <span className="text-[10px] text-zinc-600">→</span>
            <input
              type="number"
              value={goal.ladder.target}
              onChange={(e) => handlers.onLadder(goal.id, { ...goal.ladder!, target: Number(e.target.value) })}
              aria-label={`Target number for ${goal.title}`}
              className="w-16 bg-white/5 border border-white/10 rounded-md px-1.5 py-1 text-[11px] text-zinc-200 focus:outline-none focus:border-white/25 tabular-nums"
            />
            <input
              value={goal.unit}
              onChange={(e) => handlers.onUpdate(goal.id, { unit: e.target.value })}
              placeholder="unit"
              aria-label={`Unit for ${goal.title}`}
              className="w-16 bg-white/5 border border-white/10 rounded-md px-1.5 py-1 text-[11px] text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-white/25"
            />
          </span>
        )}

        {isPractice && (
          <span className="flex items-center gap-1 shrink-0">
            <button
              onClick={() => handlers.onUpdate(goal.id, { daysPerWeek: Math.max(1, goal.daysPerWeek - 1) })}
              disabled={goal.daysPerWeek <= 1}
              aria-label={`Fewer days for ${goal.title}`}
              className="size-5 rounded border border-white/15 text-zinc-400 hover:bg-white/10 disabled:opacity-30 flex items-center justify-center"
            ><Minus className="size-3" /></button>
            <span className="text-[11px] text-zinc-300 tabular-nums w-11 text-center">{goal.daysPerWeek}×/wk</span>
            <button
              onClick={() => handlers.onUpdate(goal.id, { daysPerWeek: Math.min(7, goal.daysPerWeek + 1) })}
              disabled={goal.daysPerWeek >= 7}
              aria-label={`More days for ${goal.title}`}
              className="size-5 rounded border border-white/15 text-zinc-400 hover:bg-white/10 disabled:opacity-30 flex items-center justify-center"
            ><Plus className="size-3" /></button>
          </span>
        )}

        {isFinish && goal.checkpoints.length > 0 && (
          <span className="text-[11px] text-zinc-400 tabular-nums shrink-0">
            {goal.checkpoints.filter((c) => c.done).length}/{goal.checkpoints.length} done
          </span>
        )}

        {/* Only when the horizon is actually known. `classifyHorizon` falls back
            to "1 Year" for a goal with no date, and printing that would show a
            horizon nobody chose as though it were decided. A practice is
            genuinely "Now" without needing a date. */}
        {showHorizon && (
          <span
            className="shrink-0 text-[10px] px-2 py-0.5 rounded-full border tabular-nums"
            style={{ color: horizonMeta.color, borderColor: `${horizonMeta.color}59`, backgroundColor: `${horizonMeta.color}1a` }}
            title={`${horizonMeta.label} horizon — ${horizonMeta.sublabel}`}
          >
            {horizonMeta.label}
            {countdown && <span className="opacity-75"> · {countdown}</span>}
          </span>
        )}
        <span className="flex items-center gap-1 shrink-0">
          <span className="text-[10px] text-zinc-500">{isPractice && !goal.targetDate ? "ongoing · by" : "by"}</span>
          <input
            type="date"
            value={goal.targetDate ?? ""}
            onChange={(e) => handlers.onUpdate(goal.id, { targetDate: e.target.value || null })}
            aria-label={`Target date for ${goal.title}`}
            className="bg-white/5 border border-white/10 rounded-md px-1.5 py-1 text-[11px] text-zinc-300 focus:outline-none focus:border-white/25"
          />
        </span>

        {/* "needs a why" used to be a label, and the why is inside the card. So
            the row told you what was wrong and gave you nowhere to fix it. It
            opens the card now, which is the only thing it could ever have
            usefully done. */}
        {qualified ? (
          <span className="inline-flex items-center gap-1 text-[10px] text-emerald-300 shrink-0">
            <Check className="size-3.5" /> qualified
          </span>
        ) : (
          <button
            onClick={() => { if (!open) onToggleOpen() }}
            aria-label={`Open ${goal.title} to add ${gaps[0]}`}
            className="text-[10px] text-amber-300/70 hover:text-amber-200 underline decoration-dotted underline-offset-2 shrink-0 transition-colors"
          >
            needs {gaps[0]}
          </button>
        )}

        <button
          onClick={() => handlers.onRemove(goal.id)}
          aria-label={`Remove goal ${goal.title}`}
          className="shrink-0 text-zinc-700 hover:text-rose-300 opacity-0 group-hover/row:opacity-100 focus:opacity-100 transition-all"
        ><X className="size-3.5" /></button>
      </div>

      {/* The full list of what is missing, only once the card is open. The
          collapsed row already carries the first gap as a badge, and printing
          both meant every row said "needs a why" twice. */}
      {open && gaps.length > 0 && (
        <p className="px-3 pb-2 -mt-1 text-[10.5px] text-zinc-600">still needs {gaps.join(" · ")}</p>
      )}

      {subGoals.length > 0 && (
        <div className="mx-3 mb-2 pl-2.5 border-l" style={{ borderColor: `${color}55` }}>
          <p className="text-[9px] font-semibold uppercase tracking-[0.14em] text-zinc-500 mb-1">
            {subGoals.length} {subGoals.length === 1 ? "goal feeds" : "goals feed"} this one
          </p>
          {subGoals.map((c) => (
            <p key={c.id} className="text-[11px] text-zinc-400 py-0.5">
              {c.title}
              <span className="ml-1.5 text-[9px] text-zinc-600">
                {c.type === "habit_ramp"
                  ? `${c.daysPerWeek}×/wk`
                  : c.type === "milestone_ladder" && c.ladder
                    ? `${c.ladder.start} to ${c.ladder.target} ${c.unit}`.trimEnd()
                    : "done or not"}
              </span>
            </p>
          ))}
        </div>
      )}

      {open && (
        <div className="px-3 pb-3 space-y-4 border-t border-white/5 pt-3">
          {/* This goal is really one of this page's own tools, or a thing that
              already exists as a step in a routine. Said once, so the plan does
              not carry the same commitment twice with no link between them. */}
          {toolLink && (
            <div className="rounded-xl border border-sky-400/25 bg-sky-500/[0.06] px-3 py-2.5">
              <p className="text-[11.5px] text-sky-100/85 leading-relaxed">{toolLink.note}</p>
              <button
                onClick={() => handlers.onGoToTab(toolLink.tab)}
                className="mt-1 text-[11px] text-sky-200 underline decoration-dotted underline-offset-2 hover:text-white transition-colors"
              >
                {toolLink.label}
              </button>
            </div>
          )}
          {inRoutine && (
            <p className="text-[11px] text-zinc-500 leading-relaxed">{GOAL_IN_ROUTINE(inRoutine.routine, inRoutine.step)}</p>
          )}

          {/* Which area it belongs to, and when. */}
          <div className="flex flex-wrap items-center gap-2">
            <label className="text-[11px] text-zinc-500" htmlFor={`goal-area-${goal.id}`}>Area</label>
            <select
              id={`goal-area-${goal.id}`}
              value={goal.areaId}
              onChange={(e) => handlers.onUpdate(goal.id, { areaId: e.target.value })}
              className="bg-white/5 border border-white/10 rounded-md px-2 py-1 text-[11px] text-zinc-200 focus:outline-none focus:border-white/25"
            >
              {areas.map((a) => <option key={a.id} value={a.id} className="bg-zinc-900">{a.label}</option>)}
            </select>
            <button
              onClick={() => handlers.onSeasonFocus(goal.id)}
              aria-pressed={isFocus}
              className={`text-[10.5px] px-2 py-0.5 rounded-full border transition-colors ${
                isFocus
                  ? "border-violet-400/50 bg-violet-500/15 text-violet-100"
                  : "border-white/10 text-zinc-500 hover:text-zinc-200 hover:border-white/25"
              }`}
              title={SEASON_FOCUS_COPY.help}
            >
              {isFocus ? "my one thing this season" : SEASON_FOCUS_COPY.pick}
            </button>
            <span className="text-[10.5px] text-zinc-600 basis-full">{NS_GOAL_TYPES.find((t) => t.type === goal.type)?.hint}</span>
          </div>

          {/* The date, as the four dates people actually pick. The calendar in
              the row above is still there for anything else; this is so that
              nine goals arriving from a template can be re-dated in nine clicks
              rather than in a date picker nine times. */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[11px] text-zinc-500 shrink-0">By</span>
            {GOAL_DATE_PRESETS.map((preset) => {
              const active = datePreset === preset.id
              return (
                <button
                  key={preset.id}
                  onClick={() => handlers.onUpdate(goal.id, { targetDate: presetDate(preset.id, today) })}
                  aria-pressed={active}
                  title={preset.note}
                  className={`text-[10.5px] px-2 py-0.5 rounded-full border transition-colors ${
                    active ? "border-white/40 bg-white/10 text-white" : "border-white/10 text-zinc-500 hover:text-zinc-200 hover:border-white/25"
                  }`}
                >
                  {preset.label}
                </button>
              )
            })}
            {goal.targetDate && datePreset == null && (
              <span className="text-[10.5px] text-zinc-500">your own date, set above</span>
            )}
          </div>

          {/* The shape's own controls. */}
          {isTarget && goal.ladder && (
            <div className="rounded-xl border border-white/10 bg-white/[0.02] p-3">
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-500">The climb</p>
              <p className="text-[11px] text-zinc-500 mt-0.5 mb-2">
                Drag the curve to decide whether the early steps are gentle or steep. Click a milestone to pin it and the rest flow around it.
              </p>

              {/* The page already holds a number for this area every day, so a
                  goal measured in that number should not ask the user to copy
                  it across. Only offered on a target, which is the only shape
                  with a number to climb. */}
              {goalCanUseDailyMetric(goal) && area && (
                <div className="mb-3 rounded-lg border border-white/10 bg-white/[0.02] px-2.5 py-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[11.5px] text-zinc-200 min-w-0 flex-1">{GOAL_METRIC_COPY.label}</span>
                    <button
                      onClick={() => handlers.onSetMetric(goal.id, goal.metric === "daily_area" ? null : "daily_area")}
                      aria-pressed={goal.metric === "daily_area"}
                      className={`shrink-0 text-[10.5px] px-2 py-0.5 rounded-full border transition-colors ${
                        goal.metric === "daily_area"
                          ? "border-emerald-400/50 bg-emerald-500/15 text-emerald-100"
                          : "border-white/10 text-zinc-500 hover:text-zinc-200 hover:border-white/25"
                      }`}
                    >
                      {goal.metric === "daily_area" ? GOAL_METRIC_COPY.on : GOAL_METRIC_COPY.off}
                    </button>
                  </div>
                  <p className="text-[10.5px] text-zinc-600 mt-0.5 leading-relaxed">{GOAL_METRIC_COPY.help(area.label)}</p>
                  {goal.metric === "daily_area" && (
                    <div className="mt-1.5">
                      {metricValue == null ? (
                        <p className="text-[11px] text-zinc-500">{GOAL_METRIC_COPY.noData}</p>
                      ) : (
                        <>
                          <div className="flex items-baseline gap-2">
                            <span className="text-[13px] tabular-nums text-zinc-100">{metricValue}</span>
                            <span className="text-[10.5px] text-zinc-500">
                              now, against {goal.ladder.target}{goal.unit}
                            </span>
                          </div>
                          <div className="mt-1 h-1.5 rounded-full bg-white/10 overflow-hidden">
                            <div
                              className="h-full rounded-full transition-all"
                              style={{ width: `${Math.round((metricProgress ?? 0) * 100)}%`, backgroundColor: color }}
                            />
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </div>
              )}
              {/* "orrery", not the default "zen". Zen is built for a light
                  surface and renders a white panel in the middle of this dark
                  card; orrery is the dark-surface theme. */}
              <MilestoneCurveEditor
                config={goal.ladder}
                onChange={(next) => handlers.onLadder(goal.id, next)}
                allowDirectEdit
                themeId="orrery"
                targetDate={goal.targetDate ?? undefined}
              />
            </div>
          )}

          {isPractice && (
            <div className="rounded-xl border border-white/10 bg-white/[0.02] p-3">
              <RampEditor
                steps={goal.rampSteps}
                fallbackFreq={goal.daysPerWeek}
                color={color}
                onChange={(steps) => handlers.onRamp(goal.id, steps)}
              />
            </div>
          )}

          {isFinish && (
            <Checkpoints goal={goal} color={color} handlers={handlers} />
          )}

          {/* The why. One question at a time, changeable when it runs dry. */}
          <div>
            <div className="flex items-baseline justify-between gap-3">
              <p className="text-[13px] text-zinc-200">{currentAngle.question}</p>
              <button
                onClick={() => setAngle(angle + 1)}
                className="inline-flex items-center gap-1 text-[10px] text-zinc-500 hover:text-zinc-300 transition-colors shrink-0"
              >
                <RotateCcw className="size-3" />
                another angle
              </button>
            </div>
            <textarea
              value={goal.why}
              onChange={(e) => handlers.onUpdate(goal.id, { why: e.target.value })}
              placeholder="Write it the way you would say it out loud"
              rows={3}
              aria-label={`Why you want: ${goal.title}`}
              className="w-full mt-2 rounded-xl border border-white/10 bg-white/[0.02] px-3 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-violet-400/40 resize-y transition-colors"
            />
            <div className="flex flex-wrap gap-1 mt-1.5">
              {NS_WHY_ANGLES.map((a, i) => (
                <button
                  key={a.id}
                  onClick={() => setAngle(i)}
                  title={a.question}
                  className={`text-[10px] px-2 py-0.5 rounded-full border transition-colors ${
                    i === angle % NS_WHY_ANGLES.length
                      ? "border-violet-400/40 bg-violet-500/15 text-violet-100"
                      : "border-white/10 text-zinc-500 hover:text-zinc-300 hover:border-white/25"
                  }`}
                >
                  {a.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="text-[13px] text-zinc-200">{NS_PAIN_WHY_QUESTION}</p>
            <textarea
              value={goal.painWhy}
              onChange={(e) => handlers.onUpdate(goal.id, { painWhy: e.target.value })}
              placeholder="What it takes from you if next year looks like this one"
              rows={2}
              aria-label={`What it costs you to skip: ${goal.title}`}
              className="w-full mt-2 rounded-xl border border-white/10 bg-white/[0.02] px-3 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-violet-400/40 resize-y transition-colors"
            />
          </div>

          {/* Both have to clear 7 or the goal wants reshaping. */}
          <div className="grid gap-3 sm:grid-cols-2">
            <Rating
              label="Do you believe you can do it?"
              value={goal.beliefLevel}
              color={color}
              onChange={(v) => handlers.onUpdate(goal.id, { beliefLevel: v })}
              ariaLabel={`Belief that you can do ${goal.title}, 0 to 10`}
            />
            <Rating
              label="How much do you want it?"
              value={goal.desireLevel}
              color={color}
              onChange={(v) => handlers.onUpdate(goal.id, { desireLevel: v })}
              ariaLabel={`How much you want ${goal.title}, 0 to 10`}
            />
          </div>
          {warnings.map((w) => (
            <p key={w} className="text-[11px] text-amber-300/90 leading-relaxed">{w}</p>
          ))}

          {/* The sentence. "I" takes responsibility, "will" makes it a decision,
              and "easily" changes how it feels to say. */}
          <div>
            <div className="flex items-baseline justify-between gap-3">
              <label className="text-[11px] text-zinc-400" htmlFor={`sentence-${goal.id}`}>The goal as one sentence</label>
              {suggestion && suggestion !== goal.sentence && (
                <button
                  onClick={() => handlers.onUpdate(goal.id, { sentence: suggestion })}
                  className="text-[10px] text-zinc-500 hover:text-zinc-300 transition-colors shrink-0"
                >
                  {goal.sentence.trim() ? "rewrite from the title" : "write it for me"}
                </button>
              )}
            </div>
            <input
              id={`sentence-${goal.id}`}
              value={goal.sentence}
              onChange={(e) => handlers.onUpdate(goal.id, { sentence: e.target.value })}
              placeholder="I will easily…"
              className="w-full mt-1.5 rounded-lg border border-white/10 bg-white/[0.02] px-3 py-1.5 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-violet-400/40 transition-colors"
            />
            <div className="flex items-baseline gap-2 mt-1.5">
              <label className="text-[10.5px] text-zinc-500 shrink-0" htmlFor={`feeling-${goal.id}`}>…creating</label>
              <input
                id={`feeling-${goal.id}`}
                value={goal.feeling}
                onChange={(e) => handlers.onUpdate(goal.id, { feeling: e.target.value })}
                placeholder="the feeling it creates. Unstoppable energy, quiet confidence"
                className="flex-1 min-w-0 bg-transparent border-b border-white/10 focus:border-white/30 text-[12px] text-zinc-200 placeholder:text-zinc-600 focus:outline-none py-0.5 transition-colors"
              />
            </div>
          </div>

          <ActionBlock goal={goal} color={color} needsAction={needsAction} handlers={handlers} />
          <ReasonsDrill goal={goal} color={color} handlers={handlers} />
          <ObstacleBlock goal={goal} color={color} handlers={handlers} />
          <BeliefBlock goal={goal} color={color} handlers={handlers} />

          <TagList
            label="What would you have to value to do this?"
            hint="One word each. These are offered back to you on the north star tab when you build the whole-life list."
            placeholder="Discipline"
            color={color}
            items={goal.values}
            suggestions={NS_VALUE_SUGGESTIONS}
            onChange={(values) => handlers.onUpdate(goal.id, { values })}
          />

          {/* Some goals do not stay in their box. Dropping one thing, or fixing
              sleep, moves four areas at once, and a goal that only ever appears
              under the area it was filed in reads as a small thing on the side.
              Ticked here, it shows up inside each area it actually serves. */}
          {otherAreas.length > 0 && (
            <div>
              <p className="text-[11.5px] text-zinc-300">{SERVES_COPY.goal.label}</p>
              <p className="text-[10.5px] text-zinc-600 mt-0.5 leading-relaxed">{SERVES_COPY.goal.help}</p>
              <div className="flex flex-wrap gap-1.5 mt-1.5">
                {otherAreas.map((a) => {
                  const on = goal.serves.includes(a.id)
                  return (
                    <button
                      key={a.id}
                      onClick={() =>
                        handlers.onSetServes(goal.id, on ? goal.serves.filter((id) => id !== a.id) : [...goal.serves, a.id])
                      }
                      aria-pressed={on}
                      className="text-[10.5px] px-2 py-0.5 rounded-full border transition-colors"
                      style={
                        on
                          ? { borderColor: `${a.color}88`, backgroundColor: `${a.color}1f`, color: "#f4f4f5" }
                          : { borderColor: "rgba(255,255,255,0.1)", color: "#71717a" }
                      }
                    >
                      {a.label}
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {/* Whatever gets rewarded gets repeated, and a stake is the other half. */}
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="block text-[11px] text-zinc-400 mb-1" htmlFor={`reward-${goal.id}`}>What do you give yourself when it lands?</label>
              <input
                id={`reward-${goal.id}`}
                value={goal.reward}
                onChange={(e) => handlers.onUpdate(goal.id, { reward: e.target.value })}
                placeholder="The trip, the thing, the day off"
                className="w-full rounded-lg border border-white/10 bg-white/[0.02] px-3 py-1.5 text-[13px] text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-white/25 transition-colors"
              />
            </div>
            <div>
              <label className="block text-[11px] text-zinc-400 mb-1" htmlFor={`stake-${goal.id}`}>And what does it cost you if you miss?</label>
              <input
                id={`stake-${goal.id}`}
                value={goal.stake}
                onChange={(e) => handlers.onUpdate(goal.id, { stake: e.target.value })}
                placeholder="Something you would genuinely rather not"
                className="w-full rounded-lg border border-white/10 bg-white/[0.02] px-3 py-1.5 text-[13px] text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-white/25 transition-colors"
              />
            </div>
          </div>

          <FeedsPicker goal={goal} allGoals={allGoals} areas={areas} color={color} onLink={handlers.onLink} onUnlink={handlers.onUnlink} />
        </div>
      )}
    </div>
  )
}

/** The one-tap flip between the three shapes. */
function TypeToggle({ type, onSetType }: { type: VisionGoalType; onSetType: (t: VisionGoalType) => void }) {
  return (
    <span className="flex rounded-md border border-white/10 overflow-hidden shrink-0 text-[11px]">
      {NS_GOAL_TYPES.map((m) => (
        <button
          key={m.type}
          onClick={() => onSetType(m.type)}
          aria-pressed={type === m.type}
          aria-label={m.label}
          title={`${m.label} — ${m.hint}`}
          className={`px-1.5 py-1 transition-colors ${type === m.type ? "bg-white/15 text-white" : "text-zinc-500 hover:text-zinc-300"}`}
        >
          {m.icon}
        </button>
      ))}
    </span>
  )
}

/**
 * The ease-in schedule. Phases run in order and the LAST one is steady state,
 * which is the load the rest of the week has to make room for.
 */
function RampEditor({ steps, fallbackFreq, color, onChange }: {
  steps: HabitRampStep[] | null
  fallbackFreq: number
  color: string
  onChange: (steps: HabitRampStep[] | null) => void
}) {
  if (!steps || steps.length === 0) {
    return (
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-500">Ease-in schedule</p>
        <button
          onClick={() => onChange([{ frequencyPerWeek: Math.max(1, fallbackFreq - 1), durationWeeks: 4 }, { frequencyPerWeek: fallbackFreq, durationWeeks: 8 }])}
          className="mt-1 text-[11.5px] text-zinc-400 hover:text-zinc-200 underline decoration-dotted underline-offset-2 transition-colors"
        >
          Build a ramp instead of starting at full load
        </button>
        <p className="text-[10.5px] text-zinc-600 mt-1">Most things that get dropped in week three were started at week-twelve intensity.</p>
      </div>
    )
  }

  const set = (i: number, patch: Partial<HabitRampStep>) => onChange(steps.map((s, n) => (n === i ? { ...s, ...patch } : s)))
  const summary = steps
    .map((r, i) => (i === 0 ? `${r.frequencyPerWeek}×/wk for the first ${r.durationWeeks} weeks` : `then ${r.frequencyPerWeek}×/wk for ${r.durationWeeks}`))
    .join(", ")
  const weeks = steps.reduce((sum, s) => sum + s.durationWeeks, 0)

  return (
    <div>
      <div className="flex items-baseline gap-2">
        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-500">Ease-in schedule</p>
        <button onClick={() => onChange(null)} className="ml-auto text-[10px] text-zinc-600 hover:text-rose-300 transition-colors">remove ramp</button>
      </div>
      <p className="text-[11px] text-zinc-400 mt-0.5">Starts gentle: {summary}. {weeks} weeks to steady state.</p>
      <div className="flex items-center gap-2 mt-1.5 flex-wrap">
        {steps.map((r, i) => (
          <span key={i} className="group/ramp flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full border" style={{ borderColor: `${color}55`, color: "#e4e4e7" }}>
            <input
              type="number" min={1} max={30}
              value={r.frequencyPerWeek}
              onChange={(e) => { const v = Number(e.target.value); if (v >= 1 && v <= 30) set(i, { frequencyPerWeek: v }) }}
              aria-label={`Phase ${i + 1} days per week`}
              className="w-8 bg-transparent border-b border-white/15 text-center text-zinc-200 focus:outline-none focus:border-white/40 tabular-nums"
            />
            ×/wk for
            <input
              type="number" min={1} max={52}
              value={r.durationWeeks}
              onChange={(e) => { const v = Number(e.target.value); if (v >= 1 && v <= 52) set(i, { durationWeeks: v }) }}
              aria-label={`Phase ${i + 1} duration in weeks`}
              className="w-8 bg-transparent border-b border-white/15 text-center text-zinc-200 focus:outline-none focus:border-white/40 tabular-nums"
            />
            w
            {steps.length > 1 && (
              <button
                onClick={() => onChange(steps.filter((_, n) => n !== i))}
                aria-label={`Remove phase ${i + 1}`}
                className="opacity-0 group-hover/ramp:opacity-100 focus:opacity-100 text-zinc-600 hover:text-rose-300 transition-all"
              ><X className="size-3" /></button>
            )}
          </span>
        ))}
        {steps.length < 8 && (
          <button
            onClick={() => {
              const last = steps[steps.length - 1]
              onChange([...steps, { frequencyPerWeek: Math.min(30, (last?.frequencyPerWeek ?? 2) + 1), durationWeeks: 4 }])
            }}
            className="text-[11px] px-2 py-0.5 rounded-full border border-dashed border-white/20 text-zinc-500 hover:text-zinc-300 hover:border-white/30 transition-colors"
          >+ phase</button>
        )}
      </div>
      <p className="text-[10px] text-zinc-600 mt-1">The last phase is your steady state.</p>
    </div>
  )
}

/** A finish line has no number to climb, so its rungs are named checkpoints. */
function Checkpoints({ goal, color, handlers }: { goal: NsGoal; color: string; handlers: GoalHandlers }) {
  const [draft, setDraft] = useState("")
  const add = () => {
    if (!draft.trim()) return
    handlers.onAddCheckpoint(goal.id, draft)
    setDraft("")
  }
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.02] p-3">
      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-500">Checkpoints</p>
      <p className="text-[11px] text-zinc-500 mt-0.5">A finish line has no number to climb, so name the points along the way. It is done when it is done.</p>
      {goal.checkpoints.length > 0 && (
        <ul className="mt-2 space-y-1">
          {goal.checkpoints.map((c) => (
            <li key={c.id} className="group/cp flex items-center gap-2">
              <button
                onClick={() => handlers.onUpdateCheckpoint(goal.id, c.id, { done: !c.done })}
                aria-pressed={c.done}
                aria-label={`${c.done ? "Undo" : "Mark done"}: ${c.title}`}
                className="size-4 rounded-md border flex items-center justify-center shrink-0 transition-colors"
                style={c.done ? { backgroundColor: color, borderColor: color } : { borderColor: "rgba(255,255,255,0.25)" }}
              >
                {c.done && <Check className="size-2.5 text-zinc-950" />}
              </button>
              <input
                value={c.title}
                onChange={(e) => handlers.onUpdateCheckpoint(goal.id, c.id, { title: e.target.value })}
                aria-label="Checkpoint"
                className={`flex-1 min-w-0 bg-transparent border-b border-transparent hover:border-white/10 focus:border-white/25 text-[12.5px] focus:outline-none py-0.5 transition-colors ${c.done ? "text-zinc-500 line-through" : "text-zinc-200"}`}
              />
              <button
                onClick={() => handlers.onRemoveCheckpoint(goal.id, c.id)}
                aria-label={`Remove checkpoint ${c.title}`}
                className="shrink-0 text-zinc-700 hover:text-rose-300 opacity-0 group-hover/cp:opacity-100 focus:opacity-100 transition-all"
              ><X className="size-3" /></button>
            </li>
          ))}
        </ul>
      )}
      <div className="flex items-center gap-1.5 mt-2">
        <Plus className="size-3.5 text-zinc-600 shrink-0" />
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); add() } }}
          onBlur={add}
          placeholder="The next thing that has to be true"
          aria-label={`Add a checkpoint to ${goal.title}`}
          className="flex-1 min-w-0 bg-transparent border-b border-white/10 focus:border-white/30 text-[12.5px] text-zinc-200 placeholder:text-zinc-600 focus:outline-none py-0.5 transition-colors"
        />
      </div>
    </div>
  )
}

/** What could stop you, and the counter. The counter is the half people skip. */
function ObstacleBlock({ goal, color, handlers }: { goal: NsGoal; color: string; handlers: GoalHandlers }) {
  const [draft, setDraft] = useState("")
  const add = (text: string) => {
    if (!text.trim()) return
    handlers.onAddObstacle(goal.id, text)
    setDraft("")
  }
  const used = new Set(goal.obstacles.map((o) => o.what.toLowerCase()))
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.02] p-3">
      <p className="text-[12.5px] text-zinc-200">What could stop you?</p>
      <p className="text-[11px] text-zinc-500 mt-0.5">
        Name it now, while it is theoretical and cheap. It is much harder to think clearly about this in the middle of week six.
      </p>
      {goal.obstacles.length > 0 && (
        <ul className="mt-2 space-y-2">
          {goal.obstacles.map((o) => (
            <li key={o.id} className="group/ob rounded-lg border px-2.5 py-2" style={{ borderColor: `${color}33` }}>
              <div className="flex items-center gap-2">
                <input
                  value={o.what}
                  onChange={(e) => handlers.onUpdateObstacle(goal.id, o.id, { what: e.target.value })}
                  aria-label="What could stop you"
                  className="flex-1 min-w-0 bg-transparent text-[12.5px] text-zinc-200 focus:outline-none border-b border-transparent focus:border-white/25 py-0.5"
                />
                <button
                  onClick={() => handlers.onRemoveObstacle(goal.id, o.id)}
                  aria-label={`Remove ${o.what}`}
                  className="shrink-0 text-zinc-700 hover:text-rose-300 opacity-0 group-hover/ob:opacity-100 focus:opacity-100 transition-all"
                ><X className="size-3" /></button>
              </div>
              <input
                value={o.counter}
                onChange={(e) => handlers.onUpdateObstacle(goal.id, o.id, { counter: e.target.value })}
                placeholder={OBSTACLE_COUNTER_QUESTION}
                aria-label={`What you will do when "${o.what}" happens`}
                className="w-full mt-1 rounded-md border border-white/10 bg-white/[0.02] px-2 py-1 text-[11.5px] text-zinc-300 placeholder:text-zinc-600 focus:outline-none focus:border-white/25"
              />
            </li>
          ))}
        </ul>
      )}
      <div className="flex items-center gap-1.5 mt-2">
        <Plus className="size-3.5 text-zinc-600 shrink-0" />
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); add(draft) } }}
          placeholder="The thing that has ended this for you before"
          aria-label={`Add something that could stop ${goal.title}`}
          className="flex-1 min-w-0 bg-transparent border-b border-white/10 focus:border-white/30 text-[12.5px] text-zinc-200 placeholder:text-zinc-600 focus:outline-none py-0.5 transition-colors"
        />
      </div>
      <div className="flex flex-wrap gap-1 mt-1.5">
        {OBSTACLE_PRESETS.filter((p) => !used.has(p.toLowerCase())).map((p) => (
          <button
            key={p}
            onClick={() => add(p)}
            className="text-[10px] px-2 py-0.5 rounded-full border border-white/10 text-zinc-500 hover:text-zinc-200 hover:border-white/25 transition-colors"
          >
            + {p}
          </button>
        ))}
      </div>
    </div>
  )
}

/**
 * The belief in the way.
 *
 * The second step is the one that does the work: it refuses to argue about
 * whether the belief is true and asks only whether it is useful. That is how
 * you put a belief down without having to win an argument with yourself, and
 * answering "it serves me" is a real answer that ends the exercise.
 */
function BeliefBlock({ goal, color, handlers }: { goal: NsGoal; color: string; handlers: GoalHandlers }) {
  const [draft, setDraft] = useState("")
  const add = () => {
    if (!draft.trim()) return
    handlers.onAddBelief(goal.id, draft)
    setDraft("")
  }
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.02] p-3">
      <p className="text-[12.5px] text-zinc-200">Is there a belief in the way?</p>
      <p className="text-[11px] text-zinc-500 mt-0.5">
        Finish one of these honestly: I am… / I can&apos;t… / I don&apos;t have the… Most of what stops people is already sitting in one of those three.
      </p>
      {goal.beliefs.length > 0 && (
        <ul className="mt-2 space-y-2">
          {goal.beliefs.map((b) => (
            <li key={b.id} className="group/bl rounded-lg border px-2.5 py-2 space-y-1.5" style={{ borderColor: `${color}33` }}>
              <div className="flex items-center gap-2">
                <input
                  value={b.old}
                  onChange={(e) => handlers.onUpdateBelief(goal.id, b.id, { old: e.target.value })}
                  aria-label={BELIEF_STEP_COPY.old.label}
                  placeholder={BELIEF_STEP_COPY.old.placeholder}
                  className="flex-1 min-w-0 bg-transparent text-[12.5px] text-zinc-200 focus:outline-none border-b border-transparent focus:border-white/25 py-0.5"
                />
                <button
                  onClick={() => handlers.onRemoveBelief(goal.id, b.id)}
                  aria-label={`Remove the belief "${b.old}"`}
                  className="shrink-0 text-zinc-700 hover:text-rose-300 opacity-0 group-hover/bl:opacity-100 focus:opacity-100 transition-all"
                ><X className="size-3" /></button>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[11px] text-zinc-400">{BELIEF_STEP_COPY.useful.label}</span>
                {([true, false] as const).map((v) => (
                  <button
                    key={String(v)}
                    onClick={() => handlers.onUpdateBelief(goal.id, b.id, { useful: b.useful === v ? null : v })}
                    aria-pressed={b.useful === v}
                    className={`text-[10.5px] px-2 py-0.5 rounded-full border transition-colors ${
                      b.useful === v ? "border-white/40 bg-white/10 text-white" : "border-white/10 text-zinc-500 hover:text-zinc-300"
                    }`}
                  >
                    {v ? BELIEF_STEP_COPY.useful.yes : BELIEF_STEP_COPY.useful.no}
                  </button>
                ))}
              </div>

              {b.useful === true && <p className="text-[11px] text-zinc-500">{BELIEF_STEP_COPY.usefulNote}</p>}

              {b.useful === false && (
                <>
                  <div>
                    <p className="text-[11px] text-zinc-400">{BELIEF_STEP_COPY.evidence.label}</p>
                    <textarea
                      value={b.evidence}
                      onChange={(e) => handlers.onUpdateBelief(goal.id, b.id, { evidence: e.target.value })}
                      placeholder={BELIEF_STEP_COPY.evidence.placeholder}
                      rows={2}
                      aria-label={BELIEF_STEP_COPY.evidence.label}
                      className="w-full mt-1 rounded-md border border-white/10 bg-white/[0.02] px-2 py-1 text-[11.5px] text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-white/25 resize-y"
                    />
                  </div>
                  <div>
                    <p className="text-[11px] text-zinc-400">{BELIEF_STEP_COPY.replacement.label}</p>
                    <input
                      value={b.replacement}
                      onChange={(e) => handlers.onUpdateBelief(goal.id, b.id, { replacement: e.target.value })}
                      placeholder={BELIEF_STEP_COPY.replacement.placeholder}
                      aria-label={BELIEF_STEP_COPY.replacement.label}
                      className="w-full mt-1 rounded-md border border-white/10 bg-white/[0.02] px-2 py-1 text-[11.5px] text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-white/25"
                    />
                    {b.replacement.trim() && <p className="text-[10.5px] text-zinc-600 mt-1">{BELIEF_STEP_COPY.conditionNote}</p>}
                  </div>
                </>
              )}
            </li>
          ))}
        </ul>
      )}
      <div className="flex items-center gap-1.5 mt-2">
        <Plus className="size-3.5 text-zinc-600 shrink-0" />
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); add() } }}
          placeholder={BELIEF_STEP_COPY.old.placeholder}
          aria-label={`Add a limiting belief for ${goal.title}`}
          className="flex-1 min-w-0 bg-transparent border-b border-white/10 focus:border-white/30 text-[12.5px] text-zinc-200 placeholder:text-zinc-600 focus:outline-none py-0.5 transition-colors"
        />
      </div>
    </div>
  )
}

/**
 * Which bigger goal does this one feed?
 *
 * Cross-area links are the point: a sleep habit feeding a revenue target is
 * exactly the connection worth seeing. A target that would close a loop is
 * disabled with a reason on it rather than silently rejected.
 */
function FeedsPicker({ goal, allGoals, areas, color, onLink, onUnlink }: {
  goal: NsGoal
  allGoals: NsGoal[]
  areas: NsArea[]
  color: string
  onLink: (fromId: string, toId: string) => void
  onUnlink: (fromId: string, toId: string) => void
}) {
  const [open, setOpen] = useState(false)
  const byId = new Map(allGoals.map((g) => [g.id, g]))
  const areaLabel = new Map(areas.map((a) => [a.id, a.label]))
  const candidates = allGoals.filter((g) => g.id !== goal.id && !goal.feedsGoalIds.includes(g.id))

  if (allGoals.length <= 1) return null

  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.02] px-3 py-2">
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-[11px] text-zinc-400">Does this feed a bigger goal?</span>
        {goal.feedsGoalIds.length === 0 && <span className="text-[10.5px] text-zinc-600">not linked to anything yet</span>}
        {goal.feedsGoalIds.map((id) => (
          <span key={id} className="group/feed inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10.5px] text-zinc-200" style={{ borderColor: `${color}55` }}>
            {byId.get(id)?.title ?? id}
            <button
              onClick={() => onUnlink(goal.id, id)}
              aria-label={`Unlink ${byId.get(id)?.title ?? id}`}
              className="opacity-0 group-hover/feed:opacity-100 focus:opacity-100 text-zinc-500 hover:text-rose-300 transition-all"
            ><X className="size-2.5" /></button>
          </span>
        ))}
        {candidates.length > 0 && (
          <button onClick={() => setOpen((o) => !o)} aria-expanded={open} className="ml-auto text-[10.5px] text-zinc-500 hover:text-zinc-300 transition-colors shrink-0">
            {open ? "done" : "+ link"}
          </button>
        )}
      </div>
      {open && (
        <div className="flex flex-wrap gap-1.5 mt-2">
          {candidates.map((c) => {
            const loops = wouldCycle(allGoals, goal.id, c.id)
            return (
              <button
                key={c.id}
                onClick={() => { onLink(goal.id, c.id); setOpen(false) }}
                disabled={loops}
                title={loops ? `"${c.title}" already feeds this one. A loop would make the plan unreadable.` : `This goal feeds "${c.title}"`}
                className="text-[10.5px] px-2 py-0.5 rounded-full border border-white/15 text-zinc-300 hover:bg-white/10 disabled:opacity-25 disabled:cursor-not-allowed transition-colors"
              >
                {c.title}
                {c.areaId !== goal.areaId && <span className="text-zinc-600"> · {areaLabel.get(c.areaId) ?? ""}</span>}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

/**
 * The slider shows 5 while the value is unset, so the readout says "–/10" and
 * the track is dimmed. Dragging to exactly 5 fires no change event, so the
 * readout doubles as a button that confirms the value under the thumb.
 */
export function Rating({ label, value, color, onChange, ariaLabel }: {
  label: string
  value: number | null
  color: string
  onChange: (value: number) => void
  ariaLabel: string
}) {
  return (
    <div>
      <p className="text-[11px] text-zinc-400 mb-1">{label}</p>
      <div className="flex items-center gap-2.5">
        <input
          type="range"
          min={0}
          max={10}
          step={1}
          value={value ?? 5}
          onChange={(e) => onChange(Number(e.target.value))}
          aria-label={ariaLabel}
          className={`flex-1 min-w-0 ${value == null ? "opacity-40" : ""}`}
          style={{ accentColor: value == null ? "#52525b" : color }}
        />
        <button
          onClick={() => onChange(value ?? 5)}
          aria-label={value == null ? `Set “${label}” to 5` : `“${label}” is ${value} out of 10`}
          title={value == null ? "Click to set 5, or drag to rate" : undefined}
          className={`text-[11px] tabular-nums w-11 text-right shrink-0 ${
            value == null
              ? "text-zinc-500 underline decoration-dotted hover:text-white"
              : value < NS_QUALIFY_THRESHOLD
                ? "text-amber-300"
                : "text-zinc-300"
          }`}
        >
          {value != null ? `${value}/10` : "–/10"}
        </button>
      </div>
    </div>
  )
}

/** A list you add to three words at a time. No forms, no modals. */
export function TagList({ label, hint, placeholder, color, items, suggestions, onChange }: {
  label: string
  hint?: string
  placeholder: string
  color: string
  items: string[]
  suggestions?: string[]
  onChange: (items: string[]) => void
}) {
  const [draft, setDraft] = useState("")
  const add = (text: string) => {
    const t = text.trim()
    if (!t || items.some((i) => i.trim().toLowerCase() === t.toLowerCase())) { setDraft(""); return }
    onChange([...items, t])
    setDraft("")
  }
  const used = new Set(items.map((i) => i.toLowerCase()))
  return (
    <div>
      <p className="text-[11.5px] text-zinc-300">{label}</p>
      {hint && <p className="text-[10.5px] text-zinc-600 mt-0.5">{hint}</p>}
      {items.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-1.5">
          {items.map((it, i) => (
            <span
              key={`${it}-${i}`}
              className="group/tag inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] text-zinc-200"
              style={{ borderColor: `${color}55`, background: `${color}12` }}
            >
              {it}
              <button
                onClick={() => onChange(items.filter((_, n) => n !== i))}
                aria-label={`Remove ${it}`}
                className="opacity-0 group-hover/tag:opacity-100 focus:opacity-100 text-zinc-500 hover:text-rose-300 transition-all"
              ><X className="size-2.5" /></button>
            </span>
          ))}
        </div>
      )}
      <input
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); add(draft) } }}
        onBlur={() => add(draft)}
        aria-label={label}
        placeholder={placeholder}
        className="mt-1.5 w-full rounded-lg border border-white/10 bg-white/[0.02] px-2.5 py-1 text-[12.5px] text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-white/30 transition-colors"
      />
      {suggestions && (
        <div className="flex flex-wrap gap-1 mt-1.5">
          {/* The same suggestion word can appear on two lists on one screen
              (an area's values and the whole-life values). "+ Freedom" twice
              is unambiguous by position and identical to a screen reader, so
              each chip names the list it adds to. */}
          {suggestions.filter((s) => !used.has(s.toLowerCase())).slice(0, 12).map((s) => (
            <button
              key={s}
              onClick={() => add(s)}
              aria-label={`Add ${s} to “${label}”`}
              className="text-[10px] px-2 py-0.5 rounded-full border border-white/10 text-zinc-500 hover:text-zinc-200 hover:border-white/25 transition-colors"
            >
              + {s}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

/**
 * The priority badge.
 *
 * The number is the goal's rank across the whole plan, and it is a field rather
 * than a label: click it and type 1 to make something your first goal. The
 * arrows are there because moving one place is the common case and typing a
 * number for it is silly. Ranks come out 1, 2, 3 by themselves — a new goal is
 * appended, so nothing already ranked gets renumbered by someone else arriving.
 */
export function PriorityBadge({ rank, total, color, title, onSet, onMove }: {
  rank: number
  total: number
  color: string
  title: string
  onSet: (rank: number) => void
  onMove: (dir: -1 | 1) => void
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(String(rank))

  const commit = () => {
    const n = Number(draft)
    if (Number.isFinite(n) && n >= 1) onSet(n)
    setEditing(false)
  }

  if (editing) {
    return (
      <input
        autoFocus
        type="number"
        min={1}
        max={total}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") commit()
          if (e.key === "Escape") setEditing(false)
        }}
        aria-label={`Priority for ${title}, 1 to ${total}`}
        className="w-9 shrink-0 rounded-md border bg-white/10 px-1 py-0.5 text-[11px] text-white text-center tabular-nums focus:outline-none"
        style={{ borderColor: color }}
      />
    )
  }

  return (
    <span className="group/prio flex items-center shrink-0">
      <button
        onClick={() => { setDraft(String(rank)); setEditing(true) }}
        title={`Priority ${rank} of ${total}. Click to change it.`}
        aria-label={`Priority ${rank} of ${total} for ${title}. Change it`}
        className="size-6 rounded-md border text-[11px] font-bold tabular-nums flex items-center justify-center transition-colors"
        style={{ borderColor: `${color}66`, background: `${color}1f`, color: "#fff" }}
      >
        {rank}
      </button>
      <span className="flex flex-col ml-0.5 opacity-0 group-hover/prio:opacity-100 focus-within:opacity-100 transition-opacity">
        <button
          onClick={() => onMove(-1)}
          disabled={rank <= 1}
          aria-label={`Make ${title} a higher priority`}
          className="text-zinc-500 hover:text-white disabled:opacity-20 leading-none"
        ><ChevronDown className="size-3 rotate-180" /></button>
        <button
          onClick={() => onMove(1)}
          disabled={rank >= total}
          aria-label={`Make ${title} a lower priority`}
          className="text-zinc-500 hover:text-white disabled:opacity-20 leading-none"
        ><ChevronDown className="size-3" /></button>
      </span>
    </span>
  )
}

/**
 * The actions. What you will actually do on a Tuesday.
 *
 * A goal that names an outcome and no action is the commonest way a plan dies
 * quietly, so when the shared predicate says one is missing this asks in amber
 * at the point of contact rather than filing a note somewhere.
 */
function ActionBlock({ goal, color, needsAction, handlers }: {
  goal: NsGoal
  color: string
  needsAction: boolean
  handlers: GoalHandlers
}) {
  const [draft, setDraft] = useState("")
  const [days, setDays] = useState(3)
  const add = () => {
    if (!draft.trim()) return
    handlers.onAddAction(goal.id, draft, days)
    setDraft("")
  }
  return (
    <div className={`rounded-xl border p-3 ${needsAction ? "border-amber-400/25 bg-amber-500/[0.06]" : "border-white/10 bg-white/[0.02]"}`}>
      <p className={`text-[12.5px] ${needsAction ? "text-amber-100/90" : "text-zinc-200"}`}>
        What will you actually do about this?
      </p>
      <p className="text-[11px] text-zinc-500 mt-0.5 leading-relaxed">
        {needsAction
          ? "It names where you want to end up and nothing you can do on a Tuesday. One action is enough to start."
          : "The things you repeat that move this. The goal is the destination, these are the miles."}
      </p>

      {goal.habits.length > 0 && (
        <ul className="mt-2 space-y-1">
          {goal.habits.map((h) => (
            <li key={h.id} className="group/act flex items-center gap-2">
              <span className="size-1.5 rounded-full shrink-0" style={{ backgroundColor: color }} />
              <input
                value={h.title}
                onChange={(e) => handlers.onUpdateAction(goal.id, h.id, { title: e.target.value })}
                aria-label="Action"
                className="flex-1 min-w-0 bg-transparent border-b border-transparent hover:border-white/10 focus:border-white/25 text-[12.5px] text-zinc-200 focus:outline-none py-0.5 transition-colors"
              />
              <select
                value={h.daysPerWeek}
                onChange={(e) => handlers.onUpdateAction(goal.id, h.id, { daysPerWeek: Number(e.target.value) })}
                aria-label={`Days per week for ${h.title}`}
                className="bg-white/5 border border-white/10 rounded px-1 py-0.5 text-[10px] text-zinc-300 focus:outline-none shrink-0"
              >
                {[1, 2, 3, 4, 5, 6, 7].map((n) => <option key={n} value={n} className="bg-zinc-900">{n}×/wk</option>)}
              </select>
              <button
                onClick={() => handlers.onRemoveAction(goal.id, h.id)}
                aria-label={`Remove action ${h.title}`}
                className="shrink-0 text-zinc-700 hover:text-rose-300 opacity-0 group-hover/act:opacity-100 focus:opacity-100 transition-all"
              ><X className="size-3" /></button>
            </li>
          ))}
        </ul>
      )}

      <div className="flex items-center gap-1.5 mt-2">
        <Plus className="size-3.5 text-zinc-600 shrink-0" />
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); add() } }}
          placeholder="e.g. squat session · walk 30 minutes · one sales call"
          aria-label={`Add an action for ${goal.title}`}
          className="flex-1 min-w-0 bg-transparent border-b border-white/10 focus:border-white/30 text-[12.5px] text-zinc-200 placeholder:text-zinc-600 focus:outline-none py-0.5 transition-colors"
        />
        <select
          value={days}
          onChange={(e) => setDays(Number(e.target.value))}
          aria-label="Days per week for the new action"
          className="bg-white/5 border border-white/10 rounded-md px-1.5 py-1 text-[10.5px] text-zinc-300 focus:outline-none shrink-0"
        >
          {[1, 2, 3, 4, 5, 6, 7].map((n) => <option key={n} value={n} className="bg-zinc-900">{n}×/wk</option>)}
        </select>
        <button
          onClick={add}
          disabled={!draft.trim()}
          className="shrink-0 text-[11px] px-2 py-1 rounded-md border border-white/15 text-zinc-300 hover:bg-white/10 disabled:opacity-30 transition-colors"
        >
          Add
        </button>
      </div>
    </div>
  )
}

/**
 * The reasons drill.
 *
 * One prompt at a time, and a running count, because the exercise is volume:
 * the first ten reasons are the surface and the ones that actually move you turn
 * up after that. Every line goes in on its own, so you can empty your head at
 * the pace it comes.
 */
function ReasonsDrill({ goal, color, handlers }: { goal: NsGoal; color: string; handlers: GoalHandlers }) {
  const [open, setOpen] = useState(false)
  const [prompt, setPrompt] = useState(0)
  const [draft, setDraft] = useState("")
  const current = REASON_PROMPTS[prompt % REASON_PROMPTS.length]
  const n = goal.reasonsList.length

  const add = () => {
    if (!draft.trim()) return
    handlers.onAddReasons(goal.id, draft)
    setDraft("")
  }

  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.02] p-3">
      <button onClick={() => setOpen((v) => !v)} aria-expanded={open} className="w-full flex items-center gap-2 text-left group">
        <ChevronDown className={`size-3.5 shrink-0 text-zinc-500 transition-transform ${open ? "" : "-rotate-90"}`} />
        <span className="text-[12.5px] text-zinc-200 group-hover:text-white transition-colors">Stack up the reasons</span>
        <span className="ml-auto text-[10.5px] text-zinc-500 tabular-nums shrink-0">
          {n === 0 ? "aim for a lot" : `${n} written`}
        </span>
      </button>

      {open && (
        <div className="mt-2">
          <p className="text-[11px] text-zinc-500 leading-relaxed">
            Volume is the exercise. The first ten are the surface, and the reasons that actually move you turn up after that. One per line.
          </p>
          <div className="flex items-baseline justify-between gap-3 mt-2">
            <p className="text-[12px] text-zinc-300">{current.question}</p>
            <button
              onClick={() => setPrompt(prompt + 1)}
              className="inline-flex items-center gap-1 text-[10px] text-zinc-500 hover:text-zinc-300 transition-colors shrink-0"
            >
              <RotateCcw className="size-3" />
              next angle
            </button>
          </div>
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={add}
            onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) { e.preventDefault(); add() } }}
            placeholder="One reason per line. Do not stop to judge them."
            rows={3}
            aria-label={`Reasons ${goal.title} has to happen`}
            className="w-full mt-1.5 rounded-lg border border-white/10 bg-white/[0.02] px-2.5 py-1.5 text-[12.5px] text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-white/30 resize-y transition-colors"
          />
          <button
            onClick={add}
            disabled={!draft.trim()}
            className="mt-1.5 text-[11px] px-2 py-1 rounded-md border border-white/15 text-zinc-300 hover:bg-white/10 disabled:opacity-30 transition-colors"
          >
            Add these
          </button>

          {n > 0 && (
            <ol className="mt-2 space-y-0.5">
              {goal.reasonsList.map((r, i) => (
                <li key={`${r}-${i}`} className="group/rsn flex items-baseline gap-2 text-[12px]">
                  <span className="text-[9.5px] tabular-nums shrink-0 w-5 text-right" style={{ color }}>{i + 1}</span>
                  <span className="text-zinc-300 min-w-0">{r}</span>
                  <button
                    onClick={() => handlers.onRemoveReason(goal.id, i)}
                    aria-label={`Remove reason ${i + 1}`}
                    className="ml-auto shrink-0 text-zinc-700 hover:text-rose-300 opacity-0 group-hover/rsn:opacity-100 focus:opacity-100 transition-all"
                  ><X className="size-2.5" /></button>
                </li>
              ))}
            </ol>
          )}
        </div>
      )}
    </div>
  )
}
