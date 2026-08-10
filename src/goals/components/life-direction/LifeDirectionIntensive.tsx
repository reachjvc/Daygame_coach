"use client"

/**
 * /test/life-direction — the Life Direction Intensive.
 *
 * Six sessions, roughly eight to eleven hours, meant to be spread over days.
 * Sessions unlock in order because each one genuinely consumes the previous
 * one's output: you cannot budget hours you have not declared, form a goal
 * for an area you have not chosen, or fit a week around goals that do not
 * exist yet.
 *
 * Completion is evidence, never attendance. Opening a session and leaving it
 * blank leaves it unfinished, and the checklist says which piece is missing.
 *
 * Runs on localStorage, calls no API, and touches no database. Persisting
 * this properly needs new tables and an RLS review, which has not happened.
 *
 * Deliberately separate from /test/life-mastery, /test/life-mastery-v1 and
 * /test/vision-plan. Those three already decline to merge with each other.
 */

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { ArrowLeft, Check, Lock } from "lucide-react"
import {
  LDI_SESSIONS,
  LDI_STORAGE_KEY,
  LDI_TOTAL_MINUTES,
  type LdiSessionId,
} from "@/src/goals/data/lifeDirection"
import * as ldi from "@/src/goals/lifeDirectionService"
import type { LdiPlan } from "@/src/goals/types"
import { BaselineSession } from "./BaselineSession"
import { ReflectSession } from "./ReflectSession"
import { DirectionSession } from "./DirectionSession"
import { ConvergeSession } from "./ConvergeSession"
import { GoalsSession } from "./GoalsSession"
import { InstallSession } from "./InstallSession"

export function LifeDirectionIntensive() {
  const [plan, setPlan] = useState<LdiPlan>(ldi.emptyLdiPlan)
  const [loaded, setLoaded] = useState(false)
  const [active, setActive] = useState<LdiSessionId | null>(null)
  const [confirmReset, setConfirmReset] = useState(false)
  const [copied, setCopied] = useState<"idle" | "done" | "failed">("idle")
  const [readBackOpen, setReadBackOpen] = useState(false)

  useEffect(() => {
    const saved = ldi.loadLdiPlan(window.localStorage.getItem(LDI_STORAGE_KEY))
    if (saved) setPlan(saved)
    setLoaded(true)
  }, [])

  // Writing before the load finishes would overwrite the saved plan with an
  // empty one on every refresh.
  useEffect(() => {
    if (!loaded) return
    window.localStorage.setItem(LDI_STORAGE_KEY, ldi.serializeLdiPlan(plan))
  }, [plan, loaded])

  const onPlan = useCallback((fn: (p: LdiPlan) => LdiPlan) => setPlan((p) => fn(p)), [])
  const progress = ldi.ldiProgress(plan)
  const firstLockedIndex = progress.sessions.findIndex((s) => !s.unlocked)

  const copyPlan = async () => {
    try {
      await navigator.clipboard.writeText(ldi.planAsText(plan))
      setCopied("done")
    } catch {
      setCopied("failed")
    }
    setTimeout(() => setCopied("idle"), 2000)
  }

  const sessionProps = {
    plan,
    onPlan,
    onExit: () => setActive(null),
  }

  if (!loaded) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-12">
        <p className="text-sm text-muted-foreground">Loading.</p>
      </div>
    )
  }

  if (active) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-10">
        <button
          type="button"
          onClick={() => setActive(null)}
          className="mb-6 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          All sessions
        </button>

        {active === "baseline" ? <BaselineSession {...sessionProps} /> : null}
        {active === "reflect" ? <ReflectSession {...sessionProps} /> : null}
        {active === "direction" ? <DirectionSession {...sessionProps} /> : null}
        {active === "converge" ? <ConvergeSession {...sessionProps} /> : null}
        {active === "goals" ? <GoalsSession {...sessionProps} /> : null}
        {active === "install" ? <InstallSession {...sessionProps} /> : null}
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-3xl px-6 py-10">
      <Link
        href="/test"
        className="mb-6 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Test pages
      </Link>

      <header className="space-y-2">
        <h1 className="text-2xl font-semibold text-foreground">Life Direction</h1>
        <p className="text-sm text-muted-foreground">
          Six sessions, about {Math.round(LDI_TOTAL_MINUTES / 60)} hours in total. Meant to be
          spread across several days rather than done in one sitting. Everything saves as you go.
        </p>
        <div
          className="h-1.5 w-full overflow-hidden rounded-full bg-muted"
          role="progressbar"
          aria-valuenow={progress.done}
          aria-valuemin={0}
          aria-valuemax={progress.total}
          aria-label="Sessions complete"
        >
          <div
            className="h-full rounded-full bg-primary transition-all"
            style={{ width: `${(progress.done / progress.total) * 100}%` }}
          />
        </div>
        <p className="text-sm text-muted-foreground">
          {progress.done} of {progress.total} sessions complete.
          {ldi.planIsUntouched(plan) ? "" : " Saved automatically."}
        </p>
      </header>

      <ol className="mt-8 space-y-3">
        {LDI_SESSIONS.map((def) => {
          const state = progress.sessions[def.index]
          // Only the first locked session explains itself. Repeating the same
          // sentence under all five reads as five separate problems.
          const reason = def.index === firstLockedIndex ? ldi.lockReason(plan, def.id) : null
          const missing = ldi.sessionChecks(plan, def.id).filter((c) => !c.ok)
          return (
            <li key={def.id} className="space-y-2">
              <button
                type="button"
                disabled={!state.unlocked}
                onClick={() => setActive(def.id)}
                className={`w-full rounded-md border p-4 text-left transition ${
                  state.unlocked
                    ? "border-border hover:border-primary/60"
                    : "cursor-not-allowed border-border/50 opacity-60"
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1">
                    <p className="flex items-center gap-2 text-sm font-medium text-foreground">
                      {state.complete ? <Check className="h-4 w-4 text-primary" /> : null}
                      {!state.unlocked ? <Lock className="h-4 w-4 text-muted-foreground" /> : null}
                      {def.index + 1}. {def.title}
                    </p>
                    <p className="text-sm text-muted-foreground">{def.blurb}</p>
                    {state.overridden ? (
                      <p className="text-xs text-muted-foreground">
                        Opened early. Still {state.total - state.done} unanswered.
                      </p>
                    ) : null}
                    {state.unlocked && !state.complete && state.done > 0 ? (
                      <p className="text-xs text-muted-foreground">
                        Next: {missing[0]?.label.toLowerCase()}
                      </p>
                    ) : null}
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-xs text-muted-foreground">about {def.minutes} min</p>
                    <p className="text-xs text-muted-foreground">
                      {state.done} of {state.total}
                    </p>
                  </div>
                </div>
              </button>
              {reason ? (
                <div className="flex flex-wrap items-center gap-3 pl-1">
                  <p className="text-xs text-muted-foreground">{reason}</p>
                  <button
                    type="button"
                    className="text-xs text-muted-foreground underline transition hover:text-foreground"
                    onClick={() => setPlan((p) => ldi.overrideSessionLock(p, def.id))}
                  >
                    Open it anyway
                  </button>
                </div>
              ) : null}
            </li>
          )
        })}
      </ol>

      <div className="mt-10 space-y-3 border-t border-border pt-6">
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => setReadBackOpen((o) => !o)}
            className="rounded-md border border-border px-3 py-2 text-sm text-foreground hover:bg-muted"
          >
            {readBackOpen ? "Hide the plan" : "Read the plan back"}
          </button>
          <button
            type="button"
            onClick={copyPlan}
            className="rounded-md border border-border px-3 py-2 text-sm text-foreground hover:bg-muted"
          >
            {copied === "done" ? "Copied" : copied === "failed" ? "Could not copy" : "Copy as text"}
          </button>
          {confirmReset ? (
            <>
              <button
                type="button"
                onClick={() => {
                  setPlan(ldi.resetLdiPlan())
                  setConfirmReset(false)
                }}
                className="rounded-md border border-destructive/50 px-3 py-2 text-sm text-destructive"
              >
                Erase everything
              </button>
              <button
                type="button"
                onClick={() => setConfirmReset(false)}
                className="rounded-md px-3 py-2 text-sm text-muted-foreground"
              >
                Keep it
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmReset(true)}
              className="rounded-md px-3 py-2 text-sm text-muted-foreground hover:text-destructive"
              disabled={ldi.planIsUntouched(plan)}
            >
              Start over
            </button>
          )}
        </div>

        {readBackOpen ? (
          <pre className="max-h-96 overflow-auto whitespace-pre-wrap rounded-md border border-border bg-muted/30 p-4 text-xs text-foreground">
            {ldi.planAsText(plan)}
          </pre>
        ) : null}
      </div>
    </div>
  )
}
