"use client"

import { useState, useEffect, useMemo } from "react"
import { Check, ChevronDown, ChevronRight, Sparkles, Target, TrendingUp, Zap } from "lucide-react"
import { Button } from "@/components/ui/button"
import { computeRecommendations, getTopL1 } from "./journeyEngine"
import { LIFE_AREAS } from "@/src/goals/data/lifeAreas"
import type { IdentityAnswer, SituationAnswer, VisionAnswer } from "./types"
import type { GoalTemplate } from "@/src/goals/types"

interface PhaseCrystallizeProps {
  identity: IdentityAnswer
  situation: SituationAnswer
  vision: VisionAnswer
  selectedTemplateIds: Set<string>
  onToggleTemplate: (templateId: string) => void
  onContinue: () => void
  onBack: () => void
}

type GroupKey = "life-goal" | "achievements" | "daily-actions"

interface GoalGroup {
  key: GroupKey
  title: string
  subtitle: string
  icon: React.ReactNode
  goals: Array<{
    template: GoalTemplate
    relevance: number
    reason: string
  }>
}

export function PhaseCrystallize({
  identity,
  situation,
  vision,
  selectedTemplateIds,
  onToggleTemplate,
  onContinue,
  onBack,
}: PhaseCrystallizeProps) {
  const [isRevealing, setIsRevealing] = useState(true)
  const [revealStep, setRevealStep] = useState(0)
  const [expandedGroup, setExpandedGroup] = useState<GroupKey | null>("achievements")

  // Animate the reveal
  useEffect(() => {
    if (!isRevealing) return
    const timers = [
      setTimeout(() => setRevealStep(1), 400),
      setTimeout(() => setRevealStep(2), 900),
      setTimeout(() => setRevealStep(3), 1400),
      setTimeout(() => { setRevealStep(4); setIsRevealing(false) }, 1900),
    ]
    return () => timers.forEach(clearTimeout)
  }, [isRevealing])

  const recommendations = useMemo(
    () => computeRecommendations(identity, situation, vision),
    [identity, situation, vision]
  )

  const topL1 = useMemo(() => getTopL1(vision), [vision])

  const groups: GoalGroup[] = useMemo(() => {
    const l2Goals = recommendations.filter(r => r.template.level === 2)
    const l3Goals = recommendations.filter(r => r.template.level === 3)

    return [
      {
        key: "life-goal" as GroupKey,
        title: "Your North Star",
        subtitle: "The big-picture goal everything builds toward",
        icon: <Target className="size-5 text-orange-500" />,
        goals: topL1
          ? [{ template: topL1, relevance: 1, reason: "Matches your vision" }]
          : [],
      },
      {
        key: "achievements" as GroupKey,
        title: "Transformations to Unlock",
        subtitle: "Skill achievements that move you toward your north star",
        icon: <Sparkles className="size-5 text-amber-400" />,
        goals: l2Goals.slice(0, 5),
      },
      {
        key: "daily-actions" as GroupKey,
        title: "What You Will Actually Do",
        subtitle: "Concrete, trackable actions you will take every week",
        icon: <Zap className="size-5 text-emerald-400" />,
        goals: l3Goals.slice(0, 8),
      },
    ]
  }, [recommendations, topL1])

  const selectedCount = selectedTemplateIds.size

  // Narrative summary
  const narrative = useMemo(() => {
    const parts: string[] = []
    if (identity.experience === "newcomer") parts.push("You are just starting out")
    else if (identity.experience === "beginner") parts.push("You are building your foundations")
    else if (identity.experience === "intermediate") parts.push("You are leveling up")
    else if (identity.experience === "advanced") parts.push("You are refining your game")

    if (situation.challenge === "approach-anxiety") parts.push("and your main challenge is approach anxiety")
    else if (situation.challenge === "conversation") parts.push("and you want to improve your conversations")
    else if (situation.challenge === "getting-numbers") parts.push("and you want to convert more approaches to numbers")
    else if (situation.challenge === "texting") parts.push("and you want to improve your texting game")
    else if (situation.challenge === "dates") parts.push("and you want better dates")
    else if (situation.challenge === "escalation") parts.push("and you want to improve physical escalation")
    else if (situation.challenge === "consistency") parts.push("and you want to build consistency")

    return parts.join(", ") + "."
  }, [identity, situation])

  const visionSummary = useMemo(() => {
    if (vision.successVision === "one-person") return "Your goal: find an amazing partner."
    if (vision.successVision === "abundance") return "Your goal: build abundance and choice."
    if (vision.successVision === "both") return "Your goal: abundance first, then the right person."
    return ""
  }, [vision])

  return (
    <div className="max-w-2xl mx-auto px-4">
      {/* Progress bar */}
      <div className="flex items-center gap-2 mb-8">
        {Array.from({ length: 4 }, (_, i) => (
          <div
            key={i}
            className="h-1 flex-1 rounded-full transition-all duration-500"
            style={{
              backgroundColor: i <= 3 ? "#f97316" : "rgba(255,255,255,0.1)",
              opacity: i === 3 ? 1 : 0.6,
            }}
          />
        ))}
      </div>

      {/* Narrative Header */}
      <div
        className="mb-8 transition-all duration-700"
        style={{
          opacity: revealStep >= 1 ? 1 : 0,
          transform: `translateY(${revealStep >= 1 ? 0 : 20}px)`,
        }}
      >
        <h2 className="text-2xl font-bold tracking-tight mb-2">
          Here is your personalized goal map
        </h2>
        <p className="text-muted-foreground text-sm leading-relaxed">
          {narrative} {visionSummary}
        </p>
        <p className="text-muted-foreground/60 text-xs mt-2">
          Based on your answers, we have selected goals that will have the highest impact.
          Toggle any off, or add ones we missed.
        </p>
      </div>

      {/* Goal groups */}
      <div className="space-y-4 mb-8">
        {groups.map((group, groupIndex) => {
          if (group.goals.length === 0) return null
          const isExpanded = expandedGroup === group.key
          const groupSelected = group.goals.filter(g => selectedTemplateIds.has(g.template.id)).length

          return (
            <div
              key={group.key}
              className="rounded-xl border transition-all duration-700"
              style={{
                borderColor: isExpanded ? "rgba(249,115,22,0.3)" : "rgba(255,255,255,0.08)",
                backgroundColor: isExpanded ? "rgba(249,115,22,0.03)" : "rgba(255,255,255,0.02)",
                opacity: revealStep >= groupIndex + 2 ? 1 : 0,
                transform: `translateY(${revealStep >= groupIndex + 2 ? 0 : 20}px)`,
              }}
            >
              {/* Group header */}
              <button
                onClick={() => setExpandedGroup(isExpanded ? null : group.key)}
                className="w-full flex items-center gap-3 px-5 py-4 cursor-pointer"
              >
                {group.icon}
                <div className="flex-1 text-left min-w-0">
                  <p className="font-semibold text-sm">{group.title}</p>
                  <p className="text-xs text-muted-foreground">{group.subtitle}</p>
                </div>
                <span className="text-xs text-muted-foreground mr-2">
                  {groupSelected}/{group.goals.length}
                </span>
                {isExpanded
                  ? <ChevronDown className="size-4 text-muted-foreground" />
                  : <ChevronRight className="size-4 text-muted-foreground" />
                }
              </button>

              {/* Expanded goal list */}
              {isExpanded && (
                <div className="px-5 pb-4 space-y-2">
                  {group.goals.map((rec) => {
                    const isSelected = selectedTemplateIds.has(rec.template.id)
                    return (
                      <button
                        key={rec.template.id}
                        onClick={() => onToggleTemplate(rec.template.id)}
                        className="w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all cursor-pointer"
                        style={{
                          border: `1px solid ${isSelected ? "rgba(249,115,22,0.3)" : "rgba(255,255,255,0.06)"}`,
                          backgroundColor: isSelected ? "rgba(249,115,22,0.06)" : "transparent",
                        }}
                        data-testid={`crystal-goal-${rec.template.id}`}
                      >
                        {/* Toggle */}
                        <div
                          className="size-5 rounded flex-shrink-0 flex items-center justify-center transition-all"
                          style={{
                            border: `2px solid ${isSelected ? "#f97316" : "rgba(255,255,255,0.2)"}`,
                            backgroundColor: isSelected ? "#f97316" : "transparent",
                            borderRadius: 6,
                          }}
                        >
                          {isSelected && <Check className="size-3 text-white" />}
                        </div>

                        <div className="flex-1 text-left min-w-0">
                          <p className="text-sm font-medium">{rec.template.title}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">{rec.reason}</p>
                        </div>

                        {/* Relevance bar */}
                        <div className="w-16 flex-shrink-0">
                          <div className="h-1 rounded-full bg-white/5 overflow-hidden">
                            <div
                              className="h-full rounded-full transition-all"
                              style={{
                                width: `${rec.relevance * 100}%`,
                                backgroundColor: rec.relevance > 0.7 ? "#f97316" : rec.relevance > 0.5 ? "#f59e0b" : "#6b7280",
                              }}
                            />
                          </div>
                          <p className="text-[10px] text-muted-foreground/50 mt-0.5 text-right">
                            {Math.round(rec.relevance * 100)}% match
                          </p>
                        </div>
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Life areas preview */}
      {vision.otherAreas.length > 0 && (
        <div
          className="rounded-xl border border-white/8 bg-white/2 px-5 py-4 mb-8 transition-all duration-700"
          style={{
            opacity: revealStep >= 4 ? 1 : 0,
            transform: `translateY(${revealStep >= 4 ? 0 : 20}px)`,
          }}
        >
          <p className="text-xs font-medium text-muted-foreground mb-2">Also tracking</p>
          <div className="flex flex-wrap gap-2">
            {vision.otherAreas.map(areaId => {
              const area = LIFE_AREAS.find(a => a.id === areaId)
              if (!area) return null
              return (
                <span
                  key={areaId}
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium"
                  style={{
                    backgroundColor: `${area.hex}15`,
                    color: area.hex,
                    border: `1px solid ${area.hex}30`,
                  }}
                >
                  <area.icon className="size-3" />
                  {area.name}
                </span>
              )
            })}
          </div>
        </div>
      )}

      {/* Footer actions */}
      <div
        className="flex items-center justify-between transition-all duration-700"
        style={{
          opacity: revealStep >= 4 ? 1 : 0,
          transform: `translateY(${revealStep >= 4 ? 0 : 20}px)`,
        }}
      >
        <button
          onClick={onBack}
          className="text-sm text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
        >
          Back to questions
        </button>

        <Button
          onClick={onContinue}
          disabled={selectedCount === 0}
          className="px-6 py-2.5 bg-orange-500 hover:bg-orange-600 text-white rounded-xl transition-all shadow-lg shadow-orange-500/20"
          data-testid="crystallize-continue"
        >
          <TrendingUp className="size-4 mr-2" />
          Create {selectedCount} {selectedCount === 1 ? "Goal" : "Goals"}
        </Button>
      </div>
    </div>
  )
}
