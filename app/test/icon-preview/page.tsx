"use client"

import { useState } from "react"
import Link from "next/link"
import {
  ArrowLeft,
  ArrowUpCircle,
  Activity,
  BarChart3,
  Bookmark,
  Brain,
  Compass,
  CircleDot,
  Clock,
  Crosshair,
  Crown,
  Dumbbell,
  Eye,
  Flag,
  Footprints,
  Gauge,
  Gem,
  GraduationCap,
  Heart,
  Library,
  Lightbulb,
  Medal,
  PartyPopper,
  Puzzle,
  Rocket,
  Shapes,
  Sparkles,
  Star,
  Sunrise,
  Target,
  TrendingUp,
  Trophy,
  Zap,
  type LucideIcon,
} from "lucide-react"
import { Button } from "@/components/ui/button"

// ─── Types ───────────────────────────────────────────────────────────────────

interface IconSwap {
  context: string
  where: string // files/components where this appears
  current: LucideIcon
  currentName: string
  proposed: LucideIcon
  proposedName: string
  rationale: string
}

interface IconIssue {
  id: number
  iconName: string
  currentIcon: LucideIcon
  fileCount: number
  problem: string
  swaps: IconSwap[]
}

// ─── Data ────────────────────────────────────────────────────────────────────

const ICON_ISSUES: IconIssue[] = [
  {
    id: 1,
    iconName: "Target",
    currentIcon: Target,
    fileCount: 47,
    problem: "Used for everything: logo, goals nav, individual goals, tracking stats, empty states, scenarios, articles, onboarding...",
    swaps: [
      {
        context: "Site logo / branding",
        where: "AppHeader, login, sign-up pages",
        current: Target,
        currentName: "Target",
        proposed: Crosshair,
        proposedName: "Crosshair",
        rationale: "Thinner, more refined — feels like a brand mark",
      },
      {
        context: "Goals feature / page nav",
        where: "AppHeader nav, GoalsHubContent, view headers, HomePage",
        current: Target,
        currentName: "Target",
        proposed: Flag,
        proposedName: "Flag",
        rationale: '"Goals" = planting a flag — clear section identity',
      },
      {
        context: "Individual L1 goal header",
        where: "GoalHierarchyView, GoalCatalogPicker, lair widgets",
        current: Target,
        currentName: "Target",
        proposed: CircleDot,
        proposedName: "CircleDot",
        rationale: "Each goal already has a life area icon — this is fallback only",
      },
      {
        context: "Tracking approaches stat",
        where: "QuickStatsGrid, keyStatsCreative, templateIcons",
        current: Target,
        currentName: "Target",
        proposed: Footprints,
        proposedName: "Footprints",
        rationale: "Approaching someone = footsteps — distinct from goals",
      },
      {
        context: 'Generic "objective" in slices',
        where: "ScenariosPage, ArticlesPage, InnerGamePage, ValuesHub, OnboardingFlow, SettingsPage",
        current: Target,
        currentName: "Target",
        proposed: CircleDot,
        proposedName: "CircleDot",
        rationale: "Stop using Target as a catch-all — each slice can pick its own",
      },
    ],
  },
  {
    id: 2,
    iconName: "TrendingUp",
    currentIcon: TrendingUp,
    fileCount: 19,
    problem: 'Always means "growth/progress" but appears so often it loses impact.',
    swaps: [
      {
        context: "Level progress bar",
        where: "XP/level displays",
        current: TrendingUp,
        currentName: "TrendingUp",
        proposed: Gauge,
        proposedName: "Gauge",
        rationale: "Level feels like a meter, not a trend line",
      },
      {
        context: "Onboarding flow",
        where: "OnboardingFlow",
        current: TrendingUp,
        currentName: "TrendingUp",
        proposed: Rocket,
        proposedName: "Rocket",
        rationale: "Onboarding is about getting started, not reviewing trends",
      },
      {
        context: "HomePage feature card",
        where: "HomePage",
        current: TrendingUp,
        currentName: "TrendingUp",
        proposed: BarChart3,
        proposedName: "BarChart3",
        rationale: "Marketing/feature highlight — distinct from in-app stats",
      },
      {
        context: "ScenariosPage catalog",
        where: "ScenariosPage",
        current: TrendingUp,
        currentName: "TrendingUp",
        proposed: GraduationCap,
        proposedName: "GraduationCap",
        rationale: "Practice/training, not metrics",
      },
      {
        context: "Actual stats & trends",
        where: "QuickStatsGrid, GoalCard milestone, keyStats",
        current: TrendingUp,
        currentName: "TrendingUp",
        proposed: TrendingUp,
        proposedName: "TrendingUp (keep)",
        rationale: "These ARE trend/stat displays — correct usage",
      },
    ],
  },
  {
    id: 3,
    iconName: "Trophy",
    currentIcon: Trophy,
    fileCount: 18,
    problem: 'Always means achievements/completion — conceptually consistent but visually repetitive.',
    swaps: [
      {
        context: "Milestone completion",
        where: "Milestone badges, GoalCard",
        current: Trophy,
        currentName: "Trophy",
        proposed: Medal,
        proposedName: "Medal",
        rationale: "Milestone = a step along the way, not the final prize",
      },
      {
        context: "Achievement badges",
        where: "Achievement system",
        current: Trophy,
        currentName: "Trophy",
        proposed: Trophy,
        proposedName: "Trophy (keep)",
        rationale: 'This is the "real" achievement icon — keep it here',
      },
      {
        context: "Celebration overlay",
        where: "CelebrationOverlay",
        current: Trophy,
        currentName: "Trophy",
        proposed: PartyPopper,
        proposedName: "PartyPopper",
        rationale: "Celebration is about the moment, not the object",
      },
      {
        context: "Level-up display",
        where: "Level progress UI",
        current: Trophy,
        currentName: "Trophy",
        proposed: Crown,
        proposedName: "Crown",
        rationale: "Level-up feels regal — distinct from milestone",
      },
    ],
  },
  {
    id: 4,
    iconName: "Sparkles",
    currentIcon: Sparkles,
    fileCount: 16,
    problem: 'Became the generic "this is special" icon — AI, celebration, catalog, articles, scenarios...',
    swaps: [
      {
        context: "AI / generated content",
        where: "ScenariosHub, OpenersTrainer",
        current: Sparkles,
        currentName: "Sparkles",
        proposed: Sparkles,
        proposedName: "Sparkles (keep)",
        rationale: "This is the AI convention — keep it here",
      },
      {
        context: "Celebration effects",
        where: "CelebrationOverlay",
        current: Sparkles,
        currentName: "Sparkles",
        proposed: PartyPopper,
        proposedName: "PartyPopper",
        rationale: "More specific than generic sparkle",
      },
      {
        context: "Catalog / browse UI",
        where: "GoalCatalogPicker, ArticlesPage",
        current: Sparkles,
        currentName: "Sparkles",
        proposed: Library,
        proposedName: "Library",
        rationale: "Browsing content, not magic",
      },
      {
        context: "Inner-game / aspiration steps",
        where: "AspirationalCheck, ValuesHub, WelcomeCard, StepProgress",
        current: Sparkles,
        currentName: "Sparkles",
        proposed: Sunrise,
        proposedName: "Sunrise",
        rationale: "Aspiration/journey, not sparkle",
      },
      {
        context: "Key stats analysis",
        where: "Key stats sections",
        current: Sparkles,
        currentName: "Sparkles",
        proposed: Activity,
        proposedName: "Activity",
        rationale: "Data analysis, not magic",
      },
    ],
  },
  {
    id: 5,
    iconName: "Star",
    currentIcon: Star,
    fileCount: 9,
    problem: 'Multiple unrelated meanings: favorites, confetti, life area "custom", premium, quality rating.',
    swaps: [
      {
        context: "Favorites / bookmarks",
        where: "Favorites UI",
        current: Star,
        currentName: "Star",
        proposed: Star,
        proposedName: "Star (keep)",
        rationale: "Universal favorites convention",
      },
      {
        context: "Celebration confetti",
        where: "CelebrationOverlay",
        current: Star,
        currentName: "Star",
        proposed: PartyPopper,
        proposedName: "PartyPopper",
        rationale: "Celebration, not rating",
      },
      {
        context: 'Life area "Custom/Other"',
        where: "lifeAreas.ts",
        current: Star,
        currentName: "Star",
        proposed: Puzzle,
        proposedName: "Puzzle",
        rationale: '"Miscellaneous" — not star-worthy',
      },
      {
        context: "Premium indicator",
        where: "Premium/locked content",
        current: Star,
        currentName: "Star",
        proposed: Gem,
        proposedName: "Gem",
        rationale: "Premium = precious, distinct from favorites",
      },
      {
        context: "Quality rating (field reports)",
        where: "FieldReportPage",
        current: Star,
        currentName: "Star",
        proposed: Star,
        proposedName: "Star (keep)",
        rationale: "Rating convention — correct usage",
      },
    ],
  },
  {
    id: 6,
    iconName: "Heart",
    currentIcon: Heart,
    fileCount: 8,
    problem: "Dating life area, emotional template, tracking stats, inner-game. Mostly consistent.",
    swaps: [
      {
        context: "Dating life area",
        where: "lifeAreas.ts, tracking, goals",
        current: Heart,
        currentName: "Heart",
        proposed: Heart,
        proposedName: "Heart (keep)",
        rationale: "Always means emotion/dating/relationship — consistent",
      },
    ],
  },
  {
    id: 7,
    iconName: "Brain",
    currentIcon: Brain,
    fileCount: 6,
    problem: 'Psychology/inner-game, analysis, life area "mindfulness". Always means "thinking/mental."',
    swaps: [
      {
        context: "Psychology / inner-game / analysis",
        where: "InnerGamePage, mindfulness life area, templates",
        current: Brain,
        currentName: "Brain",
        proposed: Brain,
        proposedName: "Brain (keep)",
        rationale: 'Always means "thinking/mental" — consistent',
      },
    ],
  },
  {
    id: 8,
    iconName: "Lightbulb",
    currentIcon: Lightbulb,
    fileCount: 6,
    problem: 'Suggestions, insights, import tips, weekly review. Always means "idea/insight."',
    swaps: [
      {
        context: "Suggestions / insights / tips",
        where: "Insight sections, tips, weekly review",
        current: Lightbulb,
        currentName: "Lightbulb",
        proposed: Lightbulb,
        proposedName: "Lightbulb (keep)",
        rationale: 'Always means "idea/insight" — consistent',
      },
    ],
  },
  {
    id: 9,
    iconName: "Zap",
    currentIcon: Zap,
    fileCount: 5,
    problem: 'Energy, quick actions, quick log. Always means "fast/energy."',
    swaps: [
      {
        context: "Energy / quick actions",
        where: "Quick log, home page, mission control",
        current: Zap,
        currentName: "Zap",
        proposed: Zap,
        proposedName: "Zap (keep)",
        rationale: 'Always means "fast/energy" — consistent',
      },
    ],
  },
]

// ─── Component ───────────────────────────────────────────────────────────────

export default function IconPreviewPage() {
  const [openIssues, setOpenIssues] = useState<Set<number>>(new Set([1]))

  function toggleIssue(id: number) {
    setOpenIssues((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  const hasChanges = (issue: IconIssue) =>
    issue.swaps.some((s) => s.currentName !== s.proposedName)

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-4xl px-8 py-12">
        {/* Header */}
        <div className="mb-8">
          <Button asChild variant="ghost" size="sm" className="mb-4">
            <Link href="/test">
              <ArrowLeft className="size-4 mr-2" />
              Back to Test Pages
            </Link>
          </Button>
          <div className="flex items-center gap-3">
            <Eye className="size-8 text-primary" />
            <h1 className="text-3xl font-bold">Icon Differentiation Preview</h1>
          </div>
          <p className="text-muted-foreground mt-2">
            Toggle each issue to compare current vs proposed icons. Items 6-9 are
            consistent and likely fine as-is.
          </p>
        </div>

        {/* Issues */}
        <div className="space-y-3">
          {ICON_ISSUES.map((issue) => {
            const isOpen = openIssues.has(issue.id)
            const needsWork = hasChanges(issue)
            const CurrentIcon = issue.currentIcon

            return (
              <div
                key={issue.id}
                className="rounded-lg border border-border bg-card overflow-hidden"
              >
                {/* Toggle header */}
                <button
                  onClick={() => toggleIssue(issue.id)}
                  className="w-full flex items-center gap-3 p-4 text-left hover:bg-muted/50 transition-colors"
                >
                  <CurrentIcon className="size-5 text-primary shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">
                        {issue.id}. {issue.iconName}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        ({issue.fileCount} files)
                      </span>
                      {needsWork ? (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-orange-500/10 text-orange-400 border border-orange-500/20">
                          needs changes
                        </span>
                      ) : (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-green-500/10 text-green-400 border border-green-500/20">
                          consistent
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground truncate">
                      {issue.problem}
                    </p>
                  </div>
                  <span className="text-muted-foreground text-sm">
                    {isOpen ? "▾" : "▸"}
                  </span>
                </button>

                {/* Expanded content */}
                {isOpen && (
                  <div className="border-t border-border px-4 pb-4">
                    <div className="mt-4 space-y-3">
                      {issue.swaps.map((swap, idx) => {
                        const Current = swap.current
                        const Proposed = swap.proposed
                        const isChanged = swap.currentName !== swap.proposedName

                        return (
                          <div
                            key={idx}
                            className={`rounded-lg border p-4 ${
                              isChanged
                                ? "border-orange-500/20 bg-orange-500/5"
                                : "border-border bg-muted/30"
                            }`}
                          >
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-sm">
                                  {swap.context}
                                </p>
                                <p className="text-xs text-muted-foreground mt-0.5">
                                  {swap.where}
                                </p>
                                <p className="text-xs text-muted-foreground/70 mt-1 italic">
                                  {swap.rationale}
                                </p>
                              </div>

                              {/* Icon comparison */}
                              <div className="flex items-center gap-3 shrink-0">
                                {/* Current */}
                                <div className="flex flex-col items-center gap-1">
                                  <div className="rounded-md bg-muted p-2.5">
                                    <Current className="size-5 text-muted-foreground" />
                                  </div>
                                  <span className="text-[10px] text-muted-foreground">
                                    {swap.currentName}
                                  </span>
                                </div>

                                {isChanged && (
                                  <>
                                    <span className="text-muted-foreground text-xs">
                                      →
                                    </span>
                                    {/* Proposed */}
                                    <div className="flex flex-col items-center gap-1">
                                      <div className="rounded-md bg-primary/10 p-2.5 border border-primary/20">
                                        <Proposed className="size-5 text-primary" />
                                      </div>
                                      <span className="text-[10px] text-primary">
                                        {swap.proposedName}
                                      </span>
                                    </div>
                                  </>
                                )}

                                {!isChanged && (
                                  <span className="text-[10px] text-green-400 ml-1">
                                    keep
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
