"use client"

import { Check } from "lucide-react"

interface Step {
  label: string
  key: string
}

interface ConstellationStepBarProps {
  steps: Step[]
  currentStepIndex: number
}

export function ConstellationStepBar({ steps, currentStepIndex }: ConstellationStepBarProps) {
  return (
    <div className="flex items-center justify-center gap-1">
      {steps.map((step, i) => {
        const isComplete = i < currentStepIndex
        const isCurrent = i === currentStepIndex

        return (
          <div key={step.key} className="flex items-center gap-1">
            {/* Step dot / number */}
            <div className="flex items-center gap-2">
              <div
                className="relative flex items-center justify-center size-7 rounded-full text-xs font-bold transition-all duration-500"
                style={{
                  backgroundColor: isComplete
                    ? "#7c3aed"
                    : isCurrent
                      ? "#7c3aed"
                      : "rgba(255, 255, 255, 0.08)",
                  color: isComplete || isCurrent ? "white" : "rgba(255, 255, 255, 0.35)",
                  transform: isCurrent ? "scale(1.15)" : "scale(1)",
                  boxShadow: isCurrent
                    ? "0 0 12px rgba(124, 58, 237, 0.6), 0 0 24px rgba(124, 58, 237, 0.3)"
                    : isComplete
                      ? "0 0 8px rgba(124, 58, 237, 0.3)"
                      : "none",
                }}
              >
                {isComplete ? <Check className="size-3.5" /> : i + 1}
                {/* Glow pulse on current step */}
                {isCurrent && (
                  <span
                    className="absolute inset-0 rounded-full animate-ping"
                    style={{
                      backgroundColor: "rgba(124, 58, 237, 0.3)",
                      animationDuration: "2s",
                    }}
                  />
                )}
              </div>
              <span
                className="text-xs font-medium hidden sm:inline transition-colors duration-300"
                style={{
                  color: isCurrent
                    ? "rgba(255, 255, 255, 0.9)"
                    : isComplete
                      ? "rgba(167, 139, 250, 0.8)"
                      : "rgba(255, 255, 255, 0.3)",
                }}
              >
                {step.label}
              </span>
            </div>

            {/* Connector line */}
            {i < steps.length - 1 && (
              <div
                className="w-8 h-0.5 mx-1 rounded-full transition-all duration-500"
                style={{
                  backgroundColor: isComplete
                    ? "rgba(124, 58, 237, 0.6)"
                    : "rgba(255, 255, 255, 0.08)",
                  boxShadow: isComplete
                    ? "0 0 4px rgba(124, 58, 237, 0.3)"
                    : "none",
                }}
              />
            )}
          </div>
        )
      })}
    </div>
  )
}
