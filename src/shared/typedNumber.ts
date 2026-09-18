/**
 * A number somebody typed, or nothing at all.
 *
 * WHY THIS EXISTS. `Number("")` is `0`, and `parseFloat("")` is `NaN`. Both were
 * used on weight boxes, and both are wrong in the same way: an empty box means
 * "I have not said", and turning it into a number invents an answer. On a bench
 * press that answer was 0 kg — a set saved as zero, which then hides inside
 * every volume total and every personal best, and which nothing downstream can
 * tell apart from real bodyweight work (a pull-up genuinely IS 0 kg added).
 *
 * `null` is the third state the callers were missing. What to do about it is
 * theirs to decide — refuse the save, or, on a lift that can be done with
 * nothing added, treat it as exactly that.
 */
export function typedNumber(s: string): number | null {
  const trimmed = s.trim()
  if (trimmed === "") return null
  const n = Number(trimmed)
  return Number.isFinite(n) ? n : null
}
