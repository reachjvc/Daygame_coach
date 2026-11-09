/**
 * THE REVIEW IN PLAIN WORDS (alpha picky-eye-14/15). The review used to read
 * like a spreadsheet: "13.25 hours", "105.75 of 195 waking hours", "E 6.0 ·
 * G 6.7", and the same "why" note listed once per quarter it was written for.
 * These say the same numbers the way a person would.
 */

/** Minutes as hours and minutes: "15 min", "1 hour", "1 h 30 min", "21 hours". */
export function durationText(minutes: number): string {
  const total = Math.round(minutes)
  const h = Math.floor(total / 60)
  const m = total % 60
  if (h === 0) return `${m} min`
  if (m === 0) return h === 1 ? "1 hour" : `${h} hours`
  return `${h} h ${m} min`
}

/** The waking hours an audit could have answered, in whole hours: "about 177 waking hours". */
export function wakingHoursText(hours: number): string {
  // Under half an hour would round to "about 0": say minutes instead.
  if (hours > 0 && hours < 0.5) return `${Math.round(hours * 60)} waking minutes`
  const whole = Math.round(hours)
  const words = whole === 1 ? "1 waking hour" : `${whole} waking hours`
  return whole === hours ? words : `about ${words}`
}

/** A 1–7 average: one decimal, without a trailing ".0" ("6", "6.7"). */
export function scoreText(n: number): string {
  const one = Math.round(n * 10) / 10
  return Number.isInteger(one) ? String(one) : one.toFixed(1)
}

/**
 * Each note once, with every quarter it was written for, in the order given
 * (newest first from buildReview). Notes count as the same when they differ
 * only in case and spacing; the newest spelling is shown.
 */
export function distinctWhys(whys: readonly { text: string; slotAt: string }[]): { text: string; slotAts: string[] }[] {
  const out: { text: string; slotAts: string[] }[] = []
  const byKey = new Map<string, { text: string; slotAts: string[] }>()
  for (const w of whys) {
    const key = w.text.trim().replace(/\s+/g, " ").toLowerCase()
    const seen = byKey.get(key)
    if (seen) {
      seen.slotAts.push(w.slotAt)
      continue
    }
    const item = { text: w.text.trim(), slotAts: [w.slotAt] }
    byKey.set(key, item)
    out.push(item)
  }
  return out
}
