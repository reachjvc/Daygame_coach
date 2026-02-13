export interface TurnEvaluation {
  score: number
  tags: string[]
  quality: "positive" | "neutral" | "deflect" | "skeptical"
  feedback: string
  trajectory_score?: number
  trajectory_signals?: string
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
  is_false_positive?: boolean
  expected_score?: number
  ground_truth_interest?: number
}

export interface DiagnosticSummary {
  total_coach_turns: number
  turns_scored_7_plus: number
  blind_spot_count: number
  false_positive_count?: number
  mean_absolute_error?: number
  pass_rate: number
  trajectory_mae?: number
  trajectory_turns?: number
}

export interface DiagnosticData {
  video_id: string
  prompt_version: string
  total_turns: number
  mode?: "simulated" | "ground-truth"
  summary: DiagnosticSummary
  turns: DiagnosticTurn[]
}
