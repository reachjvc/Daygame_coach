"use client"

/**
 * /test/vision-plan — DISCONNECTED sandbox for the vision → full-plan flow.
 * Plan: docs/plans/vision-to-plan-test-page.md (M1: intake + intent splitting).
 *
 * The user types a big multi-domain vision ("wake up happy, build a business,
 * be in love"); we split it into clauses, embed them IN THE BROWSER (same
 * multilingual MiniLM + taxonomy-vector cache as GoalIntake — $0, no API) and
 * derive the distinct intents it contains, each routed to a life area +
 * framework objective. The areas render as a horizontal DRAGGABLE board (drag
 * = priority, click = include/exclude) with each area's definition and the
 * vision clauses that mapped to it; goals are drafted automatically and appear
 * below — no extra button click. Nothing here touches /api/goals/*.
 */

import { useState, useCallback, useMemo, useEffect, useRef, type ReactNode } from "react"
import {
  buildTaxonomyItems,
  taxonomyVersion,
  matchTaxonomy,
  splitSpans,
} from "@/src/goals/intakeService"
import type { TaxonomyItem } from "@/src/goals/intakeService"
import {
  deriveIntents,
  confidenceTier,
  balancePlan,
  loadVisionPlanState,
  softLayerRollup,
  readGoalVehicle,
  REASON_PROMPTS,
  setAreaPriority,
  deriveAreaRank,
  GUIDE_SESSIONS,
  approachRung,
  CORRECTION_MOVES,
  CORRECTION_GUARD_RAIL,
  beliefConditioning,
  paretoKeepCount,
  HORIZON_YEARS,
  type HorizonYears,
  guideProgress,
  guideDoneSet,
  guideSittingWarning,
  areaTier,
  nextLevelTarget,
  addGoalEdge,
  removeGoalEdge,
  wouldCycle,
  removeGoal as removeGoalFromList,
  orderGoalIdsByArea,
  addRoutineHabit,
  removeRoutineHabit,
  routineGoalId,
  routineHabitId,
  habitsDueOnDate,
  habitDueOnDate,
  dayNumber,
  weekWindow,
  tasksDueByDate,
  goalRollup,
  areaRollups,
  visionPercent,
  measureToLadderConfig,
  applyWorkoutSplit,
  routineDayForDate,
  routineWeekPreview,
  rampSummary,
  goalHorizon,
  addDays,
  visionReviewedOn,
  toggleVisionReviewed,
  ritualFromPreset,
  ritualMinutes,
  toggleRitualStep,
  moveRitualStep,
  ritualStepDoneOn,
  toggleRitualStepDone,
  dayPlanFor,
  toggleMustItem,
  addAdhocItem,
  toggleAdhocItem,
  removeAdhocItem,
  setBlockReason,
  logMeasure,
  latestMeasure,
  measureRunRate,
  dueWeeklyRituals,
  installDay,
  rotationDue,
  ritualCoverage,
  materializeOutcomes,
  counterDay,
  adhocOriginDate,
  rolloverAdhocSince,
  seedBaselineReview,
  MAX_MUST_ITEMS,
  reviewDue,
  goalRollupRange,
  saveWeeklyReview,
  lastRatingsBefore,
  monthOptions,
  monthlyReport,
  yearReport,
  buildSmartSentence,
  BELIEF_SWEET_SPOT,
  areaRatingSeries,
  wheelAvgSeries,
  dayStreak,
  ritualPerfectStreak,
  habitStreak,
  weekIndexFor,
  pendingActions,
  eveningReflectionFor,
  saveEveningReflection,
  areasTouchedInWeek,
  rebaselineDue,
  suggestVerdict,
  verdictsFor,
  saveVerdict,
  createAreaGoal,
  classifyGoalInput,
  ladderSteps,
  measureDirection,
  shrunkTarget,
  goalNeedsAction,
  goalIsPlanned,
  goalGaps,
  planConformance,
  addGoalAction,
  dropDuplicateSuggestions,
  deriveIntakePosition,
  isAnnualRerun,
  isIntakeAnswered,
  isIntakeSettled,
  isIntakePageComplete,
  revealedIntakeQuestions,
} from "@/src/goals/visionPlanService"
import type { PendingAction } from "@/src/goals/visionPlanService"
import { LIFE_MASTERY_AREAS, LIFE_MASTERY_AREA_MAP, LIFE_MASTERY_SUCCESS_LEVEL, BLUEPRINT_ROWS, blueprintCoverage, goalFeedsArea, areaTextColor, VALUE_SUGGESTIONS, EMPOWERING_QUESTIONS, RAISE_ACTIONS } from "@/src/goals/data/lifeMasteryAreas"
import { PRINCIPLES, SOS_PROTOCOLS } from "@/src/goals/data/lifeMasteryPrinciples"
import { EXEMPLAR_WHOLE_LIFE, EXEMPLAR_ERA_LABEL, exemplarArea, type ExemplarEra } from "@/src/goals/data/lifeMasteryExemplar"
import { BELIEF_STEPS, BELIEF_STEMS, BELIEF_SHORT_FORM, type BeliefWork } from "@/src/goals/data/lifeMasteryBeliefs"
import {
  INTAKE_PAGES,
  INTAKE_SKIP_LABEL,
  questionsForPage,
  type IntakePageId,
  type IntakeQuestion,
} from "@/src/goals/data/lifeMasteryIntake"
import { APPROACH_LADDER, APPROACH_OPENER, APPROACH_REPS, APPROACH_VENUES, SESSION_JOURNAL_PROMPTS, SINGLE_BOOKS, type RelationshipStatus } from "@/src/goals/data/lifeMasterySingle"
import { MANIFESTO_PROGRAM_CREDO, MANIFESTO_OPENER_TEMPLATE, MASTERY_TEN_KEYS, MASTERY_THREE_LEVELS, PLATEAU_DOCTRINE, INCANTATION_DECK, INCANTATION_PROTOCOL, QUESTION_FOLLOW_UP, MONEY_JARS, MONEY_WEEKLY_RITUAL, MONEY_RULES, MONEY_DEBT_PROTOCOL, RELATIONSHIP_JOURNAL_SCRIPT, SIX_NEEDS, RULES_EXERCISE, CONSEQUENCE_MENU, CONSEQUENCE_RULES, RESOURCE_LADDER, AREA_BOOKS } from "@/src/goals/data/lifeMasteryContent"
import { buildExamplePlan, EXAMPLE_VISION } from "@/src/goals/data/lifeMasteryExample"
import { VEHICLE_CONVERSIONS, AWAY_SUGGESTIONS, detectValueConflicts, startPairwise, pairwiseQuestion, pairwiseAnswer } from "@/src/goals/data/valuesFramework"
import type { PairwiseState } from "@/src/goals/data/valuesFramework"
import { PairComparison } from "@/src/inner-game/components/CuttingStep/PairComparison"
import { CategoryCard } from "@/src/inner-game/components/ValuesStep/CategoryCard"
import { CATEGORIES } from "@/src/inner-game/config"
import { generateMilestoneLadder } from "@/src/goals/milestoneService"
import { WORKOUT_SPLITS } from "@/src/goals/data/visionWorkoutSplits"
import type { VisionAreaRollup, VisionMonthlyReport } from "@/src/goals/visionPlanService"
import { HORIZON_META, formatCountdown } from "@/src/goals/horizonService"
import { SortablePriorityList } from "@/src/goals/components/new-goals/SortablePriorityList"
import { TARGETS, PILLARS } from "@/src/goals/data/newGoalFramework"
import { ROUTINE_CATEGORIES, RITUAL_LIBRARY, RITUAL_DIMENSIONS, WEEKLY_RITUAL_LIBRARY } from "@/src/goals/data/visionRoutineLibrary"
import { EditableTitle } from "@/src/goals/components/new-goals/EditableTitle"
import type { VisionPlanRepair, SoftLayerEntry, GuideSessionId, GuideEvidence } from "@/src/goals/visionPlanService"
import { GoalListReview, ReasonsPass, type GoalListAccept } from "./GoalListReview"
import type { BalancedHabit, BalancedPlan, BalancedTask, HabitRampStep, HabitRoutine, RoutineCategory, RoutineTemplate, VisionAdhocItem, VisionAreaPlan, VisionDrivingForce, VisionGoalDraft, VisionGoalType, VisionMeasure, VisionGoalRollup, VisionGoalVerdict, VisionHabit, VisionIntent, VisionIntentResult, VisionPlanState, VisionProgress, VisionRitual, VisionVerdictEntry, VisionWeeklyDraft, VisionWeeklyOutcome, VisionWeeklyReview, VisionWeeklyRitual, WorkoutSplit } from "@/src/goals/types"
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core"
import { SortableContext, useSortable, arrayMove, rectSortingStrategy } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { Telescope, Loader2, Sparkles, Wand2, ChevronDown, Repeat, Check, TrendingUp, Minus, Plus, AlertTriangle, X, RotateCcw, GripVertical, Lock, CalendarCheck } from "lucide-react"

// Same model + cache as GoalIntake so the taxonomy vectors are shared between
// the two test pages (identical items → identical version hash → cache hit).
const MODEL_ID = "Xenova/paraphrase-multilingual-MiniLM-L12-v2"
const CACHE_KEY = "goalIntakeTaxEmb_v1"

let extractorPromise: Promise<unknown> | null = null
async function getExtractor(onProgress?: (pct: number) => void): Promise<(t: string[], o: object) => Promise<{ tolist: () => number[][] }>> {
  if (!extractorPromise) {
    extractorPromise = (async () => {
      const { pipeline } = await import("@huggingface/transformers")
      return pipeline("feature-extraction", MODEL_ID, {
        progress_callback: (e: unknown) => {
          const p = (e as { progress?: number } | null)?.progress
          if (typeof p === "number") onProgress?.(Math.round(p))
        },
      })
    })().catch((e) => {
      // A failed download must not poison the singleton — clear it so the next
      // click genuinely retries (the browser resumes cached model shards).
      extractorPromise = null
      throw e
    })
  }
  return extractorPromise as Promise<(t: string[], o: object) => Promise<{ tolist: () => number[][] }>>
}

/** Reset the cached model loader (used by the stall watchdog so retry restarts clean). */
function resetExtractor() {
  extractorPromise = null
}

async function embed(texts: string[], onProgress?: (pct: number) => void): Promise<number[][]> {
  const extractor = await getExtractor(onProgress)
  const out = await extractor(texts, { pooling: "mean", normalize: true })
  return out.tolist()
}

type Phase = "idle" | "loading" | "matching" | "done" | "error"

const SANDBOX_KEY = "visionPlanSandbox_v1"
/** v25 — which view the lab was last in. View state, so it is kept out of
 * the plan schema and simply restored on load. */
const VIEW_MODE_KEY = "visionPlanMode_v1"

const PLACEHOLDER =
  "I wake up energized in a strong, healthy body. My business makes 10 k$/month and my time is my own. I'm in a loving relationship, and I see my closest friends every week. My mind is calm and on my side…"


/**
 * v24 — a pillar colour, lightened until it passes WCAG AA as TEXT.
 *
 * Pillar colours live in `newGoalFramework.ts`, which several other surfaces
 * share, so they are not safe to change there. Two of them are legible as a
 * fill and NOT as small text on the dark surface (wealth's purple-500 measures
 * 4.30:1 against 4.5 required). Fills keep the shared colour; text uses this.
 * Same rule as `areaTextColor` for the twelve areas.
 */
const PILLAR_TEXT_TINT: Record<string, string> = {
  "#a855f7": "#c084fc", // purple-500 → purple-400
  "#6366f1": "#818cf8", // indigo-500 → indigo-400
}
const pillarTextColor = (hex: string): string => PILLAR_TEXT_TINT[hex?.toLowerCase()] ?? hex

/** Draw the vision with each intent's clauses in that intent's area colour. */
function renderHighlighted(text: string, intents: VisionIntent[]) {
  const marks = intents
    // v24 — these clauses are TEXT, so they take the legible tint, not the fill.
    .flatMap((it) => it.spans.map((s) => ({ ...s, color: pillarTextColor(it.pillarColor) })))
    .sort((a, b) => a.start - b.start)
  const out: ReactNode[] = []
  let cursor = 0
  marks.forEach((m, i) => {
    if (m.start > cursor) out.push(text.slice(cursor, m.start))
    out.push(
      <span
        key={`${m.start}-${i}`}
        className="rounded px-1 -mx-0.5 decoration-2 underline-offset-4"
        style={{ color: m.color, backgroundColor: `${m.color}1a`, textDecorationLine: "underline", textDecorationColor: `${m.color}80` }}
      >
        {m.text}
      </span>,
    )
    cursor = m.end
  })
  if (cursor < text.length) out.push(text.slice(cursor))
  return out
}

const TIER_LABEL: Record<ReturnType<typeof confidenceTier>, string> = {
  strong: "strong match",
  medium: "likely match",
  weak: "weak match",
}

const TARGET_LABEL = new Map(TARGETS.map((t) => [t.id, t.label]))
const PILLAR_TAGLINE = new Map(PILLARS.map((p) => [p.id, p.tagline]))
const PILLAR_BY_ID = new Map(PILLARS.map((p) => [p.id, p]))

/** One life area on the draggable board — the intents that landed on it, grouped.
 * `goalTitles` is set instead when the area exists only because goal design
 * (the LLM may re-route a weak intent) introduced it — no vision clauses. */
interface AreaGroup {
  pillarId: string
  label: string
  color: string
  tagline: string
  intents: VisionIntent[]
  goalTitles?: string[]
}

/** Unique pillar ids in first-appearance order — the default area priority. */
function uniquePillarIds(intents: VisionIntent[]): string[] {
  return [...new Set(intents.map((i) => i.pillarId))]
}

/** Append pillars that only exist in drafted goals (LLM re-routes) to the area
 * order, so every goal's area is on the board — draggable and toggleable. */
function extendAreaOrder(order: string[], goals: Array<{ pillarId: string }>): string[] {
  const extra = [...new Set(goals.map((g) => g.pillarId))].filter((p) => !order.includes(p))
  return extra.length ? [...order, ...extra] : order
}

/**
 * One draggable life-area card: drag handle + rank (priority), the area's
 * definition, and the vision clauses that mapped to it. Clicking the card body
 * (or the check) toggles whether this area's goals are in the plan.
 */
function AreaCard({ area, rank, selected, onToggle }: { area: AreaGroup; rank: number; selected: boolean; onToggle: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: area.pillarId })
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : undefined,
    zIndex: isDragging ? 10 : undefined,
    borderColor: isDragging ? "rgba(255,255,255,0.3)" : selected ? `${area.color}4d` : undefined,
  }
  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`relative rounded-xl border p-3.5 transition-all ${selected ? "bg-white/[0.05]" : "border-white/10 bg-white/[0.02] opacity-55"} ${isDragging ? "shadow-lg" : ""}`}
    >
      <div className="flex items-center gap-2">
        {/* Grip + rank + name = drag handle; the rest of the card toggles selection */}
        <div
          className="flex items-center gap-1.5 min-w-0 cursor-grab active:cursor-grabbing touch-none select-none"
          aria-label={`Reorder ${area.label}`}
          {...attributes}
          {...listeners}
        >
          <GripVertical className="size-4 text-zinc-500 shrink-0" />
          <span
            className="text-[10px] font-bold size-5 rounded-full flex items-center justify-center shrink-0"
            style={{ backgroundColor: `${area.color}33`, color: area.color }}
          >
            {rank}
          </span>
          <span className="text-sm font-semibold truncate" style={{ color: selected ? pillarTextColor(area.color) : undefined }}>{area.label}</span>
        </div>
        <button
          onClick={onToggle}
          aria-pressed={selected}
          aria-label={`${selected ? "Leave out" : "Include"} ${area.label}`}
          className={`ml-auto size-5 rounded-md border flex items-center justify-center shrink-0 transition-colors ${selected ? "border-transparent" : "border-white/25 hover:border-white/50"}`}
          style={selected ? { backgroundColor: area.color } : undefined}
        >
          {selected && <Check className="size-3.5 text-zinc-950" />}
        </button>
      </div>

      {/* Definition of the area + what mapped to it — clicking toggles inclusion */}
      <button onClick={onToggle} className="block w-full text-left mt-2">
        <p className="text-[11px] text-zinc-500">{area.tagline}</p>
        {area.intents.length > 0 ? (
          <ul className="mt-2 space-y-1.5">
            {area.intents.map((it) => (
              <li key={it.id} className="text-xs leading-snug">
                <span className="text-zinc-200">&ldquo;{it.text}&rdquo;</span>
                <span className="block text-[10px] text-zinc-500 mt-0.5">
                  {it.objectiveLabel ? <>→ {it.objectiveLabel} · </> : null}
                  {it.id.startsWith("room-") ? "your room, from the wheel" : TIER_LABEL[confidenceTier(it.confidence)]}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <div className="mt-2">
            <span className="flex items-center gap-1.5 text-[10px] text-zinc-400">
              <Wand2 className="size-3 shrink-0 text-emerald-300/70" />
              Added beyond your vision text:
            </span>
            <ul className="mt-1.5 space-y-1">
              {(area.goalTitles ?? []).map((t) => (
                <li key={t} className="text-xs leading-snug text-zinc-200">&ldquo;{t}&rdquo;</li>
              ))}
            </ul>
          </div>
        )}
        {!selected && <p className="text-[10px] text-zinc-500 mt-2 italic">Left out, click to include</p>}
      </button>
    </div>
  )
}

/** Horizontal draggable board of the life areas found in the vision. */
function AreaBoard({
  areas,
  deselected,
  onToggle,
  onReorder,
}: {
  areas: AreaGroup[]
  deselected: Set<string>
  onToggle: (pillarId: string) => void
  onReorder: (pillarIds: string[]) => void
}) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor),
  )
  const ids = areas.map((a) => a.pillarId)
  const onDragEnd = (e: DragEndEvent) => {
    const { active, over } = e
    if (!over || active.id === over.id) return
    const oldI = ids.indexOf(active.id as string)
    const newI = ids.indexOf(over.id as string)
    if (oldI === -1 || newI === -1) return
    onReorder(arrayMove(ids, oldI, newI))
  }
  const cols =
    areas.length >= 4 ? "sm:grid-cols-2 xl:grid-cols-4" : areas.length === 3 ? "sm:grid-cols-3" : areas.length === 2 ? "sm:grid-cols-2" : ""
  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
      <SortableContext items={ids} strategy={rectSortingStrategy}>
        <div className={`grid gap-3 items-start ${cols}`}>
          {areas.map((a, i) => (
            <AreaCard key={a.pillarId} area={a} rank={i + 1} selected={!deselected.has(a.pillarId)} onToggle={() => onToggle(a.pillarId)} />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  )
}

/** Provenance badge — answers "who says so?": your curated framework, or the AI. */
function ProvenanceBadge({ sourceTargetId }: { sourceTargetId?: string | null }) {
  if (sourceTargetId) {
    return (
      <span className="text-[9px] px-1.5 py-px rounded-full border border-sky-400/30 bg-sky-500/10 text-sky-300 shrink-0" title="Mirrors a curated target from your goal framework">
        framework · {TARGET_LABEL.get(sourceTargetId) ?? sourceTargetId}
      </span>
    )
  }
  return (
    <span className="text-[9px] px-1.5 py-px rounded-full border border-white/15 text-zinc-500 shrink-0" title="Suggested for you, based on what you wrote. Refine it or write your own.">
      AI pick
    </span>
  )
}

/** Inline "refine with AI" row — free-text change request for ONE goal. */
function RefineRow({ busy, error, onRefine }: { busy: boolean; error: string; onRefine: (instruction: string) => void }) {
  const [instruction, setInstruction] = useState("")
  const commit = () => {
    if (!instruction.trim() || busy) return
    onRefine(instruction.trim())
    setInstruction("")
  }
  return (
    <div className="mt-3 pt-3 border-t border-white/10">
      <div className="flex items-center gap-2">
        <Wand2 className="size-3.5 shrink-0 text-emerald-300/70" />
        <input
          value={instruction}
          onChange={(e) => setInstruction(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") commit() }}
          placeholder="Tweak this goal… e.g. “one more gym day” or “make it calisthenics”"
          disabled={busy}
          className="flex-1 min-w-0 bg-transparent border-b border-white/10 focus:border-white/30 text-sm text-zinc-200 placeholder:text-zinc-600 focus:outline-none py-0.5 transition-colors disabled:opacity-50"
        />
        <button
          onClick={commit}
          disabled={busy || !instruction.trim()}
          className="flex items-center gap-1.5 text-[11px] px-2.5 py-1 rounded-md border border-emerald-500/40 bg-emerald-500/10 text-emerald-200 hover:bg-emerald-500/20 disabled:opacity-30 transition-colors"
        >
          {busy ? <Loader2 className="size-3 animate-spin" /> : null}
          {busy ? "Refining…" : "Refine"}
        </button>
      </div>
      {error && <p className="text-xs text-red-300 mt-2">Refine failed: {error}</p>}
    </div>
  )
}

/** Today's date in the USER'S timezone (not UTC) as YYYY-MM-DD. */
function localTodayISO(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
}

/** Wheel segment order — keeps the near-miss yellow/orange pair non-adjacent
 * (validated with the dataviz palette checker; gaps + labels carry identity). */
const WHEEL_ORDER = ["health", "relations", "wealth", "meaning", "vices"]

function polar(cx: number, cy: number, r: number, deg: number): [number, number] {
  const rad = ((deg - 90) * Math.PI) / 180
  return [cx + r * Math.cos(rad), cy + r * Math.sin(rad)]
}

function arcPath(cx: number, cy: number, r: number, startDeg: number, endDeg: number): string {
  const [x1, y1] = polar(cx, cy, r, startDeg)
  const [x2, y2] = polar(cx, cy, r, endDeg)
  const large = endDeg - startDeg > 180 ? 1 : 0
  return `M ${x1.toFixed(2)} ${y1.toFixed(2)} A ${r} ${r} 0 ${large} 1 ${x2.toFixed(2)} ${y2.toFixed(2)}`
}

/**
 * Life-area wheel (Remente lesson): one donut segment per area, the filled arc
 * fraction = that area's progress, vision % as the hero number in the middle.
 * Identity is never color-alone — the legend below direct-labels every segment.
 */
function LifeAreaWheel({ areas, vision }: { areas: VisionAreaRollup[]; vision: number }) {
  const ordered = [...areas].sort((a, b) => WHEEL_ORDER.indexOf(a.pillarId) - WHEEL_ORDER.indexOf(b.pillarId))
  const n = ordered.length
  if (n === 0) return null
  const GAP = n > 1 ? 6 : 0 // degrees of surface between segments (the 2px spacer rule)
  const seg = (360 - n * GAP) / n
  const R = 62
  return (
    <div className="flex flex-col items-center">
      <div className="relative">
        <svg width="180" height="180" viewBox="0 0 160 160" role="img" aria-label={`Life areas — overall ${vision}%`}>
          {ordered.map((a, i) => {
            const start = i * (seg + GAP)
            // A full-circle arc has identical start/end points and renders as
            // nothing — cap just under 360° so a single-area wheel stays visible.
            const end = start + Math.min(seg, 359.9)
            const progEnd = start + (seg * Math.min(100, Math.max(0, a.percent))) / 100
            return (
              <g key={a.pillarId}>
                <path d={arcPath(80, 80, R, start, end)} stroke={`${a.pillarColor}33`} strokeWidth="11" fill="none" strokeLinecap="butt" />
                {a.percent > 0 && (
                  <path d={arcPath(80, 80, R, start, Math.max(progEnd, start + 1))} stroke={a.pillarColor} strokeWidth="11" fill="none" strokeLinecap="butt" />
                )}
              </g>
            )
          })}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-3xl font-bold text-white tabular-nums">{vision}%</span>
          <span className="text-[10px] text-zinc-500 uppercase tracking-[0.14em]">of your plan</span>
        </div>
      </div>
      <div className="flex flex-wrap justify-center gap-x-4 gap-y-1 mt-3">
        {ordered.map((a) => (
          <span key={a.pillarId} className="flex items-center gap-1.5 text-[11px] text-zinc-300">
            <span className="size-2 rounded-full" style={{ backgroundColor: a.pillarColor }} />
            {a.pillarLabel} <span className="text-zinc-500 tabular-nums">{a.percent}%</span>
          </span>
        ))}
      </div>
    </div>
  )
}

/**
 * PLM Life Mastery Wheel — Stefan James' 12 areas as a wheel-of-life: one
 * spoke-bounded sector per area in his fixed hierarchy order, each filled from
 * the center to the user's latest weekly self-rating (1-10) vs their personal
 * ideal. The dashed reference ring is his success line: "success is living at
 * a level 7 or more in each area." Identity is direct-labeled, never
 * color-alone; sector gaps + labels carry it for CVD readers.
 */
function LifeMasteryWheel({ ratings, prevRatings, labels }: { ratings: Record<string, number> | null; prevRatings?: Record<string, number> | null; labels?: Record<string, string> }) {
  const C = 195
  const R = 108
  const n = LIFE_MASTERY_AREAS.length
  const seg = 360 / n
  const GAP = 2.5 // degrees of surface between sectors
  const rated = LIFE_MASTERY_AREAS.filter((a) => ratings?.[a.id] != null)
  const avg = rated.length ? Math.round((rated.reduce((s, a) => s + ratings![a.id], 0) / rated.length) * 10) / 10 : null

  const wedge = (startDeg: number, endDeg: number, r: number): string => {
    const [x1, y1] = polar(C, C, r, startDeg)
    const [x2, y2] = polar(C, C, r, endDeg)
    const large = endDeg - startDeg > 180 ? 1 : 0
    return `M ${C} ${C} L ${x1.toFixed(2)} ${y1.toFixed(2)} A ${r} ${r} 0 ${large} 1 ${x2.toFixed(2)} ${y2.toFixed(2)} Z`
  }

  return (
    <div className="flex flex-col items-center">
      {/* v24 — a fixed 390px width inside a padded container overflowed a 390px
          phone, giving the whole page a horizontal scrollbar. The other wheel
          in this file already scales; this one now matches. */}
      <svg viewBox="0 0 390 390" className="w-full max-w-[390px] h-auto mx-auto block" role="img" aria-label={avg != null ? `Life Mastery Wheel. Average ${avg}/10` : "Life Mastery Wheel. Not yet rated"}>
        {/* Recessive grid rings + Stefan's success line at 7/10 */}
        {[0.25, 0.5, 0.75, 1].map((f) => (
          <circle key={f} cx={C} cy={C} r={R * f} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="1" />
        ))}
        <circle cx={C} cy={C} r={(R * LIFE_MASTERY_SUCCESS_LEVEL) / 10} fill="none" stroke="rgba(255,255,255,0.22)" strokeWidth="1" strokeDasharray="3 4">
          <title>The floor. Level {LIFE_MASTERY_SUCCESS_LEVEL}. Aim one level up where you&apos;re working; hold the floor elsewhere.</title>
        </circle>

        {LIFE_MASTERY_AREAS.map((a, i) => {
          const start = i * seg + GAP / 2
          const end = (i + 1) * seg - GAP / 2
          const rating = ratings?.[a.id] ?? null
          const mid = i * seg + seg / 2
          const [lx, ly] = polar(C, C, R + 18, mid)
          const cos = Math.cos(((mid - 90) * Math.PI) / 180)
          const anchor = cos > 0.25 ? "start" : cos < -0.25 ? "end" : "middle"
          return (
            <g key={a.id}>
              {/* Faint full sector = the area's slice of life; filled to rating */}
              <path d={wedge(start, end, R)} fill={`${a.color}14`} stroke="none">
                <title>{`${labels?.[a.id] ?? a.label} — ${a.sublabel}. ${a.prompt}${rating != null ? ` Rated ${rating}/10.` : " Not rated yet."}`}</title>
              </path>
              {rating != null && (
                <path d={wedge(start, end, (R * Math.min(10, Math.max(1, rating))) / 10)} fill={`${a.color}b8`} stroke={a.color} strokeWidth="1" />
              )}
              {/* Last week's level as a ghost dot — "you're a 2, get to a 3" */}
              {prevRatings?.[a.id] != null && (() => {
                const [px, py] = polar(C, C, (R * Math.min(10, Math.max(1, prevRatings[a.id]))) / 10, i * seg + seg / 2)
                return <circle cx={px} cy={py} r="2.2" fill="rgba(255,255,255,0.55)"><title>{`Last week: ${prevRatings[a.id]}/10`}</title></circle>
              })()}
              <text x={lx} y={ly} textAnchor={anchor} dominantBaseline="middle" fontSize="9" fill="#d4d4d8">
                {labels?.[a.id] ?? a.label}
              </text>
              {rating != null && (
                <text x={lx} y={ly + 11} textAnchor={anchor} dominantBaseline="middle" fontSize="8.5" fill={rating < LIFE_MASTERY_SUCCESS_LEVEL ? "#fbbf24" : "#71717a"} className="tabular-nums">
                  {rating}/10
                  {prevRatings?.[a.id] != null && rating !== prevRatings[a.id] && (
                    <tspan fill={rating > prevRatings[a.id] ? "#34d399" : "#fbbf24"}>{rating > prevRatings[a.id] ? " ↑" : " ↓"}</tspan>
                  )}
                </text>
              )}
            </g>
          )
        })}

        {/* Spokes on sector boundaries */}
        {LIFE_MASTERY_AREAS.map((_, i) => {
          const [x, y] = polar(C, C, R, i * seg)
          return <line key={i} x1={C} y1={C} x2={x} y2={y} stroke="rgba(9,9,11,0.9)" strokeWidth="2" />
        })}

        {/* Center hub with the average */}
        <circle cx={C} cy={C} r="30" fill="#09090b" stroke="rgba(255,255,255,0.12)" strokeWidth="1" />
        <text x={C} y={C - 4} textAnchor="middle" fontSize="17" fontWeight="700" fill="#fff" className="tabular-nums">
          {avg != null ? avg : "–"}
        </text>
        <text x={C} y={C + 12} textAnchor="middle" fontSize="7.5" fill="#71717a" letterSpacing="1">
          AVG / 10
        </text>
      </svg>
      {avg != null ? (
        <p className="text-[10px] text-zinc-500 mt-1 text-center">
          Dashed ring = level {LIFE_MASTERY_SUCCESS_LEVEL} — the floor, not the aim. Aim one level up in the areas you&apos;re working; the rest hold their floor.
          {rated.some((a) => ratings![a.id] < LIFE_MASTERY_SUCCESS_LEVEL) && (
            <span className="text-amber-300/80"> Amber scores are this week&apos;s weak spots.</span>
          )}
        </p>
      ) : (
        <p className="text-[10px] text-zinc-500 mt-1 text-center">Rate all 12 areas in your first weekly evaluation to draw your wheel.</p>
      )}
    </div>
  )
}

/**
 * PLM Blueprint pyramid — faithful to Stefan's canonical slide: nine bands
 * from Health+Fitness (base) to Contribution (apex), SPIRITUALITY as the
 * foundation band plus the dotted circle around everything, framed by
 * Vision/What? · Purpose/Why? · Goals/How?. Bands your plan already feeds
 * (via each goal's life-area pillar) render lit; the rest stay dim.
 */
function BlueprintPyramid({
  covered,
  ratings,
  selectedBand,
  onSelectBand,
}: {
  covered: Set<string>
  /** When present, bands glow by their areas' latest rating (life-map mode). */
  ratings?: Record<string, number> | null
  selectedBand?: number | null
  onSelectBand?: (band: number | null) => void
}) {
  const W = 360
  const APEX_Y = 26
  const BASE_Y = 236
  const CX = W / 2
  const HALF_BASE = 132
  const rows = BLUEPRINT_ROWS
  const h = (BASE_Y - APEX_Y) / rows.length
  const halfAt = (y: number) => (HALF_BASE * (y - APEX_Y)) / (BASE_Y - APEX_Y)
  const spirit = LIFE_MASTERY_AREA_MAP.get("lm_spirituality")!
  const spiritCovered = covered.has(spirit.id)
  return (
    <div className="flex flex-col items-center">
      <svg width="360" height="320" viewBox="0 0 360 320" role="img" aria-label="Life Mastery Blueprint pyramid">
        {/* The dotted circle — spirituality, surrounding everything */}
        <ellipse cx={CX} cy={150} rx={172} ry={148} fill="none" stroke={spiritCovered ? `${spirit.color}66` : "rgba(255,255,255,0.14)"} strokeWidth="1.3" strokeDasharray="4 6" />

        {rows.map((row, i) => {
          const yB = BASE_Y - i * h
          const yT = yB - h
          const hwB = halfAt(yB)
          const hwT = halfAt(yT)
          const isCovered = row.areaIds.some((id) => covered.has(id))
          const areas = row.areaIds.map((id) => LIFE_MASTERY_AREA_MAP.get(id)!)
          const fill = areas[0].color
          const yMid = (yB + yT) / 2
          // Life-map mode: band opacity tracks the areas' mean latest rating.
          const rated = ratings ? areas.map((a) => ratings[a.id]).filter((r): r is number => r != null) : []
          const meanRating = rated.length ? rated.reduce((s, r) => s + r, 0) / rated.length : null
          const bandFill = ratings
            ? meanRating != null
              ? `${fill}${Math.round(20 + (meanRating / 10) * 130).toString(16).padStart(2, "0")}`
              : "rgba(255,255,255,0.03)"
            : isCovered ? `${fill}2b` : "rgba(255,255,255,0.03)"
          const isSelected = selectedBand === i
          const lit = ratings ? meanRating != null : isCovered
          return (
            <g key={row.label} onClick={onSelectBand ? () => onSelectBand(isSelected ? null : i) : undefined} style={onSelectBand ? { cursor: "pointer" } : undefined}>
              <path
                d={`M ${CX - hwB} ${yB} L ${CX + hwB} ${yB} L ${CX + hwT} ${yT} L ${CX - hwT} ${yT} Z`}
                fill={bandFill}
                stroke={isSelected ? "rgba(255,255,255,0.75)" : lit ? `${fill}70` : "rgba(255,255,255,0.10)"}
                strokeWidth={isSelected ? 1.6 : 1}
              >
                <title>{`${row.label} — ${areas.map((a) => a.sublabel).join(" · ")}${ratings ? (meanRating != null ? `. Rated ${Math.round(meanRating * 10) / 10}/10.` : ". Not rated yet.") : isCovered ? " (your plan feeds this)" : " (not in your plan yet)"}${onSelectBand ? " Click to inspect." : ""}`}</title>
              </path>
              <text x={CX} y={yMid} textAnchor="middle" dominantBaseline="middle" fontSize="9.5" fontWeight={lit ? 600 : 400} fill={lit ? "#e4e4e7" : "#52525b"} letterSpacing="0.5" style={{ pointerEvents: "none" }}>
                {row.label.toUpperCase()}
              </text>
              {ratings && meanRating != null && (
                <text x={CX + hwB + 8} y={yMid} textAnchor="start" dominantBaseline="middle" fontSize="8" fill={meanRating < LIFE_MASTERY_SUCCESS_LEVEL ? "#fbbf24" : "#71717a"} className="tabular-nums" style={{ pointerEvents: "none" }}>
                  {Math.round(meanRating * 10) / 10}
                </text>
              )}
            </g>
          )
        })}

        {/* Spirituality — the foundation band under the base */}
        <g onClick={onSelectBand ? () => onSelectBand(selectedBand === -1 ? null : -1) : undefined} style={onSelectBand ? { cursor: "pointer" } : undefined}>
          <rect x={CX - HALF_BASE} y={BASE_Y + 8} width={HALF_BASE * 2} height={22} rx="4"
            fill={ratings ? (ratings[spirit.id] != null ? `${spirit.color}${Math.round(20 + (ratings[spirit.id] / 10) * 130).toString(16).padStart(2, "0")}` : "rgba(255,255,255,0.03)") : spiritCovered ? `${spirit.color}24` : "rgba(255,255,255,0.03)"}
            stroke={selectedBand === -1 ? "rgba(255,255,255,0.75)" : spiritCovered || ratings?.[spirit.id] != null ? `${spirit.color}70` : "rgba(255,255,255,0.10)"}
            strokeWidth={selectedBand === -1 ? 1.6 : 1} strokeDasharray="3 3">
            <title>{`Spirituality — ${spirit.sublabel}${onSelectBand ? ". Click to inspect." : ""}`}</title>
          </rect>
          <text x={CX} y={BASE_Y + 19} textAnchor="middle" dominantBaseline="middle" fontSize="9.5" fontWeight={spiritCovered ? 600 : 400} fill={spiritCovered || ratings?.[spirit.id] != null ? "#e4e4e7" : "#52525b"} letterSpacing="0.5" style={{ pointerEvents: "none" }}>
            SPIRITUALITY
          </text>
        </g>

        {/* His frame: Vision (what) · Purpose (why) · Goals (how) */}
        <text x={38} y={130} textAnchor="middle" fontSize="8.5" fill="#8b8b93" transform={`rotate(-62 38 130)`} letterSpacing="1.2">VISION · WHAT?</text>
        <text x={322} y={130} textAnchor="middle" fontSize="8.5" fill="#8b8b93" transform={`rotate(62 322 130)`} letterSpacing="1.2">PURPOSE · WHY?</text>
        <text x={CX} y={296} textAnchor="middle" fontSize="8.5" fill="#8b8b93" letterSpacing="1.2">GOALS · HOW?</text>
      </svg>
      <p className="text-[10px] text-zinc-500 mt-1 text-center max-w-sm">
        {ratings
          ? "Brightness = your latest rating per row. Click any row to inspect it. The base carries everything above it."
          : "The Life Mastery Blueprint. Order is the hierarchy (health is the foundation). Lit rows are fed by your current plan; dim rows are areas your goals don't touch yet."}
      </p>
    </div>
  )
}

/**
 * The band inspector — click a pyramid row, see everything about its areas:
 * what it covers, your 10, the rating trend, which goals feed it, and a
 * one-tap fix when it's weak. This is what makes the pyramid legible.
 */
function BlueprintAreaPanel({
  band,
  progress,
  yourTens,
  yourZeros,
  goals,
  addedHabitIds,
  onRaise,
}: {
  band: number
  progress: VisionProgress
  yourTens: Record<string, string>
  /** v25 — the other end of the scale, shown beside the 10 so the number the
   * user just gave has both anchors visible. */
  yourZeros: Record<string, string>
  goals: VisionGoalDraft[]
  addedHabitIds: Set<string>
  onRaise: (areaId: string) => void
}) {
  const areas = band === -1
    ? [LIFE_MASTERY_AREA_MAP.get("lm_spirituality")!]
    : BLUEPRINT_ROWS[band].areaIds.map((id) => LIFE_MASTERY_AREA_MAP.get(id)!)
  return (
    <div className="space-y-3">
      {areas.map((a) => {
        const series = areaRatingSeries(progress, a.id)
        const latest = series.length ? series[series.length - 1].rating : null
        const prev = series.length > 1 ? series[series.length - 2].rating : null
        const feeding = goals.filter((g) => goalFeedsArea(g, a.id))
        const pick = RAISE_ACTIONS[a.id]
        const raiseDone = pick ? addedHabitIds.has(routineHabitId(pick.categoryId, pick.itemId)) : true
        const raiseName = pick ? ROUTINE_CATEGORIES.find((c) => c.id === pick.categoryId)?.items.find((i) => i.id === pick.itemId)?.title : null
        return (
          <div key={a.id} className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="size-2 rounded-full shrink-0" style={{ backgroundColor: a.color }} />
              <span className="text-sm font-semibold text-white">{a.label}</span>
              <span className="text-[10px] text-zinc-500">{a.sublabel}</span>
              <span className="ml-auto text-xs tabular-nums shrink-0">
                {latest != null ? (
                  <>
                    <span className={latest < LIFE_MASTERY_SUCCESS_LEVEL ? "text-amber-300" : "text-emerald-300"}>{latest}/10</span>
                    {prev != null && latest !== prev && (
                      <span className={latest > prev ? "text-emerald-300" : "text-amber-300"}> {latest > prev ? "↑" : "↓"}{Math.abs(latest - prev)}</span>
                    )}
                  </>
                ) : (
                  <span className="text-zinc-600">not rated yet</span>
                )}
              </span>
            </div>
            {/* Mini rating history — the spreadsheet cell trail */}
            {series.length > 1 && (
              <div className="flex items-end gap-1 mt-2 h-8" aria-label={`${a.label} rating history`}>
                {series.slice(-10).map((s) => (
                  <div key={s.weekStart} className="flex-1 rounded-sm" title={`${s.weekStart}: ${s.rating}/10`}
                    style={{ height: `${(s.rating / 10) * 100}%`, backgroundColor: s.rating < LIFE_MASTERY_SUCCESS_LEVEL ? "#f59e0b99" : `${a.color}b0`, minWidth: 6, maxWidth: 18 }} />
                ))}
              </div>
            )}
            <p className="text-[11px] text-zinc-400 mt-2">
              <span className="text-zinc-500 uppercase text-[9px] tracking-wide mr-1.5">Your 10</span>
              {(yourTens[a.id] ?? "").trim() || <span className="text-zinc-600 italic">not written yet. Define it in the Plan view so this rating measures something.</span>}
            </p>
            {(yourZeros[a.id] ?? "").trim() && (
              <p className="text-[11px] text-zinc-500 mt-1">
                <span className="text-zinc-500 uppercase text-[9px] tracking-wide mr-1.5">Your 0</span>
                {(yourZeros[a.id] ?? "").trim()}
              </p>
            )}
            <p className="text-[11px] text-zinc-500 mt-1.5">
              <span className="text-zinc-500 uppercase text-[9px] tracking-wide mr-1.5">Fed by</span>
              {feeding.length ? feeding.map((g) => g.title).join(" · ") : <span className="text-zinc-600 italic">no goals. This area lives on rituals alone right now.</span>}
            </p>
            {latest != null && latest < LIFE_MASTERY_SUCCESS_LEVEL && !raiseDone && raiseName && (
              <button
                onClick={() => onRaise(a.id)}
                className="mt-2 text-[11px] px-2.5 py-1 rounded-md border border-amber-400/40 bg-amber-500/10 text-amber-300 hover:bg-amber-500/20 transition-colors"
              >
                + Add &ldquo;{raiseName}&rdquo; to lift this area
              </button>
            )}
            {/* v13 — his escalation ladder + book prescriptions for a stuck area */}
            {latest != null && latest < LIFE_MASTERY_SUCCESS_LEVEL && (
              <div className="mt-2 rounded-lg border border-white/10 bg-white/[0.02] px-2.5 py-2">
                <p className="text-[9px] uppercase tracking-wide text-zinc-600 mb-1">Level up the input, one rung at a time</p>
                <p className="text-[10px] text-zinc-500 mb-1">{RESOURCE_LADDER[1]} The rule: the more you pay, the more you pay attention. A plateau is exactly when a coach earns their fee.</p>
                {(AREA_BOOKS[a.id] ?? []).length > 0 && (
                  <p className="text-[10px] text-zinc-400">
                    <span className="text-[9px] uppercase tracking-wide text-zinc-600 mr-1.5">Start with</span>
                    {(AREA_BOOKS[a.id] ?? []).join(" · ")}
                  </p>
                )}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

/** Week labels for the score history — W1, W2… anchored on the plan start. */
function weekLabel(startDate: string, weekStart: string): string {
  return `W${weekIndexFor(startDate, weekStart)}`
}

/**
 * The score spreadsheet — Stefan keeps his weekly 0-10s "in a spreadsheet…
 * so you can go back over previous weeks". Rows = areas, columns = weeks,
 * last column = movement vs the week before.
 */
function ScoreHistoryCard({ progress, labels }: { progress: VisionProgress; labels?: Record<string, string> }) {
  const reviews = (progress.weeklyReviews ?? []).slice().sort((a, b) => (a.weekStart < b.weekStart ? -1 : 1)).slice(-8)
  if (reviews.length === 0) {
    return (
      <p className="text-xs text-zinc-500 text-center py-8">
        Your score history builds here, week by week. Your own life spreadsheet.
        Complete weekly evaluations to fill it.
      </p>
    )
  }
  const avgs = reviews.map((r) => {
    const vals = Object.values(r.areaRatings)
    return vals.length ? Math.round((vals.reduce((s, v) => s + v, 0) / vals.length) * 10) / 10 : null
  })
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-[11px] tabular-nums">
        <thead>
          <tr className="text-zinc-500">
            <th className="text-left font-normal py-1 pr-2">Area</th>
            {reviews.map((r) => (
              <th key={r.weekStart} className="font-normal px-1.5" title={`week of ${r.weekStart}`}>{weekLabel(progress.startDate, r.weekStart)}</th>
            ))}
            <th className="font-normal pl-1.5">Δ</th>
          </tr>
        </thead>
        <tbody>
          {LIFE_MASTERY_AREAS.map((a) => {
            const vals = reviews.map((r) => r.areaRatings[a.id] ?? null)
            const last = vals[vals.length - 1]
            const prev = vals.length > 1 ? vals[vals.length - 2] : null
            const delta = last != null && prev != null ? last - prev : null
            return (
              <tr key={a.id} className="border-t border-white/5">
                <td className="py-1 pr-2 whitespace-nowrap">
                  <span className="inline-block size-1.5 rounded-full mr-1.5 align-middle" style={{ backgroundColor: a.color }} />
                  <span className="text-zinc-300">{labels?.[a.id] ?? a.label}</span>
                </td>
                {vals.map((v, i) => (
                  <td key={i} className={`text-center px-1.5 ${v == null ? "text-zinc-700" : v < LIFE_MASTERY_SUCCESS_LEVEL ? "text-amber-300" : "text-zinc-200"}`}>
                    {v ?? "·"}
                  </td>
                ))}
                <td className={`text-center pl-1.5 ${delta == null || delta === 0 ? "text-zinc-600" : delta > 0 ? "text-emerald-300" : "text-amber-300"}`}>
                  {delta == null ? "–" : delta === 0 ? "=" : delta > 0 ? `+${delta}` : delta}
                </td>
              </tr>
            )
          })}
          <tr className="border-t border-white/10">
            <td className="py-1 pr-2 text-zinc-400">Average</td>
            {avgs.map((v, i) => (
              <td key={i} className="text-center px-1.5 text-white font-medium">{v ?? "·"}</td>
            ))}
            <td className="text-center pl-1.5 text-zinc-500" />
          </tr>
        </tbody>
      </table>
      <p className="text-[10px] text-zinc-600 mt-2">Amber = under {LIFE_MASTERY_SUCCESS_LEVEL}. The trend matters more than any single week — ups and downs, but the line goes up.</p>
    </div>
  )
}

/**
 * M10 — collapsible library of common routines the vision may not have
 * surfaced. Category headers show their life-area relation; unfolding reveals
 * ~5 clickable habit templates. Picks fold into one goal per category.
 */
function RoutineLibrary({ added, onToggleItem }: { added: Set<string>; onToggleItem: (cat: RoutineCategory, item: RoutineTemplate) => void }) {
  const [open, setOpen] = useState<Set<string>>(new Set())
  const toggleOpen = (id: string) =>
    setOpen((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  return (
    <div className="grid gap-3 md:grid-cols-2 items-start">
      {ROUTINE_CATEGORIES.map((cat) => {
        const isOpen = open.has(cat.id)
        const addedCount = cat.items.filter((it) => added.has(routineHabitId(cat.id, it.id))).length
        const primary = PILLAR_BY_ID.get(cat.pillarIds[0])
        return (
          <div key={cat.id} className="rounded-xl border border-white/10 bg-white/[0.03] overflow-hidden">
            <button
              onClick={() => toggleOpen(cat.id)}
              aria-expanded={isOpen}
              className="w-full flex items-center gap-2 px-4 py-3 text-left hover:bg-white/[0.04] transition-colors"
            >
              <ChevronDown className={`size-3.5 text-zinc-500 shrink-0 transition-transform ${isOpen ? "" : "-rotate-90"}`} />
              <span className="text-sm font-medium text-white">{cat.label}</span>
              {addedCount > 0 && (
                <span className="text-[10px] px-1.5 py-px rounded-full border border-emerald-400/30 bg-emerald-500/10 text-emerald-300 tabular-nums shrink-0">
                  {addedCount} added
                </span>
              )}
              {/* Which life areas this category feeds — first = owns the goal */}
              <span className="ml-auto flex items-center gap-1.5 shrink-0">
                {cat.pillarIds.map((pid) => {
                  const p = PILLAR_BY_ID.get(pid)
                  if (!p) return null
                  return (
                    <span
                      key={pid}
                      className="flex items-center gap-1 text-[10px] px-1.5 py-px rounded-full border"
                      style={{ color: pillarTextColor(p.color), borderColor: `${p.color}40`, backgroundColor: `${p.color}14` }}
                    >
                      <span className="size-1.5 rounded-full" style={{ backgroundColor: p.color }} />
                      {p.label}
                    </span>
                  )
                })}
              </span>
            </button>
            {isOpen && (
              <ul className="px-3 pb-3 space-y-1.5">
                {cat.items.map((item) => {
                  const isAdded = added.has(routineHabitId(cat.id, item.id))
                  return (
                    <li key={item.id}>
                      <button
                        onClick={() => onToggleItem(cat, item)}
                        aria-pressed={isAdded}
                        className={`w-full flex items-center gap-2.5 rounded-lg border px-3 py-2 text-left transition-all ${isAdded ? "border-emerald-500/30 bg-emerald-500/10" : "border-white/10 bg-white/[0.03] hover:bg-white/[0.06]"}`}
                      >
                        <span className={`size-4.5 rounded-md border flex items-center justify-center shrink-0 transition-colors ${isAdded ? "bg-emerald-500/80 border-emerald-400" : "border-white/25"}`}>
                          {isAdded ? <Check className="size-3 text-zinc-950" /> : <Plus className="size-3 text-zinc-400" />}
                        </span>
                        <span className={`text-sm ${isAdded ? "text-zinc-300" : "text-zinc-100"}`}>{item.title}</span>
                        <span className="ml-auto text-[11px] text-zinc-500 tabular-nums shrink-0">{item.daysPerWeek}×/wk</span>
                      </button>
                    </li>
                  )
                })}
                {primary && (
                  <li className="text-[10px] text-zinc-600 pt-1 pl-1">
                    Picks land in one &ldquo;{cat.label}&rdquo; goal under {primary.label}.
                  </li>
                )}
              </ul>
            )}
          </div>
        )
      })}
    </div>
  )
}

const WEEKDAY_SHORT = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]

/**
 * M11 — workout day designer on a habit: pick a split template (or Custom),
 * then rename / reorder / add / remove named days. Slot k of the week runs
 * day k (cycling), and the preview shows exactly which weekday runs which day.
 */
function WorkoutDesigner({
  habit,
  color,
  preview,
  onApplySplit,
  onRename,
  onMove,
  onAddDay,
  onRemoveDay,
  onClear,
}: {
  habit: VisionHabit
  color: string
  preview: { weekday: number; dayName: string }[]
  onApplySplit: (split: WorkoutSplit) => void
  onRename: (dayId: string, name: string) => void
  onMove: (index: number, dir: -1 | 1) => void
  onAddDay: () => void
  onRemoveDay: (dayId: string) => void
  onClear: () => void
}) {
  const [picking, setPicking] = useState(false)
  const routine = habit.routine

  if (!routine) {
    return (
      <div className="mt-1 ml-6">
        {picking ? (
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[10px] text-zinc-500">Choose a split:</span>
            {WORKOUT_SPLITS.map((s) => (
              <button
                key={s.id}
                onClick={() => { onApplySplit(s); setPicking(false) }}
                className="text-[11px] px-2 py-0.5 rounded-full border border-white/15 text-zinc-300 hover:bg-white/10 hover:border-white/30 transition-colors"
                title={`${s.days.join(" · ")} — ${s.recommendedPerWeek}×/wk`}
              >
                {s.label} <span className="text-zinc-500">×{s.recommendedPerWeek}</span>
              </button>
            ))}
            <button onClick={() => setPicking(false)} className="text-[10px] text-zinc-600 hover:text-zinc-400">cancel</button>
          </div>
        ) : (
          <button
            onClick={() => setPicking(true)}
            className="text-[10px] text-zinc-500 hover:text-zinc-300 underline decoration-dotted underline-offset-2 transition-colors"
          >
            Design training days (Push/Pull, Chest Day A/B, …)
          </button>
        )}
      </div>
    )
  }

  return (
    <div className="mt-1.5 ml-6 rounded-lg border border-white/10 bg-white/[0.03] p-2.5">
      <div className="flex items-center gap-2">
        <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-500">Training days, in order</span>
        <button onClick={onClear} className="ml-auto text-[10px] text-zinc-600 hover:text-red-300 transition-colors">remove split</button>
      </div>
      <ul className="mt-1.5 space-y-1">
        {routine.days.map((d, i) => (
          <li key={d.id} className="group/day flex items-center gap-1.5 text-sm">
            <span
              className="text-[10px] font-bold size-4.5 rounded-full flex items-center justify-center shrink-0 tabular-nums"
              style={{ backgroundColor: `${color}26`, color }}
            >{i + 1}</span>
            <EditableTitle
              value={d.name}
              onCommit={(next) => onRename(d.id, next)}
              ariaLabel={`Rename day ${d.name}`}
              className="text-sm text-zinc-200"
              inputClassName="text-sm bg-white/5 border border-white/20 rounded-md px-2 py-0.5 text-white"
            />
            <span className="ml-auto flex items-center gap-0.5">
              <button
                onClick={() => onMove(i, -1)}
                disabled={i === 0}
                aria-label={`Move ${d.name} earlier`}
                className="size-4.5 rounded border border-white/10 text-zinc-500 hover:bg-white/10 disabled:opacity-25 flex items-center justify-center"
              ><ChevronDown className="size-3 rotate-180" /></button>
              <button
                onClick={() => onMove(i, 1)}
                disabled={i === routine.days.length - 1}
                aria-label={`Move ${d.name} later`}
                className="size-4.5 rounded border border-white/10 text-zinc-500 hover:bg-white/10 disabled:opacity-25 flex items-center justify-center"
              ><ChevronDown className="size-3" /></button>
              <button
                onClick={() => onRemoveDay(d.id)}
                disabled={routine.days.length <= 1}
                aria-label={`Remove day ${d.name}`}
                className="size-4.5 rounded text-zinc-600 hover:text-red-300 disabled:opacity-25 flex items-center justify-center opacity-0 group-hover/day:opacity-100 transition-all"
              ><X className="size-3" /></button>
            </span>
          </li>
        ))}
      </ul>
      <button
        onClick={onAddDay}
        className="mt-1.5 text-[11px] px-2 py-0.5 rounded-full border border-dashed border-white/20 text-zinc-500 hover:text-zinc-300 hover:border-white/30 transition-colors"
      >+ day</button>

      {preview.length > 0 && (
        <p className="text-[11px] text-zinc-400 mt-2" aria-label="Week preview">
          Your week:{" "}
          {preview.map((p, i) => (
            <span key={i}>
              {i > 0 && <span className="text-zinc-600"> · </span>}
              <span className="text-zinc-500">{WEEKDAY_SHORT[p.weekday]}</span>{" "}
              <span style={{ color }}>{p.dayName}</span>
            </span>
          ))}
          {habit.daysPerWeek !== routine.days.length && (
            <span className="text-zinc-600"> — {habit.daysPerWeek > routine.days.length ? "days repeat within the week" : `only the first ${habit.daysPerWeek} run each week (raise days/week to use all)`}</span>
          )}
        </p>
      )}
    </div>
  )
}

/** Inline "add a habit" row — local input state, commits via onAdd. */
function AddHabitRow({ onAdd }: { onAdd: (title: string, daysPerWeek: number) => void }) {
  const [title, setTitle] = useState("")
  const [days, setDays] = useState(3)
  const commit = () => {
    if (!title.trim()) return
    onAdd(title, days)
    setTitle("")
  }
  return (
    <div className="flex items-center gap-2 mt-1.5">
      <Plus className="size-3.5 shrink-0 text-zinc-600" />
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onKeyDown={(e) => { if (e.key === "Enter") commit() }}
        placeholder="Add your own habit…"
        className="flex-1 min-w-0 bg-transparent border-b border-white/10 focus:border-white/30 text-sm text-zinc-200 placeholder:text-zinc-600 focus:outline-none py-0.5 transition-colors"
      />
      <select
        value={days}
        onChange={(e) => setDays(Number(e.target.value))}
        aria-label="Days per week"
        className="bg-white/5 border border-white/10 rounded-md px-1.5 py-0.5 text-[11px] text-zinc-300 focus:outline-none"
      >
        {[1, 2, 3, 4, 5, 6, 7].map((n) => <option key={n} value={n} className="bg-zinc-900">{n}×/wk</option>)}
      </select>
      <button
        onClick={commit}
        disabled={!title.trim()}
        className="text-[11px] px-2 py-0.5 rounded-md border border-white/15 text-zinc-300 hover:bg-white/10 disabled:opacity-30 transition-colors"
      >Add</button>
    </div>
  )
}

/**
 * v4 — question-led navigation: the coach asks, you answer, the field fills.
 * One question at a time; Enter submits; empty Enter finishes. Deterministic —
 * your words ARE the artifact, no AI middleman needed for these steps.
 */
function InterviewFlow({
  questions,
  loop = false,
  showProgress = false,
  onAnswer,
  onDone,
}: {
  questions: string[]
  /** Loop mode repeats the last question until an empty submit (values-style). */
  loop?: boolean
  /** Show "n / total" so a fixed-length interview reads as a walk, not a void. */
  showProgress?: boolean
  onAnswer: (answer: string, index: number) => void
  onDone: () => void
}) {
  const [idx, setIdx] = useState(0)
  const [draft, setDraft] = useState("")
  const q = questions[Math.min(idx, questions.length - 1)]
  const submit = () => {
    const t = draft.trim()
    if (!t) {
      if (loop || idx >= questions.length - 1) onDone()
      else setIdx((i) => i + 1)
      return
    }
    onAnswer(t, Math.min(idx, questions.length - 1))
    setDraft("")
    if (loop) setIdx(questions.length - 1) // loop mode settles on the follow-up question
    else if (idx < questions.length - 1) setIdx((i) => i + 1)
    else onDone()
  }
  return (
    <div className="rounded-lg border border-violet-400/25 bg-violet-500/[0.06] p-3 mt-2">
      <div className="flex items-baseline gap-2">
        <p className="text-sm text-violet-100">{q}</p>
        {showProgress && !loop && (
          <span className="ml-auto text-[10px] text-zinc-500 tabular-nums shrink-0">{Math.min(idx, questions.length - 1) + 1} / {questions.length}</span>
        )}
      </div>
      <div className="flex items-center gap-2 mt-2">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") submit() }}
          autoFocus
          placeholder={loop ? "First answer from the gut. Empty Enter when done" : "Your answer…"}
          className="flex-1 min-w-0 bg-white/5 border border-white/10 rounded-lg px-2.5 py-1.5 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-violet-400/40"
        />
        <button onClick={submit} className="text-[11px] px-2.5 py-1 rounded-md border border-violet-400/40 text-violet-200 hover:bg-violet-500/15 transition-colors">
          {draft.trim() ? "Next" : "Done"}
        </button>
      </div>
    </div>
  )
}

/**
 * v6 — the Perfect Day exercise: his vision-DISCOVERY method. One day, ten
 * years out, zero limits, walked hour by hour — then compressed into vision
 * text the user edits into their own words.
 */
const PERFECT_DAY_QUESTIONS = [
  "Ten years from now, zero limits: what time do you wake up. And how do you feel in the first ten seconds?",
  "Where in the world are you? What kind of home is around you?",
  "Who do you wake up next to. Who is in your life on this day?",
  "What is the FIRST emotion of your day?",
  "What does your morning look like there. The ritual, the food, the pace?",
  "What do you spend the day actually doing. The work that feels like your mission?",
  "How does the evening end, and what do you feel as you fall asleep?",
]

/** Colors handed to user-added rooms — distinct from the canonical palette. */
const CUSTOM_ROOM_COLORS = ["#38bdf8", "#fb7185", "#4ade80", "#facc15", "#2dd4bf", "#fb923c", "#818cf8", "#e879f9"]

/** One room on the vision wheel — canonical (possibly renamed) or user-added. */
interface WheelRoom {
  id: string
  label: string
  sublabel: string
  color: string
  custom: boolean
}

/** M1 — the wheel IS the product: tappable rooms, each filled to today's
 * 0-10 self-rating (same geometry family as the rating wheel), journey
 * progress on the wedge, hub counts rooms begun. */
/** v17 — how deep the user is going in a room this pass. Commitment is still
 * 12/12 (the manifesto); this is where the ATTENTION goes. */
export type RoomScope = "deep" | "sketched" | "later" | "unset"

function VisionRoomWheel({ rooms, ratings, beats, scopes, focusIds, activeId, onPick }: { rooms: WheelRoom[]; ratings: Record<string, number>; beats: Record<string, number>; scopes: Record<string, RoomScope>; focusIds?: string[]; activeId: string | null; onPick: (id: string) => void }) {
  const C = 195
  const R = 108
  const n = Math.max(1, rooms.length)
  const seg = 360 / n
  const GAP = 2.5
  const BEATS_TOTAL = 4
  // "unset" = no season ranking yet. It must NOT look parked: nothing is on a
  // maintenance floor until the user has actually chosen a priority.
  const scopeOf = (id: string): RoomScope => scopes[id] ?? "unset"
  const mapped = rooms.filter((r) => !["later", "unset"].includes(scopeOf(r.id)) || (beats[r.id] ?? 0) > 0).length
  const focus = new Set(focusIds ?? [])
  const arc = (startDeg: number, endDeg: number, r: number): string => {
    const [x1, y1] = polar(C, C, r, startDeg)
    const [x2, y2] = polar(C, C, r, endDeg)
    const large = endDeg - startDeg > 180 ? 1 : 0
    return `M ${x1.toFixed(2)} ${y1.toFixed(2)} A ${r} ${r} 0 ${large} 1 ${x2.toFixed(2)} ${y2.toFixed(2)}`
  }
  const wedge = (startDeg: number, endDeg: number, r: number): string => {
    const [x1, y1] = polar(C, C, r, startDeg)
    const [x2, y2] = polar(C, C, r, endDeg)
    const large = endDeg - startDeg > 180 ? 1 : 0
    return `M ${C} ${C} L ${x1.toFixed(2)} ${y1.toFixed(2)} A ${r} ${r} 0 ${large} 1 ${x2.toFixed(2)} ${y2.toFixed(2)} Z`
  }
  return (
    <svg viewBox="0 0 390 390" className="w-full max-w-[390px] mx-auto block" role="group" aria-label={`Life wheel — ${mapped} of ${rooms.length} rooms mapped`}>
      {[0.25, 0.5, 0.75, 1].map((f) => (
        <circle key={f} cx={C} cy={C} r={R * f} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="1" />
      ))}
      {rooms.map((r, i) => {
        const start = i * seg + GAP / 2
        const end = (i + 1) * seg - GAP / 2
        const mid = i * seg + seg / 2
        const rating = ratings[r.id] ?? null
        const done = beats[r.id] ?? 0
        const scope = scopeOf(r.id)
        const parked = scope === "later" && done === 0
        const begunRoom = done > 0
        const active = r.id === activeId
        const [lx, ly] = polar(C, C, R + 16, mid)
        const cos = Math.cos(((mid - 90) * Math.PI) / 180)
        const anchor = cos > 0.25 ? "start" : cos < -0.25 ? "end" : "middle"
        const label = r.label.length > 15 ? `${r.label.slice(0, 14)}…` : r.label
        // Three honest states, so a parked room never reads as unfinished
        // homework: deep (working it), sketched (a line and a number), later.
        const sub = parked
          ? "floor"
          : done >= BEATS_TOTAL
          ? "✓ complete"
          : scope === "sketched" && done < 2
          ? `sketched${rating != null ? ` · ${rating}/10` : ""}`
          : `${done}/${BEATS_TOTAL}${rating != null ? ` · ${rating}/10` : ""}`
        return (
          <g key={r.id}>
            <path
              d={wedge(start, end, R)}
              fill={parked ? `${r.color}0a` : begunRoom ? `${r.color}30` : `${r.color}14`}
              stroke={active ? "#fff" : parked ? "rgba(255,255,255,0.08)" : begunRoom ? `${r.color}88` : "rgba(255,255,255,0.10)"}
              strokeWidth={active ? 2 : 1}
              role="button"
              tabIndex={0}
              aria-pressed={active}
              aria-label={`${r.label} — ${done > 0 ? `${done} of ${BEATS_TOTAL} steps done${rating != null ? `, today ${rating}/10` : ""}` : parked ? "on a maintenance floor this season; open it to start" : "open this room's journey"}`}
              onClick={() => onPick(r.id)}
              onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onPick(r.id) } }}
              className="cursor-pointer focus:outline-none"
            >
              <title>{r.sublabel ? `${r.label} — ${r.sublabel}` : r.label}</title>
            </path>
            {rating != null && (
              <path d={wedge(start, end, (R * Math.min(10, Math.max(1, rating))) / 10)} fill={`${r.color}b0`} stroke={r.color} strokeWidth="1" className="pointer-events-none" />
            )}
            {/* The soft beat earns an outer ring. The room's inner work is done. */}
            {done >= BEATS_TOTAL && (
              <path d={arc(start, end, R + 4)} fill="none" stroke={r.color} strokeWidth="2" strokeLinecap="round" className="pointer-events-none" />
            )}
            {focus.has(r.id) && (
              <circle cx={lx - (anchor === "end" ? -5 : 5)} cy={ly} r="2.5" fill={r.color} className="pointer-events-none" />
            )}
            <text
              x={lx.toFixed(2)} y={ly.toFixed(2)} textAnchor={anchor} dominantBaseline="middle" fontSize="9"
              fill={active ? "#fff" : parked ? "#71717a" : begunRoom ? "#e4e4e7" : "#a1a1aa"}
              onClick={() => onPick(r.id)}
              className="cursor-pointer"
            >
              {label}
            </text>
            {(begunRoom || scope !== "later") && (
              <text x={lx.toFixed(2)} y={(ly + 11).toFixed(2)} textAnchor={anchor} dominantBaseline="middle" fontSize="8.5" fill={parked ? "#52525b" : r.color} onClick={() => onPick(r.id)} className="cursor-pointer tabular-nums">
                {sub}
              </text>
            )}
          </g>
        )
      })}
      {rooms.map((_, i) => {
        const [x, y] = polar(C, C, R, i * seg)
        return <line key={i} x1={C} y1={C} x2={x.toFixed(2)} y2={y.toFixed(2)} stroke="rgba(9,9,11,0.9)" strokeWidth="2" />
      })}
      <circle cx={C} cy={C} r="32" fill="#09090b" stroke="rgba(255,255,255,0.12)" strokeWidth="1" />
      <text x={C} y={C - 4} textAnchor="middle" fontSize="16" fontWeight="700" fill="#fff" className="tabular-nums">
        {mapped}/{rooms.length}
      </text>
      <text x={C} y={C + 12} textAnchor="middle" fontSize="7.5" fill="#71717a" letterSpacing="1">
        ROOMS MAPPED
      </text>
    </svg>
  )
}

/** v17. The three shapes a goal can take, in one place so the row, the card
 * and the suggestion tray all speak the same language. */
const GOAL_TYPE_META: Array<{ type: VisionGoalType; icon: string; label: string; hint: string }> = [
  { type: "milestone_ladder", icon: "🎯", label: "Target", hint: "A number you climb to by a date. 100 kg, 10k a month" },
  { type: "habit_ramp", icon: "🔁", label: "Practice", hint: "An ongoing weekly practice. You never 'finish' it" },
  { type: "achievement", icon: "🏁", label: "Finish line", hint: "You either did it or you didn't. A first muscle-up, a licence" },
]

/** v17. The one-tap flip between all three shapes. Lives in BOTH the compact
 * row and the full card: a goal typed wrong at birth was previously frozen
 * forever, which is the single loudest thing wrong with the old flow. */
function GoalTypeToggle({ type, onSetType, size = "sm" }: {
  type: VisionGoalType
  onSetType: (t: VisionGoalType) => void
  size?: "sm" | "md"
}) {
  return (
    <span className={`flex rounded-md border border-white/10 overflow-hidden shrink-0 ${size === "md" ? "text-xs" : "text-[10px]"}`}>
      {GOAL_TYPE_META.map((m) => (
        <button
          key={m.type}
          onClick={() => onSetType(m.type)}
          aria-pressed={type === m.type}
          aria-label={m.label}
          title={`${m.label} — ${m.hint}`}
          className={`${size === "md" ? "px-2 py-1" : "px-1.5 py-1"} transition-colors ${type === m.type ? "bg-white/15 text-white" : "text-zinc-500 hover:text-zinc-300"}`}
        >
          {m.icon}
        </button>
      ))}
    </span>
  )
}

/** v17 — the ease-in schedule as a first-class editor, not something buried in
 * a drawer. Phases run in order; the LAST one is steady state, which is what
 * the week balancer sizes capacity against. */
function RampEditor({ steps, color, onChange }: {
  steps: HabitRampStep[]
  color: string
  onChange: (steps: HabitRampStep[]) => void
}) {
  const set = (i: number, patch: Partial<HabitRampStep>) =>
    onChange(steps.map((s, n) => (n === i ? { ...s, ...patch } : s)))
  return (
    <div>
      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-500">Ease-in schedule</p>
      <p className="text-[11px] text-zinc-400 mt-0.5">{rampSummary(steps)}</p>
      <div className="flex items-center gap-2 mt-1 flex-wrap">
        <TrendingUp className="size-3.5 shrink-0" style={{ color }} />
        {steps.map((r, i) => (
          <span key={i} className="group/ramp flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full border border-white/15 text-zinc-300">
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
                className="opacity-0 group-hover/ramp:opacity-100 text-zinc-600 hover:text-red-300 transition-all"
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
      <p className="text-[10px] text-zinc-600 mt-1">The last phase is your steady state. That&apos;s the load the week gets balanced against.</p>
    </div>
  )
}

/** v17 — one goal as a compact, inline-editable ROW that OPENS into the full
 * editor. Same component either way, so a goal reads and edits identically
 * wherever you meet it: type toggle, title, its shape's controls, a date for
 * every type, and — expanded — the ramp and the questions behind the goal. */
function RoomGoalRow({ goal, color, suggested, subGoals, onEditTitle, onSetType, onEditMeasure, onEditDate, onFreq, onRemove, onEditRamp, onEditWhy, onAddAction }: {
  goal: VisionGoalDraft
  color: string
  suggested: boolean
  /** M9 — goals that feed this one from the same room. A goal with two or more
   * of them IS a project, so it renders as one; no parent field required. */
  subGoals?: VisionGoalDraft[]
  onEditTitle: (title: string) => void
  onSetType: (type: VisionGoalType) => void
  onEditMeasure: (patch: { target?: number; unit?: string; start?: number }) => void
  onEditDate: (date: string) => void
  onFreq: (delta: number) => void
  onRemove: () => void
  onEditRamp?: (steps: HabitRampStep[]) => void
  onEditWhy?: (why: string) => void
  onAddAction?: (action: { title: string; daysPerWeek: number }) => void
}) {
  const [open, setOpen] = useState(false)
  const [whyDraft, setWhyDraft] = useState(goal.why)
  const [actionDraft, setActionDraft] = useState("")
  const [actionDays, setActionDays] = useState(3)
  useEffect(() => { setWhyDraft(goal.why) }, [goal.why])
  const needsAction = goalNeedsAction(goal)
  const children = subGoals ?? []
  const isTarget = goal.type === "milestone_ladder"
  const isPractice = goal.type === "habit_ramp"
  const freq = goal.habits[0]?.daysPerWeek ?? 3
  const feeds = (goal.feedsGoalIds ?? []).length
  return (
    <div className="rounded-lg border bg-white/[0.03]" style={{ borderColor: `${color}33` }}>
      <div className="group/row flex items-center gap-2 px-2.5 py-2">
        <GoalTypeToggle type={goal.type} onSetType={onSetType} />
        <span className="min-w-0 flex-1">
          <EditableTitle value={goal.title} onCommit={onEditTitle} ariaLabel={`Rename ${goal.title}`} className="text-sm text-zinc-100" inputClassName="text-sm bg-white/5 border border-white/20 rounded px-1.5 py-0.5 text-zinc-100 w-full" />
          {suggested && <span className="ml-1.5 text-[9px] text-violet-300/70 align-middle">✨ suggested</span>}
          {feeds > 0 && <span className="ml-1.5 text-[9px] text-zinc-500 align-middle">→ feeds {feeds}</span>}
        </span>
        {isTarget && (
          <span className="flex items-center gap-1.5 shrink-0">
            {/* M2 — where you are now. Without it every ladder in the product
                climbed from zero, whatever the truth was. */}
            <input
              type="number"
              value={goal.measure?.start ?? ""}
              onChange={(e) => onEditMeasure({ start: Number(e.target.value) })}
              aria-label={`Starting number for ${goal.title} — where you are now`}
              placeholder="from"
              className="w-14 bg-white/5 border border-white/10 rounded-md px-1.5 py-1 text-[11px] text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-white/25 tabular-nums"
            />
            <span className="text-[10px] text-zinc-600">→</span>
            <input
              type="number"
              value={goal.measure?.target ?? ""}
              onChange={(e) => onEditMeasure({ target: Number(e.target.value) })}
              aria-label={`Target number for ${goal.title}`}
              className="w-16 bg-white/5 border border-white/10 rounded-md px-1.5 py-1 text-[11px] text-zinc-200 focus:outline-none focus:border-white/25 tabular-nums"
            />
            <input
              value={goal.measure?.unit ?? ""}
              onChange={(e) => onEditMeasure({ unit: e.target.value })}
              placeholder="unit"
              aria-label={`Unit for ${goal.title}`}
              className="w-16 bg-white/5 border border-white/10 rounded-md px-1.5 py-1 text-[11px] text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-white/25"
            />
            {goal.measure && measureDirection(goal.measure) === "down" && (
              <span className="text-[10px] text-sky-300/80" title="This goal improves downward">↓</span>
            )}
          </span>
        )}
        {isPractice && (
          <span className="flex items-center gap-1 shrink-0" aria-label={`Weekly frequency for ${goal.title}`}>
            <button onClick={() => onFreq(-1)} disabled={freq <= 1} aria-label={`Fewer days for ${goal.title}`} className="size-5 rounded border border-white/15 text-zinc-400 hover:bg-white/10 disabled:opacity-30 flex items-center justify-center"><Minus className="size-3" /></button>
            <span className="text-[11px] text-zinc-300 tabular-nums w-11 text-center">{freq}×/wk</span>
            <button onClick={() => onFreq(1)} disabled={freq >= 7} aria-label={`More days for ${goal.title}`} className="size-5 rounded border border-white/15 text-zinc-400 hover:bg-white/10 disabled:opacity-30 flex items-center justify-center"><Plus className="size-3" /></button>
          </span>
        )}
        {/* v17 — a date for EVERY type. A practice is ongoing by default, but
            "by June" is a legitimate thing to say about one. */}
        <span className="flex items-center gap-1 shrink-0">
          <span className="text-[10px] text-zinc-500">{isPractice && !goal.targetDate ? "ongoing · by" : "by"}</span>
          <input
            type="date"
            value={goal.targetDate ?? ""}
            onChange={(e) => onEditDate(e.target.value)}
            aria-label={`Target date for ${goal.title}`}
            className="bg-white/5 border border-white/10 rounded-md px-1.5 py-1 text-[11px] text-zinc-300 focus:outline-none focus:border-white/25"
          />
        </span>
        <button onClick={() => setOpen((o) => !o)} aria-expanded={open} aria-label={`Details for ${goal.title}`} className="shrink-0 text-zinc-600 hover:text-zinc-300 transition-colors">
          <ChevronDown className={`size-3.5 transition-transform ${open ? "" : "-rotate-90"}`} />
        </button>
        <button onClick={onRemove} aria-label={`Remove goal ${goal.title}`} className="shrink-0 text-zinc-600 hover:text-red-300 opacity-0 group-hover/row:opacity-100 transition-all"><X className="size-3.5" /></button>
      </div>

      {/* Captured ≠ planned. A line that came in from a list is not a goal yet,
          and it used to look like one: a fabricated why, a fabricated deadline,
          a "Work toward: …" habit already on the calendar. Saying so at the
          point of contact is the whole point — a quiet badge in the header is
          not the same as the row admitting what it is. */}
      {!goalIsPlanned(goal) && (
        <div className="mx-2.5 mb-2 flex items-baseline gap-2 flex-wrap">
          <span className="text-[9px] font-semibold uppercase tracking-[0.14em] px-1.5 py-0.5 rounded border border-zinc-500/40 text-zinc-400 shrink-0">
            captured
          </span>
          <span className="text-[10px] text-zinc-500">
            not a goal yet — still needs {goalGaps(goal).join(" · ")}
          </span>
        </div>
      )}

      {/* M8 — a goal that names an outcome and no action. Until this asked,
          "no pain in my left knee" went on the calendar three times a week as
          a habit called "Work toward: no pain in my left knee". */}
      {needsAction && onAddAction && (
        <div className="mx-2.5 mb-2 rounded-lg border border-amber-400/25 bg-amber-500/[0.06] px-2.5 py-2">
          <p className="text-[11px] text-amber-100/90">What will you actually do about this?</p>
          <p className="text-[10px] text-zinc-500 mt-0.5">
            It names where you want to end up but nothing you can do on a Tuesday. One action is enough to start.
          </p>
          <div className="flex items-center gap-1.5 mt-1.5">
            <input
              value={actionDraft}
              onChange={(e) => setActionDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && actionDraft.trim()) { onAddAction({ title: actionDraft.trim(), daysPerWeek: actionDays }); setActionDraft("") }
              }}
              placeholder="e.g. physio exercises · stretch the hip · walk 30 minutes"
              aria-label={`An action for ${goal.title}`}
              className="flex-1 min-w-0 bg-white/5 border border-white/10 rounded-md px-2 py-1 text-[11px] text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-white/30"
            />
            <select
              value={actionDays}
              onChange={(e) => setActionDays(Number(e.target.value))}
              aria-label={`Days per week for this action`}
              className="bg-white/5 border border-white/10 rounded-md px-1.5 py-1 text-[10px] text-zinc-300 focus:outline-none shrink-0"
            >
              {[1, 2, 3, 4, 5, 6, 7].map((n) => <option key={n} value={n} className="bg-zinc-900">{n}×/wk</option>)}
            </select>
            <button
              onClick={() => { if (actionDraft.trim()) { onAddAction({ title: actionDraft.trim(), daysPerWeek: actionDays }); setActionDraft("") } }}
              disabled={!actionDraft.trim()}
              className="shrink-0 text-[10px] px-2 py-1 rounded-md border border-white/15 text-zinc-300 hover:bg-white/10 disabled:opacity-30 transition-colors"
            >
              Add
            </button>
          </div>
        </div>
      )}

      {/* M9 — a goal that other goals in this room feed IS a project. Derived
          from the edges that already exist; no parent field, no migration. */}
      {children.length > 0 && (
        <div className="mx-2.5 mb-2 pl-2.5 border-l" style={{ borderColor: `${color}55` }}>
          <p className="text-[9px] font-semibold uppercase tracking-[0.14em] text-zinc-500 mb-1">
            {children.length} steps feed this
          </p>
          {children.map((c) => (
            <p key={c.id} className="text-[11px] text-zinc-400 py-0.5">
              {c.title}
              <span className="ml-1.5 text-[9px] text-zinc-600">
                {c.type === "habit_ramp" ? `${c.habits[0]?.daysPerWeek ?? 3}×/wk` : c.type === "milestone_ladder" ? `${c.measure?.start} → ${c.measure?.target} ${c.measure?.unit ?? ""}` : "done or not"}
              </span>
            </p>
          ))}
        </div>
      )}
      {open && (
        <div className="px-2.5 pb-2.5 pt-1 space-y-2.5 border-t border-white/5">
          {onEditWhy && (
            <div>
              <p className="text-[10px] text-zinc-500">Why this goal? (The reason is the fuel, and it is yours to write.)</p>
              <input
                value={whyDraft}
                onChange={(e) => setWhyDraft(e.target.value)}
                onBlur={() => { if (whyDraft !== goal.why) onEditWhy(whyDraft) }}
                aria-label={`Why ${goal.title}`}
                placeholder="What does landing this actually give you?"
                className="mt-1 w-full bg-white/5 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-white/30"
              />
            </div>
          )}
          {onEditRamp && goal.rampSteps && goal.rampSteps.length > 0 && (
            <RampEditor steps={goal.rampSteps} color={color} onChange={onEditRamp} />
          )}
          {onEditRamp && (!goal.rampSteps || goal.rampSteps.length === 0) && (
            <button
              onClick={() => onEditRamp([{ frequencyPerWeek: Math.max(1, freq - 1), durationWeeks: 4 }, { frequencyPerWeek: freq, durationWeeks: 8 }])}
              className="text-[11px] text-zinc-500 hover:text-zinc-300 underline decoration-dotted transition-colors"
            >
              + Ease into it. Build a ramp instead of starting at full load
            </button>
          )}
          {goal.type === "achievement" && (
            <p className="text-[10px] text-zinc-600">
              A finish line has no number to climb. Its rungs are the checkpoints in its plan, and it&apos;s done when it&apos;s done.
            </p>
          )}
        </div>
      )}
    </div>
  )
}

/** v17 — one editable list of the room's soft layer (values / affirmations /
 * incantations / rules). Add on Enter, remove on hover — no forms, no modals,
 * because this is material you add three words at a time. */
function SoftList({ label, hint, placeholder, color, items, onChange }: {
  label: string
  hint: string
  placeholder: string
  color: string
  items: string[]
  onChange: (items: string[]) => void
}) {
  const [draft, setDraft] = useState("")
  const add = () => {
    const t = draft.trim()
    if (!t || items.some((i) => i.trim().toLowerCase() === t.toLowerCase())) { setDraft(""); return }
    onChange([...items, t])
    setDraft("")
  }
  return (
    <div>
      <p className="text-[10px] text-zinc-500">
        {label} <span className="text-zinc-600">— {hint}</span>
      </p>
      {items.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-1">
          {items.map((it, i) => (
            <span key={`${it}-${i}`} className="group/soft inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px]" style={{ borderColor: `${color}44`, color: "#e4e4e7", background: `${color}0f` }}>
              {it}
              <button
                onClick={() => onChange(items.filter((_, n) => n !== i))}
                aria-label={`Remove ${it}`}
                className="opacity-0 group-hover/soft:opacity-100 text-zinc-500 hover:text-red-300 transition-all"
              ><X className="size-2.5" /></button>
            </span>
          ))}
        </div>
      )}
      <input
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); add() } }}
        onBlur={add}
        aria-label={label}
        placeholder={placeholder}
        className="mt-1 w-full bg-white/5 border border-white/10 rounded-lg px-2.5 py-1 text-xs text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-white/30"
      />
    </div>
  )
}

/** v17 — "which bigger goal does this one feed?" Cross-area links are the point:
 * a sleep habit feeding a revenue target is exactly the connection worth seeing.
 * Targets that would close a loop are disabled, not silently rejected. */
function FeedsPicker({ goal, allGoals, color, onLink, onUnlink }: {
  goal: VisionGoalDraft
  allGoals: VisionGoalDraft[]
  color: string
  onLink: (fromId: string, toId: string) => void
  onUnlink: (fromId: string, toId: string) => void
}) {
  const [open, setOpen] = useState(false)
  const feeds = goal.feedsGoalIds ?? []
  const byId = new Map(allGoals.map((g) => [g.id, g]))
  const candidates = allGoals.filter((g) => g.id !== goal.id && !feeds.includes(g.id))
  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.02] px-2.5 py-1.5">
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs text-zinc-200 min-w-0 truncate">{goal.title}</span>
        <span className="text-[10px] text-zinc-600">feeds</span>
        {feeds.length === 0 && <span className="text-[10px] text-zinc-600">nothing yet</span>}
        {feeds.map((id) => (
          <span key={id} className="group/feed inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px]" style={{ borderColor: `${color}44`, color: "#e4e4e7" }}>
            {byId.get(id)?.title ?? id}
            <button onClick={() => onUnlink(goal.id, id)} aria-label={`Unlink ${byId.get(id)?.title ?? id}`} className="opacity-0 group-hover/feed:opacity-100 text-zinc-500 hover:text-red-300 transition-all"><X className="size-2.5" /></button>
          </span>
        ))}
        {candidates.length > 0 && (
          <button onClick={() => setOpen((o) => !o)} aria-expanded={open} className="ml-auto text-[10px] text-zinc-500 hover:text-zinc-300 transition-colors shrink-0">
            {open ? "done" : "+ link"}
          </button>
        )}
      </div>
      {open && (
        <div className="flex flex-wrap gap-1.5 mt-1.5">
          {candidates.map((c) => {
            const loops = wouldCycle(allGoals, goal.id, c.id)
            return (
              <button
                key={c.id}
                onClick={() => { onLink(goal.id, c.id); setOpen(false) }}
                disabled={loops}
                title={loops ? `"${c.title}" already feeds this one. A loop would make the plan unreadable` : `This goal feeds "${c.title}"`}
                className="text-[10px] px-2 py-0.5 rounded-full border border-white/15 text-zinc-300 hover:bg-white/10 disabled:opacity-25 disabled:cursor-not-allowed transition-colors"
              >
                {c.title}
                {c.areaId && c.areaId !== goal.areaId && <span className="text-zinc-600"> ·{LIFE_MASTERY_AREA_MAP.get(c.areaId)?.label ?? ""}</span>}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

/** v17 — the guided journey for ONE room, in the order the work actually
 * happens: picture (your 10 and your 0) → suggestions that arrive on their own
 * → the gap (rate yourself, now that a 10 means something) → the goals → the
 * deeper work (why, identity, this room's values and affirmations). Every beat
 * writes straight into the same stores the rest of the app reads. */
function RoomJourneyPanel({ room, dream, zero, rating, why, whyWork, identity, soft, goalsInRoom, allGoals, suggestions, suggestionPhase, autoSuggest, onToggleAutoSuggest, suggestedIds, today, onDream, onZero, onRating, onWhy, onWhyWork, onIdentity, onSoft, approachReps, onApproachRep, relationshipStatus, onRelationshipStatus, sessionJournals, onLogSession, onLinkGoals, onUnlinkGoals, onPropose, onAcceptSuggestion, onDismissSuggestion, onAddGoalRaw, onOpenList, onAddGoalAction, onEditGoalTitle, onSetGoalType, onEditGoalMeasure, onEditGoalDate, onGoalFreq, onRemoveGoal, onEditGoalRamp, onEditGoalWhy, onRename, onRemove, onClose }: {
  room: WheelRoom
  dream: string
  rating: number | null
  why: string
  whyWork: string
  identity: string
  /** v17 — this room's own soft layer, authored here, rolled up globally. */
  soft: Pick<VisionAreaPlan, "values" | "affirmations" | "incantations" | "rules">
  goalsInRoom: VisionGoalDraft[]
  /** Every goal in the plan — link targets are deliberately cross-area. */
  allGoals: VisionGoalDraft[]
  /** v17 — drafted but NOT yet committed: the coach proposes, you author. */
  suggestions: VisionGoalDraft[]
  /** v25 — "dry" = the coach answered but every draft was already in the room. */
  suggestionPhase: "idle" | "loading" | "error" | "dry" | "unavailable"
  autoSuggest: boolean
  onToggleAutoSuggest: () => void
  suggestedIds: Set<string>
  today: string
  onDream: (text: string) => void
  /** v25 — what a 0 looks like here. The source names both ends in one
   * breath ("what is the ten for you and then what is a zero for you"), and a
   * rating only means something once both ends are yours. */
  zero: string
  onZero: (text: string) => void
  onRating: (rating: number) => void
  onWhy: (text: string) => void
  onWhyWork: (text: string) => void
  onIdentity: (text: string) => void
  onSoft: (kind: "values" | "affirmations" | "incantations" | "rules", items: string[]) => void
  approachReps: Record<string, number>
  onApproachRep: (level: number, next: number) => void
  relationshipStatus: RelationshipStatus
  onRelationshipStatus: (s: RelationshipStatus) => void
  sessionJournals: Array<{ id: string; date: string; reps: string; body: string; felt: string; her: string; next: string }>
  onLogSession: (j: { id: string; date: string; reps: string; body: string; felt: string; her: string; next: string }) => void
  onLinkGoals: (fromId: string, toId: string) => void
  onUnlinkGoals: (fromId: string, toId: string) => void
  onPropose: () => void
  onAcceptSuggestion: (id: string) => void
  onDismissSuggestion: (id: string) => void
  onAddGoalRaw: (input: { title: string; type: VisionGoalType; why: string; daysPerWeek: number; measure: VisionMeasure | null; targetDate: string | null }) => void
  onOpenList: () => void
  onAddGoalAction: (goalId: string, action: { title: string; daysPerWeek: number }) => void
  onEditGoalTitle: (goalId: string, title: string) => void
  onSetGoalType: (goalId: string, type: VisionGoalType) => void
  onEditGoalMeasure: (goalId: string, patch: { target?: number; unit?: string; start?: number }) => void
  onEditGoalDate: (goalId: string, date: string) => void
  onGoalFreq: (goalId: string, delta: number) => void
  onRemoveGoal: (goalId: string) => void
  onEditGoalRamp: (goalId: string, steps: HabitRampStep[]) => void
  onEditGoalWhy: (goalId: string, why: string) => void
  onRename: (name: string) => void
  onRemove?: () => void
  onClose: () => void
}) {
  // Local drafts commit on blur — the dream doubles as the room's intent and
  // shouldn't churn the reading on every keystroke.
  const [dreamDraft, setDreamDraft] = useState(dream)
  const [zeroDraft, setZeroDraft] = useState(zero)
  const [whyDraft, setWhyDraft] = useState(why)
  // v24 — the four list exercises are one disclosure, not four open boxes.
  const [softOpen, setSoftOpen] = useState(false)
  const [whyWorkDraft, setWhyWorkDraft] = useState(whyWork)
  const [identityDraft, setIdentityDraft] = useState(identity)
  const [goalDraft, setGoalDraft] = useState("")
  const [renaming, setRenaming] = useState(false)
  const [renameDraft, setRenameDraft] = useState("")
  useEffect(() => { setDreamDraft(dream); setWhyDraft(why); setWhyWorkDraft(whyWork); setIdentityDraft(identity); setGoalDraft(""); setRenaming(false) }, [room.id]) // eslint-disable-line react-hooks/exhaustive-deps
  const submitGoal = () => {
    const t = goalDraft.trim()
    if (!t) return
    onAddGoalRaw(classifyGoalInput(t, today))
    setGoalDraft("")
  }
  // M9 — a project is derived, not declared: index the goals in this room that
  // feed another goal in the SAME room, and render those inside their parent
  // instead of as siblings. Cross-area edges stay in the Feeds picker below;
  // they are a different relationship and shouldn't collapse a room's list.
  // v25 — doubles as "which tray drafts are already kept": an accepted draft
  // commits under its own id, so membership here IS keptness.
  const inRoom = new Set(goalsInRoom.map((g) => g.id))
  const childrenOf = new Map<string, VisionGoalDraft[]>()
  for (const g of goalsInRoom) {
    for (const parentId of g.feedsGoalIds ?? []) {
      if (!inRoom.has(parentId)) continue
      childrenOf.set(parentId, [...(childrenOf.get(parentId) ?? []), g])
    }
  }
  const nested = new Set([...childrenOf.values()].flat().map((g) => g.id))
  const roomRoots = goalsInRoom.filter((g) => !nested.has(g.id))

  const prompt = AREA_WANT_PROMPTS[room.id]
  const softDone = !!why.trim() || !!identity.trim() || (soft.affirmations?.length ?? 0) > 0
  // Only the four beats the WHEEL counts get a number. Suggestions and
  // connections are aids on the way, not milestones — numbering them would
  // make the panel promise six steps while the wheel scores four.
  const aside = (icon: ReactNode, title: string) => (
    <div className="flex items-center gap-2">
      <span className="size-4 rounded-full flex items-center justify-center shrink-0 text-zinc-500">{icon}</span>
      <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-400">{title}</span>
    </div>
  )
  const beat = (n: number, done: boolean, title: string) => (
    <div className="flex items-center gap-2">
      <span className={`size-4 rounded-full flex items-center justify-center text-[9px] font-semibold shrink-0 ${done ? "text-zinc-950" : "text-zinc-400 border border-white/20"}`} style={done ? { background: room.color } : undefined}>
        {done ? "✓" : n}
      </span>
      <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-400">{title}</span>
    </div>
  )
  return (
    <div id="lm-room-panel" className="rounded-xl border p-4 mt-2 scroll-mt-24" style={{ borderColor: `${room.color}55`, background: `${room.color}0a` }}>
      {/* Header — the room's name is an artifact too ("language that drives you") */}
      <div className="flex items-center gap-2 mb-3">
        <span className="size-2.5 rounded-full shrink-0" style={{ background: room.color }} />
        {renaming ? (
          <input
            value={renameDraft}
            onChange={(e) => setRenameDraft(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && renameDraft.trim()) { onRename(renameDraft); setRenaming(false) } if (e.key === "Escape") setRenaming(false) }}
            autoFocus
            aria-label={`New name for ${room.label}`}
            placeholder="A name that pulls. Try “Physical Power” over “Fitness”"
            className="flex-1 min-w-0 bg-white/5 border border-white/20 rounded-lg px-2.5 py-1 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-white/40"
          />
        ) : (
          <span className="text-sm font-semibold text-white">{room.label}</span>
        )}
        {!renaming && room.sublabel && <span className="text-[10px] text-zinc-500">{room.sublabel}</span>}
        <span className="ml-auto flex items-center gap-2 shrink-0">
          {renaming ? (
            <button onClick={() => { if (renameDraft.trim()) onRename(renameDraft); setRenaming(false) }} className="text-[10px] text-zinc-300 hover:text-white transition-colors">save</button>
          ) : (
            <button onClick={() => { setRenameDraft(room.label); setRenaming(true) }} className="text-[10px] text-zinc-600 hover:text-zinc-300 transition-colors">rename</button>
          )}
          {onRemove && (
            <button onClick={onRemove} className="text-[10px] text-zinc-600 hover:text-red-300 transition-colors">remove</button>
          )}
          <button onClick={onClose} aria-label="Close room" className="text-zinc-600 hover:text-zinc-300"><X className="size-3.5" /></button>
        </span>
      </div>

      <div className="space-y-4">
        {/* Beat 1 — the picture (WHAT a 10 looks like) */}
        <div>
          {beat(1, !!dream.trim() && !!zero.trim(), "The picture. What a 10 and a 0 here look like")}
          <p className="text-[11px] text-zinc-500 mt-1">{prompt?.q ?? `What does a 10 in ${room.label} look like for you?`} Write it as already true.</p>
          <textarea
            value={dreamDraft}
            onChange={(e) => setDreamDraft(e.target.value)}
            onBlur={() => { if (dreamDraft !== dream) onDream(dreamDraft) }}
            rows={2}
            aria-label={`Your 10 in ${room.label}`}
            placeholder={prompt ? `e.g. “${prompt.eg}”` : "Present tense. The you who already lives there"}
            className="mt-1.5 w-full bg-white/5 border border-white/10 rounded-lg px-2.5 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-white/30 resize-none"
          />
          {/* v25 — and the 0, asked in the same breath as the 10. Without the
              bottom of the scale the rating below has only one anchor. */}
          <p className="text-[11px] text-zinc-500 mt-2.5">And what does a 0 in {room.label} look like?</p>
          <textarea
            value={zeroDraft}
            onChange={(e) => setZeroDraft(e.target.value)}
            onBlur={() => { if (zeroDraft !== zero) onZero(zeroDraft) }}
            rows={2}
            aria-label={`Your 0 in ${room.label}`}
            placeholder="The version of this you would not want to live in"
            className="mt-1.5 w-full bg-white/5 border border-white/10 rounded-lg px-2.5 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-white/30 resize-none"
          />
        </div>

        {/* v17 — Beat 3: the gap, asked AFTER the 10. You can't honestly rate
            where you are until you've said what a 10 would be. */}
        <div>
          {beat(2, rating != null, "The gap, where you are today, honestly")}
          <p className="text-[11px] text-zinc-500 mt-1">Now you&apos;ve named the 10. Where are you today, honestly?</p>
          <div className="flex items-center gap-3 mt-1.5">
            {/* v23 — same phantom-value bug as belief/desire: the thumb sat at
                5 with the readout showing "–", and dragging to 5 records
                nothing because the input never fires. */}
            <input
              type="range"
              min={0}
              max={10}
              step={1}
              value={rating ?? 5}
              onChange={(e) => onRating(Number(e.target.value))}
              aria-label={`Where are you in ${room.label} today, 0-10`}
              className={`flex-1 ${rating == null ? "opacity-40" : ""}`}
              style={{ accentColor: rating == null ? "#52525b" : room.color }}
            />
            <button
              onClick={() => onRating(rating ?? 5)}
              aria-label={rating == null ? `Confirm ${room.label} at 5` : `${room.label} rated ${rating}`}
              title={rating == null ? "Tap to confirm 5, or slide to rate" : "Confirmed"}
              className={`text-sm tabular-nums w-12 text-right ${rating == null ? "underline decoration-dotted hover:text-white" : ""}`}
              style={{ color: rating != null ? room.color : "#a1a1aa" }}
            >
              {rating != null ? `${rating}/10` : "–/10"}
            </button>
          </div>
          {rating != null && dream.trim() && (
            <p className="text-[10px] text-zinc-500 mt-1">The gap between {rating} and your 10 is the work — and the reason this room is worth entering.</p>
          )}
        </div>

        {/* Beat 4 — the goals: a list you rattle off, each line a tracked row */}
        <div>
          {beat(3, goalsInRoom.length > 0, "The goals, the moves that get you there")}
          {goalsInRoom.length > 0 && (
            <div className="mt-2 space-y-1.5">
              {roomRoots.map((g) => (
                <RoomGoalRow
                  key={g.id}
                  goal={g}
                  color={room.color}
                  suggested={suggestedIds.has(g.id)}
                  subGoals={childrenOf.get(g.id) ?? []}
                  onAddAction={(a) => onAddGoalAction(g.id, a)}
                  onEditTitle={(t) => onEditGoalTitle(g.id, t)}
                  onSetType={(t) => onSetGoalType(g.id, t)}
                  onEditMeasure={(patch) => onEditGoalMeasure(g.id, patch)}
                  onEditDate={(d) => onEditGoalDate(g.id, d)}
                  onFreq={(delta) => onGoalFreq(g.id, delta)}
                  onRemove={() => onRemoveGoal(g.id)}
                  onEditRamp={(steps) => onEditGoalRamp(g.id, steps)}
                  onEditWhy={(w) => onEditGoalWhy(g.id, w)}
                />
              ))}
            </div>
          )}
          {/* Rapid entry — type a goal, Enter, done. Smart-classified. */}
          <div className="mt-2 flex items-center gap-2">
            <input
              value={goalDraft}
              onChange={(e) => setGoalDraft(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") submitGoal() }}
              placeholder={`Add a goal — try “bench 100 kg” or “gym 4×/week”`}
              aria-label={`Add a goal in ${room.label}`}
              className="flex-1 min-w-0 bg-white/5 border rounded-lg px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none transition-colors"
              style={{ borderColor: goalDraft.trim() ? room.color : "rgba(255,255,255,0.12)" }}
            />
            <button
              onClick={submitGoal}
              disabled={!goalDraft.trim()}
              className="shrink-0 flex items-center gap-1.5 text-xs font-medium px-3 py-2 rounded-lg text-zinc-950 disabled:opacity-25 transition-all"
              style={{ background: goalDraft.trim() ? room.color : "rgba(255,255,255,0.2)" }}
            >
              <Plus className="size-3.5" /> Add
            </button>
          </div>
          <p className="text-[10px] text-zinc-600 mt-1.5">
            A number becomes a <span className="text-zinc-400">🎯 target with a date</span>; a frequency like &ldquo;4×/week&rdquo; becomes a <span className="text-zinc-400">🔁 weekly practice</span>; something you either do or don&apos;t, like &ldquo;first muscle-up&rdquo;, becomes a <span className="text-zinc-400">🏁 finish line</span>. Flip any of them with the toggle.
            {" "}
            <button onClick={onOpenList} className="text-zinc-400 underline underline-offset-2 hover:text-zinc-200 transition-colors">
              Already written a list? Paste the whole thing.
            </button>
          </p>

          {/* v25 — the tray sits UNDER your own list, not above it: your goals
              come first and the coach's drafts answer them. It fills itself
              twice over — from your 10, and again from each goal you write —
              and a kept draft stays put, marked, so picking several in a row
              doesn't re-flow the list under the cursor. */}
          <div className="mt-4 pt-3 border-t border-white/5">
            {aside(<Wand2 className="size-3" />, "Suggestions. Drafted from your 10 and your goals")}
            {suggestionPhase === "loading" ? (
              <p className="flex items-center gap-1.5 text-[11px] text-violet-200/80 mt-1.5">
                <Loader2 className="size-3 animate-spin" /> Reading what you wrote and drafting goals…
              </p>
            ) : suggestions.length > 0 ? (
              <>
                <p className="text-[11px] text-zinc-500 mt-1">
                  Keep as many as you want. Each one becomes yours to edit above. Dismiss the rest.
                  <button onClick={onToggleAutoSuggest} className="ml-1.5 underline decoration-dotted text-zinc-600 hover:text-zinc-400 transition-colors">
                    {autoSuggest ? "stop suggesting automatically" : "suggest automatically again"}
                  </button>
                </p>
                {/* Rows accumulate now — a kept one stays and every goal you
                    add tops the tray up — so it gets its own scroll rather than
                    pushing the deeper work off the screen. */}
                <div className="mt-2 space-y-1.5 max-h-[26rem] overflow-y-auto pr-1">
                  {suggestions.map((s) => {
                    const kept = inRoom.has(s.id)
                    return (
                      <div key={s.id} className={`flex items-start gap-2 rounded-lg border px-2.5 py-1.5 transition-colors ${kept ? "border-white/10 bg-white/[0.02]" : "border-violet-400/25 bg-violet-500/[0.06]"}`}>
                        <span className="text-[11px] shrink-0 mt-0.5" title={s.type === "habit_ramp" ? "A weekly practice" : s.type === "achievement" ? "Done or not done" : "A target you climb to"}>
                          {s.type === "habit_ramp" ? "🔁" : s.type === "achievement" ? "🏁" : "🎯"}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className={`block text-sm ${kept ? "text-zinc-500" : "text-zinc-100"}`}>{s.title}</span>
                          {s.why && <span className="block text-[10px] text-zinc-600 mt-0.5">{s.why}</span>}
                        </span>
                        {kept ? (
                          <span className="shrink-0 text-[11px] px-2 py-1 text-zinc-500" title="Already in your list above">✓ kept</span>
                        ) : (
                          <button onClick={() => onAcceptSuggestion(s.id)} className="shrink-0 text-[11px] px-2 py-1 rounded-md font-medium text-zinc-950 transition-colors" style={{ background: room.color }}>keep</button>
                        )}
                        <button onClick={() => onDismissSuggestion(s.id)} aria-label={kept ? `Clear ${s.title} from the tray` : `Dismiss ${s.title}`} className="shrink-0 text-zinc-600 hover:text-red-300 transition-colors mt-1"><X className="size-3" /></button>
                      </div>
                    )
                  })}
                </div>
                <button onClick={onPropose} className="mt-1.5 text-[11px] text-zinc-600 hover:text-zinc-300 underline decoration-dotted transition-colors">suggest a few more</button>
                {/* A refill that failed or came back all-duplicates has to say so
                    HERE — with rows still on screen the empty-tray states below
                    never render, and the button would look like it did nothing. */}
                {suggestionPhase === "error" && (
                  <p className="text-[11px] text-red-300 mt-1.5">The coach didn&apos;t answer. <button onClick={onPropose} className="underline decoration-dotted hover:text-red-200">Try again</button></p>
                )}
                {suggestionPhase === "unavailable" && (
                  <p className="text-[11px] text-zinc-500 mt-1.5">Drafting suggestions needs you signed in. Write your own below and nothing is lost.</p>
                )}
                {suggestionPhase === "dry" && (
                  <p className="text-[11px] text-zinc-500 mt-1.5">Nothing new that time. Everything drafted is already in your list.</p>
                )}
              </>
            ) : suggestionPhase === "unavailable" ? (
              <p className="text-[11px] text-zinc-500 mt-1.5">Drafting suggestions needs you signed in. Write your own below and nothing is lost.</p>
            ) : suggestionPhase === "error" ? (
              <p className="text-[11px] text-red-300 mt-1.5">The coach didn&apos;t answer. <button onClick={onPropose} className="underline decoration-dotted hover:text-red-200">Try again</button></p>
            ) : suggestionPhase === "dry" ? (
              <p className="text-[11px] text-zinc-500 mt-1.5">
                Nothing new. Everything drafted this time is already in your list. <button onClick={onPropose} className="underline decoration-dotted text-zinc-500 hover:text-zinc-300 transition-colors">Try again</button>
              </p>
            ) : !dream.trim() && goalsInRoom.length === 0 ? (
              <p className="text-[11px] text-zinc-600 mt-1">Write your 10 above, or add a goal, and suggestions appear here by themselves.</p>
            ) : (
              <p className="text-[11px] text-zinc-600 mt-1">
                Nothing pending <button onClick={onPropose} className="underline decoration-dotted text-zinc-500 hover:text-zinc-300 transition-colors">suggest {goalsInRoom.length ? "more" : "some"} from what I&apos;ve written</button>
              </p>
            )}
          </div>
        </div>

        {/* v17 — Beat 5: THE DEEPER WORK, promoted out of the drawer it used to
            hide in. Why the room matters, what it costs to stay where you are,
            who you are here, and this room's own values / affirmations / rules.
            This is the framework — hiding it behind "optional" was the bug. */}
        <div>
          {beat(4, softDone, "The deeper work. Why this room, and who you are in it")}
          {/* v24 — this rendered SEVEN empty inputs at once (fuel, pain-why,
              identity, then values / affirmations / incantations / rules)
              before a single word of the 10 above it was written. A previous
              pass over-corrected here: hiding the block behind "optional" was
              the bug, so it was un-hidden entirely — and the fix for that bug
              created this one. Progressive reveal is the actual answer, and
              it was left open in v22's own ledger. The block now unlocks on
              the 10, and the four list exercises sit behind one disclosure. */}
          {!dream.trim() ? (
            <p className="text-[11px] text-zinc-500 mt-1 pl-4 border-l" style={{ borderColor: `${room.color}33` }}>
              Unlocks once you&apos;ve pictured your 10 above. The why and the identity only mean something against a picture.
            </p>
          ) : (
          <>
          <p className="text-[11px] text-zinc-500 mt-1">
            Goals are what you do. This is what makes you keep doing them.
          </p>
          <div className="mt-2 space-y-2.5 pl-4 border-l" style={{ borderColor: `${room.color}33` }}>
            <div>
              <p className="text-[10px] text-zinc-500">The fuel. The line you read on a hard day in this room.</p>
              <input
                value={whyDraft}
                onChange={(e) => setWhyDraft(e.target.value)}
                onBlur={() => { if (whyDraft !== why) onWhy(whyDraft) }}
                aria-label={`Why ${room.label} matters`}
                placeholder="What does mastering this room give you? Who else feels it?"
                className="mt-1 w-full bg-white/5 border border-white/10 rounded-lg px-2.5 py-1.5 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-white/30"
              />
            </div>
            <div>
              <p className="text-[10px] text-zinc-500">The pain-why — and what does it cost you to stay at {rating ?? "where you are"}?</p>
              <input
                value={whyWorkDraft}
                onChange={(e) => setWhyWorkDraft(e.target.value)}
                onBlur={() => { if (whyWorkDraft !== whyWork) onWhyWork(whyWorkDraft) }}
                aria-label={`What it costs to stay where you are in ${room.label}`}
                placeholder="Name the price of another year exactly like this one"
                className="mt-1 w-full bg-white/5 border border-white/10 rounded-lg px-2.5 py-1.5 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-white/30"
              />
            </div>
            <div>
              <PrincipleCardView id="identity" />
              <p className="text-[10px] text-zinc-500">The identity. Who you are when this room is handled.</p>
              <input
                value={identityDraft}
                onChange={(e) => setIdentityDraft(e.target.value)}
                onBlur={() => { if (identityDraft !== identity) onIdentity(identityDraft) }}
                aria-label={`Your identity in ${room.label}`}
                placeholder='Present tense — "I am an athlete"'
                className="mt-1 w-full bg-white/5 border border-white/10 rounded-lg px-2.5 py-1.5 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-white/30"
              />
              {/* The identity line is the raw material for an affirmation —
                  offer it rather than making them write it twice. */}
              {identity.trim() && !(soft.affirmations ?? []).some((a) => a.trim() === identity.trim()) && (
                <button
                  onClick={() => onSoft("affirmations", [...(soft.affirmations ?? []), identity.trim()])}
                  className="mt-1 text-[10px] text-violet-300/80 hover:text-violet-200 transition-colors"
                >
                  + Make &ldquo;{identity.trim()}&rdquo; an affirmation you read every morning
                </button>
              )}
            </div>
            {room.id === "lm_relationship" && (
              <SinglePersonPanel
                color={room.color}
                reps={approachReps}
                onReps={onApproachRep}
                status={relationshipStatus}
                onStatus={onRelationshipStatus}
                journals={sessionJournals}
                onLogSession={onLogSession}
                today={today}
              />
            )}
            {(() => {
              const softCount = (soft.values?.length ?? 0) + (soft.affirmations?.length ?? 0) + (soft.incantations?.length ?? 0) + (soft.rules?.length ?? 0)
              return (
                <div>
                  <button
                    onClick={() => setSoftOpen((o) => !o)}
                    aria-expanded={softOpen}
                    className="flex items-center gap-1.5 text-[11px] text-zinc-500 hover:text-zinc-300 transition-colors"
                  >
                    <ChevronDown className={`size-3 transition-transform ${softOpen ? "" : "-rotate-90"}`} />
                    {softOpen ? "Hide" : "Values, affirmations, incantations and rules for this room"}
                    {softCount > 0 && <span className="text-zinc-600">· {softCount} written</span>}
                  </button>
                  {softOpen && (
                    <div className="mt-2 space-y-2.5">
                      <SoftList label="This room's values" hint="What does this room stand for? Shown in Library › Values beside your ranked five. They don't change the ranking." placeholder="Vitality" color={room.color} items={soft.values ?? []} onChange={(v) => onSoft("values", v)} />
                      <SoftList label="Affirmations for this room" hint='Present tense, out loud — "I am strong and I train like it."' placeholder="I am…" color={room.color} items={soft.affirmations ?? []} onChange={(v) => onSoft("affirmations", v)} />
                      <SoftList label="Incantations. Affirmations said with your whole body" hint="Movement, voice and repetition together. Your whole body says it." placeholder="All I need is within me right now" color={room.color} items={soft.incantations ?? []} onChange={(v) => onSoft("incantations", v)} />
                      <SoftList label="Rules for this room. When do you get to feel good here?" hint={RULES_EXERCISE.rewriteFormat} placeholder="I feel fit anytime I move my body" color={room.color} items={soft.rules ?? []} onChange={(v) => onSoft("rules", v)} />
                    </div>
                  )}
                </div>
              )
            })()}
          </div>
          </>
          )}
        </div>

        {/* v17 — Beat 6: connections. Goals don't live alone; naming what feeds
            what is how a plan becomes a system. */}
        {goalsInRoom.length > 0 && allGoals.length > 1 && (
          <div>
            {aside(<TrendingUp className="size-3" />, "Connections, what feeds what")}
            <p className="text-[11px] text-zinc-500 mt-1">Does a goal here serve a bigger one. In this room or another?</p>
            <div className="mt-2 space-y-2">
              {goalsInRoom.map((g) => (
                <FeedsPicker key={g.id} goal={g} allGoals={allGoals} color={room.color} onLink={onLinkGoals} onUnlink={onUnlinkGoals} />
              ))}
            </div>
          </div>
        )}
      </div>

      <p className="text-[10px] text-zinc-600 mt-3 text-right">
        <button onClick={onClose} className="underline decoration-dotted text-zinc-500 hover:text-zinc-300 transition-colors">Done, pick the next room</button>
      </p>
    </div>
  )
}


/** A room's dream as an intent — the user picked the room, so the area is
 * authoritative and needs no embedding. Pure: also used at hydrate time. */
function makeRoomIntent(areaId: string, dream: string): VisionIntent {
  const area = LIFE_MASTERY_AREA_MAP.get(areaId)
  const pillarId = area?.pillarIds[0] ?? "meaning"
  const pillar = PILLAR_BY_ID.get(pillarId)
  return {
    id: `room-${areaId}`,
    text: dream,
    pillarId,
    pillarLabel: pillar?.label ?? pillarId,
    pillarColor: pillar?.color ?? "#a1a1aa",
    objectiveId: null,
    objectiveLabel: null,
    confidence: 1,
    spans: [],
  }
}

/** Rebuild room intents from persisted dreams + keep non-room saved intents. */
function mergeRoomIntents(savedIntents: VisionIntent[], yourTens: Record<string, string>): VisionIntent[] {
  const roomOnes = Object.entries(yourTens)
    .filter(([, t]) => (t ?? "").trim())
    .map(([areaId, t]) => makeRoomIntent(areaId, t.trim()))
  return [...savedIntents.filter((i) => !i.id.startsWith("room-")), ...roomOnes]
}

/** Per-area want questions + a worked example each, one for the canonical 12
 * rooms (same areas the wheel/pyramid/10s use). Examples follow the corpus
 * pattern: one concrete, sensory, NUMBERED sentence — never an abstraction. */
const AREA_WANT_PROMPTS: Record<string, { q: string; eg: string }> = {
  lm_health: { q: "What do you want for your health. Energy, how you feel waking up?", eg: "I wake up at 6 with energy that lasts the whole day" },
  lm_fitness: { q: "What do you want for your body. Strength, endurance, how you look?", eg: "I'm lean and strong. Training 4×/week, stage-ready" },
  lm_mindset: { q: "What do you want your thoughts and beliefs to be like?", eg: "My mind is on my side. Hard things feel doable" },
  lm_emotions: { q: "How do you want to FEEL most days?", eg: "Most mornings I feel grateful and excited" },
  lm_relationship: { q: "What do you want in your intimate relationship (or dating life)?", eg: "I wake up next to someone I love. We still flirt" },
  lm_mission: { q: "What do you want for your work, business or mission?", eg: "I run my own business doing work that matters. Free to travel a month at a time" },
  lm_money: { q: "What do you want for your finances?", eg: "My investments pay my rent. 5 k$/month passive income" },
  lm_family: { q: "What do you want with your family?", eg: "I call home every week. And I'm fully there when I do" },
  lm_friends: { q: "What do you want for your friendships and social life?", eg: "I have five close friends I actually see every week" },
  lm_fun: { q: "What do you want more of. Hobbies, adventure, travel?", eg: "One small adventure a month, one big trip a year" },
  lm_contribution: { q: "What do you want to give. Impact, contribution?", eg: "I give 5% of everything I earn to something I believe in" },
  lm_spirituality: { q: "What do you want for your spiritual life?", eg: "I have a daily practice that connects me to something bigger" },
}

/**
 * v17 — where the attention goes this pass. The research finding our own canon
 * records is that twelve areas is the #1 churn risk; the framework's answer is
 * that commitment and depth are different things. You commit to all twelve when
 * you sign the manifesto. Here you choose the few you'll actually work.
 */
/**
 * v19 — THE SEASON'S PRIORITY. He works 1-3 areas at a time and lets the rest
 * slide on purpose. This is ONE ordered ranking; "focus" and "maintenance" are
 * tiers of it, not separate state — which is why the old deep/sketched/later
 * picker is gone rather than sitting beside this.
 */
function SeasonPriority({ rooms, areaRank, focusCount, onReorder, onFocusCount, ratings, maintenance, onMaintenance }: {
  rooms: WheelRoom[]
  areaRank: string[]
  focusCount: number
  onReorder: (rank: string[]) => void
  onFocusCount: (n: number) => void
  ratings: Record<string, number>
  maintenance: Record<string, string>
  onMaintenance: (areaId: string, text: string) => void
}) {
  const [open, setOpen] = useState(false)
  const byId = new Map(rooms.map((r) => [r.id, r]))
  const ordered = areaRank.filter((id) => byId.has(id))
  const move = (i: number, delta: number) => {
    const j = i + delta
    if (j < 0 || j >= ordered.length) return
    const next = [...ordered]
    ;[next[i], next[j]] = [next[j], next[i]]
    onReorder(next)
  }
  const focusNames = ordered.slice(0, focusCount).map((id) => byId.get(id)?.label).filter(Boolean)
  return (
    <div className="mt-3 rounded-xl border border-white/10 bg-white/[0.02] px-3 py-2.5">
      <button onClick={() => setOpen((o) => !o)} aria-expanded={open} className="w-full flex items-center gap-2 text-left">
        <Telescope className="size-3.5 text-violet-300 shrink-0" />
        <span className="text-xs font-medium text-zinc-200">
          {focusNames.length ? `This season: ${focusNames.join(" · ")}` : "What are you working on this season?"}
        </span>
        <span className="ml-auto text-[10px] text-zinc-500">{open ? "hide" : "set priority"}</span>
      </button>
      <p className="text-[10px] text-zinc-600 mt-1">
        One to three areas at a time. Everything else drops to a maintenance floor. On purpose, with your consent. That&apos;s not neglect, that&apos;s how you actually move one.
      </p>
      {open && (
        <>
          <div className="flex items-center gap-2 mt-2.5">
            <span className="text-[10px] uppercase tracking-wide text-zinc-500">Areas in focus</span>
            {[1, 2, 3].map((n) => (
              <button
                key={n}
                onClick={() => onFocusCount(n)}
                aria-pressed={focusCount === n}
                className={`size-6 rounded-md border text-[11px] tabular-nums transition-colors ${focusCount === n ? "border-violet-400/60 bg-violet-500/20 text-white" : "border-white/15 text-zinc-400 hover:text-zinc-200"}`}
              >{n}</button>
            ))}
          </div>
          <ol className="mt-2 space-y-1">
            {ordered.map((id, i) => {
              const r = byId.get(id)!
              const focus = i < focusCount
              const rating = ratings[id]
              const target = nextLevelTarget(rating)
              return (
                <li key={id}>
                  {i === focusCount && (
                    <div className="flex items-center gap-2 my-1.5">
                      <span className="h-px flex-1 bg-white/10" />
                      <span className="text-[9px] uppercase tracking-wider text-zinc-600">maintenance, the floor you hold</span>
                      <span className="h-px flex-1 bg-white/10" />
                    </div>
                  )}
                  <div className={`flex items-center gap-2 rounded-lg border px-2.5 py-1.5 ${focus ? "border-white/25 bg-white/[0.07]" : "border-white/10 bg-transparent"}`}>
                    <span className="text-[10px] tabular-nums text-zinc-600 w-4 shrink-0">{i + 1}</span>
                    <span className="size-2 rounded-full shrink-0" style={{ backgroundColor: focus ? r.color : "#3f3f46" }} />
                    <span className={`text-xs min-w-0 flex-1 truncate ${focus ? "text-zinc-100" : "text-zinc-500"}`}>{r.label}</span>
                    {focus && rating != null && target != null && rating < LIFE_MASTERY_SUCCESS_LEVEL && (
                      <span className="text-[10px] text-zinc-500 shrink-0" title="One level up is the target. Never 'get to 10'">
                        {rating} → {target}
                      </span>
                    )}
                    <span className="flex items-center gap-0.5 shrink-0">
                      <button onClick={() => move(i, -1)} disabled={i === 0} aria-label={`Move ${r.label} up`} className="size-5 rounded border border-white/10 text-zinc-500 hover:text-zinc-200 disabled:opacity-20 transition-colors">↑</button>
                      <button onClick={() => move(i, 1)} disabled={i === ordered.length - 1} aria-label={`Move ${r.label} down`} className="size-5 rounded border border-white/10 text-zinc-500 hover:text-zinc-200 disabled:opacity-20 transition-colors">↓</button>
                    </span>
                  </div>
                  {!focus && (
                    <input
                      value={maintenance[id] ?? ""}
                      onChange={(e) => onMaintenance(id, e.target.value)}
                      aria-label={`Maintenance floor for ${r.label}`}
                      placeholder={`Floor for ${r.label.toLowerCase()} — the least that still counts`}
                      className="mt-1 ml-6 w-[calc(100%-1.5rem)] bg-white/[0.03] border border-white/10 rounded-md px-2 py-1 text-[11px] text-zinc-300 placeholder:text-zinc-700 focus:outline-none focus:border-white/25"
                    />
                  )}
                </li>
              )
            })}
          </ol>
        </>
      )}
    </div>
  )
}

/**
 * v7 — THE VISION WORKSHOP. Not a textarea: get in state, then enter through
 * any of his four exercises, each composing into the vision text — then the
 * make-it-pull test. Every exercise is re-runnable; drafts append.
 */
function VisionWorkshop({ rooms, ratings, roomBeats, scopes, focusIds, onLoadExample, exampleWouldOverwrite, areaRank, focusCount, onReorder, onFocusCount, maintenance, onMaintenance, activeAreaId, onPick, proseOpen, onToggleProse, renderRoomPanel, onCompose, onGoalMaterial, onAddRoom }: {
  rooms: WheelRoom[]
  /** M1 — today's 0-10 self-rating per room; fills the wedge. */
  ratings: Record<string, number>
  /** M1 — completed journey beats per room (0-5); shown on the wedge. */
  roomBeats: Record<string, number>
  /** v19 — tiers derived from the season ranking; the wheel reads these. */
  scopes: Record<string, RoomScope>
  focusIds: string[]
  /** Present only while the sandbox is empty — the worked example is a
   * starting aid, not a permanent control. */
  onLoadExample?: () => void
  /** v23 — true when loading the example would destroy real user work. */
  exampleWouldOverwrite?: boolean
  areaRank: string[]
  focusCount: number
  onReorder: (rank: string[]) => void
  onFocusCount: (n: number) => void
  maintenance: Record<string, string>
  onMaintenance: (areaId: string, text: string) => void
  /** v17 — room-open state is parent-owned so the parent can hide the prose box. */
  activeAreaId: string | null
  onPick: (id: string | null) => void
  proseOpen: boolean
  onToggleProse: () => void
  /** The room journey panel is parent-owned — it touches most of the plan state. */
  renderRoomPanel: (roomId: string, close: () => void) => ReactNode
  onCompose: (draft: string) => void
  onGoalMaterial?: (items: string[]) => void
  onAddRoom: (name: string) => string | null
}) {
  type Tool = null | "magician" | "perfect-day" | "brainstorm"
  const [tool, setTool] = useState<Tool>(null)
  const [statePrep, setStatePrep] = useState(false)
  const [exampleArmed, setExampleArmed] = useState(false)
  const [addOpen, setAddOpen] = useState(false)
  const [addDraft, setAddDraft] = useState("")
  const composeSentence = (a: string) => {
    const t = a.trim()
    if (!t) return
    const cap = t.charAt(0).toUpperCase() + t.slice(1)
    onCompose(/[.!?…]$/.test(cap) ? cap : cap + ".")
  }
  const pickRoom = (id: string) => {
    onPick(activeAreaId === id ? null : id)
  }
  const submitAddRoom = () => {
    const id = onAddRoom(addDraft)
    if (!id) return
    setAddDraft("")
    setAddOpen(false)
    onPick(id)
  }
  const [answers, setAnswers] = useState<string[]>([])
  // Brainstorm: captured wants + timeframe tags (years).
  const [wants, setWants] = useState<Array<{ text: string; years: number | null }>>([])
  const [tagging, setTagging] = useState(false)

  const closeTool = () => { setTool(null); setAnswers([]); setWants([]); setTagging(false) }
  const toolBtn = (id: Exclude<Tool, null>, label: string, hint: string) => (
    <button
      key={id}
      onClick={() => { setTool(id); setAnswers([]); setWants([]); setTagging(false) }}
      className="text-left rounded-lg border border-violet-400/25 bg-violet-500/[0.06] px-3 py-2 hover:bg-violet-500/[0.12] transition-colors"
    >
      <span className="block text-xs font-medium text-violet-100">{label}</span>
      <span className="block text-[10px] text-zinc-500 mt-0.5">{hint}</span>
    </button>
  )

  /** v22 — the get-in-state prompt now lives BELOW the wheel. It used to be the
   * first thing on screen, which put a link above the product. */
  const statePrepBlock = (
    <div className="mt-3 text-center">
      {onLoadExample && (
        <p className="mb-2">
          <button
            onClick={() => { if (exampleArmed || !exampleWouldOverwrite) { onLoadExample(); setExampleArmed(false) } else setExampleArmed(true) }}
            className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${exampleArmed ? "border-amber-400/50 bg-amber-500/[0.12] text-amber-100" : "border-sky-400/30 bg-sky-500/[0.08] text-sky-200 hover:bg-sky-500/15"}`}
          >
            {exampleArmed
              ? "This replaces your own plan. Tap again to load the example"
              : "Or see a filled example first — it\u2019s easier to write yours after reading one"}
          </button>
          {exampleArmed && (
            <button onClick={() => setExampleArmed(false)} className="ml-2 text-[11px] text-zinc-500 hover:text-zinc-300 transition-colors">keep mine</button>
          )}
        </p>
      )}
      <button onClick={() => setStatePrep((o) => !o)} aria-expanded={statePrep} className="text-[11px] text-zinc-600 hover:text-zinc-300 underline decoration-dotted underline-offset-2 transition-colors">
        Before you start: 2 minutes to get in state. Never skip this part
      </button>
      {statePrep && (
        <div className="mt-2 rounded-lg border border-white/10 bg-white/[0.02] px-3 py-2.5 text-left">
          <ol className="space-y-1 text-xs text-zinc-300">
            <li className="flex items-baseline gap-2"><span className="text-[10px] text-violet-300/80 tabular-nums shrink-0">1.</span>Stand up. Shake out your body. Put on music that lifts you.</li>
            <li className="flex items-baseline gap-2"><span className="text-[10px] text-violet-300/80 tabular-nums shrink-0">2.</span>Ten big breaths. Smile. Even if it feels silly. Especially then.</li>
            <li className="flex items-baseline gap-2"><span className="text-[10px] text-violet-300/80 tabular-nums shrink-0">3.</span>Become a kid again: no limits, no fear, nothing is unrealistic. THEN begin.</li>
          </ol>
          <p className="text-[10px] text-zinc-600 mt-1.5">&ldquo;If you&apos;re in a negative state, the answers aren&apos;t going to come to you.&rdquo;</p>
        </div>
      )}
    </div>
  )

  return (
    <div>
      {tool === null ? (
        <>
          <div>
            <VisionRoomWheel rooms={rooms} ratings={ratings} beats={roomBeats} scopes={scopes} focusIds={focusIds} activeId={activeAreaId} onPick={pickRoom} />
          </div>
          {/* v17 — scope, not commitment. You commit to all twelve in the
              manifesto; you WORK a few at a time. Naming that out loud is what
              keeps twelve rooms from reading as twelve pieces of homework. */}
          {!activeAreaId && (
            <SeasonPriority
              rooms={rooms}
              areaRank={areaRank}
              focusCount={focusCount}
              onReorder={onReorder}
              onFocusCount={onFocusCount}
              ratings={ratings}
              maintenance={maintenance}
              onMaintenance={onMaintenance}
            />
          )}
          {!activeAreaId && statePrepBlock}
          {activeAreaId ? (
            renderRoomPanel(activeAreaId, () => onPick(null))
          ) : (
            <p className="text-[10px] text-zinc-600 mt-1.5 text-center">
              {Object.keys(roomBeats).length === 0
                ? "Tap the room that pulls you most. Its journey opens here. No required order."
                : `${Object.keys(roomBeats).length} of ${rooms.length} rooms begun. An even wheel isn't the goal. A moving one is.`}
            </p>
          )}
          <div className="mt-2 text-center">
            {addOpen ? (
              <span className="inline-flex items-center gap-2">
                <input
                  value={addDraft}
                  onChange={(e) => setAddDraft(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") submitAddRoom(); if (e.key === "Escape") { setAddOpen(false); setAddDraft("") } }}
                  autoFocus
                  placeholder="Name the room. “Music”, “Adventure”, “Faith”…"
                  className="w-64 bg-white/5 border border-white/15 rounded-lg px-2.5 py-1 text-xs text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-white/30"
                />
                <button onClick={submitAddRoom} disabled={!addDraft.trim()} className="text-[11px] px-2.5 py-1 rounded-md border border-white/20 text-zinc-200 hover:bg-white/10 disabled:opacity-30 transition-colors">Add room</button>
                <button onClick={() => { setAddOpen(false); setAddDraft("") }} className="text-[10px] text-zinc-600 hover:text-zinc-300 transition-colors">cancel</button>
              </span>
            ) : (
              <button onClick={() => setAddOpen(true)} className="text-[11px] text-zinc-600 hover:text-zinc-300 transition-colors">
                + Add a room of your own. Your life, your map
              </button>
            )}
          </div>
          {/* v17 — the prose path is a tucked-away alternative to the wheel,
              hidden entirely while a room is open (nothing says "instead of
              rooms" while you ARE using rooms). Toggle reveals it + the box. */}
          {!activeAreaId && (
            <div className="mt-5 pt-3 border-t border-white/5 text-center">
              <button onClick={onToggleProse} aria-expanded={proseOpen} className="text-[11px] text-zinc-600 hover:text-zinc-300 transition-colors">
                {proseOpen ? "Hide the write-it-as-text option" : "Prefer to write your whole vision as one block of text? →"}
              </button>
              {proseOpen && (
                <p className="text-[11px] text-zinc-500 mt-2">
                  Write (or paste) it in the box below — Build splits it into areas and goals. Stuck?{" "}
                  <span className="text-zinc-400">Three interviews can draft it:</span>
                </p>
              )}
              {proseOpen && (
                <div className="grid gap-2 sm:grid-cols-2 mt-2 text-left">
                  {toolBtn("perfect-day", "The Perfect Day", "Describe one day, ten years out, hour by hour. It becomes vision text in the box.")}
                  {toolBtn("magician", "The Magician", "“If a magician could create the perfect life for you. What would it be?” Three big questions, written into the box.")}
                  {toolBtn("brainstorm", "The Unlimited Brainstorm", "Dump everything you want, rapid fire, tag each 1/3/5/10/20 years. 5y+ becomes vision text, 1-3y lands in the Goal Workshop.")}
                </div>
              )}
            </div>
          )}
        </>
      ) : (
        <div className="mt-2 rounded-xl border border-violet-400/25 bg-violet-500/[0.05] p-4">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-violet-200/90">
              {tool === "magician" ? "The Magician, no limits" : tool === "perfect-day" ? "The Perfect Day, hour by hour" : "The Unlimited Brainstorm"}
            </span>
            <button onClick={closeTool} aria-label="Close exercise" className="ml-auto text-zinc-600 hover:text-zinc-300"><X className="size-3.5" /></button>
          </div>

          {tool === "magician" && (
            <>
              <p className="text-[11px] text-zinc-500 mt-1">Answer big. Realism comes later, at the goals.</p>
              <InterviewFlow
                questions={[
                  "If a magician could create the PERFECT life for you. No limits at all. What would that life look like?",
                  "In that life, who have you become? What kind of person?",
                  "And what does having that life let you GIVE?",
                ]}
                onAnswer={(a, i) => setAnswers((p) => { const n = [...p]; n[i] = a; return n })}
                onDone={() => { const parts = answers.filter(Boolean).map((x) => x.charAt(0).toUpperCase() + x.slice(1)); if (parts.length) onCompose(parts.join(". ") + "."); closeTool() }}
              />
            </>
          )}

          {tool === "perfect-day" && (
            <>
              <p className="text-[11px] text-zinc-500 mt-1">Clarity is power. Don&apos;t be vague. Skip with an empty Enter. Run it again for another kind of day (travel, family, work).</p>
              <InterviewFlow
                questions={PERFECT_DAY_QUESTIONS}
                onAnswer={(a, i) => setAnswers((p) => { const n = [...p]; n[i] = a; return n })}
                onDone={() => { const parts = answers.filter(Boolean).map((x) => x.charAt(0).toUpperCase() + x.slice(1)); if (parts.length) onCompose(parts.join(". ") + "."); closeTool() }}
              />
            </>
          )}

          {tool === "brainstorm" && !tagging && (
            <>
              <p className="text-[11px] text-zinc-500 mt-1 flex items-center gap-2 flex-wrap">
                <span>Everything you want to create, experience, do or give. Rapid fire, no filter, every area of life. Empty Enter when you run dry.</span>
                <ExerciseTimer minutes={10} label="Put 10 minutes on the clock. Timed means no editor" />
              </p>
              {wants.length > 0 && (
                <div className="flex items-center gap-1.5 flex-wrap mt-2">
                  {wants.map((w) => (
                    <span key={w.text} className="text-[11px] px-2 py-0.5 rounded-full border border-violet-400/30 bg-violet-500/[0.08] text-violet-200/90">{w.text}</span>
                  ))}
                </div>
              )}
              <InterviewFlow
                questions={["What do you want. To create, experience, do, or give?", "What else? Keep going. Material things count too."]}
                loop
                onAnswer={(a) => setWants((p) => (p.some((x) => x.text === a) ? p : [...p, { text: a, years: null }]))}
                onDone={() => { if (wants.length) setTagging(true); else closeTool() }}
              />
            </>
          )}

          {tool === "brainstorm" && tagging && (
            <>
              <p className="text-[11px] text-zinc-500 mt-1">Now tag each: how many YEARS away is it? The 5/10/20-year ones become your vision. The 1-3-year ones are goal material. Keep them for the goals step.</p>
              <ul className="space-y-1.5 mt-2">
                {wants.map((w, i) => (
                  <li key={w.text} className="flex items-center gap-2 flex-wrap text-xs text-zinc-200">
                    <span className="min-w-0">{w.text}</span>
                    <span className="ml-auto flex items-center gap-1 shrink-0">
                      {[1, 3, 5, 10, 20].map((y) => (
                        <button
                          key={y}
                          onClick={() => setWants((p) => p.map((x, j) => (j === i ? { ...x, years: y } : x)))}
                          aria-pressed={w.years === y}
                          className={`text-[10px] px-1.5 py-0.5 rounded border tabular-nums transition-colors ${w.years === y ? "border-violet-400/60 bg-violet-500/20 text-violet-200" : "border-white/15 text-zinc-500 hover:text-zinc-300"}`}
                        >
                          {y}y
                        </button>
                      ))}
                    </span>
                  </li>
                ))}
              </ul>
              {wants.some((w) => w.years === null) && (
                <p className="text-[10px] text-amber-300/80 mt-2">{wants.filter((w) => w.years === null).length} still untagged — tag every want; nothing enters your vision or goals unsorted.</p>
              )}
              <div className="flex items-center gap-3 mt-3 flex-wrap">
                <button
                  onClick={() => {
                    const longTerm = wants.filter((w) => (w.years ?? 0) >= 5).map((w) => w.text.charAt(0).toUpperCase() + w.text.slice(1))
                    const goalMaterial = wants.filter((w) => w.years !== null && w.years < 5).map((w) => w.text)
                    if (longTerm.length) onCompose(longTerm.join(". "))
                    if (goalMaterial.length && onGoalMaterial) onGoalMaterial(goalMaterial)
                    closeTool()
                  }}
                  disabled={wants.some((w) => w.years === null)}
                  className="text-[11px] px-3 py-1 rounded-md border border-emerald-500/40 bg-emerald-500/10 text-emerald-200 hover:bg-emerald-500/20 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  Sort them. 5y+ into the vision, 1-3y into the Goal Workshop
                </button>
                <CopyButton label="Copy 1-3yr goal material" getText={() => `GOAL MATERIAL (1-3 years):\n${wants.filter((w) => w.years !== null && w.years < 5).map((w) => `- ${w.text} (${w.years}y)`).join("\n")}`} />
              </div>
            </>
          )}

        </div>
      )}
    </div>
  )
}

/**
 * v6 — the incantation deck: his verbatim cue cards + the user's own
 * (limiting belief → write its antithesis → add it). Spoken aloud, full
 * physiology, fist-clench "YES!" at the end.
 */
function IncantationDeck({ mission, own, onAdd, onRemove }: { mission?: string; own: string[]; onAdd: (card: string) => void; onRemove: (card: string) => void }) {
  const [open, setOpen] = useState(false)
  const [showAll, setShowAll] = useState(false)
  const [draft, setDraft] = useState("")
  const [showProtocol, setShowProtocol] = useState(false)
  const canon = showAll ? INCANTATION_DECK : INCANTATION_DECK.slice(0, 8)
  return (
    <div className="mt-2 rounded-lg border border-white/10 bg-white/[0.02]">
      <div className="w-full flex items-center gap-2 px-3 py-2">
        <button onClick={() => setOpen((o) => !o)} aria-expanded={open} className="flex items-center gap-2 flex-1 min-w-0 text-left hover:bg-white/[0.04] transition-colors rounded-md">
          <ChevronDown className={`size-3.5 text-zinc-500 shrink-0 transition-transform ${open ? "" : "-rotate-90"}`} />
          <span className="text-[11px] text-zinc-400">Your incantation deck. Say each aloud, full body, end with a fist-clench &ldquo;YES!&rdquo;</span>
        </button>
        <span className="shrink-0"><CopyButton label="Copy deck" getText={() => ["MY INCANTATIONS", ...(mission ? [mission] : []), ...own, ...INCANTATION_DECK.map((c) => c.text)].join("\n")} /></span>
      </div>
      {open && (
        <div className="px-4 pb-3 space-y-1">
          {mission && <p className="text-xs text-violet-200 italic border-l-2 border-violet-400/40 pl-2.5 py-0.5">{mission}</p>}
          {own.map((c) => (
            <p key={c} className="group/inc flex items-baseline gap-2 text-xs text-amber-100/90 italic border-l-2 border-amber-400/40 pl-2.5 py-0.5">
              {c}
              <button onClick={() => onRemove(c)} aria-label={`Remove incantation`} className="ml-auto text-zinc-700 hover:text-red-300 opacity-0 group-hover/inc:opacity-100 not-italic shrink-0"><X className="size-3" /></button>
            </p>
          ))}
          <button onClick={() => setShowProtocol((x) => !x)} aria-expanded={showProtocol} className="text-[10px] text-zinc-600 hover:text-zinc-400 transition-colors">
            {showProtocol ? "hide" : "how to actually run the deck"}
          </button>
          {showProtocol && (
            <ul className="space-y-0.5 pb-1">
              {INCANTATION_PROTOCOL.map((line) => (
                <li key={line} className="text-[10px] text-zinc-500">· {line}</li>
              ))}
            </ul>
          )}
          {canon.map((c) => (
            <p key={c.text} className="group/card flex items-baseline gap-2 text-xs text-zinc-300 italic border-l-2 border-white/15 pl-2.5 py-0.5">
              <span className="min-w-0">{c.text}</span>
              {c.origin === "lineage" && <span className="text-[8px] not-italic uppercase tracking-wide text-zinc-600 shrink-0" title="A classic worth keeping on any deck. Gandhi, MLK, Rohn, Lee">from the greats</span>}
              {!own.includes(c.text) && (
                <button onClick={() => onAdd(c.text)} aria-label={`Adopt incantation: ${c.text}`} className="ml-auto text-[9px] not-italic px-1.5 py-px rounded border border-white/15 text-zinc-600 hover:text-zinc-200 hover:bg-white/10 opacity-0 group-hover/card:opacity-100 transition-all shrink-0">+ mine</button>
              )}
            </p>
          ))}
          {!showAll && INCANTATION_DECK.length > 8 && (
            <button onClick={() => setShowAll(true)} className="text-[11px] text-zinc-600 hover:text-zinc-400">+ {INCANTATION_DECK.length - 8} more from the deck</button>
          )}
          <div className="flex items-center gap-2 pt-1.5">
            <Plus className="size-3.5 shrink-0 text-zinc-600" />
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && draft.trim()) { onAdd(draft.trim()); setDraft("") } }}
              placeholder="Found a limiting belief? Write its antithesis and add it…"
              className="flex-1 min-w-0 bg-transparent border-b border-white/10 focus:border-white/30 text-xs text-zinc-200 placeholder:text-zinc-600 focus:outline-none py-0.5"
            />
          </div>
        </div>
      )}
    </div>
  )
}

/**
 * v5 — the REAL values exercise, phase by phase (his procedure, not a picker):
 * elicit from your life → means→ends → pairwise rank → away-froms → conflict
 * audit + redesign-from-vision. Manual editing stays available afterwards.
 */
function ValuesJourney({
  values,
  awayValues,
  onSetValues,
  onSetAway,
}: {
  values: string[]
  awayValues: string[]
  onSetValues: (v: string[]) => void
  onSetAway: (v: string[]) => void
}) {
  type Phase = "idle" | "elicit" | "convert" | "rank" | "away" | "rank-away" | "audit"
  const [phase, setPhase] = useState<Phase>("idle")
  const [raw, setRaw] = useState<string[]>([])
  const [pair, setPair] = useState<PairwiseState | null>(null)
  const [convertQueue, setConvertQueue] = useState<string[]>([])
  const [custom, setCustom] = useState("")
  const [manual, setManual] = useState(false)
  const [browsing, setBrowsing] = useState(false)
  const [catIdx, setCatIdx] = useState(0)

  const dedupe = (list: string[]) => {
    const seen = new Set<string>()
    return list.filter((x) => {
      const k = x.trim().toLowerCase()
      if (!k || seen.has(k)) return false
      seen.add(k)
      return true
    })
  }
  const vehiclesIn = (list: string[]) => list.filter((item) => VEHICLE_CONVERSIONS.some((v) => v.match.test(item)))

  const beginRank = (list: string[]) => {
    const items = dedupe(list)
    if (items.length <= 2) {
      onSetValues(items)
      setPhase("away")
      return
    }
    setPair(startPairwise(items))
    setPhase("rank")
  }
  const beginRankAway = (list: string[]) => {
    const items = dedupe(list)
    if (items.length <= 2) {
      onSetAway(items)
      setPhase("audit")
      return
    }
    setPair(startPairwise(items))
    setPhase("rank-away")
  }
  const answerPair = (aWins: boolean, away: boolean) => {
    if (!pair) return
    const next = pairwiseAnswer(pair, aWins)
    if (pairwiseQuestion(next) === null) {
      if (away) { onSetAway(next.ranked); setPhase("audit") }
      else { onSetValues(next.ranked); setRaw([]); setPhase("away") }
      setPair(null)
    } else {
      setPair(next)
    }
  }
  const move = (i: number, dir: -1 | 1) => {
    const j = i + dir
    if (j < 0 || j >= values.length) return
    const next = [...values]
    ;[next[i], next[j]] = [next[j], next[i]]
    onSetValues(next)
  }

  const q = pair ? pairwiseQuestion(pair) : null
  const conflicts = detectValueConflicts(values, awayValues)

  // --- Elicitation ---
  if (phase === "elicit") {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
        <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-amber-200/90">Step 1. What has actually mattered?</span>
        <p className="text-xs text-zinc-500 mt-1">No list to pick from. This is an audit of YOUR life. First answer, from the gut. Keep going until you run dry (aim for 7+).</p>
        {raw.length > 0 && (
          <div className="flex items-center gap-1.5 flex-wrap mt-2">
            {raw.map((r) => (
              <span key={r} className="text-[11px] px-2 py-0.5 rounded-full border border-amber-400/30 bg-amber-500/[0.08] text-amber-200/90">
                {r}
                <button onClick={() => setRaw((p) => p.filter((x) => x !== r))} aria-label={`Remove ${r}`} className="ml-1.5 text-amber-200/50 hover:text-red-300">×</button>
              </span>
            ))}
          </div>
        )}
        <InterviewFlow
          questions={["What's been most important to you in your life?", "What else has been important to you?"]}
          loop
          onAnswer={(a) => setRaw((p) => dedupe([...p, a]))}
          onDone={() => {
            if (raw.length === 0) { setPhase("idle"); return }
            const vq = vehiclesIn(raw)
            if (vq.length > 0) { setConvertQueue(vq); setPhase("convert") }
            else beginRank(raw)
          }}
        />
        {/* Free recall runs dry? Sweep the app's full 300-value catalog. */}
        <div className="mt-3">
          <button onClick={() => setBrowsing((b) => !b)} aria-expanded={browsing} className="text-[11px] text-zinc-500 hover:text-zinc-300 underline decoration-dotted underline-offset-2 transition-colors">
            {browsing ? "Hide the catalog" : "Running dry? Browse the full catalog to jog your memory"}
          </button>
          {browsing && (
            <div className="mt-3 rounded-xl border border-white/10 bg-white/[0.02] p-4">
              <div className="flex items-center gap-2 mb-3">
                <button onClick={() => setCatIdx((i) => Math.max(0, i - 1))} disabled={catIdx === 0} className="text-[11px] px-2 py-0.5 rounded-md border border-white/15 text-zinc-400 hover:bg-white/10 disabled:opacity-30">← prev</button>
                <span className="text-[11px] text-zinc-500 tabular-nums">{catIdx + 1}/{CATEGORIES.length}</span>
                <button onClick={() => setCatIdx((i) => Math.min(CATEGORIES.length - 1, i + 1))} disabled={catIdx === CATEGORIES.length - 1} className="text-[11px] px-2 py-0.5 rounded-md border border-white/15 text-zinc-400 hover:bg-white/10 disabled:opacity-30">next →</button>
              </div>
              <CategoryCard
                category={CATEGORIES[catIdx]}
                selectedValues={new Set(raw.map((r) => r.toLowerCase().replace(/\s+/g, "-")))}
                onToggleValue={(id) => {
                  const label = id.split("-").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ")
                  setRaw((p) => (p.some((x) => x.toLowerCase().replace(/\s+/g, "-") === id) ? p.filter((x) => x.toLowerCase().replace(/\s+/g, "-") !== id) : dedupe([...p, label])))
                }}
              />
            </div>
          )}
        </div>
      </div>
    )
  }

  // --- Means → ends ---
  if (phase === "convert" && convertQueue.length > 0) {
    const item = convertQueue[0]
    const conv = VEHICLE_CONVERSIONS.find((v) => v.match.test(item))!
    const resolve = (replacement: string | null) => {
      const next = dedupe(replacement ? raw.map((x) => (x === item ? replacement : x)) : raw)
      const rest = convertQueue.slice(1)
      setRaw(next)
      setConvertQueue(rest)
      if (rest.length === 0) beginRank(next)
    }
    return (
      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
        <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-amber-200/90">Step 2. A value is an emotion</span>
        <p className="text-sm text-zinc-200 mt-2">
          You said <span className="text-amber-200 font-medium">&ldquo;{item}&rdquo;</span> but that&apos;s a vehicle.
          What does it actually GIVE you?
        </p>
        <div className="flex items-center gap-1.5 flex-wrap mt-3">
          {conv.ends.map((e) => (
            <button key={e} onClick={() => resolve(e)} className="text-[11px] px-2.5 py-1 rounded-full border border-amber-400/40 text-amber-200 hover:bg-amber-500/15 transition-colors">
              {e}
            </button>
          ))}
          <button onClick={() => resolve(null)} className="text-[11px] px-2.5 py-1 rounded-full border border-white/15 text-zinc-400 hover:text-zinc-200 transition-colors">
            Keep &ldquo;{item}&rdquo; as it is
          </button>
        </div>
      </div>
    )
  }

  // --- Pairwise ranking. Towards reuses the app's PairComparison component
  // (inner-game cutting step); away keeps a compact variant with its own copy.
  if ((phase === "rank" || phase === "rank-away") && q) {
    const away = phase === "rank-away"
    if (!away) {
      const est = pair!.ranked.length + pair!.pending.length
      return (
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
          <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-amber-200/90 block mb-2">Step 3. The hierarchy: which has been MORE important in your life?</span>
          <PairComparison
            valueA={{ id: "a", displayName: q.a }}
            valueB={{ id: "b", displayName: q.b }}
            onChoose={(id) => answerPair(id === "a", false)}
            questionNumber={pair!.ranked.length}
            totalQuestions={est}
          />
        </div>
      )
    }
    return (
      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
        <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-amber-200/90">Rank what you avoid</span>
        <p className="text-sm text-zinc-200 mt-2">Which do you work harder to avoid?</p>
        <div className="grid grid-cols-2 gap-2 mt-3">
          <button onClick={() => answerPair(true, true)} className="rounded-xl border border-amber-400/40 bg-amber-500/[0.08] px-4 py-3 text-sm text-amber-100 hover:bg-amber-500/15 transition-colors">
            {q.a}
          </button>
          <button onClick={() => answerPair(false, true)} className="rounded-xl border border-amber-400/40 bg-amber-500/[0.08] px-4 py-3 text-sm text-amber-100 hover:bg-amber-500/15 transition-colors">
            {q.b}
          </button>
        </div>
        <p className="text-[10px] text-zinc-600 mt-2 tabular-nums">
          Don&apos;t overthink — the gut knows. {pair!.ranked.length} placed, {pair!.pending.length} to go.
        </p>
      </div>
    )
  }

  // --- Away-from elicitation ---
  if (phase === "away") {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
        <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-amber-200/90">Step 4. What do you run FROM?</span>
        <p className="text-xs text-zinc-500 mt-1">
          The states you avoid shape your decisions more than the ones you chase. Name them honestly.
        </p>
        {raw.length > 0 && (
          <div className="flex items-center gap-1.5 flex-wrap mt-2">
            {raw.map((r) => (
              <span key={r} className="text-[11px] px-2 py-0.5 rounded-full border border-red-400/30 bg-red-500/[0.08] text-red-200/90">
                {r}
                <button onClick={() => setRaw((p) => p.filter((x) => x !== r))} aria-label={`Remove ${r}`} className="ml-1.5 text-red-200/50 hover:text-red-300">×</button>
              </span>
            ))}
          </div>
        )}
        <div className="flex items-center gap-1.5 flex-wrap mt-2">
          {AWAY_SUGGESTIONS.filter((a) => !raw.some((r) => r.toLowerCase() === a.toLowerCase())).map((a) => (
            <button key={a} onClick={() => setRaw((p) => dedupe([...p, a]))} className="text-[10px] px-2 py-0.5 rounded-full border border-white/15 text-zinc-500 hover:text-zinc-300 transition-colors">
              + {a}
            </button>
          ))}
        </div>
        <InterviewFlow
          questions={["What emotional state do you most try to avoid?", "What else do you move away from?"]}
          loop
          onAnswer={(a) => setRaw((p) => dedupe([...p, a]))}
          onDone={() => {
            const list = dedupe(raw)
            setRaw([])
            if (list.length === 0) { onSetAway([]); setPhase("audit") }
            else beginRankAway(list)
          }}
        />
      </div>
    )
  }

  // --- Audit + redesign ---
  if (phase === "audit") {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
        <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-amber-200/90">Step 5. Read the consequences off the ordering</span>
        {conflicts.length > 0 ? (
          <div className="space-y-2 mt-2">
            {conflicts.map((c) => (
              <div key={c.title} className="rounded-lg border border-amber-400/25 bg-amber-500/[0.06] px-3 py-2">
                <p className="text-xs font-medium text-amber-200">{c.title}</p>
                <p className="text-[11px] text-zinc-400 mt-0.5 leading-relaxed">{c.message}</p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-zinc-400 mt-2">No obvious conflicts in this hierarchy. That&apos;s rare. Keep it honest as life changes.</p>
        )}
        <p className="text-xs text-zinc-300 mt-3">
          Now the design question: <span className="text-white">&ldquo;What do my values NEED to be to create the life I want?&rdquo;</span>{" "}
          Reorder or edit freely below — this list is yours to engineer.
        </p>
        <button onClick={() => setPhase("idle")} className="mt-3 text-[11px] px-3 py-1 rounded-md border border-emerald-500/40 bg-emerald-500/10 text-emerald-200 hover:bg-emerald-500/20 transition-colors">
          Done, show my hierarchy
        </button>
      </div>
    )
  }

  // --- Idle: completed view or intro ---
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
      <div className="flex items-center gap-2 mb-1">
        <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-amber-200/90">Your values, the hierarchy</span>
        {values.length > 0 && (
          <button onClick={() => { setRaw([...values]); setPhase("elicit") }} className="ml-auto text-[10px] text-zinc-600 hover:text-zinc-300 transition-colors">
            Redo the exercise
          </button>
        )}
      </div>
      {values.length === 0 && !manual ? (
        <>
          <p className="text-xs text-zinc-500 mt-1">
            Not a list to pick from. An audit of your life, in five steps: what mattered → the emotion behind it →
            the order → what you avoid → what the ordering costs you.
          </p>
          <div className="flex items-center gap-2 mt-3">
            <button onClick={() => { setRaw([]); setPhase("elicit") }} className="text-xs px-3.5 py-2 rounded-lg bg-amber-500/20 border border-amber-500/40 text-amber-100 hover:bg-amber-500/30 transition-all font-medium">
              Begin the values exercise (~5 min)
            </button>
            <button onClick={() => setManual(true)} className="text-[11px] text-zinc-600 hover:text-zinc-400 transition-colors">add manually instead</button>
          </div>
        </>
      ) : (
        <>
          {values.length > 0 && (
            <ol className="space-y-1 mt-2 mb-2">
              {values.map((v, i) => (
                <li key={v} className="group/val flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-1.5">
                  <span className="text-[10px] font-bold size-4.5 rounded-full flex items-center justify-center shrink-0 tabular-nums bg-amber-500/20 text-amber-300">{i + 1}</span>
                  <span className="text-sm text-zinc-200">{v}</span>
                  <span className="ml-auto flex items-center gap-0.5">
                    <button onClick={() => move(i, -1)} disabled={i === 0} aria-label={`Rank ${v} higher`} className="size-4.5 rounded border border-white/10 text-zinc-500 hover:bg-white/10 disabled:opacity-25 flex items-center justify-center"><ChevronDown className="size-3 rotate-180" /></button>
                    <button onClick={() => move(i, 1)} disabled={i === values.length - 1} aria-label={`Rank ${v} lower`} className="size-4.5 rounded border border-white/10 text-zinc-500 hover:bg-white/10 disabled:opacity-25 flex items-center justify-center"><ChevronDown className="size-3" /></button>
                    <button onClick={() => onSetValues(values.filter((x) => x !== v))} aria-label={`Remove value ${v}`} className="size-4.5 rounded text-zinc-600 hover:text-red-300 flex items-center justify-center opacity-0 group-hover/val:opacity-100 transition-all"><X className="size-3" /></button>
                  </span>
                </li>
              ))}
            </ol>
          )}
          <div className="flex items-center gap-2">
            <input
              value={custom}
              onChange={(e) => setCustom(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && custom.trim()) { onSetValues(dedupe([...values, custom.trim()])); setCustom("") } }}
              placeholder="Add a value…"
              aria-label="Add a value"
              className="w-32 bg-transparent border-b border-white/10 focus:border-white/30 text-[11px] text-zinc-200 placeholder:text-zinc-600 focus:outline-none py-0.5"
            />
          </div>
          {awayValues.length > 0 && (
            <p className="text-[11px] text-zinc-500 mt-3">
              <span className="text-[9px] uppercase tracking-wide text-red-300/70 mr-1.5">Moving away from</span>
              {awayValues.map((a, i) => (
                <span key={a} className="text-red-200/80">{i > 0 && <span className="text-zinc-600"> · </span>}{a}</span>
              ))}
            </p>
          )}
          {values.length >= 3 && awayValues.length === 0 && (
            <button onClick={() => { setRaw([]); setPhase("away") }} className="mt-2 text-[11px] text-red-300/80 hover:text-red-200 underline decoration-dotted underline-offset-2 transition-colors">
              Name your away-from values. They steer more than you think
            </button>
          )}
          {conflicts.length > 0 && (
            <div className="mt-3 space-y-1.5">
              {conflicts.map((c) => (
                <p key={c.title} className="text-[11px] text-amber-200/80" title={c.message}>⚠ {c.title} — <span className="text-zinc-500">{c.message.split(".")[0]}.</span></p>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}

/**
 * PLM OS M0 — the Foundation: Commit-to-Mastery gate + values elicitation.
 * Stefan's entry order: commit to ALL areas first, then elicit and RANK your
 * values ("what has been most important in your life?") BEFORE writing the
 * vision, so the vision can be checked against them.
 */
/**
 * v13 — RULES ENGINEERING (Robbins/DWD lineage; _Axwu-OV9YQ + KuVQ5wpcIvg):
 * the rules attached to your values decide when you get to feel them. Elicit
 * the current rule, notice it's hard/out of your control, rewrite it easy and
 * self-controlled, invert the away-values, condition daily.
 */
function RulesEngineering({ values, awayValues, rules, onRules, onAddIncantation, ruleWork, onRuleWork }: {
  values: string[]
  awayValues: string[]
  rules: string[]
  onRules: (next: string[]) => void
  onAddIncantation: (card: string) => void
  ruleWork: Array<{ id: string; value: string; old: string; rewritten?: string }>
  onRuleWork: (fn: (prev: Array<{ id: string; value: string; old: string; rewritten?: string }>) => Array<{ id: string; value: string; old: string; rewritten?: string }>) => void
}) {
  const [open, setOpen] = useState(false)
  const [picked, setPicked] = useState<string | null>(null)
  const [pickedAway, setPickedAway] = useState(false)
  const [draft, setDraft] = useState("")
  // v23 — the exercise is CATCH the old rule, THEN rewrite it. Only the rewrite
  // was ever kept, and `currentRule` was one shared local string, so switching
  // to a different value destroyed the caught rule for the previous one. It is
  // now stored per value, and the pair is what the user reads back.
  const currentRule = (picked && ruleWork.find((w) => w.value === picked)?.old) ?? ""
  const setCurrentRule = (text: string) => {
    if (!picked) return
    onRuleWork((prev) => {
      const i = prev.findIndex((w) => w.value === picked)
      if (i === -1) return [...prev, { id: `rw-${picked}`, value: picked, old: text }]
      return prev.map((w, j) => (j === i ? { ...w, old: text } : w))
    })
  }
  const [showExamples, setShowExamples] = useState(false)
  const addRule = () => {
    const t = draft.trim()
    if (!t || !picked || rules.length >= 60) return
    const v = picked.toLowerCase()
    const line = /^i (feel|experience)/i.test(t)
      ? t
      : pickedAway
        ? `I experience ${v} only if I were to consistently ${t}`
        : `I feel ${v} anytime I ${t}`
    if (!rules.includes(line)) onRules([...rules, line])
    // Bind the rewrite to the rule it replaced, so the worksheet reads as a pair.
    onRuleWork((prev) => {
      const i = prev.findIndex((w) => w.value === picked)
      if (i === -1) return [...prev, { id: `rw-${picked}`, value: picked, old: "", rewritten: line }]
      return prev.map((w, j) => (j === i ? { ...w, rewritten: line } : w))
    })
    setDraft("")
  }
  return (
    <div id="lm-rules" className="mt-4 rounded-2xl border border-amber-400/20 bg-gradient-to-br from-amber-500/[0.05] via-white/[0.03] to-transparent p-5 scroll-mt-20">
      <button onClick={() => setOpen((o) => !o)} aria-expanded={open} className="w-full flex items-center gap-2 text-left">
        <ChevronDown className={`size-3.5 text-zinc-500 shrink-0 transition-transform ${open ? "" : "-rotate-90"}`} />
        <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-amber-200/90">Engineer your rules. When do you get to FEEL your values?</span>
        {rules.length > 0 && <span className="ml-auto text-[10px] text-zinc-500 tabular-nums">{rules.length} rule{rules.length === 1 ? "" : "s"}</span>}
      </button>
      {open && (
        <div className="mt-3">
          <p className="text-[11px] text-zinc-400 mb-2">
            A rule is your belief about what has to happen before you're allowed to feel a value. Most people make it
            incredibly hard to feel good and incredibly easy to feel bad. The exercise: catch the rule, then rewrite it
            so it's easy and inside your control. The test is never &ldquo;is it true?&rdquo;. It&apos;s &ldquo;does holding it serve me?&rdquo;
          </p>
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-500 mb-1.5">Step 1. Pick a value (or an away-from to disarm)</p>
          <div className="flex items-center gap-1.5 flex-wrap mb-2">
            {values.map((v) => (
              <button key={v} onClick={() => { setPicked(v); setPickedAway(false); setCurrentRule("") }} aria-pressed={picked === v && !pickedAway}
                className={`text-[11px] px-2 py-0.5 rounded-full border transition-colors ${picked === v && !pickedAway ? "border-amber-400/60 bg-amber-500/15 text-amber-200" : "border-white/15 text-zinc-400 hover:text-zinc-200"}`}>
                {v}
              </button>
            ))}
            {awayValues.map((v) => (
              <button key={v} onClick={() => { setPicked(v); setPickedAway(true); setCurrentRule("") }} aria-pressed={picked === v && pickedAway}
                className={`text-[11px] px-2 py-0.5 rounded-full border transition-colors ${picked === v && pickedAway ? "border-red-400/60 bg-red-500/15 text-red-200" : "border-red-400/20 text-zinc-500 hover:text-zinc-300"}`}>
                away: {v}
              </button>
            ))}
          </div>
          {picked && (
            <>
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-500 mb-1">Step 2. Catch the current rule</p>
              <p className="text-xs text-amber-100/90 mb-1.5">{pickedAway ? `What has to happen for you to feel ${picked.toLowerCase()}?` : RULES_EXERCISE.elicit.question(picked)} <span className="text-zinc-500">…and what else has to happen?</span></p>
              <input
                value={currentRule}
                onChange={(e) => setCurrentRule(e.target.value)}
                placeholder="Write it exactly as your head says it. No editing."
                aria-label={`Current rule for ${picked}`}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-white/25 mb-1.5"
              />
              {currentRule.trim() && !pickedAway && (
                <ul className="mb-2">
                  {RULES_EXERCISE.diagnose.map((d) => (
                    <li key={d} className="text-[10px] text-zinc-500">· {d}</li>
                  ))}
                </ul>
              )}
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-500 mb-1">
                Step 3 — {pickedAway ? "make it nearly impossible to feel" : "rewrite it easy, and in YOUR control"}
              </p>
              <div className="flex items-center gap-2 mb-1.5">
                <span className="text-[11px] text-zinc-500 shrink-0">
                  {pickedAway ? `I experience ${picked.toLowerCase()} only if I were to consistently…` : `I feel ${picked.toLowerCase()} anytime I…`}
                </span>
                <input
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") addRule() }}
                  placeholder={pickedAway ? "believe the illusion of lack and focus only on myself" : "wake up · make any progress · give something to someone"}
                  aria-label={`New rule for ${picked}`}
                  className="flex-1 min-w-0 bg-white/5 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-white/25"
                />
                <button onClick={addRule} disabled={!draft.trim()} className="text-[11px] px-2.5 py-1 rounded-md border border-amber-400/40 text-amber-200 hover:bg-amber-500/10 disabled:opacity-30 transition-colors">Keep it</button>
              </div>
            </>
          )}
          <button onClick={() => setShowExamples((x) => !x)} aria-expanded={showExamples} className="text-[10px] text-zinc-600 hover:text-zinc-400 transition-colors">
            {showExamples ? "hide examples" : "see example rules for inspiration"}
          </button>
          {showExamples && (
            <ul className="mt-1 mb-1 space-y-0.5">
              {RULES_EXERCISE.rewriteExamples.map((ex) => (
                <li key={ex.text} className="text-[10px] italic text-zinc-500">· {ex.text}</li>
              ))}
              <li className="text-[10px] italic text-zinc-500">· {RULES_EXERCISE.invertExample.text}</li>
            </ul>
          )}
          {rules.length > 0 && (
            <>
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-500 mt-2 mb-1">Your rules. Read them aloud daily, one value a day, 30 days</p>
              <ul className="space-y-1">
                {rules.map((r) => (
                  <li key={r} className="group/rule flex items-baseline gap-2 text-xs text-zinc-200">
                    <span className="min-w-0">{r}</span>
                    <span className="ml-auto flex items-center gap-1.5 shrink-0 opacity-0 group-hover/rule:opacity-100 transition-opacity">
                      <button onClick={() => onAddIncantation(r)} className="text-[9px] px-1.5 py-px rounded border border-violet-400/30 text-violet-300 hover:bg-violet-500/10 transition-colors">→ deck</button>
                      <button onClick={() => onRules(rules.filter((x) => x !== r))} aria-label={`Remove rule: ${r}`} className="text-zinc-600 hover:text-red-300">×</button>
                    </span>
                  </li>
                ))}
              </ul>
              <CopyButton label="Copy my rules" getText={() => ["MY RULES", ...rules].join("\n")} />
            </>
          )}
        </div>
      )}
    </div>
  )
}

/** His manifesto credo lines (verbatim from the corpus) — shown as the WORKED
 * EXAMPLE, never auto-included: the exercise is authoring your own. Tapping a
 * line adopts it into the user's manifesto (his meta-pattern: mine is the
 * example — design yours). */
const MANIFESTO_CREDO = MANIFESTO_PROGRAM_CREDO.map((l) => l.text)
const MANIFESTO_CLOSING = "I commit to mastery in all areas of my life, refusing to settle for anything less than an extraordinary quality of life."
/** Guided elicitation — each answer becomes one "I…" credo line. Prompts walk
 * his credo THEMES (action, word, self-praise, standards, worst-day identity)
 * without writing the user's lines for them. */
const MANIFESTO_PROMPTS = [
  "When you know exactly what to do but don't feel like doing it — what do you do? Answer as a rule: \"I…\"",
  "What is your word worth. To others, and to yourself when nobody's watching?",
  "What do you do right after a win, before rushing to the next thing?",
  "What will you no longer settle for. Starting now?",
  "Who are you on your worst day? Write the line you'll need to read that morning.",
]
/** How many own lines a manifesto needs before it can be signed. */
const MANIFESTO_MIN_LINES = 3

function ManifestoText({ name, ownLines, onRemove }: { name: string; ownLines?: string[]; onRemove?: (line: string) => void }) {
  return (
    <div className="text-left max-w-xl mx-auto space-y-1.5">
      <p className="text-sm text-white font-medium">My name is {name.trim() || "________"} and I am the master of my life.</p>
      {(ownLines ?? []).length === 0 ? (
        <p className="text-xs italic text-zinc-600">your credo lines go here, and this document is yours to write</p>
      ) : (
        (ownLines ?? []).map((line) => (
          <p key={line} className="group flex items-baseline gap-2 text-xs text-zinc-300">
            <span className="min-w-0">{line}</span>
            {onRemove && (
              <button onClick={() => onRemove(line)} aria-label={`Remove manifesto line: ${line}`} className="ml-auto opacity-0 group-hover:opacity-100 text-zinc-600 hover:text-zinc-300 transition-opacity shrink-0">×</button>
            )}
          </p>
        ))
      )}
      <p className="text-xs text-amber-200/90 pt-1">{MANIFESTO_CLOSING}</p>
    </div>
  )
}

function FoundationSection({
  part,
  committedAt,
  values,
  awayValues,
  manifestoName,
  manifestoLines,
  valueRules,
  onManifestoName,
  onManifestoLines,
  onValueRules,
  ruleWork,
  onRuleWork,
  onAddIncantation,
  onCommit,
  onSetValues,
  onSetAway,
}: {
  /** "manifesto" = the commit stage's signing block; "values" = the optional
   * values exercise (track stage's "go deeper"). Splits what used to be one. */
  part: "manifesto" | "values"
  committedAt: string | null
  values: string[]
  awayValues: string[]
  manifestoName: string
  manifestoLines: string[]
  valueRules: string[]
  onManifestoName: (name: string) => void
  onManifestoLines: (lines: string[]) => void
  onValueRules: (next: string[]) => void
  ruleWork: Array<{ id: string; value: string; old: string; rewritten?: string }>
  onRuleWork: (fn: (prev: Array<{ id: string; value: string; old: string; rewritten?: string }>) => Array<{ id: string; value: string; old: string; rewritten?: string }>) => void
  onAddIncantation: (card: string) => void
  onCommit: () => void
  onSetValues: (values: string[]) => void
  onSetAway: (values: string[]) => void
}) {
  const [showManifesto, setShowManifesto] = useState(false)
  const [lineDraft, setLineDraft] = useState("")
  const [interviewing, setInterviewing] = useState(false)
  const [showHis, setShowHis] = useState(false)
  const toLine = (raw: string): string | null => {
    const t = raw.trim()
    if (!t) return null
    return /^i('|’)?m |^i /i.test(t) ? t : `I ${t}`
  }
  const appendLine = (raw: string, verbatim = false) => {
    const line = verbatim ? raw.trim() || null : toLine(raw)
    if (!line || manifestoLines.length >= 30 || manifestoLines.includes(line)) return
    onManifestoLines([...manifestoLines, line])
  }
  const addLine = () => {
    appendLine(lineDraft)
    setLineDraft("")
  }
  // The authoring block — HIS lines are inspiration to adopt, never defaults.
  const ownLinesEditor = (
    <div className="mt-3 text-left max-w-xl mx-auto">
      <p className="text-[10px] text-zinc-500 mb-1.5">
        Your credo, line by line — 3 lines minimum, most people write 5. Write it, don&apos;t copy it. Each line starts with &ldquo;I&hellip;&rdquo;{manifestoLines.length > 0 ? ` (${manifestoLines.length} so far)` : ""}:
      </p>
      {interviewing ? (
        <InterviewFlow
          questions={MANIFESTO_PROMPTS}
          onAnswer={(a) => appendLine(a)}
          onDone={() => setInterviewing(false)}
        />
      ) : (
        <>
          <div className="flex items-center gap-2">
            <input
              value={lineDraft}
              onChange={(e) => setLineDraft(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") addLine() }}
              placeholder="I show up, especially on the days I don't feel like it…"
              aria-label="Add your own manifesto line"
              className="flex-1 min-w-0 bg-white/5 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-white/25"
            />
            <button onClick={addLine} disabled={!lineDraft.trim()} className="text-[11px] px-2.5 py-1 rounded-md border border-white/15 text-zinc-300 hover:bg-white/10 disabled:opacity-30 transition-colors">Add</button>
          </div>
          <div className="flex items-center gap-3 mt-2">
            <button
              onClick={() => setInterviewing(true)}
              className="text-[11px] px-2.5 py-1 rounded-md border border-amber-400/40 bg-amber-500/10 text-amber-200 hover:bg-amber-500/20 transition-colors"
            >
              Stuck? Answer 5 questions and build it line by line
            </button>
            <button onClick={() => setShowHis((s) => !s)} aria-expanded={showHis} className="text-[10px] text-zinc-600 hover:text-zinc-400 transition-colors">
              {showHis ? "hide the example" : "see the program credo for inspiration"}
            </button>
          </div>
          {showHis && (
            <div className="mt-2 rounded-lg border border-white/10 bg-white/[0.02] p-2.5">
              <p className="text-[10px] text-zinc-600 mb-1.5">The program credo. A worked example. Adopt a line only if you&apos;d say it in your own voice:</p>
              <ul className="space-y-1">
                {MANIFESTO_CREDO.map((l) => (
                  <li key={l} className="flex items-baseline gap-2 text-[11px] text-zinc-400">
                    <span className="min-w-0 italic">{l}</span>
                    <button
                      onClick={() => appendLine(l, true)}
                      disabled={manifestoLines.includes(l)}
                      aria-label={`Adopt credo line: ${l}`}
                      className="ml-auto text-[10px] px-1.5 py-px rounded border border-white/15 text-zinc-500 hover:text-zinc-200 hover:bg-white/10 disabled:opacity-30 transition-colors shrink-0"
                    >
                      {manifestoLines.includes(l) ? "adopted" : "+ make it mine"}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}
    </div>
  )
  const signable = manifestoName.trim().length > 0 && manifestoLines.length >= MANIFESTO_MIN_LINES
  // v17 — values are NO LONGER gated on the signature. They used to be, because
  // Commit came second and everything downstream could assume it. Commit is now
  // LAST (you sign the plan you built), so that gate would make the values
  // exercise unreachable during the entire create flow. Values are upstream of
  // the vision in the framework anyway — eliciting them early is the point.
  if (part === "values") {
    return (
      <div className="max-w-3xl mx-auto mb-6">
        <PrincipleCardView id="values" />
        <ValuesJourney values={values} awayValues={awayValues} onSetValues={onSetValues} onSetAway={onSetAway} />
        {values.length > 0 && (
          <RulesEngineering
            values={values}
            awayValues={awayValues}
            rules={valueRules}
            onRules={onValueRules}
            onAddIncantation={onAddIncantation}
            ruleWork={ruleWork}
            onRuleWork={onRuleWork}
          />
        )}
      </div>
    )
  }
  return (
    <div className="max-w-3xl mx-auto mb-6">
      {!committedAt && <PrincipleCardView id="commit" />}
      {!committedAt && <PrincipleCardView id="mastery" />}
      {!committedAt ? (
        <div className="rounded-2xl border border-amber-400/25 bg-gradient-to-br from-amber-500/[0.08] via-white/[0.03] to-transparent p-5 text-center">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-amber-200/90 mb-2">Your manifesto. The commitment that gates tracking</p>
          <p className="text-sm text-zinc-300 leading-relaxed max-w-xl mx-auto">
            The dabbler tries something, hits the plateau, and quits. The master commits to the whole climb.
            And to <span className="text-white">every</span> area of life, including the quiet ones. You can&apos;t master
            your business while your body, relationships and mind fall apart.
          </p>
          <p className="text-[11px] text-zinc-500 mt-1.5 max-w-xl mx-auto">
            Write your vision above first if you like. But nothing gets tracked until this is signed. You can dream before you commit. You cannot operate.
          </p>
          <div className="mt-4 flex items-center justify-center gap-2">
            <label className="text-[11px] text-zinc-500" htmlFor="lm-manifesto-name">Your name:</label>
            <input
              id="lm-manifesto-name"
              value={manifestoName}
              onChange={(e) => onManifestoName(e.target.value)}
              placeholder="first name"
              className="w-36 bg-white/5 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-white/25"
            />
          </div>
          <div className="mt-4 rounded-xl border border-white/10 bg-white/[0.03] p-4">
            <ManifestoText name={manifestoName} ownLines={manifestoLines} onRemove={(l) => onManifestoLines(manifestoLines.filter((x) => x !== l))} />
            {ownLinesEditor}
          </div>
          <p className="text-[10px] text-zinc-500 mt-3">Read it OUT LOUD. A manifesto is meant to be spoken. Then sign it:</p>
          <button
            onClick={onCommit}
            disabled={!signable}
            className="mt-3 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-100 hover:bg-amber-500/30 disabled:opacity-40 disabled:cursor-not-allowed transition-all text-sm font-semibold"
          >
            <Check className="size-4" /> This is my manifesto. I commit
          </button>
          {!signable && (
            <p className="text-[10px] text-zinc-600 mt-2">
              {!manifestoName.trim()
                ? "Put your name in it first. It becomes yours when you sign it."
                : `Write at least ${MANIFESTO_MIN_LINES} lines of your own (${manifestoLines.length}/${MANIFESTO_MIN_LINES}) — a manifesto you didn't write won't hold you.`}
            </p>
          )}
        </div>
      ) : (
        <div className="rounded-xl border border-emerald-400/20 bg-emerald-500/[0.05] px-4 py-2.5">
          <button onClick={() => setShowManifesto((s) => !s)} className="w-full flex items-center gap-2 text-left">
            <Check className="size-3.5 text-emerald-400 shrink-0" />
            <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-emerald-200/90">Manifesto signed {committedAt} — you&apos;ve committed</span>
            <span className="ml-auto text-[10px] text-zinc-500">{showManifesto ? "hide" : "re-read it"}</span>
          </button>
          {showManifesto && (
            <div className="mt-3 pb-1">
              <ManifestoText name={manifestoName} ownLines={manifestoLines} onRemove={(l) => onManifestoLines(manifestoLines.filter((x) => x !== l))} />
              {ownLinesEditor}
              <div className="mt-2 text-center">
                <CopyButton label="Copy manifesto" getText={() => [`My name is ${manifestoName.trim()} and I am the master of my life.`, ...manifestoLines, MANIFESTO_CLOSING].join("\n")} />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

/**
 * PLM OS M1 — Driving Force builder: ONE non-negotiable master purpose (the
 * why of the vision), rapid-fire reason words ("the reasons are the fuel"),
 * and identity lines ("who am I committed to being?").
 */
const REASON_WORDS = ["freedom", "growth", "family", "love", "significance", "contribution", "legacy", "fun", "connection", "gratitude", "faith", "impact", "peace", "adventure"]

function DrivingForceBuilder({ df, onChange, defaultName }: { df: VisionDrivingForce | null; onChange: (df: VisionDrivingForce) => void; defaultName?: string }) {
  const cur: VisionDrivingForce = df ?? { purpose: "", reasons: [], identity: [] }
  const [identityDraft, setIdentityDraft] = useState("")
  const [conductDraft, setConductDraft] = useState("")
  const [missionName, setMissionName] = useState(defaultName ?? "")
  useEffect(() => { if (defaultName && !missionName.trim()) setMissionName(defaultName) }, [defaultName]) // eslint-disable-line react-hooks/exhaustive-deps
  const [missionBe, setMissionBe] = useState("")
  const [missionGive, setMissionGive] = useState("")
  // v9 — Primary Question mini-exercise: catch the loop, rebuild the presupposition.
  const [pqOld, setPqOld] = useState("")
  const [pqNew, setPqNew] = useState("")
  const missionPreview = missionBe.trim() || missionGive.trim()
    ? `I, ${missionName.trim() || "[your name]"}, see, know, hear and feel that the purpose of my life is to be ${missionBe.trim() || "…"}, and to ${missionGive.trim() || "…"}.`
    : null
  const addConduct = () => {
    const t = conductDraft.trim()
    if (!t || (cur.conduct ?? []).length >= 30) return
    onChange({ ...cur, conduct: [...(cur.conduct ?? []), t] })
    setConductDraft("")
  }
  const [interviewing, setInterviewing] = useState(false)
  const [answers, setAnswers] = useState<string[]>([])
  const addIdentity = () => {
    const t = identityDraft.trim()
    if (!t || cur.identity.length >= 30) return
    const line = /^i('|’)?m |^i am /i.test(t) ? t : `I am ${t}`
    onChange({ ...cur, identity: [...cur.identity, line] })
    setIdentityDraft("")
  }
  return (
    <div className="grid gap-4 md:grid-cols-2 items-start">
      <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
        <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-500">Your purpose. Why do you want this vision?</span>
        <textarea
          value={cur.purpose}
          onChange={(e) => onChange({ ...cur, purpose: e.target.value })}
          rows={3}
          placeholder="What will this give me? Why do I want this? Write it as one non-negotiable statement. The fuel you'll read on hard days."
          aria-label="Your purpose"
          className="mt-2 w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-white/20 transition-colors resize-none"
        />
        {interviewing ? (
          <InterviewFlow
            questions={["Why do you want this vision, really?", "What will it give you, once it's real?", "And what would it cost you to never get there?"]}
            onAnswer={(a, i) => setAnswers((p) => { const n = [...p]; n[i] = a; return n })}
            onDone={() => {
              setInterviewing(false)
              const composed = answers.filter(Boolean).join(" ")
              if (composed.trim()) onChange({ ...cur, purpose: composed.trim() })
              setAnswers([])
            }}
          />
        ) : (
          <button onClick={() => setInterviewing(true)} className="mt-1.5 text-[11px] text-violet-300/90 hover:text-violet-200 underline decoration-dotted underline-offset-2 transition-colors">
            Prefer to be asked? Answer three questions instead
          </button>
        )}
        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-500 mt-3">Reason words. The more reasons, the more fuel</p>
        <div className="flex items-center gap-1.5 flex-wrap mt-2">
          {REASON_WORDS.map((w) => {
            const on = cur.reasons.includes(w)
            return (
              <button
                key={w}
                onClick={() => onChange({ ...cur, reasons: on ? cur.reasons.filter((r) => r !== w) : [...cur.reasons, w] })}
                aria-pressed={on}
                className={`text-[11px] px-2 py-0.5 rounded-full border transition-colors ${on ? "border-violet-400/50 bg-violet-500/15 text-violet-200" : "border-white/15 text-zinc-400 hover:text-zinc-200"}`}
              >
                {w}
              </button>
            )
          })}
        </div>
      </div>
      <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
        <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-500">Identity, who are you committed to being?</span>
        <p className="text-[10px] text-zinc-600 mt-1">&ldquo;The strongest force in the human personality is the need to stay consistent with how we define ourselves.&rdquo;. Tony Robbins</p>
        <ul className="mt-2 space-y-1">
          {cur.identity.map((line) => (
            <li key={line} className="group/id flex items-center gap-2 text-sm text-zinc-200">
              <span className="size-1.5 rounded-full bg-violet-400/70 shrink-0" />
              {line}
              <button
                onClick={() => onChange({ ...cur, identity: cur.identity.filter((x) => x !== line) })}
                aria-label={`Remove ${line}`}
                className="ml-auto text-zinc-600 hover:text-red-300 opacity-0 group-hover/id:opacity-100 transition-all shrink-0"
              ><X className="size-3.5" /></button>
            </li>
          ))}
        </ul>
        <div className="flex items-center gap-2 mt-2">
          <Plus className="size-3.5 shrink-0 text-zinc-600" />
          <input
            value={identityDraft}
            onChange={(e) => setIdentityDraft(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") addIdentity() }}
            aria-label="Add an identity line"
            placeholder='I am… ("disciplined", "a world-class coach", "an athlete")'
            className="flex-1 min-w-0 bg-transparent border-b border-white/10 focus:border-white/30 text-sm text-zinc-200 placeholder:text-zinc-600 focus:outline-none py-0.5"
          />
          <button onClick={addIdentity} disabled={!identityDraft.trim()} className="text-[11px] px-2 py-0.5 rounded-md border border-white/15 text-zinc-300 hover:bg-white/10 disabled:opacity-30 transition-colors">Add</button>
        </div>
      </div>

      {/* v6 — mission statement: one sentence, BE + DO/GIVE, the energy test */}
      <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
        <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-500">Your mission, one sentence, spoken daily</span>
        {cur.mission ? (
          <>
            <p className="text-sm italic text-violet-100 mt-2 leading-relaxed">{cur.mission}</p>
            {/* v23 — "rewrite it" used to clear the mission AND leave the three
                component boxes empty, so tweaking one clause meant retyping all
                three. The parts are kept, so the boxes come back filled. */}
            <button
              onClick={() => {
                const parts = cur.missionParts
                if (parts) { setMissionName(parts.name); setMissionBe(parts.be); setMissionGive(parts.doGive) }
                onChange({ ...cur, mission: undefined })
              }}
              className="mt-2 text-[10px] text-zinc-600 hover:text-red-300 transition-colors"
            >
              rewrite it
            </button>
          </>
        ) : (
          <>
            <p className="text-[10px] text-zinc-600 mt-1">The test: said out loud, it should give you goosebumps. If it doesn&apos;t. Keep searching. Complexity is the enemy of execution; pick something for THIS phase.</p>
            <div className="grid gap-2 sm:grid-cols-3 mt-2">
              <input value={missionName} onChange={(e) => setMissionName(e.target.value)} placeholder="Your full name" aria-label="Mission name"
                className="bg-white/5 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-white/20" />
              <input value={missionBe} onChange={(e) => setMissionBe(e.target.value)} placeholder="…to BE (more fully alive, growing…)" aria-label="Mission be"
                className="bg-white/5 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-white/20" />
              <input value={missionGive} onChange={(e) => setMissionGive(e.target.value)} placeholder="…to DO/GIVE (make a difference in…)" aria-label="Mission give"
                className="bg-white/5 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-white/20" />
            </div>
            {missionPreview && (
              <>
                <p className="text-sm italic text-violet-200/90 mt-2 leading-relaxed">{missionPreview}</p>
                <button
                  onClick={() => onChange({ ...cur, mission: missionPreview, missionParts: { name: missionName.trim(), be: missionBe.trim(), doGive: missionGive.trim() } })}
                  disabled={!missionBe.trim() || !missionGive.trim() || !missionName.trim()}
                  className="mt-2 text-[11px] px-2.5 py-1 rounded-md border border-violet-400/40 text-violet-200 hover:bg-violet-500/15 disabled:opacity-30 transition-colors"
                >
                  Goosebumps? Keep it
                </button>
              </>
            )}
          </>
        )}
      </div>

      {/* v6 — code of conduct: standards for how you show up */}
      <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
        <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-500">Code of conduct. How you're committed to showing up</span>
        <ul className="mt-2 space-y-1">
          {(cur.conduct ?? []).map((line) => (
            <li key={line} className="group/cc flex items-center gap-2 text-sm text-zinc-200">
              <span className="size-1.5 rounded-full bg-amber-400/70 shrink-0" />
              {line}
              <button onClick={() => onChange({ ...cur, conduct: (cur.conduct ?? []).filter((x) => x !== line) })} aria-label={`Remove ${line}`} className="ml-auto text-zinc-600 hover:text-red-300 opacity-0 group-hover/cc:opacity-100 transition-all shrink-0"><X className="size-3.5" /></button>
            </li>
          ))}
        </ul>
        <div className="flex items-center gap-2 mt-2">
          <Plus className="size-3.5 shrink-0 text-zinc-600" />
          <input
            value={conductDraft}
            onChange={(e) => setConductDraft(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") addConduct() }}
            aria-label="Add a standard to your code of conduct"
            placeholder='To be… ("playful", "loving and caring", "disciplined", "grateful")'
            className="flex-1 min-w-0 bg-transparent border-b border-white/10 focus:border-white/30 text-sm text-zinc-200 placeholder:text-zinc-600 focus:outline-none py-0.5"
          />
          <button onClick={addConduct} disabled={!conductDraft.trim()} className="text-[11px] px-2 py-0.5 rounded-md border border-white/15 text-zinc-300 hover:bg-white/10 disabled:opacity-30 transition-colors">Add</button>
        </div>
      </div>

      {/* v9 — the Primary Question: the habitual question, rebuilt so its
          presupposition works FOR you. A question smuggles in its assumption. */}
      <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
        <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-500">Your primary question. The one your mind asks on loop</span>
        {cur.primaryQuestion ? (
          <>
            <p className="text-sm italic text-violet-100 mt-2 leading-relaxed">{cur.primaryQuestion}</p>
            {/* v23 — the question you REPLACED is the point of the exercise, and
                it used to be discarded the moment the new one was kept. */}
            {cur.primaryQuestionOld && (
              <p className="text-[10px] text-zinc-600 mt-1">Replacing: &ldquo;{cur.primaryQuestionOld}&rdquo;</p>
            )}
            <p className="text-[10px] text-zinc-600 mt-1">Ask it on purpose, all day. The mind answers whatever it&apos;s asked.</p>
            <button
              onClick={() => { setPqOld(cur.primaryQuestionOld ?? ""); setPqNew(cur.primaryQuestion ?? ""); onChange({ ...cur, primaryQuestion: undefined }) }}
              className="mt-2 text-[10px] text-zinc-600 hover:text-red-300 transition-colors"
            >
              rewrite it
            </button>
          </>
        ) : (
          <>
            <p className="text-[10px] text-zinc-600 mt-1">
              Everyone runs a default question without noticing. &ldquo;why does this always happen to me?&rdquo;, &ldquo;what if I fail?&rdquo;.
              Catch yours, then rebuild it so the assumption inside it empowers you. A strong one: &ldquo;How can I appreciate and enjoy my life even more, while feeling even more fully alive and growing and making a difference?&rdquo; A common trap: &ldquo;How can I become better?&rdquo; hides an I&apos;m-not-enough assumption.
            </p>
            <div className="grid gap-2 sm:grid-cols-2 mt-2">
              <input
                value={pqOld}
                onChange={(e) => setPqOld(e.target.value)}
                placeholder='Step 1 — catch the loop: "why am I behind?"'
                aria-label="Your current habitual question"
                className="bg-white/5 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-white/20"
              />
              <input
                value={pqNew}
                onChange={(e) => setPqNew(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && pqNew.trim()) onChange({ ...cur, primaryQuestion: pqNew.trim(), ...(pqOld.trim() ? { primaryQuestionOld: pqOld.trim() } : {}) }) }}
                placeholder='Step 2 — the upgrade: "how can I enjoy making this happen?"'
                aria-label="Your new primary question"
                className="bg-white/5 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-white/20"
              />
            </div>
            {pqOld.trim() && !pqNew.trim() && (
              <p className="text-[10px] text-amber-300/80 mt-1.5">What does &ldquo;{pqOld.trim()}&rdquo; assume? Now write the question whose assumption you&apos;d WANT to live inside.</p>
            )}
            <button
              onClick={() => { if (pqNew.trim()) onChange({ ...cur, primaryQuestion: pqNew.trim(), ...(pqOld.trim() ? { primaryQuestionOld: pqOld.trim() } : {}) }) }}
              disabled={!pqNew.trim()}
              className="mt-2 text-[11px] px-2.5 py-1 rounded-md border border-violet-400/40 text-violet-200 hover:bg-violet-500/15 disabled:opacity-30 transition-colors"
            >
              This is my question now
            </button>
          </>
        )}
      </div>
    </div>
  )
}


/** UX pass — the five identity artifacts confused every test user; this card
 * says what each is and WHEN it gets read, in one place. */
function IdentityStackCard() {
  const [open, setOpen] = useState(false)
  const rows: Array<[string, string]> = [
    ["Manifesto", "Your signed commitment + credo. Written once, re-read when you need the spine. It gates starting to track."],
    ["Values & rules", "WHAT you want to feel, and WHEN you allow yourself to feel it. Rules are read aloud in the morning ritual, one value a day."],
    ["Identity + code of conduct", "WHO you are (\"I am…\") and HOW you show up. Lives on your daily driving-force card."],
    ["Mission", "One sentence, spoken daily. The goosebumps test."],
    ["Incantations", "The spoken conditioning deck. A few cards a day inside the morning ritual, full body."],
  ]
  return (
    <div className="mt-3 rounded-lg border border-white/10 bg-white/[0.02]">
      <button onClick={() => setOpen((o) => !o)} aria-expanded={open} className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-white/[0.04] transition-colors">
        <ChevronDown className={`size-3.5 text-zinc-500 shrink-0 transition-transform ${open ? "" : "-rotate-90"}`} />
        <span className="text-[11px] text-zinc-400">Five identity pieces. How they fit, and when each gets read</span>
      </button>
      {open && (
        <ul className="px-4 pb-3 space-y-1">
          {rows.map(([k, v]) => (
            <li key={k} className="text-[11px] text-zinc-400"><span className="text-zinc-200">{k}:</span> {v}</li>
          ))}
        </ul>
      )}
    </div>
  )
}

/** UX pass — jargon lands cold on newcomers; one card defines every term the
 * product uses before it's taught. */
const GLOSSARY: Array<[string, string]> = [
  ["Manifesto", "A short personal commitment you write and sign. Your terms for showing up."],
  ["Credo", "The \"I…\" lines inside the manifesto."],
  ["Incantation", "A line you say OUT LOUD with your whole body to condition a feeling. Stronger cousin of an affirmation."],
  ["North Star", "Your vision sentence, echoed back with the parts we recognized highlighted."],
  ["Your 10", "What the best version of each life area looks like FOR YOU. The reference your weekly 0-10 rating measures against."],
  ["Domino areas", "The 1-3 life areas you focus on this season, because lifting them lifts the rest."],
  ["Musts", "The 3-5 starred items that make today a win. Everything else is could-do."],
  ["Rules", "Your beliefs about what has to happen before you're allowed to feel a value. Rewritten here so feeling good gets easy."],
  ["The plateau", "The flat stretch after early progress where most people quit. Expected here, planned for."],
  ["Install (30 days)", "A new ritual runs 30 days without negotiation before it counts as yours."],
  ["Driving force", "Your purpose, identity and reasons. The card you read every morning."],
]
function GlossaryCard() {
  const [open, setOpen] = useState(false)
  return (
    <div className="max-w-3xl mx-auto mb-4 rounded-lg border border-white/10 bg-white/[0.02]">
      <button onClick={() => setOpen((o) => !o)} aria-expanded={open} className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-white/[0.04] transition-colors">
        <ChevronDown className={`size-3.5 text-zinc-500 shrink-0 transition-transform ${open ? "" : "-rotate-90"}`} />
        <span className="text-[11px] text-zinc-400">New here? The words we use, in plain language</span>
      </button>
      {open && (
        <div className="px-4 pb-3">
          <p className="text-[11px] text-zinc-500 mb-2">
            One honest note first: this program distills a long coaching lineage. Tony Robbins&apos; strategies, T. Harv Eker&apos;s
            money system, Gary Chapman&apos;s love languages, and classics from Gandhi to Jim Rohn. Into a single method. Where a
            piece has a clear source, we name it.
          </p>
          <ul className="space-y-1">
            {GLOSSARY.map(([k, v]) => (
              <li key={k} className="text-[11px] text-zinc-400"><span className="text-zinc-200">{k}:</span> {v}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

/**
 * v4 — Principle half-pager: the education layer. Fixed anatomy (principle →
 * why it works → how Stefan runs it → quotes → the trap), collapsed to a
 * one-line teaser. All copy sourced from the research canon.
 */
function PrincipleCardView({ id }: { id: string }) {
  const [open, setOpen] = useState(false)
  const card = PRINCIPLES[id]
  if (!card) return null
  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.02] mb-3">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-white/[0.04] transition-colors"
      >
        <ChevronDown className={`size-3.5 text-zinc-500 shrink-0 transition-transform ${open ? "" : "-rotate-90"}`} />
        <span className="text-[11px] font-medium text-zinc-300">{card.title}</span>
        {!open && <span className="text-[11px] text-zinc-600 min-w-0 truncate">{card.teaser}</span>}
      </button>
      {open && (
        <div className="px-4 pb-3.5 space-y-2 text-xs leading-relaxed">
          <p className="text-zinc-200">{card.principle}</p>
          <p className="text-zinc-400"><span className="text-[9px] uppercase tracking-wide text-zinc-500 mr-1.5">Why it works</span>{card.mechanism}</p>
          <p className="text-zinc-400"><span className="text-[9px] uppercase tracking-wide text-zinc-500 mr-1.5">In practice</span>{card.practice}</p>
          {card.quotes.map((raw) => {
            const q = raw.replace(/\s*\([A-Za-z0-9_-]{11}\)\s*$/, "")
            return <p key={raw} className="text-violet-200/80 italic border-l-2 border-violet-400/30 pl-2.5">{q}</p>
          })}
          <p className="text-amber-200/80"><span className="text-[9px] uppercase tracking-wide text-amber-300/70 mr-1.5">The trap</span>{card.trap}</p>
        </div>
      )}
    </div>
  )
}

/** v4 — copy-any-artifact button (the audience's #1 loved behavior is
 * transcribing his checklists — so every artifact is one tap from text). */
function CopyButton({ label, getText }: { label: string; getText: () => string }) {
  const [copied, setCopied] = useState(false)
  return (
    <button
      onClick={() => {
        navigator.clipboard?.writeText(getText()).then(() => {
          setCopied(true)
          window.setTimeout(() => setCopied(false), 1600)
        }).catch(() => {})
      }}
      className={`text-[10px] px-2 py-0.5 rounded-full border transition-colors shrink-0 ${copied ? "border-emerald-400/50 bg-emerald-500/10 text-emerald-300" : "border-white/15 text-zinc-500 hover:text-zinc-300 hover:border-white/30"}`}
      title="Copy as text. Put it on your wall, in your notes, wherever you'll see it"
    >
      {copied ? "Copied" : label}
    </button>
  )
}

/**
 * v4 — the SOS panel: the front door for rough moments. Audience research:
 * people arrive mid-crisis; each crisis type gets a ≤60-second protocol.
 */
function SosPanel({ onClose, counters, onCounters, letters, onLetters, onAddIncantation, onLogBelief, today }: {
  onClose: () => void
  counters: Array<{ label: string; startDate: string }>
  onCounters: (next: Array<{ label: string; startDate: string }>) => void
  letters: Array<{ habit: string; thankYou: string; goodbye: string; date: string }>
  onLetters: (next: Array<{ habit: string; thankYou: string; goodbye: string; date: string }>) => void
  onAddIncantation: (card: string) => void
  onLogBelief: (old: string, replacement: string) => void
  today: string
}) {
  const [active, setActive] = useState<string | null>(null)
  // v10 — change-toolkit local drafts (counters/letters/belief swap).
  const [counterDraft, setCounterDraft] = useState("")
  const [letterHabit, setLetterHabit] = useState("")
  const [letterThanks, setLetterThanks] = useState("")
  const [letterBye, setLetterBye] = useState("")
  const [letterOpen, setLetterOpen] = useState(false)
  const [beliefOld, setBeliefOld] = useState("")
  const [beliefNew, setBeliefNew] = useState("")
  const [beliefSaved, setBeliefSaved] = useState(false)
  return (
    <div className="fixed inset-0 z-40 flex items-start justify-center bg-black/60 backdrop-blur-sm p-4 pt-[8vh]" onClick={onClose}>
      <div className="w-full max-w-lg rounded-2xl border border-amber-400/25 bg-zinc-900 p-5 max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-2 mb-1">
          <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-amber-200/90">Right now. 60 seconds</span>
          <button onClick={onClose} aria-label="Close SOS" className="ml-auto text-zinc-500 hover:text-white"><X className="size-4" /></button>
        </div>
        <PrincipleCardView id="sos" />
        <p className="text-xs text-zinc-400 mb-4">
          You can&apos;t plan your way out of a state. Change the state first, then come back to the plan. What&apos;s happening?
        </p>
        <div className="space-y-2">
          {SOS_PROTOCOLS.map((p) => (
            <div key={p.id} className="rounded-xl border border-white/10 bg-white/[0.03] overflow-hidden">
              <button
                onClick={() => setActive((a) => (a === p.id ? null : p.id))}
                aria-expanded={active === p.id}
                className="w-full flex items-center gap-2 px-4 py-3 text-left hover:bg-white/[0.04] transition-colors"
              >
                <span className="text-sm font-medium text-white">{p.label}</span>
                <span className="text-[11px] text-zinc-500 min-w-0 truncate">— &ldquo;{p.feeling}&rdquo;</span>
                <ChevronDown className={`size-3.5 text-zinc-500 shrink-0 ml-auto transition-transform ${active === p.id ? "rotate-180" : ""}`} />
              </button>
              {active === p.id && (
                <ol className="px-4 pb-3 space-y-1.5">
                  {p.steps.map((s, i) => (
                    <li key={i} className="flex items-baseline gap-2 text-xs text-zinc-200 leading-relaxed">
                      <span className="text-[10px] text-amber-300/80 tabular-nums shrink-0">{i + 1}.</span>
                      {s}
                    </li>
                  ))}
                  <li className="text-[11px] text-amber-200/80 italic pt-1">{p.closer}</li>
                </ol>
              )}
            </div>
          ))}
        </div>
        {/* v10 — the CHANGE toolkit: for the habit you're breaking, not just the hour you're surviving */}
        <div className="mt-4 pt-3 border-t border-white/10">
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-amber-200/80 mb-2">The change toolkit. For the habit you&apos;re breaking</p>

          {/* 30-day one-day-at-a-time counters */}
          <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3 mb-2">
            <p className="text-[10px] text-zinc-500 mb-1.5">One day at a time. Never &ldquo;forever&rdquo;, only ever today. 30 days breaks the loop.</p>
            {counters.map((c) => {
              const day = counterDay(c, today)
              return (
                <div key={c.label} className="flex items-center gap-2 mb-1.5">
                  <span className="text-xs text-zinc-200 min-w-0 truncate">{c.label}</span>
                  <span className={`text-xs tabular-nums shrink-0 ${day > 30 ? "text-emerald-300" : "text-amber-200"}`}>
                    {day > 30 ? `${day} days. The loop is broken. Stay humble: triggers never die.` : `day ${day}/30`}
                  </span>
                  <span className="ml-auto flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => onCounters(counters.map((x) => (x.label === c.label ? { ...x, startDate: today } : x)))}
                      className="text-[10px] px-1.5 py-0.5 rounded border border-white/15 text-zinc-400 hover:bg-white/10 transition-colors"
                      title="A slip is a data point. Restart the count and keep the lesson."
                    >slipped, restart</button>
                    <button onClick={() => onCounters(counters.filter((x) => x.label !== c.label))} aria-label={`Remove counter ${c.label}`} className="text-zinc-600 hover:text-zinc-300 transition-colors">×</button>
                  </span>
                </div>
              )
            })}
            <div className="flex items-center gap-2">
              <input
                value={counterDraft}
                onChange={(e) => setCounterDraft(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && counterDraft.trim() && !counters.some((c) => c.label === counterDraft.trim())) { onCounters([...counters, { label: counterDraft.trim(), startDate: today }]); setCounterDraft("") } }}
                placeholder="What are you not doing today? (e.g. no sugar, no doom-scroll)"
                aria-label="New 30-day counter"
                className="flex-1 min-w-0 bg-white/5 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-white/25"
              />
              <button
                onClick={() => { const t = counterDraft.trim(); if (t && !counters.some((c) => c.label === t)) { onCounters([...counters, { label: t, startDate: today }]); setCounterDraft("") } }}
                disabled={!counterDraft.trim()}
                className="text-[11px] px-2.5 py-1 rounded-md border border-amber-400/40 text-amber-200 hover:bg-amber-500/10 disabled:opacity-30 transition-colors"
              >Start day 1</button>
            </div>
          </div>

          {/* Thank-you / goodbye letters */}
          <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3 mb-2">
            <button onClick={() => setLetterOpen((o) => !o)} aria-expanded={letterOpen} className="w-full flex items-center gap-2 text-left">
              <ChevronDown className={`size-3.5 text-zinc-500 shrink-0 transition-transform ${letterOpen ? "" : "-rotate-90"}`} />
              <span className="text-[11px] text-zinc-300">Write the letters — thank the habit, then say goodbye{letters.length > 0 ? ` (${letters.length} written)` : ""}</span>
            </button>
            {letterOpen && (
              <div className="mt-2">
                <p className="text-[10px] text-zinc-500 mb-1.5">Every habit served a need. That&apos;s why it stuck. Thank it honestly for what it did for you; THEN end the relationship in writing. Two letters, same sitting.</p>
                <input
                  value={letterHabit}
                  onChange={(e) => setLetterHabit(e.target.value)}
                  placeholder="The habit (e.g. late-night scrolling)"
                  aria-label="Letter habit"
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-white/25 mb-1.5"
                />
                <textarea
                  value={letterThanks}
                  onChange={(e) => setLetterThanks(e.target.value)}
                  rows={2}
                  placeholder={`"Thank you for…" — what did it give you? Escape? Company? Say it straight.`}
                  aria-label="Thank-you letter"
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-white/25 mb-1.5 resize-none"
                />
                <textarea
                  value={letterBye}
                  onChange={(e) => setLetterBye(e.target.value)}
                  rows={2}
                  placeholder={`"Goodbye, this is over because…" — and what takes its place.`}
                  aria-label="Goodbye letter"
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-white/25 mb-1.5 resize-none"
                />
                {/* v23 — this used to demand all three fields before it would
                    save anything, so a half-written goodbye letter was lost the
                    moment the panel closed. The thank-you comes first on
                    purpose; the goodbye can be finished later. */}
                <button
                  onClick={() => {
                    const h = letterHabit.trim()
                    if (!h || !letterThanks.trim()) return
                    onLetters([...letters.filter((l) => l.habit !== h), { habit: h, thankYou: letterThanks.trim(), goodbye: letterBye.trim(), date: today }])
                    setLetterHabit(""); setLetterThanks(""); setLetterBye("")
                  }}
                  disabled={!letterHabit.trim() || !letterThanks.trim()}
                  className="text-[11px] px-2.5 py-1 rounded-md border border-amber-400/40 text-amber-200 hover:bg-amber-500/10 disabled:opacity-30 transition-colors"
                >{letterBye.trim() ? "Sign both letters" : "Save what I have"}</button>
                {letters.length > 0 && (
                  <ul className="mt-2 space-y-1">
                    {letters.map((l) => (
                      <li key={l.habit} className="flex items-center gap-2 text-[11px] text-zinc-400">
                        <span className="min-w-0 truncate">&ldquo;{l.habit}&rdquo; — signed {l.date}</span>
                        <span className="ml-auto flex items-center gap-2 shrink-0">
                          <CopyButton label="Copy" getText={() => `THANK YOU, ${l.habit.toUpperCase()}\n${l.thankYou}\n\nGOODBYE\n${l.goodbye}\n\nSigned ${l.date}`} />
                          <button onClick={() => onLetters(letters.filter((x) => x.habit !== l.habit))} aria-label={`Delete letters for ${l.habit}`} className="text-zinc-600 hover:text-zinc-300">×</button>
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>

          {/* Belief swap → incantation deck */}
          <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
            <p className="text-[10px] text-zinc-500 mb-1.5">Belief swap. The utility test: not &ldquo;is it true?&rdquo; but <span className="text-zinc-300">&ldquo;does holding it get me the life I said I want?&rdquo;</span> If not, engineer its replacement.</p>
            <input
              value={beliefOld}
              onChange={(e) => { setBeliefOld(e.target.value); setBeliefSaved(false) }}
              placeholder={`The belief that's costing you — "I'm bad with money", "people like me don't…"`}
              aria-label="Limiting belief"
              className="w-full bg-white/5 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-white/25 mb-1.5"
            />
            <input
              value={beliefNew}
              onChange={(e) => { setBeliefNew(e.target.value); setBeliefSaved(false) }}
              placeholder={`Its replacement, present tense — "Every dollar I manage grows"`}
              aria-label="Replacement belief"
              className="w-full bg-white/5 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-white/25 mb-1.5"
            />
            {/* v23 — the limiting belief itself used to be thrown away here:
                only the replacement survived, as an incantation string. The
                belief-work store has an `old` field designed for exactly this,
                and the Guide's belief exercise already uses it — so this widget
                writes to the same place instead of its own lossy local state. */}
            <button
              onClick={() => {
                if (!beliefNew.trim()) return
                onAddIncantation(beliefNew.trim())
                if (beliefOld.trim()) onLogBelief(beliefOld.trim(), beliefNew.trim())
                setBeliefSaved(true)
              }}
              disabled={!beliefNew.trim() || beliefSaved}
              className="text-[11px] px-2.5 py-1 rounded-md border border-violet-400/40 text-violet-200 hover:bg-violet-500/15 disabled:opacity-30 transition-colors"
            >{beliefSaved ? "In your incantation deck, speak it daily" : "Add replacement to my incantation deck"}</button>
            {beliefSaved && beliefOld.trim() && (
              <p className="text-[10px] text-zinc-600 mt-1.5">Kept in your belief work, so you can come back and stack evidence against it.</p>
            )}
          </div>
        </div>

        <p className="text-[10px] text-zinc-600 mt-3">A bad hour is weather. The plan is still there.</p>
      </div>
    </div>
  )
}

/** v13 — the money system, shown when Money Tuesday is due: jars, weekly
 * agenda, rules, debt protocol. Teaching surface — the numbers are HIS. */
function MoneySystemCard() {
  const [open, setOpen] = useState(false)
  const [showDebt, setShowDebt] = useState(false)
  return (
    <div className="mt-1.5 rounded-lg border border-lime-400/20 bg-lime-500/[0.04]">
      <button onClick={() => setOpen((o) => !o)} aria-expanded={open} className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-white/[0.04] transition-colors">
        <ChevronDown className={`size-3.5 text-zinc-500 shrink-0 transition-transform ${open ? "" : "-rotate-90"}`} />
        <span className="text-[11px] text-lime-200/90">The money system. The agenda for this ritual</span>
      </button>
      {open && (
        <div className="px-4 pb-3">
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-500 mb-1">The jars. Every dollar gets a job (T. Harv Eker&apos;s system)</p>
          <div className="space-y-1 mb-2.5">
            {MONEY_JARS.map((j) => (
              <div key={j.name} className="flex items-baseline gap-2">
                <span className="text-xs text-zinc-200 w-36 shrink-0">{j.name}</span>
                <span className="text-xs tabular-nums text-lime-300 w-9 shrink-0">{j.pct}%</span>
                <span className="text-[10px] text-zinc-500 min-w-0">{j.blurb}</span>
              </div>
            ))}
          </div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-500 mb-1">{MONEY_WEEKLY_RITUAL.title}</p>
          <ol className="space-y-0.5 mb-1.5">
            {MONEY_WEEKLY_RITUAL.steps.map((st, i) => (
              <li key={st} className="text-[11px] text-zinc-300"><span className="text-zinc-600 tabular-nums mr-1.5">{i + 1}.</span>{st}</li>
            ))}
          </ol>
          <p className="text-[10px] text-zinc-600 mb-2">{MONEY_WEEKLY_RITUAL.why}</p>
          <ul className="space-y-0.5 mb-2">
            {MONEY_RULES.map((r) => (
              <li key={r.text} className="text-[10px] text-zinc-500">· {r.text}</li>
            ))}
          </ul>
          <button onClick={() => setShowDebt((x) => !x)} aria-expanded={showDebt} className="text-[10px] text-zinc-600 hover:text-zinc-400 transition-colors">
            {showDebt ? "hide" : "in debt? the payoff protocol"}
          </button>
          {showDebt && (
            <ol className="mt-1 space-y-0.5">
              {MONEY_DEBT_PROTOCOL.steps.map((st, i) => (
                <li key={st} className="text-[10px] text-zinc-500"><span className="tabular-nums mr-1">{i + 1}.</span>{st}</li>
              ))}
            </ol>
          )}
        </div>
      )}
    </div>
  )
}

/** v13 — the relationship journal session script, shown when the journal
 * ritual is due. A couple exercise done in a real notebook — this is the
 * agenda, copyable. */
function JournalScriptCard() {
  const [open, setOpen] = useState(false)
  return (
    <div className="mt-1.5 rounded-lg border border-rose-400/20 bg-rose-500/[0.04]">
      <div className="w-full flex items-center gap-2 px-3 py-2">
        <button onClick={() => setOpen((o) => !o)} aria-expanded={open} className="flex items-center gap-2 flex-1 min-w-0 text-left hover:bg-white/[0.04] transition-colors rounded-md">
          <ChevronDown className={`size-3.5 text-zinc-500 shrink-0 transition-transform ${open ? "" : "-rotate-90"}`} />
          <span className="text-[11px] text-rose-200/90">The session script. Step by step, for the two of you</span>
        </button>
        <span className="shrink-0">
          <CopyButton label="Copy script" getText={() => [
            "RELATIONSHIP JOURNAL. SESSION SCRIPT",
            RELATIONSHIP_JOURNAL_SCRIPT.container,
            "",
            ...RELATIONSHIP_JOURNAL_SCRIPT.steps.map((st, i) => `${i + 1}. ${st.title}\n   ${st.detail}`),
          ].join("\n")} />
        </span>
      </div>
      {open && (
        <div className="px-4 pb-3">
          <p className="text-[10px] text-zinc-500 mb-1.5">{RELATIONSHIP_JOURNAL_SCRIPT.container}</p>
          <p className="text-[10px] text-zinc-600 mb-2">{RELATIONSHIP_JOURNAL_SCRIPT.cadence}</p>
          <ol className="space-y-1.5">
            {RELATIONSHIP_JOURNAL_SCRIPT.steps.map((st, i) => (
              <li key={st.title}>
                <p className="text-[11px] text-zinc-200"><span className="text-zinc-600 tabular-nums mr-1.5">{i + 1}.</span>{st.title}</p>
                <p className="text-[10px] text-zinc-500 ml-4">{st.detail}</p>
              </li>
            ))}
          </ol>
          <p className="text-[10px] text-zinc-600 mt-2">The six needs: {SIX_NEEDS.join(" · ")}.</p>
        </div>
      )}
    </div>
  )
}

/** PLM timeframe chip: the goal's horizon bucket + countdown when dated. */
function HorizonChip({ goal, today }: { goal: VisionGoalDraft; today: string }) {
  const h = goalHorizon(goal, today)
  const meta = HORIZON_META[h]
  const countdown = goal.targetDate ? formatCountdown(goal.targetDate, new Date(today + "T00:00:00")) : null
  return (
    <span
      className="text-[10px] px-2 py-0.5 rounded-full border tabular-nums"
      style={{ color: meta.color, borderColor: `${meta.color}59`, backgroundColor: `${meta.color}1a` }}
      title={`${meta.label} horizon — ${meta.sublabel}`}
    >
      {meta.label}
      {countdown && <span className="opacity-75"> · {countdown}</span>}
    </span>
  )
}

/**
 * PLM morning-ritual builder (plan mode): 15/30/60-minute presets seed an
 * ORDERED checklist; steps can be toggled from the library, reordered, and the
 * total minutes are always visible. The ritual never enters the balancer.
 */
/** The ritual DESIGN method, step 1: audit what you already do each morning and
 * mark each act empowering (↑) or draining (↓). The draining ones are the
 * redesign targets.
 *
 * v23 — this was local state ("a worksheet, not stored state"), so 6-10 typed
 * lines and their marks vanished on navigation, and so did the derived
 * "N draining acts" list. Those acts are precisely what the designed ritual is
 * supposed to replace, so they have to survive next to it. Now persisted. */
function RitualAudit({ items, onChange }: {
  items: Array<{ id: string; text: string; mark: "up" | "down" | null }>
  onChange: (fn: (prev: Array<{ id: string; text: string; mark: "up" | "down" | null }>) => Array<{ id: string; text: string; mark: "up" | "down" | null }>) => void
}) {
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState("")
  const add = () => {
    const t = draft.trim()
    if (!t) return
    // Updater form: a burst of Adds must not read the same render's copy.
    onChange((prev) => (prev.some((i) => i.text === t) ? prev : [...prev, { id: `ra-${prev.length}-${t.slice(0, 12)}`, text: t, mark: null }]))
    setDraft("")
  }
  const down = items.filter((i) => i.mark === "down")
  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.02] mb-3">
      <button onClick={() => setOpen((o) => !o)} aria-expanded={open} className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-white/[0.04] transition-colors">
        <ChevronDown className={`size-3.5 text-zinc-500 shrink-0 transition-transform ${open ? "" : "-rotate-90"}`} />
        <span className="text-[11px] text-zinc-400">Step 1. Audit your CURRENT morning first (you already have a ritual; you just didn&apos;t design it)</span>
      </button>
      {open && (
        <div className="px-3 pb-3">
          <p className="text-[10px] text-zinc-500 mb-1.5">Write out what actually happens from waking to leaving, one act per line. Then mark each: does it lift you (↑) or drain you (↓)?</p>
          <div className="flex items-center gap-2 mb-1.5">
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") add() }}
              placeholder="e.g. scroll phone in bed, coffee, check email…"
              aria-label="Add a current-morning act"
              className="flex-1 min-w-0 bg-white/5 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-white/25"
            />
            <button onClick={add} disabled={!draft.trim()} className="text-[11px] px-2.5 py-1 rounded-md border border-white/15 text-zinc-300 hover:bg-white/10 disabled:opacity-30 transition-colors">Add</button>
          </div>
          {items.length > 0 && (
            <ul className="space-y-1">
              {items.map((it, i) => (
                <li key={it.id} className="flex items-center gap-2 text-xs text-zinc-300">
                  <span className="min-w-0">{it.text}</span>
                  <span className="ml-auto flex items-center gap-1 shrink-0">
                    {([["↑", "up"], ["↓", "down"]] as const).map(([sym, val]) => (
                      <button
                        key={sym}
                        onClick={() => onChange((p) => p.map((x, j) => (j === i ? { ...x, mark: val } : x)))}
                        aria-pressed={it.mark === val}
                        aria-label={`${it.text}: ${val === "up" ? "empowering" : "draining"}`}
                        className={`text-[11px] px-1.5 py-0.5 rounded border transition-colors ${it.mark === val ? (val === "up" ? "border-emerald-400/60 bg-emerald-500/20 text-emerald-200" : "border-red-400/60 bg-red-500/20 text-red-200") : "border-white/15 text-zinc-500 hover:text-zinc-300"}`}
                      >
                        {sym}
                      </button>
                    ))}
                    <button
                      onClick={() => onChange((p) => p.filter((_, j) => j !== i))}
                      aria-label={`Remove ${it.text}`}
                      className="text-[11px] px-1 text-zinc-600 hover:text-zinc-300 transition-colors"
                    >
                      ×
                    </button>
                  </span>
                </li>
              ))}
            </ul>
          )}
          {down.length > 0 && (
            <p className="text-[10px] text-amber-300/80 mt-2">
              {down.length} draining act{down.length === 1 ? "" : "s"} — {down.map((d) => `“${d.text}”`).join(", ")}. Each one gets REPLACED by a step below, not just deleted: a habit leaves a hole, and the hole refills itself.
            </p>
          )}
        </div>
      )}
    </div>
  )
}

function RitualBuilder({
  ritual,
  vision,
  onPreset,
  onToggleStep,
  onMove,
  onClear,
  onWeeklyToggle,
  auditItems,
  onAuditChange,
}: {
  ritual: VisionRitual | null
  vision?: string
  auditItems: Array<{ id: string; text: string; mark: "up" | "down" | null }>
  onAuditChange: (fn: (prev: Array<{ id: string; text: string; mark: "up" | "down" | null }>) => Array<{ id: string; text: string; mark: "up" | "down" | null }>) => void
  onPreset: (preset: 15 | 30 | 60) => void
  onToggleStep: (item: { id: string; title: string; minutes: number }) => void
  onMove: (index: number, dir: -1 | 1) => void
  onClear: () => void
  onWeeklyToggle: (w: VisionWeeklyRitual) => void
}) {
  const inRitual = new Set(ritual?.items.map((i) => i.id) ?? [])
  const inWeekly = new Set(ritual?.weekly?.map((w) => w.id) ?? [])
  const coverage = ritualCoverage(ritual, RITUAL_DIMENSIONS)
  return (
    <>
    <RitualAudit items={auditItems} onChange={onAuditChange} />
    {vision?.trim() && (
      <div className="rounded-lg border border-violet-400/20 bg-violet-500/[0.05] px-3 py-2 mb-3">
        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-violet-200/80 mb-0.5">Step 2. Design it FROM the vision</p>
        <p className="text-[11px] text-zinc-400 line-clamp-2">{vision.trim()}</p>
        <p className="text-[10px] text-zinc-500 mt-1">Read it. Which 2-3 morning acts would make THAT person inevitable? Pick those below. The ritual is there to serve the vision.</p>
      </div>
    )}
    <div className="grid gap-4 md:grid-cols-2 items-start">
      <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-500">Start from a preset</span>
        </div>
        <div className="flex items-center gap-2 mt-2">
          {([15, 30, 60] as const).map((p) => (
            <button
              key={p}
              onClick={() => onPreset(p)}
              className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${ritual?.preset === p ? "border-violet-400/50 bg-violet-500/15 text-violet-200" : "border-white/15 text-zinc-300 hover:bg-white/10"}`}
            >
              {p} min
            </button>
          ))}
          {ritual && (
            <button onClick={onClear} className="ml-auto text-[10px] text-zinc-600 hover:text-red-300 transition-colors">clear ritual</button>
          )}
        </div>
        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-500 mt-4">Or pick steps</p>
        <ul className="mt-2 space-y-1">
          {RITUAL_LIBRARY.map((item) => {
            const added = inRitual.has(item.id)
            return (
              <li key={item.id}>
                <button
                  onClick={() => onToggleStep(item)}
                  aria-pressed={added}
                  className={`w-full flex items-center gap-2.5 rounded-lg border px-3 py-1.5 text-left transition-all ${added ? "border-violet-500/30 bg-violet-500/10" : "border-white/10 bg-white/[0.03] hover:bg-white/[0.06]"}`}
                >
                  <span className={`size-4 rounded-md border flex items-center justify-center shrink-0 transition-colors ${added ? "bg-violet-400/80 border-violet-300" : "border-white/25"}`}>
                    {added ? <Check className="size-2.5 text-zinc-950" /> : <Plus className="size-2.5 text-zinc-400" />}
                  </span>
                  <span className={`text-sm ${added ? "text-zinc-300" : "text-zinc-100"}`}>{item.title}</span>
                  <span className="ml-auto text-[11px] text-zinc-500 tabular-nums shrink-0">{item.minutes}m</span>
                </button>
              </li>
            )
          })}
        </ul>
      </div>
      <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-500">Your ritual, in order</span>
          {ritual && (
            <span className="ml-auto text-[11px] text-zinc-400 tabular-nums">~{ritualMinutes(ritual)} min every morning</span>
          )}
        </div>
        {!ritual ? (
          <p className="text-sm text-zinc-500 mt-3">
            No ritual yet. Pick a preset or steps on the left. It becomes a daily checklist at the top of your Track view.
            On chaotic days, any ONE step counts. Consistency beats duration.
          </p>
        ) : (
          <ol className="mt-2 space-y-1">
            {ritual.items.map((item, i) => (
              <li key={item.id} className="group/rit flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-1.5">
                <span className="text-[10px] font-bold size-4.5 rounded-full flex items-center justify-center shrink-0 tabular-nums bg-violet-500/20 text-violet-300">
                  {i + 1}
                </span>
                <span className="text-sm text-zinc-200">{item.title}</span>
                <span className="ml-auto flex items-center gap-0.5 shrink-0">
                  <span className="text-[11px] text-zinc-500 tabular-nums mr-1">{item.minutes}m</span>
                  <button
                    onClick={() => onMove(i, -1)}
                    disabled={i === 0}
                    aria-label={`Move ${item.title} earlier`}
                    className="size-4.5 rounded border border-white/10 text-zinc-500 hover:bg-white/10 disabled:opacity-25 flex items-center justify-center"
                  ><ChevronDown className="size-3 rotate-180" /></button>
                  <button
                    onClick={() => onMove(i, 1)}
                    disabled={i === ritual.items.length - 1}
                    aria-label={`Move ${item.title} later`}
                    className="size-4.5 rounded border border-white/10 text-zinc-500 hover:bg-white/10 disabled:opacity-25 flex items-center justify-center"
                  ><ChevronDown className="size-3" /></button>
                  <button
                    onClick={() => onToggleStep(item)}
                    aria-label={`Remove ${item.title} from ritual`}
                    className="size-4.5 rounded text-zinc-600 hover:text-red-300 flex items-center justify-center opacity-0 group-hover/rit:opacity-100 transition-all"
                  ><X className="size-3" /></button>
                </span>
              </li>
            ))}
          </ol>
        )}
        {/* v10 — his coverage rule: mind, body and spirit at minimum */}
        {ritual && (
          <div className="flex items-center gap-2 mt-3 flex-wrap">
            <span className="text-[9px] uppercase tracking-wide text-zinc-600">Coverage</span>
            {(["mind", "body", "spirit"] as const).map((d) => (
              <span key={d} className={`text-[10px] px-2 py-0.5 rounded-full border ${coverage[d] ? "border-emerald-400/40 text-emerald-300" : "border-amber-400/40 text-amber-300"}`}>
                {coverage[d] ? "✓" : "✗"} {d}
              </span>
            ))}
            {!(coverage.mind && coverage.body && coverage.spirit) && (
              <span className="text-[10px] text-amber-300/80">the floor: touch all three every morning, even one minute each.</span>
            )}
          </div>
        )}
      </div>
    </div>
    {/* v10 — the ritual MATRIX: weekly per-area rituals beyond the morning */}
    <div className="mt-4 rounded-xl border border-white/10 bg-white/[0.03] p-4">
      <div className="flex items-center gap-2">
        <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-500">The week, and month, have rituals too</span>
        {!ritual && <span className="text-[10px] text-zinc-600">build the morning ritual first</span>}
      </div>
      <ul className="mt-2 grid gap-1 sm:grid-cols-2">
        {WEEKLY_RITUAL_LIBRARY.map((w) => {
          const added = inWeekly.has(w.id)
          return (
            <li key={w.id}>
              <button
                onClick={() => onWeeklyToggle(w)}
                disabled={!ritual}
                aria-pressed={added}
                className={`w-full flex items-center gap-2.5 rounded-lg border px-3 py-1.5 text-left transition-all disabled:opacity-40 ${added ? "border-violet-500/30 bg-violet-500/10" : "border-white/10 bg-white/[0.03] hover:bg-white/[0.06]"}`}
              >
                <span className={`size-4 rounded-md border flex items-center justify-center shrink-0 transition-colors ${added ? "bg-violet-400/80 border-violet-300" : "border-white/25"}`}>
                  {added ? <Check className="size-2.5 text-zinc-950" /> : <Plus className="size-2.5 text-zinc-400" />}
                </span>
                <span className={`text-xs min-w-0 ${added ? "text-zinc-300" : "text-zinc-100"}`}>{w.title}</span>
                <span className="ml-auto text-[10px] text-zinc-500 shrink-0">{w.monthlyDay != null ? `monthly · day ${w.monthlyDay}` : `${["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"][w.weekday]}${w.everyOtherWeek ? " · biweekly" : ""}`}</span>
              </button>
            </li>
          )
        })}
      </ul>
      <p className="text-[10px] text-zinc-600 mt-2">Examples: Money Tuesday and the relationship journal. They show up on Track on their day. The quarterly and yearly rhythms (net worth, annual review) live in the monthly report and the year-in-review.</p>
    </div>
    </>
  )
}

/** M5 — Stefan's 8 morning questions, shown when the ritual includes that step.
 * "Whatever you focus on you feel — and what controls your focus are questions." */
function EmpoweringQuestions() {
  const [open, setOpen] = useState(false)
  // v9 — his practice is ONE question at a time, felt before the next; a list
  // invites skimming. idx === EMPOWERING_QUESTIONS.length → finished.
  const [idx, setIdx] = useState(0)
  const finished = idx >= EMPOWERING_QUESTIONS.length
  return (
    <div className="mt-2 rounded-lg border border-white/10 bg-white/[0.02]">
      <button
        onClick={() => { setOpen((o) => !o); setIdx(0) }}
        aria-expanded={open}
        className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-white/[0.04] transition-colors"
      >
        <ChevronDown className={`size-3.5 text-zinc-500 shrink-0 transition-transform ${open ? "" : "-rotate-90"}`} />
        <span className="text-[11px] text-zinc-400">The 8 questions. One at a time, out loud, and FEEL each answer</span>
      </button>
      {open && (
        <div className="px-4 pb-3">
          {finished ? (
            <>
              <p className="text-xs text-emerald-200">All eight, felt. Carry the state into the day.</p>
              <button onClick={() => setIdx(0)} className="mt-1.5 text-[10px] text-zinc-600 hover:text-zinc-400 transition-colors">run them again</button>
            </>
          ) : (
            <>
              <p className="text-[10px] text-violet-300/80 tabular-nums mb-1">{idx + 1} of {EMPOWERING_QUESTIONS.length}</p>
              <p className="text-sm text-zinc-100">{EMPOWERING_QUESTIONS[idx]}</p>
              <p className="text-[10px] text-violet-200/70 mt-1">Then the follow-up: {QUESTION_FOLLOW_UP}</p>
              <p className="text-[10px] text-zinc-600 mt-1">Ask it out loud. Sit in the answer until you FEEL it. Then move on. Stuck? &ldquo;What COULD I be happy about?&rdquo;</p>
              <div className="flex items-center gap-2 mt-2">
                <button
                  onClick={() => setIdx((i) => i + 1)}
                  className="text-[11px] px-3 py-1 rounded-md border border-violet-400/40 text-violet-200 hover:bg-violet-500/15 transition-colors"
                >
                  Felt it, next
                </button>
                {idx > 0 && (
                  <button onClick={() => setIdx((i) => Math.max(0, i - 1))} className="text-[10px] text-zinc-600 hover:text-zinc-400 transition-colors">back</button>
                )}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}

/** v10 — small countdown for timed exercises (his brainstorms are TIMED: the
 * clock switches off the editor in your head). */
function ExerciseTimer({ minutes, label }: { minutes: number; label: string }) {
  const [endsAt, setEndsAt] = useState<number | null>(null)
  const [left, setLeft] = useState(minutes * 60)
  useEffect(() => {
    if (endsAt === null) { setLeft(minutes * 60); return }
    const tick = () => setLeft(Math.max(0, Math.round((endsAt - Date.now()) / 1000)))
    tick()
    const t = setInterval(tick, 1000)
    return () => clearInterval(t)
  }, [endsAt, minutes])
  const finished = endsAt !== null && left === 0
  const mm = String(Math.floor(left / 60)).padStart(2, "0")
  const ss = String(left % 60).padStart(2, "0")
  if (endsAt === null) {
    return (
      <button onClick={() => setEndsAt(Date.now() + minutes * 60_000)}
        className="text-[10px] px-2 py-0.5 rounded-md border border-violet-400/40 text-violet-200 hover:bg-violet-500/15 transition-colors">
        {label}
      </button>
    )
  }
  return (
    <span className="flex items-center gap-1.5">
      <span className={`text-xs tabular-nums ${finished ? "text-emerald-300" : "text-violet-200"}`}>{finished ? "time — pens down" : `${mm}:${ss}`}</span>
      <button onClick={() => setEndsAt(null)} className="text-[10px] text-zinc-600 hover:text-zinc-400 transition-colors">{finished ? "reset" : "stop"}</button>
    </span>
  )
}

/** v8 — his One Thing rule: the hardest must gets 60 focused minutes, before
 * email, before everything. Client-side countdown; leaving the page resets it
 * (the practice is the sit-down, not the log). */
function OneThingTimer({ title }: { title: string }) {
  const [endsAt, setEndsAt] = useState<number | null>(null)
  const [left, setLeft] = useState(3600)
  useEffect(() => {
    if (endsAt === null) { setLeft(3600); return }
    const tick = () => setLeft(Math.max(0, Math.round((endsAt - Date.now()) / 1000)))
    tick()
    const t = setInterval(tick, 1000)
    return () => clearInterval(t)
  }, [endsAt])
  const finished = endsAt !== null && left === 0
  const mm = String(Math.floor(left / 60)).padStart(2, "0")
  const ss = String(left % 60).padStart(2, "0")
  return (
    <div className="mb-4 rounded-lg border border-amber-400/25 bg-amber-500/[0.06] px-3 py-2">
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-amber-300/90 shrink-0">The One Thing</span>
        <span className="text-xs text-zinc-200 min-w-0">{title}</span>
        <span className="ml-auto flex items-center gap-2 shrink-0">
          {endsAt === null ? (
            <button onClick={() => setEndsAt(Date.now() + 3600_000)}
              className="text-[10px] px-2.5 py-1 rounded-md border border-amber-400/40 bg-amber-500/10 text-amber-200 hover:bg-amber-500/20 transition-colors">
              Start 60 minutes
            </button>
          ) : finished ? (
            <button onClick={() => setEndsAt(null)}
              className="text-[10px] px-2.5 py-1 rounded-md border border-emerald-500/40 bg-emerald-500/10 text-emerald-200 hover:bg-emerald-500/20 transition-colors">
              60 minutes done. Celebrate it, then check it off
            </button>
          ) : (
            <>
              <span className="text-xs tabular-nums text-amber-200">{mm}:{ss}</span>
              <button onClick={() => setEndsAt(null)} className="text-[10px] text-zinc-600 hover:text-zinc-400 transition-colors">stop</button>
            </>
          )}
        </span>
      </div>
      {endsAt === null && (
        <p className="text-[10px] text-zinc-500 mt-1">Before email, before messages. Willpower is highest now. One block, one thing, sixty minutes.</p>
      )}
    </div>
  )
}

/** Small text pill that stars/unstars an item as one of today's ≤5 musts. */
function MustToggle({ starred, disabled, onToggle, label }: { starred: boolean; disabled: boolean; onToggle: () => void; label: string }) {
  return (
    <button
      onClick={(e) => { e.stopPropagation(); onToggle() }}
      disabled={disabled && !starred}
      aria-pressed={starred}
      aria-label={`${starred ? "Unmark" : "Mark"} ${label} as a must item`}
      title={disabled && !starred ? `Max ${MAX_MUST_ITEMS} must items — unstar something first` : "RPM: your 3-5 must items for today"}
      className={`text-[9px] font-semibold uppercase tracking-wide px-1.5 py-px rounded-full border shrink-0 transition-colors ${starred ? "border-amber-400/50 bg-amber-500/15 text-amber-300" : "border-white/15 text-zinc-500 hover:text-zinc-300 hover:border-white/30 disabled:opacity-30 disabled:cursor-not-allowed"}`}
    >
      must
    </button>
  )
}

/** Inline "add to today" row — free-text could-do items for the RPM day plan. */
function AddAdhocRow({ onAdd }: { onAdd: (title: string) => void }) {
  const [title, setTitle] = useState("")
  const commit = () => {
    if (!title.trim()) return
    onAdd(title.trim())
    setTitle("")
  }
  return (
    <div className="flex items-center gap-2 mt-2">
      <Plus className="size-3.5 shrink-0 text-zinc-600" />
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onKeyDown={(e) => { if (e.key === "Enter") commit() }}
        placeholder="Add something to today… (unfinished items roll to tomorrow)"
        aria-label="Add something to today"
        className="flex-1 min-w-0 bg-transparent border-b border-white/10 focus:border-white/30 text-sm text-zinc-200 placeholder:text-zinc-600 focus:outline-none py-0.5 transition-colors"
      />
      <button
        onClick={commit}
        disabled={!title.trim()}
        className="text-[11px] px-2 py-0.5 rounded-md border border-white/15 text-zinc-300 hover:bg-white/10 disabled:opacity-30 transition-colors"
      >Add</button>
    </div>
  )
}

/**
 * PLM Weekly Evaluation Ritual — Stefan's practice, faithfully: rate ALL 12
 * Blueprint areas 1-10 against YOUR ideal, see last week's score beside each
 * ("you're a 2 — how can you get to a 3 next week?"), amber under his 7+
 * success line, one honest note, pick next week's focus area.
 */
function WeeklyReviewForm({
  window: win,
  weekIndex,
  weekRollups,
  prevRatings,
  untouchedAreaIds,
  addedHabitIds,
  focusAreaIds,
  onRaise,
  onSave,
  draft,
  onDraft,
  labels,
  vision,
  purpose,
  topValues,
  tensDefined,
}: {
  window: { start: string; end: string }
  weekIndex: number
  weekRollups: Array<{ goal: VisionGoalDraft; done: number; expected: number }>
  prevRatings: Record<string, number> | null
  untouchedAreaIds: string[]
  addedHabitIds: Set<string>
  focusAreaIds?: string[]
  onRaise: (areaId: string) => void
  onSave: (review: VisionWeeklyReview) => void
  draft?: VisionWeeklyDraft | null
  onDraft: (patch: Partial<VisionWeeklyDraft>) => void
  labels?: Record<string, string>
  vision?: string
  purpose?: string
  topValues?: string[]
  tensDefined?: Set<string>
}) {
  // v23 — this form is the single largest block of writing in the product (12
  // sliders, 4 reflections, 3 outcomes, unlimited captures, the honest note),
  // and every character of it used to live in component state behind a Save
  // button that stayed DISABLED until all twelve areas were rated. Rate eleven,
  // write the lesson and three outcomes, click anything — all gone. State now
  // seeds from a persisted draft and every edit writes back through `onDraft`.
  const seed = draft && draft.weekStart === win.start ? draft : null
  const [ratings, setRatingsRaw] = useState<Record<string, number>>(seed?.areaRatings ?? {})
  const [note, setNoteRaw] = useState(seed?.note ?? "")
  const [focus, setFocusRaw] = useState<string | null>(seed?.focusPillarId ?? null)
  // PLM OS M4 — reflection + committed outcomes.
  const [magicMoment, setMagicMomentRaw] = useState(seed?.magicMoment ?? "")
  const [accomplishment, setAccomplishmentRaw] = useState(seed?.accomplishment ?? "")
  const [lesson, setLessonRaw] = useState(seed?.lesson ?? "")
  const [challenge, setChallengeRaw] = useState(seed?.challenge ?? "")
  const [outcomes, setOutcomesRaw] = useState<VisionWeeklyOutcome[]>(seed?.outcomes ?? [])
  // v10 — capture-everything (RPM Capture→Categorize).
  const [captures, setCapturesRaw] = useState<Array<{ text: string; areaId: string | null }>>(seed?.captures ?? [])
  const [captureDraft, setCaptureDraft] = useState("")
  // Each setter mirrors into the persisted draft. Updater-function form
  // throughout, because a burst of clicks (rating five areas quickly) otherwise
  // reads the same render's copy and loses all but the last — a bug this file
  // has already shipped three times.
  const mirror = <T,>(set: React.Dispatch<React.SetStateAction<T>>, key: keyof VisionWeeklyDraft) =>
    (v: React.SetStateAction<T>) =>
      set((prev) => {
        const next = typeof v === "function" ? (v as (p: T) => T)(prev) : v
        onDraft({ [key]: next } as Partial<VisionWeeklyDraft>)
        return next
      })
  const setRatings = mirror(setRatingsRaw, "areaRatings")
  const setNote = mirror(setNoteRaw, "note")
  const setFocus = mirror(setFocusRaw, "focusPillarId")
  const setMagicMoment = mirror(setMagicMomentRaw, "magicMoment")
  const setAccomplishment = mirror(setAccomplishmentRaw, "accomplishment")
  const setLesson = mirror(setLessonRaw, "lesson")
  const setChallenge = mirror(setChallengeRaw, "challenge")
  const setOutcomes = mirror(setOutcomesRaw, "outcomes")
  const setCaptures = mirror(setCapturesRaw, "captures")
  // v23 — honour the user's own names for their rooms here too.
  const areaLabel = (a: { id: string; label: string }) => labels?.[a.id] ?? a.label
  const ratedCount = LIFE_MASTERY_AREAS.filter((a) => ratings[a.id] != null).length
  const allRated = ratedCount === LIFE_MASTERY_AREAS.length
  const raiseAdded = (areaId: string): boolean => {
    const pick = RAISE_ACTIONS[areaId]
    return pick ? addedHabitIds.has(routineHabitId(pick.categoryId, pick.itemId)) : true
  }
  const raiseTitle = (areaId: string): string => {
    const pick = RAISE_ACTIONS[areaId]
    const cat = pick ? ROUTINE_CATEGORIES.find((c) => c.id === pick.categoryId) : undefined
    return cat?.items.find((i) => i.id === pick?.itemId)?.title ?? ""
  }
  const prefill = () => {
    if (!prevRatings) return
    const seed: Record<string, number> = {}
    for (const a of LIFE_MASTERY_AREAS) if (prevRatings[a.id] != null) seed[a.id] = prevRatings[a.id]
    setRatings((p) => ({ ...seed, ...p }))
  }
  return (
    <div className="rounded-2xl border border-violet-400/25 bg-gradient-to-br from-violet-500/[0.10] via-white/[0.03] to-transparent p-5 mb-8">
      <div className="flex items-center gap-2 mb-1">
        <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-violet-200/90">Weekly evaluation ritual</span>
        <span className="text-[10px] text-zinc-500">week {weekIndex} · {win.start} → {win.end}</span>
      </div>
      {/* v8 — HIS order: re-associate to the plan FIRST, rate second. The
          ritual opens on the life you designed, not on numbers. */}
      {(vision?.trim() || purpose?.trim()) && (
        <div className="mb-4 rounded-lg border border-violet-400/20 bg-violet-500/[0.06] px-3 py-2.5">
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-violet-200/90 mb-1">Step 1. Re-read your plan, out loud</p>
          {vision?.trim() && <p className="text-xs text-zinc-300 whitespace-pre-wrap">{vision.trim()}</p>}
          {purpose?.trim() && <p className="text-[11px] text-zinc-400 mt-1.5"><span className="text-zinc-500">Purpose:</span> {purpose.trim()}</p>}
          {(topValues?.length ?? 0) > 0 && (
            <p className="text-[10px] text-zinc-500 mt-1.5">Values: <span className="text-zinc-300">{topValues!.slice(0, 5).join(" · ")}</span></p>
          )}
          <p className="text-[10px] text-zinc-500 mt-1.5">Feel it again before you touch a single slider. You&apos;re not grading numbers, you&apos;re checking in on the life you designed.</p>
        </div>
      )}

      <p className="text-xs text-zinc-400 mb-4">
        Rate every area of your life against <span className="text-zinc-200">your</span> ideal — your 10 is different from anyone else&apos;s.
        You can&apos;t manage what you don&apos;t measure; honest numbers beat pretty ones. Aim for one level up in the areas you&apos;re working — {LIFE_MASTERY_SUCCESS_LEVEL}+ is the target, and the rest hold their floor while you push.
      </p>

      {weekRollups.length > 0 && (
        <ul className="mb-4 space-y-1">
          {weekRollups.map(({ goal, done, expected }) => (
            <li key={goal.id} className="flex items-center gap-2 text-xs text-zinc-300">
              <span className="size-1.5 rounded-full shrink-0" style={{ backgroundColor: goal.pillarColor }} />
              <span className="min-w-0 truncate">{goal.title}</span>
              <span className={`ml-auto tabular-nums shrink-0 ${done >= expected ? "text-emerald-300" : "text-amber-300"}`}>
                {done}/{expected} check-ins
              </span>
            </li>
          ))}
        </ul>
      )}

      {prevRatings && (
        <button
          onClick={prefill}
          className="mb-3 text-[11px] px-2.5 py-1 rounded-md border border-white/15 text-zinc-300 hover:bg-white/10 transition-colors"
        >
          Start from last week&apos;s scores
        </button>
      )}
      <div className="space-y-2.5">
        {LIFE_MASTERY_AREAS.map((a) => {
          const val = ratings[a.id]
          const prev = prevRatings?.[a.id]
          return (
            <div key={a.id} className="flex items-center gap-3" title={a.prompt}>
              <span className="w-32 shrink-0 min-w-0">
                <span className="block text-xs truncate" style={{ color: areaTextColor(a) }}>{areaLabel(a)}</span>
                <span className="block text-[9px] text-zinc-600 truncate">{tensDefined?.has(a.id) === false ? "no 10 defined, rating against what?" : a.sublabel}</span>
              </span>
              <input
                type="range"
                min={0}
                max={10}
                value={val ?? 5}
                onChange={(e) => setRatings((p) => ({ ...p, [a.id]: Number(e.target.value) }))}
                aria-label={`Rate ${areaLabel(a)} 0 to 10`}
                className={`flex-1 ${val == null ? "opacity-40" : ""}`}
                style={{ accentColor: val == null ? "#52525b" : a.color }}
              />
              <span className="w-16 text-right shrink-0">
                <button
                  onClick={() => setRatings((p) => ({ ...p, [a.id]: val ?? 5 }))}
                  aria-label={val == null ? `Confirm ${areaLabel(a)} at 5` : `${areaLabel(a)} rated ${val}`}
                  title={val == null ? "Tap to confirm 5, or slide to rate" : "Confirmed"}
                  className={`text-xs tabular-nums ${val == null ? "text-zinc-400 underline decoration-dotted hover:text-white" : val < LIFE_MASTERY_SUCCESS_LEVEL ? "text-amber-300" : "text-white"}`}
                >
                  {val ?? "–"}/10
                </button>
                {prev != null && <span className="block text-[9px] text-zinc-600 tabular-nums">last wk {prev}</span>}
                {/* his weakest-area rule: don't chase a 10, get the 2 to a 3 */}
                {val != null && val < LIFE_MASTERY_SUCCESS_LEVEL && (
                  <span className="block text-[9px] text-amber-300/80 tabular-nums">aim {val + 1} next wk</span>
                )}
              </span>
              {/* M4 — weak spot → one small raise-the-score action, one tap */}
              {val != null && val < LIFE_MASTERY_SUCCESS_LEVEL && !raiseAdded(a.id) && (
                <button
                  onClick={() => onRaise(a.id)}
                  title={`Add a small habit that lifts this area: "${raiseTitle(a.id)}"`}
                  className="text-[9px] font-semibold uppercase px-1.5 py-px rounded-full border border-amber-400/40 bg-amber-500/10 text-amber-300 hover:bg-amber-500/20 shrink-0 transition-colors"
                >
                  + fix
                </button>
              )}
            </div>
          )
        })}
      </div>
      {!allRated && (
        <p className="text-[10px] text-zinc-500 mt-2">
          {ratedCount} of {LIFE_MASTERY_AREAS.length} rated. The ritual is checking in with your WHOLE life, not just the loud parts — but you can save what you have and finish later.
        </p>
      )}

      {/* M4 — "you have to do something each week to grow every area" */}
      {untouchedAreaIds.length > 0 && (
        <div className="mt-4 rounded-lg border border-amber-400/25 bg-amber-500/[0.06] px-3 py-2">
          <p className="text-[11px] text-amber-200/90">
            No action this week in:{" "}
            {untouchedAreaIds.map((id, i) => {
              const a = LIFE_MASTERY_AREA_MAP.get(id)
              return a ? (
                <span key={id}>
                  {i > 0 && <span className="text-amber-200/50"> · </span>}
                  <span style={{ color: areaTextColor(a) }}>{areaLabel(a)}</span>
                </span>
              ) : null
            })}
          </p>
          <p className="text-[10px] text-zinc-500 mt-0.5">A maintenance area only has to hold its floor — a phone call counts. For a focus area under {LIFE_MASTERY_SUCCESS_LEVEL}, ask: &ldquo;What gets this one level up next week?&rdquo;</p>
        </div>
      )}

      {/* M4 — reflection: whatever gets rewarded gets repeated */}
      <div className="grid gap-2 sm:grid-cols-3 mt-4">
        <label className="block">
          <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-500">Magic moment</span>
          <input value={magicMoment} onChange={(e) => setMagicMoment(e.target.value)} placeholder="Best moment of the week…"
            className="mt-1 w-full bg-white/5 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-white/20 transition-colors" />
        </label>
        <label className="block">
          <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-500">Proudest accomplishment</span>
          <input value={accomplishment} onChange={(e) => setAccomplishment(e.target.value)} placeholder="What did you make happen?"
            className="mt-1 w-full bg-white/5 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-white/20 transition-colors" />
        </label>
        <label className="block">
          <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-500">Lesson learned</span>
          <input value={lesson} onChange={(e) => setLesson(e.target.value)} placeholder="What did last week teach you?"
            className="mt-1 w-full bg-white/5 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-white/20 transition-colors" />
      </label>
        <label className="block">
          <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-amber-300/70">Biggest challenge, root cause?</span>
          <input value={challenge} onChange={(e) => setChallenge(e.target.value)} placeholder="What actually caused it?"
            className="mt-1 w-full bg-white/5 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-white/20 transition-colors" />
        </label>
      </div>

      {/* v10 — RPM Capture→Categorize: empty the head, give every item a home */}
      <div className="mt-4">
        <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-500">Capture everything. Then give each item a home</span>
        <p className="text-[10px] text-zinc-600 mt-0.5">Everything circling in your head. Commitments, ideas, loose ends. Dump first, categorize after. Promote the real ones to outcomes (→); the rest stay PARKED here on purpose. A captured thought stops circling.</p>
        {captures.map((c, i) => (
          <div key={i} className="flex items-center gap-2 mt-1.5">
            <input
              value={c.text}
              onChange={(e) => setCaptures((p) => p.map((x, j) => (j === i ? { ...x, text: e.target.value } : x)))}
              aria-label={`Captured item ${i + 1}`}
              className="flex-1 min-w-0 bg-white/5 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-white/20"
            />
            <select
              value={c.areaId ?? ""}
              onChange={(e) => setCaptures((p) => p.map((x, j) => (j === i ? { ...x, areaId: e.target.value || null } : x)))}
              aria-label={`Area for captured item ${i + 1}`}
              className="bg-white/5 border border-white/10 rounded-md px-1.5 py-1 text-[11px] text-zinc-300 focus:outline-none shrink-0"
            >
              <option value="" className="bg-zinc-900">— area?</option>
              {LIFE_MASTERY_AREAS.map((a) => <option key={a.id} value={a.id} className="bg-zinc-900">{areaLabel(a)}</option>)}
            </select>
            <button
              onClick={() => {
                if (outcomes.length >= 3 || !c.text.trim()) return
                setOutcomes((p) => [...p, { areaId: c.areaId ?? focus ?? LIFE_MASTERY_AREAS[0].id, outcome: c.text.trim(), why: "" }])
                setCaptures((p) => p.filter((_, j) => j !== i))
              }}
              disabled={outcomes.length >= 3 || !c.text.trim()}
              title={outcomes.length >= 3 ? "Outcome slots full (max 3). Captured items stay parked here" : "Promote to next week's outcomes"}
              className="text-[10px] px-1.5 py-0.5 rounded-full border border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/10 disabled:opacity-30 shrink-0 transition-colors"
            >→ outcome</button>
            <button onClick={() => setCaptures((p) => p.filter((_, j) => j !== i))} aria-label={`Remove captured item ${i + 1}`} className="text-zinc-600 hover:text-red-300 shrink-0"><X className="size-3.5" /></button>
          </div>
        ))}
        <div className="flex items-center gap-2 mt-1.5">
          <input
            value={captureDraft}
            onChange={(e) => setCaptureDraft(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && captureDraft.trim()) { setCaptures((p) => [...p, { text: captureDraft.trim(), areaId: null }]); setCaptureDraft("") } }}
            placeholder="What's on your mind? Empty it here…"
            aria-label="Capture an item"
            className="flex-1 min-w-0 bg-white/5 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-white/20"
          />
          <button
            onClick={() => { if (captureDraft.trim()) { setCaptures((p) => [...p, { text: captureDraft.trim(), areaId: null }]); setCaptureDraft("") } }}
            disabled={!captureDraft.trim()}
            className="text-[11px] px-2.5 py-1 rounded-md border border-white/15 text-zinc-300 hover:bg-white/10 disabled:opacity-30 transition-colors"
          >Capture</button>
        </div>
      </div>

      {/* M4 — next week's committed outcomes (max 3), each with its why */}
      <div className="mt-4">
        <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-500">Next week&apos;s outcomes. With the why, ON a day</span>
        {outcomes.map((o, i) => (
          <div key={i} className="flex items-center gap-2 mt-1.5">
            <select
              value={o.areaId}
              onChange={(e) => setOutcomes((p) => p.map((x, j) => (j === i ? { ...x, areaId: e.target.value } : x)))}
              aria-label={`Outcome ${i + 1} area`}
              className="bg-white/5 border border-white/10 rounded-md px-1.5 py-1 text-[11px] text-zinc-300 focus:outline-none shrink-0"
            >
              {LIFE_MASTERY_AREAS.map((a) => <option key={a.id} value={a.id} className="bg-zinc-900">{areaLabel(a)}</option>)}
            </select>
            <input
              value={o.outcome}
              onChange={(e) => setOutcomes((p) => p.map((x, j) => (j === i ? { ...x, outcome: e.target.value } : x)))}
              placeholder="The outcome…"
              aria-label={`Outcome ${i + 1}`}
              className="flex-1 min-w-0 bg-white/5 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-white/20"
            />
            <input
              value={o.why}
              onChange={(e) => setOutcomes((p) => p.map((x, j) => (j === i ? { ...x, why: e.target.value } : x)))}
              placeholder="…because"
              aria-label={`Outcome ${i + 1} why`}
              className="w-32 bg-white/5 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-white/20 shrink-0"
            />
            {/* v10 — schedule it: an outcome without a day is a wish */}
            <select
              value={o.weekday ?? ""}
              onChange={(e) => setOutcomes((p) => p.map((x, j) => (j === i ? { ...x, ...(e.target.value === "" ? { weekday: undefined } : { weekday: Number(e.target.value) }) } : x)))}
              aria-label={`Outcome ${i + 1} day`}
              className={`bg-white/5 border rounded-md px-1.5 py-1 text-[11px] focus:outline-none shrink-0 ${o.weekday == null ? "border-amber-400/40 text-amber-300" : "border-white/10 text-zinc-300"}`}
            >
              <option value="" className="bg-zinc-900">day?</option>
              {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d, wi) => <option key={d} value={wi} className="bg-zinc-900">{d}</option>)}
            </select>
            <button onClick={() => setOutcomes((p) => p.filter((_, j) => j !== i))} aria-label={`Remove outcome ${i + 1}`} className="text-zinc-600 hover:text-red-300 shrink-0"><X className="size-3.5" /></button>
          </div>
        ))}
        {outcomes.length === 0 && (
          <p className="text-[10px] text-zinc-600 mt-1">Nothing committed yet. Up to three, each with a why and a day.</p>
        )}
        {outcomes.length < 3 && (
          <button
            onClick={() => setOutcomes((p) => [...p, { areaId: focus ?? (focusAreaIds ?? [])[p.length] ?? (focusAreaIds ?? [])[0] ?? LIFE_MASTERY_AREAS[0].id, outcome: "", why: "" }])}
            className="mt-1.5 text-[11px] px-2 py-0.5 rounded-full border border-dashed border-white/20 text-zinc-500 hover:text-zinc-300 hover:border-white/30 transition-colors"
          >+ outcome</button>
        )}
      </div>

      <span className="block text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-500 mt-4">The honest note</span>
      <textarea
        value={note}
        onChange={(e) => setNote(e.target.value)}
        rows={2}
        placeholder="One honest sentence about this week…"
        aria-label="The honest note about this week"
        className="mt-1 w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-white/20 transition-colors resize-none"
      />

      <div className="flex items-center gap-2 mt-3 flex-wrap">
        <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-500">Next week&apos;s focus. The ONE area to lean into hardest (your 1-3 season areas live in the Life Plan):</span>
        {LIFE_MASTERY_AREAS.map((a) => (
          <button
            key={a.id}
            onClick={() => setFocus((f) => (f === a.id ? null : a.id))}
            aria-pressed={focus === a.id}
            className="text-[11px] px-2 py-0.5 rounded-full border transition-colors"
            style={
              focus === a.id
                ? { color: a.color, borderColor: `${a.color}80`, backgroundColor: `${a.color}26` }
                : { color: "#a1a1aa", borderColor: "rgba(255,255,255,0.15)" }
            }
          >
            {a.label}
          </button>
        ))}
      </div>

      <div className="text-right mt-4">
        <button
          onClick={() =>
            onSave({
              weekStart: win.start,
              areaRatings: ratings,
              note: note.trim(),
              focusPillarId: focus,
              ...(magicMoment.trim() ? { magicMoment: magicMoment.trim() } : {}),
              ...(accomplishment.trim() ? { accomplishment: accomplishment.trim() } : {}),
              ...(lesson.trim() ? { lesson: lesson.trim() } : {}),
              ...(challenge.trim() ? { challenge: challenge.trim() } : {}),
              ...(outcomes.filter((o) => o.outcome.trim()).length
                ? { outcomes: outcomes.filter((o) => o.outcome.trim()).map((o) => ({ ...o, outcome: o.outcome.trim(), why: o.why.trim() })) }
                : {}),
              ...(captures.filter((c) => c.text.trim()).length
                ? { captures: captures.filter((c) => c.text.trim()).map((c) => ({ text: c.text.trim(), areaId: c.areaId })) }
                : {}),
            })
          }
          disabled={ratedCount === 0}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-violet-500/20 border border-violet-500/40 text-violet-100 hover:bg-violet-500/30 disabled:opacity-40 disabled:cursor-not-allowed transition-all text-sm font-medium"
        >
          <Check className="size-4" /> Save weekly review
        </button>
        {/* v23 — the gate used to be all-twelve-or-nothing, which is how a
            review with eleven ratings and three written outcomes got thrown
            away. A partial review is still a review. */}
        {!allRated && ratedCount > 0 && (
          <span className="text-[10px] text-amber-200/80">
            {LIFE_MASTERY_AREAS.length - ratedCount} area{LIFE_MASTERY_AREAS.length - ratedCount === 1 ? "" : "s"} unrated — saved anyway, and your writing is kept as you type.
          </span>
        )}
      </div>
    </div>
  )
}

/** Verdict labels — every non-achieved status gets a reason.
 * v21: the last five exist because he reports outcomes our taxonomy had no word
 * for. Collapsing all of them into "missed" is what made a normal 80-90% year
 * read as failure. */
const VERDICT_LABELS: Record<VisionGoalVerdict, string> = {
  achieved: "Achieved",
  "on-track": "On track",
  "over-achieved": "Over-achieved",
  "likely-miss": "Likely miss",
  "not-started": "Haven't started yet",
  modified: "Modified",
  cancelled: "Cancelled",
  rescheduled: "Rescheduled",
  pushed: "Pushed the date",
  reshaped: "Reshaped it",
  displaced: "Displaced by something else",
  paused: "Paused",
  "deferred-by-choice": "Chose not to, deliberately",
}
const VERDICT_SUCCESS: VisionGoalVerdict[] = ["achieved", "over-achieved"]

/** PLM Monthly Goals Report: deterministic rollup + verdicts + coach commentary.
 * A year period ("YYYY") renders the Year In Review — successes first, then
 * the rest with their reasons/lessons. */
function MonthlyReportSection({
  months,
  years,
  month,
  onMonth,
  report,
  vision,
  verdicts,
  suggested,
  onVerdict,
  results,
  reviews,
  jarMoments,
  onRerankFocus,
}: {
  months: string[]
  years: string[]
  month: string
  onMonth: (m: string) => void
  report: VisionMonthlyReport
  vision: string
  verdicts: Record<string, VisionVerdictEntry>
  suggested: Record<string, VisionGoalVerdict>
  onVerdict: (goalId: string, entry: VisionVerdictEntry) => void
  results?: Record<string, { current: number; target: number; unit: string; donePct: number; timePct: number } | null>
  reviews?: VisionWeeklyReview[]
  jarMoments?: string[]
  onRerankFocus?: () => void
}) {
  const isYear = month.length === 4
  // v9 — the ceremony order holds at EVERY scale: wins flood first, misses
  // second (fractal 3-question review; "don't be hard on yourself" comes
  // before the study of what slipped).
  const isWin = (goalId: string) => VERDICT_SUCCESS.includes((verdicts[goalId]?.verdict ?? suggested[goalId]) as VisionGoalVerdict)
  const perGoal = [...report.perGoal].sort((a, b) => {
    const av = isWin(a.goalId) ? 0 : 1
    const bv = isWin(b.goalId) ? 0 : 1
    // Year view groups the successes BY CATEGORY (his YIR structure).
    return av - bv || (isYear ? a.pillarLabel.localeCompare(b.pillarLabel) : 0)
  })
  const firstMissIdx = perGoal.findIndex((pg) => !isWin(pg.goalId))
  // v10 — evidence compile: relive the year through what you already wrote.
  const yearReviews = isYear ? (reviews ?? []).filter((r) => r.weekStart.startsWith(month)) : []
  const evidence = {
    moments: [...yearReviews.map((r) => r.magicMoment).filter((x): x is string => !!x?.trim()), ...(isYear ? (jarMoments ?? []) : [])],
    wins: yearReviews.map((r) => r.accomplishment).filter((x): x is string => !!x?.trim()),
    lessons: yearReviews.map((r) => r.lesson).filter((x): x is string => !!x?.trim()),
  }
  const [open, setOpen] = useState(false)
  const [commentary, setCommentary] = useState<Record<string, string>>({})
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")
  const fetchCommentary = async () => {
    setBusy(true); setError("")
    try {
      const res = await fetch("/api/goals/vision-plan/report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ vision, report }),
      })
      const data = await res.json().catch(() => null)
      // A 401 in this sandbox means nobody is signed in, which is an expected
      // state here and NOT a failed answer from the model. Reporting both the
      // same way told the user "the coach didn't answer" about a request that
      // was never made.
      if (res.status === 401 || res.status === 403) throw new Error("UNAUTHENTICATED")
      if (!res.ok) throw new Error(data?.error ?? `Request failed (${res.status})`)
      if (!data?.commentary) throw new Error("No commentary in response")
      setCommentary((p) => ({ ...p, [report.month]: data.commentary }))
    } catch (e) {
      console.error("Report commentary failed:", e)
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(false)
    }
  }
  const monthLabel = (m: string) => {
    const [y, mo] = m.split("-").map(Number)
    return `${["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][mo - 1]} ${y}`
  }
  return (
    <div className="mt-10">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="w-full flex items-center gap-2 mb-3 text-left"
      >
        <ChevronDown className={`size-3.5 text-zinc-500 shrink-0 transition-transform ${open ? "" : "-rotate-90"}`} />
        <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-sky-200/90">Monthly goals report</span>
        <span className="h-px flex-1 bg-gradient-to-r from-sky-400/30 to-transparent" />
      </button>
      {open && (
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
          <div className="flex items-center gap-2 flex-wrap">
            {months.map((m) => (
              <button
                key={m}
                onClick={() => onMonth(m)}
                aria-pressed={m === month}
                className={`text-[11px] px-2.5 py-1 rounded-full border transition-colors ${m === month ? "border-sky-400/50 bg-sky-500/15 text-sky-200" : "border-white/15 text-zinc-400 hover:text-zinc-200"}`}
              >
                {monthLabel(m)}
              </button>
            ))}
            {years.map((y) => (
              <button
                key={y}
                onClick={() => onMonth(y)}
                aria-pressed={y === month}
                className={`text-[11px] px-2.5 py-1 rounded-full border transition-colors ${y === month ? "border-violet-400/50 bg-violet-500/15 text-violet-200" : "border-violet-400/25 text-violet-300/70 hover:text-violet-200"}`}
              >
                {y} · Year in review
              </button>
            ))}
            <span className="ml-auto text-[10px] text-zinc-600 tabular-nums">{report.rangeStart} → {report.rangeEnd}</span>
          </div>

          {report.rangeEnd < report.rangeStart ? (
            <p className="text-sm text-zinc-500 mt-4">No finished days in this period yet. Come back tomorrow.</p>
          ) : (
            <>
              <p className="text-[11px] text-zinc-500 mt-3">
                {isYear
                  ? "Successes first. Acknowledge what you made happen before you study what slipped. Then take the lessons into next year's goals."
                  : "Wins first. Flood them, don't rush past them, and don't be hard on yourself. THEN study each miss: own the reason, and commit a fix you can name (95% solution, 5% problem)."}
              </p>
              {isYear && (evidence.moments.length > 0 || evidence.wins.length > 0 || evidence.lessons.length > 0) && (
                <div className="mt-3 rounded-xl border border-violet-400/20 bg-violet-500/[0.05] p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-violet-200/90">Relive the year first, your own evidence</span>
                    <CopyButton label="Copy" getText={() => [
                      evidence.wins.length ? `WHAT I MADE HAPPEN:\n${evidence.wins.map((x) => `- ${x}`).join("\n")}` : "",
                      evidence.moments.length ? `MAGIC MOMENTS:\n${evidence.moments.map((x) => `- ${x}`).join("\n")}` : "",
                      evidence.lessons.length ? `LESSONS:\n${evidence.lessons.map((x) => `- ${x}`).join("\n")}` : "",
                    ].filter(Boolean).join("\n\n")} />
                  </div>
                  <div className="grid gap-3 sm:grid-cols-3 text-xs">
                    {([["What you made happen", evidence.wins], ["Magic moments, the jar, opened", evidence.moments], ["Lessons, keep them as rules", evidence.lessons]] as const).map(([label, items]) => (
                      items.length > 0 && (
                        <div key={label}>
                          <p className="text-[9px] uppercase tracking-wide text-zinc-500 mb-1">{label}</p>
                          <ul className="space-y-0.5">
                            {items.slice(0, 8).map((x) => <li key={x} className="text-zinc-300">· {x}</li>)}
                            {items.length > 8 && <li className="text-zinc-600">+{items.length - 8} more</li>}
                          </ul>
                        </div>
                      )
                    ))}
                  </div>
                  <p className="text-[10px] text-zinc-600 mt-2">Read this BEFORE judging the numbers. A year is everything that happened, and the measured part is only some of it.</p>
                </div>
              )}
              <ul className="mt-4 space-y-2.5">
                {perGoal.map((pg, idx) => {
                  const saved = verdicts[pg.goalId]
                  const current = saved?.verdict ?? suggested[pg.goalId] ?? "on-track"
                  const needsReason = current !== "achieved" && current !== "on-track"
                  return (
                    <li key={pg.goalId} className="rounded-lg border border-white/10 bg-white/[0.02] px-3 py-2">
                      {isYear && idx === 0 && firstMissIdx !== 0 && (
                        <p className="text-[9px] uppercase tracking-wide text-emerald-300/80 mb-1.5">Successes, by category</p>
                      )}
                      {isYear && idx === firstMissIdx && (
                        <p className="text-[9px] uppercase tracking-wide text-amber-300/80 mb-1.5">What slipped. Own it, fix it, carry the lesson</p>
                      )}
                      <div className="flex items-center gap-2 text-sm">
                        <span className="size-1.5 rounded-full shrink-0" style={{ backgroundColor: pg.pillarColor }} />
                        <span className="min-w-0 truncate text-zinc-200">{pg.title}</span>
                        {isYear && <span className="text-[10px] shrink-0" style={{ color: pillarTextColor(pg.pillarColor) }}>{pg.pillarLabel}</span>}
                        <span className="ml-auto flex items-center gap-3 shrink-0 tabular-nums text-xs">
                          <span className={pg.rollup.pace === "behind" ? "text-amber-300" : "text-emerald-300"}>
                            {pg.rollup.done}/{pg.rollup.expected} check-ins
                          </span>
                          {pg.rollup.tasksTotal > 0 && <span className="text-zinc-400">{pg.rollup.tasksDone}/{pg.rollup.tasksTotal} tasks</span>}
                          <span className="text-zinc-500 w-10 text-right">{Math.round(pg.rollup.adherence * 100)}%</span>
                        </span>
                      </div>
                      {/* v9 — GOAL / RESULT / PROGRESS with exact numbers, when logged */}
                      {results?.[pg.goalId] && (() => {
                        const r = results[pg.goalId]!
                        return (
                          <p className="text-[11px] tabular-nums mt-1 text-zinc-400">
                            <span className="text-zinc-600 uppercase text-[9px] tracking-wide mr-1">Goal</span>{r.target} {r.unit}
                            <span className="text-zinc-600 uppercase text-[9px] tracking-wide mx-1.5">Result</span><span className="text-zinc-200">{r.current} {r.unit}</span>
                            <span className={`ml-1.5 ${r.donePct >= r.timePct ? "text-emerald-300" : "text-amber-300"}`}>
                              {Math.round(r.donePct * 100)}% there at {Math.round(r.timePct * 100)}% of the time
                            </span>
                          </p>
                        )
                      })()}
                      {/* M6 — verdict + reason ("every non-achieved status carries a reason") */}
                      <div className="flex items-center gap-2 mt-1.5">
                        <select
                          value={current}
                          onChange={(e) => onVerdict(pg.goalId, { verdict: e.target.value as VisionGoalVerdict, reason: saved?.reason ?? "", ...(saved?.fix ? { fix: saved.fix } : {}) })}
                          aria-label={`Verdict for ${pg.title}`}
                          className={`bg-white/5 border rounded-md px-1.5 py-0.5 text-[11px] focus:outline-none shrink-0 ${VERDICT_SUCCESS.includes(current) ? "border-emerald-400/40 text-emerald-300" : current === "on-track" ? "border-white/15 text-zinc-300" : "border-amber-400/40 text-amber-300"}`}
                        >
                          {(Object.keys(VERDICT_LABELS) as VisionGoalVerdict[]).map((v) => (
                            <option key={v} value={v} className="bg-zinc-900">{VERDICT_LABELS[v]}{!saved && v === suggested[pg.goalId] ? " (suggested)" : ""}</option>
                          ))}
                        </select>
                        {(needsReason || (saved?.reason ?? "")) && (
                          <input
                            value={saved?.reason ?? ""}
                            onChange={(e) => onVerdict(pg.goalId, { verdict: current, reason: e.target.value, ...(saved?.fix ? { fix: saved.fix } : {}) })}
                            placeholder="…because (own the reason)"
                            aria-label={`Reason for ${pg.title} verdict`}
                            className="flex-1 min-w-0 bg-transparent border-b border-white/10 focus:border-white/30 text-[11px] text-zinc-300 placeholder:text-zinc-600 focus:outline-none py-0.5"
                          />
                        )}
                        {!saved && <span className="text-[9px] text-zinc-600 shrink-0">suggested, confirm or change</span>}
                      </div>
                      {/* v9 — every miss commits a fix, and the fix gets a NAME
                          (a reason explains the past; a system changes the future) */}
                      {isYear && needsReason && current !== "rescheduled" && current !== "cancelled" && (
                        <div className="flex items-center gap-2 mt-1.5">
                          <span className="text-[9px] uppercase tracking-wide text-zinc-600 shrink-0">Decide:</span>
                          <button
                            onClick={() => onVerdict(pg.goalId, { verdict: "rescheduled", reason: saved?.reason || "carrying into next year, re-scoped", ...(saved?.fix ? { fix: saved.fix } : {}) })}
                            className="text-[10px] px-2 py-0.5 rounded-full border border-sky-400/40 text-sky-300 hover:bg-sky-500/10 transition-colors"
                          >re-commit next year</button>
                          <button
                            onClick={() => onVerdict(pg.goalId, { verdict: "cancelled", reason: saved?.reason || "consciously dropped — it no longer earns a slot", ...(saved?.fix ? { fix: saved.fix } : {}) })}
                            className="text-[10px] px-2 py-0.5 rounded-full border border-white/15 text-zinc-400 hover:bg-white/10 transition-colors"
                          >consciously drop</button>
                          <span className="text-[9px] text-zinc-600">never silently.</span>
                        </div>
                      )}
                      {needsReason && (
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-[9px] uppercase tracking-wide text-sky-300/70 shrink-0">The fix</span>
                          <input
                            value={saved?.fix ?? ""}
                            onChange={(e) => onVerdict(pg.goalId, { verdict: current, reason: saved?.reason ?? "", ...(e.target.value ? { fix: e.target.value } : {}) })}
                            placeholder={`Name the system that prevents the repeat. E.g. "Money Tuesday", "gym bag by the door"`}
                            aria-label={`Fix commitment for ${pg.title}`}
                            className="flex-1 min-w-0 bg-transparent border-b border-sky-400/20 focus:border-sky-400/50 text-[11px] text-zinc-300 placeholder:text-zinc-600 focus:outline-none py-0.5"
                          />
                        </div>
                      )}
                    </li>
                  )
                })}
              </ul>

              <div className="flex flex-wrap gap-x-6 gap-y-1.5 mt-4 pt-3 border-t border-white/10 text-xs text-zinc-400">
                {report.ritual && (
                  <span>Morning ritual: <span className="text-zinc-200 tabular-nums">{Math.round(report.ritual.rate * 100)}%</span> ({report.ritual.done}/{report.ritual.expected} steps)</span>
                )}
                <span>Vision read: <span className="text-zinc-200 tabular-nums">{Math.round(report.visionReviewRate * 100)}%</span> of days</span>
                {report.weeklyRatings.length > 0 && (
                  <span>
                    Weekly self-ratings:{" "}
                    <span className="text-zinc-200 tabular-nums">{report.weeklyRatings.map((w) => w.avg).join(" · ")}</span>
                  </span>
                )}
                {/* v10 — the report's last act: re-rank the season's focus */}
                <a href="#lm-lifeplan" onClick={onRerankFocus} className="text-sky-300/90 hover:text-sky-200 transition-colors">
                  Still the right focus areas? Re-rank them →
                </a>
              </div>

              <div className="mt-4">
                {commentary[report.month] ? (
                  <div className="rounded-lg border border-emerald-400/20 bg-emerald-500/[0.06] px-4 py-3">
                    <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-emerald-300/90">Coach commentary</span>
                    <p className="text-sm text-zinc-200 mt-1.5 whitespace-pre-wrap leading-relaxed">{commentary[report.month]}</p>
                  </div>
                ) : (
                  <button
                    onClick={fetchCommentary}
                    disabled={busy}
                    className="inline-flex items-center gap-2 text-xs px-3 py-1.5 rounded-lg border border-emerald-500/40 bg-emerald-500/10 text-emerald-200 hover:bg-emerald-500/20 disabled:opacity-40 transition-colors"
                  >
                    {busy ? <Loader2 className="size-3.5 animate-spin" /> : <Wand2 className="size-3.5" />}
                    {busy ? "Writing your review…" : "Coach commentary"}
                  </button>
                )}
                {error && <p className="text-xs text-red-300 mt-2">Commentary failed: {error}</p>}
              </div>
              {isYear && (
                <p className="text-[11px] text-zinc-500 mt-4 pt-3 border-t border-white/10">
                  Year reviewed? Time to re-run your goal setting: get in a peak state, brainstorm without limits,
                  and set next year&apos;s goals. Checked against your vision and values on the Plan view.
                </p>
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
}

/** Last-14-days dot strip for one habit: filled = done, ring = due but missed,
 * faint = not scheduled. The visual chain that makes consistency feel real. */
function HabitDotStrip({ habit, rampSteps, progress, today }: { habit: BalancedHabit; rampSteps: { frequencyPerWeek: number; durationWeeks: number }[] | null; progress: VisionProgress; today: string }) {
  const comps = new Set(progress.completions[habit.habitId] ?? [])
  const days: Array<{ date: string; due: boolean; done: boolean }> = []
  for (let i = 13; i >= 0; i--) {
    const date = addDays(today, -i)
    if (dayNumber(progress.startDate, date) < 0) continue
    days.push({ date, due: habitDueOnDate(habit, progress.startDate, date, rampSteps), done: comps.has(date) })
  }
  return (
    <span className="flex items-center gap-[3px]" aria-label={`${habit.title} — last 14 days`}>
      {days.map((d) => (
        <span
          key={d.date}
          title={`${d.date}${d.due ? (d.done ? " — done" : d.date === today ? " — due today" : " — missed") : ""}`}
          className="size-2 rounded-full"
          style={{
            backgroundColor: d.done ? habit.pillarColor : "transparent",
            border: d.due ? `1px solid ${d.done ? habit.pillarColor : d.date === today ? "rgba(255,255,255,0.5)" : "#f59e0b88"}` : "1px solid rgba(255,255,255,0.08)",
          }}
        />
      ))}
    </span>
  )
}

/**
 * Goals v2 — one rich, expandable row per goal: pace + verdict at a glance;
 * expanded, the full RPM anatomy (sentence, why, pain-why, habits with chains
 * and 14-day strips, milestone ladder, countdown).
 */
function GoalDeepRow({
  goal,
  rollup,
  balanced,
  progress,
  today,
  verdict,
  expanded,
  onToggle,
  onLogMeasure,
}: {
  goal: VisionGoalDraft
  rollup: VisionGoalRollup
  balanced: BalancedPlan
  progress: VisionProgress
  today: string
  verdict: VisionVerdictEntry | null
  expanded: boolean
  onToggle: () => void
  onLogMeasure?: (value: number) => void
}) {
  const [measureDraft, setMeasureDraft] = useState("")
  const paceStyle =
    rollup.pace === "ahead"
      ? { label: "Ahead", cls: "text-emerald-300 border-emerald-400/30 bg-emerald-500/10", icon: <TrendingUp className="size-3" /> }
      : rollup.pace === "behind"
        ? { label: "Behind", cls: "text-amber-300 border-amber-400/30 bg-amber-500/10", icon: <AlertTriangle className="size-3" /> }
        : { label: "On pace", cls: "text-zinc-300 border-white/15 bg-white/5", icon: <Check className="size-3" /> }
  const habits = balanced.habits.filter((h) => goal.habits.some((x) => x.id === h.habitId))
  const bestStreak = Math.max(0, ...habits.map((h) => habitStreak(h, goal.rampSteps, progress, today)))
  const countdown = goal.targetDate ? formatCountdown(goal.targetDate, new Date(today + "T00:00:00")) : null
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.04]">
      <button onClick={onToggle} aria-expanded={expanded} className="w-full text-left p-4 hover:bg-white/[0.02] transition-colors">
        <div className="flex items-center gap-2 flex-wrap">
          <ChevronDown className={`size-3.5 text-zinc-500 shrink-0 transition-transform ${expanded ? "" : "-rotate-90"}`} />
          <span className="size-2 rounded-full shrink-0" style={{ backgroundColor: goal.pillarColor }} />
          <span className="text-sm font-semibold text-white">{goal.title}</span>
          <span
            className={`flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full border ${paceStyle.cls}`}
            title={rollup.pace === "behind" ? "Behind ≠ failing. Plateaus are where dabblers quit. Keep the reps; the curve jumps later." : undefined}
          >
            {paceStyle.icon} {paceStyle.label}
          </span>
          {bestStreak > 1 && (
            <span className="text-[10px] px-2 py-0.5 rounded-full border border-white/15 text-zinc-300 tabular-nums" title="Longest current chain across this goal's habits. Don't break it">
              {bestStreak}-chain
            </span>
          )}
          {verdict && (
            <span className={`text-[10px] px-2 py-0.5 rounded-full border ${["achieved", "over-achieved"].includes(verdict.verdict) ? "border-emerald-400/40 text-emerald-300" : verdict.verdict === "on-track" ? "border-white/15 text-zinc-400" : "border-amber-400/40 text-amber-300"}`}>
              {VERDICT_LABELS[verdict.verdict]}
            </span>
          )}
          <HorizonChip goal={goal} today={today} />
          <span className="ml-auto text-xs text-zinc-400 tabular-nums">{rollup.percent}%{goal.type === "habit_ramp" ? " adherence" : ""}</span>
        </div>
        <div className="mt-2 h-1.5 rounded-full bg-white/10 overflow-hidden">
          <div className="h-full rounded-full" style={{ width: `${rollup.percent}%`, backgroundColor: goal.pillarColor }} />
        </div>
        <p className="text-[11px] text-zinc-500 mt-1.5 tabular-nums">
          {rollup.done} check-in{rollup.done === 1 ? "" : "s"} · {rollup.expected} expected by now
          {rollup.tasksTotal > 0 && <> · {rollup.tasksDone}/{rollup.tasksTotal} tasks</>}
          {countdown && <> · {countdown}</>}
        </p>
      </button>
      {expanded && (
        <div className="px-4 pb-4 border-t border-white/5 pt-3 space-y-3">
          <p className="text-sm italic text-violet-200/90">{goal.smartSentence ?? buildSmartSentence(goal)}</p>
          <p className="text-xs text-zinc-400 leading-relaxed">
            <span className="text-zinc-500 uppercase text-[9px] tracking-wide mr-1.5">Why</span>{goal.why}
          </p>
          {goal.painWhy && (
            <p className="text-xs text-zinc-500 leading-relaxed">
              <span className="text-zinc-600 uppercase text-[9px] tracking-wide mr-1.5">If not</span>{goal.painWhy}
            </p>
          )}
          <div className="space-y-1.5">
            {goal.habits.map((vh) => {
              const bh = habits.find((h) => h.habitId === vh.id)
              if (!bh) return null
              const streak = habitStreak(bh, goal.rampSteps, progress, today)
              const done = (progress.completions[vh.id] ?? []).length
              return (
                <div key={vh.id} className="flex items-center gap-2.5 text-xs text-zinc-300 flex-wrap">
                  <Repeat className="size-3 shrink-0" style={{ color: goal.pillarColor }} />
                  <span className="min-w-0 truncate">{vh.title}</span>
                  <span className="text-zinc-600 tabular-nums shrink-0">{done} total{streak > 1 ? ` · ${streak}-chain` : ""}</span>
                  <span className="ml-auto shrink-0"><HabitDotStrip habit={bh} rampSteps={goal.rampSteps ?? null} progress={progress} today={today} /></span>
                </div>
              )
            })}
          </div>
          {goal.measure && goal.measure.target !== goal.measure.start && (
            <div className="flex items-center gap-1.5 flex-wrap" aria-label={`Milestone ladder for ${goal.title}`}>
              <span className="text-[9px] uppercase tracking-wide text-zinc-600 mr-1">Ladder</span>
              {generateMilestoneLadder(measureToLadderConfig(goal.measure)).map((m, i, arr) => (
                <span key={m.step} className="flex items-center gap-1.5">
                  <span className="text-[11px] px-2 py-0.5 rounded-full border tabular-nums" style={{ color: goal.pillarColor, borderColor: `${goal.pillarColor}40`, backgroundColor: `${goal.pillarColor}14` }}>
                    {m.value}
                  </span>
                  {i < arr.length - 1 && <span className="text-zinc-600 text-[10px]">→</span>}
                </span>
              ))}
              <span className="text-[10px] text-zinc-500 ml-1">{goal.measure.unit} — move the target closer, hit it, move it further (bow and arrow)</span>
            </div>
          )}
          {/* v9 — numeric RESULT: his reports show GOAL / RESULT / PROGRESS
              with exact numbers, not check-in counts. */}
          {goal.measure && goal.measure.target !== goal.measure.start && (
            <div className="flex items-center gap-2 flex-wrap text-xs">
              <span className="text-[9px] uppercase tracking-wide text-zinc-600">Result</span>
              {(() => {
                const last = latestMeasure(progress, goal.id, today)
                const rr = measureRunRate(goal, progress, goal.id, today)
                return (
                  <>
                    {last ? (
                      <span className="tabular-nums text-zinc-200">
                        {last.value} / {goal.measure.target} {goal.measure.unit}
                        <span className="text-zinc-600"> · logged {last.date}</span>
                      </span>
                    ) : (
                      <span className="text-[11px] text-zinc-600">no reading yet. A report without a number is a feeling</span>
                    )}
                    {rr && (
                      <span className={`tabular-nums ${rr.donePct >= rr.timePct ? "text-emerald-300" : "text-amber-300"}`}>
                        {Math.round(rr.donePct * 100)}% there at {Math.round(rr.timePct * 100)}% of the time
                      </span>
                    )}
                  </>
                )
              })()}
              {onLogMeasure && (
                <span className="ml-auto flex items-center gap-1.5 shrink-0">
                  <input
                    value={measureDraft}
                    onChange={(e) => setMeasureDraft(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter" && measureDraft.trim() !== "" && Number.isFinite(Number(measureDraft))) { onLogMeasure(Number(measureDraft)); setMeasureDraft("") } }}
                    type="number"
                    placeholder="today's number"
                    aria-label={`Log today's ${goal.measure.unit} for ${goal.title}`}
                    className="w-28 bg-white/5 border border-white/10 rounded-md px-2 py-1 text-[11px] text-zinc-200 placeholder:text-zinc-600 focus:outline-none tabular-nums"
                  />
                  <button
                    onClick={() => { if (measureDraft.trim() !== "" && Number.isFinite(Number(measureDraft))) { onLogMeasure(Number(measureDraft)); setMeasureDraft("") } }}
                    disabled={measureDraft.trim() === "" || !Number.isFinite(Number(measureDraft))}
                    className="text-[11px] px-2 py-1 rounded-md border border-white/15 text-zinc-300 hover:bg-white/10 disabled:opacity-30 transition-colors"
                  >
                    Log
                  </button>
                </span>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

/** v3 — inline goal composer for one Life Plan area. */
function AreaGoalComposer({ areaLabel, onAdd, initialTitle, startOpen, onCancel }: { areaLabel: string; onAdd: (input: { title: string; type: VisionGoalType; why: string; daysPerWeek: number; measure: VisionMeasure | null; targetDate: string | null }) => void; initialTitle?: string; startOpen?: boolean; onCancel?: () => void }) {
  const [open, setOpen] = useState(!!startOpen)
  const [title, setTitle] = useState(initialTitle ?? "")
  const [type, setType] = useState<VisionGoalType>("habit_ramp")
  const [why, setWhy] = useState("")
  const [days, setDays] = useState(3)
  const [unit, setUnit] = useState("")
  const [start, setStart] = useState("")
  const [target, setTarget] = useState("")
  const [targetDate, setTargetDate] = useState("")
  // M2 — a ladder needs a FROM as well as a TO. The composer used to hardcode
  // start: 0, so every climb in the product began at zero whether or not that
  // was true, and "10 pull-ups, from 6" silently became a climb from nothing.
  const startNum = start.trim() === "" ? 0 : Number(start)
  const valid =
    title.trim() &&
    (type !== "milestone_ladder" ||
      (unit.trim() !== "" && target.trim() !== "" && Number.isFinite(Number(target)) &&
       Number.isFinite(startNum) && Number(target) !== startNum))
  const commit = () => {
    if (!valid) return
    onAdd({
      title: title.trim(),
      type,
      why: why.trim(),
      daysPerWeek: days,
      measure: type === "milestone_ladder"
        ? { unit: unit.trim(), start: startNum, target: Number(target), steps: ladderSteps(startNum, Number(target)) }
        : null,
      targetDate: targetDate || null,
    })
    setTitle(""); setWhy(""); setUnit(""); setStart(""); setTarget(""); setTargetDate(""); setOpen(false)
  }
  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="mt-2 text-[11px] px-2.5 py-1 rounded-full border border-dashed border-white/20 text-zinc-500 hover:text-zinc-300 hover:border-white/30 transition-colors">
        + Add a goal in {areaLabel}
      </button>
    )
  }
  return (
    <div className="mt-2 rounded-lg border border-white/15 bg-white/[0.03] p-3 space-y-2">
      <div className="flex items-center gap-2">
        <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder={`The goal, specific, measurable, yours`} autoFocus
          className="flex-1 min-w-0 bg-white/5 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-white/25" />
        <span className="flex rounded-lg border border-white/15 overflow-hidden shrink-0">
          {(["habit_ramp", "milestone_ladder"] as const).map((t) => (
            <button key={t} onClick={() => setType(t)} aria-pressed={type === t}
              className={`text-[10px] px-2 py-1.5 transition-colors ${type === t ? "bg-white/15 text-white" : "text-zinc-500 hover:text-zinc-300"}`}>
              {t === "habit_ramp" ? "Habit" : "Milestone"}
            </button>
          ))}
        </span>
      </div>
      <div className="flex items-center gap-2 flex-wrap">
        <select value={days} onChange={(e) => setDays(Number(e.target.value))} aria-label="Days per week"
          className="bg-white/5 border border-white/10 rounded-md px-1.5 py-1 text-[11px] text-zinc-300 focus:outline-none">
          {[1, 2, 3, 4, 5, 6, 7].map((n) => <option key={n} value={n} className="bg-zinc-900">{n}×/wk</option>)}
        </select>
        {type === "milestone_ladder" && (
          <>
            <input value={start} onChange={(e) => setStart(e.target.value)} type="number" placeholder="from" aria-label="Starting value, where you are now"
              className="w-16 bg-white/5 border border-white/10 rounded-md px-2 py-1 text-[11px] text-zinc-200 placeholder:text-zinc-600 focus:outline-none tabular-nums" />
            <span className="text-[10px] text-zinc-600">→</span>
            <input value={target} onChange={(e) => setTarget(e.target.value)} type="number" placeholder="to" aria-label="Target value"
              className="w-16 bg-white/5 border border-white/10 rounded-md px-2 py-1 text-[11px] text-zinc-200 placeholder:text-zinc-600 focus:outline-none tabular-nums" />
            <input value={unit} onChange={(e) => setUnit(e.target.value)} placeholder="unit ($/mo, kg…)" aria-label="Measure unit"
              className="w-24 bg-white/5 border border-white/10 rounded-md px-2 py-1 text-[11px] text-zinc-200 placeholder:text-zinc-600 focus:outline-none" />
            {start.trim() !== "" && target.trim() !== "" && Number(target) < startNum && (
              <span className="text-[10px] text-sky-300/80">counts down ↓</span>
            )}
          </>
        )}
        <label className="flex items-center gap-1.5 text-[10px] text-zinc-500">by
          <input type="date" value={targetDate} onChange={(e) => setTargetDate(e.target.value)} aria-label="Target date"
            className="bg-white/5 border border-white/10 rounded-md px-1.5 py-1 text-[11px] text-zinc-300 focus:outline-none" />
        </label>
      </div>
      <input value={why} onChange={(e) => setWhy(e.target.value)} placeholder="Why do you want this? (the fuel)"
        className="w-full bg-white/5 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-white/25" />
      <div className="flex items-center gap-2 justify-end">
        <button onClick={() => { setOpen(false); onCancel?.() }} className="text-[11px] text-zinc-600 hover:text-zinc-400">cancel</button>
        <button onClick={commit} disabled={!valid}
          className="text-[11px] px-3 py-1 rounded-md border border-emerald-500/40 bg-emerald-500/10 text-emerald-200 hover:bg-emerald-500/20 disabled:opacity-30 transition-colors">
          Add goal
        </button>
      </div>
    </div>
  )
}

/**
 * v9 — the 100-Reasons exercise: rapid-fire reasons this goal MUST happen.
 * The first ten are the surface; the gold is past thirty. Read the list back
 * on hard days — reasons are the fuel.
 */
function ReasonsDrill({ goalTitle, goalWhy, reasons, onAdd, onAddMany, onRemove }: {
  goalTitle: string
  goalWhy: string
  reasons: string[]
  onAdd: (reason: string) => void
  onAddMany: (reasons: string[]) => void
  onRemove: (reason: string) => void
}) {
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState("")
  const [promptIdx, setPromptIdx] = useState(0)
  const [tray, setTray] = useState<string[]>([])
  const [phase, setPhase] = useState<"idle" | "loading" | "error">("idle")
  const [err, setErr] = useState("")
  const vehicle = readGoalVehicle(goalTitle)
  const prompt = REASON_PROMPTS[promptIdx % REASON_PROMPTS.length]
  const add = () => {
    const t = draft.trim()
    if (!t || reasons.length >= 150) return
    onAdd(t)
    setDraft("")
  }
  const expand = async () => {
    setPhase("loading"); setErr("")
    try {
      const res = await fetch("/api/goals/vision-plan/reasons", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ goalTitle, why: goalWhy, existing: reasons, want: 20 }),
      })
      const data = await res.json().catch(() => null)
      if (!res.ok) throw new Error(data?.error ?? `Request failed (${res.status})`)
      setTray((prev) => [...prev, ...(data.reasons as string[])])
      setPhase("idle")
    } catch (e) {
      console.error("Reason expansion failed:", e)
      setErr(e instanceof Error ? e.message : "Couldn't get more reasons")
      setPhase("error")
    }
  }
  return (
    <div className="mt-1.5">
      <button
        onClick={() => setOpen((s) => !s)}
        className="flex items-center gap-1.5 text-[11px] font-medium text-zinc-400 hover:text-white transition-colors"
        aria-expanded={open}
      >
        <ChevronDown className={`size-3.5 transition-transform ${open ? "" : "-rotate-90"}`} />
        100 reasons · <span className={`tabular-nums ${reasons.length >= 100 ? "text-emerald-300" : reasons.length >= 30 ? "text-zinc-300" : "text-zinc-500"}`}>{reasons.length}/100</span>
      </button>
      {open && (
        <div className="mt-1.5 rounded-lg border border-white/10 bg-white/[0.02] p-2.5">
          <p className="text-[10px] text-zinc-500 mb-1.5">
            Rapid fire — why MUST this happen? No filter, no editing, nothing left out because it sounds bad written down. The first ten are the surface; the gold is past thirty. {reasons.length >= 100 ? "100+. Now read them back, out loud." : ""}
          </p>

          {/* v18 — the goal is usually a VEHICLE. Naming what it's actually for
              gives the drill something to pull on; an empty why makes a goal
              circular ("I want a girlfriend because I want a girlfriend"). */}
          {vehicle && (
            <div className="mb-2 rounded-md border border-violet-400/20 bg-violet-500/[0.06] px-2.5 py-1.5">
              <p className="text-[10px] text-violet-200/90">
                &ldquo;{goalTitle}&rdquo; is a <span className="font-medium">vehicle</span>. What it&apos;s actually for:
              </p>
              <div className="flex flex-wrap gap-1.5 mt-1">
                {vehicle.ends.map((e) => (
                  <button
                    key={e}
                    onClick={() => onAdd(`Because I want ${e.toLowerCase()}`)}
                    title={`Add "${e}" as a reason. Then make it specific`}
                    className="text-[10px] px-2 py-0.5 rounded-full border border-violet-400/30 text-violet-100 hover:bg-violet-500/20 transition-colors"
                  >
                    + {e}
                  </button>
                ))}
              </div>
              <p className="text-[9px] text-zinc-600 mt-1">These are starting words. Add one, then rewrite it as the thing you&apos;d actually say.</p>
            </div>
          )}

          {/* v18 — a prompt class instead of a blank box. Nobody produces 100
              from nothing; they produce 12 from one angle and stop. */}
          <div className="mb-1.5 flex items-baseline gap-2">
            <span className="text-[10px] uppercase tracking-wide text-zinc-500 shrink-0">{prompt.label}</span>
            <span className="text-[11px] text-zinc-300 min-w-0">{prompt.question}</span>
            <button onClick={() => setPromptIdx((i) => i + 1)} className="ml-auto text-[10px] text-zinc-600 hover:text-zinc-300 transition-colors shrink-0">another angle →</button>
          </div>

          <div className="flex items-center gap-2">
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") add() }}
              placeholder="Say it the way you'd actually say it"
              aria-label={`Add a reason for ${goalTitle}`}
              className="flex-1 min-w-0 bg-white/5 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-white/25"
            />
            <button onClick={add} disabled={!draft.trim()} className="text-[11px] px-2.5 py-1 rounded-md border border-white/15 text-zinc-300 hover:bg-white/10 disabled:opacity-30 transition-colors">Add</button>
          </div>

          {/* v18 — expansion in the user's own voice. Same accept-tray doctrine
              as the room suggestions: the coach drafts, the user keeps. */}
          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
            <button
              onClick={expand}
              disabled={phase === "loading"}
              className="flex items-center gap-1.5 text-[11px] px-2.5 py-1 rounded-md border border-violet-400/40 bg-violet-500/10 text-violet-100 hover:bg-violet-500/20 disabled:opacity-40 transition-colors"
            >
              {phase === "loading" ? <Loader2 className="size-3 animate-spin" /> : <Wand2 className="size-3" />}
              {phase === "loading" ? "Writing in your voice…" : reasons.length ? "20 more in my voice" : "Get me started"}
            </button>
            {reasons.length === 0 && <span className="text-[10px] text-zinc-600">Write two or three first and they&apos;ll sound like you.</span>}
            {phase === "error" && <span className="text-[10px] text-red-300">{err}</span>}
          </div>

          {tray.length > 0 && (
            <div className="mt-2 rounded-md border border-violet-400/20 bg-violet-500/[0.05] p-2">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[10px] uppercase tracking-wide text-violet-200/90">Keep the ones that are true</span>
                <button onClick={() => { onAddMany(tray); setTray([]) }} className="ml-auto text-[10px] text-violet-200 hover:text-white transition-colors">keep all</button>
                <button onClick={() => setTray([])} className="text-[10px] text-zinc-600 hover:text-zinc-300 transition-colors">clear</button>
              </div>
              <ul className="space-y-0.5 max-h-44 overflow-y-auto pr-1">
                {tray.map((r) => (
                  <li key={r} className="group flex items-baseline gap-2 text-[11px] text-zinc-300">
                    <button onClick={() => { onAdd(r); setTray((p) => p.filter((x) => x !== r)) }} className="text-emerald-300/80 hover:text-emerald-200 shrink-0" aria-label={`Keep: ${r}`}>+</button>
                    <span className="min-w-0">{r}</span>
                    <button onClick={() => setTray((p) => p.filter((x) => x !== r))} aria-label={`Discard: ${r}`} className="ml-auto opacity-0 group-hover:opacity-100 text-zinc-600 hover:text-red-300 transition-opacity shrink-0">×</button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {reasons.length > 0 && (
            <>
              <ol className="mt-2 space-y-0.5 max-h-40 overflow-y-auto pr-1">
                {reasons.map((r, i) => (
                  <li key={r} className="group flex items-baseline gap-2 text-[11px] text-zinc-300">
                    <span className="text-zinc-600 tabular-nums shrink-0">{i + 1}.</span>
                    <span className="min-w-0">{r}</span>
                    <button onClick={() => onRemove(r)} aria-label={`Remove reason: ${r}`} className="ml-auto opacity-0 group-hover:opacity-100 text-zinc-600 hover:text-zinc-300 transition-opacity shrink-0">×</button>
                  </li>
                ))}
              </ol>
              <div className="mt-1.5">
                <CopyButton label="Copy reasons" getText={() => `WHY "${goalTitle}" MUST HAPPEN\n${reasons.map((r, i) => `${i + 1}. ${r}`).join("\n")}`} />
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}

/**
 * v8 — THE GOAL WORKSHOP: his authorship order restored (brainstorm → circle
 * → qualify). The 1-3yr wants from the vision brainstorm land here; the USER
 * circles the ones that become this year's goals and qualifies each one —
 * area, shape, why. The AI only suggests; it never authors.
 */
function GoalWorkshopPanel({ items, onQualify, onDismiss, onAddWant }: {
  items: string[]
  onQualify: (item: string, areaId: string, input: { title: string; type: VisionGoalType; why: string; daysPerWeek: number; measure: VisionMeasure | null; targetDate: string | null }) => void
  onDismiss: (item: string) => void
  onAddWant: (text: string) => void
}) {
  const [circled, setCircled] = useState<string | null>(null)
  const [areaId, setAreaId] = useState<string>(LIFE_MASTERY_AREAS[0].id)
  const [wantDraft, setWantDraft] = useState("")
  const area = LIFE_MASTERY_AREA_MAP.get(areaId)
  return (
    <div id="lm-goal-workshop" className="mb-6 rounded-2xl border border-emerald-400/20 bg-gradient-to-br from-emerald-500/[0.08] via-white/[0.03] to-transparent p-5 scroll-mt-20">
      <div className="flex items-center gap-2 mb-2">
        <Wand2 className="size-3.5 text-emerald-300" />
        <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-emerald-200/90">The Goal Workshop, you author these</span>
        <span className="h-px flex-1 bg-gradient-to-r from-emerald-400/30 to-transparent" />
      </div>
      <p className="text-[11px] text-zinc-400 mb-3">
        The sequence: brainstorm everything → <span className="text-emerald-200">circle the ones that become this year&apos;s goals</span> → qualify each (which area, what shape, why).
        {items.length > 0 && <> These are your 1-3 year wants from the brainstorm. Circle one to make it a goal. Or let it go.</>}
      </p>
      {items.length === 0 ? (
        <p className="text-[11px] text-zinc-500">Nothing waiting. Add a want below, or run the Unlimited Brainstorm in the vision workshop above. Its 1-3 year wants land here.</p>
      ) : (
        <ul className="space-y-2">
          {items.map((item) => (
            <li key={item} className="rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs text-zinc-200 min-w-0">{item}</span>
                <span className="ml-auto flex items-center gap-2 shrink-0">
                  {/* v23 — circling a NEW want resets the area picker: one
                      `areaId` is shared by the whole list, so it used to carry
                      the previous item's choice over silently. */}
                  {circled !== item && (
                    <button onClick={() => { setCircled(item); setAreaId(LIFE_MASTERY_AREAS[0].id) }} className="text-[10px] px-2 py-0.5 rounded-full border border-emerald-500/40 bg-emerald-500/10 text-emerald-200 hover:bg-emerald-500/20 transition-colors">
                      ◯ Circle it, this becomes a goal
                    </button>
                  )}
                  <button onClick={() => { onDismiss(item); if (circled === item) setCircled(null) }} className="text-[10px] text-zinc-600 hover:text-zinc-400 transition-colors" aria-label={`Let go of ${item}`}>
                    let it go
                  </button>
                </span>
              </div>
              {circled === item && (
                <div className="mt-2">
                  <label className="flex items-center gap-2 text-[10px] text-zinc-500">
                    Which area of life does it feed?
                    <select value={areaId} onChange={(e) => setAreaId(e.target.value)} aria-label="Life area"
                      className="bg-white/5 border border-white/10 rounded-md px-1.5 py-1 text-[11px] text-zinc-300 focus:outline-none">
                      {LIFE_MASTERY_AREAS.map((a) => <option key={a.id} value={a.id} className="bg-zinc-900">{a.label}</option>)}
                    </select>
                  </label>
                  <AreaGoalComposer
                    key={item}
                    areaLabel={area?.label ?? ""}
                    initialTitle={item}
                    startOpen
                    onCancel={() => setCircled(null)}
                    onAdd={(input) => { onQualify(item, areaId, input); setCircled(null) }}
                  />
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
      <div className="flex items-center gap-2 mt-3">
        <input
          value={wantDraft}
          onChange={(e) => setWantDraft(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && wantDraft.trim()) { onAddWant(wantDraft.trim()); setWantDraft("") } }}
          placeholder="Another want for this year? Dump it here. Circle it when it's real."
          aria-label="Add a want for this year"
          className="flex-1 min-w-0 bg-white/5 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-white/25"
        />
        <button onClick={() => { if (wantDraft.trim()) { onAddWant(wantDraft.trim()); setWantDraft("") } }} disabled={!wantDraft.trim()}
          className="text-[11px] px-2.5 py-1 rounded-md border border-white/15 text-zinc-300 hover:bg-white/10 disabled:opacity-30 transition-colors">
          Add
        </button>
      </div>
    </div>
  )
}

/**
 * v3 — THE LIFE PLAN: Stefan's actual document, area by area. Every area gets
 * a compelling name, a vision (your 10), a purpose, an identity, and goals —
 * "I have a vision and SMART goals for each area of my life."
 */
function LifePlanView({
  goals,
  areaPlans,
  yourTens,
  progress,
  focusAreaIds,
  onEditSeason,
  onAreaPlan,
  onYourTen,
  onAddGoal,
}: {
  goals: VisionGoalDraft[]
  areaPlans: Record<string, VisionAreaPlan>
  yourTens: Record<string, string>
  progress: VisionProgress | null
  focusAreaIds: string[]
  onEditSeason: () => void
  onAreaPlan: (areaId: string, patch: Partial<VisionAreaPlan>) => void
  onYourTen: (areaId: string, text: string) => void
  onAddGoal: (areaId: string, input: { title: string; type: VisionGoalType; why: string; daysPerWeek: number; measure: VisionMeasure | null; targetDate: string | null }) => void
}) {
  // Overwhelm rule from audience research: expanded = focus areas + areas with
  // goals; the other cards collapse to their header until clicked.
  const [openAreas, setOpenAreas] = useState<Set<string> | null>(null)
  const isOpen = (areaId: string): boolean => {
    if (openAreas) return openAreas.has(areaId)
    return focusAreaIds.includes(areaId) || goals.some((g) => goalFeedsArea(g, areaId))
  }
  const toggleOpen = (areaId: string) => {
    setOpenAreas((prev) => {
      const base = prev ?? new Set(LIFE_MASTERY_AREAS.filter((a) => isOpen(a.id)).map((a) => a.id))
      const next = new Set(base)
      if (next.has(areaId)) next.delete(areaId)
      else next.add(areaId)
      return next
    })
  }
  const areaName = (a: (typeof LIFE_MASTERY_AREAS)[number]) => (areaPlans[a.id]?.name ?? "").trim() || a.label
  const latestRating = (areaId: string): number | null => {
    if (!progress) return null
    const s = areaRatingSeries(progress, areaId)
    return s.length ? s[s.length - 1].rating : null
  }
  return (
    <div id="lm-lifeplan" className="max-w-5xl mx-auto px-6 py-10 pb-24 scroll-mt-20">
      <h1 className="text-2xl font-bold text-center mb-2">Your Life Plan</h1>
      <p className="text-zinc-400 text-center mb-8 max-w-2xl mx-auto text-sm">
        The document behind everything. One area at a time. Name it so it drives you, define your 10,
        write the why, claim the identity, and give it goals. <span className="text-zinc-300">Every</span> area,
        including the quiet ones.
      </p>

      <PrincipleCardView id="focus" />
      {/* v23 — READ-ONLY. There used to be three separate focus pickers writing
          the same season, and two of them (this one and the lifewide chips) set
          `focusAreaIds` without touching `areaRank`/`focusCount` — so picking a
          focus here and going back to the rooms screen showed a DIFFERENT
          season, which changed again after a reload. The ranker on the rooms
          screen is the one writer; these are summaries of its result. */}
      <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4 mb-6">
        <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-500">
          This season&apos;s focus
        </span>
        <p className="text-[11px] text-zinc-500 mt-1">
          Which area, conquered, lifts all the others? The rest drop to maintenance. On purpose, with your consent.
        </p>
        <div className="flex items-center gap-1.5 flex-wrap mt-2">
          {focusAreaIds.length === 0 ? (
            <span className="text-[11px] text-zinc-500">Not chosen yet. Every area is being treated the same.</span>
          ) : (
            focusAreaIds.map((id) => {
              const a = LIFE_MASTERY_AREA_MAP.get(id)
              if (!a) return null
              return (
                <span
                  key={id}
                  className="text-[11px] px-2 py-0.5 rounded-full border"
                  style={{ color: a.color, borderColor: `${a.color}80`, backgroundColor: `${a.color}26` }}
                >
                  {areaName(a)}
                </span>
              )
            })
          )}
          <button
            onClick={onEditSeason}
            className="text-[11px] text-zinc-400 hover:text-zinc-200 underline underline-offset-2 ml-1"
          >
            Change it in Your rooms →
          </button>
        </div>
        {/* v10 — consented drift has a CONTRACT: minimum floors for the areas
            that must never fully drift (grind-season floors: health
            45-60 min/day, 1-2 date nights a week). */}
        {/* v23 — read-back only. The editable copy of this lived here AND on the
            rooms screen, with different eligibility rules (this one offered
            floors for three hardcoded areas; the ranker offers one for every
            area outside focus). One writer, one rule. */}
        <div className="mt-3 rounded-lg border border-white/10 bg-white/[0.02] px-3 py-2">
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-500 mb-1.5">The maintenance contract. Floors for what&apos;s NOT in focus</p>
          {focusAreaIds.length === 0 ? (
            <p className="text-[11px] text-zinc-500">Pick your season focus first and the floors for everything else appear here.</p>
          ) : (
            (() => {
              const floors = LIFE_MASTERY_AREAS.filter((a) => !focusAreaIds.includes(a.id) && (areaPlans[a.id]?.maintenance ?? "").trim())
              if (floors.length === 0) {
                return <p className="text-[11px] text-zinc-500">No floors written yet. A floor is the least you&apos;ll accept in an area you&apos;re not pushing.</p>
              }
              return (
                <ul className="grid gap-1 sm:grid-cols-2">
                  {floors.map((a) => (
                    <li key={a.id} className="text-[11px] text-zinc-300">
                      <span style={{ color: areaTextColor(a) }}>{areaName(a)}</span>
                      <span className="text-zinc-500"> — {areaPlans[a.id]?.maintenance}</span>
                    </li>
                  ))}
                </ul>
              )
            })()
          )}
          <p className="text-[10px] text-zinc-600 mt-1.5">A season of focus is fine; an accidental collapse isn&apos;t. Write the floor, keep the floor.</p>
        </div>
      </div>

      {/* The overlook — the whole plan at a glance */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 mb-10">
        {LIFE_MASTERY_AREAS.map((a) => {
          const feeding = goals.filter((g) => goalFeedsArea(g, a.id))
          const rating = latestRating(a.id)
          const hasTen = !!(yourTens[a.id] ?? "").trim()
          const hasPurpose = !!(areaPlans[a.id]?.purpose ?? "").trim()
          const complete = hasTen && hasPurpose && feeding.length > 0
          return (
            <button
              key={a.id}
              onClick={() => document.getElementById(`lm-area-${a.id}`)?.scrollIntoView({ behavior: "smooth", block: "start" })}
              className={`rounded-lg border px-3 py-2 text-left transition-colors hover:bg-white/[0.05] ${complete ? "border-white/15 bg-white/[0.04]" : "border-dashed border-white/15 bg-white/[0.02]"}`}
            >
              <span className="flex items-center gap-1.5 text-xs font-medium truncate" style={{ color: areaTextColor(a) }}>
                <span className="size-1.5 rounded-full shrink-0" style={{ backgroundColor: a.color }} />
                {areaName(a)}
              </span>
              <span className="flex items-center gap-2 mt-1 text-[10px] text-zinc-500 tabular-nums">
                {rating != null ? <span className={rating < LIFE_MASTERY_SUCCESS_LEVEL ? "text-amber-300" : "text-zinc-400"}>{rating}/10</span> : <span>—</span>}
                <span>{feeding.length} goal{feeding.length === 1 ? "" : "s"}</span>
                <span className="ml-auto flex items-center gap-1" title={`your 10 ${hasTen ? "✓" : "…"} · why ${hasPurpose ? "✓" : "…"} · goals ${feeding.length > 0 ? "✓" : "…"}`}>
                  {[hasTen, hasPurpose, feeding.length > 0].map((ok, i) => (
                    <span key={i} className={`size-1.5 rounded-full ${ok ? "bg-emerald-400/80" : "bg-white/15"}`} />
                  ))}
                </span>
              </span>
            </button>
          )
        })}
      </div>

      {/* One card per area, foundation first */}
      <div className="space-y-5">
        {LIFE_MASTERY_AREAS.map((a) => {
          const plan = areaPlans[a.id] ?? {}
          const feeding = goals.filter((g) => goalFeedsArea(g, a.id))
          const rating = latestRating(a.id)
          return (
            <div key={a.id} id={`lm-area-${a.id}`} className={`rounded-2xl border p-5 scroll-mt-20 ${focusAreaIds.includes(a.id) ? "border-white/20 bg-white/[0.05]" : "border-white/10 bg-white/[0.03]"}`}>
              <div className="flex items-center gap-2 flex-wrap">
                <button onClick={() => toggleOpen(a.id)} aria-expanded={isOpen(a.id)} aria-label={`${isOpen(a.id) ? "Collapse" : "Expand"} ${a.label}`} className="shrink-0">
                  <ChevronDown className={`size-3.5 text-zinc-500 transition-transform ${isOpen(a.id) ? "" : "-rotate-90"}`} />
                </button>
                <span className="size-2.5 rounded-full shrink-0" style={{ backgroundColor: a.color }} />
                <EditableTitle
                  value={areaName(a)}
                  onCommit={(next) => onAreaPlan(a.id, { name: next })}
                  ariaLabel={`Rename area ${a.label}`}
                  className="text-base font-semibold text-white"
                  inputClassName="text-base font-semibold bg-white/5 border border-white/20 rounded-md px-2 py-0.5 text-white"
                />
                {areaName(a) !== a.label && <span className="text-[10px] text-zinc-600">({a.label})</span>}
                {focusAreaIds.includes(a.id) && (
                  <span className="text-[9px] font-semibold uppercase px-1.5 py-px rounded-full border border-amber-400/40 bg-amber-500/10 text-amber-300">focus</span>
                )}
                <span className="text-[10px] text-zinc-500">{a.sublabel}</span>
                <span className="ml-auto text-xs tabular-nums shrink-0">
                  {rating != null
                    ? <span className={rating < LIFE_MASTERY_SUCCESS_LEVEL ? "text-amber-300" : "text-emerald-300"}>{rating}/10</span>
                    : <span className="text-zinc-600">not rated</span>}
                </span>
              </div>
              {isOpen(a.id) && areaName(a) === a.label && (
                <p className="text-[10px] text-zinc-600 mt-0.5 ml-4">Name it so it drives you. A flat label doesn&apos;t pull; a name like &ldquo;Physical Power&rdquo; does. Click the name to change it.</p>
              )}

              {isOpen(a.id) && (<>
              <div className="grid gap-3 md:grid-cols-2 mt-3">
                <label className="block">
                  <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-500">Your 10, the vision for this area</span>
                  <textarea
                    value={yourTens[a.id] ?? ""}
                    onChange={(e) => onYourTen(a.id, e.target.value)}
                    rows={2}
                    placeholder={a.prompt}
                    className="mt-1 w-full bg-white/5 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-white/20 resize-none"
                  />
                </label>
                <span className="block space-y-2">
                  <label className="block">
                    <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-500">Why this area matters</span>
                    <input
                      value={plan.purpose ?? ""}
                      onChange={(e) => onAreaPlan(a.id, { purpose: e.target.value })}
                      placeholder="What does mastering this give you?"
                      className="mt-1 w-full bg-white/5 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-white/20"
                    />
                  </label>
                  <label className="block">
                    <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-500">Who you are here</span>
                    <input
                      value={plan.identity ?? ""}
                      onChange={(e) => onAreaPlan(a.id, { identity: e.target.value })}
                      placeholder={`I am… (your identity in ${a.label.toLowerCase()})`}
                      className="mt-1 w-full bg-white/5 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-white/20"
                    />
                  </label>
                </span>
              </div>

              <div className="mt-3">
                <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-500">Goals in this area</span>
                {feeding.length > 0 ? (
                  <ul className="mt-1.5 space-y-1">
                    {feeding.map((g) => (
                      <li key={g.id} className="flex items-center gap-2 text-xs">
                        <span className="size-1.5 rounded-full shrink-0" style={{ backgroundColor: g.pillarColor }} />
                        <span className="text-zinc-200 min-w-0 truncate">{g.title}</span>
                        <span className="text-[10px] px-1.5 py-px rounded-full border border-white/15 text-zinc-500 shrink-0">{g.type === "habit_ramp" ? "habit" : "milestone"}</span>
                        {g.beliefLevel != null && (
                          <span className={`text-[10px] tabular-nums shrink-0 ${g.beliefLevel < BELIEF_SWEET_SPOT ? "text-amber-300" : "text-zinc-500"}`}>belief {g.beliefLevel}/10</span>
                        )}
                        <span className="text-[10px] text-zinc-600 min-w-0 truncate hidden sm:inline">— {g.why}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-[11px] text-zinc-600 mt-1 italic">
                    Nothing yet. No area gets left behind. Even one small goal keeps it growing.
                  </p>
                )}
                <AreaGoalComposer areaLabel={areaName(a)} onAdd={(input) => onAddGoal(a.id, input)} />
              </div>
              </>)}
            </div>
          )
        })}
      </div>
    </div>
  )
}

/** The guided-path badge: "N next" in the toolbar, opening the action list. */
function ActionsBadge({ actions, onGo }: { actions: PendingAction[]; onGo: (a: PendingAction) => void }) {
  const [open, setOpen] = useState(false)
  if (actions.length === 0) return null
  return (
    <span className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full border border-amber-400/40 bg-amber-500/10 text-amber-300 hover:bg-amber-500/20 transition-colors tabular-nums"
      >
        {actions.length} next {actions.length === 1 ? "action" : "actions"}
        <ChevronDown className={`size-3 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-2 w-72 rounded-xl border border-white/15 bg-zinc-900 shadow-xl z-30 p-1.5">
          <p className="text-[10px] text-zinc-500 px-2 py-1">Your guided path, in order:</p>
          {actions.map((a) => (
            <button
              key={a.id}
              onClick={() => { setOpen(false); onGo(a) }}
              className="w-full flex items-center gap-2 text-left text-xs text-zinc-200 rounded-lg px-2 py-1.5 hover:bg-white/10 transition-colors"
            >
              <span className="size-1.5 rounded-full bg-amber-400/80 shrink-0" />
              {a.label}
            </button>
          ))}
        </div>
      )}
    </span>
  )
}


// ===========================================================================
// v25 — THE SEQUENTIAL INTAKE
//
// The order is the source's: debrief the year, commit and audit what has been
// driving you, write the vision and the three things that hang off it, break
// life into areas, then set goals. See docs/plans/life-mastery-intake-redesign.md
//
// The anti-clunk rule: questions reveal one at a time DOWN A SINGLE SCROLL.
// There is no Next button inside a page and no Save button anywhere. Answer a
// question and the next one mounts below it. Five page transitions in the whole
// intake instead of nineteen.
// ===========================================================================

/** The rail. Five pages, current one highlighted, finished ones clickable. */
function IntakeRail({ page, pages, onGo, done, reachable }: {
  page: IntakePageId
  /** The pages actually in play. On a first run the year debrief is absent,
   * so it must not appear in the rail either. */
  pages: typeof INTAKE_PAGES
  onGo: (p: IntakePageId) => void
  done: (p: IntakePageId) => boolean
  reachable: (p: IntakePageId) => boolean
}) {
  const idx = pages.findIndex((p) => p.id === page)
  return (
    <div className="sticky top-[51px] z-10 -mx-6 px-6 py-2 mb-5 bg-zinc-950/85 backdrop-blur-sm">
      <div className="flex items-center justify-center gap-1 sm:gap-2 flex-wrap">
        {pages.map((p, i) => {
          const active = p.id === page
          const isDone = done(p.id)
          const locked = !reachable(p.id)
          // On a narrow screen only the current page and its neighbours stay
          // legible; the rest collapse to dots so the rail never wraps to
          // three lines on a phone.
          const near = Math.abs(i - idx) <= 1
          return (
            <span key={p.id} className="flex items-center gap-1 sm:gap-2">
              {i > 0 && <span className="w-4 sm:w-8 h-px bg-white/15" />}
              <button
                onClick={() => !locked && onGo(p.id)}
                disabled={locked}
                title={locked ? "Finish the page before this one first" : p.label}
                aria-current={active ? "step" : undefined}
                className={`flex items-center gap-1.5 text-xs px-2.5 sm:px-3 py-1.5 rounded-full border transition-colors ${
                  active ? "border-violet-400/60 bg-violet-500/20 text-white font-medium"
                  : isDone ? "border-emerald-400/40 bg-emerald-500/10 text-emerald-300"
                  : locked ? "border-white/10 text-zinc-600"
                  : "border-white/15 text-zinc-400 hover:text-zinc-200 hover:border-white/30"}`}
              >
                <span className={`size-4 rounded-full flex items-center justify-center text-[9px] font-bold shrink-0 ${
                  active ? "bg-violet-400 text-zinc-950" : isDone ? "bg-emerald-400 text-zinc-950" : "border border-current"}`}>
                  {isDone ? "✓" : locked ? <Lock className="size-2.5" /> : i + 1}
                </span>
                <span className={near ? "" : "hidden sm:inline"}>{p.label}</span>
              </button>
            </span>
          )
        })}
      </div>
    </div>
  )
}

/**
 * One question, rendered as the same four slots every time: the question, why
 * you are being asked, a worked answer from the source, and a couple of
 * ordinary examples. The input underneath depends on the question's kind.
 *
 * `autoFocusOnMount` is what makes the reveal feel like one continuous motion:
 * the newly mounted question scrolls itself into view once and takes the
 * caret, so typing continues without touching the mouse.
 */
function IntakeQuestionBlock({ q, isNewest, answered, children, onSkip }: {
  q: IntakeQuestion
  isNewest: boolean
  answered: boolean
  children: ReactNode
  onSkip: () => void
}) {
  const ref = useRef<HTMLDivElement | null>(null)
  const scrolled = useRef(false)
  useEffect(() => {
    if (!isNewest || scrolled.current || !ref.current) return
    scrolled.current = true
    // Never scroll-jack the very first question of a page, and respect a
    // reduced-motion preference by jumping instead of gliding.
    const reduce = typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches
    ref.current.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "nearest" })
  }, [isNewest])

  const [showWorked, setShowWorked] = useState(false)
  return (
    <div ref={ref} id={`intake-${q.id}`} className="scroll-mt-28 rounded-xl border border-white/10 bg-white/[0.03] p-4 sm:p-5">
      <div className="flex items-start gap-2">
        <span className={`mt-1 size-4 rounded-full flex items-center justify-center text-[9px] font-bold shrink-0 ${
          answered ? "bg-emerald-400 text-zinc-950" : "border border-white/25 text-zinc-500"}`}>
          {answered ? "✓" : ""}
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="text-[15px] sm:text-base font-semibold text-zinc-100 leading-snug">{q.question}</h3>
          <p className="text-[12px] text-zinc-400 mt-1.5 leading-relaxed">{q.why}</p>
        </div>
      </div>

      <div className="mt-3.5">{children}</div>

      {(q.quote || q.examples.length > 0) && (
        <div className="mt-3 pt-3 border-t border-white/[0.06]">
          {q.quote && (
            <>
              <button
                onClick={() => setShowWorked((s) => !s)}
                className="text-[11px] text-zinc-500 hover:text-zinc-300 transition-colors"
              >
                {showWorked ? "Hide the worked answer" : "See a worked answer"}
              </button>
              {showWorked && (
                <blockquote className="mt-2 pl-3 border-l-2 border-violet-400/30 text-[12px] text-violet-100/80 italic leading-relaxed">
                  {q.quote}
                  {q.quoteVideoId && <span className="not-italic text-zinc-600"> ({q.quoteVideoId})</span>}
                </blockquote>
              )}
            </>
          )}
          {q.examples.length > 0 && (
            <ul className="mt-2 space-y-1">
              {q.examples.map((e) => (
                <li key={e} className="text-[11px] text-zinc-500 leading-relaxed">
                  <span className="text-zinc-600">e.g.</span> {e}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {!answered && (
        <button onClick={onSkip} className="mt-3 text-[11px] text-zinc-600 hover:text-zinc-400 underline decoration-dotted underline-offset-2 transition-colors">
          {INTAKE_SKIP_LABEL}
        </button>
      )}
    </div>
  )
}

/**
 * The commit control. This is the intake's first question and it had no input
 * at all, so the only way past it was the skip link. The full manifesto is
 * signed at the end of the intake; this is the lighter decision that opens the
 * work, and it is the one the source puts first.
 */
function IntakeCommit({ committedAt, today, onCommit, onUndo }: {
  committedAt: string | null
  today: string
  onCommit: () => void
  onUndo: () => void
}) {
  if (committedAt) {
    return (
      <div className="flex flex-wrap items-center gap-2 rounded-lg border border-emerald-400/30 bg-emerald-500/[0.07] px-3 py-2.5">
        <Check className="size-4 text-emerald-300 shrink-0" />
        <span className="text-sm text-emerald-100">You committed on {committedAt}.</span>
        <button onClick={onUndo} className="ml-auto text-[11px] text-zinc-500 hover:text-zinc-300 underline decoration-dotted underline-offset-2 transition-colors">
          Undo
        </button>
      </div>
    )
  }
  return (
    <div>
      <ul className="space-y-1.5 mb-3">
        {["I am committing to every area of my life, including the quiet ones.",
          "I expect the flat stretch where progress stops showing, and I plan to keep going through it.",
          "I am doing the work, and not only reading about it."].map((line) => (
          <li key={line} className="flex items-start gap-2 text-sm text-zinc-200 leading-relaxed">
            <span className="mt-1.5 size-1.5 rounded-full bg-violet-400/70 shrink-0" />
            <span>{line}</span>
          </li>
        ))}
      </ul>
      <button
        onClick={onCommit}
        className="text-sm font-medium px-4 py-2 rounded-lg bg-violet-500/20 border border-violet-400/40 text-violet-100 hover:bg-violet-500/30 transition-all"
      >
        I commit, {today}
      </button>
    </div>
  )
}

/** A free-text answer. Saves as you type, so there is no Save button. */
function IntakeText({ value, onChange, placeholder, long }: {
  value: string
  onChange: (v: string) => void
  placeholder?: string
  long?: boolean
}) {
  return long ? (
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      rows={6}
      className="w-full rounded-lg bg-black/20 border border-white/10 focus:border-violet-400/40 text-sm text-zinc-200 placeholder:text-zinc-600 focus:outline-none p-3 leading-relaxed resize-y"
    />
  ) : (
    <input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full bg-transparent border-b border-white/10 focus:border-white/30 text-sm text-zinc-200 placeholder:text-zinc-600 focus:outline-none py-1"
    />
  )
}

/** A list answer. Enter adds a line, which is the whole interaction. */
function IntakeList({ items, onChange, placeholder }: {
  items: string[]
  onChange: (next: string[]) => void
  placeholder?: string
}) {
  const [draft, setDraft] = useState("")
  const add = () => {
    const t = draft.trim()
    if (!t || items.includes(t)) { setDraft(""); return }
    onChange([...items, t])
    setDraft("")
  }
  return (
    <div>
      {items.length > 0 && (
        <ul className="space-y-1 mb-2">
          {items.map((it) => (
            <li key={it} className="group/li flex items-start gap-2 text-sm text-zinc-200">
              <span className="mt-1.5 size-1.5 rounded-full bg-violet-400/70 shrink-0" />
              <span className="flex-1 min-w-0 leading-relaxed">{it}</span>
              <button
                onClick={() => onChange(items.filter((x) => x !== it))}
                aria-label={`Remove ${it}`}
                className="mt-0.5 text-zinc-600 hover:text-red-300 opacity-0 group-hover/li:opacity-100 focus:opacity-100 transition-all shrink-0"
              ><X className="size-3.5" /></button>
            </li>
          ))}
        </ul>
      )}
      <div className="flex items-center gap-2">
        <Plus className="size-3.5 shrink-0 text-zinc-600" />
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); add() } }}
          onBlur={add}
          placeholder={placeholder}
          className="flex-1 min-w-0 bg-transparent border-b border-white/10 focus:border-white/30 text-sm text-zinc-200 placeholder:text-zinc-600 focus:outline-none py-0.5"
        />
        <button onClick={add} disabled={!draft.trim()} className="text-[11px] px-2 py-0.5 rounded-md border border-white/15 text-zinc-300 hover:bg-white/10 disabled:opacity-30 transition-colors">Add</button>
      </div>
    </div>
  )
}

/**
 * The driving force, assembled. This is the payoff of page 2: the four things
 * that hang off the vision, on one card, in the order they were written, so it
 * reads top to bottom. The weekly review re-reads exactly this.
 */
function DrivingForceCard({ vision, purpose, identity, conduct }: {
  vision: string
  purpose: string
  identity: string[]
  conduct: string[]
}) {
  const has = vision.trim() || purpose.trim() || identity.length > 0 || conduct.length > 0
  if (!has) return null
  const row = (label: string, body: ReactNode) => (
    <div className="py-2.5 border-t border-white/[0.06] first:border-t-0 first:pt-0">
      <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-violet-300/70">{label}</span>
      <div className="mt-1 text-sm text-zinc-200 leading-relaxed">{body}</div>
    </div>
  )
  return (
    <div className="rounded-xl border border-violet-400/25 bg-violet-500/[0.06] p-4 sm:p-5">
      <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-violet-200/90 mb-3">Your driving force</p>
      {vision.trim() && row("The life you're building", <p className="whitespace-pre-wrap">{vision}</p>)}
      {purpose.trim() && row("Why you want it", <p className="whitespace-pre-wrap">{purpose}</p>)}
      {identity.length > 0 && row("Who you're being", <ul className="space-y-0.5">{identity.map((l) => <li key={l}>{l}</li>)}</ul>)}
      {conduct.length > 0 && row("How you show up", <ul className="space-y-0.5">{conduct.map((l) => <li key={l}>{l}</li>)}</ul>)}
      <p className="text-[11px] text-zinc-500 mt-3 pt-3 border-t border-white/[0.06]">Read this every week. It is what the whole plan hangs off.</p>
    </div>
  )
}

/**
 * v20 — the SINGLE branch of the relationship area. Everything the area used to
 * offer assumed you were already partnered; this is what the framework's author
 * actually taught single men, and it only renders when the user says that's
 * where they are.
 *
 * Voice rule, from him: add value, become attractive. Never "pickup", never
 * framed as acquiring a person.
 */
function SinglePersonPanel({ color, reps, onReps, status, onStatus, journals, onLogSession, today }: {
  color: string
  reps: Record<string, number>
  onReps: (level: number, next: number) => void
  status: RelationshipStatus
  onStatus: (s: RelationshipStatus) => void
  journals: Array<{ id: string; date: string; reps: string; body: string; felt: string; her: string; next: string }>
  onLogSession: (j: { id: string; date: string; reps: string; body: string; felt: string; her: string; next: string }) => void
  today: string
}) {
  const [openJournal, setOpenJournal] = useState(false)
  const [journalDraft, setJournalDraft] = useState<Record<string, string>>({})
  const live = approachRung(reps, APPROACH_LADDER)
  if (status === "unset") {
    return (
      <div className="mt-2 rounded-lg border border-white/10 bg-white/[0.02] px-2.5 py-2">
        <p className="text-[11px] text-zinc-400">Where are you with this?</p>
        <p className="text-[10px] text-zinc-600 mt-0.5">The work is completely different depending on the answer, so the area asks rather than assuming.</p>
        <div className="flex items-center gap-2 mt-1.5">
          <button onClick={() => onStatus("single")} className="text-[11px] px-2.5 py-1 rounded-md border border-white/20 text-zinc-200 hover:bg-white/10 transition-colors">Single, and looking</button>
          <button onClick={() => onStatus("partnered")} className="text-[11px] px-2.5 py-1 rounded-md border border-white/20 text-zinc-200 hover:bg-white/10 transition-colors">With someone</button>
        </div>
      </div>
    )
  }
  if (status === "partnered") {
    return (
      <p className="mt-2 text-[10px] text-zinc-600">
        Showing the couples toolkit — the relationship journal, the six needs, the love-language check.{" "}
        <button onClick={() => onStatus("single")} className="underline decoration-dotted hover:text-zinc-400 transition-colors">I&apos;m single, actually</button>
      </p>
    )
  }
  return (
    <div className="mt-2 space-y-2.5">
      <div className="flex items-baseline gap-2">
        <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-500">Meeting people, the ladder</span>
        <button onClick={() => onStatus("partnered")} className="ml-auto text-[10px] text-zinc-600 hover:text-zinc-400 transition-colors">I&apos;m with someone now</button>
      </div>
      <p className="text-[11px] text-zinc-400">
        This came out of 2,000 approaches in a year, at eighteen. It moves on reps. And you end every interaction yourself, which is where &ldquo;there&apos;s no rejection&rdquo; comes from.
      </p>
      {APPROACH_LADDER.map((rung) => {
        const done = reps[String(rung.level)] ?? 0
        const isLive = rung.level === live
        const isPast = rung.level < live
        return (
          <div key={rung.level} className={`rounded-lg border px-2.5 py-2 ${isLive ? "border-white/25 bg-white/[0.06]" : "border-white/10 bg-transparent"}`}>
            <div className="flex items-center gap-2">
              <span className={`size-5 rounded-full flex items-center justify-center text-[10px] font-semibold shrink-0 ${isPast ? "text-zinc-950" : isLive ? "border" : "border border-white/15 text-zinc-600"}`} style={isPast ? { background: color } : isLive ? { borderColor: color, color } : undefined}>
                {isPast ? "✓" : rung.level}
              </span>
              <span className={`text-xs min-w-0 flex-1 ${isLive ? "text-zinc-100" : isPast ? "text-zinc-400" : "text-zinc-600"}`}>{rung.title}</span>
              {rung.repsToAdvance > 0 && (
                <span className="text-[10px] tabular-nums text-zinc-500 shrink-0">{done}/{rung.repsToAdvance}</span>
              )}
              {isLive && (
                <span className="flex items-center gap-1 shrink-0">
                  <button onClick={() => onReps(rung.level, Math.max(0, done - 1))} aria-label={`One fewer at level ${rung.level}`} className="size-5 rounded border border-white/15 text-zinc-400 hover:bg-white/10 transition-colors">−</button>
                  <button onClick={() => onReps(rung.level, done + 1)} aria-label={`Log one at level ${rung.level}`} className="size-5 rounded border border-white/15 text-zinc-200 hover:bg-white/10 transition-colors">+</button>
                </span>
              )}
            </div>
            {isLive && (
              <>
                <p className="text-[11px] text-zinc-300 mt-1">{rung.action}</p>
                <p className="text-[10px] text-zinc-500 mt-0.5">{rung.point}</p>
              </>
            )}
          </div>
        )
      })}

      {live === 4 && (
        <div className="rounded-lg border border-white/10 bg-white/[0.02] px-2.5 py-2">
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-500">The opener, a shape to make your own</p>
          <p className="text-xs text-zinc-200 mt-1 italic">&ldquo;{APPROACH_OPENER.template}&rdquo;</p>
          <p className="text-[10px] text-zinc-600 mt-1">{APPROACH_OPENER.note}</p>
        </div>
      )}

      <div className="rounded-lg border border-white/10 bg-white/[0.02] px-2.5 py-2">
        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-500">A starting volume</p>
        <p className="text-xs text-zinc-300 mt-0.5">{APPROACH_REPS.perDay} a day, {APPROACH_REPS.daysPerWeek} days a week — as a practice, not a quota.</p>
        <p className="text-[10px] text-zinc-500 mt-1">&ldquo;{APPROACH_REPS.purposeQuote}&rdquo;</p>
        <p className="text-[10px] text-zinc-600 mt-1">Where this works: {APPROACH_VENUES.join(" · ")}</p>
      </div>

      {/* v23 — these five inputs used to have NO `value` and NO `onChange`:
          React never saw a keystroke, so the text died on the next re-render,
          not merely on navigation. It is the only artifact in this room that
          produces learning, so it is now a real, saved log. */}
      <div>
        <button onClick={() => setOpenJournal((o) => !o)} aria-expanded={openJournal} className="flex items-center gap-1.5 text-[11px] text-zinc-500 hover:text-zinc-300 transition-colors">
          <ChevronDown className={`size-3 transition-transform ${openJournal ? "" : "-rotate-90"}`} />
          After a session — the debrief questions
          {journals.length > 0 && <span className="text-zinc-600">· {journals.length} logged</span>}
        </button>
        {openJournal && (
          <div className="mt-1.5 space-y-1.5 pl-4 border-l" style={{ borderColor: `${color}33` }}>
            {SESSION_JOURNAL_PROMPTS.map((q) => (
              <div key={q.id}>
                <p className="text-[10px] text-zinc-500">{q.label}</p>
                <input
                  aria-label={q.label}
                  placeholder={q.placeholder}
                  value={journalDraft[q.id] ?? ""}
                  onChange={(e) => setJournalDraft((prev) => ({ ...prev, [q.id]: e.target.value }))}
                  className="mt-0.5 w-full bg-white/5 border border-white/10 rounded-md px-2 py-1 text-[11px] text-zinc-200 placeholder:text-zinc-700 focus:outline-none focus:border-white/25"
                />
              </div>
            ))}
            <div className="flex items-center gap-2 pt-0.5">
              <button
                onClick={() => {
                  if (!SESSION_JOURNAL_PROMPTS.some((q) => (journalDraft[q.id] ?? "").trim())) return
                  onLogSession({
                    id: `sj-${Date.now()}`,
                    date: today,
                    reps: (journalDraft.reps ?? "").trim(),
                    body: (journalDraft.body ?? "").trim(),
                    felt: (journalDraft.felt ?? "").trim(),
                    her: (journalDraft.her ?? "").trim(),
                    next: (journalDraft.next ?? "").trim(),
                  })
                  setJournalDraft({})
                }}
                disabled={!SESSION_JOURNAL_PROMPTS.some((q) => (journalDraft[q.id] ?? "").trim())}
                className="text-[10px] px-2 py-0.5 rounded-full border border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/10 disabled:opacity-30 transition-colors"
              >
                Save this session
              </button>
              <span className="text-[10px] text-zinc-600">Saved sessions show up in your weekly review.</span>
            </div>
            {journals.length > 0 && (
              <ul className="pt-1 space-y-1">
                {journals.slice(-3).reverse().map((j) => (
                  <li key={j.id} className="text-[10px] text-zinc-500">
                    <span className="text-zinc-400">{j.date}</span>
                    {j.reps ? ` · ${j.reps}` : ""}
                    {j.next ? ` · next: ${j.next}` : ""}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>

      <p className="text-[10px] text-zinc-600">
        Reading he actually prescribes for this: {SINGLE_BOOKS.join(" · ")}.
      </p>
    </div>
  )
}

/**
 * v21 — THE BELIEF-CHANGE EXERCISE. His procedure, in order. Reachable wherever
 * a belief is in the way: from an identity field, or from a goal you keep not
 * doing. Step 2 is the one that does the work — it asks whether the belief is
 * USEFUL, not whether it's true, so nobody has to win an argument to move.
 */
function BeliefWorkPanel({ beliefs, onChange, today }: {
  beliefs: BeliefWork[]
  /** Updater, not a value — same reason as BrainstormPanel: logging references
   * and editing steps produces bursts of clicks. */
  onChange: (updater: (prev: BeliefWork[]) => BeliefWork[]) => void
  today: string
}) {
  const [draft, setDraft] = useState("")
  const [openId, setOpenId] = useState<string | null>(null)
  const add = () => {
    const t = draft.trim()
    if (!t) return
    const id = `belief-${Date.now().toString(36)}`
    onChange((prev) => [...prev, { id, old: t }])
    setDraft(""); setOpenId(id)
  }
  const patch = (id: string, p: Partial<BeliefWork>) =>
    onChange((prev) => prev.map((b) => (b.id === id ? { ...b, ...p } : b)))

  return (
    <div className="space-y-2">
      <p className="text-[11px] text-zinc-500">
        {BELIEF_SHORT_FORM.gloss}
      </p>
      <div className="flex items-center gap-2">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); add() } }}
          aria-label="A belief that's in the way"
          placeholder={BELIEF_STEMS.join("   ")}
          className="flex-1 min-w-0 bg-white/5 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-white/30"
        />
        <button onClick={add} disabled={!draft.trim()} className="text-[11px] px-2.5 py-1 rounded-md border border-white/15 text-zinc-300 hover:bg-white/10 disabled:opacity-30 transition-colors">Add</button>
      </div>

      {beliefs.map((b) => {
        const open = openId === b.id
        const cond = beliefConditioning(b, today)
        return (
          <div key={b.id} className="rounded-lg border border-white/10 bg-white/[0.03]">
            <button onClick={() => setOpenId(open ? null : b.id)} aria-expanded={open} className="w-full flex items-center gap-2 px-2.5 py-2 text-left">
              <span className="text-xs min-w-0 flex-1 truncate text-zinc-200">{b.replacement || b.old}</span>
              {cond && (
                <span className={`text-[10px] tabular-nums shrink-0 ${cond.installed ? "text-emerald-300" : "text-zinc-500"}`}>
                  day {cond.day} · {cond.references} refs{cond.installed ? " · installed" : ""}
                </span>
              )}
              {b.useful === true && <span className="text-[9px] px-1.5 py-px rounded-full border border-white/15 text-zinc-500 shrink-0">kept</span>}
              <ChevronDown className={`size-3.5 shrink-0 text-zinc-600 transition-transform ${open ? "" : "-rotate-90"}`} />
            </button>
            {open && (
              <div className="px-2.5 pb-2.5 space-y-2 border-t border-white/5 pt-2">
                <p className="text-[11px] text-zinc-500">The belief: &ldquo;{b.old}&rdquo;</p>

                {/* Step 2 — the usefulness test, and a real exit if the answer is yes */}
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-500">{BELIEF_STEPS[1].title}</p>
                  <p className="text-[11px] text-zinc-400 mt-0.5">{BELIEF_STEPS[1].ask}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <button onClick={() => patch(b.id, { useful: false })} aria-pressed={b.useful === false} className={`text-[11px] px-2 py-0.5 rounded-md border transition-colors ${b.useful === false ? "border-violet-400/60 bg-violet-500/20 text-white" : "border-white/15 text-zinc-400 hover:text-zinc-200"}`}>No, it costs me</button>
                    <button onClick={() => patch(b.id, { useful: true })} aria-pressed={b.useful === true} className={`text-[11px] px-2 py-0.5 rounded-md border transition-colors ${b.useful === true ? "border-white/40 bg-white/10 text-white" : "border-white/15 text-zinc-400 hover:text-zinc-200"}`}>Actually yes</button>
                  </div>
                  {b.useful === true && (
                    <p className="text-[10px] text-zinc-500 mt-1">Then keep it. A belief that serves you isn&apos;t a limiting belief, and there&apos;s nothing to fix here.</p>
                  )}
                </div>

                {b.useful === false && (
                  <>
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-500">{BELIEF_STEPS[2].title}</p>
                      <p className="text-[11px] text-zinc-400 mt-0.5">{BELIEF_STEPS[2].ask}</p>
                      <GuideList label="Counter-evidence" placeholder="Someone who did it anyway. Or a time you already did" items={b.evidence ?? []} onChange={(evidence) => patch(b.id, { evidence })} />
                    </div>
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-500">{BELIEF_STEPS[3].title}</p>
                      <p className="text-[11px] text-zinc-400 mt-0.5">{BELIEF_STEPS[3].ask}</p>
                      <input
                        value={b.replacement ?? ""}
                        onChange={(e) => patch(b.id, { replacement: e.target.value, startedAt: b.startedAt ?? today })}
                        aria-label={`Replacement for: ${b.old}`}
                        placeholder="Believable AND useful"
                        className="mt-1 w-full bg-white/5 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-white/30"
                      />
                      <p className="text-[10px] text-zinc-600 mt-1">{BELIEF_STEPS[3].why}</p>
                    </div>
                    {b.replacement && (
                      <div>
                        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-500">{BELIEF_STEPS[5].title}</p>
                        <p className="text-[11px] text-zinc-400 mt-0.5">{BELIEF_STEPS[5].why}</p>
                        <button
                          onClick={() => onChange((prev) => prev.map((x) => (x.id === b.id ? { ...x, references: [...(x.references ?? []), today] } : x)))}
                          className="mt-1 text-[11px] px-2.5 py-1 rounded-md border border-emerald-400/40 bg-emerald-500/10 text-emerald-100 hover:bg-emerald-500/20 transition-colors"
                        >
                          + I acted as if it were true today
                        </button>
                        {cond && (
                          <p className="text-[10px] text-zinc-600 mt-1">
                            {cond.installed
                              ? "Past 30 days with real references behind it. That's a leg-count worth trusting."
                              : `Day ${cond.day} of 30, ${cond.references} references. Both matter: time alone doesn't install it.`}
                          </p>
                        )}
                      </div>
                    )}
                    <p className="text-[10px] text-zinc-600">{BELIEF_STEPS[6].ask}</p>
                  </>
                )}
                <button onClick={() => onChange((prev) => prev.filter((x) => x.id !== b.id))} className="text-[10px] text-zinc-600 hover:text-red-300 transition-colors">remove this belief</button>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

/**
 * v21 — COURSE CORRECTION on a goal that's behind. His moves in order, with the
 * dabbler guard-rail on everything past "change the approach". Dropping is
 * available but last, and only as a deliberate choice.
 */
function CorrectionPanel({ goalTitle, onVerdict, onClose }: {
  goalTitle: string
  onVerdict: (verdict: VisionGoalVerdict, reason: string) => void
  onClose: () => void
}) {
  const [moveId, setMoveId] = useState<string | null>(null)
  const [guard, setGuard] = useState<"strategic" | "lost" | null>(null)
  const [reason, setReason] = useState("")
  const move = CORRECTION_MOVES.find((m) => m.id === moveId)
  const guardCleared = !move?.needsGuardRail || guard === "strategic"
  return (
    <div className="rounded-lg border border-amber-400/25 bg-amber-500/[0.05] px-2.5 py-2 space-y-2">
      <div className="flex items-center gap-2">
        <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-amber-200/90">Behind on &ldquo;{goalTitle}&rdquo;</span>
        <button onClick={onClose} aria-label="Close" className="ml-auto text-zinc-600 hover:text-zinc-300"><X className="size-3" /></button>
      </div>
      <p className="text-[11px] text-zinc-400">In order. Approach first, letting go last. Most goals need the first one.</p>
      <div className="space-y-1">
        {CORRECTION_MOVES.map((m, i) => (
          <button
            key={m.id}
            onClick={() => { setMoveId(m.id); setGuard(null) }}
            aria-pressed={moveId === m.id}
            className={`w-full text-left rounded-md border px-2 py-1.5 transition-colors ${moveId === m.id ? "border-white/30 bg-white/[0.07]" : "border-white/10 hover:bg-white/[0.04]"}`}
          >
            <span className="text-[11px] text-zinc-200">{i + 1}. {m.title}</span>
            {moveId === m.id && <span className="block text-[10px] text-zinc-500 mt-0.5">{m.ask}</span>}
          </button>
        ))}
      </div>
      {move?.needsGuardRail && (
        <div className="rounded-md border border-white/10 bg-white/[0.02] px-2 py-1.5">
          <p className="text-[11px] text-zinc-300">{CORRECTION_GUARD_RAIL.question}</p>
          <div className="flex items-center gap-2 mt-1">
            <button onClick={() => setGuard("strategic")} aria-pressed={guard === "strategic"} className={`text-[10px] px-2 py-0.5 rounded border transition-colors ${guard === "strategic" ? "border-violet-400/60 bg-violet-500/20 text-white" : "border-white/15 text-zinc-400"}`}>{CORRECTION_GUARD_RAIL.strategic}</button>
            <button onClick={() => setGuard("lost")} aria-pressed={guard === "lost"} className={`text-[10px] px-2 py-0.5 rounded border transition-colors ${guard === "lost" ? "border-amber-400/60 bg-amber-500/20 text-white" : "border-white/15 text-zinc-400"}`}>{CORRECTION_GUARD_RAIL.lostIt}</button>
          </div>
          {guard === "lost" && <p className="text-[10px] text-amber-300/80 mt-1">{CORRECTION_GUARD_RAIL.lostItAdvice}</p>}
        </div>
      )}
      {move && guardCleared && (
        <div>
          <input
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            aria-label="Reason for this change"
            placeholder="What changed? (every non-achieved status carries a reason)"
            className="w-full bg-white/5 border border-white/10 rounded-md px-2 py-1 text-[11px] text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-white/25"
          />
          <button
            onClick={() => { if (move.verdict) onVerdict(move.verdict, reason.trim()); onClose() }}
            disabled={!reason.trim() || !move.verdict}
            className="mt-1.5 text-[11px] px-2.5 py-1 rounded-md border border-violet-400/40 bg-violet-500/10 text-violet-100 hover:bg-violet-500/20 disabled:opacity-30 transition-colors"
          >
            Record it
          </button>
        </div>
      )}
    </div>
  )
}

/**
 * v21 — THE DIVERGENT PHASE. Dump everything unfiltered, then put a horizon
 * number beside each line, then circle this year's. Without this there is
 * nothing for 80/20 to cut, which is why the old flow went straight to
 * structured goals and never felt like his workshop.
 */
function BrainstormPanel({ wants, onChange }: {
  wants: Array<{ id: string; text: string; years: HorizonYears | null; circled: boolean }>
  /** Takes an UPDATER, not a value. Numbering a list means many clicks in quick
   * succession; passing a computed array would make every click read the same
   * render's copy and silently overwrite the previous one. */
  onChange: (updater: (prev: Array<{ id: string; text: string; years: HorizonYears | null; circled: boolean }>) => Array<{ id: string; text: string; years: HorizonYears | null; circled: boolean }>) => void
}) {
  const [draft, setDraft] = useState("")
  const [phase, setPhase] = useState<"dump" | "number" | "circle">("dump")
  const add = () => {
    const t = draft.trim()
    if (!t) return
    onChange((prev) => [...prev, { id: `w-${Date.now().toString(36)}-${prev.length}`, text: t, years: null, circled: false }])
    setDraft("")
  }
  const patch = (id: string, p: Partial<{ years: HorizonYears | null; circled: boolean }>) =>
    onChange((prev) => prev.map((w) => (w.id === id ? { ...w, ...p } : w)))
  const oneYear = wants.filter((w) => w.years === 1)
  const keep = paretoKeepCount(oneYear.length)
  const circled = oneYear.filter((w) => w.circled).length

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-1">
        {(["dump", "number", "circle"] as const).map((ph, i) => (
          <button
            key={ph}
            onClick={() => setPhase(ph)}
            aria-pressed={phase === ph}
            className={`text-[10px] px-2 py-0.5 rounded-full border transition-colors ${phase === ph ? "border-violet-400/60 bg-violet-500/20 text-white" : "border-white/15 text-zinc-500 hover:text-zinc-300"}`}
          >
            {i + 1}. {ph === "dump" ? "Dump" : ph === "number" ? "Number" : "Circle"}
          </button>
        ))}
        <span className="ml-auto text-[10px] text-zinc-600 tabular-nums">{wants.length} written</span>
      </div>

      {phase === "dump" && (
        <>
          <p className="text-[11px] text-zinc-500">
            Five to ten minutes, no filter, no editing, no deciding whether it&apos;s realistic. Realism is a later step. This one is for volume.
          </p>
          <div className="flex items-center gap-2">
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); add() } }}
              aria-label="Something you want"
              placeholder="Anything you want. Money, body, places, people, things"
              className="flex-1 min-w-0 bg-white/5 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-white/30"
            />
            <button onClick={add} disabled={!draft.trim()} className="text-[11px] px-2.5 py-1 rounded-md border border-white/15 text-zinc-300 hover:bg-white/10 disabled:opacity-30 transition-colors">Add</button>
          </div>
        </>
      )}

      {phase === "number" && (
        <p className="text-[11px] text-zinc-500">
          A number beside each one: how many years out is this? Use 1, 3, 5, 10 or 20. Only the 1s become this year&apos;s goals.
        </p>
      )}

      {phase === "circle" && (
        <p className="text-[11px] text-zinc-500">
          {oneYear.length} tagged for this year. Circle the ones that actually make the cut — 80/20 says about {keep}. You have {circled}.
        </p>
      )}

      <ul className="space-y-1 max-h-64 overflow-y-auto pr-1">
        {wants.map((w) => (
          <li key={w.id} className="group flex items-center gap-2 rounded-md border border-white/10 bg-white/[0.02] px-2 py-1">
            {phase === "circle" && w.years === 1 && (
              <button
                onClick={() => patch(w.id, { circled: !w.circled })}
                aria-label={`${w.circled ? "Uncircle" : "Circle"} ${w.text}`}
                aria-pressed={w.circled}
                className={`size-4 rounded-full border shrink-0 transition-colors ${w.circled ? "bg-violet-400 border-violet-400" : "border-white/25"}`}
              />
            )}
            <span className={`text-xs min-w-0 flex-1 ${phase === "circle" && w.years !== 1 ? "text-zinc-600" : "text-zinc-200"}`}>{w.text}</span>
            {phase === "number" && (
              <span className="flex items-center gap-0.5 shrink-0">
                {HORIZON_YEARS.map((y) => (
                  <button
                    key={y}
                    onClick={() => patch(w.id, { years: w.years === y ? null : y })}
                    aria-label={`${w.text}: ${y} years`}
                    aria-pressed={w.years === y}
                    className={`text-[10px] tabular-nums px-1 py-0.5 rounded border transition-colors ${w.years === y ? "border-violet-400/60 bg-violet-500/20 text-white" : "border-white/10 text-zinc-500 hover:text-zinc-300"}`}
                  >{y}</button>
                ))}
              </span>
            )}
            {phase !== "number" && w.years != null && (
              <span className="text-[10px] tabular-nums text-zinc-500 shrink-0">{w.years}y</span>
            )}
            <button onClick={() => onChange((prev) => prev.filter((x) => x.id !== w.id))} aria-label={`Remove ${w.text}`} className="opacity-0 group-hover:opacity-100 text-zinc-600 hover:text-red-300 transition-all shrink-0">×</button>
          </li>
        ))}
      </ul>
      {wants.length === 0 && <p className="text-[10px] text-zinc-600">Nothing yet. Start typing. Quantity first.</p>}
    </div>
  )
}

/** v20 — a rapid list input used by several guide sessions (debrief lines,
 * brainstorm lines). Add on Enter, remove on hover. */
function GuideList({ label, placeholder, items, onChange, noBut }: {
  label: string
  placeholder: string
  items: string[]
  onChange: (items: string[]) => void
  /** The debrief's no-"but" rule — warn rather than block; it's his point, not a validator. */
  noBut?: boolean
}) {
  const [draft, setDraft] = useState("")
  const butWarn = noBut && /\bbut\b/i.test(draft)
  const add = () => {
    const t = draft.trim()
    if (!t) return
    onChange([...items, t])
    setDraft("")
  }
  return (
    <div>
      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-500">{label}</p>
      {items.length > 0 && (
        <ol className="mt-1 space-y-0.5">
          {items.map((it, i) => (
            <li key={`${it}-${i}`} className="group flex items-baseline gap-2 text-xs text-zinc-200">
              <span className="text-zinc-600 tabular-nums shrink-0">{i + 1}.</span>
              <span className="min-w-0">{it}</span>
              <button onClick={() => onChange(items.filter((_, n) => n !== i))} aria-label={`Remove ${it}`} className="ml-auto opacity-0 group-hover:opacity-100 text-zinc-600 hover:text-red-300 transition-opacity shrink-0">×</button>
            </li>
          ))}
        </ol>
      )}
      <input
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); add() } }}
        onBlur={add}
        aria-label={label}
        placeholder={placeholder}
        className="mt-1 w-full bg-white/5 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-white/30"
      />
      {butWarn && (
        <p className="text-[10px] text-amber-300/80 mt-1">
          Careful with &ldquo;but&rdquo;. It cheapens the win. Let the good stand on its own; the challenges get their own list.
        </p>
      )}
    </div>
  )
}

/** v20 — his answer, shown beside yours. The whole point of the exemplar:
 * "it's easier to write yours after reading one." */
function HisAnswer({ quotes, gloss, reconstructed }: {
  quotes: Array<{ quote: string; videoId: string; era: ExemplarEra }>
  gloss?: string
  reconstructed?: boolean
}) {
  const [open, setOpen] = useState(false)
  if (quotes.length === 0 && !gloss) return null
  return (
    <div className="mt-2 rounded-lg border border-sky-400/20 bg-sky-500/[0.05] px-2.5 py-2">
      <button onClick={() => setOpen((o) => !o)} aria-expanded={open} className="w-full flex items-center gap-2 text-left">
        <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-sky-200/90">A worked example</span>
        {reconstructed && (
          <span className="text-[9px] px-1.5 py-px rounded-full border border-amber-400/30 text-amber-300" title="No written paragraph exists for this area. This is assembled from how it is described elsewhere">
            reconstructed
          </span>
        )}
        <span className="ml-auto text-[10px] text-zinc-500">{open ? "hide" : "read it"}</span>
      </button>
      {open && (
        <>
          {gloss && <p className="text-[11px] text-zinc-400 mt-1.5">{gloss}</p>}
          {quotes.map((q, i) => (
            <blockquote key={i} className="mt-1.5 pl-2 border-l border-sky-400/30">
              <p className="text-[11px] text-zinc-200 leading-relaxed">&ldquo;{q.quote}&rdquo;</p>
              <p className="text-[9px] text-zinc-600 mt-0.5">{EXEMPLAR_ERA_LABEL[q.era]}</p>
            </blockquote>
          ))}
        </>
      )}
    </div>
  )
}

/**
 * v23 — where the sessions that happen elsewhere actually send you, and what
 * you do when you arrive. Each names its own exercise: "open it in the plan"
 * told a user nothing, and the chunk hand-off didn't even land near a chunking
 * control.
 */
const GUIDE_HANDOFF: Partial<Record<GuideSessionId, { what: string; how: string; cta: string; page: IntakePageId; anchor?: string }>> = {
  qualify: {
    what: "Each goal gets its sentence, its two ratings and its why. On the goal card itself.",
    how: "Belief and desire both 7 or higher, or the goal is the wrong size. Under the gate, the card tells you which way to reshape it.",
    cta: "Open my goals →",
    page: "doing",
    anchor: "lm-goals",
  },
  chunk: {
    what: "Break each one-year goal into steps with dates.",
    how: "On a goal with a number, set how many milestones it gets. The ladder spreads the target across them and dates each one. A yearly number divided by twelve is a monthly target you can actually check.",
    cta: "Open my goals →",
    page: "doing",
    anchor: "lm-goals",
  },
  rituals: {
    what: "Design the morning, then size the week honestly.",
    how: "Audit what your morning already is, then build the replacement and set the daily budget so the plan fits the week you actually have.",
    cta: "Open the ritual builder →",
    page: "doing",
    anchor: "lm-ritual-builder",
  },
  commit: {
    what: "Write your manifesto, sign it, and start tracking.",
    how: "Signing opens the loop. It opens the daily page and schedules your first weekly review.",
    cta: "Open the commit page →",
    page: "doing",
    anchor: "lm-foundation",
  },
}

/**
 * v20 — THE GUIDE. The order of operations, one session at a time, each with
 * the reason it sits there and a worked example beside your box. Resumable and
 * skippable by design: this is a teaching path, not a wizard that holds the
 * app hostage.
 */
function GuideView({ done, openId, onOpen, onComplete, onSkipTo, visionText, onVisionText, debrief, onDebrief, drivingForce, onDrivingForce, areaPlans, onAreaPlan, beliefs, onBeliefs, rawWants, onRawWants, goalInbox, onSendToWorkshop, onReadVision, visionReadBusy, rooms, yourTens, ratings, onOpenRoom, today, evidence, onGoStage }: {
  done: string[]
  openId: GuideSessionId | null
  onOpen: (id: GuideSessionId | null) => void
  onComplete: (id: GuideSessionId) => void
  onSkipTo: (id: GuideSessionId) => void
  visionText: string
  onVisionText: (t: string) => void
  debrief: { good: string[]; challenges: string[]; lessons: string[] }
  onDebrief: (d: { good: string[]; challenges: string[]; lessons: string[] }) => void
  drivingForce: VisionDrivingForce | null
  onDrivingForce: (df: VisionDrivingForce) => void
  areaPlans: Record<string, VisionAreaPlan>
  onAreaPlan: (areaId: string, patch: Partial<VisionAreaPlan>) => void
  beliefs: BeliefWork[]
  onBeliefs: (updater: (prev: BeliefWork[]) => BeliefWork[]) => void
  rawWants: Array<{ id: string; text: string; years: HorizonYears | null; circled: boolean }>
  onRawWants: (updater: (prev: Array<{ id: string; text: string; years: HorizonYears | null; circled: boolean }>) => Array<{ id: string; text: string; years: HorizonYears | null; circled: boolean }>) => void
  goalInbox: string[]
  onSendToWorkshop: (texts: string[]) => void
  onReadVision: (text: string) => void
  visionReadBusy: boolean
  rooms: WheelRoom[]
  yourTens: Record<string, string>
  ratings: Record<string, number>
  onOpenRoom: (areaId: string) => void
  today: string
  /** v24 — the saved plan. A session counts as done when its OUTPUT exists,
   * wherever it was produced: the Guide used to announce "0 of 10" over a
   * finished, signed plan because it tracked its own clicks and nothing else. */
  evidence: GuideEvidence
  onGoStage: (page: IntakePageId, anchor?: string) => void
}) {
  const p = guideProgress(done, evidence)
  const warn = guideSittingWarning(p)
  const doneSet = new Set(done)
  const [visionDraft, setVisionDraft] = useState(visionText)
  useEffect(() => { setVisionDraft(visionText) }, [visionText])
  const df = drivingForce ?? { purpose: "", reasons: [], identity: [] }

  return (
    <div className="max-w-3xl mx-auto px-6 py-10 pb-24">
      <h1 className="text-2xl font-bold text-center mb-2">Build it in order</h1>
      <p className="text-zinc-400 text-center text-sm mb-2">
        {/* v24 — the old subtitle promised "your vision, then your purpose…"
            over a list whose first two steps are getting in state and closing
            out the year. It described a different list to the one underneath
            it, which is the kind of mismatch a careful reader catches at once. */}
        Clear the year first, then write the vision, your purpose and who you are — and only then the goals.
      </p>
      {/* v24 — a blank slate used to be told "0 of 11 done · about 260 min left
          if you did the rest now": four and a half hours, quoted as the second
          line on the page, to someone deciding whether to start at all. It is
          the single most bounce-inducing sentence in the product, and it sat
          directly above a warning that called the same number "over two hours".
          Show the cost of the NEXT step; show the total only once someone is
          underway and the number has stopped being a threat. */}
      <p className="text-zinc-500 text-center text-[11px] mb-6">
        {p.doneCount === 0
          ? `Every step is optional and you can leave whenever. The first one takes ${p.nextMinutes} minutes.`
          : `${p.doneCount} of ${p.total} done${p.next ? ` · next takes about ${p.nextMinutes} min` : " the build is complete"}.`}
      </p>
      {warn && (
        <p className="text-[11px] text-amber-300/80 text-center mb-6 max-w-xl mx-auto">{warn}</p>
      )}

      <div className="space-y-2">
        {GUIDE_SESSIONS.map((sess, i) => {
          const isDone = doneSet.has(sess.id)
          const isOpen = openId === sess.id
          const isNext = p.next === sess.id
          return (
            <div key={sess.id} className={`rounded-xl border transition-colors ${isOpen ? "border-violet-400/40 bg-violet-500/[0.05]" : isDone ? "border-emerald-400/25 bg-emerald-500/[0.04]" : isNext ? "border-white/20 bg-white/[0.03]" : "border-white/10 bg-white/[0.02]"}`}>
              <button onClick={() => onOpen(isOpen ? null : sess.id)} aria-expanded={isOpen} className="w-full flex items-center gap-2.5 px-3 py-2.5 text-left">
                <span className={`size-5 rounded-full flex items-center justify-center text-[10px] font-semibold shrink-0 ${isDone ? "bg-emerald-400 text-zinc-950" : isNext ? "bg-violet-400 text-zinc-950" : "border border-white/20 text-zinc-500"}`}>
                  {isDone ? "✓" : i + 1}
                </span>
                <span className="min-w-0 flex-1">
                  <span className={`block text-sm font-medium ${isDone ? "text-emerald-100" : "text-zinc-100"}`}>{sess.title}</span>
                  <span className="block text-[11px] text-zinc-500 mt-0.5">{sess.ask}</span>
                </span>
                <span className="text-[10px] text-zinc-600 shrink-0">{sess.minutes} min</span>
              </button>

              {isOpen && (
                <div className="px-3 pb-3 space-y-3 border-t border-white/5 pt-2.5">
                  <p className="text-[11px] text-zinc-400 italic">{sess.why}</p>

                  {sess.id === "state" && (
                    <div className="rounded-lg border border-white/10 bg-white/[0.02] px-2.5 py-2">
                      <ol className="space-y-1 text-xs text-zinc-300">
                        <li className="flex items-baseline gap-2"><span className="text-[10px] text-violet-300/80 shrink-0">1.</span>Stand up. Shake out your body. Music that lifts you.</li>
                        <li className="flex items-baseline gap-2"><span className="text-[10px] text-violet-300/80 shrink-0">2.</span>Ten big breaths. Shoulders back. Smile, even if it feels stupid.</li>
                        <li className="flex items-baseline gap-2"><span className="text-[10px] text-violet-300/80 shrink-0">3.</span>Somewhere alone, with something to write in. Then begin.</li>
                      </ol>
                      <p className="text-[10px] text-zinc-600 mt-1.5">Nature, a library, a coffee shop. Anywhere you won&apos;t be interrupted.</p>
                    </div>
                  )}

                  {sess.id === "debrief" && (
                    <div className="space-y-2.5">
                      <GuideList label="What was all the good?" placeholder="Everything that went well. No editing, no modesty" items={debrief.good} onChange={(good) => onDebrief({ ...debrief, good })} noBut />
                      {debrief.good.length > 0 && (
                        <>
                          <GuideList label="What were the challenges?" placeholder="What was hard, and what actually caused it" items={debrief.challenges} onChange={(challenges) => onDebrief({ ...debrief, challenges })} />
                          <GuideList label="What did you learn?" placeholder="The lesson, stated so you could act on it" items={debrief.lessons} onChange={(lessons) => onDebrief({ ...debrief, lessons })} />
                        </>
                      )}
                      {debrief.good.length === 0 && (
                        <p className="text-[10px] text-zinc-600">The good comes first and it comes alone. The challenges list opens once you&apos;ve written at least one.</p>
                      )}
                    </div>
                  )}

                  {sess.id === "vision" && (
                    <div>
                      <p className="text-[11px] text-zinc-500 mb-1">
                        Present tense, as though it&apos;s already true. No limits. Belief comes later, at the goals. Put numbers in where you have them.
                      </p>
                      <textarea
                        value={visionDraft}
                        onChange={(e) => setVisionDraft(e.target.value)}
                        onBlur={() => { if (visionDraft !== visionText) onVisionText(visionDraft) }}
                        rows={8}
                        aria-label="Your whole-life vision"
                        placeholder="I am… I have… I live…"
                        className="w-full bg-white/5 border border-white/10 rounded-lg px-2.5 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-white/30 resize-y"
                      />
                      <p className="text-[10px] text-zinc-600 mt-1">
                        Then read it out loud. If it doesn&apos;t give you goosebumps, it isn&apos;t finished. Rewrite the flat sentences.
                      </p>
                      {/* v23 — the session used to end here. The vision was
                          stored, and nothing happened: the wheel stayed dark
                          and no areas were drafted, because the only control
                          that reads prose into intents lives behind a collapsed
                          link on a different screen. Forty-five minutes of
                          writing with no visible consequence. */}
                      <div className="mt-2 flex items-center gap-2 flex-wrap">
                        <button
                          onClick={() => { if (visionDraft !== visionText) onVisionText(visionDraft); onReadVision(visionDraft) }}
                          disabled={visionDraft.trim().length < 40 || visionReadBusy}
                          className="text-[11px] px-2.5 py-1 rounded-md border border-violet-400/40 bg-violet-500/10 text-violet-100 hover:bg-violet-500/20 disabled:opacity-30 transition-colors"
                        >
                          {visionReadBusy ? "Reading your vision…" : "Read this and light up my areas →"}
                        </button>
                        <span className="text-[10px] text-zinc-600">
                          {visionDraft.trim().length < 40 ? "Write a few lines first." : "Turns your words into areas and goal drafts."}
                        </span>
                      </div>
                      <HisAnswer quotes={[EXEMPLAR_WHOLE_LIFE.purpose]} gloss="Vision, purpose, identity and code of conduct are four separate documents, re-read together. This is the purpose one." />
                    </div>
                  )}

                  {sess.id === "driving" && (
                    <div className="space-y-2.5">
                      <div>
                        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-500">Your purpose, why are you here?</p>
                        <textarea
                          value={df.purpose}
                          onChange={(e) => onDrivingForce({ ...df, purpose: e.target.value })}
                          rows={3}
                          aria-label="Your purpose"
                          placeholder="Don't wait to discover it. Pick what you want your life to be about."
                          className="mt-1 w-full bg-white/5 border border-white/10 rounded-lg px-2.5 py-2 text-xs text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-white/30 resize-none"
                        />
                        <p className="text-[10px] text-zinc-600 mt-1">
                          You decide your purpose. If you&apos;re stuck, drop the word &ldquo;passion&rdquo; and ask what you actually enjoy. Joy is the clue.
                        </p>
                      </div>
                      <GuideList label="Who are you? (I am…)" placeholder="I am…" items={df.identity} onChange={(identity) => onDrivingForce({ ...df, identity })} />
                      <GuideList label="Your code of conduct, the standards" placeholder="To be…" items={df.conduct ?? []} onChange={(conduct) => onDrivingForce({ ...df, conduct })} />
                      <HisAnswer quotes={[EXEMPLAR_WHOLE_LIFE.mission, EXEMPLAR_WHOLE_LIFE.identityRule]} gloss="A mission is one sentence with a BE and a DO in it, said daily. And the reason identity does the work:" />
                      <div className="pt-1">
                        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-500">A belief in the way? Rewrite it</p>
                        <p className="text-[11px] text-zinc-500 mt-0.5">If a belief contradicts the identity you just wrote, work it here. The question to ask is whether the belief is useful to you.</p>
                        <div className="mt-1.5">
                          <BeliefWorkPanel beliefs={beliefs} onChange={onBeliefs} today={today} />
                        </div>
                      </div>
                    </div>
                  )}

                  {sess.id === "areas" && (
                    <div className="space-y-2">
                      <p className="text-[11px] text-zinc-500">
                        Rename any area so the words pull you. Not &ldquo;fitness&rdquo; and &ldquo;money&rdquo;. &ldquo;physical power&rdquo; and &ldquo;absolute financial freedom&rdquo;.
                      </p>
                      <div className="space-y-1.5 max-h-72 overflow-y-auto pr-1">
                        {LIFE_MASTERY_AREAS.map((a) => {
                          const ex = exemplarArea(a.id)
                          return (
                            <div key={a.id} className="flex items-center gap-2">
                              <span className="size-2 rounded-full shrink-0" style={{ background: a.color }} />
                              <input
                                value={areaPlans[a.id]?.name ?? ""}
                                onChange={(e) => onAreaPlan(a.id, { name: e.target.value })}
                                aria-label={`Rename ${a.label}`}
                                placeholder={a.label}
                                className="flex-1 min-w-0 bg-white/5 border border-white/10 rounded-md px-2 py-1 text-xs text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-white/25"
                              />
                              {ex?.renamedTo && (
                                <span className="text-[10px] text-sky-300/70 shrink-0 truncate max-w-[45%]" title={`Example: ${ex.renamedTo}`}>e.g. {ex.renamedTo}</span>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )}

                  {/* v23 — the per-area pass. The build doc lists it as the
                      session where the 10 comes BEFORE the score ("the step
                      before this is knowing what your 10 is"), and it is the
                      only place `yourTens` can be authored — but it was missing
                      from GUIDE_SESSIONS entirely, so the Guide went straight
                      from naming areas to brainstorming goals. */}
                  {sess.id === "rooms" && (
                    <div className="space-y-2">
                      <p className="text-[11px] text-zinc-500">
                        One room at a time: what a 10 looks like there, then where you honestly are today. The 10 comes first. Without it there is nothing to score against.
                      </p>
                      <div className="space-y-1 max-h-72 overflow-y-auto pr-1">
                        {rooms.map((r) => {
                          const ten = (yourTens[r.id] ?? "").trim()
                          const score = ratings[r.id]
                          return (
                            <button
                              key={r.id}
                              onClick={() => onOpenRoom(r.id)}
                              className="w-full flex items-center gap-2 rounded-md border border-white/10 bg-white/[0.02] px-2 py-1.5 text-left hover:bg-white/[0.05] transition-colors"
                            >
                              <span className="size-2 rounded-full shrink-0" style={{ background: r.color }} />
                              <span className="text-xs text-zinc-200 min-w-0 truncate">{r.label}</span>
                              <span className="ml-auto shrink-0 text-[10px] tabular-nums">
                                {ten ? <span className="text-emerald-300/80">10 written</span> : <span className="text-zinc-600">no 10 yet</span>}
                                <span className="text-zinc-700"> · </span>
                                {score != null ? <span className="text-zinc-300">{score}/10</span> : <span className="text-zinc-600">unrated</span>}
                              </span>
                            </button>
                          )
                        })}
                      </div>
                      <p className="text-[10px] text-zinc-600">
                        {rooms.filter((r) => (yourTens[r.id] ?? "").trim()).length} of {rooms.length} rooms have a 10 written. You do not need all of them — the ones you are focusing on this season matter most.
                      </p>
                    </div>
                  )}

                  {sess.id === "brainstorm" && (
                    <>
                      <BrainstormPanel wants={rawWants} onChange={onRawWants} />
                      {/* v23 — the dump/number/circle exercise wrote `rawWants`
                          and stopped there: nothing read it, and the Goal
                          Workshop's own empty state pointed at a DIFFERENT
                          brainstorm. Thirty minutes of correct work, discarded
                          with no explanation. The circled one-year lines now
                          go where the copy always claimed they went. */}
                      {(() => {
                        const circled = rawWants.filter((w) => w.circled && w.years === 1)
                        const fresh = circled.filter((w) => !goalInbox.includes(w.text))
                        if (circled.length === 0) return null
                        return (
                          <div className="rounded-lg border border-emerald-400/25 bg-emerald-500/[0.06] px-2.5 py-2">
                            <p className="text-[11px] text-emerald-100/90">
                              {circled.length} circled for this year.
                              {fresh.length === 0 ? " All of them are in your Goal Workshop." : ""}
                            </p>
                            {fresh.length > 0 && (
                              <button
                                onClick={() => onSendToWorkshop(fresh.map((w) => w.text))}
                                className="mt-1.5 text-[11px] px-2.5 py-1 rounded-md border border-emerald-400/40 bg-emerald-500/10 text-emerald-100 hover:bg-emerald-500/20 transition-colors"
                              >
                                Send {fresh.length} to the Goal Workshop →
                              </button>
                            )}
                          </div>
                        )
                      })()}
                    </>
                  )}

                  {/* v23 — these four used to share one card reading "this one
                      happens in the plan itself" over a button that sent you to
                      a screen without saying what to do when you arrived. The
                      chunk button in particular landed on a page whose chunking
                      control (milestone count, per goal) was never mentioned.
                      Each now names its destination and its exercise. Also gone:
                      a dead `sess.id === "brainstorm"` arm inside a block that
                      only ever renders for these four. */}
                  {GUIDE_HANDOFF[sess.id] && (
                    <div className="rounded-lg border border-white/10 bg-white/[0.02] px-2.5 py-2">
                      <p className="text-[11px] text-zinc-300">{GUIDE_HANDOFF[sess.id]!.what}</p>
                      <p className="text-[10px] text-zinc-500 mt-1">{GUIDE_HANDOFF[sess.id]!.how}</p>
                      <button
                        onClick={() => onGoStage(GUIDE_HANDOFF[sess.id]!.page, GUIDE_HANDOFF[sess.id]!.anchor)}
                        className="mt-1.5 text-[11px] px-2.5 py-1 rounded-md border border-violet-400/40 bg-violet-500/10 text-violet-100 hover:bg-violet-500/20 transition-colors"
                      >
                        {GUIDE_HANDOFF[sess.id]!.cta}
                      </button>
                    </div>
                  )}

                  <div className="flex items-center gap-2 pt-1">
                    <button
                      onClick={() => { onComplete(sess.id); const n = GUIDE_SESSIONS[i + 1]; onOpen(n ? n.id : null) }}
                      className="text-[11px] px-3 py-1.5 rounded-lg border border-emerald-400/40 bg-emerald-500/10 text-emerald-100 hover:bg-emerald-500/20 transition-colors"
                    >
                      {isDone ? "Done — next" : "Mark done, next"}
                    </button>
                    {GUIDE_SESSIONS[i + 1] && (
                      <button onClick={() => onSkipTo(GUIDE_SESSIONS[i + 1].id)} className="text-[11px] text-zinc-500 hover:text-zinc-300 transition-colors">
                        skip for now
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

/** v17 — the create flow's three screens, in order. Named apart from `mode`
 * so "stage: track" and "mode: track" can never be confused again. */

type LibraryPage = "areas" | "vision" | "manifesto" | "values" | "affirmations" | "driving" | "method"

const LIBRARY_PAGES: Array<{ id: LibraryPage; label: string }> = [
  { id: "areas", label: "Areas" },
  { id: "vision", label: "Vision" },
  { id: "manifesto", label: "Manifesto" },
  { id: "values", label: "Values" },
  { id: "affirmations", label: "Affirmations" },
  { id: "driving", label: "Driving force" },
  { id: "method", label: "The method" },
]

/** v17 — one rolled-up soft-layer list, showing WHICH rooms authored each entry.
 * Read-only on purpose: you author inside the room that owns the material, and
 * read it back whole here. */
function SoftRollupList({ entries, empty, editHint }: {
  entries: SoftLayerEntry[]
  empty: string
  editHint: string
}) {
  if (entries.length === 0) return <p className="text-sm text-zinc-500">{empty}</p>
  return (
    <>
      <ul className="space-y-1.5">
        {entries.map((e) => (
          <li key={e.text} className="flex items-start gap-2 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-1.5">
            <span className="text-sm text-zinc-100 min-w-0 flex-1">{e.text}</span>
            <span className="flex flex-wrap gap-1 shrink-0">
              {e.lifeWide && <span className="text-[9px] uppercase tracking-wide px-1.5 py-0.5 rounded-full border border-violet-400/30 text-violet-300">life-wide</span>}
              {e.areaIds.map((id) => {
                const a = LIFE_MASTERY_AREA_MAP.get(id)
                return (
                  <span key={id} className="text-[9px] px-1.5 py-0.5 rounded-full border" style={{ borderColor: `${a?.color ?? "#71717a"}55`, color: a?.color ?? "#a1a1aa" }}>
                    {a?.label ?? id}
                  </span>
                )
              })}
            </span>
          </li>
        ))}
      </ul>
      <p className="text-[10px] text-zinc-600 mt-2">{editHint}</p>
    </>
  )
}

/**
 * v17 — THE LIBRARY. Everything you wrote, read back whole. The create flow is
 * where you author; this is where you go to actually re-read the thing — which
 * the framework asks for daily and the old lab had nowhere to do.
 */
function LibraryView({ page, onPage, state, goals, yourTens, awayValues, drivingForce, manifestoName, manifestoLines, committedAt, visionText, onGoEdit, areasPage }: {
  page: LibraryPage
  onPage: (p: LibraryPage) => void
  state: Pick<VisionPlanState, "areaPlans" | "values" | "affirmations" | "incantations" | "valueRules">
  goals: VisionGoalDraft[]
  yourTens: Record<string, string>
  awayValues: string[]
  drivingForce: VisionDrivingForce | null
  manifestoName: string
  manifestoLines: string[]
  committedAt: string | null
  visionText: string
  onGoEdit: (page: IntakePageId) => void
  areasPage: ReactNode
}) {
  const values = softLayerRollup(state, "values")
  const affirmations = softLayerRollup(state, "affirmations")
  const incantations = softLayerRollup(state, "incantations")
  const rules = softLayerRollup(state, "rules")
  const tens = LIFE_MASTERY_AREAS.filter((a) => (yourTens[a.id] ?? "").trim())
  const section = (title: string, body: ReactNode, copy?: string) => (
    <section className="mb-8">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-violet-200/90">{title}</span>
        <span className="h-px flex-1 bg-gradient-to-r from-violet-400/30 to-transparent" />
        {copy && <CopyButton label="Copy" getText={() => copy} />}
      </div>
      {body}
    </section>
  )
  return (
    <div id="lm-lifeplan" className="max-w-5xl mx-auto px-6 py-10 pb-24 scroll-mt-20">
      <h1 className="text-2xl font-bold text-center mb-2">Your library</h1>
      <p className="text-zinc-400 text-center text-sm mb-6">
        Everything you wrote, read back whole. Re-reading is the practice. This is where you do it.
      </p>
      <div className="flex items-center justify-center gap-1 flex-wrap mb-8">
        {LIBRARY_PAGES.map((p) => (
          <button
            key={p.id}
            onClick={() => onPage(p.id)}
            aria-current={page === p.id ? "page" : undefined}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${page === p.id ? "bg-white/10 text-white" : "text-zinc-500 hover:text-zinc-300"}`}
          >
            {p.label}
          </button>
        ))}
      </div>

      {page === "areas" && areasPage}

      {page === "vision" && (
        <>
          {section("Your North Star", visionText.trim() ? (
            <p className="text-lg leading-relaxed text-white whitespace-pre-wrap">{visionText}</p>
          ) : <p className="text-sm text-zinc-500">Nothing written yet. Open a room and picture your 10.</p>, visionText)}
          {section("Your 10s, room by room", tens.length ? (
            <div className="space-y-2">
              {tens.map((a) => (
                <div key={a.id}>
                  <p className="text-sm leading-relaxed">
                    <span className="inline-flex items-center gap-1.5 mr-2">
                      <span className="size-1.5 rounded-full inline-block" style={{ background: a.color }} />
                      <span className="text-[11px] uppercase tracking-wide" style={{ color: areaTextColor(a) }}>{a.label}</span>
                    </span>
                    <span className="text-white">{yourTens[a.id].trim()}</span>
                  </p>
                </div>
              ))}
            </div>
          ) : <p className="text-sm text-zinc-500">No rooms mapped yet.</p>)}
          <button onClick={() => onGoEdit("areas")} className="text-xs text-zinc-500 hover:text-white transition-colors">← Edit this in your areas</button>
        </>
      )}

      {page === "manifesto" && (
        <>
          {section(committedAt ? `Signed ${committedAt}` : "Not signed yet", (
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-5 py-4">
              <p className="text-base text-white leading-relaxed">
                {MANIFESTO_OPENER_TEMPLATE.replace("___", manifestoName.trim() || "___")}
              </p>
              {manifestoLines.length > 0 && (
                <ul className="mt-3 space-y-1.5">
                  {manifestoLines.map((l, i) => <li key={i} className="text-sm text-zinc-200">{l}</li>)}
                </ul>
              )}
              {rules.length > 0 && (
                <div className="mt-4 pt-3 border-t border-white/10">
                  <p className="text-[10px] uppercase tracking-wide text-zinc-500 mb-1.5">The rules I live by</p>
                  <SoftRollupList entries={rules} empty="" editHint="" />
                </div>
              )}
            </div>
          ), `${MANIFESTO_OPENER_TEMPLATE.replace("___", manifestoName || "___")}\n${manifestoLines.join("\n")}`)}
          <button onClick={() => onGoEdit("doing")} className="text-xs text-zinc-500 hover:text-white transition-colors">← Edit your manifesto</button>
        </>
      )}

      {page === "values" && (
        <>
          {section("What you move toward", (
            <SoftRollupList entries={values} empty="No values written yet. They're authored inside each area, and life-wide on the Where you're going page." editHint="Authored in the areas tagged beside each one. Edit them there, or add life-wide ones on the Where you're going page." />
          ), values.map((v) => v.text).join("\n"))}
          {awayValues.length > 0 && section("What you move away from", (
            <div className="flex flex-wrap gap-1.5">
              {awayValues.map((v) => <span key={v} className="text-xs px-2 py-0.5 rounded-full border border-white/15 text-zinc-300">{v}</span>)}
            </div>
          ))}
          {rules.length > 0 && section("Your rules", <SoftRollupList entries={rules} empty="" editHint="" />, rules.map((r) => r.text).join("\n"))}
          <button onClick={() => onGoEdit("going")} className="text-xs text-zinc-500 hover:text-white transition-colors">← Edit your values</button>
        </>
      )}

      {page === "affirmations" && (
        <>
          {section("Affirmations, read them, out loud", (
            <SoftRollupList entries={affirmations} empty="None yet. Write an identity line in a room's deeper work and it'll offer to become one." editHint="Tagged with the room that authored each. Read them in the morning ritual." />
          ), affirmations.map((a) => a.text).join("\n"))}
          {section("Incantations, said with your whole body", (
            <>
              <SoftRollupList entries={incantations} empty="None yet. Add them in a room's deeper work, or from the incantation deck." editHint="" />
              <ol className="mt-3 space-y-1">
                {INCANTATION_PROTOCOL.map((step, i) => (
                  <li key={i} className="flex items-baseline gap-2 text-[11px] text-zinc-400">
                    <span className="text-[10px] text-violet-300/80 tabular-nums shrink-0">{i + 1}.</span>{step}
                  </li>
                ))}
              </ol>
            </>
          ), incantations.map((a) => a.text).join("\n"))}
          {goals.some((g) => (g.smartSentence ?? "").trim()) && section("Your goals, as sentences", (
            <ul className="space-y-1">
              {goals.filter((g) => (g.smartSentence ?? "").trim()).map((g) => (
                <li key={g.id} className="text-sm text-zinc-200">{g.smartSentence}</li>
              ))}
            </ul>
          ))}
        </>
      )}

      {page === "driving" && (
        <>
          {drivingForce ? (
            <>
              {drivingForce.mission && section("Your mission", <p className="text-lg text-white leading-relaxed">{drivingForce.mission}</p>, drivingForce.mission)}
              {section("Your purpose", <p className="text-base text-white leading-relaxed whitespace-pre-wrap">{drivingForce.purpose}</p>, drivingForce.purpose)}
              {drivingForce.identity.length > 0 && section("Who you are", (
                <ul className="space-y-1">{drivingForce.identity.map((i, n) => <li key={n} className="text-sm text-zinc-100">{i}</li>)}</ul>
              ), drivingForce.identity.join("\n"))}
              {drivingForce.conduct && drivingForce.conduct.length > 0 && section("Your code of conduct", (
                <ul className="space-y-1">{drivingForce.conduct.map((c, n) => <li key={n} className="text-sm text-zinc-200">{c}</li>)}</ul>
              ), drivingForce.conduct.join("\n"))}
              {drivingForce.reasons.length > 0 && section("The reasons", (
                <div className="flex flex-wrap gap-1.5">
                  {drivingForce.reasons.map((r) => <span key={r} className="text-xs px-2 py-0.5 rounded-full border border-white/15 text-zinc-300">{r}</span>)}
                </div>
              ))}
            </>
          ) : (
            <p className="text-sm text-zinc-500">No driving force written yet. It lives on the Where you're going page.</p>
          )}
          <button onClick={() => onGoEdit("going")} className="text-xs text-zinc-500 hover:text-white transition-colors">← Edit your driving force</button>
        </>
      )}

      {page === "method" && (
        <>
          {section("The path", (
            <>
              <p className="text-sm text-zinc-300 leading-relaxed">{MASTERY_THREE_LEVELS}</p>
              <ol className="mt-3 space-y-1">
                {MASTERY_TEN_KEYS.map((k, i) => (
                  <li key={i} className="flex items-baseline gap-2 text-sm text-zinc-200">
                    <span className="text-[10px] text-violet-300/80 tabular-nums shrink-0">{i + 1}.</span>{k}
                  </li>
                ))}
              </ol>
              <p className="text-xs text-zinc-400 mt-3 leading-relaxed">{PLATEAU_DOCTRINE}</p>
            </>
          ))}
          {section("The principles behind each step", (
            <div className="space-y-2">
              {Object.keys(PRINCIPLES).map((id: string) => <PrincipleCardView key={id} id={id} />)}
            </div>
          ))}
          <GlossaryCard />
        </>
      )}
    </div>
  )
}

export function VisionPlanLab() {
  const [text, setText] = useState("")
  const [phase, setPhase] = useState<Phase>("idle")
  const [pct, setPct] = useState(0)
  const [result, setResult] = useState<VisionIntentResult | null>(null)
  // The text the current result was derived from (so edits invalidate visibly).
  const [matchedText, setMatchedText] = useState("")
  const [err, setErr] = useState("")
  // M2 — LLM-drafted goals from the intents.
  const [goals, setGoals] = useState<VisionGoalDraft[] | null>(null)
  const [goalPhase, setGoalPhase] = useState<"idle" | "generating" | "done" | "error">("idle")
  // M1 — the paste-a-list door. Holds the room it was opened from so the rows
  // default to that area when the pasted text has no headings of its own.
  const [listOpen, setListOpen] = useState<string | null>(null)
  // The beat after intake: goal → why. Holds the ids just created, so the
  // reasons pass asks about those and not about the whole plan.
  const [reasonsFor, setReasonsFor] = useState<string[]>([])
  const [goalErr, setGoalErr] = useState("")
  // Which goal cards have their habits/tasks/milestones open (M3).
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  // M4 — priority order (goal ids, first = highest) + daily habit budget.
  const [priorityIds, setPriorityIds] = useState<string[]>([])
  const [dailyBudget, setDailyBudget] = useState(4)
  // Area board — pillar ids in drag order (first = top priority) and the ones
  // the user toggled OFF (their goals are hidden from the plan, never deleted).
  const [areaOrder, setAreaOrder] = useState<string[]>([])
  const [deselected, setDeselected] = useState<Set<string>>(new Set())
  // M5 — confirmed plan + create/track mode, persisted to localStorage.
  const [confirmed, setConfirmed] = useState(false)
  const [mode, setMode] = useState<"create" | "track" | "library" | "guide">("create")
  // v20 — guided build: which sessions are finished, and the one open now.
  const [beliefs, setBeliefs] = useState<BeliefWork[]>([])
  const [rawWants, setRawWants] = useState<Array<{ id: string; text: string; years: HorizonYears | null; circled: boolean }>>([])
  const [correctingGoal, setCorrectingGoal] = useState<string | null>(null)
  const [relationshipStatus, setRelationshipStatus] = useState<RelationshipStatus>("unset")
  const [approachReps, setApproachReps] = useState<Record<string, number>>({})
  const [guideDone, setGuideDone] = useState<string[]>([])
  const [openSession, setOpenSession] = useState<GuideSessionId | null>(null)
  const [yearDebrief, setYearDebrief] = useState<{ good: string[]; challenges: string[]; lessons: string[] }>({ good: [], challenges: [], lessons: [] })
  // v23 — four worksheets that used to live in component state and were thrown
  // away on navigation. Each one is real user writing; see the schema comments.
  const [ritualAudit, setRitualAudit] = useState<Array<{ id: string; text: string; mark: "up" | "down" | null }>>([])
  const [ruleWork, setRuleWork] = useState<Array<{ id: string; value: string; old: string; rewritten?: string }>>([])
  const [sessionJournals, setSessionJournals] = useState<Array<{ id: string; date: string; reps: string; body: string; felt: string; her: string; next: string }>>([])
  // v17 — which read-back page the Library is showing.
  const [libraryPage, setLibraryPage] = useState<LibraryPage>("areas")
  // v16 — the create page is a 3-stage flow, one screen at a time (was one
  // endless scroll pretending to be a sequence): map your life → commit → set
  // up tracking. Stefan's depth (values/driving-force/ritual) is optional,
  // behind a "go deeper" in the track stage — never a wall before you start.
  const [hydrated, setHydrated] = useState(false)
  const [resetArmed, setResetArmed] = useState(false)
  // M6 — check-off history; startDate anchors the balanced schedule to real days.
  const [progress, setProgress] = useState<VisionProgress | null>(null)
  // PLM — the assembled morning ritual + which period the report shows
  // ("YYYY-MM" for a month, "YYYY" for the year in review).
  const [ritual, setRitual] = useState<VisionRitual | null>(null)
  const [reportMonth, setReportMonth] = useState<string | null>(null)
  // PLM OS — commitment gate, ranked values, driving force, your-10s.
  const [committedAt, setCommittedAt] = useState<string | null>(null)
  const [valuesList, setValuesList] = useState<string[]>([])
  const [drivingForce, setDrivingForce] = useState<VisionDrivingForce | null>(null)
  const [yourTens, setYourTens] = useState<Record<string, string>>({})
  const [areaPlans, setAreaPlans] = useState<Record<string, VisionAreaPlan>>({})
  const [focusAreaIds, setFocusAreaIds] = useState<string[]>([])
  const [awayValues, setAwayValues] = useState<string[]>([])
  // v25 — the sequential intake: the reveal trail, your 0 per area, and the
  // Perfect Day write-up. `intakeSeen` records a question as settled when it is
  // answered AND when it is waved past, which is what lets "I'm not sure yet"
  // move you on without inventing an answer.
  const [intakeSeen, setIntakeSeen] = useState<string[]>([])
  const [yourZeros, setYourZeros] = useState<Record<string, string>>({})
  const [perfectDay, setPerfectDay] = useState<string>("")
  const [incantations, setIncantations] = useState<string[]>([])
  // v8 — goal workshop inbox (1-3yr brainstorm wants awaiting circle→qualify)
  // + the Manifesto name ("My name is ___ and I am the master of my life").
  const [goalInbox, setGoalInbox] = useState<string[]>([])
  const [manifestoName, setManifestoName] = useState<string>("")
  const [manifestoLines, setManifestoLines] = useState<string[]>([])
  // QoL — the account already knows the user's name: default it into the
  // manifesto (first name) and mission (full name). Never overwrites input.
  const [accountName, setAccountName] = useState<string>("")
  useEffect(() => {
    let cancelled = false
    fetch("/api/whoami")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (cancelled || !d?.full_name) return
        setAccountName(d.full_name)
        setManifestoName((prev) => (prev.trim() ? prev : d.full_name.split(" ")[0]))
      })
      .catch(() => { /* signed out — fields stay manual */ })
    return () => { cancelled = true }
  }, [])
  // v10 — change toolkit: habit-breaking letters + 30-day counters.
  const [letters, setLetters] = useState<Array<{ habit: string; thankYou: string; goodbye: string; date: string }>>([])
  const [counters, setCounters] = useState<Array<{ label: string; startDate: string }>>([])
  const [valueRules, setValueRules] = useState<string[]>([])
  // v14 — user-added rooms on the vision wheel (canonical renames live in areaPlans).
  const [customAreas, setCustomAreas] = useState<Array<{ id: string; label: string; color: string }>>([])
  // M1 room journey — today's 0-10 self-rating per room (pre-tracking baseline).
  const [baselineRatings, setBaselineRatings] = useState<Record<string, number>>({})
  // v17 — when each baseline was set, so the first weekly review knows how old it is.
  const [baselineRatedAt, setBaselineRatedAt] = useState<Record<string, string>>({})
  // v17 — life-wide affirmations (per-area ones live in areaPlans[id].affirmations).
  const [affirmations, setAffirmations] = useState<string[]>([])
  // v19 — the season's area ranking. ONE source of truth: focus and
  // maintenance are tiers of this list, so there is no separate scope state.
  const [areaRank, setAreaRank] = useState<string[]>([])
  const [focusCount, setFocusCount] = useState(1)
  // v17 — repairs the load layer made to a persisted plan. Shown, never swallowed.
  const [loadRepairs, setLoadRepairs] = useState<VisionPlanRepair[]>([])
  // M1.5 — coach suggestions commit straight into the goal list; this Set just
  // badges them "✨ suggested" (session-only, cleared on edit/delete).
  const [suggestedIds, setSuggestedIds] = useState<Set<string>>(new Set())
  const [proposalPhase, setProposalPhase] = useState<Record<string, "idle" | "loading" | "error" | "dry" | "unavailable">>({})
  // v17 — drafted-but-not-accepted goals per room. Session-only by design: a
  // suggestion you never accepted isn't yours, so it shouldn't outlive the tab.
  const [suggestions, setSuggestions] = useState<Record<string, VisionGoalDraft[]>>({})
  const [autoSuggest, setAutoSuggest] = useState(true)
  const suggestTimersRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({})
  const lastSuggestedRef = useRef<Record<string, string>>({})
  // v25 — the goal-authored trigger keeps its own "already drafted from this"
  // memo, so re-writing your 10 and adding a goal can't cancel each other out.
  const lastGoalSuggestedRef = useRef<Record<string, string>>({})
  // Id minting reads the CURRENT goals without making the proposal callback
  // depend on them (it would re-create mid-flight and re-arm the debounce).
  const goalsRef = useRef<VisionGoalDraft[] | null>(null)
  const suggestionsRef = useRef<Record<string, VisionGoalDraft[]>>({})
  const [sosOpen, setSosOpen] = useState(false)
  // v17 — the wheel is THE way in; the prose box is a collapsed alternative
  // (hidden entirely while a room journey is open, so nothing says "instead of
  // rooms" while you're using rooms). Room-open state lives here so the parent
  // can hide the prose box too.
  const [activeRoomId, setActiveRoomId] = useState<string | null>(null)
  const [proseOpen, setProseOpen] = useState(false)
  const [tonightDismissed, setTonightDismissed] = useState(false)
  // Collapse only after a PROSE read — room-journey commits also set phase
  // "done", and yanking the wheel away mid-journey would be hostile.
  // v10 — in-the-moment celebration: the just-checked item flashes its praise
  // ("whatever gets rewarded gets repeated" needs the reward AT the rep).
  const [justDone, setJustDone] = useState<string | null>(null)
  const celebrateTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const flashCelebrate = useCallback((id: string) => {
    setJustDone(id)
    if (celebrateTimer.current) clearTimeout(celebrateTimer.current)
    celebrateTimer.current = setTimeout(() => setJustDone(null), 4000)
  }, [])
  // OS v2 — pyramid inspector selection + expanded goal rows.
  const [selectedBand, setSelectedBand] = useState<number | null>(null)
  const [expandedGoals, setExpandedGoals] = useState<Set<string>>(new Set())
  const today = localTodayISO()

  // Hydrate the sandbox once — invalid/corrupt blobs are rejected wholesale.
  useEffect(() => {
    const loaded = loadVisionPlanState(localStorage.getItem(SANDBOX_KEY))
    const saved = loaded?.state ?? null
    if (loaded?.repairs.length) setLoadRepairs(loaded.repairs)
    if (saved && saved.goals.length === 0) {
      // Foundation-only save: restore the groundwork, leave the plan flow idle.
      setText(saved.visionDraft ?? saved.vision)
      setRitualAudit(saved.ritualAudit ?? [])
      setRuleWork(saved.ruleWork ?? [])
      setSessionJournals(saved.sessionJournals ?? [])
      setCommittedAt(saved.committedAt ?? null)
      setValuesList(saved.values ?? [])
      setAwayValues(saved.awayValues ?? [])
      setIncantations(saved.incantations ?? [])
      setGoalInbox(saved.goalInbox ?? [])
      setManifestoName(saved.manifestoName ?? "")
      setManifestoLines(saved.manifestoLines ?? [])
      setLetters(saved.letters ?? [])
      setCounters(saved.counters ?? [])
      setValueRules(saved.valueRules ?? [])
      setCustomAreas(saved.customAreas ?? [])
      setBaselineRatings(saved.baselineRatings ?? {})
      setBaselineRatedAt(saved.baselineRatedAt ?? {})
      setAffirmations(saved.affirmations ?? [])
      {
        // v19 — migrate: old focus set + retired deep/sketched scope -> ranking.
        const rank = deriveAreaRank(saved, (saved.customAreas ?? []).map((c) => c.id))
        setAreaRank(rank)
        setFocusCount(Math.min(3, Math.max(1, (saved.focusAreaIds ?? []).length || 1)))
        setGuideDone(saved.guideDone ?? [])
        setRelationshipStatus(saved.relationshipStatus ?? "unset")
        setBeliefs(saved.beliefs ?? [])
        setRawWants((saved.rawWants ?? []) as never)
        setApproachReps(saved.approachReps ?? {})
        if (saved.yearDebrief) setYearDebrief(saved.yearDebrief)
      }
      setDrivingForce(saved.drivingForce ?? null)
      setYourTens(saved.yourTens ?? {})
      setYourZeros(saved.yourZeros ?? {})
      setIntakeSeen(saved.intakeSeen ?? [])
      setPerfectDay(saved.perfectDay ?? "")
      setAreaPlans(saved.areaPlans ?? {})
      setFocusAreaIds(saved.focusAreaIds ?? [])
      setRitual(saved.ritual ?? null)
      // M1 — dreams are intents: rebuild them so the wheel's work survives
      // reloads even before any goal exists.
      {
        const intents = mergeRoomIntents(saved.intents, saved.yourTens ?? {})
        if (intents.length > 0) {
          setResult({ intents, unmatched: [] })
          setPhase("done")
        }
      }
    } else if (saved) {
      setText(saved.visionDraft ?? saved.vision)
      setMatchedText(saved.vision)
      setRitualAudit(saved.ritualAudit ?? [])
      setRuleWork(saved.ruleWork ?? [])
      setSessionJournals(saved.sessionJournals ?? [])
      setRelationshipStatus(saved.relationshipStatus ?? "unset")
      setBeliefs(saved.beliefs ?? [])
      setRawWants((saved.rawWants ?? []) as never)
      setApproachReps(saved.approachReps ?? {})
      setResult({ intents: mergeRoomIntents(saved.intents, saved.yourTens ?? {}), unmatched: [] })
      setPhase("done")
      setGoals(saved.goals)
      setGoalPhase("done")
      setPriorityIds(saved.priorityIds)
      setDailyBudget(saved.dailyBudget)
      setConfirmed(saved.confirmed)
      setProgress(saved.progress ?? null)
      setRitual(saved.ritual ?? null)
      setCommittedAt(saved.committedAt ?? null)
      setValuesList(saved.values ?? [])
      setAwayValues(saved.awayValues ?? [])
      setDrivingForce(saved.drivingForce ?? null)
      setYourTens(saved.yourTens ?? {})
      setYourZeros(saved.yourZeros ?? {})
      setIntakeSeen(saved.intakeSeen ?? [])
      setPerfectDay(saved.perfectDay ?? "")
      setAreaPlans(saved.areaPlans ?? {})
      setFocusAreaIds(saved.focusAreaIds ?? [])
      setIncantations(saved.incantations ?? [])
      setGoalInbox(saved.goalInbox ?? [])
      setManifestoName(saved.manifestoName ?? "")
      setManifestoLines(saved.manifestoLines ?? [])
      setLetters(saved.letters ?? [])
      setCounters(saved.counters ?? [])
      setValueRules(saved.valueRules ?? [])
      setCustomAreas(saved.customAreas ?? [])
      setBaselineRatings(saved.baselineRatings ?? {})
      setBaselineRatedAt(saved.baselineRatedAt ?? {})
      setAffirmations(saved.affirmations ?? [])
      {
        // v19 — migrate: old focus set + retired deep/sketched scope -> ranking.
        const rank = deriveAreaRank(saved, (saved.customAreas ?? []).map((c) => c.id))
        setAreaRank(rank)
        setFocusCount(Math.min(3, Math.max(1, (saved.focusAreaIds ?? []).length || 1)))
        setGuideDone(saved.guideDone ?? [])
        if (saved.yearDebrief) setYearDebrief(saved.yearDebrief)
      }
      setAreaOrder(extendAreaOrder(saved.areaOrder ?? uniquePillarIds(saved.intents), saved.goals))
      setDeselected(new Set(saved.deselectedAreas ?? []))
      if (saved.confirmed) setMode("track")
      // Resume on the stage that matches how far they got, not always the start.
    }
    // v22 — a user with nothing lands on the GUIDE, not on a wheel wrapped in
    // explanation. The guided path is what a blank slate needs; the wheel is
    // what you use once you know the method. Anyone with any work already done
    // resumes where they were.
    //
    // v23 — "where they were" has to include the Guide. Someone whose only work
    // is guided work (a year debrief, a vision, a purpose, renamed areas) has no
    // goals, so they used to be dropped onto the Plan wheel — a screen they had
    // never chosen — with their session progress nowhere in sight.
    const guideOnly =
      !!saved && saved.goals.length === 0 && !saved.committedAt &&
      ((saved.guideDone?.length ?? 0) > 0 ||
        !!saved.yearDebrief?.good?.length ||
        (saved.rawWants?.length ?? 0) > 0 ||
        (saved.beliefs?.length ?? 0) > 0 ||
        (saved.visionDraft ?? "").trim().length > 0)
    if (!loaded || guideOnly) setMode("guide")
    setHydrated(true)
  }, [])

  // Persist on every meaningful change — a full plan, or foundation-only work
  // (commit/values/driving force), which must survive reloads too.
  useEffect(() => {
    if (!hydrated) return
    // A goal IS the plan. Requiring `result` — the vision-intent analysis —
    // meant anyone who went straight to a room and typed a goal saved NOTHING:
    // the goal rendered, the room looked right, and it was gone on reload.
    // The vision is optional and always was; `intents` already falls back to
    // [] three lines down, which is the tell that this gate was wrong.
    const hasPlan = !!goals && goals.length > 0
    // v23 — this gate used to omit every field the Guide writes, so a user who
    // did the year debrief, the brainstorm and the belief work and nothing else
    // saved NOTHING: the whole session was gone on reload. Anything a user can
    // type belongs in this list.
    const hasFoundation =
      !!committedAt || valuesList.length > 0 || awayValues.length > 0 || !!drivingForce ||
      Object.keys(yourTens).length > 0 || Object.keys(areaPlans).length > 0 || !!ritual || focusAreaIds.length > 0 || incantations.length > 0 ||
      goalInbox.length > 0 || manifestoName.trim().length > 0 || manifestoLines.length > 0 || letters.length > 0 || counters.length > 0 || valueRules.length > 0 || customAreas.length > 0 || Object.keys(baselineRatings).length > 0 ||
      affirmations.length > 0 || areaRank.length > 0 || guideDone.length > 0 ||
      text.trim().length > 0 || beliefs.length > 0 || rawWants.length > 0 ||
      Object.keys(approachReps).length > 0 || relationshipStatus !== "unset" ||
      yearDebrief.good.length > 0 || yearDebrief.challenges.length > 0 || yearDebrief.lessons.length > 0 ||
      ritualAudit.length > 0 || ruleWork.length > 0 || sessionJournals.length > 0
    if (!hasPlan && !hasFoundation) return
    const state: VisionPlanState = {
      // `vision` stays the ANALYSED text (the one the wheel and goals came
      // from). `visionDraft` is the raw prose buffer, which the Guide's vision
      // textarea writes. They used to be one slot with `hasPlan ? matchedText`
      // in front of it, so every word written in the Guide after the first goal
      // existed was silently dropped on the next reload.
      vision: matchedText || text,
      intents: result?.intents ?? [],
      goals: goals ?? [],
      priorityIds,
      dailyBudget,
      confirmed,
      areaOrder,
      deselectedAreas: [...deselected],
      ...(progress ? { progress } : {}),
      ...(ritual ? { ritual } : {}),
      ...(committedAt ? { committedAt } : {}),
      ...(valuesList.length ? { values: valuesList } : {}),
      ...(awayValues.length ? { awayValues } : {}),
      ...(drivingForce ? { drivingForce } : {}),
      ...(Object.keys(yourTens).length ? { yourTens } : {}),
      ...(Object.keys(areaPlans).length ? { areaPlans } : {}),
      ...(focusAreaIds.length ? { focusAreaIds } : {}),
      ...(incantations.length ? { incantations } : {}),
      ...(goalInbox.length ? { goalInbox } : {}),
      ...(manifestoName.trim() ? { manifestoName: manifestoName.trim() } : {}),
      ...(manifestoLines.length ? { manifestoLines } : {}),
      ...(letters.length ? { letters } : {}),
      ...(counters.length ? { counters } : {}),
      ...(valueRules.length ? { valueRules } : {}),
      ...(customAreas.length ? { customAreas } : {}),
      ...(Object.keys(baselineRatings).length ? { baselineRatings } : {}),
      ...(Object.keys(baselineRatedAt).length ? { baselineRatedAt } : {}),
      ...(affirmations.length ? { affirmations } : {}),
      ...(areaRank.length ? { areaRank } : {}),
      ...(guideDone.length ? { guideDone } : {}),
      ...(relationshipStatus !== "unset" ? { relationshipStatus } : {}),
      ...(beliefs.length ? { beliefs } : {}),
      ...(rawWants.length ? { rawWants } : {}),
      ...(Object.keys(approachReps).length ? { approachReps } : {}),
      ...(yearDebrief.good.length || yearDebrief.challenges.length || yearDebrief.lessons.length ? { yearDebrief } : {}),
      ...(text.trim() && text !== matchedText ? { visionDraft: text } : {}),
      ...(ritualAudit.length ? { ritualAudit } : {}),
      ...(ruleWork.length ? { ruleWork } : {}),
      ...(sessionJournals.length ? { sessionJournals } : {}),
      ...(intakeSeen.length ? { intakeSeen } : {}),
      ...(Object.keys(yourZeros).length ? { yourZeros } : {}),
      ...(perfectDay.trim() ? { perfectDay } : {}),
    }
    try { localStorage.setItem(SANDBOX_KEY, JSON.stringify(state)) } catch { /* quota */ }
  }, [hydrated, goals, result, matchedText, text, priorityIds, dailyBudget, confirmed, progress, areaOrder, deselected, ritual, committedAt, valuesList, awayValues, drivingForce, yourTens, areaPlans, focusAreaIds, incantations, goalInbox, manifestoName, manifestoLines, letters, counters, valueRules, customAreas, baselineRatings, baselineRatedAt, affirmations, areaRank, guideDone, yearDebrief, relationshipStatus, approachReps, beliefs, rawWants, ritualAudit, ruleWork, sessionJournals, intakeSeen, yourZeros, perfectDay])

  // Keep the id-minting mirror current, and never let a pending suggestion
  // timer fire into an unmounted tree.
  useEffect(() => { goalsRef.current = goals }, [goals])
  useEffect(() => { suggestionsRef.current = suggestions }, [suggestions])
  useEffect(() => {
    const timers = suggestTimersRef.current
    return () => { for (const t of Object.values(timers)) clearTimeout(t) }
  }, [])

  const resetSandbox = useCallback(() => {
    try { localStorage.removeItem(SANDBOX_KEY) } catch { /* ignore */ }
    setText(""); setMatchedText(""); setResult(null); setPhase("idle")
    setGoals(null); setGoalPhase("idle"); setGoalErr("")
    setPriorityIds([]); setDailyBudget(4)
    setAreaOrder([]); setDeselected(new Set())
    setConfirmed(false); setMode("create"); setPage("matters"); setResetArmed(false)
    setProgress(null)
    setRitual(null); setReportMonth(null)
    setCommittedAt(null); setValuesList([]); setAwayValues([]); setIncantations([]); setDrivingForce(null); setYourTens({}); setYourZeros({}); setIntakeSeen([]); setPerfectDay(""); setAreaPlans({}); setFocusAreaIds([])
    setGoalInbox([]); setManifestoName(""); setManifestoLines([])
    setLetters([]); setCounters([]); setValueRules([]); setCustomAreas([]); setBaselineRatings({}); setSuggestedIds(new Set()); setProposalPhase({})
    setBaselineRatedAt({}); setAffirmations([]); setAreaRank([]); setFocusCount(1); setLoadRepairs([])
    setGuideDone([]); setOpenSession(null); setRelationshipStatus("unset"); setApproachReps({}); setBeliefs([]); setRawWants([]); setCorrectingGoal(null); setYearDebrief({ good: [], challenges: [], lessons: [] })
    setRitualAudit([]); setRuleWork([]); setSessionJournals([])
    setExpanded(new Set())
  }, [])

  const ensureTaxonomyVecs = useCallback(async (onProgress: (p: number) => void) => {
    const items = buildTaxonomyItems()
    const version = taxonomyVersion(items)
    try {
      const cached = JSON.parse(localStorage.getItem(CACHE_KEY) || "null")
      if (cached?.version === version && Array.isArray(cached.vecs) && cached.vecs.length === items.length) {
        return { items, vecs: cached.vecs as number[][] }
      }
    } catch { /* ignore corrupt cache */ }
    const vecs = await embed(items.map((i: TaxonomyItem) => i.text), onProgress)
    try { localStorage.setItem(CACHE_KEY, JSON.stringify({ version, vecs: vecs.map((v) => v.map((x) => +x.toFixed(5))) })) } catch { /* quota */ }
    return { items, vecs }
  }, [])

  // v23 — `override` lets the Guide run the read on the text it just wrote,
  // without waiting a render for `text` state to catch up.
  const run = useCallback(async (override?: string) => {
    const q = (override ?? text).trim()
    if (!q) return
    setPhase("loading"); setErr(""); setPct(0)

    // Stall watchdog: the model download (~50MB, first run only) has no natural
    // timeout — if neither progress nor completion happens for 45s, fail
    // EXPLICITLY with a retry hint instead of spinning forever.
    let lastBeat = Date.now()
    const beat = (p: number) => { lastBeat = Date.now(); setPct(p) }
    let stallTimer: ReturnType<typeof setInterval> | undefined
    const stalled = new Promise<never>((_, reject) => {
      stallTimer = setInterval(() => {
        if (Date.now() - lastBeat > 45_000) {
          resetExtractor() // next click restarts the load (cached shards resume)
          reject(new Error("Model download stalled. Check your connection and click again to resume."))
        }
      }, 5_000)
    })

    const work = async () => {
      const { items, vecs } = await ensureTaxonomyVecs(beat)
      lastBeat = Date.now()
      setPhase("matching")
      const spans = splitSpans(q)
      if (!spans.length) throw new Error("Couldn't split the text into parts. Try adding a few more words.")
      const spanVecs = await embed(spans.map((s) => s.text))
      lastBeat = Date.now()
      return spanVecs.map((v) => matchTaxonomy(v, items, vecs)).map((m, i) => ({ m, span: spans[i] }))
    }

    try {
      const matched = await Promise.race([work(), stalled])
      const derived = deriveIntents(matched.map((x) => x.span), matched.map((x) => x.m))
      // Room-journey intents (dreams) survive a prose re-read.
      const roomOnes = (result?.intents ?? []).filter((i) => i.id.startsWith("room-"))
      const intents = [...derived.intents, ...roomOnes]
      setResult({ intents, unmatched: derived.unmatched })
      setAreaOrder(uniquePillarIds(intents))
      setDeselected(new Set())
      setMatchedText(q)
      // A new reading invalidates earlier AI suggestions — but never the
      // user-authored goals (room journey, workshop, routine picks).
      setGoals((prev) => {
        const kept = (prev ?? []).filter((g) => g.id.startsWith("room-") || g.id.startsWith("lp-") || g.id.startsWith("routine-"))
        return kept.length ? kept : null
      })
      setPriorityIds((prev) => prev.filter((id) => id.startsWith("room-") || id.startsWith("lp-") || id.startsWith("routine-")))
      setGoalPhase("idle")
      setGoalErr("")
      setPhase("done")
    } catch (e) {
      console.error("Vision plan intake failed:", e)
      setErr(e instanceof Error ? e.message : String(e))
      setPhase("error")
    } finally {
      if (stallTimer) clearInterval(stallTimer)
    }
  }, [text, ensureTaxonomyVecs, result])

  const generateGoals = useCallback(async () => {
    if (!result || result.intents.length === 0) return
    setGoalPhase("generating"); setGoalErr("")
    try {
      const res = await fetch("/api/goals/vision-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          vision: matchedText,
          intents: result.intents.map((i) => {
            const areaId = i.id.startsWith("room-") ? i.id.slice(5) : null
            const canonical = areaId ? LIFE_MASTERY_AREA_MAP.get(areaId) : undefined
            const roomLabel = areaId
              ? (canonical ? (areaPlans[areaId]?.name ?? "").trim() || canonical.label : customAreas.find((c) => c.id === areaId)?.label)
              : undefined
            return {
              id: i.id, text: i.text, pillarId: i.pillarId, pillarLabel: i.pillarLabel,
              objectiveId: i.objectiveId, objectiveLabel: i.objectiveLabel,
              ...(areaId ? { origin: "room" as const, ...(roomLabel ? { roomLabel } : {}) } : {}),
            }
          }),
        }),
      })
      const data = await res.json().catch(() => null)
      if (!res.ok) throw new Error(data?.error ?? `Request failed (${res.status})`)
      if (!Array.isArray(data?.goals) || data.goals.length === 0) throw new Error("No goals in response")
      // v8 — the AI SUGGESTS, it never authors: user-authored goals (goal
      // workshop `lp-*`, routine picks `routine-*`) always survive a redraw;
      // only earlier AI suggestions are replaced.
      const kept = (goals ?? []).filter((g) => g.id.startsWith("lp-") || g.id.startsWith("routine-") || g.id.startsWith("room-"))
      const keptIds = new Set(kept.map((g) => g.id))
      // v11 — the AI never authors the why: suggestions arrive why-blank and
      // the card demands the user's own fuel (deriving reasons IS the practice).
      const suggested = (data.goals as VisionGoalDraft[]).filter((g) => !keptIds.has(g.id)).map((g) => ({ ...g, why: "" }))
      const drafted = [...kept, ...suggested]
      setGoals(drafted)
      // Open only the first card's plan — one open card demonstrates the
      // decomposition; six of them turn the page into a wall. The rest show
      // a "The plan · N habits · N tasks" summary to unfold.
      setExpanded(new Set(drafted.slice(0, 1).map((g) => g.id)))
      // Initial priority: LLM order regrouped by the area board's drag order.
      // The LLM may introduce an area no intent mapped to (re-routed weak
      // match) — extend the board so that area stays draggable/toggleable.
      const extendedOrder = extendAreaOrder(areaOrder, drafted)
      setAreaOrder(extendedOrder)
      setPriorityIds(orderGoalIdsByArea(drafted.map((g) => g.id), drafted, extendedOrder))
      setGoalPhase("done")
    } catch (e) {
      console.error("Goal generation failed:", e)
      setGoalErr(e instanceof Error ? e.message : String(e))
      setGoalPhase("error")
    }
  }, [result, matchedText, areaOrder, goals, areaPlans, customAreas])

  // Goals draft themselves as soon as a fresh reading lands — no extra click —
  // UNLESS the user has goal-workshop material waiting: then THEY author first
  // (his order: brainstorm → circle → qualify) and AI suggestions are opt-in.
  // Only fires from "idle" (generating/error/done never retrigger) so a failed
  // call surfaces its explicit retry button instead of looping.
  useEffect(() => {
    // Only user-authored goals so far still counts as "nothing drafted".
    const undrafted = goals === null || goals.every((g) => g.id.startsWith("room-") || g.id.startsWith("lp-") || g.id.startsWith("routine-"))
    if (!hydrated || phase !== "done" || goalPhase !== "idle" || !undrafted) return
    if (!result || result.intents.length === 0) return
    if (goalInbox.length > 0) return
    // Room-journey work alone never auto-fires the LLM — suggestions there are
    // an explicit button. Auto-draft belongs to the prose Build path only.
    if (!matchedText.trim()) return
    void generateGoals()
  }, [hydrated, phase, goalPhase, goals, result, generateGoals, goalInbox, matchedText])

  // Area board interactions — reordering areas regroups the goal priority list;
  // toggling hides/shows that area's goals (they're filtered, never deleted).
  const reorderAreas = useCallback((pillarIds: string[]) => {
    setAreaOrder(pillarIds)
    if (goals) setPriorityIds((prev) => orderGoalIdsByArea(prev, goals, pillarIds))
  }, [goals])
  const toggleArea = useCallback((pillarId: string) => {
    setDeselected((prev) => {
      const next = new Set(prev)
      if (next.has(pillarId)) next.delete(pillarId)
      else next.add(pillarId)
      return next
    })
  }, [])

  // M10 — routine library picks. Every habit id across the plan marks the
  // library ("added" state); toggling folds/unfolds the pick into the
  // per-category routine goal and keeps priority/board/selection in sync.
  const addedHabitIds = useMemo(
    () => new Set((goals ?? []).flatMap((g) => g.habits.map((h) => h.id))),
    [goals],
  )
  const toggleRoutineItem = useCallback((category: RoutineCategory, item: RoutineTemplate) => {
    if (!goals) return
    const hid = routineHabitId(category.id, item.id)
    const gid = routineGoalId(category.id)
    const isAdded = addedHabitIds.has(hid)
    const next = isAdded ? removeRoutineHabit(goals, hid) : addRoutineHabit(goals, category, item)
    setGoals(next)
    const goalExists = next.some((g) => g.id === gid)
    if (!isAdded) {
      // priorityIds must exactly cover the goals — append the new routine goal.
      setPriorityIds((prev) => (goalExists && !prev.includes(gid) ? [...prev, gid] : prev))
      setAreaOrder((prev) => extendAreaOrder(prev, next))
      // Adding into a left-out area re-includes it, or the pick would vanish.
      setDeselected((prev) => {
        if (!prev.has(category.pillarIds[0])) return prev
        const n = new Set(prev)
        n.delete(category.pillarIds[0])
        return n
      })
      setExpanded((prev) => new Set(prev).add(gid))
    } else if (!goalExists) {
      setPriorityIds((prev) => prev.filter((id) => id !== gid))
    }
  }, [goals, addedHabitIds])

  const editWhy = useCallback((goalId: string, why: string) => {
    setGoals((prev) => prev?.map((g) => (g.id === goalId ? { ...g, why } : g)) ?? prev)
  }, [])

  const toggleExpanded = useCallback((goalId: string) => {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(goalId)) next.delete(goalId)
      else next.add(goalId)
      return next
    })
  }, [])

  // M5 — plan edits (all persisted via the state effect above).
  const editGoal = useCallback((goalId: string, patch: (g: VisionGoalDraft) => VisionGoalDraft) => {
    setGoals((prev) => prev?.map((g) => (g.id === goalId ? patch(g) : g)) ?? prev)
  }, [])
  const editTitle = useCallback((goalId: string, title: string) => {
    editGoal(goalId, (g) => ({ ...g, title }))
  }, [editGoal])
  const deleteHabit = useCallback((goalId: string, habitId: string) => {
    // Every goal keeps ≥1 habit — the delete affordance is hidden on the last one.
    editGoal(goalId, (g) => (g.habits.length > 1 ? { ...g, habits: g.habits.filter((h) => h.id !== habitId) } : g))
  }, [editGoal])
  const deleteTask = useCallback((goalId: string, taskId: string) => {
    editGoal(goalId, (g) => ({ ...g, tasks: g.tasks.filter((t) => t.id !== taskId) }))
  }, [editGoal])
  const addHabit = useCallback((goalId: string, title: string, daysPerWeek: number) => {
    const t = title.trim()
    if (!t) return
    editGoal(goalId, (g) => ({
      ...g,
      habits: [...g.habits, { id: `${goalId}-habit-u${Date.now()}`, title: t, daysPerWeek }],
    }))
  }, [editGoal])

  // M8 — plan tweaks: frequency, milestones, ramps, dates, AI refine.
  const editHabitFreq = useCallback((goalId: string, habitId: string, delta: number) => {
    editGoal(goalId, (g) => ({
      ...g,
      habits: g.habits.map((h) => (h.id === habitId ? { ...h, daysPerWeek: Math.min(7, Math.max(1, h.daysPerWeek + delta)) } : h)),
    }))
  }, [editGoal])
  const editMeasure = useCallback((goalId: string, patch: Partial<{ start: number; target: number; steps: number; unit: string }>) => {
    editGoal(goalId, (g) => {
      if (!g.measure) return g
      const measure = { ...g.measure, ...patch }
      // M4 — the rung count follows the range, so moving either end re-derives
      // it. Left alone, editing 0→100 down to 0→2 would keep five rungs and
      // draw fractional milestones between two whole numbers.
      if (patch.start !== undefined || patch.target !== undefined) {
        measure.steps = ladderSteps(measure.start, measure.target)
      }
      return { ...g, measure }
    })
  }, [editGoal])
  /** v17 — replace a goal's whole ramp. The primary habit follows the LAST
   * phase, because that's the steady-state load balancePlan sizes against —
   * leaving it on week 1's number would over-admit habits once the ramp tops
   * out (same invariant createAreaGoal enforces). */
  const editGoalRamp = useCallback((goalId: string, steps: HabitRampStep[]) => {
    editGoal(goalId, (g) => {
      const steady = Math.min(7, Math.max(1, steps[steps.length - 1]?.frequencyPerWeek ?? 3))
      return {
        ...g,
        rampSteps: steps,
        habits: g.habits.map((h, i) => (i === 0 ? { ...h, daysPerWeek: steady } : h)),
      }
    })
  }, [editGoal])
  const editGoalWhy = useCallback((goalId: string, why: string) => {
    editGoal(goalId, (g) => ({ ...g, why }))
  }, [editGoal])
  const editTargetDate = useCallback((goalId: string, date: string) => {
    editGoal(goalId, (g) => ({ ...g, targetDate: date || null }))
  }, [editGoal])

  // M11 — workout day designer.
  const editRoutine = useCallback((goalId: string, habitId: string, updater: (r: HabitRoutine | null) => HabitRoutine | null) => {
    editGoal(goalId, (g) => ({
      ...g,
      habits: g.habits.map((h) => (h.id === habitId ? { ...h, routine: updater(h.routine ?? null) } : h)),
    }))
  }, [editGoal])
  const applySplit = useCallback((goalId: string, habitId: string, split: WorkoutSplit) => {
    setGoals((prev) => (prev ? applyWorkoutSplit(prev, goalId, habitId, split) : prev))
  }, [])
  const renameRoutineDay = useCallback((goalId: string, habitId: string, dayId: string, name: string) => {
    editRoutine(goalId, habitId, (r) => (r ? { days: r.days.map((d) => (d.id === dayId ? { ...d, name } : d)) } : r))
  }, [editRoutine])
  const moveRoutineDay = useCallback((goalId: string, habitId: string, index: number, dir: -1 | 1) => {
    editRoutine(goalId, habitId, (r) => {
      if (!r) return r
      const j = index + dir
      if (j < 0 || j >= r.days.length) return r
      const days = [...r.days]
      ;[days[index], days[j]] = [days[j], days[index]]
      return { days }
    })
  }, [editRoutine])
  const addRoutineDay = useCallback((goalId: string, habitId: string) => {
    editRoutine(goalId, habitId, (r) => {
      if (!r) return r
      return { days: [...r.days, { id: `${habitId}-day-u${Date.now()}`, name: `Day ${String.fromCharCode(65 + r.days.length)}` }] }
    })
  }, [editRoutine])
  const removeRoutineDay = useCallback((goalId: string, habitId: string, dayId: string) => {
    editRoutine(goalId, habitId, (r) => {
      if (!r || r.days.length <= 1) return r
      return { days: r.days.filter((d) => d.id !== dayId) }
    })
  }, [editRoutine])
  const clearRoutine = useCallback((goalId: string, habitId: string) => {
    editRoutine(goalId, habitId, () => null)
  }, [editRoutine])

  const [refiningId, setRefiningId] = useState<string | null>(null)
  const [refineErrs, setRefineErrs] = useState<Record<string, string>>({})
  const refineGoal = useCallback(async (goalId: string, instruction: string) => {
    const goal = goals?.find((g) => g.id === goalId)
    if (!goal || refiningId) return
    setRefiningId(goalId)
    setRefineErrs((p) => ({ ...p, [goalId]: "" }))
    try {
      const res = await fetch("/api/goals/vision-plan/refine", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ vision: matchedText, instruction, goal }),
      })
      const data = await res.json().catch(() => null)
      if (!res.ok) throw new Error(data?.error ?? `Request failed (${res.status})`)
      if (!data?.goal?.id) throw new Error("No goal in response")
      editGoal(goalId, () => data.goal)
    } catch (e) {
      console.error("Goal refine failed:", e)
      setRefineErrs((p) => ({ ...p, [goalId]: e instanceof Error ? e.message : String(e) }))
    } finally {
      setRefiningId(null)
    }
  }, [goals, matchedText, refiningId, editGoal])

  // M6 — check-off handlers.
  const toggleHabitToday = useCallback((habitId: string) => {
    setProgress((prev) => {
      if (!prev) return prev
      const dates = prev.completions[habitId] ?? []
      const next = dates.includes(today) ? dates.filter((d) => d !== today) : [...dates, today]
      return { ...prev, completions: { ...prev.completions, [habitId]: next } }
    })
  }, [today])
  const toggleTaskDone = useCallback((taskId: string) => {
    setProgress((prev) => {
      if (!prev) return prev
      const done = prev.tasksDone.includes(taskId)
        ? prev.tasksDone.filter((t) => t !== taskId)
        : [...prev.tasksDone, taskId]
      return { ...prev, tasksDone: done }
    })
  }, [])
  const confirmPlan = useCallback(() => {
    setConfirmed(true)
    // v23 — signing SEEDS tracking from the plan instead of starting it blank.
    // The room ratings collected all through planning were written to
    // `baselineRatings` and then read by nothing on Track: the wheel, the score
    // history and the pyramid all read `weeklyReviews`, which is empty for the
    // first seven days. So week one — the week a new user most needs to see
    // movement — had no "from" to compare against, and the +1 rule, the deltas
    // and the ghost dots were all blank. The baseline becomes review week 0.
    setProgress((prev) => {
      const base = prev ?? { startDate: localTodayISO(), completions: {}, tasksDone: [] }
      return seedBaselineReview({ ...base, lastSeen: localTodayISO() }, baselineRatings)
    })
    setMode("track")
  }, [baselineRatings])

  // --- PLM layer handlers ----------------------------------------------------

  // M2 — daily vision review.
  const onToggleVisionReviewed = useCallback(() => {
    setProgress((prev) => (prev ? toggleVisionReviewed(prev, today) : prev))
  }, [today])

  // M3 — ritual builder (plan mode) + daily checklist (track mode).
  // v10: creating a ritual stamps builtAt (drives the 30-day install counter);
  // later tweaks keep the original date — only an explicit rotate resets it.
  const onRitualPreset = useCallback((preset: 15 | 30 | 60) => {
    setRitual((prev) => ({ ...ritualFromPreset(preset), builtAt: prev?.builtAt ?? today, weekly: prev?.weekly }))
  }, [today])
  const onRitualToggleStep = useCallback((item: { id: string; title: string; minutes: number }) => {
    setRitual((prev) => {
      const next = toggleRitualStep(prev, item)
      return next ? { ...next, builtAt: prev?.builtAt ?? today } : next
    })
  }, [today])
  const onWeeklyRitualToggle = useCallback((w: VisionWeeklyRitual) => {
    // Schema requires ≥1 morning item — weekly rituals attach to an existing
    // ritual only (the builder disables the picker until one exists).
    setRitual((prev) => {
      if (!prev) return prev
      const has = (prev.weekly ?? []).some((x) => x.id === w.id)
      const weekly = has ? (prev.weekly ?? []).filter((x) => x.id !== w.id) : [...(prev.weekly ?? []), w]
      return { ...prev, weekly }
    })
  }, [])
  /** M8 — attach a real action to a goal that had only the auto placeholder. */
  const addAction = useCallback((goalId: string, action: { title: string; daysPerWeek: number }) => {
    setGoals((prev) => (prev ? addGoalAction(prev, goalId, action) : prev))
  }, [])
  const onRitualRotate = useCallback(() => {
    setRitual((prev) => (prev ? { ...prev, builtAt: today } : prev))
  }, [today])
  const onRitualMove = useCallback((index: number, dir: -1 | 1) => {
    setRitual((prev) => (prev ? moveRitualStep(prev, index, dir) : prev))
  }, [])
  const onRitualStepDone = useCallback((itemId: string) => {
    setProgress((prev) => (prev ? toggleRitualStepDone(prev, today, itemId) : prev))
  }, [today])

  // M4 — RPM day plan: musts, ad-hoc items, and yesterday→today rollover.
  const onToggleMust = useCallback((id: string) => {
    setProgress((prev) => (prev ? toggleMustItem(prev, today, id) : prev))
  }, [today])
  const onAddAdhoc = useCallback((title: string) => {
    setProgress((prev) => (prev ? addAdhocItem(prev, today, title) : prev))
  }, [today])
  const onToggleAdhoc = useCallback((id: string) => {
    setProgress((prev) => (prev ? toggleAdhocItem(prev, today, id) : prev))
  }, [today])
  // v9 — per-block fresh reason (RPM) + numeric measure logging.
  const onDelegateAdhoc = useCallback((id: string) => {
    setProgress((prev) => (prev ? removeAdhocItem(prev, today, id) : prev))
  }, [today])
  const onSetBlockReason = useCallback((pillarId: string, text: string) => {
    setProgress((prev) => (prev ? setBlockReason(prev, today, pillarId, text) : prev))
  }, [today])
  const onLogMeasure = useCallback((goalId: string, value: number) => {
    setProgress((prev) => (prev ? logMeasure(prev, goalId, today, value) : prev))
  }, [today])
  useEffect(() => {
    if (!hydrated || mode !== "track") return
    // v23 — roll every day the user was away, not just yesterday. Missing two
    // days used to strand Monday's unfinished musts on Monday's plan forever,
    // with nothing anywhere saying they existed.
    setProgress((prev) => (prev ? { ...rolloverAdhocSince(prev, prev.lastSeen, today), lastSeen: today } : prev))
    // v10 — scheduled weekly outcomes land on their day's could-do list.
    setProgress((prev) => (prev ? materializeOutcomes(prev, today) : prev))
  }, [hydrated, mode, today])

  // M5 — Weekly Evaluation Ritual.
  const onSaveWeeklyReview = useCallback((review: VisionWeeklyReview) => {
    setProgress((prev) => {
      if (!prev) return prev
      // Saving the review retires its draft — otherwise re-opening the form
      // would restore the pre-save copy over the saved one.
      // the draft is intentionally dropped once the review is saved
      const { weeklyDraft: _savedDraft, ...rest } = saveWeeklyReview(prev, review)
      void _savedDraft
      return rest
    })
  }, [])

  // v23 — mirror every keystroke of the weekly review into `progress` so the
  // form can be left and come back to. Updater form: the review writes bursts.
  const onWeeklyDraft = useCallback((patch: Partial<VisionWeeklyDraft>, weekStart: string) => {
    setProgress((prev) => {
      if (!prev) return prev
      const base: VisionWeeklyDraft =
        prev.weeklyDraft && prev.weeklyDraft.weekStart === weekStart
          ? prev.weeklyDraft
          : { weekStart, areaRatings: {}, savedAt: localTodayISO() }
      return { ...prev, weeklyDraft: { ...base, ...patch, weekStart, savedAt: localTodayISO() } }
    })
  }, [])

  // --- PLM OS handlers -------------------------------------------------------

  // M3 — goal-level affirmation sentence, belief, pain-why.
  const editSmartSentence = useCallback((goalId: string, text: string) => {
    editGoal(goalId, (g) => ({ ...g, smartSentence: text || null }))
  }, [editGoal])
  const editBelief = useCallback((goalId: string, level: number) => {
    editGoal(goalId, (g) => ({ ...g, beliefLevel: level }))
  }, [editGoal])
  const editPainWhy = useCallback((goalId: string, text: string) => {
    editGoal(goalId, (g) => ({ ...g, painWhy: text || null }))
  }, [editGoal])

  // M4 — one-tap raise-the-score action for a weak Blueprint area.
  const onRaiseArea = useCallback((areaId: string) => {
    const pick = RAISE_ACTIONS[areaId]
    if (!pick || !goals) return
    const category = ROUTINE_CATEGORIES.find((c) => c.id === pick.categoryId)
    const item = category?.items.find((i) => i.id === pick.itemId)
    if (!category || !item) return
    const hid = routineHabitId(category.id, item.id)
    if (addedHabitIds.has(hid)) return
    toggleRoutineItem(category, item)
  }, [goals, addedHabitIds, toggleRoutineItem])

  // M5 — evening reflection.
  const onEveningReflection = useCallback((patch: Partial<{ amazing: string; better: string; dayScore: number; magicMoment: string }>) => {
    setProgress((prev) => (prev ? saveEveningReflection(prev, today, patch) : prev))
  }, [today])

  // M6 — confirmed report verdicts (period = "YYYY-MM" or "YYYY").
  const onSaveVerdict = useCallback((period: string, goalId: string, entry: VisionVerdictEntry) => {
    setProgress((prev) => (prev ? saveVerdict(prev, period, goalId, entry) : prev))
  }, [])

  // OS v2 — the guided path: pending actions + deep-link navigation.
  const guided = useMemo(
    () => pendingActions({ committedAt, values: valuesList, awayValues, drivingForce, yourTens, areaPlans, focusAreaIds, ritual, goals, priorityIds, progress, confirmed, today }),
    [committedAt, valuesList, awayValues, drivingForce, yourTens, areaPlans, focusAreaIds, ritual, goals, priorityIds, progress, confirmed, today],
  )
  const goToAnchor = useCallback((mode: "create" | "track" | "library", anchor: string) => {
    setMode(mode)
    // A section that doesn't exist yet (e.g. Goals before the vision is read)
    // falls back to the flow's start instead of a dead click.
    window.setTimeout(() => (document.getElementById(anchor) ?? document.getElementById("lm-vision"))?.scrollIntoView({ behavior: "smooth", block: "start" }), 180)
  }, [])
  // v4 — the pace-setter: load a clearly-labeled worked example into the sandbox.
  // v23 — it OVERWRITES values, driving force, area plans, your-10s and the whole
  // progress history. On a blank slate that's the point; on top of real work it
  // is destructive and used to happen on a single click with no warning. Arm it
  // when there is something to lose.
  const exampleWouldOverwrite =
    valuesList.length > 0 || !!drivingForce || Object.keys(yourTens).length > 0 ||
    Object.keys(areaPlans).length > 0 || (!!goals && goals.length > 0) || !!progress
  const loadExample = useCallback(() => {
    const ex = buildExamplePlan(today)
    setText(ex.vision); setMatchedText(ex.vision)
    setResult({ intents: ex.intents, unmatched: [] }); setPhase("done")
    setGoals(ex.goals); setGoalPhase("done")
    setPriorityIds(ex.priorityIds); setDailyBudget(ex.dailyBudget)
    setConfirmed(true); setProgress(ex.progress ?? null)
    setRitual(ex.ritual ?? null)
    setValuesList(ex.values ?? []); setAwayValues(ex.awayValues ?? [])
    setDrivingForce(ex.drivingForce ?? null); setYourTens(ex.yourTens ?? {})
    setAreaPlans(ex.areaPlans ?? {}); setFocusAreaIds(ex.focusAreaIds ?? []); setIncantations(ex.incantations ?? [])
    // The example never overwrites a signature the user already made.
    setCommittedAt((prev) => prev ?? ex.committedAt ?? null)
    setGoalInbox(ex.goalInbox ?? [])
    setManifestoName((prev) => (prev.trim() ? prev : ex.manifestoName ?? ""))
    setManifestoLines((prev) => (prev.length ? prev : ex.manifestoLines ?? []))
    setValueRules(ex.valueRules ?? [])
    setAreaOrder(extendAreaOrder(ex.areaOrder ?? [], ex.goals)); setDeselected(new Set())
    setMode("track"); setPage("doing")
  }, [today])

  const toggleGoalExpanded = useCallback((goalId: string) => {
    setExpandedGoals((prev) => {
      const next = new Set(prev)
      if (next.has(goalId)) next.delete(goalId)
      else next.add(goalId)
      return next
    })
  }, [])

  // Domino focus — one choice, felt everywhere: picking 1-3 season rooms
  // ALSO floats their goals to the front of the schedule (stable partition,
  // manual drags between goals of the same tier survive; drag re-overrides).
  // v23 — INTERNAL. Only `applyPriority` may call this: it writes the focus
  // projection and re-floats the schedule, but it does NOT write `areaRank` or
  // `focusCount`, so any other caller desyncs the season. The pickers that used
  // to call it directly are now read-only summaries.
  const applyFocusProjection = useCallback((ids: string[]) => {
    setFocusAreaIds(ids)
    if (ids.length === 0) return
    setPriorityIds((prev) => {
      if (!goals) return prev
      const byId = new Map(goals.map((g) => [g.id, g]))
      const inFocus = (id: string) => {
        const g = byId.get(id)
        return !!g && ids.some((areaId) => goalFeedsArea(g, areaId))
      }
      return [...prev.filter(inFocus), ...prev.filter((id) => !inFocus(id))]
    })
  }, [goals])

  // v14 — the vision wheel's rooms: the canonical 12 (with the user's custom
  // names from areaPlans, shared with the Life Plan) + any user-added rooms.
  const wheelRooms = useMemo(
    () => [
      ...LIFE_MASTERY_AREAS.map((a) => ({ id: a.id, label: (areaPlans[a.id]?.name ?? "").trim() || a.label, sublabel: a.sublabel, color: a.color, custom: false })),
      ...customAreas.map((c) => ({ id: c.id, label: c.label, sublabel: "", color: c.color, custom: true })),
    ],
    [areaPlans, customAreas],
  )
  // v23 — ONE label resolver. Renaming was honoured in four places and ignored
  // in the mode you live in: the Track wheel, the weekly review's twelve rows
  // and its three area dropdowns, the score history and the rebaseline nudge
  // all read the canonical `label` straight off the data module. So the Guide
  // spent a session teaching that the name is load-bearing, and every day after
  // that the product called your room "Health" again.
  const areaLabels = useMemo(
    () => Object.fromEntries(wheelRooms.map((r) => [r.id, r.label])) as Record<string, string>,
    [wheelRooms],
  )

  const onRenameRoom = useCallback((id: string, name: string) => {
    const t = name.trim()
    if (!t) return
    if (id.startsWith("custom-")) setCustomAreas((p) => p.map((c) => (c.id === id ? { ...c, label: t } : c)))
    else setAreaPlans((p) => ({ ...p, [id]: { ...(p[id] ?? {}), name: t } }))
  }, [])
  const onAddRoom = useCallback((name: string): string | null => {
    const t = name.trim()
    if (!t) return null
    let n = 1
    while (customAreas.some((c) => c.id === `custom-${n}`)) n++
    const id = `custom-${n}`
    const color = CUSTOM_ROOM_COLORS[customAreas.length % CUSTOM_ROOM_COLORS.length]
    setCustomAreas((p) => [...p, { id, label: t, color }])
    return id
  }, [customAreas])
  const onRemoveRoom = useCallback((id: string) => {
    setCustomAreas((p) => p.filter((c) => c.id !== id))
  }, [])
  // v17 — journey progress per room (0-4 beats: picture, gap, goals, the soft
  // work). The soft beat is now COUNTED, not optional depth hidden in a drawer:
  // an area's why/identity/affirmation is the framework, not a nice-to-have.
  // v23 — the rail used to unlock "Your life" on `roomBeats`, which counts a
  // bare 0-10 rating. But stage 2 renders only under `result && phase ===
  // "done"`, and rating a room never sets `result` — so moving one slider
  // unlocked the step, and clicking it showed a heading, the rail and a bottom
  // bar over an empty page. Two gates for one screen, disagreeing. This is the
  // condition stage 2 actually needs, and the bottom stepper reads it too.
  const lifewideReady = (!!result && phase === "done" && result.intents.length > 0) || (!!goals && goals.length > 0)

  // =========================================================================
  // v25 — THE SEQUENTIAL INTAKE
  //
  // The predicates in visionPlanService read a VisionPlanState, but this
  // component keeps its state spread across ~40 useState hooks. `liveState`
  // assembles the slice the intake needs so "is this question answered" has one
  // definition, shared with the migration path and the tests.
  // =========================================================================
  const liveState = useMemo<VisionPlanState>(() => ({
    vision: matchedText,
    visionDraft: text,
    intents: result?.intents ?? [],
    goals: goals ?? [],
    priorityIds,
    dailyBudget,
    confirmed,
    ...(committedAt ? { committedAt } : {}),
    ...(valuesList.length ? { values: valuesList } : {}),
    ...(awayValues.length ? { awayValues } : {}),
    ...(drivingForce ? { drivingForce } : {}),
    ...(Object.keys(yourTens).length ? { yourTens } : {}),
    ...(Object.keys(yourZeros).length ? { yourZeros } : {}),
    ...(Object.keys(areaPlans).length ? { areaPlans } : {}),
    ...(areaRank.length ? { areaRank } : {}),
    ...(rawWants.length ? { rawWants } : {}),
    ...(yearDebrief.good.length || yearDebrief.challenges.length || yearDebrief.lessons.length ? { yearDebrief } : {}),
    ...(perfectDay.trim() ? { perfectDay } : {}),
    ...(intakeSeen.length ? { intakeSeen } : {}),
    ...(progress ? { progress } : {}),
  }), [matchedText, text, result, goals, priorityIds, dailyBudget, confirmed, committedAt, valuesList,
      awayValues, drivingForce, yourTens, yourZeros, areaPlans, areaRank, rawWants, yearDebrief,
      perfectDay, intakeSeen, progress])

  // Page 0 asks you to debrief a year. On a first run there is no year in the
  // app to debrief, so it is dropped from the rail entirely rather than shown
  // as a step you are expected to skip.
  const visiblePages = useMemo(
    () => INTAKE_PAGES.filter((p) => !(p.optionalOnFirstRun && !isAnnualRerun(liveState))),
    [liveState],
  )
  const [page, setPage] = useState<IntakePageId>("matters")
  const intakePage = visiblePages.find((p) => p.id === page) ?? visiblePages[0]
  const revealed = useMemo(() => revealedIntakeQuestions(liveState, page), [liveState, page])

  // On hydrate, drop the user at the page holding their first unfinished
  // question so a returning plan reopens where it stopped.
  const intakeLanded = useRef(false)
  useEffect(() => {
    if (!hydrated || intakeLanded.current) return
    intakeLanded.current = true
    setPage(deriveIntakePosition(liveState).page)
    // Reopen the view the user was last in. Without this a reload mid-intake
    // dropped them on the Guide, which reads as "my answers are gone" even
    // though the plan itself had saved correctly.
    try {
      const saved = localStorage.getItem(VIEW_MODE_KEY)
      if (saved === "create" || saved === "track" || saved === "library" || saved === "guide") setMode(saved)
    } catch { /* private mode */ }
  }, [hydrated, liveState])

  useEffect(() => {
    if (!hydrated) return
    try { localStorage.setItem(VIEW_MODE_KEY, mode) } catch { /* quota */ }
  }, [hydrated, mode])

  /** "I'm not sure yet": settle the question without inventing an answer. */
  const waveIntakePast = useCallback((id: string) => {
    setIntakeSeen((prev) => (prev.includes(id) ? prev : [...prev, id]))
  }, [])

  /** The first question still holding this page's CTA. Named on screen, because
   * "answer the questions on this page first" beside a page of filled-in
   * answers is the least helpful thing we could say. */
  const blockingQuestion = useMemo(
    () => revealed.find((q) => !q.optional && !isIntakeSettled(liveState, q.id)) ?? null,
    [revealed, liveState],
  )
  const pageIndex = visiblePages.findIndex((p) => p.id === page)
  const nextPage = pageIndex >= 0 ? visiblePages[pageIndex + 1] : undefined
  const nextPageLabel = nextPage ? `Next: ${nextPage.label}` : "Finish"
  const goNextIntakePage = useCallback(() => {
    if (!nextPage) return
    setPage(nextPage.id)
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "auto" })
  }, [nextPage])

  /** The input for one question. Free-text and list questions render
   * generically; the `custom` ones hand off to the editors that already exist
   * for that exercise, so nothing is rebuilt twice. */
  const renderIntakeInput = useCallback((q: IntakeQuestion): ReactNode => {
    const debrief = (key: "good" | "challenges" | "lessons") => (
      <IntakeList
        items={yearDebrief[key]}
        onChange={(next) => setYearDebrief((prev) => ({ ...prev, [key]: next }))}
        placeholder={q.placeholder}
      />
    )
    switch (q.id) {
      case "back_good": return debrief("good")
      case "back_challenges": return debrief("challenges")
      case "back_lessons": return debrief("lessons")
      case "values_audit":
        return <IntakeList items={valuesList} onChange={setValuesList} placeholder={q.placeholder} />
      case "vision":
        return <IntakeText long value={text} onChange={setText} placeholder={q.placeholder} />
      case "perfect_day":
        return <IntakeText long value={perfectDay} onChange={setPerfectDay} placeholder={q.placeholder} />
      case "purpose":
        return (
          <IntakeText
            long
            value={drivingForce?.purpose ?? ""}
            onChange={(v) => setDrivingForce((prev) => ({ ...(prev ?? { purpose: "", reasons: [], identity: [] }), purpose: v }))}
            placeholder={q.placeholder}
          />
        )
      case "identity":
        return (
          <IntakeList
            items={drivingForce?.identity ?? []}
            onChange={(next) => setDrivingForce((prev) => ({ ...(prev ?? { purpose: "", reasons: [], identity: [] }), identity: next }))}
            placeholder={q.placeholder}
          />
        )
      case "conduct":
        return (
          <IntakeList
            items={drivingForce?.conduct ?? []}
            onChange={(next) => setDrivingForce((prev) => ({ ...(prev ?? { purpose: "", reasons: [], identity: [] }), conduct: next }))}
            placeholder={q.placeholder}
          />
        )
      // These two had no input at all, so the skip link was the only way past
      // them. The first question in the whole intake was unclickable.
      case "commit":
        return (
          <IntakeCommit
            committedAt={committedAt}
            today={today}
            onCommit={() => setCommittedAt(today)}
            onUndo={() => setCommittedAt(null)}
          />
        )
      case "values_redesign":
        return (
          <ValuesJourney
            values={valuesList}
            awayValues={awayValues}
            onSetValues={setValuesList}
            onSetAway={setAwayValues}
          />
        )
      // Pages "areas" and "doing" draw their own editors below the question
      // list, so a custom question there is answerable without an inline input.
      // Anywhere else, a question with no input is a dead end: the heading
      // renders and the only control on the card is the skip link. That shipped
      // once. It must never be silent again (CLAUDE.md rule 3).
      // Pages "areas" and "doing" answer their questions through the wheel and
      // the goal workshop, which render directly beneath this card. The pointer
      // exists because a card with a heading and nothing else reads as broken,
      // which is exactly how the commit question shipped.
      case "areas_pick":
      case "areas_room":
      case "brainstorm":
      case "qualify":
      case "action_plan":
      case "sign":
        return (
          <p className="flex items-center gap-2 text-[11px] text-zinc-500">
            <ChevronDown className="size-3.5 shrink-0 text-zinc-600" />
            {q.id === "areas_pick" ? "Pick an area on the wheel below to open it."
              : q.id === "areas_room" ? "Everything for the open area is in the panel below."
              : q.id === "brainstorm" ? "The workshop below takes the list, the year numbers and the circling."
              : q.id === "qualify" ? "Each goal below carries its own sentence, ratings and reasons."
              : q.id === "action_plan" ? "Add the actions and the chunks on each goal below."
              : "Sign below to finish and start tracking."}
          </p>
        )
      default: {
        if (q.page === "areas" || q.page === "doing") return null
        const msg = `Intake question "${q.id}" on page "${q.page}" has no input. Wire it in renderIntakeInput.`
        if (process.env.NODE_ENV !== "production") throw new Error(msg)
        console.error(msg)
        return (
          <p className="text-[11px] text-amber-300/90 rounded-lg border border-amber-400/30 bg-amber-500/[0.07] px-3 py-2">
            This question is not finished yet. Skip it for now and it will keep your place.
          </p>
        )
      }
    }
  }, [yearDebrief, valuesList, awayValues, text, perfectDay, drivingForce, committedAt, today])


  const roomBeats = useMemo(() => {
    const beats: Record<string, number> = {}
    for (const r of wheelRooms) {
      let n = 0
      if ((yourTens[r.id] ?? "").trim()) n++
      if (baselineRatings[r.id] != null) n++
      if ((goals ?? []).some((g) => goalFeedsArea(g, r.id))) n++
      const plan = areaPlans[r.id]
      if ((plan?.purpose ?? "").trim() || (plan?.identity ?? "").trim() || (plan?.affirmations?.length ?? 0) > 0) n++
      if (n > 0) beats[r.id] = n
    }
    return beats
  }, [wheelRooms, yourTens, baselineRatings, goals, areaPlans])
  // v19 — the wheel's three visual states, DERIVED from the ranking. A
  // maintenance area is dimmed, never dashed-out: it has a floor, not a grave.
  const areaScopes = useMemo(() => {
    const out: Record<string, RoomScope> = {}
    for (const r of wheelRooms) {
      if (areaRank.length === 0) { out[r.id] = "unset"; continue }
      const tier = areaTier(areaRank, focusCount, r.id)
      out[r.id] = tier === "focus" ? "deep" : (roomBeats[r.id] ?? 0) > 0 ? "sketched" : "later"
    }
    return out
  }, [wheelRooms, areaRank, focusCount, roomBeats])
  const maintenanceFloors = useMemo(() => {
    const out: Record<string, string> = {}
    for (const [id, plan] of Object.entries(areaPlans)) if (plan?.maintenance) out[id] = plan.maintenance
    return out
  }, [areaPlans])

  // M1 room journey — beat handlers. The dream doubles as the room's intent:
  // saving it upserts `room-<areaId>` into the reading so the board, goal
  // drafting and coverage all see it without any embedding.
  // `dreamOverride` matters: the auto-trigger fires on a timer, and re-reading
  // `yourTens` from this closure would read the value from BEFORE the blur that
  // armed it — a stale-closure no-op that looks exactly like "the AI is broken".
  // The caller that has the fresh text passes it in.
  /**
   * v25 — the tray now has two seeds. The 10 is one; a goal the user just wrote
   * is the other (`anchorTitle`), because "here is a goal" is at least as strong
   * a statement of direction as "here is my picture" — and a room whose 10 is
   * still blank would otherwise never suggest anything. Whatever the seed, the
   * room's own goals and the standing tray go up as `have` so the coach cannot
   * hand back what the user already wrote.
   */
  const proposeRoomGoals = useCallback(async (areaId: string, dreamOverride?: string, anchorTitle?: string) => {
    const dream = (dreamOverride ?? yourTens[areaId] ?? "").trim()
    const roomGoals = (goalsRef.current ?? []).filter((g) => goalFeedsArea(g, areaId))
    // No 10 and no anchor handed in — the tray button was pressed in a room the
    // user has only written goals into. Their last goal is the seed: it is still
    // their own words, and refusing here would leave the button dead in exactly
    // the room where they've done the most writing.
    const anchor = (anchorTitle ?? "").trim() || (dream ? "" : (roomGoals[roomGoals.length - 1]?.title ?? "").trim())
    const seed = dream || anchor
    if (!seed) {
      console.error(`Refusing to draft goals for "${areaId}" with no 10 and no goal to work from`)
      setProposalPhase((p) => ({ ...p, [areaId]: "error" }))
      return
    }
    setProposalPhase((p) => ({ ...p, [areaId]: "loading" }))
    try {
      const canonical = LIFE_MASTERY_AREA_MAP.get(areaId)
      const roomLabel = canonical ? (areaPlans[areaId]?.name ?? "").trim() || canonical.label : customAreas.find((c) => c.id === areaId)?.label
      const intent = makeRoomIntent(areaId, seed)
      // Everything the room already holds — committed goals first, then drafts
      // still sitting in the tray. Both are "already said"; only the committed
      // ones are the user's, but a tray full of near-duplicates is just as bad.
      const have = dropDuplicateSuggestions(
        [
          ...roomGoals.map((g) => g.title),
          ...(suggestionsRef.current[areaId] ?? []).map((g) => g.title),
          ...(anchor ? [anchor] : []),
        ].map((title) => ({ title: title.slice(0, 160) })),
        [],
      ).map((g) => g.title)
      const res = await fetch("/api/goals/vision-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          vision: seed,
          intents: [{ id: intent.id, text: intent.text, pillarId: intent.pillarId, pillarLabel: intent.pillarLabel, objectiveId: null, objectiveLabel: null, origin: "room", ...(roomLabel ? { roomLabel } : {}) }],
          suggestFor: { anchor: anchor || null, have: have.slice(0, 60) },
        }),
      })
      const data = await res.json().catch(() => null)
      // A 401 here means nobody is signed in, which is an expected state in
      // this sandbox and NOT a failed answer from the model. Reporting both
      // the same way told the user "the coach didn't answer" about a request
      // that was never made.
      if (res.status === 401 || res.status === 403) throw new Error("UNAUTHENTICATED")
      if (!res.ok) throw new Error(data?.error ?? `Request failed (${res.status})`)
      if (!Array.isArray(data?.goals) || data.goals.length === 0) throw new Error("No suggestions came back")
      // Every draft the user already has, in whatever wording, is dropped here —
      // and if that empties the batch, the tray says so rather than looking like
      // a button that did nothing.
      const fresh = dropDuplicateSuggestions(data.goals as VisionGoalDraft[], have)
      if (fresh.length === 0) {
        setProposalPhase((p) => ({ ...p, [areaId]: "dry" }))
        return
      }
      // v17 — drafts land in a TRAY, not in the goal list. The coach proposes;
      // the user authors. Ids are minted here against both the committed goals
      // and the tray, so accepting one later can't collide.
      setSuggestions((prev) => {
        const tray = prev[areaId] ?? []
        const taken = new Set([...(goalsRef.current ?? []).map((g) => g.id), ...tray.map((g) => g.id)])
        const drafts: VisionGoalDraft[] = []
        for (const src of fresh) {
          let n = 1
          while (taken.has(`room-${areaId}-g${n}`)) n++
          const newId = `room-${areaId}-g${n}`
          taken.add(newId)
          drafts.push({
            ...src, id: newId, why: src.why ?? "", areaId,
            habits: src.habits.map((h, i) => ({ ...h, id: `${newId}-habit-${i}` })),
            tasks: src.tasks.map((t, i) => ({ ...t, id: `${newId}-task-${i}` })),
          })
        }
        return { ...prev, [areaId]: [...tray, ...drafts] }
      })
      setProposalPhase((p) => ({ ...p, [areaId]: "idle" }))
    } catch (e) {
      const unauth = e instanceof Error && e.message === "UNAUTHENTICATED"
      // Still reported, never swallowed (CLAUDE.md rule 3). Reported ACCURATELY.
      if (unauth) console.warn(`Goal drafting is unavailable for "${areaId}": not signed in.`)
      else console.error("Room goal proposal failed:", e)
      setProposalPhase((p) => ({ ...p, [areaId]: unauth ? "unavailable" : "error" }))
    }
  }, [yourTens, areaPlans, customAreas])

  /** v17 — accept one drafted suggestion: it becomes a real goal, taking the
   * same commit path suggestions used to take automatically. The user's why
   * stays blank — that question is theirs to answer.
   *
   * v25 — the draft STAYS in the tray, marked kept. Picking three of five used
   * to mean the list re-flowing under the cursor after every click; now the tray
   * holds still and only the buttons change. The committed goal carries the same
   * id, so "is this one kept" is read off the goal list, not a second store. */
  const acceptSuggestion = useCallback((areaId: string, id: string) => {
    // Read the draft OUTSIDE any updater: React re-invokes updaters (twice in
    // StrictMode), so committing the goal from inside one would add it twice.
    // Every setState below is its own pure updater.
    const draft = (suggestionsRef.current[areaId] ?? []).find((g) => g.id === id)
    if (!draft) return
    setGoals((prev) => ((prev ?? []).some((g) => g.id === draft.id) ? prev : [...(prev ?? []), draft]))
    setPriorityIds((p) => (p.includes(draft.id) ? p : [...p, draft.id]))
    setAreaOrder((p) => extendAreaOrder(p, [...(goalsRef.current ?? []), draft]))
    setDeselected((p) => { if (!p.has(draft.pillarId)) return p; const s = new Set(p); s.delete(draft.pillarId); return s })
    setSuggestedIds((p) => new Set(p).add(draft.id))
    setGoalPhase("done")
  }, [])

  /** v17 — goal graph edits. addGoalEdge fails closed (unknown id, self-edge,
   * duplicate, cycle); the picker already disables those targets, so a throw
   * here means a real bug — surface it rather than swallowing it. */
  const linkGoals = useCallback((fromId: string, toId: string) => {
    setGoals((prev) => {
      if (!prev) return prev
      try {
        return addGoalEdge(prev, fromId, toId)
      } catch (e) {
        console.error("Refused to link goals:", e)
        return prev
      }
    })
  }, [])
  const unlinkGoals = useCallback((fromId: string, toId: string) => {
    setGoals((prev) => (prev ? removeGoalEdge(prev, fromId, toId) : prev))
  }, [])

  const dismissSuggestion = useCallback((areaId: string, id: string) => {
    setSuggestions((prev) => ({ ...prev, [areaId]: (prev[areaId] ?? []).filter((g) => g.id !== id) }))
  }, [])

  /** v17 — "suggestions appear once you've typed". Rides the blur the dream
   * already commits on, so it costs one call per changed 10, not one per
   * keystroke. Guards: needs real content, skips a 10 we've already drafted
   * from, debounces a blur-then-refocus, and cancels in flight on re-edit. */
  const maybeSuggest = useCallback((areaId: string, dream: string) => {
    if (!autoSuggest) return
    const t = dream.trim()
    // v25 — 6 characters, not 40. This rides the BLUR the dream commits on, so
    // what arrives is a finished line, not half-typed text: "get healthy" is a
    // real 10 and used to draft nothing at all, silently.
    if (t.length < 6) return
    if (lastSuggestedRef.current[areaId] === t) return
    const timers = suggestTimersRef.current
    if (timers[areaId]) clearTimeout(timers[areaId])
    timers[areaId] = setTimeout(() => {
      lastSuggestedRef.current[areaId] = t
      void proposeRoomGoals(areaId, t)
    }, 600)
  }, [autoSuggest, proposeRoomGoals])

  /**
   * v25 — the second trigger: a goal the user just wrote themselves. Same
   * debounce as the 10, so rattling four goals off in a row costs ONE draft
   * (the last title wins) instead of four.
   *
   * Deliberately wired to the room composer only — NOT to accepting a
   * suggestion. Accepting adds a goal too, and firing on that would loop: draft
   * → keep → draft → keep, forever, on the coach's dime.
   */
  const maybeSuggestFromGoal = useCallback((areaId: string, title: string) => {
    if (!autoSuggest) return
    const t = title.trim()
    if (t.length < 3) return
    if (lastGoalSuggestedRef.current[areaId] === t) return
    const timers = suggestTimersRef.current
    if (timers[areaId]) clearTimeout(timers[areaId])
    timers[areaId] = setTimeout(() => {
      lastGoalSuggestedRef.current[areaId] = t
      void proposeRoomGoals(areaId, undefined, t)
    }, 900)
  }, [autoSuggest, proposeRoomGoals])
  const onRoomDream = useCallback((areaId: string, dream: string) => {
    const t = dream.trim()
    setYourTens((p) => ({ ...p, [areaId]: dream }))
    setResult((prev) => {
      const others = (prev?.intents ?? []).filter((i) => i.id !== `room-${areaId}`)
      const intents = t ? [...others, makeRoomIntent(areaId, t)] : others
      if (intents.length === 0) return matchedText.trim() ? prev : null
      return { intents, unmatched: prev?.unmatched ?? [] }
    })
    if (t) {
      setPhase("done")
      setAreaOrder((prev) => {
        const pid = LIFE_MASTERY_AREA_MAP.get(areaId)?.pillarIds[0] ?? "meaning"
        return prev.includes(pid) ? prev : [...prev, pid]
      })
      // v17 — the 10 is written; the suggestions come to you.
      maybeSuggest(areaId, t)
    }
  }, [matchedText, maybeSuggest])
  const onRoomRating = useCallback((areaId: string, rating: number) => {
    setBaselineRatings((p) => ({ ...p, [areaId]: rating }))
    // v17 — stamp WHEN, so the first weekly review knows how stale the baseline
    // is. Re-rating during create overwrites: pre-commit is a design session,
    // not a tracking log — the history that counts starts at the first review.
    setBaselineRatedAt((p) => ({ ...p, [areaId]: localTodayISO() }))
  }, [])
  // v17 — scope a room. This is the deliberate up-front choice; actually
  // OPENING a room promotes it too (openRoom), because doing the work is a
  // clearer statement of intent than any picker.
  // v19 — the ONE writer of rank + its focus projection, routed through the
  // fail-closed service setter so an impossible ranking can't be persisted.
  const applyPriority = useCallback((rank: string[], focus: number) => {
    const known = [...LIFE_MASTERY_AREAS.map((a) => a.id), ...customAreas.map((c) => c.id)]
    try {
      const out = setAreaPriority(rank, focus, known)
      setAreaRank(out.areaRank)
      setFocusCount(focus)
      applyFocusProjection(out.focusAreaIds)
    } catch (e) {
      console.error("Refused an invalid area priority:", e)
    }
  }, [customAreas, applyFocusProjection])
  const onApproachRep = useCallback((level: number, next: number) => {
    setApproachReps((p) => ({ ...p, [String(level)]: next }))
  }, [])
  const onReorderAreas = useCallback((rank: string[]) => applyPriority(rank, focusCount), [applyPriority, focusCount])
  const onFocusCount = useCallback((n: number) => applyPriority(areaRank, n), [applyPriority, areaRank])
  const openRoom = useCallback((areaId: string | null) => {
    setActiveRoomId(areaId)
    // v22 — a wedge click has to visibly DO something. The panel renders below
    // the wheel, so without this the page looks unchanged and the user assumes
    // the click failed. Deferred a frame so the panel exists before we scroll.
    if (areaId) {
      requestAnimationFrame(() => {
        document.getElementById("lm-room-panel")?.scrollIntoView({ behavior: "smooth", block: "center" })
      })
    }
    // v19 — opening a room no longer re-ranks anything: priority is a
    // deliberate choice in the season list, not a side effect of clicking.
  }, [])
  // Plain-text vision for read-only surfaces (Track card, ritual step 2, copy
  // blocks): the prose if written, else the room dreams spelled out.
  const visionDisplayText = useMemo(() => {
    if (matchedText.trim()) return matchedText
    const parts = wheelRooms
      .filter((r) => (yourTens[r.id] ?? "").trim())
      .map((r) => `${r.label}: ${yourTens[r.id].trim()}`)
    return parts.join(" ")
  }, [matchedText, yourTens, wheelRooms])

  // M1 beat 4 — guided proposals: one scoped LLM call per room; drafts are
  // held apart until the user circles them in (the AI suggests, YOU author).
  // M1.5 — inline goal-row edits from the room panel.
  const removeGoal = useCallback((goalId: string) => {
    // v17 — route through the service's removeGoal: it also strips this id from
    // every other goal's feedsGoalIds, so deleting can't leave a dangling link.
    setGoals((prev) => (prev ? removeGoalFromList(prev, goalId) : prev))
    setPriorityIds((prev) => prev.filter((id) => id !== goalId))
    setSuggestedIds((prev) => { if (!prev.has(goalId)) return prev; const s = new Set(prev); s.delete(goalId); return s })
  }, [])
  const setGoalType = useCallback((goalId: string, type: VisionGoalType) => {
    setSuggestedIds((prev) => { if (!prev.has(goalId)) return prev; const s = new Set(prev); s.delete(goalId); return s })
    editGoal(goalId, (g) => {
      if (g.type === type) return g
      const days = g.habits[0]?.daysPerWeek ?? 3
      // A goal keeps its working cadence across every flip — a ramp is how you
      // WORK at something, and that's true of a target and a finish line too.
      const ramp = g.rampSteps?.length ? g.rampSteps : [{ frequencyPerWeek: days, durationWeeks: 4 }]
      if (type === "milestone_ladder") {
        // The measure is seeded blank on purpose: inventing "10 of nothing"
        // would be a number the user never chose. The row asks for it inline.
        const measure = g.measure ?? { unit: "", start: 0, target: 0, steps: 5 }
        return { ...g, type, measure, rampSteps: ramp, targetDate: g.targetDate ?? addDays(localTodayISO(), 365) }
      }
      if (type === "achievement") {
        // Binary: no measure, but it still needs a date to aim at.
        return { ...g, type, measure: null, rampSteps: ramp, targetDate: g.targetDate ?? addDays(localTodayISO(), 365) }
      }
      return { ...g, type, measure: null, rampSteps: ramp, targetDate: g.targetDate ?? null }
    })
  }, [editGoal])
  // The room row drives the goal's PRIMARY habit frequency (single-habit typed
  // goals; suggestion goals keep their extra drivers, edited in the card below).
  const roomGoalFreq = useCallback((goalId: string, delta: number) => {
    const g = goals?.find((x) => x.id === goalId)
    const hId = g?.habits[0]?.id
    if (hId) editHabitFreq(goalId, hId, delta)
  }, [goals, editHabitFreq])

  // v3 — Life Plan handlers: per-area plan edits + per-area goal creation.
  const onAreaPlan = useCallback((areaId: string, patch: Partial<VisionAreaPlan>) => {
    setAreaPlans((prev) => ({ ...prev, [areaId]: { ...(prev[areaId] ?? {}), ...patch } }))
  }, [])
  const onAddAreaGoal = useCallback((areaId: string, input: { title: string; type: VisionGoalType; why: string; daysPerWeek: number; measure: VisionMeasure | null; targetDate: string | null }) => {
    try {
      const existing = goals ?? []
      const draft = createAreaGoal({ areaId, ...input }, existing.map((g) => g.id))
      const next = [...existing, draft]
      setGoals(next)
      setGoalPhase("done")
      setPriorityIds((prev) => [...prev, draft.id])
      setAreaOrder((prev) => extendAreaOrder(prev, next))
      setDeselected((prev) => {
        if (!prev.has(draft.pillarId)) return prev
        const n = new Set(prev)
        n.delete(draft.pillarId)
        return n
      })
      setExpanded((prev) => new Set(prev).add(draft.id))
    } catch (e) {
      console.error("Area goal creation failed:", e)
    }
  }, [goals])

  /**
   * M1 — write an accepted goal list away, each row to its real home. Goals are
   * created in ONE pass so `createAreaGoal` sees every id already taken and
   * cannot collide; sub-goals are then wired to their parent with the existing
   * edge set (M9), which is cycle-safe by construction.
   *
   * Fail-closed: a row that `createAreaGoal` rejects is reported, not skipped
   * silently — a list that quietly drops three of its lines is worse than one
   * that says which three.
   */
  const onAcceptGoalList = useCallback((accepted: GoalListAccept) => {
    // Computed from the current `goals` in the event handler, then written with
    // plain setters — never inside another setter's updater. React re-invokes
    // updaters, so a setter nested in one runs twice and double-adds.
    const rejected: string[] = []
    let next = [...(goals ?? [])]
    const byRow = new Map<string, string>()
    for (const row of accepted.goals) {
      try {
        const draft = createAreaGoal({ areaId: row.areaId, ...row.reading }, next.map((g) => g.id))
        next = [...next, draft]
        byRow.set(row.rowId, draft.id)
      } catch (e) {
        rejected.push(`${row.reading.title}: ${e instanceof Error ? e.message : "could not be created"}`)
      }
    }
    // A sub-goal FEEDS its parent — the outward direction `feedsGoalIds`
    // already uses, so the project view is a pure read of existing state.
    for (const row of accepted.goals) {
      const childId = byRow.get(row.rowId)
      const parentId = row.parentRowId ? byRow.get(row.parentRowId) : undefined
      if (!childId || !parentId) continue
      try { next = addGoalEdge(next, childId, parentId) } catch { /* self/cycle/dupe — the edge set is the guard */ }
    }
    const newIds = [...byRow.values()]
    setGoals(next)
    setPriorityIds((p) => [...p, ...newIds.filter((id) => !p.includes(id))])
    setAreaOrder((p) => extendAreaOrder(p, next))
    setGoalPhase("done")

    for (const id of accepted.identities) {
      if (id.areaId) {
        setAreaPlans((prev) => {
          const cur = prev[id.areaId!] ?? {}
          const merged = [cur.identity?.trim(), id.text.trim()].filter(Boolean).join("\n")
          return { ...prev, [id.areaId!]: { ...cur, identity: merged } }
        })
      } else {
        setDrivingForce((prev) => ({ ...prev, identity: [...prev.identity, id.text] }))
      }
    }
    if (accepted.rules.length) setValueRules((prev) => [...prev, ...accepted.rules])
    if (accepted.horizonWants.length) {
      setRawWants((prev) => [
        ...prev,
        ...accepted.horizonWants.map((text, i) => ({
          id: `w-list-${prev.length + i}`, text, years: 5 as HorizonYears, circled: false,
        })),
      ])
    }
    if (accepted.monthlyRituals.length) {
      setRitual((prev) => {
        // The review screen only hands monthly rows over when a ritual exists
        // (canAddRituals); this guard keeps that contract enforceable here too.
        if (!prev) return prev
        const weekly = [...(prev.weekly ?? [])]
        accepted.monthlyRituals.forEach((m, i) => {
          weekly.push({ id: `wr-list-${weekly.length + i}`, title: m.title, areaId: m.areaId, weekday: 0, monthlyDay: 1 })
        })
        return { ...prev, weekly }
      })
    }
    if (rejected.length) console.error("Some list rows could not be created:", rejected)
    setListOpen(null)
    // His order: the goal is not finished until its why is written under it.
    setReasonsFor(newIds)
  }, [goals])

  // v8 — Goal Workshop handlers: circle→qualify creates a USER-authored goal
  // (works even before any AI suggestion exists — the user is the author).
  const onQualifyWorkshopGoal = useCallback((item: string, areaId: string, input: { title: string; type: VisionGoalType; why: string; daysPerWeek: number; measure: VisionMeasure | null; targetDate: string | null }) => {
    try {
      const existing = goals ?? []
      const draft = createAreaGoal({ areaId, ...input }, existing.map((g) => g.id))
      const next = [...existing, draft]
      setGoals(next)
      setGoalPhase("done")
      setPriorityIds((prev) => [...prev, draft.id])
      setAreaOrder((prev) => extendAreaOrder(prev, next))
      setDeselected((prev) => {
        if (!prev.has(draft.pillarId)) return prev
        const n = new Set(prev)
        n.delete(draft.pillarId)
        return n
      })
      setExpanded((prev) => new Set(prev).add(draft.id))
      setGoalInbox((prev) => prev.filter((t) => t !== item))
    } catch (e) {
      console.error("Goal workshop qualify failed:", e)
    }
  }, [goals])
  const onDismissWorkshopItem = useCallback((item: string) => {
    setGoalInbox((prev) => prev.filter((t) => t !== item))
  }, [])
  const onAddWorkshopWant = useCallback((text: string) => {
    setGoalInbox((prev) => (prev.includes(text) ? prev : [...prev, text]))
  }, [])

  // The board's area groups — intents bucketed per pillar, in drag order, plus
  // any area that exists only in the drafted goals (coach re-route) so every
  // goal's area is present, draggable and toggleable.
  const areaGroups = useMemo<AreaGroup[]>(() => {
    // Bailing on `!result` meant a user who pasted a list or typed goals into a
    // room saw "0 life areas in your plan" while holding a dozen goals: the
    // groups were derived from vision INTENTS, and only the prose path has any.
    // The `coachOnly` pass below already handles goals with no intent — it was
    // simply unreachable. Third instance of one gate: `result` is optional.
    if (!result && !(goals?.length)) return []
    const byPillar = new Map<string, VisionIntent[]>()
    for (const it of result?.intents ?? []) {
      const list = byPillar.get(it.pillarId)
      if (list) list.push(it)
      else byPillar.set(it.pillarId, [it])
    }
    const coachOnly = new Map<string, VisionGoalDraft[]>()
    for (const g of goals ?? []) {
      if (byPillar.has(g.pillarId)) continue
      const list = coachOnly.get(g.pillarId)
      if (list) list.push(g)
      else coachOnly.set(g.pillarId, [g])
    }
    const known = new Set([...byPillar.keys(), ...coachOnly.keys()])
    const order = [...(areaOrder.length ? areaOrder : known)]
    // Safety: an area not yet in areaOrder (e.g. a refine changed a goal's
    // pillar) still renders — appended last until the next drag persists it.
    for (const pid of known) if (!order.includes(pid)) order.push(pid)
    return order
      .filter((pid) => known.has(pid))
      .map((pid) => {
        const intents = byPillar.get(pid) ?? []
        const coachGoals = coachOnly.get(pid)
        const source = intents[0] ?? coachGoals![0]
        return {
          pillarId: pid,
          label: source.pillarLabel,
          color: source.pillarColor,
          tagline: PILLAR_TAGLINE.get(pid) ?? "",
          intents,
          ...(coachGoals ? { goalTitles: coachGoals.map((g) => g.title) } : {}),
        }
      })
  }, [result, areaOrder, goals])

  // M4 — deterministic re-balance on every priority/budget/selection change.
  const orderedGoals = useMemo(() => {
    if (!goals) return []
    const byId = new Map(goals.map((g) => [g.id, g]))
    return priorityIds.map((id) => byId.get(id)).filter((g): g is VisionGoalDraft => !!g)
  }, [goals, priorityIds])
  // Only goals of areas the user kept selected go into the plan/balancer.
  const activeGoals = useMemo(
    () => orderedGoals.filter((g) => !deselected.has(g.pillarId)),
    [orderedGoals, deselected],
  )
  const balanced = useMemo(
    () => (activeGoals.length ? balancePlan(activeGoals, { dailyBudget }) : null),
    [activeGoals, dailyBudget],
  )
  // Goal-level reorder only sees active goals — hidden ones keep their ids in
  // the list (appended) so priorityIds always exactly covers all goals.
  const reorderActiveGoals = useCallback((ids: string[]) => {
    setPriorityIds((prev) => {
      const shown = new Set(ids)
      return [...ids, ...prev.filter((id) => !shown.has(id))]
    })
  }, [])

  // M6 — everything the track view shows is derived, never stored.
  const track = useMemo(() => {
    if (!balanced || !progress) return null
    const rollups = activeGoals.map((g) => goalRollup(g, balanced, progress, today))
    const areas = areaRollups(activeGoals, rollups)
    const dueHabits = habitsDueOnDate(balanced, activeGoals, progress.startDate, today)
    const dueTasks = tasksDueByDate(balanced, progress.startDate, today, [])
    // PLM — today's RPM plan, the due weekly review (+ that week's numbers),
    // the latest review's ratings for the wheel, and the monthly report.
    const dayPlan = dayPlanFor(progress, today)
    const due = reviewDue(progress, today)
    const dueWeekRollups = due
      ? activeGoals.map((g) => {
          const r = goalRollupRange(g, balanced, progress, due.start, due.end)
          return { goal: g, done: r.done, expected: r.expected }
        })
      : []
    const duePrevRatings = due ? lastRatingsBefore(progress, due.start) : null
    // PLM OS M4 — areas with zero check-ins in the due week ("do something
    // each week to grow every area").
    const touched = due ? areasTouchedInWeek(activeGoals, progress, due.start, due.end) : null
    const dueUntouched = touched ? LIFE_MASTERY_AREAS.filter((a) => !touched.has(a.id)).map((a) => a.id) : []
    // M2 — "there's never a 10": areas rated ≥9 two reviews running.
    const rebaseline = LIFE_MASTERY_AREAS.filter((a) => rebaselineDue(progress, a.id)).map((a) => a.id)
    const reviews = progress.weeklyReviews ?? []
    const latestReview = reviews.length ? reviews[reviews.length - 1] : null
    // OS v2 — the week before the latest review, for ghost dots + deltas.
    const prevOfLatest = latestReview ? lastRatingsBefore(progress, latestReview.weekStart) : null
    // Stats tiles: driving-force chain, perfect mornings, this week's check-ins.
    const dfStreak = dayStreak(progress.visionReviews, today)
    const ritualStreak = ritualPerfectStreak(progress, ritual, today)
    const curWeek = weekIndexFor(progress.startDate, today)
    const curWin = weekWindow(progress.startDate, curWeek)
    const weekAgg = activeGoals.reduce(
      (acc, g) => {
        const r = goalRollupRange(g, balanced, progress, curWin.start, today)
        return { done: acc.done + r.done, expected: acc.expected + r.expected }
      },
      { done: 0, expected: 0 },
    )
    const avgSeries = wheelAvgSeries(progress)
    const months = monthOptions(progress.startDate, today)
    const years = [...new Set(months.map((m) => m.slice(0, 4)))]
    // Period is a month ("YYYY-MM") or a year in review ("YYYY").
    const period =
      reportMonth && (months.includes(reportMonth) || years.includes(reportMonth))
        ? reportMonth
        : months[months.length - 1]
    const report =
      period.length === 4
        ? yearReport(activeGoals, balanced, progress, ritual, period, today)
        : monthlyReport(activeGoals, balanced, progress, ritual, period, today)
    const verdicts = verdictsFor(progress, period)
    return {
      rollups: new Map(rollups.map((r) => [r.goalId, r])),
      areas,
      vision: visionPercent(areas),
      dueHabits,
      dueTasks,
      dayPlan,
      due,
      duePrevRatings,
      dueUntouched,
      rebaseline,
      dueWeekRollups,
      latestReview,
      prevOfLatest,
      dfStreak,
      ritualStreak,
      curWeek,
      weekAgg,
      avgSeries,
      pastReviews: reviews,
      months,
      years,
      month: period,
      report,
      verdicts,
    }
  }, [balanced, progress, activeGoals, today, ritual, reportMonth])

  // v23 — is there anything worth reading back? Mirrors the persistence gate:
  // if we bothered to save it, the Library can show it.
  const hasReadableContent =
    (!!goals && goals.length > 0) || !!committedAt || valuesList.length > 0 || !!drivingForce ||
    Object.values(yourTens).some((t) => (t ?? "").trim()) ||
    Object.keys(areaPlans).length > 0 || manifestoLines.length > 0 ||
    incantations.length > 0 || affirmations.length > 0 || valueRules.length > 0 ||
    (matchedText || text).trim().length > 0

  const busy = phase === "loading" || phase === "matching"
  const stale = result !== null && text.trim() !== matchedText

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      {/* Header bar — sandbox badge + mode tabs, pattern from NewGoalsLab */}
      <div className="sticky top-0 z-20 bg-zinc-950/80 backdrop-blur-sm border-b border-white/5">
        {/* v24 — this row was a single non-wrapping flex line. On a 390px phone
            it ran to 748px: "Rough day?" (the SOS front door the canon requires
            on screen one), the next-actions badge and Reset were all pushed off
            the right edge and unreachable, and the page scrolled sideways.
            Wraps now, and the spacing tightens below sm so it usually still
            fits one line. */}
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-2.5 sm:py-3 flex items-center gap-x-2 gap-y-1.5 flex-wrap">
          <span className="flex items-center gap-1.5 text-sm font-medium text-white">
            <Telescope className="size-4 text-violet-300" /> Life Mastery
          </span>
          {/* v20 — the Guide is always reachable: it exists FOR the person who
              has no plan yet, so gating it on goals hid it exactly when it was
              the thing they needed. Plan/Track/Library still gate on content. */}
          {(
            <div className="flex items-center gap-1 ml-1 sm:ml-4">
              {([["guide", "Guide"], ["create", "Plan"], ["track", "Track"], ["library", "Library"]] as const)
                // v23 — Library used to be gated on goals existing, which is the
                // same bug v22 fixed one pill to the left: someone who finished
                // Guide sessions 1-5 has a year debrief, a vision, a purpose, an
                // identity, a code of conduct and renamed areas, and could not
                // open the page that exists to read them back. It now opens
                // whenever there is anything to read.
                .filter(([m]) => m === "guide" || m === "create" || m === "library" || (goals && goals.length > 0))
                .filter(([m]) => m !== "library" || hasReadableContent)
                .filter(([m]) => m !== "track" || confirmed)
                .map(([m, label]) => (
                  <button
                    key={m}
                    onClick={() => setMode(m)}
                    className={`px-3 py-1 min-h-[44px] sm:min-h-0 inline-flex items-center rounded-full text-xs font-medium transition-all ${
                      mode === m
                        ? "bg-white/10 text-white"
                        : m === "guide"
                        // v22 — the Guide is the front door for anyone without a
                        // plan, so it has to LOOK like a destination.
                        ? "border border-violet-400/40 bg-violet-500/10 text-violet-100 hover:bg-violet-500/20"
                        : "text-zinc-500 hover:text-zinc-300"
                    }`}
                  >
                    {label}
                  </button>
                ))}
            </div>
          )}
          <span className="ml-auto flex items-center gap-x-2 sm:gap-x-3 gap-y-1.5 flex-wrap justify-end">
            {matchedText === EXAMPLE_VISION && (
              <span className="text-[10px] font-medium px-2 py-0.5 rounded-full border border-sky-400/30 bg-sky-500/10 text-sky-300" title="This is the worked example. Reset to start your own plan.">
                Example plan
              </span>
            )}
            <button
              onClick={() => setSosOpen(true)}
              className="text-xs font-medium px-2.5 py-1 min-h-[44px] sm:min-h-0 inline-flex items-center rounded-full border border-amber-400/40 bg-amber-500/10 text-amber-300 hover:bg-amber-500/20 transition-colors"
              title="Rough moment? 60-second protocols for urges, paralysis, anxiety, dark days. No setup needed."
            >
              Rough day?
            </button>
            {(goals || result) && <ActionsBadge actions={guided} onGo={(a) => goToAnchor(a.mode, a.anchor)} />}
            <span className="hidden sm:inline text-[10px] font-medium px-2 py-0.5 rounded-full border border-amber-400/30 bg-amber-500/10 text-amber-300" title="Nothing here reads or writes your real goals. Everything stays in this browser.">
              Sandbox
            </span>
            {(goals || result) && (
              resetArmed ? (
                <span className="flex items-center gap-2">
                  <button onClick={resetSandbox} className="text-xs font-medium text-red-300 hover:text-red-200 transition-colors">Really reset?</button>
                  <button onClick={() => setResetArmed(false)} className="text-xs text-zinc-500 hover:text-white transition-colors">Keep</button>
                </span>
              ) : (
                <button onClick={() => setResetArmed(true)} className="flex items-center gap-1.5 text-xs text-zinc-500 hover:text-white transition-colors min-h-[44px] sm:min-h-0" title="Clear the sandbox plan and start over">
                  <RotateCcw className="size-3.5" /> Reset
                </button>
              )
            )}
          </span>
        </div>
      </div>

      {/* v17 — repairs the load layer made are REPORTED, never swallowed. A
          plan that quietly lost a goal link is exactly the silent failure the
          no-fallback rule exists to prevent. */}
      {loadRepairs.length > 0 && (
        <div className="max-w-6xl mx-auto px-6 pt-3">
          <div className="rounded-xl border border-amber-400/30 bg-amber-500/[0.08] px-4 py-2.5 flex items-start gap-3">
            <div className="min-w-0 text-[11px] text-amber-100/90">
              <p className="font-medium">We repaired your saved plan while loading it.</p>
              <ul className="mt-0.5 space-y-0.5 text-amber-100/70">
                {loadRepairs.map((r, i) => (
                  <li key={i}>
                    · {r.kind === "dangling-edge"
                      ? `A link from one goal pointed at a goal that no longer exists. Removed.`
                      : r.kind === "cycle-broken"
                      ? `Two goals fed each other in a loop. The later link was removed.`
                      : `A weekly practice had lost its ease-in schedule. Rebuilt from its habits.`}
                  </li>
                ))}
              </ul>
            </div>
            <button onClick={() => setLoadRepairs([])} aria-label="Dismiss" className="ml-auto text-amber-200/60 hover:text-amber-100 shrink-0"><X className="size-3.5" /></button>
          </div>
        </div>
      )}
      {sosOpen && (
        <SosPanel
          onClose={() => setSosOpen(false)}
          counters={counters}
          onCounters={setCounters}
          letters={letters}
          onLetters={setLetters}
          onAddIncantation={(card) => setIncantations((p) => (p.includes(card) ? p : [...p, card]))}
          onLogBelief={(old, replacement) =>
            setBeliefs((prev) =>
              prev.some((b) => b.old.trim().toLowerCase() === old.trim().toLowerCase())
                ? prev
                : [...prev, { id: `bl-${prev.length}-${Date.now()}`, old, replacement, startedAt: today }],
            )
          }
          today={today}
        />
      )}
      {mode === "guide" ? (
        <GuideView
          // v23 — completion is what the PLAN proves, not what was clicked.
          done={guideDoneSet(guideDone, {
            vision: matchedText || text,
            yearDebrief,
            drivingForce,
            areaPlans,
            yourTens,
            rawWants,
            goals,
            ritual,
            committedAt,
          })}
          openId={openSession}
          onOpen={setOpenSession}
          onComplete={(id) => setGuideDone((p) => (p.includes(id) ? p : [...p, id]))}
          onSkipTo={setOpenSession}
          visionText={text}
          onVisionText={setText}
          debrief={yearDebrief}
          onDebrief={setYearDebrief}
          drivingForce={drivingForce}
          onDrivingForce={setDrivingForce}
          areaPlans={areaPlans}
          onAreaPlan={onAreaPlan}
          beliefs={beliefs}
          onBeliefs={setBeliefs}
          rawWants={rawWants}
          onRawWants={setRawWants}
          goalInbox={goalInbox}
          onSendToWorkshop={(texts) => setGoalInbox((prev) => [...prev, ...texts.filter((t) => !prev.includes(t))])}
          onReadVision={(t) => { setMode("create"); setPage("going"); setProseOpen(true); void run(t) }}
          visionReadBusy={phase === "loading" || phase === "matching"}
          rooms={wheelRooms}
          yourTens={yourTens}
          ratings={baselineRatings}
          onOpenRoom={(areaId) => { setMode("create"); setPage("areas"); openRoom(areaId) }}
          evidence={{ vision: visionDisplayText || text, yearDebrief, drivingForce, areaPlans, rawWants, goals: goals ?? [], ritual, committedAt }}
          today={today}
          onGoStage={(p, anchor) => {
            setMode("create")
            setPage(p)
            if (anchor) requestAnimationFrame(() => document.getElementById(anchor)?.scrollIntoView({ behavior: "smooth", block: "start" }))
          }}
        />
      ) : mode === "library" ? (
        <LibraryView
          page={libraryPage}
          onPage={setLibraryPage}
          state={{ areaPlans, values: valuesList, affirmations, incantations, valueRules }}
          goals={goals ?? []}
          yourTens={yourTens}
          awayValues={awayValues}
          drivingForce={drivingForce}
          manifestoName={manifestoName}
          manifestoLines={manifestoLines}
          committedAt={committedAt}
          visionText={visionDisplayText || text}
          onGoEdit={(p) => { setMode("create"); setPage(p) }}
          areasPage={
            <LifePlanView
              goals={goals ?? []}
              areaPlans={areaPlans}
              yourTens={yourTens}
              progress={progress}
              focusAreaIds={focusAreaIds}
              onEditSeason={() => { setMode("create"); setPage("areas"); requestAnimationFrame(() => document.getElementById("lm-season-priority")?.scrollIntoView({ behavior: "smooth", block: "center" })) }}
              onAreaPlan={onAreaPlan}
              onYourTen={(areaId, text) => setYourTens((p) => ({ ...p, [areaId]: text }))}
              onAddGoal={onAddAreaGoal}
            />
          }
        />
      ) : mode === "track" ? (
        <div className="max-w-4xl mx-auto px-6 py-10 pb-24">
          {!track || !progress ? (
            <div className="text-center py-20 border border-white/10 rounded-2xl bg-white/[0.03]">
              <p className="text-zinc-400 text-sm">No confirmed plan to track yet.</p>
              <button onClick={() => setMode("create")} className="mt-4 text-xs text-zinc-500 hover:text-white transition-colors">← Back to the plan</button>
            </div>
          ) : (
            <>
              {/* v24 — when the weekly review is DUE, say so at the top.
                  The form renders about 40% down the page, below the driving
                  force card, the four stat tiles, the morning ritual and the
                  day plan — so the one ritual that turns tracking into
                  learning was reached only by scrolling past everything else,
                  or by noticing it inside the actions badge. */}
              {track.due && (
                <button
                  onClick={() => document.getElementById("lm-weekly")?.scrollIntoView({ behavior: "smooth", block: "start" })}
                  className="w-full mb-6 rounded-xl border border-violet-400/35 bg-violet-500/[0.10] px-4 py-3 text-left hover:bg-violet-500/[0.16] transition-colors"
                >
                  <span className="flex items-center gap-2 flex-wrap">
                    <CalendarCheck className="size-4 text-violet-300 shrink-0" />
                    <span className="text-sm font-medium text-violet-100">Your week {track.due.weekIndex} review is ready</span>
                    <span className="text-[11px] text-zinc-400">{track.due.start} → {track.due.end}</span>
                    <span className="ml-auto text-[11px] text-violet-200/90 shrink-0">Start it →</span>
                  </span>
                  <span className="block text-[11px] text-zinc-400 mt-1">
                    Rate where you are, name the lesson, and pick next week&apos;s outcomes. About 20 minutes.
                  </span>
                </button>
              )}

              {/* PLM OS M1 — the Driving Force, read daily: values → vision →
                  purpose → identity ("the four things are the driving force") */}
              <div id="lm-driving-card" className="rounded-2xl border border-violet-400/20 bg-gradient-to-br from-violet-500/[0.12] via-white/[0.04] to-transparent px-6 py-5 mb-6 scroll-mt-20">
                <div className="flex items-center gap-2 mb-3">
                  <Sparkles className="size-3.5 text-violet-300" />
                  <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-violet-200/90">Your driving force, read it every morning</span>
                  <span className="h-px flex-1 bg-gradient-to-r from-violet-400/30 to-transparent" />
                  <CopyButton
                    label="Copy"
                    getText={() =>
                      [
                        valuesList.length ? `MY VALUES (in order): ${valuesList.join(", ")}` : "",
                        `MY VISION: ${visionDisplayText}`,
                        drivingForce?.mission ? `MY MISSION: ${drivingForce.mission}` : "",
                        drivingForce?.purpose ? `MY PURPOSE: ${drivingForce.purpose}` : "",
                        (drivingForce?.conduct ?? []).length ? `MY CODE OF CONDUCT: ${(drivingForce?.conduct ?? []).join(" · ")}` : "",
                        drivingForce?.identity.length ? `WHO I AM: ${drivingForce.identity.join(" · ")}` : "",
                        drivingForce?.primaryQuestion ? `MY QUESTION: ${drivingForce.primaryQuestion}` : "",
                        valueRules.length ? `MY RULES:\n${valueRules.map((r) => `- ${r}`).join("\n")}` : "",
                      ].filter(Boolean).join("\n")
                    }
                  />
                </div>
                {valuesList.length > 0 && (
                  <div className="flex items-center gap-1.5 flex-wrap mb-2.5">
                    {valuesList.slice(0, 7).map((v, i) => (
                      <span key={v} className="text-[10px] px-2 py-0.5 rounded-full border border-amber-400/25 bg-amber-500/[0.08] text-amber-200/90 tabular-nums">
                        {i + 1}. {v}
                      </span>
                    ))}
                  </div>
                )}
                <p className="text-base sm:text-lg font-medium leading-relaxed text-white whitespace-pre-wrap">
                  {matchedText ? (result ? renderHighlighted(matchedText, result.intents) : matchedText) : visionDisplayText}
                </p>
                {drivingForce?.mission && (
                  <p className="text-sm font-medium italic text-violet-100 mt-2.5 leading-relaxed">{drivingForce.mission}</p>
                )}
                {drivingForce?.purpose && (
                  <p className="text-sm italic text-violet-200/90 mt-2.5 leading-relaxed">
                    &ldquo;{drivingForce.purpose}&rdquo;
                    {drivingForce.reasons.length > 0 && (
                      <span className="not-italic text-[11px] text-zinc-500"> — for {drivingForce.reasons.join(", ")}</span>
                    )}
                  </p>
                )}
                {drivingForce && drivingForce.identity.length > 0 && (
                  <p className="text-xs text-zinc-400 mt-2">
                    {drivingForce.identity.slice(0, 3).join(" · ")}
                    {drivingForce.identity.length > 3 && <span className="text-zinc-600"> · +{drivingForce.identity.length - 3} more</span>}
                  </p>
                )}
                {drivingForce && (drivingForce.conduct ?? []).length > 0 && (
                  <p className="text-[11px] text-zinc-500 mt-1">
                    <span className="text-[9px] uppercase tracking-wide text-zinc-600 mr-1.5">Code of conduct</span>
                    {(drivingForce.conduct ?? []).slice(0, 4).join(" · ")}
                    {(drivingForce.conduct ?? []).length > 4 && <span className="text-zinc-600"> · +{(drivingForce.conduct ?? []).length - 4}</span>}
                  </p>
                )}
                {drivingForce?.primaryQuestion && (
                  <p className="text-[11px] text-violet-200/80 mt-1">
                    <span className="text-[9px] uppercase tracking-wide text-zinc-600 mr-1.5">My question today</span>
                    {drivingForce.primaryQuestion}
                  </p>
                )}
                {valueRules.length > 0 && (
                  <p className="text-[11px] text-zinc-500 mt-1">
                    <span className="text-[9px] uppercase tracking-wide text-zinc-600 mr-1.5">My rules</span>
                    {valueRules[0]}{valueRules.length > 1 && <span className="text-zinc-600"> · +{valueRules.length - 1} more — one value a day, out loud</span>}
                  </p>
                )}
                <button
                  onClick={onToggleVisionReviewed}
                  aria-pressed={visionReviewedOn(progress, today)}
                  className={`mt-4 flex items-center gap-2.5 rounded-lg border px-3 py-2 text-left transition-all ${visionReviewedOn(progress, today) ? "border-violet-400/40 bg-violet-500/15" : "border-white/10 bg-white/[0.03] hover:bg-white/[0.06]"}`}
                >
                  <span className={`size-5 rounded-md border flex items-center justify-center shrink-0 transition-colors ${visionReviewedOn(progress, today) ? "bg-violet-400/80 border-violet-300" : "border-white/25"}`}>
                    {visionReviewedOn(progress, today) && <Check className="size-3.5 text-zinc-950" />}
                  </span>
                  <span className={`text-sm ${visionReviewedOn(progress, today) ? "text-violet-200" : "text-zinc-200"}`}>
                    I&apos;ve connected to my driving force today
                  </span>
                </button>
              </div>

              {/* OS v2 — the numbers row: chains + this week at a glance */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
                <div className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3">
                  <p className="text-2xl font-bold text-white tabular-nums">{track.dfStreak}<span className="text-sm text-zinc-500 font-normal"> d</span></p>
                  <p className="text-[10px] uppercase tracking-wide text-zinc-500 mt-0.5">Driving-force chain</p>
                </div>
                <div className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3">
                  <p className="text-2xl font-bold text-white tabular-nums">{track.ritualStreak}<span className="text-sm text-zinc-500 font-normal"> d</span></p>
                  <p className="text-[10px] uppercase tracking-wide text-zinc-500 mt-0.5">Perfect mornings</p>
                </div>
                <div className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3">
                  <p className="text-2xl font-bold text-white tabular-nums">
                    {track.weekAgg.done}<span className="text-sm text-zinc-500 font-normal">/{track.weekAgg.expected}</span>
                  </p>
                  <p className="text-[10px] uppercase tracking-wide text-zinc-500 mt-0.5">Week {track.curWeek} check-ins so far</p>
                </div>
                <div className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3">
                  <p className="text-2xl font-bold text-white tabular-nums">
                    {track.avgSeries.length ? track.avgSeries[track.avgSeries.length - 1].avg : "–"}
                    {track.avgSeries.length > 1 && (() => {
                      const d = Math.round((track.avgSeries[track.avgSeries.length - 1].avg - track.avgSeries[track.avgSeries.length - 2].avg) * 10) / 10
                      return d !== 0 ? <span className={`text-sm font-normal ${d > 0 ? "text-emerald-300" : "text-amber-300"}`}> {d > 0 ? `+${d}` : d}</span> : null
                    })()}
                  </p>
                  <p className="text-[10px] uppercase tracking-wide text-zinc-500 mt-0.5">Wheel average</p>
                </div>
              </div>

              {/* PLM M3 — the ordered morning ritual as today's first checklist */}
              {ritual && (
                <div className="mb-8">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-violet-200/90">Morning ritual</span>
                    <CopyButton label="Copy" getText={() => `MY MORNING RITUAL\n${ritual.items.map((i, n) => `${n + 1}. ${i.title} (${i.minutes}m)`).join("\n")}`} />
                    <span className="text-[10px] text-zinc-600 tabular-nums">
                      {ritual.items.filter((i) => ritualStepDoneOn(progress, today, i.id)).length}/{ritual.items.length} · ~{ritualMinutes(ritual)} min
                    </span>
                    {/* v10 — 30-day install challenge + rotation nudge */}
                    {(() => {
                      const day = installDay(ritual, today)
                      if (day !== null && day < 30) return <span className="text-[10px] px-2 py-0.5 rounded-full border border-violet-400/30 text-violet-200 tabular-nums" title="The install rule: 30 days without negotiation, then it runs itself">install day {day}/30</span>
                      if (rotationDue(ritual, today)) return (
                        <button onClick={onRitualRotate} className="text-[10px] px-2 py-0.5 rounded-full border border-amber-400/40 text-amber-300 hover:bg-amber-500/10 transition-colors" title="~30 days in. The library is a menu you pick from. Swap a step in the Plan view, then restart the install count.">
                          30+ days, rotate something
                        </button>
                      )
                      return null
                    })()}
                    <span className="h-px flex-1 bg-gradient-to-r from-violet-400/30 to-transparent" />
                  </div>
                  <ol className="space-y-1.5">
                    {ritual.items.map((item, i) => {
                      const done = ritualStepDoneOn(progress, today, item.id)
                      return (
                        <li key={item.id}>
                          <button
                            onClick={() => onRitualStepDone(item.id)}
                            className={`w-full flex items-center gap-3 rounded-lg border px-3 py-2 text-left transition-all ${done ? "border-violet-400/30 bg-violet-500/10" : "border-white/10 bg-white/[0.03] hover:bg-white/[0.06]"}`}
                          >
                            <span className="text-[10px] font-bold size-5 rounded-full flex items-center justify-center shrink-0 tabular-nums bg-violet-500/20 text-violet-300">
                              {i + 1}
                            </span>
                            <span className={`size-5 rounded-md border flex items-center justify-center shrink-0 transition-colors ${done ? "bg-violet-400/80 border-violet-300" : "border-white/25"}`}>
                              {done && <Check className="size-3.5 text-zinc-950" />}
                            </span>
                            <span className={`text-sm ${done ? "text-zinc-400 line-through" : "text-zinc-100"}`}>{item.title}</span>
                            <span className="ml-auto text-[11px] text-zinc-500 tabular-nums shrink-0">{item.minutes}m</span>
                          </button>
                        </li>
                      )
                    })}
                  </ol>
                  {ritual.items.some((i) => i.id === "rit-questions") && <EmpoweringQuestions />}
                  {ritual.items.some((i) => i.id === "rit-incantations") && (
                    <IncantationDeck
                      mission={drivingForce?.mission}
                      own={incantations}
                      onAdd={(card) => setIncantations((p) => (p.includes(card) ? p : [...p, card]))}
                      onRemove={(card) => setIncantations((p) => p.filter((x) => x !== card))}
                    />
                  )}
                  {/* v10 — the ritual matrix: today's weekly per-area rituals */}
                  {dueWeeklyRituals(ritual, today).length > 0 && (
                    <div className="mt-3">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-violet-200/70 mb-1.5">Today&apos;s weekly ritual{dueWeeklyRituals(ritual, today).length === 1 ? "" : "s"}</p>
                      <ul className="space-y-1.5">
                        {dueWeeklyRituals(ritual, today).map((w) => {
                          const done = ritualStepDoneOn(progress, today, w.id)
                          const area = w.areaId ? LIFE_MASTERY_AREA_MAP.get(w.areaId) : null
                          return (
                            <li key={w.id}>
                              <button
                                onClick={() => onRitualStepDone(w.id)}
                                className={`w-full flex items-center gap-3 rounded-lg border px-3 py-2 text-left transition-all ${done ? "border-violet-400/30 bg-violet-500/10" : "border-white/10 bg-white/[0.03] hover:bg-white/[0.06]"}`}
                              >
                                <span className={`size-5 rounded-md border flex items-center justify-center shrink-0 transition-colors ${done ? "bg-violet-400/80 border-violet-300" : "border-white/25"}`}>
                                  {done && <Check className="size-3.5 text-zinc-950" />}
                                </span>
                                <span className={`text-sm min-w-0 ${done ? "text-zinc-400 line-through" : "text-zinc-100"}`}>{w.title}</span>
                                {area && <span className="ml-auto text-[10px] shrink-0" style={{ color: areaTextColor(area) }}>{area.label}</span>}
                              </button>
                              {w.id === "writ-money" && <MoneySystemCard />}
                              {w.id === "writ-relationship" && <JournalScriptCard />}
                            </li>
                          )
                        })}
                      </ul>
                    </div>
                  )}
                </div>
              )}

              {/* Today (PLM M4 — RPM): star ≤5 musts, the rest is the could-do list */}
              <div className="mb-8">
                <div className="flex items-center gap-2 mb-3">
                  <Check className="size-3.5 text-emerald-300" />
                  <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-emerald-200/90">Today</span>
                  <span className="text-[10px] text-zinc-600">{today}</span>
                  <span className="h-px flex-1 bg-gradient-to-r from-emerald-400/30 to-transparent" />
                </div>
                <PrincipleCardView id="rpm" />
                {(() => {
                  const mustSet = new Set(track.dayPlan.mustIds)
                  const mustFull = track.dayPlan.mustIds.length >= MAX_MUST_ITEMS

                  const habitRow = (h: BalancedHabit) => {
                    const done = (progress.completions[h.habitId] ?? []).includes(today)
                    // M11 — named training day for routine habits ("Push", "Chest Day A")
                    const ownerGoal = orderedGoals.find((g) => g.id === h.goalId)
                    const routineDay = routineDayForDate(
                      h,
                      ownerGoal?.habits.find((x) => x.id === h.habitId)?.routine ?? null,
                      progress.startDate,
                      today,
                      ownerGoal?.rampSteps ?? null,
                    )
                    return (
                      <li key={h.habitId} className="flex items-center gap-2">
                        <button
                          onClick={() => { toggleHabitToday(h.habitId); if (!done) flashCelebrate(h.habitId) }}
                          className={`flex-1 min-w-0 flex items-center gap-3 rounded-lg border px-3 py-2 text-left transition-all ${done ? "border-emerald-500/30 bg-emerald-500/10" : "border-white/10 bg-white/[0.03] hover:bg-white/[0.06]"}`}
                        >
                          <span className={`size-5 rounded-md border flex items-center justify-center shrink-0 transition-colors ${done ? "bg-emerald-500/80 border-emerald-400" : "border-white/25"}`}>
                            {done && <Check className="size-3.5 text-zinc-950" />}
                          </span>
                          <span className={`text-sm min-w-0 truncate ${done ? "text-zinc-400 line-through" : "text-zinc-100"}`}>
                            {h.title}
                            {routineDay && <span className="font-semibold" style={{ color: pillarTextColor(h.pillarColor) }}> — {routineDay.name}</span>}
                          </span>
                          <span className="ml-auto size-1.5 rounded-full shrink-0" style={{ backgroundColor: h.pillarColor }} />
                        </button>
                        <MustToggle starred={mustSet.has(h.habitId)} disabled={mustFull} onToggle={() => onToggleMust(h.habitId)} label={h.title} />
                        {justDone === h.habitId && <span className="text-[10px] text-emerald-300 shrink-0 animate-pulse">smile. &ldquo;good job&rdquo;, out loud</span>}
                      </li>
                    )
                  }

                  const taskRow = (t: BalancedTask) => {
                    const done = progress.tasksDone.includes(t.taskId)
                    return (
                      <li key={t.taskId} className="flex items-center gap-2">
                        <button
                          onClick={() => { toggleTaskDone(t.taskId); if (!done) flashCelebrate(t.taskId) }}
                          className={`flex-1 min-w-0 flex items-center gap-3 rounded-lg border px-3 py-2 text-left transition-all ${done ? "border-emerald-500/30 bg-emerald-500/10" : "border-white/10 bg-white/[0.03] hover:bg-white/[0.06]"}`}
                        >
                          <span className={`size-5 rounded-full border flex items-center justify-center shrink-0 transition-colors ${done ? "bg-emerald-500/80 border-emerald-400" : "border-white/25"}`}>
                            {done && <Check className="size-3.5 text-zinc-950" />}
                          </span>
                          <span className={`text-sm min-w-0 truncate ${done ? "text-zinc-400 line-through" : "text-zinc-100"}`}>{t.title}</span>
                          <span className="ml-auto text-[10px] text-zinc-500 shrink-0">one-time</span>
                        </button>
                        <MustToggle starred={mustSet.has(t.taskId)} disabled={mustFull} onToggle={() => onToggleMust(t.taskId)} label={t.title} />
                        {justDone === t.taskId && <span className="text-[10px] text-emerald-300 shrink-0 animate-pulse">smile. &ldquo;good job&rdquo;, out loud</span>}
                      </li>
                    )
                  }

                  const adhocRow = (a: VisionAdhocItem) => {
                    const origin = adhocOriginDate(a.id)
                    return (
                      <li key={a.id} className="flex items-center gap-2">
                        <button
                          onClick={() => { onToggleAdhoc(a.id); if (!a.done) flashCelebrate(a.id) }}
                          className={`flex-1 min-w-0 flex items-center gap-3 rounded-lg border px-3 py-2 text-left transition-all ${a.done ? "border-emerald-500/30 bg-emerald-500/10" : "border-white/10 bg-white/[0.03] hover:bg-white/[0.06]"}`}
                        >
                          <span className={`size-5 rounded-md border border-dashed flex items-center justify-center shrink-0 transition-colors ${a.done ? "bg-emerald-500/80 border-emerald-400" : "border-white/25"}`}>
                            {a.done && <Check className="size-3.5 text-zinc-950" />}
                          </span>
                          <span className={`text-sm min-w-0 truncate ${a.done ? "text-zinc-400 line-through" : "text-zinc-100"}`}>{a.title}</span>
                          {origin && origin !== today && (
                            <span className="ml-auto text-[9px] text-zinc-500 italic shrink-0">from {origin === addDays(today, -1) ? "yesterday" : origin}</span>
                          )}
                        </button>
                        <MustToggle starred={mustSet.has(a.id)} disabled={mustFull} onToggle={() => onToggleMust(a.id)} label={a.title} />
                        {!a.done && (
                          <button
                            onClick={() => onDelegateAdhoc(a.id)}
                            title={`The delegation pass: "who says I have to do this?" Route it — a VA, Fiverr, a friend — and take it off your plate.`}
                            aria-label={`Delegate ${a.title} — off the plate`}
                            className="text-[9px] px-1.5 py-0.5 rounded-full border border-sky-400/30 text-sky-300/80 hover:bg-sky-500/10 shrink-0 transition-colors"
                          >
                            who says?
                          </button>
                        )}
                        {justDone === a.id && <span className="text-[10px] text-emerald-300 shrink-0 animate-pulse">smile. &ldquo;good job&rdquo;, out loud</span>}
                      </li>
                    )
                  }

                  const mustHabits = track.dueHabits.filter((h) => mustSet.has(h.habitId))
                  const mustTasks = track.dueTasks.filter((t) => mustSet.has(t.taskId))
                  const mustAdhoc = track.dayPlan.adhoc.filter((a) => mustSet.has(a.id))
                  const empty = track.dueHabits.length === 0 && track.dueTasks.length === 0 && track.dayPlan.adhoc.length === 0

                  // v9 — RPM anatomy: today's items grouped into BLOCKS BY LIFE
                  // AREA, each with its Result line + a fresh reason written
                  // TODAY (re-deriving the why daily is the conditioning).
                  const goalById = new Map(orderedGoals.map((g) => [g.id, g]))
                  type RpmBlock = { pillarId: string; label: string; color: string; goalTitles: string[]; habits: BalancedHabit[]; tasks: BalancedTask[] }
                  const blockMap = new Map<string, RpmBlock>()
                  const blockFor = (goalId: string): RpmBlock => {
                    const g = goalById.get(goalId)
                    const pid = g?.pillarId ?? "other"
                    let b = blockMap.get(pid)
                    if (!b) {
                      b = { pillarId: pid, label: g?.pillarLabel ?? "Other", color: g?.pillarColor ?? "#71717a", goalTitles: [], habits: [], tasks: [] }
                      blockMap.set(pid, b)
                    }
                    if (g && !b.goalTitles.includes(g.title)) b.goalTitles.push(g.title)
                    return b
                  }
                  for (const h of track.dueHabits) blockFor(h.goalId).habits.push(h)
                  for (const t of track.dueTasks) blockFor(t.goalId).tasks.push(t)
                  const blocks = [...blockMap.values()]
                  const mustsFirst = <T,>(items: T[], id: (x: T) => string): T[] =>
                    [...items].sort((a, b) => Number(mustSet.has(id(b))) - Number(mustSet.has(id(a))))
                  const doneToday =
                    track.dueHabits.filter((h) => (progress.completions[h.habitId] ?? []).includes(today)).length +
                    track.dueTasks.filter((t) => progress.tasksDone.includes(t.taskId)).length +
                    track.dayPlan.adhoc.filter((a) => a.done).length

                  return (
                    <>
                      {track.dayPlan.mustIds.length > 0 && (
                        <>
                          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-amber-300/90 mb-1.5">
                            Must today · {track.dayPlan.mustIds.length}/{MAX_MUST_ITEMS} — starred inside their blocks
                          </p>
                          {(() => {
                            const oneThing =
                              mustHabits.find((h) => !(progress.completions[h.habitId] ?? []).includes(today))?.title ??
                              mustTasks.find((t) => !progress.tasksDone.includes(t.taskId))?.title ??
                              mustAdhoc.find((a) => !a.done)?.title
                            return oneThing ? <OneThingTimer title={oneThing} /> : null
                          })()}
                        </>
                      )}
                      {empty ? (
                        <p className="text-sm text-zinc-500">Nothing scheduled today. Rest is part of the plan.</p>
                      ) : (
                        blocks.map((b) => (
                          <div key={b.pillarId} className="mb-3 rounded-xl border border-white/10 bg-white/[0.02] p-3">
                            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                              <span className="size-2 rounded-full shrink-0" style={{ backgroundColor: b.color }} />
                              <span className="text-[10px] font-semibold uppercase tracking-[0.14em]" style={{ color: pillarTextColor(b.color) }}>{b.label}</span>
                              <span className="text-[10px] text-zinc-600 min-w-0 truncate">Result: progress toward {b.goalTitles.map((x) => `“${x}”`).join(" · ")}</span>
                            </div>
                            <textarea
                              value={track.dayPlan.blockReasons?.[b.pillarId] ?? ""}
                              onChange={(e) => onSetBlockReason(b.pillarId, e.target.value)}
                              rows={2}
                              aria-label={`Fresh reasons for the ${b.label} block`}
                              placeholder={"3 fresh reasons this block matters TODAY. One per line. Yesterday's reasons don't carry."}
                              className="mb-2 w-full bg-white/5 border border-white/10 rounded-lg px-2.5 py-1.5 text-[11px] text-zinc-300 placeholder:text-zinc-600 focus:outline-none focus:border-white/20 transition-colors resize-none"
                            />
                            <ul className="space-y-1.5">
                              {mustsFirst(b.habits, (h) => h.habitId).map(habitRow)}
                              {mustsFirst(b.tasks, (t) => t.taskId).map(taskRow)}
                            </ul>
                          </div>
                        ))
                      )}
                      {/* The add-on block — RPM keeps one block that's pure heart, not output */}
                      <div className="mb-1 rounded-xl border border-white/10 bg-white/[0.02] p-3">
                        <div className="flex items-center gap-2 mb-1.5">
                          <span className="size-2 rounded-full shrink-0 bg-zinc-500" />
                          <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-400">Add-ons, keep one for the heart</span>
                          <span className="text-[10px] text-zinc-600">connection or joy</span>
                        </div>
                        {track.dayPlan.adhoc.length > 0 && (
                          <>
                            <ul className="space-y-1.5">
                              {mustsFirst(track.dayPlan.adhoc, (a) => a.id).map(adhocRow)}
                            </ul>
                            <p className="text-[10px] text-zinc-600 mt-1.5">
                              The delegation pass. After the musts are starred, ask of each could-do: &ldquo;who says I have to do this?&rdquo; A VA, Fiverr, a friend. Delegated means off your plate entirely.
                            </p>
                          </>
                        )}
                        <AddAdhocRow onAdd={onAddAdhoc} />
                      </div>
                      {track.dayPlan.mustIds.length === 0 && !empty && (
                        <p className="text-[10px] text-zinc-600 mt-2">Tip: star 3-5 &ldquo;must&rdquo; items and do them FIRST. Willpower is highest in the morning; win those and the day is a win.</p>
                      )}
                      {/* Celebration doctrine: every completed process goal gets acknowledged */}
                      {doneToday > 0 && (
                        <p className="mt-2 text-[10px] text-emerald-200/80">
                          {doneToday} done today — celebrate each one as it lands: smile, pat on the back, out loud &ldquo;good job.&rdquo; What gets rewarded gets repeated.
                        </p>
                      )}
                      {track.dueHabits.length > 0 &&
                        track.dueHabits.every((h) => (progress.completions[h.habitId] ?? []).includes(today)) &&
                        track.dueTasks.every((t) => progress.tasksDone.includes(t.taskId)) && (
                          <p className="mt-3 rounded-lg border border-emerald-400/25 bg-emerald-500/[0.08] px-3 py-2 text-xs text-emerald-200">
                            Everything scheduled today is done. Celebrate it, out loud. What gets rewarded gets repeated.
                          </p>
                        )}
                    </>
                  )
                })()}

                {/* PLM OS M5 — evening reflection (Five Minute Journal PM) */}
                <div className="mt-6 rounded-xl border border-white/10 bg-white/[0.03] p-4">
                  <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-500">Evening reflection</span>
                  <PrincipleCardView id="evening" />
                  {/* v8 — the RPM end-of-day test, asked in his words: outcomes, not effort */}
                  {track.dayPlan.mustIds.length > 0 && (() => {
                    const doneCount = track.dayPlan.mustIds.filter((id) =>
                      (progress.completions[id] ?? []).includes(today) ||
                      progress.tasksDone.includes(id) ||
                      track.dayPlan.adhoc.some((a) => a.id === id && a.done),
                    ).length
                    const total = track.dayPlan.mustIds.length
                    return (
                      <div className="mt-2 rounded-lg border border-white/10 bg-white/[0.02] px-3 py-2">
                        <p className="text-[11px] text-zinc-300">
                          The RPM test <span className="text-white">did you achieve your outcomes?</span>{" "}
                          <span className={`tabular-nums ${doneCount === total ? "text-emerald-300" : "text-amber-300"}`}>{doneCount}/{total}</span> musts done.
                        </p>
                        {doneCount > 0 && (
                          <p className="text-[10px] text-emerald-200/80 mt-1">
                            Celebrate each one before you sleep. Smile, hand on chest, out loud: &ldquo;good job.&rdquo; Whatever gets rewarded gets repeated.
                          </p>
                        )}
                      </div>
                    )
                  })()}
                  <div className="grid gap-2 sm:grid-cols-2 mt-2">
                    <label className="block">
                      <span className="text-[10px] text-zinc-500">Amazing things that happened today</span>
                      <textarea
                        value={eveningReflectionFor(progress, today).amazing}
                        onChange={(e) => onEveningReflection({ amazing: e.target.value })}
                        rows={2}
                        placeholder="Three counts. One counts too."
                        className="mt-1 w-full bg-white/5 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-white/20 transition-colors resize-none"
                      />
                    </label>
                    <label className="block">
                      <span className="text-[10px] text-zinc-500">How could today have been better?</span>
                      <textarea
                        value={eveningReflectionFor(progress, today).better}
                        onChange={(e) => onEveningReflection({ better: e.target.value })}
                        rows={2}
                        placeholder="No blame, just the adjustment."
                        className="mt-1 w-full bg-white/5 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-white/20 transition-colors resize-none"
                      />
                    </label>
                  </div>
                  {/* v11 — the NIGHTLY magic-moment jar: one line, every evening */}
                  <label className="block mt-2">
                    <span className="text-[10px] text-zinc-500">Tonight&apos;s magic moment. One line for the jar</span>
                    <input
                      value={eveningReflectionFor(progress, today).magicMoment ?? ""}
                      onChange={(e) => onEveningReflection({ magicMoment: e.target.value })}
                      placeholder="The moment worth keeping. The jar gets opened at the year review."
                      className="mt-1 w-full bg-white/5 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-white/20 transition-colors"
                    />
                  </label>
                  {/* Productivity Planner close: score the day 1-10 */}
                  {/* v24 — this row was one non-wrapping line: label (shrink-0)
                      + slider + readout ran 60px past a 390px phone. */}
                  <div className="flex items-center gap-x-3 gap-y-1 mt-2.5 flex-wrap">
                    <span className="text-[10px] text-zinc-500">Score today 1-10. How productive did it feel?</span>
                    {/* v23 — third phantom-value slider; same fix. */}
                    <input
                      type="range"
                      min={1}
                      max={10}
                      value={eveningReflectionFor(progress, today).dayScore ?? 5}
                      onChange={(e) => onEveningReflection({ dayScore: Number(e.target.value) })}
                      aria-label="Productivity score for today"
                      className={`flex-1 accent-emerald-400 ${eveningReflectionFor(progress, today).dayScore == null ? "opacity-40" : ""}`}
                    />
                    <button
                      onClick={() => onEveningReflection({ dayScore: eveningReflectionFor(progress, today).dayScore ?? 5 })}
                      aria-label={eveningReflectionFor(progress, today).dayScore == null ? "Confirm today's score at 5" : `Today scored ${eveningReflectionFor(progress, today).dayScore}`}
                      title={eveningReflectionFor(progress, today).dayScore == null ? "Tap to confirm 5, or slide to rate" : "Confirmed"}
                      className={`text-xs tabular-nums w-10 text-right shrink-0 ${eveningReflectionFor(progress, today).dayScore != null ? "text-white" : "text-zinc-400 underline decoration-dotted hover:text-white"}`}
                    >
                      {eveningReflectionFor(progress, today).dayScore ?? "–"}/10
                    </button>
                  </div>
                </div>
              </div>

              {/* The two wheels: goal progress (our 5 pillars) + Stefan's Life
                  Mastery Wheel (his 12 areas, latest ratings + last-week ghosts) */}
              <div className="grid gap-4 md:grid-cols-2 items-stretch mb-4">
                <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-6 flex flex-col items-center justify-center">
                  <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-500 mb-3">Plan progress</span>
                  <LifeAreaWheel areas={track.areas} vision={track.vision} />
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-6 flex flex-col items-center justify-center">
                  <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-500 mb-3">Life Mastery Wheel</span>
                  {/* v24 — fall back to the day-one baseline. Reading reviews
                      alone left this wheel EMPTY for the whole first week: you
                      rate twelve rooms honestly on day one and see nothing, and
                      the first review then starts from zero, so week one could
                      not show progress at all. */}
                  <LifeMasteryWheel
                    ratings={track.latestReview?.areaRatings ?? (Object.keys(baselineRatings).length ? baselineRatings : null)}
                    prevRatings={track.prevOfLatest}
                    labels={areaLabels}
                  />
                  {!track.latestReview && Object.keys(baselineRatings).length > 0 && (
                    <p className="text-[10px] text-zinc-600 mt-2 text-center max-w-xs">
                      Your day-one ratings, until the first weekly review gives them something to move against.
                    </p>
                  )}
                </div>
              </div>

              {/* OS v2 — the spreadsheet: week-by-week scores, like Stefan keeps */}
              <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-5 py-4 mb-8">
                <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-500">Score history, your spreadsheet</span>
                <div className="mt-2">
                  <ScoreHistoryCard progress={progress} labels={areaLabels} />
                </div>
              </div>

              {/* PLM M5 — Weekly Evaluation Ritual, prompted when a week completes */}
              {track.due && (
                <div id="lm-weekly" className="scroll-mt-20">
                  <PrincipleCardView id="weekly" />
                  <WeeklyReviewForm
                    window={{ start: track.due.start, end: track.due.end }}
                    weekIndex={track.due.weekIndex}
                    weekRollups={track.dueWeekRollups}
                    prevRatings={track.duePrevRatings}
                    untouchedAreaIds={track.dueUntouched}
                    addedHabitIds={addedHabitIds}
                    focusAreaIds={focusAreaIds}
                    onRaise={onRaiseArea}
                    onSave={onSaveWeeklyReview}
                    draft={progress?.weeklyDraft ?? null}
                    onDraft={(patch) => onWeeklyDraft(patch, track.due!.start)}
                    labels={areaLabels}
                    vision={visionDisplayText}
                    purpose={drivingForce?.purpose}
                    topValues={valuesList}
                    tensDefined={new Set(Object.keys(yourTens).filter((k) => (yourTens[k] ?? "").trim()))}
                  />
                </div>
              )}

              {/* M2 — "there's never a 10": expand your 10 when an area sits at 9+ */}
              {track.rebaseline.length > 0 && (
                <div className="rounded-lg border border-violet-400/25 bg-violet-500/[0.06] px-3 py-2 mb-8">
                  <p className="text-[11px] text-violet-200/90">
                    {track.rebaseline.map((id) => LIFE_MASTERY_AREA_MAP.get(id)?.label).filter(Boolean).join(", ")}{" "}
                    rated 9+ two weeks running — there&apos;s never a 10. Your vision has grown: rewrite your 10 for
                    {track.rebaseline.length === 1 ? " this area" : " these areas"} in the Plan view.
                  </p>
                </div>
              )}

              {/* OS v2 — Goals, deep: expandable rows with the full RPM anatomy */}
              <div className="mb-2">
                <div className="flex items-center gap-2 mb-3">
                  <TrendingUp className="size-3.5 text-emerald-300" />
                  <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-emerald-200/90">Goals, toward your vision</span>
                  <span className="text-[10px] text-zinc-600">click a goal for its full anatomy</span>
                  <span className="h-px flex-1 bg-gradient-to-r from-emerald-400/30 to-transparent" />
                </div>
                <div className="space-y-3">
                  {activeGoals.map((g) => {
                    const r = track.rollups.get(g.id)
                    if (!r || !balanced) return null
                    return (
                      <div key={g.id}>
                        <GoalDeepRow
                          goal={g}
                          rollup={r}
                          balanced={balanced}
                          progress={progress}
                          today={today}
                          verdict={track.verdicts[g.id] ?? null}
                          expanded={expandedGoals.has(g.id)}
                          onToggle={() => toggleGoalExpanded(g.id)}
                          onLogMeasure={(v) => onLogMeasure(g.id, v)}
                        />
                        {/* v21 — behind is a normal state, not a failure. His
                            moves in order, with the dabbler guard-rail. */}
                        {correctingGoal === g.id ? (
                          <div className="mt-1.5">
                            <CorrectionPanel
                              goalTitle={g.title}
                              onVerdict={(verdict, reason) => onSaveVerdict(today.slice(0, 7), g.id, { verdict, reason })}
                              onClose={() => setCorrectingGoal(null)}
                            />
                          </div>
                        ) : (
                          <button onClick={() => setCorrectingGoal(g.id)} className="mt-1 ml-1 text-[10px] text-zinc-600 hover:text-amber-300 transition-colors">
                            behind on this? →
                          </button>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* OS v2 — the Blueprint as a living map: bands glow by rating, click to inspect */}
              <div className="mt-8">
                <div className="flex items-center gap-2 mb-3">
                  <Telescope className="size-3.5 text-violet-300" />
                  <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-violet-200/90">Your blueprint, the map of your life</span>
                  <span className="h-px flex-1 bg-gradient-to-r from-violet-400/30 to-transparent" />
                </div>
                <p className="text-xs text-zinc-500 mb-4 max-w-2xl">
                  Read it bottom-up: each row CARRIES the ones above it. Broken health drains your mind; a shaky mind poisons
                  your emotions; wrecked emotions strain the relationship. And so on to the top. Spirituality isn&apos;t a row,
                  it&apos;s the circle around everything. Brightness = your latest weekly rating (before your first review, it shows which rows your plan feeds). Click any row.
                </p>
                <div className="grid gap-4 md:grid-cols-2 items-start">
                  <BlueprintPyramid
                    covered={blueprintCoverage(activeGoals)}
                    ratings={track.latestReview?.areaRatings ?? null}
                    selectedBand={selectedBand}
                    onSelectBand={setSelectedBand}
                  />
                  <div>
                    {selectedBand !== null ? (
                      <BlueprintAreaPanel
                        band={selectedBand}
                        progress={progress}
                        yourTens={yourTens}
                        yourZeros={yourZeros}
                        goals={activeGoals}
                        addedHabitIds={addedHabitIds}
                        onRaise={onRaiseArea}
                      />
                    ) : (
                      <div className="rounded-xl border border-dashed border-white/15 bg-white/[0.02] p-6 text-center">
                        <p className="text-sm text-zinc-500">Click a row of the pyramid to inspect that part of your life</p>
                        <p className="text-xs text-zinc-600 mt-1">its rating trend, your 10, the goals feeding it, and a one-tap fix when it&apos;s weak.</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* PLM M5 — past weekly reviews, newest first */}
              {track.pastReviews.length > 0 && (
                <div className="mt-8">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-500">Past weekly reviews</span>
                    <span className="h-px flex-1 bg-white/10" />
                  </div>
                  <ul className="space-y-1.5">
                    {[...track.pastReviews].reverse().map((r) => {
                      const vals = Object.values(r.areaRatings)
                      const avg = vals.length ? Math.round((vals.reduce((s, v) => s + v, 0) / vals.length) * 10) / 10 : 0
                      const weak = LIFE_MASTERY_AREAS.filter((a) => (r.areaRatings[a.id] ?? 10) < LIFE_MASTERY_SUCCESS_LEVEL).length
                      // Focus may be a Blueprint area (new) or a pillar (pre-Blueprint reviews).
                      const focusMeta = r.focusPillarId
                        ? LIFE_MASTERY_AREA_MAP.get(r.focusPillarId) ?? PILLAR_BY_ID.get(r.focusPillarId)
                        : null
                      return (
                        <li key={r.weekStart} className="rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2">
                          <div className="flex items-center gap-2 flex-wrap text-xs">
                            <span className="text-zinc-300">Week of {r.weekStart}</span>
                            <span className="text-zinc-500 tabular-nums">avg {avg}/10</span>
                            {weak > 0 && <span className="text-amber-300/80 tabular-nums">{weak} below {LIFE_MASTERY_SUCCESS_LEVEL}</span>}
                            {focusMeta && (
                              <span className="text-[10px] px-1.5 py-px rounded-full border" style={{ color: focusMeta.color, borderColor: `${focusMeta.color}40` }}>
                                focus: {focusMeta.label}
                              </span>
                            )}
                          </div>
                          {r.note && <p className="text-[11px] text-zinc-500 mt-1">{r.note}</p>}
                          {r.lesson && <p className="text-[11px] text-zinc-500 mt-0.5"><span className="text-zinc-400">Lesson:</span> {r.lesson}</p>}
                          {(r.outcomes ?? []).length > 0 && (
                            <p className="text-[11px] text-zinc-500 mt-0.5">
                              <span className="text-zinc-400">Committed:</span>{" "}
                              {(r.outcomes ?? []).map((o) => o.outcome).join(" · ")}
                            </p>
                          )}
                        </li>
                      )
                    })}
                  </ul>
                </div>
              )}

              {/* PLM M6 — Monthly Goals Report */}
              <PrincipleCardView id="report" />
              <MonthlyReportSection
                months={track.months}
                years={track.years}
                month={track.month}
                onMonth={setReportMonth}
                report={track.report}
                vision={visionDisplayText}
                verdicts={track.verdicts}
                suggested={Object.fromEntries(
                  track.report.perGoal.map((pg) => {
                    const goal = activeGoals.find((g) => g.id === pg.goalId)
                    return [pg.goalId, suggestVerdict({ targetDate: goal?.targetDate ?? null }, pg.rollup, today)]
                  }),
                )}
                onVerdict={(goalId, entry) => onSaveVerdict(track.month, goalId, entry)}
                reviews={progress.weeklyReviews}
                jarMoments={Object.entries(progress.eveningReflections ?? {})
                  .filter(([d, r]) => d.startsWith(track.month.slice(0, 4)) && !!r.magicMoment?.trim())
                  .map(([, r]) => r.magicMoment!.trim())}
                onRerankFocus={() => { setMode("library"); setLibraryPage("areas") }}
                results={Object.fromEntries(
                  track.report.perGoal.map((pg) => {
                    const goal = activeGoals.find((g) => g.id === pg.goalId)
                    if (!goal?.measure) return [pg.goalId, null]
                    const last = latestMeasure(progress, pg.goalId, today)
                    if (!last) return [pg.goalId, null]
                    const rr = measureRunRate(goal, progress, pg.goalId, today)
                    return [pg.goalId, {
                      current: last.value,
                      target: goal.measure.target,
                      unit: goal.measure.unit,
                      donePct: rr?.donePct ?? 0,
                      timePct: rr?.timePct ?? 0,
                    }]
                  }),
                )}
              />

              <p className="text-center mt-8">
                <button onClick={() => { setMode("create"); setPage("doing") }} className="text-xs text-zinc-500 hover:text-white transition-colors">← Adjust the plan</button>
              </p>
            </>
          )}
        </div>
      ) : (
      <div className="max-w-6xl mx-auto px-6 pt-5 pb-24">
        <h1 className="text-2xl font-bold text-center mb-1">{intakePage.label}</h1>
        <p className="text-zinc-400 text-sm text-center mb-4 max-w-2xl mx-auto">{intakePage.intro}</p>

        {/* v25 — five pages instead of nineteen steps. The rail is real
            navigation: finished pages stay clickable, the ones ahead are
            locked until the page before them is settled. */}
        <IntakeRail
          page={page}
          pages={visiblePages}
          onGo={setPage}
          done={(p) => isIntakePageComplete(liveState, p)}
          reachable={(p) => {
            const order = visiblePages.map((x) => x.id)
            const i = order.indexOf(p)
            if (i <= 0) return true
            return order.slice(0, i).every((prev) => isIntakePageComplete(liveState, prev))
          }}
        />

        {/* The room crumb still belongs to the areas page, where a room can be
            open. It sits under the rail so the rail keeps one job. */}
        {page === "areas" && activeRoomId && (() => {
          const deep = wheelRooms.filter((r) => areaTier(areaRank, focusCount, r.id) === "focus" || (roomBeats[r.id] ?? 0) > 0)
          const list = deep.some((r) => r.id === activeRoomId) ? deep : wheelRooms
          const i = list.findIndex((r) => r.id === activeRoomId)
          return (
            <div className="flex items-center justify-center gap-2 -mt-2 mb-4 text-[11px]">
              <button onClick={() => i > 0 && openRoom(list[i - 1].id)} disabled={i <= 0} className="text-zinc-500 hover:text-zinc-200 disabled:opacity-25 transition-colors">‹ prev</button>
              <span className="text-zinc-500">
                Rooms › <span className="text-zinc-200">{wheelRooms.find((r) => r.id === activeRoomId)?.label ?? ""}</span>
                <span className="text-zinc-600 tabular-nums"> · {i + 1} of {list.length}</span>
              </span>
              <button onClick={() => i >= 0 && i < list.length - 1 && openRoom(list[i + 1].id)} disabled={i < 0 || i >= list.length - 1} className="text-zinc-500 hover:text-zinc-200 disabled:opacity-25 transition-colors">next ›</button>
              <button onClick={() => openRoom(null)} className="ml-2 text-zinc-600 hover:text-zinc-300 underline decoration-dotted transition-colors">back to the wheel</button>
            </div>
          )
        })()}

        {/* Every page runs the same reveal: one question at a time, down a
            single scroll. Pages 3 and 4 put their editors INSIDE the question
            card, so the question you are answering and the tool you answer it
            with are never separated. They used to be, and the gates asked for
            state the visible screen could not produce. */}
        {true && (
          <div className={page === "back" || page === "matters" || page === "going" ? "max-w-2xl mx-auto space-y-3" : "space-y-3"}>
            {revealed.map((q, i) => (
              <IntakeQuestionBlock
                key={q.id}
                q={q}
                isNewest={i === revealed.length - 1 && i > 0}
                answered={isIntakeAnswered(liveState, q.id)}
                onSkip={() => waveIntakePast(q.id)}
              >
                {renderIntakeInput(q)}
              </IntakeQuestionBlock>
            ))}
            {page === "going" && (
              <div className="pt-2">
                <DrivingForceCard
                  vision={text}
                  purpose={drivingForce?.purpose ?? ""}
                  identity={drivingForce?.identity ?? []}
                  conduct={drivingForce?.conduct ?? []}
                />
              </div>
            )}
            {blockingQuestion && revealed.length > 0 && (
              <p className="pt-2 text-center text-[11px] text-amber-300/80">
                Still open: {blockingQuestion.question} You can answer it, or use &ldquo;{INTAKE_SKIP_LABEL}&rdquo; under it.
              </p>
            )}
            {isIntakePageComplete(liveState, page) && (
              <div className="pt-4 text-center">
                <button
                  onClick={goNextIntakePage}
                  className="text-sm px-5 py-2.5 rounded-lg bg-violet-500/20 border border-violet-400/40 text-violet-100 hover:bg-violet-500/30 transition-all font-medium"
                >
                  {nextPageLabel}
                </button>
              </div>
            )}
          </div>
        )}


        {/* v17 — STAGE 1: the wheel IS the first thing you see. No preamble
            card above it, no textarea: a life area is the unit of work, so the
            map of your areas is where the product opens. */}
        {page === "areas" && (<>

        {/* Capture is not planning. A pasted list produces goals that look
            finished; this says out loud how much of the method the plan
            actually has, measured against his order rather than against
            whether our features were used. It exists so nobody has to
            hand-inspect a plan to discover it is 1/10 of the framework. */}
        {(goals?.length ?? 0) > 0 && (() => {
          const c = planConformance({ committedAt, values: valuesList, vision: matchedText || text, drivingForce, yourTens, areaPlans, goals })
          if (c.stepsDone === c.stepsTotal && c.captured.length === 0) return null
          const next = c.steps.find((s) => !s.done)
          return (
            <div className="max-w-3xl mx-auto rounded-2xl border border-amber-400/25 bg-amber-500/[0.05] px-5 py-3 mb-4">
              <div className="flex items-baseline gap-2 flex-wrap">
                <span className="text-[11px] font-semibold text-amber-100/90">
                  Your plan has {c.stepsDone} of {c.stepsTotal} parts of the method
                </span>
                {c.captured.length > 0 && (
                  <span className="text-[11px] text-zinc-400">
                    · {c.captured.length} of {c.goalsTotal} {c.captured.length === 1 ? "goal is" : "goals are"} captured, not planned yet
                  </span>
                )}
              </div>
              {next && (
                <p className="text-[10px] text-zinc-500 mt-1">
                  Next: <span className="text-zinc-300">{next.label}</span> — {next.note}
                </p>
              )}
              <div className="flex gap-1 mt-2" role="img" aria-label={`${c.stepsDone} of ${c.stepsTotal} parts of the method present`}>
                {c.steps.map((s) => (
                  <span key={s.id} title={`${s.label} — ${s.note}`}
                    className={`h-1 flex-1 rounded-full ${s.done ? "bg-emerald-400/70" : "bg-white/10"}`} />
                ))}
              </div>
            </div>
          )
        })()}

        <div id="lm-vision" className="max-w-3xl mx-auto bg-white/5 border border-white/10 rounded-2xl px-5 pt-3 pb-5 mb-6 scroll-mt-20">

          {/* State-priming + vision tools sit ABOVE the box — "before you
              write" has to come before the writing. */}
          <VisionWorkshop
            rooms={wheelRooms}
            ratings={baselineRatings}
            roomBeats={roomBeats}
            scopes={areaScopes}
            focusIds={focusAreaIds}
            onLoadExample={!goals ? loadExample : undefined}
            exampleWouldOverwrite={exampleWouldOverwrite}
            areaRank={areaRank}
            focusCount={focusCount}
            onReorder={onReorderAreas}
            onFocusCount={onFocusCount}
            maintenance={maintenanceFloors}
            onMaintenance={(id, t) => onAreaPlan(id, { maintenance: t })}
            activeAreaId={activeRoomId}
            onPick={openRoom}
            proseOpen={proseOpen}
            onToggleProse={() => setProseOpen((o) => !o)}
            renderRoomPanel={(roomId, close) => {
              const room = wheelRooms.find((r) => r.id === roomId)
              if (!room) return null
              // M1 — the list door replaces the room panel while it is open:
              // reviewing a whole pasted list beside a single-room journey
              // would put two different scopes of work on one screen.
              if (listOpen === roomId) {
                return (
                  <GoalListReview
                    today={today}
                    defaultAreaId={roomId}
                    canAddRituals={!!ritual}
                    onAccept={onAcceptGoalList}
                    onClose={() => setListOpen(null)}
                  />
                )
              }
              // The reasons beat, immediately after intake. His order is goal
              // → why written under it; a list of twelve goals and no reasons
              // is twelve wishes. Leaving is always allowed — the header badge
              // keeps asking, which is what "later" means here.
              if (reasonsFor.length > 0) {
                // Filtered by `reasonsFor` ONLY. Re-filtering on goalNeedsWhy
                // here shrank the list as each why was written while the pass's
                // own index advanced past it — so writing goal 1's reason
                // silently skipped goal 2. The set is frozen at intake; the
                // pass owns its own progress through it.
                const pending = (goals ?? []).filter((g) => reasonsFor.includes(g.id))
                if (pending.length > 0) {
                  return (
                    <ReasonsPass
                      goals={pending}
                      onWhy={(id, why) => editGoal(id, (g) => ({ ...g, why }))}
                      onPainWhy={(id, painWhy) => editGoal(id, (g) => ({ ...g, painWhy }))}
                      onReasons={(id, reasonsList) => editGoal(id, (g) => ({ ...g, reasonsList }))}
                      onDone={() => setReasonsFor([])}
                    />
                  )
                }
              }
              return (
                <RoomJourneyPanel
                  room={room}
                  dream={yourTens[roomId] ?? ""}
                  zero={yourZeros[roomId] ?? ""}
                  rating={baselineRatings[roomId] ?? null}
                  why={areaPlans[roomId]?.purpose ?? ""}
                  identity={areaPlans[roomId]?.identity ?? ""}
                  goalsInRoom={(goals ?? []).filter((g) => goalFeedsArea(g, roomId))}
                  allGoals={goals ?? []}
                  whyWork={areaPlans[roomId]?.whyWork ?? ""}
                  soft={areaPlans[roomId] ?? {}}
                  onWhyWork={(t) => onAreaPlan(roomId, { whyWork: t })}
                  onSoft={(kind, items) => onAreaPlan(roomId, { [kind]: items })}
                  approachReps={approachReps}
                  onApproachRep={onApproachRep}
                  relationshipStatus={relationshipStatus}
                  onRelationshipStatus={setRelationshipStatus}
                  sessionJournals={sessionJournals}
                  onLogSession={(j) => setSessionJournals((prev) => [...prev, j])}
                  onLinkGoals={linkGoals}
                  onUnlinkGoals={unlinkGoals}
                  suggestions={suggestions[roomId] ?? []}
                  suggestionPhase={proposalPhase[roomId] ?? "idle"}
                  autoSuggest={autoSuggest}
                  onToggleAutoSuggest={() => setAutoSuggest((o) => !o)}
                  suggestedIds={suggestedIds}
                  today={today}
                  onDream={(t) => onRoomDream(roomId, t)}
                  onZero={(t) => setYourZeros((prev) => ({ ...prev, [roomId]: t }))}
                  onAcceptSuggestion={(id) => acceptSuggestion(roomId, id)}
                  onDismissSuggestion={(id) => dismissSuggestion(roomId, id)}
                  onRating={(v) => onRoomRating(roomId, v)}
                  onWhy={(t) => onAreaPlan(roomId, { purpose: t })}
                  onIdentity={(t) => onAreaPlan(roomId, { identity: t })}
                  onPropose={() => void proposeRoomGoals(roomId)}
                  onAddGoalRaw={(input) => { onAddAreaGoal(roomId, input); maybeSuggestFromGoal(roomId, input.title) }}
                  onOpenList={() => setListOpen(roomId)}
                  onAddGoalAction={addAction}
                  onEditGoalTitle={editTitle}
                  onSetGoalType={setGoalType}
                  onEditGoalMeasure={editMeasure}
                  onEditGoalDate={editTargetDate}
                  onGoalFreq={roomGoalFreq}
                  onRemoveGoal={removeGoal}
                  onEditGoalRamp={editGoalRamp}
                  onEditGoalWhy={editGoalWhy}
                  onRename={(name) => onRenameRoom(roomId, name)}
                  onRemove={room.custom ? () => { onRemoveRoom(roomId); close() } : undefined}
                  onClose={close}
                />
              )
            }}
            onCompose={(draft) => setText((t) => (t.trim() ? `${t.trim()} ${draft}` : draft))}
            onGoalMaterial={(items) => setGoalInbox((prev) => [...prev, ...items.filter((t) => !prev.includes(t))])}
            onAddRoom={onAddRoom}
          />

          {/* v17 — the prose box only when the user opted into it, and never
              while a room journey is open. */}
          {proseOpen && !activeRoomId && (<>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={PLACEHOLDER}
            rows={4}
            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-white/20 transition-colors resize-none mt-3"
          />

          <div className="flex items-center gap-3 mt-3">
            <button
              onClick={() => void run()}
              disabled={busy || !text.trim()}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-violet-500/20 border border-violet-500/40 text-violet-200 hover:bg-violet-500/30 transition-all text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {busy ? <Loader2 className="size-4 animate-spin" /> : <Telescope className="size-4" />}
              {phase === "loading" ? (pct > 0 ? `Loading model ${pct}%` : "Loading model…") : phase === "matching" ? "Reading your vision…" : result ? "Re-read my vision" : "Build my plan"}
            </button>
            {stale && <span className="text-[11px] text-amber-300/80">Text changed, re-read to update</span>}
          </div>
          <p className="text-[10px] text-zinc-600 mt-2">
            Your text is analyzed on your own device and never leaves this browser (first run downloads a ~50 MB model once). Only the optional coach suggestions call our server.
          </p>
          {!goals && (
            <div className="mt-3 rounded-lg border border-white/10 bg-white/[0.02] px-3 py-2">
              <span className="text-[9px] uppercase tracking-wide text-zinc-500">Prose path, what Build does</span>
              <ul className="mt-1 space-y-0.5 text-[11px] text-zinc-400">
                <li>· Your sentences are matched to life areas on your device; anything that fits nowhere lands in the Goal Workshop for you to shape by hand.</li>
                <li>· The coach drafts goals with drivers attached. Outcomes get a date and a milestone ladder, practices get weekly habits. You edit everything.</li>
                <li>· Room journeys don&apos;t need this button. Their goals are made inside each room.</li>
              </ul>
            </div>
          )}
          {text.trim().length > 40 && (
            <div className="mt-3 rounded-lg border border-white/10 bg-white/[0.02] px-3 py-2">
              <span className="text-[9px] uppercase tracking-wide text-zinc-500">The make-it-pull test. Before you read it in</span>
              <ul className="mt-1 space-y-0.5 text-[11px] text-zinc-400">
                <li>· Read it OUT LOUD. Does it pull? Rewrite any sentence that reads flat. &ldquo;language it in a way that inspires you.&rdquo;</li>
                <li>· Clarity is power: are there numbers in it? (A strong one has a weight, an income, an address in it.)</li>
                <li>· Is there a WHO in it? The person you&apos;ve become?</li>
              </ul>
            </div>
          )}

          {phase === "error" && (
            <p className="text-xs text-red-300 mt-3">Couldn&apos;t read the vision: {err}</p>
          )}
          </>)}
        </div>

        {/* v17 — the glossary sits AFTER the wheel: you meet the map first and
            look up a word if you need it, rather than reading definitions
            before you've seen the thing they define. */}
        <div className="max-w-3xl mx-auto">
          <GlossaryCard />
        </div>

        {result && phase === "done" && result.intents.length > 0 && (
          <>
              {!confirmed && !tonightDismissed && (() => {
                // Rendered client-side only (gated on post-hydration state), so
                // reading the clock here can't cause a hydration mismatch.
                const evening = new Date().getHours() >= 17 || new Date().getHours() < 4
                return (
                  <div className="rounded-xl border border-emerald-400/25 bg-emerald-500/[0.06] px-4 py-3 mb-4 flex items-start gap-3">
                    <div className="min-w-0">
                      <p className="text-sm text-emerald-100">{evening ? "That's enough for tonight." : "That's enough for one sitting."}</p>
                      <p className="text-[11px] text-zinc-400 mt-0.5">
                        {evening
                          ? "Your first step is tomorrow morning: read your North Star below once, out loud. Everything else on this page will still be here in daylight. It is a plan, and it keeps."
                          : "Your first step: read your North Star below once, out loud. The rest of this page will keep. It is a plan, and it keeps."}
                      </p>
                    </div>
                    <button onClick={() => setTonightDismissed(true)} aria-label="Dismiss" className="ml-auto text-zinc-600 hover:text-zinc-300 shrink-0"><X className="size-3.5" /></button>
                  </div>
                )
              })()}
              <div className="rounded-2xl border border-violet-400/20 bg-gradient-to-br from-violet-500/[0.12] via-white/[0.04] to-transparent px-6 py-5 mb-6">
                <div className="flex items-center gap-2 mb-3">
                  <Sparkles className="size-3.5 text-violet-300" />
                  <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-violet-200/90">North Star</span>
                  <span className="h-px flex-1 bg-gradient-to-r from-violet-400/30 to-transparent" />
                </div>
                {matchedText && (
                  <p className="text-lg sm:text-xl font-medium leading-relaxed text-white whitespace-pre-wrap">
                    {renderHighlighted(matchedText, result.intents)}
                  </p>
                )}
                {/* M1 — the North Star is COMPOSED from the rooms: each room's
                    dream renders as its own room-colored line, never glued
                    into fake prose. */}
                {wheelRooms.some((r) => (yourTens[r.id] ?? "").trim()) && (
                  <div className={`space-y-1 ${matchedText ? "mt-3 pt-3 border-t border-white/10" : ""}`}>
                    {wheelRooms.filter((r) => (yourTens[r.id] ?? "").trim()).map((r) => (
                      <p key={r.id} className="text-sm leading-relaxed">
                        <span className="inline-flex items-center gap-1.5 mr-2">
                          <span className="size-1.5 rounded-full inline-block" style={{ background: r.color }} />
                          <span className="text-[11px] uppercase tracking-wide" style={{ color: r.color }}>{r.label}</span>
                        </span>
                        <span className="text-white font-medium">{yourTens[r.id].trim()}</span>
                      </p>
                    ))}
                  </div>
                )}
                {valuesList.length > 0 && (
                  <p className="text-[11px] text-zinc-500 mt-3">
                    Does this vision honor your top values —{" "}
                    <span className="text-zinc-300">{valuesList.slice(0, 3).join(", ")}</span>? If not, rewrite one of them.
                  </p>
                )}
                {/* His rule is a vision for EVERY area — say which rooms are still dark. */}
                {(() => {
                  // Coverage is computed from the drafted goals — while the
                  // coach is still drafting, a hard "0 of 12" would be false
                  // and the Area Sweep nudge premature.
                  if (goalPhase === "generating") {
                    return <p className="text-[11px] text-zinc-500 mt-2">Counting which of the 12 life areas this lights up. Done when the coach finishes drafting below.</p>
                  }
                  const covered = LIFE_MASTERY_AREAS.filter(
                    (a) => (goals ?? []).some((g) => goalFeedsArea(g, a.id)) || (yourTens[a.id] ?? "").trim(),
                  )
                  if (covered.length >= LIFE_MASTERY_AREAS.length) return null
                  const dark = LIFE_MASTERY_AREAS.length - covered.length
                  return (
                    <p className="text-[11px] text-zinc-500 mt-2">
                      This lights up <span className="text-zinc-300 tabular-nums">{covered.length} of 12</span> life areas. The ones you&apos;re focusing on need a real 10; the rest need a floor, not a paragraph.{" "}
                      <button
                        onClick={() => document.getElementById("lm-vision")?.scrollIntoView({ behavior: "smooth" })}
                        className="underline decoration-dotted text-zinc-300 hover:text-white transition-colors"
                      >
                        Answer the area questions again
                      </button>{" "}
                      for the {dark} quiet one{dark === 1 ? "" : "s"} — or write their 10s further down. No pressure today; dark rooms just shouldn&apos;t be invisible.
                    </p>
                  )
                })()}
              </div>
          </>
        )}
        {/* Immediate feedback on the map itself when a prose Build finds no
            areas — don't make the user navigate on to discover it. */}
        {result && phase === "done" && result.intents.length === 0 && (
          <div className="max-w-3xl mx-auto text-center py-6 px-4 border border-white/10 rounded-2xl bg-white/[0.03] mb-6">
            <p className="text-zinc-400 text-sm">Couldn&apos;t find any goal areas in that yet. Open a room on the wheel above, or describe what you want more concretely in the box.</p>
          </div>
        )}
        </>)}

        {/* v16 — STAGE 2: commit (the manifesto — the gate before tracking). */}
        {/* v17 — STAGE 3: COMMIT. Design the mornings, size the week honestly,
            then sign. The signature is the hand-off into tracking, which is
            what its own copy always claimed it was. */}
        {/* v25 — ORDER FIXED. Page 4 promises goals first, then the plan, then
            signing. It used to render the morning ritual and the Start-tracking
            signature ABOVE the goal workshop, so the thing the page is about sat
            at the bottom, below the button that ends the flow. Goals now come
            first and signing is last, which is both the page's own promise and
            the source's order. */}
        {page === "doing" && ((goals?.length ?? 0) > 0 || result) && phase !== "loading" && (
          result && result.intents.length === 0 && !(goals?.length ?? 0) ? (
            <div className="text-center py-10 border border-white/10 rounded-2xl bg-white/[0.03]">
              <p className="text-zinc-400 text-sm">
                Couldn&apos;t find any goal areas in that. Try describing what you want more concretely.
              </p>
            </div>
          ) : (
            <>
              <p className="text-xs text-zinc-500 mb-3">
                {areaGroups.length} life area{areaGroups.length === 1 ? "" : "s"} in your plan — drag to set priority · click a card to include or leave it out
              </p>
            <PrincipleCardView id="vision" />
              <AreaBoard areas={areaGroups} deselected={deselected} onToggle={toggleArea} onReorder={reorderAreas} />

              {/* v23 — READ-ONLY summary. This used to be a second focus picker
                  calling `onSetFocus` directly, which writes `focusAreaIds` but
                  not `areaRank`/`focusCount` — so it silently disagreed with the
                  rooms-screen ranker and the disagreement changed shape again on
                  reload. The ranker is the single writer; this reflects it. */}
              <div id="lm-focus" className="mt-4 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 scroll-mt-20">
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-400">
                  Your most important room{focusAreaIds.length > 0 ? " — this season's focus" : ""}
                </p>
                <p className="text-[11px] text-zinc-500 mt-1">
                  Which room, conquered, lifts all the others? Its goals move to the front of the schedule and your weekly reviews lean on it. Everything else stays in the plan at a steadier pace.
                </p>
                <div className="flex items-center gap-1.5 flex-wrap mt-2">
                  {focusAreaIds.length === 0 ? (
                    <span className="text-[11px] text-zinc-500">Not chosen yet.</span>
                  ) : (
                    focusAreaIds.map((id) => {
                      const a = LIFE_MASTERY_AREA_MAP.get(id) ?? customAreas.find((c) => c.id === id)
                      if (!a) return null
                      const color = "color" in a ? a.color : "#a1a1aa"
                      return (
                        <span
                          key={id}
                          className="flex items-center gap-1.5 text-[11px] px-2.5 py-1 rounded-full border text-white bg-white/10"
                          style={{ borderColor: color }}
                        >
                          <span className="size-1.5 rounded-full" style={{ background: color }} />
                          {(areaPlans[id]?.name ?? "").trim() || a.label}
                        </span>
                      )
                    })
                  )}
                  <button
                    onClick={() => { setPage("areas"); requestAnimationFrame(() => document.getElementById("lm-season-priority")?.scrollIntoView({ behavior: "smooth", block: "center" })) }}
                    className="text-[11px] text-zinc-400 hover:text-zinc-200 underline underline-offset-2 ml-1"
                  >
                    {focusAreaIds.length === 0 ? "Choose it in Your rooms →" : "Change it in Your rooms →"}
                  </button>
                </div>
              </div>

              {(result?.unmatched.length ?? 0) > 0 && result && (
                <div className="mt-4 rounded-lg border border-amber-400/20 bg-amber-500/[0.04] px-3 py-2">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-amber-200/80 mb-1">Couldn&apos;t place these. Nothing you wrote gets dropped</p>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {result?.unmatched.map((sp) => (
                      <span key={sp.text} className="flex items-center gap-1 text-[11px] text-zinc-400 border border-white/10 rounded-full px-2 py-0.5">
                        <span className="min-w-0">&ldquo;{sp.text}&rdquo;</span>
                        <button
                          onClick={() => setGoalInbox((prev) => (prev.includes(sp.text) ? prev : [...prev, sp.text]))}
                          disabled={goalInbox.includes(sp.text)}
                          className="text-[9px] px-1.5 py-px rounded-full border border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/10 disabled:opacity-40 transition-colors shrink-0"
                          title="Send to the Goal Workshop below. Circle it into a goal, or consciously let it go"
                        >
                          {goalInbox.includes(sp.text) ? "in workshop" : "→ workshop"}
                        </button>
                      </span>
                    ))}
                  </div>
                  <p className="text-[10px] text-zinc-600 mt-1">Mood words often don&apos;t map to an area. That&apos;s fine. Anything that&apos;s really a WANT belongs in the workshop.</p>
                </div>
              )}

              {/* M2 — goals appear below the board. v8: the Goal Workshop comes
                  FIRST (user authors); AI drafting is an opt-in assist whenever
                  workshop material is waiting. */}
              <div id="lm-goals" className="mt-8 scroll-mt-20">
                <GoalWorkshopPanel
                  items={goalInbox}
                  onQualify={onQualifyWorkshopGoal}
                  onDismiss={onDismissWorkshopItem}
                  onAddWant={onAddWorkshopWant}
                />
                {goalInbox.length > 0 && goalPhase !== "generating" && (
                  <div className="mb-6 text-center">
                    <button
                      onClick={generateGoals}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-white/15 bg-white/[0.04] text-zinc-300 hover:bg-white/10 transition-all text-xs"
                    >
                      <Wand2 className="size-3.5" /> {goals ? "Suggest a few more beside yours" : "Not sure where to start? Get a few suggestions"}
                    </button>
                  </div>
                )}
                {goalPhase === "generating" && (
                  <div className="flex flex-col items-center gap-2 py-6">
                    <span className="flex items-center gap-2 text-sm text-zinc-300">
                      <Loader2 className="size-4 animate-spin text-emerald-300" />
                      Designing your goals…
                    </span>
                    <p className="text-[11px] text-zinc-500">
                      The coach is reading your vision and drafting concrete goals. This can take a minute.
                    </p>
                  </div>
                )}
                {goalPhase === "error" && (
                  <div className="text-center py-4">
                    <p className="text-xs text-amber-300/90 mb-1">The coach couldn&apos;t draft suggestions{goalErr.toLowerCase().includes("auth") ? " you may need to sign in" : ""}. ({goalErr})</p>
                    <p className="text-[11px] text-zinc-500 mb-3">No blocker: the Goal Workshop above is the main path. You author the goals; the coach only ever suggests.</p>
                    <button
                      onClick={generateGoals}
                      className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-emerald-500/15 border border-emerald-500/40 text-emerald-200 hover:bg-emerald-500/25 transition-all text-sm font-medium"
                    >
                      <Wand2 className="size-4" /> Retry goal design
                    </button>
                  </div>
                )}

                {goalPhase === "done" && goals && (
                  <>
                    <PrincipleCardView id="goals" />
                    <div className="flex items-center gap-2 mb-3">
                      <Wand2 className="size-3.5 text-emerald-300" />
                      <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-emerald-200/90">Your goals. Edit or delete anything that isn't yours</span>
                      <span className="h-px flex-1 bg-gradient-to-r from-emerald-400/30 to-transparent" />
                      <button onClick={generateGoals} className="text-xs text-zinc-500 hover:text-white transition-colors">Suggest a few more</button>
                    </div>
                    {activeGoals.length === 0 ? (
                      <p className="text-sm text-zinc-500 text-center py-8 border border-white/10 rounded-2xl bg-white/[0.03]">
                        Every area is left out. Click an area above to bring its goals back.
                      </p>
                    ) : (
                    <div className="grid gap-3 md:grid-cols-2 items-start">
                      {activeGoals.map((g) => (
                        <div key={g.id} className="rounded-xl border border-white/10 bg-white/[0.04] p-4">
                          <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                            <span
                              className="flex items-center gap-1.5 text-[11px] font-medium px-2.5 py-1 rounded-full border"
                              style={{ color: pillarTextColor(g.pillarColor), borderColor: `${g.pillarColor}59`, backgroundColor: `${g.pillarColor}1f` }}
                            >
                              <span className="size-1.5 rounded-full" style={{ backgroundColor: g.pillarColor }} />
                              {g.pillarLabel}
                            </span>
                            {/* v17 — the type is EDITABLE here too. This card
                                used to print the type as a dead label, which is
                                why a goal typed wrong could never be fixed. */}
                            <GoalTypeToggle type={g.type} onSetType={(t) => setGoalType(g.id, t)} />
                            <HorizonChip goal={g} today={today} />
                            {g.objectiveLabel && (
                              <span className="text-[10px] text-zinc-500">→ {g.objectiveLabel}</span>
                            )}
                            <label
                              className="ml-auto flex items-center gap-1.5 text-[10px] text-zinc-500"
                              title={g.type === "habit_ramp" && !g.targetDate ? "Practice goals run on weekly reps, not deadlines — set a date only if this must land by then." : undefined}
                            >
                              {g.type === "habit_ramp" && !g.targetDate ? "ongoing · by" : "by"}
                              <input
                                type="date"
                                value={g.targetDate ?? ""}
                                onChange={(e) => editTargetDate(g.id, e.target.value)}
                                aria-label={`Target date for ${g.title}`}
                                className="bg-white/5 border border-white/10 rounded-md px-1.5 py-0.5 text-[11px] text-zinc-300 focus:outline-none focus:border-white/25"
                              />
                            </label>
                          </div>
                          <EditableTitle
                            value={g.title}
                            onCommit={(next) => editTitle(g.id, next)}
                            ariaLabel={`Rename ${g.title}`}
                            className="text-base font-semibold text-white"
                            inputClassName="text-base font-semibold bg-white/5 border border-white/20 rounded-md px-2 py-0.5 text-white w-full"
                          />
                          {/* v15 — the visible thread back to the user's own words. */}
                          {(() => {
                            const srcs = (g.sourceIntentIds ?? [])
                              .map((sid) => result.intents.find((i) => i.id === sid))
                              .filter((i): i is VisionIntent => !!i)
                            if (!srcs.length) return null
                            return (
                              <p className="text-[10px] text-zinc-600 mt-1 truncate" title={srcs.map((s) => s.text).join(" · ")}>
                                from your words: {srcs.map((s) => `“${s.text}”`).join(" · ")}
                              </p>
                            )
                          })()}
                          {/* PLM OS M3 — the goal as an affirmation sentence ("never 'I want'") */}
                          <label className="block mt-2">
                            <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-violet-300/80">The goal, written as already true</span>
                            <input
                              value={g.smartSentence ?? buildSmartSentence(g)}
                              onChange={(e) => editSmartSentence(g.id, e.target.value)}
                              aria-label={`Affirmation sentence for ${g.title}`}
                              className="mt-1 w-full bg-violet-500/[0.06] border border-violet-400/20 rounded-lg px-3 py-2 text-sm italic text-violet-100 focus:outline-none focus:border-violet-400/40 transition-colors"
                            />
                          </label>
                          <label className="block mt-2">
                            <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-500">Why this goal must happen</span>
                            <textarea
                              value={g.why}
                              onChange={(e) => editWhy(g.id, e.target.value)}
                              rows={2}
                              placeholder="Why MUST this happen? Borrowed reasons don't burn. Write your own."
                              className={`mt-1 w-full bg-white/5 border rounded-lg px-3 py-2 text-sm text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-white/20 transition-colors resize-none ${g.why.trim() ? "border-white/10" : "border-amber-400/40"}`}
                            />
                            {!g.why.trim() && <span className="text-[10px] text-amber-300/80">No why yet. The goal isn&apos;t qualified until the fuel is yours.</span>}
                          </label>
                          <label className="block mt-1.5">
                            <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-500">The feeling it gives you</span>
                            <input
                              value={g.feeling ?? ""}
                              onChange={(e) => editGoal(g.id, (gg) => ({ ...gg, feeling: e.target.value || null }))}
                              placeholder='The feeling clause of the sentence — "freedom", "quiet pride", "aliveness"'
                              aria-label={`Feeling for ${g.title}`}
                              className="mt-1 w-full bg-white/5 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-zinc-300 placeholder:text-zinc-600 focus:outline-none focus:border-white/20 transition-colors"
                            />
                          </label>
                          <label className="block mt-2">
                            <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-500">What it costs you if you don&apos;t</span>
                            <input
                              value={g.painWhy ?? ""}
                              onChange={(e) => editPainWhy(g.id, e.target.value)}
                              placeholder="What will it cost you if you don't achieve this?"
                              aria-label={`Pain-why for ${g.title}`}
                              className="mt-1 w-full bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-zinc-300 placeholder:text-zinc-600 focus:outline-none focus:border-white/20 transition-colors"
                            />
                          </label>
                          {/* M3 — belief check: under 7 → shrink the goal, don't force it */}
                          <div className="flex items-center gap-3 mt-2.5" title="The rule: belief below 7/10 means the goal is too big right now. Shrink it until you believe it.">
                            <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-500 shrink-0">Belief</span>
                            {/* v23 — phantom value. The thumb sat at 7 while the
                                readout said "–", and a range input fires no
                                change event when dragged to the value it is
                                already on — so a user who genuinely meant 7
                                could not record it. Dim when unset, and make
                                the readout a button that commits the default. */}
                            <input
                              type="range"
                              min={0}
                              max={10}
                              value={g.beliefLevel ?? 7}
                              onChange={(e) => editBelief(g.id, Number(e.target.value))}
                              aria-label={`Belief level for ${g.title}`}
                              className={`flex-1 ${g.beliefLevel == null ? "opacity-40" : ""}`}
                              style={{ accentColor: g.beliefLevel == null ? "#52525b" : g.beliefLevel < BELIEF_SWEET_SPOT ? "#fbbf24" : g.pillarColor }}
                            />
                            <button
                              onClick={() => editBelief(g.id, g.beliefLevel ?? 7)}
                              aria-label={g.beliefLevel == null ? `Confirm belief 7 for ${g.title}` : `Belief ${g.beliefLevel} for ${g.title}`}
                              title={g.beliefLevel == null ? "Tap to confirm 7, or slide to rate" : "Confirmed"}
                              className={`text-xs tabular-nums w-10 text-right shrink-0 ${g.beliefLevel == null ? "text-zinc-400 underline decoration-dotted hover:text-white" : g.beliefLevel < BELIEF_SWEET_SPOT ? "text-amber-300" : "text-zinc-300"}`}
                            >
                              {g.beliefLevel ?? "–"}/10
                            </button>
                          </div>
                          <div className="flex items-center gap-3 mt-1.5" title="Second gate: do you actually WANT it at 7+? Belief-10/desire-2 goals get abandoned the first hard week.">
                            <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-500 shrink-0">Desire</span>
                            <input
                              type="range" min={0} max={10}
                              value={g.desireLevel ?? 7}
                              onChange={(e) => editGoal(g.id, (gg) => ({ ...gg, desireLevel: Number(e.target.value) }))}
                              aria-label={`Desire level for ${g.title}`}
                              className={`flex-1 ${g.desireLevel == null ? "opacity-40" : ""}`}
                              style={{ accentColor: g.desireLevel == null ? "#52525b" : g.desireLevel < BELIEF_SWEET_SPOT ? "#fbbf24" : g.pillarColor }}
                            />
                            <button
                              onClick={() => editGoal(g.id, (gg) => ({ ...gg, desireLevel: gg.desireLevel ?? 7 }))}
                              aria-label={g.desireLevel == null ? `Confirm desire 7 for ${g.title}` : `Desire ${g.desireLevel} for ${g.title}`}
                              title={g.desireLevel == null ? "Tap to confirm 7, or slide to rate" : "Confirmed"}
                              className={`text-xs tabular-nums w-10 text-right shrink-0 ${g.desireLevel == null ? "text-zinc-400 underline decoration-dotted hover:text-white" : g.desireLevel < BELIEF_SWEET_SPOT ? "text-amber-300" : "text-zinc-300"}`}
                            >
                              {g.desireLevel ?? "–"}/10
                            </button>
                          </div>
                          {((g.beliefLevel ?? 7) < BELIEF_SWEET_SPOT || (g.desireLevel ?? 7) < BELIEF_SWEET_SPOT) && (
                            <p className="text-[10px] text-amber-300/80 mt-1">
                              {(g.beliefLevel ?? 7) < BELIEF_SWEET_SPOT
                                ? `Belief under ${BELIEF_SWEET_SPOT}. Shrink it until you believe it: bring the target closer or push the date${g.measure ? ` (e.g. ${g.measure.target} → ${shrunkTarget(g.measure)} ${g.measure.unit})` : ""}.`
                                : `Desire under ${BELIEF_SWEET_SPOT} — whose goal is this? Rewrite it toward what you actually want, or cut it.`}
                            </p>
                          )}
                          {/* v10 — his calibration: 80-90% sure, not certain */}
                          {(g.beliefLevel ?? 7) === 10 && (g.desireLevel ?? 7) >= BELIEF_SWEET_SPOT && (
                            <p className="text-[10px] text-zinc-500 mt-1">
                              Belief 10/10? It might be too safe. The calibration sweet spot is 80-90% sure: big enough that it stretches you, close enough that you&apos;ll swing.
                            </p>
                          )}

                          {/* v9 — qualification teeth: reward, stake, pre-mortem, 100 reasons.
                              A goal without a cost of missing has no teeth. */}
                          <div className="grid gap-1.5 sm:grid-cols-2 mt-2">
                            <label className="block">
                              <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-emerald-300/70">Reward when you land it</span>
                              <input
                                value={g.reward ?? ""}
                                onChange={(e) => editGoal(g.id, (gg) => ({ ...gg, reward: e.target.value || null }))}
                                placeholder="How will you celebrate when it lands?"
                                aria-label={`Reward for ${g.title}`}
                                className="mt-1 w-full bg-white/5 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-zinc-300 placeholder:text-zinc-600 focus:outline-none focus:border-white/20 transition-colors"
                              />
                            </label>
                            <label className="block">
                              <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-red-300/70">What you forfeit if you miss</span>
                              <input
                                value={g.stake ?? ""}
                                onChange={(e) => editGoal(g.id, (gg) => ({ ...gg, stake: e.target.value || null }))}
                                placeholder="What do you forfeit if you miss?"
                                aria-label={`Stake for ${g.title}`}
                                className="mt-1 w-full bg-white/5 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-zinc-300 placeholder:text-zinc-600 focus:outline-none focus:border-white/20 transition-colors"
                              />
                              {!(g.stake ?? "").trim() && (
                                <span className="flex items-center gap-1 flex-wrap mt-1" title={CONSEQUENCE_RULES.join(" ")}>
                                  <span className="text-[9px] text-zinc-600 shrink-0">stake menu, tap one or write your own:</span>
                                  {CONSEQUENCE_MENU.slice(0, 6).map((opt) => (
                                    <button key={opt.text} onClick={() => editGoal(g.id, (gg) => ({ ...gg, stake: opt.text }))}
                                      className="text-[9px] px-1.5 py-0.5 rounded-full border border-white/15 text-zinc-500 hover:text-zinc-300 hover:bg-white/10 transition-colors">
                                      {opt.text}
                                    </button>
                                  ))}
                                </span>
                              )}
                            </label>
                          </div>
                          <label className="block mt-1.5">
                            <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-500">What will try to stop you. And your counter-move</span>
                            <input
                              value={g.obstacles ?? ""}
                              onChange={(e) => editGoal(g.id, (gg) => ({ ...gg, obstacles: e.target.value || null }))}
                              placeholder="Name the obstacles NOW, and the counter-move for each."
                              aria-label={`Obstacle pre-mortem for ${g.title}`}
                              className="mt-1 w-full bg-white/5 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-zinc-300 placeholder:text-zinc-600 focus:outline-none focus:border-white/20 transition-colors"
                            />
                          </label>
                          <ReasonsDrill
                            goalTitle={g.title}
                            goalWhy={g.why}
                            reasons={g.reasonsList ?? []}
                            onAdd={(r) => editGoal(g.id, (gg) => ((gg.reasonsList ?? []).includes(r) ? gg : { ...gg, reasonsList: [...(gg.reasonsList ?? []), r] }))}
                            onAddMany={(rs) => editGoal(g.id, (gg) => {
                              const have = new Set((gg.reasonsList ?? []).map((x) => x.toLowerCase()))
                              const add = rs.filter((r) => !have.has(r.toLowerCase()))
                              return add.length ? { ...gg, reasonsList: [...(gg.reasonsList ?? []), ...add] } : gg
                            })}
                            onRemove={(r) => editGoal(g.id, (gg) => ({ ...gg, reasonsList: (gg.reasonsList ?? []).filter((x) => x !== r) }))}
                          />

                          {/* M3 — the plan inside the goal: habits, tasks, and the ladder/ramp */}
                          <button
                            onClick={() => toggleExpanded(g.id)}
                            className="flex items-center gap-1.5 mt-3 text-[11px] font-medium text-zinc-400 hover:text-white transition-colors"
                          >
                            <ChevronDown className={`size-3.5 transition-transform ${expanded.has(g.id) ? "" : "-rotate-90"}`} />
                            The plan · {g.habits.length} habit{g.habits.length === 1 ? "" : "s"}
                            {g.tasks.length > 0 && ` · ${g.tasks.length} task${g.tasks.length === 1 ? "" : "s"}`}
                            {g.measure && ` · ${g.measure.steps} milestones`}
                          </button>
                          {expanded.has(g.id) && (
                            <div className="mt-2 space-y-3 border-l-2 pl-3" style={{ borderColor: `${g.pillarColor}40` }}>
                              <div>
                                <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-500">Habits</span>
                                <ul className="mt-1 space-y-1">
                                  {g.habits.map((h) => (
                                    <li key={h.id}>
                                    <div className="group flex items-center gap-2 text-sm text-zinc-200">
                                      <Repeat className="size-3.5 shrink-0" style={{ color: g.pillarColor }} />
                                      <span className="min-w-0 truncate">{h.title}</span>
                                      <ProvenanceBadge sourceTargetId={h.sourceTargetId} />
                                      <span className="ml-auto flex items-center gap-1 shrink-0">
                                        <button
                                          onClick={() => editHabitFreq(g.id, h.id, -1)}
                                          disabled={h.daysPerWeek <= 1}
                                          aria-label={`Fewer days for ${h.title}`}
                                          className="size-4.5 rounded border border-white/15 text-zinc-400 hover:bg-white/10 disabled:opacity-30 flex items-center justify-center"
                                        ><Minus className="size-3" /></button>
                                        <span className="text-[11px] text-zinc-400 tabular-nums w-12 text-center">{h.daysPerWeek}×/wk</span>
                                        <button
                                          onClick={() => editHabitFreq(g.id, h.id, 1)}
                                          disabled={h.daysPerWeek >= 7}
                                          aria-label={`More days for ${h.title}`}
                                          className="size-4.5 rounded border border-white/15 text-zinc-400 hover:bg-white/10 disabled:opacity-30 flex items-center justify-center"
                                        ><Plus className="size-3" /></button>
                                      </span>
                                      {g.habits.length > 1 && (
                                        <button
                                          onClick={() => deleteHabit(g.id, h.id)}
                                          aria-label={`Remove habit ${h.title}`}
                                          className="opacity-0 group-hover:opacity-100 text-zinc-600 hover:text-red-300 transition-all shrink-0"
                                        ><X className="size-3.5" /></button>
                                      )}
                                    </div>
                                    {/* M11 — day designer, surfaced where workouts live */}
                                    {(g.pillarId === "health" || g.id === routineGoalId("workout") || h.routine) && (
                                      <WorkoutDesigner
                                        habit={h}
                                        color={g.pillarColor}
                                        preview={(() => {
                                          const bh = balanced?.habits.find((x) => x.habitId === h.id)
                                          return bh && h.routine ? routineWeekPreview(bh, h.routine) : []
                                        })()}
                                        onApplySplit={(split) => applySplit(g.id, h.id, split)}
                                        onRename={(dayId, name) => renameRoutineDay(g.id, h.id, dayId, name)}
                                        onMove={(index, dir) => moveRoutineDay(g.id, h.id, index, dir)}
                                        onAddDay={() => addRoutineDay(g.id, h.id)}
                                        onRemoveDay={(dayId) => removeRoutineDay(g.id, h.id, dayId)}
                                        onClear={() => clearRoutine(g.id, h.id)}
                                      />
                                    )}
                                    </li>
                                  ))}
                                </ul>
                                <AddHabitRow onAdd={(title, days) => addHabit(g.id, title, days)} />
                              </div>
                              {g.tasks.length > 0 && (
                                <div>
                                  <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-500">One-time tasks</span>
                                  <ul className="mt-1 space-y-1">
                                    {g.tasks.map((t) => (
                                      <li key={t.id} className="group flex items-center gap-2 text-sm text-zinc-200">
                                        <Check className="size-3.5 shrink-0 text-zinc-500" />
                                        {t.title}
                                        <span className="ml-auto text-[11px] text-zinc-500 shrink-0">
                                          {t.dueOffsetDays === 0 ? "day 1" : `in ${t.dueOffsetDays}d`}
                                        </span>
                                        <button
                                          onClick={() => deleteTask(g.id, t.id)}
                                          aria-label={`Remove task ${t.title}`}
                                          className="opacity-0 group-hover:opacity-100 text-zinc-600 hover:text-red-300 transition-all shrink-0"
                                        ><X className="size-3.5" /></button>
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              )}
                              {g.measure && (
                                <div>
                                <div className="flex items-center gap-2 text-sm text-zinc-200 flex-wrap">
                                  <TrendingUp className="size-3.5 shrink-0" style={{ color: g.pillarColor }} />
                                  <span>{g.measure.start} →</span>
                                  <input
                                    type="number"
                                    value={g.measure.target}
                                    onChange={(e) => { const v = Number(e.target.value); if (Number.isFinite(v) && v !== g.measure!.start) editMeasure(g.id, { target: v }) }}
                                    aria-label={`Target for ${g.title}`}
                                    className="w-24 bg-white/5 border border-white/10 rounded-md px-2 py-0.5 text-sm text-white focus:outline-none focus:border-white/25 tabular-nums"
                                  />
                                  <span className="text-zinc-400">{g.measure.unit}</span>
                                  <span className="flex items-center gap-1 ml-2">
                                    <button
                                      onClick={() => editMeasure(g.id, { steps: Math.max(2, g.measure!.steps - 1) })}
                                      disabled={g.measure.steps <= 2}
                                      aria-label="Fewer milestones"
                                      className="size-4.5 rounded border border-white/15 text-zinc-400 hover:bg-white/10 disabled:opacity-30 flex items-center justify-center"
                                    ><Minus className="size-3" /></button>
                                    <span className="text-[11px] text-zinc-400 tabular-nums">{g.measure.steps} milestones</span>
                                    <button
                                      onClick={() => editMeasure(g.id, { steps: Math.min(12, g.measure!.steps + 1) })}
                                      disabled={g.measure.steps >= 12}
                                      aria-label="More milestones"
                                      className="size-4.5 rounded border border-white/15 text-zinc-400 hover:bg-white/10 disabled:opacity-30 flex items-center justify-center"
                                    ><Plus className="size-3" /></button>
                                  </span>
                                </div>
                                {/* M11 — the actual rungs, visible (feeds off the same generator the curve editor uses) */}
                                {g.measure.target !== g.measure.start && (
                                  <div className="flex items-center gap-1.5 mt-2 flex-wrap" aria-label={`Milestone ladder for ${g.title}`}>
                                    {generateMilestoneLadder(measureToLadderConfig(g.measure)).map((m, i, arr) => (
                                      <span key={m.step} className="flex items-center gap-1.5">
                                        <span
                                          className="text-[11px] px-2 py-0.5 rounded-full border tabular-nums"
                                          style={{ color: g.pillarColor, borderColor: `${g.pillarColor}40`, backgroundColor: `${g.pillarColor}14` }}
                                        >
                                          {m.value}
                                        </span>
                                        {i < arr.length - 1 && <span className="text-zinc-600 text-[10px]">→</span>}
                                      </span>
                                    ))}
                                    <span className="text-[10px] text-zinc-500 ml-1">{g.measure.unit}</span>
                                  </div>
                                )}
                                </div>
                              )}
                              {/* v17 — the same ramp editor the room row uses,
                                  so a ramp reads and edits identically wherever
                                  you meet the goal. */}
                              {g.rampSteps && g.rampSteps.length > 0 ? (
                                <RampEditor steps={g.rampSteps} color={g.pillarColor} onChange={(steps) => editGoalRamp(g.id, steps)} />
                              ) : (
                                <button
                                  onClick={() => {
                                    const f = g.habits[0]?.daysPerWeek ?? 3
                                    editGoalRamp(g.id, [{ frequencyPerWeek: Math.max(1, f - 1), durationWeeks: 4 }, { frequencyPerWeek: f, durationWeeks: 8 }])
                                  }}
                                  className="text-[11px] text-zinc-500 hover:text-zinc-300 underline decoration-dotted transition-colors self-start"
                                >
                                  + Ease into it. Build a ramp instead of starting at full load
                                </button>
                              )}

                              <RefineRow
                                busy={refiningId === g.id}
                                error={refineErrs[g.id] ?? ""}
                                onRefine={(instruction) => refineGoal(g.id, instruction)}
                              />
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                    )}

                    {/* v17 — the framework is the product: driving force,
                        values, the blueprint and the routine library are part of
                        the flow now, not hidden behind an "optional" drawer. */}
                    {/* PLM OS M1 — the Driving Force: purpose + reasons + identity */}
                    <div id="lm-driving-force" className="mt-6 mb-6 scroll-mt-20">
                      <div className="flex items-center gap-2 mb-3">
                        <Sparkles className="size-3.5 text-violet-300" />
                        <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-violet-200/90">Your driving force</span>
                        <span className="h-px flex-1 bg-gradient-to-r from-violet-400/30 to-transparent" />
                      </div>
                      <PrincipleCardView id="purpose" />
                      <DrivingForceBuilder df={drivingForce} onChange={setDrivingForce} defaultName={accountName} />
                      <IdentityStackCard />
                    </div>
                    {/* The values exercise (optional) */}
                    <div id="lm-values" className="mb-6 scroll-mt-20">
                      <FoundationSection
                        part="values"
                        committedAt={committedAt}
                        values={valuesList}
                        awayValues={awayValues}
                        manifestoName={manifestoName}
                        manifestoLines={manifestoLines}
                        valueRules={valueRules}
                        onManifestoName={setManifestoName}
                        onManifestoLines={setManifestoLines}
                        onValueRules={setValueRules}
                        ruleWork={ruleWork}
                        onRuleWork={setRuleWork}
                        onAddIncantation={(card) => setIncantations((p) => (p.includes(card) ? p : [...p, card]))}
                        onCommit={() => setCommittedAt(today)}
                        onSetValues={setValuesList}
                        onSetAway={setAwayValues}
                      />
                    </div>

                    {/* PLM — the Life Mastery Blueprint: his hierarchy, your coverage */}
                    <div className="mt-10">
                      <div className="flex items-center gap-2 mb-3">
                        <Telescope className="size-3.5 text-violet-300" />
                        <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-violet-200/90">Your Life Mastery Blueprint</span>
                        <span className="h-px flex-1 bg-gradient-to-r from-violet-400/30 to-transparent" />
                      </div>
                      <p className="text-xs text-zinc-500 mb-4 max-w-2xl">
                        How to read it: <span className="text-zinc-300">bottom-up, in order of importance</span>. Health + fitness is
                        the base because everything above runs on your body; mind &amp; beliefs sit next because your thoughts color
                        your emotions; only then relationships, mission, money. You can&apos;t pour into those from an empty foundation.
                        Spirituality is the dashed circle: not a level, the thing that surrounds all of it. The frame is the method.
                        Vision answers <span className="text-zinc-300">what</span>, purpose answers <span className="text-zinc-300">why</span>,
                        goals answer <span className="text-zinc-300">how</span>. Dim rows = areas your plan doesn&apos;t feed yet:
                        add a goal or routine there, or leave them for a later season on purpose.
                      </p>
                      <BlueprintPyramid covered={blueprintCoverage(activeGoals)} />
                    </div>

                    {/* PLM OS M2 — define your 10 per area (the wheel's reference) */}
                    {/* M1 — "Define your 10s" was absorbed into each room's
                        journey (beat 1): a compact pointer replaces the grid. */}
                    <div id="lm-tens" className="mt-10 scroll-mt-20">
                      <p className="text-xs text-zinc-500">
                        <span className="text-zinc-300">Your 10s live in the rooms</span> — {Object.keys(yourTens).filter((k) => (yourTens[k] ?? "").trim()).length} of {LIFE_MASTERY_AREAS.length} written.{" "}
                        <button
                          onClick={() => document.getElementById("lm-vision")?.scrollIntoView({ behavior: "smooth" })}
                          className="underline decoration-dotted text-zinc-300 hover:text-white transition-colors"
                        >
                          Open a room on the wheel
                        </button>{" "}
                        to write the missing ones — the weekly rating measures against them.
                      </p>
                    </div>

                    {/* M10 — common routines the vision didn't surface, by activity category */}
                    <div className="mt-10">
                      <div className="flex items-center gap-2 mb-3">
                        <Plus className="size-3.5 text-violet-300" />
                        <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-violet-200/90">Add common routines</span>
                        <span className="h-px flex-1 bg-gradient-to-r from-violet-400/30 to-transparent" />
                      </div>
                      <p className="text-xs text-zinc-500 mb-4">
                        Your plan only contains what your vision asked for. These are the usual high-leverage habits.
                        Unfold a category to pick; the chips show which life areas it feeds.
                      </p>
                      <RoutineLibrary added={addedHabitIds} onToggleItem={toggleRoutineItem} />
                    </div>


                  </>
                )}
              </div>
            </>
          )
        )}

        {/* v17 — STAGE 2: your life, whole. */}
        {/* Gated on WORK EXISTING, not on the vision having been analysed.
            `result` is only set by the prose path, so a user who pasted a list
            or typed goals into a room saw a blank screen 2 — the same gate
            that silently stopped their whole plan being saved. `areaGroups` is
            derived from goals, not from intents, so it renders fine without it. */}
        {page === "doing" && (<>
  {/* PLM M3 — the ordered morning ritual, separate from goal habits */}
  <div id="lm-ritual-builder" className="mt-10 scroll-mt-20">
    <div className="flex items-center gap-2 mb-3">
      <Sparkles className="size-3.5 text-violet-300" />
      <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-violet-200/90">Design your morning ritual</span>
      <span className="h-px flex-1 bg-gradient-to-r from-violet-400/30 to-transparent" />
    </div>
    <p className="text-xs text-zinc-500 mb-4">
      How you start the day decides how the day goes. An ordered sequence you run every morning.
      It lives above your goals on the Track view and doesn&apos;t count against your daily habit budget.
    </p>
    <PrincipleCardView id="ritual" />
    <RitualBuilder
      ritual={ritual}
      vision={visionDisplayText || text}
      onPreset={onRitualPreset}
      onToggleStep={onRitualToggleStep}
      onMove={onRitualMove}
      onClear={() => setRitual(null)}
      onWeeklyToggle={onWeeklyRitualToggle}
      auditItems={ritualAudit}
      onAuditChange={setRitualAudit}
    />
  </div>

  {/* M4 — balance the whole plan: priority, budget, dosing timeline */}
  {balanced && (
    <div id="lm-balance" className="mt-10 scroll-mt-20">
      <div className="flex items-center gap-2 mb-3">
        <TrendingUp className="size-3.5 text-sky-300" />
        <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-sky-200/90">Balance your weeks</span>
        <span className="h-px flex-1 bg-gradient-to-r from-sky-400/30 to-transparent" />
      </div>
      <p className="text-xs text-zinc-500 mb-4">
        Goals phase in by priority so week one stays light. Drag to reprioritise; cap how much one day may ask of you.
      </p>

      <div className="grid gap-6 md:grid-cols-2">
        <div>
          <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-500">
            Priority — #1 starts first{focusAreaIds.length > 0 ? " · seeded by your focus rooms, drag to override" : ""}
          </span>
          <div className="mt-2">
            <SortablePriorityList
              items={activeGoals.map((g) => ({ id: g.id, label: g.title, color: g.pillarColor }))}
              onReorder={reorderActiveGoals}
            />
          </div>

          <div className="flex items-center gap-3 mt-4">
            <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-500">Daily budget</span>
            <button
              onClick={() => setDailyBudget((b) => Math.max(1, b - 1))}
              disabled={dailyBudget <= 1}
              className="size-6 rounded-md border border-white/15 text-zinc-300 hover:bg-white/10 disabled:opacity-30 flex items-center justify-center"
              aria-label="Lower daily budget"
            ><Minus className="size-3.5" /></button>
            <span className="text-sm text-white font-medium tabular-nums">≤ {dailyBudget}/day</span>
            <button
              onClick={() => setDailyBudget((b) => Math.min(8, b + 1))}
              disabled={dailyBudget >= 8}
              className="size-6 rounded-md border border-white/15 text-zinc-300 hover:bg-white/10 disabled:opacity-30 flex items-center justify-center"
              aria-label="Raise daily budget"
            ><Plus className="size-3.5" /></button>
          </div>

          {/* Weekday load meter at steady state */}
          <div className="mt-4">
            <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-500">A steady week, per day</span>
            <div className="flex items-end gap-1.5 mt-2 h-16">
              {balanced.dayLoads.map((n, i) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-1">
                  <span className="text-[10px] text-zinc-400 tabular-nums">{n}</span>
                  <div
                    className="w-full rounded-sm bg-sky-400/60"
                    style={{ height: `${(n / Math.max(1, dailyBudget)) * 40}px`, minHeight: n > 0 ? 3 : 0 }}
                  />
                  <span className="text-[9px] text-zinc-600">{["M", "T", "W", "T", "F", "S", "S"][i]}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div>
          <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-500">Phase-in timeline</span>
          <div className="mt-2 space-y-2">
            {balanced.weeks.map((w) => (
              <div key={w.week} className="rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-white">Week {w.week}</span>
                  <span className="text-[10px] text-zinc-500 tabular-nums">{w.load}/{w.cap} weekly slots</span>
                  <div className="ml-auto h-1.5 w-24 rounded-full bg-white/10 overflow-hidden">
                    <div className="h-full rounded-full bg-sky-400/70" style={{ width: `${Math.min(100, (w.load / Math.max(1, w.cap)) * 100)}%` }} />
                  </div>
                </div>
                {w.startingHabitIds.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {w.startingHabitIds.map((hid) => {
                      const h = balanced.habits.find((x) => x.habitId === hid)!
                      return (
                        <span
                          key={hid}
                          className="text-[10px] px-2 py-0.5 rounded-full border"
                          style={{ color: pillarTextColor(h.pillarColor), borderColor: `${h.pillarColor}59`, backgroundColor: `${h.pillarColor}1a` }}
                        >
                          + {h.title} · {h.daysPerWeek}×/wk
                        </span>
                      )
                    })}
                  </div>
                )}
              </div>
            ))}
          </div>

          {balanced.overflowHabitIds.length > 0 && (
            <div className="mt-3 rounded-lg border border-amber-400/30 bg-amber-500/10 px-3 py-2">
              <div className="flex items-center gap-1.5 text-[11px] font-medium text-amber-300">
                <AlertTriangle className="size-3.5" /> Doesn&apos;t fit your budget
              </div>
              <ul className="mt-1 space-y-0.5">
                {balanced.overflowHabitIds.map((hid) => {
                  const h = balanced.habits.find((x) => x.habitId === hid)!
                  return <li key={hid} className="text-xs text-amber-200/80">{h.title} ({h.daysPerWeek}×/wk) — raise the budget or lower a priority</li>
                })}
              </ul>
            </div>
          )}
        </div>
      </div>

      {balanced.overflowHabitIds.length > 0 && (
        <p className="text-[11px] text-amber-300/80 mt-3 text-center">Heads up: habits over budget won&apos;t be scheduled until you make room.</p>
      )}
    </div>
  )}

        <div id="lm-foundation" className="mt-10">
          <FoundationSection
            part="manifesto"
            committedAt={committedAt}
            values={valuesList}
            awayValues={awayValues}
            manifestoName={manifestoName}
            manifestoLines={manifestoLines}
            valueRules={valueRules}
            onManifestoName={setManifestoName}
            onManifestoLines={setManifestoLines}
            onValueRules={setValueRules}
            ruleWork={ruleWork}
            onRuleWork={setRuleWork}
            onAddIncantation={(card) => setIncantations((p) => (p.includes(card) ? p : [...p, card]))}
            onCommit={() => setCommittedAt(today)}
            onSetValues={setValuesList}
            onSetAway={setAwayValues}
          />
        </div>

        {/* v17 — ONE terminal action. Signing IS the hand-off: the old flow
            ended stage 3 in a text hint while the real product sat behind a
            header pill you had to discover. */}
        <div className="text-center mt-8">
          <button
            onClick={() => { if (!committedAt) setCommittedAt(today); confirmPlan() }}
            disabled={!goals || goals.length === 0}
            title={goals && goals.length > 0 ? undefined : "Set at least one goal first"}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-violet-500/20 border border-violet-500/40 text-violet-100 hover:bg-violet-500/30 disabled:opacity-40 disabled:cursor-not-allowed transition-all text-sm font-semibold"
          >
            <Check className="size-4" />
            {confirmed ? "Update plan & back to tracking" : committedAt ? "Start tracking" : "Sign & start tracking"}
          </button>
          <p className="text-[11px] text-zinc-500 mt-2">
            {confirmed
              ? "Your plan is live. This returns you to it."
              : "This signs your manifesto and opens your daily loop."}
          </p>
        </div>
        </>)}

        {/* v25 — the only navigation buttons in the whole intake sit here, at
            the page boundary. Inside a page you scroll and the next question
            appears on its own. */}
        <div className="sticky bottom-0 -mx-6 mt-10 px-6 py-3 bg-zinc-950/90 backdrop-blur-sm border-t border-white/10 flex items-center justify-between gap-3">
          {page === "areas" && activeRoomId ? (
            <button onClick={() => openRoom(null)} className="text-xs text-zinc-400 hover:text-white transition-colors">← Back to the wheel</button>
          ) : pageIndex > 0 ? (
            <button onClick={() => setPage(visiblePages[pageIndex - 1].id)} className="text-xs text-zinc-400 hover:text-white transition-colors">← Back</button>
          ) : <span />}
          {nextPage ? (
            <button
              onClick={() => { openRoom(null); goNextIntakePage() }}
              disabled={!isIntakePageComplete(liveState, page)}
              title={blockingQuestion ? `Still open: ${blockingQuestion.question}` : undefined}
              className="inline-flex items-center gap-1.5 text-sm font-medium px-4 py-2 rounded-lg bg-violet-500/20 border border-violet-500/40 text-violet-100 hover:bg-violet-500/30 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
            >
              {nextPageLabel} →
            </button>
          ) : (
            <span className="text-[11px] text-zinc-500">Sign below to start tracking.</span>
          )}
        </div>
      </div>
      )}
    </div>
  )
}
