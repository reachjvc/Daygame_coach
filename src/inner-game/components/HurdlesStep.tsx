"use client"

import { InnerGameStep, type InferredValue } from "../types"
import { useValueInference } from "../hooks/useValueInference"
import { NavigationButtons } from "./shared/NavigationButtons"
import { StepProgress } from "./shared/StepProgress"
import { WisdomBox } from "./shared/WisdomBox"
import { Check, Pencil } from "lucide-react"
import { Button } from "@/components/ui/button"

type HurdlesStepProps = {
  initialResponse: string | null
  initialInferredValues: InferredValue[] | null
  completedSteps: InnerGameStep[]
  onBack: () => void
  onComplete: (response: string, inferredValues: InferredValue[]) => void
  onBackToHub?: () => void
  onStartFresh?: () => void
}

const STOIC_QUOTE = "The obstacle is the way."
const STOIC_EXPLANATION = `Marcus Aurelius and the Stoics understood that our obstacles reveal our growth edges. The patterns and fears that hold you back aren't just problems—they're signposts pointing toward the values you need to develop. Understanding your hurdles helps us tailor your coaching to address what matters most.`

export function HurdlesStep({
  initialResponse,
  initialInferredValues,
  completedSteps,
  onBack,
  onComplete,
  onBackToHub,
  onStartFresh,
}: HurdlesStepProps) {
  const {
    response,
    setResponse,
    inferredValues,
    isLoading,
    error,
    showResults,
    setShowResults,
    clearError,
    inferValues,
  } = useValueInference({
    context: "hurdles",
    initialResponse,
    initialInferredValues,
    shortResponseError: "Please provide more detail about your hurdles.",
  })

  const handleContinue = () => {
    if (inferredValues) {
      onComplete(response, inferredValues)
    }
  }

  return (
    <div className="space-y-6">
      {/* Step progress */}
      <StepProgress
        currentStep={InnerGameStep.HURDLES}
        completedSteps={completedSteps}
      />

      {!showResults ? (
        <>
          {/* Question section */}
          <div className="space-y-4">
            <h2 className="text-2xl font-bold text-foreground">
              Your Growth Edges
            </h2>
            <p className="text-muted-foreground leading-relaxed">
              What patterns or fears hold you back from being the man you want to be?
              Think about the recurring obstacles—the things that keep showing up
              and preventing you from taking action or being fully yourself.
            </p>
          </div>

          {/* Wisdom box */}
          <WisdomBox
            quote={STOIC_QUOTE}
            attribution="Marcus Aurelius"
            explanation={STOIC_EXPLANATION}
          />

          {/* Text area */}
          <div className="space-y-2">
            <textarea
              value={response}
              onChange={(e) => {
                setResponse(e.target.value)
                clearError()
              }}
              placeholder="I keep falling into the pattern of... What holds me back most is... I notice I tend to..."
              className={`
                w-full h-48 p-4 rounded-lg border resize-none
                bg-card text-foreground placeholder:text-muted-foreground
                focus:outline-none focus:ring-2 focus:ring-primary
                ${error ? "border-destructive" : "border-border"}
              `}
            />
            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}
            <p className="text-xs text-muted-foreground text-right">
              {response.length} characters
            </p>
          </div>

          {/* Navigation */}
          <NavigationButtons
            onBack={onBack}
            onNext={inferValues}
            nextLabel="Analyze My Hurdles"
            isLoading={isLoading}
            nextDisabled={response.length < 20}
            onBackToHub={onBackToHub}
          />

          {/* Start fresh link */}
          {onStartFresh && (
            <div className="text-center pt-4 border-t border-border/50 mt-6">
              <button
                type="button"
                onClick={onStartFresh}
                className="text-xs text-muted-foreground/60 hover:text-muted-foreground transition-colors"
              >
                Start fresh
              </button>
            </div>
          )}
        </>
      ) : (
        <>
          {/* Results section */}
          <div className="space-y-4">
            <h2 className="text-2xl font-bold text-foreground">
              Values That Address Your Hurdles
            </h2>
            <p className="text-muted-foreground">
              Based on what's holding you back, these values could help you break through:
            </p>
          </div>

          {/* Your response summary */}
          <div className="bg-muted/30 rounded-xl p-4 border border-border/50">
            <div className="flex items-start justify-between gap-3 mb-2">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Your response</p>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowResults(false)}
                className="h-7 px-2 text-xs text-muted-foreground hover:text-primary"
              >
                <Pencil className="w-3 h-3 mr-1" />
                Edit
              </Button>
            </div>
            <p className="text-foreground text-sm leading-relaxed">"{response}"</p>
          </div>

          {/* Inferred values */}
          <div className="space-y-3">
            {inferredValues?.map((value) => (
              <div
                key={value.id}
                className="bg-card rounded-lg p-4 border border-border"
              >
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                    <Check className="w-4 h-4 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground capitalize">
                      {value.id.replace(/-/g, " ")}
                    </h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      {value.reason}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Navigation */}
          <NavigationButtons
            onBack={onBack}
            onNext={handleContinue}
            nextLabel="Continue to Prioritization"
            onBackToHub={onBackToHub}
          />

          {/* Start fresh link */}
          {onStartFresh && (
            <div className="text-center pt-4 border-t border-border/50 mt-6">
              <button
                type="button"
                onClick={onStartFresh}
                className="text-xs text-muted-foreground/60 hover:text-muted-foreground transition-colors"
              >
                Start fresh
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
