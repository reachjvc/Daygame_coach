"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import type { DiagnosticTurn } from "./types"

interface EvaluationPanelProps {
  turn: DiagnosticTurn
}

function getScoreColor(score: number): string {
  if (score >= 7) return "text-green-600"
  if (score >= 5) return "text-yellow-600"
  return "text-red-600"
}

function getQualityVariant(quality: string): "default" | "secondary" | "destructive" | "outline" {
  switch (quality) {
    case "positive":
      return "default"
    case "neutral":
      return "secondary"
    case "deflect":
      return "outline"
    case "skeptical":
      return "destructive"
    default:
      return "secondary"
  }
}

export function EvaluationPanel({ turn }: EvaluationPanelProps) {
  return (
    <Card className={turn.is_blind_spot ? "border-destructive border-2" : ""}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">Evaluation</CardTitle>
          {turn.is_blind_spot && (
            <Badge variant="destructive">BLIND SPOT</Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Score */}
        <div>
          <span className="text-sm text-muted-foreground">Score:</span>
          <span className={`ml-2 text-3xl font-bold ${getScoreColor(turn.evaluation.score)}`}>
            {turn.evaluation.score}
          </span>
          <span className="text-muted-foreground">/10</span>
        </div>

        {/* Quality */}
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Quality:</span>
          <Badge variant={getQualityVariant(turn.evaluation.quality)}>
            {turn.evaluation.quality}
          </Badge>
        </div>

        {/* Tags */}
        {turn.evaluation.tags.length > 0 && (
          <div>
            <span className="text-sm text-muted-foreground">Tags:</span>
            <div className="flex gap-1 mt-1 flex-wrap">
              {turn.evaluation.tags.map((tag) => (
                <Badge key={tag} variant="outline" className="text-xs">
                  {tag}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Feedback */}
        <div>
          <span className="text-sm text-muted-foreground">Feedback:</span>
          <p className="mt-1 text-sm">{turn.evaluation.feedback}</p>
        </div>

        {/* State Changes */}
        <div className="pt-2 border-t">
          <span className="text-sm text-muted-foreground">State Changes:</span>
          <div className="grid grid-cols-2 gap-4 mt-2 text-sm">
            <div>
              <span className="text-muted-foreground">Interest:</span>
              <span className="ml-2">
                {turn.state_before.interest} → {turn.state_after.interest}
                {turn.state_after.interest > turn.state_before.interest && (
                  <span className="text-green-600 ml-1">+{turn.state_after.interest - turn.state_before.interest}</span>
                )}
                {turn.state_after.interest < turn.state_before.interest && (
                  <span className="text-red-600 ml-1">{turn.state_after.interest - turn.state_before.interest}</span>
                )}
              </span>
            </div>
            <div>
              <span className="text-muted-foreground">Exit Risk:</span>
              <span className="ml-2">
                {turn.state_before.exitRisk} → {turn.state_after.exitRisk}
                {turn.state_after.exitRisk > turn.state_before.exitRisk && (
                  <span className="text-red-600 ml-1">+{turn.state_after.exitRisk - turn.state_before.exitRisk}</span>
                )}
                {turn.state_after.exitRisk < turn.state_before.exitRisk && (
                  <span className="text-green-600 ml-1">{turn.state_after.exitRisk - turn.state_before.exitRisk}</span>
                )}
              </span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
