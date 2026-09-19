"use client"

import { Card } from "@/components/ui/card"
import { Play, Clock, PlusCircle, Calendar, Sun, ArrowRight } from "lucide-react"
import Link from "next/link"

interface QuickActionsCardProps {
  onQuickAddClick: () => void
}

export function QuickActionsCard({ onQuickAddClick }: QuickActionsCardProps) {
  return (
    <Card className="p-4 sm:p-6">
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
          onClick={onQuickAddClick}
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
        {/* THE TRAINING ROW IS GONE, and this is where it was.
            It was added when nothing in the app linked to /programs, so the
            only way in was typing the address. Two things link there now: the
            tab bar, and the training card at the top of this very page — which
            says what today's session actually is rather than just pointing.
            A third door, 2,800 px below the first, is not a door. */}
        <Link href="/dashboard/tracking/daily" className="block" data-testid="daily-reflection-link">
          <div className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 transition-colors">
            <div className="flex items-center gap-3">
              <Sun className="size-5 text-amber-500" />
              <span>Daily Reflection</span>
            </div>
            <ArrowRight className="size-4 text-muted-foreground" />
          </div>
        </Link>
      </div>
    </Card>
  )
}
