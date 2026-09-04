"use client"

import { useState, useEffect, lazy, Suspense } from "react"
import { useTrackingStats } from "../hooks/useTrackingStats"
import { Button } from "@/components/ui/button"
import { Play } from "lucide-react"
import { MobileTabBar } from "@/components/MobileTabBar"
import Link from "next/link"
import { QuickAddModal } from "./QuickAddModal"
import { SeasonBand } from "@/src/goals/components/north-star/SeasonBand"
import type { DashboardLayoutResponse } from "../types"
import {
  DashboardSkeleton,
  StatTileGrid,
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

/**
 * TODAY'S PRESCRIBED SESSION, ON THE PAGE OPENED DAILY.
 *
 * A training program that only tells you what to do once you have navigated to
 * it is a program you follow on the days you remember to go looking. The panel
 * RENDERS NOTHING without an active enrollment, so it costs a person with no
 * program a single request and no screen space.
 *
 * The same component the goals page embeds — not a second copy — so the session
 * shown here and the session shown there cannot drift apart.
 */
const ActiveProgramsPanel = lazy(() =>
  import("@/src/programs/components/ActiveProgramsPanel").then(m => ({ default: m.ActiveProgramsPanel }))
)

export function ProgressDashboard({ initialDashboard }: { initialDashboard?: DashboardLayoutResponse }) {
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

      {/* THE ONE THING AND THIS SEASON, above everything.
          The two decisions the plan hangs off, on the page opened daily. It
          reads the Life Mastery plan out of localStorage and adds nothing to
          the load: no fetch, and it renders nothing until the plan is read. */}
      <SeasonBand />

      {/* Stat tiles — user-configurable; see StatTileGrid */}
      <StatTileGrid initial={initialDashboard} />

      {state.isLoading ? (
        <DashboardSkeleton cardsOnly />
      ) : (
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

        {/* TODAY'S TRAINING SESSION, low on the page on purpose.
            It was above Quick Actions, where a five-lift day pushed everything
            else below the fold — a card you open the page for once a day should
            not outrank the things you open it for every time. Renders nothing
            without an active program. */}
        <div className="md:col-span-2">
          <Suspense fallback={null}>
            <ActiveProgramsPanel />
          </Suspense>
        </div>

        {/* Weekly Reviews */}
        <div className="md:col-span-2">
          <WeeklyReviewsCard
            stats={state.stats}
            recentReviews={state.recentReviews}
          />
        </div>
      </div>
      )}

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
