/** mm:ss for a whole number of seconds (never below 00:00). */
export function formatClock(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds))
  const mm = String(Math.floor(s / 60)).padStart(2, "0")
  const ss = String(s % 60).padStart(2, "0")
  return `${mm}:${ss}`
}

/** Share of each count in percent, rounded; all zero when nothing is counted. */
export function shares(counts: number[]): number[] {
  const total = counts.reduce((a, b) => a + b, 0)
  if (total === 0) return counts.map(() => 0)
  return counts.map((c) => Math.round((c / total) * 100))
}

/** 0..1 progress of a hold that has lasted `heldMs` toward `targetMs`. */
export function holdProgress(heldMs: number, targetMs: number): number {
  return Math.min(1, Math.max(0, heldMs / targetMs))
}
