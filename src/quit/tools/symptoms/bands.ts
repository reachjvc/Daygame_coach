/**
 * The day ranges drawn on the bands of "What you will feel, and when", in ONE place (copied from the lab
 * variant `timeline/best`). Every number is derived from words in `src/quit/data/nicotine.json`
 * (`symptomCourse`) and the quotes of its refs. Day 1 is the quit date.
 */

/** The strip and every band cover days 1 to 42 (six weeks). */
export const BAND_DAYS = 42

export interface Band {
  /** Days the peak window covers (both ends included), or null when the data gives no peak. */
  peak: readonly [number, number] | null
  /** Days between which the studies saw it gone: shorter study figure, longer study figure. */
  gone: readonly [number, number] | null
  /** First day of an open-ended band (no end known), or null. */
  openFrom: number | null
  /** Days a study measured the symptom as present, drawn before an open end; null when none. */
  tested?: readonly [number, number] | null
  /** The shorter study measured overall bad mood as one score, not this feeling alone. */
  moodScore?: boolean
  /** The data file says one study saw no clear change. */
  diaryNoChange?: boolean
}

// peak "first week"; Hughes quote "peak within the first week" -> week 1 = days 1 to 7.
const FIRST_WEEK = [1, 7] as const
// lasts "2 to 4 weeks in a review; about 10 days in a diary study": the shorter figure is the diary
// study (Shiffman quote "within 10 days of quitting" -> day 10), the longer is the review
// (Hughes quote "last 2-4 weeks" -> 4 weeks = day 28). The band fades from day 10 to day 28.
const GONE_10_TO_28 = [10, 28] as const

const NICOTINE: Record<string, Band> = {
  // Shiffman (diary study) measured negative affect as ONE score, plus attention, restlessness and sleep.
  // So irritable, anxious and low-mood take day 10 from an overall bad-mood score (moodScore: true);
  // brain-fog (attention) and restless (restlessness) were measured directly; sleep showed no change.
  // irritable: peak "first week" -> 1 to 7; lasts "2 to 4 weeks in a review; about 10 days in a diary study" -> gone 10 to 28.
  irritable: { peak: FIRST_WEEK, gone: GONE_10_TO_28, openFrom: null, moodScore: true },
  // anxious: same words as irritable -> 1 to 7; gone 10 to 28.
  anxious: { peak: FIRST_WEEK, gone: GONE_10_TO_28, openFrom: null, moodScore: true },
  // low-mood: same words -> 1 to 7; gone 10 to 28.
  "low-mood": { peak: FIRST_WEEK, gone: GONE_10_TO_28, openFrom: null, moodScore: true },
  // brain-fog: same words -> 1 to 7; gone 10 to 28.
  "brain-fog": { peak: FIRST_WEEK, gone: GONE_10_TO_28, openFrom: null },
  // restless: same words -> 1 to 7; gone 10 to 28.
  restless: { peak: FIRST_WEEK, gone: GONE_10_TO_28, openFrom: null },
  // sleep: peak "first week" -> 1 to 7; lasts "2 to 4 weeks in a review; no clear change in a diary study".
  // Only the review gives a range: 2 weeks = day 14, 4 weeks = day 28 (Hughes "last 2-4 weeks"); the
  // diary study (sleep disturbance) showed no change over time, so no day is drawn for it and the card says so.
  sleep: { peak: FIRST_WEEK, gone: [14, 28], openFrom: null, diaryNoChange: true },
  // cue-craving: peak null -> no peak window; lasts "stronger at day 35 than at day 7 or 14 on some
  // measures; not tested after day 35" (Bedi quote: craving "greater in Group 3 (35-day) compared with
  // Group 1 (7-day)") -> tested/present segment days 7 to 35, open-ended after day 35.
  "cue-craving": { peak: null, gone: null, openFrom: 35, tested: [7, 35] },
}

/** Bands per addiction. Only nicotine has checked course data; the others show "content coming". */
const BANDS: Record<string, Record<string, Band>> = { nicotine: NICOTINE }

export function bandFor(addiction: string, symptom: string): Band | null {
  return BANDS[addiction]?.[symptom] ?? null
}

/** Every band of one addiction, for tests. */
export function bandsOf(addiction: string): Record<string, Band> {
  return BANDS[addiction] ?? {}
}
