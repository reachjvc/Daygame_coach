"use client"

/**
 * /test/life-mastery — the simple Life Mastery flow.
 *
 * Three screens and nothing else:
 *   1. A ladder of short questions that ends in your vision and your big why.
 *   2. The twelve areas, editable, where you type the goals you want.
 *   3. A why under every goal, then the rest of the qualification.
 *
 * The full lab at /test/vision-plan keeps the whole system (intents, balancer,
 * horizons, rituals, weekly evaluation). This one is the front door. It runs on
 * localStorage, calls no API, and asks no question it cannot use.
 */

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { ArrowLeft, Check } from "lucide-react"
import type { LifeMasteryPlan, LifeMasteryStepId, SimpleGoal } from "@/src/goals/types"
import {
  LIFE_MASTERY_STORAGE_KEY,
  STEP_LABELS,
  STEP_ORDER,
  addCustomArea,
  addGoal,
  emptyLifeMasteryPlan,
  loadLifeMasteryPlan,
  planProgress,
  removeCustomArea,
  removeGoal,
  renameArea,
  serializeLifeMasteryPlan,
  setAnswer,
  setHorizon,
  toggleAreaHidden,
  updateGoal,
} from "@/src/goals/lifeMasteryService"
import { WhyStep } from "./WhyStep"
import { AreasStep } from "./AreasStep"
import { QualifyStep } from "./QualifyStep"

const STEP_BLURBS: Record<LifeMasteryStepId, string> = {
  why: "Seven short questions, then your vision and your why.",
  areas: "The parts of your life, and what you want in each.",
  goals: "The reason under every goal you wrote.",
}

export function LifeMasteryFlow() {
  const [plan, setPlan] = useState<LifeMasteryPlan>(emptyLifeMasteryPlan)
  const [loaded, setLoaded] = useState(false)
  const [step, setStep] = useState<LifeMasteryStepId>("why")
  const [confirmReset, setConfirmReset] = useState(false)

  useEffect(() => {
    const saved = loadLifeMasteryPlan(window.localStorage.getItem(LIFE_MASTERY_STORAGE_KEY))
    if (saved) setPlan(saved)
    setLoaded(true)
  }, [])

  // Saving before the load has finished would write the empty plan over the
  // saved one on every refresh.
  useEffect(() => {
    if (!loaded) return
    window.localStorage.setItem(LIFE_MASTERY_STORAGE_KEY, serializeLifeMasteryPlan(plan))
  }, [plan, loaded])

  const progress = planProgress(plan)
  const stepIndex = STEP_ORDER.indexOf(step)

  const onAnswer = useCallback((questionId: string, text: string) => {
    setPlan((prev) => setAnswer(prev, questionId, text))
  }, [])

  const onHorizon = useCallback((years: number) => {
    setPlan((prev) => setHorizon(prev, years))
  }, [])

  const handlers = {
    onRenameArea: useCallback((areaId: string, label: string) => setPlan((p) => renameArea(p, areaId, label)), []),
    onToggleHidden: useCallback((areaId: string) => setPlan((p) => toggleAreaHidden(p, areaId)), []),
    onAddCustomArea: useCallback((label: string) => setPlan((p) => addCustomArea(p, label)), []),
    onRemoveCustomArea: useCallback((areaId: string) => setPlan((p) => removeCustomArea(p, areaId)), []),
    onAddGoal: useCallback((areaId: string, title: string) => setPlan((p) => addGoal(p, areaId, title)), []),
    onUpdateGoal: useCallback((goalId: string, patch: Partial<Omit<SimpleGoal, "id">>) => setPlan((p) => updateGoal(p, goalId, patch)), []),
    onRemoveGoal: useCallback((goalId: string) => setPlan((p) => removeGoal(p, goalId)), []),
  }

  const reset = () => {
    setPlan(emptyLifeMasteryPlan())
    setConfirmReset(false)
    setStep("why")
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <div className="max-w-4xl mx-auto px-6 py-10 pb-28">
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
            Three steps. Your why, your areas, then a why under every goal. Everything saves as you type.
          </p>
        </header>

        {/* The rail. Every step is reachable at any time, because forcing the
            order on someone who wants to jot goals first only loses the goals. */}
        <nav className="grid gap-2 sm:grid-cols-3 mb-8">
          {STEP_ORDER.map((id, i) => {
            const active = id === step
            const done = progress.done[id]
            return (
              <button
                key={id}
                onClick={() => setStep(id)}
                className={`rounded-xl border p-3 text-left transition-colors ${
                  active
                    ? "border-violet-400/40 bg-violet-500/10"
                    : "border-white/10 bg-white/[0.02] hover:border-white/25"
                }`}
              >
                <span className="flex items-center gap-2">
                  <span className={`inline-flex items-center justify-center size-5 rounded-full text-[10px] tabular-nums shrink-0 ${
                    done ? "bg-emerald-500/20 text-emerald-300" : active ? "bg-violet-500/25 text-violet-100" : "bg-white/5 text-zinc-500"
                  }`}>
                    {done ? <Check className="size-3" /> : i + 1}
                  </span>
                  <span className={`text-sm font-medium ${active ? "text-white" : "text-zinc-300"}`}>{STEP_LABELS[id]}</span>
                </span>
                <span className="block text-[11px] text-zinc-500 mt-1">{STEP_BLURBS[id]}</span>
              </button>
            )
          })}
        </nav>

        {!loaded ? (
          <p className="text-sm text-zinc-500">Opening your plan…</p>
        ) : step === "why" ? (
          <WhyStep plan={plan} onAnswer={onAnswer} onHorizon={onHorizon} onDone={() => setStep("areas")} />
        ) : step === "areas" ? (
          <AreasStep plan={plan} handlers={handlers} />
        ) : (
          <QualifyStep plan={plan} onUpdateGoal={handlers.onUpdateGoal} onAnswer={onAnswer} onBackToAreas={() => setStep("areas")} />
        )}
      </div>

      <div className="sticky bottom-0 bg-zinc-950/90 backdrop-blur-sm border-t border-white/10">
        <div className="max-w-4xl mx-auto px-6 py-3 flex items-center justify-between gap-3">
          {stepIndex > 0 ? (
            <button onClick={() => setStep(STEP_ORDER[stepIndex - 1])} className="text-xs text-zinc-400 hover:text-white transition-colors">
              ← {STEP_LABELS[STEP_ORDER[stepIndex - 1]]}
            </button>
          ) : <span />}
          <span className="text-[11px] text-zinc-600 tabular-nums text-center">
            {plan.updatedAt ? "Saved on this device" : "Nothing written yet"}
          </span>
          {stepIndex < STEP_ORDER.length - 1 ? (
            <button
              onClick={() => setStep(STEP_ORDER[stepIndex + 1])}
              className="text-sm font-medium px-4 py-2 rounded-lg bg-violet-500/20 border border-violet-500/40 text-violet-100 hover:bg-violet-500/30 transition-colors"
            >
              {STEP_LABELS[STEP_ORDER[stepIndex + 1]]} →
            </button>
          ) : (
            <span className="text-[11px] text-zinc-600 tabular-nums">
              {progress.goalsWithWhy} of {progress.goals} goals have a why
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
