"use client"

import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  Compass,
  Eye,
  Flame,
  CircleDot,
  Sparkles,
  Trophy,
  Lock,
  CheckCircle2,
  ChevronRight,
} from "lucide-react"
import { cn } from "@/lib/utils"

import { InnerGameStep, type InnerGameProgress, type SectionStatus } from "../types"
import { getSectionStatus } from "../modules/progressUtils"

interface ValuesHubProps {
  progress: InnerGameProgress
  onSelectSection: (step: InnerGameStep) => void
}

type SectionDef = {
  step: InnerGameStep
  title: string
  description: string
  icon: typeof Compass
}

const SECTIONS: SectionDef[] = [
  {
    step: InnerGameStep.VALUES,
    title: "Discover Values",
    description: "Explore what matters most to you across 11 life domains",
    icon: Compass,
  },
  {
    step: InnerGameStep.SHADOW,
    title: "Shadow Self",
    description: "Uncover hidden values through your fears and frustrations",
    icon: Eye,
  },
  {
    step: InnerGameStep.PEAK_EXPERIENCE,
    title: "Peak Experience",
    description: "Identify values from your most meaningful moments",
    icon: Flame,
  },
  {
    step: InnerGameStep.HURDLES,
    title: "Growth Edges",
    description: "Discover values through your challenges and aspirations",
    icon: CircleDot,
  },
  {
    step: InnerGameStep.CUTTING,
    title: "Prioritize",
    description: "Compare and rank your values to find your core five",
    icon: Sparkles,
  },
  {
    step: InnerGameStep.COMPLETE,
    title: "Your Core Values",
    description: "View your final core values and how to live by them",
    icon: Trophy,
  },
]

function getStatusBadge(status: SectionStatus, detail?: string) {
  switch (status) {
    case "completed":
      return (
        <span className="inline-flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400">
          <CheckCircle2 className="h-3.5 w-3.5" />
          Complete
        </span>
      )
    case "in_progress":
      return (
        <span className="text-xs text-primary font-medium">
          {detail || "In progress"}
        </span>
      )
    case "locked":
      return (
        <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
          <Lock className="h-3 w-3" />
          {detail || "Locked"}
        </span>
      )
    default:
      return null
  }
}

function SectionCard({
  section,
  status,
  statusDetail,
  onSelect,
}: {
  section: SectionDef
  status: SectionStatus
  statusDetail?: string
  onSelect: () => void
}) {
  const Icon = section.icon
  const isLocked = status === "locked"
  const isCompleted = status === "completed"
  const isInProgress = status === "in_progress"

  return (
    <Card
      className={cn(
        "p-4 transition-all",
        isLocked
          ? "bg-muted/30 border-border/50 opacity-60 cursor-not-allowed"
          : "bg-card border-border hover:border-primary/50 cursor-pointer hover:shadow-sm"
      )}
      onClick={isLocked ? undefined : onSelect}
      data-testid={`section-card-${section.step}`}
    >
      <div className="flex items-start gap-3">
        <div
          className={cn(
            "size-10 rounded-full flex items-center justify-center shrink-0",
            isLocked
              ? "bg-muted"
              : isCompleted
                ? "bg-emerald-500/10"
                : "bg-primary/10"
          )}
        >
          {isLocked ? (
            <Lock className="size-5 text-muted-foreground" />
          ) : (
            <Icon
              className={cn(
                "size-5",
                isCompleted ? "text-emerald-600 dark:text-emerald-400" : "text-primary"
              )}
            />
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <h3 className="font-semibold text-foreground">{section.title}</h3>
            {getStatusBadge(status, statusDetail)}
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">
            {section.description}
          </p>

          {/* Action hint */}
          {!isLocked && (
            <div className="mt-2 flex items-center text-sm">
              {isCompleted ? (
                <span className="text-muted-foreground flex items-center gap-1">
                  View results <ChevronRight className="h-4 w-4" />
                </span>
              ) : isInProgress ? (
                <span className="text-primary font-medium flex items-center gap-1">
                  Continue <ChevronRight className="h-4 w-4" />
                </span>
              ) : (
                <span className="text-muted-foreground flex items-center gap-1">
                  Start <ChevronRight className="h-4 w-4" />
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    </Card>
  )
}

export function ValuesHub({ progress, onSelectSection }: ValuesHubProps) {
  return (
    <div className="space-y-6" data-testid="values-hub">
      {/* Header */}
      <div className="text-center max-w-xl mx-auto">
        <h2 className="text-2xl font-bold text-foreground mb-2">
          Your Values Journey
        </h2>
        <p className="text-muted-foreground">
          Discover your core values through guided reflection. Complete each section to uncover what truly matters to you.
        </p>
      </div>

      {/* Section Grid */}
      <div className="grid sm:grid-cols-2 gap-4">
        {SECTIONS.map((section) => {
          const { status, detail } = getSectionStatus(progress, section.step)
          return (
            <SectionCard
              key={section.step}
              section={section}
              status={status}
              statusDetail={detail}
              onSelect={() => onSelectSection(section.step)}
            />
          )
        })}
      </div>
    </div>
  )
}
