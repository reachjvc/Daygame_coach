/** Copy C logic: the persona tally and the "your moment" time slider. */

export const QUESTIONS = 9
export type Persona = 0 | 1 | 2 // explorer, pattern breaker, already stopped

/** Count of each persona among the picked answers (answer index = persona index). */
export function tally(answers: readonly (number | undefined)[]): [number, number, number] {
  const t: [number, number, number] = [0, 0, 0]
  for (const a of answers) if (a === 0 || a === 1 || a === 2) t[a] += 1
  return t
}

/** The persona with the most answers; a tie goes to the middle one, then the first. */
export function persona(answers: readonly (number | undefined)[]): Persona {
  const t = tally(answers)
  const max = Math.max(...t)
  if (t[1] === max) return 1
  return t[0] === max ? 0 : 2
}

/** The slider runs from 6 AM to 2 AM the next day in 15-minute steps. */
export const SLIDER_START = 6 * 60
export const SLIDER_STEPS = 80
/** The slider opens at 6 PM. */
export const OPEN_AT = 48

/** Insight lines seen on screen: exactly 5:30 PM and exactly 6 PM. Every other time is inferred. */
export function insightKey(step: number): PresetKey | "six" {
  return step === OPEN_AT ? "six" : slotFor(step)
}
export function insightSeen(step: number): boolean {
  return step === OPEN_AT || step === presetStep("17:30")
}

export function minutesAt(step: number): number {
  return SLIDER_START + step * 15
}

/** "6 PM", "5:30 PM", "1:15 AM". */
export function clock(step: number): string {
  const m = minutesAt(step) % (24 * 60)
  const h = Math.floor(m / 60)
  const mm = m % 60
  const ap = h >= 12 ? "PM" : "AM"
  const h12 = h % 12 === 0 ? 12 : h % 12
  return mm === 0 ? `${h12} ${ap}` : `${h12}:${String(mm).padStart(2, "0")} ${ap}`
}

export const PRESETS = [
  { key: "morning", at: "9:00" },
  { key: "lunch", at: "12:30" },
  { key: "afternoon", at: "15:00" },
  { key: "afterWork", at: "17:30" },
  { key: "dinner", at: "18:30" },
  { key: "windDown", at: "20:30" },
  { key: "lateNight", at: "22:30" },
] as const
export type PresetKey = (typeof PRESETS)[number]["key"]

export function presetStep(at: string): number {
  const [h, m] = at.split(":").map(Number)
  return (h * 60 + m - SLIDER_START) / 15
}

/** Which preset slot an hour falls in (for the insight line): the last preset not after it. */
export function slotFor(step: number): PresetKey {
  let slot: PresetKey = PRESETS[0].key
  for (const p of PRESETS) if (presetStep(p.at) <= step) slot = p.key
  return slot
}

export function clampStep(n: number): number {
  return Math.min(SLIDER_STEPS, Math.max(0, n))
}

export const VOICE_GIVES = ["rest", "relief", "connection", "reward", "fun", "other"] as const
export const FEELINGS = ["glad", "sad", "mad", "scared", "tired", "calm"] as const
export const CONTEXTS = ["hardDay", "alreadyHad", "autopilot", "voice", "celebrating", "craving", "lonely"] as const
