"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ArrowRight } from "lucide-react"
import { GoalIcon } from "@/components/ui/GoalIcon"
import Link from "next/link"

interface GoalsTabProps {
  isPreviewMode?: boolean
}

export function GoalsTab({ isPreviewMode = false }: GoalsTabProps) {
  if (isPreviewMode) {
    return (
      <Card className="border-dashed">
        <CardContent className="py-12 text-center">
          <GoalIcon className="mx-auto h-12 w-12 text-muted-foreground/50 mb-4" />
          <h3 className="font-semibold text-lg mb-2">Strategic Goal Setting</h3>
          <p className="text-muted-foreground max-w-md mx-auto">
            Define what you want to achieve. Your goals here connect to your daily
            tracking in the Lair for seamless progress monitoring.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="border-primary/20 bg-gradient-to-br from-primary/5 via-card to-card">
      <CardContent className="py-12 text-center">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-primary/10 flex items-center justify-center">
          <GoalIcon className="h-8 w-8 text-primary" />
        </div>
        <h3 className="font-semibold text-xl mb-2">Goals have moved to their own page!</h3>
        <p className="text-muted-foreground max-w-md mx-auto mb-6">
          Set goals across all life areas, track progress with hierarchy views,
          and auto-sync with your daygame sessions.
        </p>
        <Button asChild size="lg" className="gap-2">
          <Link href="/dashboard/goals">
            Go to Goals Hub
            <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
      </CardContent>
    </Card>
  )
}
