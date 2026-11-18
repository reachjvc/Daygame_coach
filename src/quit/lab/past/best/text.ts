/** Reader text of the improved Past attempts (lab variant `best`). Endings and helped labels come from the data file. */
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
  commonEnding: (label: string, k: number, m: number) => `Most common ending: ${label}. ${k} of ${m} ${plural(m, "try", "tries")} naming an ending.`,
  commonHelped: (label: string, k: number, m: number) => `Helped most often: ${label}. ${k} of ${m} ${plural(m, "try", "tries")} naming what helped.`,
  windowLine: (from: number, to: number, k: number, n: number) => `Most of your tries ended in days ${from}–${to}. ${k} of ${n} tries with a length.`,
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
