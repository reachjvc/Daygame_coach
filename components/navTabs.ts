import { LayoutDashboard, BarChart3, Dumbbell, Swords, HelpCircle, BookOpen, Settings, Timer, ScrollText } from "lucide-react"
import { ROUTES, isUnder } from "@/src/shared/routes"

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
 * `ROUTE_LABELS` below and the tab in `TABS` both name it, and a back link
 * reading "Your plan" next to a tab reading "Life Mastery" is two names for
 * one page. Declared here because `TABS` is above `ROUTE_LABELS` and a const
 * cannot be read before it is defined.
 */
const ROUTE_LABELS_LIFE_MASTERY = "Your plan"

export const TABS = [
  { label: "Dashboard", icon: LayoutDashboard, href: ROUTES.dashboard, exact: true },
  // NO GOALS TAB. The hub is archived at /test/archive/goals-hub; the plan
  // below is the one goals surface.
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
  { label: "Training", icon: Dumbbell, href: ROUTES.training, exact: false },
  { label: "Tracking", icon: BarChart3, href: ROUTES.tracking, exact: false },
  /**
   * YOUR PLAN (LIFE MASTERY), A TAB SINCE 2026-10-15, on the owner's word.
   *
   * It sat in the More sheet from 2026-09-24 on the reasoning that "the bar is
   * things somebody does several times a week, and a fourteen-step plan is not
   * one of them". That missed half the plan: Today, Track and Journal are
   * daily. The owner asked for it in the bar.
   *
   * IT TOOK TIME'S PLACE, because a seventh item does not fit. Measured on the
   * real bar with a cloned tab: five tabs plus More at the 56px floor
   * (`BAR_ITEM`) need 392px, and the bar ran off-screen at 320, 360, 375 and
   * 390px, fitting only from 412px. The owner chose Time to move to the sheet.
   *
   * Beside Tracking on purpose: the vision's first item is that the plan is
   * where you decide and Tracking is where you live it, one system.
   *
   * `ScrollText` is used nowhere else but the laptop header's link to the same
   * page (`src/shared/iconRoles.ts`), so the icon means one thing.
   */
  { label: ROUTE_LABELS_LIFE_MASTERY, icon: ScrollText, href: ROUTES.plan, exact: false },
  { label: "Scenarios", icon: Swords, href: ROUTES.scenarios, exact: false },
] as const

/** The Lair was a second goals surface. Deleted outright on 2026-09-09. */
export const MORE_ITEMS = [
  /**
   * TIME, FIRST IN THE SHEET since it gave its tab to the plan (2026-10-15).
   * First because the other three are reference and settings, and this is a
   * place you go to work. Its own pages hide the bar anyway (see
   * `HIDDEN_ROUTE_PREFIXES`), so from inside Time nothing changed.
   */
  { label: "Time", icon: Timer, href: ROUTES.time },
  { label: "Ask Coach", icon: HelpCircle, href: ROUTES.coach },
  { label: "Articles", icon: BookOpen, href: ROUTES.articles },
  { label: "Settings", icon: Settings, href: ROUTES.settings },
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
  ROUTES.plan,
  ROUTES.trackingReview,
  // The live workout screen: `RestBar` owns its bottom edge, and a rest
  // countdown you cannot see because a nav bar is over it is the one thing
  // that screen exists to show.
  ROUTES.liveWorkout,
  // The time tracker draws its own six-section bar; two stacked bars would
  // take 120px of an 844px screen and leave you guessing which moves you
  // where. Its way out is the back arrow in its header.
  //
  // THIS DECISION WAS ONLY A COMMENT until 2026-09-19, inside
  // `TimetrackScreen.tsx` where nothing could read it — so "Time" was the
  // second tab sending people somewhere with no bar, and the guard could not
  // tell that apart from the Training bug. A reason that is not in the data
  // is a reason no test can check.
  ROUTES.time,
]

export const TAB_ROUTES: string[] = [...TABS, ...MORE_ITEMS].map((t) => t.href)

/** What to call a route in a back link, for the routes that have a name. */
export const ROUTE_LABELS: Record<string, string> = {
  ...Object.fromEntries([...TABS, ...MORE_ITEMS].map((t) => [t.href, t.label])),
  [ROUTES.trackingHistory]: "History",
  [ROUTES.plan]: ROUTE_LABELS_LIFE_MASTERY,
  [ROUTES.training]: "Training",
}

/**
 * Is this item the page you are on? One rule for every bar that marks it: the
 * tab bar and the laptop header. Segment-aware, so `/dashboard` marked exactly
 * does not light up under `/dashboard/tracking`, and a future `/timeline`
 * would not light up Time.
 */
export function isActive(pathname: string, href: string, exact: boolean): boolean {
  return exact ? pathname === href : isUnder(pathname, href)
}
