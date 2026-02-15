"use client"

import { Card } from "@/components/ui/card"
import { Footprints, TrendingUp, Flame, Calendar } from "lucide-react"
import type { UserTrackingStatsRow } from "@/src/db/trackingTypes"

interface QuickStatsGridProps {
  stats: UserTrackingStatsRow | null
}

export function QuickStatsGrid({ stats }: QuickStatsGridProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
      <Card className="p-4" data-testid="total-approaches">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <Footprints className="size-5 text-primary" />
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
  )
}
