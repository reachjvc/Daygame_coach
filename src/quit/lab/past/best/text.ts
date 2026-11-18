/** Reader text of the improved Past attempts (lab variant `best`). Endings and helped labels come from the data file. */
const list = (l: string[]) => (l.length < 2 ? l.join("") : `${l.slice(0, -1).join(", ")} and ${l[l.length - 1]}`)
const plural = (n: number, one: string, many: string) => (n === 1 ? one : many)

export const bestText = {
  addictionLabel: "Pick what you are working on",
  addictions: { nicotine: "Nicotine", alcohol: "Alcohol", weed: "Weed", porn: "Porn" } as Record<string, string>,
  contentComing: "content coming",
  chipsComing: "content coming: ending and helped choices for this addiction. Type them for now.",
  labTag: "lab only",
  title: "Your past tries",
  intro: "Add each time you stopped. Every field is optional; a rough guess is fine.",
  add: "Add a try",
  empty: "No tries yet.",
  listTitle: "Your tries",
  tryLabel: (n: number) => `Try ${n}`,
  noLength: "no length given",
  edit: "Edit",
  remove: "Delete",
  removeConfirm: "Delete this try",
  keep: "Keep it",

  // pattern
  patternTitle: "Your pattern",
  patternNone: "Add a length, an ending or what helped, and the pattern shows here.",
  longest: (days: string, n: number) => `Longest run: ${days}. From ${n} ${plural(n, "try", "tries")} with a length.`,
  commonEnding: (labels: string[], k: number, m: number) => (labels.length === 1 ? `Most common ending: ${labels[0]}. ${k} of ${m} tries naming an ending.` : `Most common endings: ${list(labels)}. ${k} tries each, of ${m} naming an ending.`),
  commonHelped: (labels: string[], k: number, m: number) => (labels.length === 1 ? `Helped most often: ${labels[0]}. ${k} of ${m} tries naming what helped.` : `Helped most often: ${list(labels)}. ${k} tries each, of ${m} naming what helped.`),
  noRepeatEnding: "Each try ended differently so far.",
  windowHow: "How is this worked out?",
  windowWhy: "The shortest span of days that holds more than half of your tries.",
  windowLine: (from: number, to: number, k: number, n: number) => `${from === to ? `Most of your tries ended on day ${from}.` : `Most of your tries ended in days ${from}–${to}.`} ${k} of ${n} tries with a length.`,
  windowNeed: "Two tries with a length show the days most of them ended in.",
  roughNote: "Weeks count as 7 days and months as 30.",
  usedIn: "Used in: if-then plan, quit date, SOS",
  usedInNote: "Saved on this device. Those tools do not read it yet.",

  // chart
  chartTitle: "How long each try lasted",
  chartBasis: (n: number) => `${n} ${plural(n, "try", "tries")} with a length`,
  avg: (days: string) => `Average: ${days}`,
  barLabel: (n: number, days: string) => `Try ${n}: ${days}`,

  // form
  formNew: "A try",
  formEdit: "Edit this try",
  whenLabel: "When it was (month and year)",
  lenLabel: "How long it lasted",
  lenNumber: "Length",
  lenUnits: { days: "days", weeks: "weeks", months: "months" } as Record<string, string>,
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
