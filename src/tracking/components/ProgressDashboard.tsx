"use client"

import { useState, lazy, Suspense } from "react"
import { useTrackingStats } from "../hooks/useTrackingStats"
import { Button } from "@/components/ui/button"
import { Play } from "lucide-react"
import Link from "next/link"
import { QuickAddModal } from "./QuickAddModal"
import {
  DashboardSkeleton,
  QuickStatsGrid,
  QuickActionsCard,
  RecentMilestonesCard,
  RecentSessionsCard,
  RecentFieldReportsCard,
  WeeklyReviewsCard,
} from "./dashboard"

// Lazy load the achievements modal (only needed when opened)
const AchievementsModal = lazy(() =>
  import("./dashboard/AchievementsModal").then(m => ({ default: m.AchievementsModal }))
)

export function ProgressDashboard() {
  const { state, deleteSession, deleteFieldReport, refresh } = useTrackingStats()
  const [achievementsOpen, setAchievementsOpen] = useState(false)
  const [quickAddOpen, setQuickAddOpen] = useState(false)

  if (state.isLoading) {
    return <DashboardSkeleton />
  }

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
      <QuickStatsGrid stats={state.stats} />

      <div className="grid md:grid-cols-2 gap-6">
        {/* Quick Actions */}
        <QuickActionsCard onQuickAddClick={() => setQuickAddOpen(true)} />

        {/* Recent Milestones */}
        <RecentMilestonesCard
          milestones={state.milestones}
          onViewAll={() => setAchievementsOpen(true)}
        />

        {/* All Achievements Modal (lazy loaded) */}
        {achievementsOpen && (
          <Suspense fallback={null}>
            <AchievementsModal
              isOpen={achievementsOpen}
              onClose={() => setAchievementsOpen(false)}
              milestones={state.milestones}
            />
          </Suspense>
        )}

        {/* Recent Sessions */}
        <RecentSessionsCard
          sessions={state.recentSessions}
          onDeleteSession={deleteSession}
        />

        {/* Recent Field Reports */}
        <RecentFieldReportsCard
          reports={state.recentFieldReports}
          onDeleteReport={deleteFieldReport}
        />

        {/* Weekly Reviews */}
        <WeeklyReviewsCard
          stats={state.stats}
          recentReviews={state.recentReviews}
        />
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
