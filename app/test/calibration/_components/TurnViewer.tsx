"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { HistoryPanel } from "./HistoryPanel"
import { EvaluationPanel } from "./EvaluationPanel"
import type { DiagnosticData } from "./types"

interface TurnViewerProps {
  data: DiagnosticData
}

export function TurnViewer({ data }: TurnViewerProps) {
  const [currentTurn, setCurrentTurn] = useState(0)
  const turn = data.turns[currentTurn]

  const passRate = Math.round(data.summary.pass_rate * 100)

  return (
    <div className="space-y-4">
      {/* Summary Header */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">
              {data.video_id} ({data.prompt_version})
            </CardTitle>
            <div className="flex gap-2">
              <Badge variant={passRate >= 80 ? "default" : passRate >= 60 ? "secondary" : "destructive"}>
                {passRate}% pass rate
              </Badge>
              <Badge variant={data.summary.blind_spot_count === 0 ? "default" : "destructive"}>
                {data.summary.blind_spot_count} blind spots
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm text-muted-foreground">
            <span>{data.summary.turns_scored_7_plus} of {data.summary.total_coach_turns} turns scored 7+</span>
            {data.mode && <span>Mode: {data.mode}</span>}
            {typeof data.summary.mean_absolute_error === "number" && (
              <span>Line MAE: {data.summary.mean_absolute_error}</span>
            )}
            {typeof data.summary.trajectory_mae === "number" && (
              <span>Trajectory MAE: {data.summary.trajectory_mae} ({data.summary.trajectory_turns} turns)</span>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Turn Stepper */}
      <div className="flex items-center gap-2 flex-wrap">
        {data.turns.map((t, i) => (
          <button
            key={i}
            onClick={() => setCurrentTurn(i)}
            className={`
              w-10 h-10 rounded-md text-sm font-medium transition-colors
              ${i === currentTurn ? "ring-2 ring-ring ring-offset-2" : ""}
              ${t.is_blind_spot
                ? "bg-destructive/20 text-destructive hover:bg-destructive/30"
                : t.evaluation.score >= 7
                  ? "bg-green-500/20 text-green-700 hover:bg-green-500/30"
                  : "bg-yellow-500/20 text-yellow-700 hover:bg-yellow-500/30"
              }
            `}
          >
            {t.turn}
          </button>
        ))}
      </div>

      {/* Turn Detail */}
      {turn && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <HistoryPanel turn={turn} />
          <EvaluationPanel turn={turn} />
        </div>
      )}
    </div>
  )
}
