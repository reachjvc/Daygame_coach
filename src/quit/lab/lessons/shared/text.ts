/** Reader text shared by the Daily lessons copies. */
export const lsText = {
  skip: "Skip to next day (lab only)",
  labDay: (n: number) => `Lab: day ${n}`,
  back: "Back",
  close: "Close",
  next: "Next",
  complete: "Complete",
  share: "Share",
  minRead: (n: number) => `${n} min read`,
  of: (a: number, b: number) => `${a} of ${b}`,
  prev: "Previous card",
  more: "Next card",
  thumbsUp: "Thumbs up",
  thumbsDown: "Thumbs down",
  bookmark: "Save for later",
  dismiss: "Dismiss",
  loading: "Loading",
} as const
