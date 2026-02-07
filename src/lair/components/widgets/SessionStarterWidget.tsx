"use client"

import Link from "next/link"
import { Play, Clock } from "lucide-react"
import { Button } from "@/components/ui/button"
import type { WidgetProps } from "../../types"

export function SessionStarterWidget({ collapsed }: WidgetProps) {
  if (collapsed) return null

  return (
    <div className="flex flex-col items-center gap-4 py-2">
      <Button asChild size="lg" className="w-full gap-2">
        <Link href="/dashboard/tracking/session">
          <Play className="h-5 w-5" />
          Start Session
        </Link>
      </Button>
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Clock className="h-3 w-3" />
        <span>Track your approaches in real-time</span>
      </div>
    </div>
  )
}
