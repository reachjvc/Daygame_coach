"use client"

import { Check, Flame } from "lucide-react"

interface Step {
  label: string
  key: string
}

interface ForgeStepIndicatorProps {
  steps: Step[]
  currentStepIndex: number
}

const FORGE_AMBER = "#f59e0b"
const FORGE_ORANGE = "#ea580c"

export function ForgeStepIndicator({ steps, currentStepIndex }: ForgeStepIndicatorProps) {
  return (
    <div className="flex items-center justify-center gap-1">
      {steps.map((step, i) => {
        const isComplete = i < currentStepIndex
        const isCurrent = i === currentStepIndex
        const isForgeStep = step.key === "forge" && isCurrent

        return (
          <div key={step.key} className="flex items-center gap-1">
            {/* Step circle with number or check */}
            <div className="flex items-center gap-2">
              <div
                className="flex items-center justify-center size-7 rounded-full text-xs font-bold transition-all duration-300"
                style={{
                  backgroundColor: isComplete
                    ? FORGE_ORANGE
                    : isCurrent
                      ? isForgeStep ? FORGE_ORANGE : FORGE_AMBER
                      : "var(--muted)",
                  color: isComplete || isCurrent ? "white" : "var(--muted-foreground)",
                  transform: isCurrent ? "scale(1.15)" : "scale(1)",
                  boxShadow: isForgeStep
                    ? `0 0 12px ${FORGE_ORANGE}60, 0 0 24px ${FORGE_ORANGE}30`
                    : isCurrent
                      ? `0 0 8px ${FORGE_AMBER}40`
                      : "none",
                }}
              >
                {isComplete ? (
                  <Check className="size-3.5" />
                ) : isForgeStep ? (
                  <Flame className="size-3.5" />
                ) : (
                  i + 1
                )}
              </div>
              <span
                className="text-xs font-medium hidden sm:inline transition-colors duration-300"
                style={{
                  color: isCurrent
                    ? isForgeStep ? FORGE_ORANGE : "var(--foreground)"
                    : isComplete
                      ? FORGE_ORANGE
                      : "var(--muted-foreground)",
                  fontWeight: isCurrent ? 700 : 500,
                }}
              >
                {step.label}
              </span>
            </div>

            {/* Connector line */}
            {i < steps.length - 1 && (
              <div
                className="w-8 h-0.5 mx-1 rounded-full transition-colors duration-300"
                style={{
                  backgroundColor: isComplete
                    ? FORGE_ORANGE
                    : "var(--border)",
                }}
              />
            )}
          </div>
        )
      })}
    </div>
  )
}
