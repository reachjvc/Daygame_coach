"use client"

import { useState, useCallback } from "react"
import type { GoalTemplate, CurveThemeId } from "@/src/goals/types"
import { WarRoomThemeProvider, useWarRoomTheme } from "./variant-j/WarRoomTheme"
import { TacticalStepBar } from "./variant-j/TacticalStepBar"
import { StrategyLanding } from "./variant-j/StrategyLanding"
import { ObjectiveSelector } from "./variant-j/ObjectiveSelector"
import { TacticalCustomize, type GoalCustomization } from "./variant-j/TacticalCustomize"
import { WarRoom } from "./variant-j/WarRoom"
import { CampaignComplete } from "./variant-j/CampaignComplete"

// ============================================================================
// Flow Steps
// ============================================================================

const STEPS = [
  { label: "Life Area", zenLabel: "Realm", cyberLabel: "SECTOR", key: "area" },
  { label: "Goal Path", zenLabel: "Path", cyberLabel: "VECTOR", key: "path" },
  { label: "Customize", zenLabel: "Refine", cyberLabel: "CALIBRATE", key: "customize" },
  { label: "Strategy", zenLabel: "Strategy", cyberLabel: "STRATEGY", key: "strategy" },
  { label: "Done", zenLabel: "Complete", cyberLabel: "DEBRIEF", key: "complete" },
]

type FlowPhase =
  | { step: "landing" }
  | { step: "expansion"; path: "one_person" | "abundance" }
  | {
      step: "customize"
      path: "one_person" | "abundance"
      selectedL1: GoalTemplate
      selectedL2s: GoalTemplate[]
      selectedL3s: GoalTemplate[]
    }
  | {
      step: "strategy"
      path: "one_person" | "abundance"
      selectedL1: GoalTemplate
      goals: GoalCustomization[]
      targetDate: Date | null
      allL3Templates: GoalTemplate[]
    }
  | {
      step: "complete"
      path: "one_person" | "abundance"
      selectedL1: GoalTemplate
      goals: GoalCustomization[]
      targetDate: Date | null
      allL3Templates: GoalTemplate[]
    }
  | { step: "life_area"; areaId: string }

// ============================================================================
// VariantJ — War Room
// ============================================================================

export default function VariantJ() {
  const [themeId, setThemeId] = useState<CurveThemeId>("zen")
  const [phase, setPhase] = useState<FlowPhase>({ step: "landing" })

  const toggleTheme = useCallback(() => {
    setThemeId((prev) => (prev === "zen" ? "cyberpunk" : "zen"))
  }, [])

  const handleSelectPath = useCallback((path: "one_person" | "abundance") => {
    setPhase({ step: "expansion", path })
  }, [])

  const handleSelectLifeArea = useCallback((areaId: string) => {
    setPhase({ step: "life_area", areaId })
  }, [])

  const handleExpansionConfirm = useCallback(
    (selectedL1: GoalTemplate, selectedL2s: GoalTemplate[], selectedL3s: GoalTemplate[]) => {
      if (phase.step !== "expansion") return
      setPhase({
        step: "customize",
        path: phase.path,
        selectedL1,
        selectedL2s,
        selectedL3s,
      })
    },
    [phase]
  )

  const handleCustomizeConfirm = useCallback(
    (goals: GoalCustomization[], targetDate: Date | null) => {
      if (phase.step !== "customize") return
      setPhase({
        step: "strategy",
        path: phase.path,
        selectedL1: phase.selectedL1,
        goals,
        targetDate,
        allL3Templates: phase.selectedL3s,
      })
    },
    [phase]
  )

  const handleStrategyConfirm = useCallback(() => {
    if (phase.step !== "strategy") return
    setPhase({
      step: "complete",
      path: phase.path,
      selectedL1: phase.selectedL1,
      goals: phase.goals,
      targetDate: phase.targetDate,
      allL3Templates: phase.allL3Templates,
    })
  }, [phase])

  const handleStartOver = useCallback(() => {
    setPhase({ step: "landing" })
  }, [])

  // Map phase to step index
  const currentStepIndex = (() => {
    switch (phase.step) {
      case "landing":
      case "life_area":
        return 0
      case "expansion":
        return 1
      case "customize":
        return 2
      case "strategy":
        return 3
      case "complete":
        return 4
      default:
        return 0
    }
  })()

  // Path color (theme-aware)
  const pathColor = (() => {
    if (phase.step === "expansion" || phase.step === "customize" || phase.step === "strategy" || phase.step === "complete") {
      if (themeId === "cyberpunk") {
        return phase.path === "one_person" ? "#ff0033" : "#00ff41"
      }
      return phase.path === "one_person" ? "#ec4899" : "#f97316"
    }
    return themeId === "cyberpunk" ? "#00ff41" : "#f97316"
  })()

  return (
    <WarRoomThemeProvider themeId={themeId} onToggle={toggleTheme}>
      <div style={{ padding: "0 24px" }} data-testid="variant-j">
        {/* Step indicator — always visible from step 1 */}
        <div style={{ marginBottom: 24 }}>
          <TacticalStepBar steps={STEPS} currentStepIndex={currentStepIndex} />
        </div>

        {/* Phase content */}
        <div style={{ minHeight: 400 }}>
          {phase.step === "landing" && (
            <StrategyLanding
              onSelectPath={handleSelectPath}
              onSelectLifeArea={handleSelectLifeArea}
            />
          )}

          {phase.step === "expansion" && (
            <ObjectiveSelector
              path={phase.path}
              onBack={() => setPhase({ step: "landing" })}
              onConfirm={handleExpansionConfirm}
            />
          )}

          {phase.step === "customize" && (
            <TacticalCustomize
              selectedL1={phase.selectedL1}
              selectedL2s={phase.selectedL2s}
              selectedL3s={phase.selectedL3s}
              pathColor={pathColor}
              onBack={() => setPhase({ step: "expansion", path: phase.path })}
              onConfirm={handleCustomizeConfirm}
            />
          )}

          {phase.step === "strategy" && (
            <WarRoom
              selectedL1={phase.selectedL1}
              goals={phase.goals}
              targetDate={phase.targetDate}
              pathColor={pathColor}
              allL3Templates={phase.allL3Templates}
              onBack={() => {
                setPhase({ step: "expansion", path: phase.path })
              }}
              onConfirm={handleStrategyConfirm}
            />
          )}

          {phase.step === "complete" && (
            <CampaignComplete
              selectedL1={phase.selectedL1}
              goals={phase.goals}
              targetDate={phase.targetDate}
              pathColor={pathColor}
              allL3Templates={phase.allL3Templates}
              onStartOver={handleStartOver}
            />
          )}

          {phase.step === "life_area" && (
            <LifeAreaPlaceholder
              areaId={phase.areaId}
              onBack={handleStartOver}
            />
          )}
        </div>
      </div>
    </WarRoomThemeProvider>
  )
}

// ============================================================================
// Life Area Placeholder
// ============================================================================

function LifeAreaPlaceholder({ areaId, onBack }: { areaId: string; onBack: () => void }) {
  const { theme, themeId } = useWarRoomTheme()
  const isZen = themeId === "zen"

  return (
    <div style={{ textAlign: "center", padding: "60px 0" }}>
      <p
        style={{
          fontSize: isZen ? 14 : 11,
          color: theme.textMuted,
          fontFamily: theme.fontFamily,
          textTransform: isZen ? "none" : "uppercase",
          marginBottom: 8,
        }}
      >
        {isZen
          ? `Goal creation for "${areaId}" realm would go here.`
          : `SECTOR "${areaId.toUpperCase()}" // MODULE NOT DEPLOYED`}
      </p>
      <p
        style={{
          fontSize: isZen ? 12 : 9,
          color: theme.textFaint,
          fontFamily: theme.fontFamily,
          textTransform: isZen ? "none" : "uppercase",
          marginBottom: 16,
        }}
      >
        {isZen
          ? "Only daygame has a full template graph."
          : "ONLY DAYGAME SECTOR HAS FULL TEMPLATE GRAPH"}
      </p>
      <button
        onClick={onBack}
        style={{
          fontSize: isZen ? 13 : 10,
          color: isZen ? theme.accentSecondary : theme.accent,
          background: "none",
          border: "none",
          cursor: "pointer",
          fontFamily: theme.fontFamily,
          textTransform: theme.textTransform,
          textDecoration: "underline",
        }}
      >
        {theme.vocab.startOver}
      </button>
    </div>
  )
}
