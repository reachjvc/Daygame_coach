"use client"

import { useState } from "react"
import { InnerGameStep, type InferredValue } from "../types"
import { NavigationButtons } from "./shared/NavigationButtons"
import { StepProgress } from "./shared/StepProgress"
import { Check, Pencil } from "lucide-react"
import { Button } from "@/components/ui/button"

type DeathbedStepProps = {
  initialResponse: string | null
  initialInferredValues: InferredValue[] | null
  completedSteps: InnerGameStep[]
  onBack: () => void
  onComplete: (response: string, inferredValues: InferredValue[]) => void
}

export function DeathbedStep({
  initialResponse,
  initialInferredValues,
  completedSteps,
  onBack,
  onComplete,
}: DeathbedStepProps) {
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
      setError("Please provide a bit more detail about your legacy.")
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const res = await fetch("/api/inner-game/infer-values", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ context: "deathbed", response }),
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
        currentStep={InnerGameStep.DEATHBED}
        completedSteps={completedSteps}
      />

      {!showResults ? (
        <>
          {/* Question section */}
          <div className="space-y-4">
            <h2 className="text-2xl font-bold text-foreground">
              Your Legacy
            </h2>
            <p className="text-muted-foreground leading-relaxed">
              Imagine yourself at the end of your life, surrounded by those who
              matter most—family, friends, loved ones. What would you want them
              to say about who you were and how you lived? What qualities would
              you want to be remembered for?
            </p>
            <p className="text-sm text-primary/80 italic">
              This exercise reveals the values that truly matter to you at the
              deepest level.
            </p>
          </div>

          {/* Text area */}
          <div className="space-y-2">
            <textarea
              value={response}
              onChange={(e) => {
                setResponse(e.target.value)
                setError(null)
              }}
              placeholder="I would want them to say that I was... I hope they remember me as someone who... The mark I want to leave is..."
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
            nextLabel="Analyze My Legacy"
            isLoading={isLoading}
            nextDisabled={response.length < 20}
          />
        </>
      ) : (
        <>
          {/* Results section */}
          <div className="space-y-4">
            <h2 className="text-2xl font-bold text-foreground">
              Values Central to Your Legacy
            </h2>
            <p className="text-muted-foreground">
              These values emerged from how you want to be remembered:
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
          />
        </>
      )}
    </div>
  )
}
