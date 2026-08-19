"use client"

/**
 * /test/life-mastery — the North Star flow.
 *
 * Nine steps, and they are tabs rather than gates on purpose. The order is the
 * order the work wants to happen in, but somebody who arrives wanting to jot
 * three goals down should be able to, and forcing the sequence on them only
 * loses the goals. Nothing on any tab is gated either: a goal with no date and
 * no why still saves, and what is outstanding is listed in one panel under
 * every tab rather than standing in the way.
 *
 *   1. North star     — the life you are aiming at, why, your values, who you are.
 *   2. Your 10s       — the twelve areas: your 10, your rating, why the area
 *                       matters, what it asks you to value, who you are in it,
 *                       and the four routines already running underneath.
 *   3. The one thing  — the single change the next few years are for.
 *   4. Where to start — THE FORK. Three doors: what you want, what you will do,
 *                       or one routine. Nothing before it is optional and
 *                       nothing after it is an order.
 *   5. Templates      — the catalogue, every area open. Take what is yours.
 *   6. Customize      — build a training week from scratch: days, lifts, reps.
 *   7. Systems        — what you actually do about it, and what each one moves.
 *   8. Experiences    — everything you would be glad to have done, area by area.
 *   9. Focus & season — which two or three areas this season is about.
 *  10. Values         — what you are ranking your life by, in order.
 *  11. Commit         — read it back, name what could go wrong, say yes to it.
 *  12. Track          — what the next weeks look like, and push the goals into
 *                       your real goals so they get counted.
 *  13. Today          — the one step that asks what you DID. Today's list,
 *                       ticked off, and nothing to set up.
 *
 * The order here is TAB_ORDER's; keep the two together or the rail and the
 * comment start describing different pages.
 *
 * Steps 2 and 5 were one tab. Merged, the assessment sat above a goal editor
 * tall enough to bury it, so the rating was the only part of it anyone
 * finished. They split along the honest line: where you stand, then what you
 * will do. Each has its own dialog for one area, and each links to the other.
 *
 * Steps 5 and 6 were one tab too, with a switch under the wheel, and they are
 * two again — the same body, rendered twice — because the fork sends people to
 * one or the other by name and a door that lands you on a toggle has not taken
 * you anywhere.
 *
 * Runs on localStorage. Every step but the last calls no API and touches no
 * database; the last step, Track, is the exception and the point of the
 * exception —
 * it pushes the goals into `user_goals` and renders the real goals hub on
 * them, because a plan that is only ever read back is a plan nobody runs. It
 * is the only step that needs an account, and it writes nothing until pressed.
 *
 * The twelve-area version this replaced is preserved at /test/life-mastery-v1,
 * and the whole system with rituals and weekly evaluation is at
 * /test/vision-plan.
 */

import { useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { ArrowLeft, ChevronDown } from "lucide-react"
import type { HabitRampStep, MilestoneLadderConfig, NorthStarTabId, NsArea, NsAreaReview, NsGoal, NsPlan, VisionGoalType } from "@/src/goals/types"
import { COMMIT_EDIT_COPY, NORTH_STAR_STORAGE_KEY, NS_TRACK_RUN_KEY, SCORED_TABS, TAB_BLURBS, TAB_LABELS, TAB_ORDER, TODO_COPY, WORKSHOP_TABS } from "@/src/goals/data/northStar"
import type { RoutineNeed } from "@/src/goals/data/northStarBuild"
import type { GuideQuestionId } from "@/src/goals/data/northStarGuide"
import * as ns from "@/src/goals/northStarService"
import * as nsTrack from "@/src/goals/northStarTrackService"
import { SNAPSHOT_DEBOUNCE_MS, sendSnapshot, startSync, stopSync, syncIsOff } from "@/src/goals/planSnapshotClient"
import { StarTab } from "./StarTab"
import { NowTab } from "./NowTab"
import { FocusTab } from "./FocusTab"
import { MilestonesTab, SystemLinks, type SystemHandlers } from "./MilestonesTab"
import { GoalOverview } from "./GoalOverview"
import { BuildBoard } from "./BuildBoard"
import { OneThingTab, type OneThingTabHandlers } from "./OneThingTab"
import { PathPicker } from "./PathPicker"
import { TrackTab } from "./TrackTab"
import { TodayTab } from "./TodayTab"
import { AreaDialog } from "./AreaDialog"
import { AreaGoalsDialog } from "./AreaGoalsDialog"
import { ReviewTab } from "./ReviewTab"
import { CommitTab } from "./CommitTab"
import { ValuesSoFar } from "./ValuesSoFar"
import { ValuesWork } from "./ValuesWork"
import { CustomizeTab } from "./CustomizeTab"

/**
 * A fresh run id: what pushed goals are tagged with alongside their plan id.
 *
 * `randomUUID` where it exists, and a random string where it does not — this
 * only has to be different from the last one on the same machine, not globally
 * unique, so an older browser gets the fallback rather than an exception.
 */
function newRunId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") return crypto.randomUUID().slice(0, 8)
  return Math.random().toString(36).slice(2, 10)
}

export function NorthStarFlow() {
  const [plan, setPlan] = useState<NsPlan>(ns.emptyNsPlan)
  const [loaded, setLoaded] = useState(false)
  const [tab, setTab] = useState<NorthStarTabId>("star")
  const [confirmReset, setConfirmReset] = useState(false)
  /**
   * WHICH RUN OF THE PLAN THIS IS, for the goals pushed on the track step.
   *
   * Read on the client and minted if absent, because plan goal ids restart at
   * g1 after "start over" and a pushed goal has to stay attached to the plan it
   * came from. Null until the effect below runs; the track step is the only
   * thing that needs it and it does not render before the plan has loaded.
   */
  const [runId, setRunId] = useState<string | null>(null)
  const [copied, setCopied] = useState<"idle" | "done" | "failed">("idle")
  const [readBackOpen, setReadBackOpen] = useState(false)
  // Both area dialogs are owned here, so only one is ever open and moving from
  // an area's rating to its goals is a tab switch rather than a re-find.
  const [nowAreaId, setNowAreaId] = useState<string | null>(null)
  const [planAreaId, setPlanAreaId] = useState<string | null>(null)
  const [nowGoalId, setNowGoalId] = useState<string | null>(null)
  // Owned here too, so opening a routine from inside an area dialog can close
  // the dialog and expand the routine on the surface underneath.
  const [openRoutineId, setOpenRoutineId] = useState<string | null>(null)
  // Read once, on the client. Rendering "today" from the server would hydrate
  // with yesterday's date for anyone west of the server.
  const [today, setToday] = useState<string | null>(null)
  /** Whether the server copy is running, so the footer can say so honestly. */
  const [synced, setSynced] = useState<"off" | "on" | "failed" | "unknown">("unknown")

  useEffect(() => {
    setToday(ns.todayISO())
    setSynced(syncIsOff() ? "off" : "unknown")
    const saved = ns.loadNsPlan(window.localStorage.getItem(NORTH_STAR_STORAGE_KEY))
    if (saved) setPlan(saved)
    /* The run id must never be the reason this page does not open.
       It is one string for one step, and it used to sit in front of
       `setLoaded(true)` with an unguarded `setItem` between them — a browser
       refusing storage (private mode, quota) would throw here and strand the
       whole flow on "Opening your plan…", the whole thing broken by its last step.
       A run that cannot be persisted still works for this session; it just
       cannot be recognised after a reload, which the track step says out loud
       rather than silently re-pushing. */
    let run = newRunId()
    try {
      run = window.localStorage.getItem(NS_TRACK_RUN_KEY) ?? run
      window.localStorage.setItem(NS_TRACK_RUN_KEY, run)
    } catch {
      // Storage is unavailable. The plan's own save will say so; this step
      // carries on with a session-only run.
    }
    setRunId(run)
    setLoaded(true)
  }, [])

  // Saving before the load has finished would write the empty plan over the
  // saved one on every refresh.
  useEffect(() => {
    if (!loaded) return
    window.localStorage.setItem(NORTH_STAR_STORAGE_KEY, ns.serializeNsPlan(plan))
  }, [plan, loaded])

  /**
   * The same plan, mirrored to the server a few seconds after you stop typing.
   *
   * localStorage stays the source of truth — this page has to work with the
   * network on fire — so this is a copy, debounced, and silent about failure.
   * An untouched plan is never sent, so a browser that opened the page and left
   * again never appears in the table at all.
   */
  useEffect(() => {
    if (!loaded || !today || ns.planIsUntouched(plan) || syncIsOff()) return
    const timer = window.setTimeout(() => {
      void sendSnapshot(ns.serializeNsPlan(plan), ns.planAsText(plan, today)).then((ok) => setSynced(ok ? "on" : "failed"))
    }, SNAPSHOT_DEBOUNCE_MS)
    return () => window.clearTimeout(timer)
  }, [plan, loaded, today])

  const progress = ns.nsProgress(plan)
  const states = ns.stepStates(plan)
  const tabIndex = TAB_ORDER.indexOf(tab)
  const readBack = loaded && today ? ns.planAsText(plan, today) : ""
  const todos = loaded && today ? ns.planTodos(plan, today) : []

  const starHandlers = {
    onStar: useCallback((text: string) => setPlan((p) => ns.setNorthStar(p, text)), []),
    onHorizon: useCallback((years: number) => setPlan((p) => ns.setHorizon(p, years)), []),
    onRung: useCallback((rungId: string, text: string) => setPlan((p) => ns.setRung(p, rungId, text)), []),
    onAnswer: useCallback((promptId: string, text: string) => setPlan((p) => ns.setAnswer(p, promptId, text)), []),
  }

  /** The values exercise: two lists, and the four ways the order can change. */
  const valuesHandlers = useMemo(() => ({
    onCurrentValues: (values: string[]) => setPlan((p) => ns.setCurrentValues(p, values)),
    onValues: (values: string[]) => setPlan((p) => ns.setValues(p, values)),
    // A drop passes the index it landed on, not a direction, so a long drag
    // slides the rows between along instead of swapping the two ends.
    onMoveValue: (value: string, toIndex: number) => setPlan((p) => ns.moveValueTo(p, value, toIndex)),
    onRankAbove: (winner: string, loser: string) => setPlan((p) => ns.rankValueAbove(p, winner, loser)),
  }), [])

  const areaHandlers = useMemo(() => ({
    onUpdateArea: (areaId: string, patch: Partial<Omit<NsArea, "id" | "custom">>) => setPlan((p) => ns.updateArea(p, areaId, patch)),
    onAddArea: (label: string) => setPlan((p) => ns.addArea(p, label)),
    onRemoveArea: (areaId: string) => setPlan((p) => ns.removeArea(p, areaId)),
    onAddRoutine: (blueprintId: string) => setPlan((p) => ns.addRoutine(p, blueprintId)),
  }), [])

  const routineHandlers = useMemo(() => ({
    onRename: (id: string, label: string) => setPlan((p) => ns.updateRoutine(p, id, { label })),
    onArea: (id: string, areaId: string | null) => setPlan((p) => ns.updateRoutine(p, id, { areaId })),
    onServes: (id: string, areaIds: string[]) => setPlan((p) => ns.setRoutineServes(p, id, areaIds)),
    onToggleStep: (id: string, stepId: string) => setPlan((p) => ns.toggleRoutineStep(p, id, stepId)),
    onAddCustomStep: (id: string, title: string, minutes: number, daysPerWeek: number) => setPlan((p) => ns.addCustomStep(p, id, title, minutes, daysPerWeek)),
    onRemoveStep: (id: string, stepId: string) => setPlan((p) => ns.removeStep(p, id, stepId)),
    onStepDays: (id: string, stepId: string, daysPerWeek: number) => setPlan((p) => ns.updateStep(p, id, stepId, { daysPerWeek })),
    onStepMinutes: (id: string, stepId: string, minutes: number) => setPlan((p) => ns.updateStep(p, id, stepId, { minutes })),
    onMoveStep: (id: string, index: number, dir: -1 | 1) => setPlan((p) => ns.moveStep(p, id, index, dir)),
    onPreset: (id: string, presetId: string) => setPlan((p) => ns.applyRoutinePreset(p, id, presetId)),
    onClearSteps: (id: string) => setPlan((p) => ns.clearRoutineSteps(p, id)),
    onDays: (id: string, daysPerWeek: number) => setPlan((p) => ns.updateRoutine(p, id, { daysPerWeek })),
    onRemoveRoutine: (id: string) => setPlan((p) => ns.removeRoutine(p, id)),
    onApplySplit: (id: string, splitId: string) => setPlan((p) => ns.applySplit(p, id, splitId)),
    onAddSplitDay: (id: string) => setPlan((p) => ns.addSplitDay(p, id)),
    onRenameSplitDay: (id: string, dayId: string, name: string) => setPlan((p) => ns.renameSplitDay(p, id, dayId, name)),
    onMoveSplitDay: (id: string, index: number, dir: -1 | 1) => setPlan((p) => ns.moveSplitDay(p, id, index, dir)),
    onRemoveSplitDay: (id: string, dayId: string) => setPlan((p) => ns.removeSplitDay(p, id, dayId)),
    onClearSplit: (id: string) => setPlan((p) => ns.clearSplit(p, id)),
  }), [])

  const goalHandlers = useMemo(() => ({
    onUpdate: (id: string, patch: Partial<Omit<NsGoal, "id">>) => setPlan((p) => ns.updateGoal(p, id, patch)),
    onUpdateGoal: (id: string, patch: { title: string }) => setPlan((p) => ns.updateGoal(p, id, patch)),
    onSetType: (id: string, type: VisionGoalType) => setPlan((p) => ns.setGoalType(p, id, type)),
    onRemove: (id: string) => setPlan((p) => ns.removeGoal(p, id)),
    onLadder: (id: string, ladder: MilestoneLadderConfig) => setPlan((p) => ns.setLadder(p, id, ladder)),
    onRamp: (id: string, steps: HabitRampStep[] | null) => setPlan((p) => ns.setRamp(p, id, steps)),
    onLink: (fromId: string, toId: string) => setPlan((p) => ns.linkGoal(p, fromId, toId)),
    onUnlink: (fromId: string, toId: string) => setPlan((p) => ns.unlinkGoal(p, fromId, toId)),
    onAddObstacle: (id: string, what: string) => setPlan((p) => ns.addObstacle(p, id, what)),
    onUpdateObstacle: (id: string, obstacleId: string, patch: { what?: string; counter?: string }) => setPlan((p) => ns.updateObstacle(p, id, obstacleId, patch)),
    onRemoveObstacle: (id: string, obstacleId: string) => setPlan((p) => ns.removeObstacle(p, id, obstacleId)),
    onAddBelief: (id: string, old: string) => setPlan((p) => ns.addBelief(p, id, old)),
    onUpdateBelief: (id: string, beliefId: string, patch: { old?: string; useful?: boolean | null; evidence?: string; replacement?: string }) =>
      setPlan((p) => ns.updateBelief(p, id, beliefId, patch)),
    onRemoveBelief: (id: string, beliefId: string) => setPlan((p) => ns.removeBelief(p, id, beliefId)),
    onAddCheckpoint: (id: string, title: string) => setPlan((p) => ns.addCheckpoint(p, id, title)),
    onUpdateCheckpoint: (id: string, checkpointId: string, patch: { title?: string; done?: boolean; celebration?: string }) => setPlan((p) => ns.updateCheckpoint(p, id, checkpointId, patch)),
    onSetMilestones: (id: string, spec: { from: number; to: number; count: number; unit?: string; prefix?: string }) => setPlan((p) => ns.setMilestones(p, id, spec)),
    onSetProgression: (id: string, rungs: string[]) => setPlan((p) => ns.setProgression(p, id, rungs)),
    onRemoveCheckpoint: (id: string, checkpointId: string) => setPlan((p) => ns.removeCheckpoint(p, id, checkpointId)),
    onSetPriority: (id: string, rank: number) => setPlan((p) => ns.setGoalPriority(p, id, rank)),
    onMovePriority: (id: string, dir: -1 | 1) => setPlan((p) => ns.moveGoalPriority(p, id, dir)),
    onAddAction: (id: string, title: string, daysPerWeek: number) => setPlan((p) => ns.addAction(p, id, title, daysPerWeek)),
    onUpdateAction: (id: string, habitId: string, patch: { title?: string; daysPerWeek?: number }) => setPlan((p) => ns.updateAction(p, id, habitId, patch)),
    onRemoveAction: (id: string, habitId: string) => setPlan((p) => ns.removeAction(p, id, habitId)),
    onAddReasons: (id: string, text: string) => setPlan((p) => ns.addReasons(p, id, text)),
    onRemoveReason: (id: string, index: number) => setPlan((p) => ns.removeReason(p, id, index)),
    onSetMetric: (id: string, metric: "daily_area" | null) => setPlan((p) => ns.setGoalMetric(p, id, metric)),
    onSetServes: (id: string, areaIds: string[]) => setPlan((p) => ns.setGoalServes(p, id, areaIds)),
    onSeasonFocus: (id: string) => setPlan((p) => ns.setSeasonFocus(p, id)),
    onGoToTab: (t: NorthStarTabId) => setTab(t),
  }), [])

  /**
   * The focus tab: which areas, the one thing, what order.
   *
   * Every one of these already existed — the area picker was the guide's first
   * step, the one thing was a banner on the goals tab, the order was the
   * priority list at the bottom of it. What is new is that they are in one
   * place and that place is a tab of its own.
   */
  const focusHandlers = useMemo(() => ({
    onRemoveGoal: (goalId: string) => setPlan((p) => ns.removeGoal(p, goalId)),
    onOpenRoutine: (routineId: string) => { setPlanAreaId(null); setOpenRoutineId(routineId); setTab("systems") },
    onToggleArea: (areaId: string) => setPlan((p) => ns.toggleSeasonArea(p, areaId)),
    onAddArea: (label: string) => setPlan((p) => ns.addArea(p, label)),
    onSeasonFocus: (id: string) => setPlan((p) => ns.setSeasonFocus(p, id)),
    onAnswer: (key: string, text: string) => setPlan((p) => ns.setAnswer(p, key, text)),
    onSetPriority: (id: string, rank: number) => setPlan((p) => ns.setGoalPriority(p, id, rank)),
    onMovePriority: (id: string, dir: -1 | 1) => setPlan((p) => ns.moveGoalPriority(p, id, dir)),
    onGoToTab: (t: NorthStarTabId) => setTab(t),
  }), [])

  const reviewHandlers = useMemo(() => ({
    onAreaReview: (areaId: string, patch: Partial<NsAreaReview>) => setPlan((p) => ns.setAreaReview(p, areaId, patch)),
    onDailyRating: (date: string, areaId: string, score: number) => setPlan((p) => ns.setDailyRating(p, date, areaId, score)),
    onAnswer: (promptId: string, text: string) => setPlan((p) => ns.setAnswer(p, promptId, text)),
    onGoToGoals: () => setTab("milestones"),
    onGoToNow: () => setTab("now"),
  }), [])

  /** The two halves of one area, and the move between them. */
  const openAreaGoals = useCallback((areaId: string) => {
    setNowAreaId(null)
    setPlanAreaId(areaId)
    setNowGoalId(null)
    setTab("milestones")
  }, [])

  const openAreaRating = useCallback((areaId: string) => {
    setPlanAreaId(null)
    setNowGoalId(null)
    setNowAreaId(areaId)
    setTab("now")
  }, [])

  const setSeasonFocus = useCallback((id: string) => setPlan((p) => ns.setSeasonFocus(p, id)), [])

  const addGoal = useCallback((areaId: string, title: string, type: VisionGoalType) => {
    setPlan((p) => ns.addGoal(p, areaId, title, type))
  }, [])

  const addTarget = useCallback((areaId: string, targetId: string) => {
    setPlan((p) => ns.addGoalFromTarget(p, areaId, targetId))
  }, [])

  const addTemplate = useCallback((areaId: string, templateId: string, levelIndex: number) => {
    setPlan((p) => ns.addGoalsFromTemplate(p, areaId, templateId, levelIndex))
  }, [])

  /**
   * The board's own handlers.
   *
   * The two that are new are the cascade: `onApplyNeed` puts the routine a goal
   * set runs on into the stack, and `onTogglePractice` turns a routine step on
   * from inside an area, adding the routine if the stack has not got one. Both
   * go through the same service functions the routine cards use, so a routine
   * built from a goal and a routine built by hand are the same object.
   */
  /** Step 3. The requirements are real goals, so these are goal writers. */
  const oneThingHandlers = useMemo<OneThingTabHandlers>(() => ({
    onAnswer: (key: string, text: string) => setPlan((p) => ns.setAnswer(p, key, text)),
    onSeasonFocus: (id: string) => setPlan((p) => ns.setSeasonFocus(p, id)),
    onAddRequirement: (title: string, areaId?: string) => setPlan((p) => ns.addOneThingRequirement(p, title, areaId)),
    onMarkServes: (goalId: string, on: boolean) => setPlan((p) => ns.markServesOneThing(p, goalId, on)),
    onRemoveGoal: (goalId: string) => setPlan((p) => ns.removeGoal(p, goalId)),
    onGoToTab: (t: NorthStarTabId) => setTab(t),
    onToggleOneThingArea: (areaId: string) => setPlan((p) => ns.toggleOneThingArea(p, areaId)),
  }), [])

    const systemHandlers = useMemo<SystemHandlers>(() => ({
    onLinkStep: (routineId: string, stepId: string, goalId: string, on: boolean) =>
      setPlan((p) => ns.linkStepToGoal(p, routineId, stepId, goalId, on)),
    onLinkGoal: (fromId: string, toId: string, on: boolean) =>
      setPlan((p) => (on ? ns.linkGoal(p, fromId, toId) : ns.unlinkGoal(p, fromId, toId))),
    onAddSystemMilestone: (routineId: string, id: "hours" | "sessions" | "streak", areaId?: string) =>
      setPlan((p) => ns.addSystemMilestone(p, routineId, id, areaId)),
  }), [])

  const boardHandlers = useMemo(() => ({
    onAddTemplate: (areaId: string, templateId: string, level: number) =>
      setPlan((p) => ns.addGoalsFromTemplate(p, areaId, templateId, level)),
    onRemoveTemplate: (areaId: string, templateId: string) => setPlan((p) => ns.removeTemplateGoals(p, areaId, templateId)),
    onAddTarget: (areaId: string, targetId: string) => setPlan((p) => ns.addGoalFromTarget(p, areaId, targetId)),
    onApplyNeed: (need: RoutineNeed) => setPlan((p) => ns.applyRoutineNeed(p, need)),
    onTogglePractice: (blueprintId: string, stepId: string, on: boolean) =>
      setPlan((p) => (on ? ns.addPractice(p, blueprintId, stepId) : ns.removePractice(p, blueprintId, stepId))),
    onSeasonFocus: (areaId: string) => setPlan((p) => ns.setSeasonFocus(p, areaId)),
    onOpenArea: (areaId: string) => { setPlanAreaId(areaId); setNowGoalId(null) },
    // Same writer the build steps use, so a line typed in the catalogue is a
    // real goal in that area rather than a note that lives on this page.
    onAddOwn: (areaId: string, text: string) => setPlan((p) => ns.addGoalsFromDump(p, areaId, text)),
    // A program that is now running in the database, reflected in the plan the
    // page is showing. The enrollment is the source of truth for what gets
    // trained; this keeps the week on screen from disagreeing with it.
    onProgramStarted: (dayNames: string[]) => setPlan((p) => ns.applyProgramToWorkoutRoutine(p, dayNames)),
  }), [])

  /**
   * The guide's handlers.
   *
   * Every answer also marks its question asked, which is why they are separate
   * calls rather than one generic `answer(goalId, question, value)`: what "date"
   * writes and what "why" writes are different fields with different shapes, and
   * flattening that would put a switch inside the service to undo it again.
   */
  const guideHandlers = useMemo(() => ({
    onToggleArea: (areaId: string) => setPlan((p) => ns.toggleSeasonArea(p, areaId)),
    onAddArea: (label: string) => setPlan((p) => ns.addArea(p, label)),
    onAddDump: (areaId: string, text: string) => setPlan((p) => ns.addGoalsFromDump(p, areaId, text)),
    /**
     * The five doors in.
     *
     * `onAnswer` is the same store the review prompts use, which is why the
     * ideal day and the five questions survive a refresh without a new field on
     * the plan: they are answers to questions, and there is already a place
     * answers live.
     */
    onAnswer: (key: string, text: string) => setPlan((p) => ns.setAnswer(p, key, text)),
    onGoToTab: (t: NorthStarTabId) => setTab(t),
    onAddIdealDay: (placements: ns.IdealDayPlacement[]) => setPlan((p) => ns.addIdealDay(p, placements)),
    onAddBlock: (routineId: string, title: string, minutes: number, days: number[], startMin: number) =>
      setPlan((p) => ns.addCustomStep(p, routineId, title, minutes, days.length, undefined, { days, startMin })),
    onPlaceStep: (routineId: string, stepId: string, days: number[], startMin: number | null) =>
      setPlan((p) => ns.placeStep(p, routineId, stepId, days, startMin)),
    onUpdateStep: (routineId: string, stepId: string, patch: { title?: string; minutes?: number }) =>
      setPlan((p) => ns.updateStep(p, routineId, stepId, patch)),
    onRemoveStep: (routineId: string, stepId: string) => setPlan((p) => ns.removeStep(p, routineId, stepId)),
    /** The list that is not goals. */
    onAddExperiences: (text: string, areaId: string | null) => setPlan((p) => ns.addExperiences(p, text, areaId)),
    onToggleExperience: (id: string) => setPlan((p) => ns.toggleExperienceDone(p, id, ns.todayISO())),
    onPromoteExperience: (id: string, areaId: string) => setPlan((p) => ns.promoteExperience(p, id, areaId)),
    onUpdateExperience: (id: string, patch: { areaId?: string | null; title?: string }) => setPlan((p) => ns.updateExperience(p, id, patch)),
    onRemoveExperience: (id: string) => setPlan((p) => ns.removeExperience(p, id)),
    onAddTemplate: (areaId: string, templateId: string, level: number) =>
      setPlan((p) => ns.addGoalsFromTemplate(p, areaId, templateId, level)),
    onAddTarget: (areaId: string, targetId: string) => setPlan((p) => ns.addGoalFromTarget(p, areaId, targetId)),
    onApplyNeed: (need: RoutineNeed) => setPlan((p) => ns.applyRoutineNeed(p, need)),
    onTogglePractice: (blueprintId: string, stepId: string, on: boolean) =>
      setPlan((p) => (on ? ns.addPractice(p, blueprintId, stepId) : ns.removePractice(p, blueprintId, stepId))),
    onRemoveGoal: (goalId: string) => setPlan((p) => ns.removeGoal(p, goalId)),
    onRemoveTemplate: (areaId: string, templateId: string) => setPlan((p) => ns.removeTemplateGoals(p, areaId, templateId)),
    onLadder: (goalId: string, ladder: MilestoneLadderConfig) => setPlan((p) => ns.setLadder(p, goalId, ladder)),
    onProgression: (goalId: string, rungs: string[]) => setPlan((p) => ns.setProgression(p, goalId, rungs)),
    onMilestones: (goalId: string, spec: { from: number; to: number; count: number; unit?: string; prefix?: string }) =>
      setPlan((p) => ns.setMilestones(p, goalId, spec)),
    onUpdateGoal: (goalId: string, patch: { title: string }) => setPlan((p) => ns.updateGoal(p, goalId, patch)),
    onLadderStart: (goalId: string, start: number) => setPlan((p) => ns.setLadderStart(p, goalId, start)),
    onAction: (goalId: string, title: string, daysPerWeek: number) =>
      setPlan((p) => ns.markAsked(ns.addAction(p, goalId, title, daysPerWeek), goalId, "actions")),
    onDate: (goalId: string, date: string) =>
      setPlan((p) => ns.markAsked(ns.updateGoal(p, goalId, { targetDate: date || null }), goalId, "date")),
    onText: (goalId: string, field: "why" | "painWhy", text: string) =>
      setPlan((p) => ns.markAsked(ns.updateGoal(p, goalId, { [field]: text }), goalId, field === "why" ? "why" : "cost")),
    onControllable: (goalId: string, title: string) =>
      setPlan((p) => ns.markAsked(ns.addControllableGoal(p, goalId, title), goalId, "control")),
    onSkip: (goalId: string, question: GuideQuestionId) => setPlan((p) => ns.markAsked(p, goalId, question)),
    /** The builder finishes a goal in place rather than through the queue. */
    onRemoveAction: (goalId: string, habitId: string) => setPlan((p) => ns.removeAction(p, goalId, habitId)),
    onSetType: (goalId: string, type: VisionGoalType) => setPlan((p) => ns.setGoalType(p, goalId, type)),
    onDriverDays: (goalId: string, daysPerWeek: number) => setPlan((p) => ns.updateGoal(p, goalId, { daysPerWeek })),
    onDriverCount: (goalId: string, count: number | null, unit: string) =>
      setPlan((p) => ns.updateGoal(p, goalId, { perWeek: count, unit })),
    /**
     * A climb whose sentence carried no number.
     *
     * "One muscle up" is a target with nothing to parse, and it is exactly the
     * case somebody wants rungs for. The start stays 0 until they say where
     * they are, which is the next question the row asks.
     */
    onSetTarget: (goalId: string, target: number, unit: string) =>
      setPlan((p) => ns.updateGoal(p, goalId, {
        unit: unit.trim(),
        ladder: { start: 0, target, steps: 4, curveTension: 0, controlPoints: [], pins: [] },
      })),
    onOpenArea: (areaId: string) => { setPlanAreaId(areaId); setNowGoalId(null) },
    // Same writer the build steps use, so a line typed in the catalogue is a
    // real goal in that area rather than a note that lives on this page.
    onAddOwn: (areaId: string, text: string) => setPlan((p) => ns.addGoalsFromDump(p, areaId, text)),
  }), [])

  /**
   * The partial reset: goals, their order, the season, the one thing.
   *
   * Everything written on the first two tabs survives, which is the whole
   * point — a plan whose goals went wrong is not a plan whose values did.
   */
  const resetGoals = () => {
    setPlan((p) => ns.resetGoalsAndFocus(p))
    setConfirmReset(false)
    setTab("focus")
    setPlanAreaId(null)
    setNowGoalId(null)
  }

  const reset = () => {
    setPlan(ns.emptyNsPlan())
    /* A NEW RUN, because the id counter starts again at g1.
       Without this the next plan's first goal would carry the tag of the
       discarded plan's first goal, and the push would match it onto that row —
       a goal that never appears, under a title nobody wrote. The goals already
       tracked are left alone: they are real rows with real progress, and
       deleting somebody's goals is not what "clear this page" asks for. */
    const run = newRunId()
    window.localStorage.setItem(NS_TRACK_RUN_KEY, run)
    setRunId(run)
    setConfirmReset(false)
    setTab("star")
    setNowAreaId(null)
    setPlanAreaId(null)
    setNowGoalId(null)
    setOpenRoutineId(null)
  }

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(readBack)
      setCopied("done")
    } catch {
      setCopied("failed")
    }
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <div className="max-w-5xl mx-auto px-6 py-10 pb-28">
        <div className="flex items-center justify-between gap-3 mb-6">
          <Link href="/test" className="inline-flex items-center gap-1.5 text-[12px] text-zinc-500 hover:text-white transition-colors">
            <ArrowLeft className="size-3.5" />
            Test pages
          </Link>
          {confirmReset ? (
            /* Two resets, because they are asked for at different moments. The
               goals and the season are downstream of a decision and get redone
               often; the 10s, the values and the north star took an hour and
               are still true when the goals are wrong. */
            <span className="flex flex-wrap items-center gap-2 text-[11px]">
              <span className="text-zinc-400">Clear what?</span>
              <button onClick={resetGoals} className="text-amber-200 hover:text-amber-100">
                the goals and the season, keep my 10s
              </button>
              <button onClick={reset} className="text-rose-300 hover:text-rose-200">everything</button>
              <button onClick={() => setConfirmReset(false)} className="text-zinc-500 hover:text-zinc-300">nothing, close this</button>
            </span>
          ) : (
            <button onClick={() => setConfirmReset(true)} className="text-[11px] text-zinc-600 hover:text-zinc-300 transition-colors">
              start over
            </button>
          )}
        </div>

        <header className="mb-6">
          <h1 className="text-2xl font-semibold">Life Mastery</h1>
          <p className="text-sm text-zinc-400 mt-1">
            Your north star, the areas under it, the goals that get you there, and an honest look at where you are. Everything saves as you type.
          </p>
        </header>

        {/* The rail. Every tab is reachable at any time. */}
        <nav className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4 mb-8" aria-label="Sections">
          {TAB_ORDER.map((id, i) => {
            const active = id === tab
            const state = states[id]
            const workshop = WORKSHOP_TABS.includes(id)
            return (
              <button
                key={id}
                onClick={() => setTab(id)}
                aria-current={active ? "page" : undefined}
                /* A WORKSHOP STEP LOOKS DIFFERENT FROM A PLAN STEP.
                   Templates and Customize are tools, not sections of the plan
                   the other steps are writing, and the sky accent says so at a
                   glance rather than in a sentence nobody reads. */
                className={`rounded-xl border p-3 text-left transition-colors ${
                  active
                    ? workshop
                      ? "border-sky-400/45 bg-sky-500/10"
                      : "border-violet-400/40 bg-violet-500/10"
                    : workshop
                      ? "border-sky-400/20 bg-sky-500/[0.03] hover:border-sky-400/40"
                      : "border-white/10 bg-white/[0.02] hover:border-white/25"
                }`}
              >
                <span className="flex items-center gap-2">
                  <span className={`inline-flex items-center justify-center size-5 rounded-full text-[10px] tabular-nums shrink-0 ${
                    active
                      ? workshop ? "bg-sky-500/25 text-sky-100" : "bg-violet-500/25 text-violet-100"
                      : workshop ? "bg-sky-500/10 text-sky-300/70" : "bg-white/5 text-zinc-500"
                  }`}>
                    {i + 1}
                  </span>
                  <span className={`text-sm font-medium min-w-0 flex-1 ${active ? "text-white" : "text-zinc-300"}`}>{TAB_LABELS[id]}</span>
                  {/* HOW FULL, NOT WHETHER VISITED.
                      A green tick used to appear the moment a step had one
                      sentence in it, which is a scoreboard telling somebody
                      they are finished with work they have barely begun. */}
                  {/* No dot on the fork: there is nothing on it to fill in,
                      and a dot there would be scoring somebody on having
                      chosen a door. */}
                  {SCORED_TABS.includes(id) && <StepDot state={state} label={TAB_LABELS[id]} />}
                </span>
                <span className="block text-[11px] text-zinc-500 mt-1">{TAB_BLURBS[id]}</span>
              </button>
            )
          })}
        </nav>

        {!loaded || !today ? (
          <p className="text-sm text-zinc-500">Opening your plan…</p>
        ) : tab === "star" ? (
          <StarTab
            plan={plan}
            {...starHandlers}
            valuesHandlers={valuesHandlers}
            onNext={() => setTab("now")}
          />
        ) : tab === "now" ? (
          <NowTab
            plan={plan}
            today={today}
            openId={nowAreaId}
            setOpenId={setNowAreaId}
            areaHandlers={areaHandlers}
            onSeasonFocus={setSeasonFocus}
            onNext={() => setTab("one")}
          />
        ) : tab === "one" ? (
          /* One sentence, and everything that holds it up. It comes before the
             goals page because what somebody lists in twelve areas depends on
             whether they have decided what the year is for. */
          <OneThingTab plan={plan} handlers={oneThingHandlers} />
        ) : tab === "pick" ? (
          /* The fork. Two doors are the milestones step with a different half
             open; the third opens one routine on it, expanded, with the area
             work left alone. Quitting a vice is a link off this page. */
          <PathPicker
            plan={plan}
            onPick={(id) => {
              setOpenRoutineId(null)
              setTab(id === "systems" ? "systems" : "milestones")
            }}
            onPickRoutine={(routineId) => {
              setPlanAreaId(null)
              setOpenRoutineId(routineId)
              setTab("systems")
            }}
          />
        ) : tab === "templates" ? (
          /* THE CATALOGUE, AS A STEP.
             It was a tab on both build steps, which is the wrong place for it
             twice over: it put somebody else's ready-made list beside the box
             asking what THIS person wants, and it made the one thing that is
             not your own work look like part of it. Here it is a place you
             walk through and leave. Opening an area from it lands on
             Achievements, where writing your own happens. */
          <BuildBoard
            plan={plan}
            today={today}
            handlers={{ ...boardHandlers, onOpenArea: (id: string) => { boardHandlers.onOpenArea(id); setTab("milestones") } }}
          />
        ) : tab === "customize" ? (
          /* THE BENCH. Templates hands you a cited program to take or adapt;
             this is the empty page for somebody who already knows what their
             week is and wants the app to track it rather than propose it.
             Its own storage key: a half-built program is not part of the plan
             and should not travel with a "start over". */
          <CustomizeTab onProgramStarted={boardHandlers.onProgramStarted} />
        ) : tab === "focus" ? (
          <FocusTab
            plan={plan}
            today={today}
            handlers={focusHandlers}
            onOpenGoal={(areaId, goalId) => { setPlanAreaId(areaId); setNowGoalId(goalId); setTab("milestones") }}
            onNext={() => setTab("milestones")}
          />
        ) : tab === "milestones" || tab === "systems" ? (
          /* TWO STEPS, ONE BODY. The same wheel, the same routines and the
             same builder; the step decides which half is being written and
             the rail is the switch between them. */
          <MilestonesTab
            key={tab}
            step={tab}
            plan={plan}
            today={today}
            openId={planAreaId}
            setOpenId={setPlanAreaId}
            onOpenGoal={(areaId, goalId) => { setPlanAreaId(areaId); setNowGoalId(goalId) }}
            guideHandlers={guideHandlers}
            routineHandlers={routineHandlers}
            systemHandlers={systemHandlers}
            onAddRoutine={areaHandlers.onAddRoutine}
            openRoutineId={openRoutineId}
            setOpenRoutineId={setOpenRoutineId}
            onAddRequirement={(title: string) => setPlan((p) => ns.addOneThingRequirement(p, title))}
            onGoToTab={(t: NorthStarTabId) => setTab(t)}
          />
        ) : tab === "values" ? (
          /* The values exercise, moved off the north star and into its own late
             step: ranking what matters is easier once you can see what you have
             actually asked your life for. */
          <div className="space-y-5">
            {/* The work already done, before the boxes that ask for more. By
                this step the same question has been answered five times in five
                other places, and starting from a blank list throws all of it
                away. */}
            <ValuesSoFar
              plan={plan}
              onAdd={(value) => setPlan((p) => ns.setValues(p, [...p.values, value]))}
              onAddAll={(values) => setPlan((p) => ns.setValues(p, [...p.values, ...values]))}
              onGoTo={(mention) => {
                if (mention.goalId && mention.areaId) {
                  setNowAreaId(null)
                  setPlanAreaId(mention.areaId)
                  setNowGoalId(mention.goalId)
                  setTab("milestones")
                } else if (mention.areaId) {
                  openAreaRating(mention.areaId)
                } else {
                  setTab(mention.tab)
                }
              }}
            />
            <ValuesWork plan={plan} handlers={valuesHandlers} mode="elicit" />
            <ValuesWork plan={plan} handlers={valuesHandlers} mode="order" />
          </div>
        ) : tab === "today" ? (
          /* The only step that asks what you DID rather than what you want.
             Everything else here is a decision; this is the same plan, on a
             date, with a tick against each line. */
          runId ? (
            <TodayTab
              plan={plan}
              today={today ?? ns.todayISO()}
              runId={runId}
              onToggleStep={(stepId) => setPlan((p) => nsTrack.toggleStepLogged(p, today ?? ns.todayISO(), stepId))}
              /* The SAME store the wheel's rating uses, so a day rated here
                 moves the rolling average step 2 reads back. Two screens
                 asking one question, not two questions. */
              onRate={(areaId, score) =>
                setPlan((p) =>
                  ns.dailyRating(p, today ?? ns.todayISO(), areaId) === score
                    ? ns.clearDailyRating(p, today ?? ns.todayISO(), areaId)
                    : ns.setDailyRating(p, today ?? ns.todayISO(), areaId, score)
                )
              }
              onNote={(text) => setPlan((p) => ns.setDayNote(p, today ?? ns.todayISO(), text))}
              onGoToTrack={() => setTab("track")}
            />
          ) : (
            <p className="text-sm text-zinc-500">Opening today…</p>
          )
        ) : tab === "track" ? (
          /* The one step that leaves the browser. Everything else here is a
             document; this is the same goals hub /dashboard/goals renders,
             on the rows the plan just created. */
          runId ? (
            <TrackTab plan={plan} runId={runId} today={today ?? ns.todayISO()} />
          ) : (
            /* Renders nothing at all if this is left as `runId && …`, which is
               the worst thing a step can do: no list, no error, no explanation,
               and nothing to click. */
            <p className="text-sm text-zinc-500">Opening your goals…</p>
          )
        ) : (
          <CommitTab
            plan={plan}
            today={today}
            handlers={{ onAnswer: (key, text) => setPlan((p) => ns.setAnswer(p, key, text)) }}
            tools={
              <section className="rounded-2xl border border-white/10 bg-white/[0.02] overflow-hidden">
                <div className="px-5 pt-4">
                  <h2 className="text-sm font-semibold text-zinc-200">{COMMIT_EDIT_COPY.title}</h2>
                  <p className="text-[11.5px] text-zinc-400 mt-1 leading-relaxed">{COMMIT_EDIT_COPY.help}</p>
                </div>
                <QuickAdd plan={plan} onAdd={(areaId, text) => setPlan((p) => ns.addGoalsFromDump(p, areaId, text))} />
                <GoalOverview
                  plan={plan}
                  today={today}
                  onOpenGoal={(goal) => { setPlanAreaId(goal.areaId); setNowGoalId(goal.id); setTab(ns.isMilestone(goal) ? "milestones" : "systems") }}
                  onSetPriority={goalHandlers.onSetPriority}
                  onMovePriority={goalHandlers.onMovePriority}
                  onRemoveGoal={(goalId) => setPlan((p) => ns.removeGoal(p, goalId))}
                  onOpenRoutine={(routineId) => { setPlanAreaId(null); setOpenRoutineId(routineId); setTab("systems") }}
                  emptyHint={COMMIT_EDIT_COPY.empty}
                />
                {/* WHAT IS POINTED AT WHAT, the same view the systems step has.
                    Reading the plan back is exactly when "nothing is running at
                    this" stops being an abstraction. */}
                <SystemLinks
                  plan={plan}
                  handlers={systemHandlers}
                  onOpenArea={(id: string) => { setPlanAreaId(id); setTab("milestones") }}
                />
              </section>
            }
          >
            <ReviewTab plan={plan} today={today} handlers={reviewHandlers} valuesHandlers={valuesHandlers} />
          </CommitTab>
        )}

        {/* What is still missing, in one place, instead of gates on the way
            through. Nothing here blocks anything; a goal with no date still
            saves and every tab is always reachable. That only works if the
            outstanding work is visible somewhere, which is here. */}
        {loaded && today && tab !== "milestones" && tab !== "systems" && todos.length > 0 && !ns.planIsUntouched(plan) && (
          <div className="mt-6 rounded-2xl border border-white/10 bg-white/[0.02] px-5 py-4">
            <div className="flex items-baseline gap-2">
              <h2 className="text-[13px] font-semibold text-zinc-200">{TODO_COPY.title}</h2>
              <span className="text-[11px] text-zinc-600 tabular-nums">{todos.length}</span>
            </div>
            <p className="text-[11px] text-zinc-500 mt-0.5 leading-relaxed">{TODO_COPY.help}</p>
            <ul className="flex flex-wrap gap-1.5 mt-2.5">
              {todos.map((todo) => (
                <li key={todo.id}>
                  <button
                    onClick={() => setTab(todo.tab)}
                    className="text-[11px] px-2.5 py-1 rounded-full border border-white/10 text-zinc-400 hover:text-zinc-100 hover:border-white/30 transition-colors"
                  >
                    {todo.text}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* The plan read back as plain text. Closed by default: expanded it is
            the longest thing on the page, and it is a thing you go and look at
            rather than something you need under every screen. */}
        {loaded && today && readBack.trim() && (
          <div className="mt-8 rounded-2xl border border-violet-400/20 bg-violet-500/[0.04]">
            <div className="flex items-center gap-3 px-5 py-3">
              <button
                onClick={() => setReadBackOpen((v) => !v)}
                aria-expanded={readBackOpen}
                className="flex items-center gap-2 min-w-0 text-left group"
              >
                <ChevronDown className={`size-4 shrink-0 text-zinc-500 transition-transform ${readBackOpen ? "" : "-rotate-90"}`} />
                <span className="text-sm font-semibold text-zinc-200 group-hover:text-white transition-colors">Your plan, read back</span>
                <span className="text-[11px] text-zinc-600 tabular-nums">{readBack.split("\n").length} lines</span>
              </button>
              <button onClick={copy} className="ml-auto text-[11px] text-zinc-500 hover:text-zinc-300 transition-colors shrink-0">
                {copied === "done" ? "copied" : copied === "failed" ? "your browser blocked the copy" : "copy as text"}
              </button>
            </div>
            {readBackOpen && (
              <pre className="px-5 pb-5 text-[12px] text-zinc-400 leading-relaxed whitespace-pre-wrap font-sans">{readBack}</pre>
            )}
          </div>
        )}
      </div>

      {tab === "now" && nowAreaId && (() => {
        const area = plan.areas.find((a) => a.id === nowAreaId)
        if (!area) return null
        return (
          <AreaDialog
            area={area}
            plan={plan}
            today={today ?? ns.todayISO()}
            onAreaReview={reviewHandlers.onAreaReview}
            onDailyRating={reviewHandlers.onDailyRating}
            onUpdateArea={areaHandlers.onUpdateArea}
            onRemoveArea={areaHandlers.onRemoveArea}
            onOpenRoutine={(id) => { setNowAreaId(null); setOpenRoutineId(id); setTab("milestones") }}
            onSeasonFocus={setSeasonFocus}
            onOpenArea={(id) => setNowAreaId(id)}
            onGoToGoals={openAreaGoals}
            onClose={() => setNowAreaId(null)}
          />
        )
      })()}

      {/* The dialog is for ONE GOAL, opened deliberately.
          It used to open on the same state the wheel sets, so after the goals
          tab was rebuilt around the wheel a single click opened the inline
          builder and this modal on top of it — two editors for one area,
          disagreeing about which was in front. The wheel opens the builder; a
          goal row opens this, for the curve, the obstacles and the beliefs. */}
      {(tab === "milestones" || tab === "systems") && planAreaId && nowGoalId && (() => {
        const area = plan.areas.find((a) => a.id === planAreaId)
        if (!area) return null
        return (
          <AreaGoalsDialog
            area={area}
            plan={plan}
            today={today ?? ns.todayISO()}
            openGoalId={nowGoalId}
            onOpenGoal={(id) => setNowGoalId(nowGoalId === id ? null : id)}
            goalHandlers={goalHandlers}
            onAddGoal={addGoal}
            onAddTarget={addTarget}
            onAddTemplate={addTemplate}
            onOpenRoutine={(id) => { setPlanAreaId(null); setOpenRoutineId(id) }}
            onSeasonFocus={setSeasonFocus}
            onOpenArea={(id) => { setPlanAreaId(id); setNowGoalId(null) }}
            onGoToRating={openAreaRating}
            onClose={() => { setPlanAreaId(null); setNowGoalId(null) }}
          />
        )
      })()}

      <div className="sticky bottom-0 bg-zinc-950/90 backdrop-blur-sm border-t border-white/10">
        <div className="max-w-5xl mx-auto px-6 py-3 flex items-center justify-between gap-3">
          {tabIndex > 0 ? (
            <button onClick={() => setTab(TAB_ORDER[tabIndex - 1])} className="text-xs text-zinc-400 hover:text-white transition-colors">
              ← {TAB_LABELS[TAB_ORDER[tabIndex - 1]]}
            </button>
          ) : <span />}
          {/* What is actually happening to what you typed, said plainly and
              with the off switch next to it. A copy going to a server is not a
              thing to bury in a privacy policy nobody opens. */}
          <span className="text-[11px] text-zinc-600 text-center min-w-0">
            {!plan.updatedAt ? "Nothing written yet" : synced === "off" ? (
              <>
                Saved on this device only.{" "}
                <button onClick={() => { startSync(); setSynced("unknown") }} className="underline underline-offset-2 hover:text-zinc-300 transition-colors">
                  help improve this page
                </button>
              </>
            ) : (
              <>
                {/* Three states, and they must not be muddled. A copy that
                    failed to send has not been sent, and offering to "delete
                    the copy" then points at something that is not there. */}
                Saved on this device
                {synced === "on" && ", and a copy sent so this page can be improved"}
                {synced === "failed" && ", but the copy could not be sent"}.{" "}
                <button
                  onClick={() => { void stopSync(); setSynced("off") }}
                  className="underline underline-offset-2 hover:text-zinc-300 transition-colors"
                >
                  {synced === "on" ? "stop sending, delete the copy" : "do not send a copy"}
                </button>
              </>
            )}
          </span>
          {tabIndex < TAB_ORDER.length - 1 ? (
            <button
              onClick={() => setTab(TAB_ORDER[tabIndex + 1])}
              className="text-sm font-medium px-4 py-2 rounded-lg bg-violet-500/20 border border-violet-500/40 text-violet-100 hover:bg-violet-500/30 transition-colors"
            >
              {TAB_LABELS[TAB_ORDER[tabIndex + 1]]} →
            </button>
          ) : (
            <span className="text-[11px] text-zinc-600 tabular-nums">
              {progress.areasRated} of {progress.areas} areas rated
            </span>
          )}
        </div>
      </div>
    </div>
  )
}


/**
 * Empty ring, ring with a dot, filled ring.
 *
 * Three states because there are three: nothing here yet, something here, and
 * every box this step asks for is filled. Amber rather than green — green is
 * the colour of "you are finished", and the middle state is the common one.
 */
function StepDot({ state, label }: { state: ns.NsStepState; label: string }) {
  const said =
    state === "done" ? `${label}: every box filled` : state === "started" ? `${label}: in progress` : `${label}: nothing written yet`
  return (
    <svg viewBox="0 0 16 16" className="size-3.5 shrink-0" role="img" aria-label={said}>
      <title>{said}</title>
      <circle
        cx="8"
        cy="8"
        r="6"
        fill={state === "done" ? "rgb(251 191 36 / 0.9)" : "none"}
        stroke={state === "empty" ? "rgb(113 113 122 / 0.7)" : "rgb(251 191 36 / 0.85)"}
        strokeWidth="1.5"
      />
      {state === "started" && <circle cx="8" cy="8" r="2.5" fill="rgb(251 191 36 / 0.9)" />}
    </svg>
  )
}


/**
 * One line, into any area, from the page that reads the plan back.
 *
 * The commonest thing somebody does while reading their own plan is remember
 * something that is not in it. Sending them four steps back to write it down is
 * how it stays not in it.
 */
function QuickAdd({ plan, onAdd }: { plan: NsPlan; onAdd: (areaId: string, text: string) => void }) {
  const [areaId, setAreaId] = useState(plan.areas[0]?.id ?? "")
  const [text, setText] = useState("")
  const add = () => {
    if (!text.trim() || !areaId) return
    onAdd(areaId, text)
    setText("")
  }
  return (
    <div className="flex flex-wrap items-center gap-2 px-5 py-3">
      <select
        value={areaId}
        onChange={(e) => setAreaId(e.target.value)}
        aria-label={COMMIT_EDIT_COPY.addArea}
        className="shrink-0 bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-[11.5px] text-zinc-200 focus:outline-none focus:border-white/30"
      >
        {plan.areas.map((a) => <option key={a.id} value={a.id} className="bg-zinc-900">{a.label}</option>)}
      </select>
      <input
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); add() } }}
        placeholder={COMMIT_EDIT_COPY.addPlaceholder}
        aria-label={COMMIT_EDIT_COPY.add}
        className="min-w-0 flex-1 bg-transparent border-b border-white/15 focus:border-white/35 text-[12.5px] text-zinc-100 placeholder:text-zinc-700 focus:outline-none py-1 transition-colors"
      />
      <button
        onClick={add}
        disabled={!text.trim()}
        className="shrink-0 text-[11.5px] px-2.5 py-1 rounded-lg border border-white/15 text-zinc-100 hover:bg-white/10 disabled:opacity-30 transition-colors"
      >
        {COMMIT_EDIT_COPY.add}
      </button>
    </div>
  )
}
