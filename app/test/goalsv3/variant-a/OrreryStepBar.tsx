"use client"

import { Check } from "lucide-react"

interface Step {
  label: string
  key: string
}

interface OrreryStepBarProps {
  steps: Step[]
  currentStepIndex: number
}

export function OrreryStepBar({ steps, currentStepIndex }: OrreryStepBarProps) {
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
                    ? "#b8860b"
                    : isCurrent
                      ? "#daa520"
                      : "rgba(205, 133, 63, 0.1)",
                  color: isComplete || isCurrent ? "#0a0a1a" : "rgba(205, 133, 63, 0.4)",
                  border: isCurrent
                    ? "2px solid #daa520"
                    : isComplete
                      ? "2px solid #b8860b"
                      : "1px solid rgba(205, 133, 63, 0.15)",
                  transform: isCurrent ? "scale(1.15)" : "scale(1)",
                  boxShadow: isCurrent
                    ? "0 0 12px rgba(218, 165, 32, 0.5), 0 0 24px rgba(218, 165, 32, 0.2)"
                    : isComplete
                      ? "0 0 8px rgba(184, 134, 11, 0.3)"
                      : "none",
                }}
              >
                {isComplete ? <Check className="size-3.5" /> : i + 1}
                {/* Gear-like pulse on current step */}
                {isCurrent && (
                  <span
                    className="absolute inset-0 rounded-full animate-ping"
                    style={{
                      backgroundColor: "rgba(218, 165, 32, 0.2)",
                      animationDuration: "2.5s",
                    }}
                  />
                )}
              </div>
              <span
                className="text-xs font-medium hidden sm:inline transition-colors duration-300"
                style={{
                  color: isCurrent
                    ? "#daa520"
                    : isComplete
                      ? "rgba(205, 133, 63, 0.7)"
                      : "rgba(255, 255, 255, 0.3)",
                  letterSpacing: "0.3px",
                  fontWeight: isCurrent ? 600 : 400,
                }}
              >
                {step.label}
              </span>
            </div>

            {/* Connector line — brass chain/link feel */}
            {i < steps.length - 1 && (
              <div className="flex items-center gap-0.5 mx-1">
                <div
                  className="w-2 h-0.5 rounded-full transition-all duration-500"
                  style={{
                    backgroundColor: isComplete
                      ? "rgba(184, 134, 11, 0.6)"
                      : "rgba(205, 133, 63, 0.1)",
                  }}
                />
                <div
                  className="w-1 h-1 rounded-full transition-all duration-500"
                  style={{
                    backgroundColor: isComplete
                      ? "rgba(184, 134, 11, 0.4)"
                      : "rgba(205, 133, 63, 0.08)",
                  }}
                />
                <div
                  className="w-2 h-0.5 rounded-full transition-all duration-500"
                  style={{
                    backgroundColor: isComplete
                      ? "rgba(184, 134, 11, 0.6)"
                      : "rgba(205, 133, 63, 0.1)",
                  }}
                />
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
