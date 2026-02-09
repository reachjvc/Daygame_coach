"use client"

import { InnerGameStep, type InferredValue } from "../types"
import { useValueInference } from "../hooks/useValueInference"
import { NavigationButtons } from "./shared/NavigationButtons"
import { StepProgress } from "./shared/StepProgress"
import { WisdomBox } from "./shared/WisdomBox"
import { Check, Pencil } from "lucide-react"
import { Button } from "@/components/ui/button"

type ShadowStepProps = {
  initialResponse: string | null
  initialInferredValues: InferredValue[] | null
  completedSteps: InnerGameStep[]
  onBack: () => void
  onComplete: (response: string, inferredValues: InferredValue[]) => void
  onBackToHub?: () => void
  onStartFresh?: () => void
  onStepClick?: (step: InnerGameStep) => void
}

const JUNG_QUOTE = "Everything that irritates us about others can lead us to an understanding of ourselves."
const JUNG_EXPLANATION = `Carl Jung's concept of the "shadow" suggests that what we criticize in others often reflects values we hold dear. When someone's behavior bothers you, it usually means they're violating something you consider important. By examining your frustrations, we can uncover values that run deep—values you might not consciously recognize but that powerfully shape how you see the world.`

export function ShadowStep({
  initialResponse,
  initialInferredValues,
  completedSteps,
  onBack,
  onComplete,
  onBackToHub,
  onStartFresh,
  onStepClick,
}: ShadowStepProps) {
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
    context: "shadow",
    initialResponse,
    initialInferredValues,
    shortResponseError: "Please provide a bit more detail about what frustrates you.",
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
        currentStep={InnerGameStep.SHADOW}
        completedSteps={completedSteps}
        onStepClick={onStepClick}
      />

      {!showResults ? (
        <>
          {/* Question section */}
          <div className="space-y-4">
            <h2 className="text-2xl font-bold text-foreground">
              Your Shadow Self
            </h2>
            <p className="text-muted-foreground leading-relaxed">
              What genuinely pisses you off about other men in the dating world?
              Think about behaviors, attitudes, or approaches that make you cringe,
              frustrated, or even angry when you see them.
            </p>
            <p className="text-muted-foreground/70 text-sm italic leading-relaxed">
              Feel free to expand beyond dating—people in your work, social life, or anywhere else who trigger strong reactions can reveal just as much.
            </p>
          </div>

          {/* Wisdom box */}
          <WisdomBox
            quote={JUNG_QUOTE}
            attribution="Carl Jung"
            explanation={JUNG_EXPLANATION}
          />

          {/* Text area */}
          <div className="space-y-2">
            <textarea
              value={response}
              onChange={(e) => {
                setResponse(e.target.value)
                clearError()
              }}
              placeholder="I can't stand when guys... It really bothers me when... I lose respect for men who..."
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
            nextLabel="Analyze My Shadow"
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
              Values Hidden in Your Shadow
            </h2>
            <p className="text-muted-foreground">
              What you reject reveals what you value. These are the principles
              that run deep for you:
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
