"use client"

import { useState } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Award, Medal, ChevronDown, ChevronUp } from "lucide-react"
import type { MilestoneRow } from "@/src/db/trackingTypes"
import { getMilestoneInfo, getTierColor, getTierBg } from "../../data/milestones"

interface RecentMilestonesCardProps {
  milestones: MilestoneRow[]
  onViewAll: () => void
}

export function RecentMilestonesCard({ milestones, onViewAll }: RecentMilestonesCardProps) {
  const [expanded, setExpanded] = useState(false)

  return (
    <div className="relative">
      <Card className="p-6 h-full">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-lg">Recent Achievements</h2>
          <Button
            variant="outline"
            size="sm"
            onClick={onViewAll}
            className="gap-1"
          >
            <Medal className="size-4" />
            View All
          </Button>
        </div>
        {milestones.length > 0 ? (
          <div className="space-y-3" data-testid="recent-achievements-list">
            {(expanded ? milestones : milestones.slice(0, 3)).map((milestone) => {
              const info = getMilestoneInfo(milestone.milestone_type)
              return (
                <div
                  key={milestone.id}
                  className={`flex items-center gap-3 p-3 rounded-lg ${getTierBg(info.tier)}`}
                  data-testid="achievement-item"
                >
                  <div className={`relative size-12 rounded-full bg-gradient-to-br ${getTierColor(info.tier)} flex items-center justify-center shadow-lg shrink-0`}>
                    <span className="text-xl">{info.emoji}</span>
                    <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-white/30 to-transparent" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold truncate">
                      {info.label}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {info.description}
                    </div>
                    <div className="text-xs text-muted-foreground/70 capitalize mt-0.5">
                      {info.tier} • {new Date(milestone.achieved_at).toLocaleDateString()}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <Award className="size-12 mx-auto mb-3 opacity-30" />
            <p>No achievements yet</p>
            <p className="text-sm">Start approaching to earn your first!</p>
          </div>
        )}
      </Card>
      {milestones.length > 3 && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="absolute -bottom-3 left-1/2 -translate-x-1/2 z-10 group flex items-center gap-2 pl-4 pr-3 py-2 rounded-full bg-primary text-primary-foreground shadow-lg hover:bg-primary/90 transition-all hover:scale-105 hover:shadow-xl"
          data-testid="achievements-expand-button"
        >
          <span className="text-sm font-medium">
            {expanded ? "Show less" : `${milestones.length - 3} more`}
          </span>
          {expanded ? (
            <ChevronUp className="size-4" />
          ) : (
            <ChevronDown className="size-4" />
          )}
        </button>
      )}
    </div>
  )
}
