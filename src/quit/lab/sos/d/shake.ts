export const SHAKE_THRESHOLD = 35
export const SHAKE_PAUSE_MS = 1000

interface Accel {
  x: number | null
  y: number | null
  z: number | null
}

/** A shake is a strong sum of the three axes (gravity included), at most once per pause. */
export function shakeDetected(a: Accel | null | undefined, now: number, lastAt: number): boolean {
  if (!a) return false
  const mag = Math.abs(a.x ?? 0) + Math.abs(a.y ?? 0) + Math.abs(a.z ?? 0)
  return mag > SHAKE_THRESHOLD && now - lastAt > SHAKE_PAUSE_MS
}
