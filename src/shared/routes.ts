/**
 * EVERY SIGNED-IN PAGE ADDRESS, IN ONE PLACE.
 *
 * Hand-written paths are how a move leaves dead links behind that nothing
 * catches. Next.js decides routes by folder name, so a move is always two
 * edits: rename the folder under `app/`, and change the value below. Nothing
 * else: every link in the product is built from here, and
 * `tests/unit/navigation/routeList.test.ts` fails the build if anyone writes
 * one of these paths out by hand.
 *
 * The page addresses users see are a product decision, made in
 * `Plans/site-structure.md`: a path segment means "is part of", and a tab
 * destination is named what its tab says. `/`, `/auth/*`, `/redirect`,
 * `/admin/ai-usage` and `/test/*` are deliberately not here: they do not move,
 * and `/auth/*` is a contract with the emails Supabase sends.
 *
 * `?from` is read by `components/BackLink.tsx`, so a screen opened from
 * Tracking offers its way back to Tracking rather than to wherever the browser
 * happens to have been.
 */
export const ROUTES = {
  dashboard: "/dashboard",
  tracking: "/tracking",
  trackingSession: "/tracking/session",
  trackingReport: "/tracking/report",
  trackingReview: "/tracking/review",
  trackingDaily: "/tracking/daily",
  trackingHistory: "/tracking/history",
  scenarios: "/scenarios",
  scenarioPreferences: "/scenarios/preferences",
  scenarioArchetypes: "/scenarios/preferences/archetypes",
  time: "/time",
  /** The time & energy audit (Plans/energy-audit.md, D-NAME). Took Thoughts' place in the More sheet. */
  audit: "/audit",
  coach: "/coach",
  articles: "/articles",
  innerGame: "/inner-game",
  settings: "/settings",
  /**
   * All tools: every tool in two groups, Dating and Life
   * (Plans/site-navigation-build.md). Opened from the last tile on Home.
   */
  tools: "/tools",
  /** All tools, Dating only: where the Dating tile on Home leads (Plans/rebrand-10kdaysclub.md, Phase 6). */
  datingTools: "/tools/dating",
  training: "/training",
  liveWorkout: "/training/live",
  /**
   * Life Mastery, "Your plan" in the navigation.
   *
   * It lived under `/test`, and everything under `/test` answers 404 in
   * production on purpose (`app/test/layout.tsx`). So the flow real users were
   * meant to reach was a page that did not exist for them, and the links into
   * it looked perfectly fine in development, which is the only place they were
   * ever clicked. The vice module sits INSIDE it rather than beside it, because
   * the plan links into it and the two are one product. One folder, one move.
   */
  plan: "/plan",
  /**
   * The copy space: today's plan flow on a hidden second account that holds a COPY
   * of the signed-in account's plan (`src/db/planSandbox.ts`). Only an account
   * with a `plan_sandboxes` row may open it; every other account gets a 404.
   */
  planSandbox: "/plan/sandbox",
  /**
   * The new version of the plan (Plans/plan-in-steps.md, Phase 6): the plan home and the
   * core modules, run on the copy space and never on the signed-in account's own plan.
   * Same gate as the copy space: only an account with a `plan_sandboxes` row; anyone else gets a 404.
   */
  planNew: "/plan/new",
  /** The role model library on the copy space; each person at `/plan/new/role-models/<id>`. */
  planNewRoleModels: "/plan/new/role-models",
  /**
   * The quit-a-vice module's front door: **the Black Box** since 2026-09-20.
   *
   * On 2026-09-20 this address stopped being the old hub and became a
   * different page, and the name was left alone. That is the whole of a
   * four-day CI outage: two e2e specs said `HUB = QUIT_VICE`, which had been
   * true when they were written and silently stopped being true, so 22 tests
   * drove the wrong page.
   *
   * **A move that gives an existing name a new meaning cannot be caught by
   * anything**: every caller still compiles, and the only symptom is
   * behaviour. So when a page moves out from under a name, the page that took
   * its place gets the new name, or the page that moved does.
   *
   * The retired module's address is NOT here, on purpose: it lives with those
   * pages in `app/test/archive/quit-vice/routes.ts`, because nothing in
   * production links into the archive.
   */
  quitVice: "/plan/quit-vice",
  /** The free nicotine quit tools' menu (Plans/quit-finish.md); each tool at `/quit/nicotine/<tool>`. */
  quitNicotine: "/quit/nicotine",
  /** The role model library (Plans/role-models.md); each person at `/plan/role-models/<id>`. */
  roleModels: "/plan/role-models",
  /**
   * The front page's three doors and the prices page (Plans/rebrand-10kdaysclub.md,
   * Phase 5). Public, so they are also in `isPublicPage` below. The Quit door is
   * `/quit`, the free quit tools' own front page, which lives with those tools.
   */
  life: "/life",
  dating: "/dating",
  pricing: "/pricing",
} as const

/** One tracking session's own page. */
export const trackingSessionDetail = (id: string): string => `${ROUTES.trackingSession}/${id}`

/** A finished workout's receipt. Built here so one rename moves every caller. */
export const workoutReceipt = (workoutId: string): string => `${ROUTES.training}/workout/${workoutId}`

/**
 * ONE RUNNING PROGRAM'S OWN SESSION.
 *
 * A link that NAMES a program should land on that program. The Tracking card's
 * label row said "StrongLifts 5×5 ›" and went to `/programs`, which, with two
 * programs running, is a list asking you to pick the one it had just told you
 * about. So did the "Also today: Run 3 · Sprint Triathlon" line, whose entire
 * job is to name the OTHER one.
 */
export const programSession = (enrollmentId: string): string =>
  `${ROUTES.training}?program=${encodeURIComponent(enrollmentId)}`

/**
 * History, as a destination worth returning to. A receipt opened from here
 * used to send its back arrow to the Today tab, so somebody who had scrolled
 * five months back lost their place, and in the installed app
 * (`display: "standalone"`) that arrow is the only back there is.
 */
export const TRAINING_HISTORY = `${ROUTES.training}?tab=history`

/** Any of the above, told where it was opened from. */
export function withFrom(href: string, from: string): string {
  return `${href}${href.includes("?") ? "&" : "?"}from=${encodeURIComponent(from)}`
}

/**
 * The one request the Tracking card makes. An API address, here only because
 * the training routes file held it; no other API address joins this file.
 */
export const TRAINING_DOOR_API = "/api/programs/today"

/** Is `pathname` this address or below it? Segment-aware: "/timeline" is not under "/time". */
export function isUnder(pathname: string, prefix: string): boolean {
  return pathname === prefix || pathname.startsWith(prefix.endsWith("/") ? prefix : `${prefix}/`)
}

/**
 * THE ONLY PAGES A SIGNED-OUT VISITOR MAY OPEN. Everything else is private by
 * default, so a page added, or moved to a new address, cannot fall outside the
 * sign-in guard by being forgotten in a list.
 *
 * `/test` is here to keep the behaviour it always had: it was never guarded,
 * and `app/test/layout.tsx` answers 404 in production whoever asks.
 */
export function isPublicPage(pathname: string): boolean {
  return (
    pathname === "/" ||
    // The link-preview picture (app/opengraph-image.tsx): crawlers have no session.
    pathname === "/opengraph-image" ||
    isUnder(pathname, "/auth") ||
    isUnder(pathname, "/test") ||
    isUnder(pathname, "/quit") ||
    isUnder(pathname, "/privacy") ||
    isUnder(pathname, ROUTES.life) ||
    isUnder(pathname, ROUTES.dating) ||
    isUnder(pathname, ROUTES.pricing)
  )
}

/**
 * ADDRESSES THAT MOVED, AND WHERE THEY WENT.
 *
 * Bookmarks, the installed app's history and the time tracker's copied start
 * links all carry old addresses. `proxy.ts` answers each with a permanent
 * redirect that keeps the query string. Filled section by section in
 * `Plans/site-structure.md` Phase 4.
 */
export const LEGACY_ROUTES: ReadonlyArray<{ from: string; to: string }> = [
  { from: "/dashboard/settings", to: "/settings" },
  { from: "/dashboard/scenarios", to: "/scenarios" },
  { from: "/preferences", to: "/scenarios/preferences" },
  { from: "/dashboard/time", to: "/time" },
  { from: "/dashboard/qa", to: "/coach" },
  { from: "/qa", to: "/coach" },
  { from: "/dashboard/articles", to: "/articles" },
  { from: "/dashboard/inner-game", to: "/inner-game" },
  { from: "/dashboard/tracking", to: "/tracking" },
  { from: "/programs", to: "/training" },
  { from: "/life-mastery", to: "/plan" },
  { from: "/dashboard/goals/plan", to: "/plan" },
  // Thoughts was deleted on 2026-11-09; the audit replaced it (Plans/energy-audit.md).
  { from: "/thoughts", to: "/audit" },
]

/** Where an old address now lives, or null. The longest matching `from` wins. */
export function legacyRedirect(pathname: string): string | null {
  let best: { from: string; to: string } | null = null
  for (const row of LEGACY_ROUTES) {
    if (isUnder(pathname, row.from) && (!best || row.from.length > best.from.length)) best = row
  }
  return best ? best.to + pathname.slice(best.from.length) : null
}
