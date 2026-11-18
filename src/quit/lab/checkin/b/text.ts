/** Reader text of Check-in copy B. */
export const bText = {
  homeTitle: "Home",
  tiles: ["Clocks", "Inventory", "Counseling", "Encourage", "Partners", "Connect", "Journal", "Refocus", "Notifications", "Settings"],
  tileGlyphs: ["◔", "☑", "☎", "♥", "⚇", "☍", "✎", "◎", "♪", "⚙"],
  // clock
  clockName: "Alcohol free",
  daysWord: "days",
  holdLabel: "Hold to check in",
  holdLine: "Keep your finger down until the button fills.",
  checkedIn: "Checked in today",
  checkedInLine: "People following this clock can see you checked in.",
  prevPage: "Previous page",
  nextPage: "Next page",
  pageDot: (n: number) => `Page ${n}`,
  badgePeek: "Badge",
  closeLabel: "Close",
  settingsLabel: "Clock settings",
  clockSettingsTitle: "Clock settings",
  clockStreak: (n: number) => `${n} check-ins in a row`,
  // inventory
  inventoryTitle: "Inventory",
  morning: "Morning inventory",
  evening: "Evening inventory",
  inventoryHistory: "Inventory history",
  infoLabel: "About the inventory",
  infoTitle: "About the inventory",
  // slider
  expectQ: "How hard do you expect today to be?",
  resultQ: "How hard was today?",
  hardDay: "Hard day",
  easyDay: "Easy day",
  sliderLabel: "Difficulty",
  percent: (n: number) => `${n}%`,
  directionNote: "Which end is hard is a guess.",
  // note step
  noteTitleMorning: "Anything to add for the day?",
  noteTitleEvening: "Anything to add about the day?",
  notePlaceholder: "Optional note",
  noteOptional: "Optional",
  saveInventory: "Save",
  saved: "Saved",
  // history
  historyTitle: "Inventory history",
  expected: "Expected",
  result: "Result",
  notDone: "not done",
  // journal
  journalTitle: "Journal",
  addEntry: "New entry",
  editorTitle: "Entry",
  titlePlaceholder: "Title",
  bodyPlaceholder: "Write here",
  saveEntry: "Save entry",
  untitled: "Untitled",
  // notifications
  notifTitle: "Notifications",
  notifLine: "Pick a time for each inventory. This screen only stores the times; nothing is sent.",
  morningTime: "Morning inventory time",
  eveningTime: "Evening inventory time",
  remindOn: "On",
  remindOff: "Off",
  other: ["Clocks", "Counseling", "Encourage", "Partners", "Connect", "Journal", "Refocus", "Notifications", "Settings"],
} as const

/** 24 hour "08:05" to "8:05 AM". */
export function clockLabel(hhmm: string): string {
  const [h, m] = hhmm.split(":").map(Number)
  const suffix = h >= 12 ? "PM" : "AM"
  return `${h % 12 === 0 ? 12 : h % 12}:${String(m).padStart(2, "0")} ${suffix}`
}
