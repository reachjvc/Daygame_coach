"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { History, SkipForward, RotateCcw, Trash2 } from "lucide-react"
import type { ProgramSessionLogRow } from "../types"

interface Props {
  enrollmentId: string
  logs: ProgramSessionLogRow[]
  onChanged: () => void
  onUnenrolled: () => void
}

export function ProgressionView({ enrollmentId, logs, onChanged, onUnenrolled }: Props) {
  const [busy, setBusy] = useState(false)

  async function action(action: "skip" | "reset") {
    setBusy(true)
    try {
      await fetch(`/api/programs/enrollments/${enrollmentId}/action`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      })
      onChanged()
    } finally {
      setBusy(false)
    }
  }

  async function unenroll() {
    if (!confirm("End this program? Your logged sessions will be removed.")) return
    setBusy(true)
    try {
      await fetch(`/api/programs/enrollments/${enrollmentId}`, { method: "DELETE" })
      onUnenrolled()
    } finally {
      setBusy(false)
    }
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <History className="size-4" /> History
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {logs.length === 0 ? (
          <p className="text-sm text-muted-foreground">No sessions logged yet.</p>
        ) : (
          <ul className="space-y-1 text-sm">
            {logs.slice(0, 12).map((l) => (
              <li key={l.id} className="flex justify-between border-b pb-1 last:border-0">
                <span>
                  {l.day_id} · C{l.cycle} W{l.week}
                </span>
                <span className="text-muted-foreground">{new Date(l.logged_at).toLocaleDateString()}</span>
              </li>
            ))}
          </ul>
        )}

        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" disabled={busy} onClick={() => action("skip")}>
            <SkipForward className="size-4 mr-1" /> Skip session
          </Button>
          <Button variant="outline" size="sm" disabled={busy} onClick={() => action("reset")}>
            <RotateCcw className="size-4 mr-1" /> Reset to start
          </Button>
          <Button variant="ghost" size="sm" disabled={busy} onClick={unenroll} className="text-destructive">
            <Trash2 className="size-4 mr-1" /> End program
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
