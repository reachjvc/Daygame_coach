"use client"

import { QuestionCard } from "./QuestionCard"
import { getLifeAreaSuggestions } from "./journeyEngine"
import type { VisionAnswer } from "./types"

const SUCCESS_OPTIONS = [
  {
    value: "one-person" as const,
    label: "Find the one",
    description: "I want to find an amazing girlfriend or life partner through cold approach.",
  },
  {
    value: "abundance" as const,
    label: "Build abundance",
    description: "I want a rotation, casual options, and the ability to attract women whenever I want.",
  },
  {
    value: "both" as const,
    label: "Abundance first, then settle",
    description: "Experience variety and choice, then eventually find the right person.",
  },
]

const TIMEFRAME_OPTIONS = [
  {
    value: "3-months" as const,
    label: "Sprint: 3 months",
    description: "Intense focus. I want to see results fast.",
  },
  {
    value: "6-months" as const,
    label: "Build: 6 months",
    description: "Steady progress. Give myself time to develop real skills.",
  },
  {
    value: "1-year" as const,
    label: "Transform: 1 year",
    description: "Deep commitment. Willing to invest a full year of dedicated practice.",
  },
  {
    value: "2-plus-years" as const,
    label: "Lifestyle: 2+ years",
    description: "This is a long-term lifestyle change, not a short-term project.",
  },
]

interface PhaseVisionProps {
  vision: VisionAnswer
  step: "success" | "areas" | "timeframe"
  onUpdateSuccess: (value: VisionAnswer["successVision"]) => void
  onToggleArea: (areaId: string) => void
  onUpdateTimeframe: (value: VisionAnswer["timeframe"]) => void
  onContinue: () => void
}

export function PhaseVision({
  vision,
  step,
  onUpdateSuccess,
  onToggleArea,
  onUpdateTimeframe,
  onContinue,
}: PhaseVisionProps) {
  if (step === "success") {
    return (
      <QuestionCard
        question="What does success look like for you?"
        subtitle="Your big-picture vision shapes everything else."
        options={SUCCESS_OPTIONS}
        selected={vision.successVision}
        onSelect={onUpdateSuccess}
        onContinue={onContinue}
        phaseNumber={2}
        totalPhases={4}
      />
    )
  }

  if (step === "areas") {
    const lifeAreas = getLifeAreaSuggestions()
    const areaOptions = lifeAreas.map(a => ({
      value: a.id,
      label: a.name,
      description: `Track goals in ${a.name.toLowerCase()} alongside daygame`,
    }))

    return (
      <QuestionCard
        question="What else are you working on?"
        subtitle="Daygame is the core. But a well-rounded life makes you more attractive. Select any that apply."
        options={areaOptions}
        selected={null}
        onSelect={() => {}}
        onContinue={onContinue}
        phaseNumber={2}
        totalPhases={4}
        multi
        multiSelected={vision.otherAreas}
        onMultiToggle={onToggleArea}
        canContinue
      />
    )
  }

  return (
    <QuestionCard
      question="What is your timeframe?"
      subtitle="This affects how ambitious your initial goals will be."
      options={TIMEFRAME_OPTIONS}
      selected={vision.timeframe}
      onSelect={onUpdateTimeframe}
      onContinue={onContinue}
      phaseNumber={2}
      totalPhases={4}
    />
  )
}
