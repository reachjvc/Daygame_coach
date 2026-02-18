"use client"

import { Check } from "lucide-react"

interface Step {
  label: string
  key: string
}

interface AstrolabeStepGaugeProps {
  steps: Step[]
  currentStepIndex: number
  onStepClick?: (index: number) => void
}

const goldColor = "#daa520"
const brassColor = "#cd853f"
const darkBrass = "#b8860b"

export function AstrolabeStepGauge({
  steps,
  currentStepIndex,
  onStepClick,
}: AstrolabeStepGaugeProps) {
  return (
    <div className="relative">
      {/* Background brass bar */}
      <div
        className="absolute top-1/2 left-8 right-8 h-0.5 -translate-y-1/2"
        style={{ backgroundColor: `${brassColor}15` }}
      />
      {/* Progress fill */}
      <div
        className="absolute top-1/2 left-8 h-0.5 -translate-y-1/2 transition-all duration-700 ease-out"
        style={{
          backgroundColor: `${darkBrass}60`,
          width: `calc(${(currentStepIndex / (steps.length - 1)) * 100}% - 64px)`,
          boxShadow: `0 0 8px ${goldColor}30`,
        }}
      />

      <div className="relative flex items-center justify-between">
        {steps.map((step, i) => {
          const isComplete = i < currentStepIndex
          const isCurrent = i === currentStepIndex
          const canClick = onStepClick && i < currentStepIndex

          return (
            <div key={step.key} className="flex flex-col items-center gap-1.5">
              <button
                onClick={() => canClick && onStepClick(i)}
                disabled={!canClick}
                className={`
                  relative flex items-center justify-center size-8 rounded-full text-xs font-bold
                  transition-all duration-500
                  ${canClick ? "cursor-pointer" : "cursor-default"}
                `}
                style={{
                  backgroundColor: isComplete
                    ? darkBrass
                    : isCurrent
                      ? goldColor
                      : `${brassColor}12`,
                  color:
                    isComplete || isCurrent
                      ? "#0a0a1a"
                      : `${brassColor}50`,
                  border: isCurrent
                    ? `2px solid ${goldColor}`
                    : isComplete
                      ? `2px solid ${darkBrass}`
                      : `1px solid ${brassColor}20`,
                  transform: isCurrent ? "scale(1.2)" : "scale(1)",
                  boxShadow: isCurrent
                    ? `0 0 16px ${goldColor}60, 0 0 32px ${goldColor}20`
                    : isComplete
                      ? `0 0 8px ${darkBrass}30`
                      : "none",
                }}
              >
                {isComplete ? <Check className="size-3.5" /> : i + 1}

                {/* Pulsing ring on current */}
                {isCurrent && (
                  <span
                    className="absolute inset-0 rounded-full animate-ping"
                    style={{
                      backgroundColor: `${goldColor}20`,
                      animationDuration: "2.5s",
                    }}
                  />
                )}

                {/* Gear teeth decoration for current step */}
                {isCurrent && (
                  <svg
                    className="absolute -inset-2"
                    viewBox="0 0 48 48"
                    style={{ pointerEvents: "none" }}
                  >
                    {Array.from({ length: 12 }, (_, t) => {
                      const angle = (t / 12) * Math.PI * 2
                      const innerR = 18
                      const outerR = 22
                      return (
                        <line
                          key={t}
                          x1={24 + Math.cos(angle) * innerR}
                          y1={24 + Math.sin(angle) * innerR}
                          x2={24 + Math.cos(angle) * outerR}
                          y2={24 + Math.sin(angle) * outerR}
                          stroke={goldColor}
                          strokeWidth="1.5"
                          strokeOpacity="0.25"
                          strokeLinecap="round"
                        />
                      )
                    })}
                  </svg>
                )}
              </button>

              <span
                className="text-[10px] font-medium tracking-wide transition-colors duration-300 hidden sm:block"
                style={{
                  color: isCurrent
                    ? goldColor
                    : isComplete
                      ? `${brassColor}90`
                      : "rgba(255, 255, 255, 0.3)",
                  fontWeight: isCurrent ? 700 : 400,
                  letterSpacing: "0.5px",
                  textTransform: "uppercase",
                }}
              >
                {step.label}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
