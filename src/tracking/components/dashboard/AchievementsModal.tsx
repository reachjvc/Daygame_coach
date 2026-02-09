"use client"

import { useState } from "react"
import { Card } from "@/components/ui/card"
import {
  Trophy,
  Lock,
  Sparkles,
  X,
  Filter,
} from "lucide-react"
import type { MilestoneRow } from "@/src/db/trackingTypes"
import {
  ALL_MILESTONES,
  TIER_INFO,
  getMilestoneInfo,
  getTierColor,
  getTierBg,
  getMilestoneCategories,
  getAllTiers,
  type MilestoneInfo,
  type MilestoneTier,
} from "../../data/milestones"

interface AchievementsModalProps {
  isOpen: boolean
  onClose: () => void
  milestones: MilestoneRow[]
}

export function AchievementsModal({ isOpen, onClose, milestones }: AchievementsModalProps) {
  const categories = getMilestoneCategories()
  const [activeCategory, setActiveCategory] = useState(categories[0])
  const [selectedTiers, setSelectedTiers] = useState<Set<MilestoneTier>>(getAllTiers())

  const selectTier = (tier: MilestoneTier) => {
    setSelectedTiers(new Set<MilestoneTier>([tier]))
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4 pt-safe pb-safe">
      <Card
        className="w-full max-w-4xl max-h-[calc(var(--app-vh)*90)] overflow-hidden flex flex-col"
        role="dialog"
        aria-modal="true"
        aria-labelledby="achievements-title"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b bg-card">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-primary/20">
              <Trophy className="size-6 text-primary" />
            </div>
            <div>
              <h2 id="achievements-title" className="text-xl font-bold">All Achievements</h2>
              <p className="text-sm text-muted-foreground">
                {milestones.length} of {Object.keys(ALL_MILESTONES).length} unlocked
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary/10 hover:bg-primary/20 text-primary font-medium transition-colors"
          >
            <span>Close</span>
            <X className="size-4" />
          </button>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto scroll-touch [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          {/* Recent Achievements Showcase */}
          {milestones.length > 0 && (
            <div className="p-5 border-b bg-gradient-to-b from-primary/5 to-transparent">
              <div className="flex items-center gap-2 mb-4">
                <Sparkles className="size-5 text-primary" />
                <span className="font-semibold">Your Recent Achievements</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {milestones.slice(0, 8).map((milestone) => {
                  const info = getMilestoneInfo(milestone.milestone_type)
                  return (
                    <div
                      key={milestone.id}
                      className={`p-3 rounded-xl ${getTierBg(info.tier)} hover:scale-[1.02] transition-transform cursor-pointer`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`size-12 rounded-full bg-gradient-to-br ${getTierColor(info.tier)} flex items-center justify-center shadow-lg shrink-0`}>
                          <span className="text-xl">{info.emoji}</span>
                        </div>
                        <div className="min-w-0">
                          <div className="font-medium text-sm truncate">{info.label}</div>
                          <div className="text-xs text-muted-foreground capitalize">{info.tier}</div>
                          <div className="text-xs text-muted-foreground/70">
                            {new Date(milestone.achieved_at).toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Tier Filters */}
          <div className="px-5 py-4 border-b">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Filter className="size-4 text-muted-foreground" />
                <span className="text-sm font-medium text-muted-foreground">Filter by Tier</span>
              </div>
              <button
                onClick={() => setSelectedTiers(new Set<MilestoneInfo['tier']>(['bronze', 'silver', 'gold', 'platinum', 'diamond']))}
                className="text-xs text-primary hover:underline"
              >
                Show All
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {TIER_INFO.map((tier) => {
                const isActive = selectedTiers.has(tier.name)
                const count = Object.entries(ALL_MILESTONES).filter(([k, m]) =>
                  m.tier === tier.name && milestones.some(em => em.milestone_type === k)
                ).length
                const total = Object.values(ALL_MILESTONES).filter(m => m.tier === tier.name).length

                return (
                  <button
                    key={tier.name}
                    onClick={() => selectTier(tier.name)}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-all border ${
                      isActive
                        ? 'border-primary/50 bg-primary/10 text-foreground'
                        : 'border-transparent bg-muted/50 text-muted-foreground hover:bg-muted'
                    }`}
                  >
                    <span>{tier.icon}</span>
                    <span>{tier.label}</span>
                    <span className="text-xs opacity-60">{count}/{total}</span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Category Tabs */}
          <div className="p-5">
            <div className="flex flex-wrap gap-2 pb-4 mb-4 border-b">
              {categories.map((cat) => {
                const catMilestones = Object.entries(ALL_MILESTONES).filter(([, m]) => m.category === cat)
                const earned = catMilestones.filter(([k]) => milestones.some(em => em.milestone_type === k)).length
                const isComplete = earned === catMilestones.length && catMilestones.length > 0
                return (
                  <button
                    key={cat}
                    onClick={() => setActiveCategory(cat)}
                    className={`px-4 py-2 rounded-lg text-sm transition-all ${
                      activeCategory === cat
                        ? 'bg-primary text-primary-foreground font-medium shadow-md'
                        : 'bg-muted/50 hover:bg-muted text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {cat}
                    {isComplete && <Sparkles className="inline size-3 ml-1.5" />}
                    <span className="ml-2 text-xs opacity-70">
                      {earned}/{catMilestones.length}
                    </span>
                  </button>
                )
              })}
            </div>

            {/* Grid of achievements */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {Object.entries(ALL_MILESTONES)
                .filter(([, m]) => m.category === activeCategory && selectedTiers.has(m.tier))
                .map(([key, m]) => {
                  const earned = milestones.find(em => em.milestone_type === key)
                  const isLocked = !earned
                  return (
                    <div
                      key={key}
                      className={`p-4 rounded-xl border transition-all ${
                        isLocked
                          ? 'bg-muted/20 border-border/50 opacity-50'
                          : `${getTierBg(m.tier)} border-transparent shadow-sm`
                      }`}
                    >
                      <div className="flex items-center gap-3 mb-2">
                        <div className={`size-12 rounded-full flex items-center justify-center shadow-md shrink-0 ${
                          isLocked ? 'bg-muted' : `bg-gradient-to-br ${getTierColor(m.tier)}`
                        }`}>
                          {isLocked ? <Lock className="size-4" /> : <span className="text-xl">{m.emoji}</span>}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className={`font-medium truncate ${isLocked ? 'text-muted-foreground' : ''}`}>
                            {m.label}
                          </div>
                          <div className="text-xs text-muted-foreground capitalize">{m.tier}</div>
                        </div>
                      </div>
                      <p className="text-sm text-muted-foreground">{m.description}</p>
                      {earned && (
                        <p className="text-xs text-primary/70 mt-2">
                          Unlocked {new Date(earned.achieved_at).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                  )
                })}
            </div>

            {/* Empty state */}
            {Object.entries(ALL_MILESTONES)
              .filter(([, m]) => m.category === activeCategory && selectedTiers.has(m.tier))
              .length === 0 && (
              <div className="text-center py-12 text-muted-foreground">
                <Lock className="size-10 mx-auto mb-3 opacity-30" />
                <p>No achievements match the selected filters</p>
                <button
                  onClick={() => setSelectedTiers(new Set<MilestoneInfo['tier']>(['bronze', 'silver', 'gold', 'platinum', 'diamond']))}
                  className="text-sm text-primary hover:underline mt-2"
                >
                  Reset filters
                </button>
              </div>
            )}
          </div>
        </div>
      </Card>
    </div>
  )
}
