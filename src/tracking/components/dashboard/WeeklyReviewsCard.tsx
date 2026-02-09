"use client"

import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Calendar, ArrowRight } from "lucide-react"
import Link from "next/link"
import type { UserTrackingStatsRow, ReviewRow } from "@/src/db/trackingTypes"

interface WeeklyReviewsCardProps {
  stats: UserTrackingStatsRow | null
  recentReviews: ReviewRow[]
}

export function WeeklyReviewsCard({ stats, recentReviews }: WeeklyReviewsCardProps) {
  return (
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

      {/* Recent Reviews List */}
      {recentReviews.length > 0 && (
        <div className="space-y-3 mt-4">
          {recentReviews.slice(0, 3).map((review) => (
            <div
              key={review.id}
              className="flex items-center justify-between p-4 rounded-lg bg-muted/30"
            >
              <div className="flex items-center gap-4">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Calendar className="size-5 text-primary" />
                </div>
                <div>
                  <div className="font-medium capitalize">
                    {review.review_type} Review
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {new Date(review.period_start).toLocaleDateString(undefined, {
                      month: "short",
                      day: "numeric",
                    })} - {new Date(review.period_end).toLocaleDateString(undefined, {
                      month: "short",
                      day: "numeric",
                    })}
                    {review.is_draft && " • Draft"}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {review.commitment_fulfilled !== null && (
                  <Badge
                    variant="secondary"
                    className={review.commitment_fulfilled
                      ? "bg-green-500/10 text-green-500"
                      : "bg-orange-500/10 text-orange-500"
                    }
                  >
                    {review.commitment_fulfilled ? "Commitment Met" : "Commitment Missed"}
                  </Badge>
                )}
                {review.is_draft && (
                  <Badge variant="secondary" className="bg-yellow-500/10 text-yellow-600">
                    Draft
                  </Badge>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Commitment reminder */}
      {recentReviews.length > 0 && recentReviews[0].new_commitment && (
        <div className="mt-4 p-4 rounded-lg bg-primary/5 border border-primary/20">
          <div className="text-sm font-medium text-primary mb-1">Your Current Commitment</div>
          <p className="text-sm text-muted-foreground italic">
            &quot;{recentReviews[0].new_commitment}&quot;
          </p>
        </div>
      )}
    </Card>
  )
}
