"use client"

import { Check } from "lucide-react"

interface Step {
  label: string
  key: string
}

interface StepIndicatorProps {
  steps: Step[]
  currentStepIndex: number
}

export function StepIndicator({ steps, currentStepIndex }: StepIndicatorProps) {
  return (
    <div className="flex items-center justify-center gap-1">
      {steps.map((step, i) => {
        const isComplete = i < currentStepIndex
        const isCurrent = i === currentStepIndex
        const isFuture = i > currentStepIndex

        return (
          <div key={step.key} className="flex items-center gap-1">
            {/* Step dot / number */}
            <div className="flex items-center gap-2">
              <div
                className="flex items-center justify-center size-7 rounded-full text-xs font-bold transition-all duration-300"
                style={{
                  backgroundColor: isComplete
                    ? "var(--primary)"
                    : isCurrent
                    ? "var(--primary)"
                    : "var(--muted)",
                  color: isComplete || isCurrent ? "white" : "var(--muted-foreground)",
                  transform: isCurrent ? "scale(1.1)" : "scale(1)",
                }}
              >
                {isComplete ? <Check className="size-3.5" /> : i + 1}
              </div>
              <span
                className="text-xs font-medium hidden sm:inline transition-colors duration-300"
                style={{
                  color: isCurrent ? "var(--foreground)" : "var(--muted-foreground)",
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
                  backgroundColor: isComplete ? "var(--primary)" : "var(--border)",
                }}
              />
            )}
          </div>
        )
      })}
    </div>
  )
}
