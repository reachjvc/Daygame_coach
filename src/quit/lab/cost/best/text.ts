/** Reader text of the improved Cost and savings (lab variant `best`). */
export const usd = (n: number) => `${n < 0 ? "-" : ""}$${Math.abs(n).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
const plural = (n: number, one: string, many: string) => (n === 1 ? one : many)

export const bestText = {
  addictionLabel: "Pick what you are working on",
  addictions: { nicotine: "Nicotine", alcohol: "Alcohol", weed: "Weed", porn: "Porn" } as Record<string, string>,

  // setup
  setupTitle: "Your start and amounts",
  fStart: "Start date",
  fUnit: "What you are tracking",
  fPerDay: "Per day, before you started",
  fPerDayHint: "Leave empty for now. Money appears once you type a number.",
  fMoneyPerDay: "Money spent per day ($)",
  fMoneyPerDayHint: "Leave empty for now. Money appears once you type a number.",
  fPrice: "Price per unit ($)",
  priceFrom: "Filled in from the data file. Change it to your own price.",
  priceOwn: "Your own price",
  editPrice: "Edit the price",
  save: "Save",
  editSetup: "Edit setup",
  startOver: "Start over",

  // home
  keptTitle: "Money kept",
  keptCaption: "kept, minus what you spent",
  basis: (n: number, one: string, many: string, price: number, since: string) => `based on: ${n} ${plural(n, one, many)} a day × ${usd(price)} each, since ${since}`,
  basisMoney: (daily: number, since: string) => `based on: ${usd(daily)} a day, typed by you, since ${since}`,
  basisRate: (n: number, one: string, many: string, price: number) => `based on: ${n} ${plural(n, one, many)} a day × ${usd(price)} each`,
  basisRateMoney: (daily: number) => `based on: ${usd(daily)} a day, typed by you`,
  withRise: (pct: number) => `, rising ${pct}% a year`,
  spentSuffix: (spent: number) => `, minus ${usd(spent)} spent`,
  tapForFormula: "Tap a figure to see how it is worked out.",
  keptFormula: (daily: number, days: string, gross: number, spent: number, net: number) =>
    `${usd(daily)} a day × ${days} days = ${usd(gross)} kept; ${usd(gross)} − ${usd(spent)} spent = ${usd(net)}`,
  priceNote: "The price per unit is the data file's checked figure.",
  ownPriceNote: "The price per unit is the one you typed.",
  periodsTitle: "What it adds up to",
  periodNames: ["A day", "A week", "A month", "A year", "10 years"],
  periodFormulas: [
    (daily: number, v: number) => `${usd(daily)} a day = ${usd(v)}`,
    (daily: number, v: number) => `${usd(daily)} × 7 = ${usd(v)}`,
    (daily: number, v: number) => `${usd(daily)} × 365 ÷ 12 = ${usd(v)}`,
    (daily: number, v: number) => `${usd(daily)} × 365 = ${usd(v)}`,
    (yearly: number, v: number) => `${usd(yearly)} a year × 10 = ${usd(v)}`,
  ],
  tenFormulaRise: (yearly: number, pct: number, v: number) => `${usd(yearly)} a year, rising ${pct}% each year after the first, added up over 10 years = ${usd(v)}`,
  riseLabel: "Yearly price rise (%), optional",
  riseHint: "Empty means prices stay flat. Type a rise to include it in the year and 10-year figures.",

  // spent
  spentTitle: "What you spent since the start",
  spentLine: "Add what you spent on the habit or on replacements. It comes off the money kept.",
  spentNone: "Nothing added yet.",
  spentTotal: (n: number) => `Total spent: ${usd(n)}`,
  spendAmount: "Amount spent ($)",
  spendNote: "What it was for",
  spendDay: "Day",
  spendAdd: "Add spend",
  remove: "Remove",
  undo: "Undo",

  // goals
  goalsTitle: "Goals",
  goalsLine: "Goals fill in order from the money available.",
  equation: (kept: number, bought: number, available: number) => `${usd(kept)} kept − ${usd(bought)} bought = ${usd(available)} available`,
  goalName: "Goal name",
  goalPrice: "Goal price ($)",
  goalAdd: "Add goal",
  suggestTitle: "Ideas for a name",
  suggestHint: "Tap one to use it as the name. Type the price yourself.",
  goalNoGoals: "No goals yet.",
  goalFunded: (funded: number, price: number, pct: number) => `${usd(funded)} of ${usd(price)} (${pct}%)`,
  goalReach: (n: number, unit: "days" | "months") => `reached in ${n} ${unit === "days" ? plural(n, "day", "days") : plural(n, "month", "months")}`,
  goalReachNoRate: "Type your numbers in the setup to see the time.",
  goalReady: "Enough available",
  goalReachBasis: (missing: number, daily: number) => `based on: ${usd(missing)} still missing ÷ ${usd(daily)} a day, rounded up`,
  buy: "Buy",
  buyNote: (price: number, after: number) => `Buying takes ${usd(price)} off. Available after: ${usd(after)}`,
  boughtTitle: "Bought",
  boughtLine: (name: string, price: number) => `${name}, ${usd(price)}`,
} as const
