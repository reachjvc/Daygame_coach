"use client"

import { useState, useEffect } from "react"
import {
  CheckCircle2,
  Swords,
  Zap,
  Trophy,
  Target,
  ArrowRight,
  RotateCcw,
  Sparkles,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import type { Quest } from "./quest-data"
import type { ObjectiveState } from "./QuestBriefing"

interface QuestAcceptedProps {
  quest: Quest
  objectives: Map<string, ObjectiveState>
  onStartOver: () => void
}

export function QuestAccepted({ quest, objectives, onStartOver }: QuestAcceptedProps) {
  const [showContent, setShowContent] = useState(false)
  const [showStats, setShowStats] = useState(false)
  const [showObjectives, setShowObjectives] = useState(false)

  const enabledObjectives = quest.objectives.filter((o) => objectives.get(o.id)?.enabled)
  const totalXP = enabledObjectives.reduce(
    (sum, obj) => sum + Math.round(quest.xpReward * obj.weight),
    0
  )

  // Staggered reveal animation
  useEffect(() => {
    const t1 = setTimeout(() => setShowContent(true), 300)
    const t2 = setTimeout(() => setShowStats(true), 800)
    const t3 = setTimeout(() => setShowObjectives(true), 1300)
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3) }
  }, [])

  return (
    <div className="max-w-lg mx-auto space-y-6 py-8">
      {/* Celebration header */}
      <div
        className={`text-center transition-all duration-700 ${
          showContent ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
        }`}
      >
        <div className="relative inline-block mb-4">
          <div className="rounded-full bg-green-500/10 p-6">
            <CheckCircle2 className="size-12 text-green-500" />
          </div>
          {/* Sparkle decorations */}
          <Sparkles
            className="size-5 text-amber-500 absolute -top-1 -right-1 animate-pulse"
          />
          <Sparkles
            className="size-4 text-amber-400 absolute -bottom-0.5 -left-2 animate-pulse"
            style={{ animationDelay: "0.5s" }}
          />
        </div>

        <h2 className="text-2xl font-bold mb-2">Quest Accepted!</h2>
        <p className="text-muted-foreground">
          You&apos;ve committed to <span className="font-semibold text-foreground">{quest.title}</span>
        </p>
      </div>

      {/* Stats cards */}
      <div
        className={`grid grid-cols-3 gap-3 transition-all duration-700 ${
          showStats ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
        }`}
      >
        <StatCard
          icon={Target}
          label="Objectives"
          value={enabledObjectives.length.toString()}
          color="#3b82f6"
        />
        <StatCard
          icon={Zap}
          label="Total XP"
          value={totalXP.toString()}
          color="#f59e0b"
        />
        <StatCard
          icon={Trophy}
          label="Difficulty"
          value={quest.difficulty.charAt(0).toUpperCase() + quest.difficulty.slice(1)}
          color="#a855f7"
          small
        />
      </div>

      {/* Objectives summary */}
      <div
        className={`rounded-xl border border-border bg-card p-5 transition-all duration-700 ${
          showObjectives ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
        }`}
      >
        <div className="flex items-center gap-2 mb-3">
          <Swords className="size-4 text-amber-500" />
          <h3 className="text-sm font-semibold">Your Objectives</h3>
        </div>
        <div className="space-y-2">
          {enabledObjectives.slice(0, 8).map((obj) => {
            const state = objectives.get(obj.id)
            return (
              <div
                key={obj.id}
                className="flex items-center gap-2 text-sm"
              >
                <CheckCircle2 className="size-3.5 text-green-500 flex-shrink-0" />
                <span className="flex-1 truncate">{obj.title}</span>
                <span className="text-xs text-muted-foreground font-mono">
                  {state?.targetValue ?? obj.targetValue} {obj.unit}
                </span>
              </div>
            )
          })}
          {enabledObjectives.length > 8 && (
            <p className="text-xs text-muted-foreground pl-5">
              +{enabledObjectives.length - 8} more objectives
            </p>
          )}
        </div>
      </div>

      {/* Note about demo */}
      <div
        className={`rounded-lg border border-amber-500/20 bg-amber-500/5 p-4 transition-all duration-700 ${
          showObjectives ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
        }`}
      >
        <p className="text-xs text-amber-600 dark:text-amber-400">
          This is a design variant preview. In the live app, accepting this quest would
          create your full goal tree with all objectives, milestones, and habit ramps
          ready to track.
        </p>
      </div>

      {/* Actions */}
      <div
        className={`flex gap-3 transition-all duration-700 ${
          showObjectives ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
        }`}
      >
        <Button
          variant="outline"
          onClick={onStartOver}
          className="flex-1"
        >
          <RotateCcw className="size-4 mr-1.5" />
          Start Over
        </Button>
        <Button
          onClick={onStartOver}
          className="flex-1"
        >
          Accept Another Quest
          <ArrowRight className="size-4 ml-1.5" />
        </Button>
      </div>
    </div>
  )
}

// ============================================================================
// Stat Card
// ============================================================================

function StatCard({
  icon: Icon,
  label,
  value,
  color,
  small = false,
}: {
  icon: typeof Target
  label: string
  value: string
  color: string
  small?: boolean
}) {
  return (
    <div className="rounded-lg border border-border/50 bg-card p-3 text-center">
      <Icon className="size-5 mx-auto mb-1.5" style={{ color }} />
      <p className={`font-bold ${small ? "text-sm" : "text-lg"}`}>{value}</p>
      <p className="text-[10px] text-muted-foreground uppercase tracking-wide">{label}</p>
    </div>
  )
}
