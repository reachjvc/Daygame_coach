"use client"

import { InnerGameStep, type InferredValue } from "../types"
import { useValueInference } from "../hooks/useValueInference"
import { NavigationButtons } from "./shared/NavigationButtons"
import { StepProgress } from "./shared/StepProgress"
import { WisdomBox } from "./shared/WisdomBox"
import { Check, Pencil } from "lucide-react"
import { Button } from "@/components/ui/button"

type PeakExperienceStepProps = {
  initialResponse: string | null
  initialInferredValues: InferredValue[] | null
  completedSteps: InnerGameStep[]
  onBack: () => void
  onComplete: (response: string, inferredValues: InferredValue[]) => void
  onBackToHub?: () => void
  onStartFresh?: () => void
  onStepClick?: (step: InnerGameStep) => void
}

const CSIKSZENTMIHALYI_QUOTE = "The best moments in our lives are not the passive, receptive, relaxing times... The best moments usually occur if a person's body or mind is stretched to its limits in a voluntary effort to accomplish something difficult and worthwhile."
const FLOW_EXPLANATION = `Mihaly Csikszentmihalyi's research on "flow states" shows that we're happiest when fully absorbed in meaningful activities. Your peak experiences—moments when you felt most alive and yourself—reveal the values that make life worth living for you. These aren't just preferences; they're the conditions under which you thrive.`

export function PeakExperienceStep({
  initialResponse,
  initialInferredValues,
  completedSteps,
  onBack,
  onComplete,
  onBackToHub,
  onStartFresh,
  onStepClick,
}: PeakExperienceStepProps) {
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
    context: "peak_experience",
    initialResponse,
    initialInferredValues,
    shortResponseError: "Please provide more detail about your peak experience.",
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
        currentStep={InnerGameStep.PEAK_EXPERIENCE}
        completedSteps={completedSteps}
        onStepClick={onStepClick}
      />

      {!showResults ? (
        <>
          {/* Question section */}
          <div className="space-y-4">
            <h2 className="text-2xl font-bold text-foreground">
              Your Peak Experience
            </h2>
            <p className="text-muted-foreground leading-relaxed">
              Describe a moment when you felt most alive, confident, and fully yourself.
              It doesn't have to be about dating—it could be any time when you were
              in your element, performing at your best, feeling completely aligned
              with who you are.
            </p>
          </div>

          {/* Wisdom box */}
          <WisdomBox
            quote={CSIKSZENTMIHALYI_QUOTE}
            attribution="Mihaly Csikszentmihalyi"
            explanation={FLOW_EXPLANATION}
          />

          {/* Text area */}
          <div className="space-y-2">
            <textarea
              value={response}
              onChange={(e) => {
                setResponse(e.target.value)
                clearError()
              }}
              placeholder="I felt most alive when... A moment I was completely in flow... I remember feeling fully myself when..."
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
            nextLabel="Analyze My Experience"
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
              Values Present in Your Peak Moments
            </h2>
            <p className="text-muted-foreground">
              When you're at your best, these values are active and alive in you:
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
            nextLabel="Continue"
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
