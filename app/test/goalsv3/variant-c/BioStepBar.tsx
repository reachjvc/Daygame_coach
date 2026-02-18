"use client"

import { Check } from "lucide-react"

interface Step {
  label: string
  key: string
}

interface BioStepBarProps {
  steps: Step[]
  currentStepIndex: number
}

/** Bioluminescent step indicator -- glowing nodes connected by tendrils */
export function BioStepBar({ steps, currentStepIndex }: BioStepBarProps) {
  return (
    <div className="flex items-center justify-center gap-1">
      {steps.map((step, i) => {
        const isComplete = i < currentStepIndex
        const isCurrent = i === currentStepIndex

        // Bioluminescent color cycling through steps
        const stepColors = ["#00ffff", "#00ccff", "#00ff88", "#ff00ff", "#00ffff"]
        const glowColor = stepColors[i] ?? "#00ffff"

        return (
          <div key={step.key} className="flex items-center gap-1">
            {/* Step node */}
            <div className="flex items-center gap-2">
              <div
                className="relative flex items-center justify-center size-7 rounded-full text-xs font-bold transition-all duration-700"
                style={{
                  backgroundColor: isComplete
                    ? `${glowColor}30`
                    : isCurrent
                      ? `${glowColor}25`
                      : "rgba(255, 255, 255, 0.04)",
                  color: isComplete || isCurrent ? glowColor : "rgba(255, 255, 255, 0.25)",
                  border: isComplete || isCurrent
                    ? `1.5px solid ${glowColor}60`
                    : "1.5px solid rgba(255, 255, 255, 0.06)",
                  transform: isCurrent ? "scale(1.15)" : "scale(1)",
                  boxShadow: isCurrent
                    ? `0 0 12px ${glowColor}50, 0 0 30px ${glowColor}20, inset 0 0 8px ${glowColor}15`
                    : isComplete
                      ? `0 0 8px ${glowColor}30`
                      : "none",
                }}
              >
                {isComplete ? <Check className="size-3.5" /> : i + 1}

                {/* Glow pulse ring on current step */}
                {isCurrent && (
                  <span
                    className="absolute inset-0 rounded-full"
                    style={{
                      border: `1px solid ${glowColor}40`,
                      animation: "bioPulseGlow 3s ease-in-out infinite",
                      ["--glow-color" as string]: `${glowColor}40`,
                    }}
                  />
                )}
              </div>

              <span
                className="text-xs font-medium hidden sm:inline transition-colors duration-500"
                style={{
                  color: isCurrent
                    ? glowColor
                    : isComplete
                      ? `${glowColor}90`
                      : "rgba(255, 255, 255, 0.2)",
                  textShadow: isCurrent ? `0 0 8px ${glowColor}60` : "none",
                }}
              >
                {step.label}
              </span>
            </div>

            {/* Tendril connector */}
            {i < steps.length - 1 && (
              <div
                className="w-8 h-0.5 mx-1 rounded-full transition-all duration-700"
                style={{
                  background: isComplete
                    ? `linear-gradient(90deg, ${glowColor}60, ${stepColors[i + 1] ?? "#00ffff"}60)`
                    : "rgba(255, 255, 255, 0.04)",
                  boxShadow: isComplete
                    ? `0 0 6px ${glowColor}30`
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
