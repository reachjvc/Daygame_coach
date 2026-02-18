"use client"

import { Check } from "lucide-react"

interface Step {
  label: string
  key: string
}

interface StormStepBarProps {
  steps: Step[]
  currentStepIndex: number
}

/**
 * Solar storm step indicator with fiery gradient progression.
 * Completed steps burn orange/red, current step pulses with magnetic energy.
 */
export function StormStepBar({ steps, currentStepIndex }: StormStepBarProps) {
  const stormGradient = "linear-gradient(135deg, #ff4d4d 0%, #ff8c1a 50%, #ffd700 100%)"

  return (
    <div className="flex items-center justify-center gap-1">
      {steps.map((step, i) => {
        const isComplete = i < currentStepIndex
        const isCurrent = i === currentStepIndex

        return (
          <div key={step.key} className="flex items-center gap-1">
            <div className="flex items-center gap-2">
              <div
                className="relative flex items-center justify-center size-7 rounded-full text-xs font-bold transition-all duration-700"
                style={{
                  background: isComplete || isCurrent
                    ? stormGradient
                    : "rgba(255, 255, 255, 0.06)",
                  color: isComplete || isCurrent ? "white" : "rgba(255, 255, 255, 0.3)",
                  transform: isCurrent ? "scale(1.15)" : "scale(1)",
                  boxShadow: isCurrent
                    ? "0 0 16px rgba(255, 77, 77, 0.5), 0 0 30px rgba(255, 140, 26, 0.3)"
                    : isComplete
                      ? "0 0 10px rgba(255, 77, 77, 0.25)"
                      : "none",
                }}
              >
                {isComplete ? <Check className="size-3.5" /> : i + 1}
                {isCurrent && (
                  <span
                    className="absolute inset-0 rounded-full"
                    style={{
                      background: stormGradient,
                      opacity: 0.3,
                      animation: "stormStepPing 2s ease-in-out infinite",
                    }}
                  />
                )}
              </div>
              <span
                className="text-xs font-light tracking-wide hidden sm:inline transition-colors duration-500"
                style={{
                  color: isCurrent
                    ? "rgba(255, 140, 26, 0.95)"
                    : isComplete
                      ? "rgba(255, 77, 77, 0.75)"
                      : "rgba(255, 255, 255, 0.25)",
                  letterSpacing: "0.05em",
                }}
              >
                {step.label}
              </span>
            </div>

            {i < steps.length - 1 && (
              <div
                className="w-8 h-0.5 mx-1 rounded-full transition-all duration-700"
                style={{
                  background: isComplete
                    ? "linear-gradient(90deg, rgba(255, 77, 77, 0.5), rgba(255, 140, 26, 0.5))"
                    : "rgba(255, 255, 255, 0.06)",
                  boxShadow: isComplete
                    ? "0 0 6px rgba(255, 77, 77, 0.2)"
                    : "none",
                }}
              />
            )}
          </div>
        )
      })}

      <style>{`
        @keyframes stormStepPing {
          0%, 100% { transform: scale(1); opacity: 0.3; }
          50% { transform: scale(1.6); opacity: 0; }
        }
      `}</style>
    </div>
  )
}
