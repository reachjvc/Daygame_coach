"use client"

import { Check } from "lucide-react"

interface Step {
  label: string
  key: string
}

interface AuroraStepBarProps {
  steps: Step[]
  currentStepIndex: number
}

/**
 * Ethereal step indicator with aurora-colored gradient dots
 * and soft connecting lines that glow as you progress.
 */
export function AuroraStepBar({ steps, currentStepIndex }: AuroraStepBarProps) {
  // Aurora gradient colors for the step indicators
  const auroraGradient = "linear-gradient(135deg, #4ade80 0%, #22d3ee 50%, #a78bfa 100%)"

  return (
    <div className="flex items-center justify-center gap-1">
      {steps.map((step, i) => {
        const isComplete = i < currentStepIndex
        const isCurrent = i === currentStepIndex

        return (
          <div key={step.key} className="flex items-center gap-1">
            {/* Step dot */}
            <div className="flex items-center gap-2">
              <div
                className="relative flex items-center justify-center size-7 rounded-full text-xs font-bold transition-all duration-700"
                style={{
                  background: isComplete || isCurrent
                    ? auroraGradient
                    : "rgba(255, 255, 255, 0.06)",
                  color: isComplete || isCurrent ? "white" : "rgba(255, 255, 255, 0.3)",
                  transform: isCurrent ? "scale(1.15)" : "scale(1)",
                  boxShadow: isCurrent
                    ? "0 0 16px rgba(74, 222, 128, 0.4), 0 0 30px rgba(34, 211, 238, 0.2)"
                    : isComplete
                      ? "0 0 10px rgba(74, 222, 128, 0.2)"
                      : "none",
                }}
              >
                {isComplete ? <Check className="size-3.5" /> : i + 1}
                {/* Glow pulse on current step */}
                {isCurrent && (
                  <span
                    className="absolute inset-0 rounded-full"
                    style={{
                      background: auroraGradient,
                      opacity: 0.3,
                      animation: "auroraStepPing 2.5s ease-in-out infinite",
                    }}
                  />
                )}
              </div>
              <span
                className="text-xs font-light tracking-wide hidden sm:inline transition-colors duration-500"
                style={{
                  color: isCurrent
                    ? "rgba(74, 222, 128, 0.9)"
                    : isComplete
                      ? "rgba(34, 211, 238, 0.7)"
                      : "rgba(255, 255, 255, 0.25)",
                  letterSpacing: "0.05em",
                }}
              >
                {step.label}
              </span>
            </div>

            {/* Connector line */}
            {i < steps.length - 1 && (
              <div
                className="w-8 h-0.5 mx-1 rounded-full transition-all duration-700"
                style={{
                  background: isComplete
                    ? "linear-gradient(90deg, rgba(74, 222, 128, 0.5), rgba(34, 211, 238, 0.5))"
                    : "rgba(255, 255, 255, 0.06)",
                  boxShadow: isComplete
                    ? "0 0 6px rgba(74, 222, 128, 0.2)"
                    : "none",
                }}
              />
            )}
          </div>
        )
      })}

      <style>{`
        @keyframes auroraStepPing {
          0%, 100% { transform: scale(1); opacity: 0.3; }
          50% { transform: scale(1.6); opacity: 0; }
        }
      `}</style>
    </div>
  )
}
