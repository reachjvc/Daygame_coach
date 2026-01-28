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
} from "lucide-react"
import Link from "next/link"
import { QuickAddModal } from "./QuickAddModal"

export function ProgressDashboard() {
  const { state, deleteSession, refresh } = useTrackingStats()
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [sessionsExpanded, setSessionsExpanded] = useState(false)
  const [achievementsExpanded, setAchievementsExpanded] = useState(false)
  const [quickAddOpen, setQuickAddOpen] = useState(false)

  // Achievement modal state
  const categories = [...new Set(Object.values(ALL_MILESTONES).map(m => m.category))]
  const [activeCategory, setActiveCategory] = useState(categories[0])
  const [selectedTiers, setSelectedTiers] = useState<Set<MilestoneInfo['tier']>>(
    new Set<MilestoneInfo['tier']>(['bronze', 'silver', 'gold', 'platinum', 'diamond'])
  )

  const selectTier = (tier: MilestoneInfo['tier']) => {
    // Clicking a tier selects only that tier
    setSelectedTiers(new Set<MilestoneInfo['tier']>([tier]))
  }

  const handleDeleteSession = async (sessionId: string) => {
    if (!confirm("Are you sure you want to delete this session? This cannot be undone.")) {
      return
    }
    setDeletingId(sessionId)
    await deleteSession(sessionId)
    setDeletingId(null)
  }

  if (state.isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="size-8 animate-spin text-primary" />
      </div>
    )
  }

  const stats = state.stats

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">Progress Tracking</h1>
          <p className="text-muted-foreground mt-1">
            Track your approaches, write reports, and watch yourself improve
          </p>
        </div>
        <Link href="/dashboard/tracking/session">
          <Button size="lg" className="gap-2">
            <Play className="size-5" />
            Start Session
          </Button>
        </Link>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <Card className="p-4">
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

        <Card className="p-4">
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

        <Card className="p-4">
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

        <Card className="p-4">
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
            <Link href="/dashboard/tracking/session" className="block">
              <div className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 transition-colors">
                <div className="flex items-center gap-3">
                  <Play className="size-5 text-primary" />
                  <span>Start New Session</span>
                </div>
                <ArrowRight className="size-4 text-muted-foreground" />
              </div>
            </Link>
            <Link href="/dashboard/tracking/report" className="block">
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
            >
              <div className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 transition-colors">
                <div className="flex items-center gap-3">
                  <PlusCircle className="size-5 text-primary" />
                  <span>Quick Add (Past Session)</span>
                </div>
                <ArrowRight className="size-4 text-muted-foreground" />
              </div>
            </button>
            <Link href="/dashboard/tracking/review" className="block">
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
        <Card className="p-6">
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
            <div className="space-y-3">
              {state.milestones.slice(0, 5).map((milestone) => {
                const info = getMilestoneInfo(milestone.milestone_type)
                return (
                  <div
                    key={milestone.id}
                    className={`flex items-center gap-3 p-3 rounded-lg ${getTierBg(info.tier)}`}
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

        {/* All Achievements Modal */}
        {achievementsExpanded && (
          <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
            <Card className="w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
              {/* Header with orange-themed close button */}
              <div className="flex items-center justify-between p-5 border-b bg-card">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-primary/20">
                    <Trophy className="size-6 text-primary" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold">All Achievements</h2>
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
              <div className="flex-1 overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
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
                    className="flex items-center justify-between p-4 rounded-lg bg-muted/30"
                  >
                    <div className="flex items-center gap-4">
                      <div className="text-3xl font-bold text-primary">
                        {session.total_approaches}
                      </div>
                      <div>
                        <div className="font-medium">
                          {new Date(session.started_at).toLocaleDateString(undefined, {
                            weekday: "short",
                            month: "short",
                            day: "numeric",
                          })}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {session.duration_minutes
                            ? `${session.duration_minutes} min`
                            : "In progress"}
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
                        <Badge variant="secondary" className="bg-yellow-500/10 text-yellow-500">
                          Goal Hit ✓
                        </Badge>
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

// Achievement badge styling
interface MilestoneInfo {
  label: string
  emoji: string
  tier: 'bronze' | 'silver' | 'gold' | 'platinum' | 'diamond'
  description: string
  category: string
}

// Tier information for filters
const TIER_INFO: Array<{ name: MilestoneInfo['tier']; label: string; icon: string }> = [
  { name: 'bronze', label: 'Bronze', icon: '🥉' },
  { name: 'silver', label: 'Silver', icon: '🥈' },
  { name: 'gold', label: 'Gold', icon: '🥇' },
  { name: 'platinum', label: 'Platinum', icon: '💎' },
  { name: 'diamond', label: 'Diamond', icon: '👑' },
]

// All milestones with descriptions - used for both earned and locked display
const ALL_MILESTONES: Record<string, MilestoneInfo> = {
  // Volume - Approaches
  first_approach: { label: "First Steps", emoji: "👣", tier: "bronze", category: "Approaches", description: "Complete your first approach" },
  "5_approaches": { label: "Getting Started", emoji: "🌱", tier: "bronze", category: "Approaches", description: "Complete 5 approaches" },
  "10_approaches": { label: "Double Digits", emoji: "🔟", tier: "bronze", category: "Approaches", description: "Complete 10 approaches" },
  "25_approaches": { label: "Quarter Century", emoji: "⭐", tier: "silver", category: "Approaches", description: "Complete 25 approaches" },
  "50_approaches": { label: "Half Century", emoji: "🌟", tier: "silver", category: "Approaches", description: "Complete 50 approaches" },
  "100_approaches": { label: "Centurion", emoji: "💯", tier: "gold", category: "Approaches", description: "Complete 100 approaches" },
  "250_approaches": { label: "Veteran", emoji: "🎖️", tier: "gold", category: "Approaches", description: "Complete 250 approaches" },
  "500_approaches": { label: "Elite", emoji: "💎", tier: "platinum", category: "Approaches", description: "Complete 500 approaches" },
  "1000_approaches": { label: "Legend", emoji: "🏆", tier: "diamond", category: "Approaches", description: "Complete 1,000 approaches" },
  // Volume - Numbers
  first_number: { label: "First Digits", emoji: "📱", tier: "bronze", category: "Numbers", description: "Get your first number" },
  "2_numbers": { label: "Doubling Up", emoji: "✌️", tier: "bronze", category: "Numbers", description: "Get 2 numbers" },
  "5_numbers": { label: "High Five", emoji: "🖐️", tier: "silver", category: "Numbers", description: "Get 5 numbers" },
  "10_numbers": { label: "Perfect 10", emoji: "🔥", tier: "silver", category: "Numbers", description: "Get 10 numbers" },
  "25_numbers": { label: "Contact King", emoji: "👑", tier: "gold", category: "Numbers", description: "Get 25 numbers" },
  "50_numbers": { label: "Phonebook", emoji: "📖", tier: "platinum", category: "Numbers", description: "Get 50 numbers" },
  "100_numbers": { label: "Social Butterfly", emoji: "🦋", tier: "diamond", category: "Numbers", description: "Get 100 numbers" },
  // Volume - Instadates
  first_instadate: { label: "First Date!", emoji: "☕", tier: "silver", category: "Instadates", description: "Go on your first instadate" },
  "2_instadates": { label: "Date Night", emoji: "🌙", tier: "silver", category: "Instadates", description: "Go on 2 instadates" },
  "5_instadates": { label: "Smooth Operator", emoji: "😎", tier: "gold", category: "Instadates", description: "Go on 5 instadates" },
  "10_instadates": { label: "Mr. Spontaneous", emoji: "⚡", tier: "platinum", category: "Instadates", description: "Go on 10 instadates" },
  "25_instadates": { label: "Date Master", emoji: "🎩", tier: "diamond", category: "Instadates", description: "Go on 25 instadates" },
  // Sessions
  first_session: { label: "First Session", emoji: "🚀", tier: "bronze", category: "Sessions", description: "Complete your first session" },
  "3_sessions": { label: "Hat Trick", emoji: "🎩", tier: "bronze", category: "Sessions", description: "Complete 3 sessions" },
  "5_sessions": { label: "Regular", emoji: "📅", tier: "silver", category: "Sessions", description: "Complete 5 sessions" },
  "10_sessions": { label: "Dedicated", emoji: "💪", tier: "silver", category: "Sessions", description: "Complete 10 sessions" },
  "25_sessions": { label: "Committed", emoji: "🔒", tier: "gold", category: "Sessions", description: "Complete 25 sessions" },
  "50_sessions": { label: "Iron Will", emoji: "⚔️", tier: "platinum", category: "Sessions", description: "Complete 50 sessions" },
  "100_sessions": { label: "Unstoppable", emoji: "🦾", tier: "diamond", category: "Sessions", description: "Complete 100 sessions" },
  first_5_approach_session: { label: "Warming Up", emoji: "🔥", tier: "bronze", category: "Sessions", description: "Do 5+ approaches in one session" },
  first_10_approach_session: { label: "On Fire", emoji: "🔥", tier: "silver", category: "Sessions", description: "Do 10+ approaches in one session" },
  first_goal_hit: { label: "Goal Crusher", emoji: "🎯", tier: "bronze", category: "Sessions", description: "Hit your session goal" },
  // Weekly Streaks
  "2_week_streak": { label: "Getting Momentum", emoji: "🌊", tier: "bronze", category: "Streaks", description: "2 active weeks in a row" },
  "4_week_streak": { label: "Month Strong", emoji: "📅", tier: "silver", category: "Streaks", description: "4 active weeks in a row" },
  "8_week_streak": { label: "Two Months!", emoji: "💪", tier: "gold", category: "Streaks", description: "8 active weeks in a row" },
  "12_week_streak": { label: "Quarter Year", emoji: "🔥", tier: "gold", category: "Streaks", description: "12 active weeks in a row" },
  "26_week_streak": { label: "Half Year Hero", emoji: "🦸", tier: "platinum", category: "Streaks", description: "26 active weeks in a row" },
  "52_week_streak": { label: "Year Champion", emoji: "👑", tier: "diamond", category: "Streaks", description: "52 active weeks in a row" },
  // Reports & Reviews
  first_field_report: { label: "Field Scholar", emoji: "📝", tier: "bronze", category: "Reports", description: "Write your first field report" },
  "5_field_reports": { label: "Reporter", emoji: "📰", tier: "silver", category: "Reports", description: "Write 5 field reports" },
  "10_field_reports": { label: "Analyst", emoji: "📊", tier: "silver", category: "Reports", description: "Write 10 field reports" },
  "25_field_reports": { label: "Chronicler", emoji: "📚", tier: "gold", category: "Reports", description: "Write 25 field reports" },
  "50_field_reports": { label: "Historian", emoji: "🏛️", tier: "platinum", category: "Reports", description: "Write 50 field reports" },
  first_weekly_review: { label: "Self-Aware", emoji: "🪞", tier: "bronze", category: "Reports", description: "Complete your first weekly review" },
  monthly_unlocked: { label: "Monthly Unlocked", emoji: "🔓", tier: "silver", category: "Reports", description: "Complete 4 weekly reviews" },
  quarterly_unlocked: { label: "Quarterly Unlocked", emoji: "🗝️", tier: "gold", category: "Reports", description: "Complete 3 monthly reviews" },
  // Fun/Variety
  night_owl: { label: "Night Owl", emoji: "🦉", tier: "bronze", category: "Special", description: "Start a session after 9pm" },
  early_bird: { label: "Early Bird", emoji: "🐦", tier: "bronze", category: "Special", description: "Start a session before 10am" },
  globetrotter: { label: "Globetrotter", emoji: "🌍", tier: "gold", category: "Special", description: "Approach in 5 different locations" },
  consistent: { label: "Consistent", emoji: "📈", tier: "silver", category: "Special", description: "Approach every day for a week" },
  marathon: { label: "Marathon Man", emoji: "🏃", tier: "gold", category: "Special", description: "Complete a 2+ hour session" },
  weekend_warrior: { label: "Weekend Warrior", emoji: "⚔️", tier: "bronze", category: "Special", description: "Complete a session on the weekend" },
  // Comeback & Resilience
  comeback_kid: { label: "Comeback Kid", emoji: "🔄", tier: "silver", category: "Special", description: "Return after 2+ weeks away" },
  rejection_proof: { label: "Rejection Proof", emoji: "🛡️", tier: "gold", category: "Special", description: "Log 10 approaches with no numbers in one session" },
  never_give_up: { label: "Never Give Up", emoji: "💪", tier: "platinum", category: "Special", description: "Complete a session after 5 consecutive rejections" },
  // Time-based achievements
  lunch_break_legend: { label: "Lunch Break Legend", emoji: "🥪", tier: "silver", category: "Special", description: "Complete 3+ approaches between 12-1pm" },
  rush_hour_hero: { label: "Rush Hour Hero", emoji: "🚇", tier: "silver", category: "Special", description: "Complete 5+ approaches during rush hour (5-7pm)" },
  sunday_funday: { label: "Sunday Funday", emoji: "☀️", tier: "bronze", category: "Special", description: "Complete a session on Sunday" },
  new_years_resolution: { label: "New Year's Resolution", emoji: "🎆", tier: "gold", category: "Special", description: "Complete a session in the first week of January" },
  valentines_warrior: { label: "Valentine's Warrior", emoji: "💘", tier: "gold", category: "Special", description: "Complete a session on Valentine's Day" },
  // Efficiency achievements
  sniper: { label: "Sniper", emoji: "🎯", tier: "gold", category: "Special", description: "Get a number on your first approach of the day" },
  hot_streak: { label: "Hot Streak", emoji: "🔥", tier: "platinum", category: "Special", description: "Get 3 numbers in a single session" },
  perfect_session: { label: "Perfect Session", emoji: "✨", tier: "diamond", category: "Special", description: "Get 5+ numbers in a single session" },
  instant_connection: { label: "Instant Connection", emoji: "⚡", tier: "gold", category: "Special", description: "Get an instadate on your first approach" },
  double_date: { label: "Double Date", emoji: "👯", tier: "platinum", category: "Special", description: "Get 2 instadates in one session" },
  // Location variety
  coffee_connoisseur: { label: "Coffee Connoisseur", emoji: "☕", tier: "silver", category: "Special", description: "Get a number in a coffee shop" },
  bookworm: { label: "Bookworm", emoji: "📚", tier: "silver", category: "Special", description: "Get a number in a bookstore" },
  street_smart: { label: "Street Smart", emoji: "🛣️", tier: "bronze", category: "Special", description: "Complete 10 street approaches" },
  mall_rat: { label: "Mall Rat", emoji: "🛍️", tier: "bronze", category: "Special", description: "Complete 10 mall approaches" },
  park_ranger: { label: "Park Ranger", emoji: "🌳", tier: "bronze", category: "Special", description: "Complete 10 park approaches" },
  // Mindset & Growth
  first_rejection: { label: "Baptism by Fire", emoji: "🔥", tier: "bronze", category: "Mindset", description: "Log your first rejection - you're in the arena!" },
  "10_rejections": { label: "Thick Skin", emoji: "🦏", tier: "silver", category: "Mindset", description: "Handle 10 rejections with grace" },
  "50_rejections": { label: "Bulletproof", emoji: "🛡️", tier: "gold", category: "Mindset", description: "Handle 50 rejections - nothing stops you" },
  "100_rejections": { label: "Rejection Master", emoji: "👊", tier: "platinum", category: "Mindset", description: "Handle 100 rejections - true mastery" },
  first_blowout: { label: "Battle Scars", emoji: "⚔️", tier: "bronze", category: "Mindset", description: "Experience your first harsh rejection" },
  approach_anxiety_conquered: { label: "Fear Slayer", emoji: "🐉", tier: "silver", category: "Mindset", description: "Complete 3 approaches in under 10 minutes" },
  zone_state: { label: "In The Zone", emoji: "🧘", tier: "gold", category: "Mindset", description: "Complete 5 approaches in 15 minutes" },
  flow_state: { label: "Flow State", emoji: "🌊", tier: "platinum", category: "Mindset", description: "Complete 10 approaches in 30 minutes" },
  // Social (tracked via session wingman fields)
  wing_commander: { label: "Wing Commander", emoji: "🦅", tier: "silver", category: "Social", description: "Complete a session with a wingman" },
  "10_wingman_sessions": { label: "Dynamic Duo", emoji: "🤝", tier: "gold", category: "Social", description: "Complete 10 wingman sessions" },
  "25_wingman_sessions": { label: "Brotherhood", emoji: "👊", tier: "platinum", category: "Social", description: "Complete 25 wingman sessions" },
  first_double_set: { label: "Double Team", emoji: "👯", tier: "gold", category: "Social", description: "Successfully approach a 2-set with your wing" },
  "10_double_sets": { label: "Teamwork", emoji: "🏆", tier: "platinum", category: "Social", description: "Complete 10 double sets with your wing" },
  // Unique Set Types (tracked via approach set_type field)
  first_two_set: { label: "Pair Opener", emoji: "👭", tier: "bronze", category: "Unique Sets", description: "Approach your first 2-set" },
  first_group: { label: "Group Master", emoji: "👥", tier: "silver", category: "Unique Sets", description: "Approach a group of 3+" },
  first_mixed_group: { label: "Social Infiltrator", emoji: "🎭", tier: "gold", category: "Unique Sets", description: "Approach a mixed group (guys + girls)" },
  first_mom_daughter: { label: "Family Affair", emoji: "👩‍👧", tier: "gold", category: "Unique Sets", description: "Approach a mother-daughter pair" },
  first_sisters: { label: "Double Trouble", emoji: "👯‍♀️", tier: "gold", category: "Unique Sets", description: "Approach a set of sisters" },
  first_tourist: { label: "Tour Guide", emoji: "🗺️", tier: "bronze", category: "Unique Sets", description: "Approach your first tourist" },
  tourist_guide: { label: "World Welcome", emoji: "🌎", tier: "silver", category: "Unique Sets", description: "Approach 10 tourists" },
  world_traveler: { label: "Global Ambassador", emoji: "🌍", tier: "gold", category: "Unique Sets", description: "Approach 25 tourists" },
  first_moving_set: { label: "Catch Me", emoji: "🏃‍♀️", tier: "silver", category: "Unique Sets", description: "Stop and approach someone walking" },
  first_seated: { label: "Sit Down", emoji: "🪑", tier: "bronze", category: "Unique Sets", description: "Approach your first seated set" },
  "10_seated": { label: "Table Service", emoji: "☕", tier: "silver", category: "Unique Sets", description: "Approach 10 seated sets" },
  seated_master: { label: "Seated Master", emoji: "🛋️", tier: "gold", category: "Unique Sets", description: "Approach 25 seated sets" },
  first_foreign: { label: "Lost in Translation", emoji: "🗣️", tier: "silver", category: "Unique Sets", description: "Approach someone speaking a different language" },
  polyglot: { label: "Polyglot", emoji: "🌐", tier: "gold", category: "Unique Sets", description: "Approach girls speaking 5 different languages" },
  first_celebrity: { label: "Star Struck", emoji: "⭐", tier: "gold", category: "Unique Sets", description: "Approach someone with model/celebrity vibes" },
  // Big milestones
  "2000_approaches": { label: "Approach God", emoji: "⚡", tier: "diamond", category: "Approaches", description: "Complete 2,000 approaches" },
  "5000_approaches": { label: "Living Legend", emoji: "🌟", tier: "diamond", category: "Approaches", description: "Complete 5,000 approaches" },
  "200_numbers": { label: "Number Ninja", emoji: "🥷", tier: "diamond", category: "Numbers", description: "Get 200 numbers" },
  "50_instadates": { label: "Instadate King", emoji: "👑", tier: "diamond", category: "Instadates", description: "Go on 50 instadates" },
  // Legacy
  "7_day_streak": { label: "Week Warrior", emoji: "📆", tier: "bronze", category: "Streaks", description: "7 consecutive days approaching" },
  "30_day_streak": { label: "Month Master", emoji: "🗓️", tier: "silver", category: "Streaks", description: "30 consecutive days approaching" },
  "100_day_streak": { label: "Century Streak", emoji: "💯", tier: "gold", category: "Streaks", description: "100 consecutive days approaching" },
}

function getMilestoneInfo(type: string): MilestoneInfo {
  return ALL_MILESTONES[type] || { label: type, emoji: "🏅", tier: "bronze", category: "Other", description: "Achievement unlocked" }
}

function getTierColor(tier: MilestoneInfo['tier']): string {
  switch (tier) {
    case 'bronze': return 'from-amber-600 to-amber-800'
    case 'silver': return 'from-slate-300 to-slate-500'
    case 'gold': return 'from-yellow-400 to-yellow-600'
    case 'platinum': return 'from-cyan-300 to-cyan-500'
    case 'diamond': return 'from-violet-400 to-fuchsia-500'
  }
}

function getTierBg(tier: MilestoneInfo['tier']): string {
  switch (tier) {
    case 'bronze': return 'bg-amber-500/10'
    case 'silver': return 'bg-slate-400/10'
    case 'gold': return 'bg-yellow-500/10'
    case 'platinum': return 'bg-cyan-400/10'
    case 'diamond': return 'bg-violet-500/10'
  }
}


