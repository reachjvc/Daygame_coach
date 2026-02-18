"use client"

import { Check } from "lucide-react"

interface Step {
  label: string
  key: string
}

interface NebulaStepBarProps {
  steps: Step[]
  currentStepIndex: number
}

/**
 * Space-HUD step indicator with nebula glow effects.
 * Each step is a glowing node connected by plasma streams.
 */
export function NebulaStepBar({ steps, currentStepIndex }: NebulaStepBarProps) {
  return (
    <div className="flex items-center justify-center gap-1">
      {steps.map((step, i) => {
        const isComplete = i < currentStepIndex
        const isCurrent = i === currentStepIndex

        return (
          <div key={step.key} className="flex items-center gap-1">
            <div className="flex items-center gap-2">
              {/* Step node */}
              <div
                className="relative flex items-center justify-center size-7 rounded-full text-xs font-bold transition-all duration-500"
                style={{
                  backgroundColor: isComplete
                    ? "rgba(249,115,22,0.8)"
                    : isCurrent
                      ? "rgba(249,115,22,0.7)"
                      : "rgba(255,255,255,0.04)",
                  color: isComplete || isCurrent ? "white" : "rgba(255,255,255,0.25)",
                  transform: isCurrent ? "scale(1.2)" : "scale(1)",
                  boxShadow: isCurrent
                    ? "0 0 16px rgba(249,115,22,0.6), 0 0 32px rgba(249,115,22,0.2), inset 0 0 8px rgba(255,255,255,0.1)"
                    : isComplete
                      ? "0 0 10px rgba(249,115,22,0.3), 0 0 20px rgba(249,115,22,0.1)"
                      : "none",
                  border: isCurrent
                    ? "1px solid rgba(249,115,22,0.6)"
                    : isComplete
                      ? "1px solid rgba(249,115,22,0.3)"
                      : "1px solid rgba(255,255,255,0.06)",
                }}
              >
                {isComplete ? <Check className="size-3.5" /> : i + 1}
                {/* Glow ring on current step */}
                {isCurrent && (
                  <span
                    className="absolute inset-0 rounded-full"
                    style={{
                      border: "1px solid rgba(249,115,22,0.3)",
                      animation: "nebulaStepPulse 2.5s ease-in-out infinite",
                    }}
                  />
                )}
              </div>
              <span
                className="text-xs font-medium hidden sm:inline transition-colors duration-300"
                style={{
                  color: isCurrent
                    ? "rgba(249,115,22,0.9)"
                    : isComplete
                      ? "rgba(249,115,22,0.6)"
                      : "rgba(255,255,255,0.2)",
                  textShadow: isCurrent
                    ? "0 0 8px rgba(249,115,22,0.3)"
                    : "none",
                }}
              >
                {step.label}
              </span>
            </div>

            {/* Plasma connector */}
            {i < steps.length - 1 && (
              <div
                className="relative w-8 h-0.5 mx-1 rounded-full transition-all duration-500 overflow-hidden"
                style={{
                  backgroundColor: isComplete
                    ? "rgba(249,115,22,0.4)"
                    : "rgba(255,255,255,0.04)",
                  boxShadow: isComplete
                    ? "0 0 6px rgba(249,115,22,0.2)"
                    : "none",
                }}
              >
                {/* Animated plasma pulse traveling along the connector */}
                {isComplete && (
                  <div
                    className="absolute inset-y-0 w-3 rounded-full"
                    style={{
                      background: "linear-gradient(90deg, transparent, rgba(249,115,22,0.8), transparent)",
                      animation: "plasmaFlow 2s ease-in-out infinite",
                    }}
                  />
                )}
              </div>
            )}
          </div>
        )
      })}

      <style>{`
        @keyframes nebulaStepPulse {
          0%, 100% { transform: scale(1); opacity: 0.6; }
          50% { transform: scale(1.5); opacity: 0; }
        }
        @keyframes plasmaFlow {
          0% { left: -12px; }
          100% { left: 100%; }
        }
      `}</style>
    </div>
  )
}
