export interface Tip {
  title: string
  body: string
}
export interface Reminder {
  name: string
  date: string
  time: string
}
export interface DState {
  stage: "welcome" | "signup" | "dayone" | "app"
  name: string
  sex: string
  age: string
  kind: string
  perDay: number | null
  packCost: number | null
  notif: boolean
  buddy: string
  motiv: number[]
  motivText: string
  extra: string[]
  ecig: string
  quitMs: number
  skips: number
  attempts: number
  best: number
  askedDay: number
  moodDay: number
  day8Shown: boolean
  finishSeen: boolean
  played: boolean
  tips: Tip[]
  reminders: Reminder[]
  hideReminderCard: boolean
  recs: Tip[]
}
export const INITIAL_D: DState = {
  stage: "welcome",
  name: "",
  sex: "",
  age: "",
  kind: "",
  perDay: null,
  packCost: null,
  notif: false,
  buddy: "",
  motiv: [],
  motivText: "",
  extra: [],
  ecig: "",
  quitMs: 0,
  skips: 0,
  attempts: 1,
  best: 0,
  askedDay: 0,
  moodDay: 0,
  day8Shown: false,
  finishSeen: false,
  played: false,
  tips: [],
  reminders: [],
  hideReminderCard: false,
  recs: [],
}
