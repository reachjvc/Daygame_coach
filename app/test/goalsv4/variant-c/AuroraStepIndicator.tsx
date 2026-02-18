"use client"

import { Check } from "lucide-react"

interface Step {
  label: string
  key: string
}

interface AuroraStepIndicatorProps {
  steps: Step[]
  currentStepIndex: number
  onStepClick?: (stepKey: string) => void
}

/**
 * Atmospheric layer step indicator.
 * Steps represent altitude layers from Horizon to Zenith.
 * Completed steps glow with aurora colors, current step pulses.
 * Clicking completed steps navigates back.
 */
export function AuroraStepIndicator({ steps, currentStepIndex, onStepClick }: AuroraStepIndicatorProps) {
  // Aurora gradient progresses from green (ground) through teal to purple (zenith)
  const layerColors = [
    { color: "#4ade80", glow: "rgba(74, 222, 128, 0.5)" },
    { color: "#22d3ee", glow: "rgba(34, 211, 238, 0.5)" },
    { color: "#60a5fa", glow: "rgba(96, 165, 250, 0.5)" },
    { color: "#a78bfa", glow: "rgba(167, 139, 250, 0.5)" },
    { color: "#e879f9", glow: "rgba(232, 121, 249, 0.5)" },
  ]

  return (
    <div className="relative">
      {/* Altitude line background */}
      <div className="flex items-center justify-center gap-0">
        {steps.map((step, i) => {
          const isComplete = i < currentStepIndex
          const isCurrent = i === currentStepIndex
          const isPast = isComplete
          const layerColor = layerColors[i] ?? layerColors[0]
          const isClickable = isPast && onStepClick

          return (
            <div key={step.key} className="flex items-center gap-0">
              {/* Step node */}
              <button
                onClick={() => isClickable && onStepClick(step.key)}
                disabled={!isClickable}
                className={`group flex flex-col items-center gap-1.5 ${isClickable ? "cursor-pointer" : "cursor-default"}`}
              >
                {/* Altitude label */}
                <span
                  className="text-[9px] font-light tracking-[0.2em] uppercase transition-colors duration-500"
                  style={{
                    color: isCurrent
                      ? layerColor.color
                      : isComplete
                        ? `${layerColor.color}99`
                        : "rgba(255, 255, 255, 0.2)",
                  }}
                >
                  {step.label}
                </span>

                {/* Node */}
                <div
                  className="relative flex items-center justify-center size-8 rounded-full text-xs font-medium transition-all duration-700"
                  style={{
                    background:
                      isComplete || isCurrent
                        ? `linear-gradient(135deg, ${layerColor.color} 0%, ${layerColors[Math.min(i + 1, layerColors.length - 1)].color} 100%)`
                        : "rgba(255, 255, 255, 0.04)",
                    color: isComplete || isCurrent ? "white" : "rgba(255, 255, 255, 0.25)",
                    transform: isCurrent ? "scale(1.2)" : "scale(1)",
                    boxShadow: isCurrent
                      ? `0 0 20px ${layerColor.glow}, 0 0 40px ${layerColor.glow}`
                      : isComplete
                        ? `0 0 12px ${layerColor.glow}`
                        : "none",
                    border: isComplete || isCurrent ? "none" : "1px solid rgba(255, 255, 255, 0.06)",
                  }}
                >
                  {isComplete ? <Check className="size-3.5" /> : i + 1}

                  {/* Active pulse ring */}
                  {isCurrent && (
                    <span
                      className="absolute inset-0 rounded-full"
                      style={{
                        background: `linear-gradient(135deg, ${layerColor.color} 0%, ${layerColors[Math.min(i + 1, layerColors.length - 1)].color} 100%)`,
                        opacity: 0.3,
                        animation: "auroraLayerPulse 2.5s ease-in-out infinite",
                      }}
                    />
                  )}
                </div>

                {/* Altitude marker (km) */}
                <span
                  className="text-[8px] font-light tracking-wider transition-colors duration-500"
                  style={{
                    color: isCurrent ? "rgba(255, 255, 255, 0.4)" : "rgba(255, 255, 255, 0.12)",
                  }}
                >
                  {(i + 1) * 100}km
                </span>
              </button>

              {/* Connector — atmospheric gradient line */}
              {i < steps.length - 1 && (
                <div className="relative mx-1">
                  <div
                    className="w-10 sm:w-14 h-0.5 rounded-full transition-all duration-700"
                    style={{
                      background: isComplete
                        ? `linear-gradient(90deg, ${layerColor.color}80, ${layerColors[i + 1].color}80)`
                        : "rgba(255, 255, 255, 0.04)",
                      boxShadow: isComplete
                        ? `0 0 8px ${layerColor.glow}`
                        : "none",
                    }}
                  />
                  {/* Particle dots on completed connectors */}
                  {isComplete && (
                    <div
                      className="absolute top-1/2 -translate-y-1/2 size-1 rounded-full"
                      style={{
                        backgroundColor: layerColors[i + 1].color,
                        animation: "particleSlide 2s ease-in-out infinite",
                        left: "30%",
                        opacity: 0.6,
                      }}
                    />
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>

      <style>{`
        @keyframes auroraLayerPulse {
          0%, 100% { transform: scale(1); opacity: 0.3; }
          50% { transform: scale(1.7); opacity: 0; }
        }
        @keyframes particleSlide {
          0%, 100% { left: 20%; opacity: 0.2; }
          50% { left: 70%; opacity: 0.8; }
        }
      `}</style>
    </div>
  )
}
