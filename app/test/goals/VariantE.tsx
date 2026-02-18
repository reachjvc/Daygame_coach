"use client"

/**
 * Variant E — "Journey Architect"
 *
 * Radical rethink: Goal-setting as a guided conversation, not catalog browsing.
 *
 * Instead of presenting a 3-column Miller picker, the user answers 4 phases
 * of questions about their identity, situation, and vision. Goals then
 * "crystallize" from their answers — the system recommends the most relevant
 * templates from the real goal graph, ranked by a relevance engine.
 *
 * Why this is different:
 * - The current flow says "pick from this catalog" (shopping metaphor)
 * - This flow says "tell me about yourself" (coaching metaphor)
 * - Goals feel discovered, not selected
 * - The user never sees the full 50+ template catalog — only what matters to them
 * - Each answer narrows the recommendation space, creating a sense of progression
 *
 * Phases:
 * 1. Intro — sets the tone ("your journey starts here")
 * 2. Identity — experience level + motivation (2 questions)
 * 3. Situation — current challenge + frequency (2 questions)
 * 4. Vision — success definition + other life areas + timeframe (3 questions)
 * 5. Crystallize — goals emerge, animated reveal, user can toggle
 * 6. Complete — summary of what was created
 */

import { useState, useCallback } from "react"
import { PhaseIntro } from "./variant-e/PhaseIntro"
import { PhaseIdentity } from "./variant-e/PhaseIdentity"
import { PhaseSituation } from "./variant-e/PhaseSituation"
import { PhaseVision } from "./variant-e/PhaseVision"
import { PhaseCrystallize } from "./variant-e/PhaseCrystallize"
import { PhaseComplete } from "./variant-e/PhaseComplete"
import { computeRecommendations, getTopL1 } from "./variant-e/journeyEngine"
import type { JourneyState, IdentityAnswer, SituationAnswer, VisionAnswer } from "./variant-e/types"

type Step =
  | "intro"
  | "identity-experience"
  | "identity-motivation"
  | "situation-challenge"
  | "situation-frequency"
  | "vision-success"
  | "vision-areas"
  | "vision-timeframe"
  | "crystallize"
  | "complete"

const INITIAL_STATE: JourneyState = {
  phase: "intro",
  identity: { experience: null, motivation: null },
  situation: { challenge: null, currentFrequency: null },
  vision: { successVision: null, otherAreas: [], timeframe: null },
  selectedTemplateIds: new Set(),
  selectedLifeAreas: [],
}

export default function VariantE() {
  const [step, setStep] = useState<Step>("intro")
  const [state, setState] = useState<JourneyState>(INITIAL_STATE)

  // --- State updaters ---
  const updateIdentity = useCallback((patch: Partial<IdentityAnswer>) => {
    setState(prev => ({
      ...prev,
      identity: { ...prev.identity, ...patch },
    }))
  }, [])

  const updateSituation = useCallback((patch: Partial<SituationAnswer>) => {
    setState(prev => ({
      ...prev,
      situation: { ...prev.situation, ...patch },
    }))
  }, [])

  const updateVision = useCallback((patch: Partial<VisionAnswer>) => {
    setState(prev => ({
      ...prev,
      vision: { ...prev.vision, ...patch },
    }))
  }, [])

  const toggleLifeArea = useCallback((areaId: string) => {
    setState(prev => {
      const current = prev.vision.otherAreas
      const next = current.includes(areaId)
        ? current.filter(a => a !== areaId)
        : [...current, areaId]
      return {
        ...prev,
        vision: { ...prev.vision, otherAreas: next },
        selectedLifeAreas: next,
      }
    })
  }, [])

  const toggleTemplate = useCallback((templateId: string) => {
    setState(prev => {
      const next = new Set(prev.selectedTemplateIds)
      if (next.has(templateId)) {
        next.delete(templateId)
      } else {
        next.add(templateId)
      }
      return { ...prev, selectedTemplateIds: next }
    })
  }, [])

  // When entering crystallize, auto-select high-relevance recommendations
  const enterCrystallize = useCallback(() => {
    setState(prev => {
      const recs = computeRecommendations(prev.identity, prev.situation, prev.vision)
      const topL1 = getTopL1(prev.vision)
      const autoSelected = new Set<string>()

      if (topL1) autoSelected.add(topL1.id)

      // Auto-select L2s with relevance > 0.6
      for (const rec of recs) {
        if (rec.template.level === 2 && rec.relevance >= 0.6) {
          autoSelected.add(rec.template.id)
        }
      }
      // Auto-select L3s with relevance > 0.5
      for (const rec of recs) {
        if (rec.template.level === 3 && rec.relevance >= 0.5) {
          autoSelected.add(rec.template.id)
        }
      }

      return { ...prev, selectedTemplateIds: autoSelected }
    })
    setStep("crystallize")
  }, [])

  const startOver = useCallback(() => {
    setState(INITIAL_STATE)
    setStep("intro")
  }, [])

  // --- Render current step ---
  const renderStep = () => {
    switch (step) {
      case "intro":
        return (
          <PhaseIntro onBegin={() => setStep("identity-experience")} />
        )

      case "identity-experience":
        return (
          <PhaseIdentity
            identity={state.identity}
            step="experience"
            onUpdateExperience={v => updateIdentity({ experience: v })}
            onUpdateMotivation={() => {}}
            onContinue={() => setStep("identity-motivation")}
          />
        )

      case "identity-motivation":
        return (
          <PhaseIdentity
            identity={state.identity}
            step="motivation"
            onUpdateExperience={() => {}}
            onUpdateMotivation={v => updateIdentity({ motivation: v })}
            onContinue={() => setStep("situation-challenge")}
          />
        )

      case "situation-challenge":
        return (
          <PhaseSituation
            situation={state.situation}
            step="challenge"
            onUpdateChallenge={v => updateSituation({ challenge: v })}
            onUpdateFrequency={() => {}}
            onContinue={() => setStep("situation-frequency")}
          />
        )

      case "situation-frequency":
        return (
          <PhaseSituation
            situation={state.situation}
            step="frequency"
            onUpdateChallenge={() => {}}
            onUpdateFrequency={v => updateSituation({ currentFrequency: v })}
            onContinue={() => setStep("vision-success")}
          />
        )

      case "vision-success":
        return (
          <PhaseVision
            vision={state.vision}
            step="success"
            onUpdateSuccess={v => updateVision({ successVision: v })}
            onToggleArea={() => {}}
            onUpdateTimeframe={() => {}}
            onContinue={() => setStep("vision-areas")}
          />
        )

      case "vision-areas":
        return (
          <PhaseVision
            vision={state.vision}
            step="areas"
            onUpdateSuccess={() => {}}
            onToggleArea={toggleLifeArea}
            onUpdateTimeframe={() => {}}
            onContinue={() => setStep("vision-timeframe")}
          />
        )

      case "vision-timeframe":
        return (
          <PhaseVision
            vision={state.vision}
            step="timeframe"
            onUpdateSuccess={() => {}}
            onToggleArea={() => {}}
            onUpdateTimeframe={v => updateVision({ timeframe: v })}
            onContinue={enterCrystallize}
          />
        )

      case "crystallize":
        return (
          <PhaseCrystallize
            identity={state.identity}
            situation={state.situation}
            vision={state.vision}
            selectedTemplateIds={state.selectedTemplateIds}
            onToggleTemplate={toggleTemplate}
            onContinue={() => setStep("complete")}
            onBack={() => setStep("vision-timeframe")}
          />
        )

      case "complete":
        return (
          <PhaseComplete
            selectedTemplateIds={state.selectedTemplateIds}
            selectedLifeAreas={state.selectedLifeAreas}
            onStartOver={startOver}
          />
        )
    }
  }

  return (
    <div className="min-h-screen bg-background py-12" data-testid="variant-e">
      {renderStep()}
    </div>
  )
}
