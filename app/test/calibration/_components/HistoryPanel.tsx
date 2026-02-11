"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { DiagnosticTurn } from "./types"

interface HistoryPanelProps {
  turn: DiagnosticTurn
}

export function HistoryPanel({ turn }: HistoryPanelProps) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Conversation (Turn {turn.turn})</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Previous turns */}
        {turn.history.map((msg, i) => (
          <div
            key={i}
            className={`p-3 rounded-lg text-sm ${
              msg.role === "him"
                ? "bg-blue-500/10 ml-4"
                : "bg-muted mr-4"
            }`}
          >
            <span className="font-medium text-xs uppercase text-muted-foreground">
              {msg.role === "him" ? "Him" : "Her"}
            </span>
            <p className="mt-1">{msg.content}</p>
          </div>
        ))}

        {/* Current turn - His line (being evaluated) */}
        <div className={`p-3 rounded-lg text-sm ml-4 ${
          turn.is_blind_spot
            ? "bg-destructive/20 border-2 border-destructive"
            : "bg-blue-500/20 border-2 border-blue-500"
        }`}>
          <span className="font-medium text-xs uppercase text-muted-foreground">
            Him (evaluated)
          </span>
          <p className="mt-1 font-medium">{turn.him}</p>
        </div>

        {/* Her response */}
        <div className="p-3 rounded-lg text-sm bg-muted mr-4">
          <span className="font-medium text-xs uppercase text-muted-foreground">
            Her (actual response)
          </span>
          <p className="mt-1">{turn.her}</p>
        </div>
      </CardContent>
    </Card>
  )
}
