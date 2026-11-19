/** Reader text of "Your past attempts". Endings and helped labels come from the data file. */
export const pastText = {
  title: "Your past attempts",
  intro: "Add the tries you remember. Every field is optional; a rough guess is fine.",

  countQuestion: "About how many times have you tried to stop, in all?",
  countNote: "You don't need to list every try. This number covers all of them.",
  counts: { never: "Never", "1": "1", "2-3": "2–3", "4-9": "4–9", "10+": "10+" } as Record<string, string>,
  noTriesPre: "No tries yet. Your first one starts with ",
  noTriesName: "your quit date",
  noTriesPost: ".",

  add: "Add a try",
  seeExample: "See an example",
  exampleLabel: "Example. Nothing here is yours, and nothing is saved.",
  leaveExample: "Leave the example",

  patternTitle: "Your pattern",
  patternNone: "Add a length, an ending or what helped, and your pattern shows here.",
  patternMore: "Add another try, and what repeats shows here.",
  longest: (len: string, n: number) => `Longest try: ${len}. From ${n} ${n === 1 ? "try" : "tries"} with a length.`,
  commonEnding: (labels: string[], k: number, m: number) =>
    labels.length === 1
      ? `Most common ending: ${labels[0]}. ${k} of ${m} tries naming an ending.`
      : `Most common endings: ${joinList(labels)}. ${k} tries each, of ${m} naming an ending.`,
  commonHelped: (labels: string[], k: number, m: number) =>
    labels.length === 1
      ? `Helped most often: ${labels[0]}. ${k} of ${m} tries naming what helped.`
      : `Helped most often: ${joinList(labels)}. ${k} tries each, of ${m} naming what helped.`,
  noRepeatEnding: "Each try ended differently so far.",
  windowIn: (from: string, to: string, k: number, n: number) => `Most of your tries lasted between ${from} and ${to}. ${k} of ${n} tries with a length.`,
  windowDays: (from: number, to: number, k: number, n: number) =>
    `${from === to ? `Most of your tries lasted ${from} ${from === 1 ? "day" : "days"}.` : `Most of your tries lasted between ${from} and ${to} days.`} ${k} of ${n} tries with a length.`,
  windowOne: (at: string, k: number, n: number) => `Most of your tries lasted ${at}. ${k} of ${n} tries with a length.`,
  windowHow: "How is this worked out?",
  windowWhy: "The shortest span of days that holds more than half of your tries. Worked out from your own tries, not from a study.",
  windowNeed: "Three tries with a length show how long most of them lasted.",
  roughNote: "Weeks count as 7 days, months as 30, years as 365.",

  slipTitle: "After the first slip",
  slipQuestion: "What went through your head?",
  slip: { gaveUp: "I gave up", restarted: "I restarted my quit the same day", justOnce: "“Just this once”", dontRemember: "I don’t remember" } as Record<string, string>,
  slipGaveUp: "A slip ends a run, not the quit. The clean days you had still count. Pick a new day 1.",
  slipGaveUpLink: "Slipped? Restart today",
  slipGaveUpPlain: "Next time, pick a new day 1 on the day you slip.",
  slipRestartedPre: "Keep doing that. The plan in ",
  slipRestartedName: "Your quit date",
  slipRestartedPost: " says the same: after a slip, go back through its steps 1–3 on paper, the same day.",
  slipJustOncePre: "That is one of ",
  slipJustOnceName: "the 12 lies",
  slipJustOncePost: ". In two patch trials, most smokers who had even one in their second week off were smoking again six months later:",
  slipDontRemember: "Next time, notice the first thought after a slip and write it down.",

  manyTitle: "Many tries are common",
  manyStudy: "In one study of adults in Ontario who smoked cigarettes daily, the authors' preferred model put the average at about 30 tries before one lasted a year. Other ways of counting gave about 7 to 142.",
  manyNote: "An average across many people, not a forecast for you.",
  basisWhere: "Where",

  chartTitle: "How long each try lasted",
  chartBasis: (n: number) => `${n} tries with a length`,
  avg: (len: string) => `Average: ${len}`,
  chartNote: "Bar tops show days; 60 days or more show months (mo) or years (y). The dashed line is the average.",
  noMonth: "—",

  listTitle: "Your tries",
  listEmpty: "No tries added yet. Tap Add a try for each one you remember.",
  dateNone: "Date not given",
  lenNone: "No length given",
  edit: "Edit",
  remove: "Delete",
  removeConfirm: "Delete this try",
  keep: "Keep it",
  removed: "Removed.",
  undo: "Undo",

  nextTitle: "Next",
  nextDate: "Pick your next day 1",
  nextIfthen: "Plan for the moments that ended your tries",
  nextRecordLink: "See the runs since your quit date in Your record",
  nextRecordPre: "Runs since your quit date are in ",
  nextRecordName: "Your record",
  nextRecordPost: ".",
  saved: "Saved on this phone.",

  formNew: "Add a past try",
  formEdit: "Edit this try",
  whenLabel: "When it was (month and year)",
  whenOut: "Pick a month from January 1960 to this month.",
  lenLabel: "How long it lasted",
  lenNumber: "Length",
  lenBad: "Type a number from 1 to 999, like 3",
  units: { days: "Days", weeks: "Weeks", months: "Months", years: "Years" } as Record<string, string>,
  unitLabel: "Unit",
  howLabel: "How you did it",
  hows: [
    { id: "all-at-once", label: "All at once" },
    { id: "cut-down", label: "Cut down slowly" },
    { id: "with-a-product", label: "With a product" },
    { id: "with-an-app", label: "With an app" },
    { id: "with-a-person", label: "With a person or group" },
    { id: "on-my-own", label: "On my own" },
  ],
  endedLabel: "What ended it",
  endedText: "Something else that ended it",
  helpedLabel: "What helped",
  helpedText: "Something else that helped",
  save: "Save this try",
  cancel: "Cancel",
  needOne: "Fill in at least one field.",
} as const

function joinList(l: string[]): string {
  return l.length < 2 ? l.join("") : `${l.slice(0, -1).join(", ")} and ${l[l.length - 1]}`
}
