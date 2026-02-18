"use client"

import { Check, Sprout, Sun, Leaf, Snowflake, TreePine } from "lucide-react"

interface Step {
  label: string
  key: string
}

interface SeasonStepBarProps {
  steps: Step[]
  currentStepIndex: number
}

const SEASON_COLORS = [
  "#86efac", // Spring green
  "#fbbf24", // Summer gold
  "#f97316", // Fall orange
  "#93c5fd", // Winter blue
  // Step 5: all-season gradient uses spring green as fallback
]

const STEP_ICONS = [Sprout, Sun, Leaf, Snowflake, TreePine]

/** Seasonal gradient for the final step */
const ALL_SEASON_GRADIENT =
  "linear-gradient(135deg, #86efac 0%, #fbbf24 33%, #f97316 66%, #93c5fd 100%)"

function getStepColor(index: number): string {
  if (index < SEASON_COLORS.length) return SEASON_COLORS[index]
  return SEASON_COLORS[0]
}

export function SeasonStepBar({ steps, currentStepIndex }: SeasonStepBarProps) {
  return (
    <div className="flex items-center justify-center gap-1">
      {steps.map((step, i) => {
        const isComplete = i < currentStepIndex
        const isCurrent = i === currentStepIndex
        const isFinal = i === steps.length - 1
        const color = getStepColor(i)
        const Icon = STEP_ICONS[i] || Sprout

        const bgStyle: React.CSSProperties =
          isFinal && (isComplete || isCurrent)
            ? { background: ALL_SEASON_GRADIENT }
            : {
                backgroundColor:
                  isComplete || isCurrent ? color : "var(--muted)",
              }

        return (
          <div key={step.key} className="flex items-center gap-1">
            <div className="flex items-center gap-2">
              {/* Step circle */}
              <div
                className="flex items-center justify-center size-7 rounded-full text-xs font-bold transition-all duration-300"
                style={{
                  ...bgStyle,
                  color:
                    isComplete || isCurrent
                      ? "white"
                      : "var(--muted-foreground)",
                  transform: isCurrent ? "scale(1.15)" : "scale(1)",
                  boxShadow: isCurrent
                    ? `0 0 10px ${color}50, 0 0 20px ${color}25`
                    : "none",
                }}
              >
                {isComplete ? (
                  <Check className="size-3.5" />
                ) : isCurrent ? (
                  <Icon className="size-3.5" />
                ) : (
                  i + 1
                )}
              </div>

              {/* Label */}
              <span
                className="text-xs font-medium hidden sm:inline transition-colors duration-300"
                style={{
                  color: isCurrent
                    ? color
                    : isComplete
                      ? color
                      : "var(--muted-foreground)",
                  fontWeight: isCurrent ? 700 : 500,
                }}
              >
                {step.label}
              </span>
            </div>

            {/* Connector line */}
            {i < steps.length - 1 && (
              <div
                className="w-8 h-0.5 mx-1 rounded-full transition-colors duration-300"
                style={{
                  backgroundColor: isComplete
                    ? getStepColor(i)
                    : "var(--border)",
                }}
              />
            )}
          </div>
        )
      })}
    </div>
  )
}
