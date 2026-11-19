import { useCallback, useMemo, type ComponentProps, type Dispatch, type SetStateAction } from "react"
import type { HabitRampStep, MilestoneLadderConfig, NorthStarTabId, NsArea, NsAreaReview, NsGoal, NsGoalStatus, NsPlan, VisionGoalType } from "@/src/goals/types"
import type { RoutineNeed } from "@/src/goals/data/northStarBuild"
import type { GuideQuestionId } from "@/src/goals/data/northStarGuide"
import * as ns from "@/src/goals/northStarService"
import * as nsTrack from "@/src/goals/northStarTrackService"
import { rateArea } from "@/src/goals/reviewService"
import { stepTickedByHand } from "@/src/goals/dayTicks"
import type { OneThingTabHandlers } from "./OneThingTab"
import type { SystemHandlers } from "./MilestonesTab"
import type { RecapHandlers } from "./RecapTab"
import type { ValuesSoFar } from "./ValuesSoFar"
import type { TodayTab } from "./TodayTab"
import type { JournalTab } from "./JournalTab"
import type { CommitTab } from "./CommitTab"

/**
 * Every plan writer NorthStarFlow hands to its step parts, moved out of it
 * unchanged (Plans/plan-new-from-real.md, Phase 3.1) so another page can mount
 * the same step parts with the same writers.
 *
 * Takes what the writers close over: the plan setter, the account's today and
 * the few page-level setters a handler also moves (the step, the open area, the
 * open goal, the open routine). The dependency lists are as they were.
 */
export function usePlanWriters({
  setPlan,
  today,
  setTab,
  setPlanAreaId,
  setNowGoalId,
  setOpenRoutineId,
}: {
  setPlan: Dispatch<SetStateAction<NsPlan>>
  today: string | null
  setTab: (tab: NorthStarTabId) => void
  setPlanAreaId: (id: string | null) => void
  setNowGoalId: (id: string | null) => void
  setOpenRoutineId: (id: string | null) => void
}) {
  const starHandlers = {
    onStar: useCallback((text: string) => setPlan((p) => ns.setNorthStar(p, text)), []),
    onHorizon: useCallback((years: number) => setPlan((p) => ns.setHorizon(p, years)), []),
    onRung: useCallback((rungId: string, text: string) => setPlan((p) => ns.setRung(p, rungId, text)), []),
    onAnswer: useCallback((promptId: string, text: string) => setPlan((p) => ns.setAnswer(p, promptId, text)), []),
    // The account's today, as everywhere on this page, so the dates match the day rows.
    onNewNorthStar: useCallback(() => setPlan((p) => ns.startNewNorthStar(p, today || undefined)), [today]),
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
    /* The step's own time of day is kept: choosing Tuesday should not lose
       "07:00". `placeStep` keeps daysPerWeek in step with the days. */
    onStepWeekdays: (id: string, stepId: string, days: number[]) =>
      setPlan((p) => {
        const startMin = p.routines.find((r) => r.id === id)?.steps.find((s) => s.id === stepId)?.startMin ?? null
        return ns.placeStep(p, id, stepId, days, startMin)
      }),
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

  /**
   * REMOVING A PLAN GOAL, IN ONE PLACE. Five call sites each wrote it, so
   * "what deleting a goal means" was stated five times and could be changed in
   * four of them. It means one thing now.
   */
  const removePlanGoal = useCallback((goalId: string) => setPlan((p) => ns.removeGoal(p, goalId)), [])

  const goalHandlers = useMemo(() => ({
    onUpdate: (id: string, patch: Partial<Omit<NsGoal, "id">>) => setPlan((p) => ns.updateGoal(p, id, patch)),
    onUpdateGoal: (id: string, patch: { title: string }) => setPlan((p) => ns.updateGoal(p, id, patch)),
    onSetType: (id: string, type: VisionGoalType) => setPlan((p) => ns.setGoalType(p, id, type)),
    onRemove: removePlanGoal,
    onLadder: (id: string, ladder: MilestoneLadderConfig) => setPlan((p) => ns.setLadder(p, id, ladder)),
    onRamp: (id: string, steps: HabitRampStep[] | null) => setPlan((p) => ns.setRamp(p, id, steps)),
    onReading: (id: string, date: string, value: number | null) => setPlan((p) => ns.setGoalReading(p, date, id, value)),
    onSetStatus: (id: string, status: NsGoalStatus, date: string) => setPlan((p) => ns.setGoalStatus(p, id, status, date)),
    onDateSteps: (id: string, date: string) => setPlan((p) => ns.dateSteps(p, id, date)),
    onTickCheckpoint: (id: string, checkpointId: string, done: boolean, date: string) => setPlan((p) => ns.setCheckpointDone(p, id, checkpointId, done, date)),
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
    onRemoveGoal: removePlanGoal,
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
    onRate: (date: string, areaId: string, value: number | null) => setPlan((p) => rateArea(p, areaId, value, date)),
    onDailyRating: (date: string, areaId: string, score: number) => setPlan((p) => ns.setDailyRating(p, date, areaId, score)),
    onAnswer: (promptId: string, text: string) => setPlan((p) => ns.setAnswer(p, promptId, text)),
    onGoToGoals: () => setTab("milestones"),
    onGoToNow: () => setTab("now"),
  }), [])

  /**
   * The last step's handlers. Every one of them already exists on another step
   * — this is the same writing, on the page that reads it back, because the
   * moment somebody notices a value they no longer hold is the moment they are
   * reading the list, not the moment they next reach step ten.
   */
  const recapHandlers = useMemo<RecapHandlers>(() => ({
    onStar: (text: string) => setPlan((p) => ns.setNorthStar(p, text)),
    onHorizon: (years: number) => setPlan((p) => ns.setHorizon(p, years)),
    onAnswer: (promptId: string, text: string) => setPlan((p) => ns.setAnswer(p, promptId, text)),
    onAreaReview: (areaId: string, patch: Partial<NsAreaReview>) => setPlan((p) => ns.setAreaReview(p, areaId, patch)),
    onAddExperiences: (text: string) => setPlan((p) => ns.addExperiences(p, text)),
    onToggleExperience: (id: string) => setPlan((p) => ns.toggleExperienceDone(p, id, today ?? ns.todayISO())),
    onRemoveExperience: (id: string) => setPlan((p) => ns.removeExperience(p, id)),
    /**
     * The tick, and the two writes behind it.
     *
     * Ticking goes to the SAME store the Today step ticks into — the day's log
     * on the plan, keyed by step id — so reading the north star here and
     * reading it there are one event, not two tallies that drift apart.
     *
     * Starting one does both halves in a press: turn the step on in the routine
     * it belongs to, then tick today, because somebody pressing it has just
     * read the thing and today's is already done.
     */
    onTickPractice: (stepId: string) =>
      setPlan((p) => nsTrack.toggleStepLogged(p, today ?? ns.todayISO(), stepId)),
    onTrackPractice: (blueprintId: string, libraryStepId: string) =>
      setPlan((p) => {
        const tracked = ns.trackPractice(p, blueprintId, libraryStepId)
        // Unchanged means the library moved under us; ticking a step that is
        // not there would write a log line nothing can ever show.
        if (tracked === p) return p
        // THE STEP'S OWN ID, NOT THE LIBRARY'S. `trackPractice` mints a counter
        // id for the new step and parks the library's name in `libraryStepId`;
        // ticking the name wrote a log line no row could match, so the box just
        // pressed drew itself unticked.
        const stepId = ns.stepIdForLibraryStep(tracked, blueprintId, libraryStepId)
        if (!stepId) return tracked
        // BY HAND, because this decides whether to WRITE. A tick the training
        // log derived is not in `plan.logged`, so asking the merged question
        // here would skip the write and leave nothing behind when the log
        // moves on.
        return stepTickedByHand(tracked, today ?? ns.todayISO(), stepId)
          ? tracked
          : nsTrack.toggleStepLogged(tracked, today ?? ns.todayISO(), stepId)
      }),
  }), [today])

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
    onAddRequirement: (title: string, areaId: string | undefined, type: VisionGoalType) =>
      setPlan((p) => ns.addOneThingRequirement(p, title, areaId, type)),
    onMarkServes: (goalId: string, on: boolean) => setPlan((p) => ns.markServesOneThing(p, goalId, on)),
    onRemoveGoal: removePlanGoal,
    onGoToTab: (t: NorthStarTabId) => setTab(t),
    onToggleOneThingArea: (areaId: string) => setPlan((p) => ns.toggleOneThingArea(p, areaId)),
  }), [])

    const systemHandlers = useMemo<SystemHandlers>(() => ({
    /* Taking a step off a goal follows the goal card's rule (`removeAction`):
       a step in an actions routine that then serves nothing is removed, not
       left behind serving no goal; any other step is only unlinked. */
    onLinkStep: (routineId: string, stepId: string, goalId: string, on: boolean) =>
      setPlan((p) => (on ? ns.linkStepToGoal(p, routineId, stepId, goalId, true) : ns.removeAction(p, goalId, stepId))),
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
    /**
     * `onProgramStarted` and `onProgramEnded` WERE HERE, and they were the
     * reason the plan only ever learned about a program THIS browser had
     * started. Nothing starts or ends a program from this page any more, and
     * the reconciliation above learns it from the database instead — which is
     * the same answer on the phone, the laptop, and a browser whose storage was
     * cleared.
     */
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
    // `today` is the ACCOUNT's day; the fallback is for the single render
    // before the effect sets it, as everywhere else in this file.
    onToggleExperience: (id: string) => setPlan((p) => ns.toggleExperienceDone(p, id, today ?? ns.todayISO())),
    onPromoteExperience: (id: string, areaId: string) => setPlan((p) => ns.promoteExperience(p, id, areaId)),
    onUpdateExperience: (id: string, patch: { areaId?: string | null; title?: string }) => setPlan((p) => ns.updateExperience(p, id, patch)),
    onRemoveExperience: (id: string) => setPlan((p) => ns.removeExperience(p, id)),
    onAddTemplate: (areaId: string, templateId: string, level: number) =>
      setPlan((p) => ns.addGoalsFromTemplate(p, areaId, templateId, level)),
    onAddTarget: (areaId: string, targetId: string) => setPlan((p) => ns.addGoalFromTarget(p, areaId, targetId)),
    onApplyNeed: (need: RoutineNeed) => setPlan((p) => ns.applyRoutineNeed(p, need)),
    onTogglePractice: (blueprintId: string, stepId: string, on: boolean) =>
      setPlan((p) => (on ? ns.addPractice(p, blueprintId, stepId) : ns.removePractice(p, blueprintId, stepId))),
    onRemoveGoal: removePlanGoal,
    onRemoveTemplate: (areaId: string, templateId: string) => setPlan((p) => ns.removeTemplateGoals(p, areaId, templateId)),
    onLadder: (goalId: string, ladder: MilestoneLadderConfig) => setPlan((p) => ns.setLadder(p, goalId, ladder)),
    onProgression: (goalId: string, rungs: string[]) => setPlan((p) => ns.setProgression(p, goalId, rungs)),
    onDateSteps: (goalId: string, today: string) => setPlan((p) => ns.dateSteps(p, goalId, today)),
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

  // ---- Writers the render passed inline (each one recreated every render, as it was in the JSX) ----

  /** Values step: the work already done, added to the ranked list. */
  const valuesSoFarWriters: Pick<ComponentProps<typeof ValuesSoFar>, "onAdd" | "onAddAll"> = {
    onAdd: (value) => setPlan((p) => ns.setValues(p, [...p.values, value])),
    onAddAll: (values) => setPlan((p) => ns.setValues(p, [...p.values, ...values])),
  }

  /** Systems step: a requirement typed onto the one thing, with no area. */
  const onAddSystemsRequirement = (title: string, type: VisionGoalType) =>
    setPlan((p) => ns.addOneThingRequirement(p, title, undefined, type))

  /** Today step. */
  const todayWriters: Pick<ComponentProps<typeof TodayTab>,
    "onCountGoal" | "onTickStep" | "onToggleStep" | "onToggleExperience" | "onRate" | "onNote" | "onAddField" | "onRenameField" |
    "onMoveField" | "onRemoveField" | "onWriteField" | "onNumberField" | "onFieldKind" | "onFieldSource" | "onAddSubStep" |
    "onRenameSubStep" | "onMoveSubStep" | "onRemoveSubStep" | "onStepGoesTo" | "onStepAsks"> = {
    /* A goal's count on the day, in the day half (Q4 of
       Plans/life-plan-rebuild.md); it went to the old goals table. */
    onCountGoal: (goalId, by) => setPlan((p) => ns.countGoal(p, today ?? ns.todayISO(), goalId, by)),
    onTickStep: (goalId, checkpointId) => setPlan((p) => ns.setCheckpointDone(p, goalId, checkpointId, true, today ?? ns.todayISO())),
    onToggleStep: (stepId) => setPlan((p) => nsTrack.toggleStepLogged(p, today ?? ns.todayISO(), stepId)),
    /* The experience's own store, the same one the Experiences step
       writes — a thing you wanted to have done is ticked once, and
       which screen you were on when you ticked it does not matter. */
    onToggleExperience: (id) => setPlan((p) => ns.toggleExperienceDone(p, id, today ?? ns.todayISO())),
    /* The SAME store the wheel's rating uses, so a day rated here
       moves the rolling average step 2 reads back. Two screens
       asking one question, not two questions. */
    onRate: (areaId, score) =>
      setPlan((p) =>
        ns.dailyRating(p, today ?? ns.todayISO(), areaId) === score
          ? ns.clearDailyRating(p, today ?? ns.todayISO(), areaId)
          : ns.setDailyRating(p, today ?? ns.todayISO(), areaId, score)
      ),
    onNote: (text) => setPlan((p) => ns.setDayNote(p, today ?? ns.todayISO(), text)),
    /* The user's own questions. Declared on the plan, answered by
       date — so renaming one later leaves every answer under it
       alone, and deleting one takes its answers with it rather than
       leaving dated text nothing can label. */
    onAddField: (targetId) => setPlan((p) => ns.addDailyField(p, targetId)),
    onRenameField: (id, label) => setPlan((p) => ns.renameDailyField(p, id, label)),
    onMoveField: (id, targetId) => setPlan((p) => ns.moveDailyField(p, id, targetId)),
    onRemoveField: (id) => setPlan((p) => ns.removeDailyField(p, id)),
    onWriteField: (fieldId, text) => setPlan((p) => ns.setJournalEntry(p, today ?? ns.todayISO(), fieldId, text)),
    onNumberField: (fieldId, value) => setPlan((p) => ns.setDayNumber(p, today ?? ns.todayISO(), fieldId, value)),
    onFieldKind: (id, kind) => setPlan((p) => ns.setDailyFieldKind(p, id, kind)),
    onFieldSource: (id, sourceId) => setPlan((p) => ns.setDailyFieldSource(p, id, sourceId)),
    /* The to-do list under a bigger weekly thing. Its ticks go
       through `onToggleStep` above — one store for what got done
       today, whether the thing was a step or a step of a step. */
    onAddSubStep: (targetId, title) => setPlan((p) => ns.addSubStep(p, targetId, title)),
    onRenameSubStep: (id, title) => setPlan((p) => ns.renameSubStep(p, id, title)),
    onMoveSubStep: (id, delta) => setPlan((p) => ns.moveSubStep(p, id, delta)),
    onRemoveSubStep: (id) => setPlan((p) => ns.removeSubStep(p, id)),
    onStepGoesTo: (routineId, stepId, sourceId) =>
      setPlan((p) => ns.updateStep(p, routineId, stepId, { goesTo: sourceId })),
    /* Silencing a step's question, from the box it draws. Nothing
       already written under it is touched — see `setStepAsks`. */
    onStepAsks: (routineId, stepId, question) => setPlan((p) => ns.setStepAsks(p, routineId, stepId, question)),
  }

  /** Journal step. */
  const journalWriters: Pick<ComponentProps<typeof JournalTab>, "onWriteField" | "onNote" | "onAddQuestion" | "onRemoveField" | "onStepAsks"> = {
    onWriteField: (id, text) => setPlan((p) => ns.setJournalEntry(p, today ?? ns.todayISO(), id, text)),
    onNote: (text) => setPlan((p) => ns.setDayNote(p, today ?? ns.todayISO(), text)),
    /* A question added here hangs off the day rather than off a row:
       nothing on this page is about one step, and re-homing it is a
       dropdown away on Today. */
    onAddQuestion: (question) => setPlan((p) => ns.addDailyField(p, null, question)),
    onRemoveField: (id) => setPlan((p) => ns.removeDailyField(p, id)),
    onStepAsks: (routineId, stepId, question) => setPlan((p) => ns.setStepAsks(p, routineId, stepId, question)),
  }

  /** Everything step: the quick add of a goal line, and the commit block's answer. */
  const onQuickAdd = (areaId: string, text: string) => setPlan((p) => ns.addGoalsFromDump(p, areaId, text))
  const commitHandlers: ComponentProps<typeof CommitTab>["handlers"] = {
    onAnswer: (key, text) => setPlan((p) => ns.setAnswer(p, key, text)),
  }

  /** Track step: the SAME tick the Today step writes. The schedule shows
      today's morning routine here too, and two screens showing one
      routine must not keep two answers to "did you read it". */
  const onTrackToggleStep = (stepId: string) => setPlan((p) => nsTrack.toggleStepLogged(p, today ?? ns.todayISO(), stepId))

  return {
    starHandlers,
    valuesHandlers,
    areaHandlers,
    routineHandlers,
    removePlanGoal,
    goalHandlers,
    focusHandlers,
    reviewHandlers,
    recapHandlers,
    setSeasonFocus,
    addGoal,
    addTarget,
    addTemplate,
    oneThingHandlers,
    systemHandlers,
    boardHandlers,
    guideHandlers,
    valuesSoFarWriters,
    onAddSystemsRequirement,
    todayWriters,
    journalWriters,
    onQuickAdd,
    commitHandlers,
    onTrackToggleStep,
  }
}
