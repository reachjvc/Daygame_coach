export interface TurnEvaluation {
  score: number
  tags: string[]
  quality: "positive" | "neutral" | "deflect" | "skeptical"
  feedback: string
}

export interface TurnState {
  interest: number
  exitRisk: number
}

export interface DiagnosticTurn {
  turn: number
  history: Array<{ role: "him" | "her"; content: string }>
  him: string
  her: string
  evaluation: TurnEvaluation
  state_before: TurnState
  state_after: TurnState
  is_blind_spot: boolean
}

export interface DiagnosticSummary {
  total_coach_turns: number
  turns_scored_7_plus: number
  blind_spot_count: number
  pass_rate: number
}

export interface DiagnosticData {
  video_id: string
  prompt_version: string
  total_turns: number
  summary: DiagnosticSummary
  turns: DiagnosticTurn[]
}
