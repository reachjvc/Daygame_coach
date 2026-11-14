import { LayoutDashboard, BarChart3, Dumbbell, Swords, HelpCircle, BookOpen, Timer, ScrollText, BatteryCharging, Brain, Box, Footprints, Grid2x2, Heart, MessageCircle, UserRound, type LucideIcon } from "lucide-react"
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
 *
 * "Plan" since 2026-11-10 (Plans/site-navigation-build.md, risk 14): the bar
 * of option E says Plan. The page's own title is a separate question, put to
 * the owner on the sign-off page.
 */
const ROUTE_LABELS_LIFE_MASTERY = "Plan"

/**
 * THE BAR: HOME · PLAN · ACTIVITY · YOU (option E, Plans/site-navigation-build.md).
 *
 * Copied from Grab: Home holds the tools as tiles, and the bar holds only the
 * few places you return to. Every tool that had a tab or a row in the More
 * sheet (Training, Scenarios, Time, the audit, Ask Coach, Articles) is a tile
 * on Home or a row in All tools (`TOOLS` below), so the More sheet is gone and
 * nothing it held is.
 *
 * - Home is the Dashboard's address until Phase 5.
 * - Activity is Tracking under a new name; same address until Phase 5.
 * - You is Settings, plus your dating answers and Log Out. Grab keeps the
 *   profile in a corner; here it takes a tab because there are no messages
 *   to fill one (risk 21, a deliberate change from the copied app).
 *
 * `testId` keeps the ids the old tabs had where the meaning is the same
 * (risk 11), so a spec that opened "the dashboard tab" still opens Home.
 */
export const TABS = [
  { label: "Home", icon: LayoutDashboard, href: ROUTES.dashboard, exact: true, testId: "tab-dashboard" },
  /**
   * THE PLAN, A TAB SINCE 2026-10-15, on the owner's word: Today, Track and
   * Journal are daily. Its daily steps draw this bar themselves (the frame
   * hides on /plan because the setup steps draw their own bottom controls;
   * `NorthStarFlow`, `USE_STEPS`).
   */
  { label: ROUTE_LABELS_LIFE_MASTERY, icon: ScrollText, href: ROUTES.plan, exact: false, testId: "tab-your-plan" },
  { label: "Activity", icon: BarChart3, href: ROUTES.tracking, exact: false, testId: "tab-tracking" },
  { label: "You", icon: UserRound, href: ROUTES.settings, exact: false, testId: "tab-you" },
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
  // THE FRAME READS THIS. Since 2026-10-15 one layout (app/(app)/layout.tsx,
  // through components/AppFrame.tsx) draws the header and this bar on every
  // signed-in page, so each prefix here opts a page out of BOTH. Before that
  // the bar was mounted page by page, and this entry did no work at all.
  ROUTES.plan,
  ROUTES.trackingReview,
  // The live workout screen: `RestBar` owns its bottom edge, and a rest
  // countdown you cannot see because a nav bar is over it is the one thing
  // that screen exists to show.
  ROUTES.liveWorkout,
]

/**
 * Routes that keep the laptop header but hide the phone's tab bar, because on a
 * phone they draw their own bottom bar.
 *
 * The time tracker draws its own section bar at the bottom of a phone; two
 * stacked bars would take 120px of an 844px screen and leave you guessing which
 * moves you where. Its way out on a phone is the back arrow in its header.
 *
 * THAT IS A PHONE'S REASON, so since 2026-11-03 it hides the phone bar only
 * (D9 in Plans/time-tracker-like-toggl.md). It sat in `HIDDEN_ROUTE_PREFIXES`
 * and lost the laptop header too, so on a PC there was no way from Time to
 * Thoughts, Settings or Log Out but through the Dashboard. On a PC the tracker
 * now drops its own duplicate "← Dashboard · Time" row instead
 * (`TogglLab`, `underAppHeader`).
 *
 * THIS DECISION WAS ONLY A COMMENT until 2026-09-19, inside
 * `TimetrackScreen.tsx` where nothing could read it — so "Time" was the second
 * tab sending people somewhere with no bar, and the guard could not tell that
 * apart from the Training bug. A reason that is not in the data is a reason no
 * test can check.
 */
export const PHONE_BAR_HIDDEN_PREFIXES: string[] = [ROUTES.time]

/**
 * Every top-level destination: the four tabs, All tools, and every tool a
 * Home tile or an All tools row opens. Each has the bar (or, for Time, its own
 * bar and back arrow), so each is its own way back. Sub-pages are not here.
 */
export const TAB_ROUTES: string[] = [
  ...TABS.map((t) => t.href),
  ROUTES.tools,
  ROUTES.training,
  ROUTES.scenarios,
  ROUTES.time,
  ROUTES.audit,
  ROUTES.coach,
  ROUTES.articles,
  ROUTES.innerGame,
]

/**
 * WHO MAY OPEN A TOOL, as the tool itself says it.
 *
 * - `open`: everyone signed in.
 * - `preview`: everyone, but someone who has not paid sees a preview there
 *   (Scenarios and Inner Game draw their own).
 * - `paid`: only someone who has paid. Ask Coach sends anyone else away, so a
 *   tile for it must not be a plain link (`tileAccess` in src/hometab).
 */
export type ToolAccess = "open" | "preview" | "paid"

export interface Tool {
  id: string
  /** The name in All tools. */
  label: string
  /** The name on a Home tile, where four fit across a 320px phone. */
  short: string
  icon: LucideIcon
  href: string
  group: "dating" | "life"
  access: ToolAccess
  /** A tile on Home by default. The owner's own ☆ pins come in Phase 6. */
  tile: boolean
}

/**
 * EVERY TOOL, ONCE: THE HOME TILES AND THE ALL TOOLS LIST BOTH READ THIS.
 *
 * Option E of Plans/site-navigation.md, copied from Grab: a grid of service
 * tiles on Home, the last tile opening the full list. Here rather than in
 * src/hometab because `Timer` may only be imported from this file
 * (`CONTEXT_LOCKED_ICONS`), and because this file is already the one list of
 * where the navigation goes.
 *
 * Inner Game and the Black Box are here on purpose. Before this list, Inner
 * Game could only be reached from a Dashboard card, and the Black Box only
 * from inside the plan.
 *
 * ORDER IS THE TILES' ORDER on Home, as drawn on the before/after page the
 * owner liked (https://claude.ai/artifact/3BV7cJWjt5YS5RPZtvFtej); All tools
 * keeps the same order inside each group.
 *
 * Icons: each one already means this tool in the navigation or in
 * `src/shared/iconRoles.ts`, except `Box` (the Black Box) and `Grid2x2` (All
 * tools), which nothing else in the app uses.
 */
export const TOOLS: readonly Tool[] = [
  { id: "training", label: "Training", short: "Training", icon: Dumbbell, href: ROUTES.training, group: "life", access: "open", tile: true },
  { id: "time", label: "Time Log", short: "Time Log", icon: Timer, href: ROUTES.time, group: "life", access: "open", tile: true },
  { id: "scenarios", label: "Scenarios", short: "Scenarios", icon: Swords, href: ROUTES.scenarios, group: "dating", access: "preview", tile: true },
  { id: "audit", label: "Time & energy audit", short: "Audit", icon: BatteryCharging, href: ROUTES.audit, group: "life", access: "open", tile: true },
  { id: "coach", label: "Ask Coach", short: "Coach", icon: HelpCircle, href: ROUTES.coach, group: "dating", access: "paid", tile: true },
  { id: "inner-game", label: "Inner Game", short: "Inner Game", icon: Brain, href: ROUTES.innerGame, group: "dating", access: "preview", tile: true },
  { id: "black-box", label: "Black Box", short: "Black Box", icon: Box, href: ROUTES.quitVice, group: "life", access: "open", tile: true },
  { id: "field", label: "Field session", short: "Field", icon: Footprints, href: ROUTES.trackingSession, group: "dating", access: "open", tile: false },
  { id: "articles", label: "Articles", short: "Articles", icon: BookOpen, href: ROUTES.articles, group: "dating", access: "open", tile: false },
  { id: "dating-answers", label: "Your dating answers", short: "Answers", icon: Heart, href: ROUTES.scenarioPreferences, group: "dating", access: "open", tile: false },
]

/**
 * Things that are announced but not built, shown greyed in All tools so the
 * list says what is coming. Only what the app already promised: the
 * Dashboard's "Cold Approach · Coming Soon" card.
 */
export const COMING_TOOLS: readonly { label: string; icon: LucideIcon; group: Tool["group"] }[] = [
  { label: "Cold Approach", icon: MessageCircle, group: "dating" },
]

/** The last tile on Home. */
export const ALL_TOOLS_TILE = { label: "All tools", icon: Grid2x2, href: ROUTES.tools } as const

/** What to call a route in a back link, for the routes that have a name. */
export const ROUTE_LABELS: Record<string, string> = {
  /* The tools first and the tabs last, so a tab's name wins where both name
     one address. Labels are what the back link reads: "← Black Box". */
  ...Object.fromEntries(TOOLS.map((t) => [t.href, t.label])),
  ...Object.fromEntries(TABS.map((t) => [t.href, t.label])),
  [ROUTES.tools]: "All tools",
  [ROUTES.trackingHistory]: "History",
  [ROUTES.plan]: ROUTE_LABELS_LIFE_MASTERY,
  [ROUTES.training]: "Training",
}

/**
 * Is this item the page you are on? One rule for every bar that marks it: the
 * tab bar and the laptop header. Segment-aware, so `/dashboard` marked exactly
 * does not light up on the pages below it, and a future `/timeline`
 * would not light up Time.
 */
export function isActive(pathname: string, href: string, exact: boolean): boolean {
  return exact ? pathname === href : isUnder(pathname, href)
}

