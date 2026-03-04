"use client"

import { useState, useEffect } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Sun, ArrowRight, Check } from "lucide-react"
import Link from "next/link"

interface DailyReviewStatus {
  today: { id: string; is_draft: boolean; fields: Record<string, unknown> } | null
  yesterday: { fields: Record<string, unknown> } | null
}

export function DailyReviewCard() {
  const [status, setStatus] = useState<DailyReviewStatus | null>(null)

  useEffect(() => {
    fetch("/api/tracking/review/daily")
      .then(async (res) => {
        if (res.ok) setStatus(await res.json())
      })
      .catch(() => {})
  }, [])

  const todayDone = status?.today && !status.today.is_draft
  const todayDraft = status?.today?.is_draft
  const yesterdayTomorrow = status?.yesterday?.fields?.carry_tomorrow as string | undefined

  return (
    <Card className="p-4 sm:p-6" data-testid="daily-review-card">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-amber-500/10">
            <Sun className="size-5 text-amber-500" />
          </div>
          <div>
            <h2 className="font-semibold">Daily Reflection</h2>
            <p className="text-sm text-muted-foreground">
              {todayDone
                ? "Done for today"
                : todayDraft
                  ? "Draft in progress"
                  : "Not yet today"}
            </p>
          </div>
        </div>
        {todayDone ? (
          <div className="p-2 rounded-full bg-green-500/10">
            <Check className="size-4 text-green-500" />
          </div>
        ) : (
          <Link href="/dashboard/tracking/daily">
            <Button variant="outline" size="sm" className="gap-1">
              {todayDraft ? "Continue" : "Reflect on Today"}
              <ArrowRight className="size-3" />
            </Button>
          </Link>
        )}
      </div>

      {/* Yesterday's "one thing for tomorrow" as gentle reminder */}
      {yesterdayTomorrow && !todayDone && (
        <div className="p-3 rounded-lg bg-muted/30 text-sm">
          <span className="text-muted-foreground">Yesterday you planned: </span>
          <span className="italic">&quot;{yesterdayTomorrow}&quot;</span>
        </div>
      )}
    </Card>
  )
}
