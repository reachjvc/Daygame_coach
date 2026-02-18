"use client"

import { QuestionCard } from "./QuestionCard"
import type { SituationAnswer } from "./types"

const CHALLENGE_OPTIONS = [
  {
    value: "approach-anxiety" as const,
    label: "Approach anxiety",
    description: "I see attractive women but freeze up. Can not get myself to open.",
  },
  {
    value: "conversation" as const,
    label: "Running out of things to say",
    description: "I can open, but conversations fizzle out after 30 seconds.",
  },
  {
    value: "getting-numbers" as const,
    label: "Not getting numbers",
    description: "Good conversations but they do not lead to number exchanges.",
  },
  {
    value: "texting" as const,
    label: "Texting game",
    description: "I get numbers but they go cold. Can not convert to dates.",
  },
  {
    value: "dates" as const,
    label: "Dates not going well",
    description: "Getting dates but they do not lead anywhere meaningful.",
  },
  {
    value: "escalation" as const,
    label: "Physical escalation",
    description: "Dates go well but I struggle to move things forward physically.",
  },
  {
    value: "consistency" as const,
    label: "Staying consistent",
    description: "I know what to do but can not maintain a regular habit.",
  },
]

const FREQUENCY_OPTIONS = [
  {
    value: "never" as const,
    label: "Not yet",
    description: "Have not started going out for daygame.",
  },
  {
    value: "rarely" as const,
    label: "Once or twice a month",
    description: "Go out occasionally but it is not a regular thing.",
  },
  {
    value: "weekly" as const,
    label: "Once a week",
    description: "Have a regular weekly session.",
  },
  {
    value: "multiple-weekly" as const,
    label: "Multiple times per week",
    description: "Seriously committed. Going out 3+ times per week.",
  },
]

interface PhaseSituationProps {
  situation: SituationAnswer
  step: "challenge" | "frequency"
  onUpdateChallenge: (value: SituationAnswer["challenge"]) => void
  onUpdateFrequency: (value: SituationAnswer["currentFrequency"]) => void
  onContinue: () => void
}

export function PhaseSituation({
  situation,
  step,
  onUpdateChallenge,
  onUpdateFrequency,
  onContinue,
}: PhaseSituationProps) {
  if (step === "challenge") {
    return (
      <QuestionCard
        question="What is your biggest challenge right now?"
        subtitle="Pick the one thing that, if solved, would unlock everything else."
        options={CHALLENGE_OPTIONS}
        selected={situation.challenge}
        onSelect={onUpdateChallenge}
        onContinue={onContinue}
        phaseNumber={1}
        totalPhases={4}
      />
    )
  }

  return (
    <QuestionCard
      question="How often do you go out right now?"
      subtitle="No judgment. We meet you where you are."
      options={FREQUENCY_OPTIONS}
      selected={situation.currentFrequency}
      onSelect={onUpdateFrequency}
      onContinue={onContinue}
      phaseNumber={1}
      totalPhases={4}
    />
  )
}
