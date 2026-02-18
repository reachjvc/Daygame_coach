"use client"

import { Check } from "lucide-react"

interface Step {
  label: string
  key: string
}

interface HoloStepBarProps {
  steps: Step[]
  currentStepIndex: number
}

const CYAN = "#00f0ff"
const CYAN_DIM = "rgba(0, 240, 255, 0.15)"

export function HoloStepBar({ steps, currentStepIndex }: HoloStepBarProps) {
  return (
    <div className="flex items-center justify-center gap-1">
      {steps.map((step, i) => {
        const isComplete = i < currentStepIndex
        const isCurrent = i === currentStepIndex

        return (
          <div key={step.key} className="flex items-center gap-1">
            <div className="flex items-center gap-2">
              <div
                className="relative flex items-center justify-center size-7 text-xs font-bold transition-all duration-500"
                style={{
                  backgroundColor: isComplete
                    ? CYAN
                    : isCurrent
                      ? "rgba(0, 240, 255, 0.2)"
                      : "rgba(0, 240, 255, 0.04)",
                  color: isComplete
                    ? "#020a14"
                    : isCurrent
                      ? CYAN
                      : "rgba(0, 240, 255, 0.35)",
                  border: isCurrent
                    ? `2px solid ${CYAN}`
                    : isComplete
                      ? `2px solid ${CYAN}`
                      : `1px solid rgba(0, 240, 255, 0.12)`,
                  borderRadius: 4,
                  transform: isCurrent ? "scale(1.15)" : "scale(1)",
                  boxShadow: isCurrent
                    ? `0 0 12px rgba(0, 240, 255, 0.5), 0 0 24px rgba(0, 240, 255, 0.2), inset 0 0 8px rgba(0, 240, 255, 0.1)`
                    : isComplete
                      ? `0 0 8px rgba(0, 240, 255, 0.3)`
                      : "none",
                  fontFamily: "var(--font-mono, 'Geist Mono', monospace)",
                }}
              >
                {isComplete ? <Check className="size-3.5" /> : i + 1}
                {isCurrent && (
                  <span
                    className="absolute inset-0 animate-ping"
                    style={{
                      backgroundColor: "rgba(0, 240, 255, 0.15)",
                      animationDuration: "2.5s",
                      borderRadius: 4,
                    }}
                  />
                )}
              </div>
              <span
                className="text-xs font-medium hidden sm:inline transition-colors duration-300"
                style={{
                  color: isCurrent
                    ? CYAN
                    : isComplete
                      ? "rgba(0, 240, 255, 0.6)"
                      : "rgba(255, 255, 255, 0.25)",
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                  fontFamily: "var(--font-mono, 'Geist Mono', monospace)",
                  fontSize: 10,
                  fontWeight: isCurrent ? 700 : 400,
                }}
              >
                {step.label}
              </span>
            </div>

            {/* Connector */}
            {i < steps.length - 1 && (
              <div className="flex items-center gap-0.5 mx-1">
                <div
                  className="w-4 h-px transition-all duration-500"
                  style={{
                    backgroundColor: isComplete ? "rgba(0, 240, 255, 0.5)" : "rgba(0, 240, 255, 0.08)",
                  }}
                />
                <div
                  className="size-1 transition-all duration-500"
                  style={{
                    backgroundColor: isComplete ? "rgba(0, 240, 255, 0.35)" : "rgba(0, 240, 255, 0.06)",
                    clipPath: "polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)",
                  }}
                />
                <div
                  className="w-4 h-px transition-all duration-500"
                  style={{
                    backgroundColor: isComplete ? "rgba(0, 240, 255, 0.5)" : "rgba(0, 240, 255, 0.08)",
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
