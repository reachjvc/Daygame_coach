import { LayoutDashboard, Aperture, BarChart3, Swords, Castle, HelpCircle, BookOpen, Settings } from "lucide-react"

/**
 * WHERE THE TAB BAR CAN GO, as data rather than as markup.
 *
 * Lifted out of `MobileTabBar` because two things need the same list: the bar
 * that draws it, and the test that asks whether a route is a destination or a
 * sub-page. A destination is its own way back — the bar is right there — so it
 * needs no back control, and the guard would otherwise need that judgement
 * typed into it by hand and kept in step by memory.
 */
export const TABS = [
  { label: "Dashboard", icon: LayoutDashboard, href: "/dashboard", exact: true },
  { label: "Goals", icon: Aperture, href: "/dashboard/goals", exact: false },
  { label: "Tracking", icon: BarChart3, href: "/dashboard/tracking", exact: false },
  { label: "Scenarios", icon: Swords, href: "/dashboard/scenarios", exact: false },
] as const

export const MORE_ITEMS = [
  { label: "The Lair", icon: Castle, href: "/lair" },
  { label: "Ask Coach", icon: HelpCircle, href: "/dashboard/qa" },
  { label: "Articles", icon: BookOpen, href: "/dashboard/articles" },
  { label: "Settings", icon: Settings, href: "/dashboard/settings" },
] as const

/** Every route the bar itself reaches: a destination, never a sub-page. */
export const TAB_ROUTES: string[] = [...TABS, ...MORE_ITEMS].map((t) => t.href)

/** What to call a route in a back link, for the routes that have a name. */
export const ROUTE_LABELS: Record<string, string> = {
  ...Object.fromEntries([...TABS, ...MORE_ITEMS].map((t) => [t.href, t.label])),
  "/dashboard/tracking/history": "History",
  "/dashboard/goals/plan": "Your plan",
  "/programs": "Programs",
}
