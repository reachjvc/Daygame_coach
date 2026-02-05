"use client"

import { useState } from "react"
import { useTrackingStats } from "../hooks/useTrackingStats"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Loader2,
  Play,
  TrendingUp,
  Target,
  Calendar,
  Award,
  Flame,
  ArrowRight,
  Clock,
  Trash2,
  ChevronDown,
  ChevronUp,
  Trophy,
  Lock,
  Sparkles,
  PlusCircle,
  X,
  Filter,
  FileText,
  MapPin,
  Pencil,
} from "lucide-react"
import Link from "next/link"
import { QuickAddModal } from "./QuickAddModal"
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
} from "../data/milestones"
import { getSystemTemplateInfo, TEMPLATE_COLORS, type TemplateSlug } from "../data/templates"
import { TEMPLATE_ICONS } from "./templateIcons"

export function ProgressDashboard() {
  const { state, deleteSession, deleteFieldReport, refresh } = useTrackingStats()
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [deletingReportId, setDeletingReportId] = useState<string | null>(null)
  const [sessionsExpanded, setSessionsExpanded] = useState(false)
  const [achievementsListExpanded, setAchievementsListExpanded] = useState(false)
  const [achievementsExpanded, setAchievementsExpanded] = useState(false)
  const [quickAddOpen, setQuickAddOpen] = useState(false)
  const [reportsExpanded, setReportsExpanded] = useState(false)
  const [expandedReportId, setExpandedReportId] = useState<string | null>(null)

  // Achievement modal state
  const categories = getMilestoneCategories()
  const [activeCategory, setActiveCategory] = useState(categories[0])
  const [selectedTiers, setSelectedTiers] = useState<Set<MilestoneTier>>(getAllTiers())

  const selectTier = (tier: MilestoneTier) => {
    // Clicking a tier selects only that tier
    setSelectedTiers(new Set<MilestoneTier>([tier]))
  }

  const handleDeleteSession = async (sessionId: string) => {
    if (!confirm("Are you sure you want to delete this session? This cannot be undone.")) {
      return
    }
    setDeletingId(sessionId)
    await deleteSession(sessionId)
    setDeletingId(null)
  }

  const handleDeleteReport = async (reportId: string) => {
    if (!confirm("Are you sure you want to delete this field report? This cannot be undone.")) {
      return
    }
    setDeletingReportId(reportId)
    await deleteFieldReport(reportId)
    setDeletingReportId(null)
  }

  const toggleReportExpand = (reportId: string) => {
    setExpandedReportId(expandedReportId === reportId ? null : reportId)
  }

  if (state.isLoading) {
    // Skeleton loading that matches the dashboard layout
    return (
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header skeleton */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <div className="h-8 w-48 bg-muted rounded animate-pulse" />
            <div className="h-4 w-72 bg-muted rounded animate-pulse mt-2" />
          </div>
          <div className="h-12 w-36 bg-muted rounded animate-pulse" />
        </div>

        {/* Stats grid skeleton */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-muted animate-pulse size-9" />
                <div>
                  <div className="h-7 w-12 bg-muted rounded animate-pulse" />
                  <div className="h-3 w-20 bg-muted rounded animate-pulse mt-1" />
                </div>
              </div>
            </Card>
          ))}
        </div>

        {/* Content grid skeleton */}
        <div className="grid md:grid-cols-2 gap-6">
          {/* Quick Actions skeleton */}
          <Card className="p-6">
            <div className="h-6 w-32 bg-muted rounded animate-pulse mb-4" />
            <div className="space-y-3">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-12 bg-muted rounded-lg animate-pulse" />
              ))}
            </div>
          </Card>

          {/* Achievements skeleton */}
          <Card className="p-6">
            <div className="h-6 w-44 bg-muted rounded animate-pulse mb-4" />
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                  <div className="size-12 rounded-full bg-muted animate-pulse" />
                  <div className="flex-1">
                    <div className="h-4 w-24 bg-muted rounded animate-pulse" />
                    <div className="h-3 w-36 bg-muted rounded animate-pulse mt-1" />
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* Sessions skeleton */}
          <Card className="p-6 md:col-span-2">
            <div className="h-6 w-36 bg-muted rounded animate-pulse mb-4" />
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-20 bg-muted/30 rounded-lg animate-pulse" />
              ))}
            </div>
          </Card>
        </div>
      </div>
    )
  }

  const stats = state.stats

  return (
    <div className="max-w-6xl mx-auto px-4 py-8" data-testid="tracking-dashboard">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">Progress Tracking</h1>
          <p className="text-muted-foreground mt-1">
            Track your approaches, write reports, and watch yourself improve
          </p>
        </div>
        <Link href="/dashboard/tracking/session?autostart=true" data-testid="new-session-link">
          <Button size="lg" className="gap-2">
            <Play className="size-5" />
            Start Session
          </Button>
        </Link>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <Card className="p-4" data-testid="total-approaches">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Target className="size-5 text-primary" />
            </div>
            <div>
              <div className="text-2xl font-bold">{stats?.total_approaches || 0}</div>
              <div className="text-sm text-muted-foreground">Total Approaches</div>
            </div>
          </div>
        </Card>

        <Card className="p-4" data-testid="total-numbers">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-green-500/10">
              <TrendingUp className="size-5 text-green-500" />
            </div>
            <div>
              <div className="text-2xl font-bold">{stats?.total_numbers || 0}</div>
              <div className="text-sm text-muted-foreground">Numbers</div>
            </div>
          </div>
        </Card>

        <Card className="p-4" data-testid="week-streak">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-orange-500/10">
              <Flame className="size-5 text-orange-500" />
            </div>
            <div>
              <div className="text-2xl font-bold">{stats?.current_week_streak || 0}</div>
              <div className="text-sm text-muted-foreground">Week Streak</div>
            </div>
          </div>
        </Card>

        <Card className="p-4" data-testid="total-sessions">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-purple-500/10">
              <Calendar className="size-5 text-purple-500" />
            </div>
            <div>
              <div className="text-2xl font-bold">{stats?.total_sessions || 0}</div>
              <div className="text-sm text-muted-foreground">Sessions</div>
            </div>
          </div>
        </Card>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Quick Actions */}
        <Card className="p-6">
          <h2 className="font-semibold text-lg mb-4">Quick Actions</h2>
          <div className="space-y-3">
            <Link href="/dashboard/tracking/session?autostart=true" className="block">
              <div className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 transition-colors">
                <div className="flex items-center gap-3">
                  <Play className="size-5 text-primary" />
                  <span>Start New Session</span>
                </div>
                <ArrowRight className="size-4 text-muted-foreground" />
              </div>
            </Link>
            <Link href="/dashboard/tracking/report" className="block" data-testid="field-report-link">
              <div className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 transition-colors">
                <div className="flex items-center gap-3">
                  <Clock className="size-5 text-primary" />
                  <span>Write Field Report</span>
                </div>
                <ArrowRight className="size-4 text-muted-foreground" />
              </div>
            </Link>
            <button
              onClick={() => setQuickAddOpen(true)}
              className="w-full"
              data-testid="quick-add-button"
            >
              <div className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 transition-colors">
                <div className="flex items-center gap-3">
                  <PlusCircle className="size-5 text-primary" />
                  <span>Quick Add (Past Session)</span>
                </div>
                <ArrowRight className="size-4 text-muted-foreground" />
              </div>
            </button>
            <Link href="/dashboard/tracking/review" className="block" data-testid="weekly-review-link">
              <div className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 transition-colors">
                <div className="flex items-center gap-3">
                  <Calendar className="size-5 text-primary" />
                  <span>Weekly Review</span>
                </div>
                <ArrowRight className="size-4 text-muted-foreground" />
              </div>
            </Link>
          </div>
        </Card>

        {/* Recent Milestones */}
        <div className="relative">
          <Card className="p-6 h-full">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-lg">Recent Achievements</h2>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setAchievementsExpanded(true)}
                className="gap-1"
              >
                <Trophy className="size-4" />
                View All
              </Button>
            </div>
            {state.milestones.length > 0 ? (
              <div className="space-y-3" data-testid="recent-achievements-list">
                {(achievementsListExpanded ? state.milestones : state.milestones.slice(0, 3)).map((milestone) => {
                  const info = getMilestoneInfo(milestone.milestone_type)
                  return (
                    <div
                      key={milestone.id}
                      className={`flex items-center gap-3 p-3 rounded-lg ${getTierBg(info.tier)}`}
                      data-testid="achievement-item"
                    >
                      {/* Achievement Badge */}
                      <div className={`relative size-12 rounded-full bg-gradient-to-br ${getTierColor(info.tier)} flex items-center justify-center shadow-lg shrink-0`}>
                        <span className="text-xl">{info.emoji}</span>
                        {/* Shine effect */}
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
          {/* Floating expand button for achievements */}
          {state.milestones.length > 3 && (
            <button
              onClick={() => setAchievementsListExpanded(!achievementsListExpanded)}
              className="absolute -bottom-3 left-1/2 -translate-x-1/2 z-10 group flex items-center gap-2 pl-4 pr-3 py-2 rounded-full bg-primary text-primary-foreground shadow-lg hover:bg-primary/90 transition-all hover:scale-105 hover:shadow-xl"
              data-testid="achievements-expand-button"
            >
              <span className="text-sm font-medium">
                {achievementsListExpanded ? "Show less" : `${state.milestones.length - 3} more`}
              </span>
              {achievementsListExpanded ? (
                <ChevronUp className="size-4" />
              ) : (
                <ChevronDown className="size-4" />
              )}
            </button>
          )}
        </div>

        {/* All Achievements Modal */}
        {achievementsExpanded && (
          <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4 pt-safe pb-safe">
            <Card
              className="w-full max-w-4xl max-h-[calc(var(--app-vh)*90)] overflow-hidden flex flex-col"
              role="dialog"
              aria-modal="true"
              aria-labelledby="achievements-title"
            >
              {/* Header with orange-themed close button */}
              <div className="flex items-center justify-between p-5 border-b bg-card">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-primary/20">
                    <Trophy className="size-6 text-primary" />
                  </div>
                  <div>
                    <h2 id="achievements-title" className="text-xl font-bold">All Achievements</h2>
                    <p className="text-sm text-muted-foreground">
                      {state.milestones.length} of {Object.keys(ALL_MILESTONES).length} unlocked
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setAchievementsExpanded(false)}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary/10 hover:bg-primary/20 text-primary font-medium transition-colors"
                >
                  <span>Close</span>
                  <X className="size-4" />
                </button>
              </div>

              {/* Scrollable content with hidden scrollbar */}
              <div className="flex-1 overflow-y-auto scroll-touch [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                {/* Recent Achievements Showcase - with names visible */}
                {state.milestones.length > 0 && (
                  <div className="p-5 border-b bg-gradient-to-b from-primary/5 to-transparent">
                    <div className="flex items-center gap-2 mb-4">
                      <Sparkles className="size-5 text-primary" />
                      <span className="font-semibold">Your Recent Achievements</span>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      {state.milestones.slice(0, 8).map((milestone) => {
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

                {/* Tier Filters - more subtle pill style */}
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
                        m.tier === tier.name && state.milestones.some(em => em.milestone_type === k)
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

                {/* Category Tabs - wrapping instead of scrolling */}
                <div className="p-5">
                  <div className="flex flex-wrap gap-2 pb-4 mb-4 border-b">
                    {categories.map((cat) => {
                      const catMilestones = Object.entries(ALL_MILESTONES).filter(([, m]) => m.category === cat)
                      const earned = catMilestones.filter(([k]) => state.milestones.some(em => em.milestone_type === k)).length
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

                  {/* Grid of achievements - 3 columns on larger screens */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {Object.entries(ALL_MILESTONES)
                      .filter(([, m]) => m.category === activeCategory && selectedTiers.has(m.tier))
                      .map(([key, m]) => {
                        const earned = state.milestones.find(em => em.milestone_type === key)
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
        )}

        {/* Recent Sessions */}
        <div className="md:col-span-2 relative">
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-lg">Recent Sessions</h2>
              <Link
                href="/dashboard/tracking/history"
                className="text-sm text-primary hover:underline"
              >
                View All
              </Link>
            </div>
            {state.recentSessions.length > 0 ? (
              <div className="space-y-3">
                {(sessionsExpanded ? state.recentSessions : state.recentSessions.slice(0, 3)).map((session) => (
                  <div
                    key={session.id}
                    className={`flex items-center justify-between p-4 rounded-lg transition-all ${
                      session.goal_met
                        ? "bg-gradient-to-r from-yellow-500/10 via-amber-500/10 to-yellow-500/10 ring-2 ring-yellow-500/30"
                        : "bg-muted/30"
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      {/* Approach count with goal progress */}
                      <div className="min-w-[4rem] text-center">
                        <div className={`text-3xl font-bold ${session.goal_met ? "text-yellow-500" : "text-primary"}`}>
                          {session.total_approaches}
                        </div>
                        {session.goal !== null && (
                          <div className="text-xs text-muted-foreground">
                            / {session.goal} goal
                          </div>
                        )}
                      </div>
                      <div>
                        <div className="font-medium flex items-center gap-2">
                          {new Date(session.started_at).toLocaleDateString(undefined, {
                            weekday: "short",
                            month: "short",
                            day: "numeric",
                          })}
                          {session.goal_met && (
                            <span className="text-yellow-500" title="Goal achieved!">
                              🏆
                            </span>
                          )}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {session.is_active
                            ? "In progress"
                            : session.duration_minutes
                              ? `${session.duration_minutes} min`
                              : "< 1 min"}
                          {session.primary_location && ` • ${session.primary_location}`}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {session.outcomes.number > 0 && (
                        <Badge variant="secondary" className="bg-green-500/10 text-green-500">
                          {session.outcomes.number} 📱
                        </Badge>
                      )}
                      {session.outcomes.instadate > 0 && (
                        <Badge variant="secondary" className="bg-purple-500/10 text-purple-500">
                          {session.outcomes.instadate} 🎉
                        </Badge>
                      )}
                      {session.goal_met && (
                        <Badge variant="secondary" className="bg-yellow-500/10 text-yellow-500 font-medium">
                          Goal Hit ✓
                        </Badge>
                      )}
                      {session.end_reason === 'abandoned' && (
                        <Badge variant="secondary" className="bg-orange-500/10 text-orange-500">
                          Abandoned
                        </Badge>
                      )}
                      {session.is_active ? (
                        <Link href="/dashboard/tracking/session">
                          <Button variant="outline" size="sm" className="gap-1 text-xs">
                            <Play className="size-3" />
                            Continue
                          </Button>
                        </Link>
                      ) : (
                        <>
                          <Link href={`/dashboard/tracking/session/${session.id}`}>
                            <Button variant="outline" size="sm" className="gap-1 text-xs">
                              <Pencil className="size-3" />
                              Edit
                            </Button>
                          </Link>
                          <Link href={`/dashboard/tracking/report?session=${session.id}`}>
                            <Button variant="outline" size="sm" className="gap-1 text-xs">
                              <FileText className="size-3" />
                              Report
                            </Button>
                          </Link>
                        </>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-8 text-muted-foreground hover:text-destructive"
                        onClick={() => handleDeleteSession(session.id)}
                        disabled={deletingId === session.id}
                      >
                        {deletingId === session.id ? (
                          <Loader2 className="size-4 animate-spin" />
                        ) : (
                          <Trash2 className="size-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Target className="size-12 mx-auto mb-3 opacity-30" />
                <p>No sessions yet</p>
                <p className="text-sm">Start your first session to begin tracking</p>
              </div>
            )}
          </Card>
          {/* Floating expand button */}
          {state.recentSessions.length > 3 && (
            <div className="flex justify-center -mt-5 relative z-10">
              <button
                onClick={() => setSessionsExpanded(!sessionsExpanded)}
                className="group flex items-center gap-2 pl-4 pr-3 py-2 rounded-full bg-primary text-primary-foreground shadow-lg hover:bg-primary/90 transition-all hover:scale-105 hover:shadow-xl"
              >
                <span className="text-sm font-medium">
                  {sessionsExpanded ? "Show less" : `${state.recentSessions.length - 3} more`}
                </span>
                {sessionsExpanded ? (
                  <ChevronUp className="size-4" />
                ) : (
                  <ChevronDown className="size-4" />
                )}
              </button>
            </div>
          )}
        </div>

        {/* Recent Field Reports */}
        <div className="md:col-span-2 relative">
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-lg">Recent Field Reports</h2>
              <Link
                href="/dashboard/tracking/history"
                className="text-sm text-primary hover:underline"
              >
                View All
              </Link>
            </div>
            {state.recentFieldReports.length > 0 ? (
              <div className="space-y-3">
                {(reportsExpanded ? state.recentFieldReports : state.recentFieldReports.slice(0, 3)).map((report) => {
                  const templateInfo = report.system_template_slug
                    ? getSystemTemplateInfo(report.system_template_slug)
                    : null
                  const templateSlug = (report.system_template_slug || "custom") as TemplateSlug
                  const colors = TEMPLATE_COLORS[templateSlug] || TEMPLATE_COLORS.custom
                  const isExpanded = expandedReportId === report.id

                  return (
                    <div
                      key={report.id}
                      className="rounded-lg bg-muted/30 overflow-hidden"
                    >
                      {/* Clickable header */}
                      <div
                        className="flex items-center justify-between p-4 cursor-pointer hover:bg-muted/50 transition-colors"
                        onClick={() => toggleReportExpand(report.id)}
                      >
                        <div className="flex items-center gap-4">
                          {/* Always show approach count - celebrate the effort! */}
                          <div className="min-w-[3.5rem] text-center">
                            <div className={`text-3xl font-bold ${
                              (report.approach_count ?? 0) > 0 ? "text-primary" : "text-muted-foreground/50"
                            }`}>
                              {report.approach_count ?? 0}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              approaches
                            </div>
                          </div>
                          {/* Template icon */}
                          <div className={`p-2 rounded-lg ${colors.icon} shrink-0`}>
                            {TEMPLATE_ICONS[templateSlug] || <FileText className="size-5" />}
                          </div>
                          <div>
                            <div className="font-medium">
                              {report.title || templateInfo?.name || "Field Report"}
                            </div>
                            <div className="text-sm text-muted-foreground flex items-center gap-2">
                              <span>
                                {new Date(report.reported_at).toLocaleDateString(undefined, {
                                  weekday: "short",
                                  month: "short",
                                  day: "numeric",
                                })}
                              </span>
                              {report.location && (
                                <>
                                  <span>•</span>
                                  <span className="flex items-center gap-1">
                                    <MapPin className="size-3" />
                                    {report.location}
                                  </span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {report.is_draft && (
                            <Badge variant="secondary" className="bg-yellow-500/10 text-yellow-600">
                              Draft
                            </Badge>
                          )}
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-xs"
                            onClick={(e) => {
                              e.stopPropagation()
                              toggleReportExpand(report.id)
                            }}
                          >
                            {isExpanded ? "Close" : "View/Edit"}
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-8 text-muted-foreground hover:text-destructive"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleDeleteReport(report.id)
                            }}
                            disabled={deletingReportId === report.id}
                          >
                            {deletingReportId === report.id ? (
                              <Loader2 className="size-4 animate-spin" />
                            ) : (
                              <Trash2 className="size-4" />
                            )}
                          </Button>
                        </div>
                      </div>

                      {/* Expanded content */}
                      {isExpanded && (
                        <div className="border-t border-border/50 p-4 bg-muted/10">
                          <div className="space-y-3">
                            {Object.entries(report.fields).map(([key, value]) => {
                              // Skip empty values
                              if (value === null || value === undefined || value === "") return null
                              if (Array.isArray(value) && value.length === 0) return null

                              // Format the key to be human-readable
                              const label = key
                                .replace(/_/g, " ")
                                .replace(/([A-Z])/g, " $1")
                                .replace(/^./, (str) => str.toUpperCase())
                                .trim()

                              // Format the value based on type
                              let displayValue: React.ReactNode
                              if (Array.isArray(value)) {
                                displayValue = (
                                  <div className="flex flex-wrap gap-1">
                                    {value.map((item, i) => (
                                      <Badge key={i} variant="outline" className="text-xs">
                                        {String(item)}
                                      </Badge>
                                    ))}
                                  </div>
                                )
                              } else if (typeof value === "boolean") {
                                displayValue = value ? "Yes" : "No"
                              } else {
                                displayValue = (
                                  <p className="whitespace-pre-wrap text-sm text-foreground/90">{String(value)}</p>
                                )
                              }

                              return (
                                <div key={key} className="border-b border-border/30 pb-3 last:border-0 last:pb-0">
                                  <dt className="text-xs font-medium text-muted-foreground mb-1">{label}</dt>
                                  <dd>{displayValue}</dd>
                                </div>
                              )
                            })}
                            {Object.keys(report.fields).length === 0 && (
                              <p className="text-sm text-muted-foreground italic">No fields recorded</p>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <FileText className="size-12 mx-auto mb-3 opacity-30" />
                <p>No field reports yet</p>
                <p className="text-sm">Write your first report to reflect on your sessions</p>
              </div>
            )}
          </Card>
          {/* Floating expand button */}
          {state.recentFieldReports.length > 3 && (
            <div className="flex justify-center -mt-5 relative z-10">
              <button
                onClick={() => setReportsExpanded(!reportsExpanded)}
                className="group flex items-center gap-2 pl-4 pr-3 py-2 rounded-full bg-primary text-primary-foreground shadow-lg hover:bg-primary/90 transition-all hover:scale-105 hover:shadow-xl"
                data-testid="reports-expand-button"
              >
                <span className="text-sm font-medium">
                  {reportsExpanded ? "Show less" : `${state.recentFieldReports.length - 3} more`}
                </span>
                {reportsExpanded ? (
                  <ChevronUp className="size-4" />
                ) : (
                  <ChevronDown className="size-4" />
                )}
              </button>
            </div>
          )}
        </div>

        {/* Weekly Review Status */}
        <Card className="p-6 md:col-span-2">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-semibold text-lg">Weekly Reviews</h2>
              <p className="text-sm text-muted-foreground mt-1">
                {stats?.weekly_reviews_completed || 0} completed •{" "}
                {stats?.monthly_review_unlocked
                  ? "Monthly unlocked"
                  : `${4 - (stats?.weekly_reviews_completed || 0)} more to unlock monthly`}
              </p>
            </div>
            <Link href="/dashboard/tracking/review">
              <Button variant="outline">
                Write Review
                <ArrowRight className="size-4 ml-2" />
              </Button>
            </Link>
          </div>

          {/* Progress to unlock */}
          {!stats?.monthly_review_unlocked && (
            <div className="mt-4">
              <div className="flex justify-between text-sm mb-2">
                <span className="text-muted-foreground">Progress to Monthly Review</span>
                <span>{stats?.weekly_reviews_completed || 0} / 4</span>
              </div>
              <div className="h-2 bg-secondary rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary transition-all"
                  style={{
                    width: `${((stats?.weekly_reviews_completed || 0) / 4) * 100}%`,
                  }}
                />
              </div>
            </div>
          )}
        </Card>
      </div>

      {/* Quick Add Modal */}
      <QuickAddModal
        open={quickAddOpen}
        onOpenChange={setQuickAddOpen}
        onSuccess={refresh}
      />
    </div>
  )
}
