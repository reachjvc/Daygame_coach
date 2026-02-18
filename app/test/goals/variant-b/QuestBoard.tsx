"use client"

import { useMemo } from "react"
import {
  ArrowLeft,
  Heart,
  Flame,
  Trophy,
  Shield,
  Zap,
  Crown,
  Star,
  ChevronRight,
  Sparkles,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import type { Quest, Realm } from "./quest-data"

const DIFFICULTY_CONFIG = {
  beginner: { label: "Beginner", color: "#22c55e", icon: Shield, stars: 1 },
  intermediate: { label: "Intermediate", color: "#3b82f6", icon: Zap, stars: 2 },
  advanced: { label: "Advanced", color: "#a855f7", icon: Star, stars: 3 },
  legendary: { label: "Legendary", color: "#f59e0b", icon: Crown, stars: 4 },
} as const

interface QuestBoardProps {
  realm: Realm
  quests: Quest[]
  achievementQuests: Quest[]
  onSelectQuest: (quest: Quest) => void
  onBack: () => void
}

export function QuestBoard({ realm, quests, achievementQuests, onSelectQuest, onBack }: QuestBoardProps) {
  const findTheOneQuests = useMemo(
    () => quests.filter((q) => q.pathType === "find_the_one"),
    [quests]
  )
  const abundanceQuests = useMemo(
    () => quests.filter((q) => q.pathType === "abundance"),
    [quests]
  )

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors cursor-pointer mb-3"
          data-testid="quest-board-back"
        >
          <ArrowLeft className="size-3.5" />
          Back to realms
        </button>
        <div className="flex items-center gap-3">
          <div className="rounded-lg p-2.5" style={{ background: `${realm.hex}20` }}>
            <realm.icon className="size-6" style={{ color: realm.hex }} />
          </div>
          <div>
            <h2 className="text-xl font-bold">{realm.name}</h2>
            <p className="text-sm text-muted-foreground">{realm.tagline}</p>
          </div>
        </div>
      </div>

      {realm.id === "daygame" ? (
        <DaygameQuestBoard
          findTheOneQuests={findTheOneQuests}
          abundanceQuests={abundanceQuests}
          achievementQuests={achievementQuests}
          onSelectQuest={onSelectQuest}
          hex={realm.hex}
        />
      ) : (
        <SideRealmBoard
          realm={realm}
          onSelectQuest={onSelectQuest}
        />
      )}
    </div>
  )
}

// ============================================================================
// Daygame Quest Board - Two paths + achievements
// ============================================================================

function DaygameQuestBoard({
  findTheOneQuests,
  abundanceQuests,
  achievementQuests,
  onSelectQuest,
  hex,
}: {
  findTheOneQuests: Quest[]
  abundanceQuests: Quest[]
  achievementQuests: Quest[]
  onSelectQuest: (quest: Quest) => void
  hex: string
}) {
  return (
    <div className="space-y-6">
      {/* Path selector explanation */}
      <div className="rounded-lg border border-border/50 bg-muted/30 p-4">
        <div className="flex items-center gap-2 mb-1">
          <Sparkles className="size-4 text-amber-500" />
          <p className="text-sm font-medium">Choose your path</p>
        </div>
        <p className="text-xs text-muted-foreground">
          Each quest generates a complete goal tree with achievements, milestones, and habits.
          Pick one that matches your current life vision.
        </p>
      </div>

      {/* Find the One Path */}
      <QuestPathSection
        title="Find the One"
        subtitle="Relationship-focused quests"
        icon={Heart}
        iconColor="#ec4899"
        quests={findTheOneQuests}
        onSelectQuest={onSelectQuest}
        accentHex={hex}
      />

      {/* Abundance Path */}
      <QuestPathSection
        title="Abundance"
        subtitle="Experience & variety quests"
        icon={Flame}
        iconColor="#f97316"
        quests={abundanceQuests}
        onSelectQuest={onSelectQuest}
        accentHex={hex}
      />

      {/* Achievement Quests */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Trophy className="size-4 text-amber-500" />
          <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wide">
            Skill Quests
          </span>
          <div className="flex-1 border-t border-border/30" />
        </div>
        <p className="text-xs text-muted-foreground mb-3">
          Focus on mastering specific skills. Each unlocks targeted objectives.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {achievementQuests.map((quest) => (
            <QuestCard
              key={quest.id}
              quest={quest}
              onSelect={() => onSelectQuest(quest)}
              compact
            />
          ))}
        </div>
      </div>
    </div>
  )
}

// ============================================================================
// Side Realm Board (non-daygame)
// ============================================================================

function SideRealmBoard({
  realm,
  onSelectQuest,
}: {
  realm: Realm
  onSelectQuest: (quest: Quest) => void
}) {
  // For non-daygame realms, show suggestions as quest-styled cards
  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-border/50 bg-muted/30 p-4">
        <p className="text-sm font-medium mb-1">Quick-start goals</p>
        <p className="text-xs text-muted-foreground">
          These goals can be set up manually. Full quest trees for this realm are coming soon.
        </p>
      </div>

      <div className="space-y-2">
        {realm.config.suggestions.map((suggestion, i) => (
          <div
            key={i}
            className="flex items-center gap-3 rounded-lg border border-border/50 p-3 hover:bg-muted/30 transition-colors"
          >
            <div
              className="rounded-md p-1.5 flex-shrink-0"
              style={{ background: `${realm.hex}15` }}
            >
              <Star className="size-3.5" style={{ color: realm.hex }} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{suggestion.title}</p>
              <p className="text-xs text-muted-foreground">
                {suggestion.defaultTarget} {suggestion.defaultPeriod}
              </p>
            </div>
            {suggestion.featured && (
              <Badge
                variant="outline"
                className="text-[9px] px-1.5 py-0"
                style={{ color: realm.hex, borderColor: `${realm.hex}40` }}
              >
                Featured
              </Badge>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

// ============================================================================
// Quest Path Section
// ============================================================================

function QuestPathSection({
  title,
  subtitle,
  icon: Icon,
  iconColor,
  quests,
  onSelectQuest,
  accentHex,
}: {
  title: string
  subtitle: string
  icon: typeof Heart
  iconColor: string
  quests: Quest[]
  onSelectQuest: (quest: Quest) => void
  accentHex: string
}) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <Icon className="size-4" style={{ color: iconColor }} />
        <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wide">
          {title}
        </span>
        <span className="text-[10px] text-muted-foreground/60">{subtitle}</span>
        <div className="flex-1 border-t border-border/30" />
      </div>
      <div className="space-y-2">
        {quests.map((quest) => (
          <QuestCard
            key={quest.id}
            quest={quest}
            onSelect={() => onSelectQuest(quest)}
          />
        ))}
      </div>
    </div>
  )
}

// ============================================================================
// Quest Card
// ============================================================================

function QuestCard({
  quest,
  onSelect,
  compact = false,
}: {
  quest: Quest
  onSelect: () => void
  compact?: boolean
}) {
  const diff = DIFFICULTY_CONFIG[quest.difficulty]
  const DiffIcon = diff.icon

  return (
    <button
      onClick={onSelect}
      className={`
        w-full text-left rounded-lg border border-border/50 transition-all duration-200 cursor-pointer
        hover:border-border hover:bg-muted/30 hover:shadow-sm
        ${compact ? "p-3" : "p-4"}
      `}
      data-testid={`quest-${quest.id}`}
    >
      <div className="flex items-start gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h4 className={`font-semibold ${compact ? "text-sm" : "text-base"}`}>
              {quest.title}
            </h4>
          </div>

          {!compact && quest.description && (
            <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
              {quest.description}
            </p>
          )}

          <div className="flex items-center gap-3 flex-wrap">
            {/* Difficulty */}
            <span className="flex items-center gap-1">
              <DiffIcon className="size-3" style={{ color: diff.color }} />
              <span className="text-[10px] font-medium" style={{ color: diff.color }}>
                {diff.label}
              </span>
            </span>

            {/* XP */}
            <span className="flex items-center gap-1 text-[10px] text-amber-500">
              <Zap className="size-3" />
              {quest.xpReward} XP
            </span>

            {/* Objectives count */}
            <span className="text-[10px] text-muted-foreground">
              {quest.objectives.length} objectives
            </span>

            {/* Star rating */}
            <span className="flex items-center gap-0.5">
              {Array.from({ length: 4 }).map((_, i) => (
                <Star
                  key={i}
                  className="size-2.5"
                  style={{
                    color: i < diff.stars ? diff.color : "var(--muted-foreground)",
                    opacity: i < diff.stars ? 1 : 0.2,
                    fill: i < diff.stars ? diff.color : "none",
                  }}
                />
              ))}
            </span>
          </div>
        </div>

        <ChevronRight className="size-4 text-muted-foreground flex-shrink-0 mt-1" />
      </div>
    </button>
  )
}
