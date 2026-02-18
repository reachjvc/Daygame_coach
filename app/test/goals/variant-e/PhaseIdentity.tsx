"use client"

import { QuestionCard } from "./QuestionCard"
import type { IdentityAnswer } from "./types"

const EXPERIENCE_OPTIONS = [
  {
    value: "newcomer" as const,
    label: "Total newcomer",
    description: "Never approached a stranger before. Nervous but curious.",
  },
  {
    value: "beginner" as const,
    label: "Just getting started",
    description: "Done a few approaches. Still figuring out the basics.",
  },
  {
    value: "intermediate" as const,
    label: "Getting results",
    description: "Regularly going out. Getting numbers, some dates. Want more consistency.",
  },
  {
    value: "advanced" as const,
    label: "Experienced player",
    description: "Solid results. Looking to optimize, refine, or shift goals.",
  },
]

const MOTIVATION_OPTIONS = [
  {
    value: "lonely" as const,
    label: "I want connection",
    description: "Tired of being alone. Want to meet women and build relationships.",
  },
  {
    value: "breakup" as const,
    label: "Starting fresh",
    description: "Coming out of a relationship. Ready to get back in the game.",
  },
  {
    value: "self-improvement" as const,
    label: "Becoming my best self",
    description: "Daygame is part of my broader self-development journey.",
  },
  {
    value: "abundance" as const,
    label: "Building abundance",
    description: "I want options. Want to date multiple women and have choice.",
  },
  {
    value: "dream-girl" as const,
    label: "Finding the one",
    description: "I know what I want. Looking for an amazing partner through cold approach.",
  },
]

interface PhaseIdentityProps {
  identity: IdentityAnswer
  step: "experience" | "motivation"
  onUpdateExperience: (value: IdentityAnswer["experience"]) => void
  onUpdateMotivation: (value: IdentityAnswer["motivation"]) => void
  onContinue: () => void
}

export function PhaseIdentity({
  identity,
  step,
  onUpdateExperience,
  onUpdateMotivation,
  onContinue,
}: PhaseIdentityProps) {
  if (step === "experience") {
    return (
      <QuestionCard
        question="Where are you on your journey?"
        subtitle="This helps us recommend the right starting points."
        options={EXPERIENCE_OPTIONS}
        selected={identity.experience}
        onSelect={onUpdateExperience}
        onContinue={onContinue}
        phaseNumber={0}
        totalPhases={4}
      />
    )
  }

  return (
    <QuestionCard
      question="What brings you to daygame?"
      subtitle="Understanding your motivation helps us prioritize the right goals."
      options={MOTIVATION_OPTIONS}
      selected={identity.motivation}
      onSelect={onUpdateMotivation}
      onContinue={onContinue}
      phaseNumber={0}
      totalPhases={4}
    />
  )
}
