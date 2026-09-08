"use client"

import { useState, useCallback, useMemo } from "react"
import { useHistoryBarrierStack } from "@/src/shared/HistoryBarrierContext"

/**
 * Manages linear step progression with automatic browser-back handling.
 * Wraps useHistoryBarrierStack so every stepped flow gets back-button support for
 * free -- one history entry per step, so Back always goes back exactly one screen.
 */
export function useSteppedFlow<S extends string | number>(
  steps: readonly S[],
  initial: S,
) {
  const [step, setStepRaw] = useState<S>(initial)

  const stepIndex = steps.indexOf(step)

  const isFirst = stepIndex <= 0
  const isLast = stepIndex >= steps.length - 1

  const goBack = useCallback(() => {
    if (stepIndex > 0) setStepRaw(steps[stepIndex - 1])
  }, [stepIndex, steps])

  const goNext = useCallback(() => {
    if (stepIndex < steps.length - 1) setStepRaw(steps[stepIndex + 1])
  }, [stepIndex, steps])

  const goTo = useCallback(
    (target: S) => {
      if (steps.includes(target)) setStepRaw(target)
    },
    [steps],
  )

  // Browser back -> previous step, once per step. Not a boolean: a boolean gives
  // the whole flow ONE history entry, so the second Back falls out of the flow
  // (or, on the live site, jumped to an unrelated step). See useHistoryBarrierStack.
  useHistoryBarrierStack(stepIndex, goBack)

  return useMemo(
    () => ({ step, stepIndex, isFirst, isLast, goNext, goBack, goTo, setStep: setStepRaw }),
    [step, stepIndex, isFirst, isLast, goNext, goBack, goTo],
  )
}
