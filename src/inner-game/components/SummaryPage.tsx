"use client"

import { Button } from "@/components/ui/button"
import Link from "next/link"
import { ArrowLeft, Trophy, Sparkles, RotateCcw, LayoutGrid } from "lucide-react"
import { InnerGameStep, type CoreValue } from "../types"
import { StepProgress } from "./shared/StepProgress"

type SummaryPageProps = {
  coreValues: CoreValue[]
  aspirationalValues: { id: string }[]
  completedSteps: InnerGameStep[]
  onRestart: () => void
  onBackToHub?: () => void
  onStepClick?: (step: InnerGameStep) => void
}

export function SummaryPage({
  coreValues,
  aspirationalValues,
  completedSteps,
  onRestart,
  onBackToHub,
  onStepClick,
}: SummaryPageProps) {
  const formatValueName = (id: string) => id.replace(/-/g, " ")

  return (
    <div className="space-y-8">
      {/* Step progress */}
      <StepProgress
        currentStep={InnerGameStep.COMPLETE}
        completedSteps={completedSteps}
        onStepClick={onStepClick}
      />

      {/* Celebration header */}
      <div className="text-center space-y-4">
        <div className="w-20 h-20 mx-auto rounded-full bg-gradient-to-br from-yellow-500/20 to-primary/20 flex items-center justify-center shadow-lg shadow-primary/10">
          <Trophy className="w-10 h-10 text-primary" />
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
          Your Core Values
        </h1>
        <p className="text-sm sm:text-base text-muted-foreground max-w-md mx-auto leading-relaxed">
          These define who you are. Let them guide your actions, decisions, and how you show up—especially in daygame.
        </p>
      </div>

      {/* Core values list */}
      <div className="space-y-2">
        {coreValues.map((value) => (
          <div
            key={value.id}
            className={`
              flex items-center gap-4 p-4 rounded-xl border bg-card transition-all
              ${value.rank === 1
                ? "border-yellow-500/30 shadow-md shadow-yellow-500/10"
                : value.rank === 2
                ? "border-gray-400/30"
                : value.rank === 3
                ? "border-orange-500/30"
                : "border-border"
              }
            `}
          >
            <span
              className={`
                w-10 h-10 rounded-full flex items-center justify-center
                font-bold text-lg flex-shrink-0
                ${value.rank === 1
                  ? "bg-gradient-to-br from-yellow-500/30 to-yellow-600/20 text-yellow-600 dark:text-yellow-400"
                  : value.rank === 2
                  ? "bg-gradient-to-br from-gray-300/40 to-gray-400/20 text-gray-600 dark:text-gray-400"
                  : value.rank === 3
                  ? "bg-gradient-to-br from-orange-500/30 to-orange-600/20 text-orange-600 dark:text-orange-400"
                  : "bg-muted text-muted-foreground"
                }
              `}
            >
              {value.rank}
            </span>
            <span className="text-base sm:text-lg font-semibold text-foreground capitalize">
              {formatValueName(value.id)}
            </span>
          </div>
        ))}
      </div>

      {/* Aspirational values */}
      {aspirationalValues.length > 0 && (
        <div className="space-y-3 pt-4 border-t border-border/50">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-blue-500" />
            <h2 className="text-base font-semibold text-foreground">
              Aspirational Values
            </h2>
          </div>
          <p className="text-xs text-muted-foreground">
            Values you're working towards:
          </p>
          <div className="flex flex-wrap gap-2">
            {aspirationalValues.map(({ id }) => (
              <span
                key={id}
                className="px-3 py-1.5 rounded-full bg-blue-500/15 text-blue-600 dark:text-blue-400 text-sm capitalize border border-blue-500/20"
              >
                {formatValueName(id)}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* What's next - more compact */}
      <div className="bg-gradient-to-br from-muted/50 to-muted/30 rounded-xl p-5 space-y-3 border border-border/50">
        <h3 className="font-semibold text-foreground text-sm">What's Next?</h3>
        <ul className="space-y-2 text-xs text-muted-foreground">
          <li className="flex items-start gap-2">
            <span className="text-primary mt-0.5">•</span>
            <span>Keep these values visible—set them as a phone wallpaper or journal about them.</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-primary mt-0.5">•</span>
            <span>Before each approach, remind yourself which value you're embodying.</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-primary mt-0.5">•</span>
            <span>When you feel resistance, ask: "What would someone with my top value do?"</span>
          </li>
        </ul>
      </div>

      {/* Actions - cleaner layout */}
      <div className="flex flex-col sm:flex-row gap-3 pt-2">
        <Button asChild className="flex-1 h-11" size="lg">
          <Link href="/dashboard">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Dashboard
          </Link>
        </Button>
        <Button
          variant="outline"
          onClick={onRestart}
          className="sm:w-auto text-muted-foreground hover:text-foreground"
          size="lg"
        >
          <RotateCcw className="mr-2 h-4 w-4" />
          Start Over
        </Button>
      </div>

      {/* Back to Overview link */}
      {onBackToHub && (
        <div className="text-center pt-2">
          <button
            type="button"
            onClick={onBackToHub}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors inline-flex items-center gap-1"
          >
            <LayoutGrid className="w-3.5 h-3.5" />
            Back to Overview
          </button>
        </div>
      )}
    </div>
  )
}
