export const RECORD_TABS = ["home", "money", "milestones", "calendar"] as const
export type RecordTab = (typeof RECORD_TABS)[number]

export function parseTab(raw: string | null): RecordTab {
  return (RECORD_TABS as readonly string[]).includes(raw ?? "") ? (raw as RecordTab) : "home"
}
