/**
 * THE PHONE'S MOTOR, AND THE SWITCH THAT STILLS IT ("Haptic feedback" in
 * Settings › Timer defaults, as in Toggl Track's Android app; Plans/toggl-parity.md
 * Phase 7). The drums tick a minute and the calendar a step; both ask here
 * first. One value for the page, set from the person's settings by the tracker.
 */
let allowed = true

export function setHaptics(on: boolean): void {
  allowed = on
}

export function hapticsAllowed(): boolean {
  return allowed
}

/** One short tick, where the phone has a motor and the person has not switched it off */
export function hapticTick(): void {
  if (!allowed) return
  try {
    // Android Chrome has it; iPhones do not, and everything works the same without
    if (typeof navigator !== "undefined" && typeof navigator.vibrate === "function") navigator.vibrate(5)
  } catch {
    // a browser that refuses before the first tap: no tick, nothing else lost
  }
}
