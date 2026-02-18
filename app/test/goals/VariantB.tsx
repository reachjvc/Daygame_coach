"use client"

/**
 * Variant B: Quest Log / RPG Progression
 *
 * UX Paradigm: RPG Quest Board
 * - Life areas are "Realms" (The Arena, Iron Temple, etc.)
 * - Major goals are "Quests" with difficulty ratings, XP, and star ratings
 * - L2 achievements are implicit (generated as part of quest acceptance)
 * - L3 specifics are "Quest Objectives" that can be toggled and customized
 *
 * Flow:
 * 1. Realm Map - pick a life area (featured: daygame "The Arena")
 * 2. Quest Board - browse available quests in that realm with paths
 * 3. Quest Briefing - see full quest details with objectives, customize targets
 * 4. Quest Accepted - celebration screen with summary
 */

import { useState, useMemo } from "react"
import { getRealms, getDaygameQuests, getAchievementQuests } from "./variant-b/quest-data"
import { RealmMap } from "./variant-b/RealmMap"
import { QuestBoard } from "./variant-b/QuestBoard"
import { QuestBriefing, type ObjectiveState } from "./variant-b/QuestBriefing"
import { QuestAccepted } from "./variant-b/QuestAccepted"
import type { Realm, Quest } from "./variant-b/quest-data"

type FlowStep = "realms" | "quests" | "briefing" | "accepted"

export default function VariantB() {
  const [step, setStep] = useState<FlowStep>("realms")
  const [selectedRealm, setSelectedRealm] = useState<Realm | null>(null)
  const [selectedQuest, setSelectedQuest] = useState<Quest | null>(null)
  const [acceptedObjectives, setAcceptedObjectives] = useState<Map<string, ObjectiveState> | null>(
    null
  )

  const realms = useMemo(() => getRealms(), [])
  const daygameQuests = useMemo(() => getDaygameQuests(), [])
  const achievementQuests = useMemo(() => getAchievementQuests(), [])

  const handleSelectRealm = (realm: Realm) => {
    setSelectedRealm(realm)
    setStep("quests")
  }

  const handleSelectQuest = (quest: Quest) => {
    setSelectedQuest(quest)
    setStep("briefing")
  }

  const handleAcceptQuest = (objectives: Map<string, ObjectiveState>) => {
    setAcceptedObjectives(objectives)
    setStep("accepted")
  }

  const handleBackToRealms = () => {
    setSelectedRealm(null)
    setSelectedQuest(null)
    setAcceptedObjectives(null)
    setStep("realms")
  }

  const handleBackToQuests = () => {
    setSelectedQuest(null)
    setStep("quests")
  }

  const handleStartOver = () => {
    setSelectedRealm(null)
    setSelectedQuest(null)
    setAcceptedObjectives(null)
    setStep("realms")
  }

  // Step progress indicator
  const stepIndex = { realms: 0, quests: 1, briefing: 2, accepted: 3 }[step]
  const stepLabels = ["Realm", "Quests", "Briefing", "Accept"]

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-6" data-testid="variant-b">
      {/* Step indicator */}
      {step !== "accepted" && (
        <div className="flex items-center justify-center gap-1">
          {stepLabels.map((label, i) => (
            <div key={label} className="flex items-center">
              <div className="flex items-center gap-1.5">
                <div
                  className={`
                    size-6 rounded-full flex items-center justify-center text-xs font-bold transition-all
                    ${i <= stepIndex
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground"
                    }
                  `}
                >
                  {i + 1}
                </div>
                <span
                  className={`text-xs font-medium hidden sm:inline ${
                    i <= stepIndex ? "text-foreground" : "text-muted-foreground"
                  }`}
                >
                  {label}
                </span>
              </div>
              {i < stepLabels.length - 1 && (
                <div
                  className={`w-8 sm:w-12 h-px mx-2 transition-colors ${
                    i < stepIndex ? "bg-primary" : "bg-border"
                  }`}
                />
              )}
            </div>
          ))}
        </div>
      )}

      {/* Flow content */}
      {step === "realms" && (
        <RealmMap
          realms={realms}
          selectedRealm={selectedRealm}
          onSelectRealm={handleSelectRealm}
        />
      )}

      {step === "quests" && selectedRealm && (
        <QuestBoard
          realm={selectedRealm}
          quests={daygameQuests}
          achievementQuests={achievementQuests}
          onSelectQuest={handleSelectQuest}
          onBack={handleBackToRealms}
        />
      )}

      {step === "briefing" && selectedQuest && (
        <QuestBriefing
          quest={selectedQuest}
          onAccept={handleAcceptQuest}
          onBack={handleBackToQuests}
        />
      )}

      {step === "accepted" && selectedQuest && acceptedObjectives && (
        <QuestAccepted
          quest={selectedQuest}
          objectives={acceptedObjectives}
          onStartOver={handleStartOver}
        />
      )}
    </div>
  )
}
