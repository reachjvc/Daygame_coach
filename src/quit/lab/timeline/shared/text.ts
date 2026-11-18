/** Reader text shared by the Health timeline copies. */
export const tlText = {
  exampleDuration: "example duration, not a health figure",
  exampleDays: (n: number) => `${n} days`,
  beforeStart: "Before the quit date",
  startLabel: "Quit date",
  startTitle: "Your quit date",
  noCountdown: "no duration yet",
  stateDone: "Reached",
  stateProgress: "In progress",
  stateLocked: "Not started",
  doneCount: (done: number, total: number) => `${done} of ${total} reached`,
  otherTool: "Part of another tool, not copied here",
  back: "Back",
  shareTitle: "Share",
} as const
