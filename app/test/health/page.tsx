"use client"

import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { WeightTracker } from "@/src/health/components/WeightTracker"
import { SleepTracker } from "@/src/health/components/SleepTracker"
import { WorkoutLogger } from "@/src/health/components/WorkoutLogger"
import { NutritionTracker } from "@/src/health/components/NutritionTracker"
import { CorrelationPanel } from "@/src/health/components/CorrelationPanel"

export default function HealthTestPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-4xl px-4 py-8">
        <Button asChild variant="ghost" size="sm" className="mb-4">
          <Link href="/test">
            <ArrowLeft className="size-4 mr-2" />
            Back to Test Pages
          </Link>
        </Button>

        <h1 className="text-2xl font-bold mb-6">Health & Appearance Trackers</h1>

        <div className="grid gap-6 md:grid-cols-2">
          <WeightTracker />
          <SleepTracker />
          <WorkoutLogger />
          <NutritionTracker />
        </div>

        <div className="mt-6">
          <CorrelationPanel />
        </div>
      </div>
    </div>
  )
}
