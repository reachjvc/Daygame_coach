/** Reader text of Tool 8, Daily check-in. */

/** The worded 1 to 5 scale used for the forecast, how hard the day was and the urges. */
export const SCALE = ["Easy", "Fairly easy", "In between", "Hard", "Very hard"] as const
export const scaleWord = (n: number) => `${SCALE[n - 1]} (${n})`

/** Verb phrases, present and past, by the verb the shared record gives (`useVerb`). */
const PAST: Record<string, string> = {
  smoke: "smoked",
  vape: "vaped",
  "use a pouch": "used a pouch",
  "use it": "used it",
}
/** `useVerb` says "use" when no unit is known; this tool says "use it". */
export const verbPhrase = (verb: string) => (verb === "use" ? "use it" : verb)
export const pastPhrase = (verb: string) => PAST[verbPhrase(verb)] ?? "used it"

export const checkinText = {
  tabs: { today: "Today", month: "Month", pattern: "Pattern", reminders: "Reminders" },
  tabsLabel: "Check-in screens",
  keptHere: "Your check-ins are kept on this phone.",

  morningTitle: "Morning",
  eveningTitle: "Evening",
  notYet: "Not done yet",
  start: "Start",
  change: "Change",
  pledgeLine: (p: string) => `Pledge: ${p}`,
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

  pledgeTitle: "Your pledge for today",
  pledgeHelp: "One line, in your own words. You can leave it empty.",
  pledgePlaceholder: "Today I will ...",
  forecastTitle: "How hard do you expect today to be?",

  outcomeTitle: (verb: string, thatDay: boolean) => `Did you ${verbPhrase(verb)} ${thatDay ? "that day" : "today"}?`,
  outcomeClear: "No, a clear day",
  outcomeSlip: (past: string) => `Yes, I ${past}`,
  slipInRecord: (label: string) => `Your slip on ${label} is in your record.`,
  slipHeld: "A slip doesn't undo the days before.",
  noRun: "You had no run going that day, so nothing was saved as a slip.",
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
  sumPledge: (p: string) => `Pledge: ${p}`,
  sumExpected: (n: number) => `You expected ${scaleWord(n)}`,
  sumHard: (n: number) => `It was ${scaleWord(n)}`,
  sumUrges: (n: number) => `Urges: ${scaleWord(n)}`,
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
  legendSlip: "Slipped",
  legendNone: "Nothing saved",
  legendToday: "Today",
  legendEasy: "Easy (1)",
  legendVeryHard: "Very hard (5)",
  legendFew: "One feeling",
  legendMany: "Five or more",
  legendNotes: "A note",

  patternTitle: "Your pattern",
  patternWait: (n: number, need: number) => `Pattern lines start once you have ${need} check-ins with a result. You have ${n}.`,
  patternNone: "No pattern yet",
  forecastPattern: (a: number, ax: number, b: number, bx: number) => `On the ${a} days you expected it to be hard, you slipped on ${ax}; on the other ${b} days, on ${bx}.`,
  pairsLine: (n: number, harder: number, easier: number, same: number) =>
    `Of ${n} days with a forecast and a result, it was harder than you expected on ${harder}, easier on ${easier} and the same on ${same}.`,
  patternOwn: "These lines count only your own days. They are not a study.",

  remindersTitle: "Reminders",
  remindersLine: "This site cannot send notifications. A calendar event repeats every day and does the reminding.",
  remindMorning: "Morning time",
  remindEvening: "Evening time",
  addCalendar: "Add to calendar",
  googleMorning: "Morning in Google Calendar",
  googleEvening: "Evening in Google Calendar",
  icsFile: "daily-check-in.ics",
  morningEvent: "Morning check-in",
  eveningEvent: "Evening check-in",
}

/** The ten feelings of this tool, in screen order. */
export const FEELINGS: { id: string; label: string }[] = [
  { id: "stressed", label: "Stressed" },
  { id: "bored", label: "Bored" },
  { id: "tired", label: "Tired" },
  { id: "restless", label: "Restless" },
  { id: "low", label: "Low" },
  { id: "short-tempered", label: "Short-tempered" },
  { id: "lonely", label: "Lonely" },
  { id: "calm", label: "Calm" },
  { id: "proud", label: "Proud" },
  { id: "clear-headed", label: "Clear-headed" },
]
export const feelingLabel = (id: string) => FEELINGS.find((f) => f.id === id)?.label ?? id
