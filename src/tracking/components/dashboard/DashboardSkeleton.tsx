"use client"

import { Card } from "@/components/ui/card"

export function DashboardSkeleton() {
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
