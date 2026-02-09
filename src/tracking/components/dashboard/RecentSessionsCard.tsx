"use client"

import { useState } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Loader2,
  Play,
  Target,
  Trash2,
  ChevronDown,
  ChevronUp,
  FileText,
  Pencil,
} from "lucide-react"
import Link from "next/link"
import type { SessionSummary } from "@/src/db/trackingTypes"
import { SessionAchievementStack } from "../SessionAchievementStack"

interface RecentSessionsCardProps {
  sessions: SessionSummary[]
  onDeleteSession: (sessionId: string) => Promise<boolean>
}

export function RecentSessionsCard({ sessions, onDeleteSession }: RecentSessionsCardProps) {
  const [expanded, setExpanded] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const handleDelete = async (sessionId: string) => {
    if (!confirm("Are you sure you want to delete this session? This cannot be undone.")) {
      return
    }
    setDeletingId(sessionId)
    await onDeleteSession(sessionId)
    setDeletingId(null)
  }

  return (
    <div className="md:col-span-2 relative">
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-lg">Recent Sessions</h2>
          <Link
            href="/dashboard/tracking/history"
            className="text-sm text-primary hover:underline"
          >
            View All
          </Link>
        </div>
        {sessions.length > 0 ? (
          <div className="space-y-3">
            {(expanded ? sessions : sessions.slice(0, 3)).map((session) => (
              <div
                key={session.id}
                className={`flex items-center justify-between p-4 rounded-lg transition-all ${
                  session.goal_met
                    ? "bg-gradient-to-r from-yellow-500/10 via-amber-500/10 to-yellow-500/10 ring-2 ring-yellow-500/30"
                    : "bg-muted/30"
                }`}
              >
                <div className="flex items-center gap-4">
                  <div className="min-w-[4rem] text-center">
                    <div className={`text-3xl font-bold ${session.goal_met ? "text-yellow-500" : "text-primary"}`}>
                      {session.total_approaches}
                    </div>
                    {session.goal !== null && (
                      <div className="text-xs text-muted-foreground">
                        / {session.goal} goal
                      </div>
                    )}
                  </div>
                  <div>
                    <div className="font-medium flex items-center gap-2">
                      {new Date(session.started_at).toLocaleDateString(undefined, {
                        weekday: "short",
                        month: "short",
                        day: "numeric",
                      })}
                      {session.goal_met && (
                        <span className="text-yellow-500" title="Goal achieved!">
                          🏆
                        </span>
                      )}
                      {session.achievements.length > 0 && (
                        <SessionAchievementStack achievements={session.achievements} />
                      )}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {session.is_active
                        ? "In progress"
                        : session.duration_minutes
                          ? `${session.duration_minutes} min`
                          : "< 1 min"}
                      {session.primary_location && ` • ${session.primary_location}`}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {session.outcomes.number > 0 && (
                    <Badge variant="secondary" className="bg-green-500/10 text-green-500">
                      {session.outcomes.number} 📱
                    </Badge>
                  )}
                  {session.outcomes.instadate > 0 && (
                    <Badge variant="secondary" className="bg-purple-500/10 text-purple-500">
                      {session.outcomes.instadate} 🎉
                    </Badge>
                  )}
                  {session.goal_met && (
                    <Badge variant="secondary" className="bg-yellow-500/10 text-yellow-500 font-medium">
                      Goal Hit ✓
                    </Badge>
                  )}
                  {session.end_reason === 'abandoned' && (
                    <Badge variant="secondary" className="bg-orange-500/10 text-orange-500">
                      Abandoned
                    </Badge>
                  )}
                  {session.is_active ? (
                    <Link href="/dashboard/tracking/session">
                      <Button variant="outline" size="sm" className="gap-1 text-xs">
                        <Play className="size-3" />
                        Continue
                      </Button>
                    </Link>
                  ) : (
                    <>
                      <Link href={`/dashboard/tracking/session/${session.id}`}>
                        <Button variant="outline" size="sm" className="gap-1 text-xs">
                          <Pencil className="size-3" />
                          Edit
                        </Button>
                      </Link>
                      <Link href={`/dashboard/tracking/report?session=${session.id}`}>
                        <Button variant="outline" size="sm" className="gap-1 text-xs">
                          <FileText className="size-3" />
                          Report
                        </Button>
                      </Link>
                    </>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-8 text-muted-foreground hover:text-destructive"
                    onClick={() => handleDelete(session.id)}
                    disabled={deletingId === session.id}
                  >
                    {deletingId === session.id ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <Trash2 className="size-4" />
                    )}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <Target className="size-12 mx-auto mb-3 opacity-30" />
            <p>No sessions yet</p>
            <p className="text-sm">Start your first session to begin tracking</p>
          </div>
        )}
      </Card>
      {sessions.length > 3 && (
        <div className="flex justify-center -mt-5 relative z-10">
          <button
            onClick={() => setExpanded(!expanded)}
            className="group flex items-center gap-2 pl-4 pr-3 py-2 rounded-full bg-primary text-primary-foreground shadow-lg hover:bg-primary/90 transition-all hover:scale-105 hover:shadow-xl"
          >
            <span className="text-sm font-medium">
              {expanded ? "Show less" : `${sessions.length - 3} more`}
            </span>
            {expanded ? (
              <ChevronUp className="size-4" />
            ) : (
              <ChevronDown className="size-4" />
            )}
          </button>
        </div>
      )}
    </div>
  )
}
