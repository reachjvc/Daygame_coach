import { addDays, streakEnding } from "../../checkin/shared/logic"

export interface FeedItem {
  id: string
  device: string
  app: string
  title: string
  /** Minutes before "now" when the recap arrived. */
  minutesAgo: number
  flagged: boolean
}

/** Example feed, newest first. */
export function seedFeed(): FeedItem[] {
  return [
    { id: "f1", device: "Laptop", app: "Browser", title: "Example page title", minutesAgo: 36, flagged: false },
    { id: "f2", device: "Laptop", app: "Video app", title: "Example video title", minutesAgo: 95, flagged: true },
    { id: "f3", device: "Phone", app: "Browser", title: "Another example page", minutesAgo: 300, flagged: false },
    { id: "f4", device: "Phone", app: "Photo app", title: "Example album", minutesAgo: 1700, flagged: true },
  ]
}

/** Feed after the "highlighted only" box and the search text. */
export function filterFeed(items: FeedItem[], flaggedOnly: boolean, query: string): FeedItem[] {
  const q = query.trim().toLowerCase()
  return items.filter((i) => (!flaggedOnly || i.flagged) && (q === "" || `${i.app} ${i.title} ${i.device}`.toLowerCase().includes(q)))
}

export type Perm = "vpn" | "notifications" | "extension"

/** All three permissions on means the member's reports keep flowing. */
export const allHealthy = (p: Record<Perm, boolean>) => p.vpn && p.notifications && p.extension

/** Consecutive days the member checked in, ending today or yesterday. */
export const checkinStreak = (days: string[], today: string) => streakEnding(new Set(days), today)

export { addDays }
