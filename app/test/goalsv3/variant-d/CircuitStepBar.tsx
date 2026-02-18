"use client"

import { Check } from "lucide-react"

interface Step {
  label: string
  key: string
}

interface CircuitStepBarProps {
  steps: Step[]
  currentStepIndex: number
}

/**
 * Circuit-board themed step indicator.
 * Steps are rendered as IC chips connected by circuit traces.
 * Data pulses flow along completed traces.
 */
export function CircuitStepBar({ steps, currentStepIndex }: CircuitStepBarProps) {
  return (
    <div className="flex items-center justify-center gap-0">
      {steps.map((step, i) => {
        const isComplete = i < currentStepIndex
        const isCurrent = i === currentStepIndex

        return (
          <div key={step.key} className="flex items-center gap-0">
            {/* Step chip */}
            <div className="flex items-center gap-2">
              <div className="relative">
                {/* Pin notch on top */}
                <div
                  className="absolute -top-0.5 left-1/2 -translate-x-1/2 w-2 h-0.5"
                  style={{
                    backgroundColor: isComplete || isCurrent ? "#00ff41" : "rgba(0, 255, 65, 0.15)",
                    borderRadius: "0 0 2px 2px",
                  }}
                />
                {/* Chip body */}
                <div
                  className="relative flex items-center justify-center w-8 h-8 text-xs font-bold transition-all duration-500"
                  style={{
                    fontFamily: "var(--font-mono, 'Geist Mono', monospace)",
                    backgroundColor: isComplete
                      ? "rgba(0, 255, 65, 0.12)"
                      : isCurrent
                        ? "rgba(0, 255, 65, 0.08)"
                        : "rgba(0, 255, 65, 0.02)",
                    border: isComplete || isCurrent
                      ? "1.5px solid rgba(0, 255, 65, 0.5)"
                      : "1px solid rgba(0, 255, 65, 0.12)",
                    borderRadius: 3,
                    color: isComplete || isCurrent ? "#00ff41" : "rgba(0, 255, 65, 0.3)",
                    boxShadow: isCurrent
                      ? "0 0 12px rgba(0, 255, 65, 0.3), inset 0 0 8px rgba(0, 255, 65, 0.05)"
                      : isComplete
                        ? "0 0 6px rgba(0, 255, 65, 0.15)"
                        : "none",
                  }}
                >
                  {isComplete ? <Check className="size-3.5" /> : i + 1}
                  {/* LED indicator */}
                  <div
                    className="absolute -bottom-0.5 -right-0.5 w-1.5 h-1.5 rounded-full"
                    style={{
                      backgroundColor: isComplete ? "#00ff41" : isCurrent ? "#ffab00" : "rgba(0, 255, 65, 0.1)",
                      boxShadow: isComplete
                        ? "0 0 4px #00ff41"
                        : isCurrent
                          ? "0 0 4px #ffab00"
                          : "none",
                    }}
                  />
                  {/* Scan line animation for current step */}
                  {isCurrent && (
                    <div
                      className="absolute inset-0 overflow-hidden"
                      style={{ borderRadius: 3 }}
                    >
                      <div
                        className="absolute inset-x-0 h-px"
                        style={{
                          backgroundColor: "rgba(0, 255, 65, 0.4)",
                          animation: "circuit-scan 2s linear infinite",
                        }}
                      />
                    </div>
                  )}
                </div>
              </div>
              {/* Label */}
              <span
                className="text-[10px] font-semibold hidden sm:inline tracking-wider transition-colors duration-300"
                style={{
                  fontFamily: "var(--font-mono, 'Geist Mono', monospace)",
                  textTransform: "uppercase",
                  letterSpacing: "0.08em",
                  color: isCurrent
                    ? "#00ff41"
                    : isComplete
                      ? "rgba(0, 255, 65, 0.6)"
                      : "rgba(0, 255, 65, 0.2)",
                }}
              >
                {step.label}
              </span>
            </div>

            {/* Circuit trace connector */}
            {i < steps.length - 1 && (
              <div className="relative w-10 h-4 mx-1">
                {/* Trace line */}
                <div
                  className="absolute top-1/2 -translate-y-1/2 w-full h-px"
                  style={{
                    backgroundColor: isComplete
                      ? "rgba(0, 255, 65, 0.4)"
                      : "rgba(0, 255, 65, 0.1)",
                  }}
                />
                {/* Via dot in middle */}
                <div
                  className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full"
                  style={{
                    backgroundColor: isComplete ? "rgba(0, 255, 65, 0.5)" : "rgba(0, 255, 65, 0.1)",
                    boxShadow: isComplete ? "0 0 3px rgba(0, 255, 65, 0.3)" : "none",
                  }}
                />
                {/* Animated data pulse on completed traces */}
                {isComplete && (
                  <div
                    className="absolute top-1/2 -translate-y-1/2 w-1 h-1 rounded-full"
                    style={{
                      backgroundColor: "#00ff41",
                      boxShadow: "0 0 4px #00ff41",
                      animation: "trace-pulse 1.5s ease-in-out infinite",
                    }}
                  />
                )}
              </div>
            )}
          </div>
        )
      })}

      <style>{`
        @keyframes circuit-scan {
          0% { top: 0; }
          100% { top: 100%; }
        }
        @keyframes trace-pulse {
          0% { left: 0%; opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100% { left: 100%; opacity: 0; }
        }
      `}</style>
    </div>
  )
}
