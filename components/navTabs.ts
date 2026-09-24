import { LayoutDashboard, BarChart3, Dumbbell, Swords, HelpCircle, BookOpen, Settings, Timer, ScrollText } from "lucide-react"
import { LIFE_MASTERY } from "@/src/shared/lifeMasteryRoutes"

/**
 * WHERE THE TAB BAR CAN GO, as data rather than as markup.
 *
 * Lifted out of `MobileTabBar` because two things need the same list: the bar
 * that draws it, and the test that asks whether a route is a destination or a
 * sub-page. A destination is its own way back — the bar is right there — so it
 * needs no back control, and the guard would otherwise need that judgement
 * typed into it by hand and kept in step by memory.
 */
/**
 * What Life Mastery is called, in one place.
 *
 * `ROUTE_LABELS` below and the "More" row above both name it, and a back link
 * reading "Your plan" next to a menu row reading "Life Mastery" is two names
 * for one page. Declared here because `MORE_ITEMS` is above `ROUTE_LABELS` and
 * a const cannot be read before it is defined.
 */
const ROUTE_LABELS_LIFE_MASTERY = "Your plan"

export const TABS = [
  { label: "Dashboard", icon: LayoutDashboard, href: "/dashboard", exact: true },
  // NO GOALS TAB. The hub is archived at /test/archive/goals-hub and the
  // navigation is being rebuilt around one consolidated surface. Until that
  // exists, the plan is reachable by URL at /life-mastery, and nothing in the
  // bar points at goals at all.
  /**
   * TRAINING, IN THE BAR.
   *
   * It was reachable by exactly one route in the whole product: the dashboard
   * has no training card, the tab bar had no training tab, and the only link
   * lived inside a Quick Actions panel on the Tracking page. So logging a set
   * meant knowing that the gym tracker is filed under "Tracking", taking four
   * to six taps to get there, and landing on whichever tab you last used.
   *
   * It is a top-level thing people do several times a week; it belongs beside
   * the other things people do several times a week.
   */
  { label: "Training", icon: Dumbbell, href: "/programs", exact: false },
  { label: "Tracking", icon: BarChart3, href: "/dashboard/tracking", exact: false },
  { label: "Scenarios", icon: Swords, href: "/dashboard/scenarios", exact: false },
  { label: "Time", icon: Timer, href: "/dashboard/time", exact: false },
] as const

/** The Lair was a second goals surface. Deleted outright on 2026-09-09. */
export const MORE_ITEMS = [
  /**
   * LIFE MASTERY, REACHABLE WITHOUT TYPING AN ADDRESS.
   *
   * Until 2026-09-24 the only ways in were typing `/life-mastery`, the `/test`
   * dashboard (which 404s in production), and the Vices routine card INSIDE
   * Life Mastery — which you had to already be on. So the plan, and the whole
   * vice module under it, were in the product and not in the navigation.
   *
   * IN THE SHEET, NOT AS A SIXTH TAB, and that is a judgement rather than a
   * constraint. The bar is five things somebody does several times a week; a
   * fourteen-step plan for your life is not one of them, and a sixth tab on a
   * 390px screen costs every other tab its label. The sheet is one tap.
   *
   * It is FIRST here because the other three are reference and settings and
   * this is a place you go to work. `ROUTE_LABELS` already called it "Your
   * plan" before anything linked to it; that name is kept rather than
   * re-invented, so the back links that already say it and this row agree.
   *
   * `ScrollText` is used nowhere else in the app, deliberately: every icon that
   * fits — Compass, Target, Flag, Milestone — is already registered in
   * `src/shared/iconRoles.ts` with roles of its own, and widening one of those
   * roles needs the owner's approval by name. An unused icon needs no registry
   * entry at all, which is the cheaper answer to a question nobody needed to be
   * asked.
   */
  { label: ROUTE_LABELS_LIFE_MASTERY, icon: ScrollText, href: LIFE_MASTERY },
  { label: "Ask Coach", icon: HelpCircle, href: "/dashboard/qa" },
  { label: "Articles", icon: BookOpen, href: "/dashboard/articles" },
  { label: "Settings", icon: Settings, href: "/dashboard/settings" },
] as const

/** Every route the bar itself reaches: a destination, never a sub-page. */
/**
 * Routes where the bar is hidden, because they draw their own bottom edge.
 *
 * HERE AS DATA, not as markup inside the bar. It was a module-private const in
 * `MobileTabBar.tsx`, so no test could import it and nothing could check that
 * a route claiming its own bottom edge was actually listed.
 */
export const HIDDEN_ROUTE_PREFIXES: string[] = [
  // Life Mastery and the vice module inside it: both draw their own bottom
  // controls, and two bars stacked on a phone is one bar too many. A prefix, so
  // every step of the flow and every vice route is covered by the one entry.
  //
  // BELT AND BRACES TODAY. This bar is mounted per page rather than in a root
  // layout, and no page under /life-mastery mounts it — so nothing here is
  // currently doing any work. It is the answer for the day somebody mounts the
  // bar app-wide, which is the day this would otherwise sit on top of the
  // flow's own controls.
  LIFE_MASTERY,
  "/dashboard/tracking/review",
  // The live workout screen: `RestBar` owns its bottom edge, and a rest
  // countdown you cannot see because a nav bar is over it is the one thing
  // that screen exists to show.
  "/programs/live",
  // The time tracker draws its own six-section bar; two stacked bars would
  // take 120px of an 844px screen and leave you guessing which moves you
  // where. Its way out is the back arrow in its header.
  //
  // THIS DECISION WAS ONLY A COMMENT until 2026-09-19, inside
  // `TimetrackScreen.tsx` where nothing could read it — so "Time" was the
  // second tab sending people somewhere with no bar, and the guard could not
  // tell that apart from the Training bug. A reason that is not in the data
  // is a reason no test can check.
  "/dashboard/time",
]

export const TAB_ROUTES: string[] = [...TABS, ...MORE_ITEMS].map((t) => t.href)

/** What to call a route in a back link, for the routes that have a name. */
export const ROUTE_LABELS: Record<string, string> = {
  ...Object.fromEntries([...TABS, ...MORE_ITEMS].map((t) => [t.href, t.label])),
  "/dashboard/tracking/history": "History",
  [LIFE_MASTERY]: ROUTE_LABELS_LIFE_MASTERY,
  "/programs": "Training",
}
