/** Reader text of Tool 8, Daily check-in. */

/** The worded 1 to 5 scale used for the forecast, how hard the day was and the urges. */
export const SCALE = ["Easy", "Fairly easy", "In between", "Hard", "Very hard"] as const
export const scaleWord = (n: number) => `${SCALE[n - 1]} (${n})`
/** The urges scale. */
export const URGE_SCALE = ["None", "Weak", "Medium", "Strong", "Very strong"] as const
export const urgeWord = (n: number) => `${URGE_SCALE[n - 1]} (${n})`

/** Verb phrases, present and past, by the verb the shared record gives (`useVerb`). */
const PAST: Record<string, string> = {
  smoke: "smoked",
  vape: "vaped",
  "use a pouch": "used a pouch",
  "use nicotine": "used nicotine",
}
/** `useVerb` says "use" when no unit is known; this tool says "use nicotine". */
export const verbPhrase = (verb: string) => (verb === "use" ? "use nicotine" : verb)
export const pastPhrase = (verb: string) => PAST[verbPhrase(verb)] ?? "used nicotine"

export const checkinText = {
  tabs: { today: "Today", month: "Month", pattern: "Pattern", reminders: "Reminders" },
  tabsLabel: "Check-in screens",
  keptHere: "Your check-ins are kept in this browser.",

  morningTitle: "Morning",
  eveningTitle: "Evening",
  notYet: "Not done yet",
  start: "Start",
  change: "Change",
  pledgeLine: (p: string) => `Promise: ${p}`,
  startMorning: "Start your morning check-in",
  startEvening: "Start your evening check-in",
  doneMonth: "Back to the month",
  loadingRecord: "Loading your record…",
  savedLocal: "Saved in this browser.",
  localOnly: "Saved in this browser only. Sign in again to send it to your account.",
  clearMonth: (n: number) => `Clear day. ${n} clear ${n === 1 ? "day" : "days"} this month.`,
  expectedLine: (n: number) => `Expected: ${scaleWord(n)}`,
  hardLine: (n: number) => `How hard: ${scaleWord(n)}`,
  fillYesterday: (label: string) => `Fill in yesterday, ${label}`,
  monthTitle: "This month",
  checkedIn: (n: number) => `Days checked in: ${n}`,
  clearDays: (n: number) => `Clear days: ${n}`,
  neverResets: "A slip or a missed day does not reset anything. Each month is counted on its own.",
  lastMonthTitle: (name: string) => `Last month, ${name}`,
  seeExample: "See an example",
  exampleBar: "Example. Nothing here is yours, and nothing is saved.",
  leaveExample: "Leave the example",

  clearResult: "Clear day",
  slipResult: (past: string) => `You ${past}`,
  eveningOpen: "Evening not answered",

  back: "Back",
  next: "Next",
  doneToday: "Done for today",
  doneThat: "Done for that day",
  save: "Save",
  stepOf: (i: number, n: number) => `Step ${i} of ${n}`,

  pledgeTitle: (thatDay: boolean) => `Your promise for ${thatDay ? "that day" : "today"}`,
  pledgeHelp: "One line, in your own words. You can leave it empty.",
  pledgePlaceholder: "Today I will ...",
  forecastTitle: (thatDay: boolean) => `How hard do you expect ${thatDay ? "that day" : "today"} to be?`,

  outcomeTitle: (verb: string, thatDay: boolean) => `Did you ${verbPhrase(verb)} ${thatDay ? "that day" : "today"}?`,
  outcomeClear: "No, a clear day",
  outcomeSlip: (past: string) => `Yes, I ${past}`,
  slipInRecord: (label: string) => `Your slip on ${label} is in your record.`,
  slipHeld: "A slip doesn't undo the days before.",
  noSlipLater: (thatDay: boolean) => `A later slip is already in your record, so ${thatDay ? "that day" : "today"} isn't saved as a second slip.`,
  noSlipNotStarted: "Your quit hasn't started in your record yet, so this isn't saved as a slip.",
  noSlipEnded: "Your last slip ended your clean days in the record, so this isn't saved as a new slip.",
  noSlipOther: "Your record already has a later entry, so this day isn't saved as a slip.",
  openDate: "Your quit date",
  slipBlocked: "This slip is in your Black Box; remove it there.",
  slipBlockedLink: "Open your Black Box",
  hardTitle: (thatDay: boolean) => `How hard was ${thatDay ? "that day" : "today"}?`,
  expectedThen: (thatDay: boolean, n: number) => `${thatDay ? "That morning" : "This morning"} you expected: ${scaleWord(n)}`,
  urgesTitle: (thatDay: boolean) => (thatDay ? "How strong were the urges that day?" : "How strong were the urges?"),
  feelingsTitle: (thatDay: boolean) => (thatDay ? "What did you feel that day?" : "What did you feel?"),
  feelingsHelp: "Tap any that fit.",
  noteTitle: (thatDay: boolean) => (thatDay ? "A note about that day, if you want one" : "A note, if you want one"),
  notePlaceholder: "What happened?",

  savedFor: (label: string) => `Saved for ${label}`,
  backToToday: "Back to today",
  sumPledge: (p: string) => `Promise: ${p}`,
  sumExpected: (n: number) => `You expected ${scaleWord(n)}`,
  sumHard: (n: number) => `It was ${scaleWord(n)}`,
  sumUrges: (n: number) => `Urges: ${urgeWord(n)}`,
  sumFeelings: (list: string[]) => `Felt: ${list.join(", ")}`,
  sumNote: (n: string) => `Note: ${n}`,
  sumEmpty: "Nothing saved for this day.",

  monthPrev: "Previous month",
  monthNext: "Next month",
  modesLabel: "Calendar view",
  modes: ["Clear days", "How hard", "Feelings", "Notes"] as const,
  weekdays: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
  checkedShort: "Days checked in",
  clearShort: "Clear days",
  checkedNote: "An answer in the morning or the evening counts as checked in.",
  pickDay: "Tap a day to see what you saved.",
  fillDay: "Fill in this day",
  changeDay: "Change",
  legendClear: "Clear day",
  legendSlip: "Slipped (dashed, with a mark)",
  legendNone: "Nothing saved",
  legendToday: "Today",
  legendEasy: "Easy (1)",
  legendVeryHard: "Very hard (5)",
  legendFew: "One feeling",
  legendMany: "Five or more",
  legendNotes: "A note",

  patternTitle: "Your pattern",
  patternWait: (verb: string, n: number, need: number) => `Pattern lines start after ${need} evenings where you answered "Did you ${verbPhrase(verb)} today?". So far: ${n}.`,
  patternNone: "No pattern yet. It needs at least 3 days you expected Hard or Very hard, and 3 other days.",
  patternEqual: "No pattern yet: you slipped on the same share of days either way.",
  forecastPattern: (a: number, ax: number, b: number, bx: number) => `Days you expected Hard or Very hard: you slipped on ${ax} of ${a}. Other days: you slipped on ${bx} of ${b}.`,
  pairsLine: (n: number, harder: number, easier: number, same: number) =>
    `On ${n} days you rated the day in the morning and the evening: harder than you expected on ${harder}, easier on ${easier}, as expected on ${same}.`,
  patternOwn: "These lines count only your own days. They are not a study.",

  remindersTitle: "Reminders",
  remindersLine: "This site cannot send you reminders. Add two daily events to your calendar, and it will remind you.",
  remindMorning: "Morning time",
  remindEvening: "Evening time",
  addCalendar: "Add to calendar",
  googleMorning: "Morning in Google Calendar",
  googleEvening: "Evening in Google Calendar",
  icsFile: "daily-check-in.ics",
  morningEvent: "Daily check-in: morning",
  eveningEvent: "Daily check-in: evening",
}

/** The ten feelings of this tool, in screen order. */
export const FEELINGS: { id: string; label: string }[] = [
  { id: "stressed", label: "Stressed" },
  { id: "anxious", label: "Anxious" },
  { id: "bored", label: "Bored" },
  { id: "sad", label: "Sad" },
  { id: "short-tempered", label: "Short-tempered" },
  { id: "lonely", label: "Lonely" },
  { id: "restless", label: "Restless" },
  { id: "calm", label: "Calm" },
  { id: "proud", label: "Proud" },
  { id: "happy", label: "Happy" },
]
/** Words saved by the first version of this list: they still read as before. */
const LEGACY_FEELINGS: Record<string, string> = { tired: "Tired", low: "Low", "clear-headed": "Clear-headed" }
export const isFeelingId = (id: string) => FEELINGS.some((f) => f.id === id) || id in LEGACY_FEELINGS
export const feelingLabel = (id: string) => FEELINGS.find((f) => f.id === id)?.label ?? LEGACY_FEELINGS[id] ?? id
