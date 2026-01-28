"use client"

import { Check, Compass, Eye, Flame, Target, Sparkles, Trophy } from "lucide-react"
import { InnerGameStep } from "../../types"

type StepProgressProps = {
  currentStep: InnerGameStep
  completedSteps: InnerGameStep[]
  onStepClick?: (step: InnerGameStep) => void
}

const STEPS = [
  { step: InnerGameStep.VALUES, label: "Values", icon: Compass },
  { step: InnerGameStep.SHADOW, label: "Shadow", icon: Eye },
  { step: InnerGameStep.PEAK_EXPERIENCE, label: "Peak", icon: Flame },
  { step: InnerGameStep.HURDLES, label: "Hurdles", icon: Target },
  { step: InnerGameStep.CUTTING, label: "Prioritize", icon: Sparkles },
  { step: InnerGameStep.COMPLETE, label: "Complete", icon: Trophy },
]

export function StepProgress({ currentStep, completedSteps, onStepClick }: StepProgressProps) {
  const completedSet = new Set(completedSteps)

  return (
    <div className="w-full">
      {/* Progress bar */}
      <div className="relative mb-4">
        <div className="h-1.5 bg-muted rounded-full">
          <div
            className="h-1.5 bg-gradient-to-r from-primary to-purple-500 rounded-full transition-all duration-500"
            style={{
              width: `${Math.max((completedSteps.length / STEPS.length) * 100, 2)}%`,
            }}
          />
        </div>
      </div>

      {/* Step indicators - responsive layout */}
      <div className="flex justify-between items-start">
        {STEPS.map(({ step, label, icon: Icon }) => {
          const isCompleted = completedSet.has(step)
          const isCurrent = currentStep === step
          const isClickable = onStepClick && (isCompleted || step <= currentStep + 1)

          return (
            <button
              key={step}
              onClick={() => isClickable && onStepClick?.(step)}
              disabled={!isClickable}
              className={`
                flex flex-col items-center gap-1.5 transition-all flex-1 max-w-[60px]
                ${isClickable ? "cursor-pointer" : "cursor-default"}
                ${isCurrent ? "scale-105" : ""}
              `}
            >
              <div
                className={`
                  w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center
                  transition-all duration-200
                  ${isCompleted
                    ? "bg-primary text-primary-foreground shadow-md shadow-primary/30"
                    : isCurrent
                    ? "bg-primary/20 text-primary ring-2 ring-primary ring-offset-2 ring-offset-background"
                    : "bg-muted text-muted-foreground"
                  }
                `}
              >
                {isCompleted ? (
                  <Check className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                ) : (
                  <Icon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                )}
              </div>
              <span
                className={`
                  text-[9px] sm:text-[10px] text-center leading-tight font-medium
                  ${isCurrent ? "text-primary" : isCompleted ? "text-muted-foreground" : "text-muted-foreground/70"}
                `}
              >
                {label}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
