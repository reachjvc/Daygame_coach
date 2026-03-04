"use client"

import { useState, useEffect, lazy, Suspense } from "react"
import { useTrackingStats } from "../hooks/useTrackingStats"
import { Button } from "@/components/ui/button"
import { Play } from "lucide-react"
import { MobileTabBar } from "@/components/MobileTabBar"
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
  DailyReviewCard,
} from "./dashboard"

// Lazy load the achievements modal (only needed when opened)
const AchievementsModal = lazy(() =>
  import("./dashboard/AchievementsModal").then(m => ({ default: m.AchievementsModal }))
)

export function ProgressDashboard() {
  const { state, deleteSession, deleteFieldReport, refresh } = useTrackingStats()
  const [achievementsOpen, setAchievementsOpen] = useState(false)
  const [quickAddOpen, setQuickAddOpen] = useState(false)

  useEffect(() => {
    if (!state.isLoading && window.location.hash === "#recent-reports") {
      const el = document.getElementById("recent-reports")
      if (el) {
        el.scrollIntoView({ behavior: "smooth" })
        history.replaceState(null, "", window.location.pathname)
      }
    }
  }, [state.isLoading])

  if (state.isLoading) {
    return <DashboardSkeleton />
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 pb-tab-bar" data-testid="tracking-dashboard">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">Progress Tracking</h1>
          <p className="text-muted-foreground mt-1">
            Track your approaches, write reports, and watch yourself improve
          </p>
        </div>
        <Link href="/dashboard/tracking/session?autostart=true" className="shrink-0" data-testid="new-session-link">
          <Button size="lg" className="gap-2 w-full sm:w-auto">
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
        <div className="md:col-span-2">
          <RecentSessionsCard
            sessions={state.recentSessions}
            onDeleteSession={deleteSession}
          />
        </div>

        {/* Recent Field Reports */}
        <div className="md:col-span-2">
          <RecentFieldReportsCard
            reports={state.recentFieldReports}
            onDeleteReport={deleteFieldReport}
          />
        </div>

        {/* Daily Reflection */}
        <div className="md:col-span-2">
          <DailyReviewCard />
        </div>

        {/* Weekly Reviews */}
        <div className="md:col-span-2">
          <WeeklyReviewsCard
            stats={state.stats}
            recentReviews={state.recentReviews}
          />
        </div>
      </div>

      {/* Quick Add Modal */}
      <QuickAddModal
        open={quickAddOpen}
        onOpenChange={setQuickAddOpen}
        onSuccess={refresh}
      />

      <MobileTabBar />
    </div>
  )
}
