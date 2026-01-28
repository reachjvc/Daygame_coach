"use client"

import { useState } from "react"
import { InnerGameStep, type InferredValue } from "../types"
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
}

const JUNG_QUOTE = "Everything that irritates us about others can lead us to an understanding of ourselves."
const JUNG_EXPLANATION = `Carl Jung's concept of the "shadow" suggests that what we criticize in others often reflects values we hold dear. When someone's behavior bothers you, it usually means they're violating something you consider important. By examining your frustrations, we can uncover values that run deep—values you might not consciously recognize but that powerfully shape how you see the world.`

export function ShadowStep({
  initialResponse,
  initialInferredValues,
  completedSteps,
  onBack,
  onComplete,
}: ShadowStepProps) {
  const [response, setResponse] = useState(initialResponse ?? "")
  const [inferredValues, setInferredValues] = useState<InferredValue[] | null>(
    initialInferredValues
  )
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showResults, setShowResults] = useState(!!initialInferredValues)

  const handleSubmit = async () => {
    if (!response.trim()) {
      setError("Please share your thoughts before continuing.")
      return
    }

    if (response.length < 20) {
      setError("Please provide a bit more detail about what frustrates you.")
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const res = await fetch("/api/inner-game/infer-values", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ context: "shadow", response }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "Failed to analyze your response")
      }

      const data = await res.json()
      setInferredValues(data.values)
      setShowResults(true)
    } catch (err) {
      console.error("Failed to infer values:", err)
      setError(err instanceof Error ? err.message : "Something went wrong")
    } finally {
      setIsLoading(false)
    }
  }

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
                setError(null)
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
            onNext={handleSubmit}
            nextLabel="Analyze My Shadow"
            isLoading={isLoading}
            nextDisabled={response.length < 20}
          />
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
          />
        </>
      )}
    </div>
  )
}
