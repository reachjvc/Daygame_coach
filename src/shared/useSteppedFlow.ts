"use client"

import { useState, useCallback, useMemo } from "react"
import { useHistoryBarrier } from "@/src/shared/HistoryBarrierContext"

/**
 * Manages linear step progression with automatic browser-back handling.
 * Wraps useHistoryBarrier so every stepped flow gets back-button support for free.
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

  // Browser back → previous step automatically (inactive on first step)
  useHistoryBarrier(stepIndex > 0, goBack)

  return useMemo(
    () => ({ step, stepIndex, isFirst, isLast, goNext, goBack, goTo, setStep: setStepRaw }),
    [step, stepIndex, isFirst, isLast, goNext, goBack, goTo],
  )
}
