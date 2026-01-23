"use client"

import { X, Check, Compass, Target, Heart, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import { InnerGameStep, type InnerGameProgress } from "../types"
import { TIME_ESTIMATES, CATEGORIES } from "../config"

type WelcomeCardProps = {
  progress: InnerGameProgress
  onDismiss: () => void | Promise<void>
  completedCategories: number
}

export function WelcomeCard({
  progress,
  onDismiss,
  completedCategories,
}: WelcomeCardProps) {
  const totalCategories = CATEGORIES.length
  const estimatedMinutes = TIME_ESTIMATES.totalMinutes()

  const steps = [
    {
      step: InnerGameStep.VALUES,
      label: `Discover Your Values`,
      detail: `${completedCategories}/${totalCategories} categories`,
      completed: progress.step1Completed,
      icon: Compass,
      time: "~10 min",
    },
    {
      step: InnerGameStep.HURDLES,
      label: "Face Your Hurdles",
      completed: progress.step2Completed,
      icon: Target,
      time: "~2 min",
    },
    {
      step: InnerGameStep.DEATHBED,
      label: "Define Your Legacy",
      completed: progress.step3Completed,
      icon: Heart,
      time: "~2 min",
    },
    {
      step: InnerGameStep.CUTTING,
      label: "Prioritize What Matters",
      completed: progress.cuttingCompleted,
      icon: Sparkles,
      time: "~4 min",
    },
  ]

  const completedCount = steps.filter(s => s.completed).length
  const isReturningUser = completedCount > 0

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-card rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto border border-border/50">
        {/* Header with gradient accent */}
        <div className="relative p-6 pb-4">
          <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-primary via-purple-500 to-pink-500 rounded-t-2xl" />

          <button
            onClick={onDismiss}
            className="absolute top-4 right-4 p-2 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted transition-all"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="text-center pt-4">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-primary/20 to-purple-500/20 flex items-center justify-center">
              <Compass className="w-8 h-8 text-primary" />
            </div>
            <h2 className="text-2xl font-bold text-foreground">
              {isReturningUser ? "Welcome Back" : "Discover Your Inner Game"}
            </h2>
            <p className="text-muted-foreground mt-2 text-sm">
              {isReturningUser
                ? "Ready to continue your journey?"
                : "Know your values. Own your confidence."
              }
            </p>
          </div>
        </div>

        {/* Body */}
        <div className="px-6 pb-6 space-y-5">
          {/* Quick intro */}
          {!isReturningUser && (
            <p className="text-muted-foreground text-sm leading-relaxed text-center">
              Your inner game is your foundation. When you know what you stand for,
              you become unshakeable—and that's magnetic.
            </p>
          )}

          {/* Progress overview */}
          <div className="bg-gradient-to-br from-muted/50 to-muted/30 rounded-xl p-4 border border-border/50">
            <div className="flex justify-between items-center mb-3">
              <span className="text-sm font-medium text-foreground">
                Your Progress
              </span>
              <span className="text-xs px-2 py-1 rounded-full bg-primary/10 text-primary font-medium">
                ~{estimatedMinutes} min total
              </span>
            </div>
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-primary to-purple-500 rounded-full transition-all duration-500"
                style={{ width: `${Math.max((completedCount / steps.length) * 100, 5)}%` }}
              />
            </div>
            <p className="text-xs text-muted-foreground mt-2 text-center">
              {completedCount} of {steps.length} steps completed
            </p>
          </div>

          {/* Step list */}
          <div className="space-y-2">
            {steps.map((item) => {
              const Icon = item.icon
              return (
                <div
                  key={item.step}
                  className={`
                    flex items-center gap-3 p-3 rounded-lg transition-all
                    ${item.completed
                      ? "bg-primary/5 border border-primary/20"
                      : "bg-muted/30 border border-transparent"
                    }
                  `}
                >
                  <div
                    className={`
                      w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0
                      ${item.completed
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground"
                      }
                    `}
                  >
                    {item.completed ? (
                      <Check className="w-5 h-5" />
                    ) : (
                      <Icon className="w-5 h-5" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <span
                      className={`
                        block text-sm font-medium
                        ${item.completed ? "text-muted-foreground line-through" : "text-foreground"}
                      `}
                    >
                      {item.label}
                    </span>
                    {item.detail && !item.completed && (
                      <span className="text-xs text-muted-foreground">
                        {item.detail}
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-muted-foreground flex-shrink-0">
                    {item.time}
                  </span>
                </div>
              )
            })}
          </div>

          {/* Action button */}
          <Button
            onClick={onDismiss}
            className="w-full h-12 text-base font-semibold bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary shadow-lg shadow-primary/20"
            size="lg"
          >
            {completedCount === 0 ? "Let's Begin" : "Continue Journey"}
          </Button>

          {/* Subtle footer */}
          <p className="text-xs text-muted-foreground text-center">
            Your progress is saved automatically
          </p>
        </div>
      </div>
    </div>
  )
}
