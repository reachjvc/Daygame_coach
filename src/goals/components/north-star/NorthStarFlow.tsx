"use client"

/**
 * /test/life-mastery — the North Star flow.
 *
 * Three tabs, and they are tabs rather than steps on purpose. The order is the
 * order the work wants to happen in, but somebody who arrives wanting to jot
 * three goals down should be able to, and forcing the sequence on them only
 * loses the goals. Nothing on any tab is gated either: a goal with no date and
 * no why still saves, and what is outstanding is listed in one panel under
 * every tab rather than standing in the way.
 *
 *   1. North star — the life you are aiming at, why, your values, who you are.
 *   2. Your life  — the twelve areas, your 10 and rating in each, the goals
 *                   aimed at them, and the routines running underneath.
 *   3. Review     — whether the goals point at that 10, and what stops you.
 *
 * Tab 2 used to be two tabs showing the same wheel and the same dialog, which
 * meant the ratings and the goals they are supposed to justify were never on
 * screen together. Inside an area the 10 is still written before the rating.
 *
 * Runs on localStorage, calls no API, and touches no database. The twelve-area
 * version this replaced is preserved at /test/life-mastery-v1, and the whole
 * system with tracking, rituals and weekly evaluation is at /test/vision-plan.
 */

import { useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { ArrowLeft, Check, ChevronDown } from "lucide-react"
import type { HabitRampStep, MilestoneLadderConfig, NorthStarTabId, NsArea, NsAreaReview, NsGoal, NsPlan, VisionGoalType } from "@/src/goals/types"
import { NORTH_STAR_STORAGE_KEY, TAB_BLURBS, TAB_LABELS, TAB_ORDER, TODO_COPY } from "@/src/goals/data/northStar"
import * as ns from "@/src/goals/northStarService"
import { StarTab } from "./StarTab"
import { NowTab } from "./NowTab"
import { AreaDialog } from "./AreaDialog"
import { ReviewTab } from "./ReviewTab"

export function NorthStarFlow() {
  const [plan, setPlan] = useState<NsPlan>(ns.emptyNsPlan)
  const [loaded, setLoaded] = useState(false)
  const [tab, setTab] = useState<NorthStarTabId>("star")
  const [confirmReset, setConfirmReset] = useState(false)
  const [copied, setCopied] = useState<"idle" | "done" | "failed">("idle")
  const [readBackOpen, setReadBackOpen] = useState(false)
  // The area dialog is owned here, so the same one serves the "where you are"
  // wheel and the plan wheel and there is only ever one open.
  const [nowAreaId, setNowAreaId] = useState<string | null>(null)
  const [nowGoalId, setNowGoalId] = useState<string | null>(null)
  // Owned here too, so opening a routine from inside an area dialog can close
  // the dialog and expand the routine on the surface underneath.
  const [openRoutineId, setOpenRoutineId] = useState<string | null>(null)
  // Read once, on the client. Rendering "today" from the server would hydrate
  // with yesterday's date for anyone west of the server.
  const [today, setToday] = useState<string | null>(null)

  useEffect(() => {
    setToday(ns.todayISO())
    const saved = ns.loadNsPlan(window.localStorage.getItem(NORTH_STAR_STORAGE_KEY))
    if (saved) setPlan(saved)
    setLoaded(true)
  }, [])

  // Saving before the load has finished would write the empty plan over the
  // saved one on every refresh.
  useEffect(() => {
    if (!loaded) return
    window.localStorage.setItem(NORTH_STAR_STORAGE_KEY, ns.serializeNsPlan(plan))
  }, [plan, loaded])

  const progress = ns.nsProgress(plan)
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
    onMoveValue: (value: string, dir: -1 | 1) => setPlan((p) => ns.moveValue(p, value, dir)),
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
    onUpdateCheckpoint: (id: string, checkpointId: string, patch: { title?: string; done?: boolean }) => setPlan((p) => ns.updateCheckpoint(p, id, checkpointId, patch)),
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

  const reviewHandlers = useMemo(() => ({
    onAreaReview: (areaId: string, patch: Partial<NsAreaReview>) => setPlan((p) => ns.setAreaReview(p, areaId, patch)),
    onDailyRating: (date: string, areaId: string, score: number) => setPlan((p) => ns.setDailyRating(p, date, areaId, score)),
    onAnswer: (promptId: string, text: string) => setPlan((p) => ns.setAnswer(p, promptId, text)),
    onGoToGoals: () => setTab("now"),
    onGoToNow: () => setTab("now"),
  }), [])

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

  const reset = () => {
    setPlan(ns.emptyNsPlan())
    setConfirmReset(false)
    setTab("star")
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
            <span className="flex items-center gap-2 text-[11px]">
              <span className="text-zinc-400">Delete everything you have written?</span>
              <button onClick={reset} className="text-rose-300 hover:text-rose-200">yes, start over</button>
              <button onClick={() => setConfirmReset(false)} className="text-zinc-500 hover:text-zinc-300">keep it</button>
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
            const done = progress.done[id]
            return (
              <button
                key={id}
                onClick={() => setTab(id)}
                aria-current={active ? "page" : undefined}
                className={`rounded-xl border p-3 text-left transition-colors ${
                  active ? "border-violet-400/40 bg-violet-500/10" : "border-white/10 bg-white/[0.02] hover:border-white/25"
                }`}
              >
                <span className="flex items-center gap-2">
                  <span className={`inline-flex items-center justify-center size-5 rounded-full text-[10px] tabular-nums shrink-0 ${
                    done ? "bg-emerald-500/20 text-emerald-300" : active ? "bg-violet-500/25 text-violet-100" : "bg-white/5 text-zinc-500"
                  }`}>
                    {done ? <Check className="size-3" /> : i + 1}
                  </span>
                  <span className={`text-sm font-medium ${active ? "text-white" : "text-zinc-300"}`}>{TAB_LABELS[id]}</span>
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
            routineHandlers={routineHandlers}
            goalHandlers={goalHandlers}
            openRoutineId={openRoutineId}
            setOpenRoutineId={setOpenRoutineId}
            onOpenGoal={(areaId, goalId) => { setNowAreaId(areaId); setNowGoalId(goalId) }}
            onSeasonFocus={setSeasonFocus}
            onNext={() => setTab("review")}
          />
        ) : (
          <ReviewTab plan={plan} today={today} handlers={reviewHandlers} valuesHandlers={valuesHandlers} />
        )}

        {/* What is still missing, in one place, instead of gates on the way
            through. Nothing here blocks anything; a goal with no date still
            saves and every tab is always reachable. That only works if the
            outstanding work is visible somewhere, which is here. */}
        {loaded && today && todos.length > 0 && !ns.planIsUntouched(plan) && (
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
            openGoalId={nowGoalId}
            onOpenGoal={(id) => setNowGoalId(nowGoalId === id ? null : id)}
            goalHandlers={goalHandlers}
            onAddGoal={addGoal}
            onAddTarget={addTarget}
            onAddTemplate={addTemplate}
            onAreaReview={reviewHandlers.onAreaReview}
            onDailyRating={reviewHandlers.onDailyRating}
            onUpdateArea={areaHandlers.onUpdateArea}
            onRemoveArea={areaHandlers.onRemoveArea}
            onOpenRoutine={setOpenRoutineId}
            onSeasonFocus={setSeasonFocus}
            onOpenArea={(id) => { setNowAreaId(id); setNowGoalId(null) }}
            onClose={() => { setNowAreaId(null); setNowGoalId(null) }}
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
          <span className="text-[11px] text-zinc-600 tabular-nums text-center">
            {plan.updatedAt ? "Saved on this device" : "Nothing written yet"}
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
